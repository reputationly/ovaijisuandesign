// 收敛一轮：官方语句若用到了某个库"没导出"的内部名字，它本身多半是那个库的代码，改判为第三方。
// 读 out/used-by.json + classified.json，写回 classified.json；打印改判数量（0 表示收敛）。
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const LIBS = new URL("./libs/node_modules/", import.meta.url).pathname;
const cls = JSON.parse(readFileSync(new URL("./classified.json", import.meta.url), "utf8"));
const usedBy = JSON.parse(readFileSync(new URL("./out/used-by.json", import.meta.url), "utf8"));
const externals = JSON.parse(readFileSync(new URL("./out/externals.json", import.meta.url), "utf8"));

// 每个包对外导出的名字（粗略：扫包内所有文件的 export 写法）
const cacheFile = new URL("./exports-cache.json", import.meta.url);
let exported = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : null;
if (!exported) {
  exported = {};
  const add = (pkg, n) => (exported[pkg] ??= {})[n.trim()] = 1;
  const pkgDirs = [];
  for (const n of readdirSync(LIBS)) {
    if (n.startsWith(".")) continue;
    if (n.startsWith("@")) for (const m of readdirSync(path.join(LIBS, n))) pkgDirs.push([`${n}/${m}`, path.join(LIBS, n, m)]);
    else pkgDirs.push([n, path.join(LIBS, n)]);
  }
  for (const [pkg, dir] of pkgDirs) {
    const walk = (d) => {
      for (const n of readdirSync(d)) {
        if (n === "node_modules" || n === "test" || n === "tests") continue;
        const p = path.join(d, n);
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else if (/\.(m?js|cjs|d\.ts)$/.test(n) && st.size < 5_000_000) {
          const text = readFileSync(p, "utf8");
          for (const m of text.matchAll(/export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|enum|interface|type)\s+([A-Za-z_$][\w$]*)/g)) add(pkg, m[1]);
          for (const m of text.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g))
            for (const part of m[1].split(",")) {
              const bits = part.trim().split(/\s+as\s+/);
              if (bits[0]) add(pkg, bits[bits.length - 1]);
              if (bits[0]) add(pkg, bits[0]);
            }
          for (const m of text.matchAll(/exports\.([A-Za-z_$][\w$]*)\s*=|exports\[["']([^"']+)["']\]|defineProperty\(exports,\s*["']([^"']+)["']/g)) add(pkg, m[1] ?? m[2] ?? m[3]);
        }
      }
    };
    walk(dir);
  }
  writeFileSync(cacheFile, JSON.stringify(exported));
}

const base = (n) => n.replace(/\$\d+$/, "");
let changed = 0;
for (const [idx, names] of Object.entries(usedBy)) {
  const i = Number(idx);
  if (cls[i].kind !== "app" || cls[i].marker) continue;
  for (const n of names) {
    const pkg = (externals[n]?.pkgs ?? [])[0];
    if (!pkg || pkg === "(cjs-wrapper)") continue;
    if (!exported[pkg]?.[base(n)]) {
      cls[i].kind = "lib";
      cls[i].pkgs = [pkg];
      cls[i].promoted = n;
      changed++;
      break;
    }
  }
}
writeFileSync(new URL("./classified.json", import.meta.url), JSON.stringify(cls));
console.log("promoted to lib:", changed);
