/**
 * 隐藏上下文信封（`<design_context>`）与老格式（`[User attached files: …]`）。
 * 照参照 4.0.4 `../protocol/dist/hidden-context.js`（hilo.js 约 201,116 字节处）移植。
 *
 * 为什么需要：4.0.4 起界面把"用户附了什么文件"包进 `<design_context>…</design_context>`，
 * 里面再用 `<user_attached_files>` 列出清单。只认老格式的话，v3 会话里用户附的文件
 * 一律识别不到 —— 附件不会入库、agent 也拿不到清单。
 *
 * 没移植的分支：`[asset_context resourceId=…]` 与 composition mention 前缀
 * （依赖 `parseCompositionMentionAt`，我们还没有那套 mention 解析）。
 */
export const USER_ATTACHED_FILES_OPEN = "<user_attached_files>\n";
export const USER_ATTACHED_FILES_CLOSE = "\n</user_attached_files>";

const LEADING_CONTEXT_RE = /^<design_context>\n([\s\S]*?)\n<\/design_context>(?:\n\n([\s\S]*))?$/;
const LEADING_LEGACY_RE = /^\[User attached files:\n([\s\S]*?)\]\n\n([\s\S]*)$/;
const EMBEDDED_CONTEXT_RE = /<design_context>\n([\s\S]*?)\n<\/design_context>/g;
const EMBEDDED_LEGACY_RE = /\[User attached files:\n([\s\S]*?)\n\]/g;

export interface HiddenContextEnvelope {
  /** 信封本身（含分隔空行），供调用方原样保留或剥离。 */
  envelope: string;
  /** 附件清单正文（`- [1] image: /path` 那种），没有就是空串。 */
  manifest: string;
  /** 信封之后的用户正文。 */
  content: string;
}

function manifestFromContextBody(body: string): string {
  const start = body.indexOf(USER_ATTACHED_FILES_OPEN);
  if (start === -1) return "";
  const rest = body.slice(start + USER_ATTACHED_FILES_OPEN.length);
  const end = rest.indexOf(USER_ATTACHED_FILES_CLOSE);
  return end === -1 ? "" : rest.slice(0, end);
}

/** 开头的隐藏上下文。不是这两种格式就返回 null。 */
export function parseHiddenContextEnvelope(text: string): HiddenContextEnvelope | null {
  const tagged = LEADING_CONTEXT_RE.exec(text);
  if (tagged) {
    const content = tagged[2] ?? "";
    return {
      envelope: text.slice(0, text.length - content.length),
      manifest: manifestFromContextBody(tagged[1] ?? ""),
      content,
    };
  }
  const legacy = LEADING_LEGACY_RE.exec(text);
  if (legacy) {
    return {
      envelope: text.slice(0, text.length - (legacy[2] ?? "").length),
      manifest: legacy[1] ?? "",
      content: legacy[2] ?? "",
    };
  }
  return null;
}

/** 正文中间嵌着的清单（多段消息拼接时会这样）。 */
export function findEmbeddedAttachmentManifests(text: string): string[] {
  const found: { index: number; manifest: string }[] = [];
  for (const match of text.matchAll(EMBEDDED_CONTEXT_RE)) {
    found.push({ index: match.index ?? 0, manifest: manifestFromContextBody(match[1] ?? "") });
  }
  for (const match of text.matchAll(EMBEDDED_LEGACY_RE)) {
    found.push({ index: match.index ?? 0, manifest: match[1] ?? "" });
  }
  return found
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.manifest)
    .filter((manifest) => manifest !== "");
}

/** 清单里的路径（`- [1] image: /path` → `/path`）。**不**判断本地/远程，交给调用方。 */
export function parseAttachmentManifest(manifest: string): string[] {
  const entries: string[] = [];
  for (const line of manifest.split("\n")) {
    if (!line.trim()) break;
    if (!line.startsWith("- ")) continue;
    const withoutIndex = line.slice(2).replace(/^\[\d+\]\s*/, "");
    const path = withoutIndex.replace(/^(?:image|video|audio|text|file):\s*/, "").trim();
    if (path) entries.push(path);
  }
  return entries;
}
