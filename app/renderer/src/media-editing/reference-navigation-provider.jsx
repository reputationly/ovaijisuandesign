// reference-navigation-provider.jsx
import { reactExports, useReactFlow, useStoreApi } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ReferenceNavigationContext } from "./get-reference-navigation-defaults.jsx";
import { syncStableZoomSignals } from "../canvas/separator.jsx";
import {
  CanvasActionsContext,
  useCanvasActions,
} from "./use-canvas-actions.js";

function ReferenceNavigationProvider({
  children: children2,
  cancelPendingFocus,
  scope,
}) {
  const actions = useCanvasActions();
  const { getViewport, setViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const [record2, setRecord] = reactExports.useState(null);
  const currentRecord = record2?.scope === scope ? record2 : null;
  const recordRef = reactExports.useRef(record2);
  recordRef.current = currentRecord;
  const returningRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!currentRecord || currentRecord.returning) returningRef.current = null;
  }, [currentRecord]);
  reactExports.useEffect(() => {
    setRecord((current2) => (current2?.scope === scope ? current2 : null));
  }, [scope]);
  const locate = reactExports.useCallback(
    (nodeId, targetId, snapshot2) => {
      if (!actions.getNodeById(nodeId) || !actions.getNodeById(targetId))
        return;
      returningRef.current = null;
      cancelPendingFocus();
      setRecord({
        scope,
        nodeId,
        viewport: getViewport(),
        snapshot: snapshot2,
        returning: false,
      });
      actions.focusNodeIds([targetId], {
        expandAncestorGroups: true,
      });
    },
    [actions, cancelPendingFocus, getViewport, scope],
  );
  const acknowledgeReturn = reactExports.useCallback((nodeId) => {
    setRecord((current2) =>
      current2?.nodeId === nodeId && current2.returning ? null : current2,
    );
  }, []);
  reactExports.useEffect(() => {
    return storeApi.subscribe(() => {
      const current2 = recordRef.current;
      if (current2 && !actions.getNodeById(current2.nodeId)) setRecord(null);
    });
  }, [actions, storeApi]);
  reactExports.useEffect(() => {
    if (!currentRecord || currentRecord.returning) return;
    const timer2 = setTimeout(() => {
      if (returningRef.current) return;
      setRecord((latest2) => (latest2 === currentRecord ? null : latest2));
    }, 5e3);
    return () => clearTimeout(timer2);
  }, [currentRecord]);
  const handleReturn = async () => {
    const current2 = recordRef.current;
    if (!current2 || !actions.getNodeById(current2.nodeId)) {
      setRecord(null);
      return;
    }
    if (returningRef.current === current2) return;
    returningRef.current = current2;
    cancelPendingFocus();
    actions.selectNodeExclusive(current2.nodeId);
    await setViewport(current2.viewport, {
      duration: 400,
    });
    if (recordRef.current !== current2) return;
    syncStableZoomSignals(getViewport().zoom);
    setRecord((latest2) =>
      latest2 === current2
        ? {
            ...current2,
            returning: true,
          }
        : latest2,
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
      {children2}
    </ReferenceNavigationContext.Provider>
  );
}

export function CanvasReferenceNavigationScope({
  actions,
  children: children2,
  cancelPendingFocus,
  scope,
}) {
  return (
    <CanvasActionsContext.Provider value={actions}>
      <ReferenceNavigationProvider
        cancelPendingFocus={cancelPendingFocus}
        scope={scope}
      >
        {children2}
      </ReferenceNavigationProvider>
    </CanvasActionsContext.Provider>
  );
}
