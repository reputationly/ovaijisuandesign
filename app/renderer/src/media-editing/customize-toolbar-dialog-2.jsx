// customize-toolbar-dialog-2.jsx
import {
  DEFAULT_PINNED,
  DEFAULT_SHOW_LABELS,
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
  FullscreenIcon,
} from "../canvas/fullscreen-icon.jsx";
import { PromoteToAssetIcon } from "../canvas/generating-media-area.jsx";
import { CustomizeToolbarDialog as CustomizeToolbarDialogBase } from "./customize-toolbar-dialog.jsx";
const IMAGE_TOOLBAR_DEFAULT_PINNED = DEFAULT_PINNED;
const IMAGE_TOOLBAR_DEFAULT_SHOW_LABELS = DEFAULT_SHOW_LABELS;
const TOOL_META = IMAGE_TOOL_META;
const DEFAULTS = {
  pinned: IMAGE_TOOLBAR_DEFAULT_PINNED,
  showLabels: IMAGE_TOOLBAR_DEFAULT_SHOW_LABELS,
};
export function CustomizeToolbarDialog({ open, onOpenChange }) {
  const { t } = useTranslation();
  const store = useImageToolbarCustomizationStore();
  const allToolIds =
    store.layoutVersion === 1
      ? LEGACY_IMAGE_TOOLBAR_TOOLS
      : IMAGE_TOOLBAR_TOOLS;
  const fixedRightChips = [
    {
      id: "promote-to-asset",
      icon: <PromoteToAssetIcon />,
      label: t("canvas.promoteToAsset"),
      showLabel: true,
    },
    {
      id: "image-inplace-edit",
      icon: <AnnotationIcon size={20} />,
      label: t("canvas.imageEdit.label", "Edit Image"),
      showLabel: false,
    },
    {
      id: "add-to-chat",
      icon: <AddToChatIcon />,
      label: t("canvas.addToChat"),
      showLabel: false,
    },
    {
      id: "fullscreen",
      icon: <FullscreenIcon />,
      label: t("canvas.fullscreen"),
      showLabel: false,
    },
  ];
  return (
    <CustomizeToolbarDialogBase
      open={open}
      onOpenChange={onOpenChange}
      allToolIds={allToolIds}
      toolMeta={TOOL_META}
      store={store}
      defaults={DEFAULTS}
      fixedRightChips={fixedRightChips}
    />
  );
}
export function MultiImageOverlayStoreProvider({ store, children }) {
  return reactExports.createElement(
    MultiImageOverlayStoreContext.Provider,
    {
      value: store,
    },
    children,
  );
}
