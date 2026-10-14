// canvas-instance.js
import {
  BACKEND_VIBE_STORYBOARD,
  CanvasNodeType,
  orderTidyNodes,
  pinnedTidyNodeIds,
  tidyNodeName,
} from "../vendor.js";
import { DagreLayout } from "./dagre-layout.js";
import {
  applyFillToNode,
  deletionAssetId,
  EMPTY_SUB_IMAGES,
  fileNodeToRuntimeNode,
  fillStillApplies,
  findFillTarget,
  isHighBlastCanvasDeletion,
  isHighBlastCanvasElementDeletion,
  isPendingFillHost,
  NodeRegistry,
  PluginManager,
  shouldClearAssetIdForServerNode,
  validIncomingAssetId,
} from "./node-registry.js";
import { SelectionManager } from "./selection-manager.js";
import { applyChangesetToDraft } from "./apply-changeset-to-draft.js";
import {
  CanvasMode,
  computeGroupBoundsFromChildren,
  defaultNodeSizeForType,
  GROUP_NODE_PADDING,
  isArtifactProvenanceEdge,
} from "./compute-group-bounds-from-children.js";
import { groupNodesInCanvas } from "./group-nodes-in-canvas.js";
import {
  CanvasEventBus,
  findAllowedHistorySteps,
  isInvisibleHistoryTransition,
  isSamePersistedData,
  rebaseRetainedHistoryNodes,
} from "./canvas-event-bus.js";
import { CanvasHistoryManager } from "./history-manager.js";
import { GridSlotLayout } from "./grid-slot-layout.js";
import { LayoutEngine } from "./layout-engine.js";
import { applyDetachedReferenceEdges } from "./build-detached-reference-edges.js";
import { layoutCategoryLanes } from "./layout-category-lanes.js";
import {
  computeCentroid,
  createEmptyGraph,
  getNodePosition,
  getNodeSize,
  setNodePosition,
  sizeOf,
} from "./use-active-mode.js";
import {
  collectGroupMembers,
  DEFAULT_PLACEMENT_GAP,
  isGroupedNode,
  pickSuccessorMain,
  promoteToMain,
  removeGroup,
  resolveGroupMainId,
  ungroupInCanvas,
} from "./ungroup-in-canvas.js";
import { detachFromGroup } from "./detach-from-group.js";
import { reconcileGroupGeometryForMode } from "./reconcile-group-geometry-for-mode.js";
import { relayoutGroupChildren } from "./place-vertical-layered.js";
import {
  getClipboard,
  isTransientPlaceholder,
  partitionUserRemovalElements,
  partitionUserRemovalNodes,
} from "./partition-user-removal-elements.js";
import { remapClipboard, setClipboard } from "./remap-clipboard.js";
import {
  assignComfyUiTemplateCopyOrdinals,
  backfillLegacyComfyUiTemplateCopyOrdinals,
  centerNodeGroupAt,
  collectClipboardAssetPaths,
  computeNodeGroupBounds,
  decideHistoryStep,
  expandSelectionWithGroupChildren,
  isBoxOutsideRect,
  isChildFullyInsideParent,
  isChildFullyOutsideParent,
  normalizeOrphanChildForClipboard,
  planGroupAwareRemoval,
  removeNodesAndPromoteGroupMains,
} from "./remove-nodes-and-promote-group-mains.js";
import { buildCanvasFileSnapshot } from "./runtime-node-to-file-node.js";
import { deriveEdgeId } from "./find-free-position-from-anchor.js";

export class CanvasInstance {
  eventBus = new CanvasEventBus();
  registry = new NodeRegistry();
  layout = new LayoutEngine();
  history;
  selection = new SelectionManager();
  plugins = new PluginManager();
  listeners = new Set();
  pasteNodeTransformer;
  highBlastDeleteConfirmer;
  /**
   * Durable generation references for a settled artifact node, owned by the
   * renderer's asset-metadata store. See `setArtifactReferenceResolver`.
   */
  artifactReferenceResolver;
  /** Asset-projected generation backend for settled nodes. Storyboard uses
   * this to keep its single primary-reference edge attached to the currently
   * visible member while round dots promote different group members. */
  artifactBackendResolver;
  confirmedHighBlastGraph = null;
  /**
   * Pending clone→primary promotions awaiting disk catch-up. Keyed by node id;
   * value is the forked asset identity the node was rebound to.
   *
   * Why this exists: `promoteCloneToPrimary` rewrites the node in-memory and
   * persists it, but `forkAsset` also creates a new file on the gateway, which
   * trips chokidar → a WS `load(false)` reload. That reload's `loadCanvas()`
   * can read the gateway's canvas.json BEFORE the promotion's `saveCanvas`
   * lands, rebuilding the node as its old clone (origin assetId) and clobbering
   * the promotion — the new asset then looks orphaned and gets hidden.
   *
   * `useCanvasData.load` consults this map after rebuilding nodes and re-applies
   * any promotion whose disk node still shows the OLD (pre-fork) asset. Each
   * entry self-evicts once the rebuilt disk node already carries the promoted
   * assetId (disk caught up) — see `consumePendingPromotion`.
   */
  pendingPromotions = new Map();
  /**
   * Staged async placeholder fills — Plan A of "异步 fill 不进 undo 栈".
   *
   * When a generation completes, the WS broadcast does NOT write the fill
   * into the travels-tracked GraphState. It lands here instead, and:
   *
   *   - READS see it: `getGraph()` composes "truth state + fill overlay"
   *     (memoized per truth-state reference). A node that exists in truth and
   *     still lacks `assetId` renders as its filled shape. Undo/redo replay
   *     truth only, so Cmd-Z after a completed generation reverts the user's
   *     last edit (e.g. the image move) and the result stays visible — it
   *     never resurrects the intermediate `generating` placeholder.
   *
   *   - WRITES bake it: a `beforeWrite` hook on HistoryManager bakes every
   *     staged fill into the draft at the START of any state write (see
   *     `bakePendingFillsIntoDraft`). This keeps write-side drafts identical
   *     to what readers saw (an updater that replaces `node.data` wholesale
   *     operates on baked content and wins over the overlay), and avoids the
   *     travels manual-archive trap where un-archived setState patches would
   *     fold into the next user commit. If the baking commit is later undone,
   *     the truth node loses `assetId` again and the overlay simply re-applies
   *     — the fill is visually permanent for as long as its node exists.
   *
   *   - Undoing PAST the placeholder's insert removes the node from truth;
   *     the overlay skips missing nodes, so the fill disappears with it and
   *     redo brings both back. The map entry stays (lazy); `snapshot()`
   *     evicts entries whose truth node is gone or has already caught up.
   *
   * Keyed by node id. NOT undo state, NOT persisted itself — persistence
   * reads `getGraph()` and therefore always writes the filled shape.
   */
  pendingFills = new Map();
  locallyFilledPlaceholderIds = new Set();
  /** Gateway-canonical identity aliases retained for async callbacks registered before takeover. */
  serverNodeIdAliases = new Map();
  /**
   * All writes to `pendingFills` go through these setters so the overlay
   * cache is invalidated in lockstep. Adding a new mutation site is a
   * 1-line change to the relevant setter, not a 2-step "mutate + null cache"
   * pattern that future readers can forget.
   */
  setPendingFill(nodeId, fill) {
    this.pendingFills.set(nodeId, fill);
    this.fillOverlayCache = null;
  }
  remapPendingFill(oldId, newId) {
    const fill = this.pendingFills.get(oldId);
    if (!fill) return;
    this.pendingFills.delete(oldId);
    this.pendingFills.set(newId, fill);
    this.fillOverlayCache = null;
  }
  clearPendingFills() {
    if (this.pendingFills.size === 0) return;
    this.pendingFills.clear();
    this.fillOverlayCache = null;
  }
  /**
   * Run `fn` as one undoable operation. Nested calls fold into the outermost
   * transaction, so composite gestures such as "全部独立" are reverted by a
   * single undo step.
   */
  transaction(fn) {
    this.history.beginTransaction();
    try {
      return fn();
    } finally {
      this.history.endTransaction();
    }
  }
  /**
   * Memo for the composed "truth + pendingFills" view, keyed by the truth
   * GraphState reference (same invalidation contract as `indexesCache`).
   * Reset explicitly whenever `pendingFills` itself mutates.
   */
  fillOverlayCache = null;
  /**
   * Lazily derived per-graph indexes. Built on first access after every graph
   * mutation and reused across hot paths (move / resize / adopt / orphan / sync).
   *
   * Invalidation is implicit: `history.commit` and `history.setState` always
   * return a fresh `GraphState` reference, so an identity check against the
   * cached `graphRef` is sufficient — no manual cache busts in mutators.
   *
   * Built together in a single graph pass so the marginal cost of also producing
   * `childrenByParent` is negligible compared to maintaining three separate caches.
   */
  indexesCache = null;
  // Active canvas mode. Lives on the instance, not on the travels-tracked
  // GraphState, so mode flips never enter the undo stack and never get
  // rolled into the next commit's patches. From the user's mental model a
  // freeform↔workflow switch is a navigation gesture, not a content edit
  // — pressing Cmd-Z while in freeform should rewind the most recent edit
  // and leave the user on the freeform canvas. See ADR / per-mode-undo
  // tests for the regression history.
  mode;
  // The canvas root DOM element this instance is currently rendered into.
  // Populated by `canvas-shell` via the root div's ref callback so document-
  // level shortcut handlers (`useKeyboardShortcuts`) can tell whether *this*
  // instance is the visible workspace tab. Multiple workspaces keep their
  // canvas mounted under `display: none` to preserve ReactFlow state across
  // tab switches; without this hook every paste / copy fans out to all of
  // them. See `isCanvasInteractive` in `use-keyboard-shortcuts.ts`.
  rootEl = null;
  constructor(mode = CanvasMode.Workflow) {
    this.mode = mode;
    this.history = new CanvasHistoryManager(createEmptyGraph());
    this.history.setBeforeWriteHook((draft) =>
      this.bakePendingFillsIntoDraft(draft),
    );
    this.selection.bindEventBus(this.eventBus);
    this.registerBuiltinLayouts();
  }
  /**
   * Product confirmation boundary for a user mutation that would remove most
   * of a non-trivial canvas. Without an owner-provided confirmer the mutation
   * is refused rather than relying on a later persistence rollback.
   */
  setHighBlastDeleteConfirmer(confirmer) {
    this.highBlastDeleteConfirmer = confirmer;
  }
  /**
   * Durable per-node generation references, owned by the renderer's
   * asset-metadata store.
   *
   * `referenceImageIds` / `referenceAudioIds` / `referenceVideoIds` are
   * `ASSET_PROJECTED_DATA_KEYS`: `buildPersistedCanvasFile` strips them from a
   * settled node's `data` and the load path restores them from `AssetMeta`.
   * Artifact-provenance detection therefore cannot rely on `node.data` alone —
   * without this resolver every historical round's provenance edge looks like a
   * live follow edge and gets re-pointed onto the newly promoted main.
   */
  setArtifactReferenceResolver(resolver) {
    this.artifactReferenceResolver = resolver;
  }
  setArtifactBackendResolver(resolver) {
    this.artifactBackendResolver = resolver;
  }
  artifactProvenanceOptions() {
    const resolver = this.artifactReferenceResolver;
    return resolver
      ? {
          resolveReferenceIds: (node) => resolver(node.id),
        }
      : void 0;
  }
  confirmHighBlastDeletion(incomingNodeCount, incomingEdgeCount, retry) {
    const graph = this.getGraph();
    const currentNodeCount = graph.nodes.length;
    const currentEdgeCount = graph.edges.length;
    if (
      !isHighBlastCanvasElementDeletion(
        currentNodeCount,
        incomingNodeCount,
        currentEdgeCount,
        incomingEdgeCount,
      )
    ) {
      return true;
    }
    if (this.confirmedHighBlastGraph === graph) {
      this.confirmedHighBlastGraph = null;
      return true;
    }
    const impact = {
      currentNodeCount,
      incomingNodeCount,
      removedNodeCount: Math.max(0, currentNodeCount - incomingNodeCount),
      currentEdgeCount,
      incomingEdgeCount,
      removedEdgeCount: Math.max(0, currentEdgeCount - incomingEdgeCount),
    };
    if (!this.highBlastDeleteConfirmer) {
      console.error(
        "[canvas] high-blast deletion refused without a confirmation owner",
      );
      this.eventBus.emit({
        type: "delete:blocked",
        count: impact.removedNodeCount + impact.removedEdgeCount,
        reason: "confirmation-unavailable",
      });
      return false;
    }
    let settled = false;
    this.highBlastDeleteConfirmer({
      ...impact,
      confirm: () => {
        if (settled) return;
        settled = true;
        if (this.getGraph() !== graph) {
          this.eventBus.emit({
            type: "delete:blocked",
            count: impact.removedNodeCount + impact.removedEdgeCount,
            reason: "confirmation-stale",
          });
          return;
        }
        this.confirmedHighBlastGraph = graph;
        retry();
        if (this.getGraph() !== graph) {
          this.eventBus.emit({
            type: "persist:flush",
          });
        }
      },
      cancel: () => {
        settled = true;
      },
    });
    return false;
  }
  runExplicitlyConfirmedDeletion(operation) {
    const graph = this.getGraph();
    this.confirmedHighBlastGraph = graph;
    try {
      operation();
    } finally {
      if (this.confirmedHighBlastGraph === graph)
        this.confirmedHighBlastGraph = null;
    }
  }
  // ---- Graph access ----
  /**
   * The graph as consumers should see it: the travels-tracked truth state
   * with any staged async fills (`pendingFills`) overlaid. Memoized per truth
   * reference, so downstream identity-keyed caches (`getIndexes`,
   * useSyncExternalStore snapshots) keep working unchanged.
   */
  getGraph() {
    const base = this.history.getState();
    if (this.pendingFills.size === 0) return base;
    if (this.fillOverlayCache?.baseRef === base)
      return this.fillOverlayCache.result;
    const nodes = base.nodes.slice();
    let dirty = false;
    for (const [nodeId, fill] of this.pendingFills) {
      const idx = nodes.findIndex((node) => node.id === nodeId);
      if (idx < 0) continue;
      const src = nodes[idx];
      if (!fillStillApplies(src, fill)) continue;
      const composed = {
        ...src,
      };
      applyFillToNode(composed, fill.payload);
      nodes[idx] = composed;
      dirty = true;
    }
    const result = dirty
      ? {
          ...base,
          nodes,
        }
      : base;
    this.fillOverlayCache = {
      baseRef: base,
      result,
    };
    return result;
  }
  // ---- Root element binding ----
  // Hosts call `setRootEl` from the canvas root's ref callback so document-
  // level shortcut handlers can self-filter when the workspace tab they
  // belong to is hidden under `display: none`.
  setRootEl(el) {
    this.rootEl = el;
  }
  getRootEl() {
    return this.rootEl;
  }
  getMode() {
    return this.mode;
  }
  /**
   * Build (or return cached) reverse indexes for the current graph state.
   * Internal-only — public consumers should go through `getChildCountByParent`
   * or specific helpers.
   */
  getIndexes() {
    const graph = this.getGraph();
    if (this.indexesCache?.graphRef === graph) return this.indexesCache;
    const prev = this.indexesCache;
    const nodeById = new Map();
    const childrenByParent = new Map();
    const membersByGroupId = new Map();
    for (const node of graph.nodes) {
      nodeById.set(node.id, node);
      if (node.parentId) {
        const arr = childrenByParent.get(node.parentId);
        if (arr) arr.push(node);
        else childrenByParent.set(node.parentId, [node]);
      }
      if (typeof node.groupId === "string" && node.groupId.length > 0) {
        const arr = membersByGroupId.get(node.groupId);
        if (arr) arr.push(node);
        else membersByGroupId.set(node.groupId, [node]);
      }
    }
    const childCountByParent = new Map();
    for (const [pid, arr] of childrenByParent)
      childCountByParent.set(pid, arr.length);
    const subImagesByParent = new Map();
    for (const [, rawMembers] of membersByGroupId) {
      const members = rawMembers.slice().sort((leftMember, rightMember) => {
        const ra = Number.isInteger(leftMember.round)
          ? leftMember.round
          : Number.MAX_SAFE_INTEGER;
        const rb = Number.isInteger(rightMember.round)
          ? rightMember.round
          : Number.MAX_SAFE_INTEGER;
        return ra !== rb ? ra - rb : 0;
      });
      const main =
        members.find((member) => member.meta?.hidden !== true) ?? members[0];
      if (!main) continue;
      const subs = members.filter((member) => member.id !== main.id);
      const prevArr = prev?.subImagesByParent.get(main.id);
      if (
        prevArr &&
        prevArr.length === subs.length &&
        prevArr.every((node, index) => node === subs[index])
      ) {
        subImagesByParent.set(main.id, prevArr);
      } else {
        subImagesByParent.set(main.id, subs);
      }
    }
    this.indexesCache = {
      graphRef: graph,
      nodeById,
      childrenByParent,
      childCountByParent,
      subImagesByParent,
    };
    return this.indexesCache;
  }
  /**
   * Flat groupId model: ordered sub-image nodes for a main image id (empty
   * array when none). The returned array reference is STABLE across graph
   * mutations that don't touch this group (see `getIndexes` bucket
   * stabilization), so callers can use it directly as a `useSyncExternalStore`
   * snapshot. Returns a shared frozen empty array for groups with no subs.
   */
  getSubImagesByParent(mainId) {
    const indexes = this.getIndexes();
    return indexes.subImagesByParent.get(mainId) ?? EMPTY_SUB_IMAGES;
  }
  /**
   * Reverse index of `parentId → child count`. Used by the React renderer to
   * derive group nodes' `__derivedChildCount` without re-scanning the whole
   * `nodes` array on every sync. Returned map is a snapshot of the current
   * graph and becomes stale after the next mutation — call again for fresh data.
   */
  getChildCountByParent() {
    return this.getIndexes().childCountByParent;
  }
  // ---- Image group write path (flat groupId model) ----------------------
  // Undoable single commits that delegate the membership math to the protocol
  // pure functions (`promoteToMain` / `removeGroup` / `detachFromGroup` /
  // `pickSuccessorMain` / `collectGroupMembers`), then apply the resulting node
  // array, emit graph events, and flush persistence. They emit `persist:flush`
  // (not `persist:request`) because each precedes a gateway round-trip or a
  // follow-edge change that reads canvas.json — the same rationale as
  // `ungroup` / `splitSubImages` already on disk.
  /**
   * Resolve the GROUP MAIN id for any image node id: a group member resolves
   * to its group's main (the visible `meta.hidden !== true` node); a single
   * image resolves to itself. Returns the input id unchanged when unknown.
   */
  resolveImageGroupMainId(nodeId) {
    return resolveGroupMainId(this.fileNodes(), nodeId);
  }
  /**
   * Apply an `ImageGroupMutation` produced by a protocol image-group function:
   * commit the new node array, re-point live follow edges (β edge model), emit
   * node:added / node:removed / node:data-changed events for affected ids, and
   * flush persistence. Returns false (no-op) when the mutation changed nothing.
   */
  applyImageGroupMutation(mut, opts) {
    const touched =
      mut.removedIds.length > 0 ||
      mut.updatedIds.length > 0 ||
      !!mut.repointFollow ||
      // a mutation that inserts a brand-new main has no updatedIds entry —
      // detect a length change as the catch-all "something happened" signal.
      mut.nodes.length !== this.getGraph().nodes.length;
    if (!touched) return false;
    const runtimeNodes = mut.nodes.map((node) =>
      fileNodeToRuntimeNode(node, this.mode),
    );
    const previousGraph = this.getGraph();
    const previousNodes = previousGraph.nodes;
    const removedSet = new Set(mut.removedIds);
    const highBlastConfirmed = isHighBlastCanvasDeletion(
      previousNodes.length,
      mut.nodes.length,
    );
    if (
      highBlastConfirmed &&
      !this.confirmHighBlastDeletion(
        mut.nodes.length,
        previousGraph.edges.length,
        () => {
          this.applyImageGroupMutation(mut, opts);
        },
      )
    ) {
      return false;
    }
    const explicitlyRemovedNodes = previousNodes.filter((node) =>
      removedSet.has(node.id),
    );
    const addedIds = new Set();
    if (mut.nodes.length > this.getGraph().nodes.length) {
      const prevIds = new Set(this.getGraph().nodes.map((node) => node.id));
      for (const node of mut.nodes) if (!prevIds.has(node.id)) addedIds.add(node.id);
    }
    if (removedSet.size > 0 && this.selection.count() > 0) {
      const next = this.selection
        .getSelected()
        .filter((id) => !removedSet.has(id));
      if (next.length !== this.selection.count()) this.selection.set(next);
    }
    this.history.commit((draft) => {
      draft.nodes = runtimeNodes;
      if (mut.repointFollow) {
        const { from, to } = mut.repointFollow;
        const provenanceOptions = this.artifactProvenanceOptions();
        const seen = new Set();
        const next = [];
        for (const edge of draft.edges) {
          const fromNode = previousNodes.find((node) => node.id === from);
          const toNode = runtimeNodes.find((node) => node.id === to);
          const fromBackend =
            fromNode?.data?.backend ?? this.artifactBackendResolver?.(from);
          const toBackend =
            toNode?.data?.backend ?? this.artifactBackendResolver?.(to);
          const followsStoryboardVisibleRound =
            edge.target === from &&
            (fromBackend === BACKEND_VIBE_STORYBOARD ||
              toBackend === BACKEND_VIBE_STORYBOARD);
          if (
            !followsStoryboardVisibleRound &&
            isArtifactProvenanceEdge(edge, previousNodes, provenanceOptions)
          ) {
            if (seen.has(edge.id)) continue;
            seen.add(edge.id);
            next.push(edge);
            continue;
          }
          let source = edge.source;
          if (source === from) source = to;
          let target = edge.target;
          if (target === from) target = to;
          if (source === target) continue;
          if (source === edge.source && target === edge.target) {
            if (seen.has(edge.id)) continue;
            seen.add(edge.id);
            next.push(edge);
            continue;
          }
          const id = deriveEdgeId(source, target);
          if (seen.has(id)) continue;
          seen.add(id);
          next.push({
            ...edge,
            id,
            source,
            target,
          });
        }
        draft.edges = next;
      }
      applyDetachedReferenceEdges(
        draft,
        this.getGraph(),
        runtimeNodes,
        this.artifactReferenceResolver,
      );
    });
    for (const id of removedSet)
      this.eventBus.emitDirect({
        type: "node:removed",
        nodeId: id,
      });
    const currentEdgeIds = new Set(
      this.getGraph().edges.map((edge) => edge.id),
    );
    const removedEdgeIds = previousGraph.edges
      .filter((edge) => !currentEdgeIds.has(edge.id))
      .map((edge) => edge.id);
    this.emitDeleteIntent(
      explicitlyRemovedNodes,
      removedEdgeIds,
      highBlastConfirmed,
    );
    const byId = new Map(runtimeNodes.map((node) => [node.id, node]));
    for (const id of addedIds) {
      const node = byId.get(id);
      if (node)
        this.eventBus.emitDirect({
          type: "node:added",
          node,
        });
    }
    for (const id of mut.updatedIds) {
      if (removedSet.has(id) || addedIds.has(id)) continue;
      const node = byId.get(id);
      if (node) {
        this.eventBus.emitDirect({
          type: "node:data-changed",
          nodeId: id,
          data: node.data,
        });
      }
    }
    this.eventBus.emit({
      type:
        opts?.persistMode === "request" ? "persist:request" : "persist:flush",
    });
    this.notifyGraph();
    return true;
  }
  /**
   * Promote a group member to MAIN ("换根"): flip `meta.hidden` (target →
   * visible, old main → hidden), inheriting the old main's position + size so
   * the group anchor stays put. Live incident edges re-point onto the new main;
   * artifact-provenance derivation edges stay pinned to concrete endpoints.
   * No-op when `subId` isn't a grouped node or is already main.
   *
   * Round-dot click is the same operation against the picked round's first
   * sub — it moves `meta.hidden=false` across rounds, which naturally moves
   * the active round bucket without needing a separate view-layer flag.
   */
  promoteSubImageToMain(subId, opts) {
    return this.applyImageGroupMutation(
      promoteToMain(this.fileNodes(), subId),
      opts,
    );
  }
  /**
   * Remove an entire image group ("删主图 = 级联删整组"): every node sharing the
   * group's `groupId` in one undoable commit (Cmd-Z restores the whole group).
   * Connected edges of every removed node are pruned too. Accepts any member
   * id; resolves to the group first.
   */
  removeImageGroup(mainId) {
    const node = this.getIndexes().nodeById.get(mainId);
    if (!node || !isGroupedNode(node)) return false;
    const mut = removeGroup(this.fileNodes(), node.groupId);
    if (mut.removedIds.length === 0) return false;
    this.removeElements(mut.removedIds, []);
    return true;
  }
  /** Detach a group member, preserving its generation metadata and reference edges. */
  detachSubImage(subId, absPosition) {
    const before = this.fileNodes();
    const mut = detachFromGroup(before, subId, absPosition, this.mode);
    const wasGrouped = new Set(
      before.filter((node) => isGroupedNode(node)).map((node) => node.id),
    );
    const raised = mut.nodes.filter(
      (node) => wasGrouped.has(node.id) && !isGroupedNode(node),
    );
    if (raised.length > 0) {
      const raisedIds = new Set(raised.map((node) => node.id));
      const rest = mut.nodes.filter((node) => !raisedIds.has(node.id));
      raised.sort(
        (leftNode, rightNode) => Number(leftNode.id === subId) - Number(rightNode.id === subId),
      );
      mut.nodes.length = 0;
      mut.nodes.push(...rest, ...raised);
    }
    return this.applyImageGroupMutation(mut);
  }
  /**
   * Detach several group members in ONE undoable operation ("全部独立"):
   * sequential per-member detaches share a single history entry, so one
   * Cmd-Z restores the whole group. Entries are applied in order — each detach
   * sees the graph produced by the previous one (successor-main promotion,
   * group collapse), exactly like the per-step gesture did.
   */
  detachSubImages(entries) {
    if (entries.length === 0) return false;
    return this.transaction(() => {
      let any = false;
      for (const { subId, position } of entries) {
        if (this.detachSubImage(subId, position)) any = true;
      }
      return any;
    });
  }
  /**
   * Detach a group member to a standalone node, landing it in GRAPH
   * coordinates directly at the group main's right edge (no ReactFlow /
   * measured-size dependency — uses persisted positions + footprints).
   *
   * Deliberately does NOT avoid unrelated canvas nodes: walking past every
   * occupied node (the old free-slot behavior) sent the detached image far
   * away on a crowded canvas, which reads as "my image vanished". Overlapping
   * a neighbor is the lesser evil — the user can nudge it after. Same rule as
   * `placeSub` in `use-multi-image-actions`. No-op + returns null when `subId`
   * isn't a grouped node.
   *
   * Used by the host's "select a sub-image as a reference → make it a real
   * node so the derivation edge is visible" flow (hidden subs can't show
   * edges). Returns the (unchanged) node id on success so callers can wire an
   * edge to it, or null on no-op.
   */
  detachSubImageToFreeSlot(subId) {
    const sub = this.getIndexes().nodeById.get(subId);
    if (!sub || !isGroupedNode(sub)) return null;
    const mode = this.mode;
    const subSize = sizeOf(sub, mode);
    const nodeById = this.getIndexes().nodeById;
    const absolutePositionOf = (node) => {
      const position = getNodePosition(node, mode);
      if (!node.parentId) return position;
      const parent = nodeById.get(node.parentId);
      if (!parent) return position;
      const pp = getNodePosition(parent, mode);
      return {
        x: pp.x + position.x,
        y: pp.y + position.y,
      };
    };
    const mainId = resolveGroupMainId(this.fileNodes(), subId);
    const mainNode = this.getIndexes().nodeById.get(mainId) ?? sub;
    const mainPos = absolutePositionOf(mainNode);
    const mainSize = getNodeSize(mainNode, mode) ?? subSize;
    const pos = {
      x: mainPos.x + mainSize.width + DEFAULT_PLACEMENT_GAP,
      y: mainPos.y,
    };
    const ok = this.detachSubImage(subId, pos);
    return ok ? subId : null;
  }
  /**
   * View the current runtime nodes as `CanvasFileNode[]` for the protocol
   * image-group functions. The two shapes only differ in `data`'s declared
   * type (`unknown` vs `Record<string, unknown>`); the membership fields the
   * functions read/write (`id` / `groupId` / `round` / `meta.hidden` /
   * `positions` / `size` / `sizes`) are identical and `data` is only ever
   * spread through unchanged. The mutation result is cast back on commit.
   */
  fileNodes() {
    return this.getGraph().nodes;
  }
  setPasteNodeTransformer(transformer) {
    this.pasteNodeTransformer = transformer;
  }
  /** Subscribe to graph state changes */
  onGraphChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  // ---- Graph mutations (non-undoable, for initialization / bulk loads) ----
  replaceGraphFromAuthoritativeSnapshot(graph) {
    this.history.setState(graph);
    this.notifyGraph();
  }
  replaceNodesFromAuthoritativeSnapshot(nodes) {
    const normalizedNodes = backfillLegacyComfyUiTemplateCopyOrdinals(
      nodes,
    ).map((node) => {
      const live = this.getIndexes().nodeById.get(node.id);
      if (
        !live ||
        !this.locallyFilledPlaceholderIds.has(node.id) ||
        !live.assetId ||
        live.assetId !== node.assetId ||
        live.meta?.cloneOf != null ||
        node.meta?.cloneOf == null
      ) {
        return node;
      }
      const data = {
        ...(node.data ?? {}),
      };
      delete data.cloneOf;
      const { cloneOf: _cloneOf, ...meta } = node.meta;
      return {
        ...node,
        data,
        meta: Object.keys(meta).length > 0 ? meta : void 0,
      };
    });
    if (isSamePersistedData(this.getGraph().nodes, normalizedNodes)) return;
    this.history.setState((draft) => {
      draft.nodes = normalizedNodes;
    });
    this.notifyGraph();
  }
  replaceEdgesFromAuthoritativeSnapshot(edges) {
    const ids = new Set(edges.map((edge) => edge.id));
    const deduped =
      ids.size === edges.length
        ? edges
        : edges.filter((edge) => ids.delete(edge.id));
    this.history.setState((draft) => {
      draft.edges = deduped;
    });
    this.notifyGraph();
  }
  switchMode(mode) {
    const prev = this.getMode();
    if (prev === mode) return;
    this.mode = mode;
    this.eventBus.emit({
      type: "mode:changed",
      mode,
      prevMode: prev,
    });
    this.notifyGraph();
  }
  // ---- Edge operations (undoable via history.commit) ----
  addEdge(edge) {
    if (this.getGraph().edges.some((existingEdge) => existingEdge.id === edge.id)) return;
    const event = {
      type: "edge:added",
      edge,
    };
    if (!this.eventBus.canEmit(event)) return;
    this.history.commit((draft) => {
      draft.edges.push(edge);
    });
    this.eventBus.emitDirect({
      type: "edge:added",
      edge,
    });
    this.notifyGraph();
  }
  removeEdges(edgeIds) {
    this.removeElements([], edgeIds);
  }
  /**
   * Server-driven sibling of `addEdge`: same dedupe + interceptor contract,
   * but the write goes through `history.serverSetState` so a WS-broadcast
   * edge (e.g. the derivation edge that ships with a generation placeholder,
   * or a reference edge landing with the completion broadcast) never creates
   * its own undo checkpoint and never folds into the user's next commit.
   *
   * Without this, toolbar edits (redraw / outpaint / erase / ...) — which
   * always carry a `source_node_id` and therefore always broadcast a
   * derivation edge — left a standalone undoable entry between the user's
   * actions, so Cmd-Z after a completed generation peeled the server edge
   * instead of reverting the user's last edit. See `HistoryManager.
   * serverSetState` for the seal-before-user-commit rationale.
   */
  addServerEdges(edges) {
    const existing = new Set(this.getGraph().edges.map((edge) => edge.id));
    const toInsert = [];
    for (const edge of edges) {
      if (existing.has(edge.id)) continue;
      if (
        !this.eventBus.canEmit({
          type: "edge:added",
          edge,
        })
      )
        continue;
      existing.add(edge.id);
      toInsert.push(edge);
    }
    if (toInsert.length === 0) return;
    this.history.serverSetState((draft) => {
      draft.edges.push(...toInsert);
    });
    for (const edge of toInsert) {
      this.eventBus.emitDirect({
        type: "edge:added",
        edge,
      });
    }
    this.notifyGraph();
  }
  // ---- Node operations (undoable via history.commit) ----
  prepareNodeForInsert(node) {
    const mode = this.getMode();
    if (
      !node.parentId &&
      !node.groupId &&
      node.type !== CanvasNodeType.Group
    ) {
      const childAbs = getNodePosition(node, mode);
      const childSize = node.size ?? defaultNodeSizeForType(node.type);
      const enclosing = this.findEnclosingGroup(childAbs, childSize, mode);
      if (enclosing) {
        const parentAbs = getNodePosition(enclosing, mode);
        return {
          ...node,
          parentId: enclosing.id,
          positions: {
            ...node.positions,
            [mode]: {
              x: childAbs.x - parentAbs.x,
              y: childAbs.y - parentAbs.y,
            },
          },
        };
      }
    }
    return node;
  }
  addNode(node) {
    const toInsert = this.prepareNodeForInsert({
      ...node,
      meta: {
        ...node.meta,
        addedAt: node.meta?.addedAt ?? Date.now(),
      },
    });
    const event = {
      type: "node:added",
      node: toInsert,
    };
    if (!this.eventBus.canEmit(event)) return;
    this.history.commit((draft) => {
      draft.nodes.push(toInsert);
    });
    this.eventBus.emitDirect({
      type: "node:added",
      node: toInsert,
    });
    this.notifyGraph();
  }
  /**
   * Insert a server-sent batch with one state write + one graph sync.
   *
   * WS `canvas_updated.addedNodes` can contain multiple sub-image loading
   * slots for the same multi-image card. Adding them one-by-one creates
   * intermediate ReactFlow frames before the hidden-sub-image set is rebuilt,
   * so users briefly see those slots as standalone loading cards. Batching
   * preserves the same node:added events while making the renderer observe
   * the final graph only.
   */
  addNodes(nodes) {
    this.insertNodesBatch(nodes, "commit");
  }
  /**
   * Server-driven sibling of `addNodes`: inserts a WS-broadcast batch via
   * `history.setState` instead of `history.commit`.
   *
   * A tool may publish finished media directly without first publishing a
   * generating placeholder. Those settled arrivals are announced as the
   * latest operation here because graph status tracking cannot observe a
   * generating -> settled transition for a brand-new id. Callers suppress
   * the announcement for reconciliation and existing-asset placement.
   *
   * UNDO INTERACTION: uses `history.setState` (per the canvas package's
   * "external WS sync uses setState" rule). Under
   * travels' manual-archive mode, consecutive `setState` writes accumulate in
   * one tempPatches batch and archive as a SINGLE undo entry, whereas each
   * `commit` archives standalone.
   *
   * This is what fixes the "undo resurrects a finished node into generating"
   * bug. A freshly broadcast `placeholder` (status `generating` / `loading`)
   * is gateway state, not the user's local edit. Routing it through `commit`
   * (as plain `addNodes` does) left a standalone `generating` checkpoint; the
   * matching completion broadcast then landed via `applyServerNodeUpdate`
   * (setState), so a later Cmd-Z peeled only the completion patch and replayed
   * back to that `generating` snapshot — resurrecting the finished node into a
   * ghost generating state. Inserting the placeholder via setState too folds
   * enter + complete into one batch, so undo reverts the whole generation
   * atomically and never re-exposes the intermediate `generating` state.
   *
   * Identical to `addNodes` otherwise: same `prepareNodeForInsert`, same
   * interceptor gate, same per-node `node:added` events, single `notifyGraph`.
   */
  addServerNodes(nodes) {
    this.insertNodesBatch(nodes, "setState");
  }
  insertNodesBatch(nodes, mutation) {
    if (nodes.length === 0) return;
    const existingIds = new Set(this.getGraph().nodes.map((node) => node.id));
    const toInsert = [];
    for (const node of nodes) {
      if (existingIds.has(node.id)) continue;
      const prepared = this.prepareNodeForInsert(
        mutation === "commit"
          ? {
              ...node,
              meta: {
                ...node.meta,
                addedAt: node.meta?.addedAt ?? Date.now(),
              },
            }
          : node,
      );
      const event = {
        type: "node:added",
        node: prepared,
      };
      if (!this.eventBus.canEmit(event)) continue;
      existingIds.add(prepared.id);
      toInsert.push(prepared);
    }
    if (toInsert.length === 0) return;
    const updater = (draft) => {
      draft.nodes.push(...toInsert);
    };
    if (mutation === "commit") {
      this.history.commit(updater);
    } else {
      this.history.serverSetState(updater);
    }
    for (const node of toInsert) {
      this.eventBus.emitDirect({
        type: "node:added",
        node,
      });
    }
    this.notifyGraph();
  }
  /**
   * Apply a server broadcast that contains both new nodes and updated existing
   * nodes in one non-undoable commit.
   *
   * Multi-image "add new main" reservations arrive as:
   * - addedNodes: the new loading main
   * - updatedNodes: the old main/group demoted under that loading main
   *
   * If the renderer applies those branches separately, ReactFlow paints an
   * intermediate frame where the loading main is standalone elsewhere and the
   * old image is not yet a sub-image. This method makes the graph transition
   * atomic, so the first visible loading frame already has the final group
   * shape.
   */
  applyServerCanvasUpdate(changes, mode) {
    const hasAdded = (changes.addedNodes?.length ?? 0) > 0;
    const hasUpdated = (changes.updatedNodes?.length ?? 0) > 0;
    const hasRemoved = (changes.removedNodeIds?.length ?? 0) > 0;
    if (!hasAdded && !hasUpdated && !hasRemoved) return;
    const addedRuntime =
      changes.addedNodes && changes.addedNodes.length > 0
        ? changes.addedNodes.map((node) =>
            this.prepareNodeForInsert(fileNodeToRuntimeNode(node, mode)),
          )
        : void 0;
    const prevIds = new Set(this.getGraph().nodes.map((node) => node.id));
    const inserted = addedRuntime?.filter((node) => !prevIds.has(node.id)) ?? [];
    const normalizedChanges = {
      ...changes,
      ...(inserted.length > 0
        ? {
            addedNodes: inserted,
          }
        : {
            addedNodes: void 0,
          }),
    };
    this.history.serverSetState((draft) => {
      applyChangesetToDraft(draft, normalizedChanges, mode);
    });
    for (const node of inserted) {
      this.eventBus.emitDirect({
        type: "node:added",
        node,
      });
    }
    for (const node of changes.updatedNodes ?? []) {
      this.eventBus.emitDirect({
        type: "node:data-changed",
        nodeId: node.id,
        data: node.data,
      });
    }
    for (const nodeId of changes.removedNodeIds ?? []) {
      this.eventBus.emitDirect({
        type: "node:removed",
        nodeId,
      });
    }
    this.notifyGraph();
  }
  /**
   * Find the first group whose AABB fully contains `(absPos, size)` in the
   * supplied mode. Returns null when no group encloses the rect, when the
   * candidate group has no measured size yet, or when there are no groups
   * on the canvas.
   *
   * Mirrors the search rules used by `moveNodes` adoption (skip groups
   * missing size, skip groups equal to the search target, first match wins
   * — current build emits zIndex=-100 on every group so there's no
   * meaningful z-order tiebreaker to apply).
   */
  findEnclosingGroup(absPos, size, mode) {
    for (const group of this.getGraph().nodes) {
      if (group.type !== CanvasNodeType.Group) continue;
      const gSize = getNodeSize(group, mode);
      if (!gSize) continue;
      if (
        isChildFullyInsideParent(
          absPos,
          size,
          getNodePosition(group, mode),
          gSize,
        )
      ) {
        return group;
      }
    }
    return null;
  }
  removeNode(nodeId) {
    this.removeElements([nodeId], []);
  }
  removeNodes(nodeIds) {
    this.removeElements(nodeIds, []);
  }
  /**
   * Remove nodes and edges in a single undoable commit.
   * Connected edges of removed nodes are also removed automatically.
   */
  removeElements(nodeIds, edgeIds) {
    this.removeElementsInternal(nodeIds, edgeIds, "commit");
  }
  /**
   * Server-driven sibling of `removeElements`: identical removal semantics
   * (connected edges, successor promotion, selection
   * pruning) but the write goes through `history.serverSetState` so a
   * WS-broadcast removal (e.g. the stale error-placeholder sweep that rides
   * an `addPlaceholder` retry, or `cleanupPlaceholder` after a failed asset
   * record) never creates its own undo checkpoint. Otherwise a Cmd-Z after
   * a toolbar regeneration resurrected the swept error placeholder instead
   * of reverting the user's last edit.
   */
  removeServerElements(nodeIds, edgeIds) {
    this.removeElementsInternal(nodeIds, edgeIds, "server");
  }
  removeElementsInternal(nodeIds, edgeIds, mutation) {
    const graph = this.getGraph();
    const mode = this.getMode();
    const { nodeById } = this.getIndexes();
    const validNodeIds = nodeIds.filter((id) => nodeById.has(id));
    const groupAwareRemoval = planGroupAwareRemoval(
      graph,
      mode,
      validNodeIds,
      edgeIds,
    );
    const partition = partitionUserRemovalElements({
      nodes: graph.nodes,
      edges: graph.edges,
      requestedNodeIds: groupAwareRemoval.removalNodeIds,
      requestedEdgeIds: groupAwareRemoval.removalEdgeIds,
      enforceProtection: mutation === "commit",
    });
    const nodeIdSet = partition.deletableNodeIds;
    const explicitlyRemovedNodes = graph.nodes.filter((node) =>
      nodeIdSet.has(node.id),
    );
    const survivingUngroupedChildren = Array.from(
      groupAwareRemoval.ungroupedChildrenByGroupId,
    )
      .filter(([groupId]) => nodeIdSet.has(groupId))
      .flatMap(([, children]) => children)
      .filter((node) => !nodeIdSet.has(node.id));
    const promotedMainByDeletedId = new Map();
    const affectedGroupIds = new Set();
    for (const node of graph.nodes) {
      if (
        nodeIdSet.has(node.id) &&
        typeof node.groupId === "string" &&
        node.groupId.length > 0
      ) {
        affectedGroupIds.add(node.groupId);
      }
    }
    for (const groupId of affectedGroupIds) {
      const members = collectGroupMembers(graph.nodes, groupId);
      const main = members.find((member) => member.meta?.hidden !== true);
      if (!main || !nodeIdSet.has(main.id)) continue;
      const mainIndex = members.findIndex((member) => member.id === main.id);
      const successorId = pickSuccessorMain(
        members.filter((member) => !nodeIdSet.has(member.id)),
        mainIndex,
      );
      if (successorId) promotedMainByDeletedId.set(main.id, successorId);
    }
    const edgeIdsToRemove = new Set(partition.deletableEdgeIds);
    const followEdgeReplacements = [];
    if (promotedMainByDeletedId.size > 0) {
      const explicitlyRemovedEdgeIds = new Set(
        groupAwareRemoval.removalEdgeIds,
      );
      const provenanceOptions = this.artifactProvenanceOptions();
      const replacementCandidates = [];
      for (const edge of graph.edges) {
        if (explicitlyRemovedEdgeIds.has(edge.id)) continue;
        if (isArtifactProvenanceEdge(edge, graph.nodes, provenanceOptions))
          continue;
        const source = promotedMainByDeletedId.get(edge.source) ?? edge.source;
        const target = promotedMainByDeletedId.get(edge.target) ?? edge.target;
        if (source === edge.source && target === edge.target) continue;
        edgeIdsToRemove.add(edge.id);
        if (source !== target) {
          replacementCandidates.push({
            ...edge,
            id: deriveEdgeId(source, target),
            source,
            target,
          });
        }
      }
      const retainedEdgeIds = new Set(
        graph.edges
          .filter((edge) => !edgeIdsToRemove.has(edge.id))
          .map((edge) => edge.id),
      );
      for (const edge of replacementCandidates) {
        if (retainedEdgeIds.has(edge.id)) continue;
        retainedEdgeIds.add(edge.id);
        followEdgeReplacements.push(edge);
      }
    }
    if (partition.blockedCount > 0) {
      this.eventBus.emit({
        type: "delete:blocked",
        count: partition.blockedCount,
        reason: partition.blockedReason ?? "generating",
      });
    }
    if (nodeIdSet.size === 0 && edgeIdsToRemove.size === 0) return;
    const incomingNodeCount = graph.nodes.length - nodeIdSet.size;
    const incomingEdgeCount =
      graph.edges.length - edgeIdsToRemove.size + followEdgeReplacements.length;
    const highBlastConfirmed =
      mutation === "commit" &&
      isHighBlastCanvasElementDeletion(
        graph.nodes.length,
        incomingNodeCount,
        graph.edges.length,
        incomingEdgeCount,
      );
    if (
      highBlastConfirmed &&
      !this.confirmHighBlastDeletion(
        incomingNodeCount,
        incomingEdgeCount,
        () => {
          this.removeElementsInternal(nodeIds, edgeIds, mutation);
        },
      )
    ) {
      return;
    }
    for (const nodeId of nodeIdSet) {
      if (
        !this.eventBus.canEmit({
          type: "node:removed",
          nodeId,
        })
      )
        return;
    }
    for (const edgeId of edgeIdsToRemove) {
      if (
        !this.eventBus.canEmit({
          type: "edge:removed",
          edgeId,
        })
      )
        return;
    }
    for (const edge of followEdgeReplacements) {
      if (
        !this.eventBus.canEmit({
          type: "edge:added",
          edge,
        })
      )
        return;
    }
    if (nodeIdSet.size > 0 && this.selection.count() > 0) {
      const next = this.selection
        .getSelected()
        .filter((id) => !nodeIdSet.has(id));
      if (next.length !== this.selection.count()) this.selection.set(next);
    }
    const applyRemoval = (draft) => {
      if (survivingUngroupedChildren.length > 0) {
        applyChangesetToDraft(
          draft,
          {
            updatedNodes: survivingUngroupedChildren,
          },
          mode,
        );
      }
      if (edgeIdsToRemove.size > 0) {
        draft.edges = draft.edges.filter((edge) => !edgeIdsToRemove.has(edge.id));
      }
      if (followEdgeReplacements.length > 0) {
        draft.edges.push(...followEdgeReplacements);
      }
      if (nodeIdSet.size > 0) {
        draft.nodes = removeNodesAndPromoteGroupMains(draft.nodes, nodeIdSet);
      }
    };
    if (mutation === "commit") {
      this.history.commit(applyRemoval);
    } else {
      this.history.serverSetState(applyRemoval);
    }
    for (const edgeId of edgeIdsToRemove) {
      this.eventBus.emitDirect({
        type: "edge:removed",
        edgeId,
      });
    }
    for (const edge of followEdgeReplacements) {
      this.eventBus.emitDirect({
        type: "edge:added",
        edge,
      });
    }
    for (const nodeId of nodeIdSet) {
      this.eventBus.emitDirect({
        type: "node:removed",
        nodeId,
      });
    }
    if (mutation === "commit") {
      this.emitDeleteIntent(
        explicitlyRemovedNodes,
        [...edgeIdsToRemove],
        highBlastConfirmed,
      );
    }
    this.notifyGraph();
  }
  emitDeleteIntent(nodes, removedEdgeIds = [], highBlastConfirmed = false) {
    if (nodes.length === 0 && removedEdgeIds.length === 0) return;
    const removedAssetIds = nodes
      .map((node) => deletionAssetId(node))
      .filter((assetId) => assetId !== void 0);
    this.eventBus.emitDirect({
      type: "persist:delete-intent",
      removedNodeIds: nodes.map((node) => node.id),
      removedEdgeIds: [...new Set(removedEdgeIds)],
      removedAssetIds: [...new Set(removedAssetIds)],
      ...(highBlastConfirmed
        ? {
            highBlastConfirmed: true,
          }
        : {}),
    });
  }
  resizeNode(nodeId, size) {
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === nodeId);
      if (target) target.size = size;
    });
    this.eventBus.emit({
      type: "node:resized",
      nodeId,
      size,
    });
    this.notifyGraph();
  }
  /**
   * Atomic data + size update — used when a node toggles between display
   * variants whose physical card dimensions also change (e.g. file-node
   * card↔preview view). Folding both writes into a single `history.commit`
   * means one undo step reverts both, so we never expose intermediate
   * states like "preview UI but card-sized box" or vice versa.
   */
  updateNodeDataAndResize(nodeId, data, size) {
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === nodeId);
      if (!target) return;
      target.data = data;
      target.size = size;
    });
    this.eventBus.emit({
      type: "node:data-changed",
      nodeId,
      data,
    });
    this.eventBus.emit({
      type: "node:resized",
      nodeId,
      size,
    });
    this.notifyGraph();
  }
  moveNode(nodeId, position) {
    const mode = this.getMode();
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return;
    const prevPosition = {
      ...getNodePosition(node, mode),
    };
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === nodeId);
      if (target) setNodePosition(target, mode, position);
    });
    this.eventBus.emit({
      type: "node:moved",
      nodeId,
      position,
      prevPosition,
    });
    this.notifyGraph();
  }
  /**
   * Atomic move+resize — used by 8-direction NodeResizer where corner / edge
   * handles can shift the top-left while the size also changes. A single
   * commit keeps undo/redo to one step per resize gesture. Callers may also
   * replace persisted node data in that same commit when the data mirrors the
   * physical dimensions (for example `displayImageOnly` image nodes).
   */
  moveAndResizeNode(nodeId, position, size, data) {
    const mode = this.getMode();
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return;
    const prevPosition = {
      ...getNodePosition(node, mode),
    };
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === nodeId);
      if (!target) return;
      setNodePosition(target, mode, position);
      target.size = size;
      if (data) target.data = data;
    });
    this.eventBus.emit({
      type: "node:moved",
      nodeId,
      position,
      prevPosition,
    });
    this.eventBus.emit({
      type: "node:resized",
      nodeId,
      size,
    });
    if (data)
      this.eventBus.emit({
        type: "node:data-changed",
        nodeId,
        data,
      });
    this.notifyGraph();
  }
  /**
   * Atomic resize for a flat image stack. The visible anchor owns position,
   * while every member sharing its groupId receives the same physical size and
   * `data.displaySize`. Round switching can then change the visible asset
   * without changing the stack's outer frame. Once Split to Node clears a
   * member's groupId it naturally stops participating in this write.
   */
  moveAndResizeImageGroupMembers(nodeId, position, size, data) {
    const mode = this.getMode();
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return;
    if (!node.groupId) {
      this.moveAndResizeNode(nodeId, position, size, data);
      return;
    }
    const groupId = node.groupId;
    const memberIds = [];
    const prevPosition = {
      ...getNodePosition(node, mode),
    };
    this.history.commit((draft) => {
      for (const target of draft.nodes) {
        if (target.groupId !== groupId) continue;
        memberIds.push(target.id);
        target.size = {
          ...size,
        };
        if (target.id === nodeId) {
          setNodePosition(target, mode, position);
          target.data = data;
          continue;
        }
        const targetData =
          target.data && typeof target.data === "object" ? target.data : {};
        target.data = {
          ...targetData,
          displaySize: {
            ...size,
          },
          // PlaceholderNode deliberately paints from this explicit field
          // instead of its measured ReactFlow dimensions (which can create a
          // resize feedback loop). Keep an in-flight Storyboard round in
          // lockstep when another ready round in the same stack is resized.
          ...(target.type === CanvasNodeType.Placeholder
            ? {
                placeholderDisplaySize: {
                  ...size,
                },
              }
            : {}),
        };
      }
    });
    this.eventBus.emit({
      type: "node:moved",
      nodeId,
      position,
      prevPosition,
    });
    for (const memberId of memberIds) {
      const member = this.getIndexes().nodeById.get(memberId);
      if (!member) continue;
      this.eventBus.emit({
        type: "node:resized",
        nodeId: memberId,
        size,
      });
      this.eventBus.emit({
        type: "node:data-changed",
        nodeId: memberId,
        data: member.data,
      });
    }
    this.notifyGraph();
  }
  /**
   * Atomic move+resize tailored to GROUP nodes. Differs from
   * `moveAndResizeNode` in two ways:
   *
   * 1. **Auto-fit fallback** — if the user-supplied frame is narrower or
   *    shorter than the children's bounding box (incl. `GROUP_NODE_PADDING`),
   *    we union the user input with the children bbox so the final frame
   *    always fully contains every child. When width AND height already
   *    cover the bbox, the user input is committed verbatim. This matches
   *    the spec: "if width or height is smaller than the children bounding
   *    box, do a one-shot auto-fit; if both are bigger, do nothing."
   *
   * 2. **Children translation** — when the group's `position` shifts
   *    (corner / edge drags from the top or left), every child's
   *    parent-relative `position` is translated in the opposite direction
   *    so the child's ABSOLUTE screen position stays put. Without this,
   *    ReactFlow would re-render `child_abs = group.pos + child.rel` and
   *    the children would visibly jump along with the resize.
   *
   * No-op when `groupId` doesn't resolve to a group node. Single undoable
   * commit. Selection is unchanged.
   */
  resizeGroupNode(groupId, position, size) {
    const mode = this.getMode();
    const { nodeById, childrenByParent } = this.getIndexes();
    const group = nodeById.get(groupId);
    if (!group || group.type !== CanvasNodeType.Group) return;
    const groupAbs = getNodePosition(group, mode);
    const groupSize = getNodeSize(group, mode);
    const children = childrenByParent.get(groupId) ?? [];
    let finalPos = position;
    let finalSize = size;
    if (children.length > 0) {
      const childrenAbs = children.map((child) => {
        const rel = getNodePosition(child, mode);
        return {
          position: {
            x: groupAbs.x + rel.x,
            y: groupAbs.y + rel.y,
          },
          size: child.size,
          type: child.type,
        };
      });
      const { position: bboxPos, size: bboxSize } =
        computeGroupBoundsFromChildren(childrenAbs);
      const userLeft = position.x;
      const userTop = position.y;
      const userRight = position.x + size.width;
      const userBottom = position.y + size.height;
      const bboxLeft = bboxPos.x;
      const bboxTop = bboxPos.y;
      const bboxRight = bboxPos.x + bboxSize.width;
      const bboxBottom = bboxPos.y + bboxSize.height;
      const widthInsufficient = userRight < bboxRight || userLeft > bboxLeft;
      const heightInsufficient = userBottom < bboxBottom || userTop > bboxTop;
      if (widthInsufficient || heightInsufficient) {
        const left = Math.min(userLeft, bboxLeft);
        const combinedTop = Math.min(userTop, bboxTop);
        const right = Math.max(userRight, bboxRight);
        const bottom = Math.max(userBottom, bboxBottom);
        finalPos = {
          x: left,
          y: combinedTop,
        };
        finalSize = {
          width: right - left,
          height: bottom - combinedTop,
        };
      }
    }
    const dx = finalPos.x - groupAbs.x;
    const dy = finalPos.y - groupAbs.y;
    const positionChanged = dx !== 0 || dy !== 0;
    const sizeChanged =
      finalSize.width !== groupSize?.width ||
      finalSize.height !== groupSize?.height;
    if (!positionChanged && !sizeChanged) {
      const userDiffersFromInstance =
        position.x !== groupAbs.x ||
        position.y !== groupAbs.y ||
        size.width !== groupSize?.width ||
        size.height !== groupSize?.height;
      if (userDiffersFromInstance) this.notifyGraph();
      return;
    }
    const prevPosition = {
      ...groupAbs,
    };
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === groupId);
      if (!target) return;
      setNodePosition(target, mode, finalPos);
      target.sizes = {
        ...(target.sizes ?? {}),
        [mode]: finalSize,
      };
      target.size = finalSize;
      const existingData = target.data ?? {};
      target.data = {
        ...existingData,
        frameMode: "manual",
      };
      if (positionChanged) {
        for (const node of draft.nodes) {
          if (node.parentId !== groupId) continue;
          const rel = getNodePosition(node, mode);
          setNodePosition(node, mode, {
            x: rel.x - dx,
            y: rel.y - dy,
          });
        }
      }
    });
    if (positionChanged) {
      this.eventBus.emit({
        type: "node:moved",
        nodeId: groupId,
        position: finalPos,
        prevPosition,
      });
    }
    if (sizeChanged) {
      this.eventBus.emit({
        type: "node:resized",
        nodeId: groupId,
        size: finalSize,
      });
    }
    this.notifyGraph();
  }
  /**
   * Toggle a group's collapsed state, persisting to `node.meta.collapsed`.
   * When collapsing, the group is also removed from the current selection so
   * the lingering toolbar / resize chrome doesn't sit on top of an empty
   * (visually invisible) frame area. Single undoable commit + `persist:flush`
   * so the new state reaches canvas.json before the user does anything else
   * (matches `ungroup`'s "one user decision = one immediate save" semantics).
   *
   * No-op when `groupId` doesn't resolve to a group node, or when the flag
   * is already at the requested value (avoids redundant history entries and
   * persist writes on repeated toggles of the same state).
   */
  setGroupCollapsed(groupId, collapsed) {
    const node = this.getIndexes().nodeById.get(groupId);
    if (!node || node.type !== CanvasNodeType.Group) return;
    if (!!node.meta?.collapsed === collapsed) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === groupId);
      if (!target) return;
      target.meta = {
        ...(target.meta ?? {}),
        collapsed,
      };
    });
    if (collapsed) this.selection.deselect(groupId);
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  moveNodes(updates) {
    if (updates.length === 0) return;
    const mode = this.getMode();
    const { nodeById } = this.getIndexes();
    const updateMap = new Map(updates.map((update) => [update.id, update.position]));
    const orphanAbsByNodeId = new Map();
    for (const update of updates) {
      const node = nodeById.get(update.id);
      if (!node?.parentId) continue;
      const parent = nodeById.get(node.parentId);
      if (!parent) continue;
      const parentPos =
        updateMap.get(parent.id) ?? getNodePosition(parent, mode);
      const newAbs = {
        x: parentPos.x + update.position.x,
        y: parentPos.y + update.position.y,
      };
      const parentSize = getNodeSize(parent, mode);
      if (
        isChildFullyOutsideParent(newAbs, node.size, parentPos, parentSize)
      ) {
        orphanAbsByNodeId.set(update.id, newAbs);
      }
    }
    const adoptByNodeId = new Map();
    const groups = [];
    for (const node of nodeById.values()) {
      if (node.type === CanvasNodeType.Group) groups.push(node);
    }
    for (const update of updates) {
      const node = nodeById.get(update.id);
      if (!node) continue;
      if (node.type === CanvasNodeType.Group) continue;
      let absPos;
      if (orphanAbsByNodeId.has(update.id)) {
        absPos = orphanAbsByNodeId.get(update.id);
      } else if (node.parentId) {
        continue;
      } else {
        absPos = update.position;
      }
      for (const group of groups) {
        if (group.id === update.id) continue;
        const gSize = getNodeSize(group, mode);
        if (!gSize) continue;
        const gPos = updateMap.get(group.id) ?? getNodePosition(group, mode);
        if (isChildFullyInsideParent(absPos, node.size, gPos, gSize)) {
          if (!orphanAbsByNodeId.has(update.id) && node.parentId === group.id) break;
          adoptByNodeId.set(update.id, {
            groupId: group.id,
            groupAbs: gPos,
          });
          break;
        }
      }
    }
    const childIdsToTouch = new Set();
    const { childrenByParent } = this.getIndexes();
    for (const update of updates) {
      const node = nodeById.get(update.id);
      if (node?.type !== CanvasNodeType.Group) continue;
      const children = childrenByParent.get(update.id);
      if (!children) continue;
      for (const child of children) {
        if (updateMap.has(child.id)) continue;
        if (orphanAbsByNodeId.has(child.id)) continue;
        if (adoptByNodeId.has(child.id)) continue;
        childIdsToTouch.add(child.id);
      }
    }
    if (updates.length === 1 && adoptByNodeId.size === 0) {
      const update = updates[0];
      const node = nodeById.get(update.id);
      if (!node) return;
      const prevPosition = {
        ...getNodePosition(node, mode),
      };
      const orphanAbs = orphanAbsByNodeId.get(update.id);
      this.history.commit((draft) => {
        const target = draft.nodes.find((node) => node.id === update.id);
        if (!target) return;
        if (orphanAbs) {
          setNodePosition(target, mode, orphanAbs);
          target.parentId = void 0;
        } else {
          setNodePosition(target, mode, update.position);
        }
        if (childIdsToTouch.size > 0) {
          for (const child of draft.nodes) {
            if (!childIdsToTouch.has(child.id)) continue;
            const rel = getNodePosition(child, mode);
            setNodePosition(child, mode, {
              x: rel.x,
              y: rel.y,
            });
          }
        }
      });
      this.eventBus.emit({
        type: "node:moved",
        nodeId: update.id,
        position: orphanAbs ?? update.position,
        prevPosition,
      });
      this.notifyGraph();
      return;
    }
    this.history.commit((draft) => {
      for (const node of draft.nodes) {
        const adopt = adoptByNodeId.get(node.id);
        if (adopt) {
          const orphanAbs = orphanAbsByNodeId.get(node.id);
          let absPos;
          if (orphanAbs) absPos = orphanAbs;
          else absPos = updateMap.get(node.id);
          node.parentId = adopt.groupId;
          setNodePosition(node, mode, {
            x: absPos.x - adopt.groupAbs.x,
            y: absPos.y - adopt.groupAbs.y,
          });
          continue;
        }
        const orphanAbs = orphanAbsByNodeId.get(node.id);
        if (orphanAbs) {
          setNodePosition(node, mode, orphanAbs);
          node.parentId = void 0;
          continue;
        }
        const pos = updateMap.get(node.id);
        if (pos) {
          setNodePosition(node, mode, pos);
          continue;
        }
        if (childIdsToTouch.has(node.id)) {
          const rel = getNodePosition(node, mode);
          setNodePosition(node, mode, {
            x: rel.x,
            y: rel.y,
          });
        }
      }
    });
    this.notifyGraph();
  }
  // ---- Group operations ----
  /**
   * Group / merge nodes. Two modes depending on whether the selection already
   * contains a group node:
   *
   * **Create mode** (selection has no groups): wraps the eligible non-group,
   * un-parented nodes in a freshly created group and returns its id. Requires
   * at least 2 eligible nodes; otherwise returns `null`.
   *
   * **Merge mode** (selection contains ≥1 group): the FIRST selected group
   * acts as the merge target. All loose nodes in the selection are adopted
   * into it, and every other selected group is dissolved — its children
   * (including any not explicitly selected) are migrated over and the group
   * itself is removed. Returns the merge target's id. When there is nothing
   * new to merge in (no loose nodes + no other groups dissolving), returns
   * `null` to keep the no-op contract.
   *
   * Filtering rules:
   * - Unknown / missing node IDs are silently dropped.
   * - Nodes already belonging to the merge target are skipped (no double-adopt).
   * - Nodes belonging to an unrelated group (not in the selection) are skipped
   *   in BOTH modes — the user must ungroup that other group first.
   *
   * In merge mode the group's position+size is recomputed from the union of
   * its existing + newly adopted children (reusing
   * `computeGroupBoundsFromChildren`); existing children's relative positions
   * are translated by the inverse of the group's position shift so their
   * absolute screen positions stay put. In create mode the position+size is
   * computed from the children's absolute bounding box. Children get
   * `parentId = groupId` and their `position` is converted to be **relative
   * to the group** so ReactFlow's built-in parentLookup translates them
   * automatically when the group moves. The group gets `meta.zIndex =
   * GROUP_Z_INDEX` (defined alongside the pure function in
   * `@hilo/protocol/canvas`) so ReactFlow renders it beneath the children.
   *
   * Single undoable commit. Selection is set to the resulting group id.
   *
   * Implementation: business rules live in the protocol-layer
   * `groupNodesInCanvas` pure function so gateway and renderer share them.
   * This method is the runtime adapter — it builds a `CanvasFile` snapshot,
   * runs the pure function, then applies the resulting changeset back into
   * the immer draft while preserving event-bus / interceptor / selection /
   * persist:flush semantics that the renderer-only path requires.
   *
   * `options.label` (CREATE mode only) is forwarded verbatim to the pure
   * function — applied as `data.label` on the new group when present;
   * silently dropped in MERGE mode (the existing merge target's label is
   * preserved). This mirrors the `canvas_group_nodes` MCP tool surface so
   * future UI right-click "Group with name…" entries can pass the name in
   * a single call instead of "create then inline-rename" two-step.
   */
  groupNodes(nodeIds, options) {
    const graph = this.getGraph();
    const mode = this.getMode();
    const file = buildCanvasFileSnapshot(graph, mode);
    const result = groupNodesInCanvas(file, nodeIds, options);
    if (!result.groupId) {
      if (result.error) {
        console.warn(
          "[canvas] groupNodes refused on renderer side:",
          result.error,
        );
      }
      return null;
    }
    const isMergeMode = result.addedNodes.length === 0;
    for (const removedId of result.removedNodeIds) {
      if (
        !this.eventBus.canEmit({
          type: "node:removed",
          nodeId: removedId,
        })
      )
        return null;
    }
    const addedRuntimeNodes = result.addedNodes.map((node) =>
      fileNodeToRuntimeNode(node, mode),
    );
    for (const node of addedRuntimeNodes) {
      if (
        !this.eventBus.canEmit({
          type: "node:added",
          node,
        })
      )
        return null;
    }
    let mergeTargetPrevPos;
    let mergeTargetPrevSize;
    if (isMergeMode) {
      const mergeTarget = this.getIndexes().nodeById.get(result.groupId);
      if (mergeTarget) {
        mergeTargetPrevPos = {
          ...getNodePosition(mergeTarget, mode),
        };
        const mtSize = getNodeSize(mergeTarget, mode);
        if (mtSize)
          mergeTargetPrevSize = {
            ...mtSize,
          };
      }
    }
    this.history.commit((draft) => {
      applyChangesetToDraft(
        draft,
        {
          addedNodes: result.addedNodes,
          removedNodeIds: result.removedNodeIds,
          updatedNodes: result.updatedNodes,
        },
        mode,
      );
    });
    for (const node of addedRuntimeNodes) {
      this.eventBus.emitDirect({
        type: "node:added",
        node,
      });
    }
    for (const removedId of result.removedNodeIds) {
      this.eventBus.emitDirect({
        type: "node:removed",
        nodeId: removedId,
      });
    }
    this.emitDeleteIntent(
      graph.nodes.filter((node) => result.removedNodeIds.includes(node.id)),
    );
    if (isMergeMode) {
      const mtUpdated = result.updatedNodes.find(
        (node) => node.id === result.groupId,
      );
      if (mtUpdated && mergeTargetPrevPos) {
        const newPos = mtUpdated.positions?.[mode];
        if (
          newPos &&
          (newPos.x !== mergeTargetPrevPos.x ||
            newPos.y !== mergeTargetPrevPos.y)
        ) {
          this.eventBus.emit({
            type: "node:moved",
            nodeId: result.groupId,
            position: newPos,
            prevPosition: mergeTargetPrevPos,
          });
        }
        if (
          mtUpdated.size &&
          (mtUpdated.size.width !== mergeTargetPrevSize?.width ||
            mtUpdated.size.height !== mergeTargetPrevSize?.height)
        ) {
          this.eventBus.emit({
            type: "node:resized",
            nodeId: result.groupId,
            size: mtUpdated.size,
          });
        }
      }
    }
    this.selection.set([result.groupId]);
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
    return result.groupId;
  }
  /**
   * Dissolve a group: remove the group node, leave children at their previous
   * absolute positions (convert relative back to absolute), and clear their
   * `parentId`. Selection is CLEARED — flipping `selected` on N-many children
   * after ungrouping invalidates each child's `React.memo` (the comparator
   * checks `selected`, see `node-memo.ts`), causing every child component to
   * re-render and any lazy children (toolbars, popovers, lightbox shells) to
   * re-mount. On a 500-node canvas the unwrap-then-batch-select pattern
   * blocked the main thread for several seconds. Clearing instead means the
   * user has to re-select the surviving children themselves; in exchange the
   * UI stays responsive.
   *
   * Silently no-op when `groupId` doesn't exist or isn't a group node.
   * Single undoable commit + persist:flush.
   *
   * Implementation: business rules live in the protocol-layer
   * `ungroupInCanvas` pure function so gateway and renderer share them.
   * This method is the runtime adapter — see `groupNodes` above for the
   * shared bridging pattern.
   */
  ungroup(groupId) {
    const graph = this.getGraph();
    const mode = this.getMode();
    const file = buildCanvasFileSnapshot(graph, mode);
    const result = ungroupInCanvas(file, groupId);
    if (!result.removed) {
      if (result.error) {
        console.warn(
          "[canvas] ungroup refused on renderer side:",
          result.error,
        );
      }
      return;
    }
    if (
      !this.eventBus.canEmit({
        type: "node:removed",
        nodeId: groupId,
      })
    )
      return;
    this.selection.set([]);
    this.history.commit((draft) => {
      applyChangesetToDraft(
        draft,
        {
          removedNodeIds: result.removedNodeIds,
          updatedNodes: result.updatedNodes,
        },
        mode,
      );
    });
    this.eventBus.emitDirect({
      type: "node:removed",
      nodeId: groupId,
    });
    this.emitDeleteIntent(graph.nodes.filter((node) => node.id === groupId));
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  /**
   * Rearrange the children of a group node into the requested layout
   * (`grid` row-major auto-grid, `vertical` Sugiyama-like layered tree, or
   * `horizontal` — the transpose of `vertical`).
   * Pure mirror of `relayoutGroupChildren` in `@hilo/protocol/canvas` —
   * the snapshot bridge / commit / emit dance matches `groupNodes` and
   * `ungroup` above.
   *
   * Behaviour delta vs `resizeGroupNode`:
   *   - Children's relative `positions[mode]` are REWRITTEN according to
   *     the layout (not just translated to follow a frame shift).
   *   - The group's absolute on-screen position stays put — only the
   *     frame's width / height (`sizes[mode]` + legacy `size`) and
   *     `data.frameMode` (reset to `'auto'`) change.
   *   - Child intrinsic `size` is left alone — cards keep their aspect
   *     ratio; the grid cell is sized to the LARGEST child in the group
   *     so every card fits, smaller cards are centred inside their cell.
   *
   * Single undoable commit + `persist:flush`. Silently no-op when:
   *   - `groupId` doesn't resolve to a group node
   *   - The group has zero children
   *   - Positions / size already match the requested layout (idempotent
   *     re-clicks of the same dropdown entry don't pile up undo steps)
   */
  relayoutGroup(groupId, layout) {
    const graph = this.getGraph();
    const mode = this.getMode();
    const file = buildCanvasFileSnapshot(graph, mode);
    const result = relayoutGroupChildren(file, groupId, layout);
    if (!result.changed) return;
    const prevPosById = new Map();
    const prevSizeByGroup = new Map();
    for (const updated of result.updatedNodes) {
      const live = this.getIndexes().nodeById.get(updated.id);
      if (!live) continue;
      prevPosById.set(updated.id, {
        ...getNodePosition(live, mode),
      });
      if (live.type === CanvasNodeType.Group) {
        const liveSize = getNodeSize(live, mode);
        if (liveSize)
          prevSizeByGroup.set(updated.id, {
            ...liveSize,
          });
      }
    }
    this.history.commit((draft) => {
      applyChangesetToDraft(
        draft,
        {
          updatedNodes: result.updatedNodes,
        },
        mode,
      );
    });
    for (const updated of result.updatedNodes) {
      const newPos = updated.positions?.[mode];
      if (!newPos) continue;
      const prev = prevPosById.get(updated.id);
      if (updated.type === CanvasNodeType.Group) {
        const prevSize = prevSizeByGroup.get(updated.id);
        const newSize = updated.sizes?.[mode] ?? updated.size;
        if (
          newSize &&
          (!prevSize ||
            prevSize.width !== newSize.width ||
            prevSize.height !== newSize.height)
        ) {
          this.eventBus.emit({
            type: "node:resized",
            nodeId: updated.id,
            size: newSize,
          });
        }
        continue;
      }
      if (!prev || prev.x !== newPos.x || prev.y !== newPos.y) {
        this.eventBus.emit({
          type: "node:moved",
          nodeId: updated.id,
          position: newPos,
          prevPosition: prev ?? newPos,
        });
      }
    }
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  /**
   * Rearrange a group's children using the SAME dagre auto-layout engine the
   * canvas "Tidy" affordance uses for free nodes — instead of the protocol
   * `relayoutGroupChildren` grid / layered placement. The children are laid
   * out as an isolated sub-graph (only edges with BOTH endpoints inside the
   * group participate), then re-anchored relative to the group's padded
   * content origin. The group's absolute position stays put; only its frame
   * `sizes[mode]` / `size` + `data.frameMode` ('auto') change — mirrors the
   * `relayoutGroup` contract above.
   *
   * Why a runtime method (not a protocol strategy): the dagre engine
   * (`DagreLayout` / `@dagrejs/dagre` / async `computeAsync`) lives entirely in
   * `@hilo/canvas`. `@hilo/protocol` is a sync, renderer+gateway-shared SSOT
   * and `relayoutGroupChildren` is reused by the gateway — pulling dagre in
   * there is out of scope. We only borrow the lightweight `GROUP_NODE_PADDING`
   * constant for the frame math.
   *
   * `measuredSizes` (optional): real rendered child dimensions from ReactFlow,
   * same as `autoLayoutSubset`. When omitted (e.g. called from the group node
   * toolbar with no store access), dagre falls back to `sizeOf` node sizes.
   *
   * Single undoable commit + `persist:flush`. Silently no-op when the group is
   * missing / not a group / empty, or when the recomputed geometry already
   * matches (idempotent re-clicks don't pile up undo steps).
   */
  tidyMeasuredNodes(nodes, measuredSizes) {
    return nodes.map((node) => {
      const size = measuredSizes?.get(node.id);
      return size &&
        Number.isFinite(size.width) &&
        Number.isFinite(size.height) &&
        size.width > 0 &&
        size.height > 0
        ? {
            ...node,
            size,
            ...(node.type === CanvasNodeType.Group
              ? {
                  sizes: {
                    ...node.sizes,
                    [this.getMode()]: size,
                  },
                }
              : {}),
          }
        : node;
    });
  }
  async computeTidyPositions(nodes, edges, layout, sort = {}) {
    const snapshot = this.history.getState();
    const mode = this.getMode();
    const names = nodes.map((node) => tidyNodeName(node, sort));
    const ordered = orderTidyNodes(nodes, sort);
    const positions = await this.layout.computeAsync("dagre", ordered, edges, {
      mode,
      direction: "LR",
      clusterArrangement: layout,
    });
    if (
      this.history.getState() !== snapshot ||
      this.getMode() !== mode ||
      nodes.some((node, index) => tidyNodeName(node, sort) !== names[index]) ||
      positions.size !== nodes.length ||
      nodes.some((node) => {
        const position = positions.get(node.id);
        return (
          !position ||
          !Number.isFinite(position.x) ||
          !Number.isFinite(position.y)
        );
      })
    )
      return null;
    return positions;
  }
  tidyGroupIsLocked(group) {
    const byId = this.getIndexes().nodeById;
    const visited = new Set();
    let current = group;
    while (current && !visited.has(current.id)) {
      if (current.meta?.locked) return true;
      visited.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : void 0;
    }
    return false;
  }
  async relayoutGroupWithDagre(
    groupId,
    layout,
    includeDeps,
    measuredSizes,
    onCommit,
    sort = {},
  ) {
    const groupNode = this.getIndexes().nodeById.get(groupId);
    if (
      !groupNode ||
      groupNode.type !== CanvasNodeType.Group ||
      this.tidyGroupIsLocked(groupNode)
    ) {
      onCommit?.(null);
      return;
    }
    const mode = this.getMode();
    const graph = this.getGraph();
    const pinned = pinnedTidyNodeIds(graph.nodes);
    const children = this.tidyMeasuredNodes(
      graph.nodes.filter(
        (node) =>
          node.parentId === groupId && !node.meta?.hidden && !pinned.has(node.id),
      ),
      measuredSizes,
    );
    if (
      graph.nodes.some((node) => node.parentId === groupId && pinned.has(node.id))
    ) {
      return this.autoLayoutGroupChildrenSubset(
        groupId,
        children.map((node) => node.id),
        layout,
        measuredSizes,
        onCommit,
        {
          ...sort,
          includeDeps,
        },
      );
    }
    if (children.length === 0) {
      onCommit?.(null);
      return;
    }
    const childIds = new Set(children.map((node) => node.id));
    const innerEdges = includeDeps
      ? this.getGraph().edges.filter(
          (edge) =>
            childIds.has(edge.source) &&
            childIds.has(edge.target) &&
            edge.source !== edge.target,
        )
      : [];
    const positions = await this.computeTidyPositions(
      children,
      innerEdges,
      layout,
      sort,
    );
    if (!positions) {
      onCommit?.(null);
      return;
    }
    let contentW = 0;
    let contentH = 0;
    const relPos = new Map();
    for (const child of children) {
      const position = positions.get(child.id);
      if (!position) continue;
      const sz = sizeOf(child, mode);
      contentW = Math.max(contentW, position.x + sz.width);
      contentH = Math.max(contentH, position.y + sz.height);
      relPos.set(child.id, {
        x: GROUP_NODE_PADDING.x + position.x,
        y: GROUP_NODE_PADDING.top + position.y,
      });
    }
    const newGroupSize = {
      width: contentW + GROUP_NODE_PADDING.x * 2,
      height: contentH + GROUP_NODE_PADDING.top + GROUP_NODE_PADDING.bottom,
    };
    const prevGroupSize = getNodeSize(groupNode, mode);
    const prevFrameMode = groupNode.data?.frameMode;
    let anyChanged =
      !prevGroupSize ||
      prevGroupSize.width !== newGroupSize.width ||
      prevGroupSize.height !== newGroupSize.height ||
      prevFrameMode === "manual";
    if (!anyChanged) {
      for (const child of children) {
        const want = relPos.get(child.id);
        const cur = getNodePosition(child, mode);
        if (!want || cur.x !== want.x || cur.y !== want.y) {
          anyChanged = true;
          break;
        }
      }
    }
    if (!anyChanged) {
      onCommit?.(null, true);
      return;
    }
    const prevPosById = new Map();
    for (const child of children) {
      prevPosById.set(child.id, {
        ...getNodePosition(child, mode),
      });
    }
    const checkpoint = this.history.commit((draft) => {
      for (const node of draft.nodes) {
        if (node.id === groupId) {
          const existingData = node.data ?? {};
          node.data = {
            ...existingData,
            frameMode: "auto",
          };
          node.sizes = {
            ...(node.sizes ?? {}),
            [mode]: newGroupSize,
          };
          node.size = newGroupSize;
          continue;
        }
        const next = relPos.get(node.id);
        if (next) setNodePosition(node, mode, next);
      }
    });
    onCommit?.(checkpoint, true);
    if (
      !prevGroupSize ||
      prevGroupSize.width !== newGroupSize.width ||
      prevGroupSize.height !== newGroupSize.height
    ) {
      this.eventBus.emit({
        type: "node:resized",
        nodeId: groupId,
        size: newGroupSize,
      });
    }
    for (const child of children) {
      const newPos = relPos.get(child.id);
      if (!newPos) continue;
      const prev = prevPosById.get(child.id);
      if (!prev || prev.x !== newPos.x || prev.y !== newPos.y) {
        this.eventBus.emit({
          type: "node:moved",
          nodeId: child.id,
          position: newPos,
          prevPosition: prev ?? newPos,
        });
      }
    }
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  /**
   * Tidy a SUBSET of a group's children in place — the counterpart to
   * `autoLayoutSubset` (free top-level nodes) for the case where the user
   * shift-selects several children that all live inside the SAME group and
   * clicks a layout entry.
   *
   * Contract:
   *   - Only the passed `childIds` participate in the dagre sub-graph; the
   *     group's other children keep their positions in the layout step —
   *     mirrors how `autoLayoutSubset` leaves non-selected top-level nodes
   *     alone.
   *   - Positions are child-relative (same coordinate space children already
   *     use), so the result is re-anchored to the subset's current bounding
   *     box top-left — the cluster's upper-left origin stays fixed, no drift.
   *   - After the subset lands, the group frame RE-HUGS all children: tight
   *     fit to the full-children bbox + `GROUP_NODE_PADDING`, `frameMode`
   *     reset to `'auto'` — same semantics as `relayoutGroupWithDagre` (tidy
   *     is an explicit layout action, the user expects a snug frame). When
   *     the bbox origin shifts, children slide to the padded origin and the
   *     group frame moves by the inverse so every child's ABSOLUTE position
   *     (subset at its new spot, siblings untouched) stays put on screen.
   *   - Edges with BOTH endpoints inside the subset participate (self-loops
   *     dropped); everything else is ignored.
   *
   * Silently no-ops when the group is missing / not a group, fewer than 2 of
   * the ids resolve to live children of that group, or the recomputed
   * geometry already matches (idempotent re-clicks don't pile up undo steps).
   */
  async autoLayoutGroupChildrenSubset(
    groupId,
    childIds,
    layout,
    measuredSizes,
    onCommit,
    sort = {},
  ) {
    const groupNode = this.getIndexes().nodeById.get(groupId);
    if (
      !groupNode ||
      groupNode.type !== CanvasNodeType.Group ||
      this.tidyGroupIsLocked(groupNode)
    ) {
      onCommit?.(null);
      return;
    }
    const mode = this.getMode();
    const wanted = new Set(childIds);
    const pinned = pinnedTidyNodeIds(this.getGraph().nodes);
    const children = this.tidyMeasuredNodes(
      this.getGraph().nodes.filter(
        (node) =>
          node.parentId === groupId &&
          wanted.has(node.id) &&
          !node.meta?.hidden &&
          !pinned.has(node.id),
      ),
      measuredSizes,
    );
    if (children.length < 2) {
      onCommit?.(null);
      return;
    }
    const childIdSet = new Set(children.map((node) => node.id));
    const innerEdges = sort.includeDeps
      ? this.getGraph().edges.filter(
          (edge) =>
            childIdSet.has(edge.source) &&
            childIdSet.has(edge.target) &&
            edge.source !== edge.target,
        )
      : [];
    const computed = await this.computeTidyPositions(
      children,
      innerEdges,
      layout,
      sort,
    );
    if (!computed) {
      onCommit?.(null);
      return;
    }
    let curMinX = Number.POSITIVE_INFINITY;
    let curMinY = Number.POSITIVE_INFINITY;
    for (const child of children) {
      const position = getNodePosition(child, mode);
      if (position.x < curMinX) curMinX = position.x;
      if (position.y < curMinY) curMinY = position.y;
    }
    let newMinX = Number.POSITIVE_INFINITY;
    let newMinY = Number.POSITIVE_INFINITY;
    for (const pos of computed.values()) {
      if (pos.x < newMinX) newMinX = pos.x;
      if (pos.y < newMinY) newMinY = pos.y;
    }
    const dx =
      Number.isFinite(curMinX) && Number.isFinite(newMinX)
        ? curMinX - newMinX
        : 0;
    const dy =
      Number.isFinite(curMinY) && Number.isFinite(newMinY)
        ? curMinY - newMinY
        : 0;
    const nextPos = new Map();
    for (const [id, pos] of computed) {
      nextPos.set(id, {
        x: pos.x + dx,
        y: pos.y + dy,
      });
    }
    const allChildren = this.tidyMeasuredNodes(
      this.getGraph().nodes.filter(
        (node) => node.parentId === groupId && !node.meta?.hidden,
      ),
      measuredSizes,
    );
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const child of allChildren) {
      const position = nextPos.get(child.id) ?? getNodePosition(child, mode);
      const sz = sizeOf(child, mode);
      if (position.x < minX) minX = position.x;
      if (position.y < minY) minY = position.y;
      if (position.x + sz.width > maxX) maxX = position.x + sz.width;
      if (position.y + sz.height > maxY) maxY = position.y + sz.height;
    }
    const newGroupSize = {
      width: maxX - minX + GROUP_NODE_PADDING.x * 2,
      height: maxY - minY + GROUP_NODE_PADDING.top + GROUP_NODE_PADDING.bottom,
    };
    const shiftX = GROUP_NODE_PADDING.x - minX;
    const shiftY = GROUP_NODE_PADDING.top - minY;
    const finalPos = new Map();
    for (const child of allChildren) {
      const position = nextPos.get(child.id) ?? getNodePosition(child, mode);
      finalPos.set(child.id, {
        x: position.x + shiftX,
        y: position.y + shiftY,
      });
    }
    const prevGroupPos = getNodePosition(groupNode, mode);
    const newGroupPos = {
      x: prevGroupPos.x - shiftX,
      y: prevGroupPos.y - shiftY,
    };
    const prevGroupSize = getNodeSize(groupNode, mode);
    const prevFrameMode = groupNode.data?.frameMode;
    let anyChanged =
      !prevGroupSize ||
      prevGroupSize.width !== newGroupSize.width ||
      prevGroupSize.height !== newGroupSize.height ||
      newGroupPos.x !== prevGroupPos.x ||
      newGroupPos.y !== prevGroupPos.y ||
      prevFrameMode === "manual";
    if (!anyChanged) {
      for (const child of allChildren) {
        const want = finalPos.get(child.id);
        const cur = getNodePosition(child, mode);
        if (!want || cur.x !== want.x || cur.y !== want.y) {
          anyChanged = true;
          break;
        }
      }
    }
    if (!anyChanged) {
      onCommit?.(null, true);
      return;
    }
    const prevPosById = new Map();
    for (const child of allChildren) {
      prevPosById.set(child.id, {
        ...getNodePosition(child, mode),
      });
    }
    const checkpoint = this.history.commit((draft) => {
      for (const node of draft.nodes) {
        if (node.id === groupId) {
          const existingData = node.data ?? {};
          node.data = {
            ...existingData,
            frameMode: "auto",
          };
          node.sizes = {
            ...(node.sizes ?? {}),
            [mode]: newGroupSize,
          };
          node.size = newGroupSize;
          setNodePosition(node, mode, newGroupPos);
          continue;
        }
        const next = finalPos.get(node.id);
        if (next) setNodePosition(node, mode, next);
      }
    });
    onCommit?.(checkpoint, true);
    if (
      !prevGroupSize ||
      prevGroupSize.width !== newGroupSize.width ||
      prevGroupSize.height !== newGroupSize.height
    ) {
      this.eventBus.emit({
        type: "node:resized",
        nodeId: groupId,
        size: newGroupSize,
      });
    }
    if (newGroupPos.x !== prevGroupPos.x || newGroupPos.y !== prevGroupPos.y) {
      this.eventBus.emit({
        type: "node:moved",
        nodeId: groupId,
        position: newGroupPos,
        prevPosition: prevGroupPos,
      });
    }
    for (const child of allChildren) {
      const newPosition = finalPos.get(child.id);
      if (!newPosition) continue;
      const prev = prevPosById.get(child.id);
      if (!prev || prev.x !== newPosition.x || prev.y !== newPosition.y) {
        this.eventBus.emit({
          type: "node:moved",
          nodeId: child.id,
          position: newPosition,
          prevPosition: prev ?? newPosition,
        });
      }
    }
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  /**
   * Set or clear a node's `parentId`. Pass `undefined` to detach the node from
   * its current parent (its position is left unchanged — caller is responsible
   * for translating relative→absolute if the visible spot must be preserved).
   *
   * Used by `applyIncremental` (gateway-driven canvas_updated broadcast) so
   * server-side group / ungroup operations can propagate the parentId change
   * onto an already-mounted node without going through `removeNode + addNode`
   * (which would lose React identity on the child component).
   *
   * No-op when the node doesn't exist or its parentId is already at the
   * requested value.
   */
  setNodeParentId(nodeId, parentId) {
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return;
    if (node.parentId === parentId) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === nodeId);
      if (!target) return;
      if (parentId === void 0) {
        delete target.parentId;
      } else {
        target.parentId = parentId;
      }
    });
    this.notifyGraph();
  }
  /**
   * Apply a batch of server-driven node updates in a single non-undoable
   * commit. Each entry can carry any subset of `data` / `size` / `sizes` /
   * `parentId` / `position` — only fields that materially differ from the
   * live node are applied; entries that hit nothing are silently dropped.
   *
   * UNDO INTERACTION: uses `history.setState` (per the canvas package's
   * "external WS sync uses setState" rule). Server-
   * driven changes — gateway-side group/ungroup, MCP tool effects — are not
   * the user's local edits, so polluting the undo stack with them would
   * make Cmd-Z behaviour confusing (one MCP `canvas_group_nodes` would
   * require dozens of Cmd-Z to fully revert).
   *
   * BATCH SEMANTICS: a single `setState` + single `notifyGraph` even when
   * many fields on many nodes change. Without batching, the previous shape
   * (per-field `instance.updateNodeData → resizeNode → setNodeParentId →
   * moveNode` per updatedNode in `applyIncremental`) caused 4×N independent
   * commits per broadcast — each with its own React render and intermediate
   * frame where parentId had been switched but the relative position not
   * yet rewritten, briefly painting children at `(groupAbs + childAbs)`
   * (double offset).
   *
   * Events: `node:data-changed` / `node:resized` are still emitted per
   * mutation so subscribers (e.g. asset-metadata mirroring) keep working.
   * `node:moved` is intentionally NOT emitted — server-driven moves should
   * not trigger renderer-side persist hooks (the gateway already wrote
   * canvas.json and the broadcast IS the authoritative state).
   */
  applyServerNodeUpdate(updates, _mode) {
    if (updates.length === 0) return;
    const live = this.getIndexes().nodeById;
    const pending = [];
    for (const update of updates) {
      const node = live.get(update.id);
      if (!node) continue;
      const entry = {
        id: update.id,
        hasData: false,
        hasParentId: false,
      };
      let dirty = false;
      if (update.type && update.type !== node.type) {
        entry.type = update.type;
        dirty = true;
      }
      const incomingAssetId = validIncomingAssetId(update.assetId);
      if (incomingAssetId) {
        if (incomingAssetId !== node.assetId) {
          entry.hasAssetId = true;
          entry.assetId = incomingAssetId;
          dirty = true;
        }
      } else if (shouldClearAssetIdForServerNode(update) && node.assetId) {
        entry.hasAssetId = true;
        entry.assetId = null;
        dirty = true;
      }
      const placeholderFill =
        Boolean(incomingAssetId) &&
        incomingAssetId === node.assetId &&
        node.meta?.cloneOf == null &&
        node.data?.cloneOf == null;
      const incomingData =
        placeholderFill && update.data && typeof update.data === "object"
          ? (() => {
              const next = {
                ...update.data,
              };
              delete next.cloneOf;
              if (typeof next.assetId !== "string" && incomingAssetId) {
                next.assetId = incomingAssetId;
              }
              return next;
            })()
          : update.data;
      if (Object.hasOwn(update, "data")) {
        if (!isSamePersistedData(node.data, incomingData)) {
          entry.hasData = true;
          entry.data = incomingData;
          dirty = true;
        }
      }
      if (
        update.size &&
        (update.size.width !== node.size?.width ||
          update.size.height !== node.size?.height)
      ) {
        entry.size = update.size;
        dirty = true;
      }
      if (update.sizes) {
        entry.sizes = update.sizes;
        dirty = true;
      }
      if (update.meta) {
        const incomingMeta =
          placeholderFill && update.meta.cloneOf != null
            ? (() => {
                const { cloneOf: _cloneOf, ...rest } = update.meta;
                return rest;
              })()
            : update.meta;
        if (!isSamePersistedData(node.meta, incomingMeta)) {
          entry.meta = incomingMeta;
          entry.replaceMeta = update.replaceMeta;
          dirty = true;
        }
      }
      if (update.hasParentId) {
        if (node.parentId !== update.parentId) {
          entry.hasParentId = true;
          entry.parentId = update.parentId;
          dirty = true;
        }
      }
      if (update.groupId !== void 0) {
        const cur = node.groupId;
        if (update.groupId === null) {
          if (cur) {
            entry.hasGroupId = true;
            entry.groupId = null;
            dirty = true;
          }
        } else if (cur !== update.groupId) {
          entry.hasGroupId = true;
          entry.groupId = update.groupId;
          dirty = true;
        }
      }
      if (update.round !== void 0) {
        const curRound = node.round;
        if (update.round === null) {
          if (curRound != null) {
            entry.hasRound = true;
            entry.round = null;
            dirty = true;
          }
        } else if (curRound !== update.round) {
          entry.hasRound = true;
          entry.round = update.round;
          dirty = true;
        }
      }
      if (update.position) {
        const cur = getNodePosition(node, this.getMode());
        if (update.position.x !== cur.x || update.position.y !== cur.y) {
          entry.position = update.position;
          dirty = true;
        }
      }
      if (dirty) pending.push(entry);
    }
    if (pending.length === 0) return;
    const needsReconcile = pending.some(
      (pendingUpdate) =>
        pendingUpdate.hasParentId || (pendingUpdate.position && live.get(pendingUpdate.id)?.parentId !== void 0),
    );
    const fitResizedGroups = [];
    this.history.serverSetState((draft) => {
      const mode = this.getMode();
      const draftById = new Map(draft.nodes.map((node) => [node.id, node]));
      for (const entry of pending) {
        const target = draftById.get(entry.id);
        if (!target) continue;
        if (entry.type) target.type = entry.type;
        if (entry.hasAssetId) {
          if (entry.assetId === null) {
            delete target.assetId;
          } else {
            target.assetId = entry.assetId;
          }
        }
        if (entry.hasData) target.data = entry.data;
        if (entry.size) target.size = entry.size;
        if (entry.sizes)
          target.sizes = {
            ...(target.sizes ?? {}),
            ...entry.sizes,
          };
        if (entry.meta) {
          if (entry.replaceMeta) {
            if (Object.keys(entry.meta).length === 0) delete target.meta;
            else
              target.meta = {
                ...entry.meta,
              };
          } else {
            target.meta = {
              ...(target.meta ?? {}),
              ...entry.meta,
            };
          }
        }
        if (entry.hasParentId) {
          if (entry.parentId === void 0) {
            delete target.parentId;
          } else {
            target.parentId = entry.parentId;
          }
        }
        if (entry.hasGroupId) {
          if (entry.groupId === null) {
            delete target.groupId;
          } else {
            target.groupId = entry.groupId;
          }
        }
        if (entry.hasRound) {
          if (entry.round === null) {
            delete target.round;
          } else {
            target.round = entry.round;
          }
        }
        if (entry.position) setNodePosition(target, mode, entry.position);
      }
      if (!needsReconcile) return;
      const fileSnapshot = buildCanvasFileSnapshot(draft, mode);
      const reconciled = reconcileGroupGeometryForMode(fileSnapshot, mode);
      if (!reconciled.changed) return;
      const reconciledById = new Map(
        reconciled.updatedNodes.map((node) => [node.id, node]),
      );
      for (const node of draft.nodes) {
        const updated = reconciledById.get(node.id);
        if (!updated) continue;
        const newPos = updated.positions?.[mode];
        if (newPos) setNodePosition(node, mode, newPos);
        if (node.type === CanvasNodeType.Group) {
          const newSize = updated.sizes?.[mode];
          if (newSize) {
            node.size = {
              width: newSize.width,
              height: newSize.height,
            };
            node.sizes = {
              ...(node.sizes ?? {}),
              [mode]: newSize,
            };
            fitResizedGroups.push({
              id: node.id,
              size: newSize,
            });
          }
        }
      }
    });
    rebaseRetainedHistoryNodes(
      this.history,
      pending,
      live,
      this.getGraph().nodes,
    );
    for (const group of fitResizedGroups) {
      this.eventBus.emit({
        type: "node:resized",
        nodeId: group.id,
        size: group.size,
      });
    }
    for (const entry of pending) {
      if (entry.hasData) {
        this.eventBus.emit({
          type: "node:data-changed",
          nodeId: entry.id,
          data: entry.data,
        });
      }
      if (entry.size) {
        this.eventBus.emit({
          type: "node:resized",
          nodeId: entry.id,
          size: entry.size,
        });
      }
    }
    this.notifyGraph();
  }
  updateNodeData(nodeId, data) {
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return;
    if (isSamePersistedData(node.data, data)) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === nodeId);
      if (target) target.data = data;
    });
    this.eventBus.emit({
      type: "node:data-changed",
      nodeId,
      data,
    });
    this.notifyGraph();
  }
  /** Apply one undoable metadata patch to a set of canvas objects. */
  updateNodesMeta(nodeIds, patch) {
    if (nodeIds.length === 0) return;
    const ids = new Set(nodeIds);
    this.history.commit((draft) => {
      for (const target of draft.nodes) {
        if (!ids.has(target.id)) continue;
        target.meta = {
          ...(target.meta ?? {}),
          ...patch,
        };
      }
    });
    this.notifyGraph();
  }
  /**
   * Shallow-merge sibling. `updateNodeData` REPLACES `data` wholesale; this
   * variant takes a partial `patch`, reads the current persisted `data` from
   * the instance (NOT React props — those carry renderer-injected ephemera
   * like `__derivedChildCount` / `__derivedCollapsed` from
   * `injectDerivedChildCounts`), strips those renderer-only keys, then
   * applies the patch on top. `patch[k] === undefined` deletes that key
   * from the merged result so callers can clear a field without writing
   * a sentinel.
   *
   * Use case: nodes whose `data` is a bag of independent persisted fields
   * (e.g. group's `{ label, backgroundColor, frameMode }`) where each UI
   * surface mutates one field at a time. With raw `updateNodeData` the
   * caller would have to read the current data, spread it, set its field,
   * and remember to scrub the `__derived*` mirrors — duplicated and
   * bug-prone.
   */
  mergeNodeData(nodeId, patch) {
    const next = this.computeMergedNodeData(nodeId, patch);
    if (!next) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === nodeId);
      if (target) target.data = next;
    });
    this.eventBus.emit({
      type: "node:data-changed",
      nodeId,
      data: next,
    });
    this.notifyGraph();
  }
  /**
   * SILENT sibling of `mergeNodeData`: same shallow-merge-onto-latest-instance-
   * data semantics, but the write goes through `updateNodeDataSilent` so it
   * never becomes its own undo step.
   *
   * Use for RENDER-ONLY persisted fields that the user never thinks of as an
   * edit — e.g. the empty media node's `data.aspectRatio`, which only decides
   * how tall the placeholder card paints. Writing it through `updateNodeData`
   * cost the user an extra, visually dead Cmd-Z press right before the undo
   * that actually removes the node.
   *
   * Merge (not replace) is mandatory here: callers historically spread a STALE
   * React `data` prop, which silently dropped sibling fields written moments
   * earlier by another surface (`data.popoverDraft` from the popover's
   * pre-submit draft save was lost exactly this way).
   */
  mergeNodeDataSilent(nodeId, patch) {
    const next = this.computeMergedNodeData(nodeId, patch);
    if (!next) return;
    this.updateNodeDataSilent(nodeId, next);
  }
  /**
   * Shared merge math for `mergeNodeData` / `mergeNodeDataSilent`.
   * Returns `undefined` when the node is gone or the merge is a no-op, so
   * callers can bail before touching history.
   */
  computeMergedNodeData(nodeId, patch) {
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return void 0;
    const prev = node.data ?? {};
    let next = {};
    for (const key of Object.keys(prev)) {
      if (key === "__derivedChildCount" || key === "__derivedCollapsed") continue;
      next[key] = prev[key];
    }
    for (const key of Object.keys(patch)) {
      const value = patch[key];
      if (value === void 0) delete next[key];
      else next[key] = value;
    }
    const workflowIdentityChanged =
      (Object.hasOwn(patch, "sourceTemplateId") &&
        next.sourceTemplateId !== prev.sourceTemplateId) ||
      (Object.hasOwn(patch, "currentWorkflowId") &&
        next.currentWorkflowId !== prev.currentWorkflowId);
    if (workflowIdentityChanged) {
      const [numberedNode] = assignComfyUiTemplateCopyOrdinals(
        this.getGraph().nodes.filter((candidate) => candidate.id !== nodeId),
        [
          {
            ...node,
            data: next,
          },
        ],
      );
      if (numberedNode?.data && typeof numberedNode.data === "object") {
        next = numberedNode.data;
      }
    }
    return isSamePersistedData(prev, next) ? void 0 : next;
  }
  /**
   * Update a node's data WITHOUT creating its own undo step, then immediately
   * flush persistence so the change reaches canvas.json.
   *
   * Used for transient/auxiliary state that the user expects to survive
   * navigation but shouldn't pollute Cmd-Z. Today the only consumer is the
   * popover-draft persistence (see `POPOVER_DRAFT_DATA_KEY`): the node's
   * `data.popoverDraft` is overwritten on popover close to remember
   * half-finished prompts/params/refs, but Undo should still revert the
   * user's REAL canvas mutations (move, delete, edit), not the draft.
   *
   * UNDO INTERACTION: this method calls `history.setState` (no `archive()`),
   * so it does NOT create an independent undo entry. travels' `autoArchive:
   * false` means the silent change sits as pending working state until the
   * NEXT `commit()` runs `archive()` — at which point the silent change is
   * captured as part of that commit's diff and Cmd-Z will revert it too.
   * In practice this is fine: re-opening the popover after Undo restores the
   * draft as it was at the moment of the Undo, which is what users expect.
   *
   * `persist:flush` is emitted here (not delegated to the caller) so the
   * silent-write contract stays atomic — silent writes always require a flush
   * to outlive the in-memory state, and forgetting to emit would silently
   * lose user input.
   */
  updateNodeDataSilent(nodeId, data) {
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return;
    if (isSamePersistedData(node.data, data)) return;
    this.history.setState((draft) => {
      const target = draft.nodes.find((node) => node.id === nodeId);
      if (target) target.data = data;
    });
    this.eventBus.emit({
      type: "node:data-silent-changed",
      nodeId,
      data,
    });
    this.eventBus.emit({
      type: "persist:flush",
    });
  }
  /**
   * Adopt Gateway-canonical node ids without creating an undo checkpoint.
   *
   * A vault asset can become visible before its first canvas.json entry is
   * durable. During that short window the renderer uses the asset id as a
   * temporary node id; generation preflight may then materialize the same
   * asset in the Gateway with its real, decoupled UUID. Applying the explicit
   * old→new mapping in one server state write prevents the two identities from
   * coexisting and keeps every incident edge, selection and staged fill bound
   * to the canonical node.
   *
   * No persist event is emitted: the Gateway has already written the canonical
   * graph, and echoing a full renderer snapshot would reopen the stale-writer
   * race this method is designed to close.
   */
  replaceServerNodeIds(replacements) {
    if (replacements.length === 0) return;
    const liveIds = new Set(this.getGraph().nodes.map((node) => node.id));
    const accepted = [];
    const claimedNewNodeIds = new Set();
    for (const replacement of replacements) {
      const { oldNodeId, newNodeId } = replacement;
      if (!oldNodeId || !newNodeId || oldNodeId === newNodeId) continue;
      if (!liveIds.has(oldNodeId) || claimedNewNodeIds.has(newNodeId)) continue;
      accepted.push(replacement);
      claimedNewNodeIds.add(newNodeId);
      liveIds.delete(oldNodeId);
      liveIds.add(newNodeId);
    }
    if (accepted.length === 0) return;
    const replacementByOldId = new Map(
      accepted.map(({ oldNodeId, newNodeId }) => [oldNodeId, newNodeId]),
    );
    this.history.rebase((draft) => {
      const ids = new Set(draft.nodes.map((node) => node.id));
      draft.nodes = draft.nodes.filter((node) => {
        const replacement = replacementByOldId.get(node.id);
        if (!replacement) return true;
        if (ids.has(replacement)) return false;
        ids.delete(node.id);
        ids.add(replacement);
        node.id = replacement;
        return true;
      });
      const seenEdgeIds = new Set();
      const nextEdges = [];
      for (const edge of draft.edges) {
        const source = replacementByOldId.get(edge.source) ?? edge.source;
        const target = replacementByOldId.get(edge.target) ?? edge.target;
        if (source === target) continue;
        if (source !== edge.source) edge.source = source;
        if (target !== edge.target) edge.target = target;
        edge.id = deriveEdgeId(source, target);
        if (seenEdgeIds.has(edge.id)) continue;
        seenEdgeIds.add(edge.id);
        nextEdges.push(edge);
      }
      draft.edges = nextEdges;
    });
    const selected = this.selection.getSelected();
    if (selected.some((id) => replacementByOldId.has(id))) {
      this.selection.set([
        ...new Set(selected.map((id) => replacementByOldId.get(id) ?? id)),
      ]);
    }
    for (const { oldNodeId, newNodeId } of accepted) {
      this.serverNodeIdAliases.set(oldNodeId, newNodeId);
      this.remapPendingFill(oldNodeId, newNodeId);
    }
    this.notifyGraph();
  }
  /** Resolve a temporary node id retained by an async UI callback after Gateway takeover. */
  resolveCurrentNodeId(nodeId) {
    let current = nodeId;
    const visited = new Set();
    while (!visited.has(current)) {
      visited.add(current);
      const next = this.serverNodeIdAliases.get(current);
      if (!next) break;
      current = next;
    }
    return current;
  }
  /**
   * Replace a node's id in-place, rewriting any incident edges to point at
   * the new id. Single undoable commit. Selection follows.
   */
  replaceNodeId(oldId, newId) {
    if (oldId === newId) return;
    const { nodeById } = this.getIndexes();
    if (!nodeById.has(oldId)) return;
    if (nodeById.has(newId)) {
      throw new Error(`Cannot replace node id: ${newId} already exists`);
    }
    this.history.commit((draft) => {
      const node = draft.nodes.find((node) => node.id === oldId);
      if (!node) return;
      node.id = newId;
      for (const edge of draft.edges) {
        const touched = edge.source === oldId || edge.target === oldId;
        if (edge.source === oldId) edge.source = newId;
        if (edge.target === oldId) edge.target = newId;
        if (touched) edge.id = deriveEdgeId(edge.source, edge.target);
      }
    });
    if (this.selection.getSelected().includes(oldId)) {
      const next = this.selection
        .getSelected()
        .map((id) => (id === oldId ? newId : id));
      this.selection.set(next);
    }
    this.remapPendingFill(oldId, newId);
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  /**
   * Promote a CLONE node into the PRIMARY node of a freshly-forked asset,
   * in place (id unchanged), as a single undoable commit.
   *
   * Used by the rename-a-clone flow: a pasted media clone shares its origin's
   * asset blob, so renaming it must first fork a new AssetRecord, then this
   * node has to stop tracking the origin's asset and start tracking the fork.
   * Node ids are decoupled UUIDs now (asset identity lives in `data.assetId`),
   * so the swap is purely a data/meta rewrite — NEVER an id change:
   *   - `data.assetId` → the fork's asset id (image nodes also get their
   *     single-slot `imageIds` rewritten so `deriveImages` resolves the fork)
   *   - `data.name` / `data.path` → the fork's name / path
   *   - `data.cloneOf` (render-layer mirror) removed
   *   - `meta.cloneOf` (origin/clone discriminator) removed — otherwise the
   *     clone-data fan-out in `use-canvas-data` keeps overwriting this node
   *     with the ORIGIN asset's pushes.
   *
   * No-op when the node is missing.
   */
  promoteCloneToPrimary(nodeId, forked) {
    const node = this.getIndexes().nodeById.get(nodeId);
    if (!node) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((node) => node.id === nodeId);
      if (!target) return;
      const prevData = target.data ?? {};
      const nextData = {
        ...prevData,
      };
      nextData.assetId = forked.assetId;
      nextData.name = forked.name;
      nextData.path = forked.path;
      if (Array.isArray(prevData.imageIds) && prevData.imageIds.length === 1) {
        nextData.imageIds = [forked.assetId];
      }
      delete nextData.cloneOf;
      target.data = nextData;
      if (target.meta?.cloneOf != null) {
        const { cloneOf: _drop, ...restMeta } = target.meta;
        target.meta = Object.keys(restMeta).length > 0 ? restMeta : void 0;
      }
    });
    this.eventBus.emit({
      type: "node:data-changed",
      nodeId,
      data: node.data,
    });
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
    this.pendingPromotions.set(nodeId, {
      ...forked,
    });
  }
  /**
   * Fill an empty placeholder node with a real asset: clear `isEmpty`, write
   * type/assetId/data/size. Node id is stable across the fill — no edge or
   * selection remap needed (the legacy `fillEmptyPlaceholder` API that changed
   * id is gone; `node.isEmpty` is now the SSOT for empty state).
   *
   * Used by the "upload into empty placeholder" flow so the swap is purely
   * client-side — no dependency on the backend's in-place fill path.
   *
   * UNDO INTERACTION: always a standalone undoable commit — dropping an asset
   * onto an empty placeholder IS a user edit. The legacy `mutation:
   * 'setState'` variant (WS completion broadcast) is gone: server-driven
   * fills now go through `stagePlaceholderFill`, which never touches the
   * undo stack at all (see `pendingFills`).
   *
   * The assetId mirroring into `data.assetId` (see `applyFillToNode`) exists
   * because the converter only forwards `node.data` to the React component,
   * and the image-node view builder resolves a node's asset URL from
   * `data.assetId` (falling back to `parseNodeId(nodeId)`, which equals the
   * nodeId for a plain UUID and thus misses the store). Matches the reload
   * path's `mirrorImageFieldsIntoData(saved)`.
   */
  markPlaceholderFilled(nodeId, payload) {
    const { nodeById } = this.getIndexes();
    if (!nodeById.has(nodeId)) return;
    this.history.commit((draft) => {
      const node = draft.nodes.find((node) => node.id === nodeId);
      if (!node) return;
      applyFillToNode(node, payload);
    });
    this.locallyFilledPlaceholderIds.add(nodeId);
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  /**
   * Stage an async (server-driven) placeholder fill WITHOUT touching the
   * undo stack — Plan A entry point, used by the WS completion broadcast of
   * a generating placeholder instead of `markPlaceholderFilled(…, 'setState')`.
   *
   * The fill lands in `pendingFills` and becomes visible immediately through
   * the `getGraph()` overlay; it is baked into the truth state lazily by the
   * next state write (see `bakePendingFillsIntoDraft`). Result: Cmd-Z after
   * a completed generation undoes the user's most recent edit (e.g. a node
   * move) while the generated image stays put. Undoing past the generation
   * boundary drops the fill from view (the node returns to the empty card /
   * disappears, depending on who created it); redo restores both — see
   * `StagedFill.requirePendingHost`.
   *
   * No-op when the node doesn't exist in the truth state (e.g. the user
   * deleted the placeholder mid-generation — matches markPlaceholderFilled's
   * missing-node contract).
   */
  stagePlaceholderFill(nodeId, payload) {
    const host = this.getIndexes().nodeById.get(nodeId);
    if (!host) return;
    this.setPendingFill(nodeId, {
      payload,
      // Bind the fill to the generation it belongs to whenever we can see that
      // generation in the truth state.
      requirePendingHost: isPendingFillHost(host),
    });
    this.eventBus.emit({
      type: "node:data-changed",
      nodeId,
      data: payload.data,
    });
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  /**
   * `HistoryManager.beforeWrite` hook: bake every still-applicable staged
   * fill into the draft at the start of ANY state write (commit or setState).
   *
   * Why bake at all (instead of overlay-only): a user updater like
   * `updateNodeData` REPLACES `node.data` wholesale. If the truth node were
   * still the bare placeholder, the updater's input (read from getGraph(),
   * i.e. the composed view) and the truth state would disagree, and worse —
   * after the updater ran, the overlay would re-apply the stale fill on top
   * of the user's fresh data. Baking first makes truth == composed before
   * the user's change applies, so the user's write always wins.
   *
   * Why it's safe for undo: the bake rides INSIDE the next write. If that
   * write is a user commit, undoing it also reverts the bake — but then the
   * truth node has no assetId again, `fillStillApplies` turns true, and the
   * overlay re-applies the fill seamlessly. The map entry is kept (not
   * deleted on bake) precisely to cover that re-application.
   *
   * Idempotent by construction: once baked, `fillStillApplies` is false on
   * the next write. MUST NOT call getGraph() here (runs inside a draft).
   */
  bakePendingFillsIntoDraft(draft) {
    if (this.pendingFills.size === 0) return;
    for (const [nodeId, fill] of this.pendingFills) {
      const node = findFillTarget(draft.nodes, nodeId, fill);
      if (!node) continue;
      applyFillToNode(node, fill.payload);
    }
  }
  // ---- Clipboard ----
  /**
   * Copy selected nodes and their internal edges to clipboard.
   *
   * Group expansion: when a group node is in the selection, its children are
   * implicitly added to the copy — the user-visible mental model is "copy
   * this group" not "copy this empty wrapper". Without this, paste would
   * produce an empty group plus orphaned originals (children whose
   * `parentId` still points at the source group on the canvas).
   *
   * Orphan-child normalisation: a child whose parent group is NOT in the
   * copy set has its `position` converted from group-relative back to
   * absolute, and its `parentId` cleared. This guarantees the invariant
   * that every node carrying `parentId` in the clipboard has its parent
   * also present, which `remapClipboard` relies on to rewire the new
   * group/child ids without leaving dangling references.
   *
   * `sourceContext.workspace` is recorded on the clipboard so a later
   * cross-workspace paste can resolve the source files (clipboard nodes
   * carry workspace-relative `data.path` only).
   */
  copySelected(sourceContext) {
    const selectedIds = this.selection.getSelected();
    if (selectedIds.length === 0) return;
    const graph = this.getGraph();
    const mode = this.getMode();
    const idSet = expandSelectionWithGroupChildren(graph.nodes, selectedIds);
    const nodes = graph.nodes
      .filter((node) => idSet.has(node.id) && !isTransientPlaceholder(node))
      .map((node) =>
        normalizeOrphanChildForClipboard(node, graph.nodes, idSet, mode),
      );
    const edges = graph.edges.filter(
      (edge) => idSet.has(edge.source) && idSet.has(edge.target),
    );
    const incoming = graph.edges.filter(
      (edge) => idSet.has(edge.target) && !idSet.has(edge.source),
    );
    const inheritedSourceEdges = incoming.length > 0 ? incoming : void 0;
    const assetPaths = collectClipboardAssetPaths(
      nodes,
      sourceContext?.resolveAssetPath,
    );
    setClipboard({
      nodes,
      edges,
      sourceWorkspace: sourceContext?.workspace,
      ...(inheritedSourceEdges
        ? {
            inheritedSourceEdges,
          }
        : {}),
      ...(assetPaths
        ? {
            assetPaths,
          }
        : {}),
    });
  }
  /**
   * Paste nodes from clipboard with a fixed offset (`PASTE_OFFSET` on both axes per paste).
   *
   * remapClipboard 内部按 PASTE_OFFSET * pasteCounter 偏移顶层节点坐标，
   * 子节点保持 parent-relative 不变。
   *
   * 落点决策（仅当 caller 提供 viewport 信息时生效）：
   * - 源节点群（剪贴板里拷贝时的坐标）与 `viewportRect` 有交集 →
   *   维持"源节点旁 +offset"放置，配合 `ensureInView` 兜底滚动。
   * - 源节点群完全在视口外且提供了 `viewportCenter` → 跳过 offset，
   *   把粘贴节点群以视口中心为中心放置（与 `pasteAtPosition` 同款语义），
   *   避免把克隆粘到用户看不见的远方再被迫滚动过去。
   */
  async pasteFromClipboard(options) {
    const data = getClipboard();
    if (!data || data.nodes.length === 0) return;
    const mode = this.getMode();
    if (options?.viewportRect && options.viewportCenter) {
      const sourceTopLevel = data.nodes.filter(
        (node) => !node.parentId && node.meta?.hidden !== true,
      );
      if (
        sourceTopLevel.length > 0 &&
        isBoxOutsideRect(
          computeNodeGroupBounds(sourceTopLevel, mode),
          options.viewportRect,
        )
      ) {
        const { nodes, edges } = await this.resolvePastePayload(
          data,
          {
            skipOffset: true,
          },
        );
        centerNodeGroupAt(nodes, options.viewportCenter, mode);
        this._commitPaste(nodes, edges);
        return;
      }
    }
    const { nodes, edges } = await this.resolvePastePayload(data);
    this._commitPaste(nodes, edges);
    if (options?.ensureInView) {
      const topLevel = nodes.filter((node) => !node.parentId);
      const pastedIds = topLevel.map((node) => node.id);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const node of topLevel) {
        const position = getNodePosition(node, mode);
        const nodeSize = sizeOf(node, mode);
        if (position.x < minX) minX = position.x;
        if (position.y < minY) minY = position.y;
        if (position.x + nodeSize.width > maxX) maxX = position.x + nodeSize.width;
        if (position.y + nodeSize.height > maxY) maxY = position.y + nodeSize.height;
      }
      options.ensureInView(pastedIds, {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    }
  }
  /** Paste nodes from clipboard centered at a specific flow position */
  async pasteAtPosition(target) {
    const data = getClipboard();
    if (!data || data.nodes.length === 0) return;
    const mode = this.getMode();
    const { nodes, edges } = await this.resolvePastePayload(data, {
      skipOffset: true,
    });
    centerNodeGroupAt(nodes, target, mode);
    this._commitPaste(nodes, edges);
  }
  async resolvePastePayload(data, options) {
    const remapped = remapClipboard(data, options);
    const transformer = this.pasteNodeTransformer;
    if (!transformer) {
      return {
        ...remapped,
        nodes: assignComfyUiTemplateCopyOrdinals(
          this.getGraph().nodes,
          remapped.nodes,
        ),
      };
    }
    const nodes = await Promise.all(
      remapped.nodes.map((node, index) =>
        transformer(node, data.nodes[index]),
      ),
    );
    const nodeIdMap = new Map();
    for (let index = 0; index < remapped.nodes.length; index++) {
      nodeIdMap.set(remapped.nodes[index].id, nodes[index].id);
    }
    const rewireNodes = nodes.map((node) => {
      let next = node;
      if (node.parentId && nodeIdMap.has(node.parentId)) {
        const mapped = nodeIdMap.get(node.parentId);
        if (mapped && mapped !== node.parentId)
          next = {
            ...next,
            parentId: mapped,
          };
      }
      return next;
    });
    const edges = remapped.edges.map((edge) => {
      const source = nodeIdMap.get(edge.source) ?? edge.source;
      const target = nodeIdMap.get(edge.target) ?? edge.target;
      return {
        ...edge,
        id: deriveEdgeId(source, target),
        source,
        target,
      };
    });
    return {
      nodes: assignComfyUiTemplateCopyOrdinals(
        this.getGraph().nodes,
        rewireNodes,
      ),
      edges,
    };
  }
  /** Commit pasted nodes/edges to history, emit events, update selection */
  _commitPaste(nodes, edges) {
    const addedAt = Date.now();
    nodes = nodes.map((node) => ({
      ...node,
      meta: {
        ...node.meta,
        addedAt,
      },
    }));
    const pastedIds = new Set(nodes.map((node) => node.id));
    const existingIds = new Set(this.getGraph().nodes.map((node) => node.id));
    const validEdges = edges.filter(
      (edge) => pastedIds.has(edge.source) || existingIds.has(edge.source),
    );
    this.history.commit((draft) => {
      draft.nodes.push(...nodes);
      draft.edges.push(...validEdges);
    });
    for (const node of nodes) {
      this.eventBus.emitDirect({
        type: "node:added",
        node,
      });
    }
    for (const edge of validEdges) {
      this.eventBus.emitDirect({
        type: "edge:added",
        edge,
      });
    }
    this.selection.set(
      nodes
        .filter((node) => !node.parentId && node.meta?.hidden !== true)
        .map((node) => node.id),
    );
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  /** Cut selected nodes: copy to clipboard then remove */
  cutSelected(sourceContext) {
    const selectedIds = this.selection.getSelected();
    if (selectedIds.length === 0) return;
    const expanded = expandSelectionWithGroupChildren(
      this.getGraph().nodes,
      selectedIds,
    );
    const partition = partitionUserRemovalNodes(this.getGraph().nodes, [
      ...expanded,
    ]);
    if (partition.blockedCount > 0) {
      this.eventBus.emit({
        type: "delete:blocked",
        count: partition.blockedCount,
        reason: partition.blockedReason ?? "generating",
      });
      return;
    }
    this.copySelected(sourceContext);
    this.removeElements([...expanded], []);
    this.eventBus.emit({
      type: "persist:flush",
    });
  }
  // ---- Undo / Redo ----
  // Both undo() and redo() emit `persist:flush` after the history step lands so
  // the on-disk canvas.json mirrors the in-memory graph. Without this, the
  // user sees the visual undo (HistoryManager mutates state, notifyGraph()
  // pushes it to ReactFlow) but the next reload restores the *pre-undo* state
  // because usePersist never gets a write trigger. Guarded by canUndo /
  // canRedo so a no-op call (no history step available) doesn't queue an
  // empty save round-trip.
  //
  // `mode` is NOT in the travels-tracked GraphState (it lives on the
  // instance), so undo/redo can never reverse a mode change and we don't
  // need to snapshot/restore it across the history step.
  //
  // Protect the exact history boundary that would rewind an in-flight node —
  // either by removing it or by demoting it out of its generating state (an
  // empty media node keeps its id across submit, so only the latter check
  // catches "Cmd-Z during generation on an empty image node"). Unrelated user
  // entries above that boundary remain traversable.
  //
  // A refused step emits `history:blocked` so the UI can explain itself;
  // running out of history stays silent.
  //
  // Both directions also walk PAST steps the user cannot see — scratch popover
  // drafts, render-only fields, and the batch that bakes a landed generation's
  // staged fill into the truth state (the overlay repaints the identical card,
  // so peeling it changes nothing on screen). travels' manual-archive mode
  // gives every pending write batch its own history position, so without this
  // walk Cmd-Z regularly looked completely dead and users pressed twice.
  // `MAX_TRANSPARENT_STEPS` is a belt-and-braces bound; `canUndo/canRedo`
  // already terminate the walk at the stack edge.
  static MAX_TRANSPARENT_STEPS = 32;
  undo() {
    if (this.allowedHistorySteps("undo") === 0) return;
    this.stepHistory("undo");
  }
  /** Undo a transient confirmation only if its exact commit is still current. */
  undoIfCurrentCheckpoint(checkpoint) {
    if (!decideHistoryStep(this.getGraph(), this.history.peekUndoState()).allow)
      return false;
    const before = this.getGraph();
    if (!this.history.undoIfCurrent(checkpoint)) return false;
    const afterIds = new Set(this.getGraph().nodes.map((node) => node.id));
    const afterEdgeIds = new Set(this.getGraph().edges.map((edge) => edge.id));
    const after = this.getGraph();
    this.emitDeleteIntent(
      before.nodes.filter((node) => !afterIds.has(node.id)),
      before.edges
        .filter((edge) => !afterEdgeIds.has(edge.id))
        .map((edge) => edge.id),
      isHighBlastCanvasElementDeletion(
        before.nodes.length,
        after.nodes.length,
        before.edges.length,
        after.edges.length,
      ),
    );
    this.notifyGraph();
    this.eventBus.emit({
      type: "persist:flush",
    });
    return true;
  }
  redo() {
    if (this.allowedHistorySteps("redo") === 0) return;
    this.stepHistory("redo");
  }
  /**
   * Entry gate shared by `undo` / `redo` (see `decideHistoryStep`): refuses
   * steps that would rewind a live generation or strand a retained record,
   * and announces the refusal reason on the event bus.
   */
  allowedHistorySteps(direction, announceBlocked = true) {
    return findAllowedHistorySteps(
      this.getGraph(),
      this.history,
      direction,
      CanvasInstance.MAX_TRANSPARENT_STEPS,
      announceBlocked
        ? (reason) =>
            this.eventBus.emit({
              type: "history:blocked",
              direction,
              reason,
            })
        : void 0,
    );
  }
  /**
   * Take one history step in `direction`, then keep stepping while the landing
   * state carries nothing the user can see (`isInvisibleHistoryTransition`):
   * popover scratch drafts, render-only fields, and the batch that bakes a
   * landed generation's staged fill into the truth state. One keypress always
   * lands on a change the user can perceive.
   *
   * `notifyGraph` / `persist:flush` fire once for the whole walk so ReactFlow
   * and canvas.json see a single coalesced update.
   */
  stepHistory(direction) {
    const canStep = () => this.allowedHistorySteps(direction, false) > 0;
    const step =
      direction === "undo"
        ? () => this.history.undo()
        : () => this.history.redo();
    const beforeTraversal = this.getGraph();
    for (
      let index = 0;
      index <= CanvasInstance.MAX_TRANSPARENT_STEPS;
      index++
    ) {
      const before = this.getGraph();
      step();
      if (!isInvisibleHistoryTransition(before, this.getGraph()) || !canStep())
        break;
    }
    const afterIds = new Set(this.getGraph().nodes.map((node) => node.id));
    const afterEdgeIds = new Set(this.getGraph().edges.map((edge) => edge.id));
    const afterTraversal = this.getGraph();
    this.emitDeleteIntent(
      beforeTraversal.nodes.filter((node) => !afterIds.has(node.id)),
      beforeTraversal.edges
        .filter((edge) => !afterEdgeIds.has(edge.id))
        .map((edge) => edge.id),
      isHighBlastCanvasElementDeletion(
        beforeTraversal.nodes.length,
        afterTraversal.nodes.length,
        beforeTraversal.edges.length,
        afterTraversal.edges.length,
      ),
    );
    this.notifyGraph();
    this.eventBus.emit({
      type: "persist:flush",
    });
  }
  canUndo() {
    return this.allowedHistorySteps("undo", false) > 0;
  }
  canRedo() {
    return this.allowedHistorySteps("redo", false) > 0;
  }
  /** Establish the current graph as the undo/redo baseline (clears history). */
  snapshot() {
    if (this.pendingFills.size > 0) {
      this.history.setState((draft) => this.bakePendingFillsIntoDraft(draft));
      this.clearPendingFills();
    }
    this.history.snapshot();
  }
  // ---- Layout ----
  /**
   * 「智能整理」— full-canvas structural tidy (default strategy `dagre`).
   *
   * Connected nodes are rebuilt into dependency-ordered workflow bands at the
   * TOP of the canvas (edges flow left-to-right), and every discrete node —
   * one with no edges at all — is packed into a grid BELOW those bands. The
   * result is re-centered on the current centroid so the canvas never jumps
   * back to the origin.
   *
   * Top-level only: a group counts as a single box (children keep their
   * relative offset and are never re-gridded here — each group has its own
   * tidy toolbar), and `meta.hidden` sub-images are excluded.
   *
   * Single undoable commit that skips unchanged nodes, then `layout:computed`.
   * `onCommit(null)` when nothing actually moved.
   */
  async autoLayout(strategyName, measuredSizes, onCommit) {
    if (measuredSizes && measuredSizes.size > 0) {
      this.history.setState((draft) => {
        for (const node of draft.nodes) {
          const size = measuredSizes.get(node.id);
          if (size) node.size = size;
        }
      });
    }
    const graph = this.getGraph();
    const mode = this.getMode();
    const selectedStrategy = strategyName ?? "dagre";
    const topLevelNodes = graph.nodes.filter(
      (node) => !node.parentId && node.meta?.hidden !== true,
    );
    const topLevelNodeIds = new Set(topLevelNodes.map((node) => node.id));
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const rootAncestorId = (id) => {
      let cur = nodeById.get(id);
      let safety = 0;
      while (cur?.parentId && safety < 32) {
        const parent = nodeById.get(cur.parentId);
        if (!parent) break;
        cur = parent;
        safety++;
      }
      if (safety >= 32 && cur?.parentId) {
        console.warn(
          "[canvas] rootAncestorId hit 32-level safety cap; possible parentId cycle",
          {
            startId: id,
            lastId: cur.id,
          },
        );
      }
      return cur?.id ?? id;
    };
    const projected = new Set();
    const topLevelEdges = [];
    for (const edge of graph.edges) {
      const sourceId = rootAncestorId(edge.source);
      const targetId = rootAncestorId(edge.target);
      if (!topLevelNodeIds.has(sourceId) || !topLevelNodeIds.has(targetId)) continue;
      if (sourceId === targetId) continue;
      const key = `${sourceId}→${targetId}`;
      if (projected.has(key)) continue;
      projected.add(key);
      const id =
        sourceId === edge.source && targetId === edge.target ? edge.id : `proj:${edge.id}`;
      topLevelEdges.push({
        ...edge,
        id,
        source: sourceId,
        target: targetId,
      });
    }
    const positions = await this.layout.computeAsync(
      selectedStrategy,
      topLevelNodes,
      topLevelEdges,
      {
        mode,
      },
    );
    if (topLevelNodes.length > 0 && positions.size > 0) {
      const cur = computeCentroid(topLevelNodes, mode);
      let newCx = 0;
      let newCy = 0;
      for (const pos of positions.values()) {
        newCx += pos.x;
        newCy += pos.y;
      }
      newCx /= positions.size;
      newCy /= positions.size;
      const dx = cur.x - newCx;
      const dy = cur.y - newCy;
      for (const [id, pos] of positions) {
        positions.set(id, {
          x: pos.x + dx,
          y: pos.y + dy,
        });
      }
    }
    let layoutChanged = false;
    const checkpoint = this.history.commit((draft) => {
      for (const node of draft.nodes) {
        const pos = positions.get(node.id);
        if (!pos) continue;
        const cur = getNodePosition(node, mode);
        if (cur.x === pos.x && cur.y === pos.y) continue;
        layoutChanged = true;
        setNodePosition(node, mode, pos);
      }
    });
    onCommit?.(layoutChanged ? checkpoint : null);
    this.eventBus.emit({
      type: "layout:computed",
      positions,
    });
    this.notifyGraph();
    return positions;
  }
  /**
   * 「分类整理 · 按素材类型」— archival tidy that buckets every visible
   * top-level box by media type and stacks the buckets as horizontal swim
   * lanes (image → video → audio → text → file → table → group → placeholder,
   * unknown types trailing).
   *
   * Deliberately EDGE-BLIND: this is the "show me all my images together"
   * view, so connected workflows do get torn apart. The connection-aware
   * sibling is {@link autoLayout}.
   *
   * Node-set contract matches {@link autoLayout} with one addition: stickers
   * are excluded entirely (they are annotations pinned onto other nodes, so
   * they stay exactly where the user stuck them). A group counts as one box
   * whose children keep their relative offset, and `meta.hidden` sub-images
   * are skipped.
   *
   * The result is re-centered on the current centroid so the canvas does not
   * jump to the origin. Single undoable commit that skips unchanged nodes,
   * then `layout:computed`. `onCommit(null)` when nothing moved.
   */
  async autoLayoutByCategory(measuredSizes, onCommit) {
    if (measuredSizes && measuredSizes.size > 0) {
      this.history.setState((draft) => {
        for (const node of draft.nodes) {
          const size = measuredSizes.get(node.id);
          if (size) node.size = size;
        }
      });
    }
    const graph = this.getGraph();
    const mode = this.getMode();
    const laneNodes = graph.nodes.filter(
      (node) =>
        !node.parentId &&
        node.meta?.hidden !== true &&
        node.type !== CanvasNodeType.Sticker,
    );
    if (laneNodes.length < 2) {
      onCommit?.(null);
      return new Map();
    }
    const positions = layoutCategoryLanes(
      laneNodes.map((node) => {
        const sz = sizeOf(node, mode);
        return {
          id: node.id,
          type: node.type,
          width: sz.width,
          height: sz.height,
        };
      }),
    );
    if (positions.size === 0) {
      onCommit?.(null);
      return new Map();
    }
    const cur = computeCentroid(laneNodes, mode);
    let newCx = 0;
    let newCy = 0;
    for (const pos of positions.values()) {
      newCx += pos.x;
      newCy += pos.y;
    }
    newCx /= positions.size;
    newCy /= positions.size;
    const dx = cur.x - newCx;
    const dy = cur.y - newCy;
    for (const [id, pos] of positions) {
      positions.set(id, {
        x: Math.round(pos.x + dx),
        y: Math.round(pos.y + dy),
      });
    }
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    let layoutChanged = false;
    for (const [id, pos] of positions) {
      const node = nodeById.get(id);
      if (!node) continue;
      const cur = getNodePosition(node, mode);
      if (cur.x !== pos.x || cur.y !== pos.y) {
        layoutChanged = true;
        break;
      }
    }
    if (!layoutChanged) {
      onCommit?.(null);
      return positions;
    }
    const checkpoint = this.history.commit((draft) => {
      for (const node of draft.nodes) {
        const pos = positions.get(node.id);
        if (!pos) continue;
        const cur = getNodePosition(node, mode);
        if (cur.x === pos.x && cur.y === pos.y) continue;
        setNodePosition(node, mode, pos);
      }
    });
    onCommit?.(checkpoint);
    this.eventBus.emit({
      type: "layout:computed",
      positions,
    });
    this.notifyGraph();
    return positions;
  }
  /**
   * Tidy every visible top-level box into an explicit grid / row / column.
   * Group children and hidden multi-image slots are folded or excluded by
   * {@link autoLayoutSubset}; the selection is intentionally preserved because
   * this global toolbar action must not leave the whole canvas selected.
   *
   * `includeDeps` controls whether connections participate in the layout. It
   * does not change the global node set: false treats boxes as isolated,
   * while true keeps connected workflows aligned to their edges.
   */
  async autoLayoutAll(layout, includeDeps, measuredSizes, onCommit, sort = {}) {
    return this.autoLayoutSubset(
      this.getGraph().nodes.map((node) => node.id),
      layout,
      includeDeps,
      measuredSizes,
      {
        updateSelection: false,
        onCommit,
        sort,
      },
    );
  }
  /**
   * Tidy a SUBSET of the canvas — only the supplied node ids (plus, when
   * `includeDeps` is set, every node reachable from them along edges in
   * either direction). Unlike {@link autoLayout}, nodes outside the subset
   * are left untouched, and the layout result is anchored to the subset's
   * current top-left corner so the rest of the canvas never shifts.
   *
   * Layout kinds control how workflow blocks and isolated boxes are arranged:
   *   - `grid`       → packed grid
   *   - `horizontal` → side-by-side band / row
   *   - `vertical`   → stacked column
   * Connected workflows keep their internal left-to-right edge flow when
   * `includeDeps` is enabled, matching the selection tidy menu contract.
   *
   * Mirrors {@link autoLayout}'s group handling: a group counts as a single
   * box (children keep their relative offset), `meta.hidden` sub-images are
   * excluded, and cross-group edges are projected up to the root-ancestor
   * group so the strategy sees a top-level-only DAG.
   *
   * Single undoable commit; emits `layout:computed` only — persistence is the
   * caller's job (`use-canvas.ts` emits `persist:request` after awaiting this).
   * No-op when the resolved subset has fewer than 2 top-level boxes.
   */
  async autoLayoutSubset(nodeIds, layout, includeDeps, measuredSizes, options) {
    if (nodeIds.length === 0) {
      options?.onCommit?.(null);
      return new Map();
    }
    const graph = this.getGraph();
    const mode = this.getMode();
    const pinned = pinnedTidyNodeIds(graph.nodes);
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const rootAncestorCache = new Map();
    const rootAncestorId = (id) => {
      const cached = rootAncestorCache.get(id);
      if (cached !== void 0) return cached;
      let cur = nodeById.get(id);
      let safety = 0;
      while (cur?.parentId && safety < 32) {
        const parent = nodeById.get(cur.parentId);
        if (!parent) break;
        cur = parent;
        safety++;
      }
      const root = cur?.id ?? id;
      rootAncestorCache.set(id, root);
      return root;
    };
    const subset = new Set();
    for (const id of nodeIds) {
      const root = rootAncestorId(id);
      const node = nodeById.get(root);
      if (
        !node ||
        node.parentId ||
        node.meta?.hidden === true ||
        pinned.has(node.id)
      )
        continue;
      subset.add(root);
    }
    if (includeDeps) {
      const adjacency = new Map();
      for (const edge of graph.edges) {
        const sourceId = rootAncestorId(edge.source);
        const targetId = rootAncestorId(edge.target);
        if (sourceId === targetId) continue;
        if (!adjacency.has(sourceId)) adjacency.set(sourceId, new Set());
        if (!adjacency.has(targetId)) adjacency.set(targetId, new Set());
        adjacency.get(sourceId)?.add(targetId);
        adjacency.get(targetId)?.add(sourceId);
      }
      const queue = [...subset];
      while (queue.length > 0) {
        const cur = queue.shift();
        if (cur === void 0) break;
        for (const next of adjacency.get(cur) ?? []) {
          const node = nodeById.get(next);
          if (
            !node ||
            node.parentId ||
            node.meta?.hidden === true ||
            pinned.has(node.id)
          )
            continue;
          if (!subset.has(next)) {
            subset.add(next);
            queue.push(next);
          }
        }
      }
    }
    const subsetNodes = this.tidyMeasuredNodes(
      graph.nodes.filter((node) => subset.has(node.id)),
      measuredSizes,
    );
    if (subsetNodes.length < 2) {
      options?.onCommit?.(null);
      return new Map();
    }
    const projected = new Set();
    const subsetEdges = [];
    if (includeDeps) {
      for (const edge of graph.edges) {
        const sourceId = rootAncestorId(edge.source);
        const targetId = rootAncestorId(edge.target);
        if (!subset.has(sourceId) || !subset.has(targetId)) continue;
        if (sourceId === targetId) continue;
        const key = `${sourceId}→${targetId}`;
        if (projected.has(key)) continue;
        projected.add(key);
        const id =
          sourceId === edge.source && targetId === edge.target ? edge.id : `proj:${edge.id}`;
        subsetEdges.push({
          ...edge,
          id,
          source: sourceId,
          target: targetId,
        });
      }
    }
    const positions = await this.computeTidyPositions(
      subsetNodes,
      subsetEdges,
      layout,
      options?.sort,
    );
    if (!positions) {
      options?.onCommit?.(null);
      return new Map();
    }
    if (subsetNodes.length > 0 && positions.size > 0) {
      let curMinX = Number.POSITIVE_INFINITY;
      let curMinY = Number.POSITIVE_INFINITY;
      for (const node of subsetNodes) {
        const position = getNodePosition(node, mode);
        if (position.x < curMinX) curMinX = position.x;
        if (position.y < curMinY) curMinY = position.y;
      }
      let newMinX = Number.POSITIVE_INFINITY;
      let newMinY = Number.POSITIVE_INFINITY;
      for (const pos of positions.values()) {
        if (pos.x < newMinX) newMinX = pos.x;
        if (pos.y < newMinY) newMinY = pos.y;
      }
      if (
        Number.isFinite(curMinX) &&
        Number.isFinite(curMinY) &&
        Number.isFinite(newMinX) &&
        Number.isFinite(newMinY)
      ) {
        const dx = curMinX - newMinX;
        const dy = curMinY - newMinY;
        for (const [id, pos] of positions) {
          positions.set(id, {
            x: pos.x + dx,
            y: pos.y + dy,
          });
        }
      }
    }
    const layoutChanged = subsetNodes.some((node) => {
      const current = getNodePosition(node, mode);
      const target = positions.get(node.id);
      return (
        target !== void 0 &&
        (current.x !== target.x || current.y !== target.y)
      );
    });
    if (!layoutChanged) {
      options?.onCommit?.(null, true);
      return positions;
    }
    const checkpoint = this.history.commit((draft) => {
      for (const node of draft.nodes) {
        const pos = positions.get(node.id);
        if (!pos) continue;
        const cur = getNodePosition(node, mode);
        if (cur.x === pos.x && cur.y === pos.y) continue;
        setNodePosition(node, mode, pos);
      }
    });
    options?.onCommit?.(checkpoint, true);
    this.eventBus.emit({
      type: "layout:computed",
      positions,
    });
    if (includeDeps && subset.size > 0 && options?.updateSelection !== false) {
      this.selection.set([...subset]);
    }
    this.notifyGraph();
    return positions;
  }
  // ---- Plugin ----
  applyPlugin(plugin) {
    const context = {
      eventBus: this.eventBus,
      history: this.history,
      getGraph: () => this.getGraph(),
    };
    if (plugin.nodeTypes) {
      for (const { definition, component } of plugin.nodeTypes) {
        this.registry.register(definition, component);
      }
    }
    if (plugin.edgeTypes) {
      for (const { type, component } of plugin.edgeTypes) {
        this.registry.registerEdge(type, component);
      }
    }
    if (plugin.layoutStrategies) {
      for (const strategy of plugin.layoutStrategies) {
        this.layout.register(strategy);
      }
    }
    this.plugins.use(plugin, context);
  }
  removePlugin(pluginId) {
    const plugin = this.plugins.getPlugin(pluginId);
    if (!plugin) return;
    if (plugin.nodeTypes) {
      for (const { definition } of plugin.nodeTypes) {
        this.registry.unregister(definition.type);
      }
    }
    if (plugin.edgeTypes) {
      for (const { type } of plugin.edgeTypes) {
        this.registry.unregisterEdge(type);
      }
    }
    if (plugin.layoutStrategies) {
      for (const strategy of plugin.layoutStrategies) {
        this.layout.unregister(strategy.name);
      }
    }
    this.plugins.remove(pluginId);
  }
  // ---- Dispose ----
  dispose() {
    for (const plugin of this.plugins.listPlugins()) {
      this.plugins.remove(plugin.id);
    }
    this.eventBus.dispose();
    this.history.dispose();
    this.listeners.clear();
    this.clearPendingFills();
    this.highBlastDeleteConfirmer = void 0;
    this.rootEl = null;
  }
  // ---- Private ----
  registerBuiltinLayouts() {
    this.layout.register(new GridSlotLayout());
    this.layout.register(new DagreLayout());
  }
  notifyGraph() {
    const graph = this.getGraph();
    for (const listener of this.listeners) listener(graph);
  }
}
