// use-chat-file-reference-action.jsx
import { buildResourceDragItem } from "../text-editor/build-asr-gateway-request.js";
import { jsxRuntimeExports, PopoverPopup, PopoverPortal, PopoverPositioner, PopoverRoot, reactExports, useCurrentWorkspace, usePlatform, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { dispatchCanvasLocate } from "./dispatch-canvas-locate.js";
import { getNodeIdsForAsset } from "../infra/use-canvas-node-assets-store.js";
import { workspaceEvents } from "../workspace/topbar-state-context.jsx";
import { AlertDialog, Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { useAssets } from "../settings/use-assets.js";
import { openUrlInBuiltinBrowser } from "../workspace/resolve-retry-message-payload.jsx";
import { resolveChatFileReference } from "./resolve-chat-file-reference.js";
const MAX_ASSET_REFERENCE_LENGTH = 260;
function shouldResolveAssetList(raw2) {
  const text2 = raw2.trim();
  if (!text2 || text2.length > MAX_ASSET_REFERENCE_LENGTH) return false;
  if (/^https?:/i.test(text2)) return false;
  return true;
}
function isImmediatelyClickableChatFileReference(ref) {
  if (ref.kind === "workspace-file") return !!ref.workspaceRelativePath;
  if (ref.kind === "remote") return !!ref.url;
  return false;
}
function shouldInspectChatFileReference(ref) {
  if (ref.kind === "workspace-internal") return !!ref.absolutePath;
  if (ref.kind === "external-local") return !!ref.absolutePath || !!ref.rawPath;
  return false;
}
const LOCAL_REFERENCE_INSPECT_CACHE_TTL_MS = 15e3;
const localReferenceInspectionCache = new Map();
const localReferenceInspectionInflight = new Map();
function blockedToastKey(result) {
  if (result.status !== "blocked") return "fileExplorer.cannotOpenFolder";
  if (result.reason === "sensitive-path")
    return "chat.fileReference.sensitivePath";
  if (result.reason === "invalid-consent")
    return "chat.fileReference.permissionExpired";
  return "fileExplorer.cannotOpenFolder";
}
function basename(value) {
  if (!value) return "";
  const clean = value.split(/[?#]/)[0]?.replace(/\\/g, "/") ?? value;
  return clean.split("/").filter(Boolean).pop() ?? clean;
}
function workspaceImageCanvasItem(ref) {
  if (ref.kind !== "workspace-file") return void 0;
  if (!ref.workspaceRelativePath || !ref.absolutePath || !ref.assetId)
    return void 0;
  const name2 = basename(ref.workspaceRelativePath) || ref.displayName;
  if (!name2) return void 0;
  const item = buildResourceDragItem(
    ref.absolutePath,
    ref.workspaceRelativePath,
    name2,
    false,
    ref.assetId,
  );
  return item.type === "image" ? item : void 0;
}
function isOpenableInspectResult(result) {
  return result.status === "openable" || result.status === "needs-consent";
}
function localInspectionRawPath(ref) {
  if (ref.kind === "workspace-internal") return ref.absolutePath;
  if (ref.kind === "external-local") return ref.absolutePath ?? ref.rawPath;
  return void 0;
}
function localInspectionCacheKey(rawPath, currentWorkspace, os2) {
  return `${os2 ?? "unknown"}\0${currentWorkspace ?? ""}\0${rawPath}`;
}
function cachedLocalReferenceOpenable(cacheKey) {
  const cached = localReferenceInspectionCache.get(cacheKey);
  if (!cached) return void 0;
  if (cached.expiresAt <= Date.now()) {
    localReferenceInspectionCache.delete(cacheKey);
    return void 0;
  }
  return cached.openable;
}
async function fallbackLocalReferenceOpenable(rawPath, exists) {
  try {
    return await exists(rawPath);
  } catch {
    return false;
  }
}
export function useChatFileReferenceAction(raw2) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const currentWorkspace = useCurrentWorkspace();
  const { assets } = useAssets({
    enabled: shouldResolveAssetList(raw2),
  });
  const [pendingConsent, setPendingConsent] = reactExports.useState(null);
  const [insertPromptOpen, setInsertPromptOpen] = reactExports.useState(false);
  const [insertPromptAnchor, setInsertPromptAnchor] =
    reactExports.useState(null);
  const postInsertFocusTimerRef = reactExports.useRef(null);
  const ref = reactExports.useMemo(
    () =>
      resolveChatFileReference(raw2, {
        currentWorkspace,
        assets,
      }),
    [assets, currentWorkspace, raw2],
  );
  const [locallyOpenable, setLocallyOpenable] = reactExports.useState(false);
  const localRawPath = localInspectionRawPath(ref);
  const needsLocalInspection =
    shouldInspectChatFileReference(ref) && !!localRawPath;
  const clickable =
    isImmediatelyClickableChatFileReference(ref) ||
    (needsLocalInspection && locallyOpenable);
  const imageCanvasItem = reactExports.useMemo(
    () => workspaceImageCanvasItem(ref),
    [ref],
  );
  const inspectFileReference = platform2.shell.inspectFileReference;
  const fsExists = platform2.fs.exists;
  const platformOs = platform2.app?.os;
  reactExports.useEffect(() => {
    if (!needsLocalInspection || !localRawPath) {
      setLocallyOpenable(false);
      return;
    }
    const cacheKey = localInspectionCacheKey(
      localRawPath,
      currentWorkspace,
      platformOs,
    );
    const cached = cachedLocalReferenceOpenable(cacheKey);
    if (cached !== void 0) {
      setLocallyOpenable(cached);
      return;
    }
    let disposed = false;
    setLocallyOpenable(false);
    const inflight =
      localReferenceInspectionInflight.get(cacheKey) ??
      (inspectFileReference
        ? inspectFileReference({
            rawPath: localRawPath,
            currentWorkspace,
          })
            .then(isOpenableInspectResult)
            .catch(() => fallbackLocalReferenceOpenable(localRawPath, fsExists))
        : fallbackLocalReferenceOpenable(localRawPath, fsExists)
      ).finally(() => {
        localReferenceInspectionInflight.delete(cacheKey);
      });
    localReferenceInspectionInflight.set(cacheKey, inflight);
    void inflight.then((openable) => {
      localReferenceInspectionCache.set(cacheKey, {
        openable,
        expiresAt: Date.now() + LOCAL_REFERENCE_INSPECT_CACHE_TTL_MS,
      });
      if (!disposed) setLocallyOpenable(openable);
    });
    return () => {
      disposed = true;
    };
  }, [
    currentWorkspace,
    fsExists,
    inspectFileReference,
    localRawPath,
    needsLocalInspection,
    platformOs,
  ]);
  const revealLocalFile = reactExports.useCallback(
    async (rawPath, consent, consentToken) => {
      const reveal = platform2.shell.revealFileReference;
      if (!reveal) {
        dedupedToast.error(t2("fileExplorer.cannotOpenFolder"));
        return;
      }
      let result;
      try {
        result = await reveal({
          rawPath,
          currentWorkspace,
          consent,
          consentToken,
        });
      } catch {
        dedupedToast.error(t2("fileExplorer.cannotOpenFolder"));
        return;
      }
      if (result.status === "needs-consent") {
        setPendingConsent({
          path: result.path,
          directory: result.directory,
          consentToken: result.consentToken,
        });
        return;
      }
      setPendingConsent(null);
      if (result.status === "blocked") {
        dedupedToast.error(t2(blockedToastKey(result)));
      }
    },
    [currentWorkspace, platform2.shell.revealFileReference, t2],
  );
  reactExports.useEffect(() => {
    return () => {
      if (postInsertFocusTimerRef.current != null) {
        window.clearTimeout(postInsertFocusTimerRef.current);
      }
    };
  }, []);
  const focusInsertedImage = reactExports.useCallback(
    (attempt = 0) => {
      if (!imageCanvasItem?.assetId || !currentWorkspace) return;
      const nodeIds = getNodeIdsForAsset(
        imageCanvasItem.assetId,
        currentWorkspace,
      );
      if (nodeIds.length > 0) {
        workspaceEvents.fireCanvasFocus(currentWorkspace, nodeIds);
        return;
      }
      if (attempt >= 12) return;
      postInsertFocusTimerRef.current = window.setTimeout(
        () => focusInsertedImage(attempt + 1),
        120,
      );
    },
    [currentWorkspace, imageCanvasItem?.assetId],
  );
  const handleInsertToCanvas = reactExports.useCallback(() => {
    if (!imageCanvasItem) return;
    workspaceEvents.fireAddToCanvas([imageCanvasItem]);
    setInsertPromptOpen(false);
    if (postInsertFocusTimerRef.current != null) {
      window.clearTimeout(postInsertFocusTimerRef.current);
    }
    focusInsertedImage();
  }, [focusInsertedImage, imageCanvasItem]);
  const activate = reactExports.useCallback(
    (anchor) => {
      if (
        ref.kind === "workspace-file" &&
        ref.workspaceRelativePath &&
        currentWorkspace
      ) {
        if (imageCanvasItem?.assetId) {
          const nodeIds = getNodeIdsForAsset(
            imageCanvasItem.assetId,
            currentWorkspace,
          );
          if (nodeIds.length > 0) {
            setInsertPromptOpen(false);
            workspaceEvents.fireCanvasFocus(currentWorkspace, nodeIds);
            return;
          }
          if (anchor) setInsertPromptAnchor(anchor);
          setInsertPromptOpen(true);
          return;
        }
        dispatchCanvasLocate(ref.workspaceRelativePath, currentWorkspace);
        return;
      }
      if (ref.kind === "workspace-internal" && ref.absolutePath) {
        void revealLocalFile(ref.absolutePath);
        return;
      }
      if (ref.kind === "external-local") {
        void revealLocalFile(ref.absolutePath ?? ref.rawPath);
        return;
      }
      if (ref.kind === "remote" && ref.url) {
        void openUrlInBuiltinBrowser(platform2, ref.url, {
          source: "chat.file-reference",
        });
      }
    },
    [currentWorkspace, imageCanvasItem, platform2, ref, revealLocalFile],
  );
  const handleClick2 = reactExports.useCallback(
    (event) => {
      if (!clickable) return;
      event.preventDefault();
      event.stopPropagation();
      activate(event.currentTarget);
    },
    [activate, clickable],
  );
  const handleKeyDown2 = reactExports.useCallback(
    (event) => {
      if (!clickable) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      activate(event.currentTarget);
    },
    [activate, clickable],
  );
  const handleRevealWithConsent = reactExports.useCallback(
    (consent) => {
      if (!pendingConsent) return;
      void revealLocalFile(
        pendingConsent.path,
        consent,
        pendingConsent.consentToken,
      );
    },
    [pendingConsent, revealLocalFile],
  );
  const permissionDialog = (
    <>
      <AlertDialog
        open={!!pendingConsent}
        onOpenChange={(open) => {
          if (!open) setPendingConsent(null);
        }}
      >
        <AlertDialogContent data-action-ui-id="chat-file-reference-permission-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t2("chat.fileReference.permissionTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t2("chat.fileReference.permissionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingConsent && (
            <div className="min-w-0 rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground/70 break-all">
              {pendingConsent.path}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-action-ui-id="chat-file-reference-permission-cancel">
              {t2("common.cancel")}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              data-action-ui-id="chat-file-reference-permission-once"
              onClick={() => handleRevealWithConsent("once")}
            >
              {t2("chat.fileReference.openOnce")}
            </Button>
            <Button
              type="button"
              data-action-ui-id="chat-file-reference-permission-trust-folder"
              onClick={() => handleRevealWithConsent("trust-folder")}
            >
              {t2("chat.fileReference.trustFolder")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PopoverRoot open={insertPromptOpen} onOpenChange={setInsertPromptOpen}>
        {insertPromptOpen && insertPromptAnchor && (
          <PopoverPortal>
            <PopoverPositioner
              anchor={insertPromptAnchor}
              align="center"
              side="right"
              sideOffset={8}
              className="isolate z-50"
            >
              <PopoverPopup
                data-slot="chat-file-reference-locate-missing-popover"
                className={cn(
                  "elevated-surface-border z-50 flex w-64 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-lg outline-hidden",
                  "dp-motion-quick-zoom",
                )}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm text-foreground">
                    {t2("fileExplorer.locateMissing.title")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t2("fileExplorer.locateMissing.description")}
                  </span>
                </div>
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setInsertPromptOpen(false)}
                    data-action-ui-id="chat-file-reference-locate-missing-cancel"
                  >
                    {t2("common.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleInsertToCanvas}
                    data-action-ui-id="chat-file-reference-locate-missing-confirm"
                  >
                    {t2("fileExplorer.locateMissing.confirm")}
                  </Button>
                </div>
              </PopoverPopup>
            </PopoverPositioner>
          </PopoverPortal>
        )}
      </PopoverRoot>
    </>
  );
  return {
    ref,
    clickable,
    handleClick: handleClick2,
    handleKeyDown: handleKeyDown2,
    permissionDialog,
  };
}
