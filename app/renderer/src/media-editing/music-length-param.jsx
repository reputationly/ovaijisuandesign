// music-length-param.jsx
import { useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  isCustomMusicLength,
  MUSIC_LENGTH_PRESETS,
  musicLengthPresetLabel,
  parseCustomMusicLengthSeconds,
} from "./get-reference-navigation-defaults.jsx";
import { MIN_MUSIC_BILLING_SECONDS } from "../generation/select-content.jsx";

function splitCustomMusicLength(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "custom")
    return {
      mm: "",
      ss: "",
    };
  const m3 = /^(\d{0,2}):(\d{0,2})$/.exec(trimmed);
  if (m3)
    return {
      mm: m3[1],
      ss: m3[2],
    };
  return {
    mm: "",
    ss: "",
  };
}

export function MusicLengthParam({ value, onChange, disabled: disabled2 }) {
  const { t: t2 } = useTranslation();
  const customSelected = value === "custom" || isCustomMusicLength(value);
  const custom =
    value === "custom" ? "" : isCustomMusicLength(value) ? value : "";
  const customSeconds = custom ? parseCustomMusicLengthSeconds(custom) : void 0;
  const belowMinDuration =
    customSeconds != null && customSeconds < MIN_MUSIC_BILLING_SECONDS;
  const { mm: mmField, ss: ssField } = splitCustomMusicLength(custom);
  const emitCustom = (mm, ss2) => {
    const cleanMm = mm.replace(/\D/g, "").slice(0, 2);
    const cleanSs = ss2.replace(/\D/g, "").slice(0, 2);
    if (!cleanMm && !cleanSs) {
      onChange("custom");
      return;
    }
    onChange(`${cleanMm || "0"}:${cleanSs}`);
  };
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium text-foreground/50">
        {t2("canvas.params.duration", {
          defaultValue: "时长",
        })}
      </div>
      <div className="flex flex-col gap-1">
        {MUSIC_LENGTH_PRESETS.map((preset2) => {
          const selected2 =
            value === preset2.value || (!value && preset2.value === "auto");
          return (
            <button
              key={preset2.value}
              type="button"
              onClick={(e2) => {
                e2.stopPropagation();
                if (!disabled2) onChange(preset2.value);
              }}
              disabled={disabled2}
              className={[
                "flex h-8 items-center justify-between rounded-md px-3 text-left text-[14px] transition-colors disabled:cursor-default disabled:opacity-50",
                selected2
                  ? "bg-[var(--canvas-controls-hover)] text-foreground"
                  : "text-foreground/80 hover:enabled:bg-[var(--canvas-controls-hover)]",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>{musicLengthPresetLabel(t2, preset2)}</span>
              {selected2 && <span aria-hidden={true}>✓</span>}
            </button>
          );
        })}
        {customSelected ? (
          <div className="mt-1 rounded-lg bg-[var(--canvas-controls-hover)] p-2">
            <div className="flex items-center justify-center gap-2">
              <input
                type="text"
                value={mmField}
                onChange={(e2) => {
                  if (/^\d{0,2}$/.test(e2.target.value))
                    emitCustom(e2.target.value, ssField);
                }}
                onClick={(e2) => e2.stopPropagation()}
                onKeyDown={(e2) => e2.stopPropagation()}
                disabled={disabled2}
                placeholder={t2("canvas.params.placeholder.durationMm", {
                  defaultValue: "mm",
                })}
                inputMode="numeric"
                maxLength={2}
                aria-label={t2("canvas.params.durationMinutes", {
                  defaultValue: "分钟",
                })}
                aria-invalid={belowMinDuration}
                className={[
                  "h-9 w-14 rounded-md border bg-[var(--canvas-node-bg)] px-2 text-center text-[14px] text-foreground outline-none placeholder:text-foreground/40 disabled:opacity-50",
                  belowMinDuration
                    ? "border-destructive focus:border-destructive"
                    : "border-[var(--canvas-controls-border)] focus:border-[var(--canvas-node-border-selected)]",
                ].join(" ")}
              />
              <span
                className="text-[14px] font-medium text-foreground/60"
                aria-hidden={true}
              >
                :
              </span>
              <input
                type="text"
                value={ssField}
                onChange={(e2) => {
                  if (/^\d{0,2}$/.test(e2.target.value))
                    emitCustom(mmField, e2.target.value);
                }}
                onClick={(e2) => e2.stopPropagation()}
                onKeyDown={(e2) => e2.stopPropagation()}
                disabled={disabled2}
                placeholder={t2("canvas.params.placeholder.durationSs", {
                  defaultValue: "ss",
                })}
                inputMode="numeric"
                maxLength={2}
                aria-label={t2("canvas.params.durationSeconds", {
                  defaultValue: "秒",
                })}
                aria-invalid={belowMinDuration}
                className={[
                  "h-9 w-14 rounded-md border bg-[var(--canvas-node-bg)] px-2 text-center text-[14px] text-foreground outline-none placeholder:text-foreground/40 disabled:opacity-50",
                  belowMinDuration
                    ? "border-destructive focus:border-destructive"
                    : "border-[var(--canvas-controls-border)] focus:border-[var(--canvas-node-border-selected)]",
                ].join(" ")}
              />
            </div>
            {belowMinDuration && (
              <div className="mt-1 px-1 text-[12px] text-destructive">
                {t2("canvas.params.durationMinSeconds", {
                  defaultValue: "最小时长 {{n}}s",
                  n: MIN_MUSIC_BILLING_SECONDS,
                })}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={(e2) => {
              e2.stopPropagation();
              if (!disabled2) onChange("custom");
            }}
            disabled={disabled2}
            className="mt-1 h-9 rounded-lg bg-[var(--canvas-controls-hover)] px-3 text-[14px] font-medium text-foreground/50 transition-colors hover:enabled:text-foreground disabled:cursor-default disabled:opacity-50"
          >
            {t2("canvas.params.custom", {
              defaultValue: "自定义",
            })}
          </button>
        )}
      </div>
    </div>
  );
}
