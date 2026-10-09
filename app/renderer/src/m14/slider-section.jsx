// slider-section.jsx
import { useTranslation, reactExports, Copy, CircleAlert, Search, ScrollAreaRoot, ScrollAreaViewport, ScrollAreaCorner, ScrollAreaScrollbar, ScrollAreaThumb, ActionListPanel, ActionListItem, ActionListSeparator, Info$1, classifyFileType, FILE_TYPE_EXTENSIONS, PlaybackPauseIcon$1, Trash2Icon, PlaybackPlayIcon$1, FieldRoot } from "../vendor.js";
import { DialogTrigger } from "../m15/agent-ws-client.jsx";
import { Popover, PopoverTrigger, AlertDialogTrigger, Select$1 } from "../m15/apply-asset-change.jsx";
import { Separator$1 } from "../m15/canvas-surface-recovery-scheduler.jsx";
import { FileTypeIcon } from "../m15/create-recently-added-store.jsx";
import { DropdownMenu } from "../m15/graph.jsx";
import { Trash2, FolderOpen } from "../m15/parse-item.jsx";
import { SheetTrigger } from "../m15/record-recent-workspace-opened.jsx";
import { ContextMenu } from "../m15/use-hub-logo-hover-animation.jsx";
import { useTheme, useResizableWidth } from "../m15/use-resizable-width.js";
import {
  Button$1,
  cn$2,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  DialogFooter,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  PopoverContent,
  PopoverTitle,
  PopoverHeader,
  PopoverDescription,
} from "../m09/use-credit-details.jsx";
import { ShortcutKeycap, KbdGroup } from "../m08/shortcut-categories.jsx";
import { Label, Skeleton } from "../m09/infinite-scroll-container.jsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../m10/compact-rewrite-flow.jsx";
import { ResizeColHandle } from "../m10/asset-center-relocation-coach-mark.jsx";
import {
  ActionDropdownMenuContent,
  ActionDropdownMenuItem,
  ActionDropdownMenuSeparator,
  ContextMenuTrigger,
  ActionContextMenuContent,
  ActionContextMenuItem,
  ContextMenuSub,
  ActionContextMenuSubTrigger,
  ActionContextMenuSubContent,
  ActionContextMenuSeparator,
} from "../m10/new-workspace-dialog.jsx";
import {
  Input3,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../asset-center/shared/select-content.jsx";
import { MediaUnpreviewableFallback } from "../m01/create-tracker.jsx";
import { Avatar, AvatarFallback, AvatarGroup } from "../m10/hub-logo.jsx";
import { Alert, AlertTitle, AlertDescription } from "../m09/team-member-settings-page.jsx";
import { FileTypeBadge } from "../m11/asset-panel-overlay-host.jsx";
import {
  IntegrationCard,
  IntegrationIconFrame,
  IntegrationStatusPill,
  IntegrationActionGroup,
  IntegrationActionButton,
  IntegrationMoreMenu,
} from "../m10/use-feishu-qr-login.jsx";
import { Progress, ProgressTrack, ProgressIndicator } from "../m09/batch-remove-members-dialog.jsx";
import { Slider$1 } from "../m01/slider.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  RadioGroup,
  RadioGroupItem,
} from "./message-list-impl.jsx";
const AVATAR_DECODE_SIZE = 128;
export function useResizedAvatar(src) {
  const [resized, setResized] = reactExports.useState();
  const blobUrl = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = new OffscreenCanvas(AVATAR_DECODE_SIZE, AVATAR_DECODE_SIZE);
      canvas.getContext("2d")?.drawImage(img, 0, 0, AVATAR_DECODE_SIZE, AVATAR_DECODE_SIZE);
      canvas
        .convertToBlob({
          type: "image/png",
        })
        .then((blob) => {
          if (cancelled) return;
          if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
          const url2 = URL.createObjectURL(blob);
          blobUrl.current = url2;
          setResized(url2);
        })
        .catch(() => {
          if (!cancelled) setResized(src);
        });
    };
    img.onerror = () => {
      if (!cancelled) setResized(src);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  reactExports.useEffect(() => {
    return () => {
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    };
  }, []);
  return resized;
}
export function useUserMenuController() {
  const [open, setOpen] = reactExports.useState(false);
  const menuRef = reactExports.useRef(null);
  const popoverRef = reactExports.useRef(null);
  const triggerRef = reactExports.useRef(null);
  const openMenu = reactExports.useCallback(() => {
    setOpen(true);
  }, []);
  const closeMenu = reactExports.useCallback(() => {
    setOpen(false);
  }, []);
  const closeMenuAndRestoreFocus = reactExports.useCallback(() => {
    closeMenu();
    triggerRef.current?.focus();
  }, [closeMenu]);
  const handleTriggerClick = reactExports.useCallback(() => {
    setOpen((current2) => !current2);
  }, []);
  reactExports.useEffect(() => {
    if (!open) return;
    const handleKeyDown2 = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeMenuAndRestoreFocus();
    };
    window.addEventListener("keydown", handleKeyDown2);
    return () => window.removeEventListener("keydown", handleKeyDown2);
  }, [closeMenuAndRestoreFocus, open]);
  reactExports.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closeMenu, open]);
  return {
    open,
    menuRef,
    popoverRef,
    triggerRef,
    openMenu,
    closeMenu,
    handleTriggerClick,
  };
}
export function ScrollArea({ className, children: children2, ...props }) {
  return (
    <ScrollAreaRoot data-slot="scroll-area" className={cn$2("relative", className)} {...props}>
      <ScrollAreaViewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children2}
      </ScrollAreaViewport>
      <ScrollBar />
      <ScrollAreaCorner />
    </ScrollAreaRoot>
  );
}
function ScrollBar({ className, orientation = "vertical", ...props }) {
  return (
    <ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn$2(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t-[var(--divider-width)] data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l-[var(--divider-width)] data-vertical:border-l-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaScrollbar>
  );
}
const COLOR_GROUPS = {
  Surface: ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground"],
  Interactive: ["primary", "primary-foreground", "secondary", "secondary-foreground"],
  Emphasis: ["muted", "muted-foreground", "accent", "accent-foreground", "destructive", "warning"],
  Utility: ["border", "input", "ring", "brand-accent"],
  Chart: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  Sidebar: [
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
  ],
};
function useTokenValues(names) {
  const [values3, setValues] = reactExports.useState({});
  reactExports.useEffect(() => {
    const read = () => {
      const next2 = {};
      const styles = getComputedStyle(document.documentElement);
      for (const n2 of names) {
        next2[n2] = styles.getPropertyValue(`--${n2}`).trim();
      }
      setValues(next2);
    };
    read();
    const observer2 = new MutationObserver(read);
    observer2.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer2.disconnect();
  }, [names]);
  return values3;
}
export function ColorTokens() {
  const allNames = Object.values(COLOR_GROUPS).flat();
  const values3 = useTokenValues(allNames);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-muted-foreground">
        实时读取 CSS 变量值。切换 Light/Dark 自动刷新。悬停查看完整 oklch 值。
      </p>
      {Object.entries(COLOR_GROUPS).map(([group, names]) => (
        <section key={group} className="flex flex-col gap-2">
          <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {group}
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {names.map((name2) => (
              <div
                key={name2}
                className="flex flex-col gap-1 rounded-lg border border-border p-1.5"
                title={values3[name2] || ""}
              >
                <div
                  className="h-8 w-full rounded-sm border border-border/60"
                  style={{
                    backgroundColor: `var(--${name2})`,
                  }}
                />
                <div className="text-[10px] font-mono text-foreground truncate" title={name2}>
                  {name2}
                </div>
                <div
                  className="text-[9px] font-mono text-muted-foreground truncate"
                  title={values3[name2] || ""}
                >
                  {values3[name2] || "—"}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
export function ComponentSection({ name: name2, importPath, description, children: children2 }) {
  return (
    <section
      className="flex flex-col gap-2 rounded-lg border border-border p-2"
      data-action-ui-id={`ui-spec-section-${name2.toLowerCase()}`}
    >
      <header className="flex flex-col gap-0.5">
        <h4 className="text-xs font-heading font-medium text-foreground">{name2}</h4>
        <code className="text-[9px] font-mono text-muted-foreground truncate" title={importPath}>
          {importPath}
        </code>
        {description && (
          <p className="text-[10px] text-muted-foreground leading-snug">{description}</p>
        )}
      </header>
      <div className="flex flex-col gap-2">{children2}</div>
    </section>
  );
}
export function VariantGrid({ label, children: children2 }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5 items-start">{children2}</div>
    </div>
  );
}
export function AccordionSection() {
  return (
    <ComponentSection name="Accordion" importPath="@/components/ui/accordion">
      <VariantGrid label="Default (Single)">
        <Accordion className="w-full" defaultValue={["item-1"]}>
          <AccordionItem value="item-1">
            <AccordionTrigger>第一项</AccordionTrigger>
            <AccordionContent>
              <p className="text-[10px]">展开内容 1</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>第二项</AccordionTrigger>
            <AccordionContent>
              <p className="text-[10px]">展开内容 2</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </VariantGrid>
    </ComponentSection>
  );
}
export function ActionListSection() {
  const { t: t2 } = useTranslation();
  const [lastAction, setLastAction] = reactExports.useState();
  const openLabel = t2("uiSpec.actionList.open");
  const copyLabel = t2("common.copy");
  const deleteLabel = t2("common.delete");
  const unavailableLabel = t2("uiSpec.actionList.unavailable");
  const labels = {
    open: openLabel,
    copy: copyLabel,
    delete: deleteLabel,
  };
  const handleAction = (action) => setLastAction(action);
  return (
    <ComponentSection
      name="List"
      importPath="@hilo/canvas/action-list · @/modules/base/action-list"
      description={t2("uiSpec.actionList.description")}
    >
      <p className="text-xs text-muted-foreground">{t2("uiSpec.actionList.states")}</p>
      <VariantGrid label={t2("uiSpec.actionList.inline")}>
        <ActionListPanel className="w-60 max-w-full" data-action-ui-id="ui-spec-list-panel">
          <ActionListItem
            onClick={() => handleAction("open")}
            data-action-ui-id="ui-spec-list-open"
          >
            <FolderOpen className="size-4" strokeWidth={1.5} aria-hidden={true} />
            {openLabel}
          </ActionListItem>
          <ActionListItem
            onClick={() => handleAction("copy")}
            data-action-ui-id="ui-spec-list-copy"
          >
            <Copy className="size-4" strokeWidth={1.5} aria-hidden={true} />
            {copyLabel}
          </ActionListItem>
          <ActionListItem disabled={true} data-action-ui-id="ui-spec-list-disabled">
            <span className="size-4 shrink-0" aria-hidden={true} />
            {unavailableLabel}
          </ActionListItem>
          <ActionListSeparator />
          <ActionListItem
            variant="destructive"
            onClick={() => handleAction("delete")}
            data-action-ui-id="ui-spec-list-delete"
          >
            <Trash2 className="size-4" strokeWidth={1.5} aria-hidden={true} />
            {deleteLabel}
          </ActionListItem>
        </ActionListPanel>
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.actionList.interactive")}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button$1 size="sm" variant="outline" />}
            data-action-ui-id="ui-spec-list-dropdown-trigger"
          >
            {t2("uiSpec.actionList.dropdown")}
          </DropdownMenuTrigger>
          <ActionDropdownMenuContent className="w-60" data-action-ui-id="ui-spec-list-dropdown">
            <ActionDropdownMenuItem
              data-action-ui-id="ui-spec-list-dropdown-open"
              onClick={() => handleAction("open")}
            >
              <FolderOpen className="size-4" strokeWidth={1.5} aria-hidden={true} />
              {openLabel}
            </ActionDropdownMenuItem>
            <ActionDropdownMenuItem
              data-action-ui-id="ui-spec-list-dropdown-disabled"
              disabled={true}
            >
              <span className="size-4 shrink-0" aria-hidden={true} />
              {unavailableLabel}
            </ActionDropdownMenuItem>
            <ActionDropdownMenuSeparator />
            <ActionDropdownMenuItem
              data-action-ui-id="ui-spec-list-dropdown-delete"
              variant="destructive"
              onClick={() => handleAction("delete")}
            >
              <Trash2 className="size-4" strokeWidth={1.5} aria-hidden={true} />
              {deleteLabel}
            </ActionDropdownMenuItem>
          </ActionDropdownMenuContent>
        </DropdownMenu>
        <ContextMenu>
          <ContextMenuTrigger
            className="flex min-h-9 items-center rounded-md border border-dashed border-border px-4 text-sm"
            data-action-ui-id="ui-spec-list-context-trigger"
          >
            {t2("uiSpec.actionList.context")}
          </ContextMenuTrigger>
          <ActionContextMenuContent className="w-60" data-action-ui-id="ui-spec-list-context">
            <ActionContextMenuItem
              data-action-ui-id="ui-spec-list-context-open"
              onClick={() => handleAction("open")}
            >
              <FolderOpen className="size-4" strokeWidth={1.5} aria-hidden={true} />
              {openLabel}
            </ActionContextMenuItem>
            <ContextMenuSub>
              <ActionContextMenuSubTrigger data-action-ui-id="ui-spec-list-submenu-trigger">
                <span className="size-4 shrink-0" aria-hidden={true} />
                {t2("common.more")}
              </ActionContextMenuSubTrigger>
              <ActionContextMenuSubContent data-action-ui-id="ui-spec-list-submenu">
                <ActionContextMenuItem
                  data-action-ui-id="ui-spec-list-submenu-copy"
                  onClick={() => handleAction("copy")}
                >
                  <Copy className="size-4" strokeWidth={1.5} aria-hidden={true} />
                  {copyLabel}
                </ActionContextMenuItem>
                <ActionContextMenuItem
                  data-action-ui-id="ui-spec-list-submenu-disabled"
                  disabled={true}
                >
                  <span className="size-4 shrink-0" aria-hidden={true} />
                  {unavailableLabel}
                </ActionContextMenuItem>
              </ActionContextMenuSubContent>
            </ContextMenuSub>
            <ActionContextMenuSeparator />
            <ActionContextMenuItem
              data-action-ui-id="ui-spec-list-context-delete"
              variant="destructive"
              onClick={() => handleAction("delete")}
            >
              <Trash2 className="size-4" strokeWidth={1.5} aria-hidden={true} />
              {deleteLabel}
            </ActionContextMenuItem>
          </ActionContextMenuContent>
        </ContextMenu>
      </VariantGrid>
      <p
        role="status"
        className="text-xs text-muted-foreground"
        data-action-ui-id="ui-spec-list-result"
      >
        {lastAction
          ? t2("uiSpec.actionList.result", {
              action: labels[lastAction],
            })
          : t2("uiSpec.actionList.hint")}
      </p>
      <details className="text-xs text-muted-foreground">
        <summary
          className="w-fit cursor-pointer text-foreground"
          data-action-ui-id="ui-spec-list-usage"
        >
          {t2("uiSpec.actionList.usage")}
        </summary>
        <div className="flex flex-col gap-2 py-2">
          <p>{t2("uiSpec.actionList.tokens")}</p>
          <p>{t2("uiSpec.actionList.behavior")}</p>
          <pre className="overflow-x-auto rounded-md bg-secondary p-2 text-foreground">
            <code>{`import { ActionListPanel, ActionListItem, ActionListSeparator } from '@hilo/canvas/action-list';

<ActionListPanel>
  <ActionListItem onClick={handleOpen}>{openLabel}</ActionListItem>
  <ActionListSeparator />
  <ActionListItem variant="destructive" onClick={handleDelete}>{deleteLabel}</ActionListItem>
</ActionListPanel>

// Desktop: keep DropdownMenu / DropdownMenuTrigger from the existing menu.
import { ActionDropdownMenuContent, ActionDropdownMenuItem } from '@/modules/base/action-list';

<DropdownMenu>
  <DropdownMenuTrigger>{menuLabel}</DropdownMenuTrigger>
  <ActionDropdownMenuContent>
    <ActionDropdownMenuItem data-action-ui-id="ui-spec-list-dropdown-open" onClick={handleOpen}>{openLabel}</ActionDropdownMenuItem>
  </ActionDropdownMenuContent>
</DropdownMenu>`}</code>
          </pre>
        </div>
      </details>
    </ComponentSection>
  );
}
export function AlertSection() {
  return (
    <ComponentSection name="Alert" importPath="@/components/ui/alert">
      <VariantGrid label="Default">
        <Alert className="w-full">
          <Info$1 />
          <AlertTitle>提示</AlertTitle>
          <AlertDescription>这是一段提示文字。</AlertDescription>
        </Alert>
      </VariantGrid>
      <VariantGrid label="Destructive">
        <Alert variant="destructive" className="w-full">
          <CircleAlert />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>请求失败，请重试。</AlertDescription>
        </Alert>
      </VariantGrid>
    </ComponentSection>
  );
}
export function AlertDialogSection() {
  return (
    <ComponentSection
      name="AlertDialog"
      importPath="@/components/ui/alert-dialog"
      description="确认/危险操作；含 Action / Cancel。"
    >
      <VariantGrid label="Default">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button$1 size="xs" variant="destructive">
                删除
              </Button$1>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定删除？</AlertDialogTitle>
              <AlertDialogDescription>此操作无法撤销。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction>删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </VariantGrid>
    </ComponentSection>
  );
}
export function AvatarSection() {
  return (
    <ComponentSection
      name="Avatar"
      importPath="@/components/ui/avatar"
      description="size: sm/default/lg；头像统一圆形"
    >
      <VariantGrid label="Sizes">
        <Avatar size="sm">
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar size="default">
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
        <Avatar size="lg">
          <AvatarFallback>C</AvatarFallback>
        </Avatar>
      </VariantGrid>
      <VariantGrid label="Group">
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>X</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>Y</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>Z</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      </VariantGrid>
    </ComponentSection>
  );
}
export function BadgeSection() {
  return (
    <ComponentSection
      name="Badge"
      importPath="@/components/ui/badge"
      description="6 variants，h-5 紧凑标签。"
    >
      <VariantGrid label="Variants">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="ghost">Ghost</Badge>
        <Badge variant="link">Link</Badge>
      </VariantGrid>
    </ComponentSection>
  );
}
export function ButtonSection() {
  return (
    <ComponentSection
      name="Button"
      importPath="@/components/ui/button"
      description="6 variants × 4 sizes，含 loading/disabled。"
    >
      <VariantGrid label="Variants">
        <Button$1>Default</Button$1>
        <Button$1 variant="outline">Outline</Button$1>
        <Button$1 variant="secondary">Secondary</Button$1>
        <Button$1 variant="ghost">Ghost</Button$1>
        <Button$1 variant="destructive">Destructive</Button$1>
        <Button$1 variant="link">Link</Button$1>
      </VariantGrid>
      <VariantGrid label="Sizes">
        <Button$1 size="xs">xs</Button$1>
        <Button$1 size="sm">sm</Button$1>
        <Button$1 size="default">default</Button$1>
        <Button$1 size="lg">lg</Button$1>
      </VariantGrid>
      <VariantGrid label="Icon Sizes">
        <Button$1 size="icon-xs" aria-label="icon-xs">
          +
        </Button$1>
        <Button$1 size="icon-sm" aria-label="icon-sm">
          +
        </Button$1>
        <Button$1 size="icon" aria-label="icon">
          +
        </Button$1>
        <Button$1 size="icon-lg" aria-label="icon-lg">
          +
        </Button$1>
      </VariantGrid>
      <VariantGrid label="States">
        <Button$1 disabled={true}>Disabled</Button$1>
        <Button$1 loading={true}>Loading</Button$1>
      </VariantGrid>
    </ComponentSection>
  );
}
export function Card({ className, size: size2 = "default", ...props }) {
  return (
    <div
      data-slot="card"
      data-size={size2}
      className={cn$2(
        "group/card flex flex-col gap-4 overflow-hidden rounded-lg bg-card py-4 text-xs/relaxed text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-2 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn$2(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className,
      )}
      {...props}
    />
  );
}
export function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn$2(
        "font-heading text-sm font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}
export function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn$2("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn$2("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}
export function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn$2("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}
function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn$2("flex items-center border-t p-4 group-data-[size=sm]/card:p-3", className)}
      {...props}
    />
  );
}
export function CardSection() {
  return (
    <ComponentSection
      name="Card"
      importPath="@/components/ui/card"
      description="size: default / sm；7 子组件。"
    >
      <VariantGrid label="Default Size">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>卡片标题</CardTitle>
            <CardDescription>卡片描述文字。</CardDescription>
            <CardAction>
              <Button$1 size="xs" variant="ghost">
                Action
              </Button$1>
            </CardAction>
          </CardHeader>
          <CardContent>正文内容</CardContent>
          <CardFooter>
            <Button$1 size="xs">确认</Button$1>
          </CardFooter>
        </Card>
      </VariantGrid>
      <VariantGrid label="Small Size">
        <Card size="sm" className="w-full">
          <CardHeader>
            <CardTitle>Compact</CardTitle>
          </CardHeader>
          <CardContent>紧凑卡片</CardContent>
        </Card>
      </VariantGrid>
    </ComponentSection>
  );
}
export function CheckboxSection() {
  const { t: t2 } = useTranslation();
  return (
    <ComponentSection
      name="Checkbox"
      importPath="@hilo/canvas/controls"
      description={t2("uiSpec.checkbox.description")}
    >
      <details className="text-xs text-muted-foreground">
        <summary
          className="w-fit cursor-pointer text-foreground"
          data-action-ui-id="ui-spec-checkbox-usage"
        >
          {t2("uiSpec.checkbox.usage")}
        </summary>
        <div className="flex flex-col gap-2 py-2">
          <p>{t2("uiSpec.checkbox.api")}</p>
          <p>{t2("uiSpec.checkbox.card")}</p>
          <p>{t2("uiSpec.checkbox.behavior")}</p>
          <pre className="overflow-x-auto rounded-md bg-secondary p-2 text-foreground">
            <code>{`import { Checkbox } from '@hilo/canvas/controls';

<Checkbox checked={selected} onCheckedChange={handleSelectedChange} label={label} />
<Checkbox checked={allSelected} indeterminate={partiallySelected}
  onCheckedChange={handleSelectAll} aria-label={selectAllLabel} />
<Checkbox shape="circle" appearance="card" checked={selected}
  onCheckedChange={handleSelectedChange} aria-label={selectItemLabel} />`}</code>
          </pre>
        </div>
      </details>
      <p className="text-xs text-muted-foreground">{t2("uiSpec.checkbox.states")}</p>
      {["square", "circle"].flatMap((shape) =>
        ["sm", "md", "lg"].map((size2) => (
          <VariantGrid key={`${shape}-${size2}`} label={`${shape} / ${size2}`}>
            <Checkbox shape={shape} size={size2} aria-label={`${shape} ${size2} unchecked`} />
            <Checkbox
              shape={shape}
              size={size2}
              defaultChecked={true}
              aria-label={`${shape} ${size2} checked`}
            />
            <Checkbox
              shape={shape}
              size={size2}
              indeterminate={true}
              aria-label={`${shape} ${size2} mixed`}
            />
            <Checkbox
              shape={shape}
              size={size2}
              disabled={true}
              aria-label={`${shape} ${size2} disabled`}
            />
            <Checkbox
              shape={shape}
              size={size2}
              disabled={true}
              defaultChecked={true}
              aria-label={`${shape} ${size2} disabled checked`}
            />
            <Checkbox
              shape={shape}
              size={size2}
              disabled={true}
              indeterminate={true}
              aria-label={`${shape} ${size2} disabled mixed`}
            />
            <Checkbox
              shape={shape}
              size={size2}
              aria-invalid={true}
              aria-label={`${shape} ${size2} error`}
            />
          </VariantGrid>
        )),
      )}
      <VariantGrid label="card / fixed media colors">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--home-media-showcase-overlay-bg)] p-2">
          <Checkbox shape="circle" appearance="card" aria-label="card unchecked" />
          <Checkbox
            shape="circle"
            appearance="card"
            defaultChecked={true}
            aria-label="card checked"
          />
          <Checkbox shape="circle" appearance="card" indeterminate={true} aria-label="card mixed" />
        </div>
      </VariantGrid>
      <div className="max-w-60">
        <Checkbox label={t2("uiSpec.checkbox.label")} description={t2("uiSpec.checkbox.help")} />
      </div>
    </ComponentSection>
  );
}
export function ContextMenuSection() {
  const { t: t2 } = useTranslation();
  return (
    <ComponentSection name="ContextMenu" importPath="@/modules/base/action-list">
      <VariantGrid label={t2("uiSpec.actionList.context")}>
        <ContextMenu>
          <ContextMenuTrigger
            className="flex h-12 w-full items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground"
            data-action-ui-id="ui-spec-context-trigger"
          >
            {t2("uiSpec.actionList.context")}
          </ContextMenuTrigger>
          <ActionContextMenuContent>
            <ActionContextMenuItem data-action-ui-id="ui-spec-context-open">
              {t2("uiSpec.actionList.open")}
            </ActionContextMenuItem>
            <ActionContextMenuItem data-action-ui-id="ui-spec-context-copy">
              {t2("common.copy")}
            </ActionContextMenuItem>
            <ActionContextMenuSeparator />
            <ActionContextMenuItem variant="destructive" data-action-ui-id="ui-spec-context-delete">
              {t2("common.delete")}
            </ActionContextMenuItem>
          </ActionContextMenuContent>
        </ContextMenu>
      </VariantGrid>
    </ComponentSection>
  );
}
export function DialogSection() {
  return (
    <ComponentSection name="Dialog" importPath="@/components/ui/dialog">
      <VariantGrid label="Default">
        <Dialog>
          <DialogTrigger render={<Button$1 size="xs">打开 Dialog</Button$1>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>对话框标题</DialogTitle>
              <DialogDescription>这是一段描述文本。</DialogDescription>
            </DialogHeader>
            <p className="text-xs">主体内容区。</p>
            <DialogFooter>
              <Button$1 size="sm" variant="ghost">
                取消
              </Button$1>
              <Button$1 size="sm">确认</Button$1>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </VariantGrid>
    </ComponentSection>
  );
}
export function DropdownMenuSection() {
  const { t: t2 } = useTranslation();
  return (
    <ComponentSection name="DropdownMenu" importPath="@/modules/base/action-list">
      <VariantGrid label={t2("uiSpec.actionList.dropdown")}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button$1 size="xs" />}
            data-action-ui-id="ui-spec-dropdown-trigger"
          >
            {t2("common.more")}
          </DropdownMenuTrigger>
          <ActionDropdownMenuContent>
            <ActionDropdownMenuItem data-action-ui-id="ui-spec-dropdown-open">
              {t2("uiSpec.actionList.open")}
            </ActionDropdownMenuItem>
            <ActionDropdownMenuItem data-action-ui-id="ui-spec-dropdown-copy">
              {t2("common.copy")}
            </ActionDropdownMenuItem>
            <ActionDropdownMenuSeparator />
            <ActionDropdownMenuItem
              variant="destructive"
              data-action-ui-id="ui-spec-dropdown-delete"
            >
              {t2("common.delete")}
            </ActionDropdownMenuItem>
          </ActionDropdownMenuContent>
        </DropdownMenu>
      </VariantGrid>
    </ComponentSection>
  );
}
export function FileTypeIconSection() {
  const { t: t2 } = useTranslation();
  const psd = classifyFileType({
    filename: "poster.psd",
  });
  return (
    <ComponentSection
      name="FileTypeIcon"
      importPath="@hilo/canvas/controls"
      description={t2("uiSpec.fileTypeIcon.description")}
    >
      <details className="text-xs text-muted-foreground">
        <summary
          className="w-fit cursor-pointer text-foreground"
          data-action-ui-id="ui-spec-file-type-icon-usage"
        >
          {t2("uiSpec.fileTypeIcon.usage")}
        </summary>
        <div className="flex flex-col gap-2 py-2">
          <p>{t2("uiSpec.fileTypeIcon.api")}</p>
          <p>{t2("uiSpec.fileTypeIcon.boundary")}</p>
          <p>{t2("uiSpec.fileTypeIcon.colors")}</p>
          <pre className="overflow-x-auto rounded-md bg-secondary p-2 text-foreground">
            <code>{`import { classifyFileType, FileTypeIcon } from '@hilo/canvas/controls';

const type = classifyFileType({ filename });
<FileTypeIcon {...type} size={24} decorative />
<FileTypeIcon {...type} size={48} accessibleLabel={localizedLabel} />`}</code>
          </pre>
        </div>
      </details>
      <p className="text-xs text-muted-foreground">{t2("uiSpec.fileTypeIcon.colors")}</p>
      <VariantGrid label={t2("uiSpec.fileTypeIcon.sizes")}>
        {[14, 16, 24, 28, 32, 48, 64, 80, 99].map((size2) => (
          <div key={size2} className="flex flex-col items-center gap-2">
            <FileTypeIcon
              {...psd}
              size={size2}
              accessibleLabel={t2("uiSpec.fileTypeIcon.accessible", {
                type: "PSD",
              })}
            />
            <span className="text-xs text-muted-foreground">{size2}px</span>
          </div>
        ))}
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.fileTypeIcon.scenes")}>
        <div className="flex min-w-0 max-w-full items-center gap-2 rounded-md bg-secondary p-2">
          <FileTypeBadge fileName="poster.psd" variant="inline" />
          <span className="truncate">poster.psd</span>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg bg-card p-3">
          <FileTypeIcon {...psd} size={48} decorative={true} />
          <span>poster.psd</span>
        </div>
        <div className="h-[250px] w-[350px] max-w-full overflow-hidden rounded-lg">
          <MediaUnpreviewableFallback displayName="poster.psd" extension=".psd" />
        </div>
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.fileTypeIcon.states")}>
        {["unknown.xyz", "README", "long.abcdefghijk"].map((filename) => (
          <div key={filename} className="flex flex-col items-center gap-2">
            <FileTypeIcon
              {...classifyFileType({
                filename,
              })}
              size={48}
              decorative={true}
            />
            <span className="text-xs">{filename}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-2">
          <FileTypeIcon {...psd} readFailure={true} size={48} decorative={true} />
          <span className="text-xs">{t2("uiSpec.fileTypeIcon.readFailure")}</span>
        </div>
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.fileTypeIcon.coverage")}>
        {Object.values(FILE_TYPE_EXTENSIONS)
          .flat()
          .map((ext) => (
            <div key={ext} className="flex w-16 flex-col items-center gap-2">
              <FileTypeIcon
                {...classifyFileType({
                  filename: `sample.${ext}`,
                })}
                size={32}
                decorative={true}
              />
              <span className="text-xs text-muted-foreground">{ext.toUpperCase()}</span>
            </div>
          ))}
      </VariantGrid>
    </ComponentSection>
  );
}
export function InputSection() {
  return (
    <ComponentSection
      name="Input"
      importPath="@/components/ui/input"
      description="支持 startIcon / endIcon slot。"
    >
      <VariantGrid label="Default">
        <Input3 placeholder="输入文字..." className="w-full" />
      </VariantGrid>
      <VariantGrid label="With Icon">
        <Input3 placeholder="搜索..." startIcon={<Search />} className="w-full" />
      </VariantGrid>
      <VariantGrid label="Disabled">
        <Input3 placeholder="disabled" disabled={true} className="w-full" />
      </VariantGrid>
      <VariantGrid label="Invalid">
        <Input3 placeholder="invalid" aria-invalid={true} className="w-full" />
      </VariantGrid>
    </ComponentSection>
  );
}
export function IntegrationRowSection() {
  return (
    <ComponentSection
      name="Integration Row"
      importPath="@/components/ui/integration-row"
      description="站内集成入口列表的共享视觉规范：卡片、图标框、状态胶囊、行内动作按钮、更多菜单。"
    >
      <VariantGrid label="Card">
        <ul className="w-full max-w-xl">
          <IntegrationCard>
            <IntegrationIconFrame>
              <span className="flex size-12 items-center justify-center rounded-md bg-white text-[10px] font-medium text-foreground">
                App
              </span>
            </IntegrationIconFrame>
            <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate font-medium text-[16px] leading-none text-foreground">
                  Integration
                </p>
                <IntegrationStatusPill
                  label="Connected"
                  tone="neutral"
                  markerTone="success"
                  markerLabel="status:connected"
                />
              </div>
              <p className="mt-2 line-clamp-2 whitespace-normal break-words text-muted-foreground text-xs leading-relaxed">
                Connected integrations use a stable two-line subtitle area and fixed action slot.
              </p>
            </div>
            <IntegrationActionGroup>
              <IntegrationActionButton
                variant="outline"
                leadingIcon={<PlaybackPauseIcon$1 className="size-3.5 text-foreground/70" />}
              >
                Pause
              </IntegrationActionButton>
              <IntegrationMoreMenu
                triggerLabel="More"
                actionLabel="Remove account"
                actionIcon={<Trash2Icon className="size-3.5" strokeWidth={1.5} />}
                onAction={() => void 0}
                actionUiIds={{
                  trigger: "ui-spec.integration-row.more",
                  content: "ui-spec.integration-row.more-popover",
                  bridge: "ui-spec.integration-row.more-bridge",
                  action: "ui-spec.integration-row.remove",
                }}
              />
            </IntegrationActionGroup>
          </IntegrationCard>
        </ul>
      </VariantGrid>
      <VariantGrid label="Status">
        <IntegrationStatusPill
          label="Not connected"
          tone="muted"
          markerTone="muted"
          markerLabel="status:disconnected"
        />
        <IntegrationStatusPill
          label="Connected"
          tone="neutral"
          markerTone="success"
          markerLabel="status:connected"
        />
        <IntegrationStatusPill
          label="Paused"
          tone="warning"
          markerTone="warning"
          markerIcon={<PlaybackPauseIcon$1 className="size-2.5 text-warning/80" />}
          markerLabel="status:paused"
        />
        <IntegrationStatusPill
          label="Needs auth"
          tone="warning"
          markerTone="warning"
          markerActive={true}
          markerLabel="status:needs-auth"
          tooltipContent={<span>Use tooltip only for extra state context.</span>}
        />
        <IntegrationStatusPill
          label="Lost"
          tone="destructive"
          markerTone="destructive"
          markerLabel="status:error"
        />
      </VariantGrid>
      <VariantGrid label="Actions">
        <IntegrationActionButton
          variant="outline"
          leadingIcon={<PlaybackPlayIcon$1 className="size-3.5" />}
        >
          Resume
        </IntegrationActionButton>
        <IntegrationActionButton variant="outline" tone="warning">
          Continue
        </IntegrationActionButton>
      </VariantGrid>
    </ComponentSection>
  );
}
export function KbdSection() {
  return (
    <ComponentSection name="Kbd" importPath="@/components/ui/kbd">
      <VariantGrid label="Single Key">
        <ShortcutKeycap token="⌘" />
        <ShortcutKeycap token="K" />
        <ShortcutKeycap token="Esc" />
      </VariantGrid>
      <VariantGrid label="Group">
        <KbdGroup>
          <ShortcutKeycap token="⌘" />
          <ShortcutKeycap token="K" />
        </KbdGroup>
        <KbdGroup>
          <ShortcutKeycap token="Ctrl" />
          <ShortcutKeycap token="Shift" />
          <ShortcutKeycap token="P" />
        </KbdGroup>
      </VariantGrid>
    </ComponentSection>
  );
}
export function LabelSection() {
  return (
    <ComponentSection name="Label" importPath="@/components/ui/label">
      <VariantGrid label="With Control">
        <div className="hilo-checkbox-label flex items-center">
          <Checkbox id="ui-spec-demo-label" />
          <Label htmlFor="ui-spec-demo-label">同意条款</Label>
        </div>
      </VariantGrid>
    </ComponentSection>
  );
}
export function PopoverSection() {
  return (
    <ComponentSection name="Popover" importPath="@/components/ui/popover">
      <VariantGrid label="Default">
        <Popover>
          <PopoverTrigger render={<Button$1 size="xs">打开 Popover</Button$1>} />
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>标题</PopoverTitle>
              <PopoverDescription>非模态浮层。</PopoverDescription>
            </PopoverHeader>
            <div className="p-2 text-xs">浮层内容</div>
          </PopoverContent>
        </Popover>
      </VariantGrid>
    </ComponentSection>
  );
}
export function ProgressSection() {
  return (
    <ComponentSection name="Progress" importPath="@/components/ui/progress">
      <VariantGrid label="60%">
        <div className="w-full">
          <Progress value={60}>
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
        </div>
      </VariantGrid>
      <VariantGrid label="100%">
        <div className="w-full">
          <Progress value={100}>
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
        </div>
      </VariantGrid>
    </ComponentSection>
  );
}
export function RadioGroupSection() {
  return (
    <ComponentSection name="RadioGroup" importPath="@/components/ui/radio-group">
      <VariantGrid label="Options">
        <RadioGroup defaultValue="a" className="flex flex-col gap-1">
          <Label className="flex items-center gap-2">
            <RadioGroupItem value="a" />
            <span>选项 A</span>
          </Label>
          <Label className="flex items-center gap-2">
            <RadioGroupItem value="b" />
            <span>选项 B</span>
          </Label>
          <Label className="flex items-center gap-2">
            <RadioGroupItem value="c" disabled={true} />
            <span>选项 C (disabled)</span>
          </Label>
        </RadioGroup>
      </VariantGrid>
    </ComponentSection>
  );
}
const PREVIEW_DEFAULT_WIDTH = 160;
const PREVIEW_MIN_WIDTH = 96;
const PREVIEW_MAX_WIDTH = 280;
export function ResizeColHandleSection() {
  const {
    width,
    onMouseDown,
    onValueChange,
    reset: reset2,
  } = useResizableWidth({
    defaultWidth: PREVIEW_DEFAULT_WIDTH,
    minWidth: PREVIEW_MIN_WIDTH,
    maxWidth: PREVIEW_MAX_WIDTH,
  });
  return (
    <ComponentSection
      name="ResizeColHandle"
      importPath="@/modules/base/resize-col-handle"
      description="The 10×40 grip is visual only; the complete 9px × full-height strip remains draggable."
    >
      <VariantGrid label="Grip · full-height hit target">
        <div className="flex h-32 w-full overflow-hidden rounded-lg border border-border bg-background">
          <div
            className="flex shrink-0 items-center justify-center bg-card"
            data-action-ui-id="ui-spec.resize-handle.panel"
            style={{
              width,
            }}
          >
            <span className="text-[10px] text-muted-foreground">
              {"Panel · "}
              {width}px
            </span>
          </div>
          <ResizeColHandle
            tabIndex={0}
            aria-orientation="vertical"
            aria-valuemin={PREVIEW_MIN_WIDTH}
            aria-valuemax={PREVIEW_MAX_WIDTH}
            aria-valuenow={width}
            data-action-ui-id="ui-spec.resize-handle.grip"
            indicatorVariant="grip"
            onMouseDown={onMouseDown}
            onValueChange={onValueChange}
            onDoubleClick={reset2}
          />
          <div className="flex min-w-0 flex-1 items-center justify-center bg-muted">
            <span className="text-[10px] text-muted-foreground">Adjacent surface</span>
          </div>
        </div>
      </VariantGrid>
    </ComponentSection>
  );
}
export function SelectSection() {
  return (
    <ComponentSection
      name="Select"
      importPath="@/components/ui/select"
      description="带 Trigger / Content / Item 子组件。"
    >
      <VariantGrid label="Default">
        <Select$1>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="请选择..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">苹果</SelectItem>
            <SelectItem value="banana">香蕉</SelectItem>
            <SelectItem value="cherry">樱桃</SelectItem>
          </SelectContent>
        </Select$1>
      </VariantGrid>
    </ComponentSection>
  );
}
function Separator({ className, orientation = "horizontal", ...props }) {
  return (
    <Separator$1
      data-slot="separator"
      orientation={orientation}
      className={cn$2(
        "shrink-0 bg-border data-horizontal:h-[var(--divider-width)] data-horizontal:w-full data-vertical:w-[var(--divider-width)] data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}
export function SeparatorSection() {
  return (
    <ComponentSection name="Separator" importPath="@/components/ui/separator">
      <VariantGrid label="Horizontal">
        <div className="w-full">
          <div className="text-[10px]">Above</div>
          <Separator className="my-2" />
          <div className="text-[10px]">Below</div>
        </div>
      </VariantGrid>
      <VariantGrid label="Vertical">
        <div className="flex items-center gap-2 h-8">
          <span className="text-[10px]">Left</span>
          <Separator orientation="vertical" />
          <span className="text-[10px]">Right</span>
        </div>
      </VariantGrid>
    </ComponentSection>
  );
}
export function SheetSection() {
  return (
    <ComponentSection
      name="Sheet"
      importPath="@/components/ui/sheet"
      description="侧滑面板，4 个 side 方向。"
    >
      <VariantGrid label="Side Right">
        <Sheet>
          <SheetTrigger render={<Button$1 size="xs">右侧打开</Button$1>} />
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>侧滑面板</SheetTitle>
              <SheetDescription>从右侧滑入。</SheetDescription>
            </SheetHeader>
            <div className="p-4 text-xs">内容区</div>
          </SheetContent>
        </Sheet>
      </VariantGrid>
      <VariantGrid label="Side Left">
        <Sheet>
          <SheetTrigger render={<Button$1 size="xs">左侧打开</Button$1>} />
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>左侧面板</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </VariantGrid>
    </ComponentSection>
  );
}
export function SkeletonSection() {
  return (
    <ComponentSection name="Skeleton" importPath="@/components/ui/skeleton">
      <VariantGrid label="Default">
        <div className="w-full flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-full" />
        </div>
      </VariantGrid>
    </ComponentSection>
  );
}
export function SliderSection() {
  const { t: t2 } = useTranslation();
  const { theme: theme2, setTheme } = useTheme();
  const id2 = reactExports.useId();
  const [samples, setSamples] = reactExports.useState({
    standard: {
      value: 40,
      changes: 0,
      commits: 0,
      committed: 40,
    },
    rounded: {
      value: 40,
      changes: 0,
      commits: 0,
      committed: 40,
    },
    filled: {
      value: 40,
      changes: 0,
      commits: 0,
      committed: 40,
    },
  });
  const [range2, setRange] = reactExports.useState([20, 80]);
  const [vertical, setVertical] = reactExports.useState(50);
  const [duration, setDuration] = reactExports.useState(8);
  const [fontSize, setFontSize] = reactExports.useState(12);
  return (
    <ComponentSection
      name="Slider"
      importPath="@hilo/canvas/controls"
      description={t2("uiSpec.slider.description")}
    >
      <div className="flex flex-wrap gap-1">
        {["light", "dark", "system"].map((next2) => (
          <Button$1
            key={next2}
            size="xs"
            variant={theme2 === next2 ? "default" : "outline"}
            aria-pressed={theme2 === next2}
            data-action-ui-id={`ui-spec-slider-theme-${next2}`}
            onClick={() => setTheme(next2)}
          >
            {t2(`uiSpec.slider.theme.${next2}`)}
          </Button$1>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t2("uiSpec.slider.themeHelp")}</p>
      <div className="space-y-3 rounded-lg border p-4" data-action-ui-id="ui-spec-slider-rules">
        <h4 className="text-sm font-medium">{t2("uiSpec.slider.rulesTitle")}</h4>
        <dl className="grid gap-3 text-xs sm:grid-cols-[8rem_1fr]">
          {["selection", "sizes", "layout", "ticks", "feedback", "contract"].map((rule) => (
            <div key={rule} className="contents">
              <dt className="font-medium">{t2(`uiSpec.slider.rules.${rule}.title`)}</dt>
              <dd className="text-muted-foreground">{t2(`uiSpec.slider.rules.${rule}.body`)}</dd>
            </div>
          ))}
        </dl>
      </div>
      {["standard", "rounded", "filled"].map((variant) => {
        const sample = samples[variant];
        return (
          <VariantGrid key={variant} label={t2(`uiSpec.slider.variant.${variant}`)}>
            <div className="w-full min-w-0">
              <div className="hilo-slider-field__header flex items-start justify-between gap-3 text-xs">
                <span id={`${id2}-${variant}-label`} className="min-w-0 break-words">
                  {t2("uiSpec.slider.longLabel")}
                </span>
                <output className="shrink-0 tabular-nums">{sample.value}%</output>
              </div>
              <Slider$1
                variant={variant}
                size={variant === "rounded" ? "compact" : "default"}
                markerValue={variant === "rounded" ? 50 : void 0}
                value={[sample.value]}
                min={0}
                max={100}
                step={1}
                aria-label={t2(`uiSpec.slider.variant.${variant}`)}
                thumbProps={{
                  "aria-labelledby": `${id2}-${variant}-label`,
                  "aria-describedby": `${id2}-${variant}-events`,
                  "data-action-ui-id": `ui-spec-slider-${variant}`,
                }}
                onValueChange={(value) => {
                  const next2 = Array.isArray(value) ? value[0] : value;
                  setSamples((current2) => ({
                    ...current2,
                    [variant]: {
                      ...current2[variant],
                      value: next2,
                      changes: current2[variant].changes + 1,
                    },
                  }));
                }}
                onValueCommitted={(value) => {
                  const next2 = Array.isArray(value) ? value[0] : value;
                  setSamples((current2) => ({
                    ...current2,
                    [variant]: {
                      ...current2[variant],
                      committed: next2,
                      commits: current2[variant].commits + 1,
                    },
                  }));
                }}
              />
              <div className="hilo-slider-field__marks flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>0%</span>
                <span>100%</span>
              </div>
              <p id={`${id2}-${variant}-events`} className="text-xs text-muted-foreground">
                {t2("uiSpec.slider.events", {
                  changes: sample.changes,
                  commits: sample.commits,
                  value: sample.committed,
                })}
              </p>
              <div className="flex flex-wrap gap-1">
                {[0, 100].map((value) => (
                  <Button$1
                    key={value}
                    variant="outline"
                    size="xs"
                    data-action-ui-id={`ui-spec-slider-${variant}-set-${value}`}
                    onClick={() =>
                      setSamples((current2) => ({
                        ...current2,
                        [variant]: {
                          ...current2[variant],
                          value,
                        },
                      }))
                    }
                  >
                    {t2("uiSpec.slider.setValue", {
                      value,
                    })}
                  </Button$1>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t2("uiSpec.slider.disabled")}</p>
              <Slider$1
                variant={variant}
                defaultValue={[40]}
                disabled={true}
                aria-label={`${t2(`uiSpec.slider.variant.${variant}`)}: ${t2("uiSpec.slider.disabled")}`}
              />
            </div>
          </VariantGrid>
        );
      })}
      <VariantGrid label={t2("uiSpec.slider.temperature")}>
        <Slider$1
          variant="rounded"
          size="compact"
          trackAppearance="temperature"
          thumbSize={18}
          min={2e3}
          max={1e4}
          step={100}
          defaultValue={6500}
          markerValue={6500}
          aria-label={t2("uiSpec.slider.temperature")}
        />
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.slider.compactDuration")}>
        <div className="w-full min-w-0">
          <output className="hilo-slider-field__header block text-right text-xs tabular-nums">
            {duration}s
          </output>
          <Slider$1
            variant="filled"
            size="compact"
            visualMin={0}
            minBoundaryMessage={t2("canvas.param.durationRange", {
              min: 4,
              max: 15,
            })}
            ticks={[5, 10]}
            min={4}
            max={15}
            step={1}
            value={duration}
            onValueChange={(value) => setDuration(Array.isArray(value) ? value[0] : value)}
            aria-label={t2("uiSpec.slider.compactDuration")}
            thumbProps={{
              "data-action-ui-id": "ui-spec-slider-compact-duration",
            }}
          />
          <div className="hilo-slider-field__marks flex justify-between text-xs text-muted-foreground tabular-nums">
            {[0, 5, 10, 15].map((mark2) => (
              <span key={mark2}>{mark2}s</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t2("uiSpec.slider.visualMinimumHelp")}
          </p>
        </div>
      </VariantGrid>
      <VariantGrid label={t2("canvas.prompt.fontSize")}>
        <div className="flex h-8 w-[170px] items-center gap-1.5 rounded-lg border bg-card pr-2.5 pl-2">
          <Slider$1
            size="compact"
            min={8}
            max={36}
            step={1}
            value={fontSize}
            onValueChange={(value) => setFontSize(Array.isArray(value) ? value[0] : value)}
            aria-label={t2("canvas.prompt.fontSize")}
            className="w-28 shrink-0"
            thumbProps={{
              "data-action-ui-id": "ui-spec-slider-compact-font-size",
            }}
          />
          <output className="min-w-8 shrink-0 text-right text-[13px] tabular-nums">
            {fontSize}px
          </output>
        </div>
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.slider.range")}>
        <div className="w-full min-w-0">
          <output className="text-xs tabular-nums">{range2.join(" – ")}</output>
          <Slider$1
            variant="filled"
            value={range2}
            onValueChange={(value) => setRange(Array.isArray(value) ? value : [value])}
            aria-label={t2("uiSpec.slider.range")}
            thumbProps={{
              "data-action-ui-id": "ui-spec-slider-range",
            }}
          />
        </div>
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.slider.vertical")}>
        <div className="flex h-40 items-center gap-3">
          <Slider$1
            variant="filled"
            orientation="vertical"
            value={[vertical]}
            onValueChange={(value) => setVertical(Array.isArray(value) ? value[0] : value)}
            aria-label={t2("uiSpec.slider.vertical")}
            thumbProps={{
              "data-action-ui-id": "ui-spec-slider-vertical",
            }}
          />
          <output className="text-xs tabular-nums">{vertical}</output>
        </div>
      </VariantGrid>
      <p className="text-xs text-muted-foreground">{t2("uiSpec.slider.fallback")}</p>
      <VariantGrid label={t2("uiSpec.slider.error")}>
        <FieldRoot invalid={true} className="w-full min-w-0">
          <Slider$1
            defaultValue={[40]}
            aria-label={t2("uiSpec.slider.error")}
            thumbProps={{
              "aria-describedby": `${id2}-error`,
              "data-action-ui-id": "ui-spec-slider-error",
            }}
          />
          <p id={`${id2}-error`} className="text-xs text-destructive">
            {t2("uiSpec.slider.errorHelp")}
          </p>
        </FieldRoot>
      </VariantGrid>
      <details className="text-xs text-muted-foreground">
        <summary
          className="w-fit cursor-pointer text-foreground"
          data-action-ui-id="ui-spec-slider-usage"
        >
          {t2("uiSpec.slider.usage")}
        </summary>
        <div className="space-y-2 py-2">
          <p>{t2("uiSpec.slider.api")}</p>
          <p>{t2("uiSpec.slider.keyboard")}</p>
          <p>{t2("uiSpec.slider.boundaries")}</p>
          <pre className="overflow-x-auto rounded-md bg-secondary p-2 text-foreground">
            <code>{`import { Slider } from '@hilo/canvas/controls';

<Slider variant="standard" value={[value]} min={0} max={100} step={1}
  aria-label={label} onValueChange={handleChange}
  onValueCommitted={handleCommit} />
<Slider variant="filled" name="amount" defaultValue={[40]}
  aria-label={label} disabled={disabled} />

<Slider variant="filled" size="compact" min={4} max={15} step={1}
  visualMin={0} ticks={[5, 10]} value={preview ?? duration}
  minBoundaryMessage={t('canvas.param.durationRange', { min: 4, max: 15 })}
  aria-label={label} onValueChange={handlePreview}
  onValueCommitted={handleCommit} />

<Slider variant="standard" size="compact" min={8} max={36} step={1}
  value={fontSize} aria-label={label} onValueChange={handleFontSizeChange} />`}</code>
          </pre>
        </div>
      </details>
    </ComponentSection>
  );
}
