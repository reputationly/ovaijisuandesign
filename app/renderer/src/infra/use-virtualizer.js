// 虚拟列表像没安装的 @tanstack/react-virtual，先用已装的 @tanstack/virtual-core 拼出来。
import reactExports from "react";
import reactDomExports from "react-dom";
import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from "@tanstack/virtual-core";

const useIsomorphicLayoutEffect = typeof document !== "undefined" ? reactExports.useLayoutEffect : reactExports.useEffect;
function useVirtualizerBase({
  useFlushSync = true,
  ...options
}) {
  const rerender = reactExports.useReducer(() => ({}), {})[1];
  const resolvedOptions = {
    ...options,
    onChange: (instance22, sync) => {
      var _a2;
      if (useFlushSync && sync) {
        reactDomExports.flushSync(rerender);
      } else {
        rerender();
      }
      (_a2 = options.onChange) == null ? void 0 : _a2.call(options, instance22, sync);
    }
  };
  const [instance2] = reactExports.useState(() => new Virtualizer(resolvedOptions));
  instance2.setOptions(resolvedOptions);
  useIsomorphicLayoutEffect(() => {
    return instance2._didMount();
  }, []);
  useIsomorphicLayoutEffect(() => {
    return instance2._willUpdate();
  });
  return instance2;
}
function useVirtualizer(options) {
  return useVirtualizerBase({
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    ...options
  });
}

export { useVirtualizer };
