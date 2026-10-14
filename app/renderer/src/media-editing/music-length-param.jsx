// music-length-param.jsx
import { useTranslation } from "react-i18next";
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
  const durationMatch = /^(\d{0,2}):(\d{0,2})$/.exec(trimmed);
  if (durationMatch)
    return {
      mm: durationMatch[1],
      ss: durationMatch[2],
    };
  return {
    mm: "",
    ss: "",
  };
}

export function MusicLengthParam({ value, onChange, disabled }) {
  const { t } = useTranslation();
  const customSelected = value === "custom" || isCustomMusicLength(value);
  const custom =
    value === "custom" ? "" : isCustomMusicLength(value) ? value : "";
  const customSeconds = custom ? parseCustomMusicLengthSeconds(custom) : void 0;
  const belowMinDuration =
    customSeconds != null && customSeconds < MIN_MUSIC_BILLING_SECONDS;
  const { mm: mmField, ss: ssField } = splitCustomMusicLength(custom);
  const emitCustom = (minutesText, secondsText) => {
    const cleanMm = minutesText.replace(/\D/g, "").slice(0, 2);
    const cleanSs = secondsText.replace(/\D/g, "").slice(0, 2);
    if (!cleanMm && !cleanSs) {
      onChange("custom");
      return;
    }
    onChange(`${cleanMm || "0"}:${cleanSs}`);
  };
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium text-foreground/50">
        {t("canvas.params.duration", {
          defaultValue: "时长",
        })}
      </div>
      <div className="flex flex-col gap-1">
        {MUSIC_LENGTH_PRESETS.map((preset) => {
          const selected =
            value === preset.value || (!value && preset.value === "auto");
          return (
            <button
              key={preset.value}
              type="button"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                if (!disabled) onChange(preset.value);
              }}
              disabled={disabled}
              className={[
                "flex h-8 items-center justify-between rounded-md px-3 text-left text-[14px] transition-colors disabled:cursor-default disabled:opacity-50",
                selected
                  ? "bg-[var(--canvas-controls-hover)] text-foreground"
                  : "text-foreground/80 hover:enabled:bg-[var(--canvas-controls-hover)]",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>{musicLengthPresetLabel(t, preset)}</span>
              {selected && <span aria-hidden={true}>✓</span>}
            </button>
          );
        })}
        {customSelected ? (
          <div className="mt-1 rounded-lg bg-[var(--canvas-controls-hover)] p-2">
            <div className="flex items-center justify-center gap-2">
              <input
                type="text"
                value={mmField}
                onChange={(changeEvent) => {
                  if (/^\d{0,2}$/.test(changeEvent.target.value))
                    emitCustom(changeEvent.target.value, ssField);
                }}
                onClick={(clickEvent) => clickEvent.stopPropagation()}
                onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
                disabled={disabled}
                placeholder={t("canvas.params.placeholder.durationMm", {
                  defaultValue: "mm",
                })}
                inputMode="numeric"
                maxLength={2}
                aria-label={t("canvas.params.durationMinutes", {
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
                onChange={(changeEvent) => {
                  if (/^\d{0,2}$/.test(changeEvent.target.value))
                    emitCustom(mmField, changeEvent.target.value);
                }}
                onClick={(clickEvent) => clickEvent.stopPropagation()}
                onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
                disabled={disabled}
                placeholder={t("canvas.params.placeholder.durationSs", {
                  defaultValue: "ss",
                })}
                inputMode="numeric"
                maxLength={2}
                aria-label={t("canvas.params.durationSeconds", {
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
                {t("canvas.params.durationMinSeconds", {
                  defaultValue: "最小时长 {{n}}s",
                  n: MIN_MUSIC_BILLING_SECONDS,
                })}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              if (!disabled) onChange("custom");
            }}
            disabled={disabled}
            className="mt-1 h-9 rounded-lg bg-[var(--canvas-controls-hover)] px-3 text-[14px] font-medium text-foreground/50 transition-colors hover:enabled:text-foreground disabled:cursor-default disabled:opacity-50"
          >
            {t("canvas.params.custom", {
              defaultValue: "自定义",
            })}
          </button>
        )}
      </div>
    </div>
  );
}
