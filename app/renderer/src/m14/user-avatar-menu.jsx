// user-avatar-menu.jsx
import { jsxRuntimeExports, useTranslation, reactExports, Check, Copy, dedupedToast, guardAccountSubmission, usePlatform, getRuntimeConfig, Plus, Smartphone, useQueryClient, User, GraduationCap, SwatchBook, Wrench } from "../vendor.js";
import { useAuth, useOptionalTeamAccount, accountScopeKey, teamQueryKeys, creditQueryKeys } from "../m15/apply-asset-change.jsx";
import { canUseDebugTooling } from "../m15/create-visible-preview-tabs-store.js";
import { Icon, openExternalUrl } from "../m15/graph.jsx";
import { DEBUG_PANEL_OPEN_EVENT } from "../m15/interest-selection-provider.jsx";
import { FileText, Users, Settings, LogOut } from "../m15/parse-item.jsx";
import { DEFAULT_PAGE_STATE_PREVIEW_SCHEMA } from "../m15/parse-timeline-operations.js";
import { TRACK_EVENTS } from "../m15/track-events.js";
import {
  cn$2,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import {
  useCanMigrate,
  useMpSubscribeUrl,
  SubscriptionRenewalBadge,
  MpCreditRow,
  HailuoCreditRow,
} from "../m09/use-credit-details.jsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  getTutorialUrl,
} from "../m08/shortcut-categories.jsx";
import { RetryIcon, FeedbackIcon } from "../m08/browser-inspiration-urls.jsx";
import { trackEvent } from "../asset-center/shared/init-track.js";
import { PageStateView } from "../asset-center/shared/page-state-boundary.jsx";
import { useImBridgeDialog } from "../m10/use-coach-mark.jsx";
import { useSettingsDialog } from "../m10/custom-provider-form.jsx";
import { useImAccounts } from "../m10/use-feishu-qr-login.jsx";
import {
  useSubscriptionRenewalNotice,
  CreditDetailsDialog,
} from "../m09/billing-model-display-labels.jsx";
import { AccountSwitcherView, TeamAccountSummary } from "../m09/account-switcher-view.jsx";
import { VersionRow } from "../m10/update-banner.jsx";
import { MigrationDialog } from "../m10/migration-popup.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  ComponentsLibrary,
  IconPreview,
  parsePageStatePreviewSchema,
} from "./parse-page-state-preview-schema.jsx";
import {
  ColorTokens,
  ScrollArea,
  useResizedAvatar,
  useUserMenuController,
} from "./slider-section.jsx";
import {
  IM_BRIDGE_SHORTCUT_SEEN_KEY,
  ImBridgeConnectionStatus,
  ImBridgeShortcutWithTooltip,
  LoggedOutSidebarActionPresentation,
  MemoryManagementMenuButton,
  MenuButton,
  MenuSection,
  NewBadge,
  SidebarBottomActionStack,
  SubscriptionSummaryRow,
  ThemeSwitcher,
  UserMenuAccountSummary,
  UserMenuPopoverShell,
  UserMenuRootView,
  UserProtocolFlyout,
  UserProtocolMenuRow,
  hasSeenImBridgeShortcut,
  useUserProtocolSubmenu,
} from "./user-menu-popover-content.jsx";
const handlePreviewAction = () => void 0;
const SCENARIOS = [
  {
    value: "empty",
    label: "Empty",
    state: {
      type: "empty",
      actions: [],
    },
  },
  {
    value: "project-empty",
    label: "Project Empty",
    state: {
      type: "empty",
      reason: "project",
      title: "No projects yet",
      description: "Create a project to get started.",
      actions: [
        {
          key: "create",
          icon: <Icon icon={Plus} size="sm" strokeWidth={2} aria-hidden={true} />,
          label: "Create Project",
          variant: "default",
          onClick: handlePreviewAction,
        },
      ],
    },
  },
  {
    value: "error",
    label: "Error",
    state: {
      type: "error",
      actions: [
        {
          key: "retry",
          icon: <RetryIcon size={14} aria-hidden={true} />,
          label: "Retry",
          variant: "default",
          onClick: handlePreviewAction,
        },
      ],
    },
  },
  {
    value: "network",
    label: "Network",
    state: {
      type: "error",
      reason: "network",
      actions: [
        {
          key: "retry",
          icon: <RetryIcon size={14} aria-hidden={true} />,
          label: "Retry",
          variant: "default",
          onClick: handlePreviewAction,
        },
        {
          key: "feedback",
          icon: <FeedbackIcon size={14} aria-hidden={true} />,
          label: "Feedback",
          variant: "outline",
          onClick: handlePreviewAction,
        },
      ],
    },
  },
  {
    value: "structured",
    label: "Structured",
    state: {
      type: "empty",
      title: "No projects yet",
      description: "Create a project to get started.",
      actions: [
        {
          key: "create",
          icon: <Icon icon={Plus} size="sm" strokeWidth={2} aria-hidden={true} />,
          label: "Create Project",
          variant: "default",
          onClick: handlePreviewAction,
        },
      ],
    },
  },
  {
    value: "action-states",
    label: "Action States",
    state: {
      type: "error",
      title: "Unable to load projects",
      description: "Button states are controlled by the business layer.",
      actions: [
        {
          key: "retry",
          label: "Retrying",
          variant: "default",
          onClick: handlePreviewAction,
          loading: true,
        },
        {
          key: "feedback",
          icon: <FeedbackIcon size={14} aria-hidden={true} />,
          label: "Feedback",
          variant: "outline",
          onClick: handlePreviewAction,
          disabled: true,
        },
      ],
    },
  },
];
const PREVIEW_FRAMES = [
  {
    key: "page",
    label: "Page container",
    className: "w-full",
  },
  {
    key: "panel",
    label: "Panel container",
    className: "w-full max-w-md self-center",
  },
];
const INITIAL_CUSTOM_STATE = parsePageStatePreviewSchema(DEFAULT_PAGE_STATE_PREVIEW_SCHEMA)
  .state ?? {
  type: "empty",
  actions: [],
};
function PageStatePreview() {
  const { t: t2 } = useTranslation();
  const [schemaSource, setSchemaSource] = reactExports.useState(DEFAULT_PAGE_STATE_PREVIEW_SCHEMA);
  const [customState, setCustomState] = reactExports.useState(INITIAL_CUSTOM_STATE);
  const [schemaError, setSchemaError] = reactExports.useState(null);
  const scenarios = [
    ...SCENARIOS,
    {
      value: "custom",
      label: "Custom Schema",
      state: customState,
    },
  ];
  const handleSchemaChange = (event) => {
    const source = event.target.value;
    const result = parsePageStatePreviewSchema(source);
    setSchemaSource(source);
    setSchemaError(result.error);
    if (result.state != null) setCustomState(result.state);
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground">
        Compare the same state in page and panel widths. Default illustrations follow the current
        app theme.
      </p>
      <section className="space-y-2" data-action-ui-id="ui-spec-page-state-compact">
        <h3 className="text-sm font-medium">{t2("uiSpec.pageState.compact.title")}</h3>
        <p className="text-xs text-muted-foreground">{t2("uiSpec.pageState.compact.note")}</p>
        <div className="flex h-40 max-w-sm overflow-auto rounded-lg border border-border bg-popover">
          <PageStateView
            density="compact"
            state={{
              type: "empty",
              text: t2("mention.popover.noResults"),
              actions: [],
            }}
          />
        </div>
      </section>
      <Tabs defaultValue="empty" className="gap-3">
        <TabsList
          className="w-fit max-w-full flex-wrap"
          data-action-ui-id="ui-spec-page-state-scenarios"
        >
          {scenarios.map((scenario) => (
            <TabsTrigger
              key={scenario.value}
              value={scenario.value}
              className="text-xs"
              data-action-ui-id={`ui-spec-page-state-${scenario.value}`}
            >
              {scenario.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {scenarios.map((scenario) => (
          <TabsContent key={scenario.value} value={scenario.value}>
            <div className="flex flex-col gap-3">
              {scenario.value === "custom" ? (
                <section className="flex flex-col gap-1.5">
                  <label
                    htmlFor="page-state-preview-schema"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Page state schema
                  </label>
                  <Textarea
                    id="page-state-preview-schema"
                    value={schemaSource}
                    onChange={handleSchemaChange}
                    aria-invalid={schemaError != null}
                    aria-describedby="page-state-preview-schema-help"
                    spellCheck={false}
                    className="min-h-52 resize-y font-mono text-[11px] leading-relaxed"
                    data-action-ui-id="ui-spec-page-state-schema-input"
                  />
                  <p
                    id="page-state-preview-schema-help"
                    role={schemaError == null ? void 0 : "alert"}
                    className={
                      schemaError == null
                        ? "text-[11px] text-muted-foreground"
                        : "text-[11px] text-destructive"
                    }
                  >
                    {schemaError ??
                      "Reason values: empty uses generic/project; error uses generic/network. Supported action fields: key, icon, label, variant, placement, disabled, and loading. Placement is inline by default; use separate for a secondary action such as Dismiss. Icon values: feedback, refresh-cw, or x. Click callbacks are mocked by the preview."}
                  </p>
                </section>
              ) : null}
              <div className="flex flex-col gap-3" data-slot="page-state-preview-frames">
                {PREVIEW_FRAMES.map((frame2) => (
                  <section
                    key={frame2.key}
                    className={`flex min-w-0 flex-col gap-1.5 ${frame2.className}`}
                  >
                    <h3 className="text-[11px] font-medium text-muted-foreground">
                      {frame2.label}
                    </h3>
                    <div
                      className="flex min-h-96 overflow-hidden rounded-lg border border-border bg-background"
                      data-action-ui-id={`ui-spec-page-state-${frame2.key}-preview`}
                    >
                      <PageStateView state={scenario.state} density={frame2.key}>
                        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-foreground/70">
                          Normal content renders without an additional state container.
                        </div>
                      </PageStateView>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
const SPACING_SCALE = [
  {
    name: "gap-1",
    px: 4,
  },
  {
    name: "gap-1.5",
    px: 6,
  },
  {
    name: "gap-2",
    px: 8,
  },
  {
    name: "gap-3",
    px: 12,
  },
  {
    name: "gap-4",
    px: 16,
  },
  {
    name: "gap-6",
    px: 24,
  },
  {
    name: "gap-10",
    px: 40,
  },
];
const ROUNDED_TOKENS = [
  {
    name: "scrollbar",
    px: 3,
  },
  {
    name: "inline-code",
    px: 4,
  },
  {
    name: "code-block",
    px: 6,
  },
  {
    name: "rounded-sm",
    px: 7.2,
  },
  {
    name: "rounded-md",
    px: 9.6,
  },
  {
    name: "rounded-lg / default",
    px: 12,
  },
  {
    name: "rounded-xl",
    px: 16.8,
  },
  {
    name: "rounded-full",
    px: 999,
  },
];
function SpacingTokens() {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Spacing Scale
        </h3>
        <p className="text-[10px] text-muted-foreground">Tailwind 默认 scale，禁止内联 px。</p>
        <div className="flex flex-col gap-1">
          {SPACING_SCALE.map((s2) => (
            <div
              key={s2.name}
              className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
            >
              <div
                className="h-3 bg-foreground shrink-0"
                style={{
                  width: `${s2.px}px`,
                }}
              />
              <div className="text-[10px] font-mono text-foreground flex-1">{s2.name}</div>
              <div className="text-[9px] font-mono text-muted-foreground">{s2.px}px</div>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Rounded
        </h3>
        <p className="text-[10px] text-muted-foreground">
          以当前主题 token 的实际计算值为准；结构分隔层可保留直角。
        </p>
        <div className="flex flex-col gap-1.5">
          {ROUNDED_TOKENS.map((r2) => (
            <div
              key={r2.name}
              className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
            >
              <div
                className="h-6 w-6 bg-foreground shrink-0"
                style={{
                  borderRadius: `${r2.px}px`,
                }}
              />
              <div className="text-[10px] font-mono text-foreground flex-1">{r2.name}</div>
              <div className="text-[9px] font-mono text-muted-foreground">{r2.px}px</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
const TYPOGRAPHY_LEVELS = [
  {
    name: "display-hero",
    className: "text-[64px] leading-[72px] font-light",
    sample: "Hero",
  },
  {
    name: "display-section",
    className: "text-[28px] font-light",
    sample: "章节标题",
  },
  {
    name: "feature",
    className: "text-[22px]",
    sample: "特色内容",
  },
  {
    name: "card-title",
    className: "text-sm font-heading font-medium",
    sample: "卡片标题 Card Title",
  },
  {
    name: "body (text-xs)",
    className: "text-xs",
    sample: "正文 Body Text 12px",
  },
  {
    name: "label (text-[11px])",
    className: "text-[11px] font-medium",
    sample: "Label / Badge 11px",
  },
];
const FONT_FAMILIES = [
  {
    token: "--font-sans",
    className: "font-sans",
    display: "Inter Variable Aa Bb 中文",
  },
  {
    token: "--font-heading",
    className: "font-heading",
    display: "Outfit Aa Bb 中文",
  },
  {
    token: "--font-pixel",
    className: "font-pixel",
    display: "Pixelify Aa Bb",
  },
];
function TypographyTokens() {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          字号层级
        </h3>
        <div className="flex flex-col gap-3">
          {TYPOGRAPHY_LEVELS.map((level) => (
            <div
              key={level.name}
              className="flex flex-col gap-1 overflow-hidden rounded-lg border border-border p-2"
            >
              <div className="text-[10px] font-mono text-muted-foreground">{level.name}</div>
              <div className={`${level.className} truncate text-foreground`} title={level.sample}>
                {level.sample}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground truncate">
                {level.className}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          字体族
        </h3>
        <div className="flex flex-col gap-2">
          {FONT_FAMILIES.map((ff) => (
            <div key={ff.token} className="flex flex-col gap-1 rounded-lg border border-border p-2">
              <div className="text-[10px] font-mono text-muted-foreground">{ff.token}</div>
              <div className={`${ff.className} text-base text-foreground truncate`}>
                {ff.display}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
const TABS = [
  {
    value: "colors",
    label: "Colors",
    Component: ColorTokens,
  },
  {
    value: "typography",
    label: "Typography",
    Component: TypographyTokens,
  },
  {
    value: "spacing",
    label: "Spacing",
    Component: SpacingTokens,
  },
  {
    value: "icons",
    label: "Icon",
    Component: IconPreview,
  },
  {
    value: "components",
    label: "Components",
    Component: ComponentsLibrary,
  },
  {
    value: "page-states",
    label: "Default States",
    Component: PageStatePreview,
  },
];
function UISpecContent() {
  return (
    <Tabs defaultValue="colors" className="flex h-full flex-col">
      <TabsList
        className="mx-4 mt-3 flex w-fit max-w-[calc(100%-2rem)] shrink-0 overflow-x-auto"
        data-action-ui-id="ui-spec-tabs"
      >
        {TABS.map((tab2) => (
          <TabsTrigger
            key={tab2.value}
            value={tab2.value}
            className="px-3 text-xs"
            data-action-ui-id={`ui-spec-tab-${tab2.value}`}
          >
            {tab2.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((tab2) => (
        <TabsContent key={tab2.value} value={tab2.value} className="flex-1 overflow-hidden mt-3">
          <ScrollArea className="h-full">
            <div className="px-4 pb-4">
              <tab2.Component />
            </div>
          </ScrollArea>
        </TabsContent>
      ))}
    </Tabs>
  );
}
function UISpecDialog({ open, onOpenChange }) {
  const { t: t2 } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[80vh] flex-col gap-0 p-0 sm:max-w-4xl"
        data-action-ui-id="ui-spec-dialog"
      >
        <DialogHeader className="flex h-10 shrink-0 flex-row items-center justify-center border-b border-border px-4">
          <DialogTitle>{t2("userMenu.uiSpec", "设计规范")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <UISpecContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function SidebarUserMenu({
  popupPosition = "right",
  showUsername = false,
  onChangelog,
  onOverlayOpenChange,
  trailingAction,
} = {}) {
  const { t: t2 } = useTranslation();
  const { user, isLoggedIn, isLoading, login, logout } = useAuth();
  if (isLoading) {
    return (
      <div className={showUsername ? "flex h-10 w-full items-center" : "pb-2"}>
        <span className={showUsername ? "flex h-9 w-full items-center rounded-md px-2" : ""}>
          <div className="flex size-7 shrink-0 items-center justify-center">
            <div className="size-5 animate-spin rounded-full border-2 border-border border-t-muted-foreground" />
          </div>
        </span>
      </div>
    );
  }
  if (!isLoggedIn) {
    return (
      <LoggedOutSidebarActionPresentation
        showUsername={showUsername}
        label={t2("sidebar.loginOrRegister")}
        onLogin={login}
        companionAction={trailingAction}
      />
    );
  }
  return (
    <div>
      <UserAvatarMenu
        user={user ?? {}}
        onLogout={logout}
        popupPosition={popupPosition}
        showUsername={showUsername}
        onChangelog={onChangelog}
        onOverlayOpenChange={onOverlayOpenChange}
        trailingAction={trailingAction}
      />
    </div>
  );
}
function UserAvatarMenu({
  user,
  onLogout,
  popupPosition = "right",
  showUsername = false,
  onChangelog,
  onOverlayOpenChange,
  trailingAction,
}) {
  const { t: t2 } = useTranslation();
  const platform2 = usePlatform();
  const queryClient2 = useQueryClient();
  const { openSettings } = useSettingsDialog();
  const { openImBridge } = useImBridgeDialog();
  const { open, menuRef, popoverRef, triggerRef, openMenu, closeMenu, handleTriggerClick } =
    useUserMenuController();
  const menuId = reactExports.useId();
  const protocolSubmenu = useUserProtocolSubmenu(popoverRef);
  const teamAccount = useOptionalTeamAccount();
  const teamIntegrationEnabled = teamAccount?.integrationEnabled ?? false;
  const accountDataVisible = teamAccount?.accountDataVisible === true;
  const teamReady = teamAccount?.viewModel.kind === "ready_team" && accountDataVisible;
  const [copied, setCopied] = reactExports.useState(false);
  const [accountSwitcherExpanded, setAccountSwitcherExpanded] = reactExports.useState(false);
  const [showCreditsDetails, setShowCreditsDetails] = reactExports.useState(false);
  const { showBadge: showRenewalBadge } = useSubscriptionRenewalNotice();
  const [showMigration, setShowMigration] = reactExports.useState(false);
  const creditDialogScopeRef = reactExports.useRef(null);
  const migrationDialogScopeRef = reactExports.useRef(null);
  const [showUISpec, setShowUISpec] = reactExports.useState(false);
  const [showImBridgeReminder, setShowImBridgeReminder] = reactExports.useState(
    () => getRuntimeConfig().region !== "overseas" && !hasSeenImBridgeShortcut(),
  );
  const { accounts: imBridgeAccounts } = useImAccounts();
  const hasImBridgeAccount = imBridgeAccounts.length > 0;
  const showPersonalCreditSummary =
    !teamIntegrationEnabled ||
    (teamAccount?.viewModel.kind === "ready_personal" &&
      accountDataVisible &&
      teamAccount.billingAvailable);
  const activeAccountScopeKey = accountScopeKey(teamAccount?.activeScope ?? null);
  reactExports.useEffect(() => {
    if (!teamIntegrationEnabled) return;
    const personalReady = showPersonalCreditSummary;
    if (
      showCreditsDetails &&
      (!personalReady || creditDialogScopeRef.current !== activeAccountScopeKey)
    ) {
      creditDialogScopeRef.current = null;
      setShowCreditsDetails(false);
    }
    if (
      showMigration &&
      (!personalReady || migrationDialogScopeRef.current !== activeAccountScopeKey)
    ) {
      migrationDialogScopeRef.current = null;
      setShowMigration(false);
    }
  }, [
    activeAccountScopeKey,
    showCreditsDetails,
    showMigration,
    showPersonalCreditSummary,
    teamIntegrationEnabled,
  ]);
  const canMigrate = useCanMigrate();
  const subscribeUrl = useMpSubscribeUrl();
  const markImBridgeReminderSeen = reactExports.useCallback(() => {
    setShowImBridgeReminder(false);
    try {
      localStorage.setItem(IM_BRIDGE_SHORTCUT_SEEN_KEY, "1");
    } catch {}
  }, []);
  const handleOpenImBridge = reactExports.useCallback(
    (event) => {
      event.stopPropagation();
      closeMenu();
      markImBridgeReminderSeen();
      trackEvent(TRACK_EVENTS.IM_BRIDGE_OPEN, {
        source: "avatar_shortcut",
        has_account: hasImBridgeAccount,
      });
      openImBridge();
    },
    [closeMenu, hasImBridgeAccount, markImBridgeReminderSeen, openImBridge],
  );
  const wasOpenRef = reactExports.useRef(false);
  const refreshOnOpenRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    if (open && !wasOpenRef.current) {
      trackEvent(TRACK_EVENTS.USER_MENU_OPEN, {});
    }
    if (!open) setAccountSwitcherExpanded(false);
    if (!open) protocolSubmenu.hide();
    wasOpenRef.current = open;
  }, [open, protocolSubmenu.hide]);
  reactExports.useEffect(() => {
    if (!open) {
      refreshOnOpenRef.current = false;
      return;
    }
    if (refreshOnOpenRef.current) return;
    const identityKey = teamAccount?.snapshot?.identityKey ?? null;
    const activeScope = teamAccount?.activeScope ?? null;
    if (!teamIntegrationEnabled || !identityKey || !activeScope) return;
    refreshOnOpenRef.current = true;
    void Promise.all([
      queryClient2.invalidateQueries({
        queryKey: teamQueryKeys.contexts(identityKey),
        exact: true,
      }),
      queryClient2.invalidateQueries({
        queryKey: creditQueryKeys.summary(activeScope),
        exact: true,
      }),
    ]);
  }, [
    open,
    queryClient2,
    teamAccount?.activeScope,
    teamAccount?.snapshot?.identityKey,
    teamIntegrationEnabled,
  ]);
  const overlayOpen = open || accountSwitcherExpanded;
  const overlayOpenChangeRef = reactExports.useRef(onOverlayOpenChange);
  reactExports.useEffect(() => {
    overlayOpenChangeRef.current = onOverlayOpenChange;
  }, [onOverlayOpenChange]);
  reactExports.useEffect(() => {
    overlayOpenChangeRef.current?.(overlayOpen);
    if (!overlayOpen) return;
    return () => overlayOpenChangeRef.current?.(false);
  }, [overlayOpen]);
  const handleToggleAccountSwitcher = reactExports.useCallback(() => {
    openMenu();
    setAccountSwitcherExpanded((expanded) => !expanded);
  }, [openMenu]);
  const handleAvatarTriggerClick = reactExports.useCallback(() => {
    setAccountSwitcherExpanded(false);
    handleTriggerClick();
  }, [handleTriggerClick]);
  const handleCopyUID = reactExports.useCallback(async () => {
    if (!user.userID) return;
    try {
      await navigator.clipboard.writeText(user.userID);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      dedupedToast.error(t2("common.copyFailed"));
    }
  }, [user.userID, t2]);
  const initial = user.username?.charAt(0).toUpperCase();
  const avatarSrc = useResizedAvatar(user.avatar);
  const showUISpecEntry = canUseDebugTooling();
  const showDebugPanelEntry = showUISpecEntry;
  const renderAvatar = (
    sizeClassName,
    fallbackIconSize,
    fallbackTextClassName,
    showBadge = false,
  ) => (
    <span className={cn$2("relative shrink-0 rounded-full", sizeClassName)}>
      {avatarSrc ? (
        <img src={avatarSrc} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className={cn$2(
            "flex h-full w-full items-center justify-center rounded-full bg-primary font-medium text-primary-foreground",
            fallbackTextClassName ?? (showUsername ? "text-xs" : "text-sm"),
          )}
        >
          {initial || <User size={fallbackIconSize} />}
        </span>
      )}
      {showBadge && <SubscriptionRenewalBadge />}
    </span>
  );
  return (
    <>
      <div
        ref={menuRef}
        data-action-ui-id="sidebar.user-avatar"
        className={`relative ${showUsername ? "" : "px-2 pt-1 pb-1"}`}
      >
        {showUsername ? (
          <div className="sidebar-user-menu-trigger-row flex h-10 w-full items-center gap-1">
            <div className="min-w-0 flex-1">
              <button
                ref={triggerRef}
                type="button"
                data-action-ui-id="user-menu.trigger"
                title={user.username || t2("sidebar.user")}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={handleAvatarTriggerClick}
                className="group/avatar-trigger flex h-10 w-full min-w-0 cursor-pointer items-center text-left text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <span
                  className={cn$2(
                    "sidebar-user-menu-trigger-content flex h-9 w-full min-w-0 items-center gap-2 rounded-md pr-2 transition-colors",
                    open
                      ? "bg-[var(--home-sidebar-nav-active)]"
                      : "group-hover/avatar-trigger:bg-[var(--home-sidebar-nav-hover)]",
                  )}
                >
                  {renderAvatar("size-7", 14, void 0, showRenewalBadge)}
                  <span className="min-w-0 flex-1 truncate text-body-14">
                    {user.username || t2("sidebar.user")}
                  </span>
                </span>
              </button>
            </div>
            <ImBridgeShortcutWithTooltip
              onClick={handleOpenImBridge}
              side="top"
              showUnreadDot={showImBridgeReminder}
            />
            {trailingAction}
          </div>
        ) : (
          <SidebarBottomActionStack className="gap-2.5">
            {trailingAction}
            <ImBridgeShortcutWithTooltip
              onClick={handleOpenImBridge}
              side="right"
              showUnreadDot={showImBridgeReminder}
            />
            <div>
              <button
                ref={triggerRef}
                type="button"
                data-action-ui-id="user-menu.trigger"
                title={user.username || t2("sidebar.user")}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={handleAvatarTriggerClick}
                className={cn$2(
                  "group/avatar-trigger flex size-8 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                  open
                    ? "bg-[var(--home-sidebar-nav-active)]"
                    : "hover:bg-[var(--home-sidebar-nav-hover)]",
                )}
              >
                {renderAvatar("size-7", 14, "text-xs", showRenewalBadge)}
              </button>
            </div>
          </SidebarBottomActionStack>
        )}
        <UserMenuPopoverShell
          id={menuId}
          ariaLabel={t2("sidebar.user")}
          open={open}
          position={popupPosition}
          anchorRef={menuRef}
          popoverRef={popoverRef}
          overflow="auto"
          overlay={
            <>
              {teamIntegrationEnabled && accountSwitcherExpanded ? (
                <div
                  className="absolute top-0 left-full z-10 ml-2 max-h-[min(32rem,var(--user-menu-available-height))] w-[300px] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
                  data-action-ui-id="team.account-switcher-flyout"
                >
                  <div className="flex h-10 items-center border-b border-border px-2">
                    <p className="min-w-0 flex-1 truncate font-normal text-body-14 text-foreground">
                      {t2("team.switcher.menuLabel", {
                        defaultValue: "切换账号",
                      })}
                    </p>
                  </div>
                  <AccountSwitcherView
                    embedded={true}
                    showSectionHeadings={true}
                    onCreate={closeMenu}
                    onSwitchComplete={() => setAccountSwitcherExpanded(false)}
                  />
                </div>
              ) : null}
              <UserProtocolFlyout submenu={protocolSubmenu} onClose={closeMenu} />
            </>
          }
        >
          <UserMenuRootView>
            <div className="px-4 pt-4 pb-3">
              <div className="flex min-w-0 items-center gap-3">
                {renderAvatar("size-10", 20, "text-base")}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground text-title-15">
                    {user.username || t2("sidebar.user")}
                  </div>
                  {user.userID && (
                    <button
                      type="button"
                      className="group mt-0.5 flex max-w-full cursor-pointer items-center gap-1 rounded-sm text-body-12 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                      onClick={handleCopyUID}
                      aria-label={`${t2("common.copy")} UID ${user.userID}`}
                    >
                      <span className="truncate">
                        {"UID : "}
                        {user.userID}
                      </span>
                      {copied ? (
                        <Check size={11} className="shrink-0 text-primary" />
                      ) : (
                        <Copy
                          size={11}
                          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      )}
                      <span className="sr-only" aria-live="polite">
                        {copied ? t2("common.copied") : ""}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {teamIntegrationEnabled || showPersonalCreditSummary ? (
              <UserMenuAccountSummary>
                {teamIntegrationEnabled ? (
                  <TeamAccountSummary
                    onOpenSwitcher={handleToggleAccountSwitcher}
                    onOpenCredits={closeMenu}
                    onOpenSubscription={() => {
                      const decision = guardAccountSubmission("team_checkout");
                      if (
                        !decision.allowed ||
                        decision.mode !== "CANONICAL" ||
                        accountScopeKey(decision.scope) !== activeAccountScopeKey
                      ) {
                        return;
                      }
                      if (!subscribeUrl) {
                        dedupedToast.error(
                          t2("credits.walletUrlNotReady", "Wallet info loading, please try again"),
                        );
                        return;
                      }
                      closeMenu();
                      void openExternalUrl(platform2, subscribeUrl, {
                        source: "sidebar.team-manage-subscription",
                      });
                    }}
                    switcherExpanded={accountSwitcherExpanded}
                  />
                ) : null}
                {showPersonalCreditSummary ? (
                  <>
                    <MpCreditRow
                      showRenewalBadge={showRenewalBadge}
                      onClick={() => {
                        closeMenu();
                        creditDialogScopeRef.current = teamIntegrationEnabled
                          ? activeAccountScopeKey
                          : "LEGACY_PERSONAL";
                        setShowCreditsDetails(true);
                      }}
                    />
                    {canMigrate && (
                      <HailuoCreditRow
                        onExchange={() => {
                          closeMenu();
                          migrationDialogScopeRef.current = teamIntegrationEnabled
                            ? activeAccountScopeKey
                            : "LEGACY_PERSONAL";
                          setShowMigration(true);
                        }}
                      />
                    )}
                    <SubscriptionSummaryRow
                      onClick={() => {
                        const decision = guardAccountSubmission("personal_checkout");
                        if (!decision.allowed) return;
                        if (!subscribeUrl) {
                          dedupedToast.error(
                            t2(
                              "credits.walletUrlNotReady",
                              "Wallet info loading, please try again",
                            ),
                          );
                          return;
                        }
                        closeMenu();
                        void openExternalUrl(platform2, subscribeUrl, {
                          source: "sidebar.manage-subscription",
                        });
                      }}
                    />
                  </>
                ) : null}
              </UserMenuAccountSummary>
            ) : null}
            <div className="flex flex-col gap-0.5 pb-1">
              {teamReady ? (
                <MenuSection
                  title={t2("userMenu.sectionAccount", {
                    defaultValue: "Account",
                  })}
                >
                  <MenuButton
                    icon={Users}
                    label={t2("team.management.title", {
                      defaultValue: "团队管理",
                    })}
                    onClick={() => {
                      closeMenu();
                      teamAccount?.openManagement();
                    }}
                    dataActionUiId="team.management.open"
                  />
                </MenuSection>
              ) : null}
              <MenuSection title={t2("userMenu.sectionSettings")}>
                <ThemeSwitcher />
                <MemoryManagementMenuButton />
                <MenuButton
                  icon={Smartphone}
                  label={t2(
                    `imBridge.menuLabel.${getRuntimeConfig().region === "overseas" ? "overseas" : "domestic"}`,
                  )}
                  disabled={getRuntimeConfig().region === "overseas"}
                  onClick={() => {
                    closeMenu();
                    markImBridgeReminderSeen();
                    trackEvent(TRACK_EVENTS.IM_BRIDGE_OPEN, {
                      source: "user_menu",
                      has_account: hasImBridgeAccount,
                    });
                    openImBridge();
                  }}
                  labelSuffix={!hasImBridgeAccount ? <NewBadge /> : void 0}
                  trailing={
                    getRuntimeConfig().region === "overseas" ? (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {t2("common.comingSoon")}
                      </span>
                    ) : (
                      <ImBridgeConnectionStatus connected={hasImBridgeAccount} />
                    )
                  }
                  dataActionUiId="user-menu.im-bridge"
                />
                <MenuButton
                  icon={Settings}
                  label={t2("common.settings")}
                  onClick={() => {
                    closeMenu();
                    openSettings();
                  }}
                  dataActionUiId="user-menu.settings"
                />
              </MenuSection>
              <MenuSection title={t2("userMenu.sectionHelp")}>
                <MenuButton
                  icon={GraduationCap}
                  label={t2("userMenu.tutorial")}
                  onClick={() => {
                    closeMenu();
                    void openExternalUrl(platform2, getTutorialUrl(getRuntimeConfig().region), {
                      source: "sidebar.tutorial",
                    });
                  }}
                  dataActionUiId="user-menu.tutorial"
                />
                {onChangelog && (
                  <MenuButton
                    icon={FileText}
                    label={t2("homeSidebar.changelog")}
                    onClick={() => {
                      closeMenu();
                      onChangelog();
                    }}
                    dataActionUiId="user-menu.changelog"
                  />
                )}
                <UserProtocolMenuRow submenu={protocolSubmenu} />
                <VersionRow menuOpen={open} />
              </MenuSection>
              {(showUISpecEntry || showDebugPanelEntry) && (
                <MenuSection title={t2("userMenu.sectionTestOnly")}>
                  {showUISpecEntry && (
                    <MenuButton
                      icon={SwatchBook}
                      label={t2("userMenu.uiSpec")}
                      onClick={() => {
                        closeMenu();
                        setShowUISpec(true);
                      }}
                      dataActionUiId="user-menu.ui-spec"
                    />
                  )}
                  {showDebugPanelEntry && (
                    <MenuButton
                      icon={Wrench}
                      label={t2("debugPanel.title")}
                      onClick={() => {
                        closeMenu();
                        window.dispatchEvent(new Event(DEBUG_PANEL_OPEN_EVENT));
                      }}
                      dataActionUiId="user-menu.debug-panel"
                    />
                  )}
                </MenuSection>
              )}
              <div className="px-1 py-1">
                <MenuButton
                  icon={LogOut}
                  label={t2("sidebar.logout")}
                  onClick={() => {
                    closeMenu();
                    onLogout();
                  }}
                  dataActionUiId="user-menu.logout"
                  showChevron={false}
                  destructive={true}
                />
              </div>
            </div>
          </UserMenuRootView>
        </UserMenuPopoverShell>
      </div>
      <CreditDetailsDialog
        open={showCreditsDetails}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) creditDialogScopeRef.current = null;
          setShowCreditsDetails(nextOpen);
        }}
      />
      <MigrationDialog
        open={showMigration}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) migrationDialogScopeRef.current = null;
          setShowMigration(nextOpen);
        }}
      />
      {showUISpecEntry && <UISpecDialog open={showUISpec} onOpenChange={setShowUISpec} />}
    </>
  );
}
