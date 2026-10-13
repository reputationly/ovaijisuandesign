// slider-section.jsx
import { FieldRoot, reactExports, useTranslation } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ComponentSection, VariantGrid } from "./scroll-bar.jsx";
import { useTheme } from "../generation/use-model-catalog-scope-key.js";
import { Button } from "../infra/dialog-content.jsx";
import { Slider } from "../generation/slider.jsx";
export function SliderSection() {
  const { t: t2 } = useTranslation();
  const { theme, setTheme } = useTheme();
  const id2 = reactExports.useId();
  const [samples, setSamples] = reactExports.useState({
    standard: {
      value: 40,
      changes: 0,
      commits: 0,
      committed: 40,
    },
    rounded: {
      value: 40,
      changes: 0,
      commits: 0,
      committed: 40,
    },
    filled: {
      value: 40,
      changes: 0,
      commits: 0,
      committed: 40,
    },
  });
  const [range, setRange] = reactExports.useState([20, 80]);
  const [vertical, setVertical] = reactExports.useState(50);
  const [duration, setDuration] = reactExports.useState(8);
  const [fontSize, setFontSize] = reactExports.useState(12);
  return (
    <ComponentSection
      name="Slider"
      importPath="@hilo/canvas/controls"
      description={t2("uiSpec.slider.description")}
    >
      <div className="flex flex-wrap gap-1">
        {["light", "dark", "system"].map((next) => (
          <Button
            key={next}
            size="xs"
            variant={theme === next ? "default" : "outline"}
            aria-pressed={theme === next}
            data-action-ui-id={`ui-spec-slider-theme-${next}`}
            onClick={() => setTheme(next)}
          >
            {t2(`uiSpec.slider.theme.${next}`)}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t2("uiSpec.slider.themeHelp")}
      </p>
      <div
        className="space-y-3 rounded-lg border p-4"
        data-action-ui-id="ui-spec-slider-rules"
      >
        <h4 className="text-sm font-medium">
          {t2("uiSpec.slider.rulesTitle")}
        </h4>
        <dl className="grid gap-3 text-xs sm:grid-cols-[8rem_1fr]">
          {[
            "selection",
            "sizes",
            "layout",
            "ticks",
            "feedback",
            "contract",
          ].map((rule) => (
            <div key={rule} className="contents">
              <dt className="font-medium">
                {t2(`uiSpec.slider.rules.${rule}.title`)}
              </dt>
              <dd className="text-muted-foreground">
                {t2(`uiSpec.slider.rules.${rule}.body`)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {["standard", "rounded", "filled"].map((variant) => {
        const sample = samples[variant];
        return (
          <VariantGrid
            key={variant}
            label={t2(`uiSpec.slider.variant.${variant}`)}
          >
            <div className="w-full min-w-0">
              <div className="hilo-slider-field__header flex items-start justify-between gap-3 text-xs">
                <span
                  id={`${id2}-${variant}-label`}
                  className="min-w-0 break-words"
                >
                  {t2("uiSpec.slider.longLabel")}
                </span>
                <output className="shrink-0 tabular-nums">
                  {sample.value}%
                </output>
              </div>
              <Slider
                variant={variant}
                size={variant === "rounded" ? "compact" : "default"}
                markerValue={variant === "rounded" ? 50 : void 0}
                value={[sample.value]}
                min={0}
                max={100}
                step={1}
                aria-label={t2(`uiSpec.slider.variant.${variant}`)}
                thumbProps={{
                  "aria-labelledby": `${id2}-${variant}-label`,
                  "aria-describedby": `${id2}-${variant}-events`,
                  "data-action-ui-id": `ui-spec-slider-${variant}`,
                }}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setSamples((current) => ({
                    ...current,
                    [variant]: {
                      ...current[variant],
                      value: next,
                      changes: current[variant].changes + 1,
                    },
                  }));
                }}
                onValueCommitted={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  setSamples((current) => ({
                    ...current,
                    [variant]: {
                      ...current[variant],
                      committed: next,
                      commits: current[variant].commits + 1,
                    },
                  }));
                }}
              />
              <div className="hilo-slider-field__marks flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>0%</span>
                <span>100%</span>
              </div>
              <p
                id={`${id2}-${variant}-events`}
                className="text-xs text-muted-foreground"
              >
                {t2("uiSpec.slider.events", {
                  changes: sample.changes,
                  commits: sample.commits,
                  value: sample.committed,
                })}
              </p>
              <div className="flex flex-wrap gap-1">
                {[0, 100].map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="xs"
                    data-action-ui-id={`ui-spec-slider-${variant}-set-${value}`}
                    onClick={() =>
                      setSamples((current) => ({
                        ...current,
                        [variant]: {
                          ...current[variant],
                          value,
                        },
                      }))
                    }
                  >
                    {t2("uiSpec.slider.setValue", {
                      value,
                    })}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t2("uiSpec.slider.disabled")}
              </p>
              <Slider
                variant={variant}
                defaultValue={[40]}
                disabled={true}
                aria-label={`${t2(`uiSpec.slider.variant.${variant}`)}: ${t2("uiSpec.slider.disabled")}`}
              />
            </div>
          </VariantGrid>
        );
      })}
      <VariantGrid label={t2("uiSpec.slider.temperature")}>
        <Slider
          variant="rounded"
          size="compact"
          trackAppearance="temperature"
          thumbSize={18}
          min={2e3}
          max={1e4}
          step={100}
          defaultValue={6500}
          markerValue={6500}
          aria-label={t2("uiSpec.slider.temperature")}
        />
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.slider.compactDuration")}>
        <div className="w-full min-w-0">
          <output className="hilo-slider-field__header block text-right text-xs tabular-nums">
            {duration}s
          </output>
          <Slider
            variant="filled"
            size="compact"
            visualMin={0}
            minBoundaryMessage={t2("canvas.param.durationRange", {
              min: 4,
              max: 15,
            })}
            ticks={[5, 10]}
            min={4}
            max={15}
            step={1}
            value={duration}
            onValueChange={(value) =>
              setDuration(Array.isArray(value) ? value[0] : value)
            }
            aria-label={t2("uiSpec.slider.compactDuration")}
            thumbProps={{
              "data-action-ui-id": "ui-spec-slider-compact-duration",
            }}
          />
          <div className="hilo-slider-field__marks flex justify-between text-xs text-muted-foreground tabular-nums">
            {[0, 5, 10, 15].map((mark) => (
              <span key={mark}>{mark}s</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t2("uiSpec.slider.visualMinimumHelp")}
          </p>
        </div>
      </VariantGrid>
      <VariantGrid label={t2("canvas.prompt.fontSize")}>
        <div className="flex h-8 w-[170px] items-center gap-1.5 rounded-lg border bg-card pr-2.5 pl-2">
          <Slider
            size="compact"
            min={8}
            max={36}
            step={1}
            value={fontSize}
            onValueChange={(value) =>
              setFontSize(Array.isArray(value) ? value[0] : value)
            }
            aria-label={t2("canvas.prompt.fontSize")}
            className="w-28 shrink-0"
            thumbProps={{
              "data-action-ui-id": "ui-spec-slider-compact-font-size",
            }}
          />
          <output className="min-w-8 shrink-0 text-right text-[13px] tabular-nums">
            {fontSize}px
          </output>
        </div>
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.slider.range")}>
        <div className="w-full min-w-0">
          <output className="text-xs tabular-nums">{range.join(" – ")}</output>
          <Slider
            variant="filled"
            value={range}
            onValueChange={(value) =>
              setRange(Array.isArray(value) ? value : [value])
            }
            aria-label={t2("uiSpec.slider.range")}
            thumbProps={{
              "data-action-ui-id": "ui-spec-slider-range",
            }}
          />
        </div>
      </VariantGrid>
      <VariantGrid label={t2("uiSpec.slider.vertical")}>
        <div className="flex h-40 items-center gap-3">
          <Slider
            variant="filled"
            orientation="vertical"
            value={[vertical]}
            onValueChange={(value) =>
              setVertical(Array.isArray(value) ? value[0] : value)
            }
            aria-label={t2("uiSpec.slider.vertical")}
            thumbProps={{
              "data-action-ui-id": "ui-spec-slider-vertical",
            }}
          />
          <output className="text-xs tabular-nums">{vertical}</output>
        </div>
      </VariantGrid>
      <p className="text-xs text-muted-foreground">
        {t2("uiSpec.slider.fallback")}
      </p>
      <VariantGrid label={t2("uiSpec.slider.error")}>
        <FieldRoot invalid={true} className="w-full min-w-0">
          <Slider
            defaultValue={[40]}
            aria-label={t2("uiSpec.slider.error")}
            thumbProps={{
              "aria-describedby": `${id2}-error`,
              "data-action-ui-id": "ui-spec-slider-error",
            }}
          />
          <p id={`${id2}-error`} className="text-xs text-destructive">
            {t2("uiSpec.slider.errorHelp")}
          </p>
        </FieldRoot>
      </VariantGrid>
      <details className="text-xs text-muted-foreground">
        <summary
          className="w-fit cursor-pointer text-foreground"
          data-action-ui-id="ui-spec-slider-usage"
        >
          {t2("uiSpec.slider.usage")}
        </summary>
        <div className="space-y-2 py-2">
          <p>{t2("uiSpec.slider.api")}</p>
          <p>{t2("uiSpec.slider.keyboard")}</p>
          <p>{t2("uiSpec.slider.boundaries")}</p>
          <pre className="overflow-x-auto rounded-md bg-secondary p-2 text-foreground">
            <code>{`import { Slider } from '@hilo/canvas/controls';

<Slider variant="standard" value={[value]} min={0} max={100} step={1}
  aria-label={label} onValueChange={handleChange}
  onValueCommitted={handleCommit} />
<Slider variant="filled" name="amount" defaultValue={[40]}
  aria-label={label} disabled={disabled} />

<Slider variant="filled" size="compact" min={4} max={15} step={1}
  visualMin={0} ticks={[5, 10]} value={preview ?? duration}
  minBoundaryMessage={t('canvas.param.durationRange', { min: 4, max: 15 })}
  aria-label={label} onValueChange={handlePreview}
  onValueCommitted={handleCommit} />

<Slider variant="standard" size="compact" min={8} max={36} step={1}
  value={fontSize} aria-label={label} onValueChange={handleFontSizeChange} />`}</code>
          </pre>
        </div>
      </details>
    </ComponentSection>
  );
}
