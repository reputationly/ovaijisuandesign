// use-project-asset-references.jsx
import {
  reactExports,
  useCurrentWorkspace,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  PreviewCard$1,
  PreviewCardContent,
  PreviewCardTrigger,
} from "./use-placeholder-asset-source.jsx";
import { EntityHoverCardBody } from "../assets/attachment-row.jsx";
import { detectFileType } from "../canvas/diagnostic-history-tools.js";
import { useWorkspaceProject } from "../workspace/normalize-project-entries.js";
import { useProjectAssetsService } from "../infra/new-folder-dialog.jsx";
import { useProjectActions } from "../settings/use-project-actions.js";
import { useGatewayFetch } from "../generation/use-model-catalog-scope-key.js";
import {
  CANVAS_REFERENCE_API,
  mapCanvasReferenceCandidates,
} from "./table-document-to-llm-content.js";
import { mapCanvasReferenceResolutions } from "./map-canvas-reference-resolutions.js";

function useProjectAssetReferences(workspace) {
  const projectId = useWorkspaceProject(workspace || void 0)?.id;
  const { ensureProjectFolderName } = useProjectActions();
  const assets = useProjectAssetsService();
  const searchProjectAssets = reactExports.useCallback(
    async (query, limit = 50, signal) => {
      const empty2 = {
        items: [],
        truncated: false,
      };
      if (!projectId || signal?.aborted) return empty2;
      const scope = await ensureProjectFolderName(projectId);
      if (!scope || signal?.aborted) return empty2;
      const rows = await assets.listAssets(scope);
      if (signal?.aborted) return empty2;
      const normalized = query.trim().toLocaleLowerCase();
      const matches2 = rows.filter(
        (row) =>
          !normalized || row.name.toLocaleLowerCase().includes(normalized),
      );
      return {
        items: matches2.slice(0, limit).map((row) => {
          const type2 = detectFileType(row.name);
          const kind =
            type2 === "image" ||
            type2 === "video" ||
            type2 === "audio" ||
            type2 === "text"
              ? type2
              : "other";
          const reference = {
            source: "project",
            scope,
            id: row.id,
            name: row.name,
            kind,
          };
          return {
            reference,
            updatedAt: row.updatedAt,
          };
        }),
        truncated: matches2.length > limit,
      };
    },
    [assets, ensureProjectFolderName, projectId],
  );
  return {
    searchProjectAssets,
  };
}

function CanvasReferencePreview({ reference, trigger, status }) {
  const { t: t2 } = useTranslation();
  const missing = status === "deleted" || status === "missing";
  return (
    <PreviewCard$1>
      <PreviewCardTrigger render={trigger} />
      <PreviewCardContent side="top" sideOffset={8}>
        {missing ? (
          <p className="p-3 text-sm text-muted-foreground">
            {reference.source === "subject"
              ? t2("canvas.reference.subjectNotFound", "Subject not found")
              : t2("canvas.reference.assetNotFound", "Asset not found")}
          </p>
        ) : reference.target === "entity" ? (
          <EntityHoverCardBody entityId={reference.id} />
        ) : null}
      </PreviewCardContent>
    </PreviewCard$1>
  );
}

const renderPreview = (props) =>
  reactExports.createElement(CanvasReferencePreview, props);

export function useCanvasReferenceBridge() {
  const workspace = useCurrentWorkspace();
  const { searchProjectAssets } = useProjectAssetReferences(workspace);
  const fetcher = useGatewayFetch();
  return reactExports.useMemo(
    () => ({
      renderPreview,
      async searchCandidates(query) {
        const response = await fetcher(
          `${CANVAS_REFERENCE_API.search}?q=${encodeURIComponent(query)}`,
        );
        if (!response.ok) throw new Error("Reference search unavailable");
        const subjects = mapCanvasReferenceCandidates(await response.json());
        const projects = await searchProjectAssets(query);
        return [
          ...projects.items.map(({ reference }) => ({
            id: `${reference.scope}/${reference.id}`,
            name: reference.name,
            source: reference.source,
            references: [reference],
          })),
          ...subjects,
        ];
      },
      async checkAvailability(references, options) {
        const endpoint = options?.include_metadata
          ? `${CANVAS_REFERENCE_API.resolve}?include_metadata=true`
          : CANVAS_REFERENCE_API.resolve;
        const response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(references),
        });
        if (!response.ok) throw new Error("Reference resolution unavailable");
        return mapCanvasReferenceResolutions(await response.json(), references);
      },
    }),
    [fetcher, searchProjectAssets],
  );
}
