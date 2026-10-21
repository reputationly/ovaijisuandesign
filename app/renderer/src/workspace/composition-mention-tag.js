/**
 * @composition 提及标签（第 309 轮）。
 *
 * 种子：CompositionMentionTag / CompositionMentionPreview /
 *       CompositionMentionThumbnail / MentionRemoveButton
 * 离线闭包 22 个声明 / 约 844 行。这是 v3 的核心 @composition 交互
 * （rich-user-prompt-content.jsx:452 使用）。
 *
 * 依赖中 StructureAudio / structureReadLimiter / useCompositionDetails /
 * CompositionVideoPreview / CompositionAttributes **本来就在**
 * workspace-resource-closure.js 里，本轮只是补了 export 并从那里 import，
 * 没有复制（复制会产生第二个限流表）。
 *
 * 偏移是 UTF-16 码元。
 */

import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";
import reactDomExports from "react-dom";
import { X as X$8 } from "lucide-react";
import { ProjectResourceKind } from "./../canvas-v3/canvas-v3-constants.js";
import { useOptionalWorkspaceStructure, useWorkbench } from "./../canvas-v3/canvas-v3-hooks.js";
import { FileText as FileText$1, FileTypeIcon, WorkbenchProvider, classifyFileType, cn as cn$5, createResourceQueryOptions } from "./../canvas-v3/main-exports.js";
import { StructureMedia, useQueries } from "./../canvas-v3/ui-components.js";
import { QuickZoomPresence } from "./../canvas/canvas-high-blast-delete-dialog.jsx";
import { Button as Button$3 } from "./../canvas/node-shell-inner.jsx";
import { useHoverPreview } from "./../chat/anchor-gap.jsx";
import { AudioFileIcon } from "./../chat/use-composer-placeholder-actions.jsx";
import { COMPOSITION_RESOURCE_KINDS, sortCompositionMediaForDisplay } from "./../chat/display-order.jsx";
import { PreviewCardContent } from "./../chat/preview-card-content.jsx";
import { COMPOSER_PREVIEW_OPEN_DELAY_MS, PREVIEW_CARD_CLOSE_DELAY_MS, PREVIEW_CARD_OPEN_DELAY_MS } from "./../chat/preview-card-open-delay-ms.jsx";
import { Skeleton } from "./../chat/skeleton.jsx";
import { VideoPlayIndicator } from "./../chat/video-play-indicator.jsx";
import { Layers } from "./../export-engine/export-engine.js";
import { PreviewCardRoot } from "./../infra/base-ui.js";
import { PreviewCardTrigger } from "./../text-editor/use-placeholder-asset-source.jsx";
import { createLucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WorkspaceStructurePresentation } from "./workspace-shell-closure.js";

import {
  StructureAudio,
  structureReadLimiter,
  useCompositionDetails,
  CompositionVideoPreview,
  CompositionAttributes,
} from "./workspace-resource-closure.js";

export function useCompositionPreview(compositionId, active2 = true) {
  const workbench = useWorkbench();
  const query = useCompositionDetails(compositionId, active2);
  const composition2 = query.data;
  const members2 = (composition2?.lifecycle === "active" ? composition2.members : []).map(
    (member2) => ({
      ...member2,
      entries: (member2.resource === null ? [] : [member2.resource]).map((resourceId2) => ({
        resourceId: resourceId2,
        versionId: void 0,
        key: resourceId2
      }))
    })
  );
  const selectors2 = [
    ...new Map(
      members2.flatMap((member2) => member2.entries).map((entry) => [
        previewResourceKey(entry),
        {
          resourceId: entry.resourceId,
          ...entry.versionId ? { versionId: entry.versionId } : {}
        }
      ])
    ).values()
  ];
  const batches = Array.from(
    { length: Math.ceil(selectors2.length / 100) },
    (_2, index2) => selectors2.slice(index2 * 100, (index2 + 1) * 100)
  );
  const options2 = createResourceQueryOptions(workbench.resources, workbench.scopeKey);
  const queries = useQueries({
    queries: batches.map((batch2) => ({
      ...options2.details(batch2),
      enabled: active2,
      staleTime: 3e4,
      queryFn: ({ signal }) => structureReadLimiter(workbench)(
        signal,
        () => workbench.resources.getResources(batch2, { signal })
      )
    }))
  });
  const resources = new Map(
    batches.flatMap(
      (batch2, index2) => batch2.map(
        (selector2, position2) => [
          previewResourceKey(selector2),
          { query: queries[index2], result: queries[index2].data?.[position2] }
        ]
      )
    )
  );
  return { query, composition: composition2, members: members2, resources };
}

export function previewResourceKey(entry) {
  return JSON.stringify([entry.resourceId, entry.versionId]);
}

export function CompositionPreview({ compositionId }) {
  const { t: t2 } = useTranslation();
  const preview = useCompositionPreview(compositionId);
  const { query, composition: composition2, members: members2, resources } = preview;
  const resourceCount = members2.reduce(
    (count2, member2) => count2 + Math.max(1, member2.entries.length),
    0
  );
  const hasAudio = [...resources.values()].some(
    (read) => read.result?.ok && read.result.detail.resource.kind === 4
  );
  const width = resourceCount > 2 || hasAudio ? "w-104" : resourceCount === 2 ? "w-80" : "w-60";
  if (!composition2)
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 text-sm", role: "status", children: [
      query.isError ? t2("structure.loadError") : t2("structure.loading"),
      query.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", size: "sm", onClick: () => void query.refetch(), children: t2("structure.retry") })
    ] });
  if (composition2.lifecycle !== "active")
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-4 text-sm text-muted-foreground", children: t2("structure.deleted") });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-action-ui-id": "composition-mention-preview",
      className: `@container/composition-preview ${width} max-w-full max-h-[min(70vh,var(--available-height,70vh))] overflow-y-auto overscroll-contain p-4 text-sm`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center gap-1.5 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Layers$1, { "aria-hidden": "true", strokeWidth: 1.5, className: "size-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: composition2.type?.label ?? "" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "break-words text-sm font-medium", children: composition2.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionAttributes, { attributes: composition2.attributes, className: "mt-2" }),
        query.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", size: "sm", onClick: () => void query.refetch(), children: t2("structure.retry") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionMembers, { preview })
      ]
    }
  );
}

export function CompositionMembers({ preview }) {
  const { members: members2, resources } = preview;
  const { t: t2 } = useTranslation();
  const orderedMembers = sortCompositionMediaForDisplay(
    members2.flatMap(
      (member2) => member2.entries.length ? member2.entries.map((entry) => ({ ...member2, entries: [entry] })) : [member2]
    ),
    (member2) => {
      const entry = member2.entries[0];
      const result = entry ? resources.get(previewResourceKey(entry))?.result : void 0;
      return result?.ok ? result.detail.resource.kind : void 0;
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))] gap-3 border-t border-border pt-3", children: [
    members2.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: t2("structure.directoryEmptyMembers") }),
    orderedMembers.map((member2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        "data-composition-member": member2.memberId,
        "aria-label": member2.role || t2("structure.unnamedMember"),
        className: "contents",
        children: [
          !member2.entries.length && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 text-xs text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t2("structure.directoryEmptyResources") }) }),
          member2.entries.map((entry) => {
            const read = resources.get(previewResourceKey(entry));
            const detail2 = read?.result?.ok && read.result.detail.resource.lifecycle === "active" ? read.result.detail : void 0;
            const resource2 = detail2?.resource;
            const version2 = detail2?.version?.status === "ready" ? detail2.version : void 0;
            const audio = resource2?.kind === 4;
            const supported = resource2 && COMPOSITION_RESOURCE_KINDS.includes(resource2.kind);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: `min-w-0 max-w-full ${audio ? "col-span-full @min-[13rem]/composition-preview:col-span-2" : ""}`,
                "data-composition-resource": entry.resourceId,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: audio ? "h-full min-h-28" : "aspect-square w-full overflow-hidden rounded-lg bg-muted",
                      children: detail2 && supported ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        audio && version2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                          StructureAudio,
                          {
                            resourceId: entry.resourceId,
                            versionId: version2.versionId,
                            relativePath: version2.relativePath,
                            name: resource2.name
                          }
                        ) : resource2.kind === 3 && version2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                          CompositionVideoPreview,
                          {
                            resourceId: entry.resourceId,
                            versionId: version2.versionId,
                            relativePath: version2.relativePath,
                            name: resource2.name
                          }
                        ) : resource2.kind === 1 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "div",
                          {
                            className: "flex size-full flex-col items-center justify-center gap-2 p-2 text-muted-foreground",
                            title: resource2.name,
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                FileText$1,
                                {
                                  "aria-hidden": "true",
                                  strokeWidth: 1.5,
                                  className: "size-6 shrink-0"
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2 break-all text-xs", children: resource2.name })
                            ]
                          }
                        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                          StructureMedia,
                          {
                            resourceId: entry.resourceId,
                            versionId: version2?.versionId,
                            relativePath: version2?.relativePath,
                            name: resource2.name,
                            kind: resource2.kind,
                            thumbnailWidth: 112,
                            className: "size-full"
                          }
                        ),
                        resource2.kind !== 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: resource2.name })
                      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "flex size-full items-center justify-center p-2 text-xs text-muted-foreground", children: read?.query.isPending ? t2("structure.loading") : !supported && detail2 ? t2("structure.previewUnavailable") : t2("structure.readFailed") })
                    }
                  ),
                  read?.query.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { size: "sm", variant: "ghost", onClick: () => void read.query.refetch(), children: t2("structure.retry") })
                ]
              },
              entry.key
            );
          })
        ]
      },
      JSON.stringify([member2.memberId, member2.entries[0]?.key])
    ))
  ] });
}

export function CompositionThumbnail({
  compositionId,
  active: active2 = true,
  size: size2 = 32,
  render: render2
}) {
  const { query, members: members2, resources } = useCompositionPreview(compositionId, active2);
  const candidates2 = members2.flatMap((member2) => member2.entries).flatMap((entry) => {
    const result = resources.get(previewResourceKey(entry))?.result;
    return result?.ok && result.detail.resource.lifecycle === "active" && COMPOSITION_RESOURCE_KINDS.includes(result.detail.resource.kind) ? [result.detail] : [];
  });
  const detail2 = candidates2.find((item) => item.resource.kind === 2 && item.version?.status === "ready") ?? candidates2[0];
  if (render2) {
    const reads = [...resources.values()];
    return render2({
      detail: detail2,
      loading: active2 && (query.isPending || reads.some((read) => read.query.isPending)),
      failed: query.isError || reads.some((read) => read.query.isError || read.result?.ok === false)
    });
  }
  if (!detail2)
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Layers$1, { "aria-hidden": "true", strokeWidth: 1.5, className: "size-4 text-muted-foreground" });
  const { resource: resource2, version: version2 } = detail2;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    StructureMedia,
    {
      resourceId: resource2.resourceId,
      versionId: version2?.status === "ready" ? version2.versionId : void 0,
      relativePath: version2?.relativePath,
      kind: resource2.kind,
      name: resource2.name,
      thumbnailWidth: size2,
      compact: true,
      className: "size-full rounded-sm"
    }
  );
}

export function PreviewCard$1(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PreviewCardRoot, { "data-slot": "preview-card", ...props });
}

export const scopes = /* @__PURE__ */ new WeakMap();

export function claimComposerPreview(anchor2, revoke) {
  const scope = anchor2.closest("[data-message-input-root]");
  if (!scope) return { isCurrent: () => true, release: () => {
  } };
  let state2 = scopes.get(scope);
  if (!state2) {
    state2 = {};
    scopes.set(scope, state2);
  }
  const previous2 = state2.owner;
  const owner = { anchor: anchor2, revoke };
  state2.owner = owner;
  if (previous2 && previous2.anchor !== anchor2) previous2.revoke();
  return {
    isCurrent: () => state2.owner === owner,
    release: () => {
      if (state2.owner === owner) state2.owner = void 0;
    }
  };
}

export const TRIGGER_SELECTOR = '[data-mention-kind],[data-testid="file-chip"],[data-action-ui-id="composition-context-card"],[data-attachment-id]';

export function useComposerPreviewOwner(anchor2, onRevoke) {
  const callback = reactExports.useRef(onRevoke);
  callback.current = onRevoke;
  const lease = reactExports.useRef(null);
  const claim = reactExports.useCallback(() => {
    if (anchor2) lease.current = claimComposerPreview(anchor2, () => callback.current());
  }, [anchor2]);
  const isCurrent = reactExports.useCallback(
    () => lease.current?.isCurrent() ?? !anchor2?.closest("[data-message-input-root]"),
    [anchor2]
  );
  const release = reactExports.useCallback(() => {
    lease.current?.release();
    lease.current = null;
  }, []);
  reactExports.useLayoutEffect(() => {
    if (!anchor2) return;
    const scope = anchor2.closest("[data-message-input-root]");
    if (!scope) return;
    const handleTarget = (event) => {
      if (!(event.target instanceof Element) || !scope.contains(event.target)) return;
      const target = event.target.closest(TRIGGER_SELECTOR);
      if (!target || anchor2.contains(target) || target.contains(anchor2)) return;
      if (lease.current?.isCurrent()) {
        release();
        callback.current();
      }
    };
    document.addEventListener("mouseover", handleTarget, true);
    document.addEventListener("focusin", handleTarget, true);
    return () => {
      document.removeEventListener("mouseover", handleTarget, true);
      document.removeEventListener("focusin", handleTarget, true);
      release();
      callback.current();
    };
  }, [anchor2, release]);
  return { claim, isCurrent, release };
}

export function useComposerPreview(anchor2, outsideTiming) {
  const [open, setOpen] = reactExports.useState(false);
  const [revoked, setRevoked] = reactExports.useState(false);
  const timer2 = reactExports.useRef(null);
  const clearTimer2 = reactExports.useCallback(() => {
    if (timer2.current !== null) clearTimeout(timer2.current);
    timer2.current = null;
  }, []);
  const close2 = reactExports.useCallback(() => {
    clearTimer2();
    setOpen(false);
  }, [clearTimer2]);
  const { claim, isCurrent } = useComposerPreviewOwner(anchor2, () => {
    setRevoked(true);
    close2();
  });
  const inComposer = Boolean(anchor2?.closest("[data-message-input-root]"));
  const openDelay = inComposer ? COMPOSER_PREVIEW_OPEN_DELAY_MS : outsideTiming?.open ?? PREVIEW_CARD_OPEN_DELAY_MS;
  const closeDelay = !inComposer && outsideTiming ? outsideTiming.close : PREVIEW_CARD_CLOSE_DELAY_MS;
  const enter2 = reactExports.useCallback(() => {
    claim();
    clearTimer2();
    setRevoked(false);
    if (openDelay === 0) setOpen(true);
    else
      timer2.current = setTimeout(() => {
        if (isCurrent()) setOpen(true);
        timer2.current = null;
      }, openDelay);
  }, [claim, clearTimer2, isCurrent, openDelay]);
  const focus2 = reactExports.useCallback(() => {
    claim();
    clearTimer2();
    setRevoked(false);
    setOpen(true);
  }, [claim, clearTimer2]);
  const keep = reactExports.useCallback(() => {
    if (!isCurrent()) return;
    clearTimer2();
    setOpen(true);
  }, [clearTimer2, isCurrent]);
  const leave = reactExports.useCallback(() => {
    clearTimer2();
    timer2.current = setTimeout(() => {
      setOpen(false);
      timer2.current = null;
    }, closeDelay);
  }, [clearTimer2, closeDelay]);
  reactExports.useEffect(() => clearTimer2, [clearTimer2]);
  reactExports.useEffect(() => {
    if (!open) return;
    const handleKey = (event) => {
      if (event.key === "Escape") close2();
    };
    document.addEventListener("keydown", handleKey);
    window.addEventListener("blur", close2);
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("blur", close2);
    };
  }, [open, close2]);
  return { open, revoked, enter: enter2, focus: focus2, keep, leave, close: close2 };
}

export function MentionRemoveButton({
  onRemove: onRemove2,
  actionUiId = "popover.agent-reference-remove"
}) {
  const { t: t2 } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      contentEditable: false,
      "aria-label": t2("mention.popover.removeReference", { defaultValue: "Remove" }),
      "data-action-ui-id": actionUiId,
      className: "hl-mention-remove",
      onMouseDown: (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        onRemove2();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$8, { size: 9, strokeWidth: 2.2, "aria-hidden": "true" })
    }
  );
}

export function CompositionMentionBody({ compositionId }) {
  const runtime = useOptionalWorkspaceStructure();
  const { t: t2 } = useTranslation();
  if (!runtime?.workbench)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-3 text-sm text-muted-foreground", children: t2("workspace.structure.connectionUnavailable") });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchProvider, { workbench: runtime.workbench, queryClient: runtime.queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceStructurePresentation, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionPreview, { compositionId }) }) });
}

export function CompositionComposerPreview({
  compositionId,
  trigger,
  active: active2
}) {
  const [anchor2, setAnchor] = reactExports.useState(null);
  const {
    open,
    revoked,
    enter: scheduleOpen,
    focus: focus2,
    keep: keepOpen,
    leave: scheduleClose,
    close: close2
  } = useComposerPreview(anchor2);
  reactExports.useEffect(() => {
    if (!active2) close2();
  }, [active2, close2]);
  const originalRef = trigger.props.ref;
  const anchorRef = reactExports.useCallback(
    (node2) => {
      setAnchor(node2);
      if (typeof originalRef === "function") {
        const cleanup = originalRef(node2);
        if (typeof cleanup === "function")
          return () => {
            setAnchor(null);
            cleanup();
          };
      } else if (originalRef) originalRef.current = node2;
    },
    [originalRef]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    reactExports.cloneElement(trigger, {
      ref: anchorRef,
      onMouseEnter: (event) => {
        trigger.props.onMouseEnter?.(event);
        if (!event.defaultPrevented) scheduleOpen();
      },
      onMouseLeave: (event) => {
        trigger.props.onMouseLeave?.(event);
        scheduleClose();
      },
      onFocus: (event) => {
        trigger.props.onFocus?.(event);
        focus2();
      },
      onBlur: (event) => {
        trigger.props.onBlur?.(event);
        scheduleClose();
      }
    }),
    active2 && !revoked && anchor2 && /* @__PURE__ */ jsxRuntimeExports.jsx(QuickZoomPresence, { value: open ? true : null, children: (_2, motion2) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      ComposerPreviewPanel,
      {
        compositionId,
        anchor: anchor2,
        onEnter: keepOpen,
        onLeave: scheduleClose,
        onClose: close2,
        motion: motion2
      }
    ) })
  ] });
}

export function ComposerPreviewPanel({
  compositionId,
  anchor: anchor2,
  onEnter,
  onLeave,
  onClose,
  motion: motion2
}) {
  const [size2, setSize] = reactExports.useState({ width: 320, height: 240 });
  const contentRef = reactExports.useRef(null);
  const { layout: layout2, previewRef, handlePreviewMouseLeave, motionOrigin } = useHoverPreview({
    anchorElement: anchor2,
    anchorRect: anchor2.getBoundingClientRect(),
    size: size2,
    fit: "independent",
    interactive: true,
    onPreviewMouseEnter: motion2.inert ? void 0 : onEnter,
    onPreviewMouseLeave: onLeave
  });
  reactExports.useLayoutEffect(() => {
    const content2 = contentRef.current;
    const popup = previewRef.current;
    if (!content2 || !popup) return;
    const measure = () => {
      const width = popup.style.width;
      const height = popup.style.maxHeight;
      const available = popup.style.getPropertyValue("--available-height");
      popup.style.width = "max-content";
      popup.style.maxHeight = "none";
      popup.style.setProperty("--available-height", "70vh");
      const rect = { width: content2.offsetWidth, height: content2.offsetHeight };
      popup.style.width = width;
      popup.style.maxHeight = height;
      popup.style.setProperty("--available-height", available);
      if (rect.width > 0 && rect.height > 0)
        setSize(
          (previous2) => previous2.width === Math.ceil(rect.width) && previous2.height === Math.ceil(rect.height) ? previous2 : { width: Math.ceil(rect.width), height: Math.ceil(rect.height) }
        );
    };
    measure();
    const resize2 = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize2?.observe(content2);
    const mutation = new MutationObserver(measure);
    mutation.observe(content2, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
    return () => {
      resize2?.disconnect();
      mutation.disconnect();
    };
  }, [previewRef]);
  reactExports.useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    const handleScroll2 = (event) => {
      if (event.target instanceof Element && previewRef.current?.contains(event.target)) return;
      onClose();
    };
    const handleOutside = (event) => {
      if (event.target instanceof Node && (anchor2.contains(event.target) || previewRef.current?.contains(event.target)))
        return;
      onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("scroll", handleScroll2, { capture: true, passive: true });
    document.addEventListener("pointerdown", handleOutside);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("scroll", handleScroll2, { capture: true });
      document.removeEventListener("pointerdown", handleOutside);
      window.removeEventListener("blur", onClose);
    };
  }, [anchor2, onClose, previewRef]);
  return reactDomExports.createPortal(
    // biome-ignore lint/a11y/useSemanticElements: an interactive composition preview groups multiple resources.
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "group",
        ref: (node2) => {
          previewRef.current = node2;
          motion2.ref.current = node2;
        },
        "data-ending-style": motion2["data-ending-style"],
        inert: motion2.inert,
        "data-action-ui-id": "composition-composer-hover-preview",
        className: "dp-motion-quick-zoom elevated-surface-border fixed z-[10002] box-border overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg outline-none",
        style: {
          left: layout2.left,
          top: layout2.top,
          width: layout2.width,
          maxHeight: layout2.height,
          "--available-height": `${Math.max(1, layout2.height)}px`,
          "--dp-quick-zoom-origin": motionOrigin
        },
        onMouseEnter: motion2.inert ? void 0 : onEnter,
        onMouseLeave: handlePreviewMouseLeave,
        onPointerDown: (event) => event.stopPropagation(),
        onMouseDown: (event) => {
          event.preventDefault();
          event.stopPropagation();
        },
        onClick: (event) => event.stopPropagation(),
        onKeyDown: (event) => {
          if (event.key === "Escape") onClose();
          event.stopPropagation();
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: contentRef, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionMentionBody, { compositionId }) })
      }
    ),
    document.body
  );
}

export function CompositionMentionPreview({
  compositionId,
  trigger,
  placement: placement2 = "list"
}) {
  const runtime = useOptionalWorkspaceStructure();
  const [open, setOpen] = reactExports.useState(false);
  if (placement2 === "composer")
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      CompositionComposerPreview,
      {
        compositionId,
        trigger,
        active: runtime?.isActive !== false
      }
    );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PreviewCard$1, { open: open && runtime?.isActive !== false, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PreviewCardTrigger, { render: trigger }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PreviewCardContent,
      {
        side: "right",
        sideOffset: 8,
        collisionPadding: 8,
        className: "w-auto max-w-[min(26rem,calc(100vw-2rem))] rounded-xl",
        onPointerDown: (event) => event.stopPropagation(),
        onMouseDown: (event) => {
          event.preventDefault();
          event.stopPropagation();
        },
        onClick: (event) => event.stopPropagation(),
        children: open && runtime?.isActive !== false && /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionMentionBody, { compositionId })
      }
    )
  ] });
}

export function CompositionSlotCover({
  state: { detail: cover, loading, failed },
  size: size2,
  slot
}) {
  const { t: t2 } = useTranslation();
  const iconSize = slot || size2 >= 32 ? 24 : 14;
  if (!cover) {
    if (loading)
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        Skeleton,
        {
          "data-composition-cover-state": "loading",
          className: "size-full rounded-none",
          "aria-label": t2("structure.mediaLoading")
        }
      );
    const Icon2 = failed ? ImageOff$1 : Layers;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        "data-composition-cover-state": failed ? "error" : "empty",
        className: "flex size-full items-center justify-center text-muted-foreground",
        role: "status",
        "aria-label": t2("structure.mediaUnavailable"),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Icon2,
          {
            size: iconSize,
            absoluteStrokeWidth: true,
            strokeWidth: iconSize === 24 ? 1.75 : 1,
            "aria-hidden": "true"
          }
        )
      }
    );
  }
  const { resource: resource2, version: version2 } = cover;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      "data-composition-cover-kind": resource2.kind,
      className: "relative block size-full [&>[data-structure-media-state]]:rounded-none",
      children: resource2.kind === ProjectResourceKind.TEXT_DOCUMENT ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-full items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        FileTypeIcon,
        {
          ...classifyFileType({
            filename: version2?.relativePath,
            mime: cover.metadata?.media?.mimeType,
            mediaKind: "text"
          }),
          size: iconSize,
          decorative: true
        }
      ) }) : resource2.kind === ProjectResourceKind.AUDIO ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-full items-center justify-center text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AudioFileIcon, { size: slot ? 24 : size2 <= 20 ? 14 : 24, "aria-hidden": "true" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          StructureMedia,
          {
            resourceId: resource2.resourceId,
            versionId: version2?.status === "ready" ? version2.versionId : void 0,
            relativePath: version2?.relativePath,
            kind: resource2.kind,
            name: resource2.name,
            thumbnailWidth: slot ? 64 : size2,
            compact: true,
            className: `size-full rounded-none ${slot ? "[&_[role=status]>svg]:size-6 [&_[role=alert]>svg]:size-6" : size2 <= 20 ? "[&_[role=status]>svg]:size-2.5 [&_[role=alert]>svg]:size-2.5" : "[&_[role=status]>svg]:size-4 [&_[role=alert]>svg]:size-4"}`
          }
        ),
        slot && resource2.kind === ProjectResourceKind.VIDEO && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "pointer-events-none absolute bottom-1 right-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(VideoPlayIndicator, { size: 18 }) })
      ] })
    }
  );
}

export function CompositionMentionThumbnail({
  compositionId,
  size: size2 = 32,
  frameClassName,
  variant = "thumbnail"
}) {
  const runtime = useOptionalWorkspaceStructure();
  const renderThumbnail2 = (state2) => /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbnailFrame, { size: size2, variant, frameClassName, state: state2 });
  return runtime?.workbench ? /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchProvider, { workbench: runtime.workbench, queryClient: runtime.queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkspaceStructurePresentation, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    CompositionThumbnail,
    {
      compositionId,
      active: runtime.isActive !== false,
      size: size2,
      render: renderThumbnail2
    }
  ) }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbnailFrame, { size: size2, variant, frameClassName });
}

export function ThumbnailFrame({
  size: size2,
  variant,
  frameClassName,
  state: state2
}) {
  const compact2 = size2 === 20;
  const inline2 = size2 === 14;
  const slot = variant === "slot";
  const file = state2?.detail?.resource.kind === ProjectResourceKind.TEXT_DOCUMENT;
  const inlineFile = inline2 && file;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      "aria-hidden": "true",
      "data-action-ui-id": "composition-mention-thumbnail",
      className: `relative inline-flex shrink-0 items-center ${slot ? "h-full w-15.5" : inlineFile ? "h-4.5 w-5.5" : inline2 ? "h-3.5 w-4.5" : compact2 ? "h-5 w-6.5" : "h-8 w-10"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "data-action-ui-id": "composition-mention-thumbnail-frame",
            className: cn$5(
              "relative flex aspect-square h-full shrink-0 items-center justify-center overflow-hidden [&_[data-structure-media-state]]:min-h-0 [&_[data-structure-media-state]]:min-w-0 [&_[data-structure-media-state]]:rounded-[inherit]",
              file ? "bg-foreground/4" : "bg-muted/30",
              inlineFile && "h-4.5",
              // Slot media shares the single-image corner even with its content inset.
              slot ? "rounded-md" : inline2 ? "rounded-[2px] [&>svg]:size-2.5" : "rounded-sm",
              frameClassName
            ),
            children: state2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionSlotCover, { state: state2, size: size2, slot }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              Layers,
              {
                "aria-hidden": "true",
                strokeWidth: 1.5,
                className: cn$5(
                  slot ? "size-6" : inline2 ? "size-2.5" : "size-3.5",
                  "text-muted-foreground"
                )
              }
            )
          }
        ),
        ["near", "far"].map((layer2) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "svg",
          {
            "aria-hidden": "true",
            focusable: "false",
            viewBox: "0 0 3 21",
            preserveAspectRatio: slot ? "none" : void 0,
            fill: "none",
            className: `pointer-events-none absolute top-1/2 -translate-y-1/2 ${layer2 === "near" ? `text-foreground/15 ${slot ? "left-13.5 h-12.5 w-1" : inlineFile ? "left-4.5 h-4 w-0.5" : inline2 ? "left-3.5 h-3 w-0.5" : compact2 ? "left-5 h-4.5 w-0.75" : "left-8 h-7 w-1"}` : `text-foreground/10 ${slot ? "left-14.5 h-11.5 w-1" : inlineFile ? "left-5 h-3.5 w-0.5" : inline2 ? "left-4 h-2.5 w-0.5" : compact2 ? "left-5.75 h-4 w-0.75" : "left-9 h-6 w-1"}`}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "path",
              {
                d: "M0 0C1.32772 0.309192 2.31738 1.49709 2.31738 2.91895V18.0332C2.31736 19.455 1.32772 20.643 0 20.9521C0.679467 20.3106 1.10449 19.4018 1.10449 18.3936V2.55859C1.10449 1.55036 0.679434 0.641583 0 0Z",
                fill: "currentColor"
              }
            )
          },
          layer2
        ))
      ]
    }
  );
}

export function CompositionMentionTag({
  compositionId,
  name: name2,
  onRemove: onRemove2
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CompositionMentionPreview,
    {
      compositionId,
      placement: "composer",
      trigger: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "span",
        {
          contentEditable: false,
          "data-mention-kind": "composition",
          "data-mention-name": name2,
          "data-composition-id": compositionId,
          className: "hl-mention-file message-input-composition-tag relative inline-flex min-w-0 max-w-[min(220px,100%)] items-center gap-1 rounded-[6px] bg-muted px-1.5 py-0.5 align-middle text-xs leading-4 text-foreground",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionMentionThumbnail, { compositionId, size: 14 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Layers,
              {
                "data-action-ui-id": "composition-mention-kind-icon",
                size: 14,
                absoluteStrokeWidth: true,
                strokeWidth: 1,
                "aria-hidden": "true",
                className: "shrink-0 text-muted-foreground"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "composition-mention-name min-w-0 truncate", children: name2 }),
            onRemove2 && /* @__PURE__ */ jsxRuntimeExports.jsx(MentionRemoveButton, { onRemove: onRemove2, actionUiId: "composition-mention-remove" })
          ]
        }
      )
    }
  );
}

export const ImageOff$1 = createLucideIcon("ImageOff", [
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22", key: "a6p6uj" }],
  ["path", { d: "M10.41 10.41a2 2 0 1 1-2.83-2.83", key: "1bzlo9" }],
  ["line", { x1: "13.5", x2: "6", y1: "13.5", y2: "21", key: "1q0aeu" }],
  ["line", { x1: "18", x2: "21", y1: "12", y2: "15", key: "5mozeu" }],
  [
    "path",
    {
      d: "M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59",
      key: "mmje98"
    }
  ],
  ["path", { d: "M21 15V5a2 2 0 0 0-2-2H9", key: "43el77" }]
]);

export const Layers$1 = createLucideIcon("Layers", [
  [
    "path",
    {
      d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
      key: "zw3jo"
    }
  ],
  [
    "path",
    {
      d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
      key: "1wduqc"
    }
  ],
  [
    "path",
    {
      d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
      key: "kqbvx6"
    }
  ]
]);
