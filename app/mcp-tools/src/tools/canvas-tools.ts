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
  id: z.string().describe("Canvas node id"),
  type: z.string().describe("Node type"),
  name: z.string().optional().describe("Display name of the backing asset"),
  label: z.string().optional().describe("Group nodes only: the group title, when one was set"),
  promptSnippet: z.string().optional().describe("First ~100 chars of the generation prompt"),
  pluginId: z.string().optional().describe("Set only on nodes backed by a plugin: the id of that plugin"),
  currentWorkflowId: z.string().optional().describe("Plugin nodes only: workflow identity currently bound to the node; not an execution selector"),
  currentWorkflowName: z.string().optional().describe("Plugin nodes only: display name of the bound workflow"),
  sourceTemplateId: z.string().optional().describe("Plugin nodes only: template this node draft came from; lineage metadata, never a selector"),
  sourceTemplateName: z.string().optional().describe("Plugin nodes only: display name of the source template"),
  hasWorkflowContent: z.boolean().optional().describe("Plugin nodes only: whether a readable workflow graph exists"),
});

const NodeDetailOutput = NodeSummaryOutput.omit({ label: true, promptSnippet: true }).extend({
  prompt: z.string().optional().describe("Full generation prompt"),
  metadata: AssetMetadataSchema.optional().describe("Whitelisted asset metadata (internal bookkeeping already removed)"),
  filePath: z
    .string()
    .optional()
    .describe("Image/video/audio nodes: where the file lives, relative to the project. Hand this to hub_analyse_media when you need to see or hear it."),
  textContent: z.string().optional().describe(`Text nodes: full markdown, only when it is at most ${TEXT_CONTENT_INLINE_MAX} chars`),
  textPreview: z.string().optional().describe("Long text nodes: the first ~600 chars only, not the whole document"),
  textTotalLines: z.number().optional().describe("Text nodes: total line count"),
  textTotalChars: z.number().optional().describe("Text nodes: total character count"),
  textOutline: OutlineSchema.optional().describe("Only for long text: the markdown headings, each with its line number (from 1)"),
  textContentHash: z.string().optional().describe("Version token for canvas_apply_text_edits / text patches"),
  tableContent: TableContentSchema.optional().describe("Table nodes: decoded columns and rows"),
  incomingEdges: z.array(EdgeSummarySchema).optional().describe("Edges that point to this node"),
  outgoingEdges: z.array(EdgeSummarySchema).optional().describe("Edges that start at this node"),
  childIds: z.array(z.string()).optional().describe(`Group nodes only: member ids, capped at ${NODE_DETAIL_CHILD_IDS_LIMIT}`),
  childIdsTotal: z.number().optional().describe("Group nodes only: real member count when childIds was capped"),
});

const WriteResultOutput = z.object({
  index: z.number().int().min(0).optional().describe("[batch] Position of the item in `items`"),
  kind: z.enum(CANVAS_WRITE_KINDS).optional(),
  ok: z.boolean(),
  error: z.string().optional(),
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
  warnings: z.array(z.string()).optional(),
});

const HASH_DESC = "SHA-256 of the document as it is now; pass it as expectedContentHash when editing";

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
        "List canvas nodes as compact summaries, optionally filtered by `type` (image / video / audio / text / file / table / placeholder / group / sticker). " +
        "Returns `{ count, nodes }`; `count` is the total before paging. Default page size 50, max 500; page with `offset`. " +
        "Plugin-backed file nodes also carry `pluginId` plus workflow identity and template provenance; when working with a plugin node always use the node's own `id` as the selector, never its template id, name or workflow id. " +
        "To list a group's members, canvas_get_node on the group id (its `childIds`) is cheaper than paging here.",
      inputSchema: {
        type: z.enum(CANVAS_NODE_TYPES).optional().describe("Only return nodes of this type"),
        limit: z.number().int().min(1).max(500).optional().describe("Page size (default 50, max 500)"),
        offset: z.number().int().min(0).optional().describe("How many summaries to skip (default 0)"),
      },
      outputSchema: {
        count: z.number().describe("Total matching nodes before limit/offset"),
        nodes: z.array(NodeSummaryOutput).describe("Summaries for this page"),
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
        "Get full detail for one node (`nodeId`) or up to 50 nodes at once (`nodeIds`, preferred for several). Returns `{ nodes, missing? }`. " +
        `Text nodes include \`textContent\` only when the document is at most ${TEXT_CONTENT_INLINE_MAX} chars; longer ones return \`textPreview\` + \`textOutline\` + line/char totals instead, so use canvas_grep_text / canvas_read_text to look inside. ` +
        "Every text node carries `textContentHash`, the version token for edits. Tables include decoded `tableContent`; media nodes include whitelisted `metadata` and a project-relative `filePath`; " +
        `group nodes include \`childIds\` (capped at ${NODE_DETAIL_CHILD_IDS_LIMIT}, with \`childIdsTotal\` when capped); every node lists incoming/outgoing edges. ` +
        "This is metadata only: it never returns image/video/audio content and does not count as looking at the media. To inspect visuals, pass `filePath` to hub_analyse_media with a concrete question.",
      inputSchema: {
        nodeId: z.string().optional().describe("One node id"),
        nodeIds: z.array(z.string()).max(50).optional().describe("Several node ids (max 50); preferred over repeated single calls"),
      },
      outputSchema: {
        nodes: z.array(NodeDetailOutput).describe("Details of the requested nodes"),
        missing: z.array(z.string()).optional().describe("Requested ids that no longer exist"),
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
        "grep for a single text node: scans that node's raw markdown and answers with `{ contentHash, totalLines, totalMatches, truncated, matchedVia, matches }`. " +
        "A match gives its 1-based `line`, the `matchedText`, a `snippet` of surrounding numbered lines, and `occurrence` (counted from 0) - feed matchedText + occurrence straight into canvas_apply_text_edits as the anchor. " +
        "Literal matching with smart case by default (case-sensitive only if the query has uppercase); set `regex: true` for patterns. " +
        "If a literal search misses because you typed the text as rendered in the editor (markdown markers such as ** removed), it retries against the rendered text and reports `matchedVia: \"rendered\"`; " +
        "in that case `matchedText` holds the real markdown slice, which is what you must anchor on. The returned `contentHash` works as the edit version token, so no full read is needed before editing. " +
        "Prefer this over reading a whole long document when you only need to locate or confirm text.",
      inputSchema: {
        nodeId: z.string().min(1).describe("Text node to search"),
        query: z.string().min(1).describe("Literal text (default) or a regex when `regex` is true"),
        regex: z.boolean().optional().describe("Interpret `query` as a regular expression"),
        contextBefore: z.number().int().min(0).max(50).optional().describe("Extra lines shown above a hit; 2 if omitted, up to 50"),
        contextAfter: z.number().int().min(0).max(50).optional().describe("Extra lines shown below a hit; 2 if omitted, up to 50"),
        maxMatches: z.number().int().min(1).max(100).optional().describe("Most matches to return (default 20, max 100)"),
      },
      outputSchema: {
        contentHash: z.string().describe(HASH_DESC),
        totalLines: z.number().describe("Lines in the document"),
        totalMatches: z.number().describe("All matches found, before the maxMatches cap"),
        truncated: z.boolean().describe("True when some matches were cut by maxMatches"),
        matchedVia: z.enum(["source", "rendered"]).optional().describe("How the matches were found; for 'rendered', matchedText is the exact source substring"),
        matches: z.array(
          z.object({
            line: z.number().describe("1-based line"),
            matchedText: z.string().describe("Exact matched source text"),
            occurrence: z.number().describe("Which repeat of matchedText this is across the document, counting from 0"),
            snippet: z.string().describe("Numbered context lines"),
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
        "Paged reader for one text node: returns a slice of its raw markdown with line numbers. " +
        "Result fields: contentHash, totalLines, startLine, endLine, truncated, outline (every heading in the document with its line) and text (each line prefixed by its number and a colon). " +
        `A call covers ${READ_TEXT_DEFAULT_LIMIT} lines unless limitLines says otherwise (at most ${READ_TEXT_MAX_LIMIT}). Locate the spot with canvas_grep_text, then pull only the section around it rather than walking the whole document page by page.`,
      inputSchema: {
        nodeId: z.string().min(1).describe("Text node to read"),
        offsetLine: z.number().int().min(1).optional().describe("Line number to start from, counting from 1 (defaults to the top)"),
        limitLines: z
          .number()
          .int()
          .min(1)
          .max(READ_TEXT_MAX_LIMIT)
          .optional()
          .describe(`How many lines to read (default ${READ_TEXT_DEFAULT_LIMIT}, max ${READ_TEXT_MAX_LIMIT})`),
      },
      outputSchema: {
        contentHash: z.string().describe(HASH_DESC),
        totalLines: z.number(),
        startLine: z.number(),
        endLine: z.number(),
        truncated: z.boolean().describe("True when the window hit the size cap before limitLines"),
        outline: OutlineSchema.describe("Heading outline of the whole document"),
        text: z.string().describe("Numbered lines of the window"),
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
        "Apply a batch of anchored find-and-replace edits to an existing markdown text node, atomically. This is the default way to change an existing text node: " +
        "describe the change as small exact-text-to-new-text pairs instead of pushing a whole new document through canvas_write_node. That costs fewer tokens, does not clobber edits the user makes meanwhile, and shows up in the editor as a diff the user can review.\n" +
        "- Annotation turns (a <document_edit_task> is present): pass its requestId and editSessionId unchanged and keep each target's annotationId + targetIndex. Edit only what the annotation asks; skip unrelated targets instead of sending no-op edits.\n" +
        "- Free-form chat edits: leave out requestId, editSessionId and annotationId; the server fills them in. Use one edit per changed region, anchored with canvas_grep_text results.\n" +
        "For `expectedContentHash` use whichever version token you saw last: contentHash from grep/read, textContentHash from get_node, or the task payload's document.contentHash. " +
        "Each anchor is the literal markdown text plus, when it repeats, the occurrence number grep gave you; for targets the task already resolved, reuse its sourceExact and occurrence unchanged. " +
        "The whole batch is rejected if the hash is stale, an anchor is missing or ambiguous, or replacements overlap; then use `results[].nearest` to fix the anchors and retry once rather than re-reading or rewriting the whole document.",
      inputSchema: {
        requestId: z
          .string()
          .min(1)
          .optional()
          .describe("request_id from the document edit task. Required on annotation turns; leave out for free-form edits."),
        editSessionId: z.string().optional().describe("edit_session_id from the document edit task. Leave out for free-form edits."),
        nodeId: z.string().min(1).describe("Text node to edit"),
        expectedContentHash: z.string().min(1).describe("contentHash / textContentHash from your most recent read"),
        edits: z
          .array(
            z.object({
              annotationId: z.string().min(1).optional().describe("Annotation id from the edit task. Leave out for free-form edits."),
              targetIndex: z.number().int().min(0).optional(),
              exact: z.string().min(1),
              prefix: z.string().optional(),
              suffix: z.string().optional(),
              occurrence: z
                .number()
                .int()
                .min(0)
                .optional()
                .describe("Zero-based index among the matches of `exact` (0 = first). Take it from canvas_grep_text; omit when the anchor is unique."),
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
        "Groups at least two nodes together. Result fields: groupId, affectedNodeIds, removedNodeIds, and when relevant addedGroupId, skippedNodes and hint. " +
        "Members are arranged in a grid as part of this call, so there is nothing further to lay out.\n" +
        "Mode is inferred from the input: if every id is a loose node, a new group is created (optional `label`, max 40 chars, becomes its title); " +
        "if the list contains existing groups, the first group listed is the merge target, the other groups dissolve into it, and `label` is ignored.\n" +
        "When fewer than two eligible nodes remain, nothing happens and `groupId` is null; read `skippedNodes` (for `already-grouped`, `parentId` names the current group) and `hint` for how to retry. A null groupId does not mean success.\n" +
        "Error `incomplete-positions` means the canvas has not saved positions for some node yet; ask the user to interact with the canvas once and retry. " +
        "To group this round's fresh outputs without listing ids, use canvas_group_recent_outputs.",
      inputSchema: {
        nodeIds: z
          .array(z.string())
          .min(2)
          .describe("Node ids to group (at least 2). In merge mode the first group in the list is the target."),
        label: z
          .string()
          .max(40)
          .optional()
          .describe("Group title for newly created groups (ignored when merging). Trimmed, max 40 chars; blank means no title. Recommended so the user can tell groups apart."),
      },
      outputSchema: {
        groupId: z.string().nullable().describe("Resulting group id (new group, or merge target); null when nothing happened"),
        addedGroupId: z.string().optional().describe("Id of the newly created group (create mode only)"),
        removedNodeIds: z.array(z.string()).describe("Groups dissolved during a merge"),
        affectedNodeIds: z.array(z.string()).describe("Nodes whose parent or position changed"),
        skippedNodes: z.array(SkippedNodeEntrySchema).optional().describe("Ids that were dropped, with the reason"),
        hint: z.string().optional().describe("Suggested nodeIds for a second attempt; given only when nothing was grouped because some ids already had a group"),
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
        "Group the assets generated in this round into one titled group, laid out as a grid. Only call it when this round produced two or more asset outputs; with a single output, just reply. " +
        "No ids are needed: the gateway picks loose, asset-backed, non-uploaded nodes created after the most recent group. Returns `{ groupId, groupedCount, label?, reason? }`. " +
        "`groupId: null` with `reason: \"insufficient-candidates\"` means there was nothing to group (do not retry); `reason: \"no-session-scope\"` means outputs could not be attributed to this session (do not retry, just reply). " +
        "For hand-picked nodes or merging into an existing group use canvas_group_nodes.",
      inputSchema: {
        label: z
          .string()
          .max(40)
          .optional()
          .describe("Title summarizing this round's outputs. Trimmed, max 40 chars; blank falls back to a generic title. Recommended."),
      },
      outputSchema: {
        groupId: z.string().nullable().describe("Id of the group that was made; null if no group was made"),
        groupedCount: z.number().describe("Count of nodes placed in the new group; 0 if none"),
        label: z.string().optional().describe("Title that was applied"),
        reason: z
          .enum(["insufficient-candidates", "no-op", "no-session-scope"])
          .optional()
          .describe("Why nothing happened (only when groupId is null)"),
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
        "Create or update canvas nodes; the general write tool for agents. kind=\"text\" creates or patches a markdown node, kind=\"table\" creates or replaces a table, " +
        "kind=\"media\" is only for media obtained some other way than the built-in generators: give a workspace path, or a link that serves image/video/audio bytes (it is downloaded first; HTML pages do not work). " +
        "Outputs of the image / video / speech / music / ffmpeg / editing tools are already on the canvas; never write them again. " +
        "Use `items` (max 20) to batch several independent writes. To patch text, pass `nodeId` and optionally `mode` (replace / append / prepend); `mode` without `nodeId` is an error. " +
        "For partial changes to an existing text node use canvas_apply_text_edits instead; keep a full replace for real whole-document rewrites and pass `expectedContentHash` from your latest read. " +
        "Stage Execution Plan content is refused here; write plans with plan_write / plan_patch_stage.",
      inputSchema: {
        items: z.array(CanvasWriteItemSchema).min(1).max(20).optional().describe("Batch of writes, each with the same fields as a single write (max 20)."),
        kind: z.enum(CANVAS_WRITE_KINDS).optional().describe("Kind for a single write: text | table | media. Leave out when using items."),
        content: z.string().optional().describe("[text] Markdown body. Required when kind=text."),
        nodeId: z.string().optional().describe("[text/table] Id of a node to update in place; without it a new node is made."),
        name: z.string().optional().describe("[text create] File name, no extension."),
        title: z.string().optional().describe("[table] Optional preview title."),
        columns: z.array(TableColumnInputSchema).optional().describe("[table] Column definitions."),
        rows: z.array(TableRowInputSchema).optional().describe("[table] Row data."),
        filter: TableFilterInputSchema.optional().describe("[table] Optional row filter."),
        rowHeight: z.enum(TableRowHeights).optional().describe("[table] Row height preset."),
        assetPath: z
          .string()
          .optional()
          .describe("[media] Either a tracked file path inside the workspace or an http(s) link that serves the image/video/audio bytes directly. Links to HTML pages fail; pull the real media link out of the page beforehand."),
        sourceNodeId: z.string().optional().describe("[create/media] One source node id to link with a derivation edge."),
        sourceNodeIds: z.array(z.string()).optional().describe("[create] Several source node ids."),
        mode: z.enum(UPDATE_TEXT_MODES).optional().describe("[patching text] How to combine with the existing body: replace, append or prepend. Needs nodeId."),
        expectedContentHash: z
          .string()
          .optional()
          .describe("[text patch only] Version token from your latest read; the patch is rejected (409) if the document changed since."),
        allowDuplicate: z.boolean().optional().describe("[media] Create a second card for a file already on the canvas. Default false."),
      },
      outputSchema: {
        batch: z.boolean().optional().describe("True in items[] mode"),
        kind: z.enum(CANVAS_WRITE_KINDS).optional(),
        ok: z.boolean().describe("True when the write (or every batch item) succeeded"),
        error: z.string().optional(),
        count: z.number().optional().describe("[batch] Items requested"),
        successCount: z.number().optional(),
        errorCount: z.number().optional(),
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
        warnings: z.array(z.string()).optional(),
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
        "Dissolve one canvas group while keeping its children; they become loose nodes at the absolute positions the gateway restores. " +
        "Returns `{ removed, removedNodeIds, affectedNodeIds }`; `removed: false` means the id is missing or not a group, so do not retry. " +
        "An `incomplete-positions` error means some child positions were not saved yet: have the user touch the canvas once, then try again.",
      inputSchema: {
        groupId: z.string().min(1).describe("Id of the group node to dissolve."),
      },
      outputSchema: {
        removed: z.boolean().describe("True when the group was dissolved"),
        removedNodeIds: z.array(z.string()).describe("Removed group ids; empty on no-op"),
        affectedNodeIds: z.array(z.string()).describe("Former members that were moved out of the group"),
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
