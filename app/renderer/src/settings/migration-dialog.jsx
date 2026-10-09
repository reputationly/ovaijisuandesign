// migration-dialog.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  dedupedToast,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { MpIcon } from "../assets/gateway-scope-provider.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../infra/dialog-content.jsx";
import { DialogDescription, DialogTitle } from "../infra/badge-variants.jsx";
import { Input3 } from "../infra/select-content.jsx";
import {
  ShellIcon,
  useHailuoWallet,
  useHiloToMpRatio,
  useMigrateCredit,
  useMigrateDeadline,
  useMpWallet,
} from "../team/hailuo-credit-row.jsx";
const MIN_AMOUNT = 10;
function renderBoldPrefix(text2) {
  const match2 = text2.match(/^\*\*(.+?)\*\*(.*)$/s);
  if (!match2) return text2;
  const [, bold, rest] = match2;
  return (
    <>
      <strong className="font-medium text-foreground">{bold}</strong>
      {rest}
    </>
  );
}
function NoteItem({ text: text2 }) {
  return (
    <li className="relative pl-2.5 before:absolute before:left-0 before:top-[7px] before:size-[3px] before:rounded-full before:bg-muted-foreground before:content-['']">
      {renderBoldPrefix(text2)}
    </li>
  );
}
function ExchangeSide({ tone, icon, label, value, hint }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 text-center">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={`flex items-center justify-center gap-[3px] text-lg font-semibold tabular-nums leading-none ${tone === "from" ? "text-muted-foreground" : "text-foreground"}`}
      >
        {icon}
        <span>{value.toLocaleString()}</span>
      </span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </div>
  );
}
export function MigrationDialog({ open, onOpenChange, onSuccess }) {
  const { t: t2 } = useTranslation();
  const mpWallet = useMpWallet();
  const hailuoWallet = useHailuoWallet();
  const deadline = useMigrateDeadline();
  const migrate = useMigrateCredit();
  const ratio = useHiloToMpRatio();
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const [amount, setAmount] = reactExports.useState(0);
  const hubCredits = mpWallet?.total_credit ?? 0;
  const hailuoCredits = hailuoWallet?.total_credit ?? 0;
  const effectiveAmount = (() => {
    if (hailuoCredits < MIN_AMOUNT) return hailuoCredits;
    if (amount > 0 && amount < MIN_AMOUNT) return MIN_AMOUNT;
    return Math.min(amount, hailuoCredits);
  })();
  const willReceive = effectiveAmount * ratio;
  reactExports.useEffect(() => {
    if (!open) return;
    setConfirmed(false);
    setAmount(hailuoCredits);
  }, [open, hailuoCredits]);
  const handleAmountChange = (raw2) => {
    const trimmed = raw2.trim();
    if (trimmed === "") {
      setAmount(0);
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setAmount(0);
      return;
    }
    setAmount(Math.min(parsed, hailuoCredits));
  };
  const handleAmountBlur = () => {
    if (hailuoCredits < MIN_AMOUNT) return;
    if (amount > 0 && amount < MIN_AMOUNT) {
      setAmount(MIN_AMOUNT);
    }
  };
  const handleConfirm = () => {
    if (migrate.isPending || !confirmed || effectiveAmount <= 0) return;
    migrate.mutate(
      {
        amount: effectiveAmount,
      },
      {
        onSuccess: (resp) => {
          if (!resp.ok) {
            dedupedToast.error(
              resp.error_message || t2("mediaplan.migration.failed"),
            );
            return;
          }
          const transferred = resp.transferred_amount ?? effectiveAmount;
          dedupedToast.success(
            t2("mediaplan.migration.success", {
              amount: transferred.toLocaleString(),
            }),
          );
          onSuccess?.();
          onOpenChange(false);
        },
        onError: () => {
          dedupedToast.error(t2("mediaplan.migration.failed"));
        },
      },
    );
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        showCloseButton={true}
        data-action-ui-id="migration.dialog"
      >
        <DialogHeader>
          <DialogTitle>{t2("mediaplan.migration.title")}</DialogTitle>
          <DialogDescription>
            {t2("mediaplan.migration.subtitle", {
              ratio,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <ExchangeSide
              tone="from"
              icon={<ShellIcon size={18} />}
              label={t2("mediaplan.migration.fromHailuo")}
              value={effectiveAmount}
              hint={t2("mediaplan.migration.hailuoBalanceHint", {
                balance: hailuoCredits.toLocaleString(),
              })}
            />
            <span className="shrink-0 text-base text-muted-foreground">→</span>
            <ExchangeSide
              tone="to"
              icon={<MpIcon size={18} />}
              label={t2("mediaplan.migration.toHub")}
              value={willReceive}
              hint={t2("mediaplan.migration.hubCurrentBalanceHint", {
                balance: hubCredits.toLocaleString(),
              })}
            />
          </div>
        </div>
        {hailuoCredits >= MIN_AMOUNT && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="migration-amount"
              className="text-[11px] font-medium text-foreground"
            >
              {t2("mediaplan.migration.amountLabel")}
            </label>
            <div className="flex items-stretch gap-2">
              <Input3
                id="migration-amount"
                inputMode="numeric"
                value={amount === 0 ? "" : String(amount)}
                onChange={(e2) => handleAmountChange(e2.target.value)}
                onBlur={handleAmountBlur}
                placeholder={t2("mediaplan.migration.amountPlaceholder")}
                data-action-ui-id="migration.amount-input"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setAmount(hailuoCredits)}
                data-action-ui-id="migration.amount-max"
              >
                {t2("mediaplan.migration.amountMax")}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {t2("mediaplan.migration.willReceive", {
                credits: willReceive.toLocaleString(),
              })}
            </p>
          </div>
        )}
        <ul className="flex flex-col gap-1 px-0.5 pt-1 text-[11px] leading-[1.55] text-muted-foreground">
          <NoteItem
            text={t2("mediaplan.migration.noteRatio", {
              ratio,
            })}
          />
          <NoteItem
            text={t2("mediaplan.migration.noteDeadline", {
              date: deadline?.date ?? "--",
            })}
          />
          <NoteItem text={t2("mediaplan.migration.noteIrreversible")} />
        </ul>
        <label className="hilo-checkbox-label flex cursor-pointer items-start text-xs text-foreground/80">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(v2) => setConfirmed(v2 === true)}
            data-action-ui-id="migration.confirm-check"
          />
          <span className="pt-2 pointer-coarse:pt-3.5">
            {t2("mediaplan.migration.confirmCheckText")}
          </span>
        </label>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-action-ui-id="migration.cancel"
          >
            {t2("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!confirmed || effectiveAmount <= 0 || migrate.isPending}
            loading={migrate.isPending}
            data-action-ui-id="migration.confirm"
          >
            {t2("mediaplan.migration.confirmCta")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
