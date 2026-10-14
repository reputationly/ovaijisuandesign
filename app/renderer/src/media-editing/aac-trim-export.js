import {
  AdtsInputFormat,
  AdtsOutputFormat,
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  FlacInputFormat,
  FlacOutputFormat,
  Input,
  IsobmffInputFormat,
  MatroskaInputFormat,
  MkvOutputFormat,
  MovOutputFormat,
  Mp3InputFormat,
  Mp3OutputFormat,
  Mp4OutputFormat,
  OggInputFormat,
  OggOutputFormat,
  Output,
  QuickTimeInputFormat,
  WaveInputFormat,
  WavOutputFormat,
  WebMInputFormat,
  WebMOutputFormat,
} from "mediabunny";

const AAC_AUDIO_BITRATE = 128e3;

function getCropAudioOptions(sourceCodec) {
  if (sourceCodec === "aac") {
    return {
      codec: "aac",
      bitrate: AAC_AUDIO_BITRATE,
      forceTranscode: true,
    };
  }
  return {
    forceTranscode: true,
  };
}

function getFormatKey(inputFormat) {
  if (inputFormat instanceof QuickTimeInputFormat) return "mov";
  if (inputFormat instanceof IsobmffInputFormat) return "mp4";
  if (inputFormat instanceof WebMInputFormat) return "webm";
  if (inputFormat instanceof MatroskaInputFormat) return "mkv";
  if (inputFormat instanceof Mp3InputFormat) return "mp3";
  if (inputFormat instanceof AdtsInputFormat) return "aac";
  if (inputFormat instanceof FlacInputFormat) return "flac";
  if (inputFormat instanceof OggInputFormat) return "ogg";
  if (inputFormat instanceof WaveInputFormat) return "wav";
  return "mp4";
}

function getOutputFormat(inputFormat) {
  if (inputFormat instanceof Mp3InputFormat) {
    return new Mp3OutputFormat();
  }
  if (inputFormat instanceof AdtsInputFormat) {
    return new AdtsOutputFormat();
  }
  if (inputFormat instanceof FlacInputFormat) {
    return new FlacOutputFormat();
  }
  if (inputFormat instanceof OggInputFormat) {
    return new OggOutputFormat();
  }
  if (inputFormat instanceof WaveInputFormat) {
    return new WavOutputFormat();
  }
  if (inputFormat instanceof WebMInputFormat) {
    return new WebMOutputFormat();
  }
  if (inputFormat instanceof MatroskaInputFormat) {
    return new MkvOutputFormat();
  }
  if (inputFormat instanceof QuickTimeInputFormat) {
    return new MovOutputFormat({
      fastStart: "in-memory",
    });
  }
  if (inputFormat instanceof IsobmffInputFormat) {
    return new Mp4OutputFormat({
      fastStart: "in-memory",
    });
  }
  return new Mp4OutputFormat({
    fastStart: "in-memory",
  });
}

async function exportCroppedAudio(file, startTime, endTime, options) {
  const { onProgress } = options ?? {};
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });
  try {
    const inputFormat = await input.getFormat();
    const outputFormat = getOutputFormat(inputFormat);
    const target = new BufferTarget();
    const output = new Output({
      format: outputFormat,
      target,
    });
    const audioTrack = await input.getPrimaryAudioTrack();
    const sourceAudioCodec = audioTrack ? await audioTrack.getCodec() : null;
    const requireAacOutput = sourceAudioCodec === "aac";
    const conversion = await Conversion.init({
      input,
      output,
      trim: {
        start: startTime,
        end: endTime,
      },
      audio: getCropAudioOptions(sourceAudioCodec),
      showWarnings: false,
    });
    if (!conversion.isValid) {
      if (requireAacOutput) {
        throw new Error("无法以 AAC 编码导出裁剪后的音频");
      }
      console.warn("部分轨道在转换中被丢弃，继续导出可用轨道");
    }
    if (onProgress) {
      conversion.onProgress = onProgress;
    }
    await conversion.execute();
    const mimeType = outputFormat.mimeType;
    return new Blob([target.buffer], {
      type: mimeType,
    });
  } finally {
    input.dispose();
  }
}

export async function exportCroppedVideo(file, startTime, endTime, options) {
  if (file.type.startsWith("audio/")) {
    return exportCroppedAudio(file, startTime, endTime, options);
  }
  const { onProgress, targetWidth, targetHeight, maxBitrate } = options ?? {};
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });
  try {
    const inputFormat = await input.getFormat();
    const outputFormat = getOutputFormat(inputFormat);
    const target = new BufferTarget();
    const output = new Output({
      format: outputFormat,
      target,
    });
    const videoOpts = {};
    if (targetWidth) videoOpts.width = targetWidth;
    if (targetHeight) videoOpts.height = targetHeight;
    const videoTrack = await input.getPrimaryVideoTrack();
    if (maxBitrate) {
      const limit = maxBitrate[getFormatKey(inputFormat)];
      if (limit && videoTrack) {
        const stats = await videoTrack.computePacketStats();
        const isReencoding = !!(videoOpts.width || videoOpts.height);
        if (stats.averageBitrate > limit) {
          videoOpts.bitrate = Math.round(limit);
        } else if (isReencoding) {
          videoOpts.bitrate = Math.round(stats.averageBitrate);
        }
      }
    }
    if (videoTrack && Object.keys(videoOpts).length === 0) {
      videoOpts.width = videoTrack.displayWidth;
      videoOpts.height = videoTrack.displayHeight;
      videoOpts.fit = "fill";
    }
    const audioTrack = await input.getPrimaryAudioTrack();
    const sourceAudioCodec = audioTrack ? await audioTrack.getCodec() : null;
    const requireAacOutput = sourceAudioCodec === "aac";
    const conversion = await Conversion.init({
      input,
      output,
      trim: {
        start: startTime,
        end: endTime,
      },
      ...(Object.keys(videoOpts).length > 0
        ? {
            video: videoOpts,
          }
        : {}),
      // 强制音频重编码，确保裁剪帧精确、不超过设定时长
      ...(audioTrack
        ? {
            audio: getCropAudioOptions(sourceAudioCodec),
          }
        : {}),
      showWarnings: false,
    });
    if (!conversion.isValid) {
      if (requireAacOutput) {
        throw new Error("无法以 AAC 编码导出裁剪后的音频");
      }
      console.warn("部分轨道在转换中被丢弃，继续导出可用轨道");
    }
    if (onProgress) {
      conversion.onProgress = onProgress;
    }
    await conversion.execute();
    const mimeType = outputFormat.mimeType;
    return new Blob([target.buffer], {
      type: mimeType,
    });
  } finally {
    input.dispose();
  }
}
