import { useCanvasActive as useCanvasActive$1, useCanvasBridge as useCanvasBridge$1 } from "../media-editing/package.jsx";
import { TableAttachmentLightbox } from "./menu-item-class.jsx";
import { TableEditorHostProvider } from "./table-editor-host-context.jsx";
import { default as reactExports } from "react";
import { __jsx } from "../shared/jsx-runtime.js";
export function LegacyTableEditorHostProvider({ children: children2 }) {
  const { pickAsset } = useCanvasBridge$1();
  const active2 = useCanvasActive$1();
  const host = reactExports.useMemo(
    () => ({
      active: active2,
      pickAsset,
      AttachmentLightbox: TableAttachmentLightbox,
    }),
    [active2, pickAsset],
  );
  return <TableEditorHostProvider value={host}>{children2}</TableEditorHostProvider>;
}

export function withLegacyTableHost(Component) {
  function LegacyTableHosted(props) {
    return (
      <LegacyTableEditorHostProvider>
        <Component {...props} />
      </LegacyTableEditorHostProvider>
    );
  }
  LegacyTableHosted.displayName = `LegacyTableHosted(${Component.displayName ?? Component.name})`;
  return LegacyTableHosted;
}
