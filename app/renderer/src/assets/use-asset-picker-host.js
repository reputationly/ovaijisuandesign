// use-asset-picker-host.js
import { reactExports } from "../vendor.js";
import { useAssetSourcePicker } from "../text-editor/read-preview-text-response.jsx";

export function useAssetPickerHost({ isActive: isActive2, isPresented }) {
  const [pickerRequest, setPickerRequest] = reactExports.useState(null);
  const pickerBusyRef = reactExports.useRef(false);
  const activeRequestRef = reactExports.useRef(null);
  const sharedPicker = useAssetSourcePicker();
  const handlePluginPickAsset = reactExports.useCallback(
    (opts, ctx, source) =>
      new Promise((resolve, reject) => {
        if (pickerBusyRef.current) {
          const error = new Error(
            "hub: picker_busy — another pickAsset() is already in progress",
          );
          error.code = "picker_busy";
          reject(error);
          return;
        }
        pickerBusyRef.current = true;
        const request = {
          opts,
          source,
          ctx,
          openedAt: performance.now(),
          resolve: (value) => {
            if (activeRequestRef.current !== request) return;
            activeRequestRef.current = null;
            pickerBusyRef.current = false;
            setPickerRequest(null);
            resolve(value);
          },
        };
        activeRequestRef.current = request;
        setPickerRequest(request);
      }),
    [],
  );
  const handleCanvasPickAsset = reactExports.useCallback(
    (opts, source) =>
      handlePluginPickAsset(
        opts,
        {
          callerNodeId: "",
          upstreamAssetIds: [],
        },
        source
          ? {
              ...source,
              preferredSide: "top",
            }
          : void 0,
      ),
    [handlePluginPickAsset],
  );
  reactExports.useEffect(() => {
    if (!sharedPicker || !isActive2) return;
    const pick = (opts, source) =>
      handlePluginPickAsset(
        opts,
        {
          callerNodeId: "",
          upstreamAssetIds: [],
        },
        source,
      );
    sharedPicker.current = pick;
    return () => {
      if (sharedPicker.current === pick) sharedPicker.current = null;
    };
  }, [sharedPicker, isActive2, handlePluginPickAsset]);
  reactExports.useEffect(() => {
    if (!isActive2) activeRequestRef.current?.resolve(null);
    return () => activeRequestRef.current?.resolve(null);
  }, [isActive2]);
  reactExports.useEffect(() => {
    if (!window.__TEST_DRIVER_IPC__) return;
    const handleOpenAssetPickerPerfFixture = () => {
      if (!isActive2 || !isPresented) return;
      void handleCanvasPickAsset({
        type: "image",
        tabs: ["canvas"],
      }).catch(() => void 0);
    };
    window.addEventListener(
      "hilo:test:open-asset-picker",
      handleOpenAssetPickerPerfFixture,
    );
    return () =>
      window.removeEventListener(
        "hilo:test:open-asset-picker",
        handleOpenAssetPickerPerfFixture,
      );
  }, [handleCanvasPickAsset, isActive2, isPresented]);
  return {
    pickerRequest,
    handlePluginPickAsset,
    handleCanvasPickAsset,
  };
}
