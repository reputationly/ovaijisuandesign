// use-project-delete.js
import {
  dedupedToast,
  reactExports,
  useQuery,
  useTranslation,
} from "../vendor.js";
import {
  fetchWorkspaceThumbnails,
  WORKSPACE_THUMBNAILS_STALE_TIME,
  workspaceThumbnailsQueryKey,
} from "./tool-label-definitions.js";
import { useGatewayReady } from "../infra/inline-rename-input.jsx";

const MIME_BY_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
  pdf: "application/pdf",
  json: "application/json",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  zip: "application/zip",
};

const TYPE_FALLBACK_MIME = {
  image: "image/*",
  audio: "audio/*",
  video: "video/*",
  file: "application/octet-stream",
};

export function inferArtifactMime(url2, type2) {
  if (!url2) return TYPE_FALLBACK_MIME[type2];
  const clean = url2.split("?")[0]?.split("#")[0] ?? "";
  const dot2 = clean.lastIndexOf(".");
  if (dot2 < 0) return TYPE_FALLBACK_MIME[type2];
  const ext = clean.slice(dot2 + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? TYPE_FALLBACK_MIME[type2];
}

export function useWorkspaceThumbnails(workspacePath, enabled = true) {
  const gatewayReady = useGatewayReady();
  return useQuery({
    queryKey: workspaceThumbnailsQueryKey(workspacePath),
    queryFn: () => fetchWorkspaceThumbnails(workspacePath),
    enabled: gatewayReady && enabled,
    staleTime: WORKSPACE_THUMBNAILS_STALE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useProjectDelete(deleteProject) {
  const { t: t2 } = useTranslation();
  const [pendingDelete, setPendingDelete] = reactExports.useState(null);
  const handleCancelDelete = reactExports.useCallback(
    () => setPendingDelete(null),
    [],
  );
  const handleConfirmDelete = reactExports.useCallback(() => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    void deleteProject(target).then((result) => {
      if (result.errorCode === "project-transfer-active") {
        dedupedToast.warning(t2("project.dissolve.transferActive"));
      } else if (result.errorCode === "project-hide-failed") {
        dedupedToast.error(t2("project.dissolve.failed"));
      } else if (
        result.errorMessage ||
        result.errorCode === "cloud-request-failed"
      ) {
        dedupedToast.error(
          result.errorMessage ?? t2("project.dissolve.failed"),
        );
      }
    });
  }, [deleteProject, pendingDelete, t2]);
  return {
    pendingDelete,
    requestDelete: setPendingDelete,
    confirmDelete: handleConfirmDelete,
    cancelDelete: handleCancelDelete,
  };
}
