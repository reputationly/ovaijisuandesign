// past-team-members-panel.jsx
import {
  jsxRuntimeExports,
  useTranslation,
  reactExports,
  dedupedToast,
  X$7,
  AlertTriangle,
  getRuntimeConfig,
  teamQueryKeys,
  useQueryClient,
  Search,
  HUB_WEB_INVITE_DOMAINS,
  UserRoundPlus,
  Link2,
  Copy,
} from "../vendor.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button$1,
  cn$2,
  Badge,
  Checkbox,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { Input3 } from "../asset-center/shared/select-content.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  describeTeamMutationError,
  formatTeamMutationErrorSuffix,
  isUpstreamContractFailure,
} from "./batch-remove-members-dialog.jsx";
import { teamApi } from "./team-api.js";
import { SegmentedSwitch } from "./use-credit-details.jsx";
import { Spinner, usePastTeamMembersQuery } from "./use-team-transactions-feed-query.jsx";
function buildTeamInviteWebLink({ region, channel, token: token2 }) {
  const environment = channel === "prod" ? "prod" : "test";
  const url2 = new URL("/media-plan/team/invite", HUB_WEB_INVITE_DOMAINS[environment][region]);
  url2.searchParams.set("token", token2);
  return url2.toString();
}
const MAX_PAST_TEAM_SELECTION = 100;
const MAX_QUOTA_LIMIT$1 = 9007199254740991;
const UNSIGNED_DECIMAL$2 = /^(0|[1-9]\d*)$/;
const MEMBER_SEARCH_DEBOUNCE_MS$1 = 250;
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
    }, MEMBER_SEARCH_DEBOUNCE_MS$1);
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
    if (!UNSIGNED_DECIMAL$2.test(trimmed) || Number(trimmed) > MAX_QUOTA_LIMIT$1) {
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
  const selectedInList = members.filter((m3) => selected2.has(m3.userId)).length;
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
        (result) => result.status === "FAILED" && result.errorCode !== MEMBER_ALREADY_EXISTS_CODE,
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
      const suffix = formatTeamMutationErrorSuffix(describeTeamMutationError(error));
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
                  <X$7 className="size-3.5" aria-hidden={true} />
                </button>
              </Badge>
            ))}
            <Button$1
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
            </Button$1>
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
              <Button$1
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void feed.refetch()}
              >
                {t2("common.retry", {
                  defaultValue: "重试",
                })}
              </Button$1>
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
                  onCheckedChange={(checked) => handleToggleAll(members, checked === true)}
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
                      onCheckedChange={(checked) => handleToggleMember(member, checked === true)}
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
              defaultValue: "设置成员积分上限；不设置时，成员可自由共享团队积分",
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
        <Button$1
          type="button"
          disabled={selected2.size === 0 || !quotaLimitValue.valid}
          loading={submitting}
          onClick={() => void handleAddSelected()}
          data-action-ui-id="team.past-teams-add-selected"
        >
          <UserRoundPlus className="size-4" strokeWidth={1.5} aria-hidden={true} />
          {t2("team.pastTeams.addSelected", {
            defaultValue: "添加所选成员",
          })}
        </Button$1>
      </DialogFooter>
    </>
  );
}
export const TeamDialogNavigationContext = reactExports.createContext(null);
export function Page({ open, onOpenChange, children: children2 }) {
  const navigation2 = reactExports.useContext(TeamDialogNavigationContext);
  const closeRef = reactExports.useRef(onOpenChange);
  closeRef.current = onOpenChange;
  reactExports.useEffect(() => {
    if (!open || !navigation2) return;
    const close2 = () => closeRef.current(false);
    navigation2.current = close2;
    return () => {
      if (navigation2.current === close2) navigation2.current = null;
    };
  }, [open, navigation2]);
  if (!open) return null;
  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      {children2}
    </Dialog>
  );
}
export function PageContent({ children: children2, className, ...props }) {
  const focusRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const previous2 = document.activeElement;
    focusRef.current?.focus();
    return () => {
      if (previous2 instanceof HTMLElement && previous2.isConnected) previous2.focus();
    };
  }, []);
  return (
    <DialogContent
      ref={focusRef}
      layer="nested"
      size="lg"
      {...props}
      className={cn$2(
        "flex max-h-[calc(100dvh-3rem)] min-h-0 flex-col gap-4 overflow-y-auto p-6",
        className,
      )}
    >
      {children2}
    </DialogContent>
  );
}
export function PageTitle({ className, ...props }) {
  return <DialogTitle {...props} className={cn$2("font-heading text-lg font-medium", className)} />;
}
export function PageDescription({ className, ...props }) {
  return <DialogDescription {...props} className={className} />;
}
export function PageHeader({ className, ...props }) {
  return <DialogHeader {...props} className={className} />;
}
export function PageFooter({ className, ...props }) {
  return <DialogFooter {...props} className={className} />;
}
const EXPIRY_OPTIONS = [1, 7, 14, 30, 0];
const MAX_USE_OPTIONS = [1, 5, 10, 20, -1, 0];
const MAX_CUSTOM_USES = 2147483647;
const MAX_QUOTA_LIMIT = 9007199254740991;
const DAY_SECONDS = 24 * 60 * 60;
const UNSIGNED_DECIMAL$1 = /^(0|[1-9]\d*)$/;
function optionClass(selected2) {
  return selected2
    ? "border-foreground bg-foreground text-background"
    : "border-border bg-background text-muted-foreground hover:text-foreground";
}
export function CreateInviteLinkPage({ open, scope, onOpenChange, onCreated }) {
  const { t: t2 } = useTranslation();
  const [expiryDays, setExpiryDays] = reactExports.useState(7);
  const [maxUsesOption, setMaxUsesOption] = reactExports.useState(5);
  const [customMaxUses, setCustomMaxUses] = reactExports.useState("50");
  const [quotaLimit, setQuotaLimit] = reactExports.useState("");
  const [creating, setCreating] = reactExports.useState(false);
  const [createdLink, setCreatedLink] = reactExports.useState(null);
  const [actionError, setActionError] = reactExports.useState(null);
  const [tab2, setTab] = reactExports.useState("link");
  const [pastTabMounted, setPastTabMounted] = reactExports.useState(false);
  const showLinkTab = tab2 === "link" || createdLink !== null;
  const maxUses = reactExports.useMemo(() => {
    if (maxUsesOption === 0) return 0;
    if (maxUsesOption !== -1) return maxUsesOption;
    const parsed = Number(customMaxUses);
    return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_CUSTOM_USES ? parsed : null;
  }, [customMaxUses, maxUsesOption]);
  const quotaLimitValue = reactExports.useMemo(() => {
    const trimmed = quotaLimit.trim();
    if (trimmed === "")
      return {
        valid: true,
        value: void 0,
      };
    if (!UNSIGNED_DECIMAL$1.test(trimmed) || Number(trimmed) > MAX_QUOTA_LIMIT) {
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
  reactExports.useEffect(() => {
    if (!open) {
      setCreatedLink(null);
      setActionError(null);
      setCreating(false);
      setQuotaLimit("");
      setTab("link");
      setPastTabMounted(false);
    }
  }, [open]);
  const handleCreate = async () => {
    if (maxUses === null || !quotaLimitValue.valid) return;
    setCreating(true);
    setActionError(null);
    try {
      const result = await teamApi.createInviteLink({
        scope,
        maxUses,
        expireSeconds: expiryDays === 0 ? 0 : expiryDays * DAY_SECONDS,
        quotaLimit: quotaLimitValue.value,
      });
      const runtime = getRuntimeConfig();
      setCreatedLink(
        buildTeamInviteWebLink({
          region: runtime.region,
          channel: runtime.channel,
          token: result.token,
        }),
      );
      onCreated();
    } catch (error) {
      const detail = describeTeamMutationError(error);
      const suffix = formatTeamMutationErrorSuffix(detail);
      const primary = isUpstreamContractFailure(detail)
        ? t2("team.inviteLink.createUpstreamUnavailable", {
            defaultValue: "邀请链接创建暂不可用（上游未就绪或参数被拒绝），请稍后重试或联系支持。",
          })
        : t2("team.inviteLink.createFailed", {
            defaultValue: "创建邀请链接失败",
          });
      const message2 = suffix ? `${primary}（${suffix}）` : primary;
      setActionError(message2);
      dedupedToast.error(message2);
    } finally {
      setCreating(false);
    }
  };
  const handleCopy = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    dedupedToast.success(
      t2("common.copied", {
        defaultValue: "已复制",
      }),
    );
  };
  return (
    <Page open={open} onOpenChange={onOpenChange}>
      <PageContent
        className="flex min-w-0 max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0"
        data-action-ui-id="team.create-invite-link-dialog"
      >
        <PageHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pr-16">
          <PageTitle>
            {createdLink
              ? t2("team.inviteLink.createdTitle", {
                  defaultValue: "邀请链接已创建",
                })
              : t2("team.inviteMembers.title", {
                  defaultValue: "邀请成员",
                })}
          </PageTitle>
          {!createdLink ? (
            <PageDescription>
              {t2("team.inviteMembers.managementDescription", {
                defaultValue: "通过链接邀请或从过往团队添加成员，按需设置积分上限。",
              })}
            </PageDescription>
          ) : null}
        </PageHeader>
        {!createdLink ? (
          <div className="shrink-0 px-4 pt-3 sm:px-6">
            <SegmentedSwitch
              variant="label"
              stretch={true}
              value={tab2}
              onValueChange={(next2) => {
                setTab(next2);
                if (next2 === "past-teams") setPastTabMounted(true);
              }}
              ariaLabel={t2("team.inviteMembers.title", {
                defaultValue: "邀请成员",
              })}
              dataActionUiId="team.invite-tab-switch"
              options={[
                {
                  value: "link",
                  label: t2("team.pastTeams.tabLink", {
                    defaultValue: "通过链接邀请",
                  }),
                  dataActionUiId: "team.invite-tab-link",
                },
                {
                  value: "past-teams",
                  label: t2("team.pastTeams.tabPast", {
                    defaultValue: "从过往团队中添加",
                  }),
                  dataActionUiId: "team.invite-tab-past-teams",
                },
              ]}
            />
          </div>
        ) : null}
        <div
          className={cn$2(
            "min-h-0 min-w-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6",
            !showLinkTab && "hidden",
          )}
        >
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              {t2("team.inviteLink.expiry", {
                defaultValue: "链接有效期",
              })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  className={`h-9 rounded-lg border px-4 text-sm transition-colors ${optionClass(expiryDays === days)}`}
                  onClick={() => setExpiryDays(days)}
                >
                  {days === 0
                    ? t2("team.inviteLink.neverExpires", {
                        defaultValue: "永久有效",
                      })
                    : t2("team.inviteLink.days", {
                        defaultValue: "{{count}} 天",
                        count: days,
                      })}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {expiryDays === 0
                ? t2("team.inviteLink.foreverNote", {
                    defaultValue: "该链接永久有效，可随时在团队管理页撤销。",
                  })
                : t2("team.inviteLink.expiryNote", {
                    defaultValue: "{{date}} 前有效，过期后邀请链接自动失效。",
                    date: new Date(
                      Date.now() + expiryDays * DAY_SECONDS * 1e3,
                    ).toLocaleDateString(),
                  })}
            </p>
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              {t2("team.inviteLink.maxUses", {
                defaultValue: "使用次数限制",
              })}
            </h3>
            <div className="flex flex-wrap gap-2">
              {MAX_USE_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`h-9 rounded-lg border px-4 text-sm transition-colors ${optionClass(maxUsesOption === value)}`}
                  onClick={() => setMaxUsesOption(value)}
                >
                  {value === -1
                    ? t2("team.inviteLink.custom", {
                        defaultValue: "自定义",
                      })
                    : value === 0
                      ? t2("team.inviteLink.unlimited", {
                          defaultValue: "不限次数",
                        })
                      : value}
                </button>
              ))}
            </div>
            {maxUsesOption === -1 ? (
              <Input3
                type="number"
                min={1}
                max={MAX_CUSTOM_USES}
                value={customMaxUses}
                onChange={(event) => setCustomMaxUses(event.target.value)}
                aria-label={t2("team.inviteLink.customMaxUses", {
                  defaultValue: "自定义使用次数",
                })}
              />
            ) : null}
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              {t2("team.inviteLink.quotaLimit", {
                defaultValue: "积分额度",
              })}
            </h3>
            <Input3
              type="number"
              min={0}
              value={quotaLimit}
              placeholder={t2("team.inviteLink.quotaLimitPlaceholder", {
                defaultValue: "设置成员积分上限；不设置时，成员可自由共享团队积分",
              })}
              aria-invalid={!quotaLimitValue.valid}
              onChange={(event) => setQuotaLimit(event.target.value)}
              aria-label={t2("team.inviteLink.quotaLimit", {
                defaultValue: "积分额度",
              })}
              data-action-ui-id="team.create-invite-link-quota"
            />
          </section>
          {actionError ? (
            <div
              role="alert"
              className="rounded-lg border border-border bg-muted p-3 text-xs text-foreground"
              data-action-ui-id="team.create-invite-link-error"
              data-team-error-code={actionError.includes("sc=") ? "upstream" : "failed"}
            >
              <p className="flex gap-2">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  strokeWidth={1.5}
                  aria-hidden={true}
                />
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                  {actionError}
                </span>
              </p>
            </div>
          ) : null}
          {createdLink ? (
            <div className="space-y-2">
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted p-2">
                <Link2 className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <p className="min-w-0 flex-1 truncate text-xs text-foreground">{createdLink}</p>
                <Button$1
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCopy()}
                >
                  <Copy className="size-4" strokeWidth={1.5} aria-hidden={true} />
                  {t2("common.copy", {
                    defaultValue: "复制",
                  })}
                </Button$1>
              </div>
              <p
                className="text-xs text-muted-foreground"
                data-action-ui-id="team.create-invite-link-save-notice"
              >
                {t2("team.inviteLink.saveLinkNotice", {
                  defaultValue: "请在关闭前复制链接，关闭后将无法再次查看。",
                })}
              </p>
            </div>
          ) : null}
        </div>
        {pastTabMounted ? (
          <div className={cn$2("flex min-h-0 min-w-0 flex-1 flex-col", showLinkTab && "hidden")}>
            <PastTeamMembersPanel scope={scope} active={open && !showLinkTab} />
          </div>
        ) : null}
        <PageFooter
          className={cn$2(
            "shrink-0 border-t border-border bg-popover px-4 py-3 sm:px-6",
            !showLinkTab && "hidden",
          )}
        >
          <Button$1 type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {createdLink
              ? t2("common.close", {
                  defaultValue: "关闭",
                })
              : t2("common.cancel", {
                  defaultValue: "取消",
                })}
          </Button$1>
          {!createdLink ? (
            <Button$1
              type="button"
              loading={creating}
              disabled={maxUses === null || !quotaLimitValue.valid}
              onClick={() => void handleCreate()}
              data-action-ui-id="team.create-invite-link-generate"
            >
              {t2("team.inviteLink.generate", {
                defaultValue: "生成邀请链接",
              })}
            </Button$1>
          ) : null}
        </PageFooter>
      </PageContent>
    </Page>
  );
}
