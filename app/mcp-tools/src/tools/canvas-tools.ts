import { z } from "zod";

import { errorMessage } from "../gateway-client.js";
import { errorReply, structuredReply } from "../replies.js";
import {
  ApplyTextEditsResponseSchema,
  AssetMetadataSchema,
  CANVAS_NODE_TYPES,
  CanvasNodeListResponseSchema,
  detailCacheKey,
  EdgeSummarySchema,
  fetchNodeDetails,
  getCachedDetails,
  GroupNodesResponseSchema,
  GroupRecentOutputsResponseSchema,
  invalidateCanvasDetailCache,
  NODE_DETAIL_CHILD_IDS_LIMIT,
  setCachedDetails,
  SkippedNodeEntrySchema,
  TableContentSchema,
  TableRowHeights,
  UngroupResponseSchema,
  type CanvasNodeDetail,
  type CanvasNodeDetails,
} from "./canvas-api.js";
import {
  applyAnchoredEdits,
  buildMarkdownOutline,
  countLines,
  grepTextContent,
  READ_TEXT_DEFAULT_LIMIT,
  READ_TEXT_MAX_LIMIT,
  readTextWindow,
} from "./canvas-text.js";
import {
  CANVAS_WRITE_KINDS,
  CanvasWriteItemSchema,
  TableColumnInputSchema,
  TableFilterInputSchema,
  TableRowInputSchema,
  UPDATE_TEXT_MODES,
  writeCanvasItem,
  type CanvasWriteItem,
  type CanvasWriteResult,
} from "./canvas-write.js";
import { checkAgentText, SafetyBlockedError } from "./safety.js";
import type { RegisterTools } from "./types.js";

/**
 * 画布九件套。读路径都走 `POST /api/canvas/nodes/detail` 拿全文，
 * grep / 行窗口 / 大纲在 MCP 里算；写路径成功后清空详情缓存。
 */

const TEXT_CONTENT_INLINE_MAX = 4_000;
const TEXT_PREVIEW_CHARS = 600;

/** 长文档不整篇塞给模型：给前 600 字 + 大纲 + 行数，引导用 grep / read 定位。 */
function shapeNodeForLlm(node: CanvasNodeDetail): Record<string, unknown> {
  const text = node.textContent;
  if (text === undefined) return { ...node };
  const stats = { textTotalLines: countLines(text), textTotalChars: text.length };
  if (text.length <= TEXT_CONTENT_INLINE_MAX) return { ...node, ...stats };
  const { textContent: _omit, ...rest } = node;
  return { ...rest, ...stats, textPreview: text.slice(0, TEXT_PREVIEW_CHARS), textOutline: buildMarkdownOutline(text) };
}

function shapeDetailsForLlm(d: CanvasNodeDetails): Record<string, unknown> {
  return { nodes: d.nodes.map(shapeNodeForLlm), ...(d.missing ? { missing: d.missing } : {}) };
}

const OutlineSchema = z.array(z.object({ line: z.number(), text: z.string() }));

const NodeSummaryOutput = z.object({
  id: z.string().describe("Canvas node ID"),
  type: z.string().describe("Node type: image | video | audio | text | placeholder"),
  name: z.string().optional().describe("Asset display name"),
  label: z.string().optional().describe("GROUP nodes only: the user-supplied group label, when set. Absent for non-group nodes and for groups whose label has not been set."),
  promptSnippet: z.string().optional().describe("Truncated prompt (max 100 chars)"),
  pluginId: z.string().optional().describe("Plugin-backed file nodes only: installed plugin id, e.g. \"comfyui\""),
  currentWorkflowId: z.string().optional().describe("Plugin-backed file nodes only: persistent template/user identity currently bound to this canvas node. " +
    "For ComfyUI canvas operations, use this node summary id as source_node_id so the node-owned Draft is read; do not execute by currentWorkflowId."),
  currentWorkflowName: z.string().optional().describe("User-visible name of the workflow currently bound to this plugin node"),
  sourceTemplateId: z.string().optional().describe("ComfyUI lineage metadata only: exact template id from which this node Draft originated. " +
    "Use it to collect candidate Drafts for a selected template, never as the selector for get/edit/run."),
  sourceTemplateName: z.string().optional().describe("User-visible name of the source template; display metadata only, never identity"),
  hasWorkflowContent: z.boolean().optional().describe("Whether this plugin node currently has readable workflow graph content"),
});

const NodeDetailOutput = z.object({
  id: z.string().describe("Canvas node ID"),
  type: z.string().describe("Node type"),
  name: z.string().optional().describe("Asset display name"),
  pluginId: z.string().optional().describe('Plugin-backed file nodes only: installed plugin id, e.g. "comfyui"'),
  currentWorkflowId: z.string().optional().describe(
    "Plugin-backed file nodes only: persistent template/user identity currently bound to this canvas node. For ComfyUI canvas operations, use this node detail id as source_node_id so the node-owned Draft is read; do not execute by currentWorkflowId."
  ),
  currentWorkflowName: z.string().optional().describe("User-visible name of the workflow currently bound to this plugin node"),
  sourceTemplateId: z.string().optional().describe(
    "ComfyUI lineage metadata only: exact template id from which this node Draft originated. Use it to collect candidate Drafts for a selected template, never as the selector for get/edit/run."
  ),
  sourceTemplateName: z.string().optional().describe("User-visible name of the source template; display metadata only, never identity"),
  hasWorkflowContent: z.boolean().optional().describe("Whether this plugin node currently has readable workflow graph content"),
  prompt: z.string().optional().describe("Full generation prompt"),
  metadata: AssetMetadataSchema.optional().describe(
    "Whitelisted asset metadata. Internal bookkeeping fields (paths, fingerprints, trace ids, thumbnails) are stripped server-side."
  ),
  filePath: z.string().optional().describe(
    'Media nodes (image/video/audio) only: project-relative path of the backing asset file. Pass it to hub_analyse_media (type="semantic") to actually SEE the media \u2014 node detail is metadata-only and is never a substitute for visual inspection.'
  ),
  textContent: z.string().optional().describe(
    `Markdown content for text nodes, inlined ONLY when the document is short (<= ${TEXT_CONTENT_INLINE_MAX} chars). Longer documents return textPreview + textTotalLines/textTotalChars/textOutline instead \u2014 use canvas_grep_text / canvas_read_text to inspect them.`
  ),
  textPreview: z.string().optional().describe(
    "Text nodes over the inline limit: first ~600 chars of the markdown. NOT the full document \u2014 navigate with textOutline + canvas_grep_text / canvas_read_text."
  ),
  textTotalLines: z.number().optional().describe("Text nodes: total line count"),
  textTotalChars: z.number().optional().describe("Text nodes: total character count"),
  textOutline: z.array(z.object({ line: z.number(), text: z.string() })).optional().describe("Text nodes over the inline limit: heading outline with 1-based line numbers"),
  textContentHash: z.string().optional().describe("SHA-256 version token required by canvas_apply_text_edits"),
  tableContent: TableContentSchema.optional().describe(
    "Decoded table contents for table nodes: columns + rows + optional filter/rowHeight, in an LLM-friendly shape with no internal IDs"
  ),
  incomingEdges: z.array(EdgeSummarySchema).optional().describe("Edges pointing TO this node"),
  outgoingEdges: z.array(EdgeSummarySchema).optional().describe("Edges originating FROM this node"),
  childIds: z.array(z.string()).optional().describe(
    `Group nodes only: ids of children whose parentId references this group, sorted by node id. Empty array means an empty group; absent means the node is not a group. Capped at ${NODE_DETAIL_CHILD_IDS_LIMIT}; when truncated, childIdsTotal reports the true membership count and the agent should fall back to canvas_list_nodes for the full list.`
  ),
  childIdsTotal: z.number().optional().describe(
    `Total membership count when childIds was truncated to ${NODE_DETAIL_CHILD_IDS_LIMIT}. Only set on group nodes whose membership exceeds the cap.`
  )
});

const WriteResultOutput = z.object({
  index: z.number().int().min(0).optional().describe("[batch] Item index in `items`."),
  kind: z.enum(CANVAS_WRITE_KINDS).optional().describe("Node kind written by this result."),
  ok: z.boolean().describe("True when this write succeeded."),
  error: z.string().optional().describe("Error message when ok=false."),
  nodeId: z.string().optional().describe("Canvas node ID when ok=true."),
  assetId: z.string().optional().describe("[text/media] Backing asset UUID."),
  contentLength: z.number().optional().describe("[text] Result markdown length."),
  path: z.string().optional().describe("[text create] Workspace-relative .md path."),
  tablePath: z.string().optional().describe("[table] Workspace-relative .htable path."),
  columnCount: z.number().optional().describe("[table] Column count."),
  rowCount: z.number().optional().describe("[table] Row count."),
  assetType: z.enum(["image", "video", "audio"]).optional().describe("[media] Asset type."),
  assetPath: z.string().optional().describe("[media] Workspace-relative placed path."),
  created: z.boolean().optional().describe("[text/table] True when a node was created."),
  reused: z.boolean().optional().describe("[media] True when an existing card was reused."),
  wrapped: z.boolean().optional().describe("[text] Nested JSON content was unwrapped."),
  warnings: z.array(z.string()).optional().describe("Non-fatal write warnings.")
});

const HASH_DESC = "SHA-256 version token of the current content — valid for canvas_apply_text_edits.expectedContentHash";

export const registerCanvasTools: RegisterTools = (registrar, gw) => {
  /** 单节点全文，走缓存；非文本节点给出可读的错误。 */
  async function fetchText(nodeId: string): Promise<{ content: string; hash: string } | { error: string }> {
    const key = detailCacheKey([nodeId]);
    let details = getCachedDetails(key);
    if (!details) {
      details = await fetchNodeDetails(gw, [nodeId]);
      setCachedDetails(key, details);
    }
    const node = details.nodes[0];
    if (!node) {
      return { error: details.missing?.includes(nodeId) ? `No canvas node with id ${nodeId}` : `Could not load canvas node ${nodeId}` };
    }
    const body = node.textContent;
    const version = node.textContentHash;
    if (body === undefined || !version) {
      return { error: `Node ${nodeId} has type=${node.type}; only text nodes can be searched or read` };
    }
    return { content: body, hash: version };
  }

  registrar.registerTool(
    "canvas_list_nodes",
    {
      description:
        "List nodes on the canvas as token-friendly summaries. Filter by `type` (image/video/audio/text/file/table/placeholder/group). " +
        "Returns `{ count, nodes }` (default 50, max 500; use `offset` to page). " +
        "Plugin-backed file nodes include `pluginId` and workflow identity/provenance metadata. " +
        "For a selected ComfyUI template, collect candidates by exact `sourceTemplateId` (plus legacy exact `currentWorkflowId`); this only groups independent " +
        "Drafts. If multiple candidates remain, inspect and ask the user to choose. " +
        "Always pass the chosen node's own `id` as `source_node_id` to get/edit/preflight/run; never execute by `sourceTemplateId`, name, or `currentWorkflowId" +
        "`. To enumerate a group's children, prefer `canvas_get_node` on the group id (its `childIds` lists every member). " +
        "Decision rules: see canvas-orchestration contract §10.",
      inputSchema: {
        type: z.enum(CANVAS_NODE_TYPES).optional().describe("Filter by canvas node type"),
        limit: z.number().int().min(1).max(500).optional().describe("Maximum summaries to return (default 50)"),
        offset: z.number().int().min(0).optional().describe("Number of summaries to skip from the start (default 0)"),
      },
      outputSchema: {
        count: z.number().describe("Total nodes matching the filter (before limit/offset)"),
        nodes: z.array(NodeSummaryOutput).describe("Node summaries for the current page"),
      },
    },
    async (args) => {
      try {
        const q = new URLSearchParams();
        if (args.type) q.set("type", args.type);
        if (args.limit) q.set("limit", String(args.limit));
        if (args.offset) q.set("offset", String(args.offset));
        const qs = q.toString();
        const r = await gw.get(qs ? `/api/canvas/nodes?${qs}` : "/api/canvas/nodes", 10_000, CanvasNodeListResponseSchema);
        return structuredReply({ count: r.count, nodes: r.nodes });
      } catch (err) {
        return errorReply(err);
      }
    },
  );

  registrar.registerTool(
    "canvas_get_node",
    {
      description:
        `Fetch full detail for one or more canvas nodes. Pass \`nodeId\` (single) or \`nodeIds\` (batch, max 50; preferred for multiple). Returns \`{ nodes, missing? }\`. Text nodes inline \`textContent\` only when short (<= ${TEXT_CONTENT_INLINE_MAX} chars) and always carry \`textContentHash\` + \`textTotalLines\`/\`textTotalChars\`; longer documents return \`textPreview\` + \`textOutline\` instead \u2014 inspect them with canvas_grep_text / canvas_read_text, do NOT expect the full body here. Tables include decoded \`tableContent\` (LLM-friendly columns + rows); media include whitelisted asset \`metadata\` plus \`filePath\` (project-relative). Plugin-backed file nodes include \`pluginId\`, current workflow identity, source-template provenance, and graph availability. \`sourceTemplateId\` may group candidate ComfyUI Drafts but is never an execution selector. For \`pluginId="comfyui"\`, pass the returned node \`id\` as \`source_node_id\` to get/edit/preflight/run so the exact node-owned Draft is used. Never substitute a name, \`sourceTemplateId\`, or \`currentWorkflowId\` for that node selector. Group nodes include \`childIds\` (truncated to 50 with \`childIdsTotal\` if larger \u2014 use \`canvas_list_nodes\` for the full set). Each node also returns \`incomingEdges\` / \`outgoingEdges\`. Internal fields (assetId, position, intrinsic size) are intentionally omitted.

IMPORTANT: this tool returns METADATA ONLY \u2014 it never returns image/video/audio content, so calling it does NOT count as viewing the media. To visually inspect an image/video node (composition, occlusion, staging, rendered-snapshot verification), pass its \`filePath\` to hub_analyse_media with type="semantic" and a concrete question. Decision rules: see canvas-orchestration contract \xA79.`,
      inputSchema: {
        nodeId: z.string().optional().describe("Single canvas node ID"),
        nodeIds: z.array(z.string()).max(50).optional().describe("Batch of canvas node IDs (preferred for multiple, max 50)"),
      },
      outputSchema: {
        nodes: z.array(NodeDetailOutput).describe("Full details for the requested nodes"),
        missing: z.array(z.string()).optional().describe("IDs that no longer exist on the canvas"),
      },
    },
    async (args) => {
      try {
        const ids = [...(args.nodeId ? [args.nodeId] : []), ...(args.nodeIds ?? [])];
        if (ids.length === 0) return errorReply("Nothing to fetch: pass `nodeId`, `nodeIds`, or both.");
        const key = detailCacheKey(ids);
        let details = getCachedDetails(key);
        if (!details) {
          details = await fetchNodeDetails(gw, ids);
          setCachedDetails(key, { nodes: details.nodes, ...(details.missing ? { missing: details.missing } : {}) });
        }
        return structuredReply(shapeDetailsForLlm(details));
      } catch (err) {
        return errorReply(err);
      }
    },
  );

  registrar.registerTool(
    "canvas_grep_text",
    {
      description:
        "Search INSIDE one canvas text node's markdown source (the in-node equivalent of grep). " +
        "Returns `{ contentHash, totalLines, totalMatches, matches, truncated, matchedVia }`; each match carries `line`, `matchedText`, a numbered context `sni" +
        "ppet`, and `occurrence` — the exact disambiguation token to reuse in canvas_apply_text_edits. " +
        "Rendered-text queries are safe: when a literal source grep misses (markdown markers stripped in the editor, e.g. " +
        "searching 班长（瞯眼） against source **班长**（瞯眼）), the tool falls back to normalized matching (`matchedVia: \"rendered\"`) and `matchedText` is then the EXACT" +
        " source substring — anchor with it verbatim. " +
        "`contentHash` is the document version token, so a grep (not a full read) is enough to anchor an edit batch. " +
        "Default literal matching with smart-case; set `regex: true` for patterns. " +
        "Use this instead of reading the whole document whenever you only need to locate or verify specific text. " +
        "To find the target NODE first, page through canvas_list_nodes and filter its summaries.",
      inputSchema: {
        nodeId: z.string().min(1).describe("Target canvas text node id"),
        query: z.string().min(1).describe("Literal substring (default) or regex pattern"),
        regex: z.boolean().optional().describe("Treat query as a regular expression"),
        contextBefore: z.number().int().min(0).max(50).optional().describe("Context lines before each match (default 2, max 50)"),
        contextAfter: z.number().int().min(0).max(50).optional().describe("Context lines after each match (default 2, max 50)"),
        maxMatches: z.number().int().min(1).max(100).optional().describe("Maximum matches to return (default 20)"),
      },
      outputSchema: {
        contentHash: z.string().describe(HASH_DESC),
        totalLines: z.number().describe("Total lines in the document"),
        totalMatches: z.number().describe("Total matches found (before maxMatches cap)"),
        truncated: z.boolean().describe("True when matches were dropped by maxMatches"),
        matchedVia: z.enum(["source", "rendered"]).optional().describe("'source' = literal source match. 'rendered' = recovered via normalized rendered-text matching; matchedText is then the exact source substring to ancho" +
          "r with."),
        matches: z.array(
          z.object({
            line: z.number().describe("1-based line of the match"),
            matchedText: z.string().describe("Exact matched text"),
            occurrence: z.number().describe("Zero-based occurrence of matchedText in the whole document — reuse as the `occurrence` anchor in canvas_apply_text_edits"),
            snippet: z.string().describe("Numbered context lines around the match"),
          }),
        ),
      },
    },
    async (args) => {
      try {
        const fetched = await fetchText(args.nodeId);
        if ("error" in fetched) return errorReply(fetched.error);
        const r = grepTextContent(fetched.content, args.query, {
          regex: args.regex,
          contextBefore: args.contextBefore,
          contextAfter: args.contextAfter,
          maxMatches: args.maxMatches,
        });
        if (r.invalidPattern) return errorReply(`Could not compile regex: ${args.query}`);
        return structuredReply({
          contentHash: fetched.hash,
          totalLines: countLines(fetched.content),
          totalMatches: r.totalMatches,
          truncated: r.truncated,
          ...(r.matchedVia ? { matchedVia: r.matchedVia } : {}),
          matches: r.matches,
        });
      } catch (err) {
        return errorReply(err);
      }
    },
  );

  registrar.registerTool(
    "canvas_read_text",
    {
      description:
        `Read a numbered line window from one canvas text node's markdown source (the in-node equivalent of a paged Read tool). Returns \`{ contentHash, totalLines, startLine, endLine, outline, text, truncated }\` where \`text\` is "line: content" numbered lines and \`outline\` lists headings with line numbers for navigation. Default window ${READ_TEXT_DEFAULT_LIMIT} lines, max ${READ_TEXT_MAX_LIMIT}. Use canvas_grep_text first to FIND text; use this to read surrounding context (e.g. a whole scene) before rewriting. Do not page through an entire long document \u2014 read only the windows you need.`,
      inputSchema: {
        nodeId: z.string().min(1).describe("Target canvas text node id"),
        offsetLine: z.number().int().min(1).optional().describe("1-based first line of the window (default 1)"),
        limitLines: z
          .number()
          .int()
          .min(1)
          .max(READ_TEXT_MAX_LIMIT)
          .optional()
          .describe(`Lines to read (default ${READ_TEXT_DEFAULT_LIMIT}, max ${READ_TEXT_MAX_LIMIT})`),
      },
      outputSchema: {
        contentHash: z.string().describe(HASH_DESC),
        totalLines: z.number(),
        startLine: z.number(),
        endLine: z.number(),
        truncated: z.boolean().describe("True when the window was cut short by the size cap"),
        outline: OutlineSchema.describe("Heading outline of the WHOLE document (navigation aid)"),
        text: z.string().describe("Numbered lines (`line: content`) of the requested window"),
      },
    },
    async (args) => {
      try {
        const fetched = await fetchText(args.nodeId);
        if ("error" in fetched) return errorReply(fetched.error);
        const w = readTextWindow(fetched.content, args.offsetLine, args.limitLines);
        return structuredReply({
          contentHash: fetched.hash,
          totalLines: w.totalLines,
          startLine: w.startLine,
          endLine: w.endLine,
          truncated: w.truncated,
          outline: buildMarkdownOutline(fetched.content),
          text: w.text,
        });
      } catch (err) {
        return errorReply(err);
      }
    },
  );

  registrar.registerTool(
    "canvas_apply_text_edits",
    {
      description:
        "Atomically apply anchored text edits to an existing markdown text node. " +
        "This is the DEFAULT tool for modifying an existing text node: express the change as minimal exact→replacement hunks instead of rewriting the whole doc" +
        "ument with canvas_write_node (cheaper, safer against concurrent user edits, and the editor shows reviewable red/green diff hunks). Two entry modes:\n" +
        "- <document_edit_task> (annotation) turns: preserve requestId and editSessionId exactly and retain each included target's annotationId + targetIndex. " +
        "The annotation comment defines the requested scope; selected targets only define the maximum editable region. " +
        "Omit unrelated targets rather than rewriting or emitting no-op edits.\n" +
        "- Free-form chat edits (no document_edit_task): OMIT requestId / editSessionId / annotationId entirely — the server generates them. " +
        "One edit per changed region, anchored via canvas_grep_text matches.\n" +
        "Version token: `expectedContentHash` accepts the `document.contentHash` from the <document_edit_task> payload OR the `contentHash` returned by canvas_" +
        "grep_text / canvas_read_text / canvas_get_node — whichever read is most recent. " +
        "Anchors: for pre-resolved targets copy `sourceExact` + `occurrence` verbatim; for anchors you located yourself, use the exact matched source text plus" +
        " the `occurrence` token from canvas_grep_text. " +
        "The entire submitted batch is rejected on a stale hash, ambiguous anchor, missing text, or overlapping replacements; on conflict, use the `results[].n" +
        "earest` hints in the response to correct anchors and retry once — do NOT fall back to a full-document read or rewrite.",
      inputSchema: {
        requestId: z
          .string()
          .min(1)
          .optional()
          .describe("Exact request_id from document_edit_request. REQUIRED on <document_edit_task> turns; OMIT for free-form chat edits (server generates one)."),
        editSessionId: z.string().optional().describe("Exact edit_session_id from document_edit_request. Omit for free-form edits."),
        nodeId: z.string().min(1).describe("Target canvas text node id"),
        expectedContentHash: z.string().min(1).describe("textContentHash from the latest canvas_get_node read"),
        edits: z
          .array(
            z.object({
              annotationId: z.string().min(1).optional().describe("Annotation id from the <document_edit_task> payload. Omit for free-form edits."),
              targetIndex: z.number().int().min(0).optional(),
              exact: z.string().min(1),
              prefix: z.string().optional(),
              suffix: z.string().optional(),
              occurrence: z
                .number()
                .int()
                .min(0)
                .optional()
                .describe("ZERO-BASED index of `exact` among its matches (0 = first). Copy it from canvas_grep_text; omit it when the anchor is unique. Never pass 1 to mean \"the first one\"."),
              replacement: z.string(),
            }),
          )
          .min(1)
          .max(100),
      },
      outputSchema: ApplyTextEditsResponseSchema.shape,
    },
    async (args) => {
      try {
        const request = {
          requestId: args.requestId,
          editSessionId: args.editSessionId,
          nodeId: args.nodeId,
          expectedContentHash: args.expectedContentHash,
          edits: args.edits.map((e, i) => ({ ...e, annotationId: e.annotationId ?? `chat-edit-${i}` })),
        };
        const apply = async () => {
          const r = await gw.post("/api/canvas/text-node/apply-edits", request, 15_000, ApplyTextEditsResponseSchema);
          invalidateCanvasDetailCache();
          return structuredReply(r);
        };
        const detail = await fetchNodeDetails(gw, [request.nodeId]);
        const node = detail.nodes[0];
        if (!node?.textContent || !node.textContentHash) return errorReply(`No text body available for node ${request.nodeId}`);
        // 版本已变：交给 gateway 回 version_changed 冲突（带 nearest 提示），本地不必预演
        if (node.textContentHash !== request.expectedContentHash) return await apply();
        // 本地预演出最终全文，只为先送安全检查；锚点冲突以 gateway 的判定为准（它会回 nearest 提示）
        const preview = applyAnchoredEdits(node.textContent, request.edits);
        if (preview.ok) {
          await checkAgentText(gw, [preview.content]);
        }
        return await apply();
      } catch (err) {
        if (err instanceof SafetyBlockedError) return errorReply(`Edit rejected by the content safety check (decision=${err.decision}).`);
        return errorReply(err);
      }
    },
  );

  registrar.registerTool(
    "canvas_group_nodes",
    {
      description:
        "Group ≥2 canvas nodes into a single group node. Returns `{ groupId, addedGroupId?, removedNodeIds, affectedNodeIds, skippedNodes?, hint? }`.\n" +
        "\n" +
        "AUTO-LAYOUT: this tool ALWAYS lays the resulting group out in `grid` (cols = ceil(sqrt(n))) in the same call — no follow-up layout call needed.\n" +
        "\n" +
        "MODES (auto-detected from input):\n" +
        "- CREATE — all `nodeIds` are loose: wraps them in a fresh group. Optional `label` (40 chars max) becomes the group's display title.\n" +
        "- MERGE — `nodeIds` contains ≥1 existing group: FIRST group in the list becomes the merge target; other groups dissolve and their children migrate in." +
        " `label` is ignored.\n" +
        "\n" +
        "NO-OP: returns `groupId: null` when fewer than 2 eligible nodes resolve. " +
        "Inspect `skippedNodes` for the reason — for `already-grouped`, `parentId` carries the existing group; `hint` summarises the retry shape. " +
        "NEVER assume a `null` groupId means 'nothing happened'.\n" +
        "\n" +
        "ERROR `incomplete-positions`: ≥1 participant lacks `positions[activeMode]` (renderer hasn't flushed). " +
        "Tell the user to interact with the canvas once, then retry.\n" +
        "\n" +
        "Decision rules (CREATE vs MERGE, label discipline, when to use `canvas_group_recent_outputs` instead): see canvas-orchestration contract §6.",
      inputSchema: {
        nodeIds: z
          .array(z.string())
          .min(2)
          .describe("Canvas node IDs to group (at least 2). Order matters in MERGE mode: first group in the list becomes the merge target."),
        label: z
          .string()
          .max(40)
          .optional()
          .describe("Optional group title (CREATE mode only; ignored in MERGE mode). Trimmed and clamped to 40 chars; empty / whitespace counts as 'no label'. Strongly recommended when batch-organising the canvas — without it, the renderer shows the generic '分组 N 个节点' fallback."),
      },
      outputSchema: {
        groupId: z.string().nullable().describe("Resulting group id (newly created in CREATE mode; merge target in MERGE mode). Null when no-op."),
        addedGroupId: z.string().optional().describe("Newly created group id (CREATE mode only). Absent in MERGE mode and on no-op."),
        removedNodeIds: z.array(z.string()).describe("Group ids that were dissolved (only populated in MERGE mode)."),
        affectedNodeIds: z.array(z.string()).describe("IDs of nodes whose parent or position changed (children migrated into the group, plus the merge target itself when its frame shifted). " +
          "Use canvas_get_node / canvas_list_nodes if you need details — full node bodies are intentionally omitted to keep token usage low."),
        skippedNodes: z.array(SkippedNodeEntrySchema).optional().describe("Caller-provided ids the eligibility filter silently dropped, with a substantive `reason` (`unknown` | `already-grouped`). " +
          "Present only when non-empty. For `already-grouped`, `parentId` carries the group the node currently belongs to — most actionable signal: retry in MERG" +
          "E mode with that parentId in nodeIds. Reported on BOTH no-op and success paths (success can still partially drop ids when MERGE adopts some loose node" +
          "s while skipping others that already belonged to a third group)."),
        hint: z.string().optional().describe("One-line self-correction prompt. Present only when groupId is null AND skippedNodes contains an `already-grouped` entry — explains how to reshape node" +
          "Ids for a successful retry."),
      },
    },
    async (args) => {
      try {
        const body: Record<string, unknown> = { nodeIds: args.nodeIds, layout: "grid" };
        if (args.label !== undefined) body.label = args.label;
        const r = await gw.post("/api/canvas/group", body, 10_000, GroupNodesResponseSchema);
        invalidateCanvasDetailCache();
        const out: Record<string, unknown> = {
          groupId: r.groupId,
          removedNodeIds: r.removedNodeIds,
          affectedNodeIds: r.updatedNodes.map((n) => n.id),
        };
        const addedGroupId = r.addedNodes[0]?.id;
        if (addedGroupId !== undefined) out.addedGroupId = addedGroupId;
        if (r.skippedNodes !== undefined) out.skippedNodes = r.skippedNodes;
        const hint = r.groupId === null ? regroupHint(r.skippedNodes ?? []) : undefined;
        if (hint !== undefined) out.hint = hint;
        return structuredReply(out);
      } catch (err) {
        return errorReply(err);
      }
    },
  );

  registrar.registerTool(
    "canvas_group_recent_outputs",
    {
      description:
        "Group THIS round's freshly generated assets into a single titled group. " +
        "PRECONDITION — only call when this round produced 2 OR MORE asset outputs; on single-output turns do NOT call it, just reply. " +
        "No node ids needed — the gateway picks ungroupd, asset-backed, non-upload nodes newer than the last group and lays them out in a grid. " +
        "Zero token cost for node enumeration. Returns `{ groupId, reason? }`.\n" +
        "\n" +
        "NO-OP: returns `groupId: null` with `reason: 'insufficient-candidates'` when fewer than 2 eligible outputs exist — if you reach this, you called it wh" +
        "en you shouldn't have; do NOT retry.\n" +
        "\n" +
        "`label`: summarises this round's intent (trimmed to 40 chars). For hand-picked / MERGE / non-grid use `canvas_group_nodes` instead. " +
        "Decision rules: see canvas-orchestration contract §6 + canvas-auto-group contract.",
      inputSchema: {
        label: z
          .string()
          .max(40)
          .optional()
          .describe("Group title summarising this round's outputs. Trimmed and clamped to 40 chars; empty / whitespace falls back to the renderer's '分组 N 个节点' default. Strongly recommended so the user can tell which round produced the group."),
      },
      outputSchema: {
        groupId: z.string().nullable().describe("New group id, or null when nothing was grouped."),
        groupedCount: z.number().describe("Number of nodes placed into the group (0 when groupId is null)."),
        label: z.string().optional().describe("Applied label, when one was supplied."),
        reason: z
          .enum(["insufficient-candidates", "no-op", "no-session-scope"])
          .optional()
          .describe("Why nothing happened (present only when groupId is null). " +
            "'no-session-scope' = the gateway could not attribute outputs to this session and refused an unsafe whole-canvas grouping; do NOT retry, just reply."),
      },
    },
    async (args) => {
      try {
        const r = await gw.post("/api/canvas/group-recent-outputs", { label: args.label }, 10_000, GroupRecentOutputsResponseSchema);
        invalidateCanvasDetailCache();
        return structuredReply(r);
      } catch (err) {
        return errorReply(err);
      }
    },
  );

  registrar.registerTool(
    "canvas_write_node",
    {
      description:
        "Create or update one or more canvas nodes. This is the default write surface for agents. " +
        "Use kind=\"text\" for markdown create/patch, kind=\"table\" for table create/replace, and kind=\"media\" only for external media that did not come from anot" +
        "her built-in asset-producing tool. For a direct image/video/audio URL discovered with hub_browser, kind=\"media\" is the preferred download-and-deliver " +
        "path; use items[] for multiple URLs. The URL must return media bytes directly — Pinterest pin pages, pin.it short links, and other HTML pages must be " +
        "opened/extracted first. Image/video/speech/music/ffmpeg/editing outputs are already placed on canvas automatically; never write them again. " +
        "Prefer items[] batch mode for multiple independent writes. " +
        "For text patch, pass nodeId and optional mode replace/append/prepend; do not pass mode without nodeId. " +
        "PARTIAL TEXT EDITS: to modify parts of an existing text node (fix lines, rewrite a section, edit table cells inside the markdown), use canvas_apply_te" +
        "xt_edits with anchored hunks instead of a full replace — cheaper, conflict-safe, and the user gets reviewable diff hunks. " +
        "Reserve kind=\"text\" patch replace for genuine full-document rewrites and pass expectedContentHash from your latest read.",
      inputSchema: {
        items: z.array(CanvasWriteItemSchema).min(1).max(20).optional().describe("Batch writes. Each item uses the same fields as a single write. Max 20."),
        kind: z.enum(CANVAS_WRITE_KINDS).optional().describe("Single-write node kind: text | table | media. Omit when using items."),
        content: z.string().optional().describe("[text] Markdown content. Required for kind=text."),
        nodeId: z.string().optional().describe("[text/table] Existing node to patch/replace. Omit to create a new node."),
        name: z.string().optional().describe("[text create] File name without extension."),
        title: z.string().optional().describe("[table] Optional cached preview title."),
        columns: z.array(TableColumnInputSchema).optional().describe("[table] Table columns."),
        rows: z.array(TableRowInputSchema).optional().describe("[table] Table rows."),
        filter: TableFilterInputSchema.optional().describe("[table] Optional table filter."),
        rowHeight: z.enum(TableRowHeights).optional().describe("[table] Row-height preset."),
        assetPath: z
          .string()
          .optional()
          .describe("[media] Workspace-relative tracked media path or a direct http(s) image/video/audio URL. Do not pass a web page URL; first use hub_browser to extract the direct media URL."),
        sourceNodeId: z.string().optional().describe("[create/media] Source node id for one derivation edge."),
        sourceNodeIds: z.array(z.string()).optional().describe("[create] Source node ids."),
        mode: z.enum(UPDATE_TEXT_MODES).optional().describe("[text patch only] replace | append | prepend. Requires nodeId."),
        expectedContentHash: z
          .string()
          .optional()
          .describe("[text patch only] CAS token: contentHash from your latest canvas_get_node / canvas_grep_text / canvas_read_text. Rejected (409) when the document changed since that read."),
        allowDuplicate: z.boolean().optional().describe("[media] Force a second card for the same file. Default false."),
      },
      outputSchema: {
        batch: z.boolean().optional().describe("True when items[] batch mode was used."),
        kind: z.enum(CANVAS_WRITE_KINDS).optional().describe("Echoed node kind for single writes."),
        ok: z.boolean().describe("True on successful write."),
        error: z.string().optional().describe("Error message when ok=false."),
        count: z.number().optional().describe("[batch] Number of requested writes."),
        successCount: z.number().optional().describe("[batch] Number of successful writes."),
        errorCount: z.number().optional().describe("[batch] Number of failed writes."),
        results: z.array(WriteResultOutput).optional(),
        errors: z.array(WriteResultOutput).optional(),
        nodeId: z.string().optional(),
        assetId: z.string().optional(),
        contentLength: z.number().optional(),
        path: z.string().optional(),
        tablePath: z.string().optional(),
        columnCount: z.number().optional(),
        rowCount: z.number().optional(),
        assetType: z.enum(["image", "video", "audio"]).optional(),
        assetPath: z.string().optional(),
        created: z.boolean().optional(),
        reused: z.boolean().optional(),
        wrapped: z.boolean().optional(),
        warnings: z.array(z.string()).optional()
      },
    },
    async (args) => {
      try {
        if (Array.isArray(args.items)) {
          // 逐项串行：同一批里可能先建后改，并发会乱序
          const results: (CanvasWriteResult & { index: number })[] = [];
          for (const [index, item] of args.items.entries()) {
            try {
              results.push({ index, ...(await writeCanvasItem(gw, item)) });
            } catch (err) {
              results.push({ index, kind: item.kind, ok: false, error: errorMessage(err) });
            }
          }
          const errors = results.filter((r) => r.ok !== true);
          invalidateCanvasDetailCache();
          return structuredReply({
            batch: true,
            ok: errors.length === 0,
            count: results.length,
            successCount: results.length - errors.length,
            errorCount: errors.length,
            results,
            ...(errors.length > 0 ? { errors } : {}),
          });
        }
        if (!args.kind) return structuredReply({ ok: false, error: "Nothing to write: set `kind` for one node, or pass `items` for several." });
        const result = await writeCanvasItem(gw, args as CanvasWriteItem);
        if (result.ok) invalidateCanvasDetailCache();
        return structuredReply({ ...result });
      } catch (err) {
        if (err instanceof SafetyBlockedError) {
          return errorReply(`Write rejected by the content safety check (decision=${err.decision}). Reword the text or pick another subject.`);
        }
        return structuredReply({ ok: false, ...(args.kind ? { kind: args.kind } : {}), error: errorMessage(err) });
      }
    },
  );

  registrar.registerTool(
    "canvas_ungroup_node",
    {
      description:
        "Dissolve one existing canvas group while preserving its child nodes. " +
        "The children become loose canvas nodes and keep the absolute positions restored by the gateway. " +
        "Returns `removed: false` when the id is missing or is not a group; do not retry that no-op. " +
        "If the gateway reports `incomplete-positions`, ask the user to interact with the canvas once before retrying.",
      inputSchema: {
        groupId: z.string().min(1).describe("Canvas node ID of the group to dissolve."),
      },
      outputSchema: {
        removed: z.boolean().describe("True when the group was dissolved."),
        removedNodeIds: z.array(z.string()).describe("Removed group node IDs. Empty when the operation was a no-op."),
        affectedNodeIds: z.array(z.string()).describe("Child node IDs whose parent or absolute position changed."),
      },
    },
    async ({ groupId }) => {
      try {
        const r = await gw.post("/api/canvas/ungroup", { groupId }, 10_000, UngroupResponseSchema);
        if (r.removed) invalidateCanvasDetailCache();
        return structuredReply({ removed: r.removed, removedNodeIds: r.removedNodeIds, affectedNodeIds: r.updatedNodes.map((n) => n.id) });
      } catch (err) {
        return errorReply(err);
      }
    },
  );
};

/** 无操作且有“已在别的组里”的节点时，告诉 agent 怎么改成合并模式重试。 */
function regroupHint(skipped: z.infer<typeof SkippedNodeEntrySchema>[]): string | undefined {
  const already = skipped.filter((s) => s.reason === "already-grouped");
  if (skipped.length === 0 || already.length === 0) return undefined;
  const summary = skipped.map((s) => `${s.nodeId}(${s.reason}${s.parentId ? `, parent=${s.parentId}` : ""})`).join("; ");
  const parents = [...new Set(already.map((s) => s.parentId).filter((p): p is string => typeof p === "string"))];
  if (parents.length <= 1) {
    const target = parents[0];
    return (
      `Dropped ${skipped.length} id(s): ${summary}. To add the loose nodes to that existing group, call again with the group first ` +
      `so it merges: nodeIds=[${target ? `"${target}", ` : ""}<loose-ids...>]`
    );
  }
  return (
    `Dropped ${skipped.length} id(s): ${summary}. They sit in ${parents.length} separate groups ` +
    `(${parents.map((p) => `"${p}"`).join(", ")}), so the merge target is ambiguous. Choose one group and call again with it first: ` +
    `nodeIds=["<chosen-group>", <loose-ids...>].`
  );
}
