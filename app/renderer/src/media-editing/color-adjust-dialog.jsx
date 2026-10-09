// color-adjust-dialog.jsx
import {
  dedupedToast,
  jsxRuntimeExports,
  Loader2,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ColorAdjustSlider } from "./color-adjust-slider.jsx";
import { Dialog$1 } from "../canvas/separator.jsx";
import { Trash2, Upload } from "./package.jsx";
import { CloseIcon$1, SendArrowIcon } from "../canvas/file-missing-icon.jsx";
import { Button$2 } from "../canvas/node-shell-inner.jsx";
import { useSuspendCanvasInteractions } from "../canvas/use-inline-rename.jsx";
import { cn$5 } from "../infra/dialog-content.jsx";
import {
  DialogContent$1,
  DialogFooter$1,
  DialogHeader$1,
  DialogTitle$1,
} from "./use-preview-text.jsx";
import {
  Select$2,
  SelectContent$1,
  SelectGroup,
  SelectItem$1,
  SelectLabel,
  SelectSeparator,
  SelectTrigger$1,
  SelectValue$1,
} from "../generation/select-content.jsx";
import { defaultSettings } from "./default-settings.js";
import { ImageColorGrading } from "./image-color-grading.js";

const LUT_NONE$1 = "__none__";

const SLIDER_GROUPS$1 = [
  {
    i18nKey: "colorAdjust.groupColor",
    text: "Color",
    sliders: [
      {
        key: "vibrance",
        i18nKey: "colorAdjust.vibrance",
        text: "Vibrance",
        min: -100,
        max: 100,
      },
      {
        key: "saturation",
        i18nKey: "colorAdjust.saturation",
        text: "Saturation",
        min: -100,
        max: 100,
      },
      {
        key: "temperature",
        i18nKey: "colorAdjust.temperature",
        text: "Temperature",
        min: -100,
        max: 100,
      },
      {
        key: "tint",
        i18nKey: "colorAdjust.tint",
        text: "Tint",
        min: -100,
        max: 100,
      },
      {
        key: "hue",
        i18nKey: "colorAdjust.hue",
        text: "Hue",
        min: -100,
        max: 100,
      },
    ],
  },
  {
    i18nKey: "colorAdjust.groupLight",
    text: "Light",
    sliders: [
      {
        key: "brightness",
        i18nKey: "colorAdjust.brightness",
        text: "Brightness",
        min: -100,
        max: 100,
      },
      {
        key: "exposure",
        i18nKey: "colorAdjust.exposure",
        text: "Exposure",
        min: -100,
        max: 100,
      },
      {
        key: "contrast",
        i18nKey: "colorAdjust.contrast",
        text: "Contrast",
        min: -100,
        max: 100,
      },
      {
        key: "blacks",
        i18nKey: "colorAdjust.blacks",
        text: "Blacks",
        min: -100,
        max: 100,
      },
      {
        key: "whites",
        i18nKey: "colorAdjust.whites",
        text: "Whites",
        min: -100,
        max: 100,
      },
      {
        key: "highlights",
        i18nKey: "colorAdjust.highlights",
        text: "Highlights",
        min: -100,
        max: 100,
      },
      {
        key: "shadows",
        i18nKey: "colorAdjust.shadows",
        text: "Shadows",
        min: -100,
        max: 100,
      },
    ],
  },
  {
    i18nKey: "colorAdjust.groupDetail",
    text: "Detail",
    sliders: [
      {
        key: "sharpen",
        i18nKey: "colorAdjust.sharpen",
        text: "Sharpen",
        min: 0,
        max: 100,
      },
      {
        key: "clarity",
        i18nKey: "colorAdjust.clarity",
        text: "Clarity",
        min: -100,
        max: 100,
      },
      {
        key: "smooth",
        i18nKey: "colorAdjust.smooth",
        text: "Smooth",
        min: 0,
        max: 100,
      },
      {
        key: "blur",
        i18nKey: "colorAdjust.blur",
        text: "Blur",
        min: 0,
        max: 100,
      },
      {
        key: "grain",
        i18nKey: "colorAdjust.grain",
        text: "Grain",
        min: 0,
        max: 100,
      },
    ],
  },
  {
    i18nKey: "colorAdjust.groupScene",
    text: "Scene",
    sliders: [
      {
        key: "vignette",
        i18nKey: "colorAdjust.vignette",
        text: "Vignette",
        min: -100,
        max: 100,
      },
      {
        key: "glamour",
        i18nKey: "colorAdjust.glamour",
        text: "Glamour",
        min: 0,
        max: 100,
      },
      {
        key: "bloom",
        i18nKey: "colorAdjust.bloom",
        text: "Bloom",
        min: 0,
        max: 100,
      },
      {
        key: "dehaze",
        i18nKey: "colorAdjust.dehaze",
        text: "Dehaze",
        min: 0,
        max: 100,
      },
    ],
  },
];

export function ColorAdjustDialog({
  open,
  onOpenChange,
  imageSrc,
  fileName,
  onConfirm,
  lut,
}) {
  const { t: t2 } = useTranslation();
  useSuspendCanvasInteractions(open);
  const [stageEl, setStageEl] = reactExports.useState(null);
  const processorRef = reactExports.useRef(null);
  const settingsRef = reactExports.useRef(defaultSettings);
  const [settings, setSettings] = reactExports.useState(defaultSettings);
  const [loading, setLoading] = reactExports.useState(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [luts, setLuts] = reactExports.useState([]);
  const [selectedLut, setSelectedLut] = reactExports.useState(null);
  const [lutIntensity, setLutIntensity] = reactExports.useState(100);
  const [lutBusy, setLutBusy] = reactExports.useState(false);
  const lutIntensityRef = reactExports.useRef(lutIntensity);
  lutIntensityRef.current = lutIntensity;
  const fileInputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open || !stageEl) return;
    let cancelled = false;
    let processor = null;
    setLoading(true);
    const rafId2 = requestAnimationFrame(() => {
      if (cancelled) return;
      processor = new ImageColorGrading({
        backend: "auto",
        maxPreviewSize: 2048,
      });
      processorRef.current = processor;
      const canvas = processor.getCanvas();
      canvas.className = "block max-h-full max-w-full object-contain";
      stageEl.replaceChildren(canvas);
      processor
        .loadImage(imageSrc)
        .then(() => {
          if (cancelled || !processor) return;
          processor.setSettings(settingsRef.current);
        })
        .catch((err) => {
          if (!cancelled)
            console.error("[ColorAdjustDialog] loadImage failed:", err);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId2);
      processor?.dispose();
      processorRef.current = null;
    };
  }, [open, stageEl, imageSrc]);
  reactExports.useEffect(() => {
    settingsRef.current = settings;
    const processor = processorRef.current;
    if (!processor?.isLoaded()) return;
    const rafId2 = requestAnimationFrame(() => {
      processor.setSettings(settings);
    });
    return () => cancelAnimationFrame(rafId2);
  }, [settings]);
  reactExports.useEffect(() => {
    if (!open) {
      setSettings(defaultSettings);
      settingsRef.current = defaultSettings;
      setSelectedLut(null);
      setLutIntensity(100);
    }
  }, [open]);
  reactExports.useEffect(() => {
    if (!open || !lut) return;
    let cancelled = false;
    lut
      .listLuts()
      .then((res) => {
        if (!cancelled) setLuts(res);
      })
      .catch((err) =>
        console.error("[ColorAdjustDialog] list LUTs failed:", err),
      );
    return () => {
      cancelled = true;
    };
  }, [open, lut]);
  reactExports.useEffect(() => {
    const processor = processorRef.current;
    if (!processor || !lut) return;
    if (!selectedLut) {
      processor.clearLUT();
      return;
    }
    let cancelled = false;
    setLutBusy(true);
    lut
      .loadLutContent(selectedLut)
      .then(async (text2) => {
        if (cancelled) return;
        await processor.loadLUT(text2);
        if (cancelled) return;
        processor.setLUTIntensity(lutIntensityRef.current);
      })
      .catch((err) => {
        if (!cancelled)
          console.error("[ColorAdjustDialog] load LUT failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLutBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLut, lut]);
  reactExports.useEffect(() => {
    const processor = processorRef.current;
    if (!processor || !selectedLut) return;
    const rafId2 = requestAnimationFrame(() => {
      processor.setLUTIntensity(lutIntensity);
    });
    return () => cancelAnimationFrame(rafId2);
  }, [lutIntensity, selectedLut]);
  const updateSetting = reactExports.useCallback(
    (key2) => (value) => {
      setSettings((prev) => ({
        ...prev,
        [key2]: value,
      }));
    },
    [],
  );
  const handleReset = reactExports.useCallback(() => {
    setSettings(defaultSettings);
    setSelectedLut(null);
    setLutIntensity(100);
  }, []);
  const handleConfirm = reactExports.useCallback(async () => {
    const processor = processorRef.current;
    if (!processor?.isLoaded()) return;
    setSubmitting(true);
    try {
      const blob = await processor.toBlob({
        format: "image/png",
      });
      await onConfirm(blob);
      onOpenChange(false);
    } catch (err) {
      console.error("[ColorAdjustDialog] export failed:", err);
    } finally {
      setSubmitting(false);
    }
  }, [onConfirm, onOpenChange]);
  const handleImportClick = reactExports.useCallback(() => {
    lut?.onImportEvent?.({
      phase: "click",
    });
    fileInputRef.current?.click();
  }, [lut]);
  const handleFilePicked = reactExports.useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !lut) return;
      const startedAt = Date.now();
      setLutBusy(true);
      try {
        const { name: name2 } = await lut.importLut(file);
        const fresh = await lut.listLuts();
        setLuts(fresh);
        setSelectedLut(name2);
        lut.onImportEvent?.({
          phase: "success",
          fileSize: file.size,
          durationMs: Date.now() - startedAt,
        });
      } catch (err) {
        lut.onImportEvent?.({
          phase: "failed",
          fileSize: file.size,
          durationMs: Date.now() - startedAt,
          error: err,
        });
        console.error("[ColorAdjustDialog] import LUT failed:", err);
        dedupedToast.error(
          t2("colorAdjust.lut.errorImport", "Failed to import LUT"),
        );
      } finally {
        setLutBusy(false);
      }
    },
    [lut, t2],
  );
  const handleDeleteLut = reactExports.useCallback(
    async (name2) => {
      if (!lut) return;
      const confirmed = window.confirm(
        t2("colorAdjust.lut.deleteConfirm", "Delete this LUT?"),
      );
      if (!confirmed) return;
      setLutBusy(true);
      try {
        await lut.deleteLut(name2);
        const fresh = await lut.listLuts();
        setLuts(fresh);
        if (selectedLut === name2) setSelectedLut(null);
      } catch (err) {
        console.error("[ColorAdjustDialog] delete LUT failed:", err);
        dedupedToast.error(
          t2("colorAdjust.lut.errorDelete", "Failed to delete LUT"),
        );
      } finally {
        setLutBusy(false);
      }
    },
    [lut, selectedLut, t2],
  );
  const handleLutSelectChange = reactExports.useCallback((value) => {
    if (value === null || value === LUT_NONE$1) {
      setSelectedLut(null);
    } else {
      setSelectedLut(value);
    }
  }, []);
  const presetDisplayName = reactExports.useCallback(
    (filename) => {
      const stem = filename.replace(/\.cube$/i, "");
      return t2(`colorAdjust.lutPreset.${stem}`, filename);
    },
    [t2],
  );
  const presetLuts = reactExports.useMemo(
    () => luts.filter((entry) => entry.isPreset),
    [luts],
  );
  const userLuts = reactExports.useMemo(
    () => luts.filter((entry) => !entry.isPreset),
    [luts],
  );
  const lutItems = reactExports.useMemo(() => {
    const map3 = {
      [LUT_NONE$1]: t2("colorAdjust.lut.none", "None"),
    };
    for (const entry of presetLuts)
      map3[entry.name] = presetDisplayName(entry.name);
    for (const entry of userLuts) map3[entry.name] = entry.name;
    return map3;
  }, [presetLuts, userLuts, presetDisplayName, t2]);
  return (
    <Dialog$1 open={open} onOpenChange={onOpenChange}>
      <DialogContent$1
        showCloseButton={false}
        className={cn$5(
          "grid h-[min(660px,78vh)] gap-0 overflow-hidden rounded-lg border border-[var(--canvas-controls-border)] bg-[var(--canvas-controls-bg)] p-0 text-[var(--canvas-controls-text)] ring-0",
          "sm:!max-w-[min(960px,90vw)]",
          "grid-rows-[auto_minmax(0,1fr)_auto]",
        )}
      >
        <DialogHeader$1 className="flex-row items-center gap-2 border-b border-[var(--canvas-controls-border)] px-3 py-2">
          <DialogTitle$1 className="font-heading text-[13px] font-medium">
            {t2("canvas.colorAdjust")}
          </DialogTitle$1>
          {fileName && (
            <span className="truncate text-[11px] text-muted-foreground">
              {"— "}
              {fileName}
            </span>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            aria-label={t2("common.cancel")}
            title={t2("common.cancel")}
            className="ml-auto flex size-8 items-center justify-center rounded-md text-[var(--canvas-controls-text)] transition-colors hover:bg-[var(--canvas-controls-hover)] disabled:pointer-events-none disabled:opacity-50"
          >
            <CloseIcon$1 />
          </button>
        </DialogHeader$1>
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative flex min-h-0 items-center justify-center bg-[var(--canvas-controls-hover)] p-3">
            <div
              ref={setStageEl}
              className="flex h-full w-full items-center justify-center"
            />
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-background/60 text-xs text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span>
                  {t2("colorAdjust.compilingShaders", "正在编译着色器…")}
                </span>
              </div>
            )}
          </div>
          <div className="flex min-h-0 flex-col border-l border-[var(--canvas-controls-border)]">
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {lut && (
                <div className="mb-5">
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t2("colorAdjust.groupLut", "LUT")}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <Select$2
                          value={selectedLut ?? LUT_NONE$1}
                          items={lutItems}
                          onValueChange={handleLutSelectChange}
                          disabled={lutBusy || submitting}
                        >
                          <SelectTrigger$1
                            data-action-ui-id="image-color-adjust.lut-select"
                            className="w-full"
                          >
                            <SelectValue$1
                              placeholder={t2(
                                "colorAdjust.lut.placeholder",
                                "Select a LUT",
                              )}
                            />
                          </SelectTrigger$1>
                          <SelectContent$1>
                            <SelectItem$1 value={LUT_NONE$1}>
                              <span className="text-muted-foreground">
                                {t2("colorAdjust.lut.none", "None")}
                              </span>
                            </SelectItem$1>
                            {presetLuts.length > 0 && (
                              <>
                                <SelectSeparator />
                                <SelectGroup>
                                  <SelectLabel className="text-[11px] font-medium uppercase tracking-wider">
                                    {t2(
                                      "colorAdjust.lutGroupPresets",
                                      "Presets",
                                    )}
                                  </SelectLabel>
                                  {presetLuts.map((entry) => (
                                    <SelectItem$1
                                      key={entry.name}
                                      value={entry.name}
                                    >
                                      <span className="min-w-0 flex-1 truncate">
                                        {presetDisplayName(entry.name)}
                                      </span>
                                    </SelectItem$1>
                                  ))}
                                </SelectGroup>
                              </>
                            )}
                            {userLuts.length > 0 && (
                              <>
                                <SelectSeparator />
                                <SelectGroup>
                                  <SelectLabel className="text-[11px] font-medium uppercase tracking-wider">
                                    {t2("colorAdjust.lutGroupMine", "My LUTs")}
                                  </SelectLabel>
                                  {userLuts.map((entry) => {
                                    const isSelected =
                                      selectedLut === entry.name;
                                    return (
                                      <SelectItem$1
                                        key={entry.name}
                                        value={entry.name}
                                        className="group pr-2"
                                      >
                                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                          <span className="min-w-0 flex-1 truncate">
                                            {entry.name}
                                          </span>
                                          {!isSelected && (
                                            <button
                                              type="button"
                                              aria-label={t2(
                                                "colorAdjust.lut.delete",
                                                "Delete",
                                              )}
                                              onClick={(e2) => {
                                                e2.preventDefault();
                                                e2.stopPropagation();
                                                void handleDeleteLut(
                                                  entry.name,
                                                );
                                              }}
                                              onPointerDown={(e2) => {
                                                e2.preventDefault();
                                                e2.stopPropagation();
                                              }}
                                              className="flex size-5 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-foreground/10 hover:text-foreground"
                                              style={{
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                              }}
                                            >
                                              <Trash2 className="size-3.5" />
                                            </button>
                                          )}
                                        </span>
                                      </SelectItem$1>
                                    );
                                  })}
                                </SelectGroup>
                              </>
                            )}
                          </SelectContent$1>
                        </Select$2>
                      </div>
                      <Button$2
                        variant="outline"
                        size="sm"
                        onClick={handleImportClick}
                        disabled={lutBusy || submitting}
                        data-action-ui-id="image-color-adjust.lut-import"
                      >
                        <Upload className="size-3.5" />
                        {t2("colorAdjust.lut.import", "Import...")}
                      </Button$2>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".cube"
                      className="hidden"
                      onChange={handleFilePicked}
                    />
                    <ColorAdjustSlider
                      label={t2("colorAdjust.lut.intensity", "Intensity")}
                      value={lutIntensity}
                      min={0}
                      max={100}
                      disabled={!selectedLut || lutBusy || submitting}
                      onChange={setLutIntensity}
                      dataActionUiId="image-color-adjust.lut-intensity"
                    />
                  </div>
                </div>
              )}
              {SLIDER_GROUPS$1.map((group) => (
                <div key={group.i18nKey} className="mb-5 last:mb-0">
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t2(group.i18nKey, group.text)}
                  </div>
                  <div className="flex flex-col gap-3">
                    {group.sliders.map((s2) => (
                      <ColorAdjustSlider
                        key={s2.key}
                        label={t2(s2.i18nKey, s2.text)}
                        value={settings[s2.key]}
                        min={s2.min}
                        max={s2.max}
                        disabled={loading || submitting}
                        dataActionUiId={`image-color-adjust.${s2.key}`}
                        onChange={updateSetting(s2.key)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter$1 className="flex-row items-center justify-between gap-3 px-3 pb-3 pt-3">
          <Button$2
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={submitting}
          >
            {t2("colorAdjust.reset")}
          </Button$2>
          <div className="flex items-center gap-1.5">
            <Button$2
              size="icon"
              onClick={handleConfirm}
              disabled={loading || submitting}
              loading={submitting}
              aria-label={t2("colorAdjust.saveToCanvas")}
              title={t2("colorAdjust.saveToCanvas")}
              className="bg-[var(--canvas-primary-btn-bg)] text-[var(--canvas-primary-btn-icon)] hover:bg-[var(--canvas-primary-btn-bg-hover)]"
            >
              <SendArrowIcon />
            </Button$2>
          </div>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
}
