// use-media-node-actions.jsx
import { reactExports, useReactFlow, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { getAdjacentNodePosition, useAddToChat } from "./node-shell-inner.jsx";
import { AddToChatIcon, FullscreenIcon$1 } from "./fullscreen-icon.jsx";
import {
  ClipIcon,
  ColorAdjustIcon,
  ExtractAudioIcon,
  ExtractFrameIcon,
  ToolbarSpinnerIcon,
} from "./file-missing-icon.jsx";
import { PromoteToAssetIcon } from "./generating-media-area.jsx";

const EMPTY_TOOLBAR_ITEMS = [];

export function useMediaNodeActions({
  nodeId,
  toolbarActive = true,
  meta: meta2,
  fallbackPath,
  fallbackWidth,
  onAddToChat,
  cropImage,
  onExtractAudio,
  onColorAdjust,
  enableFrameExtract,
  onPromoteToAsset,
}) {
  const { t: t2 } = useTranslation();
  const reactFlow = useReactFlow();
  const [showLightbox, setShowLightbox] = reactExports.useState(false);
  const [lightboxIndexOverride, setLightboxIndexOverride] =
    reactExports.useState(null);
  const [showClipPanel, setShowClipPanel] = reactExports.useState(false);
  const [showFramePanel, setShowFramePanel] = reactExports.useState(false);
  const [extractingAudio, setExtractingAudio] = reactExports.useState(false);
  const handleAddToChat = useAddToChat(
    nodeId,
    meta2,
    onAddToChat,
    fallbackPath,
  );
  const handleClip = reactExports.useCallback(() => {
    if (meta2?.url) setShowClipPanel(true);
  }, [meta2?.url]);
  const handleExtractFrame = reactExports.useCallback(() => {
    if (meta2?.url) setShowFramePanel(true);
  }, [meta2?.url]);
  const handleClipExport = reactExports.useCallback(
    async (blob, filename) => {
      if (!cropImage) return;
      const position2 = getAdjacentNodePosition(
        reactFlow,
        nodeId,
        fallbackWidth,
      );
      await cropImage(nodeId, blob, filename, position2);
    },
    [nodeId, cropImage, reactFlow, fallbackWidth],
  );
  const handleFullscreen = reactExports.useCallback(
    (nextIndex) => {
      if (!meta2?.url) return;
      setLightboxIndexOverride(
        typeof nextIndex === "number" && Number.isFinite(nextIndex)
          ? nextIndex
          : null,
      );
      setShowLightbox(true);
    },
    [meta2?.url],
  );
  const closeLightbox = reactExports.useCallback(() => {
    setShowLightbox(false);
    setLightboxIndexOverride(null);
  }, []);
  const handlePromoteToAsset = reactExports.useCallback(
    (e2) => {
      onPromoteToAsset?.([nodeId], {
        x: e2.clientX,
        y: e2.clientY,
      });
    },
    [nodeId, onPromoteToAsset],
  );
  const handleExtractAudio = reactExports.useCallback(async () => {
    if (!onExtractAudio || !meta2?.path || extractingAudio) return;
    setExtractingAudio(true);
    try {
      await onExtractAudio(nodeId, meta2.path);
    } finally {
      setExtractingAudio(false);
    }
  }, [onExtractAudio, meta2?.path, nodeId, extractingAudio]);
  const closeClipPanel = reactExports.useCallback(
    () => setShowClipPanel(false),
    [],
  );
  const closeFramePanel = reactExports.useCallback(
    () => setShowFramePanel(false),
    [],
  );
  const toolbarItems = reactExports.useMemo(() => {
    if (!toolbarActive) return EMPTY_TOOLBAR_ITEMS;
    const items = [
      {
        id: "add-to-chat",
        label: t2("canvas.addToChat"),
        icon: <AddToChatIcon />,
        dataActionUiId: "canvas.node-add-to-chat",
        onClick: handleAddToChat,
      },
    ];
    items.push({
      id: "clip",
      label: t2("canvas.clip"),
      icon: <ClipIcon />,
      onClick: handleClip,
    });
    if (enableFrameExtract) {
      items.push({
        id: "extract-frame",
        label: t2("canvas.extractFrame"),
        icon: <ExtractFrameIcon />,
        onClick: handleExtractFrame,
      });
    }
    if (onColorAdjust) {
      items.push({
        id: "color-adjust",
        label: t2("canvas.colorAdjust"),
        icon: <ColorAdjustIcon />,
        onClick: onColorAdjust,
      });
    }
    if (onExtractAudio) {
      items.push({
        id: "extract-audio",
        label: extractingAudio
          ? t2("canvas.extractingAudio")
          : t2("canvas.extractAudio"),
        icon: extractingAudio ? <ToolbarSpinnerIcon /> : <ExtractAudioIcon />,
        onClick: handleExtractAudio,
        disabled: extractingAudio,
      });
    }
    items.push({
      id: "fullscreen",
      label: t2("canvas.fullscreen"),
      icon: <FullscreenIcon$1 />,
      onClick: handleFullscreen,
    });
    if (onPromoteToAsset && meta2?.url) {
      items.push({
        id: "promote-to-asset",
        label: t2("canvas.promoteToAsset"),
        icon: <PromoteToAssetIcon />,
        forceLabel: true,
        dataActionUiId: "canvas.node-promote-to-asset",
        onClick: handlePromoteToAsset,
      });
    }
    return items;
  }, [
    toolbarActive,
    handleAddToChat,
    handleClip,
    handleExtractFrame,
    enableFrameExtract,
    handleExtractAudio,
    handleFullscreen,
    handlePromoteToAsset,
    onColorAdjust,
    onExtractAudio,
    onPromoteToAsset,
    meta2?.url,
    extractingAudio,
    t2,
  ]);
  return {
    showLightbox,
    lightboxIndexOverride,
    showClipPanel,
    showFramePanel,
    openLightbox: handleFullscreen,
    closeLightbox,
    closeClipPanel,
    closeFramePanel,
    handleClipExport,
    toolbarItems,
  };
}
