// use-chat-file-reference-action.jsx
import { jsxRuntimeExports, reactExports, useTranslation, useCurrentWorkspace, dedupedToast, API_PATHS, usePlatform, classifyFileType, Video, PopoverRoot, PopoverPortal, PopoverPositioner, PopoverPopup, ArrowUpRight, Globe, ExternalLink, Copy } from "../vendor.js";
import { FileTypeIcon } from "../m15/create-recently-added-store.jsx";
import { useResolveMediaUrl, withThumbnail, DeferredThumbnailImage } from "../m15/deferred-thumbnail-image-generation.jsx";
import { openExternalUrl } from "../m15/graph.jsx";
import { ImageOutlineIcon, FileAudio, File$1 } from "../m15/parse-item.jsx";
import { detectFileType } from "../m15/relayout-group-children.js";
import { TRACK_EVENTS, getNodeIdsForAsset } from "../m15/track-events.js";
import { workspaceEvents, ContextMenu } from "../m15/use-hub-logo-hover-animation.jsx";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  cn$2,
  Button$1,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { SkillIcon } from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { buildResourceDragItem } from "../m01/myers-line-hunks.js";
import { useAssets } from "../m10/use-media-actions.jsx";
import { openUrlInBuiltinBrowser } from "../m11/use-workspace-canvas-persistence.jsx";
import { resolveTrackingDomain } from "../m07/en.jsx";
import {
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "../m10/new-workspace-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  hasLocalFileLinkProtocol,
  resolveChatFileReference,
  shouldResolveAssetList,
} from "./resolve-chat-file-reference.js";
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
export function FileReferenceVisual({ filename, workspacePath }) {
  const resolveMediaUrl2 = useResolveMediaUrl();
  const type2 = detectFileType(filename);
  const safePath =
    workspacePath &&
    !/^(?:[\\/]|[a-z][a-z0-9+.-]*:)/i.test(workspacePath) &&
    !workspacePath.split(/[\\/]/).includes("..")
      ? workspacePath
      : void 0;
  const previewUrl =
    safePath && (type2 === "image" || type2 === "video")
      ? withThumbnail(
          resolveMediaUrl2(
            type2 === "video" ? API_PATHS.thumbnail(safePath) : API_PATHS.serveFile(safePath),
          ),
          14,
          {
            format: "webp",
            fallback: "error",
          },
        )
      : void 0;
  const [failedUrl, setFailedUrl] = reactExports.useState();
  const [loadedUrl, setLoadedUrl] = reactExports.useState();
  if (type2 !== "image" && type2 !== "video" && type2 !== "audio") {
    return (
      <FileTypeIcon
        {...classifyFileType({
          filename,
        })}
        size={14}
        decorative={true}
      />
    );
  }
  const MediaIcon = type2 === "image" ? ImageOutlineIcon : type2 === "video" ? Video : FileAudio;
  const showThumbnail = previewUrl && failedUrl !== previewUrl;
  return (
    <span
      className="relative inline-flex size-3.5 shrink-0 items-center justify-center text-muted-foreground"
      data-media-kind={type2}
      aria-hidden="true"
    >
      {(!showThumbnail || loadedUrl !== previewUrl) && (
        <MediaIcon className="size-3.5" strokeWidth={1.5} />
      )}
      {showThumbnail && (
        <DeferredThumbnailImage
          src={previewUrl}
          alt=""
          draggable={false}
          maxRetries={2}
          className={`absolute inset-0 size-full rounded-[2px] object-cover ${loadedUrl === previewUrl ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoadedUrl(previewUrl)}
          onFailure={() => setFailedUrl(previewUrl)}
        />
      )}
    </span>
  );
}
function tryParseSkillCard(raw2) {
  try {
    const data2 = JSON.parse(raw2);
    if (typeof data2.name !== "string") return null;
    return {
      name: data2.name,
      guidePrompt: typeof data2.guidePrompt === "string" ? data2.guidePrompt : void 0,
    };
  } catch {
    return null;
  }
}
export function InlineSkillCard({ content: content2 }) {
  const { t: t2 } = useTranslation();
  const data2 = reactExports.useMemo(() => tryParseSkillCard(content2), [content2]);
  const handleTry = reactExports.useCallback(() => {
    if (!data2) return;
    const skill = {
      name: data2.name,
      guidePrompt: data2.guidePrompt ?? "",
    };
    workspaceEvents.fireAddSkillToChat(skill);
  }, [data2]);
  if (!data2) return null;
  return (
    <div className="not-prose my-2 flex items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <SkillIcon size={16} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{data2.name}</span>
        <span className="text-xs text-muted-foreground">{t2("skills.skillLabel", "Skill")}</span>
      </div>
      <Button$1
        size="sm"
        data-action-ui-id="inline-skill-card-try"
        className="shrink-0 text-xs h-7"
        onClick={handleTry}
      >
        {t2("skills.trySkill", "开始使用")}
      </Button$1>
    </div>
  );
}
const MARKDOWN_LINK_RE = /\[([^\]\n]*)\]\(([^)\n]+)\)/g;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const AUTOLINK_RE = /<([^>\n]+)>/g;
const REFERENCE_DEFINITION_RE = /^\s*\[([^\]\n]+)\]:\s*(\S+).*$/gim;
const PATH_TOKEN_RE = /[^\s`<>(){}"']+/g;
const INTERNAL_ROOT_RE =
  /(?:^|\/)\.(?:opencode-v2|config-v2)\/(?:knowledge|contracts|workflows)\//i;
const INTERNAL_DIR_PLACEHOLDER_RE = /^<(?:knowledge|contracts|workflows)Dir>\//i;
const INTERNAL_RELATIVE_ROOT_RE = /^(?:knowledge|contracts|workflows)\//i;
const INTERNAL_VENDOR_CARD_RE =
  /^vendors\/[a-z0-9][a-z0-9._-]*\.md(?:[?#][^\s]*)?(?:[.,;:!?，。；：！？])?$/i;
const WORKFLOW_ENTRY_RE = /^[^/]+\/workflow\.md(?:[?#].*)?$/i;
function normalizeReference(value) {
  const trimmed = value.trim().replace(/^['"]+|['"]+$/g, "");
  try {
    return decodeURIComponent(trimmed).replace(/\\/g, "/");
  } catch {
    return trimmed.replace(/\\/g, "/");
  }
}
function isInternalKnowledgeReference(value) {
  const normalized = normalizeReference(value);
  return (
    INTERNAL_ROOT_RE.test(normalized) ||
    INTERNAL_DIR_PLACEHOLDER_RE.test(normalized) ||
    INTERNAL_RELATIVE_ROOT_RE.test(normalized) ||
    INTERNAL_VENDOR_CARD_RE.test(normalized) ||
    WORKFLOW_ENTRY_RE.test(normalized)
  );
}
function neutralLabel(value, labels) {
  return /(?:^|\/)workflow\.md(?:[?#].*)?$/i.test(normalizeReference(value))
    ? labels.workflow
    : labels.material;
}
export function redactInternalKnowledgeReferences(content2, labels) {
  const internalDefinitions = new Map();
  const withoutDefinitions = content2.replace(REFERENCE_DEFINITION_RE, (match2, id2, target) => {
    if (!isInternalKnowledgeReference(target)) return match2;
    internalDefinitions.set(id2.trim().toLowerCase(), target);
    return "";
  });
  let withoutInternalLinks = withoutDefinitions;
  for (const [id2, target] of internalDefinitions) {
    const escapedId = id2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    withoutInternalLinks = withoutInternalLinks.replace(
      new RegExp(`\\[([^\\]\\n]*)\\]\\[${escapedId}\\]`, "gi"),
      neutralLabel(target, labels),
    );
  }
  withoutInternalLinks = withoutInternalLinks.replace(MARKDOWN_LINK_RE, (match2, _label, target) =>
    isInternalKnowledgeReference(target) ? neutralLabel(target, labels) : match2,
  );
  withoutInternalLinks = withoutInternalLinks.replace(AUTOLINK_RE, (match2, target) =>
    isInternalKnowledgeReference(target) ? neutralLabel(target, labels) : match2,
  );
  withoutInternalLinks = withoutInternalLinks.replace(INLINE_CODE_RE, (match2, target) =>
    isInternalKnowledgeReference(target) ? neutralLabel(target, labels) : match2,
  );
  return withoutInternalLinks.replace(PATH_TOKEN_RE, (token2) =>
    isInternalKnowledgeReference(token2) ? neutralLabel(token2, labels) : token2,
  );
}
export function dispatchCanvasLocate(path2, workspaceId2) {
  if (!path2 || !workspaceId2) return;
  workspaceEvents.fireLocateCanvasFile(workspaceId2, path2);
}
const LOCAL_REFERENCE_INSPECT_CACHE_TTL_MS = 15e3;
const localReferenceInspectionCache = new Map();
const localReferenceInspectionInflight = new Map();
function blockedToastKey(result) {
  if (result.status !== "blocked") return "fileExplorer.cannotOpenFolder";
  if (result.reason === "sensitive-path") return "chat.fileReference.sensitivePath";
  if (result.reason === "invalid-consent") return "chat.fileReference.permissionExpired";
  return "fileExplorer.cannotOpenFolder";
}
function basename$4(value) {
  if (!value) return "";
  const clean = value.split(/[?#]/)[0]?.replace(/\\/g, "/") ?? value;
  return clean.split("/").filter(Boolean).pop() ?? clean;
}
function workspaceImageCanvasItem(ref) {
  if (ref.kind !== "workspace-file") return void 0;
  if (!ref.workspaceRelativePath || !ref.absolutePath || !ref.assetId) return void 0;
  const name2 = basename$4(ref.workspaceRelativePath) || ref.displayName;
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
  const [insertPromptAnchor, setInsertPromptAnchor] = reactExports.useState(null);
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
  const needsLocalInspection = shouldInspectChatFileReference(ref) && !!localRawPath;
  const clickable =
    isImmediatelyClickableChatFileReference(ref) || (needsLocalInspection && locallyOpenable);
  const imageCanvasItem = reactExports.useMemo(() => workspaceImageCanvasItem(ref), [ref]);
  const inspectFileReference = platform2.shell.inspectFileReference;
  const fsExists = platform2.fs.exists;
  const platformOs = platform2.app?.os;
  reactExports.useEffect(() => {
    if (!needsLocalInspection || !localRawPath) {
      setLocallyOpenable(false);
      return;
    }
    const cacheKey = localInspectionCacheKey(localRawPath, currentWorkspace, platformOs);
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
      const nodeIds = getNodeIdsForAsset(imageCanvasItem.assetId, currentWorkspace);
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
      if (ref.kind === "workspace-file" && ref.workspaceRelativePath && currentWorkspace) {
        if (imageCanvasItem?.assetId) {
          const nodeIds = getNodeIdsForAsset(imageCanvasItem.assetId, currentWorkspace);
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
      void revealLocalFile(pendingConsent.path, consent, pendingConsent.consentToken);
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
            <AlertDialogTitle>{t2("chat.fileReference.permissionTitle")}</AlertDialogTitle>
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
            <Button$1
              type="button"
              variant="outline"
              data-action-ui-id="chat-file-reference-permission-once"
              onClick={() => handleRevealWithConsent("once")}
            >
              {t2("chat.fileReference.openOnce")}
            </Button$1>
            <Button$1
              type="button"
              data-action-ui-id="chat-file-reference-permission-trust-folder"
              onClick={() => handleRevealWithConsent("trust-folder")}
            >
              {t2("chat.fileReference.trustFolder")}
            </Button$1>
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
                className={cn$2(
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
                  <Button$1
                    size="sm"
                    variant="ghost"
                    onClick={() => setInsertPromptOpen(false)}
                    data-action-ui-id="chat-file-reference-locate-missing-cancel"
                  >
                    {t2("common.cancel")}
                  </Button$1>
                  <Button$1
                    size="sm"
                    onClick={handleInsertToCanvas}
                    data-action-ui-id="chat-file-reference-locate-missing-confirm"
                  >
                    {t2("fileExplorer.locateMissing.confirm")}
                  </Button$1>
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
function isWebLink(href) {
  if (!href) return false;
  try {
    const url2 = new URL(href);
    return url2.protocol === "http:" || url2.protocol === "https:";
  } catch {
    return false;
  }
}
function trackChatLinkAction(properties2) {
  trackEvent(TRACK_EVENTS.CHAT_LINK_ACTION, {
    ...properties2,
  });
}
export function MarkdownLink({ href, children: children2, className, node: _node, ...rest }) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const fileReferenceAction = useChatFileReferenceAction(href ?? "");
  const isNonClickableFileReference =
    (fileReferenceAction.ref.kind !== "none" || hasLocalFileLinkProtocol(href ?? "")) &&
    !fileReferenceAction.clickable;
  const isLocalFile =
    fileReferenceAction.clickable &&
    (fileReferenceAction.ref.kind === "external-local" ||
      fileReferenceAction.ref.kind === "workspace-internal");
  const isBrowserLink = isWebLink(href);
  const targetDomain = resolveTrackingDomain(href ?? "") ?? "unknown";
  const handleClick2 = reactExports.useCallback(
    (event) => {
      if (!href) return;
      if (isBrowserLink) {
        event.preventDefault();
        void openUrlInBuiltinBrowser(platform2, href, {
          source: "chat.markdown-link",
        })
          .then((opened) => {
            trackChatLinkAction({
              action: "open_builtin",
              trigger: "direct_click",
              target_domain: targetDomain,
              result: opened ? "accepted" : "failed",
            });
          })
          .catch(() => {
            trackChatLinkAction({
              action: "open_builtin",
              trigger: "direct_click",
              target_domain: targetDomain,
              result: "failed",
            });
          });
        return;
      }
      if (fileReferenceAction.clickable) {
        fileReferenceAction.handleClick(event);
        return;
      }
      event.preventDefault();
      void openUrlInBuiltinBrowser(platform2, href, {
        source: "chat.markdown-link",
      });
    },
    [
      fileReferenceAction.clickable,
      fileReferenceAction.handleClick,
      href,
      isBrowserLink,
      platform2,
      targetDomain,
    ],
  );
  const handleOpenBuiltin = reactExports.useCallback(() => {
    if (!href) return;
    void openUrlInBuiltinBrowser(platform2, href, {
      source: "chat.markdown-link.context-menu.builtin",
    })
      .then((opened) => {
        trackChatLinkAction({
          action: "open_builtin",
          trigger: "context_menu",
          target_domain: targetDomain,
          result: opened ? "accepted" : "failed",
        });
      })
      .catch(() => {
        trackChatLinkAction({
          action: "open_builtin",
          trigger: "context_menu",
          target_domain: targetDomain,
          result: "failed",
        });
      });
  }, [href, platform2, targetDomain]);
  const handleOpenExternal = reactExports.useCallback(async () => {
    if (!href) return;
    const opened = await openExternalUrl(platform2, href, {
      source: "chat.markdown-link.context-menu.external",
    });
    trackChatLinkAction({
      action: "open_external",
      trigger: "context_menu",
      target_domain: targetDomain,
      result: opened ? "accepted" : "failed",
    });
    if (!opened) dedupedToast.error(t2("workspace.browser.openExternalError"));
  }, [href, platform2, t2, targetDomain]);
  const handleCopyLink = reactExports.useCallback(async () => {
    if (!href) return;
    try {
      await platform2.clipboard.writeText(href);
      trackChatLinkAction({
        action: "copy",
        trigger: "context_menu",
        target_domain: targetDomain,
        result: "accepted",
      });
      dedupedToast.success(t2("chat.copied"));
    } catch {
      trackChatLinkAction({
        action: "copy",
        trigger: "context_menu",
        target_domain: targetDomain,
        result: "failed",
      });
      dedupedToast.error(t2("common.copyFailed"));
    }
  }, [href, platform2.clipboard, t2, targetDomain]);
  if (isNonClickableFileReference) {
    return <span>{children2}</span>;
  }
  const link2 = (
    <a
      {...rest}
      href={href}
      className={cn$2(
        className,
        isBrowserLink && "chat-browser-link",
        isLocalFile && "chat-local-file-reference",
      )}
      aria-label={isLocalFile ? fileReferenceAction.ref.rawPath : rest["aria-label"]}
      data-action-ui-id={
        isBrowserLink
          ? "chat-markdown-browser-link"
          : fileReferenceAction.clickable
            ? "chat-file-reference-link"
            : void 0
      }
      onClick={handleClick2}
    >
      {isLocalFile ? (
        <code className="chat-inline-code chat-inline-code-file-ref inline-flex items-center gap-1 align-baseline">
          <File$1
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden={true}
          />
          <span>{fileReferenceAction.ref.displayName}</span>
          <ArrowUpRight
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden={true}
          />
        </code>
      ) : (
        children2
      )}
    </a>
  );
  return (
    <>
      {isBrowserLink ? (
        <ContextMenu>
          <ContextMenuTrigger render={link2} className="select-text" />
          <ContextMenuContent data-action-ui-id="chat-markdown-link-context-menu">
            <ContextMenuItem
              data-action-ui-id="chat-markdown-link-open-builtin"
              onClick={handleOpenBuiltin}
            >
              <Globe />
              {t2("chat.link.openBuiltin")}
            </ContextMenuItem>
            <ContextMenuItem
              data-action-ui-id="chat-markdown-link-open-external"
              onClick={() => void handleOpenExternal()}
            >
              <ExternalLink />
              {t2("workspace.browser.openExternal")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              data-action-ui-id="chat-markdown-link-copy"
              onClick={() => void handleCopyLink()}
            >
              <Copy />
              {t2("chat.copyUrl")}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        link2
      )}
      {fileReferenceAction.permissionDialog}
    </>
  );
}
