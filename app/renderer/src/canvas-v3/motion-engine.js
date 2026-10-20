/**
 * 动效 / 字幕 / 粒子引擎（第 218 轮从 EditorInterface chunk 整段取回）。
 *
 * 参考：.probe/reference/4.0.0/asar/out/renderer/assets/EditorInterface-DwXc-S2S.js 774–1999
 * 共 31 个声明。这部分是**纯应用代码**（不含 three.js / lucide）。
 *
 * 顺序 = 参照求值顺序。
 */

export const DEFAULT_PARTICLE_CONFIG = {
  particleCount: 100,
  speed: 100,
  speedVariance: 50,
  gravity: 200,
  wind: { x: 0, y: 0, z: 0 },
  turbulence: 10,
  colors: ["#ffffff"],
  size: { min: 2, max: 8 },
  opacity: { start: 1, end: 0 },
  lifetime: { min: 0.5, max: 2 },
  emissionRate: 50,
  emissionShape: "point",
  emissionRadius: 10,
  rotationSpeed: 0,
  fadeIn: 0.1,
  fadeOut: 0.3,
  blendMode: "add"
};

export function getAvailableBlendModes() {
  return [
    "normal",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion"
  ];
}

export function getBlendModeName(mode) {
  const names = {
    normal: "Normal",
    multiply: "Multiply",
    screen: "Screen",
    overlay: "Overlay",
    darken: "Darken",
    lighten: "Lighten",
    "color-dodge": "Color Dodge",
    "color-burn": "Color Burn",
    "hard-light": "Hard Light",
    "soft-light": "Soft Light",
    difference: "Difference",
    exclusion: "Exclusion",
    hue: "Hue",
    saturation: "Saturation",
    color: "Color",
    luminosity: "Luminosity"
  };
  return names[mode] || mode;
}

export const SPEED_CURVE_PRESETS = [
  {
    id: "flash",
    name: "Flash",
    description: "Quick burst of speed in the middle",
    keyframes: [
      { time: 0, speed: 0.5, easing: "easeInQuad" },
      { time: 0.3, speed: 4, easing: "easeOutQuad" },
      { time: 0.7, speed: 4, easing: "easeInQuad" },
      { time: 1, speed: 0.5, easing: "linear" }
    ]
  },
  {
    id: "smooth-slow-mo",
    name: "Smooth Slow-Mo",
    description: "Gradual slow down and speed up",
    keyframes: [
      { time: 0, speed: 1, easing: "easeInOutCubic" },
      { time: 0.3, speed: 0.3, easing: "linear" },
      { time: 0.7, speed: 0.3, easing: "easeInOutCubic" },
      { time: 1, speed: 1, easing: "linear" }
    ]
  },
  {
    id: "jump-cut",
    name: "Jump Cut",
    description: "Alternating fast and normal speed",
    keyframes: [
      { time: 0, speed: 1, easing: "linear" },
      { time: 0.2, speed: 3, easing: "linear" },
      { time: 0.4, speed: 1, easing: "linear" },
      { time: 0.6, speed: 3, easing: "linear" },
      { time: 0.8, speed: 1, easing: "linear" },
      { time: 1, speed: 3, easing: "linear" }
    ]
  },
  {
    id: "montage",
    name: "Montage",
    description: "Gradual acceleration throughout",
    keyframes: [
      { time: 0, speed: 1, easing: "easeInQuart" },
      { time: 0.5, speed: 1.5, easing: "easeInQuart" },
      { time: 1, speed: 3, easing: "linear" }
    ]
  },
  {
    id: "hero-moment",
    name: "Hero Moment",
    description: "Dramatic slow-down at the peak",
    keyframes: [
      { time: 0, speed: 1.5, easing: "easeInCubic" },
      { time: 0.35, speed: 0.2, easing: "linear" },
      { time: 0.65, speed: 0.2, easing: "easeOutCubic" },
      { time: 1, speed: 1.5, easing: "linear" }
    ]
  },
  {
    id: "bullet-time",
    name: "Bullet Time",
    description: "Near freeze in the center",
    keyframes: [
      { time: 0, speed: 2, easing: "easeInExpo" },
      { time: 0.4, speed: 0.1, easing: "linear" },
      { time: 0.6, speed: 0.1, easing: "easeOutExpo" },
      { time: 1, speed: 2, easing: "linear" }
    ]
  }
];

export function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export class MotionTrackingEngine {
  trackingJobs = /* @__PURE__ */ new Map();
  trackingData = /* @__PURE__ */ new Map();
  attachments = /* @__PURE__ */ new Map();
  progressCallbacks = /* @__PURE__ */ new Set();
  lostCallbacks = /* @__PURE__ */ new Set();
  constructor() {
  }
  // Tracking Operations
  async startTracking(clipId, region, options = {}) {
    const jobId = generateId("track-job");
    const job = {
      id: jobId,
      clipId,
      region,
      status: "pending",
      progress: 0,
      options: {
        frameRate: options.frameRate ?? 30,
        startFrame: options.startFrame ?? 0,
        endFrame: options.endFrame ?? 300,
        algorithm: options.algorithm ?? "correlation",
        confidenceThreshold: options.confidenceThreshold ?? 0.7
      },
      startTime: Date.now()
    };
    this.trackingJobs.set(jobId, job);
    this.runTracking(job);
    return job;
  }
  async runTracking(job) {
    job.status = "running";
    this.trackingJobs.set(job.id, job);
    const { startFrame, endFrame, frameRate, confidenceThreshold } = job.options;
    const totalFrames = (endFrame ?? 300) - (startFrame ?? 0);
    const keyframes = [];
    const confidence = [];
    const lostFrames = [];
    for (let i = 0; i <= totalFrames; i++) {
      const currentJob = this.trackingJobs.get(job.id);
      if (!currentJob || currentJob.status === "cancelled") {
        return;
      }
      const frame = (startFrame ?? 0) + i;
      const trackingResult = this.simulateTracking(job.region, frame, i);
      keyframes.push({
        frame,
        position: trackingResult.position,
        scale: trackingResult.scale,
        rotation: trackingResult.rotation
      });
      confidence.push(trackingResult.confidence);
      if (trackingResult.confidence < (confidenceThreshold ?? 0.7)) {
        lostFrames.push(frame);
        this.notifyTrackingLost(frame);
      }
      job.progress = i / totalFrames * 100;
      this.trackingJobs.set(job.id, job);
      this.notifyProgress(job.progress);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const trackId = generateId("track");
    const trackingData = {
      trackId,
      clipId: job.clipId,
      keyframes,
      confidence,
      lostFrames,
      region: job.region,
      frameRate: frameRate ?? 30
    };
    this.trackingData.set(trackId, trackingData);
    job.status = "completed";
    job.progress = 100;
    job.endTime = Date.now();
    this.trackingJobs.set(job.id, job);
  }
  simulateTracking(region, _frame, index) {
    const baseX = region.x + region.width / 2;
    const baseY = region.y + region.height / 2;
    const motionX = Math.sin(index * 0.1) * 50;
    const motionY = Math.cos(index * 0.15) * 30;
    const noiseX = (Math.random() - 0.5) * 2;
    const noiseY = (Math.random() - 0.5) * 2;
    const confidence = index % 50 === 0 ? 0.5 : 0.85 + Math.random() * 0.15;
    return {
      position: {
        x: baseX + motionX + noiseX,
        y: baseY + motionY + noiseY
      },
      scale: 1 + Math.sin(index * 0.05) * 0.1,
      rotation: Math.sin(index * 0.02) * 0.1,
      confidence
    };
  }
  cancelTracking(jobId) {
    const job = this.trackingJobs.get(jobId);
    if (job && job.status === "running") {
      job.status = "cancelled";
      job.endTime = Date.now();
      this.trackingJobs.set(jobId, job);
    }
  }
  getTrackingJob(jobId) {
    return this.trackingJobs.get(jobId);
  }
  getTrackingData(clipId, trackId) {
    const data = this.trackingData.get(trackId);
    if (data && data.clipId === clipId) {
      return data;
    }
    return void 0;
  }
  getTrackingDataForClip(clipId) {
    return Array.from(this.trackingData.values()).filter(
      (d) => d.clipId === clipId
    );
  }
  // Tracking Application (Requirement 23.3)
  applyTrackingToElement(trackId, elementId, offset = { x: 0, y: 0 }) {
    const trackingData = this.trackingData.get(trackId);
    if (!trackingData) {
      throw new Error(`Tracking data not found: ${trackId}`);
    }
    const attachment = {
      elementId,
      trackId,
      offset,
      applyScale: true,
      applyRotation: true
    };
    this.attachments.set(elementId, attachment);
  }
  removeTrackingFromElement(elementId) {
    this.attachments.delete(elementId);
  }
  getAttachment(elementId) {
    return this.attachments.get(elementId);
  }
  getAttachmentsForTrack(trackId) {
    return Array.from(this.attachments.values()).filter(
      (a) => a.trackId === trackId
    );
  }
  getElementPositionAtTime(elementId, time) {
    const attachment = this.attachments.get(elementId);
    if (!attachment) {
      return null;
    }
    const trackingData = this.trackingData.get(attachment.trackId);
    if (!trackingData) {
      return null;
    }
    const frame = Math.floor(time * trackingData.frameRate);
    const trackedPosition = this.getTrackedPositionAtFrame(trackingData, frame);
    if (!trackedPosition) {
      return null;
    }
    return {
      x: trackedPosition.x + attachment.offset.x,
      y: trackedPosition.y + attachment.offset.y
    };
  }
  getTrackedPositionAtFrame(data, frame) {
    if (data.keyframes.length === 0) {
      return null;
    }
    let prevKeyframe = null;
    let nextKeyframe = null;
    for (const kf of data.keyframes) {
      if (kf.frame <= frame) {
        prevKeyframe = kf;
      } else if (!nextKeyframe) {
        nextKeyframe = kf;
        break;
      }
    }
    if (!prevKeyframe) {
      return data.keyframes[0].position;
    }
    if (!nextKeyframe || prevKeyframe.frame === frame) {
      return prevKeyframe.position;
    }
    const t = (frame - prevKeyframe.frame) / (nextKeyframe.frame - prevKeyframe.frame);
    return {
      x: prevKeyframe.position.x + (nextKeyframe.position.x - prevKeyframe.position.x) * t,
      y: prevKeyframe.position.y + (nextKeyframe.position.y - prevKeyframe.position.y) * t
    };
  }
  // Tracking Lost Notification (Requirement 23.4)
  onTrackingProgress(callback) {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }
  onTrackingLost(callback) {
    this.lostCallbacks.add(callback);
    return () => this.lostCallbacks.delete(callback);
  }
  notifyProgress(progress) {
    for (const callback of this.progressCallbacks) {
      callback(progress);
    }
  }
  notifyTrackingLost(frameIndex) {
    for (const callback of this.lostCallbacks) {
      callback(frameIndex);
    }
  }
  // Manual Correction (Requirement 23.4)
  correctTrackingPoint(trackId, frameIndex, position) {
    const data = this.trackingData.get(trackId);
    if (!data) {
      throw new Error(`Tracking data not found: ${trackId}`);
    }
    const keyframeIndex = data.keyframes.findIndex(
      (kf) => kf.frame === frameIndex
    );
    if (keyframeIndex >= 0) {
      data.keyframes[keyframeIndex].position = position;
      data.confidence[keyframeIndex] = 1;
      const lostIndex = data.lostFrames.indexOf(frameIndex);
      if (lostIndex >= 0) {
        data.lostFrames.splice(lostIndex, 1);
      }
    } else {
      const newKeyframe = {
        frame: frameIndex,
        position,
        scale: 1,
        rotation: 0
      };
      let insertIndex = data.keyframes.findIndex((kf) => kf.frame > frameIndex);
      if (insertIndex === -1) {
        insertIndex = data.keyframes.length;
      }
      data.keyframes.splice(insertIndex, 0, newKeyframe);
      data.confidence.splice(insertIndex, 0, 1);
    }
    this.trackingData.set(trackId, data);
  }
  // Offset Management (Requirement 23.5)
  setTrackingOffset(elementId, offset) {
    const attachment = this.attachments.get(elementId);
    if (attachment) {
      attachment.offset = offset;
      this.attachments.set(elementId, attachment);
    }
  }
  getTrackingOffset(elementId) {
    const attachment = this.attachments.get(elementId);
    return attachment?.offset ?? null;
  }
  setApplyScale(elementId, applyScale) {
    const attachment = this.attachments.get(elementId);
    if (attachment) {
      attachment.applyScale = applyScale;
      this.attachments.set(elementId, attachment);
    }
  }
  setApplyRotation(elementId, applyRotation) {
    const attachment = this.attachments.get(elementId);
    if (attachment) {
      attachment.applyRotation = applyRotation;
      this.attachments.set(elementId, attachment);
    }
  }
  deleteTrackingData(trackId) {
    for (const [elementId, attachment] of this.attachments) {
      if (attachment.trackId === trackId) {
        this.attachments.delete(elementId);
      }
    }
    this.trackingData.delete(trackId);
  }
  deleteTrackingDataForClip(clipId) {
    for (const [trackId, data] of this.trackingData) {
      if (data.clipId === clipId) {
        this.deleteTrackingData(trackId);
      }
    }
  }
  clear() {
    this.trackingJobs.clear();
    this.trackingData.clear();
    this.attachments.clear();
  }
  getTrackIds() {
    return Array.from(this.trackingData.keys());
  }
  hasTracking(elementId) {
    return this.attachments.has(elementId);
  }
}

export let motionTrackingEngineInstance = null;

export function getMotionTrackingEngine() {
  if (!motionTrackingEngineInstance) {
    motionTrackingEngineInstance = new MotionTrackingEngine();
  }
  return motionTrackingEngineInstance;
}

export function clamp$3(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function easeOutBounce(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export function renderNone(subtitle) {
  return {
    segments: [
      {
        text: subtitle.text,
        style: "normal",
        opacity: 1,
        scale: 1,
        offsetY: 0
      }
    ],
    visible: true
  };
}

export function renderWordHighlight(subtitle, currentTime) {
  if (!subtitle.words || subtitle.words.length === 0) {
    return renderNone(subtitle);
  }
  const highlightColor = subtitle.style?.highlightColor || "#ffff00";
  const upcomingColor = subtitle.style?.upcomingColor;
  const segments = subtitle.words.map((word) => {
    const isActive = currentTime >= word.startTime && currentTime < word.endTime;
    const isPast = currentTime >= word.endTime;
    const isUpcoming = currentTime < word.startTime;
    let color;
    if (isActive) {
      color = highlightColor;
    } else if (isUpcoming && upcomingColor) {
      color = upcomingColor;
    }
    return {
      text: word.text,
      style: isActive ? "highlighted" : isPast ? "normal" : "normal",
      opacity: 1,
      scale: isActive ? 1.15 : 1,
      offsetY: isActive ? -2 : 0,
      color
    };
  });
  return { segments, visible: true };
}

export function renderWordByWord(subtitle, currentTime) {
  if (!subtitle.words || subtitle.words.length === 0) {
    return renderNone(subtitle);
  }
  const activeWord = subtitle.words.find(
    (word) => currentTime >= word.startTime && currentTime < word.endTime
  );
  if (!activeWord) {
    const lastWord = subtitle.words[subtitle.words.length - 1];
    if (currentTime >= lastWord.endTime) {
      return {
        segments: [
          {
            text: lastWord.text,
            style: "normal",
            opacity: 1,
            scale: 1,
            offsetY: 0
          }
        ],
        visible: true
      };
    }
    return { segments: [], visible: false };
  }
  return {
    segments: [
      {
        text: activeWord.text,
        style: "active",
        opacity: 1,
        scale: 1,
        offsetY: 0
      }
    ],
    visible: true
  };
}

export function renderKaraoke(subtitle, currentTime) {
  if (!subtitle.words || subtitle.words.length === 0) {
    return renderNone(subtitle);
  }
  const highlightColor = subtitle.style?.highlightColor || "#ffff00";
  const upcomingColor = subtitle.style?.upcomingColor || "rgba(255, 255, 255, 0.5)";
  const segments = subtitle.words.map((word) => {
    const wordDuration = word.endTime - word.startTime;
    const elapsed = currentTime - word.startTime;
    const progress = clamp$3(elapsed / wordDuration, 0, 1);
    const isUpcoming = currentTime < word.startTime;
    const isActive = currentTime >= word.startTime && currentTime < word.endTime;
    const isComplete = currentTime >= word.endTime;
    let style = "normal";
    let color;
    if (isUpcoming) {
      style = "normal";
      color = upcomingColor;
    } else if (isComplete) {
      style = "highlighted";
      color = highlightColor;
    } else if (isActive) {
      style = "active";
      color = `linear-gradient(90deg, ${highlightColor} ${progress * 100}%, ${upcomingColor} ${progress * 100}%)`;
    }
    return {
      text: word.text,
      style,
      opacity: 1,
      scale: isActive ? 1.05 : 1,
      offsetY: 0,
      color
    };
  });
  return { segments, visible: true };
}

export function renderBounce(subtitle, currentTime) {
  if (!subtitle.words || subtitle.words.length === 0) {
    return renderNone(subtitle);
  }
  const animationDuration = 0.3;
  const segments = subtitle.words.map((word) => {
    const timeSinceStart = currentTime - word.startTime;
    const isVisible = currentTime >= word.startTime;
    if (!isVisible) {
      return {
        text: word.text,
        style: "hidden",
        opacity: 0,
        scale: 0,
        offsetY: 20
      };
    }
    const animProgress = clamp$3(timeSinceStart / animationDuration, 0, 1);
    const bounceProgress = easeOutBounce(animProgress);
    const isActive = currentTime >= word.startTime && currentTime < word.endTime;
    return {
      text: word.text,
      style: isActive ? "active" : "normal",
      opacity: bounceProgress,
      scale: 0.5 + bounceProgress * 0.5,
      offsetY: 20 * (1 - bounceProgress)
    };
  });
  return { segments, visible: true };
}

export function renderTypewriter(subtitle, currentTime) {
  if (!subtitle.words || subtitle.words.length === 0) {
    return renderNone(subtitle);
  }
  const visibleWords = subtitle.words.filter(
    (word) => currentTime >= word.startTime
  );
  if (visibleWords.length === 0) {
    return { segments: [], visible: false };
  }
  const segments = visibleWords.map((word, index) => {
    const isLast = index === visibleWords.length - 1;
    const timeSinceStart = currentTime - word.startTime;
    const fadeInDuration = 0.1;
    const opacity = isLast ? clamp$3(timeSinceStart / fadeInDuration, 0, 1) : 1;
    return {
      text: word.text,
      style: "normal",
      opacity,
      scale: 1,
      offsetY: 0
    };
  });
  return { segments, visible: true };
}

export function renderAnimatedCaption(subtitle, currentTime) {
  if (currentTime < subtitle.startTime || currentTime > subtitle.endTime) {
    return { segments: [], visible: false };
  }
  const animationStyle = subtitle.animationStyle || "none";
  switch (animationStyle) {
    case "word-highlight":
      return renderWordHighlight(subtitle, currentTime);
    case "word-by-word":
      return renderWordByWord(subtitle, currentTime);
    case "karaoke":
      return renderKaraoke(subtitle, currentTime);
    case "bounce":
      return renderBounce(subtitle, currentTime);
    case "typewriter":
      return renderTypewriter(subtitle, currentTime);
    case "none":
    default:
      return renderNone(subtitle);
  }
}

export const DEFAULT_BEAT_SYNC_CONFIG = {
  syncMode: "smart",
  beatSubdivision: 1,
  offsetMs: 0,
  snapToDownbeats: false
};


// ---- 第 218 轮：beat detection 的注入点 ----
// 真实现 `getBeatDetectionEngine` 在 ./index-Dr87oCf8.js（b9），那个 chunk 还没还原。
// 这里**不返回假数据**：没注入就抛错，行为显式失败而不是静默错误。
let __beatDetectionProvider;
export function setBeatDetectionProvider(fn) {
  __beatDetectionProvider = fn;
}
function requireBeatDetection() {
  if (!__beatDetectionProvider) {
    throw new Error("BEAT_DETECTION_UNAVAILABLE: index-Dr87oCf8.js 的 getBeatDetectionEngine 尚未还原");
  }
  return __beatDetectionProvider();
}

export class BeatSyncEngine {
  async analyzeBeats(audioBlob, onProgress) {
    onProgress?.({
      phase: "analyzing",
      percent: 20,
      message: "Analyzing audio for beats..."
    });
    const beatEngine = requireBeatDetection();
    const result = await beatEngine.analyzeFromBlob(audioBlob);
    onProgress?.({
      phase: "complete",
      percent: 100,
      message: `Detected ${result.bpm} BPM with ${result.beats.length} beats`
    });
    return result;
  }
  calculateSyncedTimings(clips, beatAnalysis, audioStartTime, config) {
    if (clips.length === 0 || beatAnalysis.beats.length === 0) {
      return [];
    }
    const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
    const beatTimes = this.getSubdividedBeats(beatAnalysis, config);
    const offsetSeconds = config.offsetMs / 1e3;
    const timings = [];
    if (beatTimes.length < 2) {
      return [];
    }
    const avgBeatInterval = (beatTimes[beatTimes.length - 1] - beatTimes[0]) / (beatTimes.length - 1);
    let currentBeatIndex = 0;
    for (const clip of sortedClips) {
      if (currentBeatIndex >= beatTimes.length) break;
      const beatTime = beatTimes[currentBeatIndex] + audioStartTime + offsetSeconds;
      switch (config.syncMode) {
        case "preserve-duration": {
          timings.push({
            clipId: clip.id,
            originalStartTime: clip.startTime,
            originalDuration: clip.duration,
            newStartTime: beatTime,
            newDuration: clip.duration
          });
          currentBeatIndex++;
          break;
        }
        case "one-per-beat": {
          const nextBeatIndex = Math.min(currentBeatIndex + 1, beatTimes.length - 1);
          const nextBeatTime = beatTimes[nextBeatIndex] + audioStartTime + offsetSeconds;
          const beatDuration = nextBeatTime - beatTime;
          timings.push({
            clipId: clip.id,
            originalStartTime: clip.startTime,
            originalDuration: clip.duration,
            newStartTime: beatTime,
            newDuration: Math.max(0.1, beatDuration)
          });
          currentBeatIndex++;
          break;
        }
        case "smart":
        default: {
          const beatsToSpan = Math.max(1, Math.round(clip.duration / avgBeatInterval));
          const endBeatIndex = Math.min(currentBeatIndex + beatsToSpan, beatTimes.length - 1);
          const endBeatTime = beatTimes[endBeatIndex] + audioStartTime + offsetSeconds;
          const newDuration = endBeatTime - beatTime;
          timings.push({
            clipId: clip.id,
            originalStartTime: clip.startTime,
            originalDuration: clip.duration,
            newStartTime: beatTime,
            newDuration: Math.max(0.1, newDuration)
          });
          currentBeatIndex = endBeatIndex;
          break;
        }
      }
    }
    return timings;
  }
  getSubdividedBeats(beatAnalysis, config) {
    const beats = config.snapToDownbeats ? beatAnalysis.beats.filter((_, i) => i % 4 === 0) : beatAnalysis.beats;
    if (config.beatSubdivision === 1) {
      return beats.map((b) => b.time);
    }
    const times = [];
    for (let i = 0; i < beats.length - 1; i++) {
      const beatDuration = beats[i + 1].time - beats[i].time;
      const subBeatDuration = beatDuration / config.beatSubdivision;
      for (let j = 0; j < config.beatSubdivision; j++) {
        times.push(beats[i].time + j * subBeatDuration);
      }
    }
    if (beats.length > 0) {
      times.push(beats[beats.length - 1].time);
    }
    return times;
  }
  snapClipToNearestBeat(clipStartTime, beatAnalysis, audioStartTime, maxSnapDistance = 0.2) {
    const relativeTime = clipStartTime - audioStartTime;
    let nearestBeat = beatAnalysis.beats[0];
    let minDistance = Math.abs(nearestBeat.time - relativeTime);
    for (const beat of beatAnalysis.beats) {
      const distance = Math.abs(beat.time - relativeTime);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBeat = beat;
      }
    }
    if (minDistance <= maxSnapDistance) {
      return nearestBeat.time + audioStartTime;
    }
    return clipStartTime;
  }
}

export let beatSyncEngineInstance = null;

export function getBeatSyncEngine() {
  if (!beatSyncEngineInstance) {
    beatSyncEngineInstance = new BeatSyncEngine();
  }
  return beatSyncEngineInstance;
}

export const SVG_ANIMATION_PRESETS = [
  {
    id: "none",
    name: "None",
    description: "No animation",
    category: "entrance",
    defaultDuration: 0,
    defaultEasing: "linear"
  },
  {
    id: "fade",
    name: "Fade",
    description: "Smooth fade in/out",
    category: "entrance",
    defaultDuration: 0.5,
    defaultEasing: "ease-out"
  },
  {
    id: "slide-left",
    name: "Slide from Right",
    description: "Slide in from the right side",
    category: "entrance",
    defaultDuration: 0.6,
    defaultEasing: "ease-out"
  },
  {
    id: "slide-right",
    name: "Slide from Left",
    description: "Slide in from the left side",
    category: "entrance",
    defaultDuration: 0.6,
    defaultEasing: "ease-out"
  },
  {
    id: "slide-up",
    name: "Slide from Bottom",
    description: "Slide in from below",
    category: "entrance",
    defaultDuration: 0.6,
    defaultEasing: "ease-out"
  },
  {
    id: "slide-down",
    name: "Slide from Top",
    description: "Slide in from above",
    category: "entrance",
    defaultDuration: 0.6,
    defaultEasing: "ease-out"
  },
  {
    id: "scale",
    name: "Scale",
    description: "Scale from zero to full size",
    category: "entrance",
    defaultDuration: 0.5,
    defaultEasing: "ease-out"
  },
  {
    id: "rotate",
    name: "Rotate",
    description: "Spin and fade in",
    category: "entrance",
    defaultDuration: 0.8,
    defaultEasing: "ease-out"
  },
  {
    id: "bounce",
    name: "Bounce",
    description: "Bouncy elastic effect",
    category: "entrance",
    defaultDuration: 0.8,
    defaultEasing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
  },
  {
    id: "pop",
    name: "Pop",
    description: "Quick pop with overshoot",
    category: "entrance",
    defaultDuration: 0.5,
    defaultEasing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
  },
  {
    id: "draw",
    name: "Draw",
    description: "SVG stroke drawing effect",
    category: "entrance",
    defaultDuration: 1.2,
    defaultEasing: "ease-in-out"
  },
  {
    id: "wipe-left",
    name: "Wipe Left",
    description: "Reveal from left edge",
    category: "entrance",
    defaultDuration: 0.7,
    defaultEasing: "ease-out"
  },
  {
    id: "wipe-right",
    name: "Wipe Right",
    description: "Reveal from right edge",
    category: "entrance",
    defaultDuration: 0.7,
    defaultEasing: "ease-out"
  },
  {
    id: "wipe-up",
    name: "Wipe Up",
    description: "Reveal from bottom",
    category: "entrance",
    defaultDuration: 0.7,
    defaultEasing: "ease-out"
  },
  {
    id: "wipe-down",
    name: "Wipe Down",
    description: "Reveal from top",
    category: "entrance",
    defaultDuration: 0.7,
    defaultEasing: "ease-out"
  },
  {
    id: "reveal-center",
    name: "Reveal Center",
    description: "Expand from center",
    category: "entrance",
    defaultDuration: 0.6,
    defaultEasing: "ease-out"
  },
  {
    id: "reveal-edges",
    name: "Reveal Edges",
    description: "Collapse to center",
    category: "entrance",
    defaultDuration: 0.6,
    defaultEasing: "ease-out"
  },
  {
    id: "elastic",
    name: "Elastic",
    description: "Elastic bounce effect",
    category: "entrance",
    defaultDuration: 1,
    defaultEasing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
  },
  {
    id: "flip-horizontal",
    name: "Flip Horizontal",
    description: "3D horizontal flip",
    category: "entrance",
    defaultDuration: 0.8,
    defaultEasing: "ease-out"
  },
  {
    id: "flip-vertical",
    name: "Flip Vertical",
    description: "3D vertical flip",
    category: "entrance",
    defaultDuration: 0.8,
    defaultEasing: "ease-out"
  }
];

export const CONFETTI_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6b9d", "#845ef7"];

export const FIRE_COLORS = ["#ff4500", "#ff6b00", "#ffb700", "#ffd700"];

export const SPARKLE_COLORS = ["#ffffff", "#fffacd", "#fff8dc", "#ffffe0"];

export const DUST_COLORS = ["#a0a0a0", "#808080", "#606060", "#404040"];

export const MAGIC_COLORS = ["#9b59b6", "#8e44ad", "#3498db", "#2980b9", "#e91e63"];

export const PARTICLE_PRESETS = [
  {
    id: "dissolve-soft",
    name: "Soft Dissolve",
    type: "dissolve",
    description: "Gentle dissolve effect with fading particles",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 200,
      speed: 30,
      speedVariance: 20,
      gravity: 10,
      colors: DUST_COLORS,
      size: { min: 2, max: 6 },
      opacity: { start: 0.8, end: 0 },
      lifetime: { min: 1, max: 3 },
      emissionRate: 100,
      fadeIn: 0.1,
      fadeOut: 0.5,
      blendMode: "normal"
    }
  },
  {
    id: "explode-burst",
    name: "Explosion Burst",
    type: "explode",
    description: "Dramatic explosion with fast-moving particles",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 300,
      speed: 400,
      speedVariance: 150,
      gravity: 300,
      colors: FIRE_COLORS,
      size: { min: 3, max: 12 },
      opacity: { start: 1, end: 0 },
      lifetime: { min: 0.5, max: 1.5 },
      emissionRate: 500,
      emissionShape: "circle",
      emissionRadius: 20,
      fadeOut: 0.4,
      blendMode: "add"
    }
  },
  {
    id: "implode-gather",
    name: "Implode Gather",
    type: "implode",
    description: "Particles gather toward the center",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 150,
      speed: 200,
      speedVariance: 50,
      gravity: 0,
      colors: MAGIC_COLORS,
      size: { min: 4, max: 10 },
      opacity: { start: 0, end: 1 },
      lifetime: { min: 0.8, max: 1.5 },
      emissionRate: 80,
      emissionShape: "circle",
      emissionRadius: 300,
      fadeIn: 0.3,
      fadeOut: 0.1,
      blendMode: "add"
    }
  },
  {
    id: "confetti-celebration",
    name: "Celebration Confetti",
    type: "confetti",
    description: "Colorful falling confetti for celebrations",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 200,
      speed: 150,
      speedVariance: 80,
      gravity: 200,
      wind: { x: 30, y: 0, z: 0 },
      turbulence: 50,
      colors: CONFETTI_COLORS,
      size: { min: 6, max: 14 },
      opacity: { start: 1, end: 0.8 },
      lifetime: { min: 2, max: 4 },
      emissionRate: 60,
      emissionShape: "rectangle",
      emissionRadius: 400,
      rotationSpeed: 5,
      fadeOut: 0.3,
      blendMode: "normal"
    }
  },
  {
    id: "dust-ambient",
    name: "Ambient Dust",
    type: "dust",
    description: "Subtle floating dust particles",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 80,
      speed: 15,
      speedVariance: 10,
      gravity: -5,
      turbulence: 20,
      colors: DUST_COLORS,
      size: { min: 1, max: 3 },
      opacity: { start: 0.4, end: 0.1 },
      lifetime: { min: 3, max: 8 },
      emissionRate: 10,
      emissionShape: "rectangle",
      emissionRadius: 500,
      fadeIn: 0.3,
      fadeOut: 0.5,
      blendMode: "normal"
    }
  },
  {
    id: "sparkle-magic",
    name: "Magic Sparkles",
    type: "sparkle",
    description: "Glittering sparkle effect",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 100,
      speed: 20,
      speedVariance: 15,
      gravity: 10,
      colors: SPARKLE_COLORS,
      size: { min: 2, max: 6 },
      opacity: { start: 1, end: 0 },
      lifetime: { min: 0.3, max: 0.8 },
      emissionRate: 80,
      emissionShape: "sphere",
      emissionRadius: 100,
      fadeIn: 0.1,
      fadeOut: 0.5,
      blendMode: "add"
    }
  },
  {
    id: "disintegrate-thanos",
    name: "Disintegration",
    type: "disintegrate",
    description: "Object breaks apart and fades away",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 400,
      speed: 60,
      speedVariance: 40,
      gravity: -30,
      wind: { x: 50, y: -20, z: 0 },
      turbulence: 30,
      colors: ["#a0a0a0", "#808080", "#606060"],
      size: { min: 2, max: 5 },
      opacity: { start: 1, end: 0 },
      lifetime: { min: 1, max: 2.5 },
      emissionRate: 200,
      emissionShape: "rectangle",
      emissionRadius: 200,
      fadeOut: 0.6,
      blendMode: "normal"
    }
  },
  {
    id: "pixelate-retro",
    name: "Pixel Break",
    type: "pixelate",
    description: "Breaks into pixel-like blocks",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 150,
      speed: 100,
      speedVariance: 50,
      gravity: 400,
      colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"],
      size: { min: 8, max: 16 },
      opacity: { start: 1, end: 0.5 },
      lifetime: { min: 0.5, max: 1.2 },
      emissionRate: 200,
      emissionShape: "rectangle",
      emissionRadius: 150,
      rotationSpeed: 3,
      fadeOut: 0.3,
      blendMode: "normal"
    }
  },
  {
    id: "shatter-glass",
    name: "Glass Shatter",
    type: "shatter",
    description: "Glass-breaking effect with sharp fragments",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 250,
      speed: 300,
      speedVariance: 150,
      gravity: 500,
      colors: ["#ffffff", "#e0e0e0", "#c0c0c0", "#a0a0a0"],
      size: { min: 3, max: 12 },
      opacity: { start: 0.9, end: 0.3 },
      lifetime: { min: 0.4, max: 1 },
      emissionRate: 400,
      emissionShape: "circle",
      emissionRadius: 50,
      rotationSpeed: 8,
      fadeOut: 0.4,
      blendMode: "normal"
    }
  },
  {
    id: "morph-transform",
    name: "Shape Morph",
    type: "morph",
    description: "Transform from one shape to another",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 200,
      speed: 50,
      speedVariance: 30,
      gravity: 0,
      colors: MAGIC_COLORS,
      size: { min: 4, max: 8 },
      opacity: { start: 0.8, end: 0.8 },
      lifetime: { min: 1, max: 2 },
      emissionRate: 100,
      emissionShape: "circle",
      emissionRadius: 150,
      fadeIn: 0.2,
      fadeOut: 0.2,
      blendMode: "add"
    }
  },
  {
    id: "fire-trail",
    name: "Fire Trail",
    type: "dust",
    description: "Fiery trailing particles",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 150,
      speed: 80,
      speedVariance: 40,
      gravity: -100,
      colors: FIRE_COLORS,
      size: { min: 4, max: 12 },
      opacity: { start: 0.9, end: 0 },
      lifetime: { min: 0.3, max: 0.8 },
      emissionRate: 120,
      emissionShape: "circle",
      emissionRadius: 20,
      fadeIn: 0.05,
      fadeOut: 0.6,
      blendMode: "add"
    }
  },
  {
    id: "snow-fall",
    name: "Snowfall",
    type: "dust",
    description: "Gentle falling snow",
    config: {
      ...DEFAULT_PARTICLE_CONFIG,
      particleCount: 100,
      speed: 30,
      speedVariance: 20,
      gravity: 50,
      wind: { x: 20, y: 0, z: 0 },
      turbulence: 30,
      colors: ["#ffffff", "#f0f0f0", "#e8e8e8"],
      size: { min: 2, max: 6 },
      opacity: { start: 0.8, end: 0.3 },
      lifetime: { min: 4, max: 8 },
      emissionRate: 20,
      emissionShape: "rectangle",
      emissionRadius: 600,
      rotationSpeed: 1,
      fadeIn: 0.2,
      fadeOut: 0.4,
      blendMode: "normal"
    }
  }
];

export function getParticlePresetById(id) {
  return PARTICLE_PRESETS.find((p) => p.id === id);
}

export function createEffectFromPreset(presetId, effectId, clipId, startTime, duration) {
  const preset = getParticlePresetById(presetId);
  if (!preset) return null;
  return {
    id: effectId,
    clipId,
    type: preset.type,
    startTime,
    duration,
    config: { ...preset.config },
    enabled: true
  };
}

export const STORAGE_KEY$1 = "video_editor_device_profile";
