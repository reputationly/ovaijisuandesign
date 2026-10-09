// preset-tags.jsx
import {
  ChevronRight$1 as ChevronRight,
  Plus,
  reactExports,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { trackAssetCenterAction } from "../infra/use-online.jsx";
const PRESET_TAGS = ["写实", "二次元", "赛博朋克", "水墨", "像素风"];
function PresetTags({ value, onChange, trackingSurface = "create_dialog" }) {
  const { t: t2 } = useTranslation();
  const [customDraft, setCustomDraft] = reactExports.useState("");
  const [showCustomInput, setShowCustomInput] = reactExports.useState(false);
  const [customAddedTags, setCustomAddedTags] = reactExports.useState(
    () => new Set(value.filter((tag) => !PRESET_TAGS.includes(tag))),
  );
  const toggle = (tag) => {
    const selected2 = !value.includes(tag);
    trackAssetCenterAction({
      action: "tag_toggle",
      surface: trackingSurface,
      tag_kind: PRESET_TAGS.includes(tag) ? "preset" : "custom",
      selected: selected2,
      tag_count: selected2 ? value.length + 1 : value.length - 1,
    });
    onChange(selected2 ? [...value, tag] : value.filter((t22) => t22 !== tag));
  };
  const commitCustom = () => {
    const trimmed = customDraft.trim();
    if (trimmed) {
      const isNew = !customAddedTags.has(trimmed);
      setCustomAddedTags((prev) => {
        if (prev.has(trimmed)) return prev;
        const next2 = new Set(prev);
        next2.add(trimmed);
        return next2;
      });
      if (!value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      if (isNew) {
        trackAssetCenterAction({
          action: "custom_tag_add",
          surface: trackingSurface,
          tag_count: value.includes(trimmed) ? value.length : value.length + 1,
        });
      }
    }
    setCustomDraft("");
    setShowCustomInput(false);
  };
  const removeCustomTag = (tag) => {
    setCustomAddedTags((prev) => {
      if (!prev.has(tag)) return prev;
      const next2 = new Set(prev);
      next2.delete(tag);
      return next2;
    });
    if (value.includes(tag)) {
      onChange(value.filter((t22) => t22 !== tag));
    }
  };
  return (
    <div
      className="flex flex-wrap gap-1.5"
      data-action-ui-id="asset-center-add-entity-tags"
    >
      {PRESET_TAGS.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggle(tag)}
          className={`inline-flex items-center h-[21px] px-1.5 text-xs transition-colors cursor-pointer rounded-[4px] ${value.includes(tag) ? "bg-foreground text-background" : "bg-muted-foreground/15 text-secondary-foreground hover:bg-muted-foreground/25"}`}
        >
          {tag}
        </button>
      ))}
      {Array.from(customAddedTags).map((tag) => {
        const selected2 = value.includes(tag);
        return (
          // biome-ignore lint/a11y/useSemanticElements: nested click targets (chip + X) — a <button>-in-<button> is invalid; div+role keeps both clickable while staying valid.
          <div
            key={tag}
            role="button"
            tabIndex={0}
            onClick={() => toggle(tag)}
            onKeyDown={(e2) => {
              if (e2.key === "Enter" || e2.key === " ") {
                e2.preventDefault();
                toggle(tag);
              }
            }}
            data-action-ui-id="asset-center-add-entity-tags-custom-chip"
            data-tag-selected={selected2}
            className={`group inline-flex items-center h-[21px] pl-1.5 pr-0.5 text-xs rounded-[4px] cursor-pointer transition-colors ${selected2 ? "bg-foreground text-background" : "bg-muted-foreground/15 text-secondary-foreground hover:bg-muted-foreground/25"}`}
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={(e2) => {
                e2.stopPropagation();
                removeCustomTag(tag);
              }}
              aria-label={t2("common.remove", {
                defaultValue: "Remove",
              })}
              tabIndex={-1}
              className={`ml-0.5 inline-flex items-center justify-center size-3.5 rounded-[2px] transition-colors ${selected2 ? "text-background/70 hover:text-background hover:bg-background/15" : "text-muted-foreground hover:text-foreground hover:bg-foreground/10"}`}
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
      {showCustomInput ? (
        <input
          value={customDraft}
          onChange={(e2) => setCustomDraft(e2.target.value)}
          onBlur={commitCustom}
          onKeyDown={(e2) => {
            if (e2.key === "Enter") {
              e2.preventDefault();
              commitCustom();
            }
            if (e2.key === "Escape") {
              setCustomDraft("");
              setShowCustomInput(false);
            }
          }}
          placeholder={t2(
            "assetCenter.create.customTagPlaceholder",
            "输入标签",
          )}
          className="h-[21px] w-20 px-1.5 text-xs bg-transparent border border-input outline-none rounded-[4px] placeholder:text-muted-foreground/40"
          autoFocus={true}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          className="inline-flex items-center gap-0.5 h-[21px] px-1.5 text-xs bg-muted-foreground/15 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/25 rounded-[4px] cursor-pointer transition-colors"
          data-action-ui-id="asset-center-add-entity-tags-custom"
        >
          <Plus size={10} />
          {t2("assetCenter.create.customTag", "自定义")}
        </button>
      )}
    </div>
  );
}
export function CollapsibleTags({
  tags: tags2,
  onChange,
  trackingSurface = "create_dialog",
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const expanded = !open;
          trackAssetCenterAction({
            action: "tags_toggle",
            surface: trackingSurface,
            expanded,
            tag_count: tags2.length,
          });
          setOpen(expanded);
        }}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        data-action-ui-id="asset-center-add-entity-tags-toggle"
      >
        <ChevronRight
          size={12}
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        />
        {t2("assetCenter.create.addTagsOptional", "添加标签（可选）")}
        {tags2.length > 0 && (
          <span className="text-[11px] text-muted-foreground/60">
            ({tags2.length})
          </span>
        )}
      </button>
      {open && (
        <div className="mt-1.5">
          <PresetTags
            value={tags2}
            onChange={onChange}
            trackingSurface={trackingSurface}
          />
        </div>
      )}
    </div>
  );
}
