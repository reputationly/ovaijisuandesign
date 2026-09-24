import { currentSessionId } from "../context.js";
import type { GatewayClient, SelectedMediaModels } from "../gateway-client.js";

/**
 * 选择器守卫（图片 / 视频）：用户在模型选择器里勾了哪些，就只允许用哪些。
 * 一切不确定都 fail-open —— 没有会话、查询失败、勾选里没有任何认识的 id 时都不拦，
 * gateway 抖一下或目录升级不该挡住生成。
 */

export async function selectedModelsForSession(gw: GatewayClient, context: string): Promise<SelectedMediaModels | null> {
  const sessionId = currentSessionId();
  if (!sessionId) return null;
  try {
    return await gw.getSelectedMediaModels(sessionId);
  } catch (err) {
    process.stderr.write(`[hilo-tools] model picker guard skipped (${context}): ${err instanceof Error ? err.message : String(err)}\n`);
    return null;
  }
}

/**
 * @param vendorPickerIds 每个 vendor 在选择器里可能出现的全部 id（别名、行 id、model_name）
 * @param vendorModelIds 每个 vendor 的 canonical model_id
 * @param selectedIds 已归一到 canonical 的勾选 id
 * @returns 拒绝原因，或 null 表示放行
 */
export function pickerSelectionError(
  category: "image" | "video",
  vendor: string,
  modelId: string,
  vendorPickerIds: Record<string, readonly string[]>,
  vendorModelIds: Record<string, readonly string[]>,
  selectedIds: readonly string[] | undefined,
): string | null {
  if (!selectedIds || selectedIds.length === 0) return null;
  const selected = new Set(selectedIds);
  const vendorPresent = (vendorPickerIds[vendor] ?? [vendor]).some((id) => selected.has(id));
  if (!vendorPresent) {
    const available = Object.entries(vendorPickerIds)
      .filter(([, ids]) => ids.some((id) => selected.has(id)))
      .map(([name]) => name);
    if (available.length === 0) {
      process.stderr.write(`[hilo-tools] model picker guard: selection has no known ${category} ids, not enforcing (selected_ids=[${selectedIds.join(", ")}])\n`);
      return null;
    }
    return `The user's ${category} picker selection has no vendor=${vendor} model. selected_ids=[${selectedIds.join(", ")}] available_vendors=[${available.join(", ")}]`;
  }
  const models = vendorModelIds[vendor] ?? [];
  const selectedModels = models.filter((m) => selected.has(m));
  if (selectedModels.length === 0) {
    return `vendor=${vendor} is selected in the ${category} picker but none of its concrete models is. selected_ids=[${selectedIds.join(", ")}]. Have the user tick a specific model.`;
  }
  if (!models.includes(modelId)) return `model_id=${modelId} does not belong to vendor=${vendor}.`;
  if (selectedModels.includes(modelId)) return null;
  return `model_id=${modelId} (vendor=${vendor}) is not ticked in the user's ${category} picker. selected_models=[${selectedModels.join(", ")}]. Pick one of those, or ask the user to turn this model on.`;
}
