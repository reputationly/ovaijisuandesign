// canvas-global-tag-manager.jsx
import {
  selectDownloadableCanvasAssets,
  useCanvasTagName,
} from "../assets/use-canvas-model-registry-hydration.js";
import {
  API_PATHS,
  ChevronLeft,
  ChevronRight$1,
  CircleX,
  dedupedToast,
  Ellipsis,
  Loader2,
  Music2,
  reactExports,
  useTranslation,
  Video,
  X$7,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Download,
  FileText,
  ImageOutlineIcon,
} from "../media-editing/package.jsx";
import { useCanvasTagNameInputLimit } from "./use-canvas-tag-name-input-limit.js";
import { CanvasTagManagerPanel } from "./canvas-tag-manager-panel.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { Popover } from "../assets/credit-query-keys.jsx";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { useCanvasAssetNodeIds } from "../infra/use-canvas-node-assets-store.js";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { AssetPreviewPopup } from "../assets/preview-media.jsx";
import {
  isCanvasColorTag,
  isTagNameTaken,
  validateCanvasTagName,
} from "../infra/parse-connector-selection.js";
import {
  getCanvasTagPresentationColor,
  getCanvasTagSelectedForegroundColor,
} from "../assets/inline-input.jsx";
import { useCanvasTags } from "./use-canvas-tags.js";
import { CanvasToolbarExtensionButton } from "./canvas-toolbar-extension-button.jsx";
import { CanvasLabelIcon } from "./use-inline-rename.jsx";
import { PopoverContent } from "../team/hailuo-credit-row.jsx";
import { CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX } from "./cursor-icon.jsx";
import {
  PreviewCard$1,
  PreviewCardContent,
  PreviewCardTrigger,
} from "../text-editor/use-placeholder-asset-source.jsx";

function summarizeCanvasTagDownloads(assets, canvasAssetIds, tags2) {
  const knownTagIds = new Set(tags2.map(({ id: id2 }) => id2));
  const assetCountsByTag = new Map();
  let taggedAssetCount = 0;
  for (const asset of selectDownloadableCanvasAssets(assets, canvasAssetIds)) {
    let hasKnownTag = false;
    for (const tagId of asset.tagIds ?? []) {
      if (!knownTagIds.has(tagId)) continue;
      hasKnownTag = true;
      assetCountsByTag.set(tagId, (assetCountsByTag.get(tagId) ?? 0) + 1);
    }
    if (hasKnownTag) taggedAssetCount++;
  }
  return {
    assetCountsByTag,
    taggedAssetCount,
  };
}

function getAssetLabel(asset) {
  return asset.name?.trim() || asset.path.split(/[\\/]/).pop() || asset.id;
}

function AssetTypeThumbnail({ item }) {
  const [failed, setFailed] = reactExports.useState(false);
  if (item.thumbnailUrl && !failed) {
    return (
      <img
        src={item.thumbnailUrl}
        alt=""
        className="size-7 shrink-0 rounded-md object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  const fallbackIcon =
    item.asset.type === "video"
      ? Video
      : item.asset.type === "audio"
        ? Music2
        : item.asset.type === "image"
          ? ImageOutlineIcon
          : FileText;
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
      <Icon icon={fallbackIcon} size="sm" aria-hidden={true} />
    </span>
  );
}

export function CanvasGlobalTagManager({
  workspaceId: workspaceId2,
  workspaceAssets,
  activeTagId,
  onActiveTagChange,
  focusedNodeIndex,
  matchedNodeCount,
  onFocusPrevious,
  onFocusNext,
  onLocateNode,
  onClearFilter,
  downloadEnabled,
  downloadingTagId,
  downloadingAll,
  onDownloadTag,
  onDownloadAllTagged,
}) {
  const { t: t2 } = useTranslation();
  const tagNameInputLimit = useCanvasTagNameInputLimit();
  const resolveName2 = useCanvasTagName();
  const {
    registry: registry2,
    toggleTagForAssets,
    updateTag,
  } = useCanvasTags();
  const gatewayUrl2 = useGatewayUrl();
  const canvasNodeIdsByAsset = useCanvasAssetNodeIds(workspaceId2);
  const [open, setOpen] = reactExports.useState(false);
  const [paletteOpen, setPaletteOpen] = reactExports.useState(false);
  const [previewedTagId, setPreviewedTagId] = reactExports.useState();
  const [clearingTagId, setClearingTagId] = reactExports.useState();
  const [renamingTagId, setRenamingTagId] = reactExports.useState();
  const [renameDraft, setRenameDraft] = reactExports.useState("");
  const [renameSaving, setRenameSaving] = reactExports.useState(false);
  const renameSavingRef = reactExports.useRef(false);
  const renameInputRef = reactExports.useRef(null);
  const managerTriggerRef = reactExports.useRef(null);
  const paletteCloseTimerRef = reactExports.useRef(void 0);
  const managerId = reactExports.useId();
  const label = t2("canvasTags.manage");
  const canvasItemsByTag = reactExports.useMemo(() => {
    const itemsByTag = new Map();
    for (const asset of workspaceAssets) {
      const nodeIds = canvasNodeIdsByAsset.get(asset.id) ?? [];
      if (nodeIds.length === 0) continue;
      const label2 = getAssetLabel(asset);
      const mediaPath =
        asset.type === "image"
          ? API_PATHS.serveFile(asset.path)
          : asset.type === "video" || asset.type === "audio"
            ? API_PATHS.thumbnail(asset.path)
            : void 0;
      const thumbnailUrl = mediaPath
        ? withThumbnail(gatewayUrl2(mediaPath), 28)
        : void 0;
      for (const tagId of asset.tagIds ?? []) {
        const taggedItems = itemsByTag.get(tagId) ?? [];
        nodeIds.forEach((nodeId, index2) => {
          taggedItems.push({
            asset,
            label: nodeIds.length > 1 ? `${label2} · ${index2 + 1}` : label2,
            nodeId,
            previewResource: {
              nodeId,
              assetId: asset.id,
              type: asset.type,
              name: label2,
              url: gatewayUrl2(API_PATHS.serveFile(asset.path)) ?? "",
              path: asset.path,
              width: asset.width,
              height: asset.height,
              durationSec: asset.duration,
              fileSize: asset.fileSize,
              metadata: asset.metadata,
            },
            thumbnailUrl,
          });
        });
        itemsByTag.set(tagId, taggedItems);
      }
    }
    return itemsByTag;
  }, [canvasNodeIdsByAsset, gatewayUrl2, workspaceAssets]);
  const countsByTag = reactExports.useMemo(
    () =>
      new Map(
        Array.from(canvasItemsByTag, ([tagId, taggedItems]) => [
          tagId,
          taggedItems.length,
        ]),
      ),
    [canvasItemsByTag],
  );
  const { assetCountsByTag, taggedAssetCount } = reactExports.useMemo(
    () =>
      summarizeCanvasTagDownloads(
        workspaceAssets,
        new Set(canvasNodeIdsByAsset.keys()),
        registry2.tags,
      ),
    [canvasNodeIdsByAsset, registry2.tags, workspaceAssets],
  );
  const tagsWithCanvasAssets = registry2.tags
    .filter(isCanvasColorTag)
    .filter((tag) => (countsByTag.get(tag.id) ?? 0) > 0);
  const activeTag = tagsWithCanvasAssets.find((tag) => tag.id === activeTagId);
  const visibleTags = tagsWithCanvasAssets;
  reactExports.useEffect(() => {
    if (activeTagId && !activeTag) onActiveTagChange(void 0);
  }, [activeTag, activeTagId, onActiveTagChange]);
  const resolvedNames = reactExports.useMemo(
    () => new Map(registry2.tags.map((tag) => [tag.id, resolveName2(tag)])),
    [registry2.tags, resolveName2],
  );
  reactExports.useEffect(() => {
    if (!renamingTagId) return;
    const input = renameInputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [renamingTagId]);
  reactExports.useEffect(() => {
    if (!open) return;
    setPaletteOpen(false);
    setPreviewedTagId(void 0);
  }, [open]);
  reactExports.useEffect(
    () => () => {
      if (paletteCloseTimerRef.current)
        clearTimeout(paletteCloseTimerRef.current);
    },
    [],
  );
  const hasLabelDefinitions = registry2.tags.some(isCanvasColorTag);
  const hasTaggedCanvasAssets = visibleTags.length > 0;
  const emptyStateLabel = hasLabelDefinitions
    ? t2("canvasTags.noTaggedAssets")
    : t2("canvasTags.noLabelsCreate");
  const openPalette = () => {
    if (!hasTaggedCanvasAssets || open) return;
    if (paletteCloseTimerRef.current)
      clearTimeout(paletteCloseTimerRef.current);
    setPaletteOpen(true);
  };
  const schedulePaletteClose = () => {
    if (paletteCloseTimerRef.current)
      clearTimeout(paletteCloseTimerRef.current);
    paletteCloseTimerRef.current = setTimeout(() => setPaletteOpen(false), 120);
  };
  const managerTrigger = (
    <CanvasToolbarExtensionButton
      ref={managerTriggerRef}
      label={label}
      onClick={() => void 0}
      tooltipContent={hasTaggedCanvasAssets ? null : emptyStateLabel}
      dataActionUiId="canvas.toolbar-tags"
      kind="panel"
      active={open}
      controlsId={managerId}
      hasPopup="dialog"
      className="canvas-global-tag-manager__manager"
      data-label-state={hasTaggedCanvasAssets ? "populated" : "empty"}
      onMouseEnter={openPalette}
      onMouseLeave={schedulePaletteClose}
      onFocus={openPalette}
      onBlur={schedulePaletteClose}
    >
      <Icon
        icon={CanvasLabelIcon}
        tone="control"
        size="lg"
        strokeWidth={1.25}
        className={
          hasTaggedCanvasAssets
            ? "scale-110"
            : "scale-110 opacity-55 [stroke-dasharray:4_2]"
        }
        aria-hidden={true}
      />
    </CanvasToolbarExtensionButton>
  );
  const popoverTrigger = <PopoverTrigger render={managerTrigger} />;
  const handleClearTag = async (tag) => {
    if (clearingTagId) return;
    const taggedAssetIds = new Set(
      (canvasItemsByTag.get(tag.id) ?? []).map((item) => item.asset.id),
    );
    const taggedAssets = workspaceAssets.filter((asset) =>
      taggedAssetIds.has(asset.id),
    );
    if (taggedAssets.length === 0) return;
    setClearingTagId(tag.id);
    try {
      await toggleTagForAssets(tag.id, taggedAssets);
      if (activeTagId === tag.id) onActiveTagChange(void 0);
    } catch {
      dedupedToast.error(t2("canvasTags.clearTagFailed"));
    } finally {
      setClearingTagId(void 0);
    }
  };
  const finishRename = () => {
    setRenamingTagId(void 0);
    setRenameSaving(false);
  };
  const cancelRename = (currentName) => {
    setRenameDraft(currentName);
    finishRename();
  };
  const commitRename = async (tag, currentName) => {
    if (renameSavingRef.current) return;
    const name2 = renameDraft.trim();
    const validation = validateCanvasTagName(name2);
    const duplicate = isTagNameTaken(name2, resolvedNames, tag.id);
    if (validation || duplicate) {
      dedupedToast.error(
        t2(
          duplicate
            ? "canvasTags.nameTaken"
            : validation === "required"
              ? "canvasTags.nameRequired"
              : "canvasTags.nameTooLong",
        ),
      );
      cancelRename(currentName);
      return;
    }
    if (name2 === currentName) {
      finishRename();
      return;
    }
    renameSavingRef.current = true;
    setRenameSaving(true);
    try {
      await updateTag(tag.id, {
        name: name2,
      });
      finishRename();
    } catch {
      setRenameDraft(currentName);
      finishRename();
      dedupedToast.error(t2("canvasTags.saveFailed"));
    } finally {
      renameSavingRef.current = false;
    }
  };
  return (
    <div
      className="canvas-global-tag-manager flex h-full items-center"
      data-action-ui-id="canvas.tag-filter-toolbar"
      data-expanded={open || paletteOpen || previewedTagId ? "true" : "false"}
    >
      <Popover open={open} onOpenChange={setOpen}>
        {popoverTrigger}
        <PopoverContent
          anchor={managerTriggerRef.current}
          id={managerId}
          role="dialog"
          aria-label={label}
          side="top"
          align="center"
          sideOffset={8}
          collisionAvoidance={{
            side: "none",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          collisionPadding={{
            top: 8,
            right: 8,
            bottom: CANVAS_TOOL_DOCK_SAFE_BOTTOM_PX,
            left: 8,
          }}
          className="w-auto gap-0 p-1.5"
          data-action-ui-id="canvas.global-tag-manager"
        >
          <CanvasTagManagerPanel
            assetCountsByTag={assetCountsByTag}
            taggedAssetCount={taggedAssetCount}
            downloadEnabled={downloadEnabled}
            downloadingAll={downloadingAll}
            downloadingTagId={downloadingTagId}
            onDownloadAllTagged={onDownloadAllTagged}
            onDownloadTag={onDownloadTag}
          />
        </PopoverContent>
      </Popover>
      {hasTaggedCanvasAssets && (
        <Popover open={!open && paletteOpen} modal={false}>
          <PopoverContent
            motion="legacy"
            anchor={managerTriggerRef.current}
            initialFocus={false}
            finalFocus={false}
            side="top"
            sideOffset={8}
            align="center"
            collisionAvoidance={{
              side: "none",
              align: "shift",
              fallbackAxisSide: "none",
            }}
            collisionPadding={12}
            className="w-auto gap-0 p-1.5"
            role="group"
            aria-label={t2("canvasTags.colorLabels")}
            onMouseEnter={openPalette}
            onMouseLeave={schedulePaletteClose}
            onFocusCapture={openPalette}
            onBlurCapture={schedulePaletteClose}
          >
            <div
              className="canvas-global-tag-manager__palette flex h-7 items-center pl-0.5"
              data-action-ui-id="canvas.tag-dock-palette"
            >
              {visibleTags.map((tag) => {
                const name2 = resolveName2(tag);
                const items = canvasItemsByTag.get(tag.id) ?? [];
                const count2 = items.length;
                const countLabel = t2("canvasTags.canvasAssetCount", {
                  count: count2,
                });
                const active2 = tag.id === activeTagId;
                const downloading = downloadingTagId === tag.id;
                const clearing = clearingTagId === tag.id;
                return (
                  <PreviewCard$1
                    key={tag.id}
                    open={!open && previewedTagId === tag.id}
                    onOpenChange={(nextOpen) => {
                      if (open) return;
                      setPreviewedTagId((currentTagId) => {
                        if (nextOpen) return tag.id;
                        return currentTagId === tag.id ? void 0 : currentTagId;
                      });
                    }}
                  >
                    <PreviewCardTrigger
                      delay={20}
                      closeDelay={180}
                      render={
                        <CanvasToolbarExtensionButton
                          label={`${name2}: ${countLabel}`}
                          tooltipContent={null}
                          onClick={() =>
                            onActiveTagChange(active2 ? void 0 : tag.id)
                          }
                          dataActionUiId="canvas.toolbar-tag-filter"
                          data-tag-id={tag.id}
                          kind="toggle"
                          active={active2}
                          className="canvas-global-tag-manager__tag aria-pressed:!h-[calc(100%-4px)] aria-pressed:!rounded-full focus-visible:ring-0!"
                          style={{
                            "--canvas-tag-color": getCanvasTagPresentationColor(
                              tag.color,
                            ),
                            "--canvas-tag-selected-foreground":
                              getCanvasTagSelectedForegroundColor(tag.color),
                          }}
                        >
                          <span
                            data-canvas-tag-swatch=""
                            className="size-3 scale-[1.2] shrink-0 rounded-full ring-[1.5px] ring-[var(--canvas-controls-bg)]"
                            style={{
                              backgroundColor: getCanvasTagPresentationColor(
                                tag.color,
                              ),
                            }}
                            aria-hidden="true"
                          />
                          {active2 && (
                            <span className="tabular-nums">{count2}</span>
                          )}
                        </CanvasToolbarExtensionButton>
                      }
                    />
                    <PreviewCardContent
                      side="top"
                      sideOffset={8}
                      align="center"
                      collisionPadding={12}
                      className="w-60 p-2"
                    >
                      <div
                        data-action-ui-id="canvas.tag-hover-panel"
                        data-tag-id={tag.id}
                      >
                        <div className="flex h-8 items-center gap-2 px-1">
                          <span
                            className="size-3 shrink-0 rounded-full ring-1 ring-border"
                            style={{
                              backgroundColor: getCanvasTagPresentationColor(
                                tag.color,
                              ),
                            }}
                            aria-hidden="true"
                          />
                          {renamingTagId === tag.id ? (
                            <input
                              ref={renameInputRef}
                              value={renameDraft}
                              disabled={renameSaving}
                              aria-label={name2}
                              data-action-ui-id="canvas.tag-hover-rename-input"
                              className="h-5 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-inherit outline-none disabled:opacity-50"
                              onChange={(event) =>
                                setRenameDraft(
                                  tagNameInputLimit.acceptChange(
                                    event.target.value,
                                  ),
                                )
                              }
                              onCompositionStart={
                                tagNameInputLimit.startComposition
                              }
                              onCompositionEnd={(event) =>
                                setRenameDraft(
                                  tagNameInputLimit.finishComposition(
                                    event.currentTarget.value,
                                  ),
                                )
                              }
                              onBlur={() => void commitRename(tag, name2)}
                              onDoubleClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void commitRename(tag, name2);
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  cancelRename(name2);
                                }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="min-w-0 flex-1 cursor-text truncate rounded-sm border-0 bg-transparent p-0 text-left text-sm font-medium outline-none select-none focus-visible:ring-1 focus-visible:ring-ring/50"
                              data-action-ui-id="canvas.tag-hover-name"
                              onClick={(event) => {
                                if (event.detail !== 0) return;
                                setRenameDraft(name2);
                                setRenamingTagId(tag.id);
                              }}
                              onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setRenameDraft(name2);
                                setRenamingTagId(tag.id);
                              }}
                            >
                              {name2}
                            </button>
                          )}
                        </div>
                        <div
                          className="mt-1 max-h-[16.25rem] overflow-y-auto"
                          data-action-ui-id="canvas.tag-hover-assets-scroll"
                        >
                          {items.map((item) => (
                            <PreviewCard$1 key={item.nodeId}>
                              <PreviewCardTrigger
                                delay={120}
                                closeDelay={120}
                                render={
                                  <button
                                    type="button"
                                    data-action-ui-id="canvas.tag-hover-locate"
                                    data-node-id={item.nodeId}
                                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm transition-colors hover:bg-popup-item-hover focus-visible:bg-popup-item-hover focus-visible:outline-none"
                                    onClick={() => onLocateNode(item.nodeId)}
                                    aria-label={t2("canvasTags.locateAsset", {
                                      name: item.label,
                                    })}
                                  >
                                    <AssetTypeThumbnail item={item} />
                                    <span className="min-w-0 flex-1 truncate">
                                      {item.label}
                                    </span>
                                  </button>
                                }
                              />
                              <AssetPreviewPopup
                                resource={item.previewResource}
                                side="left"
                              />
                            </PreviewCard$1>
                          ))}
                        </div>
                        <div className="mt-1 border-t border-border pt-1">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left text-sm transition-colors hover:bg-popup-item-hover focus-visible:bg-popup-item-hover focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                            disabled={
                              !downloadEnabled || !onDownloadTag || downloading
                            }
                            onClick={() => void onDownloadTag?.(tag)}
                          >
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground/75"
                              data-action-ui-id="canvas.tag-hover-download-icon"
                            >
                              <Icon
                                icon={downloading ? Loader2 : Download}
                                size="sm"
                                strokeWidth={2}
                                className={
                                  downloading ? "animate-spin" : void 0
                                }
                                aria-hidden={true}
                              />
                            </span>
                            <span>{t2("canvasTags.downloadCurrentTag")}</span>
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-1.5 py-2 text-left text-sm transition-colors hover:bg-popup-item-hover focus-visible:bg-popup-item-hover focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                            disabled={Boolean(clearingTagId)}
                            onClick={() => void handleClearTag(tag)}
                          >
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground/75"
                              data-action-ui-id="canvas.tag-hover-clear-icon"
                            >
                              <Icon
                                icon={clearing ? Loader2 : CircleX}
                                size="sm"
                                strokeWidth={2}
                                className={clearing ? "animate-spin" : void 0}
                                aria-hidden={true}
                              />
                            </span>
                            <span>{t2("canvasTags.clearCurrentTag")}</span>
                          </button>
                        </div>
                      </div>
                    </PreviewCardContent>
                  </PreviewCard$1>
                );
              })}
              {activeTag && matchedNodeCount > 1 && (
                <div
                  className="flex h-full items-center"
                  data-action-ui-id="canvas.tag-filter-status"
                  data-focused-node-index={focusedNodeIndex ?? "overview"}
                >
                  <CanvasToolbarExtensionButton
                    label={t2("canvasTags.previousMatch")}
                    title={t2("canvasTags.previousMatch")}
                    onClick={onFocusPrevious}
                    dataActionUiId="canvas.tag-filter-previous"
                    className="!min-w-6 !px-1"
                  >
                    <Icon icon={ChevronLeft} size="xs" aria-hidden={true} />
                  </CanvasToolbarExtensionButton>
                  <CanvasToolbarExtensionButton
                    label={t2("canvasTags.nextMatch")}
                    title={t2("canvasTags.nextMatch")}
                    onClick={onFocusNext}
                    dataActionUiId="canvas.tag-filter-next"
                    className="!min-w-6 !px-1"
                  >
                    <Icon icon={ChevronRight$1} size="xs" aria-hidden={true} />
                  </CanvasToolbarExtensionButton>
                </div>
              )}
              {activeTag ? (
                <CanvasToolbarExtensionButton
                  label={t2("canvasTags.clearFilter")}
                  title={t2("canvasTags.clearFilter")}
                  onClick={onClearFilter}
                  dataActionUiId="canvas.tag-filter-clear"
                  className="canvas-global-tag-manager__palette-action"
                >
                  <Icon icon={X$7} size="md" aria-hidden={true} />
                </CanvasToolbarExtensionButton>
              ) : (
                <CanvasToolbarExtensionButton
                  label={label}
                  title={label}
                  onClick={() => setOpen(true)}
                  dataActionUiId="canvas.tag-palette-manage"
                  kind="panel"
                  active={open}
                  controlsId={managerId}
                  hasPopup="dialog"
                  className="canvas-global-tag-manager__palette-action"
                >
                  <Icon icon={Ellipsis} size="md" aria-hidden={true} />
                </CanvasToolbarExtensionButton>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
