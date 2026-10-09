// hls-segmented-input.js
import { SegmentedInput, wait$1, __addDisposableResource, Reader, assert$3, readAllLines, canIgnoreLine, __disposeResources, last$1, AES_128_BLOCK_SIZE, toDataView, joinPaths$1, TAG_EXTINF, TAG_MAP, AttributeList, TAG_KEY, IV_STRING_REGEX, BASE64_DATA_URI_REGEX, base64ToBytes, parsePsshBoxContents, TAG_MEDIA_SEQUENCE, TAG_BYTERANGE, TAG_PROGRAM_DATE_TIME, TAG_DISCONTINUITY, TAG_TARGETDURATION, TAG_ENDLIST, TAG_PLAYLIST_TYPE, binarySearchLessOrEqual, psshBoxesAreEqual, CustomPathedSource, createAes128CbcDecryptStream, readBytes, ReadableStreamSource, arrayArgmin, Demuxer, PathedSource, TAG_STREAM_INF, TAG_I_FRAME_STREAM_INF, TAG_MEDIA, TAG_I_FRAMES_ONLY, VIDEO_CODECS, inferCodecFromCodecString, AUDIO_CODECS, UNDETERMINED_LANGUAGE, getMediaTagDefault, getMediaTagAutoselect, preprocessLanguageCode, HlsInputVideoTrackBacking, HlsInputAudioTrackBacking, HLS_MIME_TYPE, InputFormat, readAscii, MP4, QTFF, MATROSKA, WEBM, WAVE, OGG, FLAC, MP3, ADTS, MPEG_TS, EventEmitter$2, Source, SourceRef, validateInputFormatOptions, sourceRequestsAreEqual, arrayCount, removeItem, UnsupportedInputFormatError, toValidatedInputTrackQuery, queryInputTracks, mergeInputTrackQueries, prefer, desc, InputVideoTrack, InputAudioTrack, TrackSynchronizer, Output, validateVideoOptions, validateAudioOptions, validateMetadataTags, promiseWithResolvers, assertNever, ConversionCanceledError, normalizeRotation, clampCropRectangle, ceilToMultipleOfTwo, EncodedVideoPacketSource, EncodedPacketSink, QUALITY_HIGH, getFirstEncodableVideoCodec, VideoSampleSource, Mp4OutputFormat, NullTarget, VideoSampleSink, CanvasSink, VideoSample, floorToDivisor, OutputTrackGroup, isIso639Dash2LanguageCode, EncodedAudioPacketSource, getEncodableAudioCodecs, NON_PCM_AUDIO_CODECS, FALLBACK_NUMBER_OF_CHANNELS, FALLBACK_SAMPLE_RATE, AudioSampleSource, AudioSampleSink, toInterleavedAudioFormat, audioSampleToInterleavedFormat, AudioSample, AudioResampler, clamp$9 } from "../../vendor.js";
import { ENCRYPTION_KEY_CACHE_GROUP, DEFAULT_SOURCE_CACHE_GROUP } from "../../canvas/separator.jsx";
class HlsSegmentedInput extends SegmentedInput {
  constructor(demuxer, path2, trackDeclarations, lines) {
    super(demuxer.input, path2, trackDeclarations);
    this.segments = [];
    this.nextLines = null;
    this.currentUpdateSegmentsPromise = null;
    this.streamHasEnded = false;
    this.lastSegmentUpdateTime = -Infinity;
    this.refreshInterval = 5;
    this.demuxer = demuxer;
    this.nextLines = lines;
  }
  runUpdateSegments() {
    return (this.currentUpdateSegmentsPromise ??= (async () => {
      try {
        const remainingWaitTimeMs = this.getRemainingWaitTimeMs();
        if (remainingWaitTimeMs > 0) {
          await wait$1(remainingWaitTimeMs);
        }
        this.lastSegmentUpdateTime = performance.now();
        await this.updateSegments();
      } finally {
        this.currentUpdateSegmentsPromise = null;
      }
    })());
  }
  getRemainingWaitTimeMs() {
    const elapsed = performance.now() - this.lastSegmentUpdateTime;
    const result = Math.max(0, 1e3 * this.refreshInterval - elapsed);
    if (result <= 50) {
      return 0;
    }
    return result;
  }
  /**
   * Reads and parses the segment info from the playlist file. When called more than one, it updates the existing
   * segments by appending the new ones. Existing segments are never removed.
   */
  async updateSegments() {
    let lines = this.nextLines;
    this.nextLines = null;
    if (!lines) {
      const env_1 = {
        stack: [],
        error: void 0,
        hasError: false,
      };
      try {
        const ref = __addDisposableResource(
          env_1,
          await this.demuxer.input._getSourceUncached({
            path: this.path,
            isRoot: false,
          }),
          false,
        );
        const reader = new Reader(ref.source);
        const slice2 = await reader.requestEntireFile();
        assert$3(slice2);
        lines = readAllLines(slice2, slice2.length, {
          ignore: canIgnoreLine,
        });
      } catch (e_1) {
        env_1.error = e_1;
        env_1.hasError = true;
      } finally {
        __disposeResources(env_1);
      }
    }
    let headerRead = false;
    let accumulatedTime = 0;
    let nextSegmentDuration = null;
    let currentKey = null;
    let nextSequenceNumber = 0;
    let currentFirstSegment = null;
    let currentInitSegment = null;
    let lastByteRangeEnd = null;
    let nextByteRange = null;
    let lastProgramDateTimeSeconds = null;
    let targetDuration = null;
    let segmentSeen = false;
    let prevLastSegment = last$1(this.segments) ?? null;
    const parseByteRange = (content2) => {
      const atIndex = content2.indexOf("@");
      const length2 = Number(atIndex === -1 ? content2 : content2.slice(0, atIndex));
      if (!Number.isInteger(length2) || length2 < 0) {
        throw new Error(`Invalid #EXT-X-BYTERANGE length '${content2}'.`);
      }
      let offset2 = null;
      if (atIndex !== -1) {
        offset2 = Number(content2.slice(atIndex + 1));
        if (!Number.isInteger(offset2) || offset2 < 0) {
          throw new Error(`Invalid #EXT-X-BYTERANGE offset '${content2}'.`);
        }
      }
      return {
        length: length2,
        offset: offset2,
      };
    };
    const setNextSequenceNumber = (number2) => {
      nextSequenceNumber = number2;
      if (prevLastSegment) {
        assert$3(prevLastSegment.sequenceNumber !== null);
        if (prevLastSegment.sequenceNumber < number2) {
          accumulatedTime = prevLastSegment.timestamp + prevLastSegment.duration;
          currentFirstSegment = prevLastSegment.firstSegment;
          currentInitSegment = prevLastSegment.initSegment;
          lastProgramDateTimeSeconds = prevLastSegment.lastProgramDateTimeSeconds;
          prevLastSegment = null;
        }
      }
    };
    for (let i2 = 0; i2 < lines.length; i2++) {
      const line = lines[i2];
      if (!headerRead) {
        if (line !== "#EXTM3U") {
          throw new Error("Invalid M3U8 file; expected first line to be #EXTM3U.");
        }
        headerRead = true;
        continue;
      }
      if (!line.startsWith("#")) {
        if (!prevLastSegment) {
          if (nextSegmentDuration === null) {
            throw new Error("Invalid M3U8 file; a segment must be preceded by an #EXTINF tag.");
          }
          let key2 = currentKey;
          if (key2 && key2.method === "AES-128" && !key2.iv) {
            const iv = new Uint8Array(AES_128_BLOCK_SIZE);
            const view2 = toDataView(iv);
            view2.setUint32(8, Math.floor(nextSequenceNumber / 2 ** 32));
            view2.setUint32(12, nextSequenceNumber);
            key2 = {
              ...key2,
              iv,
            };
          }
          const fullPath = joinPaths$1(this.path, line);
          const location2 = {
            path: fullPath,
            offset: nextByteRange?.offset ?? 0,
            length: nextByteRange?.length ?? null,
          };
          const segment = {
            timestamp: accumulatedTime,
            relativeToUnixEpoch: lastProgramDateTimeSeconds !== null,
            firstSegment: currentFirstSegment,
            sequenceNumber: nextSequenceNumber,
            location: location2,
            duration: nextSegmentDuration,
            encryption: key2,
            initSegment: currentInitSegment,
            lastProgramDateTimeSeconds,
          };
          currentFirstSegment ??= segment;
          accumulatedTime += nextSegmentDuration;
          this.segments.push(segment);
        }
        nextSegmentDuration = null;
        if (nextByteRange === null) {
          lastByteRangeEnd = null;
        } else {
          nextByteRange = null;
        }
        setNextSequenceNumber(nextSequenceNumber + 1);
      }
      if (line.startsWith(TAG_EXTINF)) {
        if (prevLastSegment) {
          segmentSeen = true;
          continue;
        }
        if (!segmentSeen) {
          if (
            lastProgramDateTimeSeconds === null &&
            nextSequenceNumber > 0 &&
            targetDuration !== null
          ) {
            accumulatedTime = nextSequenceNumber * targetDuration;
          }
          segmentSeen = true;
        }
        const extinfContent = line.slice(TAG_EXTINF.length);
        const commaIndex = extinfContent.indexOf(",");
        const durationStr = commaIndex === -1 ? extinfContent : extinfContent.slice(0, commaIndex);
        const duration = Number(durationStr);
        if (!Number.isFinite(duration) || duration < 0) {
          throw new Error(`Invalid #EXTINF tag duration '${durationStr}'.`);
        }
        nextSegmentDuration = duration;
      } else if (line.startsWith(TAG_MAP)) {
        const attributes = new AttributeList(line.slice(TAG_MAP.length));
        const uri = attributes.get("uri");
        if (!uri) {
          throw new Error("Invalid #EXT-X-MAP tag; missing URI attribute.");
        }
        const byteRange = attributes.get("byterange");
        let parsedByteRange = null;
        if (byteRange !== null) {
          parsedByteRange = parseByteRange(byteRange);
        }
        if (parsedByteRange && parsedByteRange.offset === null) {
          throw new Error(
            "Invalid #EXT-X-MAP tag; BYTERANGE attribute must have a specified offset.",
          );
        }
        if (!prevLastSegment) {
          const fullPath = joinPaths$1(this.path, uri);
          const location2 = {
            path: fullPath,
            offset: parsedByteRange?.offset ?? 0,
            length: parsedByteRange?.length ?? null,
          };
          if (currentKey?.method === "AES-128" && !currentKey.iv) {
            throw new Error(
              "IV attribute must be set on #EXT-X-KEY tag preceding the #EXT-X-MAP tag.",
            );
          }
          const segment = {
            timestamp: accumulatedTime,
            relativeToUnixEpoch: lastProgramDateTimeSeconds !== null,
            firstSegment: null,
            sequenceNumber: null,
            location: location2,
            duration: 0,
            encryption: currentKey,
            initSegment: null,
            lastProgramDateTimeSeconds,
          };
          currentInitSegment = segment;
        }
        nextSegmentDuration = null;
        if (nextByteRange === null) {
          lastByteRangeEnd = null;
        } else {
          nextByteRange = null;
        }
      } else if (line.startsWith(TAG_KEY)) {
        const attributes = new AttributeList(line.slice(TAG_KEY.length));
        const method = attributes.get("method");
        if (method === "NONE") {
          currentKey = null;
        } else if (method === "AES-128") {
          const uri = attributes.get("uri");
          if (!uri) {
            throw new Error("Invalid #EXT-X-KEY: AES-128 requires a URI attribute.");
          }
          let iv = null;
          const ivString = attributes.get("iv");
          if (ivString) {
            if (!IV_STRING_REGEX.test(ivString)) {
              throw new Error(`Unsupported IV format '${ivString}'.`);
            }
            let hex2 = ivString.slice(2);
            hex2 = hex2.padStart(AES_128_BLOCK_SIZE * 2, "0");
            iv = new Uint8Array(AES_128_BLOCK_SIZE);
            for (let i3 = 0; i3 < AES_128_BLOCK_SIZE; i3++) {
              const startIndex = -AES_128_BLOCK_SIZE * 2 + i3;
              iv[i3] = parseInt(hex2.slice(startIndex, startIndex + 2), 16);
            }
          }
          const keyFormat = attributes.get("keyformat") ?? "identity";
          if (keyFormat !== "identity") {
            throw new Error(
              "For AES-128 encryption, only the 'identity' KEYFORMAT is currently supported. If you think other formats should be supported, please raise an issue.",
            );
          }
          currentKey = {
            method: "AES-128",
            keyUri: joinPaths$1(this.path, uri),
            iv,
            keyFormat,
          };
        } else if (method === "SAMPLE-AES" || method === "SAMPLE-AES-CTR") {
          const uri = attributes.get("uri");
          if (!uri) {
            throw new Error(`Invalid #EXT-X-KEY: ${method} requires a URI attribute.`);
          }
          const keyFormat = attributes.get("keyformat") ?? "identity";
          if (keyFormat === "identity") {
            throw new Error(
              "For SAMPLE-AES and SAMPLE-AES-CTR encryption, the 'identity' KEYFORMAT is not supported. If you think this format should be supported, please raise an issue.",
            );
          }
          let psshBox = null;
          if (BASE64_DATA_URI_REGEX.test(uri)) {
            const commaIndex = uri.indexOf(",");
            const bytes2 = base64ToBytes(uri.slice(commaIndex + 1));
            if (
              bytes2.length >= 8 &&
              bytes2[4] === 112 &&
              bytes2[5] === 115 &&
              bytes2[6] === 115 &&
              bytes2[7] === 104
            ) {
              const size2 = toDataView(bytes2).getUint32(0);
              psshBox = parsePsshBoxContents(bytes2.subarray(8, Math.min(size2, bytes2.length)));
            }
          }
          currentKey = {
            method,
            psshBox,
          };
        } else {
          throw new Error(
            `Unsupported encryption method '${method}'. If you think this method should be supported, please raise an issue.`,
          );
        }
      } else if (line.startsWith(TAG_MEDIA_SEQUENCE)) {
        const value = line.slice(TAG_MEDIA_SEQUENCE.length);
        const number2 = Number(value);
        if (!Number.isInteger(number2) || number2 < 0) {
          throw new Error(`Invalid EXT-X-MEDIA-SEQUENCE value '${value}'.`);
        }
        setNextSequenceNumber(number2);
      } else if (line.startsWith(TAG_BYTERANGE)) {
        const parsed = parseByteRange(line.slice(TAG_BYTERANGE.length));
        if (parsed.offset === null) {
          if (lastByteRangeEnd === null) {
            throw new Error(
              "Invalid M3U8 file; #EXT-X-BYTERANGE without offset requires a previous byte range.",
            );
          }
          parsed.offset = lastByteRangeEnd;
        }
        nextByteRange = parsed;
        lastByteRangeEnd = parsed.offset + parsed.length;
      } else if (line.startsWith(TAG_PROGRAM_DATE_TIME)) {
        if (prevLastSegment) {
          continue;
        }
        const dateTime = line.slice(TAG_PROGRAM_DATE_TIME.length);
        const dateTimeMs = Date.parse(dateTime);
        if (!Number.isFinite(dateTimeMs)) {
          continue;
        }
        const dateTimeSeconds = dateTimeMs / 1e3;
        if (lastProgramDateTimeSeconds === dateTimeSeconds) {
          continue;
        }
        if (lastProgramDateTimeSeconds === null && this.segments.length > 0) {
          const lastSegment = last$1(this.segments);
          const lastSegmentEnd = lastSegment.timestamp + lastSegment.duration;
          const offset2 = dateTimeSeconds - lastSegmentEnd;
          for (const segment of this.segments) {
            segment.timestamp += offset2;
            segment.relativeToUnixEpoch = true;
          }
          accumulatedTime += offset2;
        }
        lastProgramDateTimeSeconds = dateTimeSeconds;
        accumulatedTime = dateTimeSeconds;
      } else if (line === TAG_DISCONTINUITY) {
        currentFirstSegment = null;
      } else if (line.startsWith(TAG_TARGETDURATION)) {
        const value = line.slice(TAG_TARGETDURATION.length);
        const duration = Number(value);
        if (!Number.isFinite(duration) || duration < 0) {
          throw new Error(`Invalid EXT-X-TARGETDURATION value '${value}'.`);
        }
        this.refreshInterval = duration;
        targetDuration = duration;
      } else if (line === TAG_ENDLIST) {
        this.streamHasEnded = true;
        break;
      } else if (line.startsWith(TAG_PLAYLIST_TYPE)) {
        const type2 = line.slice(TAG_PLAYLIST_TYPE.length);
        if (type2.toLowerCase() === "vod") {
          this.streamHasEnded = true;
        }
      }
    }
    if (!headerRead) {
      throw new Error("Invalid M3U8 file; no #EXTM3U header.");
    }
  }
  async getFirstSegment() {
    if (this.segments.length === 0) {
      await this.runUpdateSegments();
    }
    return this.segments[0] ?? null;
  }
  async getSegmentAt(timestamp2, options) {
    if (this.segments.length === 0) {
      await this.runUpdateSegments();
    }
    let isLazy = !!options.skipLiveWait && this.getRemainingWaitTimeMs() > 0;
    while (true) {
      const index2 = binarySearchLessOrEqual(this.segments, timestamp2, (x2) => x2.timestamp);
      if (index2 === -1) {
        return null;
      }
      if (index2 < this.segments.length - 1 || this.streamHasEnded || isLazy) {
        return this.segments[index2];
      }
      const segment = this.segments[index2];
      if (timestamp2 < segment.timestamp + segment.duration) {
        return segment;
      }
      await this.runUpdateSegments();
      if (options.skipLiveWait) {
        isLazy = true;
      }
    }
  }
  async getNextSegment(segment, options) {
    const index2 = this.segments.indexOf(segment);
    assert$3(index2 !== -1);
    const nextIndex = index2 + 1;
    let isLazy = !!options.skipLiveWait && this.getRemainingWaitTimeMs() > 0;
    while (true) {
      if (nextIndex < this.segments.length) {
        return this.segments[nextIndex];
      }
      if (this.streamHasEnded || isLazy) {
        return null;
      }
      await this.runUpdateSegments();
      if (options.skipLiveWait) {
        isLazy = true;
      }
    }
  }
  async getPreviousSegment(segment) {
    const index2 = this.segments.indexOf(segment);
    assert$3(index2 !== -1);
    return this.segments[index2 - 1] ?? null;
  }
  getInputForSegment(segment) {
    const hlsSegment = segment;
    const cacheEntry = this.inputCache.find((x2) => x2.segment === hlsSegment);
    if (cacheEntry) {
      cacheEntry.age = this.nextInputCacheAge++;
      return cacheEntry.input;
    }
    let initInput2 = null;
    if (hlsSegment.initSegment || hlsSegment.firstSegment) {
      initInput2 = this.getInputForSegment(hlsSegment.initSegment ?? hlsSegment.firstSegment);
    }
    const formatOptions = {
      ...this.input._formatOptions,
      isobmff: {
        ...this.input._formatOptions.isobmff,
        // Intercept calls to resolveKeyId to inject our psshBox knowledge into it
        resolveKeyId:
          this.input._formatOptions.isobmff?.resolveKeyId &&
          ((options) => {
            if (
              !hlsSegment.encryption ||
              !(
                hlsSegment.encryption.method === "SAMPLE-AES" ||
                hlsSegment.encryption.method === "SAMPLE-AES-CTR"
              ) ||
              !hlsSegment.encryption.psshBox
            ) {
              return this.input._formatOptions.isobmff.resolveKeyId(options);
            }
            let psshBoxes = options.psshBoxes;
            const { psshBox } = hlsSegment.encryption;
            if (
              (psshBox.keyIds === null || psshBox.keyIds.includes(options.keyId)) &&
              !psshBoxes.some((x2) => psshBoxesAreEqual(x2, psshBox))
            ) {
              psshBoxes = [...psshBoxes, psshBox];
            }
            return this.input._formatOptions.isobmff.resolveKeyId({
              ...options,
              psshBoxes,
            });
          }),
      },
    };
    const input = new Input$3({
      source: new CustomPathedSource(hlsSegment.location.path, async (request) => {
        assert$3(request.isRoot);
        const proxiedRequest = {
          ...request,
          isRoot: false,
        };
        let ref;
        const needsSlice = hlsSegment.location.offset > 0 || hlsSegment.location.length !== null;
        if (
          !hlsSegment.encryption ||
          hlsSegment.encryption.method === "SAMPLE-AES" ||
          hlsSegment.encryption.method === "SAMPLE-AES-CTR"
        ) {
          ref = await this.input._getSourceCached(proxiedRequest);
          if (needsSlice) {
            const slice2 = ref.source.slice(
              hlsSegment.location.offset,
              hlsSegment.location.length ?? void 0,
            );
            const sliceRef = slice2.ref();
            ref.free();
            ref = sliceRef;
          }
        } else if (hlsSegment.encryption.method === "AES-128") {
          const encryption = hlsSegment.encryption;
          assert$3(encryption.iv);
          let ciphertextRef = await this.input._getSourceCached(proxiedRequest);
          if (needsSlice) {
            const slice2 = ciphertextRef.source.slice(
              hlsSegment.location.offset,
              hlsSegment.location.length ?? void 0,
            );
            const sliceRef = slice2.ref();
            ciphertextRef.free();
            ciphertextRef = sliceRef;
          }
          const ciphertextReader = new Reader(ciphertextRef.source);
          const stream = createAes128CbcDecryptStream(
            ciphertextReader,
            async () => {
              const env_2 = {
                stack: [],
                error: void 0,
                hasError: false,
              };
              try {
                const keyRef = __addDisposableResource(
                  env_2,
                  await this.input._getSourceCached(
                    {
                      path: encryption.keyUri,
                      isRoot: false,
                    },
                    ENCRYPTION_KEY_CACHE_GROUP,
                  ),
                  false,
                );
                const keyReader = new Reader(keyRef.source);
                const keySlice = await keyReader.requestSlice(0, AES_128_BLOCK_SIZE);
                if (!keySlice) {
                  throw new Error("Invalid AES-128 key; expected at least 16 bytes of data.");
                }
                const key2 = readBytes(keySlice, AES_128_BLOCK_SIZE);
                return {
                  key: key2,
                  iv: encryption.iv,
                };
              } catch (e_2) {
                env_2.error = e_2;
                env_2.hasError = true;
              } finally {
                __disposeResources(env_2);
              }
            },
            () => {
              ciphertextRef.free();
            },
          );
          ref = new ReadableStreamSource(stream).ref();
        } else {
          assert$3(false);
        }
        return ref;
      }),
      // Do not allow recursive HLS. Cool on paper, but allows for nasty infinite-depth request trees.
      formats: this.input._formats.filter((x2) => !(x2 instanceof HlsInputFormat)),
      initInput: initInput2 ?? void 0,
      formatOptions,
    });
    input._onFormatDetermined = (format2) => {
      if (
        (hlsSegment.encryption?.method === "SAMPLE-AES" ||
          hlsSegment.encryption?.method === "SAMPLE-AES-CTR") &&
        !format2._isIsobmff
      ) {
        throw new Error(
          "The SAMPLE-AES and SAMPLE-AES-CTR encryption methods are currently only supported for ISOBMFF files.",
        );
      }
    };
    this.inputCache.push({
      segment: hlsSegment,
      input,
      age: this.nextInputCacheAge++,
    });
    const MAX_INPUT_CACHE_SIZE = 4;
    if (this.inputCache.length > MAX_INPUT_CACHE_SIZE) {
      const minAgeIndex = arrayArgmin(this.inputCache, (x2) => x2.age);
      assert$3(minAgeIndex !== -1);
      this.inputCache.splice(minAgeIndex, 1);
    }
    return input;
  }
  async getLiveRefreshInterval() {
    if (this.getRemainingWaitTimeMs() === 0) {
      await this.runUpdateSegments();
    }
    return this.streamHasEnded ? null : this.refreshInterval;
  }
}
class HlsDemuxer extends Demuxer {
  constructor(input) {
    super(input);
    this.metadataPromise = null;
    this.trackBackings = null;
    this.internalTracks = null;
    this.segmentedInputs = [];
    this.hasMasterPlaylist = true;
  }
  readMetadata() {
    return (this.metadataPromise ??= (async () => {
      assert$3(this.input._rootSource instanceof PathedSource);
      const { rootPath } = this.input._rootSource;
      const slice2 = await this.input._reader.requestEntireFile();
      assert$3(slice2);
      const lines = readAllLines(slice2, slice2.length, {
        ignore: canIgnoreLine,
      });
      const variantStreams = [];
      const mediaTags = [];
      for (let i2 = 1; i2 < lines.length; i2++) {
        const line = lines[i2];
        if (line.startsWith(TAG_STREAM_INF)) {
          const streamInfLineNumber = i2;
          const playlistPath = lines[++i2];
          if (playlistPath === void 0) {
            throw new Error("Incorrect M3U8 file; a line must follow the #EXT-X-STREAM-INF tag.");
          }
          const fullPath = joinPaths$1(rootPath, playlistPath);
          const attributes = new AttributeList(line.slice(TAG_STREAM_INF.length));
          const bandwidth = attributes.getAsNumber("bandwidth");
          if (bandwidth === null) {
            throw new Error(
              "Invalid M3U8 file; #EXT-X-STREAM-INF tag requires a BANDWIDTH attribute with a valid numerical value.",
            );
          }
          variantStreams.push({
            fullPath,
            attributes,
            lineNumber: streamInfLineNumber,
            hasOnlyKeyPackets: false,
          });
        } else if (line.startsWith(TAG_I_FRAME_STREAM_INF)) {
          const attributes = new AttributeList(line.slice(TAG_I_FRAME_STREAM_INF.length));
          const playlistPath = attributes.get("uri");
          if (playlistPath === null) {
            throw new Error(
              "Invalid M3U8 file; #EXT-X-I-FRAME-STREAM-INF tag requires a URI attribute.",
            );
          }
          const bandwidth = attributes.getAsNumber("bandwidth");
          if (bandwidth === null) {
            throw new Error(
              "Invalid M3U8 file; #EXT-X-I-FRAME-STREAM-INF tag requires a BANDWIDTH attribute with a valid numerical value.",
            );
          }
          const fullPath = joinPaths$1(rootPath, playlistPath);
          variantStreams.push({
            fullPath,
            attributes,
            lineNumber: i2,
            hasOnlyKeyPackets: true,
          });
        } else if (line.startsWith(TAG_MEDIA)) {
          const attributes = new AttributeList(line.slice(TAG_MEDIA.length));
          const type2 = attributes.get("type");
          if (type2 === null) {
            throw new Error("Invalid M3U8 file; #EXT-X-MEDIA tag requires a TYPE attribute.");
          }
          const groupId2 = attributes.get("group-id");
          if (groupId2 === null) {
            throw new Error("Invalid M3U8 file; #EXT-X-MEDIA tag requires a GROUP-ID attribute.");
          }
          let fullPath = null;
          const uri = attributes.get("uri");
          if (uri !== null) {
            fullPath = joinPaths$1(rootPath, uri);
          }
          mediaTags.push({
            fullPath,
            attributes,
            lineNumber: i2,
          });
        } else if (line === TAG_I_FRAMES_ONLY);
        else if (line.startsWith(TAG_EXTINF)) {
          const segmentedInput = new HlsSegmentedInput(this, rootPath, null, lines);
          this.segmentedInputs = [segmentedInput];
          this.hasMasterPlaylist = false;
          this.trackBackings = await segmentedInput.getTrackBackings();
          return;
        }
      }
      const videoGroupIds = [
        ...new Set(
          mediaTags
            .filter((tag) => tag.attributes.get("type").toLowerCase() === "video")
            .map((tag) => tag.attributes.get("group-id")),
        ),
      ];
      const audioGroupIds = [
        ...new Set(
          mediaTags
            .filter((tag) => tag.attributes.get("type").toLowerCase() === "audio")
            .map((tag) => tag.attributes.get("group-id")),
        ),
      ];
      const internalTracksByVariant = await Promise.all(
        variantStreams.map(async (variantStream, i2) => {
          const result = [];
          const codecsList = variantStream.attributes.get("codecs");
          let codecStrings;
          if (codecsList) {
            codecStrings = codecsList.split(",").map((x2) => x2.trim());
          } else {
            const segmentedInput = this.getSegmentedInputForPath(variantStream.fullPath);
            const trackBackings = await segmentedInput.getTrackBackings();
            const tracksWithCodec = await Promise.all(
              trackBackings.map(async (t2) => ({
                track: t2,
                codec: await t2.getCodec(),
              })),
            );
            codecStrings = await Promise.all(
              tracksWithCodec
                .filter((x2) => x2.codec !== null)
                .map((x2) => x2.track.getDecoderConfig().then((x3) => x3.codec)),
            );
          }
          const videoGroupId = variantStream.attributes.get("video");
          const audioGroupId = variantStream.attributes.get("audio");
          const containsVideoCodecs = codecStrings.some((x2) =>
            VIDEO_CODECS.includes(inferCodecFromCodecString(x2)),
          );
          const containsAudioCodecs = codecStrings.some((x2) =>
            AUDIO_CODECS.includes(inferCodecFromCodecString(x2)),
          );
          if (videoGroupId !== null && !containsVideoCodecs) {
            if (!videoGroupIds.includes(videoGroupId)) {
              throw new Error(
                `Invalid M3U8 file; variant stream references video group "${videoGroupId}" which is not defined in any #EXT-X-MEDIA tags.`,
              );
            }
            const matchingVideoMediaTag = mediaTags.find((mediaTag) => {
              const groupId2 = mediaTag.attributes.get("group-id");
              const type2 = mediaTag.attributes.get("type");
              return groupId2 === videoGroupId && type2.toLowerCase() === "video";
            });
            outer: if (matchingVideoMediaTag) {
              const uri = matchingVideoMediaTag.attributes.get("uri");
              if (uri === null) {
                break outer;
              }
              const fullPath = joinPaths$1(rootPath, uri);
              const segmentedInput = this.getSegmentedInputForPath(fullPath);
              const trackBackings = await segmentedInput.getTrackBackings();
              const videoTrack = trackBackings.find((x2) => x2.getType() === "video");
              if (!videoTrack || (await videoTrack.getCodec()) === null) {
                break outer;
              }
              const additionalCodecString = await videoTrack
                .getDecoderConfig()
                .then((x2) => x2?.codec ?? null);
              assert$3(additionalCodecString !== null);
              codecStrings.push(additionalCodecString);
            }
          }
          if (audioGroupId !== null && !containsAudioCodecs) {
            if (!audioGroupIds.includes(audioGroupId)) {
              throw new Error(
                `Invalid M3U8 file; variant stream references audio group "${audioGroupId}" which is not defined in any #EXT-X-MEDIA tags.`,
              );
            }
            const matchingAudioMediaTag = mediaTags.find((tag) => {
              const groupId2 = tag.attributes.get("group-id");
              const type2 = tag.attributes.get("type");
              return groupId2 === audioGroupId && type2.toLowerCase() === "audio";
            });
            outer: if (matchingAudioMediaTag) {
              const uri = matchingAudioMediaTag.attributes.get("uri");
              if (uri === null) {
                break outer;
              }
              const fullPath = joinPaths$1(rootPath, uri);
              const segmentedInput = this.getSegmentedInputForPath(fullPath);
              const trackBackings = await segmentedInput.getTrackBackings();
              const audioTrack = trackBackings.find((x2) => x2.getType() === "audio");
              if (!audioTrack || (await audioTrack.getCodec()) === null) {
                break outer;
              }
              const additionalCodecString = await audioTrack
                .getDecoderConfig()
                .then((x2) => x2?.codec ?? null);
              assert$3(additionalCodecString !== null);
              codecStrings.push(additionalCodecString);
            }
          }
          codecStrings = [...new Set(codecStrings)];
          let videoCodecString = null;
          let audioCodecString = null;
          const bandwidth = variantStream.attributes.getAsNumber("bandwidth");
          assert$3(bandwidth !== null);
          const averageBandwidth = variantStream.attributes.getAsNumber("average-bandwidth");
          const name2 = variantStream.attributes.get("name");
          for (const codecString of codecStrings) {
            const inferredCodec = inferCodecFromCodecString(codecString);
            if (inferredCodec === null) {
              continue;
            }
            if (VIDEO_CODECS.includes(inferredCodec)) {
              if (videoCodecString !== null) {
                throw new Error(
                  "Unsupported M3U8 file; multiple video codecs found in the CODECS attribute of a variant stream.",
                );
              }
              videoCodecString = codecString;
              const videoGroupId2 = variantStream.attributes.get("video");
              if (videoGroupId2 === null) {
                const resolution = variantStream.attributes.get("resolution");
                let width = null;
                let height = null;
                if (resolution) {
                  const match2 = resolution.match(/^(\d+)x(\d+)$/);
                  if (match2) {
                    width = Number(match2[1]);
                    height = Number(match2[2]);
                  }
                }
                result.push({
                  id: -1,
                  demuxer: this,
                  backingTrack: null,
                  default: true,
                  autoselect: true,
                  languageCode: UNDETERMINED_LANGUAGE,
                  lineNumber: variantStream.lineNumber,
                  fullPath: variantStream.fullPath,
                  fullCodecString: videoCodecString,
                  pairingMask: 1n << BigInt(i2),
                  peakBitrate: bandwidth,
                  averageBitrate: averageBandwidth,
                  name: name2,
                  hasOnlyKeyPackets: variantStream.hasOnlyKeyPackets,
                  info: {
                    type: "video",
                    width,
                    height,
                  },
                });
              } else {
                if (!videoGroupIds.includes(videoGroupId2)) {
                  throw new Error(
                    `Invalid M3U8 file; variant stream references video group "${videoGroupId2}" which is not defined in any #EXT-X-MEDIA tags.`,
                  );
                }
                for (const mediaTag of mediaTags) {
                  const groupId2 = mediaTag.attributes.get("group-id");
                  const type2 = mediaTag.attributes.get("type");
                  if (groupId2 !== videoGroupId2 || type2.toLowerCase() !== "video") {
                    continue;
                  }
                  const resolution =
                    mediaTag.attributes.get("resolution") ??
                    variantStream.attributes.get("resolution");
                  let width = null;
                  let height = null;
                  if (resolution) {
                    const match2 = resolution.match(/^(\d+)x(\d+)$/);
                    if (match2) {
                      width = Number(match2[1]);
                      height = Number(match2[2]);
                    }
                  }
                  result.push({
                    id: -1,
                    demuxer: this,
                    backingTrack: null,
                    default: getMediaTagDefault(mediaTag.attributes),
                    // Autoselect is inferred to be true if the default is true
                    autoselect:
                      getMediaTagDefault(mediaTag.attributes) ||
                      getMediaTagAutoselect(mediaTag.attributes),
                    languageCode: preprocessLanguageCode(mediaTag.attributes.get("language")),
                    lineNumber: mediaTag.lineNumber,
                    fullPath: mediaTag.fullPath ?? variantStream.fullPath,
                    fullCodecString: videoCodecString,
                    pairingMask: 1n << BigInt(i2),
                    peakBitrate: null,
                    averageBitrate: null,
                    name: mediaTag.attributes.get("name"),
                    hasOnlyKeyPackets: variantStream.hasOnlyKeyPackets,
                    info: {
                      type: "video",
                      width,
                      height,
                    },
                  });
                }
              }
            } else if (AUDIO_CODECS.includes(inferredCodec)) {
              if (audioCodecString !== null) {
                throw new Error(
                  "Unsupported M3U8 file; multiple audio codecs found in the CODECS attribute of a variant stream.",
                );
              }
              audioCodecString = codecString;
              const audioGroupId2 = variantStream.attributes.get("audio");
              if (audioGroupId2 === null) {
                const channels = variantStream.attributes.get("channels");
                const parsedChannels = channels !== null ? Number(channels.split("/")[0]) : null;
                result.push({
                  id: -1,
                  demuxer: this,
                  backingTrack: null,
                  default: true,
                  autoselect: true,
                  languageCode: UNDETERMINED_LANGUAGE,
                  lineNumber: variantStream.lineNumber,
                  fullPath: variantStream.fullPath,
                  fullCodecString: audioCodecString,
                  pairingMask: 1n << BigInt(i2),
                  peakBitrate: bandwidth,
                  averageBitrate: averageBandwidth,
                  name: name2,
                  hasOnlyKeyPackets: variantStream.hasOnlyKeyPackets,
                  info: {
                    type: "audio",
                    numberOfChannels:
                      parsedChannels !== null &&
                      Number.isInteger(parsedChannels) &&
                      parsedChannels > 0
                        ? parsedChannels
                        : null,
                  },
                });
              } else {
                if (!audioGroupIds.includes(audioGroupId2)) {
                  throw new Error(
                    `Invalid M3U8 file; variant stream references audio group "${audioGroupId2}" which is not defined in any #EXT-X-MEDIA tags.`,
                  );
                }
                for (const mediaTag of mediaTags) {
                  const groupId2 = mediaTag.attributes.get("group-id");
                  const type2 = mediaTag.attributes.get("type");
                  if (groupId2 !== audioGroupId2 || type2.toLowerCase() !== "audio") {
                    continue;
                  }
                  const channels =
                    mediaTag.attributes.get("channels") ?? variantStream.attributes.get("channels");
                  const parsedChannels = channels !== null ? Number(channels.split("/")[0]) : null;
                  result.push({
                    id: -1,
                    demuxer: this,
                    backingTrack: null,
                    default: getMediaTagDefault(mediaTag.attributes),
                    // Autoselect is inferred to be true if the default is true
                    autoselect:
                      getMediaTagDefault(mediaTag.attributes) ||
                      getMediaTagAutoselect(mediaTag.attributes),
                    languageCode: preprocessLanguageCode(mediaTag.attributes.get("language")),
                    lineNumber: mediaTag.lineNumber,
                    fullPath: mediaTag.fullPath ?? variantStream.fullPath,
                    fullCodecString: audioCodecString,
                    pairingMask: 1n << BigInt(i2),
                    peakBitrate: null,
                    averageBitrate: null,
                    name: mediaTag.attributes.get("name"),
                    hasOnlyKeyPackets: variantStream.hasOnlyKeyPackets,
                    info: {
                      type: "audio",
                      numberOfChannels:
                        parsedChannels !== null &&
                        Number.isInteger(parsedChannels) &&
                        parsedChannels > 0
                          ? parsedChannels
                          : null,
                    },
                  });
                }
              }
            }
          }
          return result;
        }),
      );
      const internalTracks = [];
      const addInternalTrack = (track) => {
        const existingTrack = internalTracks.find(
          (x2) => x2.fullPath === track.fullPath && x2.info.type === track.info.type,
        );
        if (existingTrack) {
          existingTrack.pairingMask |= track.pairingMask;
          existingTrack.default ||= track.default;
          existingTrack.autoselect ||= track.autoselect;
          existingTrack.lineNumber = Math.min(existingTrack.lineNumber, track.lineNumber);
          if (track.peakBitrate !== null) {
            existingTrack.peakBitrate = Math.max(
              existingTrack.peakBitrate ?? -Infinity,
              track.peakBitrate,
            );
          }
          if (track.averageBitrate !== null) {
            existingTrack.averageBitrate = Math.max(
              existingTrack.averageBitrate ?? -Infinity,
              track.averageBitrate,
            );
          }
          if (existingTrack.languageCode === UNDETERMINED_LANGUAGE) {
            existingTrack.languageCode = track.languageCode;
          }
        } else {
          track.id = internalTracks.length + 1;
          internalTracks.push(track);
        }
      };
      for (const variantInternalTracks of internalTracksByVariant) {
        for (const trackEntry of variantInternalTracks) {
          addInternalTrack(trackEntry);
        }
      }
      internalTracks.sort((a2, b3) => a2.lineNumber - b3.lineNumber);
      this.trackBackings = [];
      for (const internalTrack of internalTracks) {
        if (internalTrack.info.type === "video") {
          this.trackBackings.push(new HlsInputVideoTrackBacking(internalTrack));
        } else {
          this.trackBackings.push(new HlsInputAudioTrackBacking(internalTrack));
        }
      }
      this.internalTracks = internalTracks;
    })());
  }
  async getTrackBackings() {
    await this.readMetadata();
    assert$3(this.trackBackings);
    return this.trackBackings;
  }
  getSegmentedInputForPath(path2) {
    let segmentedInput = this.segmentedInputs.find((x2) => x2.path === path2);
    if (segmentedInput) {
      return segmentedInput;
    }
    let decls = null;
    if (this.internalTracks) {
      const tracks = this.internalTracks.filter((x2) => x2.fullPath === path2);
      decls = tracks.map((x2) => ({
        id: x2.id,
        type: x2.info.type,
      }));
    }
    segmentedInput = new HlsSegmentedInput(this, path2, decls, null);
    this.segmentedInputs.push(segmentedInput);
    return segmentedInput;
  }
  async getMetadataTags() {
    return {};
  }
  async getMimeType() {
    return HLS_MIME_TYPE;
  }
  dispose() {
    if (this.segmentedInputs) {
      for (const segInput of this.segmentedInputs) {
        segInput.dispose();
      }
      this.segmentedInputs.length = 0;
    }
  }
}
class HlsInputFormat extends InputFormat {
  /** @internal */
  async _canReadInput(input) {
    let slice2 = input._reader.requestSlice(0, 7);
    if (slice2 instanceof Promise) slice2 = await slice2;
    if (!slice2) return false;
    const isM3u8 = readAscii(slice2, 7) === "#EXTM3U";
    if (!isM3u8) {
      return false;
    }
    if (!(input._rootSource instanceof PathedSource)) {
      throw new TypeError(
        "HLS inputs require `InputOptions.source` to be a PathedSource or a ref to one.",
      );
    }
    input._rootSource._usedForHls = true;
    return true;
  }
  /** @internal */
  _createDemuxer(input) {
    return new HlsDemuxer(input);
  }
  get name() {
    return "HTTP Live Streaming (HLS)";
  }
  get mimeType() {
    return HLS_MIME_TYPE;
  }
}
const HLS = new HlsInputFormat();
export const ALL_FORMATS = [HLS, MP4, QTFF, MATROSKA, WEBM, WAVE, OGG, FLAC, MP3, ADTS, MPEG_TS];
let inputFinalizationRegistry = null;
if (typeof FinalizationRegistry !== "undefined") {
  inputFinalizationRegistry = new FinalizationRegistry((refs) => {
    for (const ref of refs) {
      if (!ref.freed) {
        ref.free();
      }
    }
  });
}
export let Input$3 = class Input extends EventEmitter$2 {
  /** True if the input has been disposed. */
  get disposed() {
    return this._disposed;
  }
  /**
   * Creates a new input file from the specified options. No reading operations will be performed until methods are
   * called on this instance.
   */
  constructor(options) {
    super();
    this._demuxerPromise = null;
    this._format = null;
    this._trackBackingsCache = null;
    this._backingToTrack = new Map();
    this._disposed = false;
    this._nextSourceCacheAge = 0;
    this._sourceRefs = [];
    this._sourceCache = [];
    this._sourceCachePromises = [];
    this._onFormatDetermined = null;
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (
      !Array.isArray(options.formats) ||
      options.formats.some((x2) => !(x2 instanceof InputFormat))
    ) {
      throw new TypeError("options.formats must be an array of InputFormat.");
    }
    if (!(options.source instanceof Source || options.source instanceof SourceRef)) {
      throw new TypeError("options.source must be a Source or SourceRef.");
    }
    if (options.source instanceof Source && options.source._disposed) {
      throw new TypeError("options.source must not be a disposed Source.");
    }
    if (options.initInput !== void 0 && !(options.initInput instanceof Input)) {
      throw new TypeError("options.initInput, when provided, must be an Input.");
    }
    if (options.formatOptions !== void 0) {
      validateInputFormatOptions(options.formatOptions, "formatOptions");
    }
    this._formats = options.formats;
    this._initInput = options.initInput ?? null;
    this._formatOptions = options.formatOptions ?? {};
    if (options.source instanceof Source) {
      this._rootRef = options.source.ref();
    } else {
      this._rootRef = options.source;
    }
    this._sourceRefs.push(this._rootRef);
    inputFinalizationRegistry?.register(this, this._sourceRefs, this);
  }
  /** @internal */
  get _rootSource() {
    return this._rootRef.source;
  }
  /** @internal */
  async _getSourceUncached(request) {
    assert$3(this._rootSource instanceof PathedSource);
    const ref = await this._rootSource._resolveRequest(request);
    this._emit("source", {
      source: ref.source,
      request,
      isRoot: request.isRoot,
    });
    return ref;
  }
  /** @internal */
  _getSourceCached(request, cacheGroup = DEFAULT_SOURCE_CACHE_GROUP) {
    const cachedEntry = this._sourceCache.find(
      (x2) => x2.cacheGroup === cacheGroup && sourceRequestsAreEqual(x2.request, request),
    );
    if (cachedEntry) {
      cachedEntry.age++;
      return Promise.resolve(cachedEntry.sourceRef.source.ref());
    }
    const cachedPromiseEntry = this._sourceCachePromises.find(
      (x2) => x2.cacheGroup === cacheGroup && sourceRequestsAreEqual(x2.request, request),
    );
    if (cachedPromiseEntry) {
      return cachedPromiseEntry.promise.then((x2) => x2.sourceRef.source.ref());
    }
    const promise = (async () => {
      const sourceRef = await this._getSourceUncached(request);
      const MAX_SOURCE_CACHE_SIZE = 4;
      const count2 = arrayCount(
        this._sourceCache,
        (x2) => x2.cacheGroup === cacheGroup && x2.sourceRef.source._refCount === 1,
      );
      if (count2 >= MAX_SOURCE_CACHE_SIZE) {
        const minAgeIndex = arrayArgmin(this._sourceCache, (x2) =>
          x2.cacheGroup === cacheGroup && x2.sourceRef.source._refCount === 1 ? x2.age : Infinity,
        );
        assert$3(minAgeIndex !== -1);
        const entry = this._sourceCache[minAgeIndex];
        this._sourceCache.splice(minAgeIndex, 1);
        entry.sourceRef.free();
        removeItem(this._sourceRefs, entry.sourceRef);
      }
      this._sourceRefs.push(sourceRef);
      const promiseIndex = this._sourceCachePromises.findIndex((x2) => x2.request === request);
      assert$3(promiseIndex !== -1);
      this._sourceCachePromises.splice(promiseIndex, 1);
      const cacheEntry = {
        request,
        sourceRef,
        age: this._nextSourceCacheAge++,
        cacheGroup,
      };
      return cacheEntry;
    })();
    this._sourceCachePromises.push({
      request,
      cacheGroup,
      promise,
    });
    return promise.then((entry) => {
      const ref = entry.sourceRef.source.ref();
      this._sourceCache.push(entry);
      return ref;
    });
  }
  /** @internal */
  _getDemuxer() {
    return (this._demuxerPromise ??= (async () => {
      this._reader = new Reader(this._rootSource);
      this._emit("source", {
        source: this._rootSource,
        request: null,
        isRoot: true,
      });
      for (const format2 of this._formats) {
        const canRead = await format2._canReadInput(this);
        if (canRead) {
          this._format = format2;
          this._onFormatDetermined?.(format2);
          return format2._createDemuxer(this);
        }
      }
      throw new UnsupportedInputFormatError();
    })());
  }
  /**
   * Returns the source from which this input file reads data for the root path.
   */
  get source() {
    return this._rootSource;
  }
  /**
   * Returns the format of the input file. You can compare this result directly to the {@link InputFormat} singletons
   * or use `instanceof` checks for subset-aware logic (for example, `format instanceof MatroskaInputFormat` is true
   * for both MKV and WebM).
   */
  async getFormat() {
    await this._getDemuxer();
    assert$3(this._format);
    return this._format;
  }
  /** Returns `true` if the format of the input file is known and the file can be read, `false` otherwise. */
  async canRead() {
    try {
      await this._getDemuxer();
      return true;
    } catch (error) {
      if (error instanceof UnsupportedInputFormatError) {
        return false;
      }
      throw error;
    }
  }
  /**
   * Returns the timestamp at which the input file starts. More precisely, returns the smallest starting timestamp
   * among all tracks.
   *
   * Optionally, you can pass in the list of tracks for which you want to compute the starting timestamp.
   *
   * Note that this method is potentially expensive for inputs with many tracks (such as HLS manifests), since it
   * probes every track.
   */
  async getFirstTimestamp(tracks) {
    tracks ??= await this.getTracks();
    const filtered = tracks.filter((x2) => x2 !== null);
    if (filtered.length === 0) {
      return 0;
    }
    const firstTimestamps = await Promise.all(filtered.map((x2) => x2.getFirstTimestamp()));
    return Math.min(...firstTimestamps);
  }
  /**
   * Computes the duration of the input file, in seconds. More precisely, returns the largest end timestamp among
   * all tracks.
   *
   * Optionally, you can pass in the list of tracks for which you want to compute the duration.
   *
   * This method can be potentially expensive depending on the underlying file format, because it returns the most
   * accurate duration possible and must check all tracks. Use {@link Input.getDurationFromMetadata} for a faster but
   * less accurate estimate of duration.
   *
   * By default, when any track in the underlying media is live, this method will only resolve once the live stream
   * ends. If you want to query the current duration of the media, set {@link PacketRetrievalOptions.skipLiveWait}
   * to `true` in the options.
   */
  async computeDuration(tracks, options) {
    tracks ??= await this.getTracks();
    const filtered = tracks.filter((x2) => x2 !== null);
    if (filtered.length === 0) {
      return 0;
    }
    const tracksDurations = await Promise.all(filtered.map((x2) => x2.computeDuration(options)));
    return Math.max(...tracksDurations);
  }
  /**
   * Gets the duration (end timestamp) in seconds of the input file from metadata stored in the file. This value may
   * be approximate or diverge from the actual, precise duration returned by `.computeDuration()`, but compared to
   * that method, this method is cheaper. When the duration cannot be determined from the file metadata, `null`
   * is returned.
   *
   * Optionally, you can pass in the list of tracks for which you want to get the duration from metadata.
   *
   * By default, when the underlying media is live, this method will only resolve once the live stream
   * ends. If you want to query the current duration of the media, set
   * {@link DurationMetadataRequestOptions.skipLiveWait} to `true` in the options.
   */
  async getDurationFromMetadata(tracks, options) {
    tracks ??= await this.getTracks();
    const filtered = tracks.filter((x2) => x2 !== null);
    const tracksDurations = await Promise.all(
      filtered.map((x2) => x2.getDurationFromMetadata(options)),
    );
    const nonNullDurations = tracksDurations.filter((x2) => x2 !== null);
    if (nonNullDurations.length === 0) {
      return null;
    }
    return Math.max(...nonNullDurations);
  }
  /**
   * Returns the list of all tracks of this input file in the order in which they appear in the file. An optional
   * query can be provided.
   */
  async getTracks(query) {
    query &&= toValidatedInputTrackQuery(query);
    const backings = await this._getTrackBackings();
    const tracks = backings.map((backing) => this._wrapBackingAsTrack(backing));
    return queryInputTracks(tracks, query);
  }
  /** Returns the list of all video tracks of this input file. An optional query can be provided. */
  async getVideoTracks(query) {
    query &&= toValidatedInputTrackQuery(query);
    const tracks = await this.getTracks();
    const videoTracks = tracks.filter((x2) => x2.isVideoTrack());
    return queryInputTracks(videoTracks, query);
  }
  /** Returns the list of all audio tracks of this input file. An optional query can be provided. */
  async getAudioTracks(query) {
    query &&= toValidatedInputTrackQuery(query);
    const tracks = await this.getTracks();
    const audioTracks = tracks.filter((x2) => x2.isAudioTrack());
    return queryInputTracks(audioTracks, query);
  }
  /**
   * Returns the primary video track of this input file, or null if there are no video tracks.
   *
   * Multiple factors determine which track is considered primary, including its position in the file, disposition,
   * bitrate (higher bitrate is preferred), and if it can be paired with an audio track.
   */
  async getPrimaryVideoTrack(query) {
    query &&= toValidatedInputTrackQuery(query);
    const merged = mergeInputTrackQueries(query, {
      sortBy: async (t2) => [
        prefer((await t2.getDisposition()).default),
        prefer(await t2.hasPairableAudioTrack()),
        prefer(!(await t2.hasOnlyKeyPackets())),
        desc(await t2.getBitrate()),
      ],
    });
    const sorted = await this.getVideoTracks(merged);
    return sorted[0] ?? null;
  }
  /**
   * Returns the primary audio track of this input file, or null if there are no audio tracks.
   *
   * Multiple factors determine which track is considered primary, including its position in the file, disposition,
   * bitrate (higher bitrate is preferred), and if it can be paired with the primary video track.
   */
  async getPrimaryAudioTrack(query) {
    query &&= toValidatedInputTrackQuery(query);
    const primaryVideoTrack = await this.getPrimaryVideoTrack();
    const merged = mergeInputTrackQueries(query, {
      sortBy: async (t2) => [
        prefer(!primaryVideoTrack || t2.canBePairedWith(primaryVideoTrack)),
        prefer((await t2.getDisposition()).default),
        desc(await t2.getBitrate()),
      ],
    });
    const sorted = await this.getAudioTracks(merged);
    return sorted[0] ?? null;
  }
  /** @internal */
  async _getTrackBackings() {
    const demuxer = await this._getDemuxer();
    return (this._trackBackingsCache ??= await demuxer.getTrackBackings());
  }
  /** @internal */
  _wrapBackingAsTrack(backing) {
    const existing = this._backingToTrack.get(backing);
    if (existing) {
      return existing;
    }
    const type2 = backing.getType();
    const track =
      type2 === "video" ? new InputVideoTrack(this, backing) : new InputAudioTrack(this, backing);
    this._backingToTrack.set(backing, track);
    return track;
  }
  /** Returns the full MIME type of this input file, including track codecs. */
  async getMimeType() {
    const demuxer = await this._getDemuxer();
    return demuxer.getMimeType();
  }
  /**
   * Returns descriptive metadata tags about the media file, such as title, author, date, cover art, or other
   * attached files.
   */
  async getMetadataTags() {
    const demuxer = await this._getDemuxer();
    return demuxer.getMetadataTags();
  }
  /**
   * Disposes this input and frees connected resources. When an input is disposed, ongoing read operations will be
   * canceled, all future read operations will fail, any open decoders will be closed, and all ongoing media sink
   * operations will be canceled. Disallowed and canceled operations will throw an {@link InputDisposedError}.
   *
   * You are expected not to use an input after disposing it. While some operations may still work, it is not
   * specified and may change in any future update.
   */
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    for (const ref of this._sourceRefs) {
      ref.free();
    }
    this._sourceRefs.length = 0;
    inputFinalizationRegistry?.unregister(this);
    void this._demuxerPromise?.then((demuxer) => demuxer.dispose());
  }
  /**
   * Calls `.dispose()` on the input, implementing the `Disposable` interface for use with
   * JavaScript Explicit Resource Management features.
   */
  [Symbol.dispose]() {
    this.dispose();
  }
};
export class Conversion {
  /** Initializes a new conversion process without starting the conversion. */
  static async init(options) {
    const conversion = new Conversion(options);
    await conversion._init();
    return conversion;
  }
  /** Creates a new Conversion instance (duh). */
  constructor(options) {
    this._addedCounts = {
      video: 0,
      audio: 0,
      subtitle: 0,
    };
    this._totalTrackCount = 0;
    this._nextOutputTrackId = 0;
    this._outputTrackIds = [];
    this._outputOwnTrackGroups = [];
    this._trackPromises = [];
    this._executed = false;
    this._synchronizer = new TrackSynchronizer();
    this._totalDuration = null;
    this._maxTimestamps = new Map();
    this._canceled = false;
    this.onProgress = void 0;
    this._computeProgress = false;
    this._lastProgress = 0;
    this.isValid = false;
    this.utilizedTracks = [];
    this.discardedTracks = [];
    if (!options || typeof options !== "object") {
      throw new TypeError("options must be an object.");
    }
    if (!(options.input instanceof Input$3)) {
      throw new TypeError("options.input must be an Input.");
    }
    if (!(options.output instanceof Output)) {
      throw new TypeError("options.output must be an Output.");
    }
    if (options.tracks !== void 0 && options.tracks !== "all" && options.tracks !== "primary") {
      throw new TypeError("options.tracks, when provided, must be either 'all' or 'primary'.");
    }
    if (
      options.output._tracks.length > 0 ||
      Object.keys(options.output._metadataTags).length > 0 ||
      options.output.state !== "pending"
    ) {
      throw new TypeError(
        "options.output must be fresh: no tracks or metadata tags added and not started.",
      );
    }
    if (options.video !== void 0 && typeof options.video !== "function") {
      if (Array.isArray(options.video)) {
        for (const obj of options.video) {
          validateVideoOptions(obj);
        }
      } else {
        validateVideoOptions(options.video);
      }
    }
    if (options.audio !== void 0 && typeof options.audio !== "function") {
      if (Array.isArray(options.audio)) {
        for (const obj of options.audio) {
          validateAudioOptions(obj);
        }
      } else {
        validateAudioOptions(options.audio);
      }
    }
    if (options.trim !== void 0 && (!options.trim || typeof options.trim !== "object")) {
      throw new TypeError("options.trim, when provided, must be an object.");
    }
    if (options.trim?.start !== void 0 && !Number.isFinite(options.trim.start)) {
      throw new TypeError("options.trim.start, when provided, must be a finite number.");
    }
    if (options.trim?.end !== void 0 && !Number.isFinite(options.trim.end)) {
      throw new TypeError("options.trim.end, when provided, must be a finite number.");
    }
    if (
      options.trim?.start !== void 0 &&
      options.trim.end !== void 0 &&
      options.trim.start >= options.trim.end
    ) {
      throw new TypeError("options.trim.start must be less than options.trim.end.");
    }
    if (
      options.tags !== void 0 &&
      (typeof options.tags !== "object" || !options.tags) &&
      typeof options.tags !== "function"
    ) {
      throw new TypeError("options.tags, when provided, must be an object or a function.");
    }
    if (typeof options.tags === "object") {
      validateMetadataTags(options.tags);
    }
    if (options.showWarnings !== void 0 && typeof options.showWarnings !== "boolean") {
      throw new TypeError("options.showWarnings, when provided, must be a boolean.");
    }
    this._options = options;
    this.input = options.input;
    this.output = options.output;
    const { promise: started, resolve: start2 } = promiseWithResolvers();
    this._started = started;
    this._start = start2;
  }
  /** @internal */
  async _init() {
    const inputFormat = await this.input.getFormat();
    let tracks;
    let trackMode = this._options.tracks;
    if (trackMode === void 0) {
      const defaultTrackMode = inputFormat.name.includes("(HLS)") ? "primary" : "all";
      trackMode = defaultTrackMode;
    }
    if (trackMode === "all") {
      tracks = await this.input.getTracks();
    } else if (trackMode === "primary") {
      const primaryVideoTrack = await this.input.getPrimaryVideoTrack();
      const primaryAudioTrack = await this.input.getPrimaryAudioTrack();
      tracks = [primaryVideoTrack, primaryAudioTrack].filter((x2) => x2 !== null);
    } else {
      assertNever(trackMode);
      assert$3(false);
    }
    const outputTrackCounts = this.output.format.getSupportedTrackCounts();
    let nVideo = 1;
    let nAudio = 1;
    const filteredTracks = [];
    const filteredTrackOptions = [];
    for (const track of tracks) {
      let trackOptions;
      if (track.isVideoTrack()) {
        if (this._options.video) {
          if (typeof this._options.video === "function") {
            const returnedTrackOptions = (await this._options.video(track, nVideo)) ?? {};
            if (Array.isArray(returnedTrackOptions)) {
              for (const obj of returnedTrackOptions) {
                validateVideoOptions(obj);
              }
            } else {
              validateVideoOptions(returnedTrackOptions);
            }
            trackOptions = Array.isArray(returnedTrackOptions)
              ? returnedTrackOptions
              : [returnedTrackOptions];
            nVideo++;
          } else {
            trackOptions = Array.isArray(this._options.video)
              ? this._options.video
              : [this._options.video];
          }
        } else {
          trackOptions = [{}];
        }
      } else if (track.isAudioTrack()) {
        if (this._options.audio) {
          if (typeof this._options.audio === "function") {
            const returnedTrackOptions = (await this._options.audio(track, nAudio)) ?? {};
            if (Array.isArray(returnedTrackOptions)) {
              for (const obj of returnedTrackOptions) {
                validateAudioOptions(obj);
              }
            } else {
              validateAudioOptions(returnedTrackOptions);
            }
            trackOptions = Array.isArray(returnedTrackOptions)
              ? returnedTrackOptions
              : [returnedTrackOptions];
            nAudio++;
          } else {
            trackOptions = Array.isArray(this._options.audio)
              ? this._options.audio
              : [this._options.audio];
          }
        } else {
          trackOptions = [{}];
        }
      } else {
        assert$3(false);
      }
      const discardOptions = trackOptions.filter((x2) => x2.discard);
      for (const discardOption of discardOptions) {
        this.discardedTracks.push({
          track,
          reason: "discarded_by_user",
          trackOptions: discardOption,
        });
      }
      if (trackOptions.length === discardOptions.length) {
        if (trackOptions.length === 0) {
          this.discardedTracks.push({
            track,
            reason: "discarded_by_user",
            trackOptions: {},
          });
        }
        continue;
      }
      const nonDiscardOptions = trackOptions.filter((x2) => !x2.discard);
      filteredTracks.push(track);
      filteredTrackOptions.push(nonDiscardOptions);
    }
    if (this._options.trim?.start !== void 0) {
      this._startTimestamp = this._options.trim.start;
    } else {
      this._startTimestamp = Math.max(
        await this.input.getFirstTimestamp(filteredTracks),
        // Samples can also have negative timestamps, but the meaning typically is "don't present me", so let's
        // cut those out by default.
        0,
      );
    }
    this._endTimestamp = Math.max(this._options.trim?.end ?? Infinity, this._startTimestamp);
    for (let i2 = 0; i2 < filteredTracks.length; i2++) {
      const track = filteredTracks[i2];
      const options = filteredTrackOptions[i2];
      for (const option2 of options) {
        if (this._totalTrackCount === outputTrackCounts.total.max) {
          this.discardedTracks.push({
            track,
            reason: "max_track_count_reached",
            trackOptions: option2,
          });
          continue;
        }
        if (this._addedCounts[track.type] === outputTrackCounts[track.type].max) {
          this.discardedTracks.push({
            track,
            reason: "max_track_count_of_type_reached",
            trackOptions: option2,
          });
          continue;
        }
        const outputTrackId = this._nextOutputTrackId++;
        if (track.isVideoTrack()) {
          await this._processVideoTrack(track, option2, outputTrackId);
        } else if (track.isAudioTrack()) {
          await this._processAudioTrack(track, option2, outputTrackId);
        } else {
          assert$3(false);
        }
      }
    }
    for (let i2 = 0; i2 < this.utilizedTracks.length - 1; i2++) {
      for (let j2 = i2 + 1; j2 < this.utilizedTracks.length; j2++) {
        const trackA = this.utilizedTracks[i2];
        const trackB = this.utilizedTracks[j2];
        const ownGroupA = this._outputOwnTrackGroups[i2];
        const ownGroupB = this._outputOwnTrackGroups[j2];
        assert$3(ownGroupA !== void 0);
        assert$3(ownGroupB !== void 0);
        if (ownGroupA && ownGroupB && trackA.canBePairedWith(trackB)) {
          ownGroupA.pairWith(ownGroupB);
        }
      }
    }
    const inputTags2 = await this.input.getMetadataTags();
    let outputTags;
    if (this._options.tags) {
      const result =
        typeof this._options.tags === "function"
          ? await this._options.tags(inputTags2)
          : this._options.tags;
      validateMetadataTags(result);
      outputTags = result;
    } else {
      outputTags = inputTags2;
    }
    const inputAndOutputFormatMatch = inputFormat.mimeType === this.output.format.mimeType;
    const rawTagsAreUnchanged = inputTags2.raw === outputTags.raw;
    if (inputTags2.raw && rawTagsAreUnchanged && !inputAndOutputFormatMatch) {
      delete outputTags.raw;
    }
    this.output.setMetadataTags(outputTags);
    this.isValid =
      this._totalTrackCount >= outputTrackCounts.total.min &&
      this._addedCounts.video >= outputTrackCounts.video.min &&
      this._addedCounts.audio >= outputTrackCounts.audio.min &&
      this._addedCounts.subtitle >= outputTrackCounts.subtitle.min;
    if (this._options.showWarnings ?? true) {
      const warnElements = [];
      const unintentionallyDiscardedTracks = this.discardedTracks.filter(
        (x2) => x2.reason !== "discarded_by_user",
      );
      if (unintentionallyDiscardedTracks.length > 0) {
        warnElements.push(
          "Some tracks had to be discarded from the conversion:",
          unintentionallyDiscardedTracks,
        );
      }
      if (!this.isValid) {
        if (warnElements.length > 0) {
          warnElements.push("\n\n");
        }
        warnElements.push(this._getInvalidityExplanation().join(""));
      }
      if (warnElements.length > 0) {
        console.warn(...warnElements);
      }
    }
  }
  /** @internal */
  _getInvalidityExplanation() {
    const elements = [];
    if (this.discardedTracks.length === 0) {
      elements.push("Due to missing tracks, this conversion cannot be executed.");
    } else {
      const encodabilityIsTheProblem =
        this.discardedTracks.every(
          (x2) => x2.reason === "discarded_by_user" || x2.reason === "no_encodable_target_codec",
        ) && this.discardedTracks.some((x2) => x2.reason === "no_encodable_target_codec");
      elements.push("Due to discarded tracks, this conversion cannot be executed.");
      if (encodabilityIsTheProblem) {
        const codecs = this.discardedTracks.flatMap((x2) => {
          if (x2.reason === "discarded_by_user") return [];
          if (x2.track.type === "video") {
            return this.output.format.getSupportedVideoCodecs();
          } else if (x2.track.type === "audio") {
            return this.output.format.getSupportedAudioCodecs();
          } else {
            return this.output.format.getSupportedSubtitleCodecs();
          }
        });
        const uniqueCodecs = [...new Set(codecs)];
        if (uniqueCodecs.length === 1) {
          elements.push(`
Tracks were discarded because your environment is not able to encode '${uniqueCodecs[0]}'.`);
        } else {
          elements.push(`
Tracks were discarded because your environment is not able to encode any of the following codecs: ${uniqueCodecs.map((x2) => `'${x2}'`).join(", ")}.`);
        }
        if (uniqueCodecs.includes("mp3")) {
          elements.push(`
The @mediabunny/mp3-encoder extension package provides support for encoding MP3.`);
        }
        if (uniqueCodecs.includes("aac")) {
          elements.push(
            "\nThe @mediabunny/aac-encoder extension package provides support for encoding AAC.",
          );
        }
        if (uniqueCodecs.includes("ac3") || uniqueCodecs.includes("eac3")) {
          elements.push(
            "\nThe @mediabunny/ac3 extension package provides support for encoding and decoding AC-3/E-AC-3.",
          );
        }
        if (uniqueCodecs.includes("flac")) {
          elements.push(
            "\nThe @mediabunny/flac-encoder extension package provides support for encoding FLAC.",
          );
        }
      } else {
        elements.push("\nCheck the discardedTracks field for more info.");
      }
    }
    return elements;
  }
  /**
   * Executes the conversion process. Resolves once conversion is complete.
   *
   * Will throw if `isValid` is `false`.
   */
  async execute() {
    if (!this.isValid) {
      throw new Error(
        "Cannot execute this conversion because its output configuration is invalid. Make sure to always check the isValid field before executing a conversion.\n" +
          this._getInvalidityExplanation().join(""),
      );
    }
    if (this._executed) {
      throw new Error("Conversion cannot be executed twice.");
    }
    this._executed = true;
    if (this.onProgress) {
      const uniqueUtilizedTracks = new Set(this.utilizedTracks);
      const durationPromises = [...uniqueUtilizedTracks].map(async (track) => {
        if (await track.isLive()) {
          return Infinity;
        }
        return (await track.getDurationFromMetadata()) ?? (await track.computeDuration());
      });
      const duration = Math.max(0, ...(await Promise.all(durationPromises)));
      this._computeProgress = true;
      this._totalDuration = Math.min(
        duration - this._startTimestamp,
        this._endTimestamp - this._startTimestamp,
      );
      for (const id2 of this._outputTrackIds) {
        this._maxTimestamps.set(id2, 0);
      }
      this.onProgress?.(0, 0);
    }
    await this.output.start();
    this._start();
    try {
      await Promise.all(this._trackPromises);
    } catch (error) {
      if (!this._canceled) {
        void this.cancel();
      }
      throw error;
    }
    if (this._canceled) {
      throw new ConversionCanceledError();
    }
    await this.output.finalize();
    if (this._computeProgress) {
      const minTimestamp = Math.min(...this._maxTimestamps.values());
      this.onProgress?.(1, minTimestamp);
    }
  }
  /**
   * Cancels the conversion process, causing any ongoing `execute` call to throw a `ConversionCanceledError`.
   * Does nothing if the conversion is already complete.
   */
  async cancel() {
    if (this.output.state === "finalizing" || this.output.state === "finalized") {
      return;
    }
    if (this._canceled) {
      console.warn("Conversion already canceled.");
      return;
    }
    this._canceled = true;
    await this.output.cancel();
  }
  /** @internal */
  async _processVideoTrack(track, trackOptions, outputTrackId) {
    const sourceCodec = await track.getCodec();
    if (!sourceCodec) {
      this.discardedTracks.push({
        track,
        reason: "unknown_source_codec",
        trackOptions,
      });
      return;
    }
    let videoSource;
    const totalRotation = normalizeRotation(
      (await track.getRotation()) + (trackOptions.rotate ?? 0),
    );
    let outputTrackRotation = totalRotation;
    const canUseRotationMetadata =
      this.output.format.supportsVideoRotationMetadata &&
      (trackOptions.allowRotationMetadata ?? true);
    const squarePixelWidth = await track.getSquarePixelWidth();
    const squarePixelHeight = await track.getSquarePixelHeight();
    const [rotatedWidth, rotatedHeight] =
      totalRotation % 180 === 0
        ? [squarePixelWidth, squarePixelHeight]
        : [squarePixelHeight, squarePixelWidth];
    let crop = trackOptions.crop;
    if (crop) {
      crop = clampCropRectangle(crop, rotatedWidth, rotatedHeight);
    }
    const [originalWidth, originalHeight] = crop
      ? [crop.width, crop.height]
      : [rotatedWidth, rotatedHeight];
    let width = originalWidth;
    let height = originalHeight;
    const aspectRatio = width / height;
    if (trackOptions.width !== void 0 && trackOptions.height === void 0) {
      width = ceilToMultipleOfTwo(trackOptions.width);
      height = ceilToMultipleOfTwo(Math.round(width / aspectRatio));
    } else if (trackOptions.width === void 0 && trackOptions.height !== void 0) {
      height = ceilToMultipleOfTwo(trackOptions.height);
      width = ceilToMultipleOfTwo(Math.round(height * aspectRatio));
    } else if (trackOptions.width !== void 0 && trackOptions.height !== void 0) {
      width = ceilToMultipleOfTwo(trackOptions.width);
      height = ceilToMultipleOfTwo(trackOptions.height);
    }
    const firstTimestamp = await track.getFirstTimestamp();
    let videoCodecs = this.output.format.getSupportedVideoCodecs();
    const needsTranscode =
      !!trackOptions.forceTranscode ||
      firstTimestamp < this._startTimestamp ||
      !!trackOptions.frameRate ||
      trackOptions.keyFrameInterval !== void 0 ||
      trackOptions.process !== void 0 ||
      trackOptions.bitrate !== void 0 ||
      !videoCodecs.includes(sourceCodec) ||
      (trackOptions.codec && trackOptions.codec !== sourceCodec) ||
      width !== originalWidth ||
      height !== originalHeight ||
      (totalRotation !== 0 && !canUseRotationMetadata) ||
      !!crop;
    const alpha2 = trackOptions.alpha ?? "discard";
    if (!needsTranscode) {
      const source = new EncodedVideoPacketSource(sourceCodec);
      videoSource = source;
      this._trackPromises.push(
        (async () => {
          await this._started;
          const sink = new EncodedPacketSink(track);
          const decoderConfig = await track.getDecoderConfig();
          const meta2 = {
            decoderConfig: decoderConfig ?? void 0,
          };
          for await (const packet of sink.packets(void 0, void 0, {
            verifyKeyPackets: true,
          })) {
            if (this._canceled) {
              return;
            }
            if (packet.timestamp >= this._endTimestamp) {
              break;
            }
            const modifiedPacket = packet.clone({
              timestamp: packet.timestamp - this._startTimestamp,
              sideData: alpha2 === "discard" ? {} : packet.sideData,
            });
            assert$3(modifiedPacket.timestamp >= 0);
            this._reportProgress(outputTrackId, modifiedPacket.timestamp + modifiedPacket.duration);
            await source.add(modifiedPacket, meta2);
            if (this._synchronizer.shouldWait(outputTrackId, modifiedPacket.timestamp)) {
              await this._synchronizer.wait(modifiedPacket.timestamp);
            }
          }
          source.close();
          this._synchronizer.closeTrack(outputTrackId);
        })(),
      );
    } else {
      const canDecode = await track.canDecode();
      if (!canDecode) {
        this.discardedTracks.push({
          track,
          reason: "undecodable_source_codec",
          trackOptions,
        });
        return;
      }
      if (trackOptions.codec) {
        videoCodecs = videoCodecs.filter((codec) => codec === trackOptions.codec);
      }
      const bitrate = trackOptions.bitrate ?? QUALITY_HIGH;
      const encodableCodec = await getFirstEncodableVideoCodec(videoCodecs, {
        width:
          trackOptions.process && trackOptions.processedWidth ? trackOptions.processedWidth : width,
        height:
          trackOptions.process && trackOptions.processedHeight
            ? trackOptions.processedHeight
            : height,
        bitrate,
      });
      if (!encodableCodec) {
        this.discardedTracks.push({
          track,
          reason: "no_encodable_target_codec",
          trackOptions,
        });
        return;
      }
      const encodingConfig = {
        codec: encodableCodec,
        bitrate,
        keyFrameInterval: trackOptions.keyFrameInterval,
        sizeChangeBehavior: trackOptions.fit ?? "passThrough",
        alpha: alpha2,
        hardwareAcceleration: trackOptions.hardwareAcceleration,
      };
      const source = new VideoSampleSource(encodingConfig);
      videoSource = source;
      let needsRerender =
        width !== originalWidth ||
        height !== originalHeight ||
        (totalRotation !== 0 && (!canUseRotationMetadata || trackOptions.process !== void 0)) ||
        !!crop ||
        squarePixelWidth !== (await track.getCodedWidth()) ||
        squarePixelHeight !== (await track.getCodedHeight());
      if (!needsRerender) {
        const tempOutput = new Output({
          format: new Mp4OutputFormat(),
          // Supports all video codecs
          target: new NullTarget(),
        });
        const tempSource = new VideoSampleSource(encodingConfig);
        tempOutput.addVideoTrack(tempSource);
        await tempOutput.start();
        const sink = new VideoSampleSink(track);
        const firstSample = await sink.getSample(firstTimestamp);
        if (firstSample) {
          try {
            await tempSource.add(firstSample);
            firstSample.close();
            await tempOutput.finalize();
          } catch (error) {
            console.info(
              "Error when probing encoder support. Falling back to rerender path.",
              error,
            );
            needsRerender = true;
            void tempOutput.cancel();
          }
        } else {
          await tempOutput.cancel();
        }
      }
      if (needsRerender) {
        outputTrackRotation = 0;
        this._trackPromises.push(
          (async () => {
            await this._started;
            const sink = new CanvasSink(track, {
              width,
              height,
              fit: trackOptions.fit ?? "fill",
              rotation: totalRotation,
              // Bake the rotation into the output
              crop: trackOptions.crop,
              poolSize: 1,
              alpha: alpha2 === "keep",
            });
            const iterator = sink.canvases(this._startTimestamp, this._endTimestamp);
            const frameRate = trackOptions.frameRate;
            let lastCanvas = null;
            let lastCanvasTimestamp = null;
            let lastCanvasEndTimestamp = null;
            const padFrames = async (until) => {
              assert$3(lastCanvas);
              assert$3(frameRate !== void 0);
              const frameDifference = Math.round((until - lastCanvasTimestamp) * frameRate);
              for (let i2 = 1; i2 < frameDifference; i2++) {
                const sample = new VideoSample(lastCanvas, {
                  timestamp: lastCanvasTimestamp + i2 / frameRate,
                  duration: 1 / frameRate,
                });
                await this._registerVideoSample(trackOptions, outputTrackId, source, sample);
                sample.close();
              }
            };
            for await (const { canvas, timestamp: timestamp2, duration } of iterator) {
              if (this._canceled) {
                return;
              }
              let adjustedSampleTimestamp = Math.max(timestamp2 - this._startTimestamp, 0);
              lastCanvasEndTimestamp = adjustedSampleTimestamp + duration;
              if (frameRate !== void 0) {
                const alignedTimestamp = floorToDivisor(adjustedSampleTimestamp, frameRate);
                if (lastCanvas !== null) {
                  if (alignedTimestamp <= lastCanvasTimestamp) {
                    lastCanvas = canvas;
                    lastCanvasTimestamp = alignedTimestamp;
                    continue;
                  } else {
                    await padFrames(alignedTimestamp);
                  }
                }
                adjustedSampleTimestamp = alignedTimestamp;
              }
              const sample = new VideoSample(canvas, {
                timestamp: adjustedSampleTimestamp,
                duration: frameRate !== void 0 ? 1 / frameRate : duration,
              });
              await this._registerVideoSample(trackOptions, outputTrackId, source, sample);
              sample.close();
              if (frameRate !== void 0) {
                lastCanvas = canvas;
                lastCanvasTimestamp = adjustedSampleTimestamp;
              }
            }
            if (lastCanvas) {
              assert$3(lastCanvasEndTimestamp !== null);
              assert$3(frameRate !== void 0);
              await padFrames(floorToDivisor(lastCanvasEndTimestamp, frameRate));
            }
            source.close();
            this._synchronizer.closeTrack(outputTrackId);
          })(),
        );
      } else {
        this._trackPromises.push(
          (async () => {
            await this._started;
            const sink = new VideoSampleSink(track);
            const frameRate = trackOptions.frameRate;
            let lastSample = null;
            let lastSampleTimestamp = null;
            let lastSampleEndTimestamp = null;
            const padFrames = async (until) => {
              assert$3(lastSample);
              assert$3(frameRate !== void 0);
              const frameDifference = Math.round((until - lastSampleTimestamp) * frameRate);
              for (let i2 = 1; i2 < frameDifference; i2++) {
                lastSample.setTimestamp(lastSampleTimestamp + i2 / frameRate);
                lastSample.setDuration(1 / frameRate);
                await this._registerVideoSample(trackOptions, outputTrackId, source, lastSample);
              }
              lastSample.close();
            };
            for await (const sample of sink.samples(this._startTimestamp, this._endTimestamp)) {
              if (this._canceled) {
                sample.close();
                lastSample?.close();
                return;
              }
              let adjustedSampleTimestamp = Math.max(sample.timestamp - this._startTimestamp, 0);
              lastSampleEndTimestamp = adjustedSampleTimestamp + sample.duration;
              if (frameRate !== void 0) {
                const alignedTimestamp = floorToDivisor(adjustedSampleTimestamp, frameRate);
                if (lastSample !== null) {
                  if (alignedTimestamp <= lastSampleTimestamp) {
                    lastSample.close();
                    lastSample = sample;
                    lastSampleTimestamp = alignedTimestamp;
                    continue;
                  } else {
                    await padFrames(alignedTimestamp);
                  }
                }
                adjustedSampleTimestamp = alignedTimestamp;
                sample.setDuration(1 / frameRate);
              }
              sample.setTimestamp(adjustedSampleTimestamp);
              await this._registerVideoSample(trackOptions, outputTrackId, source, sample);
              if (frameRate !== void 0) {
                lastSample = sample;
                lastSampleTimestamp = adjustedSampleTimestamp;
              } else {
                sample.close();
              }
            }
            if (lastSample) {
              assert$3(lastSampleEndTimestamp !== null);
              assert$3(frameRate !== void 0);
              await padFrames(floorToDivisor(lastSampleEndTimestamp, frameRate));
            }
            source.close();
            this._synchronizer.closeTrack(outputTrackId);
          })(),
        );
      }
    }
    let ownGroup = null;
    if (!trackOptions.group) {
      ownGroup = new OutputTrackGroup();
    }
    const videoTrackLanguageCode = await track.getLanguageCode();
    this.output.addVideoTrack(videoSource, {
      frameRate: trackOptions.frameRate,
      // TODO: This condition can be removed when all demuxers properly homogenize to BCP47 in v2
      languageCode: isIso639Dash2LanguageCode(videoTrackLanguageCode)
        ? videoTrackLanguageCode
        : void 0,
      name: (await track.getName()) ?? void 0,
      disposition: await track.getDisposition(),
      rotation: outputTrackRotation,
      group: ownGroup ?? trackOptions.group,
    });
    this._addedCounts.video++;
    this._totalTrackCount++;
    this.utilizedTracks.push(track);
    this._outputTrackIds.push(outputTrackId);
    this._outputOwnTrackGroups.push(ownGroup);
  }
  /** @internal */
  async _registerVideoSample(trackOptions, outputTrackId, source, sample) {
    if (this._canceled) {
      return;
    }
    this._reportProgress(outputTrackId, sample.timestamp + sample.duration);
    let finalSamples;
    if (!trackOptions.process) {
      finalSamples = [sample];
    } else {
      let processed = trackOptions.process(sample);
      if (processed instanceof Promise) processed = await processed;
      if (!Array.isArray(processed)) {
        processed = processed === null ? [] : [processed];
      }
      finalSamples = processed.map((x2) => {
        if (x2 instanceof VideoSample) {
          return x2;
        }
        if (typeof VideoFrame !== "undefined" && x2 instanceof VideoFrame) {
          return new VideoSample(x2);
        }
        return new VideoSample(x2, {
          timestamp: sample.timestamp,
          duration: sample.duration,
        });
      });
    }
    try {
      for (const finalSample of finalSamples) {
        if (this._canceled) {
          break;
        }
        await source.add(finalSample);
        if (this._synchronizer.shouldWait(outputTrackId, finalSample.timestamp)) {
          await this._synchronizer.wait(finalSample.timestamp);
        }
      }
    } finally {
      for (const finalSample of finalSamples) {
        if (finalSample !== sample) {
          finalSample.close();
        }
      }
    }
  }
  /** @internal */
  async _processAudioTrack(track, trackOptions, outputTrackId) {
    const sourceCodec = await track.getCodec();
    if (!sourceCodec) {
      this.discardedTracks.push({
        track,
        reason: "unknown_source_codec",
        trackOptions,
      });
      return;
    }
    let audioSource;
    const originalNumberOfChannels = await track.getNumberOfChannels();
    const originalSampleRate = await track.getSampleRate();
    const firstTimestamp = await track.getFirstTimestamp();
    let numberOfChannels = trackOptions.numberOfChannels ?? originalNumberOfChannels;
    let sampleRate = trackOptions.sampleRate ?? originalSampleRate;
    let needsResample =
      numberOfChannels !== originalNumberOfChannels ||
      sampleRate !== originalSampleRate ||
      firstTimestamp < this._startTimestamp ||
      (firstTimestamp > this._startTimestamp && !this.output.format.supportsTimestampedMediaData);
    let audioCodecs = this.output.format.getSupportedAudioCodecs();
    if (
      !trackOptions.forceTranscode &&
      !trackOptions.bitrate &&
      !needsResample &&
      audioCodecs.includes(sourceCodec) &&
      (!trackOptions.codec || trackOptions.codec === sourceCodec) &&
      !trackOptions.process &&
      trackOptions.sampleFormat === void 0
    ) {
      const source = new EncodedAudioPacketSource(sourceCodec);
      audioSource = source;
      this._trackPromises.push(
        (async () => {
          await this._started;
          const sink = new EncodedPacketSink(track);
          const decoderConfig = await track.getDecoderConfig();
          const meta2 = {
            decoderConfig: decoderConfig ?? void 0,
          };
          for await (const packet of sink.packets()) {
            if (this._canceled) {
              return;
            }
            if (packet.timestamp >= this._endTimestamp) {
              break;
            }
            const modifiedPacket = packet.clone({
              timestamp: packet.timestamp - this._startTimestamp,
            });
            assert$3(modifiedPacket.timestamp >= 0);
            this._reportProgress(outputTrackId, modifiedPacket.timestamp + modifiedPacket.duration);
            await source.add(modifiedPacket, meta2);
            if (this._synchronizer.shouldWait(outputTrackId, modifiedPacket.timestamp)) {
              await this._synchronizer.wait(modifiedPacket.timestamp);
            }
          }
          source.close();
          this._synchronizer.closeTrack(outputTrackId);
        })(),
      );
    } else {
      const canDecode = await track.canDecode();
      if (!canDecode) {
        this.discardedTracks.push({
          track,
          reason: "undecodable_source_codec",
          trackOptions,
        });
        return;
      }
      let codecOfChoice = null;
      if (trackOptions.codec) {
        audioCodecs = audioCodecs.filter((codec) => codec === trackOptions.codec);
      }
      const bitrate = trackOptions.bitrate ?? QUALITY_HIGH;
      const encodableCodecs = await getEncodableAudioCodecs(audioCodecs, {
        numberOfChannels:
          trackOptions.process && trackOptions.processedNumberOfChannels
            ? trackOptions.processedNumberOfChannels
            : numberOfChannels,
        sampleRate:
          trackOptions.process && trackOptions.processedSampleRate
            ? trackOptions.processedSampleRate
            : sampleRate,
        bitrate,
      });
      if (
        !encodableCodecs.some((codec) => NON_PCM_AUDIO_CODECS.includes(codec)) &&
        audioCodecs.some((codec) => NON_PCM_AUDIO_CODECS.includes(codec)) &&
        (numberOfChannels !== FALLBACK_NUMBER_OF_CHANNELS || sampleRate !== FALLBACK_SAMPLE_RATE)
      ) {
        const encodableCodecsWithDefaultParams = await getEncodableAudioCodecs(audioCodecs, {
          numberOfChannels: FALLBACK_NUMBER_OF_CHANNELS,
          sampleRate: FALLBACK_SAMPLE_RATE,
          bitrate,
        });
        const nonPcmCodec = encodableCodecsWithDefaultParams.find((codec) =>
          NON_PCM_AUDIO_CODECS.includes(codec),
        );
        if (nonPcmCodec) {
          needsResample = true;
          codecOfChoice = nonPcmCodec;
          numberOfChannels = FALLBACK_NUMBER_OF_CHANNELS;
          sampleRate = FALLBACK_SAMPLE_RATE;
        }
      } else {
        codecOfChoice = encodableCodecs[0] ?? null;
      }
      if (codecOfChoice === null) {
        this.discardedTracks.push({
          track,
          reason: "no_encodable_target_codec",
          trackOptions,
        });
        return;
      }
      if (needsResample) {
        audioSource = this._resampleAudio(
          track,
          trackOptions,
          outputTrackId,
          codecOfChoice,
          numberOfChannels,
          sampleRate,
          bitrate,
        );
      } else {
        const source = new AudioSampleSource({
          codec: codecOfChoice,
          bitrate,
        });
        audioSource = source;
        this._trackPromises.push(
          (async () => {
            await this._started;
            const sink = new AudioSampleSink(track);
            for await (const sample of sink.samples(void 0, this._endTimestamp)) {
              if (this._canceled) {
                sample.close();
                return;
              }
              sample.setTimestamp(sample.timestamp - this._startTimestamp);
              await this._registerAudioSample(trackOptions, outputTrackId, source, sample);
              sample.close();
            }
            source.close();
            this._synchronizer.closeTrack(outputTrackId);
          })(),
        );
      }
    }
    let ownGroup = null;
    if (!trackOptions.group) {
      ownGroup = new OutputTrackGroup();
    }
    const audioTrackLanguageCode = await track.getLanguageCode();
    this.output.addAudioTrack(audioSource, {
      // TODO: This condition can be removed when all demuxers properly homogenize to BCP47 in v2
      languageCode: isIso639Dash2LanguageCode(audioTrackLanguageCode)
        ? audioTrackLanguageCode
        : void 0,
      name: (await track.getName()) ?? void 0,
      disposition: await track.getDisposition(),
      group: ownGroup ?? trackOptions.group,
    });
    this._addedCounts.audio++;
    this._totalTrackCount++;
    this.utilizedTracks.push(track);
    this._outputTrackIds.push(outputTrackId);
    this._outputOwnTrackGroups.push(ownGroup);
  }
  /** @internal */
  async _registerAudioSample(trackOptions, outputTrackId, source, inputSample) {
    if (this._canceled) {
      return;
    }
    let sample = inputSample;
    if (
      trackOptions.sampleFormat !== void 0 &&
      toInterleavedAudioFormat(sample.format) !== trackOptions.sampleFormat
    ) {
      sample = audioSampleToInterleavedFormat(sample, trackOptions.sampleFormat);
    }
    this._reportProgress(outputTrackId, sample.timestamp + sample.duration);
    let finalSamples;
    if (!trackOptions.process) {
      finalSamples = [sample];
    } else {
      let processed = trackOptions.process(sample);
      if (processed instanceof Promise) processed = await processed;
      if (!Array.isArray(processed)) {
        processed = processed === null ? [] : [processed];
      }
      if (!processed.every((x2) => x2 instanceof AudioSample)) {
        throw new TypeError(
          "The audio process function must return an AudioSample, null, or an array of AudioSamples.",
        );
      }
      finalSamples = processed;
    }
    try {
      for (const finalSample of finalSamples) {
        if (this._canceled) {
          break;
        }
        await source.add(finalSample);
        if (this._synchronizer.shouldWait(outputTrackId, finalSample.timestamp)) {
          await this._synchronizer.wait(finalSample.timestamp);
        }
      }
    } finally {
      if (sample !== inputSample) {
        sample.close();
      }
      for (const finalSample of finalSamples) {
        if (finalSample !== inputSample) {
          finalSample.close();
        }
      }
    }
  }
  /** @internal */
  _resampleAudio(
    track,
    trackOptions,
    outputTrackId,
    codec,
    targetNumberOfChannels,
    targetSampleRate,
    bitrate,
  ) {
    const source = new AudioSampleSource({
      codec,
      bitrate,
    });
    this._trackPromises.push(
      (async () => {
        await this._started;
        const resampler = new AudioResampler({
          targetNumberOfChannels,
          targetSampleRate,
          startTime: this._startTimestamp,
          endTime: this._endTimestamp,
          onSample: async (sample) => {
            assert$3(sample.timestamp >= this._startTimestamp);
            sample.setTimestamp(sample.timestamp - this._startTimestamp);
            await this._registerAudioSample(trackOptions, outputTrackId, source, sample);
            sample.close();
          },
        });
        const sink = new AudioSampleSink(track);
        const iterator = sink.samples(this._startTimestamp, this._endTimestamp);
        for await (const sample of iterator) {
          if (this._canceled) {
            sample.close();
            return;
          }
          await resampler.add(sample);
          sample.close();
        }
        await resampler.finalize();
        source.close();
        this._synchronizer.closeTrack(outputTrackId);
      })(),
    );
    return source;
  }
  /** @internal */
  _reportProgress(trackId, endTimestamp) {
    if (!this._computeProgress) {
      return;
    }
    assert$3(this._totalDuration !== null);
    this._maxTimestamps.set(trackId, Math.max(endTimestamp, this._maxTimestamps.get(trackId)));
    const minTimestamp = Math.min(...this._maxTimestamps.values());
    const newProgress = clamp$9(minTimestamp / this._totalDuration, 0, 1);
    if (newProgress !== this._lastProgress) {
      this._lastProgress = newProgress;
      this.onProgress?.(newProgress, minTimestamp);
    }
  }
}
