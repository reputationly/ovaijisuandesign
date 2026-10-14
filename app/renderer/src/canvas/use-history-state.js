// use-history-state.js
import reactExports from "react";

export function useHistoryState(instance) {
  const [canUndo, setCanUndo] = reactExports.useState(() =>
    instance.canUndo(),
  );
  const [canRedo, setCanRedo] = reactExports.useState(() =>
    instance.canRedo(),
  );
  reactExports.useEffect(() => {
    const sync = () => {
      setCanUndo(instance.canUndo());
      setCanRedo(instance.canRedo());
    };
    sync();
    return instance.history.onHistoryChange(sync);
  }, [instance]);
  return {
    canUndo,
    canRedo,
  };
}
