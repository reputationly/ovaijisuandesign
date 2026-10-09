// video-color-adjust-dialog.jsx
import {
  jsxRuntimeExports,
  reactExports,
  useTranslation,
  Trash2,
  dedupedToast,
  Dialog$1,
  PlaybackPauseIcon$1,
  PlaybackPlayIcon$1,
  Output,
  WebMOutputFormat,
  Mp4OutputFormat,
  BufferTarget,
  BlobSource,
  UrlSource,
  Upload,
} from "../vendor.js";
import { SendArrowIcon } from "../m01/generating-media-area.jsx";
import {
  DialogContent$1,
  DialogHeader$1,
  DialogTitle$1,
  DialogFooter$1,
} from "../m02/thumb-chip.jsx";
import { Button$2 } from "../m01/use-media-node-actions.jsx";
import { useSuspendCanvasInteractions } from "../m01/use-inline-rename.jsx";
import { ColorAdjustSlider } from "../m03/color-adjust-dialog.jsx";
import {
  Select$2,
  SelectTrigger$1,
  SelectValue$1,
  SelectContent$1,
  SelectItem$1,
  SelectSeparator,
  SelectGroup,
  SelectLabel,
} from "../m01/calc-video-cost-breakdown.jsx";
import { cn$5 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { ProgressBar } from "../m04/ready-sub-video-card.jsx";
import { defaultSettings } from "../m03/highlights-fragment.js";
import { Conversion, Input$3, ALL_FORMATS } from "../m01/hls-segmented-input.js";
import { VolumeMuteIcon, VolumeIcon } from "../m02/media-clip-panel-inner.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { VideoColorGrading } from "./text-node-inner.jsx";
async function exportVideo(processor, source, opts = {}) {
  const format2 = opts.format ?? "mp4";
  const codec = opts.codec ?? (format2 === "webm" ? "vp9" : "avc");
  const bitrate = opts.bitrate ?? 5e6;
  const input = await openInput(source);
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) throw new Error("Input has no video track");
  const decodable = await videoTrack.canDecode();
  if (!decodable) throw new Error("Input video codec is not decodable in this browser");
  const trackDuration = await videoTrack.computeDuration();
  const [packetStats, codedW, codedH, dispW, dispH] = await Promise.all([
    videoTrack.computePacketStats(60),
    videoTrack.getCodedWidth(),
    videoTrack.getCodedHeight(),
    videoTrack.getDisplayWidth(),
    videoTrack.getDisplayHeight(),
  ]);
  const sourceFrameRate = packetStats.averagePacketRate || 30;
  const frameRate = opts.frameRate && opts.frameRate > 0 ? opts.frameRate : sourceFrameRate;
  const startTime = opts.startTime ?? 0;
  const endTime = opts.endTime ?? trackDuration;
  const outW = makeEven(dispW || codedW);
  const outH = makeEven(dispH || codedH);
  await processor.ensureReadyForSource(outW, outH);
  const canvas = processor.getCanvas();
  const output = new Output({
    format: format2 === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat(),
    target: new BufferTarget(),
  });
  let conversion;
  try {
    conversion = await Conversion.init({
      input,
      output,
      trim: {
        start: startTime,
        end: endTime,
      },
      video: {
        codec,
        bitrate,
        frameRate,
        width: outW,
        height: outH,
        fit: "fill",
        forceTranscode: true,
        processedWidth: outW,
        processedHeight: outH,
        process: async (sample) => {
          const frame2 = sample.toVideoFrame();
          try {
            processor.renderFromSource(frame2);
          } finally {
            frame2.close();
          }
          return await createImageBitmap(canvas);
        },
      },
    });
  } catch (e2) {
    input.dispose();
    throw e2;
  }
  if (opts.onProgress) {
    let lastProgress = -1;
    conversion.onProgress = (p3) => {
      const v2 = Math.min(1, Math.max(0, p3));
      if (v2 - lastProgress >= 0.01 || v2 >= 1) {
        opts.onProgress(v2);
        lastProgress = v2;
      }
    };
  }
  try {
    await conversion.execute();
  } finally {
    input.dispose();
  }
  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Export failed: no buffer produced");
  const mime = format2 === "webm" ? "video/webm" : "video/mp4";
  return new Blob([buffer], {
    type: mime,
  });
}
async function openInput(source) {
  if (source instanceof Blob) {
    return new Input$3({
      formats: ALL_FORMATS,
      source: new BlobSource(source),
    });
  }
  if (typeof source === "string") {
    return new Input$3({
      formats: ALL_FORMATS,
      source: new UrlSource(source),
    });
  }
  const url2 = source.currentSrc || source.src;
  if (!url2) throw new Error("Video element has no src to export from");
  if (url2.startsWith("blob:")) {
    const blob = await fetch(url2).then((r2) => r2.blob());
    return new Input$3({
      formats: ALL_FORMATS,
      source: new BlobSource(blob),
    });
  }
  return new Input$3({
    formats: ALL_FORMATS,
    source: new UrlSource(url2),
  });
}
function makeEven(n2) {
  return n2 - (n2 % 2);
}
function useDelayedHover(delay = 100) {
  const [isOpen, setIsOpen] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const open = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(true);
  }, []);
  const close2 = reactExports.useCallback(() => {
    timerRef.current = setTimeout(() => setIsOpen(false), delay);
  }, [delay]);
  const dismiss = reactExports.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(false);
  }, []);
  return {
    isOpen,
    open,
    close: close2,
    dismiss,
  };
}
function VolumeControlInner({ videoRef, tone = "dark" }) {
  const trackRef = reactExports.useRef(null);
  const [volume, setVolume] = reactExports.useState(100);
  const [muted, setMuted] = reactExports.useState(false);
  const { isOpen, open, close: close2 } = useDelayedHover();
  reactExports.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    el.volume = volume / 100;
  }, [muted, volume, videoRef]);
  const handleToggleMute = reactExports.useCallback((e2) => {
    e2.stopPropagation();
    setMuted((prev) => !prev);
  }, []);
  const seekVolume = reactExports.useCallback((clientY) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const newVol = Math.round(ratio * 100);
    setVolume(newVol);
    setMuted(newVol === 0);
  }, []);
  const handleClick2 = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      seekVolume(e2.clientY);
    },
    [seekVolume],
  );
  const handleDragStart = reactExports.useCallback(
    (e2) => {
      e2.stopPropagation();
      e2.preventDefault();
      seekVolume(e2.clientY);
      const onMove = (ev) => seekVolume(ev.clientY);
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [seekVolume],
  );
  const isLight = tone === "light";
  const btnCls = isLight
    ? "flex size-6 shrink-0 items-center justify-center rounded text-foreground/80 hover:bg-foreground/10"
    : "flex size-6 shrink-0 items-center justify-center rounded text-white hover:bg-white/10";
  const popoverBg = isLight ? "rgba(255,255,255,0.96)" : "rgba(40,40,40,0.92)";
  const popoverShadow = isLight ? "0 2px 8px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.3)";
  const popoverBorder = isLight ? "1px solid rgba(0,0,0,0.08)" : "none";
  const valueCls = isLight ? "text-foreground/65" : "text-white/60";
  const trackBg = isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.2)";
  const fillBg = isLight ? "currentColor" : "#fff";
  const thumbShadow = isLight ? "0 0 2px rgba(0,0,0,0.25)" : "0 0 2px rgba(0,0,0,0.3)";
  const sliderColorCls = isLight ? "text-foreground" : "text-white";
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover menu container
    <div className="relative" onMouseEnter={open} onMouseLeave={close2}>
      <button
        type="button"
        onClick={handleToggleMute}
        onDoubleClick={(e2) => e2.stopPropagation()}
        className={btnCls}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        {muted || volume === 0 ? <VolumeMuteIcon /> : <VolumeIcon />}
      </button>
      {isOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: hover menu popover
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1"
          style={{
            zIndex: 10,
          }}
          onMouseEnter={open}
          onMouseLeave={close2}
        >
          <div
            className={`flex flex-col items-center rounded-md px-1.5 py-2 ${sliderColorCls}`}
            style={{
              background: popoverBg,
              boxShadow: popoverShadow,
              border: popoverBorder,
            }}
          >
            <span
              className={`select-none text-[10px] tabular-nums mb-1 ${valueCls}`}
              style={{
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {volume}
            </span>
            <div
              ref={trackRef}
              className="relative cursor-pointer"
              style={{
                width: 20,
                height: 64,
                display: "flex",
                justifyContent: "center",
              }}
              onClick={handleClick2}
              onMouseDown={handleDragStart}
            >
              <div
                className="relative"
                style={{
                  width: 2,
                  height: "100%",
                  borderRadius: 1,
                  background: trackBg,
                }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{
                    height: `${volume}%`,
                    borderRadius: 1,
                    background: fillBg,
                  }}
                />
              </div>
              <div
                className="absolute"
                style={{
                  left: "50%",
                  bottom: `${volume}%`,
                  transform: "translate(-50%, 50%)",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: fillBg,
                  boxShadow: thumbShadow,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const VolumeControl = reactExports.memo(VolumeControlInner);
const LUT_NONE = "__none__";
const SLIDER_GROUPS = [
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
export function VideoColorAdjustDialog({
  open,
  onOpenChange,
  videoSrc,
  videoName,
  onConfirm,
  lut,
}) {
  const { t: t2 } = useTranslation();
  useSuspendCanvasInteractions(open);
  const [stageEl, setStageEl] = reactExports.useState(null);
  const [videoEl, setVideoEl] = reactExports.useState(null);
  const videoRef = reactExports.useRef(null);
  const setVideoNode = reactExports.useCallback((node2) => {
    videoRef.current = node2;
    setVideoEl(node2);
  }, []);
  const processorRef = reactExports.useRef(null);
  const settingsRef = reactExports.useRef(defaultSettings);
  const [settings, setSettings] = reactExports.useState(defaultSettings);
  const [loading, setLoading] = reactExports.useState(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [progress, setProgress] = reactExports.useState(0);
  const [playing, setPlaying] = reactExports.useState(false);
  const [luts, setLuts] = reactExports.useState([]);
  const [selectedLut, setSelectedLut] = reactExports.useState(null);
  const [lutIntensity, setLutIntensity] = reactExports.useState(100);
  const [lutBusy, setLutBusy] = reactExports.useState(false);
  const lutIntensityRef = reactExports.useRef(lutIntensity);
  lutIntensityRef.current = lutIntensity;
  const fileInputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open || !stageEl || !videoEl) return;
    const processor = new VideoColorGrading({
      backend: "auto",
    });
    processorRef.current = processor;
    const canvas = processor.getCanvas();
    canvas.className = "block max-h-full max-w-full object-contain";
    stageEl.replaceChildren(canvas);
    videoEl.src = videoSrc;
    let cancelled = false;
    setLoading(true);
    processor
      .attachVideo(videoEl)
      .then(() => {
        if (cancelled) return;
        processor.setSettings(settingsRef.current);
        processor.renderOnce();
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[VideoColorAdjustDialog] attachVideo failed:", err);
        dedupedToast.error(
          t2("colorAdjust.errorAttachFailed", "Failed to load video for color grading"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    videoEl.addEventListener("play", onPlay);
    videoEl.addEventListener("pause", onPause);
    return () => {
      cancelled = true;
      videoEl.removeEventListener("play", onPlay);
      videoEl.removeEventListener("pause", onPause);
      videoEl.pause();
      processor.dispose();
      processorRef.current = null;
    };
  }, [open, stageEl, videoEl, videoSrc, t2]);
  reactExports.useEffect(() => {
    settingsRef.current = settings;
    const processor = processorRef.current;
    if (!processor) return;
    const rafId2 = requestAnimationFrame(() => {
      processor.setSettings(settings);
      if (videoEl?.paused) processor.renderOnce();
    });
    return () => cancelAnimationFrame(rafId2);
  }, [settings, videoEl]);
  reactExports.useEffect(() => {
    if (!open) {
      setSettings(defaultSettings);
      settingsRef.current = defaultSettings;
      setProgress(0);
      setPlaying(false);
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
      .catch((err) => console.error("[VideoColorAdjustDialog] list LUTs failed:", err));
    return () => {
      cancelled = true;
    };
  }, [open, lut]);
  reactExports.useEffect(() => {
    const processor = processorRef.current;
    if (!processor || !lut) return;
    if (!selectedLut) {
      processor.clearLUT();
      if (videoEl?.paused) processor.renderOnce();
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
        if (videoEl?.paused) processor.renderOnce();
      })
      .catch((err) => {
        if (!cancelled) console.error("[VideoColorAdjustDialog] load LUT failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLutBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedLut, lut, videoEl]);
  reactExports.useEffect(() => {
    const processor = processorRef.current;
    if (!processor || !selectedLut) return;
    const rafId2 = requestAnimationFrame(() => {
      processor.setLUTIntensity(lutIntensity);
      if (videoEl?.paused) processor.renderOnce();
    });
    return () => cancelAnimationFrame(rafId2);
  }, [lutIntensity, selectedLut, videoEl]);
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
  const handleTogglePlay = reactExports.useCallback(() => {
    const processor = processorRef.current;
    if (!videoEl || !processor) return;
    if (videoEl.paused) {
      processor.start();
      void videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
      processor.stop();
      processor.renderOnce();
    }
  }, [videoEl]);
  const handleConfirm = reactExports.useCallback(async () => {
    const processor = processorRef.current;
    if (!processor || !videoEl) return;
    setSubmitting(true);
    setProgress(0);
    videoEl.pause();
    processor.stop();
    try {
      const blob = await exportVideo(processor, videoEl.currentSrc || videoSrc, {
        format: "mp4",
        onProgress: (p3) => setProgress(p3),
      });
      await onConfirm(blob);
      onOpenChange(false);
    } catch (err) {
      console.error("[VideoColorAdjustDialog] export failed:", err);
      dedupedToast.error(t2("colorAdjust.errorExportFailed", "Failed to export graded video"));
    } finally {
      setSubmitting(false);
    }
  }, [onConfirm, onOpenChange, videoSrc, videoEl, t2]);
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
        console.error("[VideoColorAdjustDialog] import LUT failed:", err);
        dedupedToast.error(t2("colorAdjust.lut.errorImport", "Failed to import LUT"));
      } finally {
        setLutBusy(false);
      }
    },
    [lut, t2],
  );
  const handleDeleteLut = reactExports.useCallback(
    async (name2) => {
      if (!lut) return;
      const confirmed = window.confirm(t2("colorAdjust.lut.deleteConfirm", "Delete this LUT?"));
      if (!confirmed) return;
      setLutBusy(true);
      try {
        await lut.deleteLut(name2);
        const fresh = await lut.listLuts();
        setLuts(fresh);
        if (selectedLut === name2) setSelectedLut(null);
      } catch (err) {
        console.error("[VideoColorAdjustDialog] delete LUT failed:", err);
        dedupedToast.error(t2("colorAdjust.lut.errorDelete", "Failed to delete LUT"));
      } finally {
        setLutBusy(false);
      }
    },
    [lut, selectedLut, t2],
  );
  const handleLutSelectChange = reactExports.useCallback((value) => {
    if (value === null || value === LUT_NONE) {
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
  const presetLuts = reactExports.useMemo(() => luts.filter((entry) => entry.isPreset), [luts]);
  const userLuts = reactExports.useMemo(() => luts.filter((entry) => !entry.isPreset), [luts]);
  const lutItems = reactExports.useMemo(() => {
    const map3 = {
      [LUT_NONE]: t2("colorAdjust.lut.none", "None"),
    };
    for (const entry of presetLuts) map3[entry.name] = presetDisplayName(entry.name);
    for (const entry of userLuts) map3[entry.name] = entry.name;
    return map3;
  }, [presetLuts, userLuts, presetDisplayName, t2]);
  const progressPct = Math.round(progress * 100);
  return (
    <Dialog$1 open={open} onOpenChange={onOpenChange}>
      <DialogContent$1
        className={cn$5(
          "grid h-[min(700px,80vh)] gap-0 overflow-hidden p-0",
          "sm:!max-w-[min(1040px,92vw)]",
          "grid-rows-[auto_minmax(0,1fr)_auto]",
        )}
      >
        <DialogHeader$1 className="flex-row items-center gap-2 border-b border-border/40 px-4 py-2.5">
          <DialogTitle$1 className="text-sm font-medium">{t2("canvas.colorAdjust")}</DialogTitle$1>
          {videoName && (
            <span className="truncate text-xs text-muted-foreground">
              {"— "}
              {videoName}
            </span>
          )}
        </DialogHeader$1>
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative flex min-h-0 flex-col bg-muted/30">
            <div ref={setStageEl} className="flex min-h-0 flex-1 items-center justify-center p-4" />
            <video
              ref={setVideoNode}
              playsInline={true}
              loop={true}
              crossOrigin="anonymous"
              preload="auto"
              style={{
                display: "none",
              }}
            />
            <div
              className="nodrag nopan nowheel flex items-center gap-1.5 border-t border-border/40 px-3 py-2 text-foreground/80"
              style={{
                background: "var(--canvas-controls-bg)",
              }}
            >
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={loading || submitting}
                aria-label={playing ? t2("common.pause", "Pause") : t2("common.play", "Play")}
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-foreground/80 hover:bg-foreground/10 disabled:opacity-50"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {playing ? (
                  <PlaybackPauseIcon$1 className="size-4" />
                ) : (
                  <PlaybackPlayIcon$1 className="size-4" />
                )}
              </button>
              {videoEl && (
                <>
                  <ProgressBar videoRef={videoRef} isPlaying={playing} tone="light" />
                  <VolumeControl videoRef={videoRef} tone="light" />
                </>
              )}
            </div>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 text-xs text-muted-foreground">
                {t2("common.loading")}
              </div>
            )}
            {submitting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
                <div className="text-sm text-foreground/85">
                  {t2("colorAdjust.exportingVideo", "Exporting video...")}
                </div>
                <div className="h-1 w-64 overflow-hidden bg-foreground/15">
                  <div
                    className="h-full bg-foreground transition-[width] duration-200"
                    style={{
                      width: `${progressPct}%`,
                    }}
                  />
                </div>
                <div className="font-mono text-xs tabular-nums text-foreground/65">
                  {progressPct}%
                </div>
              </div>
            )}
          </div>
          <div className="flex min-h-0 flex-col border-l border-border/40">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {lut && (
                <div className="mb-5 border-b border-border/40 pb-5">
                  <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t2("colorAdjust.groupLut", "LUT")}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <Select$2
                          value={selectedLut ?? LUT_NONE}
                          items={lutItems}
                          onValueChange={handleLutSelectChange}
                          disabled={lutBusy || submitting}
                        >
                          <SelectTrigger$1
                            data-action-ui-id="video-color-adjust.lut-select"
                            className="w-full"
                          >
                            <SelectValue$1
                              placeholder={t2("colorAdjust.lut.placeholder", "Select a LUT")}
                            />
                          </SelectTrigger$1>
                          <SelectContent$1>
                            <SelectItem$1 value={LUT_NONE}>
                              <span className="text-muted-foreground">
                                {t2("colorAdjust.lut.none", "None")}
                              </span>
                            </SelectItem$1>
                            {presetLuts.length > 0 && (
                              <>
                                <SelectSeparator />
                                <SelectGroup>
                                  <SelectLabel className="text-[10px] font-medium uppercase tracking-wider">
                                    {t2("colorAdjust.lutGroupPresets", "Presets")}
                                  </SelectLabel>
                                  {presetLuts.map((entry) => (
                                    <SelectItem$1 key={entry.name} value={entry.name}>
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
                                  <SelectLabel className="text-[10px] font-medium uppercase tracking-wider">
                                    {t2("colorAdjust.lutGroupMine", "My LUTs")}
                                  </SelectLabel>
                                  {userLuts.map((entry) => {
                                    const isSelected = selectedLut === entry.name;
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
                                              aria-label={t2("colorAdjust.lut.delete", "Delete")}
                                              onClick={(e2) => {
                                                e2.preventDefault();
                                                e2.stopPropagation();
                                                void handleDeleteLut(entry.name);
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
                        onClick={handleImportClick}
                        disabled={lutBusy || submitting}
                        data-action-ui-id="video-color-adjust.lut-import"
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
                      dataActionUiId="video-color-adjust.lut-intensity"
                    />
                  </div>
                </div>
              )}
              {SLIDER_GROUPS.map((group) => (
                <div
                  key={group.i18nKey}
                  className="mb-5 border-b border-border/40 pb-5 last:mb-0 last:border-b-0 last:pb-0"
                >
                  <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
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
                        dataActionUiId={`video-color-adjust.${s2.key}`}
                        onChange={updateSetting(s2.key)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter$1 className="flex-row items-center justify-between gap-3 border-t border-[var(--canvas-controls-border)] px-3 pb-3 pt-3">
          <Button$2 variant="ghost" size="sm" onClick={handleReset} disabled={submitting}>
            {t2("colorAdjust.reset")}
          </Button$2>
          <div className="flex items-center gap-1.5">
            <Button$2
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-[var(--canvas-controls-border)] bg-transparent text-[var(--canvas-controls-text)] hover:bg-[var(--canvas-controls-hover)] hover:text-[var(--canvas-controls-text)]"
            >
              {t2("common.cancel")}
            </Button$2>
            <Button$2
              size="icon"
              onClick={handleConfirm}
              disabled={loading || submitting}
              loading={submitting}
              aria-label={t2("colorAdjust.saveToCanvas")}
              title={t2("colorAdjust.saveToCanvas")}
              className="border-transparent bg-[var(--canvas-primary-btn-bg)] text-[var(--canvas-primary-btn-icon)] hover:bg-[var(--canvas-primary-btn-bg-hover)]"
            >
              <SendArrowIcon />
            </Button$2>
          </div>
        </DialogFooter$1>
      </DialogContent$1>
    </Dialog$1>
  );
}
