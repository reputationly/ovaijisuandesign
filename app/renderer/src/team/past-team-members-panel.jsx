// past-team-members-panel.jsx
import { jsxRuntimeExports, reactExports, Search, useQuery, useQueryClient, UserRoundPlus, useTranslation, X$7 as X } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  MEMBERSHIP_GC_MS,
  MEMBERSHIP_STALE_MS,
  Spinner,
} from "./use-team-transactions-feed-query.jsx";
import { teamQueryKeys } from "../assets/gateway-scope-provider.jsx";
import { normalizeTeamKeyword } from "../assets/credit-query-keys.jsx";
import { teamApi } from "./team-api.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button, DialogFooter } from "../infra/dialog-content.jsx";
import { Badge } from "../infra/badge-variants.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import { Input3 } from "../infra/select-content.jsx";
import {
  describeTeamMutationError,
  formatTeamMutationErrorSuffix,
} from "./team-management-detail-loading.jsx";
function usePastTeamMembersQuery({ scope, keyword: keyword2, enabled = true }) {
  const normalizedKeyword = normalizeTeamKeyword(keyword2);
  return useQuery({
    queryKey: scope
      ? teamQueryKeys.pastTeamMembers(scope, normalizedKeyword)
      : [
          "team",
          "membership",
          "NO_SCOPE",
          "past-team-members",
          normalizedKeyword,
        ],
    queryFn: ({ signal }) => {
      if (!scope)
        throw new Error("Past team members queried without an account scope");
      return teamApi.queryPastTeamMembers(
        {
          scope,
          keyword: normalizedKeyword,
        },
        {
          signal,
        },
      );
    },
    enabled: enabled && scope !== null && scope.membershipRevision !== null,
    retry: false,
    staleTime: MEMBERSHIP_STALE_MS,
    gcTime: MEMBERSHIP_GC_MS,
  });
}
const MAX_PAST_TEAM_SELECTION = 100;
const MAX_QUOTA_LIMIT = 9007199254740991;
const UNSIGNED_DECIMAL = /^(0|[1-9]\d*)$/;
const MEMBER_SEARCH_DEBOUNCE_MS = 250;
const MEMBER_ALREADY_EXISTS_CODE = "member_already_exists";
const EMPTY_MEMBERS = [];
export function PastTeamMembersPanel({ scope, active: active2 }) {
  const { t: t2 } = useTranslation();
  const [searchInput, setSearchInput] = reactExports.useState("");
  const [keyword2, setKeyword] = reactExports.useState("");
  const [selected2, setSelected] = reactExports.useState(new Map());
  const [quotaLimit, setQuotaLimit] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const queryClient2 = useQueryClient();
  reactExports.useEffect(() => {
    if (searchInput === keyword2) return;
    const timer2 = window.setTimeout(() => {
      setKeyword(searchInput);
    }, MEMBER_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer2);
  }, [keyword2, searchInput]);
  const feed = usePastTeamMembersQuery({
    scope,
    keyword: keyword2,
    enabled: active2,
  });
  const members = feed.data ?? EMPTY_MEMBERS;
  const isEmpty2 = !feed.isPending && !feed.isError && members.length === 0;
  const quotaLimitValue = reactExports.useMemo(() => {
    const trimmed = quotaLimit.trim();
    if (trimmed === "")
      return {
        valid: true,
        value: void 0,
      };
    if (!UNSIGNED_DECIMAL.test(trimmed) || Number(trimmed) > MAX_QUOTA_LIMIT) {
      return {
        valid: false,
        value: void 0,
      };
    }
    return {
      valid: true,
      value: trimmed,
    };
  }, [quotaLimit]);
  const atLimit = selected2.size >= MAX_PAST_TEAM_SELECTION;
  const selectedInList = members.filter((m3) =>
    selected2.has(m3.userId),
  ).length;
  const allSelected = members.length > 0 && selectedInList === members.length;
  const someSelected = selectedInList > 0;
  const notifyMaxReached = () => {
    dedupedToast.error(
      t2("team.pastTeams.maxReached", {
        defaultValue: "单次最多添加 {{count}} 人",
        count: MAX_PAST_TEAM_SELECTION,
      }),
    );
  };
  const handleToggleMember = (member, checked) => {
    setSelected((current2) => {
      if (!checked) {
        if (!current2.has(member.userId)) return current2;
        const next22 = new Map(current2);
        next22.delete(member.userId);
        return next22;
      }
      if (current2.has(member.userId)) return current2;
      if (current2.size >= MAX_PAST_TEAM_SELECTION) {
        notifyMaxReached();
        return current2;
      }
      const next2 = new Map(current2);
      next2.set(member.userId, member);
      return next2;
    });
  };
  const handleToggleAll = (candidates2, checked) => {
    setSelected((current2) => {
      const next2 = new Map(current2);
      if (!checked) {
        for (const member of candidates2) next2.delete(member.userId);
        return next2;
      }
      let truncated = false;
      for (const member of candidates2) {
        if (next2.has(member.userId)) continue;
        if (next2.size >= MAX_PAST_TEAM_SELECTION) {
          truncated = true;
          break;
        }
        next2.set(member.userId, member);
      }
      if (truncated) notifyMaxReached();
      return next2;
    });
  };
  const handleClearSelected = () => {
    setSelected(new Map());
  };
  const handleRemoveSelected = (userId) => {
    setSelected((current2) => {
      const next2 = new Map(current2);
      next2.delete(userId);
      return next2;
    });
  };
  const handleAddSelected = async () => {
    if (submitting || selected2.size === 0 || !quotaLimitValue.valid) return;
    setSubmitting(true);
    try {
      const results = await teamApi.batchAddGroupMembers({
        scope,
        userIds: [...selected2.keys()],
        quotaLimit: quotaLimitValue.value,
      });
      const added = results.filter((result) => result.status === "ADDED");
      const alreadyExists = results.filter(
        (result) => result.errorCode === MEMBER_ALREADY_EXISTS_CODE,
      );
      const failed = results.filter(
        (result) =>
          result.status === "FAILED" &&
          result.errorCode !== MEMBER_ALREADY_EXISTS_CODE,
      );
      if (added.length > 0) {
        dedupedToast.success(
          t2("team.pastTeams.addSuccess", {
            defaultValue: "成功添加 {{count}} 人",
            count: added.length,
          }),
        );
        void queryClient2.invalidateQueries({
          queryKey: teamQueryKeys.membership(scope),
        });
      }
      if (alreadyExists.length > 0) {
        dedupedToast.info(
          t2("team.pastTeams.addExists", {
            defaultValue: "{{count}} 人已在团队中",
            count: alreadyExists.length,
          }),
        );
      }
      if (failed.length > 0) {
        dedupedToast.error(
          t2("team.pastTeams.addFailed", {
            defaultValue: "{{count}} 人添加失败，请重试",
            count: failed.length,
          }),
        );
      }
      setSelected((current2) => {
        const next2 = new Map(current2);
        for (const result of added) next2.delete(result.userId);
        for (const result of alreadyExists) next2.delete(result.userId);
        return next2;
      });
    } catch (error) {
      const suffix = formatTeamMutationErrorSuffix(
        describeTeamMutationError(error),
      );
      const primary = t2("team.pastTeams.addRequestFailed", {
        defaultValue: "添加成员失败，请稍后重试",
      });
      dedupedToast.error(suffix ? `${primary}（${suffix}）` : primary);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <div
        className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6"
        data-action-ui-id="team.past-teams-panel"
      >
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden={true}
            />
            <Input3
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t2("team.pastTeams.searchPlaceholder", {
                defaultValue: "搜索姓名或 UID",
              })}
              aria-label={t2("team.pastTeams.searchPlaceholder", {
                defaultValue: "搜索姓名或 UID",
              })}
              className="pl-9"
              data-action-ui-id="team.past-teams-search"
            />
          </div>
          <p
            className={
              atLimit
                ? "shrink-0 text-sm font-medium text-foreground"
                : "shrink-0 text-sm text-muted-foreground"
            }
          >
            {t2("team.pastTeams.selectedCount", {
              defaultValue: "已选择 {{count}}/{{max}} 人",
              count: selected2.size,
              max: MAX_PAST_TEAM_SELECTION,
            })}
          </p>
        </div>
        {selected2.size > 0 ? (
          <div
            className="flex flex-wrap items-center gap-2"
            data-action-ui-id="team.past-teams-selected"
          >
            {[...selected2.values()].map((member) => (
              <Badge
                key={member.userId}
                variant="secondary"
                className="h-7 max-w-full gap-1 pl-2 pr-1"
              >
                <span className="truncate">{member.userName}</span>
                <button
                  type="button"
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-current opacity-70 hover:bg-background/20 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label={t2("team.pastTeams.removeSelected", {
                    defaultValue: "移除 {{name}}",
                    name: member.userName,
                  })}
                  onClick={() => handleRemoveSelected(member.userId)}
                >
                  <X className="size-3.5" aria-hidden={true} />
                </button>
              </Badge>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={handleClearSelected}
              data-action-ui-id="team.past-teams-clear-selected"
            >
              {t2("team.pastTeams.clearAll", {
                defaultValue: "清空",
              })}
            </Button>
          </div>
        ) : null}
        <div className="max-h-80 overflow-y-auto overflow-x-hidden rounded-lg border border-border">
          {feed.isPending ? (
            <div className="flex items-center justify-center py-10">
              <Spinner className="size-5" />
            </div>
          ) : feed.isError ? (
            <div className="space-y-2 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t2("team.pastTeams.loadFailed", {
                  defaultValue: "过往团队成员加载失败",
                })}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void feed.refetch()}
              >
                {t2("common.retry", {
                  defaultValue: "重试",
                })}
              </Button>
            </div>
          ) : isEmpty2 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t2("team.pastTeams.empty", {
                defaultValue: "没有可添加的过往团队成员",
              })}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-2">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  disabled={atLimit && !someSelected}
                  onCheckedChange={(checked) =>
                    handleToggleAll(members, checked === true)
                  }
                  aria-label={t2("team.pastTeams.selectAll", {
                    defaultValue: "全选",
                  })}
                />
                <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {t2("team.pastTeams.selectAll", {
                    defaultValue: "全选",
                  })}
                </p>
              </div>
              {members.map((member) => {
                const isChecked = selected2.has(member.userId);
                const isDisabled = atLimit && !isChecked;
                return (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={isDisabled}
                      onCheckedChange={(checked) =>
                        handleToggleMember(member, checked === true)
                      }
                      aria-label={member.userName}
                    />
                    <button
                      type="button"
                      disabled={isDisabled}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => handleToggleMember(member, !isChecked)}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-foreground">
                        {member.userName.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {member.userName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {"UID "}
                          {member.userId}
                        </span>
                      </span>
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            {t2("team.inviteLink.quotaLimit", {
              defaultValue: "积分额度",
            })}
          </h3>
          <Input3
            type="text"
            value={quotaLimit}
            placeholder={t2("team.pastTeams.quotaLimitPlaceholder", {
              defaultValue:
                "设置成员积分上限；不设置时，成员可自由共享团队积分",
            })}
            aria-invalid={!quotaLimitValue.valid}
            onChange={(event) => setQuotaLimit(event.target.value)}
            aria-label={t2("team.inviteLink.quotaLimit", {
              defaultValue: "积分额度",
            })}
            data-action-ui-id="team.past-teams-quota"
          />
        </section>
      </div>
      <DialogFooter className="shrink-0 border-t border-border bg-popover px-4 py-3 sm:px-6">
        <Button
          type="button"
          disabled={selected2.size === 0 || !quotaLimitValue.valid}
          loading={submitting}
          onClick={() => void handleAddSelected()}
          data-action-ui-id="team.past-teams-add-selected"
        >
          <UserRoundPlus
            className="size-4"
            strokeWidth={1.5}
            aria-hidden={true}
          />
          {t2("team.pastTeams.addSelected", {
            defaultValue: "添加所选成员",
          })}
        </Button>
      </DialogFooter>
    </>
  );
}
