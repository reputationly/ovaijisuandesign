/**
 * 从参照抓包生成 v3 工具的描述与 schema（第 316 轮）。
 *
 * 背景：验收发现我们的 25 个 v3 工具**只有名字对上**，描述 0/25 一致、参数 19/25 不同。
 * v3 的 agent 配置是照参照原文复制的，它会按参照的参数名调用工具，
 * 参数名不同就会调用失败。所以这里把参照的 description / inputSchema 逐字搬过来。
 *
 * 数据来源：`scripts/mcp-compare/reference-tools.json`（真跑参照 mcp-tools-v3 的 tools/list）。
 *
 * 输出：`app/mcp-tools/src/tools/v3-tool-specs.ts`
 *   - 每个工具一条 `{ description, shape }`
 *   - `shape` 是 zod 的 raw shape（registrar 会包成 z.object(...).passthrough()）
 *
 * 只覆盖参照实际用到的 JSON Schema 子集（见下面 HANDLED）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const SRC = path.join(REPO, "scripts/mcp-compare/reference-tools.json");
const OUT = path.join(REPO, "app/mcp-tools/src/tools/v3-tool-specs.ts");

const HANDLED = new Set([
  "type",
  "description",
  "properties",
  "required",
  "enum",
  "items",
  "anyOf",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "additionalProperties",
  "default",
  "const",
  "$schema",
  "title",
  "examples",
  "format",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "$ref",
]);

const lit = (v) => JSON.stringify(v);

/** JSON Pointer（只支持 #/a/b/c 这种同文档引用，参照里只用到这一种）。 */
function resolveRef(root, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) return undefined;
  let node = root;
  for (const raw of ref.slice(2).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (node == null || typeof node !== "object") return undefined;
    node = node[key];
  }
  return node;
}

/** 把 JSON Schema 的一个节点翻成 zod 表达式。 */
function toZod(schema, ctx) {
  const { unhandled, root } = ctx;
  if (schema === true || schema == null || typeof schema !== "object") return "z.unknown()";

  for (const key of Object.keys(schema)) {
    if (!HANDLED.has(key)) unhandled.add(key);
  }

  if (typeof schema.$ref === "string") {
    const target = resolveRef(root, schema.$ref);
    if (!target) {
      unhandled.add(`$ref(unresolved:${schema.$ref})`);
      return "z.unknown()";
    }
    return toZod(target, ctx);
  }

  if (Array.isArray(schema.anyOf)) {
    const branches = schema.anyOf.map((b) => toZod(b, ctx));
    const unique = [...new Set(branches)];
    const inner =
      unique.length === 1 ? unique[0] : `z.union([${unique.join(", ")}])`;
    return inner;
  }

  if (Array.isArray(schema.enum)) {
    const values = schema.enum;
    if (values.every((v) => typeof v === "string") && values.length > 0) {
      return `z.enum([${values.map(lit).join(", ")}])`;
    }
    const union = [...new Set(values.map((v) => `z.literal(${lit(v)})`))];
    return union.length === 1 ? union[0] : `z.union([${union.join(", ")}])`;
  }

  if (schema.const !== undefined) return `z.literal(${lit(schema.const)})`;

  switch (schema.type) {
    case "string": {
      let s = "z.string()";
      if (typeof schema.minLength === "number" && schema.minLength > 0)
        s += `.min(${schema.minLength})`;
      if (typeof schema.maxLength === "number") s += `.max(${schema.maxLength})`;
      return s;
    }
    case "number":
    case "integer": {
      let s = schema.type === "integer" ? "z.number().int()" : "z.number()";
      if (typeof schema.minimum === "number") s += `.min(${schema.minimum})`;
      if (typeof schema.maximum === "number") s += `.max(${schema.maximum})`;
      if (typeof schema.exclusiveMinimum === "number") s += `.gt(${schema.exclusiveMinimum})`;
      if (typeof schema.exclusiveMaximum === "number") s += `.lt(${schema.exclusiveMaximum})`;
      return s;
    }
    case "boolean":
      return "z.boolean()";
    case "null":
      return "z.null()";
    case "array": {
      const inner = toZod(schema.items ?? {}, ctx);
      let s = `z.array(${inner})`;
      if (typeof schema.minItems === "number" && schema.minItems > 0)
        s += `.min(${schema.minItems})`;
      if (typeof schema.maxItems === "number") s += `.max(${schema.maxItems})`;
      return s;
    }
    case "object": {
      const props = schema.properties;
      if (props && typeof props === "object" && Object.keys(props).length > 0) {
        const required = new Set(schema.required ?? []);
        const total = required.size;
        const lines = Object.entries(props).map(([name, sub]) => {
          let z = toZod(sub, ctx);
          if (sub && typeof sub === "object" && typeof sub.description === "string" && !z.includes(".describe("))
            z += `.describe(${lit(sub.description)})`;
          if (!required.has(name)) z += ".optional()";
          return `      ${lit(name)}: ${z},`;
        });
        // 参照里 properties 为空但 required 非空的工具（如只带枚举）走不到这里
        void total;
        return `z.object({\n${lines.join("\n")}\n    })`;
      }
      return "z.record(z.string(), z.unknown())";
    }
    default:
      return "z.unknown()";
  }
}

const raw = JSON.parse(readFileSync(SRC, "utf8"));
const tools = raw.tools ?? raw.items ?? [];
if (tools.length === 0) {
  console.error("✗ reference-tools.json 里没有工具");
  process.exit(1);
}

const unhandled = new Set();
const entries = [];

/**
 * 顶层输出 **raw shape**（`{ key: z.xxx }`），不是 `z.object(...)`。
 * registrar 的 `inputSchema` 字段本来就是 ZodRawShape，它会自己包 `z.object(shape).passthrough()`。
 * 嵌套层级仍然是 `z.object(...)`。
 */
function toZodShape(schema, ctx) {
  if (schema && typeof schema === "object" && schema.type === "object" && schema.properties) {
    const full = toZod(schema, ctx);
    return full.replace(/^z\.object\(\{/, "{").replace(/\}\)$/, "}");
  }
  return "{}";
}

for (const tool of tools) {
  const schema = tool.inputSchema ?? {};
  const shape = toZodShape(schema, { unhandled, root: schema });
  entries.push(
    `  ${lit(tool.name)}: {\n` +
      `    description: ${lit(tool.description ?? "")},\n` +
      `    shape: ${shape},\n` +
      `  },`,
  );
}

const header = `/**
 * v3 工具的描述与 schema —— **逐字来自参照**，不要手改。
 *
 * 生成器：\`node scripts/mcp-compare/gen-v3-schemas.mjs\`
 * 数据源：\`scripts/mcp-compare/reference-tools.json\`（真跑参照 mcp-tools-v3 的 tools/list）
 *
 * 为什么必须是原文：v3 的 agent 配置是照参照复制的，它会按参照的参数名调用工具。
 * 参数名或描述不同，agent 的工具调用就会失败（验收第 M6 项曾因此不通过）。
 *
 * 注意：本文件只由生成器产出。要改 schema，先改参照抓包再重新生成，
 * 手改会在下次生成时被覆盖。
 */
import { z } from "zod";

export interface V3ToolSpec {
  description: string;
  /** 顶层是 raw shape（ZodRawShape）；registrar 会包成 z.object(shape).passthrough()。 */
  shape: Record<string, z.ZodTypeAny>;
}

export const V3_TOOL_SPECS = {
${entries.join("\n")}
} satisfies Record<string, V3ToolSpec>;

export type V3ToolName = keyof typeof V3_TOOL_SPECS;

/** 从生成出来的 raw shape 反推 handler 的 args 类型（字段名与可选性都保真）。 */
export type V3Args<K extends V3ToolName> = z.infer<
  z.ZodObject<(typeof V3_TOOL_SPECS)[K]["shape"]>
>;

export const V3_TOOL_NAMES = Object.keys(V3_TOOL_SPECS) as V3ToolName[];
`;

writeFileSync(OUT, header);
console.log(`✓ 生成 ${tools.length} 个 v3 工具规格 → ${path.relative(REPO, OUT)}`);
if (unhandled.size > 0) {
  console.log(`⚠ 未处理的 JSON Schema 关键字（已按 z.unknown() 兜底）：${[...unhandled].join(", ")}`);
}
