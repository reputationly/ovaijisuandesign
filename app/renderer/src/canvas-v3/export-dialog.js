import { useTranslation } from "react-i18next";
import { Archive, CircleCheckBig, Clock, Cpu, Gauge, Globe, HardDrive, Info, Monitor, Settings, Share2, Star, Zap } from "lucide-react";
import { Dialog } from "../canvas/separator.jsx";
import { Slider } from "../canvas/slider.jsx";
import { Label } from "../media-editing/input.jsx";
import { TabsContent } from "./shortcut-hint.jsx";
import { Button } from "../canvas/node-shell-inner.jsx";
import { Select } from "../assets/credit-query-keys.jsx";
import { estimateExportTime, formatDeviceSummary, getCodecRecommendations, getDeviceProfile, runBenchmark, shouldRecommendBenchmark } from "./device-capabilities.js";
import { ExportDialogLayer, exportPresetsManager } from "./export-presets.js";
import {
  DialogContent, DialogHeader, DialogTitle, Download, Input, Music,
  SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, Video,
} from "./main-exports.js";
import { Play } from "./ui-components.js";
import jsxRuntimeExports from "react/jsx-runtime";
import reactExports from "react";

function getAspectRatioType(width, height) {
  const ratio = width / height;
  if (ratio < 0.9) return "vertical";
  if (ratio > 1.1) return "horizontal";
  return "square";
}

/**
 * 导出对话框与工具栏菜单布局（第 220 轮从 EditorInterface chunk 取回）。
 *
 * 参考：EditorInterface-DwXc-S2S.js 4636–5308，共 11 个声明。
 */

export function getRecommendedPresetsForAspectRatio(presets, aspectType) {
  const aspectRatioMap = {
    "9:16": "vertical",
    "1:1": "square",
    "16:9": "horizontal",
    "4:5": "vertical"
  };
  return presets.filter((preset) => {
    if (!preset.aspectRatio) return false;
    const presetAspectType = aspectRatioMap[preset.aspectRatio];
    return presetAspectType === aspectType;
  });
}

export function getAspectRatioLabelKey(aspectType) {
  switch (aspectType) {
    case "vertical":
      return "export.aspect_vertical";
    case "square":
      return "export.aspect_square";
    case "horizontal":
      return "export.aspect_horizontal";
  }
}

export const PLATFORM_ICONS = {
  YouTube: /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { size: 16 }),
  Instagram: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { size: 16 }),
  Twitter: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { size: 16 }),
  TikTok: /* @__PURE__ */ jsxRuntimeExports.jsx(Music, { size: 16 }),
  Facebook: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { size: 16 }),
  LinkedIn: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { size: 16 }),
  Broadcast: /* @__PURE__ */ jsxRuntimeExports.jsx(Monitor, { size: 16 }),
  Web: /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { size: 16 }),
  Archive: /* @__PURE__ */ jsxRuntimeExports.jsx(Archive, { size: 16 }),
  Audio: /* @__PURE__ */ jsxRuntimeExports.jsx(Music, { size: 16 }),
  Custom: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { size: 16 })
};

export const ExportDialog = ({
  isOpen,
  onClose,
  onExport,
  duration = 0,
  projectWidth = 1920,
  projectHeight = 1080,
  frameRate = 30
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = reactExports.useState("custom");
  const [selectedPlatform, setSelectedPlatform] = reactExports.useState(
    "recommended"
  );
  const [selectedPreset, setSelectedPreset] = reactExports.useState(null);
  const [presets, setPresets] = reactExports.useState([]);
  const [platforms, setPlatforms] = reactExports.useState([]);
  const aspectType = getAspectRatioType(projectWidth, projectHeight);
  const [customSettings, setCustomSettings] = reactExports.useState({
    format: "mp4",
    codec: "h264",
    width: projectWidth,
    height: projectHeight,
    frameRate,
    bitrate: 15e3,
    bitrateMode: "vbr",
    quality: 90,
    keyframeInterval: 60,
    audioSettings: {
      format: "aac",
      sampleRate: 48e3,
      bitDepth: 16,
      bitrate: 256,
      channels: 2
    }
  });
  reactExports.useEffect(() => {
    setCustomSettings(
      (settings) => settings.width === projectWidth && settings.height === projectHeight ? settings : { ...settings, width: projectWidth, height: projectHeight }
    );
  }, [projectWidth, projectHeight]);
  const projectResolution = `${projectWidth}x${projectHeight}`;
  const resolutionOptions = [
    { value: "3840x2160", label: "4K (3840x2160)" },
    { value: "2560x1440", label: "2K (2560x1440)" },
    { value: "1920x1080", label: "1080p (1920x1080)" },
    { value: "1280x720", label: "720p (1280x720)" },
    { value: "854x480", label: "480p (854x480)" },
    { value: "1080x1920", label: t("export.res_vertical_1080") },
    { value: "1080x1080", label: t("export.res_square_1080") }
  ];
  if (!resolutionOptions.some((option) => option.value === projectResolution)) {
    resolutionOptions.unshift({ value: projectResolution, label: projectResolution });
  }
  const [deviceProfile, setDeviceProfile] = reactExports.useState(null);
  const [timeEstimate, setTimeEstimate] = reactExports.useState(null);
  const [codecRecommendations, setCodecRecommendations] = reactExports.useState([]);
  const [isBenchmarking, setIsBenchmarking] = reactExports.useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = reactExports.useState(null);
  const [showDeviceInfo, setShowDeviceInfo] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (isOpen) {
      setPresets(exportPresetsManager.getAllPresets());
      setPlatforms(exportPresetsManager.getPlatforms());
      setSelectedPlatform("recommended");
      setSelectedPreset(null);
      getDeviceProfile().then((profile) => {
        setDeviceProfile(profile);
        setCodecRecommendations(
          getCodecRecommendations(profile, { width: projectWidth, height: projectHeight })
        );
      });
    }
  }, [isOpen, projectWidth, projectHeight]);
  reactExports.useEffect(() => {
    if (!deviceProfile || duration <= 0) {
      setTimeEstimate(null);
      return;
    }
    const settings = activeTab === "presets" && selectedPreset ? selectedPreset.settings : customSettings;
    const estimate = estimateExportTime(deviceProfile, {
      width: settings.width,
      height: settings.height,
      frameRate: settings.frameRate,
      duration,
      codec: settings.codec
    });
    setTimeEstimate(estimate);
  }, [deviceProfile, duration, activeTab, selectedPreset, customSettings]);
  const handleRunBenchmark = reactExports.useCallback(async () => {
    if (isBenchmarking) return;
    setIsBenchmarking(true);
    setBenchmarkProgress(null);
    try {
      await runBenchmark((progress) => {
        setBenchmarkProgress(progress);
      });
      const updatedProfile = await getDeviceProfile(true);
      setDeviceProfile(updatedProfile);
      setCodecRecommendations(
        getCodecRecommendations(updatedProfile, { width: projectWidth, height: projectHeight })
      );
    } catch (error2) {
      console.error("Benchmark failed:", error2);
    } finally {
      setIsBenchmarking(false);
      setBenchmarkProgress(null);
    }
  }, [isBenchmarking, projectWidth, projectHeight]);
  const recommendedForVideo = getRecommendedPresetsForAspectRatio(
    presets,
    aspectType
  );
  const filteredPresets = selectedPlatform === "recommended" ? recommendedForVideo.length > 0 ? recommendedForVideo : exportPresetsManager.getRecommendedPresets() : selectedPlatform ? presets.filter((p) => p.platform === selectedPlatform) : exportPresetsManager.getRecommendedPresets();
  const handleExport = reactExports.useCallback(() => {
    const settings = activeTab === "presets" && selectedPreset ? selectedPreset.settings : customSettings;
    onExport(settings);
    onClose();
  }, [activeTab, selectedPreset, customSettings, onExport, onClose]);
  const formatFileSize = (bitrate, durationSec) => {
    const bytes = bitrate * 1e3 * durationSec / 8;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  const formatDuration2 = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ExportDialogLayer, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: true, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-4xl max-h-[85vh] p-0 gap-0 bg-background-secondary border-border overflow-hidden flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { className: "p-4 border-b border-border bg-background-tertiary space-y-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 20, className: "text-primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-lg font-bold text-text-primary", children: t("export.title") })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Tabs,
      {
        value: activeTab,
        onValueChange: (v) => setActiveTab(v),
        className: "flex-1 flex flex-col overflow-hidden",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "presets", className: "flex-1 overflow-hidden flex mt-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-48 border-r border-border overflow-y-auto", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => setSelectedPlatform("recommended"),
                  className: `w-full flex flex-col items-start p-3 text-sm transition-colors ${selectedPlatform === "recommended" ? "bg-primary/10 text-primary border-r-2 border-primary" : "text-text-secondary hover:bg-background-tertiary"}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 14 }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: t("export.for_your_video") })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-text-muted mt-0.5 ml-5", children: t(getAspectRatioLabelKey(aspectType)) })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-px bg-border my-1" }),
              platforms.map((platform) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: () => setSelectedPlatform(platform),
                  className: `w-full flex items-center gap-2 p-3 text-sm transition-colors ${selectedPlatform === platform ? "bg-primary/10 text-primary border-r-2 border-primary" : "text-text-secondary hover:bg-background-tertiary"}`,
                  children: [
                    PLATFORM_ICONS[platform] || /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { size: 14 }),
                    platform
                  ]
                },
                platform
              ))
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-3", children: filteredPresets.map((preset) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => setSelectedPreset(preset),
                className: `p-4 rounded-lg border text-left transition-colors ${selectedPreset?.id === preset.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between mb-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                      PLATFORM_ICONS[preset.platform],
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-text-primary", children: preset.name })
                    ] }),
                    preset.recommended && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Star,
                      {
                        size: 12,
                        className: "text-yellow-500 fill-yellow-500"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-text-muted mb-2", children: preset.description }),
                  "width" in preset.settings && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 text-[10px] text-text-secondary", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                      preset.settings.width,
                      "x",
                      preset.settings.height
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                      preset.settings.frameRate,
                      "fps"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: preset.aspectRatio })
                  ] }),
                  preset.maxDuration && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 mt-1 text-[10px] text-yellow-500", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 10 }),
                    t("export.max_duration", { n: preset.maxDuration })
                  ] })
                ]
              },
              preset.id
            )) }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "custom", className: "flex-1 overflow-y-auto p-4 mt-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-secondary mb-2", children: t("export.format") }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: customSettings.format,
                  onValueChange: (value) => setCustomSettings({
                    ...customSettings,
                    format: value
                  }),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-full bg-background-tertiary border-border text-text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { className: "bg-background-secondary border-border", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "mp4", children: "MP4" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "webm", children: "WebM" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "mov", children: "MOV" })
                    ] })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-secondary mb-2", children: t("export.codec") }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: customSettings.codec,
                  onValueChange: (value) => setCustomSettings({
                    ...customSettings,
                    codec: value
                  }),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-full bg-background-tertiary border-border text-text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { className: "bg-background-secondary border-border", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "h264", children: "H.264" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "h265", children: "H.265 (HEVC)" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "prores", children: "ProRes" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "vp9", children: "VP9" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "av1", children: "AV1" })
                    ] })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-secondary mb-2", children: t("export.resolution") }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: `${customSettings.width}x${customSettings.height}`,
                  onValueChange: (value) => {
                    const [w, h] = value.split("x").map(Number);
                    setCustomSettings({
                      ...customSettings,
                      width: w,
                      height: h
                    });
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      SelectTrigger,
                      {
                        "aria-label": t("export.resolution"),
                        "data-action-ui-id": "clip-studio-export-resolution",
                        className: "w-full bg-background-tertiary border-border text-text-primary",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { className: "bg-background-secondary border-border", children: resolutionOptions.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: option.value, children: option.label }, option.value)) })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-secondary mb-2", children: t("export.frame_rate") }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: String(customSettings.frameRate),
                  onValueChange: (value) => setCustomSettings({
                    ...customSettings,
                    frameRate: Number(value)
                  }),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-full bg-background-tertiary border-border text-text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { className: "bg-background-secondary border-border", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "24", children: "24 fps" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "25", children: "25 fps" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "30", children: "30 fps" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "50", children: "50 fps" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "60", children: "60 fps" })
                    ] })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "block text-xs font-medium text-text-secondary mb-2", children: t("export.bitrate") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "number",
                  value: customSettings.bitrate,
                  onChange: (e) => setCustomSettings({
                    ...customSettings,
                    bitrate: Number(e.target.value)
                  }),
                  className: "bg-background-tertiary border-border text-text-primary",
                  min: 1e3,
                  max: 15e4,
                  step: 1e3
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "block text-xs font-medium text-text-secondary mb-2", children: t("export.quality") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Slider,
                {
                  value: [customSettings.quality],
                  onValueChange: (value) => setCustomSettings({
                    ...customSettings,
                    quality: value[0]
                  }),
                  min: 50,
                  max: 100,
                  step: 1,
                  className: "w-full"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-[10px] text-text-muted mt-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("export.quality_smaller") }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  customSettings.quality,
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("export.quality_better") })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-medium text-text-secondary mb-2", children: t("export.audio_settings") }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    value: customSettings.audioSettings.format,
                    onValueChange: (value) => setCustomSettings({
                      ...customSettings,
                      audioSettings: {
                        ...customSettings.audioSettings,
                        format: value
                      }
                    }),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "bg-background-tertiary border-border text-text-primary text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { className: "bg-background-secondary border-border", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "aac", children: "AAC" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "mp3", children: "MP3" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "wav", children: "WAV" })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    value: String(customSettings.audioSettings.sampleRate),
                    onValueChange: (value) => setCustomSettings({
                      ...customSettings,
                      audioSettings: {
                        ...customSettings.audioSettings,
                        sampleRate: Number(value)
                      }
                    }),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "bg-background-tertiary border-border text-text-primary text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { className: "bg-background-secondary border-border", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "44100", children: "44.1 kHz" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "48000", children: "48 kHz" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "96000", children: "96 kHz" })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Select,
                  {
                    value: String(customSettings.audioSettings.bitrate),
                    onValueChange: (value) => setCustomSettings({
                      ...customSettings,
                      audioSettings: {
                        ...customSettings.audioSettings,
                        bitrate: Number(value)
                      }
                    }),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "bg-background-tertiary border-border text-text-primary text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { className: "bg-background-secondary border-border", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "128", children: "128 kbps" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "192", children: "192 kbps" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "256", children: "256 kbps" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "320", children: "320 kbps" })
                      ] })
                    ]
                  }
                )
              ] })
            ] })
          ] }) })
        ]
      }
    ),
    deviceProfile && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3 border-t border-border bg-background-tertiary/50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setShowDeviceInfo(!showDeviceInfo),
            className: "flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { size: 12 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatDeviceSummary(deviceProfile) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 10, className: "text-text-muted" })
            ]
          }
        ),
        timeEstimate && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-xs", children: [
            timeEstimate.confidence === "measured" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { size: 12, className: "text-green-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Gauge, { size: 12, className: "text-yellow-500" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-secondary", children: t("export.est_time") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-text-primary", children: timeEstimate.formatted })
          ] }),
          shouldRecommendBenchmark(deviceProfile) && !isBenchmarking && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: handleRunBenchmark,
              className: "flex items-center gap-1 px-2 py-1 text-[10px] text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 10 }),
                t("export.get_accurate")
              ]
            }
          ),
          isBenchmarking && benchmarkProgress && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[10px] text-text-muted", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-1 bg-background-tertiary rounded-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "h-full bg-primary transition-all",
                style: { width: `${benchmarkProgress.progress * 100}%` }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t("export.testing") })
          ] })
        ] })
      ] }),
      showDeviceInfo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-4 text-[10px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-muted", children: t("export.cpu") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-text-primary font-medium", children: t("export.cores", { n: deviceProfile.cpu.cores }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-muted", children: t("export.gpu") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-text-primary font-medium truncate", title: deviceProfile.gpu.renderer, children: deviceProfile.gpu.renderer !== "Unknown" ? deviceProfile.gpu.renderer.replace(/ANGLE \(|, .*\)/g, "").replace(/Direct3D11.*$/g, "").trim() : t("export.unknown") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] text-text-muted", children: deviceProfile.gpu.hasHardwareEncoding ? t("export.hw_encode") : t("export.software_only") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-text-muted", children: t("export.codecs") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 flex-wrap", children: codecRecommendations.slice(0, 3).map((rec) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: `px-1 py-0.5 rounded text-[9px] ${rec.speedRating === "fast" ? "bg-green-500/20 text-green-400" : rec.speedRating === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`,
              children: rec.codec.toUpperCase()
            },
            rec.codec
          )) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-4 border-t border-border bg-background-tertiary", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-4 text-xs text-text-muted", children: duration > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 12 }),
          formatDuration2(duration)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { size: 12 }),
          "~",
          formatFileSize(
            activeTab === "presets" && selectedPreset ? selectedPreset.settings.bitrate || 8e3 : customSettings.bitrate,
            duration
          )
        ] }),
        timeEstimate && deviceProfile?.encoding[customSettings.codec]?.hardware && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-green-500", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { size: 12 }),
          t("export.hardware_accelerated")
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          className: "bg-foreground text-background hover:bg-foreground/90",
          onClick: handleExport,
          disabled: activeTab === "presets" && !selectedPreset,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 16 }),
            t("export.start_export")
          ]
        }
      ) })
    ] })
  ] }) }) });
};

export const MENU_SCALE = 0.8;

export const VIEWPORT_GUTTER = 8;

export const SUBMENU_GAP = 8;

export const TRIGGER_GAP = 4;

export function getExportMenuPosition({
  triggerRight,
  triggerBottom,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight
}) {
  const width = menuWidth * MENU_SCALE;
  const footprintWidth = (menuWidth * 2 + SUBMENU_GAP) * MENU_SCALE;
  const latestLeft = Math.max(VIEWPORT_GUTTER, viewportWidth - footprintWidth - VIEWPORT_GUTTER);
  const latestTop = Math.max(
    VIEWPORT_GUTTER,
    viewportHeight - menuHeight * MENU_SCALE - VIEWPORT_GUTTER
  );
  return {
    left: Math.max(VIEWPORT_GUTTER, Math.min(triggerRight - width, latestLeft)),
    top: Math.max(VIEWPORT_GUTTER, Math.min(triggerBottom + TRIGGER_GAP, latestTop))
  };
}

export function useExportMenuLayout({
  open,
  activeDestination,
  anchorElement
}) {
  const triggerRef = reactExports.useRef(null);
  const canvasRowRef = reactExports.useRef(null);
  const localRowRef = reactExports.useRef(null);
  const [menu, setMenu] = reactExports.useState(null);
  const menuRef = reactExports.useCallback((element) => setMenu(element), []);
  const [position, setPosition] = reactExports.useState({ left: 0, top: 0 });
  const [localRowTop, setLocalRowTop] = reactExports.useState(0);
  reactExports.useLayoutEffect(() => {
    if (!open || !menu) return;
    try {
      menu.showPopover?.();
    } catch {
    }
    return () => {
      try {
        menu.hidePopover?.();
      } catch {
      }
    };
  }, [menu, open]);
  reactExports.useLayoutEffect(() => {
    const trigger = anchorElement ?? triggerRef.current;
    const ownerWindow = menu?.ownerDocument.defaultView;
    if (!open || !menu || !trigger || !ownerWindow) return;
    const measure = () => {
      const triggerBounds = trigger.getBoundingClientRect();
      const nextPosition = getExportMenuPosition({
        triggerRight: triggerBounds.right,
        triggerBottom: triggerBounds.bottom,
        menuWidth: menu.offsetWidth,
        menuHeight: menu.offsetHeight,
        viewportWidth: ownerWindow.innerWidth,
        viewportHeight: ownerWindow.innerHeight
      });
      setPosition(
        (previous) => previous.left === nextPosition.left && previous.top === nextPosition.top ? previous : nextPosition
      );
      const canvasRow = canvasRowRef.current;
      const localRow = localRowRef.current;
      setLocalRowTop(canvasRow && localRow ? localRow.offsetTop - canvasRow.offsetTop : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(menu);
    observer.observe(trigger);
    if (canvasRowRef.current) observer.observe(canvasRowRef.current);
    if (localRowRef.current) observer.observe(localRowRef.current);
    const focusRoot = menu.getRootNode();
    if (focusRoot instanceof ShadowRoot) observer.observe(focusRoot.host);
    ownerWindow.addEventListener("resize", measure);
    ownerWindow.addEventListener("scroll", measure, true);
    focusRoot.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      ownerWindow.removeEventListener("resize", measure);
      ownerWindow.removeEventListener("scroll", measure, true);
      focusRoot.removeEventListener("scroll", measure, true);
    };
  }, [anchorElement, menu, open]);
  const menuStyle = {
    position: "fixed",
    margin: 0,
    inset: "auto",
    left: position.left,
    top: position.top,
    transform: `scale(${MENU_SCALE})`,
    transformOrigin: "top left"
  };
  return {
    triggerRef,
    menuRef,
    canvasRowRef,
    localRowRef,
    menuStyle,
    presetTop: activeDestination === "local" ? localRowTop : 0
  };
}

export const CapCutIcon = ({ size = 24, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "svg",
  {
    ...props,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true",
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "path",
      {
        fillRule: "evenodd",
        transform: "translate(1.2 1.2) scale(.9)",
        d: "M24.189 6.442V2.671l-4.535 2.383V4.91c.002-1.505-1.078-2.411-2.638-2.411H2.64C.993 2.5 0 3.407 0 4.91V8.72L6.354 12 0 15.316v3.8C0 20.595 1 21.5 2.64 21.5h14.373c1.56 0 2.639-.907 2.639-2.382v-.197l4.536 2.409v-3.828L13.64 12 24.19 6.443zM9.982 13.873l7.797 4.083H2.157l7.825-4.083zm7.741-7.828l-7.742 4.057-7.825-4.057h15.567z"
      }
    )
  }
);
