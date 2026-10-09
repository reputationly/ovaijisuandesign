// action-list-section.jsx
import {
  ActionListItem,
  ActionListPanel,
  ActionListSeparator,
  Bold$1 as Bold,
  CircleAlert,
  classifyFileType,
  Copy,
  DialogTrigger$1,
  FILE_TYPE_EXTENSIONS,
  Info$1 as Info,
  Italic$1 as Italic,
  PlaybackPauseIcon$1 as PlaybackPauseIcon,
  PlaybackPlayIcon$1 as PlaybackPlayIcon,
  reactExports,
  Search,
  Trash2Icon,
  Underline$1 as Underline,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ComponentSection,
  VariantGrid,
} from "./scroll-bar.jsx";
import { Label, Skeleton } from "../team/use-wallet-query.jsx";
import {
  AlertDialog,
  Button,
  cn$2 as cn,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DropdownMenuTrigger,
  TooltipContent,
} from "../infra/dialog-content.jsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../settings/changelog-table.jsx";
import { Separator as Separator$1 } from "../canvas/separator.jsx";
import { Popover, Select } from "../assets/credit-query-keys.jsx";
import {
  Input3,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../infra/select-content.jsx";
import { useResizableWidth } from "../generation/use-resizable-width.js";
import { ResizeColHandle } from "../assets/resize-col-handle.jsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  RadioGroup,
  RadioGroupItem,
} from "./message-list-props-equal.jsx";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "../team/team-management-detail-loading.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { PopoverContent, PopoverHeader } from "../team/hailuo-credit-row.jsx";
import { PopoverDescription, PopoverTitle } from "../canvas/popover-title.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import {
  KbdGroup,
  ShortcutKeycap,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../workspace/shortcut-hint.jsx";
import {
  IntegrationActionButton,
  IntegrationActionGroup,
  IntegrationCard,
  IntegrationIconFrame,
} from "../settings/use-im-accounts.jsx";
import { IntegrationStatusPill } from "../settings/integration-status-pill.jsx";
import { IntegrationMoreMenu } from "../settings/integration-more-menu.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import { MediaUnpreviewableFallback } from "../generation/missing-asset-card.jsx";
import { FileTypeBadge } from "../assets/inline-input.jsx";
import {
  DropdownMenu,
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  ActionContextMenuContent,
  ActionContextMenuItem,
  ActionContextMenuSeparator,
  ActionContextMenuSubContent,
  ActionContextMenuSubTrigger,
  ActionDropdownMenuContent,
  ActionDropdownMenuItem,
  ActionDropdownMenuSeparator,
  ContextMenuSub,
  ContextMenuTrigger,
} from "../workspace/context-menu-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  DialogDescription,
  DialogTitle,
  Textarea,
} from "../infra/badge-variants.jsx";
import { ContextMenu } from "../workspace/topbar-state-context.jsx";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "../infra/inline-rename-input.jsx";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../team/alert-variants.jsx";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  FolderOpen,
  Trash2,
} from "./package.jsx";
import { ToggleGroup, ToggleGroupItem } from "../infra/use-online.jsx";
import { Toggle } from "../assets/rename-local-node-dialog.jsx";
import { Switch } from "../generation/select-content.jsx";
import { Spinner } from "../team/use-team-transactions-feed-query.jsx";
import { SliderSection } from "./slider-section.jsx";
function DialogTrigger({ ...props }) {
  return <DialogTrigger$1 data-slot="dialog-trigger" {...props} />;
}
function AlertDialogTrigger({ ...props }) {
  return <DialogTrigger$1 data-slot="alert-dialog-trigger" {...props} />;
}
function SheetTrigger({ ...props }) {
  return <DialogTrigger$1 data-slot="sheet-trigger" {...props} />;
}
function AccordionSection() {
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
function ActionListSection() {
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
      <p className="text-xs text-muted-foreground">
        {t2("uiSpec.actionList.states")}
      </p>
      <VariantGrid label={t2("uiSpec.actionList.inline")}>
        <ActionListPanel
          className="w-60 max-w-full"
          data-action-ui-id="ui-spec-list-panel"
        >
          <ActionListItem
            onClick={() => handleAction("open")}
            data-action-ui-id="ui-spec-list-open"
          >
            <FolderOpen
              className="size-4"
              strokeWidth={1.5}
              aria-hidden={true}
            />
            {openLabel}
          </ActionListItem>
          <ActionListItem
            onClick={() => handleAction("copy")}
            data-action-ui-id="ui-spec-list-copy"
          >
            <Copy className="size-4" strokeWidth={1.5} aria-hidden={true} />
            {copyLabel}
          </ActionListItem>
          <ActionListItem
            disabled={true}
            data-action-ui-id="ui-spec-list-disabled"
          >
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
            render={<Button size="sm" variant="outline" />}
            data-action-ui-id="ui-spec-list-dropdown-trigger"
          >
            {t2("uiSpec.actionList.dropdown")}
          </DropdownMenuTrigger>
          <ActionDropdownMenuContent
            className="w-60"
            data-action-ui-id="ui-spec-list-dropdown"
          >
            <ActionDropdownMenuItem
              data-action-ui-id="ui-spec-list-dropdown-open"
              onClick={() => handleAction("open")}
            >
              <FolderOpen
                className="size-4"
                strokeWidth={1.5}
                aria-hidden={true}
              />
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
          <ActionContextMenuContent
            className="w-60"
            data-action-ui-id="ui-spec-list-context"
          >
            <ActionContextMenuItem
              data-action-ui-id="ui-spec-list-context-open"
              onClick={() => handleAction("open")}
            >
              <FolderOpen
                className="size-4"
                strokeWidth={1.5}
                aria-hidden={true}
              />
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
                  <Copy
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden={true}
                  />
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
function AlertSection() {
  return (
    <ComponentSection name="Alert" importPath="@/components/ui/alert">
      <VariantGrid label="Default">
        <Alert className="w-full">
          <Info />
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
function AlertDialogSection() {
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
              <Button size="xs" variant="destructive">
                删除
              </Button>
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
function AvatarSection() {
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
function BadgeSection() {
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
function ButtonSection() {
  return (
    <ComponentSection
      name="Button"
      importPath="@/components/ui/button"
      description="6 variants × 4 sizes，含 loading/disabled。"
    >
      <VariantGrid label="Variants">
        <Button>Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </VariantGrid>
      <VariantGrid label="Sizes">
        <Button size="xs">xs</Button>
        <Button size="sm">sm</Button>
        <Button size="default">default</Button>
        <Button size="lg">lg</Button>
      </VariantGrid>
      <VariantGrid label="Icon Sizes">
        <Button size="icon-xs" aria-label="icon-xs">
          +
        </Button>
        <Button size="icon-sm" aria-label="icon-sm">
          +
        </Button>
        <Button size="icon" aria-label="icon">
          +
        </Button>
        <Button size="icon-lg" aria-label="icon-lg">
          +
        </Button>
      </VariantGrid>
      <VariantGrid label="States">
        <Button disabled={true}>Disabled</Button>
        <Button loading={true}>Loading</Button>
      </VariantGrid>
    </ComponentSection>
  );
}
function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}
function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t p-4 group-data-[size=sm]/card:p-3",
        className,
      )}
      {...props}
    />
  );
}
function CardSection() {
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
              <Button size="xs" variant="ghost">
                Action
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>正文内容</CardContent>
          <CardFooter>
            <Button size="xs">确认</Button>
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
function CheckboxSection() {
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
      <p className="text-xs text-muted-foreground">
        {t2("uiSpec.checkbox.states")}
      </p>
      {["square", "circle"].flatMap((shape) =>
        ["sm", "md", "lg"].map((size2) => (
          <VariantGrid key={`${shape}-${size2}`} label={`${shape} / ${size2}`}>
            <Checkbox
              shape={shape}
              size={size2}
              aria-label={`${shape} ${size2} unchecked`}
            />
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
          <Checkbox
            shape="circle"
            appearance="card"
            aria-label="card unchecked"
          />
          <Checkbox
            shape="circle"
            appearance="card"
            defaultChecked={true}
            aria-label="card checked"
          />
          <Checkbox
            shape="circle"
            appearance="card"
            indeterminate={true}
            aria-label="card mixed"
          />
        </div>
      </VariantGrid>
      <div className="max-w-60">
        <Checkbox
          label={t2("uiSpec.checkbox.label")}
          description={t2("uiSpec.checkbox.help")}
        />
      </div>
    </ComponentSection>
  );
}
function ContextMenuSection() {
  const { t: t2 } = useTranslation();
  return (
    <ComponentSection
      name="ContextMenu"
      importPath="@/modules/base/action-list"
    >
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
            <ActionContextMenuItem
              variant="destructive"
              data-action-ui-id="ui-spec-context-delete"
            >
              {t2("common.delete")}
            </ActionContextMenuItem>
          </ActionContextMenuContent>
        </ContextMenu>
      </VariantGrid>
    </ComponentSection>
  );
}
function DialogSection() {
  return (
    <ComponentSection name="Dialog" importPath="@/components/ui/dialog">
      <VariantGrid label="Default">
        <Dialog>
          <DialogTrigger render={<Button size="xs">打开 Dialog</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>对话框标题</DialogTitle>
              <DialogDescription>这是一段描述文本。</DialogDescription>
            </DialogHeader>
            <p className="text-xs">主体内容区。</p>
            <DialogFooter>
              <Button size="sm" variant="ghost">
                取消
              </Button>
              <Button size="sm">确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </VariantGrid>
    </ComponentSection>
  );
}
function DropdownMenuSection() {
  const { t: t2 } = useTranslation();
  return (
    <ComponentSection
      name="DropdownMenu"
      importPath="@/modules/base/action-list"
    >
      <VariantGrid label={t2("uiSpec.actionList.dropdown")}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="xs" />}
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
function FileTypeIconSection() {
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
      <p className="text-xs text-muted-foreground">
        {t2("uiSpec.fileTypeIcon.colors")}
      </p>
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
          <MediaUnpreviewableFallback
            displayName="poster.psd"
            extension=".psd"
          />
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
          <FileTypeIcon
            {...psd}
            readFailure={true}
            size={48}
            decorative={true}
          />
          <span className="text-xs">
            {t2("uiSpec.fileTypeIcon.readFailure")}
          </span>
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
              <span className="text-xs text-muted-foreground">
                {ext.toUpperCase()}
              </span>
            </div>
          ))}
      </VariantGrid>
    </ComponentSection>
  );
}
function InputSection() {
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
        <Input3
          placeholder="搜索..."
          startIcon={<Search />}
          className="w-full"
        />
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
function IntegrationRowSection() {
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
                Connected integrations use a stable two-line subtitle area and
                fixed action slot.
              </p>
            </div>
            <IntegrationActionGroup>
              <IntegrationActionButton
                variant="outline"
                leadingIcon={
                  <PlaybackPauseIcon className="size-3.5 text-foreground/70" />
                }
              >
                Pause
              </IntegrationActionButton>
              <IntegrationMoreMenu
                triggerLabel="More"
                actionLabel="Remove account"
                actionIcon={
                  <Trash2Icon className="size-3.5" strokeWidth={1.5} />
                }
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
          markerIcon={
            <PlaybackPauseIcon className="size-2.5 text-warning/80" />
          }
          markerLabel="status:paused"
        />
        <IntegrationStatusPill
          label="Needs auth"
          tone="warning"
          markerTone="warning"
          markerActive={true}
          markerLabel="status:needs-auth"
          tooltipContent={
            <span>Use tooltip only for extra state context.</span>
          }
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
          leadingIcon={<PlaybackPlayIcon className="size-3.5" />}
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
function KbdSection() {
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
function LabelSection() {
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
function PopoverSection() {
  return (
    <ComponentSection name="Popover" importPath="@/components/ui/popover">
      <VariantGrid label="Default">
        <Popover>
          <PopoverTrigger render={<Button size="xs">打开 Popover</Button>} />
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
function ProgressSection() {
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
function RadioGroupSection() {
  return (
    <ComponentSection
      name="RadioGroup"
      importPath="@/components/ui/radio-group"
    >
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
function ResizeColHandleSection() {
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
            <span className="text-[10px] text-muted-foreground">
              Adjacent surface
            </span>
          </div>
        </div>
      </VariantGrid>
    </ComponentSection>
  );
}
function SelectSection() {
  return (
    <ComponentSection
      name="Select"
      importPath="@/components/ui/select"
      description="带 Trigger / Content / Item 子组件。"
    >
      <VariantGrid label="Default">
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="请选择..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">苹果</SelectItem>
            <SelectItem value="banana">香蕉</SelectItem>
            <SelectItem value="cherry">樱桃</SelectItem>
          </SelectContent>
        </Select>
      </VariantGrid>
    </ComponentSection>
  );
}
function Separator({ className, orientation = "horizontal", ...props }) {
  return (
    <Separator$1
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-[var(--divider-width)] data-horizontal:w-full data-vertical:w-[var(--divider-width)] data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}
function SeparatorSection() {
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
function SheetSection() {
  return (
    <ComponentSection
      name="Sheet"
      importPath="@/components/ui/sheet"
      description="侧滑面板，4 个 side 方向。"
    >
      <VariantGrid label="Side Right">
        <Sheet>
          <SheetTrigger render={<Button size="xs">右侧打开</Button>} />
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
          <SheetTrigger render={<Button size="xs">左侧打开</Button>} />
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
function SkeletonSection() {
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
function SpinnerSection() {
  return (
    <ComponentSection name="Spinner" importPath="@/components/ui/spinner">
      <VariantGrid label="Sizes">
        <Spinner className="size-3" />
        <Spinner className="size-4" />
        <Spinner className="size-5" />
        <Spinner className="size-6" />
      </VariantGrid>
    </ComponentSection>
  );
}
function SwitchSection() {
  return (
    <ComponentSection name="Switch" importPath="@/components/ui/switch">
      <VariantGrid label="States">
        <Switch aria-label="off" />
        <Switch defaultChecked={true} aria-label="on" />
        <Switch disabled={true} aria-label="disabled" />
        <Switch
          disabled={true}
          defaultChecked={true}
          aria-label="disabled on"
        />
      </VariantGrid>
    </ComponentSection>
  );
}
function TabsSection() {
  return (
    <ComponentSection name="Tabs" importPath="@/components/ui/tabs">
      <VariantGrid label="Default">
        <Tabs defaultValue="a" className="w-full">
          <TabsList>
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
            <TabsTrigger value="c">Tab C</TabsTrigger>
          </TabsList>
          <TabsContent value="a">
            <p className="text-[10px] py-2">A 内容</p>
          </TabsContent>
          <TabsContent value="b">
            <p className="text-[10px] py-2">B 内容</p>
          </TabsContent>
          <TabsContent value="c">
            <p className="text-[10px] py-2">C 内容</p>
          </TabsContent>
        </Tabs>
      </VariantGrid>
    </ComponentSection>
  );
}
function TextareaSection() {
  return (
    <ComponentSection name="Textarea" importPath="@/components/ui/textarea">
      <VariantGrid label="Default">
        <Textarea placeholder="多行文本..." className="w-full" rows={3} />
      </VariantGrid>
      <VariantGrid label="Disabled">
        <Textarea
          placeholder="disabled"
          disabled={true}
          className="w-full"
          rows={2}
        />
      </VariantGrid>
    </ComponentSection>
  );
}
function ToggleSection() {
  return (
    <ComponentSection name="Toggle" importPath="@/components/ui/toggle">
      <VariantGrid label="Default">
        <Toggle aria-label="bold">
          <Bold className="size-3.5" />
        </Toggle>
        <Toggle defaultPressed={true} aria-label="italic">
          <Italic className="size-3.5" />
        </Toggle>
        <Toggle disabled={true} aria-label="underline">
          <Underline className="size-3.5" />
        </Toggle>
      </VariantGrid>
      <VariantGrid label="With Text">
        <Toggle>OFF</Toggle>
        <Toggle defaultPressed={true}>ON</Toggle>
      </VariantGrid>
    </ComponentSection>
  );
}
function ToggleGroupSection() {
  return (
    <ComponentSection
      name="ToggleGroup"
      importPath="@/components/ui/toggle-group"
    >
      <VariantGrid label="Single (default)">
        <ToggleGroup defaultValue={["left"]} aria-label="text alignment">
          <ToggleGroupItem value="left" aria-label="left">
            <AlignLeft className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="center">
            <AlignCenter className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="right">
            <AlignRight className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </VariantGrid>
    </ComponentSection>
  );
}
function TooltipSection() {
  return (
    <ComponentSection
      name="Tooltip"
      importPath="@/components/ui/tooltip"
      description="必须用 TooltipProvider 包裹。"
    >
      <VariantGrid label="Default">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<Button size="xs">悬停</Button>} />
            <TooltipContent>这是 tooltip 内容</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </VariantGrid>
    </ComponentSection>
  );
}
export const SECTION_REGISTRY = [
  {
    id: "button",
    Component: ButtonSection,
  },
  {
    id: "badge",
    Component: BadgeSection,
  },
  {
    id: "input",
    Component: InputSection,
  },
  {
    id: "textarea",
    Component: TextareaSection,
  },
  {
    id: "label",
    Component: LabelSection,
  },
  {
    id: "card",
    Component: CardSection,
  },
  {
    id: "separator",
    Component: SeparatorSection,
  },
  {
    id: "checkbox",
    Component: CheckboxSection,
  },
  {
    id: "file-type-icon",
    Component: FileTypeIconSection,
  },
  {
    id: "switch",
    Component: SwitchSection,
  },
  {
    id: "integration-row",
    Component: IntegrationRowSection,
  },
  {
    id: "radio-group",
    Component: RadioGroupSection,
  },
  {
    id: "resize-col-handle",
    Component: ResizeColHandleSection,
  },
  {
    id: "slider",
    Component: SliderSection,
  },
  {
    id: "select",
    Component: SelectSection,
  },
  {
    id: "toggle",
    Component: ToggleSection,
  },
  {
    id: "toggle-group",
    Component: ToggleGroupSection,
  },
  {
    id: "tabs",
    Component: TabsSection,
  },
  {
    id: "accordion",
    Component: AccordionSection,
  },
  {
    id: "avatar",
    Component: AvatarSection,
  },
  {
    id: "progress",
    Component: ProgressSection,
  },
  {
    id: "spinner",
    Component: SpinnerSection,
  },
  {
    id: "skeleton",
    Component: SkeletonSection,
  },
  {
    id: "alert",
    Component: AlertSection,
  },
  {
    id: "kbd",
    Component: KbdSection,
  },
  {
    id: "tooltip",
    Component: TooltipSection,
  },
  {
    id: "dialog",
    Component: DialogSection,
  },
  {
    id: "alert-dialog",
    Component: AlertDialogSection,
  },
  {
    id: "sheet",
    Component: SheetSection,
  },
  {
    id: "popover",
    Component: PopoverSection,
  },
  {
    id: "action-list",
    Component: ActionListSection,
  },
  {
    id: "dropdown-menu",
    Component: DropdownMenuSection,
  },
  {
    id: "context-menu",
    Component: ContextMenuSection,
  },
];
