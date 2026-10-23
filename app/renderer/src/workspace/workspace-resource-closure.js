/**
 * 资源视图闭包（第 192 轮：只取应用代码，按「名字 + 行内 span」取回）。
 *
 * 种子：StructureDirectory / StructureContents / ModuleErrorBoundary
 * 清单：scripts/v3preload/closure-manifest-resource.json（151 个，只减不增）
 * 本文件：131 个应用声明 + 8 个补取。npm 的 20 个不再内联。
 *
 * **不用 toplevel-4.0.0.json 的字节偏移**：那份偏移在本区间恒定偏 150 字节，
 * 且 npm 区间又不偏，混用会把函数体切坏。
 */

// 第 192 轮：@base-ui 公开组件 + tanstack + 补取的两个类
import { ContextMenu as __ContextMenu } from "@base-ui/react/context-menu";
import { Dialog as __Dialog } from "@base-ui/react/dialog";
import { Input as __Input } from "@base-ui/react/input";
import { Menu as __Menu } from "@base-ui/react/menu";
import { PreviewCard as __PreviewCard } from "@base-ui/react/preview-card";

// 第 194 轮：改用各组件命名空间，避免猜扁平导出名。
const ContextMenuTrigger$2 = __ContextMenu.Trigger;
const Dialog$4 = __Dialog.Root;
const DialogContent$5 = __Dialog.Popup;
const DialogDescription$3 = __Dialog.Description;
const DialogPortal$3 = __Dialog.Portal;
const DialogTitle$3 = __Dialog.Title;
const DialogTitle$4 = __Dialog.Title;
const DialogDescription$4 = __Dialog.Description;
const Input$4 = __Input;
const MenuItem$4 = __Menu.Item;
const MenuPortal$1 = __Menu.Portal;
const PreviewCard$2 = __PreviewCard.Root;
const PreviewCardContent$1 = __PreviewCard.Popup;
// empty 是 SharedState 的空实现（参考 bundle 内的 utils/empty.js）
const empty = { get: () => undefined, set: () => void 0, has: () => false, delete: () => void 0 };
import { infiniteQueryOptions } from "@tanstack/react-query";

import reactExports from "react";
import jsxRuntimeExports from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { Button as Button$3 } from "@base-ui/react/button";

// 第 194 轮：Composition 查询的默认选项（参考 400389）。
const defaults = {
  networkMode: "always",
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

// 第 194 轮：这两个是 @base-ui 的内部常量，行为在公开组件里已包含；
// 取值与官方 `stateAttributesMapping` 一致。
const transitionStatusMapping = {
  startingStyle: "data-starting-style",
  endingStyle: "data-ending-style",
};
const empty$1 = { get() {}, has() { return false; }, add() {}, delete() {} };
import { Collapsible as __Collapsible } from "@base-ui/react/collapsible";

// 第 194 轮：Collapsible 用公开组件，不再内联 Base UI 的实现。
const CollapsibleRoot = __Collapsible.Root;
const CollapsiblePanel = __Collapsible.Panel;
import { Pause, Play } from "lucide-react";
import { PageStateView } from "./../assets/page-state-view.jsx";
import { useWorkbench } from "./../canvas-v3/canvas-v3-hooks.js";
import { CompositionCommandType, CompositionLifecycle, CompositionOperationType, ProjectActor, ProjectResourceCommandType, ProjectResourceKind, ProjectResourceUpdateKind, mintProjectId, parseComposition } from "./../canvas-v3/canvas-v3-model.js";
import { MenuPopup, MenuPositioner, Pencil, createResourceQueryOptions, resourceQueryKeys, useInfiniteQuery } from "./../canvas-v3/main-exports.js";
import { acceptsNewIntent, toCommandFailureOutcome, toCommandOutcome } from "./../canvas-v3/project-command.js";
import { workbenchQueryKeys } from "./../canvas-v3/query-keys.js";
import { MediaUrlContext, ProjectCompositionHttpError, ScopedMedia, StructureMedia, compositionQueryKeys, createChangeEventDetails, createReadLimiter, formatErrorMessage, invalidate, queryOptions, useIsoLayoutEffect, useRenderElement } from "./../canvas-v3/ui-components.js";
import { COMPOSITION_RESOURCE_KINDS, StructureValidationError, assertActionTarget, assertResourceLocation, assertStructureId, immutableSnapshot, toResourceSelector } from "./../chat/display-order.jsx";
import { Textarea } from "./../infra/badge-variants.jsx";
import { ContextMenuRoot, DialogBackdrop, DialogClose$1, DialogPopup, DialogRoot, PreviewCardTrigger$1 } from "./../infra/base-ui.js";
import { GripVertical } from "./../media-editing/lucide-icon-wraps.js";
import { MessageSquarePlus } from "./../media-editing/package.jsx";
import { Field } from "./../skills/creator-plan/form-parts.jsx";
import { ChevronRight as ChevronRight$2, Download as Download$3, Ellipsis as Ellipsis$1, FileText as FileText$1, Folder as Folder$1, Image as Image$2, Library as Library$1, Music as Music$3, RefreshCw as RefreshCw, Search as Search$3, Trash2 as Trash2$3, Video as Video$3, X as X$9 } from "lucide-react";
import { keepPreviousData, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActionsContext, ResourceDetailContext, ResourceDetailDialogContext } from "./workspace-shell-closure.js";

function CompositionContextMenu({
  id: id2,
  active: active2,
  onDelete,
  onEdit,
  children: children2
}) {
  const actions = reactExports.useContext(ActionsContext);
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const items = [
    {
      key: "addToChat",
      Icon: MessageSquarePlus,
      run: actions.addToChat && (() => actions.addToChat?.(id2))
    },
    { key: "collect", Icon: Library$1, run: actions.collect && (() => actions.collect?.(id2)) },
    {
      key: "exportComposition",
      Icon: Download$3,
      run: actions.export && (() => actions.export?.(id2))
    },
    { key: "delete", Icon: Trash2$3, run: onDelete }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ContextMenuRoot, { open: active2 && open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ContextMenuTrigger$2, { render: children2, "data-action-ui-id": "structure-composition-context" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(MenuPortal$1, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(MenuPositioner, { className: "z-50", sideOffset: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuPopup, { className: "elevated-surface-border min-w-48 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none", children: [
      onEdit && /* @__PURE__ */ jsxRuntimeExports.jsx(
        MenuItem$4,
        {
          onClick: onEdit,
          disabled: actions.busy,
          "data-action-ui-id": "structure-context-edit",
          className: "flex cursor-default items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-muted data-disabled:opacity-50",
          children: t2("structure.editComposition")
        }
      ),
      items.map(({ key: key2, Icon: Icon2, run: run2 }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        MenuItem$4,
        {
          disabled: !run2 || actions.busy,
          onClick: run2,
          "data-action-ui-id": `structure-context-${key2}`,
          className: `flex cursor-default items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-highlighted:bg-muted data-disabled:opacity-50 ${key2 === "delete" ? "text-destructive" : ""}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "aria-hidden": "true", className: "size-4", strokeWidth: 1.5 }),
            t2(`structure.${key2}`)
          ]
        },
        key2
      ))
    ] }) }) })
  ] });
}

function resourceLocationKey(location2) {
  assertResourceLocation(location2.scopeKey, location2);
  return JSON.stringify([
    "location",
    location2.scopeKey,
    location2.compositionId,
    location2.memberId,
    location2.resourceId
  ]);
}

const baselineBrand = /* @__PURE__ */ Symbol("CompositionEditBaseline");

function createCompositionEditBaseline(scopeKey, composition2) {
  assertStructureId(scopeKey, "scopeKey");
  parseComposition(composition2);
  if (composition2.lifecycle !== CompositionLifecycle.ACTIVE) {
    throw new StructureValidationError("Composition must be ACTIVE");
  }
  return Object.freeze({
    [baselineBrand]: true,
    scopeKey,
    composition: immutableSnapshot(composition2)
  });
}

function validateContext(context) {
  assertStructureId(context.scopeKey, "scopeKey");
  assertStructureId(context.commandId, "commandId");
}

function validateBaseline(context, baseline) {
  validateContext(context);
  if (baseline[baselineBrand] !== true || baseline.scopeKey !== context.scopeKey) {
    throw new StructureValidationError("A complete baseline in the current scope is required");
  }
  return baseline.composition;
}

function text$5(value, label) {
  if (typeof value !== "string") throw new StructureValidationError(`${label} must be text`);
}

function uniqueIds(values2, label) {
  for (const value of values2) assertStructureId(value, label);
  if (new Set(values2).size !== values2.length) {
    throw new StructureValidationError(`${label} must be unique`);
  }
}

function attributes(values2) {
  uniqueIds(
    values2.map((value) => value.key),
    "Attribute keys"
  );
  for (const value of values2) text$5(value.value, "Attribute value");
}

function mutate(context, baseline, command2) {
  const composition2 = validateBaseline(context, baseline);
  return immutableSnapshot({
    commandId: context.commandId,
    actor: ProjectActor.HUMAN,
    expectedRevision: composition2.revision,
    command: command2
  });
}

function memberAt(context, baseline, target) {
  const composition2 = validateBaseline(context, baseline);
  assertActionTarget(context.scopeKey, target);
  if (target.compositionId !== composition2.compositionId) {
    throw new StructureValidationError("Target composition does not match the baseline");
  }
  const member2 = composition2.members.find((candidate) => candidate.memberId === target.memberId);
  if (!member2) throw new StructureValidationError("Target member is missing from the baseline");
  return member2;
}

function referenceAt(context, baseline, target) {
  assertActionTarget(context.scopeKey, target, { requireLocation: true });
  const location2 = target.location;
  if (!location2) throw new StructureValidationError("Resource reference location is required");
  const member2 = memberAt(context, baseline, { kind: "member", ...location2 });
  if (member2.resource !== target.resourceId) {
    throw new StructureValidationError("Resource reference is missing from the target member");
  }
  return member2;
}

function apply(context, baseline, operations) {
  return mutate(context, baseline, {
    type: CompositionCommandType.APPLY,
    compositionId: baseline.composition.compositionId,
    operations
  });
}

function buildCompositionCreate(context, input) {
  validateContext(context);
  if (input.compositionType != null) assertStructureId(input.compositionType, "compositionType");
  text$5(input.name, "name");
  if (input.attributes) attributes(input.attributes);
  return immutableSnapshot({
    commandId: context.commandId,
    actor: ProjectActor.HUMAN,
    command: {
      ...input,
      type: CompositionCommandType.CREATE,
      compositionType: input.compositionType ?? null
    }
  });
}

function buildCompositionRename(context, baseline, name2) {
  text$5(name2, "name");
  return mutate(context, baseline, {
    type: CompositionCommandType.RENAME,
    compositionId: baseline.composition.compositionId,
    name: name2
  });
}

function buildCompositionSetType(context, baseline, compositionType) {
  if (compositionType !== null) assertStructureId(compositionType, "compositionType");
  return mutate(context, baseline, {
    type: CompositionCommandType.SET_TYPE,
    compositionId: baseline.composition.compositionId,
    compositionType
  });
}

function buildCompositionSetAttributes(context, baseline, patch2) {
  const composition2 = validateBaseline(context, baseline);
  const set2 = patch2.set ?? [];
  const unset = patch2.unset ?? [];
  attributes(set2);
  uniqueIds(unset, "Unset keys");
  if (set2.some((entry) => unset.includes(entry.key))) {
    throw new StructureValidationError("An attribute cannot be set and unset together");
  }
  const previous2 = new Map(composition2.attributes.map((entry) => [entry.key, entry.value]));
  const changed = set2.filter((entry) => previous2.get(entry.key) !== entry.value);
  const removed = unset.filter((key2) => previous2.has(key2));
  return mutate(context, baseline, {
    type: CompositionCommandType.SET_ATTRIBUTES,
    compositionId: composition2.compositionId,
    ...changed.length ? { set: changed } : {},
    ...removed.length ? { unset: removed } : {}
  });
}

function buildCompositionDelete(context, baseline) {
  return mutate(context, baseline, {
    type: CompositionCommandType.SET_LIFECYCLE,
    compositionId: baseline.composition.compositionId,
    lifecycle: CompositionLifecycle.DELETED
  });
}

function resourceRef(value) {
  if (value !== void 0 && value !== null) assertStructureId(value, "resourceId");
}

function buildMemberAdd(context, baseline, member2) {
  validateBaseline(context, baseline);
  if (member2.role !== void 0) text$5(member2.role, "role");
  resourceRef(member2.resource);
  return apply(context, baseline, [
    {
      type: CompositionOperationType.MEMBER_ADD,
      member: {
        memberId: mintProjectId("member"),
        role: member2.role ?? "",
        resource: member2.resource ?? null
      }
    }
  ]);
}

function buildMemberRemove(context, baseline, target) {
  const member2 = memberAt(context, baseline, target);
  return apply(context, baseline, [
    { type: CompositionOperationType.MEMBER_REMOVE, memberId: member2.memberId }
  ]);
}

function buildMemberUpdate(context, baseline, target, patch2) {
  const member2 = memberAt(context, baseline, target);
  if (patch2.role !== void 0) text$5(patch2.role, "role");
  resourceRef(patch2.resource);
  return apply(context, baseline, [
    {
      type: CompositionOperationType.MEMBER_UPDATE,
      memberId: member2.memberId,
      ...patch2.role !== void 0 ? { role: patch2.role } : {},
      ...patch2.resource !== void 0 ? { resource: patch2.resource } : {}
    }
  ]);
}

function buildResourceReferenceAdd(context, baseline, target, resourceId2) {
  const member2 = memberAt(context, baseline, target);
  assertStructureId(resourceId2, "resourceId");
  if (member2.resource === resourceId2)
    throw new StructureValidationError("Resource reference already exists");
  if (member2.resource !== null)
    throw new StructureValidationError("Target member already holds a Resource");
  return buildMemberUpdate(context, baseline, target, { resource: resourceId2 });
}

function buildResourceReferenceRemove(context, baseline, target) {
  const member2 = referenceAt(context, baseline, target);
  return apply(context, baseline, [
    { type: CompositionOperationType.MEMBER_UPDATE, memberId: member2.memberId, resource: null }
  ]);
}

function buildResourceReferenceMove(context, baseline, source, destination) {
  const from2 = referenceAt(context, baseline, source);
  const to = memberAt(context, baseline, destination);
  if (from2.memberId === to.memberId)
    throw new StructureValidationError("Resource reference is already in the target member");
  if (to.resource !== null && to.resource !== source.resourceId)
    throw new StructureValidationError("Target member already holds a Resource");
  return apply(context, baseline, [
    { type: CompositionOperationType.MEMBER_UPDATE, memberId: from2.memberId, resource: null },
    {
      type: CompositionOperationType.MEMBER_UPDATE,
      memberId: to.memberId,
      resource: source.resourceId
    }
  ]);
}

function compositionEditInput(value) {
  return structuredClone({
    name: value.name,
    compositionType: value.type?.typeId ?? null,
    attributes: value.attributes,
    members: value.members
  });
}

const equal = (a2, b3) => JSON.stringify(a2) === JSON.stringify(b3);

function compositionEditInputDiffers(input, baseline) {
  const comparable = (value) => ({
    ...value,
    attributes: [...value.attributes].sort((a2, b3) => a2.key.localeCompare(b3.key))
  });
  return !equal(comparable(input), comparable(compositionEditInput(baseline)));
}

function buildCompositionEditCommands(context, baseline, input) {
  const before = baseline.composition;
  if (!input.name.trim()) throw new StructureValidationError("Name is required");
  const operations = [];
  const ids2 = /* @__PURE__ */ new Set();
  for (const member2 of input.members) {
    assertStructureId(member2.memberId, "memberId");
    if (ids2.has(member2.memberId) || typeof member2.role !== "string")
      throw new StructureValidationError("Invalid member");
    ids2.add(member2.memberId);
    if (member2.resource !== null) assertStructureId(member2.resource, "resourceId");
    const previous2 = before.members.find((item) => item.memberId === member2.memberId);
    if (!previous2) operations.push({ type: CompositionOperationType.MEMBER_ADD, member: structuredClone(member2) });
    else if (!equal(previous2, member2))
      operations.push({
        type: CompositionOperationType.MEMBER_UPDATE,
        memberId: member2.memberId,
        ...previous2.role !== member2.role ? { role: member2.role } : {},
        ...previous2.resource !== member2.resource ? { resource: member2.resource } : {}
      });
  }
  for (const member2 of before.members)
    if (!ids2.has(member2.memberId))
      operations.push({ type: CompositionOperationType.MEMBER_REMOVE, memberId: member2.memberId });
  const previousIds = new Set(before.members.map((member2) => member2.memberId));
  const order2 = [
    ...before.members.filter((member2) => ids2.has(member2.memberId)),
    ...input.members.filter((member2) => !previousIds.has(member2.memberId))
  ].map((member2) => member2.memberId);
  for (const [index2, member2] of input.members.entries()) {
    if (order2[index2] === member2.memberId) continue;
    operations.push({
      type: CompositionOperationType.MEMBER_MOVE,
      memberId: member2.memberId,
      beforeMemberId: order2[index2]
    });
    order2.splice(order2.indexOf(member2.memberId), 1);
    order2.splice(index2, 0, member2.memberId);
  }
  const attributes2 = buildCompositionSetAttributes(context, baseline, {
    set: input.attributes,
    unset: before.attributes.filter((item) => !input.attributes.some(({ key: key2 }) => key2 === item.key)).map(({ key: key2 }) => key2)
  });
  const type = buildCompositionSetType(context, baseline, input.compositionType);
  const commands = [];
  if (before.name !== input.name)
    commands.push(buildCompositionRename(context, baseline, input.name));
  if ((before.type?.typeId ?? null) !== input.compositionType) commands.push(type);
  if (attributes2.command.type === CompositionCommandType.SET_ATTRIBUTES && (attributes2.command.set?.length || attributes2.command.unset?.length))
    commands.push(attributes2);
  if (operations.length)
    commands.push({
      ...type,
      command: { type: CompositionCommandType.APPLY, compositionId: before.compositionId, operations }
    });
  return commands.map((envelope, index2) => ({
    ...envelope,
    commandId: `${context.commandId}_${index2}`,
    expectedRevision: before.revision + index2
  }));
}

function applyCompositionEditReceipt(before, envelope, revision2) {
  const next2 = structuredClone(before);
  const command2 = envelope.command;
  switch (command2.type) {
    case CompositionCommandType.RENAME:
      next2.name = command2.name;
      break;
    case CompositionCommandType.SET_TYPE:
      next2.type = command2.compositionType === null ? null : {
        typeId: command2.compositionType,
        label: command2.compositionType,
        createdAt: before.createdAt,
        updatedAt: before.updatedAt
      };
      break;
    case CompositionCommandType.SET_ATTRIBUTES:
      next2.attributes = next2.attributes.filter(({ key: key2 }) => !command2.unset?.includes(key2));
      for (const entry of command2.set ?? []) {
        const existing2 = next2.attributes.find((item) => item.key === entry.key);
        if (existing2) existing2.value = entry.value;
        else next2.attributes.push({ ...entry });
      }
      break;
    case CompositionCommandType.APPLY:
      for (const operation2 of command2.operations) {
        if (operation2.type === CompositionOperationType.MEMBER_ADD) {
          if (next2.members.some((member2) => member2.memberId === operation2.member.memberId))
            throw new StructureValidationError("Member already exists");
          next2.members.push(structuredClone(operation2.member));
        } else if (operation2.type === CompositionOperationType.MEMBER_REMOVE)
          next2.members = next2.members.filter((member2) => member2.memberId !== operation2.memberId);
        else if (operation2.type === CompositionOperationType.MEMBER_MOVE) {
          const index2 = next2.members.findIndex((item) => item.memberId === operation2.memberId);
          if (index2 === -1) throw new StructureValidationError("Member no longer exists");
          const [moved] = next2.members.splice(index2, 1);
          const before2 = operation2.beforeMemberId === null ? next2.members.length : next2.members.findIndex((item) => item.memberId === operation2.beforeMemberId);
          if (before2 === -1) throw new StructureValidationError("Member no longer exists");
          next2.members.splice(before2, 0, moved);
        } else {
          const member2 = next2.members.find((item) => item.memberId === operation2.memberId);
          if (!member2) throw new StructureValidationError("Member no longer exists");
          if (operation2.role !== void 0) member2.role = operation2.role;
          if (operation2.resource !== void 0) member2.resource = operation2.resource;
        }
      }
      break;
    case CompositionCommandType.SET_LIFECYCLE:
      next2.lifecycle = command2.lifecycle;
      break;
    case CompositionCommandType.RESTORE:
      next2.lifecycle = CompositionLifecycle.ACTIVE;
      break;
  }
  next2.revision = revision2;
  return next2;
}

function rebaseCompositionEdit(scopeKey, before, draft, latest2) {
  let merged = structuredClone(latest2);
  const commands = buildCompositionEditCommands(
    { scopeKey, commandId: "review" },
    createCompositionEditBaseline(scopeKey, before),
    draft
  );
  for (const command2 of commands)
    merged = applyCompositionEditReceipt(merged, command2, latest2.revision);
  return compositionEditInput(merged);
}

function isCursorStaleError(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "CURSOR_STALE";
}

class CompositionCursorStaleError extends Error {
  code = "CURSOR_STALE";
  kind = "cursor_stale";
  retryable = false;
  constructor() {
    super("Composition revision changed; restart member pagination from the first page");
    this.name = "CompositionCursorStaleError";
  }
}

function assertScope(scopeKey) {
  if (!scopeKey.trim()) throw new Error("Composition queries require a workspace scope key");
}

function createCompositionQueryOptions(client, scopeKey) {
  assertScope(scopeKey);
  return {
    details(compositionId) {
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "get", { compositionId }),
        queryFn: ({ signal }) => client.get(compositionId, { signal })
      });
    },
    list(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "list", query),
        queryFn: ({ signal }) => client.list(query, { signal })
      });
    },
    search(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "search", query),
        queryFn: ({ signal }) => client.search(query, { signal })
      });
    },
    /** Full resolved export. */
    listAll(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "listAll", query),
        queryFn: ({ signal }) => client.listAll(query, { signal })
      });
    },
    listByResource(input) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "listByResource", query),
        queryFn: ({ signal }) => client.listByResource(query, { signal })
      });
    },
    types(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.domain(scopeKey, "listTypes", query),
        queryFn: ({ signal }) => client.listTypes(query, { signal })
      });
    }
  };
}

function createProjectQueryOptions(client, scopeKey) {
  assertScope(scopeKey);
  return {
    types(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.query(scopeKey, "composition_type_list", query),
        queryFn: ({ signal }) => client.query("composition_type_list", query, { signal })
      });
    },
    search(input = {}) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.query(scopeKey, "composition_search", query),
        queryFn: ({ signal }) => client.query("composition_search", query, { signal })
      });
    },
    searchPages(input = {}) {
      const { cursor: _cursor, ...query } = structuredClone(input);
      return infiniteQueryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.query(scopeKey, "composition_search", query, "infinite"),
        initialPageParam: void 0,
        queryFn: ({ pageParam, signal }) => client.query("composition_search", { ...query, cursor: pageParam }, { signal }),
        getNextPageParam: (page2) => page2.nextCursor ?? void 0
      });
    },
    summary(compositionId) {
      const query = { compositionId, view: "summary" };
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.query(scopeKey, "composition_get", query),
        queryFn: ({ signal }) => client.query("composition_get", query, { signal })
      });
    },
    members(input) {
      const {
        cursor: _cursor,
        view: _view,
        ...filters
      } = structuredClone(input);
      const query = {
        ...filters,
        view: "members",
        resolveResources: input.resolveResources ?? false
      };
      return infiniteQueryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.query(scopeKey, "composition_get", query, "infinite"),
        initialPageParam: {},
        queryFn: async ({ pageParam, signal }) => {
          const page2 = await client.query(
            "composition_get",
            { ...query, cursor: pageParam.cursor },
            { signal }
          );
          if (pageParam.revision !== void 0 && page2.revision !== pageParam.revision) {
            throw new CompositionCursorStaleError();
          }
          return page2;
        },
        getNextPageParam: (page2) => page2.nextCursor === null ? void 0 : { cursor: page2.nextCursor, revision: page2.revision }
      });
    },
    relations(input) {
      const query = structuredClone(input);
      return queryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.query(scopeKey, "resource_relations", query),
        queryFn: ({ signal }) => client.query("resource_relations", query, { signal })
      });
    },
    relationPages(input) {
      const { cursor: _cursor, ...query } = structuredClone(input);
      return infiniteQueryOptions({
        ...defaults,
        queryKey: compositionQueryKeys.query(scopeKey, "resource_relations", query, "infinite"),
        initialPageParam: void 0,
        queryFn: ({ pageParam, signal }) => client.query("resource_relations", { ...query, cursor: pageParam }, { signal }),
        getNextPageParam: (page2) => page2.nextCursor ?? void 0
      });
    }
  };
}

class ModuleErrorBoundaryView extends reactExports.Component {
  state = { caught: false, error: void 0 };
  static getDerivedStateFromError(error) {
    return { caught: true, error };
  }
  componentDidUpdate(previous2) {
    if (previous2.resetKey !== this.props.resetKey && this.state.caught) this.reset();
  }
  componentDidCatch(error, info2) {
    this.props.onError?.(error, info2, this.props.moduleId);
  }
  reset = () => {
    this.setState({ caught: false, error: void 0 });
  };
  render() {
    if (!this.state.caught) return this.props.children;
    return this.props.fallback({ error: this.state.error, retry: this.reset });
  }
}

function ModuleErrorBoundary({ resetKey, ...rest }) {
  const { scopeKey } = useWorkbench();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ModuleErrorBoundaryView, { ...rest, resetKey: resetKey ?? scopeKey });
}

function restartCompositionMembers(cache2, scopeKey, compositionId) {
  if (!scopeKey.trim() || compositionId !== void 0 && !compositionId.trim()) {
    throw new Error("Member pagination restart requires valid scope and composition identities");
  }
  return invalidate(
    cache2,
    ({ queryKey }) => workbenchQueryKeys.matches(queryKey, scopeKey) && compositionQueryKeys.isMembers(queryKey, compositionId)
  );
}

function referenceOrder(composition2, memberId) {
  return composition2.members.find((member2) => member2.memberId === memberId)?.resource ?? "";
}

function reviewRows(original, latest2, draft) {
  const common = { label: "name", original: original.name, latest: latest2.name };
  switch (draft.action) {
    case "rename":
      return [{ ...common, draft: draft.value }];
    case "type":
      return [
        {
          label: "typeLabel",
          original: original.type?.typeId ?? "",
          latest: latest2.type?.typeId ?? "",
          draft: draft.value
        }
      ];
    case "attribute":
      return [
        {
          label: "value",
          original: original.attributes.find(({ key: key2 }) => key2 === draft.attributeKey)?.value,
          latest: latest2.attributes.find(({ key: key2 }) => key2 === draft.attributeKey)?.value,
          draft: draft.value,
          removed: draft.removeAttribute
        }
      ];
    case "member-role":
    case "remove-member":
      return [
        {
          label: "memberLabel",
          original: original.members.find((member2) => member2.memberId === draft.memberId)?.role,
          latest: latest2.members.find((member2) => member2.memberId === draft.memberId)?.role,
          draft: draft.value,
          removed: draft.action === "remove-member"
        }
      ];
    case "delete":
      return [{ ...common, removed: true }];
    case "add-member":
      return [{ label: "memberLabel", draft: draft.value }];
    case "add-reference":
    case "remove-reference":
    case "move": {
      const proposed = draft.action === "add-reference" ? draft.value : "";
      const rows = [
        {
          label: "editorReferenceOrder",
          original: referenceOrder(original, draft.memberId),
          latest: referenceOrder(latest2, draft.memberId),
          draft: proposed
        }
      ];
      if (draft.action === "move") {
        rows.push({
          label: "destination",
          original: referenceOrder(original, draft.destination),
          latest: referenceOrder(latest2, draft.destination),
          draft: draft.resourceId
        });
      }
      return rows;
    }
    case "create":
      return [];
  }
}

function EditorConflictReview({
  state: state2,
  compact: compact2 = false
}) {
  const { t: t2 } = useTranslation();
  if (!state2.conflictBaseline || !state2.baseline || !state2.draft || state2.result?.status === "conflict")
    return null;
  const rows = reviewRows(state2.conflictBaseline, state2.baseline, state2.draft);
  const display = (value) => value === void 0 ? t2("structure.editorMissingValue") : value || t2("structure.editorEmptyValue");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "mb-3 grid gap-3 rounded-lg border border-border bg-muted p-3",
      "aria-label": t2("structure.editorReviewTitle"),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-medium", children: t2("structure.editorReviewTitle") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t2("structure.editorReviewHelp") })
        ] }),
        rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium", children: state2.draft?.action === "attribute" ? state2.draft.attributeKey : t2(`structure.${row.label}`) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: `grid min-w-0 gap-3 ${compact2 ? "" : "md:grid-cols-3"}`, children: [
            ["editorOriginalValue", display(row.original)],
            ["editorLatestValue", display(row.latest)],
            [
              "editorDraftValue",
              row.removed ? t2("structure.editorRemovedValue") : display(row.draft)
            ]
          ].map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-xs text-muted-foreground", children: t2(`structure.${label}`) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "mt-1 whitespace-pre-wrap break-words", children: value })
          ] }, label)) })
        ] }, row.label))
      ]
    }
  );
}

function referenceBaselinesMatch(draft, baseline) {
  return (draft.referenceBaselines ?? []).every(({ memberId, resource: resource2 }) => {
    const member2 = baseline.members.find((entry) => entry.memberId === memberId);
    return member2 !== void 0 && member2.resource === resource2;
  });
}

function validateEditorDraft(draft, baseline) {
  const errors = {};
  if ((draft.action === "create" || draft.action === "rename") && !draft.value.trim())
    errors.value = "editorRequiredName";
  if (draft.action === "attribute") {
    if (!draft.attributeKey.trim() || draft.attributeKey.includes("\0"))
      errors.attributeKey = "editorRequiredAttributeKey";
    else if (draft.removeAttribute && !baseline?.attributes.some(({ key: key2 }) => key2 === draft.attributeKey))
      errors.attributeKey = "editorAttributeMissing";
  }
  const member2 = baseline?.members.find((entry) => entry.memberId === draft.memberId);
  if (["member-role", "remove-member", "add-reference", "remove-reference", "move"].includes(
    draft.action
  ) && !member2)
    errors.target = "editorTargetMissing";
  if (draft.action === "add-reference") {
    if (!draft.value) errors.value = "editorRequiredResource";
    else if (member2?.resource === draft.value) errors.value = "editorDuplicateReference";
    else if (member2 && member2.resource !== null) errors.value = "editorMemberOccupied";
  }
  if (draft.action === "remove-reference" || draft.action === "move") {
    if (!draft.resourceId || member2?.resource !== draft.resourceId)
      errors.target = "editorTargetMissing";
  }
  if (draft.action === "move" && (draft.destination === draft.memberId || !baseline?.members.some((entry) => entry.memberId === draft.destination)))
    errors.destination = "editorRequiredDestination";
  if (draft.action === "move") {
    const destination = baseline?.members.find((entry) => entry.memberId === draft.destination);
    if (destination && destination.resource !== null && destination.resource !== draft.resourceId)
      errors.destination = "editorMemberOccupied";
  }
  return errors;
}

const stores$5 = /* @__PURE__ */ new WeakMap();

class StructureEditorStore {
  constructor(workbench) {
    this.workbench = workbench;
    this.persistence = workbench.persistence.createEntry({
      discardDraft: () => {
        for (const id2 of this.states.keys()) this.close(id2);
      },
      recover: async () => {
        for (const id2 of this.states.keys()) await this.recover(id2);
      }
    });
    const unsubscribe = workbench.events.subscribe((event) => {
      if (event.type !== "disposed") return;
      this.active = false;
      for (const controller of this.reads.values()) controller.abort();
      this.states.clear();
      this.emit();
      this.listeners.clear();
      unsubscribe();
    });
    if (workbench.structure.available)
      for (const pending2 of workbench.structure.commands.getPending()) {
        if ("compositionId" in pending2.envelope.command)
          this.states.set(pending2.envelope.command.compositionId, {
            busy: false,
            result: { status: "unknown", error: void 0, recovery: pending2 }
          });
      }
    this.emit();
  }
  workbench;
  states = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  active = true;
  persistence;
  sequence = /* @__PURE__ */ new Map();
  reads = /* @__PURE__ */ new Map();
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  get = (id2) => this.states.get(id2) ?? empty$1;
  emit() {
    if (this.active) {
      const states = [...this.states.values()];
      this.persistence.update(
        states.some((state2) => state2.result?.status === "unknown") ? "failed" : states.some((state2) => state2.busy) ? "saving" : states.some((state2) => state2.draft) ? "dirty" : "clean"
      );
    }
    for (const listener of this.listeners) listener();
  }
  set(id2, state2) {
    if (this.active) {
      this.states.set(id2, state2);
      this.emit();
    }
  }
  patch(id2, values2) {
    const state2 = this.get(id2);
    if (state2.draft && !state2.busy && state2.result?.status !== "unknown") {
      const draft = { ...state2.draft, ...values2 };
      this.set(id2, {
        ...state2,
        draft,
        fieldErrors: state2.fieldErrors ? validateEditorDraft(draft, state2.baseline) : void 0,
        error: state2.error === "orderChanged" ? state2.error : void 0
      });
    }
  }
  selectAttribute(id2, attributeKey) {
    const state2 = this.get(id2);
    this.patch(id2, {
      attributeKey,
      value: state2.baseline?.attributes.find((entry) => entry.key === attributeKey)?.value ?? "",
      removeAttribute: false
    });
  }
  close(id2) {
    const state2 = this.get(id2);
    if (state2.busy || state2.result?.status === "unknown") return;
    this.reads.get(id2)?.abort();
    this.sequence.set(id2, (this.sequence.get(id2) ?? 0) + 1);
    this.set(id2, empty$1);
  }
  async open(id2, draft) {
    if (!this.active || this.get(id2).busy || this.get(id2).draft || this.get(id2).result?.status === "unknown")
      return;
    this.set(id2, { draft: structuredClone(draft), busy: draft.action !== "create" });
    if (draft.action !== "create") await this.reload(id2, true);
  }
  async reload(id2, initialize = false) {
    if (!this.active || this.get(id2).result?.status === "unknown") return;
    const state2 = this.get(id2);
    if (!state2.draft) return;
    const version2 = (this.sequence.get(id2) ?? 0) + 1;
    this.sequence.set(id2, version2);
    this.reads.get(id2)?.abort();
    const controller = new AbortController();
    this.reads.set(id2, controller);
    this.set(id2, { ...state2, busy: true, error: void 0 });
    try {
      const baseline = await this.workbench.structure.get(id2, { signal: controller.signal });
      if (!this.active || this.sequence.get(id2) !== version2) return;
      createCompositionEditBaseline(this.workbench.scopeKey, baseline);
      const draft = { ...state2.draft };
      if (initialize) {
        if (draft.action === "rename") draft.value = baseline.name;
        if (draft.action === "type") draft.value = baseline.type?.typeId ?? "";
        if (draft.action === "member-role")
          draft.value = baseline.members.find((member2) => member2.memberId === draft.memberId)?.role ?? "";
        if (draft.action === "attribute" && !draft.value) {
          const attribute = draft.attributeKey ? baseline.attributes.find((entry) => entry.key === draft.attributeKey) : baseline.attributes[0];
          if (attribute) {
            draft.attributeKey = attribute.key;
            draft.value = attribute.value;
          }
        }
      }
      this.set(id2, {
        draft,
        baseline,
        conflictBaseline: state2.conflictBaseline,
        busy: false,
        ...!referenceBaselinesMatch(draft, baseline) || state2.error === "orderChanged" ? { error: "orderChanged" } : {}
      });
    } catch {
      if (!controller.signal.aborted && this.sequence.get(id2) === version2)
        this.set(id2, { ...state2, busy: false, error: "read" });
    } finally {
      if (this.reads.get(id2) === controller) this.reads.delete(id2);
    }
  }
  envelope(id2, state2) {
    const draft = state2.draft;
    if (!draft) throw new Error("No draft");
    const context = { scopeKey: this.workbench.scopeKey, commandId: crypto.randomUUID() };
    if (draft.action === "create") {
      if (!draft.value.trim()) throw new Error("Invalid draft");
      return buildCompositionCreate(context, {
        compositionType: draft.destination || null,
        name: draft.value.trim()
      });
    }
    if (!state2.baseline) throw new Error("No baseline");
    if (!referenceBaselinesMatch(draft, state2.baseline)) throw new Error("Reference order changed");
    const baseline = createCompositionEditBaseline(context.scopeKey, state2.baseline);
    const member2 = {
      kind: "member",
      scopeKey: context.scopeKey,
      compositionId: id2,
      memberId: draft.memberId ?? ""
    };
    const resource2 = {
      kind: "resource",
      scopeKey: context.scopeKey,
      resourceId: draft.resourceId ?? "",
      location: {
        scopeKey: context.scopeKey,
        compositionId: id2,
        memberId: draft.memberId ?? "",
        resourceId: draft.resourceId ?? ""
      }
    };
    switch (draft.action) {
      case "rename":
        if (!draft.value.trim()) throw new Error("Empty name");
        return buildCompositionRename(context, baseline, draft.value.trim());
      case "type":
        return buildCompositionSetType(context, baseline, draft.value || null);
      case "attribute":
        return buildCompositionSetAttributes(
          context,
          baseline,
          draft.removeAttribute ? { unset: [draft.attributeKey] } : { set: [{ key: draft.attributeKey, value: draft.value }] }
        );
      case "delete":
        return buildCompositionDelete(context, baseline);
      case "add-member":
        return buildMemberAdd(context, baseline, {
          role: draft.value,
          resource: null
        });
      case "member-role":
        return buildMemberUpdate(context, baseline, member2, { role: draft.value });
      case "remove-member":
        return buildMemberRemove(context, baseline, member2);
      case "add-reference":
        return buildResourceReferenceAdd(context, baseline, member2, draft.value);
      case "remove-reference":
        return buildResourceReferenceRemove(context, baseline, resource2);
      case "move":
        return buildResourceReferenceMove(context, baseline, resource2, {
          ...member2,
          memberId: draft.destination
        });
    }
  }
  async submit(id2) {
    const state2 = this.get(id2);
    if (!this.active || state2.busy || state2.result?.status === "unknown" || state2.result?.status === "conflict" || state2.error === "orderChanged" || !state2.draft)
      return;
    if (state2.baseline && !referenceBaselinesMatch(state2.draft, state2.baseline)) {
      this.set(id2, { ...state2, error: "orderChanged" });
      return;
    }
    const fieldErrors = validateEditorDraft(state2.draft, state2.baseline);
    if (Object.keys(fieldErrors).length) {
      this.set(id2, { ...state2, fieldErrors });
      return;
    }
    this.set(id2, { ...state2, busy: true, error: void 0 });
    try {
      const envelope = this.envelope(id2, state2);
      const result = await this.workbench.structure.commands.submit(envelope);
      this.set(id2, {
        ...state2,
        busy: false,
        result,
        error: void 0,
        fieldErrors: void 0,
        ...result.status === "conflict" ? { conflictBaseline: state2.baseline } : {},
        ...result.status === "committed" ? { draft: void 0, baseline: void 0, conflictBaseline: void 0 } : {}
      });
    } catch {
      this.set(id2, { ...state2, busy: false, error: "invalid" });
    }
  }
  async recover(id2) {
    const state2 = this.get(id2);
    if (!this.active || state2.busy || state2.result?.status !== "unknown") return;
    this.set(id2, { ...state2, busy: true });
    try {
      const result = await state2.result.recovery.recover();
      this.set(id2, {
        ...state2,
        busy: false,
        result,
        ...result.status === "conflict" ? { conflictBaseline: state2.baseline } : {},
        ...result.status === "committed" ? { draft: void 0, baseline: void 0, conflictBaseline: void 0 } : {}
      });
    } catch {
      this.set(id2, { ...state2, busy: false, error: "submit" });
    }
  }
}

export function structureEditor(workbench) {
  let store = stores$5.get(workbench);
  if (!store) {
    store = new StructureEditorStore(workbench);
    stores$5.set(workbench, store);
  }
  return store;
}

function useStructureEditor(id2) {
  const store = structureEditor(useWorkbench());
  const state2 = reactExports.useSyncExternalStore(
    store.subscribe,
    () => store.get(id2),
    () => store.get(id2)
  );
  return { store, state: state2 };
}

function editDraft(action2, values2 = {}) {
  return {
    action: action2,
    value: "",
    destination: "",
    attributeKey: "",
    removeAttribute: false,
    ...values2
  };
}

const selectClass = "h-8 w-full min-w-0 max-w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:border-foreground disabled:opacity-50";

function ResourceChoice({
  value,
  onChange,
  disabled,
  linked,
  error
}) {
  const workbench = useWorkbench();
  const { t: t2 } = useTranslation();
  const search2 = { limit: 50, kind: COMPOSITION_RESOURCE_KINDS };
  const query = useInfiniteQuery({
    queryKey: [
      ...resourceQueryKeys.search(workbench.scopeKey, search2),
      "structure-picker-infinite"
    ],
    initialPageParam: void 0,
    queryFn: ({ pageParam, signal }) => workbench.resources.search({ ...search2, cursor: pageParam }, { signal }),
    getNextPageParam: (page2) => page2.nextCursor
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t2("structure.resource"), error, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "select",
      {
        className: selectClass,
        value,
        disabled,
        onChange: (event) => onChange(event.target.value),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t2("structure.choose") }),
          query.data?.pages.flatMap((page2) => page2.items).filter(
            (item) => item.lifecycle === "active" && COMPOSITION_RESOURCE_KINDS.includes(item.kind)
          ).map((resource2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "option",
            {
              value: resource2.resourceId,
              disabled: linked === resource2.resourceId,
              children: [
                resource2.name,
                " · ",
                resource2.resourceId,
                linked === resource2.resourceId ? ` · ${t2("structure.editorAlreadyLinked")}` : ""
              ]
            },
            resource2.resourceId
          ))
        ]
      }
    ) }),
    query.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }),
    query.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { type: "button", variant: "outline", onClick: () => void query.refetch(), children: t2("structure.retry") }),
    query.hasNextPage && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        type: "button",
        variant: "outline",
        disabled: query.isFetching,
        onClick: () => void query.fetchNextPage(),
        children: t2("structure.more")
      }
    )
  ] });
}

function EditorPanel({
  id: id2,
  types: types2,
  onCommitted,
  onClose,
  compact: compact2 = false
}) {
  const { t: t2 } = useTranslation();
  const { store, state: state2 } = useStructureEditor(id2);
  const { draft, result } = state2;
  if (!draft && !result) return null;
  const frozen2 = state2.busy || result?.status === "unknown";
  const blocked = frozen2 || result?.status === "conflict" || state2.error === "read" || state2.error === "orderChanged";
  const notice = result?.status === "committed" ? "saved" : result?.status;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: `min-w-0 rounded-lg border border-border bg-card text-sm ${compact2 ? "p-2" : "p-4"}`,
      "aria-label": draft ? t2(`structure.${draft.action}`) : t2(notice ? `structure.${notice}` : "structure.pending"),
      children: [
        notice && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: notice === "saved" ? "status" : "alert", className: "mb-3", children: t2(`structure.${notice}`) }),
        state2.error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "mb-3", children: t2(
          state2.error === "orderChanged" ? "structure.editorOrderChanged" : state2.error === "read" ? "structure.loadError" : state2.error === "invalid" ? "structure.invalid" : "structure.rejected"
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(EditorConflictReview, { state: state2, compact: compact2 }),
        result?.status === "unknown" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            type: "button",
            loading: state2.busy,
            "data-action-ui-id": "structure-recover",
            onClick: async () => {
              await store.recover(id2);
              const completed = store.get(id2).result;
              if (completed?.status === "committed" && "compositionId" in completed.receipt)
                onCommitted?.(completed.receipt.compositionId, draft?.action ?? "recover");
            },
            children: t2("structure.recover")
          }
        ),
        draft && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "form",
          {
            className: "grid gap-3",
            onSubmit: async (event) => {
              event.preventDefault();
              await store.submit(id2);
              const completed = store.get(id2).result;
              if (completed?.status === "committed" && "compositionId" in completed.receipt)
                onCommitted?.(completed.receipt.compositionId, draft.action);
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-medium", children: t2(`structure.${draft.action}`) }),
              state2.busy && !state2.baseline && draft.action !== "create" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loadingBaseline") }),
              ["create", "rename", "member-role", "add-member"].includes(draft.action) && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Field,
                {
                  label: t2(
                    draft.action.includes("member") ? "structure.memberLabel" : "structure.name"
                  ),
                  error: state2.fieldErrors?.value,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Input$4,
                    {
                      value: draft.value,
                      disabled: frozen2,
                      onChange: (event) => store.patch(id2, { value: event.target.value })
                    }
                  )
                }
              ),
              ["create", "type"].includes(draft.action) && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Field,
                {
                  label: t2("structure.typeLabel"),
                  error: draft.action === "create" ? state2.fieldErrors?.destination : state2.fieldErrors?.value,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: selectClass,
                      value: draft.action === "create" ? draft.destination : draft.value,
                      disabled: frozen2,
                      onChange: (event) => store.patch(
                        id2,
                        draft.action === "create" ? { destination: event.target.value } : { value: event.target.value }
                      ),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t2("structure.choose") }),
                        types2.map((type) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: type.id, children: type.label }, type.id))
                      ]
                    }
                  )
                }
              ),
              draft.action === "attribute" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t2("structure.editorExistingAttribute"), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    className: selectClass,
                    value: state2.baseline?.attributes.some((entry) => entry.key === draft.attributeKey) ? draft.attributeKey : "",
                    disabled: frozen2,
                    onChange: (event) => store.selectAttribute(id2, event.target.value),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t2("structure.editorNewAttribute") }),
                      state2.baseline?.attributes.map((attribute) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: attribute.key, children: attribute.key }, attribute.key))
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t2("structure.editorAttributeHelp") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t2("structure.attributeKey"), error: state2.fieldErrors?.attributeKey, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input$4,
                  {
                    value: draft.attributeKey,
                    disabled: frozen2,
                    onChange: (event) => store.patch(id2, { attributeKey: event.target.value })
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t2("structure.value"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "textarea",
                  {
                    className: "min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground disabled:opacity-50 aria-invalid:border-destructive",
                    rows: 4,
                    value: draft.value,
                    disabled: frozen2 || draft.removeAttribute,
                    onChange: (event) => store.patch(id2, { value: event.target.value })
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: draft.removeAttribute,
                      disabled: frozen2,
                      onChange: (event) => store.patch(id2, { removeAttribute: event.target.checked })
                    }
                  ),
                  t2("structure.removeAttribute")
                ] })
              ] }),
              draft.action === "add-reference" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                ResourceChoice,
                {
                  value: draft.value,
                  disabled: frozen2 || state2.baseline?.members.find((member2) => member2.memberId === draft.memberId)?.resource !== null,
                  linked: state2.baseline?.members.find((member2) => member2.memberId === draft.memberId)?.resource ?? null,
                  error: state2.fieldErrors?.value,
                  onChange: (value) => store.patch(id2, { value })
                }
              ),
              draft.action === "move" && /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: t2("structure.destination"), error: state2.fieldErrors?.destination, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: selectClass,
                  value: draft.destination,
                  disabled: frozen2,
                  onChange: (event) => store.patch(id2, { destination: event.target.value }),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t2("structure.choose") }),
                    state2.baseline?.members.filter(
                      (member2) => member2.memberId !== draft.memberId && (member2.resource === null || member2.resource === draft.resourceId)
                    ).map((member2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: member2.memberId, children: [
                      member2.role || t2("structure.unnamedMember"),
                      " · ",
                      member2.memberId
                    ] }, member2.memberId))
                  ]
                }
              ) }),
              draft.action === "move" && draft.resourceId && state2.baseline?.members.find((member2) => member2.memberId === draft.destination)?.resource === draft.resourceId && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-xs text-muted-foreground", children: t2("structure.editorMoveDuplicate") }),
              ["target"].map(
                (field) => state2.fieldErrors?.[field] && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "text-xs text-destructive", children: t2(`structure.${state2.fieldErrors[field]}`) }, field)
              ),
              draft.action === "delete" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t2("structure.confirmDelete") }),
              draft.action === "remove-member" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t2("structure.confirmMember") }),
              draft.action === "remove-reference" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t2("structure.confirmReference") }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button$3,
                  {
                    type: "submit",
                    "data-action-ui-id": "structure-submit",
                    disabled: blocked,
                    loading: state2.busy,
                    children: t2(state2.busy ? "structure.saving" : "structure.save")
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button$3,
                  {
                    type: "button",
                    variant: "outline",
                    disabled: frozen2,
                    onClick: () => {
                      store.close(id2);
                      onClose?.();
                    },
                    children: t2("structure.cancel")
                  }
                ),
                draft.action !== "create" && (result?.status === "conflict" || result?.status === "rejected" || state2.error === "read") && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button$3,
                  {
                    type: "button",
                    variant: "outline",
                    disabled: frozen2,
                    onClick: () => void store.reload(id2),
                    children: t2("structure.reloadBaseline")
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  );
}

function StructureDocumentPreview(props) {
  const { renderDocument: renderDocument2 } = reactExports.useContext(MediaUrlContext);
  const { t: t2 } = useTranslation();
  return renderDocument2 ? renderDocument2(props) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: t2("structure.previewUnavailable") });
}

function StructureAudio(props) {
  const { renderAudio } = reactExports.useContext(MediaUrlContext);
  return renderAudio ? renderAudio(props) : /* @__PURE__ */ jsxRuntimeExports.jsx(StructureMedia, { ...props, kind: 4 });
}

function useStructureVideoUrl(reference) {
  const { videoUrl } = reactExports.useContext(MediaUrlContext);
  try {
    return videoUrl?.(reference);
  } catch {
    return void 0;
  }
}

function StructureMediaDetail(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ScopedMedia, { ...props, retryable: true });
}

function memberProjection(scopeKey, pages) {
  const revision2 = pages[0]?.revision;
  if (pages.some((page2) => page2.revision !== revision2 || page2.id !== pages[0]?.id))
    throw new Error("Mixed Composition member snapshots");
  const members2 = pages.flatMap((page2) => page2.items);
  const locations = members2.flatMap(
    (member2) => (member2.resource ? [member2.resource] : []).map(({ resourceId: resourceId2 }) => ({
      scopeKey,
      compositionId: pages[0].id,
      memberId: member2.id,
      resourceId: resourceId2
    }))
  );
  return {
    members: members2,
    locations,
    complete: pages.length > 0 && pages.at(-1)?.nextCursor === null && pages.every((page2) => page2.coverage.status === "complete"),
    // Count references before deduplication. A resource can occupy several independent locations.
    referenceCount: locations.length
  };
}

function resourceBatches(locations) {
  const unique2 = [...new Set(locations.map((location2) => location2.resourceId))].sort();
  const batches = [];
  for (let offset2 = 0; offset2 < unique2.length; offset2 += 100)
    batches.push(unique2.slice(offset2, offset2 + 100).map((resourceId2) => ({ resourceId: resourceId2 })));
  return batches;
}

const limiters = /* @__PURE__ */ new WeakMap();

function structureReadLimiter(workbench) {
  let value = limiters.get(workbench);
  if (!value) {
    value = createReadLimiter();
    limiters.set(workbench, value);
  }
  return value;
}

function useCompositionDetails(compositionId, active2 = true) {
  const workbench = useWorkbench();
  return useQuery({
    ...createCompositionQueryOptions(workbench.structure, workbench.scopeKey).details(
      compositionId
    ),
    enabled: active2,
    staleTime: 3e4,
    queryFn: ({ signal }) => structureReadLimiter(workbench)(
      signal,
      () => workbench.structure.get(compositionId, { signal })
    )
  });
}

function useMemberResources(locations) {
  const workbench = useWorkbench();
  const batches = resourceBatches(locations);
  const options2 = createResourceQueryOptions(workbench.resources, workbench.scopeKey);
  const queries = useQueries({
    queries: batches.map((batch2) => ({
      ...options2.details(batch2),
      queryFn: ({ signal }) => structureReadLimiter(workbench)(
        signal,
        () => workbench.resources.getResources(batch2, { signal })
      )
    }))
  });
  const resources = /* @__PURE__ */ new Map();
  batches.forEach((batch2, index2) => {
    batch2.forEach((selector2, position2) => {
      const query = queries[index2];
      resources.set(selector2.resourceId, {
        result: query.data?.[position2],
        loading: query.isPending,
        failed: query.isError,
        retry: () => {
          void query.refetch();
        }
      });
    });
  });
  return new Map(
    locations.map((location2) => [
      resourceLocationKey(location2),
      resources.get(location2.resourceId)
    ])
  );
}

function historyOptions(workbench, resourceId2) {
  const filters = { resourceId: resourceId2, includeDeleted: false, limit: 20 };
  return infiniteQueryOptions({
    queryKey: [...resourceQueryKeys.versions(workbench.scopeKey, filters), "infinite"],
    initialPageParam: void 0,
    queryFn: ({ pageParam, signal }) => workbench.resources.listResourceVersions({ ...filters, cursor: pageParam }, { signal }),
    getNextPageParam: (page2) => page2.nextCursor,
    retry: false,
    refetchOnWindowFocus: false
  });
}

function useCompositionMembers(compositionId, memberId) {
  const workbench = useWorkbench();
  return useInfiniteQuery({
    ...createProjectQueryOptions(workbench.queries, workbench.scopeKey).members({
      compositionId,
      ...memberId ? { memberId } : {},
      limit: 20,
      resolveResources: false
    }),
    // Every explicit locate remount verifies the candidate, even if this key is cached.
    ...memberId ? { refetchOnMount: "always" } : {}
  });
}

function createViewStore(workbench) {
  const listeners2 = /* @__PURE__ */ new Set();
  const initial = {
    type: "",
    layout: "list",
    openCompositions: /* @__PURE__ */ new Set(),
    managingCompositions: /* @__PURE__ */ new Set(),
    expanded: /* @__PURE__ */ new Set(),
    searchKind: "compositions",
    directorySearchDraft: "",
    directorySearchText: ""
  };
  let state2 = initial;
  let active2 = true;
  const unsubscribe = workbench.events.subscribe((event) => {
    if (event.type === "disposed") {
      active2 = false;
      state2 = initial;
      for (const listener of listeners2) listener();
      listeners2.clear();
      unsubscribe();
    }
  });
  return {
    get: () => state2,
    subscribe: (listener) => {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    patch(patch2) {
      if (!active2) return;
      state2 = { ...state2, ...patch2 };
      for (const listener of listeners2) listener();
    },
    expand(key2, open) {
      if (state2.expanded.has(key2) === open) return;
      const expanded = new Set(state2.expanded);
      if (open) expanded.add(key2);
      else expanded.delete(key2);
      this.patch({ expanded });
    },
    openComposition(id2, open = true) {
      const openCompositions = new Set(state2.openCompositions);
      if (open) openCompositions.add(id2);
      else openCompositions.delete(id2);
      this.patch({
        openCompositions,
        ...open ? { selected: id2, located: void 0, preview: void 0 } : {}
      });
    },
    manageComposition(id2, open = true) {
      const managingCompositions = new Set(state2.managingCompositions);
      if (open) managingCompositions.add(id2);
      else managingCompositions.delete(id2);
      this.patch({ managingCompositions });
    },
    removeComposition(id2) {
      const openCompositions = new Set(state2.openCompositions);
      openCompositions.delete(id2);
      const managingCompositions = new Set(state2.managingCompositions);
      managingCompositions.delete(id2);
      this.patch({
        openCompositions,
        managingCompositions,
        ...state2.selected === id2 ? { selected: void 0 } : {},
        ...state2.preview?.location.compositionId === id2 ? { preview: void 0 } : {},
        ...state2.located?.location.compositionId === id2 ? { located: void 0 } : {}
      });
    },
    locate(location2, revision2) {
      assertResourceLocation(workbench.scopeKey, location2);
      const expanded = new Set(state2.expanded);
      expanded.add(JSON.stringify([location2.compositionId, location2.memberId]));
      this.patch({
        selected: location2.compositionId,
        located: { location: location2, revision: revision2, requestId: crypto.randomUUID() },
        expanded,
        preview: void 0
      });
    }
  };
}

const stores$4 = /* @__PURE__ */ new WeakMap();

export function structureView(workbench) {
  let store = stores$4.get(workbench);
  if (!store) {
    store = createViewStore(workbench);
    stores$4.set(workbench, store);
  }
  return store;
}

function useStructureView() {
  const store = structureView(useWorkbench());
  const state2 = reactExports.useSyncExternalStore(store.subscribe, store.get, store.get);
  return { view: state2, views: store };
}

function CompositionEditFields({
  id: id2,
  draft,
  store,
  types: types2,
  disabled,
  onPick
}) {
  const { t: t2 } = useTranslation();
  const nameId = reactExports.useId();
  const workbench = useWorkbench();
  const { views } = useStructureView();
  const locations = draft.members.flatMap(
    (member2) => (member2.resource === null ? [] : [member2.resource]).map((resourceId2) => ({
      scopeKey: workbench.scopeKey,
      compositionId: id2,
      memberId: member2.memberId,
      resourceId: resourceId2
    }))
  );
  const resources = useMemberResources(locations);
  const changeMember = (memberId, change) => store.patch(id2, (next2) => {
    const member2 = next2.members.find((item) => item.memberId === memberId);
    if (member2) change(member2, next2);
  });
  const handleMoveMember = (memberId, offset2) => store.patch(id2, (next2) => {
    const index2 = next2.members.findIndex((member22) => member22.memberId === memberId);
    const target = index2 + offset2;
    if (index2 < 0 || target < 0 || target >= next2.members.length) return;
    const [member2] = next2.members.splice(index2, 1);
    next2.members.splice(target, 0, member2);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { disabled, className: "grid min-w-0 gap-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid gap-3", "aria-label": t2("structure.editBasic"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-medium", children: t2("structure.editBasic") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: nameId, className: "grid gap-1 text-muted-foreground", children: [
        t2("structure.name"),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input$4,
          {
            id: nameId,
            className: "text-foreground",
            required: true,
            value: draft.name,
            "aria-invalid": !draft.name.trim(),
            "data-action-ui-id": "composition-edit-name",
            onChange: (event) => store.patch(id2, (next2) => {
              next2.name = event.target.value;
            })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "grid gap-1 text-muted-foreground", children: [
        t2("structure.typeLabel"),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: `${selectClass} text-foreground`,
            value: draft.compositionType ?? "",
            "data-action-ui-id": "composition-edit-type",
            onChange: (event) => store.patch(id2, (next2) => {
              next2.compositionType = event.target.value || null;
            }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t2("structure.editUnclassified") }),
              draft.compositionType && !types2.some((type) => type.id === draft.compositionType) && /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: draft.compositionType, children: draft.compositionType }),
              types2.map((type) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: type.id, children: type.label }, type.id))
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid gap-3", "aria-label": t2("structure.editAttributes"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-medium", children: t2("structure.editAttributes") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            variant: "ghost",
            size: "sm",
            "data-action-ui-id": "composition-attribute-add",
            onClick: () => store.patch(id2, (next2) => {
              next2.attributes.push({ rowId: crypto.randomUUID(), key: "", value: "" });
            }),
            children: t2("structure.editAddAttribute")
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t2("structure.editAttributeHint") }),
      draft.attributes.map((attribute) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "grid min-w-0 gap-2 rounded-lg border border-border p-3",
          "data-action-ui-id": "composition-attribute-row",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input$4,
                {
                  "aria-label": t2("structure.editAttributeKey"),
                  value: attribute.key,
                  "aria-invalid": !attribute.key.trim() || attribute.key.includes("\0") || draft.attributes.filter((item) => item.key === attribute.key).length > 1,
                  onChange: (event) => store.patch(id2, (next2) => {
                    const row = next2.attributes.find((item) => item.rowId === attribute.rowId);
                    if (row) row.key = event.target.value;
                  })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  size: "sm",
                  "aria-label": `${t2("structure.editRemove")} ${attribute.key}`,
                  onClick: () => store.patch(id2, (next2) => {
                    next2.attributes = next2.attributes.filter(
                      (item) => item.rowId !== attribute.rowId
                    );
                  }),
                  children: t2("structure.editRemove")
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Textarea,
              {
                "aria-label": t2("structure.editAttributeValue"),
                value: attribute.value,
                onChange: (event) => store.patch(id2, (next2) => {
                  const row = next2.attributes.find((item) => item.rowId === attribute.rowId);
                  if (row) row.value = event.target.value;
                })
              }
            )
          ]
        },
        attribute.rowId
      ))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid gap-3", "aria-label": t2("structure.editGroups"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-medium", children: t2("structure.editGroups") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            variant: "ghost",
            size: "sm",
            "data-action-ui-id": "composition-member-add",
            onClick: () => store.addMember(id2),
            children: t2("structure.editAddGroup")
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t2("structure.editReferenceHint") }),
      draft.members.map((member2, index2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "section",
        {
          className: "grid min-w-0 gap-3 rounded-lg border border-border p-3",
          "data-member-id": member2.memberId,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input$4,
                {
                  className: "min-w-0 flex-1 basis-40",
                  "aria-label": t2("structure.editGroupName"),
                  value: member2.role,
                  onChange: (event) => changeMember(member2.memberId, (next2) => {
                    next2.role = event.target.value;
                  })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto flex shrink-0 items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button$3,
                  {
                    variant: "ghost",
                    size: "sm",
                    disabled: index2 === 0,
                    "data-action-ui-id": "composition-member-move-earlier",
                    onClick: () => handleMoveMember(member2.memberId, -1),
                    children: t2("structure.editEarlier")
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button$3,
                  {
                    variant: "ghost",
                    size: "sm",
                    disabled: index2 === draft.members.length - 1,
                    "data-action-ui-id": "composition-member-move-later",
                    onClick: () => handleMoveMember(member2.memberId, 1),
                    children: t2("structure.editLater")
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button$3,
                  {
                    variant: "ghost",
                    size: "sm",
                    onClick: () => store.patch(id2, (next2) => {
                      next2.members = next2.members.filter(
                        (item) => item.memberId !== member2.memberId
                      );
                    }),
                    children: t2("structure.editRemoveGroup")
                  }
                )
              ] })
            ] }),
            (member2.resource === null ? [] : [member2.resource]).map((resourceId2) => {
              const location2 = {
                scopeKey: workbench.scopeKey,
                compositionId: id2,
                memberId: member2.memberId,
                resourceId: resourceId2
              };
              const entry = resources.get(resourceLocationKey(location2));
              const detail2 = entry?.result?.ok ? entry.result.detail : void 0;
              const readable = detail2?.resource.lifecycle === "active";
              const name2 = detail2?.resource.name ?? resourceId2;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "flex min-w-0 items-start gap-2 rounded-lg bg-muted/40 p-2",
                  "data-resource-id": resourceId2,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button$3,
                      {
                        variant: "ghost",
                        className: "size-16 shrink-0 overflow-hidden rounded-lg p-0",
                        disabled: !readable,
                        "aria-label": t2("structure.editResourceNamed", { name: name2 }),
                        onClick: () => views.patch({ preview: { location: location2, editable: true } }),
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                          StructureMedia,
                          {
                            resourceId: resourceId2,
                            versionId: readable && detail2?.version?.status === "ready" ? detail2.version.versionId : void 0,
                            relativePath: detail2?.version?.relativePath,
                            kind: detail2?.resource.kind ?? 0,
                            name: name2,
                            className: "size-full"
                          }
                        )
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid min-w-0 flex-1 gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", title: name2, children: name2 }),
                      entry?.failed && /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", size: "sm", onClick: entry.retry, children: t2("structure.retry") }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button$3,
                          {
                            variant: "ghost",
                            size: "sm",
                            onClick: () => onPick(member2.memberId, resourceId2),
                            children: t2("structure.editReplace")
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Button$3,
                          {
                            variant: "ghost",
                            size: "sm",
                            onClick: () => changeMember(member2.memberId, (next2) => {
                              next2.resource = null;
                            }),
                            children: t2("structure.editRemove")
                          }
                        )
                      ] }),
                      draft.members.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "select",
                        {
                          className: selectClass,
                          "aria-label": t2("structure.editMoveTo"),
                          value: "",
                          onChange: (event) => {
                            const destination = event.target.value;
                            changeMember(member2.memberId, (next2, all2) => {
                              const target = all2.members.find(
                                (item) => item.memberId === destination
                              );
                              if (!target || target.memberId === member2.memberId || target.resource !== null && target.resource !== resourceId2)
                                return;
                              target.resource = resourceId2;
                              next2.resource = null;
                            });
                          },
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t2("structure.editMoveTo") }),
                            draft.members.filter(
                              (item) => item.memberId !== member2.memberId && (item.resource === null || item.resource === resourceId2)
                            ).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: item.memberId, children: item.role || t2("structure.unnamedMember") }, item.memberId))
                          ]
                        }
                      )
                    ] })
                  ]
                },
                resourceId2
              );
            }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                variant: "outline",
                size: "sm",
                "data-action-ui-id": "composition-reference-add",
                disabled: member2.resource !== null,
                onClick: () => onPick(member2.memberId),
                children: t2("structure.editAddResources")
              }
            )
          ]
        },
        member2.memberId
      ))
    ] })
  ] });
}

function formInput(draft) {
  return { ...draft, attributes: draft.attributes.map(({ key: key2, value }) => ({ key: key2, value })) };
}

function form(input) {
  return {
    ...structuredClone(input),
    attributes: input.attributes.map((item) => ({ ...item, rowId: crypto.randomUUID() }))
  };
}

function belongsTo(envelope, id2) {
  return "compositionId" in envelope.command && envelope.command.compositionId === id2;
}

class CompositionEditStore {
  constructor(workbench) {
    this.workbench = workbench;
    this.persistence = workbench.persistence.createEntry({
      discardDraft: () => {
        for (const id2 of this.states.keys()) this.discard(id2);
      },
      recover: async () => {
        for (const id2 of this.states.keys()) await this.recover(id2);
      }
    });
    const unsubscribe = workbench.events.subscribe((event) => {
      if (event.type !== "disposed") return;
      this.active = false;
      this.states.clear();
      for (const listener of this.listeners) listener();
      this.listeners.clear();
      unsubscribe();
    });
  }
  workbench;
  states = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  active = true;
  persistence;
  get = (id2) => this.states.get(id2) ?? empty;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  set(id2, state2) {
    if (!this.active) return;
    this.states.set(id2, state2);
    const values2 = [...this.states.values()];
    this.persistence.update(
      values2.some((item) => item.result?.status === "unknown") ? "failed" : values2.some((item) => item.busy) ? "saving" : values2.some((item) => item.dirty) ? "dirty" : "clean"
    );
    for (const listener of this.listeners) listener();
  }
  frozen(id2) {
    const s2 = this.get(id2);
    return !this.active || s2.busy || s2.result?.status === "unknown";
  }
  discard(id2) {
    if (!this.frozen(id2)) this.set(id2, empty);
  }
  async open(id2) {
    if (this.frozen(id2) || this.get(id2).draft) return;
    await this.load(id2);
  }
  async load(id2, review = false) {
    if (this.frozen(id2)) return;
    const state2 = this.get(id2);
    this.set(id2, { ...state2, busy: true, error: void 0 });
    try {
      const baseline = await this.workbench.structure.get(id2);
      if (review) this.set(id2, { ...state2, latest: baseline, busy: false, error: void 0 });
      else this.set(id2, { ...empty, baseline, draft: form(compositionEditInput(baseline)) });
    } catch {
      this.set(id2, { ...state2, busy: false, error: "read" });
    }
  }
  patch(id2, change) {
    const state2 = this.get(id2);
    if (this.frozen(id2) || !state2.draft || !state2.baseline || state2.latest || state2.result?.status === "conflict")
      return;
    const draft = structuredClone(state2.draft);
    change(draft);
    this.set(id2, {
      ...state2,
      draft,
      error: void 0,
      result: void 0,
      dirty: compositionEditInputDiffers(formInput(draft), state2.baseline)
    });
  }
  addMember(id2) {
    const state2 = this.get(id2);
    if (!state2.baseline || this.frozen(id2)) return;
    const envelope = buildMemberAdd(
      { scopeKey: this.workbench.scopeKey, commandId: crypto.randomUUID() },
      createCompositionEditBaseline(this.workbench.scopeKey, state2.baseline),
      { resource: null }
    );
    if (envelope.command.type !== "composition.apply") return;
    const operation2 = envelope.command.operations[0];
    if (operation2?.type === "member.add")
      this.patch(id2, (draft) => draft.members.push(operation2.member));
  }
  resolve(id2, keepMine) {
    const state2 = this.get(id2);
    if (this.frozen(id2) || !state2.latest || !state2.baseline || !state2.draft) return;
    try {
      if (keepMine && state2.latest.lifecycle !== "active") return;
      const input = keepMine ? rebaseCompositionEdit(
        this.workbench.scopeKey,
        state2.baseline,
        formInput(state2.draft),
        state2.latest
      ) : compositionEditInput(state2.latest);
      this.set(id2, {
        ...empty,
        saved: state2.saved,
        total: state2.total,
        baseline: state2.latest,
        draft: form(input),
        dirty: compositionEditInputDiffers(input, state2.latest)
      });
    } catch {
      this.set(id2, { ...state2, error: "targetMissing" });
    }
  }
  async run(id2, envelope, recovery = false) {
    const state2 = this.get(id2);
    this.set(id2, { ...state2, busy: true, pending: envelope });
    const result = recovery && state2.result?.status === "unknown" ? await state2.result.recovery.recover() : await this.workbench.structure.commands.submit(envelope);
    if (!this.active) return false;
    if (result.status !== "committed" || !("revision" in result.receipt) || !state2.baseline) {
      this.set(id2, { ...this.get(id2), busy: false, result });
      return false;
    }
    const baseline = applyCompositionEditReceipt(state2.baseline, envelope, result.receipt.revision);
    this.set(id2, {
      ...this.get(id2),
      baseline,
      saved: state2.saved + 1,
      pending: void 0,
      result: void 0,
      dirty: Boolean(state2.draft && compositionEditInputDiffers(formInput(state2.draft), baseline))
    });
    return true;
  }
  hasOtherPending(id2) {
    return this.workbench.structure.commands.getSnapshot().pending.some((item) => belongsTo(item.recovery.envelope, id2));
  }
  async save(id2) {
    const state2 = this.get(id2);
    if (this.frozen(id2) || !state2.draft || !state2.baseline || state2.latest || state2.error === "read" || state2.result?.status === "conflict")
      return false;
    if (this.hasOtherPending(id2)) {
      this.set(id2, { ...state2, error: "pending" });
      return false;
    }
    let commands;
    try {
      commands = buildCompositionEditCommands(
        { scopeKey: this.workbench.scopeKey, commandId: crypto.randomUUID() },
        createCompositionEditBaseline(this.workbench.scopeKey, state2.baseline),
        formInput(state2.draft)
      );
    } catch {
      this.set(id2, { ...state2, error: "invalid" });
      return false;
    }
    this.set(id2, {
      ...state2,
      busy: true,
      result: void 0,
      error: void 0,
      operation: "edit",
      saved: 0,
      total: commands.length
    });
    for (let index2 = 0; index2 < commands.length; index2++) {
      const planned = commands[index2];
      const current2 = this.get(id2).baseline;
      if (!this.active || !current2) return false;
      if (await this.run(id2, { ...planned, expectedRevision: current2.revision })) continue;
      const result = this.get(id2).result;
      const next2 = commands[index2 + 1];
      if (index2 !== 0 || planned.command.type !== CompositionCommandType.RENAME || next2?.command.type !== CompositionCommandType.SET_TYPE || result?.status !== "rejected" || !(result.error instanceof ProjectCompositionHttpError) || result.error.code !== "COMPOSITION_NAME_CONFLICT")
        return false;
      commands.splice(index2, 2, next2, { ...planned, commandId: crypto.randomUUID() });
      this.set(id2, { ...this.get(id2), busy: true, result: void 0 });
      index2--;
    }
    this.set(id2, { ...this.get(id2), busy: false, dirty: false });
    return true;
  }
  async recover(id2) {
    const state2 = this.get(id2);
    if (!this.active || state2.busy) return;
    if (state2.result?.status === "unknown" && state2.pending) {
      if (await this.run(id2, state2.pending, true)) this.set(id2, { ...this.get(id2), busy: false });
    } else if (state2.error === "pending") {
      this.set(id2, { ...state2, busy: true });
      try {
        for (const entry of this.workbench.structure.commands.getPending())
          if (belongsTo(entry.envelope, id2)) await entry.recover();
      } finally {
        this.set(id2, { ...state2, busy: false });
      }
      if (!this.hasOtherPending(id2)) await this.load(id2, true);
    }
  }
  async lifecycle(id2, restore) {
    const state2 = this.get(id2);
    if (this.frozen(id2) || !state2.baseline || state2.dirty || state2.latest || state2.result?.status === "conflict")
      return;
    if (this.hasOtherPending(id2)) {
      this.set(id2, { ...state2, error: "pending" });
      return;
    }
    const context = { scopeKey: this.workbench.scopeKey, commandId: crypto.randomUUID() };
    const envelope = restore ? {
      commandId: context.commandId,
      actor: ProjectActor.HUMAN,
      expectedRevision: state2.baseline.revision,
      command: { type: CompositionCommandType.RESTORE, compositionId: id2 }
    } : buildCompositionDelete(
      context,
      createCompositionEditBaseline(context.scopeKey, state2.baseline)
    );
    if (restore && state2.baseline.lifecycle !== CompositionLifecycle.DELETED) return;
    this.set(id2, {
      ...state2,
      operation: restore ? "restore" : "delete",
      saved: 0,
      total: 1,
      error: void 0
    });
    if (await this.run(id2, envelope)) this.set(id2, { ...this.get(id2), busy: false });
  }
}

const stores$3 = /* @__PURE__ */ new WeakMap();

function compositionEditor(workbench) {
  let store = stores$3.get(workbench);
  if (!store) {
    store = new CompositionEditStore(workbench);
    stores$3.set(workbench, store);
  }
  return store;
}

function useCompositionEditor(id2) {
  const store = compositionEditor(useWorkbench());
  const state2 = reactExports.useSyncExternalStore(
    store.subscribe,
    () => store.get(id2),
    () => store.get(id2)
  );
  return { store, state: state2 };
}

function PageState({
  input,
  density = "page",
  children: children2
}) {
  const { t: t2 } = useTranslation();
  const dark = reactExports.useSyncExternalStore(subscribeTheme, getDark, getServerDark);
  const online = reactExports.useSyncExternalStore(subscribeOnline, getOnline, getServerOnline);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageStateView,
    {
      state: resolvePageState(input, t2("structure.retry"), online),
      density,
      labels: {
        emptyText: t2("structure.pageEmpty"),
        errorText: t2("structure.loadError"),
        networkErrorText: t2("structure.networkError")
      },
      renderIllustration: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(PageStateIllustration, { ...props, theme: dark ? "dark" : "light" }),
      children: children2
    }
  );
}

function CompositionResourcePicker({
  linked,
  replacing,
  onChoose,
  onClose
}) {
  const { t: t2 } = useTranslation();
  const workbench = useWorkbench();
  const [text2, setText] = reactExports.useState("");
  const [kind2, setKind] = reactExports.useState("");
  const [selected2, setSelected] = reactExports.useState(null);
  const search2 = {
    text: text2.trim(),
    kind: kind2 ? [Number(kind2)] : COMPOSITION_RESOURCE_KINDS,
    limit: 30
  };
  const query = useInfiniteQuery({
    queryKey: [...resourceQueryKeys.search(workbench.scopeKey, search2), "composition-edit-picker"],
    initialPageParam: void 0,
    queryFn: ({ pageParam, signal }) => workbench.resources.search({ ...search2, cursor: pageParam }, { signal }),
    getNextPageParam: (page2) => page2.nextCursor
  });
  const items = [
    ...new Map(
      query.data?.pages.flatMap((page2) => page2.items).filter(
        (item) => item.lifecycle === "active" && COMPOSITION_RESOURCE_KINDS.includes(item.kind)
      ).map((item) => [item.resourceId, item])
    ).values()
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "flex min-h-0 flex-1 flex-col gap-3",
      "aria-label": t2("structure.editSelectResources"),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-medium", children: t2("structure.editSelectResources") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", onClick: onClose, children: t2("structure.editBack") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input$4,
          {
            "aria-label": t2("structure.editResourceSearch"),
            placeholder: t2("structure.editResourceSearch"),
            value: text2,
            onChange: (event) => setText(event.target.value),
            "data-action-ui-id": "composition-picker-search"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: selectClass,
            "aria-label": t2("structure.editResourceKind"),
            value: kind2,
            onChange: (event) => setKind(event.target.value),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: t2("structure.editAllResources") }),
              [
                [ProjectResourceKind.IMAGE, "editImage"],
                [ProjectResourceKind.VIDEO, "editVideo"],
                [ProjectResourceKind.AUDIO, "editAudio"],
                [ProjectResourceKind.TEXT_DOCUMENT, "editDocument"]
              ].map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value, children: t2(`structure.${label}`) }, value))
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 flex-1 overflow-y-auto", children: [
          query.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }) : query.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            PageState,
            {
              density: "panel",
              input: { type: "error", text: t2("structure.loadError"), retry: () => query.refetch() }
            }
          ) : !items.length ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            PageState,
            {
              density: "panel",
              input: { type: "empty", text: t2("structure.editNoResources") }
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-3", children: items.map((resource2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button$3,
            {
              type: "button",
              variant: "outline",
              className: "h-auto min-w-0 flex-col items-stretch gap-2 p-2",
              "aria-label": resource2.name,
              "aria-pressed": selected2 === resource2.resourceId,
              disabled: linked === resource2.resourceId,
              "data-action-ui-id": "composition-picker-resource",
              onClick: () => setSelected(
                (current2) => current2 === resource2.resourceId ? null : resource2.resourceId
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "aspect-square overflow-hidden rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  StructureMedia,
                  {
                    resourceId: resource2.resourceId,
                    versionId: resource2.currentVersionId ?? void 0,
                    kind: resource2.kind,
                    name: resource2.name,
                    className: "size-full"
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-xs", children: resource2.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-h-4 text-xs text-muted-foreground", children: linked === resource2.resourceId ? t2("structure.editorAlreadyLinked") : selected2 === resource2.resourceId ? t2("structure.editSelected") : "" })
              ]
            },
            resource2.resourceId
          )) }),
          query.hasNextPage && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              className: "mt-3",
              variant: "outline",
              disabled: query.isFetching,
              onClick: () => void query.fetchNextPage(),
              children: t2("structure.more")
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            disabled: selected2 === null,
            onClick: () => {
              if (selected2 !== null) onChoose(selected2);
            },
            "data-action-ui-id": "composition-picker-confirm",
            children: t2(replacing ? "structure.editConfirmReplace" : "structure.editConfirmResources", {
              count: selected2 === null ? 0 : 1
            })
          }
        )
      ]
    }
  );
}

function CompositionEditDialog({
  id: id2,
  types: types2,
  active: active2,
  deleteRequested,
  onClose
}) {
  const { t: t2 } = useTranslation();
  const { store, state: state2 } = useCompositionEditor(id2);
  const [confirm, setConfirm] = reactExports.useState();
  const [picker, setPicker] = reactExports.useState();
  const activeRef = reactExports.useRef(active2);
  activeRef.current = active2;
  const returnFocus = reactExports.useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null
  );
  reactExports.useEffect(() => {
    void store.open(id2);
  }, [id2, store]);
  const frozen2 = state2.busy || state2.result?.status === "unknown";
  const blocked = frozen2 || Boolean(state2.latest) || state2.result?.status === "conflict" || state2.error === "read" || state2.error === "pending";
  const deleted = state2.baseline?.lifecycle === "deleted";
  const handleClose = () => {
    if (state2.busy) return;
    if (picker) {
      setPicker(void 0);
      return;
    }
    if (state2.dirty || state2.result?.status === "unknown") setConfirm("discard");
    else {
      store.discard(id2);
      onClose();
    }
  };
  if (!active2) return null;
  const pickerMember = state2.draft?.members.find((member2) => member2.memberId === picker?.memberId);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog$4,
    {
      open: true,
      onOpenChange: (open) => {
        if (!open) handleClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DialogContent$5,
        {
          showCloseButton: false,
          size: "lg",
          finalFocus: () => activeRef.current && returnFocus.current?.isConnected ? returnFocus.current : false,
          className: "flex max-h-[calc(100dvh-4rem)] flex-col gap-0 overflow-hidden p-0",
          "data-action-ui-id": "composition-edit-dialog",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex shrink-0 items-start justify-between gap-3 border-b border-border p-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$4, { children: t2("structure.editComposition") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription$4, { className: "mt-1 truncate", children: state2.baseline?.name })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  size: "sm",
                  disabled: state2.busy,
                  "aria-label": t2("structure.editClose"),
                  onClick: handleClose,
                  children: t2("structure.editCloseButton")
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 text-sm", children: confirm ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "section",
              {
                className: "grid gap-4",
                "aria-label": t2(
                  confirm === "delete" ? "structure.editConfirmDelete" : "structure.editDiscardTitle"
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-medium", children: t2(
                    confirm === "delete" ? "structure.editConfirmDelete" : "structure.editDiscardTitle"
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t2(confirm === "delete" ? "structure.confirmDelete" : "structure.editDiscardHint") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", onClick: () => setConfirm(void 0), children: t2("structure.editContinue") }),
                  confirm === "discard" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", onClick: onClose, children: t2("structure.editKeepDraft") }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button$3,
                      {
                        variant: "destructive",
                        disabled: frozen2,
                        onClick: () => {
                          store.discard(id2);
                          onClose();
                        },
                        children: t2("structure.editDiscard")
                      }
                    )
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button$3,
                    {
                      variant: "destructive",
                      disabled: blocked,
                      onClick: async () => {
                        setConfirm(void 0);
                        await store.lifecycle(id2, false);
                      },
                      children: t2("structure.delete")
                    }
                  )
                ]
              }
            ) : picker && pickerMember ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              CompositionResourcePicker,
              {
                linked: pickerMember.resource,
                replacing: Boolean(picker.resourceId),
                onClose: () => setPicker(void 0),
                onChoose: (resourceId2) => {
                  if (blocked || deleted || !active2) return;
                  store.patch(id2, (draft) => {
                    const member2 = draft.members.find((item) => item.memberId === picker.memberId);
                    if (!member2) return;
                    if (member2.resource !== (picker.resourceId ?? null)) return;
                    member2.resource = resourceId2;
                  });
                  setPicker(void 0);
                }
              },
              `${picker.memberId}:${picker.resourceId ?? ""}`
            ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              state2.busy && !state2.draft && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }),
              deleteRequested && state2.dirty && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.editDeleteHint") }),
              state2.total > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-muted-foreground", children: t2("structure.editProgress", { saved: state2.saved, total: state2.total }) }),
              !state2.busy && state2.saved > 0 && state2.saved < state2.total && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.editPartial") }),
              state2.result && state2.result.status !== "committed" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", children: t2(`structure.${state2.result.status}`) }),
              state2.error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", children: t2(
                `structure.${{ read: "editReadFailed", invalid: "editInvalid", targetMissing: "editTargetMissing", pending: "editPending" }[state2.error]}`
              ) }),
              (state2.result?.status === "unknown" || state2.error === "pending") && /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { disabled: state2.busy, onClick: () => void store.recover(id2), children: t2("structure.recover") }),
              (state2.error === "read" || state2.result?.status === "conflict" || state2.result?.status === "rejected") && !state2.latest && /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  disabled: frozen2,
                  variant: "outline",
                  onClick: () => void store.load(id2, Boolean(state2.draft)),
                  children: t2("structure.reloadBaseline")
                }
              ),
              state2.latest && state2.baseline && state2.draft && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "section",
                {
                  className: "grid gap-3 rounded-lg border border-border p-3",
                  "aria-label": t2("structure.editorReviewTitle"),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t2("structure.editConflictHint") }),
                    [
                      ["editorOriginalValue", compositionEditInput(state2.baseline)],
                      ["editorLatestValue", compositionEditInput(state2.latest)],
                      ["editorDraftValue", formInput(state2.draft)]
                    ].map(([label, input]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { open: true, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer rounded-lg p-2 font-medium hover:bg-muted", children: t2(`structure.${label}`) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionEditSummary, { input, types: types2 })
                    ] }, label)),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", onClick: () => store.resolve(id2, false), children: t2("structure.editUseLatest") }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button$3,
                      {
                        disabled: state2.latest.lifecycle !== "active",
                        onClick: () => store.resolve(id2, true),
                        children: t2("structure.editKeepMine")
                      }
                    )
                  ]
                }
              ),
              deleted ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.editDeleted") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { disabled: blocked, onClick: () => void store.lifecycle(id2, true), children: t2("structure.editRestore") })
              ] }) : state2.draft && /* @__PURE__ */ jsxRuntimeExports.jsx(
                CompositionEditFields,
                {
                  id: id2,
                  draft: state2.draft,
                  store,
                  types: types2,
                  disabled: blocked,
                  onPick: (memberId, resourceId2) => setPicker({ memberId, resourceId: resourceId2 })
                }
              )
            ] }) }),
            !confirm && !picker && /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-popover p-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  className: "text-destructive",
                  disabled: blocked || state2.dirty || !state2.baseline || deleted,
                  title: state2.dirty ? t2("structure.editDeleteHint") : void 0,
                  onClick: () => setConfirm("delete"),
                  children: t2("structure.delete")
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", disabled: state2.busy, onClick: handleClose, children: t2("structure.cancel") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button$3,
                  {
                    disabled: blocked || !state2.dirty || deleted,
                    loading: state2.busy,
                    "data-action-ui-id": "composition-edit-save",
                    onClick: async () => {
                      if (await store.save(id2)) {
                        store.discard(id2);
                        onClose();
                      }
                    },
                    children: t2("structure.editSave")
                  }
                )
              ] })
            ] })
          ]
        }
      )
    }
  );
}

function CompositionEditSummary({
  input,
  types: types2
}) {
  const { t: t2 } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 pl-3 text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
      input.name,
      " ·",
      " ",
      types2.find((type) => type.id === input.compositionType)?.label ?? input.compositionType ?? t2("structure.editUnclassified")
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "grid gap-1", children: input.attributes.map(({ key: key2, value }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-muted-foreground", children: key2 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "whitespace-pre-wrap break-words", children: value })
    ] }, key2)) }),
    input.members.map((member2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: member2.role || t2("structure.unnamedMember") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "break-words text-muted-foreground", children: member2.resource ?? "" })
    ] }, member2.memberId))
  ] });
}




// 第 194 轮：Collapsible 的 data 属性和公开组件一致，直接写字面量。
const CollapsiblePanelDataAttributes = { open: "data-open", closed: "data-closed" };

const PANEL_OPEN_HOOK = {
  [CollapsiblePanelDataAttributes.open]: ""
};

const PANEL_CLOSED_HOOK = {
  [CollapsiblePanelDataAttributes.closed]: ""
};

const collapsibleOpenStateMapping = {
  open(value) {
    if (value) {
      return PANEL_OPEN_HOOK;
    }
    return PANEL_CLOSED_HOOK;
  }
};

const collapsibleStateAttributesMapping = {
  ...collapsibleOpenStateMapping,
  ...transitionStatusMapping
};


let AccordionRootDataAttributes = /* @__PURE__ */ (function(AccordionRootDataAttributes2) {
  AccordionRootDataAttributes2["disabled"] = "data-disabled";
  AccordionRootDataAttributes2["orientation"] = "data-orientation";
  return AccordionRootDataAttributes2;
})({});


let CollapsiblePanelCssVars = /* @__PURE__ */ (function(CollapsiblePanelCssVars2) {
  CollapsiblePanelCssVars2["collapsiblePanelHeight"] = "--collapsible-panel-height";
  CollapsiblePanelCssVars2["collapsiblePanelWidth"] = "--collapsible-panel-width";
  return CollapsiblePanelCssVars2;
})({});


function CompositionDeleteDialog({
  compositionId,
  compositionName,
  active: active2,
  onDeleted,
  onClose
}) {
  const { t: t2 } = useTranslation();
  const { store, state: state2 } = useStructureEditor(compositionId);
  const activeRef = reactExports.useRef(active2);
  activeRef.current = active2;
  const returnFocus = reactExports.useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null
  );
  const { result } = state2;
  const unknown2 = result?.status === "unknown";
  const blocked = state2.busy || unknown2 || result?.status === "conflict" || Boolean(state2.error) || !state2.baseline || state2.draft?.action !== "delete";
  const handleDeleted = () => {
    onClose();
    onDeleted();
  };
  const handleSubmit = async () => {
    if (blocked) return;
    await store.submit(compositionId);
    if (store.get(compositionId).result?.status === "committed") handleDeleted();
  };
  const handleRecover = async () => {
    if (result?.status !== "unknown") return;
    const command2 = result.recovery.envelope.command;
    const deleting = command2.type === "composition.set_lifecycle" && command2.lifecycle === "deleted";
    await store.recover(compositionId);
    const recovered = store.get(compositionId);
    if (deleting && recovered.result?.status === "committed") handleDeleted();
    else if (recovered.result?.status !== "unknown" && (!deleting || !recovered.draft)) {
      store.close(compositionId);
      await store.open(compositionId, editDraft("delete"));
    }
  };
  if (!active2) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogRoot, { open: true, onOpenChange: (open) => !open && !state2.busy && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogBackdrop, { className: "modal-mask fixed inset-0 z-50 bg-background/80" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      DialogPopup,
      {
        finalFocus: () => activeRef.current && returnFocus.current?.isConnected ? returnFocus.current : false,
        "data-action-ui-id": "structure-delete-dialog",
        className: "elevated-surface-border fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl bg-popover p-5 text-sm text-popover-foreground outline-none",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "pr-8 font-medium", children: t2("structure.delete") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription$3, { className: "break-words text-muted-foreground", children: compositionName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t2("structure.confirmDelete") }),
          state2.busy && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }),
          result && result.status !== "committed" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", children: t2(`structure.${result.status}`) }),
          state2.error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", children: t2("structure.loadError") }),
          (result?.status === "conflict" || result?.status === "rejected" || state2.error) && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              variant: "outline",
              disabled: state2.busy || unknown2,
              onClick: () => void store.reload(compositionId),
              children: t2("structure.reloadBaseline")
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap justify-end gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                variant: "outline",
                disabled: state2.busy,
                className: "min-w-20",
                onClick: () => {
                  store.close(compositionId);
                  onClose();
                },
                children: t2("structure.cancel")
              }
            ),
            unknown2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                "data-action-ui-id": "structure-recover",
                loading: state2.busy,
                onClick: () => void handleRecover(),
                children: t2("structure.recover")
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button$3,
              {
                variant: "destructive",
                className: "min-w-22",
                "data-action-ui-id": "structure-submit",
                disabled: blocked,
                loading: state2.busy,
                onClick: () => void handleSubmit(),
                children: t2("structure.save")
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DialogClose$1,
            {
              render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  size: "icon",
                  className: "absolute right-2 top-2 size-8 rounded-lg",
                  disabled: state2.busy,
                  "aria-label": t2("structure.closeDelete")
                }
              ),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$9, { "aria-hidden": "true", strokeWidth: 1.5, className: "size-4.5" })
            }
          )
        ]
      }
    )
  ] }) });
}

function CompositionAttributes({
  attributes: attributes2,
  className = "",
  layout: layout2 = "rows"
}) {
  if (!attributes2.length) return null;
  const wrap2 = layout2 === "wrap";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: `${wrap2 ? "flex flex-wrap" : "grid"} min-w-0 gap-2 text-sm ${className}`, children: attributes2.map(({ key: key2, value }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: wrap2 ? "flex min-w-0 max-w-full items-baseline gap-2 rounded-lg bg-muted/40 px-3 py-1.5" : "grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,3fr)] gap-3",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "dt",
          {
            className: `whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere] ${wrap2 ? "max-w-32 shrink-0 text-xs" : ""}`,
            children: key2
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "min-w-0 whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]", children: value })
      ]
    },
    key2
  )) });
}

function CompositionAttributeDetails({ id: id2, active: active2 }) {
  const { t: t2 } = useTranslation();
  const query = useCompositionDetails(id2, active2);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    query.data?.lifecycle === "active" && /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionAttributes, { attributes: query.data.attributes, layout: "wrap" }),
    query.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }),
    query.isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { role: "alert", className: "text-sm text-muted-foreground", children: [
      t2(query.data ? "structure.stale" : "structure.loadError"),
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button$3,
        {
          variant: "ghost",
          size: "sm",
          "data-action-ui-id": "composition-attributes-retry",
          disabled: query.isFetching,
          onClick: () => void query.refetch(),
          children: t2("structure.retry")
        }
      )
    ] })
  ] });
}

function compositionContentGroups(projection, _resources) {
  return projection.members.map((member2) => ({
    key: member2.id,
    name: member2.role,
    locations: projection.locations.filter((location2) => location2.memberId === member2.id)
  }));
}

function CompositionVideoPreview(props) {
  const { scopeKey } = useWorkbench();
  const src = useStructureVideoUrl(props);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    VideoBinding,
    {
      ...props,
      src
    },
    JSON.stringify([scopeKey, props.resourceId, props.versionId, props.relativePath])
  );
}

function ResourceHoverPreview(props) {
  const { scopeKey } = useWorkbench();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(HoverBinding, { ...props }, JSON.stringify([scopeKey, props.resourceId, props.versionId]));
}

function HoverBinding({ active: active2, children: children2, ...media2 }) {
  const [open, setOpen] = reactExports.useState(false);
  const visible2 = active2 && open;
  const isDocument2 = media2.kind === ProjectResourceKind.TEXT_DOCUMENT;
  reactExports.useEffect(() => {
    if (!active2) setOpen(false);
  }, [active2]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PreviewCard$2, { open: visible2, onOpenChange: (next2) => setOpen(active2 && next2), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PreviewCardTrigger$1, { render: children2, onClick: () => setOpen(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PreviewCardContent$1,
      {
        side: "top",
        align: "center",
        collisionPadding: 8,
        className: `w-72 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain p-2 ${isDocument2 ? "max-h-[min(18rem,70vh,var(--available-height,70vh))]" : "max-h-[min(70vh,var(--available-height,70vh))]"}`,
        "data-action-ui-id": "structure-resource-hover-preview",
        "aria-label": media2.name,
        children: visible2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          media2.kind === ProjectResourceKind.AUDIO ? /* @__PURE__ */ jsxRuntimeExports.jsx(StructureAudio, { ...media2, active: active2 }) : media2.kind === ProjectResourceKind.VIDEO ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-44 overflow-hidden rounded-lg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionVideoPreview, { ...media2 }) }) : isDocument2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(StructureDocumentPreview, { ...media2, active: active2, scroll: "parent" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(StructureMedia, { ...media2, frame: "natural", fit: "contain", className: "mx-auto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 truncate text-xs text-muted-foreground", title: media2.name, children: media2.name })
        ] })
      }
    )
  ] });
}

function CompositionContent({
  projection,
  resources,
  active: active2 = true
}) {
  const { t: t2 } = useTranslation();
  const groups = compositionContentGroups(projection);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-label": t2("structure.resourceStrip"), className: "min-w-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-w-0 flex-wrap items-start gap-2", children: groups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsx(MemberContent, { group, resources, active: active2 }, group.key)) }),
    !projection.members.length && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: t2("structure.directoryEmptyMembers") })
  ] });
}

function MemberContent({
  group,
  resources,
  active: active2
}) {
  const { t: t2 } = useTranslation();
  const { locations } = group;
  const name2 = group.name || t2("structure.unnamedMember");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "aria-label": name2,
      "data-member-id": group.key,
      className: "flex w-23 min-w-0 max-w-full shrink-0 flex-col gap-1.5 rounded-lg bg-muted/50 p-1.5 ring-1 ring-inset ring-border",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-20 flex-wrap gap-2", children: [
          locations.map((location2) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            ResourceContent,
            {
              location: location2,
              resources,
              active: active2
            },
            resourceLocationKey(location2)
          )),
          !locations.length && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              "data-slot": "composition-member-empty",
              className: "flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted/30 p-2 text-center text-xs leading-tight text-muted-foreground",
              children: t2("structure.directoryEmptyResources")
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "h3",
          {
            className: "flex w-0 min-w-full items-center justify-center gap-1 text-xs font-normal text-muted-foreground",
            title: name2,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: name2 })
          }
        )
      ]
    }
  );
}

function ResourceContent({
  location: location2,
  resources,
  active: active2
}) {
  const { t: t2 } = useTranslation();
  const { view: view2, views } = useStructureView();
  const key2 = resourceLocationKey(location2);
  const entry = resources.get(key2);
  const detail2 = entry?.result?.ok ? entry.result.detail : void 0;
  const resource2 = detail2?.resource;
  const readable = resource2?.lifecycle === "active";
  const version2 = readable && detail2?.version?.status === "ready" ? detail2.version : void 0;
  const resourceName = resource2?.name ?? location2.resourceId;
  const kind2 = resource2?.kind ?? 0;
  const supported = resource2 && COMPOSITION_RESOURCE_KINDS.includes(resource2.kind);
  const handleEdit = () => views.patch({ preview: { location: location2, editable: true } });
  const trigger = /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button$3,
    {
      variant: "ghost",
      "aria-label": t2("structure.editResourceNamed", { name: resourceName }),
      "aria-haspopup": "dialog",
      "data-action-ui-id": "structure-resource-edit",
      title: resourceName,
      disabled: !readable || !supported,
      onClick: handleEdit,
      className: "h-20 w-full overflow-hidden rounded-lg p-0",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        StructureMedia,
        {
          resourceId: location2.resourceId,
          versionId: version2?.versionId,
          relativePath: version2?.relativePath,
          kind: kind2,
          name: resourceName,
          className: "size-full"
        }
      )
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex size-20 shrink-0 flex-col", children: [
    version2 && resource2 && supported ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      ResourceHoverPreview,
      {
        resourceId: location2.resourceId,
        versionId: version2.versionId,
        relativePath: version2.relativePath,
        kind: resource2.kind,
        name: resourceName,
        active: active2 && !view2.preview,
        children: trigger
      }
    ) : trigger,
    entry?.loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "sr-only", children: t2("structure.resourceLoading") }) : entry?.failed ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        role: "alert",
        className: "absolute inset-x-0 bottom-0 rounded-lg bg-background/90 text-xs text-muted-foreground",
        children: [
          t2("structure.readFailed"),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", size: "sm", onClick: entry.retry, children: t2("structure.retry") })
        ]
      }
    ) : !readable ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        role: "status",
        className: "absolute inset-x-0 bottom-0 rounded-lg bg-background/90 text-xs text-muted-foreground",
        children: t2("structure.missing")
      }
    ) : !supported ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        role: "status",
        className: "absolute inset-x-0 bottom-0 rounded-lg bg-background/90 text-xs text-muted-foreground",
        children: t2("structure.previewUnavailable")
      }
    ) : !version2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        role: "status",
        className: "absolute inset-x-0 bottom-0 rounded-lg bg-background/90 text-xs text-muted-foreground",
        children: t2("structure.noVersion")
      }
    ) : null
  ] });
}

function DirectoryResourceVersions({
  location: location2,
  entry
}) {
  const workbench = useWorkbench();
  const { views } = useStructureView();
  const { t: t2, i18n } = useTranslation();
  const detail2 = entry?.result?.ok ? entry.result.detail : void 0;
  const name2 = detail2?.resource.name ?? location2.resourceId;
  const query = useInfiniteQuery({
    ...historyOptions(workbench, location2.resourceId),
    enabled: Boolean(detail2)
  });
  const byId = /* @__PURE__ */ new Map();
  for (const page2 of query.data?.pages ?? []) {
    for (const version2 of page2.items) byId.set(version2.versionId, version2);
  }
  const current2 = detail2?.version;
  if (current2?.status === "ready" && !byId.has(current2.versionId))
    byId.set(current2.versionId, current2);
  const versions = [...byId.values()].sort((left, right) => {
    if (left.createdAt !== right.createdAt) return left.createdAt < right.createdAt ? 1 : -1;
    if (left.versionId === right.versionId) return 0;
    return left.versionId < right.versionId ? 1 : -1;
  });
  const handleHistoryRetry = () => {
    if (query.isFetchNextPageError) void query.fetchNextPage();
    else void query.refetch();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid min-w-0 gap-0.5", "data-resource-location": resourceLocationKey(location2), children: [
    versions.map((version2) => {
      const createdAt = new Date(version2.createdAt);
      const timestamp2 = createdAt.toLocaleString(i18n.language);
      const label = t2("structure.previewVersionNamed", {
        name: name2,
        time: timestamp2,
        versionId: version2.versionId
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button$3,
        {
          variant: "ghost",
          className: "h-8 min-w-0 justify-start gap-1.5 px-1 text-left text-xs",
          "aria-label": label,
          title: label,
          "data-action-ui-id": "structure-version-preview",
          "data-version-id": version2.versionId,
          onClick: () => views.patch({ preview: { location: location2, versionId: version2.versionId } }),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              StructureMedia,
              {
                relativePath: version2.relativePath,
                resourceId: location2.resourceId,
                versionId: detail2?.resource.lifecycle === "active" && version2.status === "ready" ? version2.versionId : void 0,
                kind: detail2?.resource.kind ?? 0,
                name: name2,
                className: "size-5 shrink-0"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate", children: name2 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("time", { dateTime: version2.createdAt, className: "shrink-0 text-muted-foreground", children: createdAt.toLocaleString(i18n.language, {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            }) }),
            version2.versionId === detail2?.resource.currentVersionId && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: t2("structure.current") })
          ]
        },
        version2.versionId
      );
    }),
    !versions.length && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-8 min-w-0 items-center gap-1.5 px-1 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        StructureMedia,
        {
          resourceId: location2.resourceId,
          kind: detail2?.resource.kind ?? 0,
          name: name2,
          className: "size-5 shrink-0"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", title: name2, children: name2 })
    ] }),
    entry?.loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "px-1 text-xs text-muted-foreground", children: t2("structure.resourceLoading") }) : entry?.failed || !detail2 || detail2.resource.lifecycle !== "active" ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "px-1 text-xs text-muted-foreground", children: t2(
      entry?.failed ? detail2 ? "structure.stale" : "structure.readFailed" : "structure.missing"
    ) }) : null,
    entry?.failed && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "ghost",
        className: "h-7 justify-start px-1 text-xs",
        "data-action-ui-id": "structure-directory-resource-retry",
        onClick: entry.retry,
        children: t2("structure.retry")
      }
    ),
    detail2 && query.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "px-1 text-xs text-muted-foreground", children: t2("structure.loading") }),
    detail2 && query.isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-0.5 px-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "alert", className: "text-xs text-muted-foreground", children: t2(versions.length ? "structure.stale" : "structure.loadError") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button$3,
        {
          variant: "ghost",
          className: "h-7 justify-start px-0 text-xs",
          disabled: query.isFetching,
          "data-action-ui-id": "structure-directory-versions-retry",
          onClick: handleHistoryRetry,
          children: t2("structure.retry")
        }
      )
    ] }),
    detail2 && !query.isPending && !query.isError && !versions.length && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-1 text-xs text-muted-foreground", children: t2("structure.noVersion") }),
    query.hasNextPage && !query.isFetchNextPageError && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "ghost",
        className: "h-7 justify-start px-1 text-xs",
        disabled: query.isFetching,
        "data-action-ui-id": "structure-directory-versions-more",
        onClick: () => void query.fetchNextPage(),
        children: t2("structure.more")
      }
    )
  ] });
}

function referenceDropDraft(source, target, members2) {
  if (source.scopeKey !== target.scopeKey || source.compositionId !== target.compositionId || source.revision !== target.revision)
    return;
  const origin2 = members2.find((member2) => member2.id === source.memberId);
  const destination = members2.find((member2) => member2.id === target.memberId);
  if (!origin2 || !destination || origin2.id === destination.id || origin2.resource?.resourceId !== source.resourceId || source.resource !== source.resourceId || destination.resource !== null && destination.resource.resourceId !== source.resourceId || target.before !== void 0 && destination.resource?.resourceId !== target.before)
    return;
  return {
    action: "move",
    memberId: origin2.id,
    resourceId: source.resourceId,
    destination: destination.id,
    referenceBaselines: [
      { memberId: origin2.id, resource: origin2.resource.resourceId },
      { memberId: destination.id, resource: destination.resource?.resourceId ?? null }
    ]
  };
}

function createPreviewOwner() {
  const owners2 = /* @__PURE__ */ new Set();
  const listeners2 = /* @__PURE__ */ new Set();
  const notify2 = () => {
    for (const listener of listeners2) listener();
  };
  return {
    current: () => owners2.values().next().value,
    subscribe(listener) {
      listeners2.add(listener);
      return () => {
        listeners2.delete(listener);
      };
    },
    register(id2) {
      owners2.add(id2);
      notify2();
      return () => {
        owners2.delete(id2);
        notify2();
      };
    }
  };
}

const previewOwners = /* @__PURE__ */ new WeakMap();

function usePreviewOwner(workbench, active2) {
  let owner = previewOwners.get(workbench);
  if (!owner) {
    owner = createPreviewOwner();
    previewOwners.set(workbench, owner);
  }
  const id2 = reactExports.useId();
  const current2 = reactExports.useSyncExternalStore(owner.subscribe, owner.current, owner.current);
  reactExports.useLayoutEffect(() => active2 ? owner.register(id2) : void 0, [id2, owner, active2]);
  return active2 && current2 === id2;
}

class ResourceEditStore {
  constructor(workbench) {
    this.workbench = workbench;
  }
  workbench;
  state = { isPending: false, awaitingReplay: false };
  envelope;
  listeners = /* @__PURE__ */ new Set();
  getSnapshot = () => this.state;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  update(state2) {
    this.state = state2;
    for (const listener of this.listeners) listener();
  }
  submit = (envelope) => {
    if (this.state.isPending || this.state.awaitingReplay) return false;
    this.envelope = structuredClone(envelope);
    void this.execute(false);
    return true;
  };
  replay = () => {
    if (!this.state.isPending && this.state.awaitingReplay) void this.execute(true);
  };
  reset = () => {
    if (this.state.isPending || this.state.awaitingReplay) return;
    this.envelope = void 0;
    this.update({ isPending: false, awaitingReplay: false });
  };
  async execute(recovering) {
    if (!this.envelope) return;
    this.update({ ...this.state, isPending: true });
    let outcome;
    try {
      outcome = toCommandOutcome(
        await this.workbench.resources.execute(structuredClone(this.envelope))
      );
    } catch (error) {
      outcome = recovering ? { status: "unknown", error } : toCommandFailureOutcome(error);
    }
    this.update({ isPending: false, awaitingReplay: !acceptsNewIntent(outcome), outcome });
  }
}

const stores$2 = /* @__PURE__ */ new WeakMap();

function useResourceEdit(resourceId2) {
  const workbench = useWorkbench();
  let resources = stores$2.get(workbench);
  if (!resources) {
    resources = /* @__PURE__ */ new Map();
    stores$2.set(workbench, resources);
  }
  let store = resources.get(resourceId2);
  if (!store) {
    store = new ResourceEditStore(workbench);
    resources.set(resourceId2, store);
  }
  const state2 = reactExports.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state2, submit: store.submit, replay: store.replay, reset: store.reset };
}

function ResourceVersionPicker({
  detail: detail2,
  disabled,
  onSelect
}) {
  const workbench = useWorkbench();
  const { t: t2, i18n } = useTranslation();
  const history2 = useInfiniteQuery(historyOptions(workbench, detail2.resource.resourceId));
  const versions = [
    ...new Map(
      [
        ...detail2.version ? [detail2.version] : [],
        ...history2.data?.pages.flatMap((page2) => page2.items) ?? []
      ].map((version2) => [version2.versionId, version2])
    ).values()
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-label": t2("structure.history"), className: "mt-4 grid gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: t2("structure.history") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 overflow-x-auto pb-2", children: versions.filter((version2) => version2.status === "ready").map((version2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button$3,
      {
        variant: "outline",
        disabled,
        "aria-pressed": detail2.version?.versionId === version2.versionId,
        "aria-label": t2("structure.selectVersionNamed", { versionId: version2.versionId }),
        "data-action-ui-id": "structure-resource-select-version",
        className: "h-auto w-28 shrink-0 flex-col gap-1 p-2 aria-pressed:border-foreground",
        onClick: () => onSelect(version2.versionId),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StructureMedia,
            {
              resourceId: detail2.resource.resourceId,
              versionId: version2.versionId,
              relativePath: version2.relativePath,
              kind: detail2.resource.kind,
              name: detail2.resource.name,
              className: "w-full"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: new Date(version2.createdAt).toLocaleDateString(i18n.language) }),
          version2.versionId === detail2.resource.currentVersionId && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: t2("structure.current") })
        ]
      },
      version2.versionId
    )) }),
    history2.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }),
    history2.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", disabled, onClick: () => void history2.refetch(), children: t2("structure.retry") }),
    history2.hasNextPage && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "outline",
        disabled: disabled || history2.isFetching,
        onClick: () => void history2.fetchNextPage(),
        children: t2("structure.more")
      }
    )
  ] });
}

function VersionHistory({
  location: location2,
  currentVersionId
}) {
  const workbench = useWorkbench();
  const { t: t2 } = useTranslation();
  const { views } = useStructureView();
  const query = useInfiniteQuery(historyOptions(workbench, location2.resourceId));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-label": t2("structure.history"), className: "grid gap-2 pl-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "outline",
        className: "justify-start",
        onClick: () => views.patch({ preview: { location: location2 } }),
        children: t2("structure.followingCurrent")
      }
    ),
    query.isPending && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }),
    query.isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { role: "alert", children: [
      t2(query.data ? "structure.stale" : "structure.loadError"),
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", onClick: () => void query.refetch(), children: t2("structure.retry") })
    ] }),
    query.data?.pages.flatMap((page2) => page2.items).map((version2) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "ghost",
        className: "h-auto min-w-0 max-w-full justify-start whitespace-normal text-left",
        "data-action-ui-id": "structure-version-preview",
        onClick: () => views.patch({ preview: { location: location2, versionId: version2.versionId } }),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 break-all", children: [
          new Date(version2.createdAt).toLocaleString(),
          " · ",
          version2.versionId,
          " ",
          version2.versionId === currentVersionId ? ` · ${t2("structure.current")}` : ""
        ] })
      },
      version2.versionId
    )),
    query.hasNextPage && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        variant: "outline",
        disabled: query.isFetching,
        onClick: () => void query.fetchNextPage(),
        children: t2("structure.more")
      }
    )
  ] });
}

function ResourcePreview$1({
  location: location2,
  versionId,
  active: active2 = true,
  editable: editable2 = false
}) {
  const workbench = useWorkbench();
  const { t: t2 } = useTranslation();
  const { views } = useStructureView();
  const command2 = useResourceEdit(location2.resourceId);
  const locked = command2.isPending || command2.awaitingReplay;
  const ownsPreview = usePreviewOwner(workbench, active2);
  const activeRef = reactExports.useRef(active2);
  activeRef.current = active2;
  const returnFocus = reactExports.useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null
  );
  const selector2 = toResourceSelector(
    workbench.scopeKey,
    { kind: "resource", scopeKey: workbench.scopeKey, resourceId: location2.resourceId, location: location2 },
    versionId ? { kind: "version", versionId } : { kind: "current" }
  );
  const query = useQuery(
    createResourceQueryOptions(workbench.resources, workbench.scopeKey).details([selector2])
  );
  const result = query.data?.[0];
  const detail2 = result?.ok ? result.detail : void 0;
  if (!ownsPreview) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DialogRoot,
    {
      open: true,
      onOpenChange: (open) => {
        if (!open && !locked) views.patch({ preview: void 0 });
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogBackdrop, { className: "modal-mask fixed inset-0 z-50 bg-background/80" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DialogPopup,
          {
            finalFocus: () => activeRef.current && returnFocus.current?.isConnected ? returnFocus.current : false,
            className: "fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-border bg-popover p-6 text-popover-foreground outline-none sm:max-w-4xl",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pr-8", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "break-words text-base font-medium", children: detail2?.resource.name ?? t2("structure.preview") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription$3, { className: "mt-1 text-sm text-muted-foreground", children: [
                  t2(versionId ? "structure.pinned" : "structure.followingCurrent"),
                  " ·",
                  " ",
                  t2("structure.pinNotice")
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                DialogClose$1,
                {
                  render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button$3,
                    {
                      variant: "ghost",
                      disabled: locked,
                      size: "icon",
                      className: "absolute right-2 top-2 size-8 rounded-lg",
                      "aria-label": t2("structure.closePreview"),
                      "data-action-ui-id": "structure-preview-close"
                    }
                  ),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$9, { "aria-hidden": "true", strokeWidth: 1.5, className: "size-4" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "min-h-0 overflow-y-auto", "aria-label": t2("structure.preview"), children: query.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }) : !detail2 || detail2.resource.lifecycle !== "active" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { role: "alert", className: "grid justify-items-start gap-3 text-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: t2(
                  detail2 || result && !result.ok ? "structure.missing" : "structure.loadError"
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button$3,
                  {
                    variant: "outline",
                    "data-action-ui-id": "structure-preview-read-retry",
                    onClick: () => void query.refetch(),
                    children: t2("structure.retry")
                  }
                )
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                query.isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { role: "alert", className: "mb-3 text-sm text-muted-foreground", children: [
                  t2("structure.stale"),
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button$3,
                    {
                      variant: "ghost",
                      "data-action-ui-id": "structure-preview-read-retry",
                      onClick: () => void query.refetch(),
                      children: t2("structure.retry")
                    }
                  )
                ] }),
                detail2.resource.kind === 1 && detail2.version?.status === "ready" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  StructureDocumentPreview,
                  {
                    resourceId: detail2.resource.resourceId,
                    versionId: detail2.version.versionId,
                    active: active2
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                  StructureMediaDetail,
                  {
                    resourceId: detail2.resource.resourceId,
                    relativePath: detail2?.version?.relativePath,
                    versionId: detail2.version?.status === "ready" ? detail2.version.versionId : void 0,
                    kind: detail2.resource.kind,
                    name: detail2.resource.name,
                    className: "h-[55vh] w-full"
                  }
                ),
                editable2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    ResourceVersionPicker,
                    {
                      detail: detail2,
                      disabled: locked,
                      onSelect: (selected2) => {
                        if (!locked) {
                          command2.reset();
                          views.patch({
                            preview: { location: location2, versionId: selected2, editable: true }
                          });
                        }
                      }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: t2("structure.adoptVersionNotice") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button$3,
                    {
                      className: "mt-3",
                      "data-action-ui-id": "structure-resource-adopt-version",
                      disabled: locked || query.isFetching || query.isError || !detail2.version || !detail2.resource.currentVersionId || detail2.version.versionId === detail2.resource.currentVersionId || command2.outcome?.status === "conflict",
                      onClick: () => {
                        if (!detail2.version || !detail2.resource.currentVersionId || locked) return;
                        command2.submit({
                          commandId: crypto.randomUUID(),
                          actor: ProjectActor.HUMAN,
                          command: {
                            type: ProjectResourceCommandType.UPDATE,
                            resourceId: detail2.resource.resourceId,
                            payload: {
                              kind: ProjectResourceUpdateKind.CURRENT_VERSION,
                              versionId: detail2.version.versionId,
                              expectedCurrentVersionId: detail2.resource.currentVersionId
                            }
                          }
                        });
                      },
                      children: t2(command2.isPending ? "structure.saving" : "structure.adoptVersion")
                    }
                  ),
                  command2.outcome && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      className: "mt-2 text-sm",
                      role: command2.outcome.status === "committed" ? "status" : "alert",
                      children: t2(
                        `structure.${command2.outcome.status === "committed" ? "saved" : command2.outcome.status === "conflict" ? "conflict" : command2.awaitingReplay ? "unknown" : "rejected"}`
                      )
                    }
                  ),
                  command2.awaitingReplay && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button$3,
                    {
                      variant: "outline",
                      disabled: command2.isPending,
                      onClick: command2.replay,
                      children: t2("structure.recover")
                    }
                  ),
                  command2.outcome?.status === "conflict" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button$3,
                    {
                      variant: "outline",
                      disabled: query.isFetching,
                      onClick: async () => {
                        const refreshed = await query.refetch();
                        if (!refreshed.isError) command2.reset();
                      },
                      children: t2("structure.refresh")
                    }
                  )
                ] }),
                detail2.version ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-xs text-muted-foreground", children: [
                  t2("structure.createdAt"),
                  " ·",
                  " ",
                  new Date(detail2.version.createdAt).toLocaleString()
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-sm text-muted-foreground", children: t2("structure.noVersion") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "mt-4 text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "cursor-pointer rounded-lg py-2 text-muted-foreground focus-visible:outline focus-visible:outline-foreground", children: t2("structure.versionDetails") }),
                  detail2.version && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 break-all", children: [
                    t2("structure.versionId"),
                    " · ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: detail2.version.versionId }),
                    detail2.version.versionId === detail2.resource.currentVersionId ? ` · ${t2("structure.current")}` : ""
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "mt-3 font-medium", children: t2("structure.dependencies") }),
                  detail2.dependencies.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 grid gap-1 break-all", children: detail2.dependencies.map((dependency) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                    dependency.resourceId,
                    " · ",
                    dependency.versionId,
                    " · ",
                    dependency.role
                  ] }, JSON.stringify(dependency))) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-muted-foreground", children: t2("structure.noDependencies") })
                ] })
              ] }) })
            ]
          }
        )
      ] })
    }
  );
}

function ActionMenu({
  children: children2,
  disabled = false
}) {
  const { t: t2 } = useTranslation();
  const menu = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const element2 = menu.current;
    if (!element2) return;
    const dismissOutside = (event) => {
      if (event.target instanceof Node && !element2.contains(event.target)) element2.open = false;
    };
    const doc2 = element2.ownerDocument;
    doc2.addEventListener("pointerdown", dismissOutside, true);
    doc2.addEventListener("focusin", dismissOutside, true);
    return () => {
      doc2.removeEventListener("pointerdown", dismissOutside, true);
      doc2.removeEventListener("focusin", dismissOutside, true);
    };
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "details",
    {
      ref: menu,
      className: "relative shrink-0",
      onBlur: (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      },
      onClick: (event) => {
        if (event.target instanceof Element && event.target.closest("button:not(:disabled)")) {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      },
      onKeyDown: (event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-foreground [&::-webkit-details-marker]:hidden", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis$1, { "aria-hidden": true, strokeWidth: 1.5, className: "size-4" }),
          t2("structure.actions")
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "fieldset",
          {
            disabled,
            className: "absolute right-0 top-full z-20 grid min-w-max gap-1 rounded-lg border border-border bg-card p-1 shadow-sm [&_button]:h-8 [&_button]:justify-start [&_button]:text-xs",
            children: children2
          }
        )
      ]
    }
  );
}

function CompositionTree$1({
  id: id2,
  types: types2,
  onDeleted,
  embedded = false,
  compact: compact2 = false,
  showResourceStrip = false,
  active: active2 = true,
  readOnly: readOnly2 = false
}) {
  const workbench = useWorkbench();
  const cache2 = useQueryClient();
  const { t: t2 } = useTranslation();
  const { view: view2, views } = useStructureView();
  const located = !embedded && !showResourceStrip && view2.located?.location.compositionId === id2 ? view2.located : void 0;
  const query = useCompositionMembers(id2, located?.location.memberId);
  const projection = memberProjection(workbench.scopeKey, query.data?.pages ?? []);
  const resources = useMemberResources(projection.locations);
  const { state: state2, store } = useStructureEditor(id2);
  const managing = !showResourceStrip;
  const snapshot2 = query.data?.pages[0];
  const target = reactExports.useRef(null);
  const drag2 = reactExports.useRef(void 0);
  const hintId = reactExports.useId();
  const [dropTarget, setDropTarget] = reactExports.useState();
  const [dragMessage, setDragMessage] = reactExports.useState();
  reactExports.useEffect(() => {
    if (drag2.current?.compositionId !== id2 || drag2.current?.scopeKey !== workbench.scopeKey) {
      drag2.current = void 0;
      setDropTarget(void 0);
      setDragMessage(void 0);
    }
  }, [id2, workbench]);
  const locationFound = Boolean(
    located && snapshot2?.lifecycle === "active" && projection.locations.some(
      (location2) => resourceLocationKey(location2) === resourceLocationKey(located.location)
    )
  );
  reactExports.useEffect(() => {
    if (located && locationFound && !query.isFetching && !query.isError) {
      target.current?.focus({ preventScroll: true });
      target.current?.scrollIntoView?.({ block: "nearest" });
    }
  }, [located, locationFound, query.isFetching, query.isError]);
  const returnToTree = located && /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button$3,
    {
      variant: "outline",
      onClick: () => {
        void restartCompositionMembers(cache2, workbench.scopeKey, id2);
        views.patch({ located: void 0 });
      },
      children: t2("structure.fullTree")
    }
  );
  const disabled = readOnly2 || showResourceStrip || !workbench.structure.available || Boolean(state2.draft) || state2.busy || state2.result?.status === "unknown" || snapshot2?.lifecycle === "deleted";
  const handleEdit = (action2, values2 = {}) => {
    if (readOnly2 || showResourceStrip) return;
    void store.open(id2, editDraft(action2, values2));
  };
  const dragDisabled = disabled || query.isFetching || query.isError || Boolean(query.data?.pages.some((page2) => page2.coverage.status !== "complete"));
  const handleDragEnd = () => {
    drag2.current = void 0;
    setDropTarget(void 0);
  };
  const getDropDraft = (memberId, before) => {
    if (dragDisabled || !drag2.current || !snapshot2) return;
    return referenceDropDraft(
      drag2.current,
      {
        scopeKey: workbench.scopeKey,
        compositionId: id2,
        revision: snapshot2.revision,
        memberId,
        before
      },
      projection.members
    );
  };
  const handleDragOver = (event, memberId, before) => {
    event.stopPropagation();
    if (!getDropDraft(memberId, before)) {
      setDropTarget(void 0);
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    setDropTarget({ memberId, before });
  };
  const handleDrop2 = (event, memberId, before) => {
    if (readOnly2 || showResourceStrip) return;
    event.stopPropagation();
    if (!drag2.current) return;
    event.preventDefault();
    const draft = getDropDraft(memberId, before);
    handleDragEnd();
    if (!draft?.action) {
      setDragMessage(t2("structure.dragChanged"));
      return;
    }
    setDragMessage(void 0);
    views.expand(JSON.stringify([id2, memberId]), true);
    handleEdit(draft.action, draft);
  };
  const handleRetry = () => restartCompositionMembers(cache2, workbench.scopeKey, id2);
  if (query.isPending)
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3", children: [
      showResourceStrip ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { role: "status", className: "flex min-h-20 gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: t2("structure.loading") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", className: "size-20 shrink-0 rounded-lg bg-muted/30" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", className: "size-20 shrink-0 rounded-lg bg-muted/30" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }),
      returnToTree
    ] });
  if (!snapshot2)
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        PageState,
        {
          density: "panel",
          input: {
            type: "error",
            text: t2(
              located && query.error instanceof ProjectQueryError && query.error.code === "NOT_FOUND" ? "structure.locationGone" : "structure.loadError"
            ),
            retry: handleRetry
          }
        }
      ),
      returnToTree
    ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "aria-label": snapshot2.name,
      className: `grid min-w-0 content-start ${compact2 ? "gap-1" : "gap-3"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "header",
          {
            className: !readOnly2 && managing ? "flex flex-wrap items-center justify-between gap-2" : "sr-only",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: embedded ? "sr-only" : "break-words text-sm font-medium", children: snapshot2.name }),
                !readOnly2 && managing && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
                  !embedded && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    types2.find((type) => type.id === snapshot2.type)?.label ?? snapshot2.type,
                    " · "
                  ] }),
                  t2(
                    located ? "structure.locatedReferenceCount" : projection.complete ? "structure.referenceCount" : "structure.knownReferences",
                    {
                      count: projection.referenceCount
                    }
                  )
                ] })
              ] }),
              !readOnly2 && managing && /* @__PURE__ */ jsxRuntimeExports.jsx(ActionMenu, { disabled, children: ["rename", "type", "attribute", "add-member", "delete"].map((action2) => /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", onClick: () => handleEdit(action2), children: t2(`structure.${action2}`) }, action2)) })
            ]
          }
        ),
        located && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "section",
          {
            className: "grid gap-2 rounded-lg border border-border bg-muted/40 p-3",
            "aria-label": t2("structure.locationResult"),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "break-all text-sm", children: [
                snapshot2.name,
                " /",
                " ",
                projection.members.find((member2) => member2.id === located.location.memberId)?.role || located.location.memberId,
                " ",
                "/ ",
                located.location.resourceId
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t2("structure.locatedMemberOnly") }),
              query.isFetching ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.verifyingLocation") }) : query.isError ? null : !locationFound ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2(
                projection.complete || snapshot2.lifecycle === "deleted" ? "structure.locationGone" : "structure.locationUnconfirmed"
              ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2(
                snapshot2.revision !== located.revision ? "structure.locationUpdated" : "structure.locationVerified"
              ) }),
              returnToTree
            ]
          }
        ),
        !readOnly2 && !compact2 && !showResourceStrip && snapshot2.attributes.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "whitespace-pre-wrap break-words text-sm leading-relaxed", children: snapshot2.attributes.description }),
        !readOnly2 && showResourceStrip && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          snapshot2.lifecycle === "active" && /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionAttributeDetails, { id: id2, active: active2 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CompositionContent, { projection, resources, active: active2 })
        ] }),
        snapshot2.lifecycle === "deleted" && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.deleted") }),
        query.isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { role: "alert", className: "text-sm", children: [
          t2("structure.stale"),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", disabled: query.isFetching, onClick: () => void handleRetry(), children: t2(isCursorStaleError(query.error) ? "structure.restart" : "structure.retry") })
        ] }),
        query.data?.pages.some((page2) => page2.coverage.status === "partial") && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-sm text-muted-foreground", children: t2("structure.partial") }),
        (readOnly2 || managing) && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          !readOnly2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            EditorPanel,
            {
              id: id2,
              types: types2,
              compact: compact2,
              onCommitted: (_id, action2) => {
                if (action2 === "delete") onDeleted();
              }
            }
          ),
          !readOnly2 && workbench.structure.available && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { id: hintId, className: compact2 ? "sr-only" : "text-xs text-muted-foreground", children: t2("structure.dragHint") }),
          !readOnly2 && dragMessage && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-xs text-muted-foreground", children: dragMessage }),
          !projection.members.length && (compact2 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-2 text-xs text-muted-foreground", children: t2(readOnly2 ? "structure.directoryEmptyMembers" : "structure.emptyMembers") }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            PageState,
            {
              density: "panel",
              input: { type: "empty", text: t2("structure.emptyMembers") }
            }
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "grid min-w-0 gap-1", "aria-label": t2("structure.members"), children: projection.members.map((member2) => {
            const memberKey = JSON.stringify([id2, member2.id]);
            const open = view2.expanded.has(memberKey);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "details",
              {
                open,
                onToggle: (event) => views.expand(memberKey, event.currentTarget.open),
                className: "relative min-w-0 rounded-lg",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "summary",
                    {
                      className: `min-h-8 cursor-pointer break-words rounded-lg px-2 py-1.5 text-xs hover:bg-muted ${open && !readOnly2 ? "pr-20" : ""} ${dropTarget?.memberId === member2.id && dropTarget.before === void 0 ? "bg-muted ring-1 ring-foreground" : ""}`,
                      "data-member-drop": readOnly2 ? void 0 : member2.id,
                      onDragOver: readOnly2 ? void 0 : (event) => handleDragOver(event, member2.id),
                      onDrop: readOnly2 ? void 0 : (event) => handleDrop2(event, member2.id),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Folder$1,
                          {
                            "aria-hidden": true,
                            strokeWidth: 1.5,
                            className: "mr-1 inline-block size-4 align-text-bottom text-muted-foreground"
                          }
                        ),
                        member2.role || t2("structure.unnamedMember"),
                        " ",
                        !readOnly2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                          "· ",
                          member2.resource ? 1 : 0
                        ] }),
                        dropTarget?.memberId === member2.id && dropTarget.before === void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-muted-foreground", children: t2(
                          drag2.current?.memberId === member2.id ? "structure.dropAtEnd" : "structure.dropMove",
                          { name: member2.role || t2("structure.unnamedMember") }
                        ) })
                      ]
                    }
                  ),
                  open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-4 grid min-w-0 gap-0.5 border-l border-border pl-2", children: [
                    !readOnly2 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-0 top-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ActionMenu, { disabled, children: ["member-role", "add-reference", "remove-member"].map(
                      (action2) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button$3,
                        {
                          variant: "ghost",
                          disabled: action2 === "add-reference" && member2.resource !== null,
                          onClick: () => handleEdit(action2, { memberId: member2.id }),
                          children: t2(`structure.${action2}`)
                        },
                        action2
                      )
                    ) }) }),
                    !member2.resource && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 py-2 text-xs text-muted-foreground", children: t2(
                      readOnly2 ? "structure.directoryEmptyResources" : "structure.emptyMemberDrop"
                    ) }),
                    (member2.resource ? [member2.resource] : []).map(({ resourceId: resourceId2 }) => {
                      const location2 = {
                        scopeKey: workbench.scopeKey,
                        compositionId: id2,
                        memberId: member2.id,
                        resourceId: resourceId2
                      };
                      const key2 = resourceLocationKey(location2);
                      const entry = resources.get(key2);
                      const highlighted = located && key2 === resourceLocationKey(located.location) && !query.isFetching && !query.isError && locationFound;
                      if (readOnly2)
                        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "fieldset",
                          {
                            ref: highlighted ? target : void 0,
                            tabIndex: highlighted ? -1 : void 0,
                            "aria-current": highlighted ? "location" : void 0,
                            "data-resource-location": key2,
                            className: `min-w-0 rounded-lg ${highlighted ? "bg-muted ring-2 ring-foreground" : ""}`,
                            children: [
                              highlighted && /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { className: "text-xs font-medium", children: t2("structure.locatedHere") }),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(DirectoryResourceVersions, { location: location2, entry })
                            ]
                          },
                          key2
                        );
                      const detail2 = entry?.result?.ok ? entry.result.detail : void 0;
                      const name2 = detail2?.resource.name ?? resourceId2;
                      const Icon2 = [FileText$1, Image$2, Video$3, Music$3][(detail2?.resource.kind ?? 1) - 1] ?? FileText$1;
                      const historyOpen = view2.expanded.has(key2);
                      const referenceBaselines = [
                        {
                          memberId: member2.id,
                          resource: member2.resource?.resourceId ?? null
                        }
                      ];
                      const handleMove = () => handleEdit("move", {
                        memberId: member2.id,
                        resourceId: resourceId2,
                        referenceBaselines
                      });
                      const dropHere = dropTarget?.memberId === member2.id && dropTarget.before === resourceId2;
                      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "fieldset",
                        {
                          "aria-label": name2,
                          ref: highlighted ? target : void 0,
                          tabIndex: highlighted ? -1 : void 0,
                          "aria-current": highlighted ? "location" : void 0,
                          className: `grid min-w-0 rounded-lg px-1 ${highlighted ? "bg-muted ring-2 ring-foreground" : "hover:bg-muted/40"} ${dropHere ? "border-t-2 border-foreground" : "border-t-2 border-transparent"}`,
                          "data-resource-location": key2,
                          onDragOver: readOnly2 ? void 0 : (event) => handleDragOver(event, member2.id, resourceId2),
                          onDrop: readOnly2 ? void 0 : (event) => handleDrop2(event, member2.id, resourceId2),
                          children: [
                            dropHere && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-2 text-xs text-muted-foreground", children: t2(
                              drag2.current?.memberId === member2.id ? "structure.dropBefore" : "structure.dropMove",
                              {
                                name: drag2.current?.memberId === member2.id ? name2 : member2.role || t2("structure.unnamedMember")
                              }
                            ) }),
                            highlighted && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium", children: t2("structure.locatedHere") }),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-8 min-w-0 items-center gap-1", children: [
                              !readOnly2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Button$3,
                                {
                                  variant: "ghost",
                                  size: "icon",
                                  className: "h-8 w-6 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing",
                                  "aria-label": t2("structure.dragReference", { name: name2 }),
                                  "aria-describedby": hintId,
                                  title: t2("structure.dragReference", { name: name2 }),
                                  disabled: dragDisabled,
                                  draggable: !dragDisabled,
                                  onClick: handleMove,
                                  onDragStart: (event) => {
                                    event.stopPropagation();
                                    if (dragDisabled) {
                                      event.preventDefault();
                                      return;
                                    }
                                    drag2.current = {
                                      ...location2,
                                      revision: snapshot2.revision,
                                      resource: resourceId2
                                    };
                                    setDropTarget(void 0);
                                    setDragMessage(void 0);
                                    if (event.dataTransfer)
                                      event.dataTransfer.effectAllowed = "move";
                                  },
                                  onDragEnd: handleDragEnd,
                                  onKeyDown: (event) => {
                                    if (event.key === "Escape") handleDragEnd();
                                  },
                                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(GripVertical, { "aria-hidden": true, strokeWidth: 1.5, className: "size-3" })
                                }
                              ),
                              compact2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                                StructureMedia,
                                {
                                  resourceId: resourceId2,
                                  relativePath: detail2?.version?.relativePath,
                                  versionId: detail2?.version?.status === "ready" ? detail2.version.versionId : void 0,
                                  kind: detail2?.resource.kind ?? 0,
                                  name: name2,
                                  className: "size-5 shrink-0"
                                }
                              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                                Icon2,
                                {
                                  strokeWidth: 1.5,
                                  className: "size-4 shrink-0 text-muted-foreground"
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Button$3,
                                  {
                                    variant: "ghost",
                                    className: "h-8 w-full min-w-0 justify-start px-1 text-left text-xs",
                                    disabled: !detail2,
                                    onClick: () => views.patch({ preview: { location: location2 } }),
                                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", title: name2, children: name2 })
                                  }
                                ),
                                entry?.loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs", children: t2("structure.resourceLoading") }) : (entry?.failed || !detail2 || detail2.resource.lifecycle !== "active") && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: t2(
                                  entry?.failed ? detail2 ? "structure.stale" : "structure.readFailed" : "structure.missing"
                                ) }),
                                entry?.failed && /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", onClick: entry.retry, children: t2("structure.retry") })
                              ] }),
                              !readOnly2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionMenu, { disabled, children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", onClick: handleMove, children: t2("structure.move") }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  Button$3,
                                  {
                                    variant: "ghost",
                                    onClick: () => handleEdit("remove-reference", {
                                      memberId: member2.id,
                                      resourceId: resourceId2
                                    }),
                                    children: t2("structure.remove-reference")
                                  }
                                )
                              ] })
                            ] }),
                            detail2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              "details",
                              {
                                className: `${readOnly2 ? "ml-5" : "ml-8"} border-l border-border pl-2`,
                                open: historyOpen,
                                onToggle: (event) => views.expand(key2, event.currentTarget.open),
                                children: [
                                  /* @__PURE__ */ jsxRuntimeExports.jsx("summary", { className: "min-h-7 cursor-pointer rounded px-1 py-1 text-xs text-muted-foreground hover:bg-muted", children: t2("structure.history") }),
                                  historyOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    VersionHistory,
                                    {
                                      location: location2,
                                      currentVersionId: detail2.resource.currentVersionId
                                    }
                                  )
                                ]
                              }
                            )
                          ]
                        },
                        key2
                      );
                    })
                  ] })
                ]
              },
              member2.id
            );
          }) })
        ] }),
        query.hasNextPage && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            variant: "outline",
            disabled: query.isFetching || isCursorStaleError(query.error),
            onClick: () => void query.fetchNextPage(),
            children: t2("structure.more")
          }
        )
      ]
    }
  );
}

function CompositionRow$1({
  item,
  types: types2,
  onDeleted,
  presentation,
  active: active2
}) {
  const { t: t2, i18n } = useTranslation();
  const workbench = useWorkbench();
  const { view: view2, views } = useStructureView();
  const [confirmingDelete, setConfirmingDelete] = reactExports.useState(false);
  const contentId = reactExports.useId();
  const isList2 = presentation === "list";
  const open = view2.openCompositions.has(item.id);
  const [hasOpened, setHasOpened] = reactExports.useState(open);
  reactExports.useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);
  const selected2 = view2.selected === item.id;
  const type = item.type === null ? t2("structure.editUnclassified") : types2.find((entry) => entry.id === item.type)?.label ?? item.type;
  const handleEdit = () => views.patch({ editingComposition: item.id, editingDeleteRequested: false, preview: void 0 });
  const handleOpen = () => {
    if (isList2) {
      views.openComposition(item.id, !open);
    } else {
      const openCompositions = new Set(view2.openCompositions);
      if (open) openCompositions.delete(item.id);
      else openCompositions.add(item.id);
      views.patch({ openCompositions });
    }
  };
  const row = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    CollapsibleRoot,
    {
      open,
      className: isList2 ? `@container/composition min-w-0 rounded-lg transition-colors duration-200 motion-reduce:transition-none ${open ? "border border-border bg-muted/20" : "border border-transparent"}` : "min-w-0",
      "data-composition-id": item.id,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group flex min-w-0 items-center gap-1 rounded-lg hover:bg-muted/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button$3,
            {
              variant: !isList2 && selected2 ? "secondary" : "ghost",
              "aria-label": t2("structure.open", { name: item.name }),
              "aria-expanded": open,
              "aria-controls": open ? contentId : void 0,
              "aria-pressed": !isList2 ? selected2 : void 0,
              "data-action-ui-id": "structure-open",
              className: `h-auto min-w-0 flex-1 justify-start gap-1 rounded-lg text-left ${isList2 ? "min-h-10 px-3 py-2" : "min-h-8 px-1 py-1"}`,
              onClick: handleOpen,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ChevronRight$2,
                  {
                    "aria-hidden": "true",
                    strokeWidth: 1.5,
                    className: `size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-90" : ""}`
                  }
                ),
                !isList2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Folder$1,
                  {
                    "aria-hidden": "true",
                    strokeWidth: 1.5,
                    className: "size-4 shrink-0 text-muted-foreground"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: `min-w-0 flex-1 truncate font-medium ${isList2 ? "text-sm" : "text-xs"}`,
                    title: item.name,
                    children: item.name
                  }
                ),
                isList2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "hidden shrink-0 items-center gap-3 text-xs font-normal text-muted-foreground @[32rem]/composition:flex", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: type }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("time", { dateTime: new Date(item.updatedAt).toISOString(), children: new Date(item.updatedAt).toLocaleString(i18n.language, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }) })
                ] })
              ]
            }
          ),
          isList2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              variant: "ghost",
              size: "icon",
              className: "mr-2 shrink-0 text-muted-foreground",
              onClick: handleEdit,
              disabled: !active2 || !workbench.structure.available,
              "aria-label": t2("structure.editCompositionNamed", { name: item.name }),
              title: t2("structure.editComposition"),
              "data-action-ui-id": "structure-composition-edit",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { "aria-hidden": "true", size: 16, strokeWidth: 1.25, absoluteStrokeWidth: true })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          CollapsiblePanel,
          {
            id: contentId,
            keepMounted: hasOpened,
            "aria-hidden": !open,
            inert: !open,
            className: "h-[var(--collapsible-panel-height)] overflow-hidden opacity-100 transition-[height,opacity] duration-200 ease-out data-[starting-style]:h-0 data-[starting-style]:opacity-0 data-[ending-style]:h-0 data-[ending-style]:opacity-0 motion-reduce:transition-none",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: isList2 ? "border-t border-border/60 px-4 py-3" : "ml-4 min-w-0 border-l border-border pl-2",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  CompositionTree$1,
                  {
                    embedded: true,
                    compact: !isList2,
                    readOnly: !isList2,
                    showResourceStrip: isList2,
                    active: active2 && open,
                    id: item.id,
                    types: types2,
                    onDeleted: () => onDeleted(item.id)
                  }
                )
              }
            )
          }
        ),
        isList2 && confirmingDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
          CompositionDeleteDialog,
          {
            active: active2,
            compositionId: item.id,
            compositionName: item.name,
            onDeleted: () => onDeleted(item.id),
            onClose: () => setConfirmingDelete(false)
          }
        )
      ]
    }
  );
  return isList2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    CompositionContextMenu,
    {
      id: item.id,
      active: active2,
      onEdit: handleEdit,
      onDelete: () => {
        const fullEditor = compositionEditor(workbench).get(item.id);
        if (fullEditor.dirty || fullEditor.busy || fullEditor.result?.status === "unknown") {
          views.patch({
            editingComposition: item.id,
            editingDeleteRequested: true,
            preview: void 0
          });
          return;
        }
        const editor2 = structureEditor(workbench);
        if (editor2.get(item.id).draft?.action !== "delete") editor2.close(item.id);
        void editor2.open(item.id, editDraft("delete"));
        setConfirmingDelete(true);
      },
      children: row
    }
  ) : row;
}

function CompositionList({
  items,
  types: types2,
  onDeleted,
  presentation = "list",
  active: active2 = true
}) {
  const { t: t2 } = useTranslation();
  const { view: view2, views } = useStructureView();
  const groups = [...new Set(items.map((item) => item.type))];
  if (presentation === "list") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid min-w-0 gap-1", children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      CompositionRow$1,
      {
        item,
        types: types2,
        onDeleted,
        presentation,
        active: active2
      },
      item.id
    )) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid min-w-0 gap-1", children: groups.map((type) => {
    const entries2 = items.filter((item) => item.type === type);
    const label = type === null ? t2("structure.editUnclassified") : types2.find((entry) => entry.id === type)?.label ?? type;
    const rows = /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid min-w-0 gap-1", children: entries2.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      CompositionRow$1,
      {
        item,
        types: types2,
        onDeleted,
        presentation,
        active: active2
      },
      item.id
    )) });
    const typeKey = JSON.stringify(["collapsed-type", type]);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "details",
      {
        className: "min-w-0",
        open: !view2.expanded.has(typeKey),
        onToggle: (event) => views.expand(typeKey, !event.currentTarget.open),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "min-h-8 cursor-pointer rounded-lg px-2 py-1.5 text-xs hover:bg-muted", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Folder$1,
              {
                "aria-hidden": "true",
                strokeWidth: 1.5,
                className: "mr-1 inline-block size-4 align-text-bottom text-muted-foreground"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "break-words", children: label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "ml-2 text-muted-foreground",
                title: t2("structure.loaded", { count: entries2.length }),
                children: entries2.length
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-4 min-w-0 border-l border-border pl-1", children: rows })
        ]
      },
      typeKey
    );
  }) });
}

function useResourceDetailRenderer() {
  return reactExports.useContext(ResourceDetailContext);
}

function SelectedResourceDialog({
  location: location2,
  versionId,
  editable: editable2 = false,
  active: active2 = true,
  onClose
}) {
  const render2 = useResourceDetailRenderer();
  const renderDialog = reactExports.useContext(ResourceDetailDialogContext);
  if (!render2 && !renderDialog) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ResourcePreview$1,
      {
        location: location2,
        versionId,
        editable: editable2,
        active: active2
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    HostSelectedResource,
    {
      render: render2,
      renderDialog,
      location: location2,
      active: active2,
      onClose
    }
  );
}

function HostSelectedResource({
  render: render2,
  renderDialog,
  location: location2,
  active: active2,
  onClose
}) {
  const workbench = useWorkbench();
  const ownsPreview = usePreviewOwner(workbench, active2);
  if (!ownsPreview) return null;
  if (renderDialog)
    return renderDialog({ resourceId: location2.resourceId, location: location2, active: active2, onClose });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(HostResourceDialog, { onClose, active: active2, children: render2?.({ resourceId: location2.resourceId, location: location2 }) });
}

function HostResourceDialog({
  active: active2,
  onClose,
  children: children2
}) {
  const { t: t2 } = useTranslation();
  const activeRef = reactExports.useRef(active2);
  activeRef.current = active2;
  const returnFocus = reactExports.useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DialogRoot, { open: true, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal$3, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogBackdrop, { className: "modal-mask fixed inset-0 z-50 bg-background/80" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      DialogPopup,
      {
        finalFocus: () => activeRef.current && returnFocus.current?.isConnected ? returnFocus.current : false,
        className: "fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground outline-none sm:max-w-3xl",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle$3, { className: "sr-only", children: t2("structure.previewPanel") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DialogClose$1,
            {
              render: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: "ghost",
                  size: "icon",
                  className: "absolute right-2 top-2 z-10 size-8 rounded-lg",
                  "aria-label": t2("structure.closePreview"),
                  "data-action-ui-id": "structure-detail-close"
                }
              ),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$9, { "aria-hidden": "true", strokeWidth: 1.5, className: "size-4" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "min-h-0 flex-1 overflow-y-auto", "aria-label": t2("structure.preview"), children: children2 })
        ]
      }
    )
  ] }) });
}

function compositionTypeFilterQuery(type) {
  return type === "" ? {} : { type };
}

function compositionTypeFilterOptions(types2, labels) {
  return [{ id: "", label: labels.all }, ...types2, { id: null, label: labels.other }];
}

function DirectorySearchControls({
  refreshing,
  onRefresh
}) {
  const { t: t2 } = useTranslation();
  const { view: view2, views } = useStructureView();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "form",
    {
      className: "flex min-w-0 items-center gap-1",
      "aria-label": t2("structure.directorySearch"),
      onSubmit: (event) => {
        event.preventDefault();
        views.patch({ directorySearchText: view2.directorySearchDraft.trim() });
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input$4,
            {
              className: "h-8 rounded-md border-transparent bg-muted pl-8 pr-8 text-xs focus-visible:border-border",
              "aria-label": t2("structure.directorySearch"),
              placeholder: t2("structure.directorySearch"),
              "data-action-ui-id": "structure-directory-search-input",
              value: view2.directorySearchDraft,
              onChange: (event) => views.patch({ directorySearchDraft: event.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              className: "absolute left-0 top-0 size-8 text-muted-foreground",
              type: "submit",
              size: "icon",
              variant: "ghost",
              "aria-label": t2("structure.search"),
              "data-action-ui-id": "structure-directory-search",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search$3, { "aria-hidden": true, strokeWidth: 1.5, className: "size-4" })
            }
          ),
          (view2.directorySearchDraft || view2.directorySearchText) && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button$3,
            {
              className: "absolute right-0 top-0 size-8 text-muted-foreground",
              type: "button",
              size: "icon",
              variant: "ghost",
              "aria-label": t2("structure.clearSearch"),
              "data-action-ui-id": "structure-directory-search-clear",
              onClick: () => views.patch({ directorySearchDraft: "", directorySearchText: "" }),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$9, { "aria-hidden": true, strokeWidth: 1.5, className: "size-4" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button$3,
          {
            type: "button",
            variant: "ghost",
            size: "icon",
            className: "size-8 shrink-0 text-muted-foreground",
            "aria-label": t2("structure.refresh"),
            "data-action-ui-id": "structure-directory-refresh",
            disabled: refreshing,
            onClick: onRefresh,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              RefreshCw,
              {
                "aria-hidden": true,
                strokeWidth: 1.5,
                className: `size-4 ${refreshing ? "animate-spin" : ""}`
              }
            )
          }
        )
      ]
    }
  );
}

function StructureContents({
  mode: mode2,
  className = "",
  active: active2 = true
}) {
  const workbench = useWorkbench();
  const { t: t2 } = useTranslation();
  const { view: view2, views } = useStructureView();
  const directory = mode2 === "directory";
  const searchKind = directory ? "compositions" : view2.searchKind;
  const searchText = directory ? view2.directorySearchText : "";
  const scrollRef = reactExports.useRef(null);
  const loadMoreRef = reactExports.useRef(null);
  const reads = createProjectQueryOptions(workbench.queries, workbench.scopeKey);
  const types2 = useQuery(reads.types());
  const list2 = useInfiniteQuery({
    ...reads.searchPages({
      ...!directory ? compositionTypeFilterQuery(view2.type) : {},
      ...searchText ? { text: searchText } : {},
      // Domain order: positioned Compositions first, then unordered ones oldest first.
      order: { by: "position", direction: "asc" },
      limit: 20
    }),
    enabled: searchKind === "compositions",
    // Keep the current rows (and decoded previews) until the next filter resolves.
    placeholderData: directory ? void 0 : keepPreviousData
  });
  const { fetchNextPage, hasNextPage: hasNextPage2, isFetching, isError } = list2;
  reactExports.useEffect(() => {
    if (directory || !active2 || searchKind !== "compositions" || !hasNextPage2 || isFetching || isError || typeof IntersectionObserver === "undefined")
      return;
    const root2 = scrollRef.current;
    const sentinel = loadMoreRef.current;
    if (!root2 || !sentinel) return;
    let disposed = false;
    const observer2 = new IntersectionObserver(
      (entries2) => {
        if (!disposed && entries2.some((entry) => entry.isIntersecting)) {
          void fetchNextPage({ cancelRefetch: false });
        }
      },
      { root: root2, rootMargin: "0px 0px 320px 0px" }
    );
    observer2.observe(sentinel);
    return () => {
      disposed = true;
      observer2.disconnect();
    };
  }, [directory, active2, searchKind, hasNextPage2, isFetching, isError, fetchNextPage]);
  const items = [
    ...new Map(
      list2.data?.pages.flatMap((page2) => page2.items).map((item) => [item.id, item])
    ).values()
  ];
  const searchComplete = Boolean(
    list2.data?.pages.length && list2.data.pages.at(-1)?.nextCursor === null && list2.data.pages.every((page2) => page2.coverage.status === "complete")
  );
  const typeItems = types2.data?.items ?? [];
  const showDetail = searchKind === "resources";
  const handleDeleted = (id2) => {
    views.removeComposition(id2);
  };
  const handleRefresh = () => {
    workbench.invalidateCompositions({ scopeKey: workbench.scopeKey });
    workbench.invalidateResources({ scopeKey: workbench.scopeKey });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `min-w-0 ${directory ? "grid content-start gap-2" : "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"} ${className}`,
      "data-action-ui-id": "structure-page",
      "data-structure-surface": mode2,
      children: [
        directory ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "sr-only", children: t2("structure.tree") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DirectorySearchControls, { refreshing: list2.isFetching, onRefresh: handleRefresh })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-sm font-medium", children: t2("structure.title") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: t2("structure.subtitle") })
        ] }) }),
        !directory && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "fieldset",
          {
            "aria-label": t2("structure.typeFilters"),
            className: "flex w-full min-w-0 max-w-full shrink-0 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain border-b border-border px-0.5 pt-0.5 pb-3",
            children: compositionTypeFilterOptions(typeItems, {
              all: t2("structure.allTypes"),
              other: t2("structure.editUnclassified")
            }).map((type) => {
              const selected2 = view2.type === type.id && view2.searchKind === "compositions";
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button$3,
                {
                  variant: selected2 ? "default" : "ghost",
                  size: "sm",
                  className: `shrink-0 rounded-lg border px-3 ${selected2 ? "border-foreground bg-foreground text-background hover:bg-foreground/90" : "border-transparent bg-transparent font-normal text-muted-foreground hover:bg-muted/50"}`,
                  "data-action-ui-id": "structure-type-filter",
                  "data-type-id": type.id ?? "",
                  "data-type-filter": type.id === null ? "other" : type.id === "" ? "all" : "registered",
                  "aria-pressed": selected2,
                  onClick: () => views.patch({
                    type: type.id,
                    searchKind: "compositions"
                  }),
                  children: type.label
                },
                JSON.stringify(type.id)
              );
            })
          }
        ),
        types2.isError && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { role: "alert", className: "text-sm", children: [
          t2("structure.typeError"),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "ghost", onClick: () => void types2.refetch(), children: t2("structure.retry") })
        ] }),
        searchKind === "compositions" && list2.isError && items.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { role: "alert", className: "text-sm", children: [
          t2("structure.stale"),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button$3, { variant: "outline", onClick: () => void list2.refetch(), children: t2("structure.retry") })
        ] }),
        searchKind === "compositions" && list2.data?.pages.some((page2) => page2.coverage.status === "partial") && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", className: "text-sm text-muted-foreground", children: t2("structure.partial") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            ref: scrollRef,
            "data-action-ui-id": !directory ? "structure-list-scroll" : void 0,
            className: `grid min-w-0 content-start items-start ${directory ? "gap-2" : "min-h-0 flex-1 gap-5 overflow-y-auto overscroll-y-contain"}`,
            children: [
              !showDetail && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "section",
                {
                  "aria-label": t2(directory ? "structure.directoryContents" : "structure.list"),
                  "aria-busy": list2.isFetching,
                  className: "min-w-0",
                  children: [
                    list2.isPending || list2.isPlaceholderData && !items.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { role: "status", children: t2("structure.loading") }) : !items.length ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      PageState,
                      {
                        density: "panel",
                        input: list2.isError ? { type: "error", text: t2("structure.loadError"), retry: () => list2.refetch() } : {
                          type: "empty",
                          text: t2(
                            !searchComplete ? "structure.searchIncomplete" : searchText || !directory && view2.type !== "" ? "structure.noSearchResults" : directory ? "structure.directoryEmpty" : "structure.empty"
                          )
                        }
                      }
                    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                      CompositionList,
                      {
                        items,
                        types: typeItems,
                        onDeleted: handleDeleted,
                        presentation: mode2,
                        active: active2
                      }
                    ),
                    list2.hasNextPage && !list2.isPlaceholderData && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: loadMoreRef, className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button$3,
                      {
                        variant: "outline",
                        "data-action-ui-id": "structure-load-more",
                        disabled: list2.isFetching,
                        onClick: () => void list2.fetchNextPage({ cancelRefetch: false }),
                        children: t2(list2.isFetchingNextPage ? "structure.loading" : "structure.more")
                      }
                    ) })
                  ]
                }
              ),
              showDetail && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid min-w-0 gap-3 rounded-lg border border-border p-4", children: view2.selected ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                CompositionTree$1,
                {
                  readOnly: true,
                  id: view2.selected,
                  types: typeItems,
                  onDeleted: () => view2.selected && handleDeleted(view2.selected)
                },
                `${view2.selected}:${view2.located?.requestId ?? "browse"}`
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(PageState, { density: "panel", input: { type: "empty", text: t2("structure.select") } }) })
            ]
          }
        ),
        view2.preview && /* @__PURE__ */ jsxRuntimeExports.jsx(
          SelectedResourceDialog,
          {
            location: view2.preview.location,
            versionId: view2.preview.versionId,
            editable: view2.preview.editable,
            active: active2,
            onClose: () => views.patch({ preview: void 0 })
          }
        ),
        !directory && view2.editingComposition && /* @__PURE__ */ jsxRuntimeExports.jsx(
          CompositionEditDialog,
          {
            id: view2.editingComposition,
            types: typeItems,
            deleteRequested: view2.editingDeleteRequested,
            active: active2 && !view2.preview,
            onClose: () => views.patch({ editingComposition: void 0, editingDeleteRequested: void 0 })
          },
          view2.editingComposition
        )
      ]
    }
  );
}

function StructureSurface(props) {
  const workbench = useWorkbench();
  const { t: t2 } = useTranslation();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ModuleErrorBoundary,
    {
      moduleId: "structure",
      fallback: ({ retry }) => /* @__PURE__ */ jsxRuntimeExports.jsx(PageState, { input: { type: "error", text: t2("structure.loadError"), retry } }),
      children: workbench.queries.available ? /* @__PURE__ */ jsxRuntimeExports.jsx(StructureContents, { ...props }) : /* @__PURE__ */ jsxRuntimeExports.jsx(PageState, { input: { type: "empty", text: t2("structure.unavailable") } })
    },
    workbench.scopeKey
  );
}

function StructureDirectory(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(StructureSurface, { ...props, mode: "directory" });
}
// ---- 第 192 轮：补取的 6 个小工具 + 2 个类（参考 402799 / 327503 / 400274 / 404064）----
function subscribeOnline(onChange) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const getDark = () => document.documentElement.classList.contains("dark");
const getOnline = () => navigator.onLine;
const getServerDark = () => false;
const getServerOnline = () => true;
function subscribeTheme(onChange) {
  const observer2 = new MutationObserver(onChange);
  observer2.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer2.disconnect();
}

// PageStateIllustration / resolvePageState 在产物里是从别的模块 import 的，
// 那两个模块还没还原；先给最小实现并显式标注，不要当成真实现。
function PageStateIllustration(props) {
  return jsxRuntimeExports.jsx("div", { "data-page-state-illustration": "true", ...props });
}
function resolvePageState(input, retryLabel, online) {
  if (input?.type === "error") return { kind: "error", text: input.text, retryLabel, online };
  return { kind: input?.type ?? "empty", text: input?.text, retryLabel, online };
}

class ProjectQueryError extends Error {
  constructor(status, code2, message2, retryable = false, traceId, details) {
    super(message2);
    this.status = status;
    this.code = code2;
    this.traceId = traceId;
    this.details = details;
    this.name = code2 === "ABORTED" ? "AbortError" : "ProjectQueryError";
    this.kind = classify(status, code2);
    this.retryable = retryable && (this.kind === "transient" || this.kind === "unavailable");
  }
  status;
  code;
  traceId;
  details;
  kind;
  retryable;
  static async fromResponse(response) {
    try {
      const { error } = parseProjectQueryErrorBody(await response.json());
      return new ProjectQueryError(
        response.status,
        error.code,
        error.message,
        error.retryable,
        error.traceId,
        error.details
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      return new ProjectQueryError(
        response.status,
        "PROJECT_QUERY_HTTP_ERROR",
        `Project Query request failed (${response.status})`,
        response.status === 408 || response.status === 429 || response.status >= 500
      );
    }
  }
}

function VideoBinding({ src, ...props }) {
  const { t: t2 } = useTranslation();
  const videoRef = reactExports.useRef(null);
  const [playing, setPlaying2] = reactExports.useState(false);
  const [ready2, setReady] = reactExports.useState(false);
  const [failed, setFailed] = reactExports.useState(false);
  const [lastGoodSrc, setLastGoodSrc] = reactExports.useState();
  const source = src ?? lastGoodSrc;
  reactExports.useEffect(() => {
    const video = videoRef.current;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") video?.pause();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      video?.pause();
    };
  }, []);
  const handleTogglePlayback = () => {
    const video = videoRef.current;
    if (!video || !source) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    setFailed(false);
    if (video.error) video.load();
    void video.play().catch(() => {
      if (videoRef.current !== video) return;
      setFailed(true);
      setPlaying2(false);
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative size-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StructureMedia, { ...props, kind: 3, thumbnailWidth: 112, compact: true, className: "size-full" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "video",
      {
        ref: videoRef,
        src: source,
        "aria-label": props.name,
        playsInline: true,
        preload: "none",
        className: `pointer-events-none absolute inset-0 size-full object-cover ${ready2 && !failed ? "" : "opacity-0"}`,
        "data-action-ui-id": "composition-preview-video",
        onLoadedData: () => {
          setReady(true);
          setLastGoodSrc(source);
        },
        onEmptied: () => setReady(false),
        onPlay: () => setPlaying2(true),
        onPause: () => setPlaying2(false),
        onEnded: () => setPlaying2(false),
        onError: () => {
          setFailed(true);
          setPlaying2(false);
        }
      }
    ),
    failed && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        role: "alert",
        className: "absolute inset-0 flex items-center justify-center bg-background/80 p-2 pb-9 text-center text-xs text-muted-foreground",
        children: t2("structure.mediaFailed")
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button$3,
      {
        type: "button",
        variant: "ghost",
        size: "icon",
        "aria-label": failed ? t2("structure.retry") : t2(playing ? "structure.mediaPauseNamed" : "structure.mediaPlayNamed", {
          name: props.name
        }),
        "aria-pressed": playing,
        disabled: !source,
        "data-action-ui-id": "composition-preview-video-toggle",
        className: "absolute bottom-1.5 right-1.5 size-6 rounded-full bg-background/90 p-0 text-foreground hover:bg-background [&_svg]:size-3",
        onClick: handleTogglePlayback,
        children: playing ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { "aria-hidden": "true", strokeWidth: 1.5, fill: "currentColor" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { "aria-hidden": "true", strokeWidth: 1.5, fill: "currentColor" })
      }
    )
  ] });
}

// ---- 第 193 轮：ProjectQueryError 的 6 个依赖 ----
function invalid$6(field) {
  throw new Error(`Invalid Project Query response: ${field}`);
}

function object$4(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid$6(field);
  return value;
}

function string$2(value, field) {
  if (typeof value !== "string") invalid$6(field);
  return value;
}

function id$6(value, field) {
  const result = string$2(value, field);
  if (!result.trim() || result.includes("\0")) invalid$6(field);
  return result;
}

function classify(status, code2) {
  if (code2 === "CURSOR_STALE") return "cursor_stale";
  if (code2 === "ABORTED") return "aborted";
  if (status === 401 || status === 403) return "auth";
  if (code2 === "INVALID_RESPONSE" || status === 400 || status === 422) return "invalid";
  if (code2 === "DEPENDENCY_UNAVAILABLE" || code2 === "QUERY_UNAVAILABLE" || code2 === "HOST_DISCONNECTED" || status === 503)
    return "unavailable";
  if (code2 === "NETWORK_ERROR" || status === 408 || status === 429 || status >= 500)
    return "transient";
  return "unknown";
}

function parseProjectQueryErrorBody(value) {
  const data2 = object$4(object$4(value, "body").error, "error");
  if (typeof data2.retryable !== "boolean") invalid$6("error.retryable");
  return {
    error: {
      code: id$6(data2.code, "error.code"),
      message: string$2(data2.message, "error.message"),
      retryable: data2.retryable,
      ...data2.traceId === void 0 ? {} : { traceId: id$6(data2.traceId, "error.traceId") },
      ...data2.details === void 0 ? {} : {
        details: array$3(data2.details, "error.details").map((value2) => {
          const item = object$4(value2, "error.detail");
          return {
            field: string$2(item.field, "error.detail.field"),
            reason: string$2(item.reason, "error.detail.reason")
          };
        })
      }
    }
  };
}

function array$3(value, field) {
  if (!Array.isArray(value)) invalid$6(field);
  return value;
}


function StructureList(props) {
  return jsxRuntimeExports.jsx(StructureSurface, { ...props, mode: "list" });
}

export {
  ModuleErrorBoundary,
  StructureContents,
  StructureSurface,
  StructureDirectory,
  StructureList,
  // 第 309 轮：CompositionMentionTag 的依赖。这些**本来就在本文件里**，
  // 只是没导出，闭包工具因此当成「已满足」而停下，gen-imports 又报「闭包外」。
  // 正确做法是补 export（而不是复制一份 —— 复制会生成第二个限流表，
  // 同一个 workbench 的读取不再被 structureReadLimiter 统一限流）。
  StructureAudio,
  structureReadLimiter,
  useCompositionDetails,
  CompositionVideoPreview,
  CompositionAttributes,
};
