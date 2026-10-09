// parse-page-state-preview-schema.jsx
import { useTranslation, reactExports, Copy, ChevronDown, Search, ActionListPanel, ActionListItem, ActionListSeparator, Bold$1, Italic$1, Underline$1, Pencil, Tag$1, ICON_STROKE_SPEC, Volume2, Maximize, PlaybackCircleToggleIcon } from "../vendor.js";
import { Tooltip, TooltipTrigger, Icon, TooltipProvider, PlaybackPauseIcon, MoreVerticalIcon } from "../m15/graph.jsx";
import { Trash2, AlignLeft, AlignCenter, AlignRight, VolumeX } from "../m15/parse-item.jsx";
import { isRecord, isActionVariant, ACTION_VARIANTS, ACTION_PLACEMENTS, ACTION_ICON_KEYS, ACTION_ICONS } from "../m15/parse-timeline-operations.js";
import { invalid, isActionIcon } from "../m15/split-pinned-inventory.js";
import { useTheme } from "../m15/use-resizable-width.js";
import {
  TooltipContent,
  Button$1,
  Textarea,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../m08/shortcut-categories.jsx";
import {
  RetryIcon,
  PlaybackCirclePlayIcon,
  PlaybackCirclePauseIcon,
  PlaybackStopIcon,
  PlaybackNextIcon,
  PlaybackPreviousIcon,
  PlaybackPlayIcon,
  MoreHorizontalIcon,
  FilledSkillIcon,
  StrokeIcon,
  ICON_TEXT_SPEC,
  FeedbackIcon,
} from "../m08/browser-inspiration-urls.jsx";
import { ToggleGroup, ToggleGroupItem } from "../asset-center/shared/misc-02.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { Switch } from "../m01/calc-video-cost-breakdown.jsx";
import { Spinner } from "../m09/use-team-transactions-feed-query.jsx";
import { Toggle } from "../m11/team-assets-sidebar-panel.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  AccordionSection,
  ActionListSection,
  AlertDialogSection,
  AlertSection,
  AvatarSection,
  BadgeSection,
  ButtonSection,
  CardSection,
  CheckboxSection,
  ComponentSection,
  ContextMenuSection,
  DialogSection,
  DropdownMenuSection,
  FileTypeIconSection,
  InputSection,
  IntegrationRowSection,
  KbdSection,
  LabelSection,
  PopoverSection,
  ProgressSection,
  RadioGroupSection,
  ResizeColHandleSection,
  SelectSection,
  SeparatorSection,
  SheetSection,
  SkeletonSection,
  SliderSection,
  VariantGrid,
} from "./slider-section.jsx";
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
        <Switch disabled={true} defaultChecked={true} aria-label="disabled on" />
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
        <Textarea placeholder="disabled" disabled={true} className="w-full" rows={2} />
      </VariantGrid>
    </ComponentSection>
  );
}
function ToggleSection() {
  return (
    <ComponentSection name="Toggle" importPath="@/components/ui/toggle">
      <VariantGrid label="Default">
        <Toggle aria-label="bold">
          <Bold$1 className="size-3.5" />
        </Toggle>
        <Toggle defaultPressed={true} aria-label="italic">
          <Italic$1 className="size-3.5" />
        </Toggle>
        <Toggle disabled={true} aria-label="underline">
          <Underline$1 className="size-3.5" />
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
    <ComponentSection name="ToggleGroup" importPath="@/components/ui/toggle-group">
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
            <TooltipTrigger render={<Button$1 size="xs">悬停</Button$1>} />
            <TooltipContent>这是 tooltip 内容</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </VariantGrid>
    </ComponentSection>
  );
}
const SECTION_REGISTRY = [
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
export function ComponentsLibrary() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground">
        {"全部 "}
        {SECTION_REGISTRY.length}
        {" 个基础组件 + 主要 variant。"}
      </p>
      {SECTION_REGISTRY.map(({ id: id2, Component }) => (
        <Component key={id2} />
      ))}
    </div>
  );
}
const ENTRIES = [
  {
    name: "PlaybackCirclePlayIcon",
    Glyph: PlaybackCirclePlayIcon,
    usage: "circlePlay",
    path: "@hilo/canvas/icons",
    locations: "circle-fill / AudioNode / AudioPreviewPlayer / AttachmentUploadZone",
  },
  {
    name: "PlaybackCirclePauseIcon",
    Glyph: PlaybackCirclePauseIcon,
    usage: "circlePause",
    path: "@hilo/canvas/icons",
    locations: "circle-fill / AudioNode / AudioPreviewPlayer / AttachmentUploadZone",
  },
  {
    name: "PlaybackStopIcon",
    Glyph: PlaybackStopIcon,
    usage: "stop",
    path: "@hilo/canvas/icons",
    locations: "CircleStop compatibility / TrackingBubbles",
  },
  {
    name: "PlaybackNextIcon",
    Glyph: PlaybackNextIcon,
    usage: "next",
    path: "@hilo/canvas/icons",
    locations: "Media controls / UI component preview",
  },
  {
    name: "PlaybackPreviousIcon",
    Glyph: PlaybackPreviousIcon,
    usage: "previous",
    path: "@hilo/canvas/icons",
    locations: "Media controls / UI component preview",
  },
  {
    name: "PlaybackPlayIcon",
    Glyph: PlaybackPlayIcon,
    usage: "play",
    path: "modules/base/icon/playback.tsx",
    locations:
      "MarkdownMediaCard / assetGridItem / EmptyChatRecommendations / FeaturePopup / ProjectAssetThumbnail / IntegrationLifecycleToggleButton / RunIcon",
  },
  {
    name: "PlaybackPauseIcon",
    Glyph: PlaybackPauseIcon,
    usage: "pause",
    path: "modules/base/icon/playback.tsx",
    locations: "MarkdownAudio / ConnectorStatusPill / ImBridgeManager",
  },
  {
    name: "MoreVerticalIcon",
    Glyph: MoreVerticalIcon,
    usage: "more",
    path: "modules/base/icon/more-vertical.tsx",
    locations: "IntegrationMoreMenu",
  },
  {
    name: "MoreHorizontalIcon",
    Glyph: MoreHorizontalIcon,
    usage: "legacyMore",
    path: "modules/base/icon/more-horizontal.tsx",
    locations: "modules/base/icon (legacy export)",
  },
  {
    name: "FilledSkillIcon",
    Glyph: FilledSkillIcon,
    usage: "skill",
    path: "modules/base/icon/filled-skill.tsx",
    locations: "media cover Skill action",
  },
];
function FilledCatalog({ size: size2 }) {
  const { t: t2 } = useTranslation();
  const [query, setQuery] = reactExports.useState("");
  const matches2 = ENTRIES.filter((entry) =>
    [entry.name, entry.path, entry.locations, t2(`uiSpec.icons.usage.${entry.usage}`)]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{t2("uiSpec.icons.filledTitle")}</h3>
      <p className="text-xs text-muted-foreground">{t2("uiSpec.icons.filledScope")}</p>
      <Input3
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t2("uiSpec.icons.search")}
        placeholder={t2("uiSpec.icons.search")}
        data-action-ui-id="ui-spec-icons-search"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {matches2.map(({ name: name2, Glyph, usage, path: path2, locations }) => (
          <article
            key={name2}
            className="flex gap-3 rounded-lg border border-border p-3"
            data-action-ui-id={`ui-spec-icons-catalog-${name2}`}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <Glyph size={size2} />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="break-all text-xs font-medium">{name2}</p>
              <p className="text-xs text-muted-foreground">{t2(`uiSpec.icons.usage.${usage}`)}</p>
              <code className="block break-all text-[10px] text-muted-foreground">{path2}</code>
              <p className="break-words text-[10px] text-muted-foreground">{locations}</p>
            </div>
          </article>
        ))}
      </div>
      {matches2.length === 0 && (
        <p role="status" className="text-xs text-muted-foreground">
          {t2("uiSpec.icons.noResults")}
        </p>
      )}
    </section>
  );
}
const ROWS = [
  {
    key: "copy",
    label: "common.copy",
    icon: Copy,
  },
  {
    key: "rename",
    label: "common.rename",
    icon: Pencil,
  },
  {
    key: "tags",
    label: "assetCenter.create.tagsLabel",
    icon: Tag$1,
  },
];
function ListPairingPreview({ disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const [textSize, setTextSize] = reactExports.useState(14);
  const [weight, setWeight] = reactExports.useState(400);
  const [lastAction, setLastAction] = reactExports.useState("");
  const previewStyle = {
    "--action-list-font-size": `${textSize}px`,
    "--action-list-font-weight": weight,
  };
  return (
    <section className="space-y-3" data-action-ui-id="ui-spec-icons-list-pairing">
      <h3 className="text-sm font-medium">{t2("uiSpec.icons.listPairing.title")}</h3>
      <p className="text-xs text-muted-foreground">{t2("uiSpec.icons.listPairing.note")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs">{t2("uiSpec.icons.listPairing.textSize")}</span>
        {[12, 14, 16].map((value) => (
          <Button$1
            key={value}
            size="xs"
            variant={textSize === value ? "default" : "outline"}
            aria-pressed={textSize === value}
            onClick={() => setTextSize(value)}
            data-action-ui-id={`ui-spec-icons-list-text-${value}`}
          >
            {value}px
          </Button$1>
        ))}
        {[400, 500].map((value) => (
          <Button$1
            key={value}
            size="xs"
            variant={weight === value ? "default" : "outline"}
            aria-pressed={weight === value}
            onClick={() => setWeight(value)}
            data-action-ui-id={`ui-spec-icons-list-weight-${value}`}
          >
            {t2(
              value === 400
                ? "uiSpec.icons.listPairing.regular"
                : "uiSpec.icons.listPairing.medium",
            )}
          </Button$1>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ICON_STROKE_SPEC.filter(({ size: size2 }) => size2 !== 32).map(
          ({ size: size2, stroke }) => (
            <div
              key={size2}
              className="min-w-0 space-y-2"
              data-action-ui-id={`ui-spec-icons-list-${size2}`}
            >
              <p className="text-xs font-medium">
                {t2("uiSpec.icons.listPairing.tier", {
                  size: size2,
                  stroke,
                })}
              </p>
              <ActionListPanel style={previewStyle}>
                {ROWS.map(({ key: key2, label, icon }) => (
                  <ActionListItem
                    key={key2}
                    disabled={disabled2}
                    onClick={() => setLastAction(t2(label))}
                    data-action-ui-id={`ui-spec-icons-list-${size2}-${key2}`}
                  >
                    <StrokeIcon icon={icon} size={size2} />
                    <span className="min-w-0 truncate">{t2(label)}</span>
                  </ActionListItem>
                ))}
                <ActionListItem disabled={true}>
                  <StrokeIcon icon={Copy} size={size2} />
                  <span className="min-w-0 truncate">
                    {t2("uiSpec.icons.listPairing.disabledRow")}
                  </span>
                </ActionListItem>
                <ActionListSeparator />
                <ActionListItem
                  variant="destructive"
                  disabled={disabled2}
                  onClick={() => setLastAction(t2("common.delete"))}
                  data-action-ui-id={`ui-spec-icons-list-${size2}-delete`}
                >
                  <StrokeIcon icon={Trash2} size={size2} />
                  <span className="min-w-0 truncate">{t2("common.delete")}</span>
                </ActionListItem>
              </ActionListPanel>
            </div>
          ),
        )}
      </div>
      <p role="status" className="min-h-4 text-xs text-muted-foreground">
        {lastAction
          ? t2("uiSpec.icons.listPairing.feedback", {
              action: lastAction,
            })
          : t2("uiSpec.icons.listPairing.hint")}
      </p>
    </section>
  );
}
const GLYPHS = {
  previous: PlaybackPreviousIcon,
  play: PlaybackPlayIcon,
  pause: PlaybackPauseIcon,
  stop: PlaybackStopIcon,
  next: PlaybackNextIcon,
};
function MediaGlyph({ action, size: size2 }) {
  const Glyph = GLYPHS[action];
  return (
    <Glyph
      size={size2}
      style={{
        width: size2,
        height: size2,
      }}
    />
  );
}
const ACTIONS = ["previous", "play", "pause", "stop", "next"];
function MediaPreview({ size: size2, disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const [playing, setPlaying] = reactExports.useState(false);
  const [muted, setMuted] = reactExports.useState(false);
  const [episode, setEpisode] = reactExports.useState(2);
  const action = playing ? "pause" : "play";
  const Volume = muted ? VolumeX : Volume2;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{t2("uiSpec.icons.mediaTitle")}</h3>
      <p className="text-xs text-muted-foreground">{t2("uiSpec.icons.mediaHint")}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border">
              {["meaning", "filled", "decision"].map((key2) => (
                <th key={key2} className="whitespace-nowrap p-2 font-medium">
                  {t2(`uiSpec.icons.${key2}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTIONS.map((item) => (
              <tr
                key={item}
                className="border-b border-border"
                data-action-ui-id={`ui-spec-icons-row-${item}`}
              >
                <th className="whitespace-nowrap p-2 font-normal">
                  {t2(`uiSpec.icons.action.${item}`)}
                </th>
                <td className="p-2">
                  <Button$1
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    disabled={disabled2}
                    aria-label={t2(`uiSpec.icons.action.${item}`)}
                    data-action-ui-id={`ui-spec-icons-sample-${item}-filled`}
                  >
                    <MediaGlyph action={item} size={size2} />
                  </Button$1>
                </td>
                <td className="max-w-64 p-2 text-muted-foreground">
                  {t2("uiSpec.icons.existingMedia")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-xs text-muted-foreground">{t2("uiSpec.icons.sceneHint")}</p>
        <div className="flex flex-wrap items-center gap-2" data-action-ui-id="ui-spec-icons-player">
          <Button$1
            variant="ghost"
            size="icon"
            disabled={disabled2 || episode === 1}
            aria-label={t2("uiSpec.icons.action.previous")}
            onClick={() => {
              setEpisode(episode - 1);
              setPlaying(false);
            }}
            data-action-ui-id="ui-spec-icons-previous"
          >
            <MediaGlyph action="previous" size={size2} />
          </Button$1>
          <Button$1
            variant="ghost"
            size="icon"
            disabled={disabled2}
            aria-label={t2(`uiSpec.icons.action.${action}`)}
            onClick={() => setPlaying(!playing)}
            className="rounded-full border-0 bg-transparent p-0 hover:bg-transparent hover:opacity-90"
            data-action-ui-id="ui-spec-icons-play-toggle"
          >
            <MediaGlyph action={action} size={size2} />
          </Button$1>
          <Button$1
            variant="ghost"
            size="icon"
            disabled={disabled2 || episode === 3}
            aria-label={t2("uiSpec.icons.action.next")}
            onClick={() => {
              setEpisode(episode + 1);
              setPlaying(false);
            }}
            data-action-ui-id="ui-spec-icons-next"
          >
            <MediaGlyph action="next" size={size2} />
          </Button$1>
          <span className="mr-auto text-xs tabular-nums" role="status">
            {t2("uiSpec.icons.episode", {
              episode,
            })}
          </span>
          <Button$1
            variant="ghost"
            size="icon"
            disabled={disabled2}
            aria-label={t2("uiSpec.icons.mute")}
            aria-pressed={muted}
            onClick={() => setMuted(!muted)}
            data-action-ui-id="ui-spec-icons-mute"
          >
            <Volume size={size2} strokeWidth={1.5} aria-hidden={true} />
          </Button$1>
          <span
            className="flex size-8 items-center justify-center"
            title={t2("uiSpec.icons.auxiliary")}
          >
            <Maximize size={size2} strokeWidth={1.5} aria-hidden={true} />
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">{t2("uiSpec.icons.thumbnailScene")}</p>
          <div className="flex h-24 items-center justify-center rounded-md bg-[var(--modal-mask-bg)]">
            <Button$1
              size="icon-lg"
              disabled={disabled2}
              aria-label={t2(`uiSpec.icons.action.${action}`)}
              onClick={() => setPlaying(!playing)}
              className="rounded-full border-0 bg-transparent p-0 hover:bg-transparent hover:opacity-90"
              data-action-ui-id="ui-spec-icons-thumbnail-toggle"
            >
              <span className="text-[var(--media-overlay-foreground)] drop-shadow-sm">
                <MediaGlyph action={action} size={20} />
              </span>
            </Button$1>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">{t2("uiSpec.icons.audioScene")}</p>
          <div className="flex h-24 items-center gap-3 rounded-md bg-muted px-3">
            <Button$1
              size="icon-sm"
              disabled={disabled2}
              aria-label={t2(`uiSpec.icons.action.${action}`)}
              onClick={() => setPlaying(!playing)}
              className="rounded-full border-0 bg-transparent p-0 hover:bg-transparent hover:opacity-90"
              data-action-ui-id="ui-spec-icons-audio-toggle"
            >
              <PlaybackCircleToggleIcon playing={playing} size={28} className="size-full" />
            </Button$1>
            <div className="h-1 flex-1 rounded-full bg-foreground/10" aria-hidden={true}>
              <div className="h-full w-1/3 rounded-full bg-foreground/50" />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">0:12 / 0:36</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t2("uiSpec.icons.sceneBoundary")}</p>
    </section>
  );
}
function StrokeSpec() {
  const { t: t2 } = useTranslation();
  return (
    <section className="space-y-3" data-action-ui-id="ui-spec-icons-stroke-spec">
      <h3 className="text-sm font-medium">{t2("uiSpec.icons.stroke.title")}</h3>
      <p className="text-xs text-muted-foreground">{t2("uiSpec.icons.stroke.note")}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <thead>
            <tr className="border-b border-border">
              {["size", "target", "source", "sample", "scene"].map((key2) => (
                <th key={key2} scope="col" className="p-2 font-medium">
                  {t2(`uiSpec.icons.stroke.${key2}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ICON_STROKE_SPEC.map(({ size: size2, stroke }) => (
              <tr key={size2} className="border-b border-border">
                <th scope="row" className="p-2 font-normal">
                  {size2}px
                </th>
                <td className="p-2">{stroke}px</td>
                <td className="p-2">{Number(((stroke * 24) / size2).toFixed(4))}</td>
                <td className="p-2">
                  <StrokeIcon icon={Search} size={size2} />
                </td>
                <td className="p-2">{t2(`uiSpec.icons.stroke.scene${size2}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3" data-action-ui-id="ui-spec-icons-text-pairing">
        <h4 className="text-sm font-medium">{t2("uiSpec.icons.pairing.title")}</h4>
        <p className="text-xs text-muted-foreground">{t2("uiSpec.icons.pairing.note")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {["compact", "menu", "button"].map((key2) => (
            <div key={key2} className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{t2(`uiSpec.icons.pairing.${key2}`)}</p>
              <div className={`flex items-center gap-2 ${ICON_TEXT_SPEC[key2].textClassName}`}>
                <StrokeIcon
                  icon={key2 === "compact" ? ChevronDown : Copy}
                  size={ICON_TEXT_SPEC[key2].iconSize}
                />
                <span>
                  {t2(key2 === "compact" ? "assetCenter.sort.updated_at" : "common.copy")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t2("uiSpec.icons.stroke.formula")}
      </p>
    </section>
  );
}
const LibraryCatalog = reactExports.lazy(() =>
  (() => import("../project-icon-catalog-CdFVT0Lu.js"))().then((module) => ({
    default: module.ProjectIconCatalog,
  })),
);
const OpacityPreview = reactExports.lazy(() =>
  (() => import("../index-BaJMuy1j.js"))().then((module) => ({
    default: module.IconOpacityPreviewSection,
  })),
);
const RULES = ["sizes", "stroke", "color", "weight", "surface", "hitArea", "interaction"];
const DECISIONS = ["transport", "auxiliary", "state", "special"];
export function IconPreview() {
  const { t: t2 } = useTranslation();
  const { theme: theme2, resolved, setTheme } = useTheme();
  const initialTheme = reactExports.useRef(theme2);
  const [size2, setSize] = reactExports.useState(16);
  const [disabled2, setDisabled] = reactExports.useState(false);
  const [showLibrary, setShowLibrary] = reactExports.useState(false);
  const [showDiagnostics, setShowDiagnostics] = reactExports.useState(false);
  reactExports.useEffect(() => () => setTheme(initialTheme.current), [setTheme]);
  return (
    <div
      className="space-y-6 text-foreground"
      data-action-ui-id="ui-spec-icons"
      data-icon-opacity-debug="section"
    >
      <header className="space-y-2">
        <h2 className="font-heading text-title-16 font-medium">{t2("uiSpec.icons.title")}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">{t2("uiSpec.icons.intro")}</p>
      </header>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <span className="text-xs">{t2("uiSpec.icons.size")}</span>
        {[12, 14, 16, 20].map((value) => (
          <Button$1
            key={value}
            size="xs"
            variant={size2 === value ? "default" : "outline"}
            aria-pressed={size2 === value}
            onClick={() => setSize(value)}
            data-action-ui-id={`ui-spec-icons-size-${value}`}
          >
            {value}px
          </Button$1>
        ))}
        <span className="ml-2 text-xs">{t2("uiSpec.icons.theme")}</span>
        {["light", "dark"].map((value) => (
          <Button$1
            key={value}
            size="xs"
            variant={resolved === value ? "default" : "outline"}
            aria-pressed={resolved === value}
            onClick={() => setTheme(value)}
            data-action-ui-id={`ui-spec-icons-theme-${value}`}
          >
            {t2(`uiSpec.icons.${value}`)}
          </Button$1>
        ))}
        <Button$1
          size="xs"
          variant={disabled2 ? "default" : "outline"}
          aria-pressed={disabled2}
          onClick={() => setDisabled(!disabled2)}
          data-action-ui-id="ui-spec-icons-disabled"
        >
          {t2("uiSpec.icons.disabled")}
        </Button$1>
      </div>
      <ListPairingPreview disabled={disabled2} />
      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t2("uiSpec.icons.currentRules")}</h3>
        <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground">
          {RULES.map((rule) => (
            <li key={rule}>{t2(`uiSpec.icons.rule.${rule}`)}</li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t2("uiSpec.icons.proposedRules")}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {DECISIONS.map((rule) => (
            <div key={rule} className="rounded-lg border border-border p-3">
              <h4 className="mb-1 text-xs font-medium">
                {t2(`uiSpec.icons.decision.${rule}.title`)}
              </h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t2(`uiSpec.icons.decision.${rule}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>
      <StrokeSpec />
      <MediaPreview size={size2} disabled={disabled2} />
      <FilledCatalog size={size2} />
      <section className="space-y-3 rounded-lg border border-border p-3">
        <h3 className="text-sm font-medium">{t2("uiSpec.icons.pendingTitle")}</h3>
        <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground">
          {["geometry", "semantics", "migration"].map((key2) => (
            <li key={key2}>{t2(`uiSpec.icons.pending.${key2}`)}</li>
          ))}
        </ul>
      </section>
      <details onToggle={(event) => setShowLibrary(event.currentTarget.open)}>
        <summary
          className="cursor-pointer text-sm font-medium"
          data-action-ui-id="ui-spec-icons-library"
        >
          {t2("uiSpec.icons.library")}
        </summary>
        <div className="pt-3">
          {showLibrary && (
            <reactExports.Suspense fallback={<p>{t2("uiSpec.icons.loading")}</p>}>
              <LibraryCatalog
                disabled={disabled2}
                opacity={1}
                revision={`${resolved}-${disabled2}`}
              />
            </reactExports.Suspense>
          )}
        </div>
      </details>
      <details onToggle={(event) => setShowDiagnostics(event.currentTarget.open)}>
        <summary
          className="cursor-pointer text-sm font-medium"
          data-action-ui-id="ui-spec-icons-diagnostics"
        >
          {t2("uiSpec.icons.diagnostics")}
        </summary>
        <div className="pt-3">
          {showDiagnostics && (
            <reactExports.Suspense fallback={<p>{t2("uiSpec.icons.loading")}</p>}>
              <OpacityPreview />
            </reactExports.Suspense>
          )}
        </div>
      </details>
    </div>
  );
}
export function parsePageStatePreviewSchema(source) {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    return invalid("Invalid JSON. The last valid preview is still shown.");
  }
  if (!isRecord(parsed)) return invalid("Schema must be a JSON object.");
  if (parsed.type !== "normal" && parsed.type !== "empty" && parsed.type !== "error") {
    return invalid('"type" must be "normal", "empty", or "error".');
  }
  if (parsed.type === "normal")
    return {
      state: {
        type: "normal",
      },
      error: null,
    };
  for (const field of ["title", "description", "text"]) {
    if (parsed[field] != null && typeof parsed[field] !== "string") {
      return invalid(`"${field}" must be a string.`);
    }
  }
  const rawActions = parsed.actions ?? [];
  if (!Array.isArray(rawActions)) return invalid('"actions" must be an array.');
  const actionKeys = new Set();
  const actions = [];
  for (const [index2, rawAction] of rawActions.entries()) {
    if (!isRecord(rawAction)) return invalid(`actions[${index2}] must be an object.`);
    const key2 = rawAction.key;
    const label = rawAction.label;
    const variant = rawAction.variant ?? "default";
    const placement = rawAction.placement ?? "inline";
    if (typeof key2 !== "string" || key2.trim() === "") {
      return invalid(`actions[${index2}].key must be a non-empty string.`);
    }
    if (actionKeys.has(key2)) return invalid(`Action key "${key2}" must be unique.`);
    if (typeof label !== "string" || label.trim() === "") {
      return invalid(`actions[${index2}].label must be a non-empty string.`);
    }
    if (!isActionVariant(variant)) {
      return invalid(`actions[${index2}].variant must be one of: ${ACTION_VARIANTS.join(", ")}.`);
    }
    if (typeof placement !== "string" || !ACTION_PLACEMENTS.includes(placement)) {
      return invalid(
        `actions[${index2}].placement must be one of: ${ACTION_PLACEMENTS.join(", ")}.`,
      );
    }
    if (rawAction.icon != null && !isActionIcon(rawAction.icon)) {
      return invalid(`actions[${index2}].icon must be one of: ${ACTION_ICON_KEYS.join(", ")}.`);
    }
    if (rawAction.disabled != null && typeof rawAction.disabled !== "boolean") {
      return invalid(`actions[${index2}].disabled must be a boolean.`);
    }
    if (rawAction.loading != null && typeof rawAction.loading !== "boolean") {
      return invalid(`actions[${index2}].loading must be a boolean.`);
    }
    const actionIcon =
      rawAction.icon == null
        ? void 0
        : rawAction.icon === "refresh-cw"
          ? reactExports.createElement(RetryIcon, {
              size: 14,
              "aria-hidden": true,
            })
          : rawAction.icon === "feedback" || rawAction.icon === "message-square-text"
            ? reactExports.createElement(FeedbackIcon, {
                size: 14,
                "aria-hidden": true,
              })
            : reactExports.createElement(Icon, {
                icon: ACTION_ICONS[rawAction.icon],
                size: "sm",
                "aria-hidden": true,
              });
    actionKeys.add(key2);
    actions.push({
      key: key2,
      icon: actionIcon,
      label,
      variant,
      placement,
      disabled: rawAction.disabled === true,
      loading: rawAction.loading === true,
      onClick: () => void 0,
    });
  }
  const presentation = {
    title: typeof parsed.title === "string" ? parsed.title : void 0,
    description: typeof parsed.description === "string" ? parsed.description : void 0,
    text: typeof parsed.text === "string" ? parsed.text : void 0,
    actions,
  };
  if (parsed.type === "empty") {
    if (parsed.reason != null && parsed.reason !== "generic" && parsed.reason !== "project") {
      return invalid('For an empty state, "reason" must be "generic" or "project".');
    }
    return {
      state: {
        type: "empty",
        reason: parsed.reason === "project" ? "project" : "generic",
        ...presentation,
      },
      error: null,
    };
  }
  if (parsed.reason != null && parsed.reason !== "generic" && parsed.reason !== "network") {
    return invalid('For an error state, "reason" must be "generic" or "network".');
  }
  return {
    state: {
      type: "error",
      reason: parsed.reason === "network" ? "network" : "generic",
      ...presentation,
    },
    error: null,
  };
}
