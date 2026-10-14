// reference-navigation-provider.jsx
import reactExports from "react";
import { useReactFlow, useStoreApi } from "../vendor-fork/xyflow/react/index.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ReferenceNavigationContext } from "./get-reference-navigation-defaults.jsx";
import { syncStableZoomSignals } from "../canvas/separator.jsx";
import {
  CanvasActionsContext,
  useCanvasActions,
} from "./use-canvas-actions.js";

function ReferenceNavigationProvider({
  children,
  cancelPendingFocus,
  scope,
}) {
  const actions = useCanvasActions();
  const { getViewport, setViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const [record, setRecord] = reactExports.useState(null);
  const currentRecord = record?.scope === scope ? record : null;
  const recordRef = reactExports.useRef(record);
  recordRef.current = currentRecord;
  const returningRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!currentRecord || currentRecord.returning) returningRef.current = null;
  }, [currentRecord]);
  reactExports.useEffect(() => {
    setRecord((currentRecord) => (currentRecord?.scope === scope ? currentRecord : null));
  }, [scope]);
  const locate = reactExports.useCallback(
    (nodeId, targetId, snapshot) => {
      if (!actions.getNodeById(nodeId) || !actions.getNodeById(targetId))
        return;
      returningRef.current = null;
      cancelPendingFocus();
      setRecord({
        scope,
        nodeId,
        viewport: getViewport(),
        snapshot,
        returning: false,
      });
      actions.focusNodeIds([targetId], {
        expandAncestorGroups: true,
      });
    },
    [actions, cancelPendingFocus, getViewport, scope],
  );
  const acknowledgeReturn = reactExports.useCallback((nodeId) => {
    setRecord((currentRecord) =>
      currentRecord?.nodeId === nodeId && currentRecord.returning ? null : currentRecord,
    );
  }, []);
  reactExports.useEffect(() => {
    return storeApi.subscribe(() => {
      const currentRecord = recordRef.current;
      if (currentRecord && !actions.getNodeById(currentRecord.nodeId)) setRecord(null);
    });
  }, [actions, storeApi]);
  reactExports.useEffect(() => {
    if (!currentRecord || currentRecord.returning) return;
    const timeoutId = setTimeout(() => {
      if (returningRef.current) return;
      setRecord((latestRecord) => (latestRecord === currentRecord ? null : latestRecord));
    }, 5e3);
    return () => clearTimeout(timeoutId);
  }, [currentRecord]);
  const handleReturn = async () => {
    const currentRecord = recordRef.current;
    if (!currentRecord || !actions.getNodeById(currentRecord.nodeId)) {
      setRecord(null);
      return;
    }
    if (returningRef.current === currentRecord) return;
    returningRef.current = currentRecord;
    cancelPendingFocus();
    actions.selectNodeExclusive(currentRecord.nodeId);
    await setViewport(currentRecord.viewport, {
      duration: 400,
    });
    if (recordRef.current !== currentRecord) return;
    syncStableZoomSignals(getViewport().zoom);
    setRecord((latestRecord) =>
      latestRecord === currentRecord
        ? {
            ...currentRecord,
            returning: true,
          }
        : latestRecord,
    );
  };
  const value = {
    record: currentRecord,
    locate,
    acknowledgeReturn,
    returnToNode: handleReturn,
    dismiss: () => setRecord(null),
  };
  return (
    <ReferenceNavigationContext.Provider value={value}>
      {children}
    </ReferenceNavigationContext.Provider>
  );
}

export function CanvasReferenceNavigationScope({
  actions,
  children,
  cancelPendingFocus,
  scope,
}) {
  return (
    <CanvasActionsContext.Provider value={actions}>
      <ReferenceNavigationProvider
        cancelPendingFocus={cancelPendingFocus}
        scope={scope}
      >
        {children}
      </ReferenceNavigationProvider>
    </CanvasActionsContext.Provider>
  );
}
