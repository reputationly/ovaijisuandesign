// context-menu-content.jsx
import {
  ActionListItem,
  ActionListPanel,
  ActionListSeparator,
  CDN_BASE_MAP,
  cdnPublicAsset,
  ChevronRightIcon,
  ContextMenuTrigger$1,
  dedupedToast,
  getCdnRegion,
  MenuItem$3 as MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  cn$2 as cn,
  DropdownMenuContent,
  DropdownMenuItem,
  MENU_ITEM_LAYOUT,
} from "../infra/dialog-content.jsx";
import { toastWorkspaceOpenResult } from "./toast-workspace-open-result.js";
import { showVisiblePreviewTab } from "./show-visible-preview-tab.js";
import { Separator } from "../canvas/separator.jsx";
import {
  cdnRegionalFile,
  cdnRegionalImage,
  COACHMARK_BASE_MAP,
  coachMarkImage,
  isChineseLocale,
  OSS_WEBP,
} from "./topbar-state-context.jsx";
import { useProjectActions } from "../settings/use-project-actions.js";
import { DropdownMenuSeparator } from "./shortcut-hint.jsx";
export function useCreateProjectAndSelect(onChange) {
  const { t: t2 } = useTranslation();
  const { createProject } = useProjectActions();
  const handleCreateProject = reactExports.useCallback(
    async (name2, kind) => {
      const result = await createProject(name2, kind);
      if (!result.project) {
        dedupedToast.error(
          result.errorMessage ??
            t2(result.errorMessageKey ?? "project.create.failed"),
        );
        return;
      }
      onChange(result.project.id);
    },
    [createProject, onChange, t2],
  );
  return handleCreateProject;
}
function handleWorkspaceOpenResult(result, t2, navigateToWorkspace) {
  const runtime =
    result.kind === "opened" || result.kind === "reused"
      ? result.runtime
      : void 0;
  if (runtime) {
    navigateToWorkspace(runtime);
    return runtime;
  }
  toastWorkspaceOpenResult(result, t2);
  return void 0;
}
export function handleNewWorkspaceOpenResult(
  result,
  t2,
  navigateToWorkspace,
  alreadyKnown = false,
) {
  const isReopenOfKnown =
    result.kind === "reused" || (result.kind === "opened" && alreadyKnown);
  if (isReopenOfKnown) {
    const runtime = result.runtime;
    dedupedToast.info(
      t2("workspace.open.alreadyOpen", {
        defaultValue: isChineseLocale()
          ? "该文件夹已有对应工作区，已为您切换过去。"
          : "This folder already has a workspace. Switched to it.",
      }),
    );
    navigateToWorkspace(runtime);
    return runtime;
  }
  return handleWorkspaceOpenResult(result, t2, navigateToWorkspace);
}
export async function stageWorkspacePreview({
  hiloApp: hiloApp2,
  folderPath,
  t: t2,
  onStaged,
}) {
  const result = await hiloApp2.stageWorkspaceTab(folderPath);
  if (result.kind !== "staged") {
    toastWorkspaceOpenResult(result, t2);
    return void 0;
  }
  showVisiblePreviewTab(result.entry);
  await onStaged(result.entry);
  return result.entry;
}
export function ContextMenuTrigger({ className, ...props }) {
  return (
    <ContextMenuTrigger$1
      data-slot="context-menu-trigger"
      className={cn("select-none", className)}
      {...props}
    />
  );
}
export function ContextMenuContent({
  className,
  align = "start",
  alignOffset = 4,
  side = "right",
  sideOffset = 0,
  motion = "quick-zoom",
  ...props
}) {
  return (
    <MenuPortal>
      <MenuPositioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPopup
          data-slot="context-menu-content"
          className={cn(
            "elevated-surface-border z-50 max-h-(--available-height) min-w-28 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-lg outline-none",
            motion !== "none" && "dp-motion-quick-zoom",
            className,
          )}
          {...props}
        />
      </MenuPositioner>
    </MenuPortal>
  );
}
export function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}) {
  return (
    <MenuItem
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        MENU_ITEM_LAYOUT,
        "group/context-menu-item list-row-hit-area relative flex cursor-default items-center rounded-sm outline-hidden select-none focus:bg-popup-item-hover focus:text-foreground data-inset:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus:*:[svg]:text-foreground data-[variant=destructive]:*:[svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}
export function ContextMenuSub({ ...props }) {
  return <MenuSubmenuRoot data-slot="context-menu-sub" {...props} />;
}
function ContextMenuSubTrigger({
  className,
  inset,
  children: children2,
  ...props
}) {
  return (
    <MenuSubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        MENU_ITEM_LAYOUT,
        "list-row-hit-area flex cursor-default items-center rounded-sm outline-hidden select-none focus:bg-popup-item-hover focus:text-foreground data-inset:pl-8 data-open:bg-popup-item-active data-open:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children2}
      <ChevronRightIcon className="ml-auto" />
    </MenuSubmenuTrigger>
  );
}
function ContextMenuSubContent({ ...props }) {
  return (
    <ContextMenuContent
      data-slot="context-menu-sub-content"
      className="shadow-lg"
      side="right"
      {...props}
    />
  );
}
export function ContextMenuSeparator({ className, ...props }) {
  return (
    <Separator
      data-slot="context-menu-separator"
      className={cn("h-px bg-border", className)}
      {...props}
    />
  );
}
export function ContextMenuShortcut({ className, ...props }) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/context-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}
export function ActionMenuPanel({
  appearance = "canvas",
  className,
  ...props
}) {
  return (
    <ActionListPanel
      {...props}
      data-action-list-appearance={appearance}
      className={`${appearance === "agent-chat" ? "shadow-lg" : ""} ${className ?? ""}`}
    />
  );
}
export function ActionContextMenuContent(props) {
  return <ActionListPanel render={<ContextMenuContent {...props} />} />;
}
export function ActionContextMenuItem(props) {
  return (
    <ActionListItem
      variant={props.variant}
      render={<ContextMenuItem {...props} />}
    />
  );
}
export function ActionContextMenuSeparator(props) {
  return <ActionListSeparator render={<ContextMenuSeparator {...props} />} />;
}
export function ActionContextMenuSubContent(props) {
  return <ActionListPanel render={<ContextMenuSubContent {...props} />} />;
}
export function ActionContextMenuSubTrigger(props) {
  return <ActionListItem render={<ContextMenuSubTrigger {...props} />} />;
}
export function ActionDropdownMenuContent(props) {
  return <ActionListPanel render={<DropdownMenuContent {...props} />} />;
}
export function ActionDropdownMenuItem(props) {
  return (
    <ActionListItem
      variant={props.variant}
      render={<DropdownMenuItem {...props} />}
    />
  );
}
export function ActionDropdownMenuSeparator(props) {
  return <ActionListSeparator render={<DropdownMenuSeparator {...props} />} />;
}
function getCdnBase() {
  return CDN_BASE_MAP[getCdnRegion()];
}
let _cdnBase;
function cdnUrl(path2) {
  _cdnBase ??= getCdnBase();
  return `${_cdnBase}/${path2}`;
}
export function cdnAssetFile(path2) {
  return cdnUrl(path2);
}
function cdnImage(path2) {
  return `${cdnUrl(path2)}${OSS_WEBP}`;
}
cdnImage("project-1.jpg");
cdnImage("project-2.jpg");
cdnImage("project-3.jpg");
cdnImage("project-4.jpg");
cdnImage("project-5.jpg");
cdnImage("project-6.jpg");
cdnImage("featured-story-to-shorts.jpg");
const cdnRegionalVideo = cdnRegionalFile;
cdnRegionalVideo({
  domestic: "ac56b513-7c8e-4733-90e5-31b2c27fe90f.mp4",
  overseas: "a90e4204-370d-40e5-9748-a8a217f78072.mp4",
});
cdnRegionalVideo({
  domestic: "d6839ff2-3bf3-4712-b906-4cb0f8bd844a.mp4",
  overseas: "b5a5039e-8677-45b5-896a-522d218d629b.mp4",
});
cdnRegionalVideo({
  domestic: "492deead-c992-493a-bd63-e74c604c1885.mp4",
  overseas: "5134aa13-f95b-45aa-9263-4845c9ea2950.mp4",
});
export const CDN_LOGIN_GATE_HERO = cdnRegionalFile({
  domestic: "hub-login.png",
  overseas: "hub-login.png",
});
export const CDN_BROWSER_INSPIRATION_FALLBACK = cdnPublicAsset({
  domestic: "browser-inspiration-fallback-2fe765c826fb.png",
  overseas: "browser-inspiration-fallback-2fe765c826fb.png",
});
export const CDN_WORKSPACE_DISPLAY_MODE_CHAT_CANVAS = cdnRegionalImage({
  domestic: "7c41c493-115c-4142-ac6d-9ffbcbca486f.webp",
  overseas: "c887b72b-5029-4f98-be42-a2fbd5303f57.webp",
});
export const CDN_WORKSPACE_DISPLAY_MODE_CANVAS_CHAT = cdnRegionalImage({
  domestic: "78500e41-e6fe-40d9-b8dd-993e949c0dd1.webp",
  overseas: "944d2c09-b722-4091-9066-265a213040a1.webp",
});
export const CDN_WORKSPACE_DISPLAY_MODE_CANVAS = cdnRegionalImage({
  domestic: "5182abff-4c9a-4dda-bab8-49af46589b35.webp",
  overseas: "e6e3cbc2-7e4d-4222-8a2c-94237418dbea.webp",
});
export const CDN_WORKSPACE_DISPLAY_MODE_CHAT = cdnRegionalImage({
  domestic: "49ac5b47-5644-4b38-b48a-cfaa7bc79778.webp",
  overseas: "80f71b2d-3610-4bb0-8858-a9adc979a626.webp",
});
function coachMarkSharedImage(fileName) {
  return `${COACHMARK_BASE_MAP[getCdnRegion()]}/${fileName}.png${OSS_WEBP}`;
}
export const CDN_COACHMARK_FILE_LOCATE = coachMarkImage("file-locate");
export const CDN_COACHMARK_FILE_VIEW = coachMarkImage("file-view");
export const CDN_COACHMARK_CANVAS_GROUP = coachMarkSharedImage(
  "coachmark-canvas-group",
);
export const CDN_BLENDER_INSTALLER_MACOS_ARM64 = cdnPublicAsset({
  domestic: "blender-5.2.1-macos-arm64.dmg",
  overseas: "blender-5.2.1-macos-arm64.dmg",
});
export const CDN_BLENDER_INSTALLER_WINDOWS_X64 = cdnPublicAsset({
  domestic: "blender-5.2.1-windows-x64.msi",
  overseas: "blender-5.2.1-windows-x64.msi",
});
