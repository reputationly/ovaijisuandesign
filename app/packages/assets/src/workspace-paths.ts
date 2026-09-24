import path from "node:path";

/**
 * 工作区相对路径 → 绝对路径，**拒绝逃出工作区**。返回 null 表示拒绝。
 *
 * 这一层是安全边界：相对路径来自 agent 和 HTTP 请求，`../../etc/passwd`
 * 和绝对路径都必须挡住。
 *
 * - `..` 一律拒绝，而不是"弹一层"——弹层的写法在 `a/../../b` 这种输入上
 *   会算出工作区外面去。
 * - 只做词法归一化，不碰文件系统。符号链接不在这里处理（工作区里的软链是
 *   用户自己放的，跟着走是预期行为）。
 * - `\` 也当分隔符：Windows 上的调用方会传 `images\a.png`，而在 POSIX 上
 *   不拆的话 `..\..\x` 会被当成一个普通文件名放过去。
 */
export function safeResolve(root: string, rel: string): string | null {
  const trimmed = rel.trim();
  if (!trimmed) return null;
  if (path.isAbsolute(trimmed) || path.win32.isAbsolute(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("\\")) {
    return null;
  }
  const parts: string[] = [];
  for (const part of trimmed.split(/[\\/]+/)) {
    if (part === "" || part === ".") continue;
    if (part === "..") return null;
    parts.push(part);
  }
  if (parts.length === 0) return null;
  return path.join(root, ...parts);
}

/**
 * 反过来：绝对路径 → 工作区相对路径，**一律 `/` 分隔**（canvas.json 里存的
 * 就是这个形式，Windows 上也一样）。不在工作区里回 null。
 */
export function relativize(root: string, abs: string): string | null {
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  const s = rel.split(path.sep).filter(Boolean).join("/");
  return s || null;
}
