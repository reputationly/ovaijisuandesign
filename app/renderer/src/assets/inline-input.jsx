// inline-input.jsx
import { classifyFileType, reactExports, useTranslation } from "../vendor.js";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2 as cn, TooltipContent } from "../infra/dialog-content.jsx";
import {
  isCanvasColorTag,
  MAX_VISIBLE_CANVAS_TAG_COLORS,
  PRESET_COLOR_NAME_KEYS,
  resolveTagIds,
} from "../infra/parse-connector-selection.js";
import { useTagRegistry } from "../canvas/conflict-resolution-dialog.jsx";
import { FileTypeIcon } from "../infra/file-type-icon.jsx";
import {
  AssetRenameInput,
  buildRenamedFilename,
  FileTypeThumbnail,
  splitFilename,
} from "../canvas/uploading-assets.jsx";
const CANVAS_TAG_THEME_COLOR_BY_PRESET = {
  "#0A84FF": "var(--canvas-node-tag-blue-surface, #54A9FF)",
  "#BF5AF2": "var(--canvas-node-tag-purple-surface, #D28CF6)",
  "#FF9F0A": "var(--canvas-node-tag-orange-surface, #FFBC54)",
  "#5E3DF5": "var(--canvas-node-tag-deep-purple-surface, #8E77F8)",
  "#FF5F57": "var(--canvas-node-tag-red-surface, #FF8F89)",
  "#30D158": "var(--canvas-node-tag-green-surface, #6EDF8A)",
  "#FFD60A": "var(--canvas-node-tag-yellow-surface, #FFE254)",
};
export function getCanvasTagPresentationColor(color) {
  if (!color) return void 0;
  return (
    CANVAS_TAG_THEME_COLOR_BY_PRESET[color.toUpperCase()] ??
    `color-mix(in srgb, ${color} var(--canvas-tag-presentation-strength, 70%), var(--canvas-tag-presentation-base, #ffffff))`
  );
}
export function getCanvasTagSelectedForegroundColor(color) {
  if (color.toUpperCase() === "#FFD60A") {
    return "var(--canvas-node-tag-yellow-selected-foreground, #A87E00)";
  }
  return getCanvasTagPresentationColor(color) ?? color;
}
export function TagDots({ tagIds, size = 9, className, ringColor }) {
  const registry = useTagRegistry();
  const { t: translate } = useTranslation();
  const tags = resolveTagIds(tagIds, registry).filter(isCanvasColorTag);
  if (tags.length === 0) return null;
  const getColorName = (colorId, custom) =>
    custom && custom.length > 0
      ? custom
      : translate(PRESET_COLOR_NAME_KEYS[colorId] ?? "") || colorId;
  const visibleTags = tags.slice(0, MAX_VISIBLE_CANVAS_TAG_COLORS);
  const title = visibleTags.map((tag) => getColorName(tag.id, tag.name)).join("、");
  const overlap = Math.round(size * 0.4);
  const ring = ringColor ?? "var(--background, #fff)";
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn("inline-flex shrink-0 items-center", className)}
              onPointerEnter={(pointerEvent) => pointerEvent.stopPropagation()}
              onPointerMove={(pointerEvent) => pointerEvent.stopPropagation()}
              onPointerLeave={(pointerEvent) => pointerEvent.stopPropagation()}
            >
              {visibleTags.map((tag, index) => (
                <span
                  key={tag.id}
                  className="rounded-full"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: getCanvasTagPresentationColor(tag.color),
                    marginLeft: index === 0 ? 0 : -overlap,
                    boxShadow: `0 0 0 0.7px ${ring}`,
                    zIndex: visibleTags.length - index,
                    position: "relative",
                  }}
                />
              ))}
            </span>
          }
        />
        <TooltipContent side="top">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
export function arePropsRefEqualExcept(prev, next, except) {
  for (const key in prev) {
    if (!Object.hasOwn(prev, key)) continue;
    if (except.includes(key)) continue;
    if (prev[key] !== next[key]) return false;
  }
  return true;
}
export function FileTypeBadge({ fileName, variant }) {
  return variant === "inline" ? (
    <FileTypeThumbnail filename={fileName} />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <FileTypeIcon
        {...classifyFileType({
          filename: fileName,
        })}
        size={48}
        decorative={true}
      />
    </div>
  );
}
export function InlineInput({
  initialName,
  isDirectory,
  onConfirm,
  onCancel,
  className,
}) {
  const { head: stem, tail: extension } = splitFilename(
    initialName,
    isDirectory ? "folder" : "file",
  );
  const [value, setValue] = reactExports.useState(stem);
  const inputRef = reactExports.useRef(null);
  const settledRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);
  const handleConfirm = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    const fullName = buildRenamedFilename(
      initialName,
      value,
      isDirectory ? "folder" : "file",
    );
    if (fullName && fullName !== initialName) {
      onConfirm(fullName);
    } else {
      onCancel();
    }
  };
  return (
    <AssetRenameInput
      ref={inputRef}
      extension={extension}
      className={cn(
        "h-auto flex-1 rounded-lg border-primary bg-background px-1 py-0 text-sm text-foreground outline-none focus-within:border-primary",
        className,
      )}
      inputClassName="h-auto px-0 py-0"
      data-action-ui-id="file-explorer.inline-name-input"
      value={value}
      onChange={(changeEvent) => setValue(changeEvent.target.value)}
      onKeyDown={(keyboardEvent) => {
        keyboardEvent.stopPropagation();
        if (keyboardEvent.nativeEvent.isComposing) return;
        if (keyboardEvent.key === "Enter") {
          keyboardEvent.preventDefault();
          handleConfirm();
        }
        if (keyboardEvent.key === "Escape") {
          keyboardEvent.preventDefault();
          if (!settledRef.current) {
            settledRef.current = true;
            onCancel();
          }
        }
      }}
      onBlur={handleConfirm}
      onClick={(clickEvent) => clickEvent.stopPropagation()}
    />
  );
}
const SPECIAL_PROPS = ["renamingPath", "asset"];
export function arePropsEqual(prev, next) {
  const prevIsRenaming = prev.renamingPath === prev.absolutePath;
  const nextIsRenaming = next.renamingPath === next.absolutePath;
  if (prevIsRenaming !== nextIsRenaming) return false;
  if (prev.asset !== next.asset) {
    if (prev.asset.id !== next.asset.id) return false;
    if (prev.asset.path !== next.asset.path) return false;
    if (prev.asset.name !== next.asset.name) return false;
    if (prev.asset.type !== next.asset.type) return false;
    if (prev.asset.status !== next.asset.status) return false;
    if (prev.asset.duration !== next.asset.duration) return false;
    if (prev.asset.candidate?.asset_id !== next.asset.candidate?.asset_id)
      return false;
    if (prev.asset.candidate?.path !== next.asset.candidate?.path)
      return false;
  }
  return arePropsRefEqualExcept(prev, next, SPECIAL_PROPS);
}
