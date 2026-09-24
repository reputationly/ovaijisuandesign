import { currentSessionId } from "../context.js";
import { errorMessage, type GatewayClient } from "../gateway-client.js";
import { AUDIO_SERIES_MODELS } from "./audio-models.js";

/**
 * 模型守卫：用户在选择器里勾了模型时，agent 只能用勾选范围内的。
 * 一律 fail-open —— 没有会话、查询失败、勾选里全是不认识的 id 都放行，
 * 守卫是尊重用户选择，不能因为自身故障挡住生成。
 */

const warn = (line: string) => process.stderr.write(`[hilo-tools] ${line}\n`);

async function selectedAudioIds(context: string, gw: GatewayClient): Promise<string[] | undefined> {
  const sessionId = currentSessionId();
  if (!sessionId) return undefined;
  try {
    return (await gw.getSelectedMediaModels(sessionId))?.audio;
  } catch (err) {
    warn(`audio picker guard fail-open ${context}: ${errorMessage(err)}`);
    return undefined;
  }
}

/** 按系列判断（音乐用）：返回错误文本，null = 放行。 */
export async function selectedAudioSeriesError(gw: GatewayClient, series: string, modelId: string): Promise<string | null> {
  const ids = await selectedAudioIds(`series=${series}`, gw);
  if (!ids || ids.length === 0) return null;
  const selected = new Set(ids);
  const seriesModels = AUDIO_SERIES_MODELS[series] ?? [];
  if (!seriesModels.some((m) => selected.has(m))) {
    if (selected.has(series)) return `The audio picker has series=${series} ticked but none of its concrete models; no usable model_id.`;
    const available = Object.entries(AUDIO_SERIES_MODELS)
      .filter(([, ms]) => ms.some((m) => selected.has(m)))
      .map(([s]) => s);
    if (available.length === 0) {
      warn(`audio picker guard fail-open unknown selection selected_ids=[${ids.join(", ")}]`);
      return null;
    }
    return [
      `series=${series} is not among the audio models the user picked.`,
      `selected_ids=[${ids.join(", ")}]`,
      `available_series=[${available.join(", ")}]`,
    ].join(" ");
  }
  const selectedSeriesModels = seriesModels.filter((m) => selected.has(m));
  if (!seriesModels.includes(modelId)) return `model_id=${modelId} does not belong to audio series=${series}.`;
  if (selectedSeriesModels.includes(modelId)) return null;
  return [
    `model_id=${modelId} (series=${series}) is not ticked in the audio picker.`,
    `selected_models=[${selectedSeriesModels.join(", ")}].`,
    "Switch to a ticked model, or have the user turn this one on in the model picker.",
  ].join(" ");
}

/**
 * 按 vendor 判断（语音用）：先看勾选里有没有这个 vendor 的任何 id（系列名 / 别名 / 模型），
 * 再要求具体模型也被勾选。
 */
export function pickerSelectionError(
  category: string,
  vendor: string,
  modelId: string,
  vendorPickerIds: Readonly<Record<string, readonly string[]>>,
  vendorModelIds: Readonly<Record<string, readonly string[]>>,
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
      warn(`picker guard fail-open unknown selection category=${category} selected_ids=[${selectedIds.join(", ")}]`);
      return null;
    }
    return [
      `vendor=${vendor} is not among the ${category} models the user picked.`,
      `selected_ids=[${selectedIds.join(", ")}]`,
      `available_vendors=[${available.join(", ")}]`,
    ].join(" ");
  }
  const vendorModels = vendorModelIds[vendor] ?? [];
  const selectedVendorModels = vendorModels.filter((m) => selected.has(m));
  if (selectedVendorModels.length === 0) {
    return [
      `The ${category} picker has no concrete model ticked for vendor=${vendor}.`,
      `selected_ids=[${selectedIds.join(", ")}].`,
      "Have the user tick a specific model in the model picker.",
    ].join(" ");
  }
  if (!vendorModels.includes(modelId)) return `model_id=${modelId} is not a model of vendor=${vendor}.`;
  if (selectedVendorModels.includes(modelId)) return null;
  return [
    `model_id=${modelId} (vendor=${vendor}) is not ticked in the ${category} picker.`,
    `selected_models=[${selectedVendorModels.join(", ")}].`,
    "Switch to a ticked model, or have the user turn this one on in the model picker.",
  ].join(" ");
}

export async function selectedAudioVendorError(
  gw: GatewayClient,
  vendor: string,
  modelId: string,
  vendorPickerIds: Readonly<Record<string, readonly string[]>>,
  vendorModelIds: Readonly<Record<string, readonly string[]>>,
): Promise<string | null> {
  const ids = await selectedAudioIds(`category=audio vendor=${vendor}`, gw);
  return pickerSelectionError("audio", vendor, modelId, vendorPickerIds, vendorModelIds, ids);
}
