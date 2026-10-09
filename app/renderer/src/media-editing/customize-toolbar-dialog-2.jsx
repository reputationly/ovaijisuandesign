// customize-toolbar-dialog-2.jsx
import {
  DEFAULT_PINNED$1,
  DEFAULT_SHOW_LABELS$1,
  IMAGE_TOOLBAR_TOOLS,
  LEGACY_IMAGE_TOOLBAR_TOOLS,
  MultiImageOverlayStoreContext,
} from "./use-start-cloud-edit-from-node.js";
import { IMAGE_TOOL_META } from "./image-tool-meta.jsx";
import { reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { useImageToolbarCustomizationStore } from "./read-persisted.js";
import {
  AddToChatIcon,
  AnnotationIcon,
  FullscreenIcon$1,
} from "../canvas/fullscreen-icon.jsx";
import { PromoteToAssetIcon } from "../canvas/generating-media-area.jsx";
import { CustomizeToolbarDialog$2 } from "./customize-toolbar-dialog.jsx";

const IMAGE_TOOLBAR_DEFAULT_PINNED = DEFAULT_PINNED$1;

const IMAGE_TOOLBAR_DEFAULT_SHOW_LABELS = DEFAULT_SHOW_LABELS$1;

const TOOL_META = IMAGE_TOOL_META;

const DEFAULTS$2 = {
  pinned: IMAGE_TOOLBAR_DEFAULT_PINNED,
  showLabels: IMAGE_TOOLBAR_DEFAULT_SHOW_LABELS,
};

export function CustomizeToolbarDialog$1({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  const store = useImageToolbarCustomizationStore();
  const allToolIds =
    store.layoutVersion === 1
      ? LEGACY_IMAGE_TOOLBAR_TOOLS
      : IMAGE_TOOLBAR_TOOLS;
  const fixedRightChips = [
    {
      id: "promote-to-asset",
      icon: <PromoteToAssetIcon />,
      label: t2("canvas.promoteToAsset"),
      showLabel: true,
    },
    {
      id: "image-inplace-edit",
      icon: <AnnotationIcon size={20} />,
      label: t2("canvas.imageEdit.label", "Edit Image"),
      showLabel: false,
    },
    {
      id: "add-to-chat",
      icon: <AddToChatIcon />,
      label: t2("canvas.addToChat"),
      showLabel: false,
    },
    {
      id: "fullscreen",
      icon: <FullscreenIcon$1 />,
      label: t2("canvas.fullscreen"),
      showLabel: false,
    },
  ];
  return (
    <CustomizeToolbarDialog$2
      open={open}
      onOpenChange={onOpenChange}
      allToolIds={allToolIds}
      toolMeta={TOOL_META}
      store={store}
      defaults={DEFAULTS$2}
      fixedRightChips={fixedRightChips}
    />
  );
}

export function MultiImageOverlayStoreProvider({ store, children: children2 }) {
  return reactExports.createElement(
    MultiImageOverlayStoreContext.Provider,
    {
      value: store,
    },
    children2,
  );
}
