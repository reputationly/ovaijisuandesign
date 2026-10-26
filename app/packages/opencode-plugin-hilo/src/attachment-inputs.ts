import { fileURLToPath } from "node:url";

import { parseAttachmentManifest, parseHiddenContextEnvelope } from "@ov/protocol";

import { sessionEndpoint, withGatewayIdentity } from "./gateway-identity.js";

/**
 * 附件归属：用户消息里带的文件、工具调用读进来的文件，报给 gateway 解析成资产库里的稳定引用
 * （`asset_vault` + 资产 id）。对话记录里存引用而不是路径，文件挪了也能找回同一个素材。
 *
 * 只收本地路径（`file:` URL 转成路径；http 之类的 URL 跳过，Windows 盘符路径保留），最多 32 个。
 * 任何失败都只记一行日志、回空列表：归属登记不能挡住对话。
 */
/** 一次工具调用最多报多少个附件（参照同值）。 */
export const ATTACHMENT_OBSERVATION_MAX_FILES = 32;

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
  ].slice(0, ATTACHMENT_OBSERVATION_MAX_FILES);
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
    // 4.0.4 起界面把清单包进 `<design_context>`；老格式也还得认（存量会话）。
    const envelope = parseHiddenContextEnvelope(part.text);
    const manifest = envelope?.manifest ?? "";
    if (manifest) paths.push(...parseAttachmentManifest(manifest));
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
  /**
   * v3 的素材（`v3ToolMaterials`）。和 paths 并列上报：`design_*` 的产出是
   * Resource/Version，往往没有路径可报。**空数组就不发这个键**，与参照一致。
   */
  materials: readonly unknown[] = [],
  direction: "input" | "output" = "input",
): Promise<AssetVaultRef[]> {
  if (!sessionId || (paths.length === 0 && materials.length === 0)) return [];
  try {
    const response = await fetch(
      sessionEndpoint(gatewayUrl, sessionId, "attachment-observations"),
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paths,
          ...(materials.length ? { materials } : {}),
          direction,
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
