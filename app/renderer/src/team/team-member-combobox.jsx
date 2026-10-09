// team-member-combobox.jsx
import {
  Check,
  ChevronDown,
  reactExports,
  Search,
  useTranslation,
} from "../vendor.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { Popover } from "../assets/credit-query-keys.jsx";
import { PopoverTrigger } from "../assets/gateway-scope-provider.jsx";
import { Button$1, cn$2 } from "../infra/dialog-content.jsx";
import { Input3 } from "../infra/select-content.jsx";
import { PopoverContent } from "./hailuo-credit-row.jsx";

export function TeamMemberCombobox({
  id: id2,
  value,
  onValueChange,
  options,
  searchQuery,
  onSearchChange,
  disabled: disabled2 = false,
  loading = false,
  error = false,
  onRetry,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  placeholder,
  searchPlaceholder,
  emptyText,
  selectedLabelMode = "full",
  popupZClassName = "z-[70]",
  "data-action-ui-id": dataActionUiId = "team.member-combobox",
}) {
  const { t: t2 } = useTranslation();
  const [open, setOpen] = reactExports.useState(false);
  const listboxId = reactExports.useId();
  const selected2 = options.find((option2) => option2.userId === value) ?? null;
  const searchActionUiId =
    dataActionUiId === "team.management-leave-successor"
      ? "team.management-leave-successor-search"
      : `${dataActionUiId}-search`;
  const optionActionUiId =
    dataActionUiId === "team.management-leave-successor"
      ? "team.management-leave-successor-option"
      : `${dataActionUiId}-option`;
  const selectedDescription = selected2
    ? (selected2.description ??
      (selected2.role
        ? `UID ${selected2.userId} · ${t2(
            `team.role.${selected2.role.toLowerCase()}`,
            {
              defaultValue: selected2.role,
            },
          )}`
        : null))
    : null;
  const triggerLabel = selected2
    ? selectedLabelMode === "name" || !selectedDescription
      ? selected2.displayName
      : `${selected2.displayName} · ${selectedDescription}`
    : (placeholder ??
      t2("team.management.successorPlaceholder", {
        defaultValue: "搜索并选择继任 Owner",
      }));
  return (
    <Popover
      open={open}
      onOpenChange={(next2) => {
        if (disabled2) return;
        setOpen(next2);
        if (!next2) onSearchChange("");
      }}
    >
      <PopoverTrigger
        id={id2}
        type="button"
        disabled={disabled2}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        data-action-ui-id={dataActionUiId}
        data-successor-user-id={value ?? void 0}
        data-selected={value ? "true" : "false"}
        className={cn$2(
          "flex h-auto min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-2 text-left text-xs outline-none transition-colors",
          "hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected2 && "text-muted-foreground",
        )}
      >
        <span className="line-clamp-2 min-w-0 flex-1">{triggerLabel}</span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden={true}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        positionerClassName={popupZClassName}
        className={cn$2(
          "w-(--anchor-width) min-w-64 gap-0 p-0",
          popupZClassName,
        )}
      >
        <div className="border-b border-border p-1.5">
          <Input3
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            startIcon={<Icon icon={Search} size="sm" aria-hidden={true} />}
            placeholder={
              searchPlaceholder ??
              t2("team.management.searchPlaceholder", {
                defaultValue: "搜索姓名或 UID",
              })
            }
            aria-label={
              searchPlaceholder ??
              t2("team.management.searchPlaceholder", {
                defaultValue: "搜索姓名或 UID",
              })
            }
            autoComplete="off"
            data-action-ui-id={searchActionUiId}
          />
        </div>
        <div
          id={listboxId}
          role="listbox"
          className="max-h-52 overflow-y-auto p-1"
          data-action-ui-id={`${dataActionUiId}-list`}
        >
          {loading ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              {t2("common.loading", {
                defaultValue: "加载中…",
              })}
            </div>
          ) : null}
          {error ? (
            <div className="flex flex-col gap-2 px-2 py-3">
              <p className="text-xs text-muted-foreground">
                {t2("team.management.membersLoadFailed", {
                  defaultValue: "成员列表加载失败",
                })}
              </p>
              {onRetry ? (
                <Button$1
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onRetry()}
                >
                  {t2("common.retry", {
                    defaultValue: "重试",
                  })}
                </Button$1>
              ) : null}
            </div>
          ) : null}
          {!loading && !error && options.length === 0 ? (
            <div
              className="px-2 py-3 text-xs text-muted-foreground"
              data-action-ui-id={`${dataActionUiId}-empty`}
            >
              {emptyText ??
                t2("team.management.successorSearchEmpty", {
                  defaultValue: "没有匹配的成员，请调整筛选。",
                })}
            </div>
          ) : null}
          {options.map((option2) => {
            const isSelected = option2.userId === value;
            const description =
              option2.description ??
              (option2.role
                ? `UID ${option2.userId} · ${t2(
                    `team.role.${option2.role.toLowerCase()}`,
                    {
                      defaultValue: option2.role,
                    },
                  )}`
                : null);
            return (
              <button
                key={option2.userId}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn$2(
                  "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors",
                  "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  isSelected && "bg-muted",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onValueChange(option2.userId);
                  setOpen(false);
                  onSearchChange("");
                }}
                data-action-ui-id={optionActionUiId}
                data-successor-user-id={option2.userId}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {option2.displayName}
                  </span>
                  {description ? (
                    <span className="block truncate text-muted-foreground">
                      {description}
                    </span>
                  ) : null}
                </span>
                {isSelected ? (
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-foreground"
                    aria-hidden={true}
                  />
                ) : null}
              </button>
            );
          })}
          {hasMore ? (
            <div className="border-t border-border p-1">
              <Button$1
                type="button"
                size="sm"
                variant="ghost"
                className="w-full"
                disabled={loadingMore}
                onClick={() => onLoadMore?.()}
                data-action-ui-id={`${dataActionUiId}-more`}
              >
                {loadingMore
                  ? t2("common.loading", {
                      defaultValue: "加载中…",
                    })
                  : t2("team.management.loadMoreMembers", {
                      defaultValue: "加载更多成员",
                    })}
              </Button$1>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
