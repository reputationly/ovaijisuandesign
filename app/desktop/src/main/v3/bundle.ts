/**
 * v3 工作台的产物校验。
 *
 * v3 是 4.0.0 新增的一扇独立窗口，界面产物由另一个构建单元产出，落在
 * `out/renderer/v3/`。主进程不信任这份目录：它在打包时可能根本没被带上，
 * 也可能被人手改过，所以启动前先按清单逐文件核对 sha256，对不上就直接拒绝启动 ——
 * 界面加载的是一份来路不明的代码，比启动失败危险得多。
 *
 * 清单本身也是 **算出来的**，不是抄来的：先扫目录得到真实的文件与摘要，再拿它去比
 * 目录里那份 `bundle-manifest.json`。这样「清单写对了但产物变了」和
 * 「产物没变但清单被改了」两种情况都会被抓到。
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/** 清单文件名，构建脚本和主进程必须用同一个。 */
export const V3_BUNDLE_MANIFEST = "bundle-manifest.json";

export interface V3BundleFile {
  /** 相对 `out/renderer/v3/` 的 POSIX 路径。 */
  path: string;
  sha256: string;
}

export interface V3BundleManifest {
  version: 1;
  protocolVersion: 1;
  files: V3BundleFile[];
}

/**
 * 校验一条相对路径是否允许出现在产物里。
 *
 * 除了拦 `..`、绝对路径、盘符和反斜杠这些越界写法，还要拦敏感文件 ——
 * 产物目录会被整份读进内存再交给窗口，混进一个 `.env` 或私钥就是把凭据也一起发出去了。
 */
export function assertV3BundlePath(relative: string): void {
  if (
    typeof relative !== "string" ||
    !relative ||
    relative.includes("\\") ||
    relative.includes(":") ||
    relative.includes("\0") ||
    path.posix.isAbsolute(relative) ||
    relative.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Invalid V3 bundle path");
  }
  const name = path.posix.basename(relative);
  if (name.startsWith(".env") || /\.(pem|key)$/.test(name) || ["credentials.json", "serviceAccountKey.json"].includes(name)) {
    throw new Error("Sensitive files are not allowed in the V3 bundle");
  }
}

/**
 * 扫出产物目录里的全部文件及摘要（不含清单自身）。
 *
 * 目录、符号链接都要挡：符号链接能指向目录外面，那样「产物」就成了任意文件读取。
 */
export function collectV3BundleFiles(directory: string): V3BundleFile[] {
  if (!existsSync(directory) || !lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) {
    throw new Error("V3 bundle must be a regular directory");
  }
  const files: V3BundleFile[] = [];
  const visit = (folder: string, prefix = ""): void => {
    for (const name of readdirSync(folder).sort()) {
      const relative = prefix ? `${prefix}/${name}` : name;
      assertV3BundlePath(relative);
      const full = path.join(folder, name);
      const stat = lstatSync(full);
      if (stat.isSymbolicLink()) throw new Error("Symlinks are not allowed in the V3 bundle");
      if (stat.isDirectory()) visit(full, relative);
      else if (!stat.isFile()) throw new Error("Unexpected V3 bundle file type");
      else if (relative !== V3_BUNDLE_MANIFEST) {
        files.push({ path: relative, sha256: createHash("sha256").update(readFileSync(full)).digest("hex") });
      }
    }
  };
  visit(directory);
  return files;
}

/**
 * 按目录实际内容算出清单。
 *
 * 顺带做两项结构检查：入口页必须在，且它引用的本地资源必须真的在产物里。
 * 这两条挡的是「构建产了一半」—— 产物目录看着有文件，但入口是空的。
 */
export function createV3BundleManifest(directory: string): V3BundleManifest {
  const files = collectV3BundleFiles(directory);
  const paths = new Set(files.map((file) => file.path));
  if (!paths.has("index.html")) throw new Error("V3 bundle is missing index.html");
  const html = readFileSync(path.join(directory, "index.html"), "utf8");
  const references = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi)];
  let scripts = 0;
  for (const match of references) {
    const [tag, reference] = match;
    // 正则的可选组在类型上是 undefined，这里先收窄再往下用
    if (typeof tag !== "string" || typeof reference !== "string") continue;
    // 外链和内联数据不算产物的一部分，也不该去产物目录里找
    if (/^(?:https?:|data:)/.test(reference)) continue;
    // 去掉 `./` 前缀和 `?query#hash`；`split()[0]` 在 noUncheckedIndexedAccess 下是可空的
    const withoutPrefix = reference.replace(/^\.\//, "");
    const relative = withoutPrefix.split(/[?#]/)[0] ?? withoutPrefix;
    assertV3BundlePath(relative);
    if (!paths.has(relative)) throw new Error(`V3 bundle references a missing asset: ${relative}`);
    if (/^<script\b/i.test(tag) && [".js", ".mjs"].includes(path.extname(relative))) scripts += 1;
  }
  if (scripts === 0) throw new Error("V3 bundle has no local script entry");
  return { version: 1, protocolVersion: 1, files };
}

/**
 * 核对产物与清单。`required` 为真时产物缺失直接抛错，否则只返回 false
 * （开发机上没跑构建是常态，那条路径不该把应用拦死）。
 */
export function validateV3Bundle(directory: string, { required = false }: { required?: boolean } = {}): boolean {
  if (!lstatSync(directory, { throwIfNoEntry: false })) {
    if (required) throw new Error("V3 bundle is missing; run the frontend integration step first");
    return false;
  }
  const actual = createV3BundleManifest(directory);
  const manifestPath = path.join(directory, V3_BUNDLE_MANIFEST);
  if (!existsSync(manifestPath)) throw new Error("V3 bundle manifest is missing");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (
    !manifest ||
    typeof manifest !== "object" ||
    (manifest as V3BundleManifest).version !== 1 ||
    (manifest as V3BundleManifest).protocolVersion !== 1 ||
    !Array.isArray((manifest as V3BundleManifest).files)
  ) {
    throw new Error("Unsupported V3 bundle manifest");
  }
  const expected = new Map<string, string>();
  for (const file of (manifest as V3BundleManifest).files) {
    if (!file || typeof file !== "object") throw new Error("Invalid V3 bundle manifest entry");
    assertV3BundlePath(file.path);
    // 重复条目也要挡：同一路径出现两次时，后一条会悄悄盖掉前一条
    if (!/^[a-f0-9]{64}$/.test(file.sha256) || expected.has(file.path)) throw new Error("Invalid V3 bundle checksum entry");
    expected.set(file.path, file.sha256);
  }
  if (expected.size !== actual.files.length || actual.files.some((file) => expected.get(file.path) !== file.sha256)) {
    throw new Error("V3 bundle checksum mismatch; rebuild and integrate the frontend");
  }
  return true;
}
