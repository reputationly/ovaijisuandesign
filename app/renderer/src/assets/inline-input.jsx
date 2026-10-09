// inline-input.jsx
import { classifyFileType, reactExports, useTranslation } from "../vendor.js";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { cn$2, TooltipContent } from "../infra/dialog-content.jsx";
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

export function getCanvasTagPresentationColor(color2) {
  if (!color2) return void 0;
  return (
    CANVAS_TAG_THEME_COLOR_BY_PRESET[color2.toUpperCase()] ??
    `color-mix(in srgb, ${color2} var(--canvas-tag-presentation-strength, 70%), var(--canvas-tag-presentation-base, #ffffff))`
  );
}

export function getCanvasTagSelectedForegroundColor(color2) {
  if (color2.toUpperCase() === "#FFD60A") {
    return "var(--canvas-node-tag-yellow-selected-foreground, #A87E00)";
  }
  return getCanvasTagPresentationColor(color2) ?? color2;
}

export function TagDots({ tagIds, size: size2 = 9, className, ringColor }) {
  const registry2 = useTagRegistry();
  const { t: t2 } = useTranslation();
  const tags2 = resolveTagIds(tagIds, registry2).filter(isCanvasColorTag);
  if (tags2.length === 0) return null;
  const name2 = (id2, custom) =>
    custom && custom.length > 0
      ? custom
      : t2(PRESET_COLOR_NAME_KEYS[id2] ?? "") || id2;
  const visibleTags = tags2.slice(0, MAX_VISIBLE_CANVAS_TAG_COLORS);
  const title = visibleTags.map((tag) => name2(tag.id, tag.name)).join("、");
  const overlap = Math.round(size2 * 0.4);
  const ring = ringColor ?? "var(--background, #fff)";
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              className={cn$2("inline-flex shrink-0 items-center", className)}
              onPointerEnter={(e2) => e2.stopPropagation()}
              onPointerMove={(e2) => e2.stopPropagation()}
              onPointerLeave={(e2) => e2.stopPropagation()}
            >
              {visibleTags.map((tag, index2) => (
                <span
                  key={tag.id}
                  className="rounded-full"
                  style={{
                    width: size2,
                    height: size2,
                    backgroundColor: getCanvasTagPresentationColor(tag.color),
                    marginLeft: index2 === 0 ? 0 : -overlap,
                    boxShadow: `0 0 0 0.7px ${ring}`,
                    zIndex: visibleTags.length - index2,
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

export function arePropsRefEqualExcept(prev, next2, except) {
  for (const key2 in prev) {
    if (!Object.hasOwn(prev, key2)) continue;
    if (except.includes(key2)) continue;
    if (prev[key2] !== next2[key2]) return false;
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
  const { head: stem, tail: extension2 } = splitFilename(
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
      extension={extension2}
      className={cn$2(
        "h-auto flex-1 rounded-lg border-primary bg-background px-1 py-0 text-sm text-foreground outline-none focus-within:border-primary",
        className,
      )}
      inputClassName="h-auto px-0 py-0"
      data-action-ui-id="file-explorer.inline-name-input"
      value={value}
      onChange={(e2) => setValue(e2.target.value)}
      onKeyDown={(e2) => {
        e2.stopPropagation();
        if (e2.nativeEvent.isComposing) return;
        if (e2.key === "Enter") {
          e2.preventDefault();
          handleConfirm();
        }
        if (e2.key === "Escape") {
          e2.preventDefault();
          if (!settledRef.current) {
            settledRef.current = true;
            onCancel();
          }
        }
      }}
      onBlur={handleConfirm}
      onClick={(e2) => e2.stopPropagation()}
    />
  );
}

const SPECIAL_PROPS$1 = ["renamingPath", "asset"];

export function arePropsEqual$1(prev, next2) {
  const prevIsRenaming = prev.renamingPath === prev.absolutePath;
  const nextIsRenaming = next2.renamingPath === next2.absolutePath;
  if (prevIsRenaming !== nextIsRenaming) return false;
  if (prev.asset !== next2.asset) {
    if (prev.asset.id !== next2.asset.id) return false;
    if (prev.asset.path !== next2.asset.path) return false;
    if (prev.asset.name !== next2.asset.name) return false;
    if (prev.asset.type !== next2.asset.type) return false;
    if (prev.asset.status !== next2.asset.status) return false;
    if (prev.asset.duration !== next2.asset.duration) return false;
    if (prev.asset.candidate?.asset_id !== next2.asset.candidate?.asset_id)
      return false;
    if (prev.asset.candidate?.path !== next2.asset.candidate?.path)
      return false;
  }
  return arePropsRefEqualExcept(prev, next2, SPECIAL_PROPS$1);
}
