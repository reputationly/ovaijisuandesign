/**
 * 工作区外壳闭包（第 247 轮，多 chunk + npm 停止集）。
 *
 * 种子：WorkspaceCompositionActions / WorkspaceStructurePresentation
 * 闭包：80 个声明 / 约 3,161 行，离线迭代到不动点（2 → 10 → 4 → 8 → 10 → 13 → 20 → 4 → 3）。
 * 来源：主包 + use-window-chrome 共享 chunk。
 */

import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";

export function I18nextProvider({
  i18n,
  defaultNS,
  children: children2
}) {
  const value = reactExports.useMemo(() => ({
    i18n,
    defaultNS
  }), [i18n, defaultNS]);
  return reactExports.createElement(I18nContext.Provider, {
    value
  }, children2);
}

export const ADD_TO_CHAT_VIEW_BOX$1 = "0 0 20 20";

export const ADD_TO_CHAT_PATHS$1 = [
  "M12.1545 15.3767H18.6118",
  "M15.3896 12.1545L15.3896 18.6118",
  "M17.2956 9.34192C17.2956 4.94921 13.7346 1.38821 9.34191 1.38821C4.94919 1.38821 1.3882 4.94921 1.3882 9.34192C1.3882 10.9548 1.38819 14.4074 1.38819 16.186C1.38818 16.7996 1.88394 17.2956 2.49759 17.2956C4.28696 17.2956 7.76843 17.2956 9.34191 17.2956",
  "M5.93323 7.60952L12.7507 7.60952",
  "M5.93323 12.1545L9.34196 12.1545"
];

export function AddToChatIcon$1({
  size: size2 = 20,
  ...props
} = {}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CompositedSvg,
    {
      width: size2,
      height: size2,
      viewBox: ADD_TO_CHAT_VIEW_BOX$1,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      ...props,
      children: ADD_TO_CHAT_PATHS$1.map((d2) => /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: d2 }, d2))
    }
  );
}

export function cropImageToBlob$1(imageSrc, cropRect, originalWidth, originalHeight) {
  return new Promise((resolve, reject2) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const sx = Math.round(cropRect.x * originalWidth);
      const sy = Math.round(cropRect.y * originalHeight);
      const sw = Math.round(cropRect.width * originalWidth);
      const sh = Math.round(cropRect.height * originalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject2(new Error("Failed to get canvas 2d context"));
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject2(new Error("canvas.toBlob returned null"));
        },
        "image/png",
        1
      );
    };
    img.onerror = () => reject2(new Error(`Failed to load image: ${imageSrc}`));
    img.src = imageSrc;
  });
}

export function useImageCrop$1(containerWidth, containerHeight) {
  const [cropRect, setCropRect] = reactExports.useState(DEFAULT_CROP);
  const [aspectRatio2, setAspectRatioState] = reactExports.useState("free");
  const [isDragging2, setIsDragging] = reactExports.useState(false);
  const [activeHandle, setActiveHandle] = reactExports.useState(null);
  const dragRef = reactExports.useRef(null);
  const rafRef = reactExports.useRef(null);
  const latestRef = reactExports.useRef({ containerWidth, containerHeight, aspectRatio: aspectRatio2 });
  latestRef.current = { containerWidth, containerHeight, aspectRatio: aspectRatio2 };
  const handleMove = reactExports.useCallback((e2) => {
    const drag2 = dragRef.current;
    if (!drag2) return;
    const { containerWidth: cw, containerHeight: ch, aspectRatio: ar } = latestRef.current;
    if (!cw || !ch) return;
    const deltaX = (e2.clientX - drag2.startX) / cw;
    const deltaY = (e2.clientY - drag2.startY) / ch;
    const numericRatio = ASPECT_RATIOS[ar];
    const next2 = calcCropRect({
      initialRect: drag2.initialRect,
      deltaX,
      deltaY,
      handle: drag2.handle,
      aspectRatio: numericRatio,
      containerWidth: cw,
      containerHeight: ch
    });
    setCropRect(next2);
  }, []);
  reactExports.useEffect(() => {
    if (!isDragging2) return;
    let pendingEvent = null;
    const onMove = (e2) => {
      if (e2.cancelable) e2.preventDefault();
      pendingEvent = e2;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingEvent) {
            handleMove(pendingEvent);
            pendingEvent = null;
          }
        });
      }
    };
    const onUp = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingEvent) {
        handleMove(pendingEvent);
        pendingEvent = null;
      }
      setIsDragging(false);
      setActiveHandle(null);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging2, handleMove]);
  const handlePointerDown = reactExports.useCallback(
    (e2, handle2 = null) => {
      if (!e2.isPrimary) return;
      e2.stopPropagation();
      e2.preventDefault();
      dragRef.current = {
        startX: e2.clientX,
        startY: e2.clientY,
        initialRect: { ...cropRect },
        handle: handle2
      };
      setIsDragging(true);
      setActiveHandle(handle2);
    },
    [cropRect]
  );
  const setAspectRatio = reactExports.useCallback((preset2) => {
    setAspectRatioState(preset2);
    const ratio = ASPECT_RATIOS[preset2];
    const { containerWidth: cw, containerHeight: ch } = latestRef.current;
    setCropRect(cropRectForAspectRatio$1(ratio, cw, ch));
  }, []);
  const reset2 = reactExports.useCallback(() => {
    setAspectRatioState("free");
    setCropRect(DEFAULT_CROP);
  }, []);
  return {
    cropRect,
    aspectRatio: aspectRatio2,
    isDragging: isDragging2,
    activeHandle,
    handlePointerDown,
    setAspectRatio,
    setCropRect,
    reset: reset2
  };
}

export function normalizePromptFontSize$1(value) {
  if (!Number.isFinite(value)) return PROMPT_FONT_SIZE_DEFAULT;
  return Math.min(PROMPT_FONT_SIZE_MAX, Math.max(PROMPT_FONT_SIZE_MIN, Math.round(value)));
}

export function SegmentedSwitch$1({
  value,
  options: options2,
  onValueChange,
  ariaLabel,
  dataActionUiId,
  thumbDataSlot = "segmented-switch-thumb",
  variant = "icon",
  size: size2 = "md",
  gap = "none",
  stretch = false,
  className,
  itemClassName,
  thumbClassName,
  iconSize = 16,
  iconStrokeWidth = 1.5,
  renderTooltip
}) {
  const selectedIndex = Math.max(
    0,
    options2.findIndex((option2) => option2.value === value)
  );
  const optionCount = Math.max(1, options2.length);
  const itemGapRem = gap === "xs" ? 0.125 : 0;
  const totalGapRem = (optionCount - 1) * itemGapRem;
  const selectedGapOffsetRem = selectedIndex * itemGapRem;
  const gridStyle = options2.length in GRID_CLASS_BY_COUNT ? void 0 : { gridTemplateColumns: `repeat(${optionCount}, minmax(0, 1fr))` };
  const thumbStyle = {
    width: gap === "xs" ? `calc((100% - 4px - ${totalGapRem}rem) / ${optionCount})` : `calc((100% - 4px) / ${optionCount})`,
    transform: selectedGapOffsetRem > 0 ? `translateX(calc(${selectedIndex * 100}% + ${selectedGapOffsetRem}rem))` : `translateX(${selectedIndex * 100}%)`
  };
  const content2 = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "fieldset",
    {
      "aria-label": ariaLabel,
      "data-action-ui-id": dataActionUiId,
      className: cn$5(
        "relative m-0 grid min-w-0 rounded-[8px] border-0 bg-foreground/[0.025] p-0.5 dark:bg-foreground/[0.05]",
        gap === "xs" && "gap-0.5",
        stretch ? "w-full" : "w-max",
        GRID_CLASS_BY_COUNT[options2.length],
        className
      ),
      style: gridStyle,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "aria-hidden": true,
            "data-slot": thumbDataSlot,
            className: cn$5(
              "pointer-events-none absolute top-0.5 left-0.5 rounded-[6px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out dark:bg-white/[0.08] dark:shadow-none",
              size2 === "sm" ? "h-6" : "h-7",
              thumbClassName
            ),
            style: thumbStyle
          }
        ),
        options2.map((option2) => {
          const selected2 = option2.value === value;
          const Icon2 = option2.icon;
          const labelText = typeof option2.label === "string" ? option2.label : void 0;
          const button = /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "aria-pressed": selected2,
              "aria-label": option2.ariaLabel ?? labelText,
              disabled: option2.disabled,
              "data-action-ui-id": option2.dataActionUiId,
              className: cn$5(
                "relative z-10 inline-flex items-center justify-center rounded-[6px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                variant === "icon" ? size2 === "sm" ? "size-6" : "size-7" : cn$5(
                  "min-w-0 gap-1 whitespace-nowrap",
                  size2 === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[13px]"
                ),
                selected2 ? "text-foreground font-medium" : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground font-normal",
                itemClassName
              ),
              onClick: () => {
                if (!option2.disabled && option2.value !== value) {
                  onValueChange(option2.value);
                }
              },
              children: [
                Icon2 && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { className: "shrink-0", size: iconSize, strokeWidth: iconStrokeWidth }),
                (variant === "label" || !Icon2) && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: option2.label })
              ]
            },
            option2.value
          );
          if (!option2.tooltip || !renderTooltip) return button;
          return renderTooltip(button, option2.tooltip);
        })
      ]
    }
  );
  return content2;
}

var InfiniteQueryObserver = class extends QueryObserver {
  constructor(client, options2) {
    super(client, options2);
  }
  bindMethods() {
    super.bindMethods();
    this.fetchNextPage = this.fetchNextPage.bind(this);
    this.fetchPreviousPage = this.fetchPreviousPage.bind(this);
  }
  setOptions(options2) {
    super.setOptions({
      ...options2,
      behavior: infiniteQueryBehavior()
    });
  }
  getOptimisticResult(options2) {
    options2.behavior = infiniteQueryBehavior();
    return super.getOptimisticResult(options2);
  }
  fetchNextPage(options2) {
    return this.fetch({
      ...options2,
      meta: {
        fetchMore: { direction: "forward" }
      }
    });
  }
  fetchPreviousPage(options2) {
    return this.fetch({
      ...options2,
      meta: {
        fetchMore: { direction: "backward" }
      }
    });
  }
  createResult(query, options2) {
    const { state: state2 } = query;
    const parentResult = super.createResult(query, options2);
    const { isFetching, isRefetching, isError, isRefetchError } = parentResult;
    const fetchDirection = state2.fetchMeta?.fetchMore?.direction;
    const isFetchNextPageError = isError && fetchDirection === "forward";
    const isFetchingNextPage = isFetching && fetchDirection === "forward";
    const isFetchPreviousPageError = isError && fetchDirection === "backward";
    const isFetchingPreviousPage = isFetching && fetchDirection === "backward";
    const result = {
      ...parentResult,
      fetchNextPage: this.fetchNextPage,
      fetchPreviousPage: this.fetchPreviousPage,
      hasNextPage: hasNextPage(options2, state2.data),
      hasPreviousPage: hasPreviousPage(options2, state2.data),
      isFetchNextPageError,
      isFetchingNextPage,
      isFetchPreviousPageError,
      isFetchingPreviousPage,
      isRefetchError: isRefetchError && !isFetchNextPageError && !isFetchPreviousPageError,
      isRefetching: isRefetching && !isFetchingNextPage && !isFetchingPreviousPage
    };
    return result;
  }
};

export function useInfiniteQuery(options2, queryClient2) {
  return useBaseQuery(
    options2,
    InfiniteQueryObserver,
    queryClient2
  );
}

export function referenceResourceKind(kind2) {
  return kind2 === "video" ? ProjectResourceKind.VIDEO : kind2 === "audio" ? ProjectResourceKind.AUDIO : kind2 === "text" ? ProjectResourceKind.TEXT_DOCUMENT : kind2 === "file" ? ProjectResourceKind.FILE : ProjectResourceKind.IMAGE;
}

export async function readResourceVersionHistory(resources, resourceId2, signal) {
  const items = [];
  let cursor;
  let pages = 0;
  do {
    const page2 = await resources.listResourceVersions(
      { resourceId: resourceId2, limit: 50, cursor },
      { signal }
    );
    items.push(...page2.items);
    cursor = page2.nextCursor;
    pages += 1;
  } while (cursor && pages < 100);
  return items;
}

export function CompositionActionsProvider({
  actions,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ActionsContext.Provider, { value: actions, children: children2 });
}

export function toAsyncSectionState(input) {
  const { hasData, isError, isFetching, isEmpty: isEmpty2 = false } = input;
  if (!hasData) {
    if (isError) return frozen("error", false, false, true);
    if (isFetching) return frozen("loading", false, true, false);
    return frozen("loading", false, false, false);
  }
  const status = isEmpty2 ? "empty" : "ready";
  return frozen(status, isError, isFetching, isError);
}

export function frozen(status, staleError, refreshing, canRetry) {
  return Object.freeze({ status, staleError, refreshing, canRetry });
}

export function createTaskQueryOptions(client, scopeKey) {
  if (!scopeKey.trim()) throw new Error("Task queries require a workspace scope");
  const defaults2 = {
    networkMode: "always",
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  };
  return {
    detail(id2) {
      return queryOptions({
        ...defaults2,
        queryKey: [...taskQueryKeys.all(scopeKey), "detail", id2],
        queryFn: ({ signal }) => client.get(id2, { signal })
      });
    },
    list(query = {}) {
      const snapshot2 = structuredClone(query);
      return queryOptions({
        ...defaults2,
        queryKey: [...taskQueryKeys.all(scopeKey), "list", snapshot2],
        queryFn: ({ signal }) => client.list(snapshot2, { signal })
      });
    },
    queue() {
      return queryOptions({
        ...defaults2,
        queryKey: [...taskQueryKeys.all(scopeKey), "queue"],
        queryFn: ({ signal }) => client.queue({ signal })
      });
    }
  };
}

export function useTaskResolve() {
  const workbench = useWorkbench();
  return useMutation({
    networkMode: "always",
    retry: false,
    mutationFn: ({ taskId, input }) => workbench.execution.resolve(taskId, input)
  });
}

export function StructureMediaProvider({
  imageUrl,
  renderImage,
  videoUrl,
  videoThumbnailUrl: videoThumbnailUrl2,
  thumbnailUrl,
  renderAudio,
  renderDocument: renderDocument2,
  renderDocuments: renderDocuments2,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    MediaUrlContext.Provider,
    {
      value: {
        imageUrl,
        renderImage,
        videoUrl,
        videoThumbnailUrl: videoThumbnailUrl2,
        thumbnailUrl,
        renderAudio,
        renderDocument: renderDocument2,
        renderDocuments: renderDocuments2
      },
      children: children2
    }
  );
}

export const structureEditorEn = {
  editorExistingAttribute: "Choose an Existing Attribute",
  editorNewAttribute: "New Attribute",
  editorAttributeHelp: "Choose an existing attribute to edit, or enter a new key. Content supports multiple lines.",
  editorRequiredName: "Enter a name.",
  editorRequiredType: "Choose a type.",
  editorRequiredAttributeKey: "Enter a valid attribute key.",
  editorAttributeMissing: "This attribute no longer exists. Choose an existing one or cancel removal.",
  editorRequiredResource: "Choose a resource.",
  editorDuplicateReference: "This member already links to the resource. No duplicate is needed.",
  editorAlreadyLinked: "Already linked",
  editorRequiredDestination: "Choose another destination member.",
  editorTargetMissing: "The target no longer exists. Cancel and start again from the current structure.",
  editorMemberOccupied: "The member holds another resource. Clear or explicitly replace it first.",
  editorOrderChanged: "The source or destination resource changed. Nothing was submitted. Cancel and start again from the current structure.",
  editorReviewTitle: "Review Changes",
  editorReviewHelp: "Your draft is retained. Compare it with the latest content before submitting.",
  editorOriginalValue: "Original",
  editorLatestValue: "Latest",
  editorDraftValue: "My Draft",
  editorMissingValue: "Not present",
  editorEmptyValue: "Empty",
  editorRemovedValue: "Will remove",
  editorReferenceOrder: "Resource reference",
  editorMoveDuplicate: "The destination already links to this resource. Moving it will only remove the source reference."
};

export const compositionEditEn = {
  editComposition: "Edit Composition",
  editCompositionNamed: "Edit {{name}}",
  editBasic: "Basic information",
  editAttributes: "Attributes",
  editGroups: "Members",
  editGroupName: "Member name",
  editAddGroup: "Add member",
  editRemoveGroup: "Remove member",
  editAddResources: "Add resource",
  editRemove: "Remove",
  editReplace: "Replace",
  editEarlier: "Move earlier",
  editLater: "Move later",
  editMoveTo: "Move to another member",
  editUnclassified: "Unclassified",
  editAttributeKey: "Attribute name",
  editAttributeValue: "Attribute content",
  editAddAttribute: "Add attribute",
  editAttributeHint: "Content supports multiple lines. Renamed attributes move to the end.",
  editReferenceHint: "Each member links to at most one resource. Removing a member or reference keeps the resource.",
  editClose: "Close composition editor",
  editCloseButton: "Close",
  editSave: "Save",
  editDiscardTitle: "You have unsaved changes",
  editDiscardHint: "Discarding only removes unsubmitted changes. Saved changes will remain.",
  editDiscard: "Discard unsaved changes",
  editContinue: "Continue editing",
  editKeepDraft: "Keep draft and close",
  editProgress: "Saved {{saved}} of {{total}} changes",
  editPartial: "Some changes were saved. The remaining draft has been retained.",
  editInvalid: "Enter a name and valid, unique attribute names. Each member links to at most one resource.",
  editReadFailed: "Could not read the composition. Retry; your draft is retained.",
  editPending: "This composition has an unconfirmed operation. Recover its result first.",
  editKeepMine: "Keep my changes",
  editUseLatest: "Use latest content",
  editConflictHint: "Compare the original, latest content and your draft. Keeping your changes overwrites the edited fields; unedited fields retain the latest content.",
  editTargetMissing: "An edited member was removed. Use the latest content and edit again.",
  editDeleted: "This composition was deleted. Its resources have been retained.",
  editRestore: "Undo deletion",
  editDeleteHint: "Save or discard your changes before deleting this composition.",
  editConfirmDelete: "Confirm composition deletion",
  editResourceSearch: "Search project resources",
  editResourceKind: "Resource type",
  editAllResources: "All resources",
  editImage: "Images",
  editVideo: "Videos",
  editAudio: "Audio",
  editDocument: "Documents",
  editSelectResources: "Choose an existing resource",
  editConfirmResources: "Add selected resource",
  editConfirmReplace: "Replace with selected resource",
  editNoResources: "No matching resources",
  editBack: "Back to editor",
  editSelected: "Selected"
};

export const treeLabelsEn = {
  dragHint: "Drag a resource to an empty member or one linking the same resource, or use row actions. Confirm to save after dropping.",
  dragReference: "Drag {{name}} Or Click To Choose A Destination",
  dropBefore: "Place before {{name}}",
  dropAtEnd: "Place at the end of {{name}}",
  dropMove: "Move to {{name}} without duplicating an existing reference",
  dragChanged: "The content changed or the destination is unavailable. Start the drag again.",
  emptyMemberDrop: "No resources in this member. Drag from this structure or link a resource."
};

export const en$2 = {
  ...compositionEditEn,
  audioOff: "Without audio",
  audioOn: "With audio",
  jsonExpand: "Expand",
  jsonCollapse: "Show less",
  jsonMore: "Show {{count}} more items",
  jsonParameters: "Parameters",
  jsonFieldId: "ID",
  jsonFieldEpisode: "Episode",
  jsonFieldType: "Type",
  jsonFieldDuration: "Duration (s)",
  jsonFieldAspectRatio: "Aspect ratio",
  jsonFieldEmotion: "Intensity",
  jsonFieldImagePrompt: "Image prompt",
  jsonFieldVideoPrompt: "Video prompt",
  jsonFieldReferences: "References",
  jsonFieldImageGeneration: "Image generation",
  jsonFieldVideoGeneration: "Video generation",
  jsonFieldCapability: "Model",
  jsonFieldResolution: "Resolution",
  jsonFieldQuality: "Quality",
  jsonFieldMode: "Mode",
  jsonFieldAudio: "Generate audio",
  referenceDuration: "Duration",
  documentBackup: "Reading backup and source documents",
  referenceDimensions: "Dimensions",
  referenceFormat: "Format",
  referenceSize: "Size",
  referenceModified: "Modified",
  referenceDependencies: "Dependencies",
  referenceNoDependencies: "No recorded inputs",
  referenceVersion: "Referenced version",
  ...structureEditorEn,
  ...treeLabelsEn,
  pageEmpty: "No content yet",
  networkError: "No network connection. Check your connection and retry.",
  directoryContents: "Project Structure Directory",
  directorySearch: "Search structure names",
  directoryEmpty: "No structures yet",
  directoryEmptyMembers: "No members yet",
  directoryEmptyResources: "No resources yet",
  advancedSearch: "Search Options",
  testViewNotice: "Test view. The project workspace controls the production surface.",
  resourceStrip: "Linked Resources",
  documentEmpty: "This document is empty.",
  documentIncomplete: "This document is too long to display in full.",
  editResourceNamed: "Edit Resource {{name}}",
  addToChat: "Add to Chat",
  collect: "Save to Asset Library",
  exportComposition: "Export",
  selectVersionNamed: "Select Version {{versionId}}",
  adoptVersion: "Use This Version",
  adoptVersionNotice: "Selecting a version only previews it. Applying it updates the current version in every structure referencing this resource.",
  previewNamed: "Preview {{name}}",
  previewVersionNamed: "Preview {{name}}, {{time}}, version {{versionId}}",
  moreResourcePreviews: "Show {{count}} More Resource Previews",
  moreResourceCount: "+{{count}}",
  fewerResourcePreviews: "Show Fewer Previews",
  manageResources: "Manage Resources",
  editContent: "Edit Content",
  closeManagement: "Close Management",
  typeFilters: "Structure Type Filters",
  mediaLoading: "Loading media",
  mediaUnavailable: "Preview Unavailable",
  mediaFailed: "Unable to load media",
  mediaPlayNamed: "Play {{name}}",
  mediaPauseNamed: "Pause {{name}}",
  versionDetails: "Version Information",
  filtersActive: "Filters Active",
  title: "Project Composition",
  subtitle: "Structures, members and resource references in this project.",
  tree: "Directory",
  viewMode: "Structure view",
  editNamed: "Edit {{name}}",
  editingBadge: "Editing",
  unconfirmedBadge: "Unconfirmed",
  previewPanel: "Selected resource details",
  unavailable: "Structure is unavailable in this project.",
  loading: "Loading…",
  empty: "No structures yet.",
  emptyMembers: "No members yet. Add a member to link resources.",
  loadError: "Unable to load. Please retry.",
  stale: "Refresh did not complete. Previously loaded content is still visible.",
  partial: "Some content is not ready. These results are incomplete.",
  refresh: "Refresh",
  retry: "Retry",
  more: "Load More",
  restart: "Reload From the Start",
  allTypes: "All Types",
  list: "List",
  cards: "Cards",
  open: "Open {{name}}",
  selectMedia: "Preview {{name}}",
  select: "Select a structure to view its members",
  loaded: "{{count}} loaded",
  referenceCount: "{{count}} references",
  knownReferences: "{{count}} references loaded",
  create: "Create Structure",
  rename: "Rename",
  type: "Change Type",
  attribute: "Edit Attribute",
  delete: "Delete Structure",
  "add-member": "Add Member",
  "member-role": "Rename Member",
  "remove-member": "Remove Member",
  "add-reference": "Link Resource",
  "remove-reference": "Remove Reference",
  move: "Move To",
  reorder: "Reorder References",
  actions: "Actions",
  name: "Name",
  typeLabel: "Type",
  memberLabel: "Member name",
  attributeKey: "Attribute key",
  value: "Value",
  destination: "Destination member",
  choose: "Select an option",
  resource: "Project resource",
  removeAttribute: "Remove this attribute",
  save: "Confirm",
  cancel: "Cancel",
  saving: "Submitting…",
  loadingBaseline: "Loading the latest content…",
  confirmDelete: "Delete this structure? Its resources will not be deleted.",
  closeDelete: "Close Delete Confirmation",
  confirmMember: "Remove this member and its references? Resources will not be deleted.",
  confirmReference: "Remove the reference at this location? Its resource and other locations will not be deleted.",
  saved: "Operation completed.",
  conflict: "The content changed. Your draft is retained. Reload, review and submit again.",
  unknown: "The result is unconfirmed. Recover this operation instead of creating a new one.",
  rejected: "The operation failed. Check the content or reload before retrying.",
  invalid: "Check your input and the selected location.",
  reloadBaseline: "Reload and Keep Draft",
  recover: "Recover Operation",
  pending: "This structure has an unconfirmed operation.",
  members: "Members",
  unnamedMember: "Unnamed member",
  deleted: "This structure has been deleted.",
  history: "Version History",
  preview: "Version Details",
  current: "Current",
  followingCurrent: "Follow Current Version",
  pinned: "Pinned version preview",
  pinNotice: "Previewing does not change the current version.",
  noVersion: "No usable version",
  missing: "Resource unavailable",
  readFailed: "Unable to read resource",
  resourceLoading: "Loading resource",
  createdAt: "Created",
  updatedAt: "Updated",
  versionId: "Version",
  path: "File",
  dependencies: "Input dependencies",
  noDependencies: "No input dependencies recorded",
  previewUnavailable: "Content preview is not connected yet. Version information is available below.",
  text: "Text",
  image: "Image",
  video: "Video",
  audio: "Audio",
  earlier: "Move Earlier",
  later: "Move Later",
  noResources: "No resources available to link",
  typeError: "Unable to load types. Existing structures are still available.",
  closePreview: "Close Version Details",
  projectSearch: "Search This Project",
  searchCompositions: "Search Structures",
  searchResources: "Find Resource References",
  searchName: "Name keywords",
  search: "Search",
  clearSearch: "Clear Filters",
  attributeFilter: "Filter by Attribute",
  attributeExactValue: "Attribute value (exact match)",
  projectSearchNotice: "Search this project only. Choose a reference location to reveal it in the structure.",
  resourceResults: "Resource Search Results",
  noSearchResults: "No results match these filters.",
  searchIncomplete: "No matches have been loaded yet. These results are incomplete.",
  showLocationsNamed: "Show reference locations for {{name}}",
  locations: "Reference Locations",
  refreshLocations: "Refresh Locations",
  chooseLocation: "Choose a specific structure and member. The reference will be checked again before locating it.",
  loadedLocations: "{{count}} reference locations loaded",
  noLocations: "No structure references to this resource were found in this project.",
  locationsIncomplete: "No locations have been loaded yet. These results are incomplete.",
  locate: "Locate Here",
  locateNamed: "Locate in {{name}} / {{role}}",
  locationNameUnavailable: "The name is unavailable. You can still try to verify this location.",
  locationResult: "Located Reference",
  locatedMemberOnly: "Only the located member is shown. Return to the full tree to keep browsing.",
  locatedReferenceCount: "{{count}} references shown in this member",
  fullTree: "Return to Full Tree",
  verifyingLocation: "Verifying the reference location…",
  locationGone: "This reference location is no longer valid. It may have been moved or deleted. Refresh locations and choose again.",
  locationUnconfirmed: "The results are incomplete. This reference location cannot be confirmed yet.",
  locationUpdated: "The structure changed. This reference location was verified against its latest content.",
  locationVerified: "Reference location verified.",
  locatedHere: "Located"
};

export const structureTranslations = { zh, en: en$2 };

export function ResourceDetailProvider({
  render: render2,
  renderDialog,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceDetailContext.Provider, { value: render2 ?? null, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceDetailDialogContext.Provider, { value: renderDialog ?? null, children: children2 }) });
}

export function useWorkspaceChatComposer(workbench, workspaceRoot, active2) {
  const lifetime = reactExports.useMemo(
    () => ({ workbench, workspaceRoot, active: active2, mounted: true }),
    [workbench, workspaceRoot, active2]
  );
  const current2 = reactExports.useRef(lifetime);
  current2.current = lifetime;
  reactExports.useLayoutEffect(() => {
    lifetime.mounted = true;
    return () => {
      lifetime.mounted = false;
    };
  }, [lifetime]);
  return reactExports.useMemo(() => {
    if (!workbench || !workspaceRoot || !active2) return;
    return createFrameChatComposer({
      workspaceId: workspaceRoot,
      resources: workbench.resources,
      compositions: { workspaceRoot, reader: workbench.structure },
      assertLive() {
        if (current2.current !== lifetime || !lifetime.mounted)
          throw new Error("CHAT_SCOPE_RETIRED");
      }
    });
  }, [workbench, workspaceRoot, active2, lifetime]);
}

export async function readCompositionResources(compositions, resources, compositionId, options2) {
  const composition2 = await compositions.get(compositionId, options2);
  if (composition2.compositionId !== compositionId || composition2.lifecycle !== "active")
    throw new Error("Composition unavailable");
  const ids2 = [
    ...new Set(
      composition2.members.flatMap((member2) => member2.resource === null ? [] : [member2.resource])
    )
  ];
  const details = [];
  for (let offset2 = 0; offset2 < ids2.length; offset2 += 50) {
    const batch2 = ids2.slice(offset2, offset2 + 50);
    const results = await resources.getResources(
      batch2.map((resourceId2) => ({ resourceId: resourceId2 })),
      options2
    );
    if (results.length !== batch2.length) throw new Error("Incomplete composition resources");
    for (const [index2, result] of results.entries()) {
      if (!result.ok || result.detail.resource.resourceId !== batch2[index2] || result.detail.resource.lifecycle !== "active" || result.detail.version?.status !== "ready")
        throw new Error("Composition resource unavailable");
      details.push({ resource: result.detail.resource, version: result.detail.version });
    }
  }
  if (!details.length) throw new Error("Composition has no readable files");
  return { composition: composition2, details };
}

export async function readCompositionFiles(workbench, compositionId, workspaceRoot) {
  const { composition: composition2, details } = await readCompositionResources(
    workbench.structure,
    workbench.resources,
    compositionId
  );
  const files = [];
  for (const { resource: resource2, version: version2 } of details) {
    const relativePath = version2.relativePath;
    if (
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Reject unsafe characters before passing paths to native file operations.
      /^[\\/]|^[a-z]:|[\u0000-\u001f]/i.test(relativePath) || relativePath.split(/[\\/]/).some((part) => part === ".." || part === ".")
    )
      throw new Error("Invalid resource path");
    const absolutePath = resolveResourceAbsolutePath(workspaceRoot, relativePath);
    if (!absolutePath) throw new Error("Workspace unavailable");
    const extension2 = relativePath.split(/[\\/]/).at(-1)?.match(/\.[^.]+$/)?.[0] ?? "";
    const displayName2 = resource2.name.toLowerCase().endsWith(extension2.toLowerCase()) ? resource2.name : `${resource2.name}${extension2}`;
    files.push({ workspaceRelPath: relativePath, absolutePath, displayName: displayName2 });
  }
  return { composition: composition2, files };
}

export function WorkspaceCompositionActions({
  children: children2,
  active: active2
}) {
  const workbench = useWorkbench();
  const workspaceRoot = useCurrentWorkspace();
  const composer = useWorkspaceChatComposer(workbench, workspaceRoot, active2);
  const gatewayFetch2 = useGatewayFetch();
  const { saveManyAs } = useMediaActions();
  const { t: t2 } = useTranslation();
  const [files, setFiles] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  const inFlight = reactExports.useRef(false);
  const live = reactExports.useRef({ active: active2, workbench, workspaceRoot, mounted: true });
  live.current = { active: active2, workbench, workspaceRoot, mounted: live.current.mounted };
  reactExports.useEffect(() => {
    live.current.mounted = true;
    return () => {
      live.current.mounted = false;
    };
  }, []);
  async function handleAction(id2, action2) {
    if (inFlight.current || !active2 || !workspaceRoot) return;
    inFlight.current = true;
    setBusy(true);
    const stillCurrent = () => live.current.mounted && live.current.active && live.current.workbench === workbench && live.current.workspaceRoot === workspaceRoot;
    try {
      if (action2 === "chat") {
        await composer?.draft({ compositions: [{ compositionId: id2 }] });
        return;
      }
      const resolved = await readCompositionFiles(workbench, id2, workspaceRoot);
      if (!stillCurrent()) return;
      if (action2 === "collect") {
        setFiles(resolved.files);
      } else {
        const exportFiles = async (selected2) => {
          if (!stillCurrent()) return;
          await withCanvasTagDownloadActivity({
            gatewayFetch: gatewayFetch2,
            workspaceDir: workspaceRoot,
            ownerPid: getRuntimeConfig().rendererPid,
            task: () => saveManyAs(selected2, {
              rootFolderName: resolved.composition.name || t2("canvas.subject.identity.untitled"),
              onRetry: (failed) => {
                void exportFiles(failed).catch(() => dedupedToast.error(t2("common.saveFailed")));
              }
            })
          });
        };
        await exportFiles(
          resolved.files.map((file) => ({
            filePath: file.absolutePath,
            fileName: file.displayName
          }))
        );
      }
    } catch {
      if (!stillCurrent()) return;
      window.hilo?.logger?.error(`[composition-actions] ${action2} failed`, "composition-actions");
      dedupedToast.error(
        t2(action2 === "export" ? "common.saveFailed" : "workspace.structure.actionFailed")
      );
    } finally {
      inFlight.current = false;
      if (live.current.mounted) setBusy(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CompositionActionsProvider,
      {
        actions: {
          busy,
          addToChat: (id2) => void handleAction(id2, "chat"),
          collect: (id2) => void handleAction(id2, "collect"),
          export: (id2) => void handleAction(id2, "export")
        },
        children: children2
      }
    ),
    files && /* @__PURE__ */ jsxRuntimeExports.jsx(
      PromoteToAssetDialog,
      {
        files,
        workspaceRoot: workspaceRoot ?? null,
        onClose: () => setFiles(null)
      }
    )
  ] });
}

export function createDetailReferenceImports$1(workbench, createBatch) {
  return createBatch(async (path2, init2) => {
    const prefix = `${CANVAS_V3_ROUTES.images}/`;
    const file = init2?.body instanceof FormData ? init2.body.get("file") : null;
    if (!workbench.importCanvasImage || init2?.method !== "POST" || !path2.startsWith(prefix) || !(file instanceof File))
      throw new Error("CANVAS_V3_IMPORT_UNAVAILABLE");
    const result = await workbench.importCanvasImage(
      { importId: decodeURIComponent(path2.slice(prefix.length)), name: file.name, file },
      init2.signal ? { signal: init2.signal } : void 0
    );
    return Response.json(result);
  });
}

export const DocumentContent$1 = reactExports.memo(function DocumentContent2({
  text: text2,
  plain
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm leading-relaxed [overflow-wrap:anywhere] [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-medium [&_h2]:my-3 [&_h2]:font-medium [&_h3]:my-2 [&_h3]:font-medium [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_code]:text-xs [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2", children: plain ? /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "m-0 whitespace-pre-wrap break-words font-sans", children: text2 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
    Markdown,
    {
      remarkPlugins: [remarkGfm],
      skipHtml: true,
      components: {
        a: ({ children: children2, href }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href,
            target: "_blank",
            rel: "noreferrer",
            className: "underline underline-offset-2",
            children: children2
          }
        ),
        img: ({ alt }) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: alt })
      },
      children: text2
    }
  ) });
});

export function DocumentFullscreenPreview({
  name: name2,
  closeLabel,
  onClose,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DialogRoot,
    {
      open: true,
      onOpenChange: (open) => {
        if (!open) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogBackdrop, { className: "fixed inset-0 z-[60] bg-background/80" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DialogPopup,
          {
            "data-action-ui-id": "resource-document-fullscreen",
            className: "fixed inset-4 z-[60] flex min-h-0 flex-col rounded-lg border border-border bg-background text-foreground shadow-lg outline-none",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "min-w-0 truncate text-base font-medium", children: name2 }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  DialogClose$1,
                  {
                    render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button$3,
                      {
                        variant: "ghost",
                        size: "icon",
                        "aria-label": closeLabel,
                        "data-action-ui-id": "resource-document-fullscreen-close"
                      }
                    ),
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$8, { className: "size-4", strokeWidth: 1.5 })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "min-h-0 flex-1 overflow-auto overscroll-contain p-6",
                  "data-slot": "resource-document-fullscreen-content",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-5xl", children: children2 })
                }
              )
            ]
          }
        )
      ] })
    }
  );
}

export function useDocumentContent(resourceId2, versionId) {
  const { host, scopeKey } = useWorkbench();
  return useInfiniteQuery({
    queryKey: [...resourceQueryKeys.all(scopeKey), "document", resourceId2, versionId],
    initialPageParam: { startLine: 1, contentRevision: void 0 },
    queryFn: async ({ pageParam, signal }) => {
      const page2 = await readResourceDocument(host, resourceId2, versionId, {
        startLine: pageParam.startLine,
        signal
      });
      if (pageParam.contentRevision !== void 0 && (page2.contentRevision ?? 1) !== pageParam.contentRevision)
        throw new Error("DOCUMENT_CONTENT_REVISION_CHANGED");
      return page2;
    },
    getNextPageParam: (page2) => page2.more && page2.lineCount > 0 ? { startLine: page2.startLine + page2.lineCount, contentRevision: page2.contentRevision ?? 1 } : void 0,
    staleTime: Infinity,
    retry: false,
    networkMode: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function DocumentPreview({ resourceId: resourceId2, versionId, name: name2, labels }) {
  const { t: t2 } = useTranslation();
  const [fullscreen, setFullscreen] = reactExports.useState(false);
  const query = useDocumentContent(resourceId2, versionId);
  const { hasNextPage: hasNextPage2, isFetching, isError, fetchNextPage } = query;
  reactExports.useEffect(() => {
    if (fullscreen && hasNextPage2 && !isFetching && !isError) void fetchNextPage();
  }, [fullscreen, hasNextPage2, isFetching, isError, fetchNextPage]);
  const pages = query.data?.pages;
  const text2 = pages?.map((page2) => page2.text).join("\n") ?? "";
  const content2 = /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    query.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-sm text-muted-foreground", children: labels.loading }),
    pages && (text2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentContent$1, { text: text2, plain: pages[0].media.mimeType === "text/plain" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: t2("workspace.resourcePreview.documentEmpty") })),
    isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { role: "alert", className: "text-sm text-muted-foreground", children: [
      labels.loadError,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button$3,
        {
          variant: "ghost",
          size: "sm",
          onClick: () => void (query.isFetchNextPageError && query.error?.message !== "DOCUMENT_CONTENT_REVISION_CHANGED" ? fetchNextPage() : query.refetch()),
          children: labels.retry
        }
      )
    ] }),
    hasNextPage2 && !isError && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "outline",
        size: "sm",
        disabled: isFetching,
        onClick: () => void fetchNextPage(),
        children: isFetching ? labels.loading : t2("workspace.resourcePreview.more")
      }
    ),
    pages?.at(-1)?.more && !hasNextPage2 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-sm text-muted-foreground", children: t2("workspace.resourcePreview.incomplete") })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex size-full min-h-0 flex-col pt-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "ghost",
        size: "icon",
        className: "absolute right-2 top-2",
        "aria-label": t2("canvas.fullscreenPreview"),
        "data-action-ui-id": "resource-document-expand",
        onClick: () => setFullscreen(true),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Maximize, { className: "size-4", strokeWidth: 1.5 })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 space-y-3 overflow-auto overscroll-contain px-4 pb-4", children: content2 }),
    fullscreen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      DocumentFullscreenPreview,
      {
        name: name2,
        closeLabel: t2("common.close"),
        onClose: () => setFullscreen(false),
        children: content2
      }
    )
  ] });
}

export function ResourcePreview(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "size-full", "data-slot": "resource-preview", children: props.kind === ProjectResourceKind.TEXT_DOCUMENT ? /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentPreview, { ...props }, `${props.resourceId}:${props.versionId}`) : /* @__PURE__ */ jsxRuntimeExports.jsx(MediaPreview$1, { ...props }, `${props.resourceId}:${props.versionId}`) });
}

export function MediaPreview$1({ resourceId: resourceId2, versionId, kind: kind2, name: name2, labels }) {
  const mediaKind2 = kind2 === ProjectResourceKind.IMAGE ? "image" : kind2 === ProjectResourceKind.VIDEO ? "video" : kind2 === ProjectResourceKind.AUDIO ? "audio" : "other";
  const { src, isLoading, isError } = useVersionMediaSource(resourceId2, versionId, mediaKind2);
  if (isLoading)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "status",
        className: "flex size-full items-center justify-center text-sm text-muted-foreground",
        children: labels.loading
      }
    );
  if (isError || !src)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "status",
        className: "flex size-full items-center justify-center text-sm text-muted-foreground",
        children: labels.mediaUnavailable
      }
    );
  if (mediaKind2 === "image")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ImagePreview, { src, name: name2, unavailableLabel: labels.mediaUnavailable }, src);
  if (mediaKind2 === "video")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(VideoPreview, { src, unavailableLabel: labels.mediaUnavailable }, src);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AudioPreview, { src, name: name2, unavailableLabel: labels.mediaUnavailable }, src);
}

export function useDetailPricing() {
  const { host, scopeKey } = useWorkbench();
  return useQuery({
    queryKey: ["resource-detail-pricing", scopeKey],
    enabled: Boolean(host.billing?.readPricing),
    queryFn: async ({ signal }) => {
      if (!host.billing?.readPricing) throw new Error("BILLING_PRICING_UNAVAILABLE");
      const response = await host.billing?.readPricing({ signal });
      if (!response.ok) throw new Error(`BILLING_PRICING_HTTP_${response.status}`);
      return mapPricingResponse(await response.json());
    },
    staleTime: 3e4,
    retry: false
  });
}

export function useDetailFontSize() {
  const usePreference = useCanvasV3HostServices().usePromptFontSize ?? useStoredDetailFontSize;
  return usePreference();
}

export function useStoredDetailFontSize() {
  const { host } = useWorkbench();
  const [size2, setSize] = reactExports.useState(PROMPT_FONT_SIZE_DEFAULT);
  const changed = reactExports.useRef(false);
  reactExports.useEffect(() => {
    let active2 = true;
    void host.preferences?.get("hilo:canvas:prompt-font-size").then((value) => {
      if (active2 && !changed.current && value?.trim())
        setSize(normalizePromptFontSize$1(Number(value)));
    }).catch(() => {
    });
    return () => {
      active2 = false;
    };
  }, [host]);
  const change = reactExports.useCallback(
    (value) => {
      changed.current = true;
      const next2 = normalizePromptFontSize$1(value);
      setSize(next2);
      void host.preferences?.set("hilo:canvas:prompt-font-size", String(next2)).catch(() => {
      });
    },
    [host]
  );
  return [size2, change];
}

export function useDetailReferenceOptions(references) {
  const { queries, scopeKey } = useWorkbench();
  const previews = useQueries({
    queries: references.map((reference) => {
      const input = resourceThumbnailQuery({
        versionId: reference.versionId,
        kind: referenceResourceKind(reference.kind)
      });
      return {
        queryKey: [...resourceQueryKeys.all(scopeKey), "preview", input],
        enabled: queries.available && input !== null,
        queryFn: ({ signal }) => {
          if (!input) throw new Error("RESOURCE_PREVIEW_UNAVAILABLE");
          return queries.query("resource_preview", input, { signal });
        },
        networkMode: "always",
        staleTime: Number.POSITIVE_INFINITY,
        retry: false,
        refetchOnWindowFocus: false
      };
    })
  });
  return references.map((reference, index2) => ({
    ...reference,
    url: previewImageDataUrl(previews[index2].data) ?? ""
  }));
}

export const alwaysReady = () => true;

export const noSubscription$1 = () => () => {
};

export function useDetailReady() {
  const { host } = useWorkbench();
  return reactExports.useSyncExternalStore(
    host.readiness?.subscribe ?? noSubscription$1,
    host.readiness?.getSnapshot ?? alwaysReady,
    alwaysReady
  );
}

export function createDetailReferenceImports(workbench) {
  return createDetailReferenceImports$1(
    workbench,
    (request) => new CanvasV3ReferenceImports(request)
  );
}

export function useDetailCanvasImages(enabled) {
  const workbench = useWorkbench();
  const images = reactExports.useSyncExternalStore(
    workbench.host.canvas?.subscribeImages ?? emptySubscribe$1,
    workbench.host.canvas?.getImagesSnapshot ?? emptySnapshot
  );
  const compositionIds = [...new Set(images.map((image2) => image2.compositionId))];
  const compositions = useQueries({
    queries: workbench ? compositionIds.map((id2) => ({
      ...createCompositionQueryOptions(workbench.structure, workbench.scopeKey).details(id2),
      enabled
    })) : []
  });
  const batches = compositions.flatMap(
    ({ data: data2 }) => workbench && data2 && data2.lifecycle === CompositionLifecycle.ACTIVE ? resourceBatches(
      data2.members.flatMap(
        (member2) => (member2.resource ? [member2.resource] : []).map((resourceId2) => ({
          scopeKey: workbench.scopeKey,
          compositionId: data2.compositionId,
          memberId: member2.memberId,
          resourceId: resourceId2
        }))
      )
    ) : []
  );
  const uniqueBatches = [
    ...new Map(batches.map((batch2) => [JSON.stringify(batch2), batch2])).values()
  ];
  const resources = useQueries({
    queries: workbench ? uniqueBatches.map((batch2) => ({
      ...createResourceQueryOptions(workbench.resources, workbench.scopeKey).details(batch2),
      enabled
    })) : []
  });
  const details = new Map(
    resources.flatMap(
      ({ data: data2 }) => (data2 ?? []).flatMap(
        (result) => result.ok ? [[result.detail.resource.resourceId, result.detail]] : []
      )
    )
  );
  return images.flatMap(({ compositionId, resourceId: resourceId2 }) => {
    const composition2 = compositions[compositionIds.indexOf(compositionId)]?.data;
    const member2 = composition2?.members.find((member22) => member22.resource === resourceId2);
    const detail2 = details.get(resourceId2);
    if (composition2?.lifecycle !== CompositionLifecycle.ACTIVE || !member2 || detail2?.resource.kind !== ProjectResourceKind.IMAGE || detail2.resource.lifecycle !== ProjectResourceLifecycle.ACTIVE || detail2.version?.status !== ProjectResourceVersionStatus.READY)
      return [];
    return [
      {
        resourceId: resourceId2,
        versionId: detail2.version.versionId,
        title: member2.role.trim() || detail2.resource.name
      }
    ];
  });
}

export function ResourceReferencePicker({
  onClose,
  onSelect,
  references,
  maxCount = 20
}) {
  const workbench = useWorkbench();
  const images = useDetailCanvasImages(true);
  const canvasReferences = useDetailReferenceOptions(
    images.map((image2) => ({ ...image2, name: image2.title, source: "resource" }))
  );
  const imports = reactExports.useMemo(
    () => ({ batch: createDetailReferenceImports(workbench), cancelled: false }),
    [workbench]
  );
  reactExports.useEffect(() => {
    if (imports.cancelled) {
      imports.batch = createDetailReferenceImports(workbench);
      imports.cancelled = false;
    }
    return () => {
      imports.batch.cancel();
      imports.cancelled = true;
    };
  }, [imports, workbench]);
  const resolveResource = async (source, signal) => {
    const [result] = await workbench.resources.getResources([source], { signal });
    if (!result?.ok || result.detail.resource.resourceId !== source.resourceId || result.detail.resource.kind !== ProjectResourceKind.IMAGE || result.detail.resource.lifecycle !== ProjectResourceLifecycle.ACTIVE || result.detail.version?.versionId !== source.versionId || result.detail.version.status !== ProjectResourceVersionStatus.READY)
      throw new Error("RESOURCE_REFERENCE_UNAVAILABLE");
    const image2 = images.find(
      (image22) => image22.resourceId === source.resourceId && image22.versionId === source.versionId
    );
    return { ...source, name: image2?.title ?? result.detail.resource.name, source: "resource" };
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CanvasV3ResourcePickerDialog,
    {
      open: true,
      scope: workbench,
      fetch: workbench.host.resource.request,
      url: noUrl,
      preferences: workbench.host.preferences ?? null,
      renderThumbnail: (reference) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        ResourceThumbnail,
        {
          versionId: reference.versionId,
          kind: ProjectResourceKind.IMAGE,
          className: "size-full"
        }
      ),
      resolveResource,
      onClose,
      onSelect: (refs) => onSelect(canvasV3PromptReferences(refs)),
      maxCount,
      tabs: ["assets", "canvas", "upload"],
      canvasReferences,
      alreadyAddedReferences: references,
      hasPendingImports: () => imports.batch.hasPending,
      onImportFiles: workbench.importCanvasImage ? (files) => imports.batch.run(files) : void 0
    }
  );
}

export function ResourceReferencePreview({
  reference,
  onClose
}) {
  const { t: t2 } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogRoot, { open: true, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogBackdrop, { className: "modal-mask fixed inset-0 z-50" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPopup, { className: "fixed left-1/2 top-1/2 z-50 flex h-[70vh] w-[80vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-popover p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "pr-8 text-sm font-medium", children: reference.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DialogClose$1,
        {
          render: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              variant: "ghost",
              size: "icon",
              "aria-label": t2("common.close"),
              className: "absolute right-2 top-2 size-8"
            }
          ),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$8, { className: "size-4", strokeWidth: 1.5 })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ResourcePreview,
        {
          resourceId: reference.resourceId,
          versionId: reference.versionId,
          kind: referenceResourceKind(reference.kind),
          name: reference.name,
          labels: {
            loading: t2("common.loading"),
            loadError: t2("workspace.composition.resourceError"),
            retry: t2("common.retry"),
            mediaUnavailable: t2("workspace.structure.detail.mediaUnavailable")
          }
        }
      ) })
    ] })
  ] }) });
}

export function editorReference(reference) {
  return { ...reference, kind: reference.kind === "file" ? "text" : reference.kind };
}

export function ResourceAgentInput(props) {
  const { scopeKey } = useWorkbench();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ResourceAgentInputBody,
    {
      ...props
    },
    `${scopeKey}:${props.target.resourceId}:${props.target.versionId ?? ""}`
  );
}

export function ResourceAgentInputBody({
  target,
  expanded = false,
  compact: compact2 = false,
  onToggleExpanded,
  fontSizePreference,
  renderReferences
}) {
  const { host, scopeKey } = useWorkbench();
  const { t: t2 } = useTranslation();
  const ready2 = useDetailReady();
  const storedFontSize = useDetailFontSize();
  const [fontSize, setFontSize] = fontSizePreference ?? storedFontSize;
  const [text2, setText] = reactExports.useState("");
  const [busy, setBusy] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const selectedReference = target.versionId ? [
    {
      resourceId: target.resourceId,
      versionId: target.versionId,
      name: target.resourceName,
      kind: target.kind === ProjectResourceKind.IMAGE ? "image" : target.kind === ProjectResourceKind.VIDEO ? "video" : target.kind === ProjectResourceKind.AUDIO ? "audio" : target.kind === ProjectResourceKind.TEXT_DOCUMENT ? "text" : "file",
      source: "resource"
    }
  ] : [];
  const [attachments, setAttachments] = reactExports.useState(selectedReference);
  const [editing, setEditing] = reactExports.useState(false);
  const input = reactExports.useRef(null);
  const [pickerOpen, setPickerOpen] = reactExports.useState(false);
  const references = useDetailReferenceOptions(
    attachments.map(
      (reference) => reference.resourceId === target.resourceId && reference.versionId === target.versionId ? { ...reference, name: target.resourceName } : reference
    )
  );
  const editorReferences = references.map(editorReference);
  const sending = reactExports.useRef(null);
  reactExports.useLayoutEffect(() => () => sending.current?.abort(), []);
  const canSend = Boolean(ready2 && host.chat && text2.trim() && !busy && !pickerOpen && !editing);
  async function handleSend() {
    if (!canSend || sending.current || !host.chat) return;
    const controller = new AbortController();
    sending.current = controller;
    setBusy(true);
    setError(void 0);
    const submitted = text2;
    const targetContext = [
      "Selected resource version (current editing target):",
      `resourceId=${target.resourceId}`,
      ...target.versionId ? [`versionId=${target.versionId}`] : []
    ].join("\n").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    try {
      await host.chat.send(
        {
          text: prependHiddenContext(
            compileCanvasV3Prompt(submitted, attachments),
            `<asset_context>
${targetContext}
</asset_context>`
          ),
          resources: attachments.map(({ resourceId: resourceId2, versionId }) => ({ resourceId: resourceId2, versionId }))
        },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setText((current2) => current2 === submitted ? "" : current2);
      setAttachments(selectedReference);
    } catch {
      if (!controller.signal.aborted) setError(t2("chat.sendFailed"));
    } finally {
      if (sending.current === controller) {
        sending.current = null;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  }
  const referenceProps = {
    references,
    disabled: busy || !ready2,
    onAdd: () => setPickerOpen(true),
    onRemove: (reference) => {
      setAttachments((items) => items.filter((item) => item.versionId !== reference.versionId));
      setText((value) => removeCanvasV3PromptReference(value, reference.versionId));
    },
    onReference: (reference) => input.current?.insertReference(editorReference(reference)),
    onReplace: (previous2, next2, append2 = false) => {
      setAttachments(
        (items) => mergeCanvasV3References(
          append2 ? items : items.filter((item) => item.versionId !== previous2.versionId),
          [next2]
        )
      );
      if (!append2)
        setText(
          (value) => value.replaceAll(
            canvasV3ReferenceToken(previous2.versionId),
            canvasV3ReferenceToken(next2.versionId)
          )
        );
    },
    onEditingChange: setEditing
  };
  const promptMeta = /* @__PURE__ */ jsxRuntimeExports.jsx(
    PromptInputMetaRowView,
    {
      fontSize,
      onFontSizeChange: setFontSize,
      getPromptText: () => text2,
      copyDisabled: !text2.length || !host.clipboard,
      clipboard: host.clipboard ?? null,
      currentLength: Array.from(text2).length
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "canvas-prompt-font-size-editor col-span-2 flex h-full min-h-0 min-w-0 flex-col",
      style: { "--canvas-prompt-font-size": fontSize },
      "data-action-ui-id": "resource-detail-chat.agent",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ComposerPanelLayout,
          {
            expanded,
            onToggleExpanded,
            attachments: renderReferences ? renderReferences(referenceProps) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              CanvasV3ReferenceBar,
              {
                references: editorReferences,
                disabled: busy || !ready2,
                resourceScopeKey: scopeKey,
                renderPreview: (reference, onClose) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ResourceReferencePreview,
                  {
                    reference: references.find((item) => item.versionId === reference.versionId) ?? reference,
                    onClose
                  }
                ),
                onAdd: referenceProps.onAdd,
                onRemove: referenceProps.onRemove,
                onItemClick: referenceProps.onReference
              }
            ),
            notices: error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "text-xs text-destructive", children: error }),
            actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              compact2 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "[&>div]:mt-0", children: promptMeta }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                SubmitButton,
                {
                  submitting: busy,
                  canSubmit: canSend,
                  title: t2("chat.send"),
                  onClick: () => void handleSend()
                }
              )
            ] }),
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-0 flex-col", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                CanvasV3PromptInput,
                {
                  inputRef: input,
                  prompt: text2,
                  options: editorReferences,
                  selected: editorReferences,
                  disabled: busy || editing,
                  expanded,
                  fillHeight: true,
                  fontSize,
                  onChange: setText,
                  onAddReference: (reference) => setAttachments((items) => mergeCanvasV3References(items, [reference])),
                  onSubmit: () => void handleSend(),
                  placeholder: t2("chat.placeholder")
                }
              ),
              !compact2 && promptMeta
            ] })
          }
        ),
        pickerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceReferencePicker,
          {
            onClose: () => setPickerOpen(false),
            onSelect: (selected2) => {
              setAttachments((items) => mergeCanvasV3References(items, selected2));
              setPickerOpen(false);
            },
            references: editorReferences,
            maxCount: Math.max(0, CHAT_FRAME_RESOURCE_LIMIT - attachments.length)
          }
        )
      ]
    }
  );
}

export function ResourceChat(props) {
  const workbench = useWorkbench();
  const { t: t2 } = useTranslation();
  const [mode2, setMode] = reactExports.useState("agent");
  if (!workbench.host.chat && !workbench.host.task?.request)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-xs text-muted-foreground", children: t2("workspace.structure.detail.chat.unavailable") });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ResourceDetailChatBody,
    {
      target: props,
      mode: projectGenerationKindOfResource(props.kind) ? mode2 : "agent",
      onModeChange: setMode
    },
    `${workbench.scopeKey}:${props.resourceId}:${props.versionId ?? ""}`
  );
}

export function ResourceDetailChatBody({
  target,
  mode: mode2,
  onModeChange: setMode
}) {
  const { t: t2 } = useTranslation();
  const workbench = useWorkbench();
  const scopedWorkbench = workbench;
  const ready2 = useDetailReady();
  const fetch2 = workbench.host.task?.request;
  const mediaKind2 = projectGenerationKindOfResource(target.kind);
  const supportsPromptMode = mediaKind2 !== void 0;
  const historyQuery = useQuery({
    queryKey: [
      "resource-detail-history",
      workbench.scopeKey,
      target.resourceId,
      target.versionId,
      target.taskId
    ],
    queryFn: async ({ signal }) => target.versionId ? await workbench.resourceDetail.history(
      { resourceId: target.resourceId, versionId: target.versionId },
      target.taskId,
      { signal }
    ) ?? null : null,
    enabled: Boolean(mode2 === "prompt" && fetch2 && target.versionId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false
  });
  const historyMissing = historyQuery.error instanceof ResourceGenerationHistoryUnavailableError;
  const historyReady = historyQuery.isSuccess || historyMissing;
  const modelsQuery = useQuery({
    queryKey: ["canvas-v3-models", workbench?.scopeKey, mediaKind2],
    queryFn: ({ signal }) => mediaKind2 && fetch2 ? loadCanvasV3Models(fetch2, mediaKind2, signal) : [],
    enabled: Boolean(fetch2 && supportsPromptMode && mode2 === "prompt"),
    staleTime: 3e4,
    retry: false
  });
  const { data: pricingConfig } = useDetailPricing();
  const preferenceQuery = useQuery({
    queryKey: ["resource-detail-model-preference", workbench.scopeKey],
    queryFn: async () => {
      const value = await workbench.host.preferences?.get(CANVAS_V3_IMAGE_MODEL_PREFERENCE_KEY);
      return readCanvasV3ImageModelPreference(() => ({
        getItem: () => value ?? null,
        setItem: () => {
        }
      })) ?? null;
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false
  });
  const initialized2 = reactExports.useRef(false);
  const [selection2, setSelection] = reactExports.useState(null);
  const models = reactExports.useMemo(
    () => (modelsQuery.data ?? []).filter((model) => !model.info.hideInModelPicker),
    [modelsQuery.data]
  );
  const selectedModel = models.find((model) => model.id === selection2?.modelId);
  const params = reactExports.useMemo(
    () => selectedModel ? capabilityForm(selectedModel.capability, selection2?.params) : {},
    [selectedModel, selection2]
  );
  const [prompt, setPrompt] = reactExports.useState("");
  const [attachments, setAttachments] = reactExports.useState([]);
  const [closingFrame, setClosingFrame] = reactExports.useState();
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [generation, setGeneration] = reactExports.useState();
  const generationQuery = useQuery({
    ...createTaskQueryOptions(scopedWorkbench.execution, scopedWorkbench.scopeKey).detail(
      generation?.task.id ?? ""
    ),
    enabled: Boolean(generation && workbench)
  });
  const generationTask = generationQuery.data?.task ?? generation?.task;
  const resolveTask = useTaskResolve();
  const waitingForUser = generationTask?.status === "waiting_user";
  const busy = submitting || Boolean(generationTask && !generationTask.terminal);
  const generating = busy && !waitingForUser;
  const [expanded, setExpanded] = reactExports.useState(false);
  const [fontSize, setFontSize] = useDetailFontSize();
  const [paramsOpen, setParamsOpen] = reactExports.useState(false);
  const [pickerOpen, setPickerOpen] = reactExports.useState(false);
  const submittingRef = reactExports.useRef(false);
  const inputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!generation || !generationTask?.terminal) return;
    setGeneration(void 0);
    if (generationTask.status === "completed") {
      scopedWorkbench.invalidateResources({
        scopeKey: scopedWorkbench.scopeKey,
        resourceIds: [generation.resourceId]
      });
      setPrompt("");
      setAttachments([]);
      setClosingFrame(void 0);
      dedupedToast.success(t2("workspace.structure.detail.chat.generated"));
    } else if (generationTask.status === "cancelled") {
      dedupedToast.info(t2("canvasV3.generation.stopped"));
    } else {
      dedupedToast.error(generationTask.problem?.message ?? t2("canvas.generateFailed"));
    }
  }, [generation, generationTask, scopedWorkbench, t2]);
  reactExports.useEffect(() => {
    if (initialized2.current || mode2 !== "prompt" || !historyReady || !modelsQuery.isSuccess || preferenceQuery.isPending)
      return;
    initialized2.current = true;
    const history2 = historyQuery.data;
    const restored = history2?.references.map((ref) => ({
      resourceId: ref.resourceId,
      versionId: ref.versionId,
      name: ref.name,
      source: "resource",
      ...restoredReferenceKind(referenceMediaKind(ref.kind))
    })) ?? [];
    setAttachments(restored);
    setClosingFrame(history2?.lastFrameOnly ? restored[0]?.versionId : void 0);
    setPrompt(
      history2 ? restoreCanvasV3ReferencePrompt(
        history2.prompt,
        restored,
        history2.references.map((ref) => referenceMediaKind(ref.kind)),
        mediaKind2 === "video"
      ) : ""
    );
    setSelection(
      history2 ? { modelId: history2.modelId ?? "", params: history2.params } : initialCanvasV3ImageModelSelection(models, preferenceQuery.data ?? void 0)
    );
  }, [
    mode2,
    historyReady,
    historyQuery.data,
    modelsQuery.isSuccess,
    models,
    preferenceQuery.isPending,
    preferenceQuery.data,
    mediaKind2
  ]);
  const canvasImages = useDetailCanvasImages(mode2 === "prompt");
  const referenceOptions = useDetailReferenceOptions(
    mergeCanvasV3References(
      attachments.map((reference) => ({
        ...reference,
        name: canvasImages.find(
          (image2) => image2.resourceId === reference.resourceId && image2.versionId === reference.versionId
        )?.title ?? reference.name
      })),
      canvasImages.map((ref) => ({
        resourceId: ref.resourceId,
        versionId: ref.versionId,
        name: ref.title || t2("canvas.image"),
        source: "resource"
      }))
    )
  );
  const allReferences = referenceOptions.filter(
    (ref) => attachments.some(
      (item) => item.resourceId === ref.resourceId && item.versionId === ref.versionId
    )
  );
  const availableReferences = referenceOptions;
  let missingReference = false;
  try {
    compileCanvasV3Prompt(prompt, allReferences, mediaKind2 === "video");
  } catch {
    missingReference = true;
  }
  const countedPrompt = canvasV3PromptMentions(prompt).reduceRight(
    (text2, mention) => text2.slice(0, mention.from) + text2.slice(mention.to),
    prompt
  );
  const promptLength = Array.from(countedPrompt).length;
  const budget = canvasV3ModelReferenceBudget(selectedModel, params);
  const maxReferences = budget?.max;
  const invalidReferences = missingReference || (mediaKind2 ? !canvasV3ModelReferencesValid(selectedModel, mediaKind2, allReferences, params) : false);
  const promptMaxLength = selectedModel?.capability.prompt.maxLength;
  const tooLong = !!promptMaxLength && promptLength > promptMaxLength;
  const canGenerate = Boolean(
    !busy && !pickerOpen && ready2 && workbench.host.billing?.guardSubmission && historyReady && initialized2.current && target.versionId && selectedModel && prompt.trim() && !invalidReferences && !tooLong
  );
  const handleGenerate = reactExports.useCallback(async () => {
    const baseVersionId = target.versionId;
    if (!canGenerate || !baseVersionId || !selectedModel || !mediaKind2 || submittingRef.current)
      return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (!await workbench.host.billing?.guardSubmission?.("canvas")) return;
      const compiled = compileCanvasV3Prompt(prompt, allReferences, mediaKind2 === "video");
      const versions = allReferences.map((ref) => ref.versionId);
      const openFirst = !!closingFrame && versions.length === 1 && versions[0] === closingFrame && canvasV3ModelLastFrameOnly(selectedModel, params);
      const task2 = await workbench.resourceDetail.generate({
        kind: target.kind,
        resourceId: target.resourceId,
        baseVersionId,
        modelId: selectedModel.id,
        prompt: compiled,
        params,
        references: openFirst ? [null, ...versions] : versions
      });
      if (mediaKind2 === "image")
        void workbench.host.preferences?.set(
          CANVAS_V3_IMAGE_MODEL_PREFERENCE_KEY,
          JSON.stringify({ modelId: selectedModel.id, params })
        ).catch(() => {
        });
      setGeneration({ task: task2, resourceId: target.resourceId });
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : t2("canvas.generateFailed"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    canGenerate,
    mediaKind2,
    target.kind,
    target.resourceId,
    target.versionId,
    selectedModel,
    prompt,
    params,
    allReferences,
    closingFrame,
    workbench,
    t2
  ]);
  async function handleRetry() {
    if (!workbench || !generationTask || resolveTask.isPending) return;
    try {
      await resolveTask.mutateAsync({
        taskId: generationTask.id,
        input: {
          requestId: crypto.randomUUID(),
          expectedRevision: generationTask.revision,
          action: "retry"
        }
      });
    } catch (error) {
      dedupedToast.error(error instanceof Error ? error.message : t2("canvas.generateFailed"));
    } finally {
      void generationQuery.refetch();
    }
  }
  const modeOptions = reactExports.useMemo(() => {
    const options2 = supportsPromptMode ? [
      { value: "agent", label: t2("workspace.structure.detail.chat.agentTab") },
      { value: "prompt", label: t2("workspace.structure.detail.chat.promptTab") }
    ] : [{ value: "agent", label: t2("workspace.structure.detail.chat.agentTab") }];
    return options2;
  }, [supportsPromptMode, t2]);
  const perCallCost = mediaKind2 === "image" && pricingConfig && selectedModel ? calcImageCost(
    pricingConfig,
    resolvePricingId(selectedModel.info),
    params.resolution,
    selectedModel.info.params.quality ? params.quality : void 0,
    allReferences.length
  ) : void 0;
  const summaryModel = selectedModel?.info;
  const copyText = canvasV3PromptMentions(prompt).reduceRight((text2, mention) => {
    const reference = allReferences.find((ref) => ref.versionId === mention.versionId);
    return `${text2.slice(0, mention.from)}@${reference?.name || mention.versionId}${text2.slice(mention.to)}`;
  }, prompt);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-action-ui-id": "resource-detail-chat.input",
      "data-expanded": expanded,
      "data-mode": mode2,
      className: "resource-detail-chat grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border border-border bg-card p-2",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SegmentedSwitch$1,
          {
            value: mode2,
            options: modeOptions,
            onValueChange: setMode,
            variant: "label",
            size: "sm",
            className: "self-start",
            ariaLabel: t2("workspace.structure.detail.chat.modeAria"),
            dataActionUiId: "resource-detail-chat.mode"
          }
        ),
        mode2 === "prompt" && mediaKind2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          ImageGenerationPanelContent,
          {
            mediaKind: mediaKind2,
            attachments: /* @__PURE__ */ jsxRuntimeExports.jsx(
              CanvasV3ReferenceBar,
              {
                references: allReferences,
                renderPreview: (reference, onClose) => /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceReferencePreview, { reference, onClose }),
                disabled: busy,
                resourceScopeKey: workbench?.scopeKey,
                onAdd: () => setPickerOpen(true),
                onItemClick: (reference) => inputRef.current?.insertReference(reference),
                onReplace: (reference) => inputRef.current?.replaceReference(reference),
                onRemove: (reference) => {
                  setAttachments(
                    (items) => items.filter((item) => item.versionId !== reference.versionId)
                  );
                  setPrompt((text2) => removeCanvasV3PromptReference(text2, reference.versionId));
                }
              }
            ),
            expanded,
            onToggleExpanded: () => setExpanded(!expanded),
            models: models.map((model) => model.info),
            selectedModel: summaryModel,
            modelParams: params,
            modelsLoading: modelsQuery.isLoading,
            formDisabled: busy || !initialized2.current,
            onModelChange: (modelId) => {
              const next2 = models.find((item) => item.id === modelId);
              if (!next2 || busy) return;
              setSelection({ modelId, params: capabilityForm(next2.capability, params) });
              setParamsOpen(false);
            },
            onParamChange: (key2, value) => {
              if (!selectedModel || busy) return;
              setSelection({
                modelId: selectedModel.id,
                params: capabilityForm(selectedModel.capability, { ...params, [key2]: value })
              });
            },
            disabledOptions: (key2, form2) => selectedModel ? disabledOptions(selectedModel.capability, form2, key2) : [],
            paramUnavailable: (key2, form2) => selectedModel ? paramDisabled(selectedModel.capability, form2, key2) : false,
            canSubmit: canGenerate,
            generating,
            creditCost: perCallCost,
            onSubmit: () => void handleGenerate(),
            paramsOpen,
            onParamsOpenChange: setParamsOpen,
            retryAction: generationTask?.actions.includes("retry") ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                variant: "outline",
                size: "sm",
                disabled: !workbench || resolveTask.isPending || generationQuery.isFetching,
                onClick: () => void handleRetry(),
                "data-action-ui-id": "resource-detail-chat.resolve-retry",
                children: t2(generationTask.terminal ? "common.retry" : "canvasV3.generation.checkBalance")
              }
            ) : generationQuery.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                variant: "outline",
                size: "sm",
                onClick: () => void generationQuery.refetch(),
                "data-action-ui-id": "resource-detail-chat.retry-task",
                children: t2("common.retry")
              }
            ) : historyQuery.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", disabled: busy, onClick: () => void historyQuery.refetch(), children: t2("common.retry") }) : modelsQuery.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", disabled: busy, onClick: () => modelsQuery.refetch(), children: t2("common.retry") }) : void 0,
            notices: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-16 shrink-0 overflow-y-auto text-xs empty:hidden", children: [
              historyQuery.isError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "text-destructive", children: t2(
                historyMissing ? "workspace.structure.detail.chat.historyMissing" : "workspace.structure.detail.chat.historyError"
              ) }),
              historyQuery.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-muted-foreground", children: t2("common.loading") }),
              historyQuery.data && !selectedModel && initialized2.current && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-muted-foreground", children: t2("workspace.structure.detail.chat.modelUnavailable") }),
              waitingForUser && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "status", className: "text-muted-foreground", children: generationTask.problem?.code === "BILLING_INSUFFICIENT" ? t2("chat.billingInsufficient.title") : generationTask.problem?.message ?? t2("canvasV3.generation.waiting") }),
              generationQuery.isError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "alert", className: "text-destructive", children: t2("canvasV3.generation.recoveryFailed") }),
              modelsQuery.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "status", className: "text-muted-foreground", children: t2("canvas.loadingModels") }),
              !modelsQuery.isLoading && !modelsQuery.isError && !selectedModel && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "status", className: "text-muted-foreground", children: t2("canvas.noModels") }),
              modelsQuery.isError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "alert", className: "text-destructive", children: t2("canvasV3.generation.modelsFailed") }),
              invalidReferences && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "alert", className: "text-muted-foreground", children: t2("canvas.reference.unavailable") }),
              tooLong && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { role: "alert", className: "text-destructive", children: t2("canvas.prompt.tooLong", {
                current: promptLength,
                max: promptMaxLength
              }) })
            ] }),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              CanvasV3PromptInput,
              {
                inputRef,
                fillHeight: true,
                maxReferences,
                onReplaceReference: (previous2, next2) => {
                  setAttachments(
                    (items) => mergeCanvasV3References(
                      items.filter((item) => item.versionId !== previous2.versionId),
                      [
                        {
                          resourceId: next2.resourceId,
                          versionId: next2.versionId,
                          name: next2.name,
                          source: "resource"
                        }
                      ]
                    )
                  );
                  setPrompt(
                    (text2) => canvasV3PromptMentions(text2).reduceRight(
                      (result, mention) => mention.versionId === previous2.versionId ? result.slice(0, mention.from) + canvasV3ReferenceToken(next2.versionId) + result.slice(mention.to) : result,
                      text2
                    )
                  );
                },
                onClose: () => {
                  if (paramsOpen) setParamsOpen(false);
                },
                onSubmit: () => void handleGenerate(),
                prompt,
                options: availableReferences,
                selected: allReferences,
                disabled: busy || !initialized2.current,
                expanded,
                fontSize,
                metadata: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  PromptInputMetaRowView,
                  {
                    getPromptText: () => copyText,
                    copyDisabled: !prompt.length || !workbench.host.clipboard,
                    clipboard: workbench.host.clipboard ?? null,
                    currentLength: promptLength,
                    maxLength: promptMaxLength,
                    fontSize,
                    onFontSizeChange: setFontSize
                  }
                ),
                onChange: (nextPrompt) => {
                  setPrompt(nextPrompt);
                  const previous2 = new Set(
                    canvasV3PromptMentions(prompt).map((item) => item.versionId)
                  );
                  const added = canvasV3PromptMentions(nextPrompt).flatMap((item) => {
                    if (previous2.has(item.versionId)) return [];
                    const ref = availableReferences.find(
                      (option2) => option2.versionId === item.versionId
                    );
                    return ref ? [
                      {
                        resourceId: ref.resourceId,
                        versionId: ref.versionId,
                        name: ref.name,
                        source: "resource"
                      }
                    ] : [];
                  });
                  if (added.length) {
                    setAttachments((items) => mergeCanvasV3References(items, added));
                  }
                },
                onAddReference: (reference) => {
                  setAttachments(
                    (items) => items.some((item) => item.versionId === reference.versionId) ? items : [
                      ...items,
                      {
                        resourceId: reference.resourceId,
                        versionId: reference.versionId,
                        name: reference.name,
                        source: "resource"
                      }
                    ]
                  );
                }
              }
            )
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { hidden: mode2 !== "agent", className: "col-span-2 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceAgentInput,
          {
            target,
            compact: true,
            expanded,
            onToggleExpanded: () => setExpanded((value) => !value),
            fontSizePreference: [fontSize, setFontSize]
          }
        ) }),
        pickerOpen && workbench && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceReferencePicker,
          {
            onClose: () => setPickerOpen(false),
            onSelect: (references) => {
              setAttachments((items) => mergeCanvasV3References(items, references));
              setPickerOpen(false);
            },
            references: allReferences,
            maxCount: maxReferences === void 0 ? 20 : Math.max(0, maxReferences - allReferences.length)
          }
        )
      ]
    }
  );
}

export function useResourceDetail(resourceId2) {
  const runtime = useWorkbench();
  const queries = reactExports.useMemo(
    () => createResourceQueryOptions(runtime.resources, runtime.scopeKey),
    [runtime.resources, runtime.scopeKey]
  );
  const detailQuery = useQuery(queries.details([{ resourceId: resourceId2 }]));
  const versionsQuery = useQuery({
    queryKey: [...resourceQueryKeys.versions(runtime.scopeKey, { resourceId: resourceId2 }), "all"],
    queryFn: ({ signal }) => readResourceVersionHistory(runtime.resources, resourceId2, signal),
    networkMode: "always",
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  const detailSection = toAsyncSectionState({
    hasData: detailQuery.data !== void 0 && versionsQuery.data !== void 0,
    isEmpty: false,
    isError: detailQuery.isError || versionsQuery.isError,
    isFetching: detailQuery.isFetching || versionsQuery.isFetching
  });
  const result = detailQuery.data?.[0];
  const detail2 = result?.ok ? result.detail : void 0;
  function refetch() {
    runtime.invalidateResources();
  }
  return {
    detail: detail2,
    versions: versionsQuery.data ?? [],
    status: detailSection.status,
    staleError: detailSection.staleError,
    refreshing: detailSection.refreshing,
    refetch
  };
}

export const ResourceChatRendererContext = reactExports.createContext(null);

export const ResourceChatTargetContext = reactExports.createContext(null);

export function useResourceChatRenderer() {
  return reactExports.useContext(ResourceChatRendererContext);
}

export function ResourceChatTargetProvider({
  target,
  children: children2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceChatTargetContext.Provider, { value: target, children: children2 });
}

export const handles = [
  { handle: "tl", left: "0%", top: "0%", cursor: "nwse-resize" },
  { handle: "tr", left: "100%", top: "0%", cursor: "nesw-resize" },
  { handle: "bl", left: "0%", top: "100%", cursor: "nesw-resize" },
  { handle: "br", left: "100%", top: "100%", cursor: "nwse-resize" },
  { handle: "t", left: "50%", top: "0%", cursor: "ns-resize" },
  { handle: "b", left: "50%", top: "100%", cursor: "ns-resize" },
  { handle: "l", left: "0%", top: "50%", cursor: "ew-resize" },
  { handle: "r", left: "100%", top: "50%", cursor: "ew-resize" }
];

export const ratios = ["free", "1:1", "4:3", "3:4", "16:9", "9:16"];

export function ResourceCropControls({
  src,
  geometry: geometry2,
  busy,
  onSubmit,
  onClose
}) {
  const { t: t2 } = useTranslation();
  const { cropRect, aspectRatio: aspectRatio2, handlePointerDown, setAspectRatio } = useImageCrop$1(
    geometry2.w,
    geometry2.h
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "pointer-events-none absolute inset-0",
      "data-action-ui-id": "resource-detail-crop-editor",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute overflow-hidden",
            style: { left: geometry2.x, top: geometry2.y, width: geometry2.w, height: geometry2.h },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "absolute border-2 border-background shadow-[0_0_0_9999px_var(--modal-mask-bg)]",
                style: {
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "pointer-events-auto absolute inset-0 cursor-move touch-none",
                      onPointerDown: (event) => !busy && handlePointerDown(event),
                      "data-action-ui-id": "resource-detail-crop-selection"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-none absolute inset-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 left-1/3 border-l border-background/30" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-y-0 right-1/3 border-r border-background/30" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-x-0 top-1/3 border-t border-background/30" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute inset-x-0 bottom-1/3 border-b border-background/30" })
                  ] }),
                  handles.map(({ handle: handle2, ...style2 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      disabled: busy,
                      "aria-label": `${t2("canvas.crop")} ${handle2}`,
                      "data-action-ui-id": `resource-detail-crop-handle-${handle2}`,
                      className: "pointer-events-auto absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border border-foreground bg-background hover:bg-muted",
                      style: style2,
                      onPointerDown: (event) => handlePointerDown(event, handle2)
                    },
                    handle2 ?? "move"
                  ))
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-auto absolute bottom-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-sm", children: [
          ratios.map((ratio) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              variant: aspectRatio2 === ratio ? "default" : "ghost",
              size: "sm",
              disabled: busy,
              onClick: () => setAspectRatio(ratio),
              "aria-pressed": aspectRatio2 === ratio,
              children: ratio === "free" ? t2("canvas.freeAspect") : ratio
            },
            ratio
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", size: "sm", disabled: busy, onClick: onClose, children: t2("common.cancel") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              size: "sm",
              disabled: busy,
              "data-action-ui-id": "resource-detail-crop-submit",
              onClick: () => void onSubmit(
                () => cropImageToBlob$1(src, cropRect, geometry2.originalWidth, geometry2.originalHeight)
              ).catch(() => {
              }),
              children: t2("common.confirm")
            }
          )
        ] })
      ]
    }
  );
}

export function ResourceRedrawControls({
  geometry: geometry2,
  busy,
  onSubmit,
  onClose,
  cost
}) {
  const workbench = useWorkbench();
  const { t: t2 } = useTranslation();
  const [resolution2, setResolution] = reactExports.useState("2K");
  const [fontSize, setFontSize] = useDetailFontSize();
  const [pickedReferences, setPickedReferences] = reactExports.useState([]);
  const thumbnails = useDetailReferenceOptions(pickedReferences);
  const tool2 = useImageErase();
  const editor2 = reactExports.useRef(null);
  const [picker, setPicker] = reactExports.useState();
  const pickerRef = reactExports.useRef(picker);
  pickerRef.current = picker;
  reactExports.useEffect(() => () => pickerRef.current?.resolve(null), []);
  const painter = useImageMaskPainter({
    meta: geometry2,
    imagePos: geometry2,
    toolApi: tool2,
    onCancel: () => {
      if (!busy && !pickerRef.current) onClose();
    },
    brushColor: REDRAW_HIGHLIGHT_CSS_COLOR,
    overlayOpacity: REDRAW_HIGHLIGHT_UI_OPACITY,
    onSelectionComplete: (rect) => {
      if (editor2.current && !editor2.current.isDestroyed)
        insertCanvasRedrawRegion(editor2.current, selectionToNormalizedBBox(rect));
    }
  });
  const host = reactExports.useMemo(
    () => ({
      container: null,
      width: geometry2.w,
      height: geometry2.h,
      transform: [0, 0, 1],
      viewport: { getViewport: () => ({ x: 0, y: 0, zoom: 1 }), setViewport: () => {
      } },
      promptFontSize: fontSize,
      onPromptFontSizeChange: setFontSize,
      clipboard: workbench.host.clipboard ?? null,
      resolveAttachmentUrl: (attachment) => thumbnails.find((item) => item.versionId === attachment.reference?.versionId)?.url,
      resolveCost: (_tool, value, _model, count2) => cost(value ?? resolution2, count2),
      pickAttachment: (existing2) => new Promise((resolve) => setPicker({ existing: existing2, resolve }))
    }),
    [
      geometry2.w,
      geometry2.h,
      fontSize,
      setFontSize,
      workbench.host.clipboard,
      cost,
      resolution2,
      thumbnails
    ]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ImageModeHostProvider, { value: host, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "contents", "data-action-ui-id": "resource-detail-redraw-editor", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          ref: painter.paintRectRef,
          className: `absolute select-none touch-none ${busy ? "pointer-events-none" : "pointer-events-auto"}`,
          style: {
            left: geometry2.x,
            top: geometry2.y,
            width: geometry2.w,
            height: geometry2.h,
            ...painter.cursorStyle
          },
          ...painter.paintRectHandlers,
          "data-action-ui-id": "resource-detail-redraw-selection",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "canvas",
            {
              ref: painter.maskCanvasRef,
              className: "pointer-events-none absolute left-0 top-0",
              style: { opacity: painter.maskOverlayOpacity }
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-auto absolute right-14 top-3 flex gap-1 rounded-lg bg-popover p-1 shadow-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            size: "sm",
            variant: "ghost",
            disabled: busy || !tool2.hasSelection,
            onClick: tool2.undoSelection,
            children: t2("canvas.undo")
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            size: "sm",
            variant: "ghost",
            disabled: busy || !tool2.canRedo,
            onClick: tool2.redoSelection,
            children: t2("canvas.redo")
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { size: "sm", variant: "ghost", disabled: busy, onClick: onClose, children: t2("common.cancel") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "pointer-events-auto shrink-0 p-2",
          "data-action-ui-id": "resource-detail-redraw-composer",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            CanvasRedrawBottomBar,
            {
              hasRegions: tool2.hasSelection,
              submitting: busy,
              resolution: resolution2,
              onResolutionChange: setResolution,
              onEditorReady: (value) => {
                editor2.current = value;
              },
              onSend: (prompt, attachments) => {
                if (!tool2.selections[0] || busy) return;
                void onSubmit({
                  prompt,
                  attachments,
                  bbox: selectionToNormalizedBBox(tool2.selections[0]),
                  resolution: resolution2,
                  aspectRatio: geometry2.originalWidth / geometry2.originalHeight
                }).catch(() => {
                });
              }
            }
          )
        }
      )
    ] }),
    picker && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ResourceReferencePicker,
      {
        maxCount: 1,
        references: picker.existing.flatMap(
          (item) => item.reference ? [{ ...item.reference, name: item.name, source: "resource" }] : []
        ),
        onClose: () => {
          picker.resolve(null);
          setPicker(void 0);
        },
        onSelect: (references) => {
          setPickedReferences((current2) => mergeCanvasV3References(current2, references));
          const reference = references[0];
          picker.resolve(
            reference ? { id: reference.versionId, name: reference.name, reference } : null
          );
          setPicker(void 0);
        }
      }
    )
  ] });
}

export function ResourceToolbar({
  source,
  ready: ready2,
  canEdit = false,
  busy = false,
  tool: tool2 = null,
  onToolChange
}) {
  const { host, importCanvasImage } = useWorkbench();
  const hostReady = useDetailReady();
  const { t: t2 } = useTranslation();
  const [drafting, setDrafting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const draft = reactExports.useRef(false);
  async function handleAddToChat() {
    if (draft.current || !host.chat) return;
    draft.current = true;
    setDrafting(true);
    setError(void 0);
    try {
      await host.chat.draft({ resources: [source] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t2("workspace.composition.actionFailed"));
    } finally {
      draft.current = false;
      setDrafting(false);
    }
  }
  const items = [
    {
      id: "add-to-chat",
      label: t2("canvas.addToChat"),
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AddToChatIcon$1, {}),
      forceLabel: true,
      disabled: !ready2 || !hostReady || drafting || !host.chat,
      onClick: () => void handleAddToChat(),
      dataActionUiId: "resource-detail-add-to-chat"
    }
  ];
  if (onToolChange) {
    for (const [id2, Icon2, label, available] of [
      ["crop", CropIcon, "canvas.crop", Boolean(importCanvasImage)],
      [
        "enhance",
        SuperResolutionIcon,
        "canvas.superResolution.label",
        Boolean(host.billing?.guardSubmission)
      ],
      ["redraw", RedrawIcon, "canvas.redraw.label", Boolean(host.billing?.guardSubmission)]
    ]) {
      items.push({
        id: id2,
        label: t2(label),
        tooltipLabel: t2(label),
        icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, {}),
        forceLabel: true,
        separator: id2 === "crop",
        active: tool2 === id2,
        disabled: !ready2 || !canEdit || busy || !available,
        onClick: () => onToolChange(tool2 === id2 ? null : id2),
        dataActionUiId: `resource-detail-${id2}`
      });
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex min-w-0 flex-col items-center gap-1",
      "data-action-ui-id": onToolChange ? "resource-detail-image-actions" : "resource-detail-actions",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(NodeToolbarPalette, { items, density: "compact" }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "max-w-40 text-xs text-destructive", children: error })
      ]
    }
  );
}

export function containedImageGeometry(width, height, originalWidth, originalHeight) {
  const scale2 = Math.min(width / originalWidth, height / originalHeight);
  const w3 = originalWidth * scale2;
  const h2 = originalHeight * scale2;
  return { x: (width - w3) / 2, y: (height - h2) / 2, w: w3, h: h2, originalWidth, originalHeight };
}

export function ResourceImageStage({
  source,
  name: name2,
  ready: ready2,
  children: children2
}) {
  const workbench = useWorkbench();
  const hostReady = useDetailReady();
  const { t: t2 } = useTranslation();
  const media2 = useVersionMediaSource(source.resourceId, source.versionId, "image");
  const { data: pricing } = useDetailPricing();
  const [container, setContainer] = reactExports.useState(null);
  const [size2, setSize] = reactExports.useState({ width: 0, height: 0 });
  const [image2, setImage] = reactExports.useState();
  const [failedSource, setFailedSource] = reactExports.useState();
  const [tool2, setTool] = reactExports.useState(null);
  const [pending2, setPending] = reactExports.useState(false);
  const [error, setError] = reactExports.useState();
  const busy = reactExports.useRef(false);
  const alive = reactExports.useRef(true);
  reactExports.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!container) return;
    const measure = ({ width, height }) => setSize({ width, height });
    const observer2 = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.contentRect);
    });
    observer2.observe(container);
    measure(container.getBoundingClientRect());
    return () => observer2.disconnect();
  }, [container]);
  reactExports.useEffect(() => {
    if (!tool2) return;
    const handleEscape = (event) => {
      if (event.key === "Escape" && tool2 !== "redraw") {
        event.stopPropagation();
        event.preventDefault();
        if (!busy.current) setTool(null);
      }
    };
    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [tool2]);
  const geometry2 = image2 && image2.src === media2.src && failedSource !== media2.src && image2.width && image2.height && size2.width ? containedImageGeometry(size2.width, size2.height, image2.width, image2.height) : void 0;
  const cost = reactExports.useCallback(
    (resolution2, count2) => calcImageCost(pricing, "doubao-seedream-5-0-pro-260628", resolution2, void 0, count2),
    [pricing]
  );
  async function submit(operation2, paid) {
    if (busy.current || !ready2 || !hostReady) return;
    busy.current = true;
    setPending(true);
    setError(void 0);
    try {
      if (paid && !await workbench.host.billing?.guardSubmission?.("canvas")) return;
      await operation2();
      if (alive.current) setTool(null);
      dedupedToast.success(
        t2(
          paid ? "workspace.structure.detail.taskSubmitted" : "workspace.structure.detail.versionAdded"
        )
      );
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : t2("workspace.composition.actionFailed"));
      throw cause;
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "relative flex size-full flex-col",
      "data-action-ui-id": "resource-detail-image-stage",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex shrink-0 justify-center pb-2 ${tool2 ? "hidden" : ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceToolbar,
          {
            source,
            ready: ready2 && hostReady,
            canEdit: Boolean(geometry2),
            busy: pending2 || !hostReady,
            tool: tool2,
            onToolChange: setTool
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            ref: setContainer,
            className: "relative min-h-0 flex-1",
            "data-action-ui-id": "resource-detail-image-viewport",
            children: media2.src && failedSource !== media2.src ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "absolute overflow-hidden rounded-lg",
                "data-action-ui-id": "resource-detail-image-bounds",
                style: geometry2 ? { left: geometry2.x, top: geometry2.y, width: geometry2.w, height: geometry2.h } : { inset: 0 },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: media2.src,
                      alt: name2,
                      draggable: false,
                      className: "absolute inset-0 size-full select-none rounded-lg object-contain",
                      onLoad: (event) => setImage({
                        src: event.currentTarget.src,
                        width: event.currentTarget.naturalWidth,
                        height: event.currentTarget.naturalHeight
                      }),
                      onError: (event) => setFailedSource(event.currentTarget.src)
                    },
                    media2.src
                  ),
                  !tool2 && children2,
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ImageFullscreenButton, { src: media2.src, name: name2 }, `fullscreen:${media2.src}`)
                ]
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                role: "status",
                className: "flex size-full items-center justify-center text-sm text-muted-foreground",
                children: t2(
                  media2.isError || failedSource ? "workspace.structure.detail.mediaUnavailable" : "common.loading"
                )
              }
            )
          }
        ),
        geometry2 && media2.src && tool2 === "crop" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceCropControls,
          {
            src: media2.src,
            geometry: geometry2,
            busy: pending2 || !hostReady,
            onClose: () => setTool(null),
            onSubmit: (createBlob) => submit(async () => workbench.resourceDetail.crop(source, await createBlob()), false)
          }
        ),
        geometry2 && tool2 === "enhance" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute bottom-3 right-3",
            "data-action-ui-id": "resource-detail-enhance-panel",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              EnhanceImagePanel,
              {
                width: geometry2.originalWidth,
                height: geometry2.originalHeight,
                creditCost: calcImageCost(pricing, "mediakit_enhance"),
                submitting: pending2 || !hostReady,
                onClose: () => !pending2 && setTool(null),
                onSubmit: (params) => {
                  const { targetWidth, targetHeight } = params;
                  if (targetWidth && targetHeight)
                    void submit(
                      () => workbench.resourceDetail.enhance(source, {
                        targetWidth,
                        targetHeight
                      }),
                      true
                    ).catch(() => {
                    });
                }
              }
            )
          }
        ),
        geometry2 && tool2 === "redraw" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResourceRedrawControls,
          {
            geometry: geometry2,
            busy: pending2 || !hostReady,
            cost,
            onClose: () => setTool(null),
            onSubmit: (params) => submit(
              () => workbench.resourceDetail.redraw(source, {
                prompt: params.prompt,
                resolution: params.resolution,
                aspectRatio: params.aspectRatio,
                references: params.attachments.map((item) => {
                  if (!item.reference) throw new Error("RESOURCE_REFERENCE_UNAVAILABLE");
                  return item.reference;
                })
              }),
              true
            )
          }
        ),
        error && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            role: "alert",
            className: "absolute left-3 right-3 top-3 rounded-lg bg-popover p-2 text-xs text-destructive",
            children: error
          }
        )
      ]
    }
  );
}

export function ResourceDetail({
  resourceId: resourceId2,
  labels,
  renderPageState,
  renderHeaderActions,
  renderVersionActions
}) {
  const { detail: detail2, versions, status, refreshing, refetch } = useResourceDetail(resourceId2);
  const { setCurrentVersion, isPending } = useSetCurrentVersion({
    resourceId: resourceId2,
    expectedCurrentVersionId: detail2?.resource.currentVersionId ?? null
  });
  const pageStateInput = status === "error" ? { type: "error", text: labels.loadError, retry: { onClick: refetch, loading: refreshing } } : { type: "empty", text: labels.empty };
  const renderState = () => renderPageState ? renderPageState(pageStateInput) : /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageStateView,
    {
      density: "panel",
      state: resolvePageState(pageStateInput, labels.retry),
      labels: {
        emptyText: labels.empty,
        errorText: labels.loadError,
        networkErrorText: labels.loadError
      }
    }
  );
  if (status === "loading") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center p-8 text-sm text-muted-foreground", children: labels.loading });
  }
  if (status === "error" || !detail2) {
    return renderState();
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ResourceDetailContent,
    {
      resource: detail2.resource,
      versions,
      labels,
      renderHeaderActions,
      renderVersionActions,
      onSetCurrent: setCurrentVersion,
      isPending
    },
    resourceId2
  );
}

export function ResourceDetailContent({
  resource: resource2,
  versions,
  labels,
  renderHeaderActions,
  renderVersionActions,
  onSetCurrent,
  isPending
}) {
  const currentVersionId = resource2.currentVersionId;
  const fallbackVersionId = currentVersionId ?? versions[0]?.versionId;
  const [selectedVersionId, setSelectedVersionId] = reactExports.useState(fallbackVersionId);
  const [visitedVersionIds, setVisitedVersionIds] = reactExports.useState(
    fallbackVersionId ? [fallbackVersionId] : []
  );
  reactExports.useEffect(() => {
    if (selectedVersionId)
      setVisitedVersionIds(
        (ids2) => ids2.includes(selectedVersionId) ? ids2 : [...ids2, selectedVersionId]
      );
  }, [selectedVersionId]);
  reactExports.useEffect(() => {
    const known = versions.some((version2) => version2.versionId === selectedVersionId);
    if (!known) setSelectedVersionId(fallbackVersionId);
  }, [versions, selectedVersionId, fallbackVersionId]);
  const selectedIndex = reactExports.useMemo(() => {
    const index2 = versions.findIndex((version2) => version2.versionId === selectedVersionId);
    return index2 === -1 ? void 0 : index2;
  }, [versions, selectedVersionId]);
  const selectedVersion = selectedIndex === void 0 ? void 0 : versions[selectedIndex];
  const isCurrentSelected = selectedVersion?.versionId === currentVersionId;
  const ResourceIcon = resourceKindIcon(resource2.kind);
  const actionsRequest = selectedVersion ? { resourceId: resource2.resourceId, versionId: selectedVersion.versionId } : void 0;
  const renderChat = useResourceChatRenderer();
  const chatSurface = /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-action-ui-id": "resource-detail-chat", className: "shrink-0 border-t border-border p-2", children: versions.filter((version2) => visitedVersionIds.includes(version2.versionId)).map((version2) => {
    const target = {
      resourceId: resource2.resourceId,
      versionId: version2.versionId,
      kind: resource2.kind,
      resourceName: resource2.name
    };
    const active2 = version2.versionId === selectedVersionId;
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { hidden: !active2, inert: !active2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceChatTargetProvider, { target, children: renderChat ? renderChat() : /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceChat, { ...target }) }) }, version2.versionId);
  }) });
  const previewActions = isCurrentSelected && resource2.kind === ProjectResourceKind.IMAGE ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      "data-action-ui-id": "resource-detail-current-cover",
      className: "inline-flex h-8 items-center rounded-lg bg-background/70 px-2 text-xs font-medium text-foreground",
      children: labels.currentCover
    }
  ) : !isCurrentSelected && selectedVersion ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button$3,
    {
      type: "button",
      variant: "ghost",
      size: "sm",
      "data-action-ui-id": "resource-detail-set-cover",
      disabled: isPending,
      onClick: () => onSetCurrent(selectedVersion.versionId),
      className: "h-8 rounded-lg bg-background/70 px-2 text-xs font-medium",
      children: labels.setAsCover
    }
  ) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "resource-detail flex min-h-0 min-w-0 flex-1 flex-col",
      "data-action-ui-id": "resource-detail",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "shrink-0 border-b border-border px-4 py-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "flex min-w-0 flex-1 items-center gap-1.5 text-base font-medium text-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceIcon, { "aria-hidden": "true", strokeWidth: 1.5, className: "size-4 shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", title: resource2.name, children: resource2.name })
            ] }),
            renderHeaderActions?.()
          ] }),
          resource2.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-h-20 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-5 text-foreground", children: resource2.description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "min-h-0 flex-auto overflow-y-auto overscroll-contain px-4 py-3",
            "data-action-ui-id": "resource-detail-content",
            children: versions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground", children: labels.empty }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex min-w-0 items-center", children: [
                renderVersionActions && actionsRequest && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-2 top-2 z-10", children: renderVersionActions(actionsRequest) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: `resource-detail-preview relative min-w-0 flex-1 overflow-hidden rounded-lg ${resource2.kind === ProjectResourceKind.IMAGE && !renderVersionActions ? "resource-detail-preview-image" : "bg-muted/40"}`,
                    "data-action-ui-id": "resource-detail-preview",
                    children: [
                      selectedVersion && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 overflow-auto", children: resource2.kind === ProjectResourceKind.IMAGE && !renderVersionActions ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ResourceImageStage,
                        {
                          source: {
                            resourceId: resource2.resourceId,
                            versionId: selectedVersion.versionId
                          },
                          name: resource2.name,
                          ready: selectedVersion.status === "ready" && resource2.lifecycle === "active",
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "div",
                            {
                              className: "absolute left-2 top-2 z-10",
                              "data-action-ui-id": "resource-detail-cover-overlay",
                              children: previewActions
                            }
                          )
                        },
                        selectedVersion.versionId
                      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ResourcePreview,
                        {
                          resourceId: resource2.resourceId,
                          versionId: selectedVersion.versionId,
                          kind: resource2.kind,
                          name: resource2.name,
                          labels
                        },
                        selectedVersion.versionId
                      ) }),
                      !renderVersionActions && resource2.kind !== ProjectResourceKind.IMAGE && selectedVersion && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-2 top-2 z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ResourceToolbar,
                        {
                          source: {
                            resourceId: resource2.resourceId,
                            versionId: selectedVersion.versionId
                          },
                          ready: selectedVersion.status === "ready" && resource2.lifecycle === "active"
                        },
                        selectedVersion.versionId
                      ) })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-col items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "ul",
                  {
                    "aria-label": labels.versionsTitle,
                    className: "flex max-w-full items-center gap-2 overflow-x-auto p-1",
                    children: versions.map((version2, index2) => {
                      const isSelected = version2.versionId === selectedVersionId;
                      const isCover = version2.versionId === currentVersionId;
                      return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "button",
                        {
                          type: "button",
                          "data-action-ui-id": "resource-detail-version",
                          "aria-current": isSelected,
                          "aria-label": isCover ? `${labels.currentCover} ${index2 + 1}/${versions.length}` : `${index2 + 1}/${versions.length}`,
                          onClick: () => setSelectedVersionId(version2.versionId),
                          className: `relative flex w-20 cursor-pointer flex-col overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:border-foreground"}`,
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              ResourceThumbnail,
                              {
                                resourceId: resource2.resourceId,
                                versionId: version2.status === "ready" ? version2.versionId : void 0,
                                kind: resource2.kind,
                                variant: "version",
                                className: "h-12 w-full"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex w-full items-center justify-between gap-1 px-1 py-0.5 text-[11px]", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                                "V",
                                index2 + 1
                              ] }),
                              isCover && resource2.kind !== ProjectResourceKind.IMAGE && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[10px]", children: labels.currentCover })
                            ] })
                          ]
                        }
                      ) }, version2.versionId);
                    })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-foreground", children: [
                    selectedIndex === void 0 ? versions.length : selectedIndex + 1,
                    "/",
                    versions.length
                  ] }),
                  (resource2.kind !== ProjectResourceKind.IMAGE || renderVersionActions) && previewActions
                ] })
              ] })
            ] })
          }
        ),
        chatSurface
      ]
    }
  );
}

export function resourceKindIcon(kind2) {
  if (kind2 === ProjectResourceKind.IMAGE) return Image$1;
  if (kind2 === ProjectResourceKind.VIDEO) return Film$2;
  if (kind2 === ProjectResourceKind.AUDIO) return Music$2;
  return FileText;
}

export function ResourceDetailDialog({
  active: active2,
  onClose,
  resourceId: resourceId2,
  labels
}) {
  const { t: t2 } = useTranslation();
  const activeRef = reactExports.useRef(active2);
  activeRef.current = active2;
  const returnFocus = reactExports.useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogRoot, { open: true, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogBackdrop, { className: "modal-mask fixed inset-0 z-50" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      DialogPopup,
      {
        finalFocus: () => activeRef.current && returnFocus.current?.isConnected ? returnFocus.current : false,
        className: "fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl elevated-surface-border bg-popover text-popover-foreground outline-none sm:max-w-3xl",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "sr-only", children: labels.versionsTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DialogClose$1,
            {
              render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  size: "icon",
                  className: "absolute right-2 top-2 z-10 size-8 rounded-lg",
                  "aria-label": t2("common.close"),
                  "data-action-ui-id": "structure-detail-close"
                }
              ),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$8, { "aria-hidden": "true", strokeWidth: 1.5, className: "size-4" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "min-h-0 flex-1 overflow-y-auto", "aria-label": labels.versionsTitle, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceDetail, { resourceId: resourceId2, labels }) })
        ]
      }
    )
  ] }) });
}

export function parseStructuredDocument(source) {
  let remaining = 1e4;
  function validate2(value, depth2) {
    if (--remaining < 0 || depth2 > 32) return false;
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.every((child) => validate2(child, depth2 + 1));
    return typeof value === "object" && Object.values(value).every((child) => validate2(child, depth2 + 1));
  }
  try {
    const value = JSON.parse(source);
    return validate2(value, 0) ? { value } : null;
  } catch {
    return null;
  }
}

export function WorkspaceStructuredDocument({
  name: name2,
  value,
  active: active2
}) {
  const title = isDocumentObject(value) && typeof value.title === "string" && value.title.trim() ? value.title : name2;
  const content2 = title !== name2 && isDocumentObject(value) ? Object.fromEntries(Object.entries(value).filter(([key2]) => key2 !== "title")) : value;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "@container/document min-w-0 space-y-4",
      "data-action-ui-id": "structure-json-card",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "flex items-center gap-1.5 text-sm font-medium", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FileText$1,
            {
              "aria-hidden": true,
              strokeWidth: 1.5,
              className: "size-3.5 shrink-0 text-muted-foreground"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "[overflow-wrap:anywhere]", children: title })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentContent, { value: content2, active: active2, depth: 0 })
      ]
    }
  );
}

export const readDocument = createReadLimiter();

export function WorkspaceCompositionDocuments({
  documents,
  active: active2,
  children: children2
}) {
  const { t: t2 } = useTranslation();
  const { scopeKey } = useWorkbench();
  const runtime = useOptionalWorkspaceStructure();
  const request = useGatewayFetch();
  const [backupOpen, setBackupOpen] = reactExports.useState(false);
  const unique2 = [
    ...new Map(documents.map((d2) => [`${d2.resourceId}:${d2.versionId}`, d2])).values()
  ].sort(
    (a2, b3) => b3.updatedAt.localeCompare(a2.updatedAt) || a2.resourceId.localeCompare(b3.resourceId)
  );
  const reads = useQueries({
    queries: unique2.map(({ resourceId: resourceId2, versionId }) => ({
      queryKey: [...resourceQueryKeys.all(scopeKey), "structured-document", resourceId2, versionId],
      enabled: active2 && Boolean(runtime?.ready),
      networkMode: "always",
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      queryFn: ({ signal }) => readDocument(signal, async () => {
        const response = await request("/api/v3/query/document_read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionId,
            startLine: 1,
            lineCount: PROJECT_DOCUMENT_READ_DEFAULT_LINES
          }),
          signal
        });
        if (!response.ok) throw Error(`Document read failed: ${response.status}`);
        const document2 = parseDocumentContent(await response.json(), resourceId2, versionId, 1);
        if (document2.more || document2.truncated) return null;
        const parsed = parseStructuredDocument(document2.text);
        return parsed ? { ...parsed, name: document2.name } : null;
      })
    }))
  });
  const cards = reads.flatMap(
    (read, index2) => read.data ? [{ source: unique2[index2], data: read.data }] : []
  );
  if (!cards.length) return children2;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 space-y-4", "data-action-ui-id": "structure-json-documents", children: [
    cards.map(({ source, data: data2 }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkspaceStructuredDocument,
      {
        name: data2.name,
        value: data2.value,
        active: active2
      },
      `${scopeKey}:${source.resourceId}:${source.versionId}`
    )),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "details",
      {
        className: "border-t border-border/50 pt-3",
        onToggle: (event) => setBackupOpen(event.currentTarget.open),
        "data-action-ui-id": "structure-document-backup",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-foreground", children: t2("structure.documentBackup") }),
          backupOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4", children: children2 })
        ]
      }
    )
  ] });
}

export function documentColumns(options2 = {}) {
  return (tree) => {
    const root2 = tree;
    if (!Array.isArray(root2.children)) return;
    const sections = [];
    let section = {
      type: "structureSection",
      data: {
        hName: "section",
        hProperties: {
          className: "col-span-full min-w-0 text-xs text-muted-foreground [&_ul]:list-none [&_ul]:p-0"
        }
      },
      children: []
    };
    for (const node2 of root2.children) {
      const title = node2.type === "heading" && node2.depth === 1 ? plainText(node2) : void 0;
      if (node2 === root2.children[0] && title && options2.compositionName) {
        const normalized = normalizeTitle(title);
        if (normalized.length >= 4 && normalizeTitle(options2.compositionName).endsWith(normalized))
          continue;
      }
      if (node2.type === "heading" && node2.depth === 2) {
        if (section.children?.length) sections.push(section);
        section = {
          type: "structureSection",
          data: { hName: "section", hProperties: { className: "min-w-0" } },
          children: []
        };
      }
      section.children?.push(presentNode(node2, options2));
    }
    if (section.children?.length) sections.push(section);
    root2.children = sections;
  };
}

export function normalizeTitle(value) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export function presentNode(node2, options2, parameter = false) {
  if (node2.type === "code" || node2.type === "inlineCode" || node2.type === "link") return node2;
  const text2 = plainText(node2);
  if (node2.type === "listItem" && node2.children?.length === 1 && node2.children[0].children?.length === 1 && node2.children[0].children[0].type === "text" && text2) {
    const reference = /^(version_[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}|ver_[\w-]+)\s*[：:]\s*(\S[^\n]*)$/i.exec(
      text2
    );
    if (reference) {
      return {
        type: "structureReference",
        data: { hName: "li", hProperties: { className: "list-none" } },
        children: [
          {
            type: "structureReferenceDetails",
            data: {
              hName: "details",
              hProperties: {
                className: "rounded-md bg-muted/40 px-2 py-1.5",
                "data-action-ui-id": "structure-reference-details"
              }
            },
            children: [
              {
                type: "structureReferenceLabel",
                data: {
                  hName: "summary",
                  hProperties: { className: "cursor-pointer text-foreground" }
                },
                children: [{ type: "text", value: reference[2] }]
              },
              { type: "paragraph", children: [{ type: "inlineCode", value: reference[1] }] }
            ]
          }
        ]
      };
    }
  }
  if (node2.type === "paragraph" && node2.children?.length === 1 && node2.children[0].type === "text" && text2) {
    const fields2 = text2.match(/[^。\n]+[。]?/g) ?? [];
    if (fields2.length > 1 && fields2.every((field) => /^[^：:。]{1,16}[：:]/.test(field.trim()))) {
      return {
        type: "structureFields",
        data: { hName: "div", hProperties: { className: "space-y-2" } },
        children: fields2.map((field) => ({
          type: "paragraph",
          children: [presentNode({ type: "text", value: field.trim() }, options2, true)]
        }))
      };
    }
  }
  if (parameter && node2.type === "text" && node2.value && options2.audioOff && options2.audioOn) {
    const parts = node2.value.split(/(\bgenerate_audio=(?:false|true)\b)/g);
    if (parts.length > 1)
      return {
        type: "structureParameter",
        data: { hName: "span", hProperties: {} },
        children: parts.map(
          (part) => /^generate_audio=(false|true)$/.test(part) ? {
            type: "structureParameterLabel",
            data: { hName: "span", hProperties: { title: part } },
            children: [
              {
                type: "text",
                value: part.endsWith("false") ? options2.audioOff : options2.audioOn
              }
            ]
          } : { type: "text", value: part }
        )
      };
  }
  return node2.children ? { ...node2, children: node2.children.map((child) => presentNode(child, options2)) } : node2;
}

export function WorkspaceStructureDocument({
  resourceId: resourceId2,
  versionId,
  active: active2,
  layout: layout2 = "document",
  scroll = "contained",
  compositionName
}) {
  const { t: t2 } = useTranslation();
  const { scopeKey } = useWorkbench();
  const runtime = useOptionalWorkspaceStructure();
  const request = useGatewayFetch();
  const enabled = active2 && Boolean(runtime?.ready);
  const query = useInfiniteQuery({
    queryKey: [...resourceQueryKeys.all(scopeKey), "document", resourceId2, versionId],
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const response = await request("/api/v3/query/document_read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId,
          startLine: pageParam,
          lineCount: PROJECT_DOCUMENT_READ_DEFAULT_LINES
        }),
        signal
      });
      if (!response.ok) throw new Error(`Document read failed: ${response.status}`);
      return parseDocumentContent(await response.json(), resourceId2, versionId, pageParam);
    },
    getNextPageParam: (page2) => page2.more && page2.lineCount > 0 ? page2.startLine + page2.lineCount : void 0,
    // Versions are immutable. Reopening an accordion reuses its scoped, validated content.
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false
  });
  const pages = query.data?.pages;
  const text2 = pages?.map((page2) => page2.text).join("\n") ?? "";
  const lastPage = pages?.at(-1);
  const columns = layout2 === "columns";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 space-y-3", children: [
    query.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-sm text-muted-foreground", children: t2("structure.loading") }),
    pages && (text2 || !lastPage?.more) && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "section",
      {
        "aria-label": pages[0].name,
        tabIndex: 0,
        className: `@container/document text-sm leading-relaxed [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-foreground [&_h1]:mb-2 [&_h1]:font-medium [&_h2]:mb-2 [&_h2]:text-xs [&_h2]:font-medium [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:font-medium [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ul:has(>li>details)]:p-0 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-1 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-muted/30 [&_pre]:p-3 [&_code]:whitespace-pre-wrap [&_code]:text-xs [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 ${columns ? "" : "[&_h2]:mt-5"} ${!columns && scroll === "contained" ? "max-h-[28rem] overflow-auto overscroll-contain" : ""}`,
        children: !text2 ? t2("structure.documentEmpty") : pages[0].media.mimeType === "text/plain" ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "whitespace-pre-wrap", children: text2 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: columns ? "grid grid-cols-1 items-start gap-x-5 gap-y-4 @[26rem]/document:grid-cols-2 @[52rem]/document:grid-cols-4" : "",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Markdown,
              {
                skipHtml: true,
                remarkPlugins: columns ? [
                  remarkGfm,
                  [
                    documentColumns,
                    {
                      compositionName,
                      audioOff: t2("structure.audioOff"),
                      audioOn: t2("structure.audioOn")
                    }
                  ]
                ] : [remarkGfm],
                components: {
                  a: ({ children: children2, href }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      href,
                      target: "_blank",
                      rel: "noreferrer",
                      className: "underline underline-offset-2",
                      children: children2
                    }
                  ),
                  // Linked images remain references; the list does not fetch arbitrary document URLs.
                  img: ({ alt }) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: alt })
                },
                children: text2
              }
            )
          }
        )
      }
    ),
    lastPage?.more && !query.hasNextPage && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-xs text-muted-foreground", children: t2("structure.documentIncomplete") }),
    query.isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { role: "alert", className: "text-sm text-muted-foreground", children: [
      t2(pages ? "structure.stale" : "structure.loadError"),
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button$3,
        {
          variant: "ghost",
          size: "sm",
          disabled: !enabled || query.isFetching,
          onClick: () => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch()),
          children: t2("structure.retry")
        }
      )
    ] }),
    query.hasNextPage && !query.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "outline",
        size: "sm",
        disabled: !enabled || query.isFetching,
        onClick: () => void query.fetchNextPage(),
        children: t2(query.isFetchingNextPage ? "structure.loading" : "structure.more")
      }
    )
  ] });
}

export const detailServices = {
  useDialogProps: useBrowserOverlayDialogProps,
  usePromptFontSize: usePromptFontSizePreference
};

export const renderDocument = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceStructureDocument, { ...props });

export const renderDocuments = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceCompositionDocuments, { ...props });

export function WorkspaceStructurePresentation({ children: children2 }) {
  const runtime = useOptionalWorkspaceStructure();
  const gatewayUrl2 = useGatewayUrl();
  const { gatewayBinding } = useRequiredGatewayScope();
  const imageUrl = reactExports.useCallback(
    ({ resourceId: resourceId2, versionId }) => runtime?.ready && runtime.workbench && gatewayBinding ? gatewayUrl2(
      `${CANVAS_V3_ROUTES.images}/${encodeURIComponent(resourceId2)}/${encodeURIComponent(versionId)}`
    ) : void 0,
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.workbench]
  );
  const videoThumbnailUrl2 = reactExports.useCallback(
    ({ relativePath }) => runtime?.ready && runtime.workbench && gatewayBinding ? withThumbnail(gatewayUrl2(API_PATHS.thumbnail(relativePath)), 320) : void 0,
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.workbench]
  );
  const videoUrl = reactExports.useCallback(
    ({ relativePath }) => {
      const source = runtime?.ready && runtime.workbench && gatewayBinding ? gatewayUrl2(API_PATHS.serveFile(relativePath)) : void 0;
      return source ? resolveVideoPlaybackUrl(source) : void 0;
    },
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.workbench]
  );
  const thumbnailUrl = reactExports.useCallback(
    ({ relativePath, width, kind: kind2 }) => runtime?.ready && runtime.workbench && gatewayBinding ? withThumbnail(
      gatewayUrl2(
        kind2 === 2 ? API_PATHS.serveFile(relativePath) : API_PATHS.thumbnail(relativePath)
      ),
      width
    ) : void 0,
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.workbench]
  );
  const { t: t2, i18n } = useTranslation();
  const renderAudio = reactExports.useCallback(
    ({ relativePath, name: name2, active: active2 = true, compact: compact2 = false }) => {
      const src = runtime?.ready && gatewayBinding ? gatewayUrl2(API_PATHS.serveFile(relativePath)) : void 0;
      return src ? /* @__PURE__ */ jsxRuntimeExports.jsx(I18nextProvider, { i18n, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `h-full [&_svg[data-waveform-kind]]:max-w-full ${compact2 ? "[&_svg[data-waveform-kind]]:h-6 [&_div:has(>svg[data-waveform-kind])]:py-1" : "[&_svg[data-waveform-kind]]:h-12"}`,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            CanvasV3AudioPlayer,
            {
              src,
              active: active2 && runtime?.isActive !== false,
              fileName: name2
            }
          )
        }
      ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t2("workspace.structure.detail.mediaUnavailable") });
    },
    [gatewayUrl2, gatewayBinding, runtime?.ready, runtime?.isActive, i18n, t2]
  );
  const renderResourceDetail = reactExports.useCallback(
    ({ resourceId: resourceId2, active: active2, onClose }) => /* @__PURE__ */ jsxRuntimeExports.jsx(I18nextProvider, { i18n, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CanvasV3HostServicesProvider, { value: detailServices, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      ResourceDetailDialog,
      {
        active: active2,
        onClose,
        resourceId: resourceId2,
        labels: resourceDetailLabels(t2)
      }
    ) }) }),
    [t2, i18n]
  );
  const [locale] = reactExports.useState(() => {
    const instance2 = createInstance();
    void instance2.init({
      lng: i18n.language.startsWith("zh") ? "zh" : "en",
      fallbackLng: "en",
      initImmediate: false,
      resources: {
        zh: { translation: { structure: structureTranslations.zh } },
        en: { translation: { structure: structureTranslations.en } }
      },
      interpolation: { escapeValue: false }
    });
    return instance2;
  });
  reactExports.useEffect(() => {
    locale.addResourceBundle(
      "zh",
      "translation",
      { structure: structureTranslations.zh },
      true,
      true
    );
    locale.addResourceBundle(
      "en",
      "translation",
      { structure: structureTranslations.en },
      true,
      true
    );
    void locale.changeLanguage(i18n.language.startsWith("zh") ? "zh" : "en");
  }, [i18n.language, locale, structureTranslations]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(I18nextProvider, { i18n: locale, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    StructureMediaProvider,
    {
      imageUrl,
      videoUrl,
      videoThumbnailUrl: videoThumbnailUrl2,
      thumbnailUrl,
      renderAudio,
      renderDocument,
      renderDocuments,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResourceDetailProvider, { renderDialog: renderResourceDetail, children: children2 })
    }
  ) });
}

export function resourceDetailLabels(t2) {
  return {
    loading: t2("common.loading"),
    loadError: t2("workspace.composition.resourceError"),
    retry: t2("common.retry"),
    empty: t2("workspace.structure.detail.empty"),
    versionsTitle: t2("workspace.structure.detail.versionsTitle"),
    setAsCover: t2("assetCenter.cover.set"),
    currentCover: t2("workspace.structure.detail.currentCover"),
    mediaUnavailable: t2("workspace.structure.detail.mediaUnavailable")
  };
}
