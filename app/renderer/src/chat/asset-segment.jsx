import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { withThumbnailWidth } from "../workspace/tool-label-definitions.js";
import { FileKindIcon } from "./use-composer-placeholder-actions.jsx";
import { CANVAS_V3_ROUTES } from "./use-required-gateway-scope.jsx";
import { default as reactExports } from "react";
import { __jsx } from "../shared/jsx-runtime.js";
export function AssetSegment({ segment }) {
  const gatewayUrl2 = useGatewayUrl();
  const source = gatewayUrl2(
    `${CANVAS_V3_ROUTES.images}/${encodeURIComponent(segment.resourceId)}/${encodeURIComponent(segment.versionId)}`,
  );
  const [failedSource, setFailedSource] = reactExports.useState(null);
  const showPreview = Boolean(source && failedSource !== source);
  return (
    <span
      className="hl-asset-context inline-flex size-16 overflow-hidden rounded-lg border border-border bg-muted align-middle"
      data-mention-kind="asset"
      data-resource-id={segment.resourceId}
      data-version-id={segment.versionId}
    >
      {showPreview ? (
        <img
          src={withThumbnailWidth(source, 160)}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedSource(source ?? null)}
        />
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground" aria-hidden={true}>
          <FileKindIcon kind="image" />
        </span>
      )}
    </span>
  );
}
