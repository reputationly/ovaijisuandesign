// use-history-state.js
import { reactExports } from "../vendor.js";

export function useHistoryState(instance2) {
  const [canUndo, setCanUndo] = reactExports.useState(() =>
    instance2.canUndo(),
  );
  const [canRedo, setCanRedo] = reactExports.useState(() =>
    instance2.canRedo(),
  );
  reactExports.useEffect(() => {
    const sync = () => {
      setCanUndo(instance2.canUndo());
      setCanRedo(instance2.canRedo());
    };
    sync();
    return instance2.history.onHistoryChange(sync);
  }, [instance2]);
  return {
    canUndo,
    canRedo,
  };
}
