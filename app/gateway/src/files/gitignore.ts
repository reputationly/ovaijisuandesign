/**
 * `.gitignore` 规则的最小实现，只给 @ 提及搜索挑文件用：注释、空行、`!` 取反、结尾 `/` 只配目录、
 * 开头或中间带 `/` 的按目录锚定、`*` `?` `[...]` `**`。判断的是相对 `.gitignore` 所在目录的路径，
 * 目录传进来时带结尾的 `/`。
 *
 * 没做到逐字符和 git 一致（比如转义的空格结尾）：这里漏配或多配只影响提及候选里多一个少一个文件。
 */
export interface IgnoreMatcher {
  ignores(relPath: string): boolean;
}

interface Rule {
  re: RegExp;
  negate: boolean;
  dirOnly: boolean;
}

function globToRegex(pattern: string, anchored: boolean): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        // `**/` 配零到多层目录，结尾的 `**` 配其下一切。
        if (pattern[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (c === "[") {
      const end = pattern.indexOf("]", i + 1);
      if (end < 0) {
        re += "\\[";
      } else {
        const body = pattern.slice(i + 1, end).replace(/^!/, "^").replace(/\\/g, "\\\\");
        re += `[${body}]`;
        i = end;
      }
    } else if (c === "\\" && i + 1 < pattern.length) {
      re += pattern[++i]!.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    }
  }
  return new RegExp(`${anchored ? "^" : "^(?:.*/)?"}${re}$`);
}

export function parseGitignore(text: string): IgnoreMatcher {
  const rules: Rule[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(/(?<!\\)\s+$/, "");
    if (!line || line.startsWith("#")) continue;
    let negate = false;
    if (line.startsWith("!")) {
      negate = true;
      line = line.slice(1);
    } else if (line.startsWith("\\!") || line.startsWith("\\#")) {
      line = line.slice(1);
    }
    const dirOnly = line.endsWith("/");
    if (dirOnly) line = line.slice(0, -1);
    if (!line) continue;
    const anchored = line.includes("/");
    if (line.startsWith("/")) line = line.slice(1);
    rules.push({ re: globToRegex(line, anchored), negate, dirOnly });
  }
  return {
    ignores(relPath: string) {
      const isDir = relPath.endsWith("/");
      const p = isDir ? relPath.slice(0, -1) : relPath;
      const parts = p.split("/");
      let ignored = false;
      for (const r of rules) {
        // 忽略一个目录 = 忽略它里面的一切：上级目录命中也算（上级一定是目录，只配目录的规则也成立）。
        let hit = r.re.test(p) && (!r.dirOnly || isDir);
        for (let i = 1; !hit && i < parts.length; i++) hit = r.re.test(parts.slice(0, i).join("/"));
        if (hit) ignored = !r.negate;
      }
      return ignored;
    },
  };
}

/** 两个 matcher 叠起来：任一个说忽略就忽略。子目录的 `.gitignore` 叠在父目录的上面。 */
export function composeMatchers(a: IgnoreMatcher, b: IgnoreMatcher): IgnoreMatcher {
  return { ignores: (p) => a.ignores(p) || b.ignores(p) };
}

export const EMPTY_MATCHER: IgnoreMatcher = { ignores: () => false };
