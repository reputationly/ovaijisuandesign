// agent-http-client.js
import {
  createStore$1,
  useStore$2,
  toast,
  makeLogger,
  readRecord,
  instance,
  emit$5,
  basename$8,
  uploadResponseFilename,
  useTranslation,
  isBrowserImageEditRequest,
  workspaceLog,
  browserImageEditPrompt,
  BROWSER_IMAGE_EDIT_EVENT,
} from "../vendor.js";
import reactExports from "react";
import {
  AssetMetadataStoreContext,
  withAutomaticDedupeId,
  normalizeGenerationFailurePresentation,
  normalizeGenerateErrorCode,
  DEFAULT_RUNTIME_CONFIG,
  headersToRecord,
  withWorkspaceGatewayHeaders,
  HILO_WORKSPACE_IDENTITY_HEADER,
  defaultLogger,
  API_PATHS,
  DEFAULT_READ_TIMEOUT_MS,
  nextCanvasWriterRevision,
  HILO_CANVAS_WRITER_REVISION_HEADER,
  advanceCanvasWriterRevision,
  measurePerf,
  PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP,
  DEFAULT_GENERATE_TIMEOUT_MS,
  DEFAULT_GENERATE_VIDEO_TIMEOUT_MS,
  isSafeIdentityRecoveryMethod,
  normalizeRecoveredBinding,
  HILO_WORKSPACE_IDENTITY_QUERY,
  HILO_WORKSPACE_INSTANCE_QUERY,
  HILO_WORKSPACE_GENERATION_QUERY,
  WorkspaceGatewayClient,
  isWorkspaceIdentityErrorCode,
  ApiError,
  LOG_TAG,
  getRuntimeConfig,
  HILO_DEFAULT_VERSION_CODE,
  HILO_APP_ID,
  normalizeVersionCodeForCloud,
  HILO_BIZ_ID,
  getOsName,
  getBrowserName,
  toCloudLang,
  getDeviceMemory,
  deriveActiveScope,
  setSelectedRequestGroupId,
  isBillableSubmission,
  deriveTeamCreditDisplay,
  dispatchAccountSubmissionBlocked,
  ACCOUNT_SENSITIVE_CANVAS_PATHS,
  AccountSubmissionBlockedError,
  GROUP_ID_HEADER,
  mediaLineageFields,
  isMediaLineageImage,
  mediaLineageRequestId,
  mediaFingerprintFile,
  MEDIA_LINEAGE_REQUEST_HEADER,
  mediaLineageError,
  probeMediaDurationSec,
  warnEnrollError,
  useGatewayBaseUrl,
  useGatewayScope,
  browserAssetSourceMetadata,
} from "./from-vendor.js";

export function createAssetMetadataStore() {
  return createStore$1((set, get) => ({
    assets: /* @__PURE__ */ new Map(),
    get: (assetId) => get().assets.get(assetId),
    set: (assetId, meta) =>
      set((state) => {
        const next = new Map(state.assets);
        next.set(assetId, meta);
        return {
          assets: next,
        };
      }),
    merge: (assetId, partial) =>
      set((state) => {
        const next = new Map(state.assets);
        const existing = next.get(assetId);
        if (!existing) {
          const missing = ["url", "name", "path", "type"].filter(
            (key) => partial[key] === void 0,
          );
          if (missing.length > 0) {
            console.warn(
              `[asset-metadata-store] merge: first write for ${assetId} missing required field(s): ${missing.join(", ")}`,
            );
          }
        }
        next.set(assetId, {
          ...(existing ?? {}),
          ...partial,
        });
        return {
          assets: next,
        };
      }),
    mergeAsset: (assetId, partial) =>
      set((state) => {
        const base = state.assets.get(assetId);
        if (!base) return state;
        const next = new Map(state.assets);
        next.set(assetId, {
          ...base,
          ...partial,
        });
        for (const [key, meta] of state.assets) {
          if (key === assetId) continue;
          if (meta.path !== base.path) continue;
          next.set(key, {
            ...meta,
            ...partial,
          });
        }
        return {
          assets: next,
        };
      }),
    setMany: (entries) =>
      set((state) => {
        const next = new Map(state.assets);
        for (const [id, meta] of entries) {
          next.set(id, meta);
        }
        return {
          assets: next,
        };
      }),
    replaceAll: (entries) =>
      set({
        assets: new Map(entries),
      }),
    clear: () =>
      set({
        assets: /* @__PURE__ */ new Map(),
      }),
  }));
}

export const defaultAssetMetadataStore = createAssetMetadataStore();

export function useAssetMetadataApi() {
  return (
    reactExports.useContext(AssetMetadataStoreContext) ??
    defaultAssetMetadataStore
  );
}

export const useAssetMetadataStore = (selector) =>
  useStore$2(useAssetMetadataApi(), selector);

useAssetMetadataStore.getState = defaultAssetMetadataStore.getState;

useAssetMetadataStore.setState = defaultAssetMetadataStore.setState;

useAssetMetadataStore.subscribe = defaultAssetMetadataStore.subscribe;

export const dedupedToast = (message, data) =>
  // `toast.message` follows Sonner's update-by-id path. The callable helper
  // uses a separate history path that can retain duplicate ids.
  toast.message(message, withAutomaticDedupeId("normal", message, data));

export const canvasLog = makeLogger("canvas");

export function generationResponseFromApiError(error) {
  if (error.type !== "http") return void 0;
  let parsedBody;
  try {
    parsedBody = readRecord(JSON.parse(error.body));
  } catch {
    parsedBody = void 0;
  }
  const directFailure = parsedBody?.ok === false ? parsedBody : void 0;
  const inferredPresentation =
    error.status >= 400 && error.status < 500 && error.status !== 408
      ? "terminal"
      : "status_unknown";
  const fallbackCode =
    error.status === 408
      ? "timeout"
      : error.status >= 500
        ? "backend_error"
        : "client_error";
  const message =
    (typeof directFailure?.error === "string" && directFailure.error) ||
    error.parsedError?.message ||
    error.body ||
    `Gateway HTTP ${error.status}`;
  const userMessage =
    (typeof directFailure?.user_message === "string" &&
      directFailure.user_message) ||
    error.parsedError?.user_message;
  const failurePresentation =
    normalizeGenerationFailurePresentation(
      directFailure?.failure_presentation,
    ) ?? inferredPresentation;
  return {
    ok: false,
    error: message,
    error_code: normalizeGenerateErrorCode(
      directFailure?.error_code,
      fallbackCode,
    ),
    failure_presentation: failurePresentation,
    ...(userMessage
      ? {
          user_message: userMessage,
        }
      : {}),
    ...(typeof directFailure?.recovery_handle === "string" &&
    directFailure.recovery_handle.length > 0
      ? {
          recovery_handle: directFailure.recovery_handle,
        }
      : {}),
    ...(typeof directFailure?.provider_task_id === "string" &&
    directFailure.provider_task_id.length > 0
      ? {
          provider_task_id: directFailure.provider_task_id,
        }
      : {}),
    ...(typeof directFailure?.cloud_trace_id === "string" &&
    directFailure.cloud_trace_id.length > 0
      ? {
          cloud_trace_id: directFailure.cloud_trace_id,
        }
      : {}),
  };
}

export class AgentHttpClient {
  baseUrl;
  headers;
  commonParams;
  fetch;
  beforeRequest;
  logger;
  workspaceClaim;
  workspaceBinding;
  workspaceClient;
  recoverWorkspace;
  constructor(options = {}) {
    this.workspaceBinding = options.workspaceBinding;
    this.baseUrl = (
      options.workspaceBinding?.baseUrl ??
      options.baseUrl ??
      DEFAULT_RUNTIME_CONFIG.gatewayUrl
    ).replace(/\/$/, "");
    this.workspaceClaim =
      options.workspaceBinding?.claim ?? options.workspaceClaim;
    this.headers = options.workspaceBinding
      ? headersToRecord(
          withWorkspaceGatewayHeaders(
            options.workspaceBinding,
            options.headers,
          ),
        )
      : {
          ...(options.headers ?? {}),
          ...(this.workspaceClaim
            ? {
                [HILO_WORKSPACE_IDENTITY_HEADER]: this.workspaceClaim,
              }
            : {}),
        };
    this.commonParams = options.commonParams;
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.beforeRequest = options.beforeRequest;
    this.logger = options.logger ?? defaultLogger;
    this.recoverWorkspace = options.recoverWorkspace;
    this.workspaceClient = this.workspaceBinding
      ? this.createWorkspaceGatewayClient(this.workspaceBinding)
      : void 0;
  }
  // --------------------------------------------------------
  // URL helpers
  // --------------------------------------------------------
  url(path) {
    const url = path.includes("://") ? path : `${this.baseUrl}${path}`;
    return this.appendCommonParams(url);
  }
  urlWithParams(path, params) {
    const base = path.includes("://") ? path : `${this.baseUrl}${path}`;
    if (!params) return this.appendCommonParams(base);
    const filtered = Object.entries(params).filter(([, value]) => value !== void 0);
    if (filtered.length === 0) return this.appendCommonParams(base);
    const qs = new URLSearchParams(filtered).toString();
    return this.appendCommonParams(`${base}?${qs}`);
  }
  appendCommonParams(url) {
    const params =
      typeof this.commonParams === "function"
        ? this.commonParams()
        : this.commonParams;
    if (!params) return url;
    const parsed = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      if (value !== void 0 && value !== "") {
        parsed.searchParams.set(key, String(value));
      }
    }
    return parsed.toString();
  }
  // --------------------------------------------------------
  // File operations
  // --------------------------------------------------------
  async listFiles(params, opts) {
    const url = this.urlWithParams(API_PATHS.files, {
      type: params?.type,
      sort: params?.sort,
    });
    return this.get(url, opts);
  }
  async mkdir(req, opts) {
    return this.post(API_PATHS.mkdir, req, opts);
  }
  async rename(req, opts) {
    return this.post(API_PATHS.rename, req, opts);
  }
  async forkRename(req, opts) {
    return this.post(API_PATHS.forkRename, req, opts);
  }
  async move(req, opts) {
    return this.post(API_PATHS.move, req, opts);
  }
  async copy(req, opts) {
    return this.post(API_PATHS.copy, req, opts);
  }
  async deleteFiles(req, opts) {
    return this.post(API_PATHS.deleteFiles, req, opts);
  }
  async upload(file, filename, folder, opts) {
    const form = new FormData();
    form.append("file", file, filename);
    if (folder) form.append("folder", folder);
    if (opts?.staging) form.append("staging", "true");
    const url = this.url(API_PATHS.upload);
    const signal = this.combineSignals(
      opts?.signal,
      opts?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
    );
    const resp = await this.request(url, {
      method: "POST",
      headers: {
        ...this.headers,
        ...opts?.headers,
      },
      body: form,
      signal,
    });
    return this.handleResponse(resp, url, "POST");
  }
  /** Persist a shallow metadata patch on an enrolled workspace asset. */
  async updateAssetMetadata(id, patch, opts) {
    return this.patch(
      `/api/assets/${encodeURIComponent(id)}/metadata`,
      {
        patch,
      },
      opts,
    );
  }
  /**
   * Delete staged uploads from `.hilo/.tmp/uploads/`. Best-effort cleanup for
   * transient files uploaded with `{ staging: true }` that are no longer
   * needed (e.g. grid-split HD source tiles after super-resolution completes).
   */
  async deleteStagedFiles(paths, opts) {
    return this.post(
      API_PATHS.uploadStagingDelete,
      {
        paths,
      },
      opts,
    );
  }
  fileUrl(relativePath) {
    return this.appendWorkspaceClaim(
      `${this.baseUrl}${API_PATHS.serveFile(relativePath)}`,
    );
  }
  fileUrlById(assetId) {
    return this.appendWorkspaceClaim(
      `${this.baseUrl}${API_PATHS.serveFileById(assetId)}`,
    );
  }
  async writeContent(path, content, opts) {
    const { unique, ...reqOpts } = opts ?? {};
    return this.put(
      API_PATHS.writeContent,
      unique
        ? {
            path,
            content,
            unique: true,
          }
        : {
            path,
            content,
          },
      reqOpts,
    );
  }
  /**
   * Create a fresh `.md` text asset in the workspace root.
   *
   * The gateway derives the filename from the first line of `content` (sanitised
   * + truncated, with `-N` suffix on collision; falls back to a timestamp when
   * `content` yields no usable seed). Always produces a new `assetId`; never
   * overwrites an existing file.
   *
   * Primary call site is the canvas paste handler — see ADR write-up in
   * `CreateTextAssetRequest` for the design tradeoff.
   */
  async createTextAsset(content, opts) {
    const req = {
      content,
    };
    return this.post(API_PATHS.createTextAsset, req, opts);
  }
  async readContent(path, opts) {
    const res = await this.get(API_PATHS.readContent(path), opts);
    return res.content;
  }
  // --------------------------------------------------------
  // Text document versions (named snapshots)
  //
  // Note the absence of a content field on save: the gateway snapshots the
  // document off disk, so saving a 15 MB file costs a few hundred bytes of
  // request body instead of a second full upload.
  // --------------------------------------------------------
  async listTextVersions(ref, opts) {
    const query = new URLSearchParams();
    if (ref.assetId) query.set("assetId", ref.assetId);
    if (ref.path) query.set("path", ref.path);
    return this.get(`${API_PATHS.textVersions}?${query.toString()}`, opts);
  }
  async saveTextVersion(req, opts) {
    return this.post(API_PATHS.textVersions, req, opts);
  }
  async readTextVersionContent(id, range, opts) {
    return this.get(
      API_PATHS.textVersionContent(id, range?.offset ?? 0, range?.limit),
      opts,
    );
  }
  async diffTextVersion(params, opts) {
    return this.get(API_PATHS.textVersionDiff(params), opts);
  }
  async restoreTextVersion(id, body = {}, opts) {
    return this.post(API_PATHS.textVersionRestore(id), body, opts);
  }
  async materializeTextVersion(id, opts) {
    return this.post(API_PATHS.textVersionMaterialize(id), {}, opts);
  }
  async summarizeTextVersionNote(req, opts) {
    return this.post(API_PATHS.textVersionSummarize, req, opts);
  }
  async updateTextVersion(id, patch, opts) {
    return this.patch(API_PATHS.textVersion(id), patch, opts);
  }
  async deleteTextVersion(id, opts) {
    return this.del(API_PATHS.textVersion(id), opts);
  }
  thumbnailUrl(relativePath) {
    return this.appendWorkspaceClaim(
      `${this.baseUrl}${API_PATHS.thumbnail(relativePath)}`,
    );
  }
  // --------------------------------------------------------
  // Assets
  // --------------------------------------------------------
  async getAssets(folder, opts) {
    return this.get(API_PATHS.assets(folder), opts);
  }
  async getAllAssets(opts) {
    return this.get(API_PATHS.allAssets, opts);
  }
  // --------------------------------------------------------
  // Canvas
  // --------------------------------------------------------
  async getCanvas(opts) {
    return this.get(API_PATHS.canvas, opts);
  }
  async saveCanvas(canvas, saveOptions, opts) {
    const start = performance.now();
    try {
      const writerRevision = this.workspaceBinding
        ? nextCanvasWriterRevision(this.workspaceBinding)
        : void 0;
      const body = saveOptions?.deletionIntent
        ? {
            ...canvas,
            deletionIntent: saveOptions.deletionIntent,
          }
        : canvas;
      const saveAtRevision = (revision) =>
        this.post(API_PATHS.canvas, body, {
          ...opts,
          headers: {
            ...opts?.headers,
            ...(revision !== void 0
              ? {
                  [HILO_CANVAS_WRITER_REVISION_HEADER]: String(revision),
                }
              : {}),
          },
        });
      const result = await saveAtRevision(writerRevision);
      if (this.workspaceBinding) {
        advanceCanvasWriterRevision(this.workspaceBinding, result.revision);
      }
      measurePerf(PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP, start, {
        nodes: canvas.nodes?.length ?? 0,
        edges: canvas.edges?.length ?? 0,
        mode: canvas.mode,
      });
      return result;
    } catch (err) {
      measurePerf(PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP, start, {
        nodes: canvas.nodes?.length ?? 0,
        edges: canvas.edges?.length ?? 0,
        mode: canvas.mode,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
  async reportCanvasRecovery(report) {
    await this.post(API_PATHS.canvasRecovery, report);
  }
  async addCanvasNode(req, opts) {
    return this.post(API_PATHS.addCanvasNode, req, opts);
  }
  // --------------------------------------------------------
  // Generation (default: 10 min; video: 21 min to cover async poll window)
  // --------------------------------------------------------
  async listModels(opts) {
    return this.get(API_PATHS.models, opts);
  }
  async listImageModels(opts) {
    return this.get(API_PATHS.imageModels, opts);
  }
  async listVideoModels(opts) {
    return this.get(API_PATHS.videoModels, opts);
  }
  async listSpeechModels(opts) {
    return this.get(API_PATHS.speechModels, opts);
  }
  async listMusicModels(opts) {
    return this.get(API_PATHS.musicModels, opts);
  }
  async listSpeechVoices(opts) {
    return this.get(API_PATHS.speechVoices, opts);
  }
  /**
   * POST /api/speech/voice_design — design a brand-new voice from a text
   * description plus a preview_text. Cloud gateway returns the new
   * voice_id and a CDN URL for the trial audio; the local gateway then
   * downloads the audio into the workspace and registers it as an asset
   * so the canvas surfaces a new voice-design node automatically.
   *
   * `source_node_id` (optional) — when set, the gateway adds a placeholder
   * node beside it for the duration of the call so the user gets immediate
   * visual feedback during the 5-30s upstream call.
   *
   * Default timeout matches generation endpoints — voice_design typically
   * completes in 5-30s but the upstream can occasionally take longer.
   */
  async designVoice(req, opts) {
    return this.post(API_PATHS.speechVoiceDesign, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async generateImage(req, opts) {
    return this.postGeneration(API_PATHS.generateImage, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async generateVideo(req, opts) {
    return this.postGeneration(API_PATHS.generateVideo, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_VIDEO_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async generateSpeech(req, opts) {
    return this.postGeneration(API_PATHS.generateSpeech, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async generateMusic(req, opts) {
    return this.postGeneration(API_PATHS.generateMusic, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async generateText(req, opts) {
    return this.postGeneration(API_PATHS.generateText, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  // --------------------------------------------------------
  // Editing (longer default timeout: 10 min)
  // --------------------------------------------------------
  async concatenateVideos(req, opts) {
    return this.post(API_PATHS.concatenateVideos, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async embedAudio(req, opts) {
    return this.post(API_PATHS.embedAudio, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async extractAudio(req, opts) {
    return this.post(API_PATHS.extractAudio, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async voiceIsolation(req, opts) {
    return this.post(API_PATHS.voiceIsolation, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async lipSync(req, opts) {
    return this.post(API_PATHS.lipSync, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async asr(req, opts) {
    return this.post(API_PATHS.asr, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  // --------------------------------------------------------
  // Nano-banana 2 image edits (sync — same timeout as generation)
  // --------------------------------------------------------
  /**
   * Image quality enhancement via 火山引擎 MediaKit (provider `mediakit_enhance`).
   * Same sync timeout window as the banana edits — the gateway uploads the
   * source image to CDN, calls the cloud sync enhance endpoint, and downloads
   * the upgraded image back into the workspace before resolving.
   */
  async enhanceImageMediaKit(req, opts) {
    return this.post(API_PATHS.enhanceImageMediaKit, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async eraseBanana(req, opts) {
    return this.post(API_PATHS.eraseBanana, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async redrawBanana(req, opts) {
    return this.post(API_PATHS.redrawBanana, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async outpaintBanana(req, opts) {
    return this.post(API_PATHS.outpaintBanana, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async moveObjectBanana(req, opts) {
    return this.post(API_PATHS.moveObjectBanana, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async removeBackground(req, opts) {
    return this.post(API_PATHS.removeBackground, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async layerDecompose(req, opts) {
    return this.post(API_PATHS.layerDecompose, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  // --------------------------------------------------------
  // MediaKit AI video enhancement (resolution upscale + frame interpolation)
  //
  // The cloud round-trip submits a job, polls the task, and downloads the
  // result file into the workspace — the timeout reflects the worst-case
  // upscale + interpolation pipeline (4K + 60fps).
  // --------------------------------------------------------
  async enhanceVideoMediaKit(req, opts) {
    return this.post(API_PATHS.enhanceVideoMediaKit, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  async hailuo03VideoSuperResolution(req, opts) {
    return this.post(API_PATHS.hailuo03VideoSuperResolution, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  // --------------------------------------------------------
  // MediaKit subtitle/text erasure (OCR detect + AIGC restore)
  //
  // Shares the upload + poll + download pipeline with enhance-video; the
  // gateway-side service round-trips to the cloud MediaKit erase-video-subtitle
  // endpoint. Same long timeout window as enhance (cloud job runs 30-90s+
  // depending on duration / resolution).
  // --------------------------------------------------------
  async eraseSubtitleMediaKit(req, opts) {
    return this.post(API_PATHS.eraseSubtitleMediaKit, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  // --------------------------------------------------------
  // MediaKit ASR subtitle generation (audio -> text + timestamps -> SRT file)
  //
  // Same long timeout window as enhance / erase-subtitle (cloud round-trip
  // 30-180s depending on duration). Output is an SRT file (file asset)
  // landing on the canvas via WS placeholder lifecycle.
  // --------------------------------------------------------
  async asrMediaKit(req, opts) {
    return this.post(API_PATHS.asrMediaKit, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  // --------------------------------------------------------
  // Whisper ASR subtitle generation — for non-zh/en languages.
  //
  // Same shape as asrMediaKit but goes through the cloud
  // /api/v1/audio/asr endpoint, where GetASRClient routes
  // non-Tencent-whitelist languages to WhisperASR. Output is
  // an SRT file landing via WS placeholder lifecycle.
  // --------------------------------------------------------
  async asrWhisper(req, opts) {
    return this.post(API_PATHS.asrWhisper, req, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_GENERATE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: opts?.headers,
    });
  }
  // --------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------
  combineSignals(userSignal, timeoutMs) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    return userSignal
      ? AbortSignal.any([userSignal, timeoutSignal])
      : timeoutSignal;
  }
  /**
   * Wrapper around fetch that classifies errors and logs them.
   * All fetch calls go through here so network/timeout/abort errors
   * are consistently reported.
   */
  async request(
    url,
    init,
    allowWorkspaceRecovery = true,
    applyDispatchAdmission = true,
  ) {
    if (applyDispatchAdmission) {
      await this.beforeRequest?.(url, init);
    }
    try {
      const activeWorkspaceClient = this.workspaceClient;
      const response = activeWorkspaceClient
        ? await activeWorkspaceClient.request(url, init)
        : await this.fetch(url, init);
      if (activeWorkspaceClient) {
        this.applyWorkspaceBinding(activeWorkspaceClient.binding);
      }
      if (
        !activeWorkspaceClient &&
        allowWorkspaceRecovery &&
        this.recoverWorkspace &&
        isSafeIdentityRecoveryMethod(init.method) &&
        (await this.isWorkspaceIdentityError(response))
      ) {
        const recovered = await this.recoverWorkspace();
        if (recovered) {
          const recoveredBinding = normalizeRecoveredBinding(recovered);
          const nextBaseUrl = recoveredBinding.baseUrl.replace(/\/$/, "");
          const previous = new URL(url);
          previous.searchParams.delete(HILO_WORKSPACE_IDENTITY_QUERY);
          previous.searchParams.delete(HILO_WORKSPACE_INSTANCE_QUERY);
          previous.searchParams.delete(HILO_WORKSPACE_GENERATION_QUERY);
          this.baseUrl = nextBaseUrl;
          this.workspaceClaim = recoveredBinding.claim;
          this.workspaceBinding = recoveredBinding.binding;
          this.headers = recoveredBinding.binding
            ? headersToRecord(
                withWorkspaceGatewayHeaders(
                  recoveredBinding.binding,
                  this.headers,
                ),
              )
            : {
                ...this.headers,
                [HILO_WORKSPACE_IDENTITY_HEADER]: recoveredBinding.claim,
              };
          const retryHeaders = recoveredBinding.binding
            ? withWorkspaceGatewayHeaders(
                recoveredBinding.binding,
                init.headers,
              )
            : new Headers(init.headers);
          if (!recoveredBinding.binding) {
            retryHeaders.set(
              HILO_WORKSPACE_IDENTITY_HEADER,
              recoveredBinding.claim,
            );
          }
          const retryUrl = this.appendWorkspaceClaim(
            `${nextBaseUrl}${previous.pathname}${previous.search}${previous.hash}`,
          );
          const retryResponse = await this.request(
            retryUrl,
            {
              ...init,
              headers: retryHeaders,
            },
            false,
            false,
          );
          if (recoveredBinding.binding) {
            this.workspaceClient = this.createWorkspaceGatewayClient(
              recoveredBinding.binding,
            );
          }
          return retryResponse;
        }
      }
      return response;
    } catch (err) {
      throw this.classifyAndLogFetchError(err, url, init.method ?? "GET");
    }
  }
  appendWorkspaceClaim(url) {
    if (!this.workspaceClaim) return url;
    const parsed = new URL(url);
    parsed.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, this.workspaceClaim);
    if (this.workspaceBinding) {
      parsed.searchParams.set(
        HILO_WORKSPACE_INSTANCE_QUERY,
        this.workspaceBinding.instanceId,
      );
      parsed.searchParams.set(
        HILO_WORKSPACE_GENERATION_QUERY,
        String(this.workspaceBinding.generation),
      );
    }
    return parsed.toString();
  }
  createWorkspaceGatewayClient(binding) {
    return new WorkspaceGatewayClient({
      binding,
      fetch: this.fetch,
      recoverWorkspace: this.recoverWorkspace
        ? async () => {
            const recovered = await this.recoverWorkspace?.();
            return recovered && "claim" in recovered ? recovered : void 0;
          }
        : void 0,
    });
  }
  applyWorkspaceBinding(binding) {
    this.workspaceBinding = binding;
    this.workspaceClaim = binding.claim;
    this.baseUrl = binding.baseUrl.replace(/\/$/, "");
    this.headers = headersToRecord(
      withWorkspaceGatewayHeaders(binding, this.headers),
    );
  }
  async isWorkspaceIdentityError(response) {
    if (response.status !== 409 && response.status !== 428) return false;
    try {
      const body = await response.clone().json();
      return isWorkspaceIdentityErrorCode(body.code);
    } catch {
      return false;
    }
  }
  async get(path, opts) {
    const url = this.url(path);
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS;
    const resp = await this.request(url, {
      method: "GET",
      headers: {
        ...this.headers,
        ...opts?.headers,
      },
      signal: this.combineSignals(opts?.signal, timeoutMs),
    });
    return this.handleResponse(resp, url, "GET");
  }
  async post(path, body, opts) {
    const url = this.url(path);
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS;
    const resp = await this.request(url, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
        ...opts?.headers,
      },
      body: JSON.stringify(body),
      signal: this.combineSignals(opts?.signal, timeoutMs),
    });
    return this.handleResponse(resp, url, "POST");
  }
  async postGeneration(path, body, opts) {
    try {
      return await this.post(path, body, opts);
    } catch (error) {
      if (error instanceof ApiError) {
        const response = generationResponseFromApiError(error);
        if (response) return response;
      }
      throw error;
    }
  }
  async put(path, body, opts) {
    const url = this.url(path);
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS;
    const resp = await this.request(url, {
      method: "PUT",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
        ...opts?.headers,
      },
      body: JSON.stringify(body),
      signal: this.combineSignals(opts?.signal, timeoutMs),
    });
    return this.handleResponse(resp, url, "PUT");
  }
  async patch(path, body, opts) {
    const url = this.url(path);
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS;
    const resp = await this.request(url, {
      method: "PATCH",
      headers: {
        ...this.headers,
        "Content-Type": "application/json",
        ...opts?.headers,
      },
      body: JSON.stringify(body),
      signal: this.combineSignals(opts?.signal, timeoutMs),
    });
    return this.handleResponse(resp, url, "PATCH");
  }
  async del(path, opts) {
    const url = this.url(path);
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS;
    const resp = await this.request(url, {
      method: "DELETE",
      headers: {
        ...this.headers,
        ...opts?.headers,
      },
      signal: this.combineSignals(opts?.signal, timeoutMs),
    });
    return this.handleResponse(resp, url, "DELETE");
  }
  async handleResponse(resp, url, method) {
    const text = await resp.text().catch(() => resp.statusText);
    if (!resp.ok) {
      const error = new ApiError(resp.status, text, url, method, "http");
      if (resp.status >= 500) {
        this.logger.error(
          `${LOG_TAG} ${method} ${url} -> ${resp.status} ${text.slice(0, 200)}`,
        );
      } else {
        this.logger.warn(
          `${LOG_TAG} ${method} ${url} -> ${resp.status} ${text.slice(0, 200)}`,
        );
      }
      throw error;
    }
    if (!text || text.trim().length === 0) {
      if (resp.status === 204 || resp.status === 205) {
        return void 0;
      }
      const error = new ApiError(
        resp.status,
        "Invalid JSON response: empty body",
        url,
        method,
        "parse",
      );
      this.logger.error(
        `${LOG_TAG} ${method} ${url} -> parse error: empty body`,
      );
      throw error;
    }
    try {
      return JSON.parse(text);
    } catch {
      const error = new ApiError(
        resp.status,
        `Invalid JSON response: ${text.slice(0, 200)}`,
        url,
        method,
        "parse",
      );
      this.logger.error(
        `${LOG_TAG} ${method} ${url} -> parse error: ${text.slice(0, 200)}`,
      );
      throw error;
    }
  }
  /**
   * Classify a raw fetch error into ApiErrorType, log it, and wrap in ApiError.
   *
   * | Raw error              | Type      | Log level |
   * |------------------------|-----------|-----------|
   * | TypeError              | network   | error     |
   * | DOMException Timeout   | timeout   | warn      |
   * | DOMException Abort     | abort     | (silent)  |
   * | Other                  | network   | error     |
   */
  classifyAndLogFetchError(err, url, method) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      this.logger.warn(`${LOG_TAG} ${method} ${url} -> timeout`);
      return new ApiError(
        0,
        `Request timeout: ${err.message}`,
        url,
        method,
        "timeout",
      );
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return new ApiError(
        0,
        `Request aborted: ${err.message}`,
        url,
        method,
        "abort",
      );
    }
    if (err instanceof TypeError) {
      this.logger.error(
        `${LOG_TAG} ${method} ${url} -> network error: ${err.message}`,
      );
      return new ApiError(0, err.message, url, method, "network");
    }
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(
      `${LOG_TAG} ${method} ${url} -> unknown error: ${message}`,
    );
    return new ApiError(0, message, url, method, "network");
  }
}

export function buildRendererCommonParams() {
  const cfg = getRuntimeConfig();
  const deviceId = cfg.deviceId?.trim();
  const rawVersionCode = cfg.appVersion?.trim() || HILO_DEFAULT_VERSION_CODE;
  const params = {
    device_platform: "desktop",
    app_id: HILO_APP_ID,
    version_code: normalizeVersionCodeForCloud(rawVersionCode),
    biz_id: HILO_BIZ_ID,
    unix: Date.now(),
    os_name: getOsName(),
    browser_name: getBrowserName(),
    browser_language: navigator.language,
    browser_platform: navigator.platform,
    screen_width: screen.width,
    screen_height: screen.height,
  };
  const lang = toCloudLang(instance.language) || cfg.locale;
  if (lang) {
    params.lang = lang;
  }
  const deviceMemory = getDeviceMemory(cfg.totalMemoryMb);
  if (deviceMemory !== void 0) {
    params.device_memory = deviceMemory;
  }
  const cpuCoreNum = navigator.hardwareConcurrency || cfg.cpuCount;
  if (cpuCoreNum !== void 0) {
    params.cpu_core_num = cpuCoreNum;
  }
  if (deviceId) {
    params.uuid = deviceId;
    params.device_id = deviceId;
  }
  return params;
}

export let state = {
  integrationActivated: false,
  snapshot: null,
  contract: null,
  creditSummary: null,
};

export function activateAccountSubmissionGuard() {
  if (state.integrationActivated) return;
  state = {
    ...state,
    integrationActivated: true,
  };
  emit$5();
}

export function updateAccountSubmissionDecision(
  snapshot,
  contract,
  creditSummary = null,
) {
  const selectedScope =
    snapshot?.status === "ready" ? deriveActiveScope(snapshot) : null;
  const incomingSummaryMatches =
    selectedScope !== null &&
    creditSummary !== null &&
    creditSummary.groupId === selectedScope.groupId;
  const effectiveCreditSummary = incomingSummaryMatches ? creditSummary : null;
  state = {
    ...state,
    snapshot,
    contract,
    creditSummary: effectiveCreditSummary,
  };
  setSelectedRequestGroupId(selectedScope?.groupId ?? null);
  emit$5();
}

export function evaluateAccountSubmission(kind) {
  if (!state.integrationActivated)
    return {
      allowed: true,
      mode: "LEGACY_PERSONAL",
    };
  const { snapshot, contract } = state;
  if (!snapshot)
    return {
      allowed: false,
      reasonCode: "canonical_context_pending",
    };
  if (snapshot.status !== "ready") {
    return {
      allowed: false,
      reasonCode: `canonical_context_${snapshot.status}`,
    };
  }
  const scope = deriveActiveScope(snapshot);
  if (!scope)
    return {
      allowed: false,
      reasonCode: "canonical_scope_missing",
    };
  if (snapshot.activeContext.accountType === "PERSONAL") {
    if (kind === "team_checkout") {
      return {
        allowed: false,
        reasonCode: "team_checkout_requires_team_context",
      };
    }
    if (kind === "team_credit_transfer") {
      return {
        allowed: false,
        reasonCode: "team_checkout_requires_team_context",
      };
    }
    return {
      allowed: true,
      mode: "CANONICAL",
      sequence: snapshot.sequence,
      scope,
    };
  }
  if (kind === "personal_checkout" || kind === "personal_credit_mutation") {
    return {
      allowed: false,
      reasonCode: "personal_checkout_requires_personal_context",
    };
  }
  if (!contract)
    return {
      allowed: false,
      reasonCode: "team_contract_unavailable",
    };
  if (contract.compatibility === "UPGRADE_REQUIRED") {
    return {
      allowed: false,
      reasonCode: "upgrade_required",
    };
  }
  if (contract.compatibility !== "SUPPORTED") {
    return {
      allowed: false,
      reasonCode: "team_temporarily_unavailable",
    };
  }
  if (!contract.gates.teamRead)
    return {
      allowed: false,
      reasonCode: "team_read_disabled",
    };
  if (!contract.gates.teamBilling) {
    return {
      allowed: false,
      reasonCode: "team_billing_disabled",
    };
  }
  if (
    isBillableSubmission(kind) &&
    state.creditSummary?.groupId === scope.groupId
  ) {
    const credit = deriveTeamCreditDisplay(state.creditSummary);
    if (credit.status === "READY") {
      if (credit.mode === "LIMITED" && credit.memberRemaining === "0") {
        return {
          allowed: false,
          reasonCode: "quota_insufficient",
        };
      }
      if (credit.teamRemaining === "0") {
        return {
          allowed: false,
          reasonCode: "team_balance_insufficient",
        };
      }
    }
  }
  return {
    allowed: true,
    mode: "CANONICAL",
    sequence: snapshot.sequence,
    scope,
  };
}

export function guardAccountSubmission(kind) {
  const decision = evaluateAccountSubmission(kind);
  if (!decision.allowed) {
    dispatchAccountSubmissionBlocked({
      kind,
      reasonCode: decision.reasonCode,
    });
  }
  return decision;
}

export function guardCanvasAccountRequest(url, init) {
  if ((init.method ?? "GET").toUpperCase() !== "POST") return;
  const pathname = new URL(url, window.location.origin).pathname;
  if (!ACCOUNT_SENSITIVE_CANVAS_PATHS.has(pathname)) return;
  const decision = guardAccountSubmission("canvas");
  if (!decision.allowed)
    throw new AccountSubmissionBlockedError(decision.reasonCode);
  if (decision.mode === "CANONICAL") {
    const headers = new Headers(init.headers);
    headers.set(GROUP_ID_HEADER, decision.scope.groupId);
    init.headers = headers;
  }
}

export function logMediaLineage(record) {
  try {
    const fields = mediaLineageFields(record);
    if (record.errorKind) canvasLog.warn("media-lineage", fields);
    else canvasLog.info("media-lineage", fields);
  } catch {}
}

export async function observeClientMediaUpload(
  file,
  filename,
  source,
  operation,
) {
  if (!isMediaLineageImage(filename, file.type)) return operation();
  const requestId = mediaLineageRequestId();
  logMediaLineage({
    stage: "upload.selected",
    requestId,
    source: source ?? "unknown",
    filename,
    declaredMime: file.type,
    input: await mediaFingerprintFile(file),
  });
  try {
    const result = await operation(
      requestId
        ? {
            [MEDIA_LINEAGE_REQUEST_HEADER]: requestId,
          }
        : void 0,
    );
    logMediaLineage({
      stage: "upload.bound",
      requestId,
      assetId: result.id,
      filename,
      path: result.relative,
    });
    return result;
  } catch (error) {
    logMediaLineage({
      stage: "upload.client-failed",
      requestId,
      filename,
      ...mediaLineageError(error),
    });
    throw error;
  }
}

export function createAssetMutator({
  httpClient,
  assetMetadataStore,
  probeDurationSec = probeMediaDurationSec,
  inferKind,
}) {
  const store = assetMetadataStore ?? useAssetMetadataStore;
  const mirror = (assetId, partial) => {
    store.getState().merge(assetId, partial);
  };
  return {
    async writeText(path, content, opts) {
      const res = await httpClient.writeContent(path, content, opts);
      warnEnrollError("writeText", res);
      if (res.assetId) {
        mirror(res.assetId, {
          type: "text",
          path: res.path,
          name: basename$8(res.path),
          url: httpClient.fileUrlById(res.assetId),
        });
      }
      return res;
    },
    async createTextAsset(content, opts) {
      const res = await httpClient.createTextAsset(content, opts);
      warnEnrollError("createTextAsset", res);
      const fileName = basename$8(res.path);
      mirror(res.assetId, {
        type: "text",
        path: res.path,
        name: fileName,
        url: httpClient.fileUrlById(res.assetId),
      });
      return {
        assetId: res.assetId,
        path: res.path,
        name: fileName,
      };
    },
    async upload(file, fileName, kind, opts) {
      const filename = fileName ?? file.name;
      const durationPromise = probeDurationSec(file).catch(() => 0);
      const res = await observeClientMediaUpload(
        file,
        filename,
        opts?.source,
        (headers) =>
          httpClient.upload(file, filename, void 0, {
            staging: opts?.staging,
            ...(headers
              ? {
                  headers,
                }
              : {}),
          }),
      );
      const durationSec = await durationPromise;
      warnEnrollError("upload", res);
      if (res.id) {
        const resolvedKind = kind ?? inferKind?.(file) ?? "file";
        const serverDurationSec =
          typeof res.durationMs === "number" && res.durationMs > 0
            ? res.durationMs / 1e3
            : 0;
        mirror(res.id, {
          type: resolvedKind,
          path: res.relative,
          name: uploadResponseFilename(res, filename),
          url: httpClient.fileUrlById(res.id),
          ...(typeof res.width === "number"
            ? {
                width: res.width,
              }
            : {}),
          ...(typeof res.height === "number"
            ? {
                height: res.height,
              }
            : {}),
          ...(serverDurationSec > 0
            ? {
                durationSec: serverDurationSec,
              }
            : durationSec > 0
              ? {
                  durationSec,
                }
              : {}),
        });
      }
      return res;
    },
    async deleteStaged(paths) {
      if (paths.length === 0) return;
      try {
        await httpClient.deleteStagedFiles(paths);
      } catch (err) {
        console.warn("[asset-mutator] deleteStaged failed:", err);
      }
    },
    async fork(req, opts) {
      const res = await httpClient.forkRename(req, opts);
      mirror(res.new_id, {
        type: res.type,
        path: res.new_path,
        name: res.new_name,
        url: httpClient.fileUrlById(res.new_id),
      });
      return res;
    },
  };
}

export function useScopedHttpClient() {
  const activeGatewayUrl = useGatewayBaseUrl();
  const { gatewayBinding, recoverWorkspace, workspaceClaim } =
    useGatewayScope();
  return reactExports.useMemo(() => {
    if (!activeGatewayUrl) return null;
    const hiloLogger = window.hilo?.logger;
    const logger = hiloLogger
      ? {
          warn: (msg) => hiloLogger.warn(msg, "http-client"),
          error: (msg) => hiloLogger.error(msg, "http-client"),
        }
      : void 0;
    return new AgentHttpClient({
      baseUrl: activeGatewayUrl,
      logger,
      commonParams: buildRendererCommonParams,
      beforeRequest: guardCanvasAccountRequest,
      workspaceBinding: gatewayBinding,
      workspaceClaim,
      recoverWorkspace,
    });
  }, [activeGatewayUrl, gatewayBinding, recoverWorkspace, workspaceClaim]);
}

export function useBrowserImageEdit(options) {
  const { t } = useTranslation();
  const client = useScopedHttpClient();
  const assetMetadataStore = useAssetMetadataApi();
  const mutator = reactExports.useMemo(
    () =>
      client
        ? createAssetMutator({
            httpClient: client,
            assetMetadataStore,
          })
        : null,
    [client, assetMetadataStore],
  );
  const latest = reactExports.useRef({
    ...options,
    client,
    mutator,
    t,
  });
  latest.current = {
    ...options,
    client,
    mutator,
    t,
  };
  const inFlight = reactExports.useRef(false);
  reactExports.useEffect(() => {
    let disposed = false;
    const handleEdit = (event) => {
      const snapshot = latest.current;
      const request = event.detail;
      if (!snapshot.isActiveRef.current || !isBrowserImageEditRequest(request))
        return;
      event.preventDefault();
      if (
        inFlight.current ||
        snapshot.locked ||
        !snapshot.client ||
        !snapshot.mutator
      ) {
        dedupedToast.warning(
          snapshot.t(
            "workspace.browser.imageEdit.notReady",
            "对话暂未就绪或正在准备其他任务，请稍后再试",
          ),
        );
        return;
      }
      if (!snapshot.canSend()) return;
      inFlight.current = true;
      const client = snapshot.client;
      const mutator = snapshot.mutator;
      const notice = dedupedToast.loading(
        snapshot.t(
          "workspace.browser.imageEdit.preparing",
          "正在准备图片编辑任务…",
        ),
      );
      void (async () => {
        try {
          const uploaded = await mutator.upload(
            request.file,
            request.file.name,
            "image",
            {
              source: "attachment",
            },
          );
          if (!uploaded.id || !uploaded.relative)
            throw new Error("Image upload did not return an asset");
          await client
            .updateAssetMetadata(
              uploaded.id,
              browserAssetSourceMetadata(request),
            )
            .catch((error) =>
              workspaceLog.warn("Browser image source metadata unavailable", {
                error,
              }),
            );
          const current = latest.current;
          if (
            disposed ||
            !current.isActiveRef.current ||
            current.sessionId !== snapshot.sessionId ||
            current.locked ||
            current.client !== client
          ) {
            if (!disposed)
              dedupedToast.warning(
                current.t(
                  "workspace.browser.imageEdit.contextChanged",
                  "目标对话已切换，图片已保存到项目，请回到原对话后重新操作",
                ),
              );
            return;
          }
          if (!current.canSend()) return;
          if (
            !current.send(browserImageEditPrompt(current.t, request.action), [
              uploaded.relative,
            ])
          ) {
            dedupedToast.error(
              current.t(
                "workspace.browser.imageEdit.sendFailed",
                "编辑任务未发送，图片已保存到项目，请在对话就绪后重新操作",
              ),
            );
          }
        } catch (error) {
          workspaceLog.error("Browser image edit dispatch failed", {
            action: request.action,
            error,
          });
          if (!disposed)
            dedupedToast.error(
              latest.current.t(
                "workspace.browser.imageEdit.prepareFailed",
                "图片准备失败，未发送编辑任务，请稍后再试",
              ),
            );
        } finally {
          dedupedToast.dismiss(notice);
          inFlight.current = false;
        }
      })();
    };
    window.addEventListener(BROWSER_IMAGE_EDIT_EVENT, handleEdit);
    return () => {
      disposed = true;
      window.removeEventListener(BROWSER_IMAGE_EDIT_EVENT, handleEdit);
    };
  }, []);
}
