import { withGatewayIdentity } from "./gateway-identity.js";

/**
 * `<design_context><project_overview>` —— 这一轮"项目里有哪些 Composition"的快照。
 *
 * 逐字对齐参照 4.0.4：他们在把用户消息送进模型之前，把当前项目的 composition 清单
 * 塞进同一个 `<design_context>` 信封里。缺了它，agent 第一件事只能 `bash` / 搜索去摸
 * 项目现状 —— 实测同一句香水广告，我们首步比他们多 2 次工具往返。
 *
 * 为什么是"发送时快照"而不是 system：清单每轮都变，放 system 会把前缀缓存全打掉；
 * 挂在用户消息上还能和附件清单共用同一个信封。
 */
export const PROJECT_OVERVIEW_HEADER =
  "Active Compositions in this project when this message was sent. Compositions created later are not listed; search for them when needed.";

export const NO_COMPOSITIONS = "This project has no Compositions yet.";

/** gateway 的 `POST /api/project/compositions/list-all`。 */
export const COMPOSITIONS_HTTP_PATH = "/api/project/compositions/list-all";
export const PROJECT_OVERVIEW_TIMEOUT_MS = 2_000;
/** 清单只用来"知道有什么"，不需要翻页；上限压住提示词体积。 */
export const PROJECT_OVERVIEW_LIMIT = 100;

export interface OverviewComposition {
  compositionId: string;
  name: string;
  typeId?: string;
  typeLabel?: string;
}

/**
 * 拼块。两个形状都逐字对齐参照：
 * - 空项目一句 `This project has no Compositions yet.`；
 * - 有内容先按类型汇总一行 `Types: label="…" typeId=… count=N`，再逐条列
 *   `- name="…" compositionId=… typeId=…`。
 */
export function formatProjectOverview(compositions: readonly OverviewComposition[]): string {
  const lines = ["<project_overview>", PROJECT_OVERVIEW_HEADER];
  if (compositions.length === 0) {
    lines.push(NO_COMPOSITIONS, "</project_overview>");
    return lines.join("\n");
  }
  const groups = new Map<string, { label: string; typeId: string; items: OverviewComposition[] }>();
  for (const item of compositions) {
    const typeId = item.typeId ?? "";
    const key = `${typeId}\u0000${item.typeLabel ?? ""}`;
    const group = groups.get(key) ?? { label: item.typeLabel ?? "", typeId, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const label = group.label ? `label="${group.label}" ` : "";
    lines.push(`Types: ${label}typeId=${group.typeId} count=${group.items.length}`);
  }
  for (const item of compositions) {
    const typeId = item.typeId ? ` typeId=${item.typeId}` : "";
    const typeLabel = item.typeLabel ? ` typeLabel="${item.typeLabel}"` : "";
    lines.push(`- name="${item.name}" compositionId=${item.compositionId}${typeId}${typeLabel}`);
  }
  lines.push("</project_overview>");
  return lines.join("\n");
}

/** 把概览放进 `<design_context>` 信封；已有信封就插进去，不套第二个。 */
export function withProjectOverview(text: string, overview: string): string {
  const open = "<design_context>\n";
  if (text.startsWith(open)) {
    const rest = text.slice(open.length);
    return `${open}${overview}\n${rest}`;
  }
  return `<design_context>\n${overview}\n</design_context>\n\n${text}`;
}

/** 解析 gateway 的 list-all 响应；形状不对当作"没有 composition"。 */
export function compositionsFromResponse(value: unknown): OverviewComposition[] {
  const items = (value as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  const out: OverviewComposition[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as { compositionId?: unknown; name?: unknown; type?: unknown };
    if (typeof record.compositionId !== "string" || typeof record.name !== "string") continue;
    const type = record.type && typeof record.type === "object" ? (record.type as { id?: unknown; label?: unknown }) : undefined;
    out.push({
      compositionId: record.compositionId,
      name: record.name,
      ...(typeof type?.id === "string" ? { typeId: type.id } : {}),
      ...(typeof type?.label === "string" ? { typeLabel: type.label } : {}),
    });
  }
  return out;
}

/**
 * 取当前项目的 composition 清单。失败/超时一律当"没有"——概览是锦上添花，
 * 不能因为它把一轮对话挡住。
 */
export async function fetchProjectCompositions(
  gatewayUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OverviewComposition[]> {
  try {
    const response = await fetchImpl(
      `${gatewayUrl.replace(/\/+$/, "")}${COMPOSITIONS_HTTP_PATH}`,
      withGatewayIdentity({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lifecycle: ["active"], limit: PROJECT_OVERVIEW_LIMIT }),
        signal: AbortSignal.timeout(PROJECT_OVERVIEW_TIMEOUT_MS),
      }),
    );
    if (!response.ok) return [];
    return compositionsFromResponse(await response.json());
  } catch {
    return [];
  }
}
