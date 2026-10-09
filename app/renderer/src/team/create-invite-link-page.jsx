// create-invite-link-page.jsx
import { HUB_WEB_INVITE_DOMAINS } from "../vendor-inline/vscode-base/graph.jsx";
import {
  AlertTriangle,
  Copy,
  dedupedToast,
  getRuntimeConfig,
  Link2,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { PastTeamMembersPanel } from "./past-team-members-panel.jsx";
import {
  Page,
  PageContent,
  PageDescription,
  PageFooter,
  PageHeader,
  PageTitle,
} from "./page-content.jsx";
import { Button$1, cn$2 } from "../infra/dialog-content.jsx";
import { Input3 } from "../infra/select-content.jsx";
import {
  describeTeamMutationError,
  formatTeamMutationErrorSuffix,
  isUpstreamContractFailure,
} from "./team-management-detail-loading.jsx";
import { teamApi } from "./team-api.js";
import { SegmentedSwitch } from "../canvas/popover-title.jsx";

function buildTeamInviteWebLink({ region, channel, token: token2 }) {
  const environment = channel === "prod" ? "prod" : "test";
  const url2 = new URL(
    "/media-plan/team/invite",
    HUB_WEB_INVITE_DOMAINS[environment][region],
  );
  url2.searchParams.set("token", token2);
  return url2.toString();
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
    return Number.isSafeInteger(parsed) &&
      parsed > 0 &&
      parsed <= MAX_CUSTOM_USES
      ? parsed
      : null;
  }, [customMaxUses, maxUsesOption]);
  const quotaLimitValue = reactExports.useMemo(() => {
    const trimmed = quotaLimit.trim();
    if (trimmed === "")
      return {
        valid: true,
        value: void 0,
      };
    if (
      !UNSIGNED_DECIMAL$1.test(trimmed) ||
      Number(trimmed) > MAX_QUOTA_LIMIT
    ) {
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
            defaultValue:
              "邀请链接创建暂不可用（上游未就绪或参数被拒绝），请稍后重试或联系支持。",
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
                defaultValue:
                  "通过链接邀请或从过往团队添加成员，按需设置积分上限。",
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
                defaultValue:
                  "设置成员积分上限；不设置时，成员可自由共享团队积分",
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
              data-team-error-code={
                actionError.includes("sc=") ? "upstream" : "failed"
              }
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
                <Link2
                  className="size-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <p className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {createdLink}
                </p>
                <Button$1
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCopy()}
                >
                  <Copy
                    className="size-4"
                    strokeWidth={1.5}
                    aria-hidden={true}
                  />
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
          <div
            className={cn$2(
              "flex min-h-0 min-w-0 flex-1 flex-col",
              showLinkTab && "hidden",
            )}
          >
            <PastTeamMembersPanel scope={scope} active={open && !showLinkTab} />
          </div>
        ) : null}
        <PageFooter
          className={cn$2(
            "shrink-0 border-t border-border bg-popover px-4 py-3 sm:px-6",
            !showLinkTab && "hidden",
          )}
        >
          <Button$1
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
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
