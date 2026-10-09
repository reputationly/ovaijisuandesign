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
import { HistoryManager2 } from "./history-manager2.js";
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
  remapPendingFill(oldId, newId2) {
    const fill = this.pendingFills.get(oldId);
    if (!fill) return;
    this.pendingFills.delete(oldId);
    this.pendingFills.set(newId2, fill);
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
  transaction(fn2) {
    this.history.beginTransaction();
    try {
      return fn2();
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
  constructor(mode2 = CanvasMode.Workflow) {
    this.mode = mode2;
    this.history = new HistoryManager2(createEmptyGraph());
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
  setArtifactReferenceResolver(resolver2) {
    this.artifactReferenceResolver = resolver2;
  }
  setArtifactBackendResolver(resolver2) {
    this.artifactBackendResolver = resolver2;
  }
  artifactProvenanceOptions() {
    const resolver2 = this.artifactReferenceResolver;
    return resolver2
      ? {
          resolveReferenceIds: (node2) => resolver2(node2.id),
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
    const base2 = this.history.getState();
    if (this.pendingFills.size === 0) return base2;
    if (this.fillOverlayCache?.baseRef === base2)
      return this.fillOverlayCache.result;
    const nodes = base2.nodes.slice();
    let dirty = false;
    for (const [nodeId, fill] of this.pendingFills) {
      const idx = nodes.findIndex((n2) => n2.id === nodeId);
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
          ...base2,
          nodes,
        }
      : base2;
    this.fillOverlayCache = {
      baseRef: base2,
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
    for (const n2 of graph.nodes) {
      nodeById.set(n2.id, n2);
      if (n2.parentId) {
        const arr = childrenByParent.get(n2.parentId);
        if (arr) arr.push(n2);
        else childrenByParent.set(n2.parentId, [n2]);
      }
      if (typeof n2.groupId === "string" && n2.groupId.length > 0) {
        const arr = membersByGroupId.get(n2.groupId);
        if (arr) arr.push(n2);
        else membersByGroupId.set(n2.groupId, [n2]);
      }
    }
    const childCountByParent = new Map();
    for (const [pid, arr] of childrenByParent)
      childCountByParent.set(pid, arr.length);
    const subImagesByParent = new Map();
    for (const [, rawMembers] of membersByGroupId) {
      const members = rawMembers.slice().sort((a2, b3) => {
        const ra = Number.isInteger(a2.round)
          ? a2.round
          : Number.MAX_SAFE_INTEGER;
        const rb = Number.isInteger(b3.round)
          ? b3.round
          : Number.MAX_SAFE_INTEGER;
        return ra !== rb ? ra - rb : 0;
      });
      const main2 =
        members.find((m3) => m3.meta?.hidden !== true) ?? members[0];
      if (!main2) continue;
      const subs = members.filter((m3) => m3.id !== main2.id);
      const prevArr = prev?.subImagesByParent.get(main2.id);
      if (
        prevArr &&
        prevArr.length === subs.length &&
        prevArr.every((n2, i2) => n2 === subs[i2])
      ) {
        subImagesByParent.set(main2.id, prevArr);
      } else {
        subImagesByParent.set(main2.id, subs);
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
    const runtimeNodes = mut.nodes.map((node2) =>
      fileNodeToRuntimeNode(node2, this.mode),
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
    const explicitlyRemovedNodes = previousNodes.filter((node2) =>
      removedSet.has(node2.id),
    );
    const addedIds = new Set();
    if (mut.nodes.length > this.getGraph().nodes.length) {
      const prevIds = new Set(this.getGraph().nodes.map((n2) => n2.id));
      for (const n2 of mut.nodes) if (!prevIds.has(n2.id)) addedIds.add(n2.id);
    }
    if (removedSet.size > 0 && this.selection.count() > 0) {
      const next2 = this.selection
        .getSelected()
        .filter((id2) => !removedSet.has(id2));
      if (next2.length !== this.selection.count()) this.selection.set(next2);
    }
    this.history.commit((draft) => {
      draft.nodes = runtimeNodes;
      if (mut.repointFollow) {
        const { from: from2, to } = mut.repointFollow;
        const provenanceOptions = this.artifactProvenanceOptions();
        const seen2 = new Set();
        const next2 = [];
        for (const e2 of draft.edges) {
          const fromNode = previousNodes.find((node2) => node2.id === from2);
          const toNode = runtimeNodes.find((node2) => node2.id === to);
          const fromBackend =
            fromNode?.data?.backend ?? this.artifactBackendResolver?.(from2);
          const toBackend =
            toNode?.data?.backend ?? this.artifactBackendResolver?.(to);
          const followsStoryboardVisibleRound =
            e2.target === from2 &&
            (fromBackend === BACKEND_VIBE_STORYBOARD ||
              toBackend === BACKEND_VIBE_STORYBOARD);
          if (
            !followsStoryboardVisibleRound &&
            isArtifactProvenanceEdge(e2, previousNodes, provenanceOptions)
          ) {
            if (seen2.has(e2.id)) continue;
            seen2.add(e2.id);
            next2.push(e2);
            continue;
          }
          let source = e2.source;
          if (source === from2) source = to;
          let target = e2.target;
          if (target === from2) target = to;
          if (source === target) continue;
          if (source === e2.source && target === e2.target) {
            if (seen2.has(e2.id)) continue;
            seen2.add(e2.id);
            next2.push(e2);
            continue;
          }
          const id2 = deriveEdgeId(source, target);
          if (seen2.has(id2)) continue;
          seen2.add(id2);
          next2.push({
            ...e2,
            id: id2,
            source,
            target,
          });
        }
        draft.edges = next2;
      }
      applyDetachedReferenceEdges(
        draft,
        this.getGraph(),
        runtimeNodes,
        this.artifactReferenceResolver,
      );
    });
    for (const id2 of removedSet)
      this.eventBus.emitDirect({
        type: "node:removed",
        nodeId: id2,
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
    const byId = new Map(runtimeNodes.map((n2) => [n2.id, n2]));
    for (const id2 of addedIds) {
      const node2 = byId.get(id2);
      if (node2)
        this.eventBus.emitDirect({
          type: "node:added",
          node: node2,
        });
    }
    for (const id2 of mut.updatedIds) {
      if (removedSet.has(id2) || addedIds.has(id2)) continue;
      const node2 = byId.get(id2);
      if (node2) {
        this.eventBus.emitDirect({
          type: "node:data-changed",
          nodeId: id2,
          data: node2.data,
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
    const node2 = this.getIndexes().nodeById.get(mainId);
    if (!node2 || !isGroupedNode(node2)) return false;
    const mut = removeGroup(this.fileNodes(), node2.groupId);
    if (mut.removedIds.length === 0) return false;
    this.removeElements(mut.removedIds, []);
    return true;
  }
  /** Detach a group member, preserving its generation metadata and reference edges. */
  detachSubImage(subId, absPosition) {
    const before = this.fileNodes();
    const mut = detachFromGroup(before, subId, absPosition, this.mode);
    const wasGrouped = new Set(
      before.filter((n2) => isGroupedNode(n2)).map((n2) => n2.id),
    );
    const raised = mut.nodes.filter(
      (n2) => wasGrouped.has(n2.id) && !isGroupedNode(n2),
    );
    if (raised.length > 0) {
      const raisedIds = new Set(raised.map((n2) => n2.id));
      const rest = mut.nodes.filter((n2) => !raisedIds.has(n2.id));
      raised.sort(
        (a2, b3) => Number(a2.id === subId) - Number(b3.id === subId),
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
  detachSubImages(entries2) {
    if (entries2.length === 0) return false;
    return this.transaction(() => {
      let any = false;
      for (const { subId, position: position2 } of entries2) {
        if (this.detachSubImage(subId, position2)) any = true;
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
    const mode2 = this.mode;
    const subSize = sizeOf(sub, mode2);
    const nodeById = this.getIndexes().nodeById;
    const absolutePositionOf = (n2) => {
      const p3 = getNodePosition(n2, mode2);
      if (!n2.parentId) return p3;
      const parent = nodeById.get(n2.parentId);
      if (!parent) return p3;
      const pp = getNodePosition(parent, mode2);
      return {
        x: pp.x + p3.x,
        y: pp.y + p3.y,
      };
    };
    const mainId = resolveGroupMainId(this.fileNodes(), subId);
    const mainNode = this.getIndexes().nodeById.get(mainId) ?? sub;
    const mainPos = absolutePositionOf(mainNode);
    const mainSize = getNodeSize(mainNode, mode2) ?? subSize;
    const pos = {
      x: mainPos.x + mainSize.width + DEFAULT_PLACEMENT_GAP,
      y: mainPos.y,
    };
    const ok2 = this.detachSubImage(subId, pos);
    return ok2 ? subId : null;
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
    ).map((node2) => {
      const live = this.getIndexes().nodeById.get(node2.id);
      if (
        !live ||
        !this.locallyFilledPlaceholderIds.has(node2.id) ||
        !live.assetId ||
        live.assetId !== node2.assetId ||
        live.meta?.cloneOf != null ||
        node2.meta?.cloneOf == null
      ) {
        return node2;
      }
      const data2 = {
        ...(node2.data ?? {}),
      };
      delete data2.cloneOf;
      const { cloneOf: _cloneOf, ...meta2 } = node2.meta;
      return {
        ...node2,
        data: data2,
        meta: Object.keys(meta2).length > 0 ? meta2 : void 0,
      };
    });
    if (isSamePersistedData(this.getGraph().nodes, normalizedNodes)) return;
    this.history.setState((draft) => {
      draft.nodes = normalizedNodes;
    });
    this.notifyGraph();
  }
  replaceEdgesFromAuthoritativeSnapshot(edges) {
    const ids2 = new Set(edges.map((e2) => e2.id));
    const deduped =
      ids2.size === edges.length
        ? edges
        : edges.filter((e2) => ids2.delete(e2.id));
    this.history.setState((draft) => {
      draft.edges = deduped;
    });
    this.notifyGraph();
  }
  switchMode(mode2) {
    const prev = this.getMode();
    if (prev === mode2) return;
    this.mode = mode2;
    this.eventBus.emit({
      type: "mode:changed",
      mode: mode2,
      prevMode: prev,
    });
    this.notifyGraph();
  }
  // ---- Edge operations (undoable via history.commit) ----
  addEdge(edge) {
    if (this.getGraph().edges.some((e2) => e2.id === edge.id)) return;
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
    const existing = new Set(this.getGraph().edges.map((e2) => e2.id));
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
  prepareNodeForInsert(node2) {
    const mode2 = this.getMode();
    if (
      !node2.parentId &&
      !node2.groupId &&
      node2.type !== CanvasNodeType.Group
    ) {
      const childAbs = getNodePosition(node2, mode2);
      const childSize = node2.size ?? defaultNodeSizeForType(node2.type);
      const enclosing = this.findEnclosingGroup(childAbs, childSize, mode2);
      if (enclosing) {
        const parentAbs = getNodePosition(enclosing, mode2);
        return {
          ...node2,
          parentId: enclosing.id,
          positions: {
            ...node2.positions,
            [mode2]: {
              x: childAbs.x - parentAbs.x,
              y: childAbs.y - parentAbs.y,
            },
          },
        };
      }
    }
    return node2;
  }
  addNode(node2) {
    const toInsert = this.prepareNodeForInsert({
      ...node2,
      meta: {
        ...node2.meta,
        addedAt: node2.meta?.addedAt ?? Date.now(),
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
    const existingIds = new Set(this.getGraph().nodes.map((n2) => n2.id));
    const toInsert = [];
    for (const node2 of nodes) {
      if (existingIds.has(node2.id)) continue;
      const prepared = this.prepareNodeForInsert(
        mutation === "commit"
          ? {
              ...node2,
              meta: {
                ...node2.meta,
                addedAt: node2.meta?.addedAt ?? Date.now(),
              },
            }
          : node2,
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
    for (const node2 of toInsert) {
      this.eventBus.emitDirect({
        type: "node:added",
        node: node2,
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
  applyServerCanvasUpdate(changes, mode2) {
    const hasAdded = (changes.addedNodes?.length ?? 0) > 0;
    const hasUpdated = (changes.updatedNodes?.length ?? 0) > 0;
    const hasRemoved = (changes.removedNodeIds?.length ?? 0) > 0;
    if (!hasAdded && !hasUpdated && !hasRemoved) return;
    const addedRuntime =
      changes.addedNodes && changes.addedNodes.length > 0
        ? changes.addedNodes.map((n2) =>
            this.prepareNodeForInsert(fileNodeToRuntimeNode(n2, mode2)),
          )
        : void 0;
    const prevIds = new Set(this.getGraph().nodes.map((n2) => n2.id));
    const inserted = addedRuntime?.filter((n2) => !prevIds.has(n2.id)) ?? [];
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
      applyChangesetToDraft(draft, normalizedChanges, mode2);
    });
    for (const node2 of inserted) {
      this.eventBus.emitDirect({
        type: "node:added",
        node: node2,
      });
    }
    for (const node2 of changes.updatedNodes ?? []) {
      this.eventBus.emitDirect({
        type: "node:data-changed",
        nodeId: node2.id,
        data: node2.data,
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
  findEnclosingGroup(absPos, size2, mode2) {
    for (const g2 of this.getGraph().nodes) {
      if (g2.type !== CanvasNodeType.Group) continue;
      const gSize = getNodeSize(g2, mode2);
      if (!gSize) continue;
      if (
        isChildFullyInsideParent(
          absPos,
          size2,
          getNodePosition(g2, mode2),
          gSize,
        )
      ) {
        return g2;
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
    const mode2 = this.getMode();
    const { nodeById } = this.getIndexes();
    const validNodeIds = nodeIds.filter((id2) => nodeById.has(id2));
    const groupAwareRemoval = planGroupAwareRemoval(
      graph,
      mode2,
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
    const explicitlyRemovedNodes = graph.nodes.filter((node2) =>
      nodeIdSet.has(node2.id),
    );
    const survivingUngroupedChildren = Array.from(
      groupAwareRemoval.ungroupedChildrenByGroupId,
    )
      .filter(([groupId2]) => nodeIdSet.has(groupId2))
      .flatMap(([, children2]) => children2)
      .filter((node2) => !nodeIdSet.has(node2.id));
    const promotedMainByDeletedId = new Map();
    const affectedGroupIds = new Set();
    for (const node2 of graph.nodes) {
      if (
        nodeIdSet.has(node2.id) &&
        typeof node2.groupId === "string" &&
        node2.groupId.length > 0
      ) {
        affectedGroupIds.add(node2.groupId);
      }
    }
    for (const groupId2 of affectedGroupIds) {
      const members = collectGroupMembers(graph.nodes, groupId2);
      const main2 = members.find((member) => member.meta?.hidden !== true);
      if (!main2 || !nodeIdSet.has(main2.id)) continue;
      const mainIndex = members.findIndex((member) => member.id === main2.id);
      const successorId = pickSuccessorMain(
        members.filter((member) => !nodeIdSet.has(member.id)),
        mainIndex,
      );
      if (successorId) promotedMainByDeletedId.set(main2.id, successorId);
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
      const next2 = this.selection
        .getSelected()
        .filter((id2) => !nodeIdSet.has(id2));
      if (next2.length !== this.selection.count()) this.selection.set(next2);
    }
    const applyRemoval = (draft) => {
      if (survivingUngroupedChildren.length > 0) {
        applyChangesetToDraft(
          draft,
          {
            updatedNodes: survivingUngroupedChildren,
          },
          mode2,
        );
      }
      if (edgeIdsToRemove.size > 0) {
        draft.edges = draft.edges.filter((e2) => !edgeIdsToRemove.has(e2.id));
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
      .map((node2) => deletionAssetId(node2))
      .filter((assetId) => assetId !== void 0);
    this.eventBus.emitDirect({
      type: "persist:delete-intent",
      removedNodeIds: nodes.map((node2) => node2.id),
      removedEdgeIds: [...new Set(removedEdgeIds)],
      removedAssetIds: [...new Set(removedAssetIds)],
      ...(highBlastConfirmed
        ? {
            highBlastConfirmed: true,
          }
        : {}),
    });
  }
  resizeNode(nodeId, size2) {
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === nodeId);
      if (target) target.size = size2;
    });
    this.eventBus.emit({
      type: "node:resized",
      nodeId,
      size: size2,
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
  updateNodeDataAndResize(nodeId, data2, size2) {
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === nodeId);
      if (!target) return;
      target.data = data2;
      target.size = size2;
    });
    this.eventBus.emit({
      type: "node:data-changed",
      nodeId,
      data: data2,
    });
    this.eventBus.emit({
      type: "node:resized",
      nodeId,
      size: size2,
    });
    this.notifyGraph();
  }
  moveNode(nodeId, position2) {
    const mode2 = this.getMode();
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return;
    const prevPosition = {
      ...getNodePosition(node2, mode2),
    };
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === nodeId);
      if (target) setNodePosition(target, mode2, position2);
    });
    this.eventBus.emit({
      type: "node:moved",
      nodeId,
      position: position2,
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
  moveAndResizeNode(nodeId, position2, size2, data2) {
    const mode2 = this.getMode();
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return;
    const prevPosition = {
      ...getNodePosition(node2, mode2),
    };
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === nodeId);
      if (!target) return;
      setNodePosition(target, mode2, position2);
      target.size = size2;
      if (data2) target.data = data2;
    });
    this.eventBus.emit({
      type: "node:moved",
      nodeId,
      position: position2,
      prevPosition,
    });
    this.eventBus.emit({
      type: "node:resized",
      nodeId,
      size: size2,
    });
    if (data2)
      this.eventBus.emit({
        type: "node:data-changed",
        nodeId,
        data: data2,
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
  moveAndResizeImageGroupMembers(nodeId, position2, size2, data2) {
    const mode2 = this.getMode();
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return;
    if (!node2.groupId) {
      this.moveAndResizeNode(nodeId, position2, size2, data2);
      return;
    }
    const groupId2 = node2.groupId;
    const memberIds = [];
    const prevPosition = {
      ...getNodePosition(node2, mode2),
    };
    this.history.commit((draft) => {
      for (const target of draft.nodes) {
        if (target.groupId !== groupId2) continue;
        memberIds.push(target.id);
        target.size = {
          ...size2,
        };
        if (target.id === nodeId) {
          setNodePosition(target, mode2, position2);
          target.data = data2;
          continue;
        }
        const targetData =
          target.data && typeof target.data === "object" ? target.data : {};
        target.data = {
          ...targetData,
          displaySize: {
            ...size2,
          },
          // PlaceholderNode deliberately paints from this explicit field
          // instead of its measured ReactFlow dimensions (which can create a
          // resize feedback loop). Keep an in-flight Storyboard round in
          // lockstep when another ready round in the same stack is resized.
          ...(target.type === CanvasNodeType.Placeholder
            ? {
                placeholderDisplaySize: {
                  ...size2,
                },
              }
            : {}),
        };
      }
    });
    this.eventBus.emit({
      type: "node:moved",
      nodeId,
      position: position2,
      prevPosition,
    });
    for (const memberId of memberIds) {
      const member = this.getIndexes().nodeById.get(memberId);
      if (!member) continue;
      this.eventBus.emit({
        type: "node:resized",
        nodeId: memberId,
        size: size2,
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
  resizeGroupNode(groupId2, position2, size2) {
    const mode2 = this.getMode();
    const { nodeById, childrenByParent } = this.getIndexes();
    const group = nodeById.get(groupId2);
    if (!group || group.type !== CanvasNodeType.Group) return;
    const groupAbs = getNodePosition(group, mode2);
    const groupSize = getNodeSize(group, mode2);
    const children2 = childrenByParent.get(groupId2) ?? [];
    let finalPos = position2;
    let finalSize = size2;
    if (children2.length > 0) {
      const childrenAbs = children2.map((c3) => {
        const rel = getNodePosition(c3, mode2);
        return {
          position: {
            x: groupAbs.x + rel.x,
            y: groupAbs.y + rel.y,
          },
          size: c3.size,
          type: c3.type,
        };
      });
      const { position: bboxPos, size: bboxSize } =
        computeGroupBoundsFromChildren(childrenAbs);
      const userLeft = position2.x;
      const userTop = position2.y;
      const userRight = position2.x + size2.width;
      const userBottom = position2.y + size2.height;
      const bboxLeft = bboxPos.x;
      const bboxTop = bboxPos.y;
      const bboxRight = bboxPos.x + bboxSize.width;
      const bboxBottom = bboxPos.y + bboxSize.height;
      const widthInsufficient = userRight < bboxRight || userLeft > bboxLeft;
      const heightInsufficient = userBottom < bboxBottom || userTop > bboxTop;
      if (widthInsufficient || heightInsufficient) {
        const left = Math.min(userLeft, bboxLeft);
        const top2 = Math.min(userTop, bboxTop);
        const right = Math.max(userRight, bboxRight);
        const bottom = Math.max(userBottom, bboxBottom);
        finalPos = {
          x: left,
          y: top2,
        };
        finalSize = {
          width: right - left,
          height: bottom - top2,
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
        position2.x !== groupAbs.x ||
        position2.y !== groupAbs.y ||
        size2.width !== groupSize?.width ||
        size2.height !== groupSize?.height;
      if (userDiffersFromInstance) this.notifyGraph();
      return;
    }
    const prevPosition = {
      ...groupAbs,
    };
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === groupId2);
      if (!target) return;
      setNodePosition(target, mode2, finalPos);
      target.sizes = {
        ...(target.sizes ?? {}),
        [mode2]: finalSize,
      };
      target.size = finalSize;
      const existingData = target.data ?? {};
      target.data = {
        ...existingData,
        frameMode: "manual",
      };
      if (positionChanged) {
        for (const node2 of draft.nodes) {
          if (node2.parentId !== groupId2) continue;
          const rel = getNodePosition(node2, mode2);
          setNodePosition(node2, mode2, {
            x: rel.x - dx,
            y: rel.y - dy,
          });
        }
      }
    });
    if (positionChanged) {
      this.eventBus.emit({
        type: "node:moved",
        nodeId: groupId2,
        position: finalPos,
        prevPosition,
      });
    }
    if (sizeChanged) {
      this.eventBus.emit({
        type: "node:resized",
        nodeId: groupId2,
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
  setGroupCollapsed(groupId2, collapsed) {
    const node2 = this.getIndexes().nodeById.get(groupId2);
    if (!node2 || node2.type !== CanvasNodeType.Group) return;
    if (!!node2.meta?.collapsed === collapsed) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === groupId2);
      if (!target) return;
      target.meta = {
        ...(target.meta ?? {}),
        collapsed,
      };
    });
    if (collapsed) this.selection.deselect(groupId2);
    this.eventBus.emit({
      type: "persist:flush",
    });
    this.notifyGraph();
  }
  moveNodes(updates) {
    if (updates.length === 0) return;
    const mode2 = this.getMode();
    const { nodeById } = this.getIndexes();
    const updateMap = new Map(updates.map((u4) => [u4.id, u4.position]));
    const orphanAbsByNodeId = new Map();
    for (const u4 of updates) {
      const node2 = nodeById.get(u4.id);
      if (!node2?.parentId) continue;
      const parent = nodeById.get(node2.parentId);
      if (!parent) continue;
      const parentPos =
        updateMap.get(parent.id) ?? getNodePosition(parent, mode2);
      const newAbs = {
        x: parentPos.x + u4.position.x,
        y: parentPos.y + u4.position.y,
      };
      const parentSize = getNodeSize(parent, mode2);
      if (
        isChildFullyOutsideParent(newAbs, node2.size, parentPos, parentSize)
      ) {
        orphanAbsByNodeId.set(u4.id, newAbs);
      }
    }
    const adoptByNodeId = new Map();
    const groups = [];
    for (const n2 of nodeById.values()) {
      if (n2.type === CanvasNodeType.Group) groups.push(n2);
    }
    for (const u4 of updates) {
      const node2 = nodeById.get(u4.id);
      if (!node2) continue;
      if (node2.type === CanvasNodeType.Group) continue;
      let absPos;
      if (orphanAbsByNodeId.has(u4.id)) {
        absPos = orphanAbsByNodeId.get(u4.id);
      } else if (node2.parentId) {
        continue;
      } else {
        absPos = u4.position;
      }
      for (const g2 of groups) {
        if (g2.id === u4.id) continue;
        const gSize = getNodeSize(g2, mode2);
        if (!gSize) continue;
        const gPos = updateMap.get(g2.id) ?? getNodePosition(g2, mode2);
        if (isChildFullyInsideParent(absPos, node2.size, gPos, gSize)) {
          if (!orphanAbsByNodeId.has(u4.id) && node2.parentId === g2.id) break;
          adoptByNodeId.set(u4.id, {
            groupId: g2.id,
            groupAbs: gPos,
          });
          break;
        }
      }
    }
    const childIdsToTouch = new Set();
    const { childrenByParent } = this.getIndexes();
    for (const u4 of updates) {
      const node2 = nodeById.get(u4.id);
      if (node2?.type !== CanvasNodeType.Group) continue;
      const children2 = childrenByParent.get(u4.id);
      if (!children2) continue;
      for (const c3 of children2) {
        if (updateMap.has(c3.id)) continue;
        if (orphanAbsByNodeId.has(c3.id)) continue;
        if (adoptByNodeId.has(c3.id)) continue;
        childIdsToTouch.add(c3.id);
      }
    }
    if (updates.length === 1 && adoptByNodeId.size === 0) {
      const u4 = updates[0];
      const node2 = nodeById.get(u4.id);
      if (!node2) return;
      const prevPosition = {
        ...getNodePosition(node2, mode2),
      };
      const orphanAbs = orphanAbsByNodeId.get(u4.id);
      this.history.commit((draft) => {
        const target = draft.nodes.find((n2) => n2.id === u4.id);
        if (!target) return;
        if (orphanAbs) {
          setNodePosition(target, mode2, orphanAbs);
          target.parentId = void 0;
        } else {
          setNodePosition(target, mode2, u4.position);
        }
        if (childIdsToTouch.size > 0) {
          for (const child of draft.nodes) {
            if (!childIdsToTouch.has(child.id)) continue;
            const rel = getNodePosition(child, mode2);
            setNodePosition(child, mode2, {
              x: rel.x,
              y: rel.y,
            });
          }
        }
      });
      this.eventBus.emit({
        type: "node:moved",
        nodeId: u4.id,
        position: orphanAbs ?? u4.position,
        prevPosition,
      });
      this.notifyGraph();
      return;
    }
    this.history.commit((draft) => {
      for (const node2 of draft.nodes) {
        const adopt = adoptByNodeId.get(node2.id);
        if (adopt) {
          const orphanAbs2 = orphanAbsByNodeId.get(node2.id);
          let absPos;
          if (orphanAbs2) absPos = orphanAbs2;
          else absPos = updateMap.get(node2.id);
          node2.parentId = adopt.groupId;
          setNodePosition(node2, mode2, {
            x: absPos.x - adopt.groupAbs.x,
            y: absPos.y - adopt.groupAbs.y,
          });
          continue;
        }
        const orphanAbs = orphanAbsByNodeId.get(node2.id);
        if (orphanAbs) {
          setNodePosition(node2, mode2, orphanAbs);
          node2.parentId = void 0;
          continue;
        }
        const pos = updateMap.get(node2.id);
        if (pos) {
          setNodePosition(node2, mode2, pos);
          continue;
        }
        if (childIdsToTouch.has(node2.id)) {
          const rel = getNodePosition(node2, mode2);
          setNodePosition(node2, mode2, {
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
    const mode2 = this.getMode();
    const file = buildCanvasFileSnapshot(graph, mode2);
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
    const addedRuntimeNodes = result.addedNodes.map((n2) =>
      fileNodeToRuntimeNode(n2, mode2),
    );
    for (const node2 of addedRuntimeNodes) {
      if (
        !this.eventBus.canEmit({
          type: "node:added",
          node: node2,
        })
      )
        return null;
    }
    let mergeTargetPrevPos;
    let mergeTargetPrevSize;
    if (isMergeMode) {
      const mt2 = this.getIndexes().nodeById.get(result.groupId);
      if (mt2) {
        mergeTargetPrevPos = {
          ...getNodePosition(mt2, mode2),
        };
        const mtSize = getNodeSize(mt2, mode2);
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
        mode2,
      );
    });
    for (const node2 of addedRuntimeNodes) {
      this.eventBus.emitDirect({
        type: "node:added",
        node: node2,
      });
    }
    for (const removedId of result.removedNodeIds) {
      this.eventBus.emitDirect({
        type: "node:removed",
        nodeId: removedId,
      });
    }
    this.emitDeleteIntent(
      graph.nodes.filter((node2) => result.removedNodeIds.includes(node2.id)),
    );
    if (isMergeMode) {
      const mtUpdated = result.updatedNodes.find(
        (n2) => n2.id === result.groupId,
      );
      if (mtUpdated && mergeTargetPrevPos) {
        const newPos = mtUpdated.positions?.[mode2];
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
  ungroup(groupId2) {
    const graph = this.getGraph();
    const mode2 = this.getMode();
    const file = buildCanvasFileSnapshot(graph, mode2);
    const result = ungroupInCanvas(file, groupId2);
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
        nodeId: groupId2,
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
        mode2,
      );
    });
    this.eventBus.emitDirect({
      type: "node:removed",
      nodeId: groupId2,
    });
    this.emitDeleteIntent(graph.nodes.filter((node2) => node2.id === groupId2));
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
  relayoutGroup(groupId2, layout) {
    const graph = this.getGraph();
    const mode2 = this.getMode();
    const file = buildCanvasFileSnapshot(graph, mode2);
    const result = relayoutGroupChildren(file, groupId2, layout);
    if (!result.changed) return;
    const prevPosById = new Map();
    const prevSizeByGroup = new Map();
    for (const updated of result.updatedNodes) {
      const live = this.getIndexes().nodeById.get(updated.id);
      if (!live) continue;
      prevPosById.set(updated.id, {
        ...getNodePosition(live, mode2),
      });
      if (live.type === CanvasNodeType.Group) {
        const liveSize = getNodeSize(live, mode2);
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
        mode2,
      );
    });
    for (const updated of result.updatedNodes) {
      const newPos = updated.positions?.[mode2];
      if (!newPos) continue;
      const prev = prevPosById.get(updated.id);
      if (updated.type === CanvasNodeType.Group) {
        const prevSize = prevSizeByGroup.get(updated.id);
        const newSize = updated.sizes?.[mode2] ?? updated.size;
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
    return nodes.map((node2) => {
      const size2 = measuredSizes?.get(node2.id);
      return size2 &&
        Number.isFinite(size2.width) &&
        Number.isFinite(size2.height) &&
        size2.width > 0 &&
        size2.height > 0
        ? {
            ...node2,
            size: size2,
            ...(node2.type === CanvasNodeType.Group
              ? {
                  sizes: {
                    ...node2.sizes,
                    [this.getMode()]: size2,
                  },
                }
              : {}),
          }
        : node2;
    });
  }
  async computeTidyPositions(nodes, edges, layout, sort = {}) {
    const snapshot2 = this.history.getState();
    const mode2 = this.getMode();
    const names = nodes.map((node2) => tidyNodeName(node2, sort));
    const ordered = orderTidyNodes(nodes, sort);
    const positions = await this.layout.computeAsync("dagre", ordered, edges, {
      mode: mode2,
      direction: "LR",
      clusterArrangement: layout,
    });
    if (
      this.history.getState() !== snapshot2 ||
      this.getMode() !== mode2 ||
      nodes.some((node2, i2) => tidyNodeName(node2, sort) !== names[i2]) ||
      positions.size !== nodes.length ||
      nodes.some((node2) => {
        const position2 = positions.get(node2.id);
        return (
          !position2 ||
          !Number.isFinite(position2.x) ||
          !Number.isFinite(position2.y)
        );
      })
    )
      return null;
    return positions;
  }
  tidyGroupIsLocked(group) {
    const byId = this.getIndexes().nodeById;
    const visited = new Set();
    let current2 = group;
    while (current2 && !visited.has(current2.id)) {
      if (current2.meta?.locked) return true;
      visited.add(current2.id);
      current2 = current2.parentId ? byId.get(current2.parentId) : void 0;
    }
    return false;
  }
  async relayoutGroupWithDagre(
    groupId2,
    layout,
    includeDeps,
    measuredSizes,
    onCommit,
    sort = {},
  ) {
    const groupNode = this.getIndexes().nodeById.get(groupId2);
    if (
      !groupNode ||
      groupNode.type !== CanvasNodeType.Group ||
      this.tidyGroupIsLocked(groupNode)
    ) {
      onCommit?.(null);
      return;
    }
    const mode2 = this.getMode();
    const graph = this.getGraph();
    const pinned = pinnedTidyNodeIds(graph.nodes);
    const children2 = this.tidyMeasuredNodes(
      graph.nodes.filter(
        (n2) =>
          n2.parentId === groupId2 && !n2.meta?.hidden && !pinned.has(n2.id),
      ),
      measuredSizes,
    );
    if (
      graph.nodes.some((n2) => n2.parentId === groupId2 && pinned.has(n2.id))
    ) {
      return this.autoLayoutGroupChildrenSubset(
        groupId2,
        children2.map((n2) => n2.id),
        layout,
        measuredSizes,
        onCommit,
        {
          ...sort,
          includeDeps,
        },
      );
    }
    if (children2.length === 0) {
      onCommit?.(null);
      return;
    }
    const childIds = new Set(children2.map((n2) => n2.id));
    const innerEdges = includeDeps
      ? this.getGraph().edges.filter(
          (e2) =>
            childIds.has(e2.source) &&
            childIds.has(e2.target) &&
            e2.source !== e2.target,
        )
      : [];
    const positions = await this.computeTidyPositions(
      children2,
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
    for (const child of children2) {
      const p3 = positions.get(child.id);
      if (!p3) continue;
      const sz = sizeOf(child, mode2);
      contentW = Math.max(contentW, p3.x + sz.width);
      contentH = Math.max(contentH, p3.y + sz.height);
      relPos.set(child.id, {
        x: GROUP_NODE_PADDING.x + p3.x,
        y: GROUP_NODE_PADDING.top + p3.y,
      });
    }
    const newGroupSize = {
      width: contentW + GROUP_NODE_PADDING.x * 2,
      height: contentH + GROUP_NODE_PADDING.top + GROUP_NODE_PADDING.bottom,
    };
    const prevGroupSize = getNodeSize(groupNode, mode2);
    const prevFrameMode = groupNode.data?.frameMode;
    let anyChanged =
      !prevGroupSize ||
      prevGroupSize.width !== newGroupSize.width ||
      prevGroupSize.height !== newGroupSize.height ||
      prevFrameMode === "manual";
    if (!anyChanged) {
      for (const child of children2) {
        const want = relPos.get(child.id);
        const cur = getNodePosition(child, mode2);
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
    for (const child of children2) {
      prevPosById.set(child.id, {
        ...getNodePosition(child, mode2),
      });
    }
    const checkpoint = this.history.commit((draft) => {
      for (const node2 of draft.nodes) {
        if (node2.id === groupId2) {
          const existingData = node2.data ?? {};
          node2.data = {
            ...existingData,
            frameMode: "auto",
          };
          node2.sizes = {
            ...(node2.sizes ?? {}),
            [mode2]: newGroupSize,
          };
          node2.size = newGroupSize;
          continue;
        }
        const next2 = relPos.get(node2.id);
        if (next2) setNodePosition(node2, mode2, next2);
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
        nodeId: groupId2,
        size: newGroupSize,
      });
    }
    for (const child of children2) {
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
    groupId2,
    childIds,
    layout,
    measuredSizes,
    onCommit,
    sort = {},
  ) {
    const groupNode = this.getIndexes().nodeById.get(groupId2);
    if (
      !groupNode ||
      groupNode.type !== CanvasNodeType.Group ||
      this.tidyGroupIsLocked(groupNode)
    ) {
      onCommit?.(null);
      return;
    }
    const mode2 = this.getMode();
    const wanted = new Set(childIds);
    const pinned = pinnedTidyNodeIds(this.getGraph().nodes);
    const children2 = this.tidyMeasuredNodes(
      this.getGraph().nodes.filter(
        (n2) =>
          n2.parentId === groupId2 &&
          wanted.has(n2.id) &&
          !n2.meta?.hidden &&
          !pinned.has(n2.id),
      ),
      measuredSizes,
    );
    if (children2.length < 2) {
      onCommit?.(null);
      return;
    }
    const childIdSet = new Set(children2.map((n2) => n2.id));
    const innerEdges = sort.includeDeps
      ? this.getGraph().edges.filter(
          (e2) =>
            childIdSet.has(e2.source) &&
            childIdSet.has(e2.target) &&
            e2.source !== e2.target,
        )
      : [];
    const computed = await this.computeTidyPositions(
      children2,
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
    for (const child of children2) {
      const p3 = getNodePosition(child, mode2);
      if (p3.x < curMinX) curMinX = p3.x;
      if (p3.y < curMinY) curMinY = p3.y;
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
    for (const [id2, pos] of computed) {
      nextPos.set(id2, {
        x: pos.x + dx,
        y: pos.y + dy,
      });
    }
    const allChildren = this.tidyMeasuredNodes(
      this.getGraph().nodes.filter(
        (n2) => n2.parentId === groupId2 && !n2.meta?.hidden,
      ),
      measuredSizes,
    );
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const child of allChildren) {
      const p3 = nextPos.get(child.id) ?? getNodePosition(child, mode2);
      const sz = sizeOf(child, mode2);
      if (p3.x < minX) minX = p3.x;
      if (p3.y < minY) minY = p3.y;
      if (p3.x + sz.width > maxX) maxX = p3.x + sz.width;
      if (p3.y + sz.height > maxY) maxY = p3.y + sz.height;
    }
    const newGroupSize = {
      width: maxX - minX + GROUP_NODE_PADDING.x * 2,
      height: maxY - minY + GROUP_NODE_PADDING.top + GROUP_NODE_PADDING.bottom,
    };
    const shiftX = GROUP_NODE_PADDING.x - minX;
    const shiftY = GROUP_NODE_PADDING.top - minY;
    const finalPos = new Map();
    for (const child of allChildren) {
      const p3 = nextPos.get(child.id) ?? getNodePosition(child, mode2);
      finalPos.set(child.id, {
        x: p3.x + shiftX,
        y: p3.y + shiftY,
      });
    }
    const prevGroupPos = getNodePosition(groupNode, mode2);
    const newGroupPos = {
      x: prevGroupPos.x - shiftX,
      y: prevGroupPos.y - shiftY,
    };
    const prevGroupSize = getNodeSize(groupNode, mode2);
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
        const cur = getNodePosition(child, mode2);
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
        ...getNodePosition(child, mode2),
      });
    }
    const checkpoint = this.history.commit((draft) => {
      for (const node2 of draft.nodes) {
        if (node2.id === groupId2) {
          const existingData = node2.data ?? {};
          node2.data = {
            ...existingData,
            frameMode: "auto",
          };
          node2.sizes = {
            ...(node2.sizes ?? {}),
            [mode2]: newGroupSize,
          };
          node2.size = newGroupSize;
          setNodePosition(node2, mode2, newGroupPos);
          continue;
        }
        const next2 = finalPos.get(node2.id);
        if (next2) setNodePosition(node2, mode2, next2);
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
        nodeId: groupId2,
        size: newGroupSize,
      });
    }
    if (newGroupPos.x !== prevGroupPos.x || newGroupPos.y !== prevGroupPos.y) {
      this.eventBus.emit({
        type: "node:moved",
        nodeId: groupId2,
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
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return;
    if (node2.parentId === parentId) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === nodeId);
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
    const pending2 = [];
    for (const u4 of updates) {
      const node2 = live.get(u4.id);
      if (!node2) continue;
      const entry = {
        id: u4.id,
        hasData: false,
        hasParentId: false,
      };
      let dirty = false;
      if (u4.type && u4.type !== node2.type) {
        entry.type = u4.type;
        dirty = true;
      }
      const incomingAssetId = validIncomingAssetId(u4.assetId);
      if (incomingAssetId) {
        if (incomingAssetId !== node2.assetId) {
          entry.hasAssetId = true;
          entry.assetId = incomingAssetId;
          dirty = true;
        }
      } else if (shouldClearAssetIdForServerNode(u4) && node2.assetId) {
        entry.hasAssetId = true;
        entry.assetId = null;
        dirty = true;
      }
      const placeholderFill =
        Boolean(incomingAssetId) &&
        incomingAssetId === node2.assetId &&
        node2.meta?.cloneOf == null &&
        node2.data?.cloneOf == null;
      const incomingData =
        placeholderFill && u4.data && typeof u4.data === "object"
          ? (() => {
              const next2 = {
                ...u4.data,
              };
              delete next2.cloneOf;
              if (typeof next2.assetId !== "string" && incomingAssetId) {
                next2.assetId = incomingAssetId;
              }
              return next2;
            })()
          : u4.data;
      if (Object.hasOwn(u4, "data")) {
        if (!isSamePersistedData(node2.data, incomingData)) {
          entry.hasData = true;
          entry.data = incomingData;
          dirty = true;
        }
      }
      if (
        u4.size &&
        (u4.size.width !== node2.size?.width ||
          u4.size.height !== node2.size?.height)
      ) {
        entry.size = u4.size;
        dirty = true;
      }
      if (u4.sizes) {
        entry.sizes = u4.sizes;
        dirty = true;
      }
      if (u4.meta) {
        const incomingMeta =
          placeholderFill && u4.meta.cloneOf != null
            ? (() => {
                const { cloneOf: _cloneOf, ...rest } = u4.meta;
                return rest;
              })()
            : u4.meta;
        if (!isSamePersistedData(node2.meta, incomingMeta)) {
          entry.meta = incomingMeta;
          entry.replaceMeta = u4.replaceMeta;
          dirty = true;
        }
      }
      if (u4.hasParentId) {
        if (node2.parentId !== u4.parentId) {
          entry.hasParentId = true;
          entry.parentId = u4.parentId;
          dirty = true;
        }
      }
      if (u4.groupId !== void 0) {
        const cur = node2.groupId;
        if (u4.groupId === null) {
          if (cur) {
            entry.hasGroupId = true;
            entry.groupId = null;
            dirty = true;
          }
        } else if (cur !== u4.groupId) {
          entry.hasGroupId = true;
          entry.groupId = u4.groupId;
          dirty = true;
        }
      }
      if (u4.round !== void 0) {
        const curRound = node2.round;
        if (u4.round === null) {
          if (curRound != null) {
            entry.hasRound = true;
            entry.round = null;
            dirty = true;
          }
        } else if (curRound !== u4.round) {
          entry.hasRound = true;
          entry.round = u4.round;
          dirty = true;
        }
      }
      if (u4.position) {
        const cur = getNodePosition(node2, this.getMode());
        if (u4.position.x !== cur.x || u4.position.y !== cur.y) {
          entry.position = u4.position;
          dirty = true;
        }
      }
      if (dirty) pending2.push(entry);
    }
    if (pending2.length === 0) return;
    const needsReconcile = pending2.some(
      (p3) =>
        p3.hasParentId || (p3.position && live.get(p3.id)?.parentId !== void 0),
    );
    const fitResizedGroups = [];
    this.history.serverSetState((draft) => {
      const mode2 = this.getMode();
      const draftById = new Map(draft.nodes.map((n2) => [n2.id, n2]));
      for (const entry of pending2) {
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
        if (entry.position) setNodePosition(target, mode2, entry.position);
      }
      if (!needsReconcile) return;
      const fileSnapshot = buildCanvasFileSnapshot(draft, mode2);
      const reconciled = reconcileGroupGeometryForMode(fileSnapshot, mode2);
      if (!reconciled.changed) return;
      const reconciledById = new Map(
        reconciled.updatedNodes.map((n2) => [n2.id, n2]),
      );
      for (const node2 of draft.nodes) {
        const updated = reconciledById.get(node2.id);
        if (!updated) continue;
        const newPos = updated.positions?.[mode2];
        if (newPos) setNodePosition(node2, mode2, newPos);
        if (node2.type === CanvasNodeType.Group) {
          const newSize = updated.sizes?.[mode2];
          if (newSize) {
            node2.size = {
              width: newSize.width,
              height: newSize.height,
            };
            node2.sizes = {
              ...(node2.sizes ?? {}),
              [mode2]: newSize,
            };
            fitResizedGroups.push({
              id: node2.id,
              size: newSize,
            });
          }
        }
      }
    });
    rebaseRetainedHistoryNodes(
      this.history,
      pending2,
      live,
      this.getGraph().nodes,
    );
    for (const g2 of fitResizedGroups) {
      this.eventBus.emit({
        type: "node:resized",
        nodeId: g2.id,
        size: g2.size,
      });
    }
    for (const entry of pending2) {
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
  updateNodeData(nodeId, data2) {
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return;
    if (isSamePersistedData(node2.data, data2)) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === nodeId);
      if (target) target.data = data2;
    });
    this.eventBus.emit({
      type: "node:data-changed",
      nodeId,
      data: data2,
    });
    this.notifyGraph();
  }
  /** Apply one undoable metadata patch to a set of canvas objects. */
  updateNodesMeta(nodeIds, patch2) {
    if (nodeIds.length === 0) return;
    const ids2 = new Set(nodeIds);
    this.history.commit((draft) => {
      for (const target of draft.nodes) {
        if (!ids2.has(target.id)) continue;
        target.meta = {
          ...(target.meta ?? {}),
          ...patch2,
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
  mergeNodeData(nodeId, patch2) {
    const next2 = this.computeMergedNodeData(nodeId, patch2);
    if (!next2) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === nodeId);
      if (target) target.data = next2;
    });
    this.eventBus.emit({
      type: "node:data-changed",
      nodeId,
      data: next2,
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
  mergeNodeDataSilent(nodeId, patch2) {
    const next2 = this.computeMergedNodeData(nodeId, patch2);
    if (!next2) return;
    this.updateNodeDataSilent(nodeId, next2);
  }
  /**
   * Shared merge math for `mergeNodeData` / `mergeNodeDataSilent`.
   * Returns `undefined` when the node is gone or the merge is a no-op, so
   * callers can bail before touching history.
   */
  computeMergedNodeData(nodeId, patch2) {
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return void 0;
    const prev = node2.data ?? {};
    let next2 = {};
    for (const k2 of Object.keys(prev)) {
      if (k2 === "__derivedChildCount" || k2 === "__derivedCollapsed") continue;
      next2[k2] = prev[k2];
    }
    for (const k2 of Object.keys(patch2)) {
      const v2 = patch2[k2];
      if (v2 === void 0) delete next2[k2];
      else next2[k2] = v2;
    }
    const workflowIdentityChanged =
      (Object.hasOwn(patch2, "sourceTemplateId") &&
        next2.sourceTemplateId !== prev.sourceTemplateId) ||
      (Object.hasOwn(patch2, "currentWorkflowId") &&
        next2.currentWorkflowId !== prev.currentWorkflowId);
    if (workflowIdentityChanged) {
      const [numberedNode] = assignComfyUiTemplateCopyOrdinals(
        this.getGraph().nodes.filter((candidate) => candidate.id !== nodeId),
        [
          {
            ...node2,
            data: next2,
          },
        ],
      );
      if (numberedNode?.data && typeof numberedNode.data === "object") {
        next2 = numberedNode.data;
      }
    }
    return isSamePersistedData(prev, next2) ? void 0 : next2;
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
  updateNodeDataSilent(nodeId, data2) {
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return;
    if (isSamePersistedData(node2.data, data2)) return;
    this.history.setState((draft) => {
      const target = draft.nodes.find((n2) => n2.id === nodeId);
      if (target) target.data = data2;
    });
    this.eventBus.emit({
      type: "node:data-silent-changed",
      nodeId,
      data: data2,
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
    const liveIds = new Set(this.getGraph().nodes.map((node2) => node2.id));
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
      const ids2 = new Set(draft.nodes.map((node2) => node2.id));
      draft.nodes = draft.nodes.filter((node2) => {
        const replacement = replacementByOldId.get(node2.id);
        if (!replacement) return true;
        if (ids2.has(replacement)) return false;
        ids2.delete(node2.id);
        ids2.add(replacement);
        node2.id = replacement;
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
    const selected2 = this.selection.getSelected();
    if (selected2.some((id2) => replacementByOldId.has(id2))) {
      this.selection.set([
        ...new Set(selected2.map((id2) => replacementByOldId.get(id2) ?? id2)),
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
    let current2 = nodeId;
    const visited = new Set();
    while (!visited.has(current2)) {
      visited.add(current2);
      const next2 = this.serverNodeIdAliases.get(current2);
      if (!next2) break;
      current2 = next2;
    }
    return current2;
  }
  /**
   * Replace a node's id in-place, rewriting any incident edges to point at
   * the new id. Single undoable commit. Selection follows.
   */
  replaceNodeId(oldId, newId2) {
    if (oldId === newId2) return;
    const { nodeById } = this.getIndexes();
    if (!nodeById.has(oldId)) return;
    if (nodeById.has(newId2)) {
      throw new Error(`Cannot replace node id: ${newId2} already exists`);
    }
    this.history.commit((draft) => {
      const node2 = draft.nodes.find((n2) => n2.id === oldId);
      if (!node2) return;
      node2.id = newId2;
      for (const edge of draft.edges) {
        const touched = edge.source === oldId || edge.target === oldId;
        if (edge.source === oldId) edge.source = newId2;
        if (edge.target === oldId) edge.target = newId2;
        if (touched) edge.id = deriveEdgeId(edge.source, edge.target);
      }
    });
    if (this.selection.getSelected().includes(oldId)) {
      const next2 = this.selection
        .getSelected()
        .map((id2) => (id2 === oldId ? newId2 : id2));
      this.selection.set(next2);
    }
    this.remapPendingFill(oldId, newId2);
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
    const node2 = this.getIndexes().nodeById.get(nodeId);
    if (!node2) return;
    this.history.commit((draft) => {
      const target = draft.nodes.find((n2) => n2.id === nodeId);
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
      data: node2.data,
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
      const node2 = draft.nodes.find((n2) => n2.id === nodeId);
      if (!node2) return;
      applyFillToNode(node2, payload);
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
      const node2 = findFillTarget(draft.nodes, nodeId, fill);
      if (!node2) continue;
      applyFillToNode(node2, fill.payload);
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
    const mode2 = this.getMode();
    const idSet = expandSelectionWithGroupChildren(graph.nodes, selectedIds);
    const nodes = graph.nodes
      .filter((n2) => idSet.has(n2.id) && !isTransientPlaceholder(n2))
      .map((n2) =>
        normalizeOrphanChildForClipboard(n2, graph.nodes, idSet, mode2),
      );
    const edges = graph.edges.filter(
      (e2) => idSet.has(e2.source) && idSet.has(e2.target),
    );
    const incoming = graph.edges.filter(
      (e2) => idSet.has(e2.target) && !idSet.has(e2.source),
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
    const data2 = getClipboard();
    if (!data2 || data2.nodes.length === 0) return;
    const mode2 = this.getMode();
    if (options?.viewportRect && options.viewportCenter) {
      const sourceTopLevel = data2.nodes.filter(
        (n2) => !n2.parentId && n2.meta?.hidden !== true,
      );
      if (
        sourceTopLevel.length > 0 &&
        isBoxOutsideRect(
          computeNodeGroupBounds(sourceTopLevel, mode2),
          options.viewportRect,
        )
      ) {
        const { nodes: nodes2, edges: edges2 } = await this.resolvePastePayload(
          data2,
          {
            skipOffset: true,
          },
        );
        centerNodeGroupAt(nodes2, options.viewportCenter, mode2);
        this._commitPaste(nodes2, edges2);
        return;
      }
    }
    const { nodes, edges } = await this.resolvePastePayload(data2);
    this._commitPaste(nodes, edges);
    if (options?.ensureInView) {
      const topLevel = nodes.filter((n2) => !n2.parentId);
      const pastedIds = topLevel.map((n2) => n2.id);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n2 of topLevel) {
        const p3 = getNodePosition(n2, mode2);
        const s2 = sizeOf(n2, mode2);
        if (p3.x < minX) minX = p3.x;
        if (p3.y < minY) minY = p3.y;
        if (p3.x + s2.width > maxX) maxX = p3.x + s2.width;
        if (p3.y + s2.height > maxY) maxY = p3.y + s2.height;
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
    const data2 = getClipboard();
    if (!data2 || data2.nodes.length === 0) return;
    const mode2 = this.getMode();
    const { nodes, edges } = await this.resolvePastePayload(data2, {
      skipOffset: true,
    });
    centerNodeGroupAt(nodes, target, mode2);
    this._commitPaste(nodes, edges);
  }
  async resolvePastePayload(data2, options) {
    const remapped = remapClipboard(data2, options);
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
      remapped.nodes.map((node2, index2) =>
        transformer(node2, data2.nodes[index2]),
      ),
    );
    const nodeIdMap = new Map();
    for (let i2 = 0; i2 < remapped.nodes.length; i2++) {
      nodeIdMap.set(remapped.nodes[i2].id, nodes[i2].id);
    }
    const rewireNodes = nodes.map((node2) => {
      let next2 = node2;
      if (node2.parentId && nodeIdMap.has(node2.parentId)) {
        const mapped = nodeIdMap.get(node2.parentId);
        if (mapped && mapped !== node2.parentId)
          next2 = {
            ...next2,
            parentId: mapped,
          };
      }
      return next2;
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
    const addedAt2 = Date.now();
    nodes = nodes.map((node2) => ({
      ...node2,
      meta: {
        ...node2.meta,
        addedAt: addedAt2,
      },
    }));
    const pastedIds = new Set(nodes.map((n2) => n2.id));
    const existingIds = new Set(this.getGraph().nodes.map((n2) => n2.id));
    const validEdges = edges.filter(
      (e2) => pastedIds.has(e2.source) || existingIds.has(e2.source),
    );
    this.history.commit((draft) => {
      draft.nodes.push(...nodes);
      draft.edges.push(...validEdges);
    });
    for (const node2 of nodes) {
      this.eventBus.emitDirect({
        type: "node:added",
        node: node2,
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
        .filter((n2) => !n2.parentId && n2.meta?.hidden !== true)
        .map((n2) => n2.id),
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
    const afterIds = new Set(this.getGraph().nodes.map((node2) => node2.id));
    const afterEdgeIds = new Set(this.getGraph().edges.map((edge) => edge.id));
    const after = this.getGraph();
    this.emitDeleteIntent(
      before.nodes.filter((node2) => !afterIds.has(node2.id)),
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
      let index2 = 0;
      index2 <= CanvasInstance.MAX_TRANSPARENT_STEPS;
      index2++
    ) {
      const before = this.getGraph();
      step();
      if (!isInvisibleHistoryTransition(before, this.getGraph()) || !canStep())
        break;
    }
    const afterIds = new Set(this.getGraph().nodes.map((node2) => node2.id));
    const afterEdgeIds = new Set(this.getGraph().edges.map((edge) => edge.id));
    const afterTraversal = this.getGraph();
    this.emitDeleteIntent(
      beforeTraversal.nodes.filter((node2) => !afterIds.has(node2.id)),
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
        for (const node2 of draft.nodes) {
          const size2 = measuredSizes.get(node2.id);
          if (size2) node2.size = size2;
        }
      });
    }
    const graph = this.getGraph();
    const mode2 = this.getMode();
    const name2 = strategyName ?? "dagre";
    const topLevelNodes = graph.nodes.filter(
      (n2) => !n2.parentId && n2.meta?.hidden !== true,
    );
    const topLevelNodeIds = new Set(topLevelNodes.map((n2) => n2.id));
    const nodeById = new Map(graph.nodes.map((n2) => [n2.id, n2]));
    const rootAncestorId = (id2) => {
      let cur = nodeById.get(id2);
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
            startId: id2,
            lastId: cur.id,
          },
        );
      }
      return cur?.id ?? id2;
    };
    const projected = new Set();
    const topLevelEdges = [];
    for (const e2 of graph.edges) {
      const s2 = rootAncestorId(e2.source);
      const t2 = rootAncestorId(e2.target);
      if (!topLevelNodeIds.has(s2) || !topLevelNodeIds.has(t2)) continue;
      if (s2 === t2) continue;
      const key2 = `${s2}→${t2}`;
      if (projected.has(key2)) continue;
      projected.add(key2);
      const id2 =
        s2 === e2.source && t2 === e2.target ? e2.id : `proj:${e2.id}`;
      topLevelEdges.push({
        ...e2,
        id: id2,
        source: s2,
        target: t2,
      });
    }
    const positions = await this.layout.computeAsync(
      name2,
      topLevelNodes,
      topLevelEdges,
      {
        mode: mode2,
      },
    );
    if (topLevelNodes.length > 0 && positions.size > 0) {
      const cur = computeCentroid(topLevelNodes, mode2);
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
      for (const [id2, pos] of positions) {
        positions.set(id2, {
          x: pos.x + dx,
          y: pos.y + dy,
        });
      }
    }
    let layoutChanged = false;
    const checkpoint = this.history.commit((draft) => {
      for (const node2 of draft.nodes) {
        const pos = positions.get(node2.id);
        if (!pos) continue;
        const cur = getNodePosition(node2, mode2);
        if (cur.x === pos.x && cur.y === pos.y) continue;
        layoutChanged = true;
        setNodePosition(node2, mode2, pos);
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
        for (const node2 of draft.nodes) {
          const size2 = measuredSizes.get(node2.id);
          if (size2) node2.size = size2;
        }
      });
    }
    const graph = this.getGraph();
    const mode2 = this.getMode();
    const laneNodes = graph.nodes.filter(
      (n2) =>
        !n2.parentId &&
        n2.meta?.hidden !== true &&
        n2.type !== CanvasNodeType.Sticker,
    );
    if (laneNodes.length < 2) {
      onCommit?.(null);
      return new Map();
    }
    const positions = layoutCategoryLanes(
      laneNodes.map((node2) => {
        const sz = sizeOf(node2, mode2);
        return {
          id: node2.id,
          type: node2.type,
          width: sz.width,
          height: sz.height,
        };
      }),
    );
    if (positions.size === 0) {
      onCommit?.(null);
      return new Map();
    }
    const cur = computeCentroid(laneNodes, mode2);
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
    for (const [id2, pos] of positions) {
      positions.set(id2, {
        x: Math.round(pos.x + dx),
        y: Math.round(pos.y + dy),
      });
    }
    const nodeById = new Map(graph.nodes.map((n2) => [n2.id, n2]));
    let layoutChanged = false;
    for (const [id2, pos] of positions) {
      const node2 = nodeById.get(id2);
      if (!node2) continue;
      const cur2 = getNodePosition(node2, mode2);
      if (cur2.x !== pos.x || cur2.y !== pos.y) {
        layoutChanged = true;
        break;
      }
    }
    if (!layoutChanged) {
      onCommit?.(null);
      return positions;
    }
    const checkpoint = this.history.commit((draft) => {
      for (const node2 of draft.nodes) {
        const pos = positions.get(node2.id);
        if (!pos) continue;
        const cur2 = getNodePosition(node2, mode2);
        if (cur2.x === pos.x && cur2.y === pos.y) continue;
        setNodePosition(node2, mode2, pos);
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
      this.getGraph().nodes.map((node2) => node2.id),
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
    const mode2 = this.getMode();
    const pinned = pinnedTidyNodeIds(graph.nodes);
    const nodeById = new Map(graph.nodes.map((n2) => [n2.id, n2]));
    const rootAncestorCache = new Map();
    const rootAncestorId = (id2) => {
      const cached = rootAncestorCache.get(id2);
      if (cached !== void 0) return cached;
      let cur = nodeById.get(id2);
      let safety = 0;
      while (cur?.parentId && safety < 32) {
        const parent = nodeById.get(cur.parentId);
        if (!parent) break;
        cur = parent;
        safety++;
      }
      const root2 = cur?.id ?? id2;
      rootAncestorCache.set(id2, root2);
      return root2;
    };
    const subset = new Set();
    for (const id2 of nodeIds) {
      const root2 = rootAncestorId(id2);
      const node2 = nodeById.get(root2);
      if (
        !node2 ||
        node2.parentId ||
        node2.meta?.hidden === true ||
        pinned.has(node2.id)
      )
        continue;
      subset.add(root2);
    }
    if (includeDeps) {
      const adjacency = new Map();
      for (const e2 of graph.edges) {
        const s2 = rootAncestorId(e2.source);
        const t2 = rootAncestorId(e2.target);
        if (s2 === t2) continue;
        if (!adjacency.has(s2)) adjacency.set(s2, new Set());
        if (!adjacency.has(t2)) adjacency.set(t2, new Set());
        adjacency.get(s2)?.add(t2);
        adjacency.get(t2)?.add(s2);
      }
      const queue = [...subset];
      while (queue.length > 0) {
        const cur = queue.shift();
        if (cur === void 0) break;
        for (const next2 of adjacency.get(cur) ?? []) {
          const node2 = nodeById.get(next2);
          if (
            !node2 ||
            node2.parentId ||
            node2.meta?.hidden === true ||
            pinned.has(node2.id)
          )
            continue;
          if (!subset.has(next2)) {
            subset.add(next2);
            queue.push(next2);
          }
        }
      }
    }
    const subsetNodes = this.tidyMeasuredNodes(
      graph.nodes.filter((n2) => subset.has(n2.id)),
      measuredSizes,
    );
    if (subsetNodes.length < 2) {
      options?.onCommit?.(null);
      return new Map();
    }
    const projected = new Set();
    const subsetEdges = [];
    if (includeDeps) {
      for (const e2 of graph.edges) {
        const s2 = rootAncestorId(e2.source);
        const t2 = rootAncestorId(e2.target);
        if (!subset.has(s2) || !subset.has(t2)) continue;
        if (s2 === t2) continue;
        const key2 = `${s2}→${t2}`;
        if (projected.has(key2)) continue;
        projected.add(key2);
        const id2 =
          s2 === e2.source && t2 === e2.target ? e2.id : `proj:${e2.id}`;
        subsetEdges.push({
          ...e2,
          id: id2,
          source: s2,
          target: t2,
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
      for (const node2 of subsetNodes) {
        const p3 = getNodePosition(node2, mode2);
        if (p3.x < curMinX) curMinX = p3.x;
        if (p3.y < curMinY) curMinY = p3.y;
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
        for (const [id2, pos] of positions) {
          positions.set(id2, {
            x: pos.x + dx,
            y: pos.y + dy,
          });
        }
      }
    }
    const layoutChanged = subsetNodes.some((node2) => {
      const current2 = getNodePosition(node2, mode2);
      const target = positions.get(node2.id);
      return (
        target !== void 0 &&
        (current2.x !== target.x || current2.y !== target.y)
      );
    });
    if (!layoutChanged) {
      options?.onCommit?.(null, true);
      return positions;
    }
    const checkpoint = this.history.commit((draft) => {
      for (const node2 of draft.nodes) {
        const pos = positions.get(node2.id);
        if (!pos) continue;
        const cur = getNodePosition(node2, mode2);
        if (cur.x === pos.x && cur.y === pos.y) continue;
        setNodePosition(node2, mode2, pos);
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
      for (const { definition: definition2, component } of plugin.nodeTypes) {
        this.registry.register(definition2, component);
      }
    }
    if (plugin.edgeTypes) {
      for (const { type: type2, component } of plugin.edgeTypes) {
        this.registry.registerEdge(type2, component);
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
      for (const { definition: definition2 } of plugin.nodeTypes) {
        this.registry.unregister(definition2.type);
      }
    }
    if (plugin.edgeTypes) {
      for (const { type: type2 } of plugin.edgeTypes) {
        this.registry.unregisterEdge(type2);
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
