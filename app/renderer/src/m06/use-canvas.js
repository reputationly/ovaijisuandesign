// use-canvas.js
import { useAssetMetadataApi, useReactFlow, reactExports, CanvasNodeType, useStoreApi, useNodesState, useEdgesState } from "../vendor.js";
import { syncStableZoomSignals, orientUserEdge } from "../m15/canvas-surface-recovery-scheduler.jsx";
import { POPOVER_DRAFT_DATA_KEY } from "../m15/group-nodes-in-canvas.js";
import { sizeOf, getNodePosition } from "../m15/node-tag-rings-canvas.jsx";
import { getClipboard, hasInternalCopyMarker, resolveCanvasShortcut, selectDropAnchor, selectMouseAnchor, createCanvasCommandRegistry, isNodeDeleteProtected, isEdgeAttachedToProtectedNode, partitionDeletableIds, collectCommittablePositionChanges } from "../m15/remap-clipboard.js";
import { isFromInternalNativeCopy, isCanvasInteractive, isInsideCanvas, collectClipboardFiles, isBoxFullyVisible, KEYBOARD_MOVE_COMMIT_DELAY_MS, generateNodeId, collectMeasuredSizes, toHistoryActionResult } from "../m15/track-events.js";
import { useCanvasData } from "../m15/use-canvas-data.js";
import { buildInternalClipboardItemData, isEditableTarget$2, makeAssetPathResolver, writeCanvasSystemClipboard, useGraphSync } from "../m15/use-graph-sync.js";
import { CanvasInstance } from "./canvas-instance.js";
import { getCopiedSystemText } from "../m15/remap-clipboard.js";
import { useCopyDebugInfo } from "./selection-toolbar-inner.jsx";
function useCanvasInstance(mode2, plugins) {
  const pluginsRef = reactExports.useRef(plugins);
  pluginsRef.current = plugins;
  const [instance2] = reactExports.useState(() => {
    const inst = new CanvasInstance(mode2);
    if (pluginsRef.current) {
      for (const plugin of pluginsRef.current) {
        inst.applyPlugin(plugin);
      }
    }
    return inst;
  });
  reactExports.useEffect(() => {
    return () => instance2.dispose();
  }, [instance2]);
  reactExports.useEffect(() => {
    if (instance2.getMode() !== mode2) {
      instance2.switchMode(mode2);
    }
  }, [mode2, instance2]);
  return instance2;
}
function decidePasteIntent(input) {
  const {
    text: text2,
    html: html2,
    files,
    internalNodes,
    hasOnSystemPaste,
    hasOnSystemTextPaste,
  } = input;
  if (hasInternalCopyMarker(text2, html2))
    return {
      kind: "marker",
    };
  const copiedSysText = getCopiedSystemText();
  if (copiedSysText && text2 === copiedSysText && internalNodes.length > 0)
    return {
      kind: "marker",
    };
  if (files.length > 0) {
    if (isFromInternalNativeCopy(files, internalNodes))
      return {
        kind: "internal-from-copy",
      };
    if (hasOnSystemPaste)
      return {
        kind: "system-files",
        files,
      };
  }
  if (hasOnSystemTextPaste && text2.trim().length > 0)
    return {
      kind: "system-text",
      text: text2,
    };
  return {
    kind: "internal-fallback",
  };
}
function useKeyboardShortcuts(instance2, options = {}) {
  const assetMetadataStore = useAssetMetadataApi();
  const {
    enabled = true,
    commandRegistry,
    onZoomIn,
    onZoomOut,
    onFitView,
    onHostKeyboardShortcut,
    onSystemPaste,
    onSystemTextPaste,
    onSystemCopy,
    getCurrentWorkspace,
    ensureInternalPasteInView,
    getViewportRect: getViewportRect2,
    getViewportCenter,
    getInternalPasteAnchor,
    onCopyDebugInfo,
  } = options;
  reactExports.useEffect(() => {
    const runInternalPaste = () => {
      const anchor = getInternalPasteAnchor?.() ?? null;
      if (anchor) {
        void instance2.pasteAtPosition(anchor).catch((err) => {
          console.error("[canvas] internal paste at cursor failed:", err);
        });
        return;
      }
      void instance2
        .pasteFromClipboard({
          ensureInView: ensureInternalPasteInView,
          viewportRect: getViewportRect2?.() ?? void 0,
          viewportCenter: getViewportCenter?.(),
        })
        .catch((err) => {
          console.error("[canvas] internal paste failed:", err);
        });
    };
    const writeMarkerOnly = async () => {
      if (typeof navigator === "undefined" || !navigator.clipboard?.write) return;
      try {
        await navigator.clipboard.write([new ClipboardItem(buildInternalClipboardItemData())]);
      } catch (err) {
        console.warn("[canvas] write marker failed:", err);
      }
    };
    const handleCopy = (e2) => {
      if (!isCanvasInteractive(instance2.getRootEl(), enabled)) return;
      if (isEditableTarget$2(e2.target)) return;
      if (!isInsideCanvas(e2.target)) return;
      if (instance2.selection.getSelected().length === 0) return;
      e2.preventDefault();
      instance2.copySelected({
        workspace: getCurrentWorkspace?.(),
        resolveAssetPath: makeAssetPathResolver(assetMetadataStore),
      });
      void writeCanvasSystemClipboard(onSystemCopy);
    };
    const handleCut = (e2) => {
      if (!isCanvasInteractive(instance2.getRootEl(), enabled)) return;
      if (isEditableTarget$2(e2.target)) return;
      if (!isInsideCanvas(e2.target)) return;
      if (instance2.selection.getSelected().length === 0) return;
      e2.preventDefault();
      instance2.cutSelected({
        workspace: getCurrentWorkspace?.(),
        resolveAssetPath: makeAssetPathResolver(assetMetadataStore),
      });
      void writeMarkerOnly();
    };
    const handlePaste2 = (e2) => {
      if (!isCanvasInteractive(instance2.getRootEl(), enabled)) return;
      if (isEditableTarget$2(e2.target)) return;
      if (!isInsideCanvas(e2.target)) return;
      const text2 = e2.clipboardData?.getData("text/plain") ?? "";
      const html2 = e2.clipboardData?.getData("text/html") ?? "";
      const files = onSystemPaste ? collectClipboardFiles(e2.clipboardData) : [];
      const intent = decidePasteIntent({
        text: text2,
        html: html2,
        files,
        internalNodes: getClipboard()?.nodes ?? [],
        hasOnSystemPaste: Boolean(onSystemPaste),
        hasOnSystemTextPaste: Boolean(onSystemTextPaste),
      });
      e2.preventDefault();
      switch (intent.kind) {
        case "marker":
        case "internal-from-copy":
        case "internal-fallback":
          runInternalPaste();
          return;
        case "system-files":
          onSystemPaste?.(intent.files);
          return;
        case "system-text":
          onSystemTextPaste?.(intent.text);
          return;
      }
    };
    const handler = (e2) => {
      if (!isCanvasInteractive(instance2.getRootEl(), enabled)) return;
      if (e2.defaultPrevented) return;
      if (isEditableTarget$2(e2.target)) return;
      if (e2.isComposing || e2.key === "Process") return;
      if (
        !e2.defaultPrevented &&
        onHostKeyboardShortcut &&
        isInsideCanvas(e2.target) &&
        onHostKeyboardShortcut(e2)
      ) {
        e2.preventDefault();
        e2.stopPropagation();
        return;
      }
      const commandId = resolveCanvasShortcut(e2);
      if (commandId && commandRegistry?.hasHandler(commandId)) {
        if (!isInsideCanvas(e2.target)) return;
        e2.preventDefault();
        e2.stopPropagation();
        commandRegistry.execute(commandId, "keyboard");
        return;
      }
      const mod = e2.metaKey || e2.ctrlKey;
      if (e2.shiftKey && !mod && e2.code === "Digit1") {
        if (!isInsideCanvas(e2.target)) return;
        e2.preventDefault();
        onFitView?.();
        return;
      }
      if (!mod) return;
      const key2 = e2.key.toLowerCase();
      if (e2.altKey && e2.code === "KeyC") {
        if (!isInsideCanvas(e2.target)) return;
        if (!onCopyDebugInfo) return;
        e2.preventDefault();
        e2.stopPropagation();
        onCopyDebugInfo();
        return;
      }
      if (key2 === "z") {
        e2.preventDefault();
        if (e2.shiftKey) {
          instance2.redo();
        } else {
          instance2.undo();
        }
        return;
      }
      if (key2 === "=" || key2 === "+") {
        e2.preventDefault();
        onZoomIn?.();
        return;
      }
      if (key2 === "-") {
        e2.preventDefault();
        onZoomOut?.();
        return;
      }
      if (key2 === "g") {
        if (!isInsideCanvas(e2.target)) return;
        const selected2 = instance2.selection.getSelected();
        if (e2.shiftKey) {
          const graph = instance2.getGraph();
          const target = selected2.find(
            (id2) => graph.nodes.find((n2) => n2.id === id2)?.type === CanvasNodeType.Group,
          );
          if (target) {
            e2.preventDefault();
            instance2.ungroup(target);
          }
          return;
        }
        if (selected2.length >= 2) {
          e2.preventDefault();
          instance2.groupNodes(selected2);
        }
        return;
      }
    };
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste2);
    window.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste2);
      window.removeEventListener("keydown", handler);
    };
  }, [
    assetMetadataStore,
    enabled,
    instance2,
    commandRegistry,
    onZoomIn,
    onZoomOut,
    onFitView,
    onHostKeyboardShortcut,
    onSystemPaste,
    onSystemTextPaste,
    onSystemCopy,
    getCurrentWorkspace,
    ensureInternalPasteInView,
    getViewportRect2,
    getViewportCenter,
    getInternalPasteAnchor,
    onCopyDebugInfo,
  ]);
}
export function useCanvas(options) {
  const {
    mode: mode2,
    dataSource,
    plugins,
    isPresented = true,
    onHostKeyboardShortcut,
    commandHandlers,
    onSystemPaste,
    onSystemTextPaste,
    onSystemCopy,
    consumePastePositionOverride,
    getCurrentWorkspace,
    onNodesAdded,
    onFirstNodesPlaced,
  } = options;
  const [flowNodes, setFlowNodes, defaultOnNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, defaultOnEdgesChange] = useEdgesState([]);
  const { fitView, zoomIn, zoomOut, screenToFlowPosition, setCenter, getViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const assetMetadataStore = useAssetMetadataApi();
  const syncStableZoomFromViewport = reactExports.useCallback(() => {
    syncStableZoomSignals(getViewport().zoom);
  }, [getViewport]);
  const syncStableZoomAfterViewportChange = reactExports.useCallback(
    (result) => {
      if (result) {
        void result.then(syncStableZoomFromViewport, syncStableZoomFromViewport);
        return;
      }
      requestAnimationFrame(syncStableZoomFromViewport);
    },
    [syncStableZoomFromViewport],
  );
  const getViewportCenter = reactExports.useCallback(() => {
    const { domNode } = storeApi.getState();
    if (!domNode)
      return {
        x: 0,
        y: 0,
      };
    const rect = domNode.getBoundingClientRect();
    return screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }, [screenToFlowPosition, storeApi]);
  const getViewportRect2 = reactExports.useCallback(() => {
    const { domNode } = storeApi.getState();
    if (!domNode) return null;
    const rect = domNode.getBoundingClientRect();
    const topLeft = screenToFlowPosition({
      x: rect.left,
      y: rect.top,
    });
    const bottomRight = screenToFlowPosition({
      x: rect.left + rect.width,
      y: rect.top + rect.height,
    });
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }, [screenToFlowPosition, storeApi]);
  const mouseScreenRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const handleMove = (e2) => {
      mouseScreenRef.current = {
        x: e2.clientX,
        y: e2.clientY,
      };
    };
    document.addEventListener("mousemove", handleMove);
    return () => document.removeEventListener("mousemove", handleMove);
  }, []);
  const getPastePosition = reactExports.useCallback(() => {
    const override = consumePastePositionOverride?.();
    if (override) return override;
    const { domNode } = storeApi.getState();
    const rect = domNode?.getBoundingClientRect() ?? null;
    return selectDropAnchor({
      mouseScreen: mouseScreenRef.current,
      containerRect: rect,
      screenToFlow: screenToFlowPosition,
      viewportCenter: getViewportCenter,
    });
  }, [consumePastePositionOverride, getViewportCenter, screenToFlowPosition, storeApi]);
  const getDropPosition = getPastePosition;
  const getInternalPasteAnchor = reactExports.useCallback(() => {
    const override = consumePastePositionOverride?.();
    if (override) return override;
    const { domNode } = storeApi.getState();
    return selectMouseAnchor({
      mouseScreen: mouseScreenRef.current,
      containerRect: domNode?.getBoundingClientRect() ?? null,
      screenToFlow: screenToFlowPosition,
    });
  }, [consumePastePositionOverride, screenToFlowPosition, storeApi]);
  const clientToFlowPosition = reactExports.useCallback(
    (clientX, clientY) =>
      screenToFlowPosition({
        x: clientX,
        y: clientY,
      }),
    [screenToFlowPosition],
  );
  const handleSystemPaste = reactExports.useMemo(() => {
    if (!onSystemPaste) return void 0;
    return (files) => onSystemPaste(files, getPastePosition());
  }, [onSystemPaste, getPastePosition]);
  const handleSystemTextPaste = reactExports.useMemo(() => {
    if (!onSystemTextPaste) return void 0;
    return (text2) => onSystemTextPaste(text2, getPastePosition());
  }, [onSystemTextPaste, getPastePosition]);
  const instance2 = useCanvasInstance(mode2, plugins);
  const commandRegistry = reactExports.useMemo(
    () => createCanvasCommandRegistry(commandHandlers ?? (() => ({}))),
    [commandHandlers],
  );
  const workspaceId2 = getCurrentWorkspace?.();
  const {
    loading,
    initialHydratedNodeCount,
    loadError,
    loadRetrying,
    retryLoad,
    savedPositionsRef,
    hiddenAssetIdsRef,
  } = useCanvasData(instance2, mode2, dataSource, getViewportCenter, {
    onNodesAdded,
    onFirstNodesPlaced,
    workspaceId: workspaceId2,
  });
  const { selectedIds, syncingRef } = useGraphSync(instance2, setFlowNodes, setFlowEdges);
  const handleFitView = reactExports.useCallback(() => {
    syncStableZoomAfterViewportChange(
      fitView({
        padding: 0.2,
        duration: 300,
      }),
    );
  }, [fitView, syncStableZoomAfterViewportChange]);
  const handleZoomIn = reactExports.useCallback(() => {
    syncStableZoomAfterViewportChange(zoomIn());
  }, [zoomIn, syncStableZoomAfterViewportChange]);
  const handleZoomOut = reactExports.useCallback(() => {
    syncStableZoomAfterViewportChange(zoomOut());
  }, [zoomOut, syncStableZoomAfterViewportChange]);
  const handleSystemCopy = reactExports.useMemo(() => {
    if (!onSystemCopy) return void 0;
    return async () => {
      const ids2 = instance2.selection.getSelected();
      if (ids2.length === 0) return null;
      const idSet = new Set(ids2);
      const nodes = instance2.getGraph().nodes.filter((n2) => idSet.has(n2.id));
      return onSystemCopy(nodes);
    };
  }, [onSystemCopy, instance2]);
  const ensureInternalPasteInView = reactExports.useCallback(
    (_pastedIds, pastedBox) => {
      const rect = getViewportRect2();
      if (!rect || isBoxFullyVisible(pastedBox, rect)) return;
      const { transform: transform2 } = storeApi.getState();
      const currentZoom = transform2[2];
      const centerX = pastedBox.x + pastedBox.width / 2;
      const centerY = pastedBox.y + pastedBox.height / 2;
      void setCenter(centerX, centerY, {
        zoom: currentZoom,
        duration: 300,
      });
    },
    [getViewportRect2, setCenter, storeApi],
  );
  const focusDerivedNode = reactExports.useCallback(
    (nodeId, options2) => {
      if (!nodeId) return;
      const focusNow = (node2) => {
        instance2.selection.set([nodeId]);
        const mode22 = instance2.getMode();
        const ns2 = sizeOf(node2, mode22);
        const np = getNodePosition(node2, mode22);
        const nodeBox = {
          x: np.x,
          y: np.y,
          width: ns2.width,
          height: ns2.height,
        };
        if (!options2?.alwaysCenter) {
          const rect = getViewportRect2();
          if (!rect || isBoxFullyVisible(nodeBox, rect)) return;
        }
        const { transform: transform2 } = storeApi.getState();
        const currentZoom = transform2[2];
        const centerX = nodeBox.x + nodeBox.width / 2;
        const centerY = nodeBox.y + nodeBox.height / 2;
        void setCenter(centerX, centerY, {
          zoom: currentZoom,
          duration: options2?.duration ?? 300,
        });
      };
      const existing = instance2.getGraph().nodes.find((n2) => n2.id === nodeId);
      if (existing) {
        focusNow(existing);
        return;
      }
      const FOCUS_TIMEOUT_MS = 5e3;
      let timeoutId = null;
      const unsubscribe = instance2.eventBus.on("node:added", (event) => {
        if (event.node.id !== nodeId) return;
        unsubscribe();
        if (timeoutId) clearTimeout(timeoutId);
        requestAnimationFrame(() => focusNow(event.node));
      });
      timeoutId = setTimeout(() => {
        unsubscribe();
        console.warn(
          `[focusDerivedNode] timed out after ${FOCUS_TIMEOUT_MS}ms waiting for node "${nodeId}"`,
        );
      }, FOCUS_TIMEOUT_MS);
    },
    [instance2, getViewportRect2, storeApi, setCenter],
  );
  const focusNextDerivedFrom = reactExports.useCallback(
    (sourceNodeId) => {
      if (!sourceNodeId) return;
      const FOCUS_TIMEOUT_MS = 8e3;
      let timeoutId = null;
      let unsubscribe = null;
      const focusBoth = (derivedId) => {
        const graph = instance2.getGraph();
        const currentSourceNodeId = instance2.resolveCurrentNodeId(sourceNodeId);
        const source = graph.nodes.find((n2) => n2.id === currentSourceNodeId);
        const derived = graph.nodes.find((n2) => n2.id === derivedId);
        if (!source || !derived) return;
        instance2.selection.clear();
        const mode22 = instance2.getMode();
        const ss2 = sizeOf(source, mode22);
        const ds = sizeOf(derived, mode22);
        const sp = getNodePosition(source, mode22);
        const dp = getNodePosition(derived, mode22);
        const minX = Math.min(sp.x, dp.x);
        const minY = Math.min(sp.y, dp.y);
        const maxX = Math.max(sp.x + ss2.width, dp.x + ds.width);
        const maxY = Math.max(sp.y + ss2.height, dp.y + ds.height);
        const unionBox = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
        const rect = getViewportRect2();
        if (!rect || isBoxFullyVisible(unionBox, rect)) return;
        const { transform: transform2 } = storeApi.getState();
        const currentZoom = transform2[2];
        const PADDING = 0.2;
        const usable = 1 - PADDING * 2;
        const scaleX =
          unionBox.width > 0 ? (rect.width * usable) / unionBox.width : Number.POSITIVE_INFINITY;
        const scaleY =
          unionBox.height > 0 ? (rect.height * usable) / unionBox.height : Number.POSITIVE_INFINITY;
        const targetZoom = currentZoom * Math.min(1, scaleX, scaleY);
        const centerX = unionBox.x + unionBox.width / 2;
        const centerY = unionBox.y + unionBox.height / 2;
        syncStableZoomAfterViewportChange(
          setCenter(centerX, centerY, {
            zoom: targetZoom,
            duration: 300,
          }),
        );
      };
      unsubscribe = instance2.eventBus.on("edge:added", (event) => {
        if (event.edge.source !== instance2.resolveCurrentNodeId(sourceNodeId)) return;
        const derivedId = event.edge.target;
        unsubscribe?.();
        unsubscribe = null;
        if (timeoutId) clearTimeout(timeoutId);
        requestAnimationFrame(() => focusBoth(derivedId));
      });
      timeoutId = setTimeout(() => {
        unsubscribe?.();
        unsubscribe = null;
        console.warn(
          `[focusNextDerivedFrom] timed out after ${FOCUS_TIMEOUT_MS}ms waiting for a derived edge from "${sourceNodeId}"`,
        );
      }, FOCUS_TIMEOUT_MS);
    },
    [instance2, getViewportRect2, storeApi, setCenter, syncStableZoomAfterViewportChange],
  );
  const attachDraftOnNextDerived = reactExports.useCallback(
    (sourceNodeId, key2, draft) => {
      if (!sourceNodeId) return;
      const ATTACH_TIMEOUT_MS = 8e3;
      let timeoutId = null;
      let unsubscribe = null;
      unsubscribe = instance2.eventBus.on("edge:added", (event) => {
        if (event.edge.source !== instance2.resolveCurrentNodeId(sourceNodeId)) return;
        const derivedId = event.edge.target;
        unsubscribe?.();
        unsubscribe = null;
        if (timeoutId) clearTimeout(timeoutId);
        const node2 = instance2.getGraph().nodes.find((n2) => n2.id === derivedId);
        if (!node2) return;
        const prevData = node2.data ?? {};
        const prevMap = prevData[POPOVER_DRAFT_DATA_KEY] ?? {};
        const nextMap = {
          ...prevMap,
          [key2]: {
            ...draft,
            source: "user",
          },
        };
        const nextData = {
          ...prevData,
          [POPOVER_DRAFT_DATA_KEY]: nextMap,
        };
        instance2.updateNodeDataSilent(derivedId, nextData);
      });
      timeoutId = setTimeout(() => {
        unsubscribe?.();
        unsubscribe = null;
      }, ATTACH_TIMEOUT_MS);
    },
    [instance2],
  );
  useKeyboardShortcuts(instance2, {
    enabled: isPresented,
    commandRegistry,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onFitView: handleFitView,
    onHostKeyboardShortcut,
    onSystemPaste: handleSystemPaste,
    onSystemTextPaste: handleSystemTextPaste,
    onSystemCopy: handleSystemCopy,
    getCurrentWorkspace,
    ensureInternalPasteInView,
    getViewportRect: getViewportRect2,
    getViewportCenter,
    getInternalPasteAnchor,
    onCopyDebugInfo: useCopyDebugInfo(instance2),
  });
  const pendingRemoves = reactExports.useRef(null);
  const scheduleBatchRemove = reactExports.useCallback(() => {
    if (!pendingRemoves.current) return;
    queueMicrotask(() => {
      const batch2 = pendingRemoves.current;
      pendingRemoves.current = null;
      if (!batch2) return;
      instance2.removeElements(batch2.nodeIds, batch2.edgeIds);
      instance2.eventBus.emit({
        type: "persist:flush",
      });
    });
  }, [instance2]);
  const onEdgesChange = reactExports.useCallback(
    (changes) => {
      const allRemoves = changes.filter((c3) => c3.type === "remove");
      const others = changes.filter((c3) => c3.type !== "remove");
      let removes = allRemoves;
      if (allRemoves.length > 0) {
        const graph = instance2.getGraph();
        const protectedNodeIds = new Set(
          graph.nodes.filter((node2) => isNodeDeleteProtected(node2)).map((node2) => node2.id),
        );
        if (protectedNodeIds.size > 0) {
          const edgeById = new Map(graph.edges.map((e2) => [e2.id, e2]));
          removes = allRemoves.filter(
            (c3) => !isEdgeAttachedToProtectedNode(edgeById.get(c3.id), protectedNodeIds),
          );
        }
      }
      if (others.length > 0) {
        defaultOnEdgesChange(others);
      }
      if (removes.length > 0) {
        if (!pendingRemoves.current) {
          pendingRemoves.current = {
            nodeIds: [],
            edgeIds: [],
          };
          scheduleBatchRemove();
        }
        pendingRemoves.current.edgeIds.push(...removes.map((c3) => c3.id));
      }
    },
    [defaultOnEdgesChange, scheduleBatchRemove, instance2],
  );
  const commitNodeMoves = reactExports.useCallback(
    (moves) => {
      if (moves.length === 0) return;
      instance2.moveNodes(moves);
      instance2.eventBus.emit({
        type: "persist:request",
      });
    },
    [instance2],
  );
  const pendingKeyboardMovesRef = reactExports.useRef(new Map());
  const keyboardMoveCommitTimerRef = reactExports.useRef(null);
  const flushKeyboardMoves = reactExports.useCallback(() => {
    if (keyboardMoveCommitTimerRef.current) {
      clearTimeout(keyboardMoveCommitTimerRef.current);
      keyboardMoveCommitTimerRef.current = null;
    }
    const pendingMoves = pendingKeyboardMovesRef.current;
    if (pendingMoves.size === 0) return;
    pendingKeyboardMovesRef.current = new Map();
    commitNodeMoves(
      Array.from(pendingMoves, ([id2, position2]) => ({
        id: id2,
        position: position2,
      })),
    );
  }, [commitNodeMoves]);
  const scheduleKeyboardMoves = reactExports.useCallback(
    (moves) => {
      if (moves.length === 0) return;
      const pendingMoves = pendingKeyboardMovesRef.current;
      for (const move of moves) {
        pendingMoves.set(move.id, {
          x: move.position.x,
          y: move.position.y,
        });
      }
      if (keyboardMoveCommitTimerRef.current) {
        clearTimeout(keyboardMoveCommitTimerRef.current);
      }
      keyboardMoveCommitTimerRef.current = setTimeout(() => {
        keyboardMoveCommitTimerRef.current = null;
        flushKeyboardMoves();
      }, KEYBOARD_MOVE_COMMIT_DELAY_MS);
    },
    [flushKeyboardMoves],
  );
  reactExports.useEffect(() => {
    return () => flushKeyboardMoves();
  }, [flushKeyboardMoves]);
  const onNodesChange = reactExports.useCallback(
    (changes) => {
      const allNodeRemoves = changes.filter((c3) => c3.type === "remove");
      const others = changes.filter((c3) => c3.type !== "remove");
      let removes = allNodeRemoves;
      if (allNodeRemoves.length > 0) {
        const nodesById = new Map(instance2.getGraph().nodes.map((n2) => [n2.id, n2]));
        const { deletableIds, blockedCount, blockedReason } = partitionDeletableIds(
          allNodeRemoves.map((c3) => c3.id),
          (id2) => nodesById.get(id2),
        );
        if (blockedCount > 0) {
          instance2.eventBus.emit({
            type: "delete:blocked",
            count: blockedCount,
            reason: blockedReason ?? "generating",
          });
        }
        if (deletableIds.length !== allNodeRemoves.length) {
          const deletableIdSet = new Set(deletableIds);
          removes = allNodeRemoves.filter((c3) => deletableIdSet.has(c3.id));
        }
      }
      if (others.length > 0) {
        defaultOnNodesChange(others);
      }
      const keyboardMoves = collectCommittablePositionChanges(others);
      scheduleKeyboardMoves(keyboardMoves);
      if (removes.length > 0) {
        flushKeyboardMoves();
        if (!pendingRemoves.current) {
          pendingRemoves.current = {
            nodeIds: [],
            edgeIds: [],
          };
          scheduleBatchRemove();
        }
        pendingRemoves.current.nodeIds.push(...removes.map((c3) => c3.id));
      }
    },
    [
      defaultOnNodesChange,
      flushKeyboardMoves,
      scheduleBatchRemove,
      scheduleKeyboardMoves,
      instance2,
    ],
  );
  const onNodeDragStop = reactExports.useCallback(
    (moves) => {
      flushKeyboardMoves();
      commitNodeMoves(moves);
    },
    [commitNodeMoves, flushKeyboardMoves],
  );
  const onConnect = reactExports.useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return;
      const nodesById = new Map(instance2.getGraph().nodes.map((n2) => [n2.id, n2]));
      const oriented = orientUserEdge(connection.source, connection.target, (id2) =>
        nodesById.get(id2),
      );
      const flipped = oriented.source !== connection.source;
      const edge = {
        id: `${oriented.source}->${oriented.target}`,
        source: oriented.source,
        sourceHandle: (flipped ? connection.targetHandle : connection.sourceHandle) ?? void 0,
        target: oriented.target,
        targetHandle: (flipped ? connection.sourceHandle : connection.targetHandle) ?? void 0,
        type: "derivation",
      };
      instance2.addEdge(edge);
      instance2.eventBus.emit({
        type: "persist:flush",
      });
    },
    [instance2],
  );
  const commands = reactExports.useMemo(
    () => ({
      addNode: (props) => {
        const mode22 = instance2.getMode();
        const node2 = {
          id: props.id ?? generateNodeId(),
          type: props.type,
          positions: {
            [mode22]: props.position ?? {
              x: 100,
              y: 100,
            },
          },
          data: props.data ?? {},
          ...(props.size
            ? {
                size: props.size,
              }
            : {}),
          ...(props.isEmpty
            ? {
                isEmpty: true,
              }
            : {}),
        };
        instance2.addNode(node2);
        instance2.eventBus.emit({
          type: "persist:flush",
        });
      },
      removeNodes: (ids2) => {
        instance2.removeNodes(ids2);
        instance2.eventBus.emit({
          type: "persist:flush",
        });
      },
      autoLayout: async (strategy) => {
        let checkpoint = null;
        await instance2.autoLayout(strategy, collectMeasuredSizes(storeApi), (next2) => {
          checkpoint = next2;
        });
        instance2.eventBus.emit({
          type: "persist:request",
        });
        requestAnimationFrame(() => {
          syncStableZoomAfterViewportChange(
            fitView({
              padding: 0.2,
              duration: 300,
            }),
          );
        });
        return toHistoryActionResult(checkpoint, instance2);
      },
      autoLayoutByCategory: async () => {
        let checkpoint = null;
        await instance2.autoLayoutByCategory(collectMeasuredSizes(storeApi), (next2) => {
          checkpoint = next2;
        });
        instance2.eventBus.emit({
          type: "persist:request",
        });
        requestAnimationFrame(() => {
          syncStableZoomAfterViewportChange(
            fitView({
              padding: 0.2,
              duration: 300,
            }),
          );
        });
        return toHistoryActionResult(checkpoint, instance2);
      },
      autoLayoutAll: async (layout, includeDeps, sortBy = "name") => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node2) => {
            const assets = assetMetadataStore.getState();
            return assets.get(node2.assetId ?? node2.id)?.name ?? assets.get(node2.id)?.name;
          },
        };
        await instance2.autoLayoutAll(
          layout,
          includeDeps,
          collectMeasuredSizes(storeApi),
          (next2, accepted) => {
            checkpoint = next2;
            applied = accepted === true;
          },
          sort,
        );
        if (applied)
          instance2.eventBus.emit({
            type: "persist:request",
          });
        requestAnimationFrame(() => {
          syncStableZoomAfterViewportChange(
            fitView({
              padding: 0.2,
              duration: 300,
            }),
          );
        });
        return {
          ...toHistoryActionResult(checkpoint, instance2),
          applied,
        };
      },
      autoLayoutSubset: async (nodeIds, layout, includeDeps, sortBy = "name") => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node2) => {
            const assets = assetMetadataStore.getState();
            return assets.get(node2.assetId ?? node2.id)?.name ?? assets.get(node2.id)?.name;
          },
        };
        await instance2.autoLayoutSubset(
          nodeIds,
          layout,
          includeDeps,
          collectMeasuredSizes(storeApi),
          {
            sort,
            onCommit: (next2, accepted) => {
              checkpoint = next2;
              applied = accepted === true;
            },
          },
        );
        if (applied)
          instance2.eventBus.emit({
            type: "persist:request",
          });
        return {
          ...toHistoryActionResult(checkpoint, instance2),
          applied,
        };
      },
      tidyGroupChildren: async (groupId2, layout, includeDeps, sortBy = "name") => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node2) => {
            const assets = assetMetadataStore.getState();
            return assets.get(node2.assetId ?? node2.id)?.name ?? assets.get(node2.id)?.name;
          },
        };
        await instance2.relayoutGroupWithDagre(
          groupId2,
          layout,
          includeDeps,
          collectMeasuredSizes(storeApi),
          (next2, accepted) => {
            checkpoint = next2;
            applied = accepted === true;
          },
          sort,
        );
        if (applied)
          instance2.eventBus.emit({
            type: "persist:request",
          });
        return {
          ...toHistoryActionResult(checkpoint, instance2),
          applied,
        };
      },
      tidyGroupChildrenSubset: async (groupId2, childIds, layout, sortBy = "name") => {
        let checkpoint = null;
        let applied = false;
        const sort = {
          sortBy,
          assetName: (node2) => {
            const assets = assetMetadataStore.getState();
            return assets.get(node2.assetId ?? node2.id)?.name ?? assets.get(node2.id)?.name;
          },
        };
        await instance2.autoLayoutGroupChildrenSubset(
          groupId2,
          childIds,
          layout,
          collectMeasuredSizes(storeApi),
          (next2, accepted) => {
            checkpoint = next2;
            applied = accepted === true;
          },
          sort,
        );
        if (applied)
          instance2.eventBus.emit({
            type: "persist:request",
          });
        return {
          ...toHistoryActionResult(checkpoint, instance2),
          applied,
        };
      },
      undo: () => instance2.undo(),
      redo: () => instance2.redo(),
      switchMode: (m3) => instance2.switchMode(m3),
    }),
    [instance2, fitView, syncStableZoomAfterViewportChange, storeApi, assetMetadataStore],
  );
  return {
    nodes: flowNodes,
    edges: flowEdges,
    selectedIds,
    loading,
    initialHydratedNodeCount,
    loadError,
    loadRetrying,
    retryLoad,
    mode: instance2.getMode(),
    commandRegistry,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    commands,
    instance: instance2,
    savedPositionsRef,
    hiddenAssetIdsRef,
    getDropPosition,
    clientToFlowPosition,
    focusDerivedNode,
    focusNextDerivedFrom,
    attachDraftOnNextDerived,
    syncingRef,
  };
}
