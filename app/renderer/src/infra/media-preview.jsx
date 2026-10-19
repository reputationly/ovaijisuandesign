// ==== 逐文件收敛 ====
import { action } from "../canvas-v3/canvas-v3-model.js";
// media-preview.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { ActionListItem, ActionListPanel, ActionListSeparator } from "../media-editing/action-list.jsx";
import { ChevronDown, Copy, Maximize, Pencil, Search, Tag$1 as Tag, Volume2 } from "../media-editing/lucide-icon-wraps.js";
import { ICON_STROKE_SPEC } from "../media-editing/icon-compositing.js";
import { PlaybackCircleToggleIcon } from "../media-editing/playback-icons.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ICON_TEXT_SPEC, StrokeIcon } from "../workspace/use-prompt-icon.jsx";
import {
  MoreVerticalIcon,
  PlaybackPauseIcon,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  FilledSkillIcon,
  MoreHorizontalIcon,
  PlaybackCirclePauseIcon,
  PlaybackCirclePlayIcon,
  PlaybackNextIcon,
  PlaybackPlayIcon,
  PlaybackPreviousIcon,
  PlaybackStopIcon,
} from "../workspace/home-service.jsx";
import { Trash2, VolumeX } from "../media-editing/package.jsx";
import { Button } from "./dialog-content.jsx";
import { Input3 } from "./select-content.jsx";
import { useTheme } from "../generation/use-model-catalog-scope-key.js";
const ENTRIES = [
  {
    name: "PlaybackCirclePlayIcon",
    Glyph: PlaybackCirclePlayIcon,
    usage: "circlePlay",
    path: "@hilo/canvas/icons",
    locations:
      "circle-fill / AudioNode / AudioPreviewPlayer / AttachmentUploadZone",
  },
  {
    name: "PlaybackCirclePauseIcon",
    Glyph: PlaybackCirclePauseIcon,
    usage: "circlePause",
    path: "@hilo/canvas/icons",
    locations:
      "circle-fill / AudioNode / AudioPreviewPlayer / AttachmentUploadZone",
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
function FilledCatalog({ size }) {
  const { t } = useTranslation();
  const [query, setQuery] = reactExports.useState("");
  const matches = ENTRIES.filter((entry) =>
    [
      entry.name,
      entry.path,
      entry.locations,
      t(`uiSpec.icons.usage.${entry.usage}`),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{t("uiSpec.icons.filledTitle")}</h3>
      <p className="text-xs text-muted-foreground">
        {t("uiSpec.icons.filledScope")}
      </p>
      <Input3
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t("uiSpec.icons.search")}
        placeholder={t("uiSpec.icons.search")}
        data-action-ui-id="ui-spec-icons-search"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {matches.map(
          ({ name: iconName, Glyph, usage, path, locations }) => (
            <article
              key={iconName}
              className="flex gap-3 rounded-lg border border-border p-3"
              data-action-ui-id={`ui-spec-icons-catalog-${iconName}`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <Glyph size={size} />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="break-all text-xs font-medium">{iconName}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`uiSpec.icons.usage.${usage}`)}
                </p>
                <code className="block break-all text-[10px] text-muted-foreground">
                  {path}
                </code>
                <p className="break-words text-[10px] text-muted-foreground">
                  {locations}
                </p>
              </div>
            </article>
          ),
        )}
      </div>
      {matches.length === 0 && (
        <p role="status" className="text-xs text-muted-foreground">
          {t("uiSpec.icons.noResults")}
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
    icon: Tag,
  },
];
function ListPairingPreview({ disabled }) {
  const { t } = useTranslation();
  const [textSize, setTextSize] = reactExports.useState(14);
  const [weight, setWeight] = reactExports.useState(400);
  const [lastAction, setLastAction] = reactExports.useState("");
  const previewStyle = {
    "--action-list-font-size": `${textSize}px`,
    "--action-list-font-weight": weight,
  };
  return (
    <section
      className="space-y-3"
      data-action-ui-id="ui-spec-icons-list-pairing"
    >
      <h3 className="text-sm font-medium">
        {t("uiSpec.icons.listPairing.title")}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("uiSpec.icons.listPairing.note")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs">
          {t("uiSpec.icons.listPairing.textSize")}
        </span>
        {[12, 14, 16].map((value) => (
          <Button
            key={value}
            size="xs"
            variant={textSize === value ? "default" : "outline"}
            aria-pressed={textSize === value}
            onClick={() => setTextSize(value)}
            data-action-ui-id={`ui-spec-icons-list-text-${value}`}
          >
            {value}px
          </Button>
        ))}
        {[400, 500].map((value) => (
          <Button
            key={value}
            size="xs"
            variant={weight === value ? "default" : "outline"}
            aria-pressed={weight === value}
            onClick={() => setWeight(value)}
            data-action-ui-id={`ui-spec-icons-list-weight-${value}`}
          >
            {t(
              value === 400
                ? "uiSpec.icons.listPairing.regular"
                : "uiSpec.icons.listPairing.medium",
            )}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ICON_STROKE_SPEC.filter(({ size }) => size !== 32).map(
          ({ size, stroke }) => (
            <div
              key={size}
              className="min-w-0 space-y-2"
              data-action-ui-id={`ui-spec-icons-list-${size}`}
            >
              <p className="text-xs font-medium">
                {t("uiSpec.icons.listPairing.tier", {
                  size,
                  stroke,
                })}
              </p>
              <ActionListPanel style={previewStyle}>
                {ROWS.map(({ key, label, icon }) => (
                  <ActionListItem
                    key={key}
                    disabled={disabled}
                    onClick={() => setLastAction(t(label))}
                    data-action-ui-id={`ui-spec-icons-list-${size}-${key}`}
                  >
                    <StrokeIcon icon={icon} size={size} />
                    <span className="min-w-0 truncate">{t(label)}</span>
                  </ActionListItem>
                ))}
                <ActionListItem disabled={true}>
                  <StrokeIcon icon={Copy} size={size} />
                  <span className="min-w-0 truncate">
                    {t("uiSpec.icons.listPairing.disabledRow")}
                  </span>
                </ActionListItem>
                <ActionListSeparator />
                <ActionListItem
                  variant="destructive"
                  disabled={disabled}
                  onClick={() => setLastAction(t("common.delete"))}
                  data-action-ui-id={`ui-spec-icons-list-${size}-delete`}
                >
                  <StrokeIcon icon={Trash2} size={size} />
                  <span className="min-w-0 truncate">
                    {t("common.delete")}
                  </span>
                </ActionListItem>
              </ActionListPanel>
            </div>
          ),
        )}
      </div>
      <p role="status" className="min-h-4 text-xs text-muted-foreground">
        {lastAction
          ? t("uiSpec.icons.listPairing.feedback", {
              action: lastAction,
            })
          : t("uiSpec.icons.listPairing.hint")}
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
function MediaGlyph({ action: action2, size }) {
  const Glyph = GLYPHS[action];
  return (
    <Glyph
      size={size}
      style={{
        width: size,
        height: size,
      }}
    />
  );
}
const ACTIONS = ["previous", "play", "pause", "stop", "next"];
function MediaPreview({ size, disabled }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = reactExports.useState(false);
  const [muted, setMuted] = reactExports.useState(false);
  const [episode, setEpisode] = reactExports.useState(2);
  const action = playing ? "pause" : "play";
  const Volume = muted ? VolumeX : Volume2;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{t("uiSpec.icons.mediaTitle")}</h3>
      <p className="text-xs text-muted-foreground">
        {t("uiSpec.icons.mediaHint")}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border">
              {["meaning", "filled", "decision"].map((key) => (
                <th key={key} className="whitespace-nowrap p-2 font-medium">
                  {t(`uiSpec.icons.${key}`)}
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
                  {t(`uiSpec.icons.action.${item}`)}
                </th>
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    disabled={disabled}
                    aria-label={t(`uiSpec.icons.action.${item}`)}
                    data-action-ui-id={`ui-spec-icons-sample-${item}-filled`}
                  >
                    <MediaGlyph action={item} size={size} />
                  </Button>
                </td>
                <td className="max-w-64 p-2 text-muted-foreground">
                  {t("uiSpec.icons.existingMedia")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-xs text-muted-foreground">
          {t("uiSpec.icons.sceneHint")}
        </p>
        <div
          className="flex flex-wrap items-center gap-2"
          data-action-ui-id="ui-spec-icons-player"
        >
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || episode === 1}
            aria-label={t("uiSpec.icons.action.previous")}
            onClick={() => {
              setEpisode(episode - 1);
              setPlaying(false);
            }}
            data-action-ui-id="ui-spec-icons-previous"
          >
            <MediaGlyph action="previous" size={size} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={t(`uiSpec.icons.action.${action}`)}
            onClick={() => setPlaying(!playing)}
            className="rounded-full border-0 bg-transparent p-0 hover:bg-transparent hover:opacity-90"
            data-action-ui-id="ui-spec-icons-play-toggle"
          >
            <MediaGlyph action={action} size={size} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || episode === 3}
            aria-label={t("uiSpec.icons.action.next")}
            onClick={() => {
              setEpisode(episode + 1);
              setPlaying(false);
            }}
            data-action-ui-id="ui-spec-icons-next"
          >
            <MediaGlyph action="next" size={size} />
          </Button>
          <span className="mr-auto text-xs tabular-nums" role="status">
            {t("uiSpec.icons.episode", {
              episode,
            })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={t("uiSpec.icons.mute")}
            aria-pressed={muted}
            onClick={() => setMuted(!muted)}
            data-action-ui-id="ui-spec-icons-mute"
          >
            <Volume size={size} strokeWidth={1.5} aria-hidden={true} />
          </Button>
          <span
            className="flex size-8 items-center justify-center"
            title={t("uiSpec.icons.auxiliary")}
          >
            <Maximize size={size} strokeWidth={1.5} aria-hidden={true} />
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            {t("uiSpec.icons.thumbnailScene")}
          </p>
          <div className="flex h-24 items-center justify-center rounded-md bg-[var(--modal-mask-bg)]">
            <Button
              size="icon-lg"
              disabled={disabled}
              aria-label={t(`uiSpec.icons.action.${action}`)}
              onClick={() => setPlaying(!playing)}
              className="rounded-full border-0 bg-transparent p-0 hover:bg-transparent hover:opacity-90"
              data-action-ui-id="ui-spec-icons-thumbnail-toggle"
            >
              <span className="text-[var(--media-overlay-foreground)] drop-shadow-sm">
                <MediaGlyph action={action} size={20} />
              </span>
            </Button>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            {t("uiSpec.icons.audioScene")}
          </p>
          <div className="flex h-24 items-center gap-3 rounded-md bg-muted px-3">
            <Button
              size="icon-sm"
              disabled={disabled}
              aria-label={t(`uiSpec.icons.action.${action}`)}
              onClick={() => setPlaying(!playing)}
              className="rounded-full border-0 bg-transparent p-0 hover:bg-transparent hover:opacity-90"
              data-action-ui-id="ui-spec-icons-audio-toggle"
            >
              <PlaybackCircleToggleIcon
                playing={playing}
                size={28}
                className="size-full"
              />
            </Button>
            <div
              className="h-1 flex-1 rounded-full bg-foreground/10"
              aria-hidden={true}
            >
              <div className="h-full w-1/3 rounded-full bg-foreground/50" />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              0:12 / 0:36
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("uiSpec.icons.sceneBoundary")}
      </p>
    </section>
  );
}
function StrokeSpec() {
  const { t } = useTranslation();
  return (
    <section
      className="space-y-3"
      data-action-ui-id="ui-spec-icons-stroke-spec"
    >
      <h3 className="text-sm font-medium">{t("uiSpec.icons.stroke.title")}</h3>
      <p className="text-xs text-muted-foreground">
        {t("uiSpec.icons.stroke.note")}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <thead>
            <tr className="border-b border-border">
              {["size", "target", "source", "sample", "scene"].map((key) => (
                <th key={key} scope="col" className="p-2 font-medium">
                  {t(`uiSpec.icons.stroke.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ICON_STROKE_SPEC.map(({ size, stroke }) => (
              <tr key={size} className="border-b border-border">
                <th scope="row" className="p-2 font-normal">
                  {size}px
                </th>
                <td className="p-2">{stroke}px</td>
                <td className="p-2">
                  {Number(((stroke * 24) / size).toFixed(4))}
                </td>
                <td className="p-2">
                  <StrokeIcon icon={Search} size={size} />
                </td>
                <td className="p-2">
                  {t(`uiSpec.icons.stroke.scene${size}`)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3" data-action-ui-id="ui-spec-icons-text-pairing">
        <h4 className="text-sm font-medium">
          {t("uiSpec.icons.pairing.title")}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t("uiSpec.icons.pairing.note")}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {["compact", "menu", "button"].map((key) => (
            <div
              key={key}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <p className="text-xs text-muted-foreground">
                {t(`uiSpec.icons.pairing.${key}`)}
              </p>
              <div
                className={`flex items-center gap-2 ${ICON_TEXT_SPEC[key].textClassName}`}
              >
                <StrokeIcon
                  icon={key === "compact" ? ChevronDown : Copy}
                  size={ICON_TEXT_SPEC[key].iconSize}
                />
                <span>
                  {t(
                    key === "compact"
                      ? "assetCenter.sort.updated_at"
                      : "common.copy",
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("uiSpec.icons.stroke.formula")}
      </p>
    </section>
  );
}
const LibraryCatalog = reactExports.lazy(() =>
  (() => import("../debug-panel/project-icon-catalog.jsx"))().then((module) => ({
    default: module.ProjectIconCatalog,
  })),
);
const OpacityPreview = reactExports.lazy(() =>
  (() => import("../debug-panel/icon-opacity-preview-section.jsx"))().then((module) => ({
    default: module.IconOpacityPreviewSection,
  })),
);
const RULES = [
  "sizes",
  "stroke",
  "color",
  "weight",
  "surface",
  "hitArea",
  "interaction",
];
const DECISIONS = ["transport", "auxiliary", "state", "special"];
export function IconPreview() {
  const { t } = useTranslation();
  const { theme, resolved, setTheme } = useTheme();
  const initialTheme = reactExports.useRef(theme);
  const [size, setSize] = reactExports.useState(16);
  const [disabled, setDisabled] = reactExports.useState(false);
  const [showLibrary, setShowLibrary] = reactExports.useState(false);
  const [showDiagnostics, setShowDiagnostics] = reactExports.useState(false);
  reactExports.useEffect(
    () => () => setTheme(initialTheme.current),
    [setTheme],
  );
  return (
    <div
      className="space-y-6 text-foreground"
      data-action-ui-id="ui-spec-icons"
      data-icon-opacity-debug="section"
    >
      <header className="space-y-2">
        <h2 className="font-heading text-title-16 font-medium">
          {t("uiSpec.icons.title")}
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("uiSpec.icons.intro")}
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <span className="text-xs">{t("uiSpec.icons.size")}</span>
        {[12, 14, 16, 20].map((value) => (
          <Button
            key={value}
            size="xs"
            variant={size === value ? "default" : "outline"}
            aria-pressed={size === value}
            onClick={() => setSize(value)}
            data-action-ui-id={`ui-spec-icons-size-${value}`}
          >
            {value}px
          </Button>
        ))}
        <span className="ml-2 text-xs">{t("uiSpec.icons.theme")}</span>
        {["light", "dark"].map((value) => (
          <Button
            key={value}
            size="xs"
            variant={resolved === value ? "default" : "outline"}
            aria-pressed={resolved === value}
            onClick={() => setTheme(value)}
            data-action-ui-id={`ui-spec-icons-theme-${value}`}
          >
            {t(`uiSpec.icons.${value}`)}
          </Button>
        ))}
        <Button
          size="xs"
          variant={disabled ? "default" : "outline"}
          aria-pressed={disabled}
          onClick={() => setDisabled(!disabled)}
          data-action-ui-id="ui-spec-icons-disabled"
        >
          {t("uiSpec.icons.disabled")}
        </Button>
      </div>
      <ListPairingPreview disabled={disabled} />
      <section className="space-y-3">
        <h3 className="text-sm font-medium">
          {t("uiSpec.icons.currentRules")}
        </h3>
        <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground">
          {RULES.map((rule) => (
            <li key={rule}>{t(`uiSpec.icons.rule.${rule}`)}</li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium">
          {t("uiSpec.icons.proposedRules")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {DECISIONS.map((rule) => (
            <div key={rule} className="rounded-lg border border-border p-3">
              <h4 className="mb-1 text-xs font-medium">
                {t(`uiSpec.icons.decision.${rule}.title`)}
              </h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t(`uiSpec.icons.decision.${rule}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>
      <StrokeSpec />
      <MediaPreview size={size} disabled={disabled} />
      <FilledCatalog size={size} />
      <section className="space-y-3 rounded-lg border border-border p-3">
        <h3 className="text-sm font-medium">
          {t("uiSpec.icons.pendingTitle")}
        </h3>
        <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground">
          {["geometry", "semantics", "migration"].map((key) => (
            <li key={key}>{t(`uiSpec.icons.pending.${key}`)}</li>
          ))}
        </ul>
      </section>
      <details onToggle={(event) => setShowLibrary(event.currentTarget.open)}>
        <summary
          className="cursor-pointer text-sm font-medium"
          data-action-ui-id="ui-spec-icons-library"
        >
          {t("uiSpec.icons.library")}
        </summary>
        <div className="pt-3">
          {showLibrary && (
            <reactExports.Suspense
              fallback={<p>{t("uiSpec.icons.loading")}</p>}
            >
              <LibraryCatalog
                disabled={disabled}
                opacity={1}
                revision={`${resolved}-${disabled}`}
              />
            </reactExports.Suspense>
          )}
        </div>
      </details>
      <details
        onToggle={(event) => setShowDiagnostics(event.currentTarget.open)}
      >
        <summary
          className="cursor-pointer text-sm font-medium"
          data-action-ui-id="ui-spec-icons-diagnostics"
        >
          {t("uiSpec.icons.diagnostics")}
        </summary>
        <div className="pt-3">
          {showDiagnostics && (
            <reactExports.Suspense
              fallback={<p>{t("uiSpec.icons.loading")}</p>}
            >
              <OpacityPreview />
            </reactExports.Suspense>
          )}
        </div>
      </details>
    </div>
  );
}
