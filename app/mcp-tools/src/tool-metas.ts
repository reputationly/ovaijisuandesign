import type { z } from "zod";

import type { GatewayClient } from "./gateway-client.js";
import type { CollectedTool } from "./registrar.js";

/**
 * 启动时把每个工具的参数提示推给 gateway（`POST /api/internal/tool-metas`），
 * UI 的确认卡片 / 参数面板用它渲染枚举和范围。键名带 `hub_` 前缀，和 agent 看到的一致。
 */

const TOOL_PREFIX = "hub_";

export type ParamHint =
  | { type: "enum"; values: string[]; description?: string }
  | { type: "range"; min: number; max: number; description?: string }
  | { type: "desc"; description: string };

type AnyDef = { typeName?: string; [k: string]: unknown };
const defOf = (s: z.ZodTypeAny) => s._def as AnyDef;

function unwrap(s: z.ZodTypeAny): z.ZodTypeAny {
  const def = defOf(s);
  if (def.typeName === "ZodDefault" || def.typeName === "ZodOptional" || def.typeName === "ZodNullable") {
    return unwrap(def.innerType as z.ZodTypeAny);
  }
  if (def.typeName === "ZodEffects") return unwrap(def.schema as z.ZodTypeAny);
  return s;
}

function description(s: z.ZodTypeAny): string | undefined {
  const d = s.description;
  return typeof d === "string" && d.length > 0 ? d : undefined;
}

function singleHint(s: z.ZodTypeAny): ParamHint | undefined {
  const def = defOf(s);
  switch (def.typeName) {
    case "ZodEnum": {
      const values = (def.values as string[]).filter((v) => v.length > 0);
      return values.length > 0 ? { type: "enum", values } : undefined;
    }
    case "ZodLiteral": {
      const v = def.value;
      return typeof v === "string" || typeof v === "number" ? { type: "enum", values: [String(v)] } : undefined;
    }
    case "ZodNumber": {
      const checks = (def.checks as { kind: string; value: number }[] | undefined) ?? [];
      const min = checks.find((c) => c.kind === "min")?.value;
      const max = checks.find((c) => c.kind === "max")?.value;
      return min !== undefined && max !== undefined ? { type: "range", min, max } : undefined;
    }
    case "ZodUnion": {
      const options = def.options as z.ZodTypeAny[];
      if (!options.every((o) => defOf(o).typeName === "ZodLiteral")) return undefined;
      const values = options
        .map((o) => defOf(o).value)
        .filter((v) => typeof v === "string" || typeof v === "number")
        .map(String);
      return values.length > 0 ? { type: "enum", values } : undefined;
    }
    default:
      return undefined;
  }
}

function objectShape(s: z.ZodTypeAny): z.ZodRawShape | undefined {
  const def = defOf(s);
  if (def.typeName !== "ZodObject") return undefined;
  const shape = def.shape;
  return typeof shape === "function" ? (shape as () => z.ZodRawShape)() : (shape as z.ZodRawShape);
}

/** `vendor_params` / `overrides` 的子字段拍平到顶层，UI 按参数名找提示。 */
export function extractParamHints(shape: z.ZodRawShape): Record<string, ParamHint> | undefined {
  const hints: Record<string, ParamHint> = {};
  for (const [key, schema] of Object.entries(shape)) {
    if (key.startsWith("_") || key === "vendor_params" || key === "overrides") continue;
    const inner = unwrap(schema);
    const hint = singleHint(inner);
    const desc = description(schema) ?? description(inner);
    if (hint) hints[key] = desc ? { ...hint, description: desc } : hint;
    else if (desc) hints[key] = { type: "desc", description: desc };
  }
  for (const nestedKey of ["vendor_params", "overrides"]) {
    const nested = shape[nestedKey];
    const nestedShape = nested ? objectShape(unwrap(nested)) : undefined;
    if (nestedShape) Object.assign(hints, extractParamHints(nestedShape) ?? {});
  }
  return Object.keys(hints).length > 0 ? hints : undefined;
}

export function buildToolMetas(collected: ReadonlyMap<string, CollectedTool>): Record<string, unknown> {
  const metas: Record<string, unknown> = {};
  for (const [name, reg] of collected) {
    const inferred = extractParamHints(reg.inputSchema);
    const paramHints = inferred || reg.paramHints ? { ...inferred, ...reg.paramHints } : undefined;
    if (!paramHints && !reg.confirmable && !reg.confirmationMode && !reg.vendorParamHints) continue;
    metas[`${TOOL_PREFIX}${name}`] = {
      ...(paramHints ? { paramHints } : {}),
      ...(reg.vendorParamHints ? { vendorParamHints: reg.vendorParamHints } : {}),
      ...(reg.confirmable ? { confirmable: true } : {}),
      ...(reg.confirmationMode ? { confirmationMode: reg.confirmationMode } : {}),
    };
  }
  return metas;
}

export async function pushToolMetas(gw: GatewayClient, collected: ReadonlyMap<string, CollectedTool>): Promise<void> {
  const metas = buildToolMetas(collected);
  const count = Object.keys(metas).length;
  if (count === 0) return;
  await gw.pushToolMetas(metas);
  process.stderr.write(`[hub] pushed tool metas for ${count} tools\n`);
}
