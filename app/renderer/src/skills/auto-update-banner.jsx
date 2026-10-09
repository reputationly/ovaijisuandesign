// 技能自动更新横幅：显示/退出动画与状态订阅。
import {
  h as useTranslation,
  r as reactExports,
  fM as Button,
  gk as RetryIcon,
  X,
  nw as useWSConnection,
  nx as readPendingAutoUpdate,
  ny as writePendingAutoUpdate,
  nz as clearPendingAutoUpdate,
} from "../main.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
const EXIT_DURATION_MS = 220;
function AutoUpdateBanner({ pending, restarting, onRestart, onDismiss }) {
  const { t } = useTranslation();
  return (
    <div
      data-action-ui-id="skills-auto-update-banner"
      className="flex w-full items-center gap-3 rounded-lg bg-brand-accent/[0.04] p-2.5"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-accent/10 text-brand-accent">
        <RetryIcon size={16} className={restarting ? "animate-spin" : ""} />
      </span>
      <span className="flex-1 text-sm font-medium text-foreground">
        {restarting
          ? t("skills.autoUpdateBanner.restarting")
          : t("skills.autoUpdateBanner.completed", {
              count: pending.updatedCount,
            })}
      </span>
      {!restarting && (
        <Button
          variant="ghost"
          size="icon-xs"
          data-action-ui-id="skills-auto-update-dismiss"
          aria-label={t("common.close")}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X size={12} strokeWidth={1.5} />
        </Button>
      )}
      <Button
        data-action-ui-id="skills-auto-update-restart"
        variant="secondary"
        size="xs"
        className="h-7 border-0 bg-brand-accent px-3 text-xs font-medium text-brand-accent-foreground hover:bg-brand-accent/90"
        onClick={onRestart}
        disabled={restarting}
      >
        {t("skills.autoUpdateBanner.restartNow")}
      </Button>
    </div>
  );
}
export function AutoUpdateBannerPresence({ pending, restarting, onRestart, onDismiss }) {
  const [renderedPending, setRenderedPending] = reactExports.useState(pending);
  const [expanded, setExpanded] = reactExports.useState(Boolean(pending));
  reactExports.useEffect(() => {
    if (pending) {
      setRenderedPending(pending);
      const frame = window.requestAnimationFrame(() => setExpanded(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setExpanded(false);
    const timeout = window.setTimeout(() => setRenderedPending(null), EXIT_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [pending]);
  if (!renderedPending) return null;
  return (
    <div
      data-layout-slot="skills-auto-update-presence"
      data-state={expanded ? "open" : "closed"}
      className={`grid transition-[grid-template-rows,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${expanded ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={`pb-3 transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${expanded ? "translate-y-0" : "-translate-y-1"}`}
        >
          <AutoUpdateBanner
            pending={renderedPending}
            restarting={restarting}
            onRestart={onRestart}
            onDismiss={onDismiss}
          />
        </div>
      </div>
    </div>
  );
}
export function useAutoUpdateBanner() {
  const { subscribe } = useWSConnection();
  const [pending, setPending] = reactExports.useState(readPendingAutoUpdate);
  const [restarting, setRestarting] = reactExports.useState(false);
  const subscribeRef = reactExports.useRef(subscribe);
  subscribeRef.current = subscribe;
  reactExports.useEffect(() => {
    return subscribeRef.current((msg) => {
      if (msg.type !== "skills_reload") return;
      const payload = msg;
      if (!payload.autoUpdate) return;
      const names = payload.unloadedSkills ?? [];
      if (names.length === 0) return;
      const update = {
        updatedCount: names.length,
        updatedSkills: names,
        timestamp: Date.now(),
      };
      writePendingAutoUpdate(update);
      setPending(update);
    });
  }, []);
  const restartNow = reactExports.useCallback(() => {
    setRestarting(true);
    clearPendingAutoUpdate();
    window.hilo.opencode
      .restart()
      .then(() => {
        setPending(null);
        setRestarting(false);
      })
      .catch((e) => {
        console.error("OpenCode restart failed:", e);
        setRestarting(false);
      });
  }, []);
  const dismiss = reactExports.useCallback(() => {
    clearPendingAutoUpdate();
    setPending(null);
  }, []);
  return {
    pending,
    restarting,
    restartNow,
    dismiss,
  };
}
