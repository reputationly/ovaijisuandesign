import { fileURLToPath } from "node:url";

import { sessionEndpoint, withGatewayIdentity } from "./gateway-identity.js";

/**
 * 附件归属：用户消息里带的文件、工具调用读进来的文件，报给 gateway 解析成资产库里的稳定引用
 * （`asset_vault` + 资产 id）。对话记录里存引用而不是路径，文件挪了也能找回同一个素材。
 *
 * 只收本地路径（`file:` URL 转成路径；http 之类的 URL 跳过，Windows 盘符路径保留），最多 32 个。
 * 任何失败都只记一行日志、回空列表：归属登记不能挡住对话。
 */
export interface AssetVaultRef {
  attachment_source: "asset_vault";
  attachment_id: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function localPaths(values: readonly unknown[]): string[] {
  return [
    ...new Set(
      values.flatMap((value) => {
        if (typeof value !== "string" || !value.trim()) return [];
        const p = value.trim();
        if (p.startsWith("file:")) {
          try {
            return [fileURLToPath(p)];
          } catch {
            return [];
          }
        }
        if (/^[a-z][a-z0-9+.-]*:/i.test(p) && !/^[a-z]:[\\/]/i.test(p)) return [];
        return [p];
      }),
    ),
  ].slice(0, 32);
}

/**
 * 用户消息里的附件：file part 的 `file:` URL，加上界面拼在正文开头的附件清单
 * （`[User attached files:\n- [1] image: /path\n...]\n\n`）。
 */
export function userAttachmentPaths(parts: readonly unknown[]): string[] {
  const paths: string[] = [];
  for (const rawPart of parts) {
    const part = record(rawPart);
    if (!part) continue;
    if (part.type === "file" && typeof part.url === "string" && part.url.startsWith("file:")) paths.push(part.url);
    if (part.type !== "text" || typeof part.text !== "string") continue;
    const manifest = /^\[User attached files:\n([\s\S]*?)\]\n\n/.exec(part.text);
    if (!manifest) continue;
    for (const line of manifest[1]!.split("\n")) {
      if (!line.trim()) break;
      if (!line.startsWith("- ")) continue;
      paths.push(
        line
          .slice(2)
          .replace(/^\[\d+\]\s*/, "")
          .replace(/^(?:image|video|audio|text|file):\s*/, ""),
      );
    }
  }
  return localPaths(paths);
}

/** 工具参数里按命名约定取输入路径：`file_path(s)` / `input_path(s)` / `image_path(s)` 等。 */
export function toolAttachmentPaths(args: unknown): string[] {
  const input = record(args);
  if (!input) return [];
  const paths: unknown[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (!/^(?:file|input|source|image|video|audio|reference)_paths?$/.test(key)) continue;
    paths.push(...(Array.isArray(value) ? value : [value]));
  }
  return localPaths(paths);
}

export function reportAttachmentObservationFailure(sessionId: string, error: unknown): void {
  try {
    console.warn(`[hilo-plugin] attachment observation failed session=${sessionId}: ${error instanceof Error ? error.message : String(error)}`);
  } catch {
    // 日志本身出错也不能影响对话
  }
}

/** 不带 tool 时是用户消息的附件（scope=message，gateway 只查不登记）。 */
export async function observeAttachmentInputs(
  gatewayUrl: string,
  sessionId: string,
  paths: readonly string[],
  tool?: { callId: string; chatTurnId: string },
): Promise<AssetVaultRef[]> {
  if (!sessionId || paths.length === 0) return [];
  try {
    const response = await fetch(
      sessionEndpoint(gatewayUrl, sessionId, "attachment-observations"),
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paths,
          direction: "input",
          ...(tool ? { tool_call_id: tool.callId, chat_turn_id: tool.chatTurnId } : { scope: "message" }),
        }),
        signal: AbortSignal.timeout(2000),
      }),
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = record(await response.json());
    if (!Array.isArray(body?.attachment_refs)) return [];
    return body.attachment_refs.flatMap((raw: unknown): AssetVaultRef[] => {
      const ref = record(raw);
      return ref?.attachment_source === "asset_vault" && typeof ref.attachment_id === "string" && ref.attachment_id.trim()
        ? [{ attachment_source: "asset_vault", attachment_id: ref.attachment_id }]
        : [];
    });
  } catch (error) {
    reportAttachmentObservationFailure(sessionId, error);
    return [];
  }
}
