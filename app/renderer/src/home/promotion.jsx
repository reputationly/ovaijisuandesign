// 首页促销气泡与弹窗，以及每日展示次数的本地记录。
import { useTranslation, reactExports, jsxRuntimeExports, ArrowRight, useQuery } from "../vendor.js";
import { useModalSlot, STARTUP_MODAL_IDS } from "../infra/schedule.js";
import { cn$2 as cn, Dialog, DialogContent, DialogHeader, DialogFooter, Button } from "../infra/dialog-content.jsx";
import { CDN_PROMOTION_SEEDANCE } from "../workspace/topbar-state-context.jsx";
import { DialogTitle, DialogDescription } from "../infra/badge-variants.jsx";
import { useGatewayReady } from "../infra/inline-rename-input.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { __jsx } from "../shared/jsx-runtime.js";
const BASE_CLASS = "inline-flex items-center px-3 py-1.5 rounded-sm bg-brand-accent text-white text-xs font-medium";
export function PromotionBadge({
  onClick,
  className
}) {
  const {
    t
  } = useTranslation();
  const text = t("promotion.badge");
  if (!onClick) {
    return <div data-action-ui-id="home.promotion-badge" className={cn(BASE_CLASS, "pointer-events-none select-none", className)}>{text}</div>;
  }
  return <button type="button" data-action-ui-id="home.promotion-badge" onClick={onClick} className={cn(BASE_CLASS, "hover:opacity-90 transition-opacity", className)}>{text}</button>;
}
export function PromotionDialog({
  open,
  onOpenChange
}) {
  const {
    t
  } = useTranslation();
  const title = t("promotion.dialog.title");
  const bullets = [t("promotion.dialog.bullet1"), t("promotion.dialog.bullet2"), t("promotion.dialog.bullet3")];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent data-action-ui-id="promotion.dialog" className="w-[760px] h-[480px] max-w-none sm:max-w-none p-0 gap-0 grid grid-cols-[320px_1fr] overflow-hidden"><div className="w-[320px] h-[480px] bg-muted"><img src={CDN_PROMOTION_SEEDANCE} alt={title} className="w-full h-full object-cover" /></div><div className="flex h-[480px] flex-col"><div className="flex flex-1 flex-col justify-center gap-4 px-8"><DialogHeader className="text-left space-y-0"><DialogTitle className="font-heading text-2xl font-medium leading-tight text-foreground">{title}</DialogTitle><DialogDescription className="sr-only">{title}</DialogDescription></DialogHeader><ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">{bullets.map(b => <li key={b} className="flex gap-2.5"><span aria-hidden={true} className="mt-2 h-1 w-1 shrink-0 bg-foreground/60" /><span>{b}</span></li>)}</ul></div><DialogFooter className="px-8 pb-6 sm:justify-end gap-2"><Button variant="outline" data-action-ui-id="promotion.dialog.cancel" onClick={() => onOpenChange(false)}>{t("promotion.dialog.cancel")}</Button><Button data-action-ui-id="promotion.dialog.cta" onClick={() => onOpenChange(false)}>{t("promotion.dialog.cta")}<ArrowRight className="ml-1 h-4 w-4" /></Button></DialogFooter></div></DialogContent></Dialog>;
}
function extractPromotion(config) {
  if (!config || typeof config !== "object") return null;
  const cfg = config;
  const promo = cfg.seedance_discount;
  if (!promo) return null;
  if (typeof promo.start_time_ms !== "number" || typeof promo.end_time_ms !== "number") {
    return null;
  }
  return {
    startTimeMs: promo.start_time_ms,
    endTimeMs: promo.end_time_ms
  };
}
export function usePromotion() {
  const gatewayReady = useGatewayReady();
  const {
    data
  } = useQuery({
    queryKey: ["client-config"],
    queryFn: async () => {
      try {
        const res = await gatewayFetch("/api/v1/client_config");
        if (!res.ok) return null;
        return extractPromotion(await res.json());
      } catch {
        return null;
      }
    },
    enabled: gatewayReady,
    staleTime: 6e4,
    retry: false
  });
  const now = Date.now();
  const isShow = !!data && now >= data.startTimeMs && now < data.endTimeMs;
  return {
    isShow,
    data: isShow ? data : null
  };
}
const STORAGE_KEY = "hilo:promotion:lastShownDate";
function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function readLastShown() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeLastShown(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {}
}
export function usePromotionDialog(canAutoShow) {
  const [autoCandidate, setAutoCandidate] = reactExports.useState(false);
  const [manualOpen, setManualOpen] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!canAutoShow) return;
    if (readLastShown() === todayStr()) return;
    setAutoCandidate(true);
  }, [canAutoShow]);
  const granted = useModalSlot(STARTUP_MODAL_IDS.promotion, {
    candidate: autoCandidate
  });
  const setOpen = reactExports.useCallback(next => {
    if (next) {
      setManualOpen(true);
      return;
    }
    writeLastShown(todayStr());
    setAutoCandidate(false);
    setManualOpen(false);
  }, []);
  const triggerManually = reactExports.useCallback(() => setManualOpen(true), []);
  return {
    open: granted && autoCandidate || manualOpen,
    setOpen,
    triggerManually
  };
}
