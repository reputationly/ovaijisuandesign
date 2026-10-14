// asset-mention-list.jsx
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Check$2 as Check, File$3 as File, Music$2 as Music, Package$2 as Package, Search$2 as Search, Square$2 as Square, Video$2 as Video } from "../media-editing/custom-icons.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ImageOutlineIcon } from "../media-editing/package.jsx";
import { withThumbnail } from "../workspace/tool-label-definitions.js";
import { useGatewayUrl } from "../generation/use-model-catalog-scope-key.js";
import { useMaterializedEntities } from "./use-materialized-entities.jsx";
import { useEntities } from "./wrap-as-asset-center-error.js";
import { Badge } from "../infra/badge-variants.jsx";
import { Input3 as Input } from "../infra/select-content.jsx";
import { PageStateBoundary } from "./page-state-boundary.jsx";
const DEFAULT_MAX_HEIGHT = 280;
const SEARCH_LIMIT = 50;
const THUMB_PX = 32;
function TypeIcon({ type }) {
  if (type === "character")
    return <ImageOutlineIcon size={16} strokeWidth={1.67} />;
  if (type === "scene") return <Video size={16} />;
  if (type === "style_pack") return <Music size={16} />;
  if (type === "prop") return <Package size={16} />;
  return <File size={16} />;
}
function AssetThumb({ entity }) {
  const gatewayUrl = useGatewayUrl();
  const [errored, setErrored] = reactExports.useState(false);
  const wrapperCls =
    "flex-shrink-0 flex items-center justify-center bg-muted overflow-hidden text-muted-foreground";
  const wrapperStyle = {
    width: THUMB_PX,
    height: THUMB_PX,
  };
  const previewUrl = entity.thumbnailUrl ?? entity.coverUrl;
  const resolvedUrl = previewUrl
    ? withThumbnail(gatewayUrl(previewUrl), THUMB_PX)
    : void 0;
  if (!resolvedUrl || errored) {
    return (
      <span className={wrapperCls} style={wrapperStyle}>
        <TypeIcon type={entity.type} />
      </span>
    );
  }
  return (
    <span className={wrapperCls} style={wrapperStyle}>
      <img
        src={resolvedUrl}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
}
export function AssetMentionList(props) {
  const {
    query: externalQuery,
    materializedOnly,
    onSelect,
    onClose,
    maxHeight,
    hideEmpty,
    emptyStateDensity,
    onTopEntityChange,
    selectedEntityId,
    selectedEntityIds,
    bordered,
    typeFilter,
  } = props;
  const { t: translate } = useTranslation();
  const [internalQuery, setInternalQuery] = reactExports.useState("");
  const effectiveQuery = externalQuery ?? internalQuery;
  const entitiesQuery = useEntities({
    q: effectiveQuery.trim() || void 0,
    limit: SEARCH_LIMIT,
    ...(typeFilter
      ? {
          type: typeFilter,
        }
      : {}),
  });
  const materializedQuery = useMaterializedEntities();
  const materializedIds = reactExports.useMemo(() => {
    if (!materializedOnly) return null;
    const list = materializedQuery.data ?? [];
    return new Set(list.map((materializedEntry) => materializedEntry.entityId));
  }, [materializedOnly, materializedQuery.data]);
  const entities = reactExports.useMemo(() => {
    const raw = entitiesQuery.data ?? [];
    if (!materializedIds) return raw;
    return raw.filter((entity) => materializedIds.has(entity.id));
  }, [entitiesQuery.data, materializedIds]);
  const [activeIndex, setActiveIndex] = reactExports.useState(0);
  const listRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (activeIndex >= entities.length) {
      setActiveIndex(Math.max(0, entities.length - 1));
    }
  }, [activeIndex, entities.length]);
  reactExports.useEffect(() => {
    setActiveIndex(0);
  }, [effectiveQuery]);
  reactExports.useEffect(() => {
    if (!onTopEntityChange) return;
    const topEntity = entities[0];
    if (topEntity) {
      onTopEntityChange({
        kind: "entity",
        entityId: topEntity.id,
        entityName: topEntity.name,
        entityType: topEntity.type,
      });
    } else {
      onTopEntityChange(null);
    }
  }, [entities, onTopEntityChange]);
  const handleSelect = reactExports.useCallback(
    (entity) => {
      onSelect({
        kind: "entity",
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
      });
    },
    [onSelect],
  );
  const handleKeyDown = reactExports.useCallback(
    (keyboardEvent) => {
      if (entities.length === 0) {
        if (keyboardEvent.key === "Escape" && onClose) {
          keyboardEvent.preventDefault();
          onClose();
        }
        return;
      }
      if (keyboardEvent.key === "ArrowDown") {
        keyboardEvent.preventDefault();
        setActiveIndex((prev) => (prev >= entities.length - 1 ? 0 : prev + 1));
      } else if (keyboardEvent.key === "ArrowUp") {
        keyboardEvent.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? entities.length - 1 : prev - 1));
      } else if (keyboardEvent.key === "Enter") {
        keyboardEvent.preventDefault();
        const selected = entities[activeIndex];
        if (selected) handleSelect(selected);
      } else if (keyboardEvent.key === "Escape" && onClose) {
        keyboardEvent.preventDefault();
        onClose();
      }
    },
    [entities, activeIndex, handleSelect, onClose],
  );
  reactExports.useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-asset-row="${activeIndex}"]`);
    if (el) {
      el.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex]);
  const isLoading =
    entitiesQuery.isLoading ||
    (materializedOnly && materializedQuery.isLoading);
  const error = entitiesQuery.error;
  const showSharedEmpty = Boolean(
    emptyStateDensity && !isLoading && !error && entities.length === 0,
  );
  if (hideEmpty && !isLoading && !error && entities.length === 0) {
    return null;
  }
  return (
    <div
      role="listbox"
      aria-multiselectable={selectedEntityIds !== void 0 ? true : void 0}
      aria-label={translate("assetMentionList.tabLabel")}
      className={`flex flex-col bg-popover text-popover-foreground rounded-md outline-none ${showSharedEmpty ? "flex-1 min-h-0" : ""} ${bordered ? "elevated-surface-border" : ""}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-action-ui-id="asset-mention-list"
    >
      {externalQuery === void 0 && (
        <div className="p-2 border-b border-border">
          <Input
            type="search"
            value={internalQuery}
            placeholder={translate("assetMentionList.placeholder")}
            startIcon={<Search />}
            onChange={(changeEvent) => setInternalQuery(changeEvent.target.value)}
            className="[&_input]:rounded-md"
            data-action-ui-id="asset-mention-list.search"
          />
        </div>
      )}
      <div
        ref={listRef}
        className={`overflow-y-auto overscroll-contain ${showSharedEmpty ? "flex flex-col flex-1 min-h-0" : ""}`}
        style={
          showSharedEmpty
            ? void 0
            : {
                maxHeight: maxHeight ?? DEFAULT_MAX_HEIGHT,
              }
        }
      >
        {error ? (
          <div className="px-3 py-4 text-xs text-destructive select-none">
            {translate("assetMentionList.loadError", {
              message: error.message,
            })}
          </div>
        ) : isLoading ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center select-none">
            {translate("assetMentionList.loading")}
          </div>
        ) : showSharedEmpty ? (
          <PageStateBoundary
            empty={true}
            density={emptyStateDensity}
            emptyOptions={{
              text: translate("assetMentionList.empty"),
            }}
          />
        ) : entities.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center select-none">
            {translate("assetMentionList.empty")}
          </div>
        ) : (
          entities.map((entity, idx) => {
            const isSelected =
              selectedEntityId === entity.id ||
              selectedEntityIds?.has(entity.id) === true;
            const showSelectionIndicator =
              selectedEntityId !== void 0 || selectedEntityIds !== void 0;
            return (
              <button
                key={entity.id}
                type="button"
                role="option"
                data-asset-row={idx}
                aria-selected={
                  showSelectionIndicator ? isSelected : idx === activeIndex
                }
                data-action-ui-id={`asset-mention-row-${idx}`}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${isSelected ? "bg-popup-item-active" : idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-popup-item-hover"}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(entity)}
              >
                {showSelectionIndicator &&
                  (isSelected ? (
                    <Check size={14} className="shrink-0 text-foreground" />
                  ) : (
                    <Square
                      size={14}
                      className="shrink-0 text-muted-foreground/40"
                    />
                  ))}
                <AssetThumb entity={entity} />
                <span className="text-sm font-medium truncate shrink-0 max-w-[40%]">
                  {entity.name}
                </span>
                <Badge variant="secondary" className="shrink-0">
                  {translate(`assetCenter.types.${entity.type}`)}
                </Badge>
                {entity.description ? (
                  <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
                    {entity.description}
                  </span>
                ) : (
                  <span className="flex-1" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
