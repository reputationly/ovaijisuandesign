import { STORAGE_KEY$1 } from "./motion-engine.js";

// ---- 第 219 轮：hub project 编解码的注入点 ----
// `toPersistedHubProject` / `restoreHubProjectMedia` 在 use-window-chrome chunk（未还原）。
// 不返回假数据：未注入就抛错。
let __hubProjectCodec;
export function setHubProjectCodec(codec) {
  __hubProjectCodec = codec;
}
function requireHubProjectCodec() {
  if (!__hubProjectCodec) {
    throw new Error("HUB_PROJECT_CODEC_UNAVAILABLE: toPersistedHubProject / restoreHubProjectMedia 尚未还原");
  }
  return __hubProjectCodec;
}

/**
 * 设备能力检测与导出时长估算（第 219 轮从 EditorInterface chunk 取回）。
 *
 * 参考：EditorInterface-DwXc-S2S.js 2001–2584 起，共 35 个声明。
 * 纯应用代码：CPU/内存/GPU 分级、平台与编解码检测、缓存基准、导出耗时估算。
 */

export function getCpuTier(cores) {
  if (cores >= 8) return "high";
  if (cores >= 4) return "mid";
  return "low";
}

export function getMemoryTier(gb) {
  if (gb >= 8) return "high";
  if (gb >= 4) return "mid";
  return "low";
}

export function getGpuTier(renderer) {
  const r = renderer.toLowerCase();
  const highEndPatterns = [
    "nvidia rtx",
    "nvidia geforce rtx",
    "radeon rx 6",
    "radeon rx 7",
    "apple m1 pro",
    "apple m1 max",
    "apple m2",
    "apple m3",
    "intel arc"
  ];
  const midEndPatterns = [
    "nvidia gtx 1",
    "nvidia geforce gtx",
    "radeon rx 5",
    "apple m1",
    "intel iris",
    "intel uhd"
  ];
  if (highEndPatterns.some((p) => r.includes(p))) return "high";
  if (midEndPatterns.some((p) => r.includes(p))) return "mid";
  return "low";
}

export function detectPlatform() {
  const ua = navigator.userAgent;
  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("CrOS")) os = "ChromeOS";
  let browser = "Unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return { os, browser, isMobile };
}

export function detectGpu() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      return { vendor: "Unknown", renderer: "Unknown", tier: "low" };
    }
    const debugInfo = gl.getExtension(
      "WEBGL_debug_renderer_info"
    );
    if (debugInfo) {
      const vendor = gl.getParameter(
        debugInfo.UNMASKED_VENDOR_WEBGL
      );
      const renderer = gl.getParameter(
        debugInfo.UNMASKED_RENDERER_WEBGL
      );
      return {
        vendor: vendor || "Unknown",
        renderer: renderer || "Unknown",
        tier: getGpuTier(renderer || "")
      };
    }
    return { vendor: "Unknown", renderer: "Unknown", tier: "mid" };
  } catch {
    return { vendor: "Unknown", renderer: "Unknown", tier: "low" };
  }
}

async function checkCodecSupport(codecString, width, height) {
  if (typeof VideoEncoder === "undefined") {
    return { hardware: false, supported: false };
  }
  try {
    const baseConfig = {
      codec: codecString,
      width,
      height,
      bitrate: 5e6,
      framerate: 30
    };
    const hwResult = await VideoEncoder.isConfigSupported({
      ...baseConfig,
      hardwareAcceleration: "prefer-hardware"
    });
    const swResult = await VideoEncoder.isConfigSupported({
      ...baseConfig,
      hardwareAcceleration: "prefer-software"
    });
    const isHardware = hwResult.supported === true && hwResult.config?.hardwareAcceleration === "prefer-hardware";
    return {
      hardware: isHardware,
      supported: hwResult.supported === true || swResult.supported === true,
      maxResolution: { width, height }
    };
  } catch {
    return { hardware: false, supported: false };
  }
}

async function detectEncodingSupport() {
  const codecs = {
    h264: "avc1.42001E",
    h265: "hvc1.1.6.L93.B0",
    vp9: "vp09.00.10.08",
    av1: "av01.0.04M.08"
  };
  const [h264, h265, vp9, av1] = await Promise.all([
    checkCodecSupport(codecs.h264, 1920, 1080),
    checkCodecSupport(codecs.h265, 1920, 1080),
    checkCodecSupport(codecs.vp9, 1920, 1080),
    checkCodecSupport(codecs.av1, 1920, 1080)
  ]);
  return { h264, h265, vp9, av1 };
}

export function calculateOverallTier(cpu, memory, gpu) {
  const tierValues = { low: 1, mid: 2, high: 3 };
  const avg = (tierValues[cpu.tier] + tierValues[memory.tier] + tierValues[gpu.tier] * 1.5) / 3.5;
  if (avg >= 2.5) return "high";
  if (avg >= 1.5) return "mid";
  return "low";
}

async function detectDeviceCapabilities() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const cpu = { cores, tier: getCpuTier(cores) };
  const memoryInfo = { gb: memory, tier: getMemoryTier(memory) };
  const gpuBase = detectGpu();
  const encoding = await detectEncodingSupport();
  const platform = detectPlatform();
  const hasHardwareEncoding = Object.values(encoding).some((e) => e.hardware);
  const gpu = { ...gpuBase, hasHardwareEncoding };
  const overallTier = calculateOverallTier(cpu, memoryInfo, gpu);
  const cached = loadCachedBenchmark();
  return {
    cpu,
    memory: memoryInfo,
    gpu,
    encoding,
    platform,
    overallTier,
    benchmark: cached
  };
}

export function getCodecRecommendations(profile, resolution) {
  const is4K = resolution.width * resolution.height > 1920 * 1080;
  const recommendations = [];
  if (profile.encoding.h264.supported) {
    const hasHw = profile.encoding.h264.hardware;
    recommendations.push({
      codec: "h264",
      label: "H.264 (MP4)",
      recommended: true,
      reason: hasHw ? "Hardware accelerated" : "Fast software encoding",
      speedRating: hasHw ? "fast" : "medium",
      qualityRating: "good"
    });
  }
  if (profile.encoding.h265.supported) {
    const hasHw = profile.encoding.h265.hardware;
    recommendations.push({
      codec: "h265",
      label: "H.265/HEVC (MP4)",
      recommended: hasHw && !is4K,
      reason: hasHw ? "Hardware accelerated, better compression" : "Better compression, slower encoding",
      speedRating: hasHw ? "medium" : "slow",
      qualityRating: "better"
    });
  }
  if (profile.encoding.vp9.supported) {
    recommendations.push({
      codec: "vp9",
      label: "VP9 (WebM)",
      recommended: false,
      reason: "Good for web, software encoding only",
      speedRating: "slow",
      qualityRating: "better"
    });
  }
  if (profile.encoding.av1.supported) {
    const hasHw = profile.encoding.av1.hardware;
    recommendations.push({
      codec: "av1",
      label: "AV1 (MP4/WebM)",
      recommended: hasHw && profile.overallTier === "high",
      reason: hasHw ? "Best compression, hardware accelerated" : "Best compression, very slow encoding",
      speedRating: hasHw ? "medium" : "very-slow",
      qualityRating: "best"
    });
  }
  return recommendations.sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    return 0;
  });
}

export function loadCachedBenchmark() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY$1);
    if (cached) {
      const data = JSON.parse(cached);
      const oneWeek = 7 * 24 * 60 * 60 * 1e3;
      if (data.benchmark && Date.now() - data.benchmark.testedAt < oneWeek) {
        return data.benchmark;
      }
    }
  } catch {
  }
  return void 0;
}

export function saveBenchmarkResult(result) {
  try {
    const existing = localStorage.getItem(STORAGE_KEY$1);
    const data = existing ? JSON.parse(existing) : {};
    data.benchmark = result;
    localStorage.setItem(STORAGE_KEY$1, JSON.stringify(data));
  } catch {
  }
}

export let cachedProfile = null;

export async function getDeviceProfile(forceRefresh = false) {
  if (!forceRefresh && cachedProfile) {
    return cachedProfile;
  }
  cachedProfile = await detectDeviceCapabilities();
  return cachedProfile;
}

export function formatDeviceSummary(profile) {
  const parts = [];
  if (profile.gpu.renderer !== "Unknown") {
    const gpuName = profile.gpu.renderer.replace(/ANGLE \(|, .*\)/g, "").replace(/Direct3D11 vs_\d+_\d+ ps_\d+_\d+/g, "").trim();
    parts.push(gpuName);
  }
  parts.push(`${profile.cpu.cores} cores`);
  return parts.join(" · ");
}

export const BASE_FPS_ESTIMATES = {
  h264: {
    hardware_high: 120,
    hardware_mid: 90,
    hardware_low: 60,
    software_high: 45,
    software_mid: 30,
    software_low: 15
  },
  h265: {
    hardware_high: 60,
    hardware_mid: 45,
    hardware_low: 30,
    software_high: 15,
    software_mid: 8,
    software_low: 4
  },
  vp9: {
    hardware_high: 30,
    hardware_mid: 20,
    hardware_low: 15,
    software_high: 20,
    software_mid: 12,
    software_low: 6
  },
  av1: {
    hardware_high: 45,
    hardware_mid: 30,
    hardware_low: 20,
    software_high: 8,
    software_mid: 4,
    software_low: 2
  }
};

export const RESOLUTION_MULTIPLIERS = {
  "1280x720": 1.5,
  "1920x1080": 1,
  "2560x1440": 0.6,
  "3840x2160": 0.25
};

export function getResolutionMultiplier(width, height) {
  const key = `${width}x${height}`;
  if (RESOLUTION_MULTIPLIERS[key]) {
    return RESOLUTION_MULTIPLIERS[key];
  }
  const pixels = width * height;
  const basePixels = 1920 * 1080;
  return basePixels / pixels;
}

export function getComplexityMultiplier(settings) {
  let multiplier = 1;
  if (settings.hasEffects) {
    multiplier *= 0.7;
  }
  if (settings.hasTransitions) {
    multiplier *= 0.85;
  }
  if (settings.trackCount && settings.trackCount > 2) {
    multiplier *= Math.max(0.5, 1 - (settings.trackCount - 2) * 0.1);
  }
  return multiplier;
}

export function formatTime$1(seconds) {
  if (seconds < 60) {
    return `~${Math.round(seconds)} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `~${minutes} minute${minutes > 1 ? "s" : ""}`;
    }
    return `~${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `~${hours}h ${remainingMinutes}m`;
}

export function estimateExportTime(profile, settings) {
  const totalFrames = Math.ceil(settings.duration * settings.frameRate);
  if (profile.benchmark) {
    const benchmarkResPixels = profile.benchmark.resolution.width * profile.benchmark.resolution.height;
    const targetResPixels = settings.width * settings.height;
    const resolutionFactor = benchmarkResPixels / targetResPixels;
    let codecFactor = 1;
    if (profile.benchmark.codec !== settings.codec) {
      const codecSpeeds = {
        h264: 1,
        h265: 0.4,
        vp9: 0.5,
        av1: 0.2
      };
      codecFactor = (codecSpeeds[profile.benchmark.codec] || 1) / (codecSpeeds[settings.codec] || 1);
    }
    const adjustedFps = profile.benchmark.framesPerSecond * resolutionFactor * codecFactor * getComplexityMultiplier(settings);
    const seconds2 = totalFrames / Math.max(1, adjustedFps);
    return {
      seconds: seconds2,
      formatted: formatTime$1(seconds2),
      confidence: "measured",
      breakdown: {
        rendering: seconds2 * 0.4,
        encoding: seconds2 * 0.55,
        muxing: seconds2 * 0.05
      }
    };
  }
  const codecSupport = profile.encoding[settings.codec];
  const isHardware = codecSupport?.hardware || false;
  const tier = profile.overallTier;
  const encodingType = isHardware ? "hardware" : "software";
  const key = `${encodingType}_${tier}`;
  const baseFps = BASE_FPS_ESTIMATES[settings.codec]?.[key] || 15;
  const resolutionMultiplier = getResolutionMultiplier(
    settings.width,
    settings.height
  );
  const complexityMultiplier = getComplexityMultiplier(settings);
  const estimatedFps = baseFps * resolutionMultiplier * complexityMultiplier;
  const seconds = totalFrames / Math.max(1, estimatedFps);
  return {
    seconds,
    formatted: formatTime$1(seconds),
    confidence: "estimated",
    breakdown: {
      rendering: seconds * 0.4,
      encoding: seconds * 0.55,
      muxing: seconds * 0.05
    }
  };
}

export async function runBenchmark(onProgress) {
  const BENCHMARK_FRAMES = 60;
  const WIDTH = 1920;
  const HEIGHT = 1080;
  onProgress?.({
    phase: "preparing",
    progress: 0,
    framesProcessed: 0,
    totalFrames: BENCHMARK_FRAMES
  });
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create canvas context for benchmark");
  }
  const frames = [];
  for (let i = 0; i < BENCHMARK_FRAMES; i++) {
    ctx.fillStyle = `hsl(${i * 6 % 360}, 70%, 50%)`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "white";
    ctx.font = "48px sans-serif";
    ctx.fillText(`Frame ${i + 1}`, WIDTH / 2 - 80, HEIGHT / 2);
    const bitmap = await createImageBitmap(canvas);
    frames.push(bitmap);
    onProgress?.({
      phase: "rendering",
      progress: (i + 1) / BENCHMARK_FRAMES * 0.3,
      framesProcessed: i + 1,
      totalFrames: BENCHMARK_FRAMES
    });
  }
  if (typeof VideoEncoder === "undefined") {
    frames.forEach((f) => f.close());
    throw new Error("VideoEncoder not supported");
  }
  let encodedCount = 0;
  const encoder = new VideoEncoder({
    output: (chunk) => {
      encodedCount++;
      onProgress?.({
        phase: "encoding",
        progress: 0.3 + encodedCount / BENCHMARK_FRAMES * 0.65,
        framesProcessed: encodedCount,
        totalFrames: BENCHMARK_FRAMES
      });
    },
    error: (e) => {
      console.error("Benchmark encoder error:", e);
    }
  });
  const config = {
    codec: "avc1.42001E",
    width: WIDTH,
    height: HEIGHT,
    bitrate: 5e6,
    framerate: 30,
    hardwareAcceleration: "prefer-hardware"
  };
  const supported = await VideoEncoder.isConfigSupported(config);
  if (!supported.supported) {
    config.hardwareAcceleration = "prefer-software";
  }
  encoder.configure(config);
  const startTime = performance.now();
  for (let i = 0; i < frames.length; i++) {
    const frame = new VideoFrame(frames[i], {
      timestamp: i * (1e6 / 30),
      duration: 1e6 / 30
    });
    encoder.encode(frame, { keyFrame: i % 30 === 0 });
    frame.close();
  }
  await encoder.flush();
  encoder.close();
  const endTime = performance.now();
  const elapsedSeconds = (endTime - startTime) / 1e3;
  const framesPerSecond = BENCHMARK_FRAMES / elapsedSeconds;
  frames.forEach((f) => f.close());
  onProgress?.({
    phase: "complete",
    progress: 1,
    framesProcessed: BENCHMARK_FRAMES,
    totalFrames: BENCHMARK_FRAMES
  });
  const result = {
    framesPerSecond,
    codec: "h264",
    resolution: { width: WIDTH, height: HEIGHT },
    testedAt: Date.now()
  };
  saveBenchmarkResult(result);
  return result;
}

export function shouldRecommendBenchmark(profile) {
  if (!profile.benchmark) {
    return true;
  }
  const oneWeek = 7 * 24 * 60 * 60 * 1e3;
  if (Date.now() - profile.benchmark.testedAt > oneWeek) {
    return true;
  }
  return false;
}

export function captureExportProject(live) {
  const saved = structuredClone(requireHubProjectCodec().toPersisted(live).project);
  return hydrateExportProject(saved, live);
}

async function hydrateExportProject(saved, live) {
  const runtime = new Map(live.mediaLibrary.items.map((item) => [item.id, item]));
  const referenced = new Set(
    saved.timeline.tracks.flatMap((track) => track.clips.map((clip) => clip.mediaId))
  );
  const missing = saved.mediaLibrary.items.filter((item) => {
    if (!referenced.has(item.id) || item.isPlaceholder) return false;
    const current = runtime.get(item.id);
    return !current || current.assetId !== item.assetId || current.isPlaceholder || !current.blob && !current.fileHandle && !current.originalUrl;
  });
  const restored = missing.length ? await requireHubProjectCodec().restore({ ...saved, mediaLibrary: { items: missing } }) : void 0;
  const recovered = new Map(restored?.mediaLibrary.items.map((item) => [item.id, item]));
  return {
    ...saved,
    mediaLibrary: {
      ...saved.mediaLibrary,
      items: saved.mediaLibrary.items.map((item) => {
        if (!referenced.has(item.id) || item.isPlaceholder) return item;
        const current = recovered.get(item.id) ?? runtime.get(item.id);
        if (!current || current.assetId !== item.assetId || current.isPlaceholder || !current.blob && !current.fileHandle && !current.originalUrl)
          throw new Error("CLIP_STUDIO_EXPORT_MEDIA_UNAVAILABLE");
        return {
          ...item,
          blob: current.blob,
          fileHandle: current.fileHandle,
          originalUrl: current.originalUrl,
          thumbnailUrl: current.thumbnailUrl,
          waveformData: current.waveformData,
          filmstripThumbnails: current.filmstripThumbnails,
          isPlaceholder: current.isPlaceholder
        };
      })
    }
  };
}

export const JIANYING_FLAVOR_SPECS = {
  jianying: {
    flavor: "jianying",
    appId: 3704,
    appSource: "lv",
    appVersion: "5.0.0",
    displayName: "剪映 (JianyingPro)"
  },
  capcut: {
    flavor: "capcut",
    appId: 359289,
    appSource: "cc",
    appVersion: "8.5.0",
    displayName: "CapCut"
  }
};

export const MICROS_PER_SEC = 1e6;

export const DRAFT_META_NEW_VERSION = "110.0.0";

export function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  let out = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += "-";
    } else if (i === 14) {
      out += "4";
    } else if (i === 19) {
      out += ((Math.floor(Math.random() * 4) | 8) & 15).toString(16);
    } else {
      out += hex();
    }
  }
  return out;
}

export function secToMicros(sec) {
  return Math.max(0, Math.round(sec * MICROS_PER_SEC));
}

export function clampSpeed(s) {
  if (!Number.isFinite(s) || s == null || s <= 0) return 1;
  return Math.max(0.1, Math.min(100, s));
}

export function deriveRatio(w, h) {
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const g = gcd(w, h);
  const rw = w / g;
  const rh = h / g;
  const ratio = `${rw}:${rh}`;
  if (["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(ratio)) return ratio;
  return ratio;
}

export function hexToRgbFloat(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return [1, 1, 1];
  return [
    parseInt(m[1], 16) / 255,
    parseInt(m[2], 16) / 255,
    parseInt(m[3], 16) / 255
  ];
}

export function pxToJianyingFontSize(fontSizePx) {
  return Math.max(0.1, fontSizePx / 3);
}

export function buildTextContent(text, color, fontSize) {
  const content = {
    text,
    styles: [
      {
        fill: {
          alpha: 1,
          content: {
            render_type: "solid",
            solid: { color: hexToRgbFloat(color ?? "#FFFFFF") }
          }
        },
        font: { id: "", path: "" },
        range: [0, text.length],
        size: fontSize ?? 32
      }
    ]
  };
  return JSON.stringify(content);
}
