// invite-members-page.jsx
import {
  dedupedToast,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  X$7 as X,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import { Badge } from "../infra/badge-variants.jsx";
import { Input3 } from "../infra/select-content.jsx";
import {
  Page,
  PageContent,
  PageDescription,
  PageFooter,
  PageHeader,
  PageTitle,
} from "./page-content.jsx";
import { PastTeamMembersPanel } from "./past-team-members-panel.jsx";
import { teamApi } from "./team-api.js";
import { SegmentedSwitch } from "../canvas/popover-title.jsx";
const MAX_TEAM_INVITES = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseInviteEmails(value) {
  const candidates2 = value
    .split(/[,;\n]+/)
    .map((email) => email.trim())
    .filter(Boolean);
  if (candidates2.length === 0)
    return {
      ok: false,
      reason: "EMPTY",
      count: 0,
    };
  const invalidEmails = candidates2.filter(
    (email) => !EMAIL_PATTERN.test(email),
  );
  if (invalidEmails.length > 0)
    return {
      ok: false,
      reason: "INVALID",
      invalidEmails,
    };
  const emails = [...new Set(candidates2.map((email) => email.toLowerCase()))];
  if (emails.length > MAX_TEAM_INVITES) {
    return {
      ok: false,
      reason: "TOO_MANY",
      count: emails.length,
    };
  }
  return {
    ok: true,
    emails,
  };
}
function mergeInviteEmails(existingEmails, value) {
  const parsed = parseInviteEmails(value);
  if (!parsed.ok) return parsed;
  const emails = [
    ...new Set([
      ...existingEmails.map((email) => email.toLowerCase()),
      ...parsed.emails,
    ]),
  ];
  if (emails.length > MAX_TEAM_INVITES) {
    return {
      ok: false,
      reason: "TOO_MANY",
      count: emails.length,
    };
  }
  return {
    ok: true,
    emails,
  };
}
function inviteResultBadgeVariant(status) {
  if (status === "PENDING") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "ACCEPTED") return "secondary";
  return "warning";
}
export function InviteMembersPage({ open, scope, onOpenChange, onInvited }) {
  const { t: t2 } = useTranslation();
  const [emails, setEmails] = reactExports.useState([]);
  const [emailText, setEmailText] = reactExports.useState("");
  const [quotaLimit, setQuotaLimit] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [result, setResult] = reactExports.useState(null);
  const [tab2, setTab] = reactExports.useState("email");
  const [pastTabMounted, setPastTabMounted] = reactExports.useState(false);
  const showEmailTab = tab2 === "email" || result !== null;
  const quotaLimitValue = reactExports.useMemo(() => {
    const trimmed = quotaLimit.trim();
    if (trimmed === "")
      return {
        valid: true,
        value: void 0,
      };
    if (!/^(0|[1-9]\d*)$/.test(trimmed) || Number(trimmed) > 9007199254740991) {
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
  const statusLabels = {
    PENDING: t2("team.inviteMembers.status.pending", {
      defaultValue: "Invitation sent",
    }),
    FAILED: t2("team.inviteMembers.status.failed", {
      defaultValue: "Failed",
    }),
    ACCEPTED: t2("team.inviteMembers.status.accepted", {
      defaultValue: "Already a member",
    }),
    UNKNOWN: t2("team.inviteMembers.status.unknown", {
      defaultValue: "Unknown",
    }),
  };
  const reset2 = () => {
    setEmails([]);
    setEmailText("");
    setQuotaLimit("");
    setSubmitting(false);
    setResult(null);
    setTab("email");
    setPastTabMounted(false);
  };
  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) reset2();
    onOpenChange(nextOpen);
  };
  const showParseError = (parsed) => {
    if (parsed.reason === "EMPTY") {
      dedupedToast.error(
        t2("team.inviteMembers.emptyError", {
          defaultValue: "Enter at least one email address.",
        }),
      );
    } else if (parsed.reason === "TOO_MANY") {
      dedupedToast.error(
        t2("team.inviteMembers.tooManyError", {
          defaultValue: "You can invite up to {{count}} members at a time.",
          count: MAX_TEAM_INVITES,
        }),
      );
    } else {
      dedupedToast.error(
        t2("team.inviteMembers.invalidError", {
          defaultValue: "Invalid email address: {{emails}}",
          emails: parsed.invalidEmails.slice(0, 3).join(", "),
        }),
      );
    }
  };
  const commitEmailText = (value) => {
    if (!value.trim()) return false;
    const parsed = mergeInviteEmails(emails, value);
    if (!parsed.ok) {
      showParseError(parsed);
      return false;
    }
    setEmails(parsed.emails);
    setEmailText("");
    return true;
  };
  const handleEmailKeyDown = (event) => {
    if (event.key === "Enter" || event.key === "," || event.key === ";") {
      event.preventDefault();
      commitEmailText(emailText);
      return;
    }
    if (event.key === "Backspace" && !emailText && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  };
  const handleEmailPaste = (event) => {
    const pastedText = event.clipboardData.getData("text");
    if (!/[,;\n]/.test(pastedText)) return;
    event.preventDefault();
    commitEmailText([emailText, pastedText].filter(Boolean).join(","));
  };
  const handleRemoveEmail = (email) => {
    setEmails(emails.filter((item) => item !== email));
  };
  const handleInvite = async () => {
    const parsed = emailText.trim()
      ? mergeInviteEmails(emails, emailText)
      : emails.length > 0
        ? {
            ok: true,
            emails,
          }
        : parseInviteEmails("");
    if (!parsed.ok) {
      showParseError(parsed);
      return;
    }
    if (!quotaLimitValue.valid) return;
    setSubmitting(true);
    try {
      const nextResult =
        quotaLimitValue.value === void 0
          ? await teamApi.inviteMembers(scope.groupId, parsed.emails)
          : await teamApi.inviteMembers(scope.groupId, parsed.emails, {
              quotaLimit: quotaLimitValue.value,
            });
      setResult(nextResult);
      const retryEmails = nextResult.results
        .filter((item) => item.status === "FAILED" || item.status === "UNKNOWN")
        .map((item) => item.email);
      setEmails(retryEmails);
      setEmailText("");
      if (nextResult.successCount > 0) {
        dedupedToast.success(
          t2("team.inviteMembers.success", {
            defaultValue: "Invitations sent.",
          }),
        );
        onInvited();
      } else {
        dedupedToast.error(
          t2("team.inviteMembers.noneSent", {
            defaultValue: "No invitations were sent.",
          }),
        );
      }
    } catch {
      dedupedToast.error(
        t2("team.inviteMembers.sendFailed", {
          defaultValue: "Failed to send invitations.",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };
  const handleRetryFailed = () => {
    if (!result) return;
    const retryEmails = result.results
      .filter((item) => item.status === "FAILED" || item.status === "UNKNOWN")
      .map((item) => item.email);
    setEmails(retryEmails);
    setEmailText("");
    setResult(null);
  };
  return (
    <Page open={open} onOpenChange={handleOpenChange}>
      <PageContent
        className="flex min-w-0 max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0"
        data-action-ui-id="team.invite-members-dialog"
      >
        <PageHeader className="shrink-0 border-b border-border px-4 pt-4 pr-14 pb-3 sm:px-6 sm:pr-16">
          <PageTitle>
            {t2("team.inviteMembers.title", {
              defaultValue: "Invite members",
            })}
          </PageTitle>
          {!result && tab2 === "email" ? (
            <PageDescription>
              {t2("team.inviteMembers.description", {
                defaultValue:
                  "Enter up to {{count}} email addresses. Press Enter to confirm one, then continue with the next.",
                count: MAX_TEAM_INVITES,
              })}
            </PageDescription>
          ) : null}
        </PageHeader>
        {!result ? (
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
                defaultValue: "Invite members",
              })}
              dataActionUiId="team.invite-tab-switch"
              options={[
                {
                  value: "email",
                  label: t2("team.inviteMembers.tabEmail", {
                    defaultValue: "Invite by email",
                  }),
                  dataActionUiId: "team.invite-tab-email",
                },
                {
                  value: "past-teams",
                  label: t2("team.pastTeams.tabPast", {
                    defaultValue: "Add from past teams",
                  }),
                  dataActionUiId: "team.invite-tab-past-teams",
                },
              ]}
            />
          </div>
        ) : null}
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6",
            !showEmailTab && "hidden",
          )}
        >
          {result ? (
            <div
              className="space-y-3"
              data-action-ui-id="team.invite-members-results"
            >
              <p className="text-xs text-muted-foreground">
                {t2("team.inviteMembers.summary", {
                  defaultValue: "{{success}} sent, {{failed}} failed",
                  success: result.successCount,
                  failed: result.failedCount,
                })}
              </p>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {result.results.map((item) => (
                  <div
                    key={item.email}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {item.email}
                      </p>
                      {item.errorMessage ? (
                        <p className="mt-1 text-xs text-destructive">
                          {item.errorMessage}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant={inviteResultBadgeVariant(item.status)}>
                      {statusLabels[item.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex min-h-24 flex-wrap content-start gap-2 rounded-lg border border-input bg-background px-3 py-2 focus-within:border-foreground focus-within:ring-0">
                  {emails.map((email) => (
                    <Badge
                      key={email}
                      variant="success"
                      className="h-7 max-w-full gap-1 pl-2 pr-1"
                    >
                      <span className="truncate">{email}</span>
                      <button
                        type="button"
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-current opacity-70 hover:bg-background/20 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        aria-label={t2("team.inviteMembers.removeEmail", {
                          defaultValue: "Remove {{email}}",
                          email,
                        })}
                        onClick={() => handleRemoveEmail(email)}
                      >
                        <X className="size-3.5" aria-hidden={true} />
                      </button>
                    </Badge>
                  ))}
                  <Input3
                    value={emailText}
                    onChange={(event) => setEmailText(event.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    onPaste={handleEmailPaste}
                    placeholder={
                      emails.length > 0
                        ? t2("team.inviteMembers.continuePlaceholder", {
                            defaultValue: "Enter another email and press Enter",
                          })
                        : t2("team.inviteMembers.placeholder", {
                            defaultValue: "name@example.com",
                          })
                    }
                    aria-label={t2("team.inviteMembers.emailInput", {
                      defaultValue: "Member email addresses",
                    })}
                    className="h-7 min-w-52 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    data-action-ui-id="team.invite-members-email-input"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t2("team.inviteMembers.helper", {
                    defaultValue:
                      "Press Enter to confirm each email. You can also paste multiple addresses separated by commas, semicolons, or new lines.",
                  })}
                </p>
              </div>
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  {t2("team.inviteLink.quotaLimit", {
                    defaultValue: "Credit quota",
                  })}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {t2("common.optional", {
                      defaultValue: "Optional",
                    })}
                  </span>
                </h3>
                <Input3
                  type="text"
                  inputMode="numeric"
                  value={quotaLimit}
                  placeholder={t2("team.inviteLink.quotaLimitPlaceholder", {
                    defaultValue: "Leave empty for no credit limit",
                  })}
                  aria-invalid={!quotaLimitValue.valid}
                  onChange={(event) => setQuotaLimit(event.target.value)}
                  aria-label={t2("team.inviteLink.quotaLimit", {
                    defaultValue: "Credit quota",
                  })}
                  data-action-ui-id="team.invite-members-quota"
                />
                <p className="text-xs text-muted-foreground">
                  {t2("team.inviteMembers.quotaNote", {
                    defaultValue:
                      "Invited members will automatically receive this credit limit.",
                  })}
                </p>
              </section>
            </>
          )}
        </div>
        {pastTabMounted ? (
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col",
              showEmailTab && "hidden",
            )}
          >
            <PastTeamMembersPanel
              scope={scope}
              active={open && !showEmailTab}
            />
          </div>
        ) : null}
        <PageFooter
          className={cn(
            "shrink-0 border-t border-border bg-popover px-4 py-3 sm:px-6",
            !showEmailTab && "hidden",
          )}
        >
          {result ? (
            <>
              {result.failedCount > 0 ||
              result.results.some(
                (item) => item.status === "FAILED" || item.status === "UNKNOWN",
              ) ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRetryFailed}
                  data-action-ui-id="team.invite-members-retry-failed"
                >
                  {t2("team.inviteMembers.retryFailed", {
                    defaultValue: "修正失败项并重试",
                  })}
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                data-action-ui-id="team.invite-members-done"
              >
                {t2("common.done", {
                  defaultValue: "Done",
                })}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {t2("common.cancel", {
                  defaultValue: "Cancel",
                })}
              </Button>
              <Button
                type="button"
                loading={submitting}
                disabled={
                  (emails.length === 0 && emailText.trim().length === 0) ||
                  !quotaLimitValue.valid
                }
                onClick={() => void handleInvite()}
                data-action-ui-id="team.invite-members-submit"
              >
                {t2("team.inviteMembers.send", {
                  defaultValue: "Send invitations",
                })}
              </Button>
            </>
          )}
        </PageFooter>
      </PageContent>
    </Page>
  );
}
