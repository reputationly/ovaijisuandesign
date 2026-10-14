// 工作区身份、网关头和播放地址是一组互相引用的运行时约定。


export const HILO_WORKSPACE_IDENTITY_HEADER = "x-hilo-workspace";
export const HILO_WORKSPACE_IDENTITY_QUERY = "hilo_workspace";
export const HILO_WORKSPACE_INSTANCE_HEADER = "x-hilo-workspace-instance";
export const HILO_WORKSPACE_INSTANCE_QUERY = "hilo_workspace_instance";
export const HILO_WORKSPACE_GENERATION_HEADER = "x-hilo-workspace-generation";
export const HILO_WORKSPACE_GENERATION_QUERY = "hilo_workspace_generation";
export const WORKSPACE_IDENTITY_MISMATCH_CODE = "WORKSPACE_IDENTITY_MISMATCH";
export const WORKSPACE_IDENTITY_REQUIRED_CODE = "WORKSPACE_IDENTITY_REQUIRED";
export function workspaceGatewayIdentityHeaders(binding) {
  return {
    [HILO_WORKSPACE_IDENTITY_HEADER]: binding.claim,
    [HILO_WORKSPACE_INSTANCE_HEADER]: binding.instanceId,
    [HILO_WORKSPACE_GENERATION_HEADER]: String(binding.generation)
  };
}
export function isWorkspaceIdentityErrorCode(value) {
  return value === WORKSPACE_IDENTITY_MISMATCH_CODE || value === WORKSPACE_IDENTITY_REQUIRED_CODE;
}
export function encodePath(filePath) {
  return filePath.split("/").map(encodeURIComponent).join("/");
}
export const DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT = 1080;
export const VIDEO_PLAYBACK_IDENTITY_QUERY_KEYS = [HILO_WORKSPACE_IDENTITY_QUERY, HILO_WORKSPACE_INSTANCE_QUERY, HILO_WORKSPACE_GENERATION_QUERY];
export function videoPlaybackPath(source, maxHeight = DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT) {
  const params = new URLSearchParams({
    source,
    maxHeight: String(maxHeight)
  });
  try {
    const parsedSource = new URL(source, "http://hilo.local");
    for (const key of VIDEO_PLAYBACK_IDENTITY_QUERY_KEYS) {
      const value = parsedSource.searchParams.get(key);
      if (value) params.set(key, value);
    }
  } catch {}
  return `/api/asset/video-playback?${params.toString()}`;
}
export const HILO_HUB_BIZ_LINE = 4;
export const API_PATHS = {
  // Workspace
  workspace: "/api/workspace",
  // ComfyUI workflow catalogue and commands.
  comfyUiWorkflows: "/api/comfyui/workflows",
  comfyUiFeaturedWorkflows: locale => `/api/comfyui/featured-workflows?locale=${locale}`,
  comfyUiAgentWorkflows: "/api/comfyui/workflows?agent_only=true",
  comfyUiWorkflowImport: "/api/comfyui/workflows/import",
  comfyUiWorkflowDraftParameters: "/api/comfyui/workflows/draft-parameters",
  comfyUiWorkflowPreflight: "/api/comfyui/workflows/preflight",
  comfyUiInputImport: "/api/comfyui/inputs/import",
  comfyUiWorkflowInstall: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/install`,
  comfyUiWorkflow: (workflowId, includeGraph = false) => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}${includeGraph ? "?include_graph=true" : ""}`,
  comfyUiNodeWorkflow: (sourceNodeId, includeGraph = false) => `/api/comfyui/node-workflows/${encodeURIComponent(sourceNodeId)}${includeGraph ? "?include_graph=true" : ""}`,
  comfyUiWorkflowDelete: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}`,
  comfyUiWorkflowClearDeletedBindings: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/clear-deleted-bindings`,
  comfyUiWorkflowDependencies: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/dependencies`,
  comfyUiWorkflowOpen: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/open`,
  comfyUiWorkflowRun: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/run`,
  comfyUiWorkflowExecutable: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/executable`,
  comfyUiWorkflowMetadata: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/metadata`,
  comfyUiWorkflowAgentAccess: workflowId => `/api/comfyui/workflows/${encodeURIComponent(workflowId)}/agent-access`,
  comfyUiRuns: "/api/comfyui/runs",
  // Internal immutable request/billing Group recovery for MCP billable exits.
  internalRequestGroup: runtimeSessionId => `/api/internal/sessions/${encodeURIComponent(runtimeSessionId)}/request-group`,
  internalRequestGroupDiagnostic: "/api/internal/sessions/request-group-diagnostic",
  /** Gateway-level billing scope fallback when plugin context is absent. */
  internalBillingCurrentScope: "/api/internal/sessions/billing-current-scope",
  // Files
  files: "/api/files",
  deleteFiles: "/api/files/delete",
  mkdir: "/api/files/mkdir",
  rename: "/api/files/rename",
  forkRename: "/api/files/fork-rename",
  move: "/api/files/move",
  copy: "/api/files/copy",
  duplicateFiles: "/api/files/duplicate",
  writeContent: "/api/files/content",
  createTextAsset: "/api/files/text-asset",
  readContent: path => `/api/files/content?path=${encodeURIComponent(path)}`,
  filesUploadCdn: "/api/files/upload-cdn",
  upload: "/api/upload",
  uploadCommit: "/api/upload/commit",
  uploadCommitAbort: "/api/upload/commit/abort",
  uploadCommitFinalize: "/api/upload/commit/finalize",
  uploadStagingDelete: "/api/upload/staging/delete",
  importExternal: "/api/files/import-external",
  /**
   * Anchor project-asset files (项目资产 "添加到 agent") into the
   * watcher-ignored `.hilo/project-assets/` directory and return their
   * workspace-relative paths without enrolling them in the vault.
   * Body: { items: Array<{ path, assetId?, projectFolderName? }> } —
   * legacy { paths: string[] } still accepted (no ledger identity).
   * Response: { ok: true, anchored: Array<{ path, filename }>, errors?: [...] }
   */
  anchorProjectAsset: "/api/files/anchor-project-asset",
  /**
   * Write-side propagation for project-asset mutations (Electron main →
   * this workspace's gateway). Re-links anchors after content replacement
   * (new inode) and unlinks them after deletion, driven by the
   * `project_asset_anchors` ledger in the workspace vault sqlite.
   * Body: ProjectAssetPropagateRequest; response: ProjectAssetPropagateResult.
   */
  projectAssetPropagate: "/api/files/project-asset-propagate",
  /**
   * Pure-stat probe used by the asset-panel right-click menu's
   * "Import" / "Paste" / "New Folder" entries to surface a conflict-resolution
   * modal before kicking off the actual mkdir / import.
   * Body: { items: Array<{ name, sourcePath?, kind? }>, targetDir? }
   * Response: { ok: true, conflicts: Array<{ name, sourcePath?, existingKind }> }
   */
  checkConflicts: "/api/files/check-conflicts",
  /**
   * Recursive directory listing for the open workspace. Returns every
   * directory (including empty ones), workspace-relative POSIX paths.
   * Used by the asset panel tree to surface empty folders that the
   * file-only vault can't enumerate. WS push: `dirs_changed`.
   * Response: { ok: true, dirs: string[] }
   */
  listDirs: "/api/files/dirs",
  trackFile: "/api/files/track",
  thumbnail: path => `/api/thumbnail/${encodePath(path)}`,
  serveFile: path => `/files/${encodePath(path)}`,
  adoptFiles: "/api/files/adopt",
  serveFileById: id => `/files/id/${encodeURIComponent(id)}`,
  scanMedia: (dir, limit = 3) => `/api/files/scan-media?dir=${encodeURIComponent(dir)}&limit=${limit}`,
  workspaceSummary: dir => `/api/files/workspace-summary?dir=${encodeURIComponent(dir)}`,
  serveLocal: absolutePath => `/api/local-file?path=${encodeURIComponent(absolutePath)}`,
  filesMentionSearch: "/api/files/mention-search",
  projectAssetMentionSearch: "/api/files/project-asset-mention-search",
  // Text document versions (named snapshots of a text asset).
  // Content never round-trips through the renderer on save: the body only
  // carries { assetId, title, note } and the gateway snapshots off disk.
  textVersions: "/api/files/versions",
  textVersionsList: assetId => `/api/files/versions?assetId=${encodeURIComponent(assetId)}`,
  textVersion: id => `/api/files/versions/${encodeURIComponent(id)}`,
  textVersionContent: (id, offset = 0, limit) => {
    const query = new URLSearchParams({
      offset: String(offset)
    });
    if (limit !== void 0) query.set("limit", String(limit));
    return `/api/files/versions/${encodeURIComponent(id)}/content?${query.toString()}`;
  },
  /**
   * Diff between two snapshots of one document. `to` may be omitted to diff
   * a version against the CURRENT on-disk content (the editor's default
   * "what changed since this version" view). Server-side only: neither side
   * of a multi-MB document is ever shipped to the renderer.
   */
  textVersionDiff: params => {
    const query = new URLSearchParams({
      from: params.from
    });
    if (params.to) query.set("to", params.to);
    if (params.offset !== void 0) query.set("offset", String(params.offset));
    if (params.limit !== void 0) query.set("limit", String(params.limit));
    return `/api/files/versions/diff?${query.toString()}`;
  },
  textVersionRestore: id => `/api/files/versions/${encodeURIComponent(id)}/restore`,
  textVersionMaterialize: id => `/api/files/versions/${encodeURIComponent(id)}/materialize`,
  textVersionSummarize: "/api/files/versions/summarize",
  // Media preview
  heicPreview: "/api/media/heic-preview",
  webMedia: "/api/web-media/yt-dlp",
  // Built-in workspace browser automation (proxied to the Electron main
  // process via the MainBridgeServer loopback bridge).
  browserAutomation: "/api/browser/automation",
  // Assets
  assets: folder => `/api/assets/${encodeURIComponent(folder)}`,
  allAssets: "/api/assets",
  /**
   * `GET /api/assets` opting into the raw `metadata` blob.
   *
   * Only for callers that read un-projected keys (today: mcp-tools reading
   * `read_media_cache`). Everything else must use `allAssets` -- the blob
   * duplicates every flat field and is unbounded in size.
   */
  allAssetsWithMetadata: "/api/assets?include=metadata",
  assetChanges: "/api/assets/changes",
  // W4-T1: missing-asset reconciliation actions (ADR-004 Phase 4)
  mergeMissingCandidate: id => `/api/assets/${encodeURIComponent(id)}/merge-candidate`,
  removeMissing: id => `/api/assets/${encodeURIComponent(id)}/remove-missing`,
  locateMissing: id => `/api/assets/${encodeURIComponent(id)}/locate`,
  // Canvas asset tags (PRD: canvas 内标签体系)
  assetTags: id => `/api/assets/${encodeURIComponent(id)}/tags`,
  assetTagsBatch: "/api/assets/tags/batch",
  assetTagMutationsBatch: "/api/assets/tags/mutations/batch",
  tagRegistry: "/api/canvas/tag-registry",
  canvasTags: "/api/canvas/tags",
  canvasTag: id => `/api/canvas/tags/${encodeURIComponent(id)}`,
  canvasTagImpact: id => `/api/canvas/tags/${encodeURIComponent(id)}/impact`,
  canvasTagOrder: "/api/canvas/tags/order",
  // Dependencies (ADR-005 Layer 3 / W5-T1)
  // Lineage queries follow role='source' edges only; inputs returns
  // every role for the immediate fan-in (style / mask / pose / ...).
  dependenciesUpstream: assetId => `/api/dependencies/${encodeURIComponent(assetId)}/upstream`,
  dependenciesDownstream: assetId => `/api/dependencies/${encodeURIComponent(assetId)}/downstream`,
  dependenciesInputs: assetId => `/api/dependencies/${encodeURIComponent(assetId)}/inputs`,
  addDependency: "/api/dependencies",
  deleteDependency: id => `/api/dependencies/${id}`,
  // Asset hover-card preview (text excerpt + read-only metadata enrichment)
  assetTextPreview: (path, chars = 200) => `/api/asset/text-preview?path=${encodeURIComponent(path)}&chars=${chars}`,
  documentRead: (path, offset = 1, limit = 2e3, imagePage) => `/api/internal/document/read?path=${encodeURIComponent(path)}&offset=${offset}&limit=${limit}${imagePage === void 0 ? "" : `&image_page=${imagePage}`}`,
  assetMetadata: id => `/api/asset/${encodeURIComponent(id)}/metadata`,
  /**
   * Hover-only height-capped MP4 stream. Compatible H.264 MP4 sources pass
   * through; other containers/codecs are remuxed or transcoded for Chromium.
   */
  assetVideoStream: (path, maxHeight = 480) => `/api/asset/video-stream?path=${encodeURIComponent(path)}&maxHeight=${maxHeight}`,
  /** Browser-compatible H.264/AAC MP4 for canvas playback. */
  assetVideoPlayback: videoPlaybackPath,
  // Pre-computed audio peaks (issue #5 follow-up §2): wavesurfer.js skips
  // its own decode when peaks + duration are supplied via constructor opts.
  // Buckets are clamped server-side to [50, 4096]; default 200 matches the
  // typical hover-card waveform width (~400 px @ 2-bar minimum).
  assetPeaks: (path, buckets = 200) => `/api/asset/peaks?path=${encodeURIComponent(path)}&buckets=${buckets}`,
  // Asset Center
  assetCenterWorkspaceRefs: workspace => `/api/asset-center/workspace-refs?workspace=${encodeURIComponent(workspace)}`,
  assetCenterAttachmentBlob: (attachmentId, width) => {
    const base = `/api/asset-center/attachments/${encodeURIComponent(attachmentId)}/blob`;
    return width === void 0 ? base : `${base}?w=${width}`;
  },
  assetCenterAttachmentPlayback: (attachmentId, maxHeight = 1080) => `/api/asset-center/attachments/${encodeURIComponent(attachmentId)}/playback?maxHeight=${maxHeight}`,
  assetCenterBlobPreview: (blobPath, width = 512) => `/api/asset-center/blobs/preview?${new URLSearchParams({
    blobPath,
    w: String(width)
  }).toString()}`,
  assetCenterBlobPlayback: (blobPath, maxHeight = 1080) => `/api/asset-center/blobs/playback?${new URLSearchParams({
    blobPath,
    maxHeight: String(maxHeight)
  }).toString()}`,
  // Canvas
  canvas: "/api/canvas",
  canvasRecovery: "/api/canvas/recovery-result",
  canvasSearch: "/api/canvas/search",
  addCanvasNode: "/api/canvas/add-node",
  canvasMediaNode: "/api/canvas/media-node",
  // Generation
  models: "/api/models",
  modelsConfig: "/api/v1/models/config",
  imageModels: "/api/models/image",
  videoModels: "/api/models/video",
  speechModels: "/api/models/speech",
  musicModels: "/api/models/music",
  agentModels: "/api/runtime/models",
  openCodeConfig: "/api/v1/config",
  speechVoices: "/api/speech/voices",
  speechVoiceDesign: "/api/speech/voice_design",
  generateImage: "/api/generate/image",
  generateVideo: "/api/generate/video",
  generateSpeech: "/api/generate/speech",
  generateMusic: "/api/generate/music",
  generateText: "/api/generate/text",
  generationCancel: "/api/generation/cancel",
  generationQueueSummary: "/api/generation-queue/summary",
  generationQueueCancel: "/api/generation-queue/cancel",
  canvasGenerationReconcile: "/api/canvas/generation/reconcile",
  generateImageSubmit: "/api/generate/image/submit",
  generateVideoSubmit: "/api/generate/video/submit",
  generateSpeechSubmit: "/api/generate/speech/submit",
  generateMusicSubmit: "/api/generate/music/submit",
  generateTaskQueryPattern: "/api/generate/tasks/:task_id/query",
  generateTaskQuery: taskId => `/api/generate/tasks/${encodeURIComponent(taskId)}/query`,
  // Editing
  concatenateVideos: "/api/edit/concatenate-videos",
  embedAudio: "/api/edit/embed-audio",
  extractAudio: "/api/edit/extract-audio",
  voiceIsolation: "/api/speech/voice_isolation",
  lipSync: "/api/edit/lip-sync",
  asr: "/api/edit/asr",
  analyzeMedia: "/api/edit/analyze-media",
  superResolution: "/api/edit/super-resolution",
  eraseBanana: "/api/edit/erase-banana",
  redrawBanana: "/api/edit/redraw-banana",
  outpaintBanana: "/api/edit/outpaint-banana",
  moveObjectBanana: "/api/edit/move-object-banana",
  removeBackground: "/api/edit/remove-background",
  layerDecompose: "/api/edit/layer-decompose",
  enhanceImageMediaKit: "/api/edit/enhance-image",
  enhanceVideoMediaKit: "/api/edit/enhance-video-mediakit",
  hailuo03VideoSuperResolution: "/api/edit/hailuo03-video-super-resolution",
  eraseSubtitleMediaKit: "/api/edit/erase-subtitle-mediakit",
  asrMediaKit: "/api/edit/asr-mediakit",
  asrWhisper: "/api/edit/asr-whisper",
  // Skills
  skills: "/api/skills",
  runtimeSkills: "/api/skills/runtime",
  marketSkills: "/api/skills/market",
  marketSearch: "/api/skills/market/search",
  marketInstall: "/api/skills/market/install",
  marketUninstall: "/api/skills/market/uninstall",
  skillImport: "/api/skills/import",
  skillSubmissionStage: "/api/skills/submission/stage",
  skillSubmissionSave: "/api/skills/submission/save",
  skillSubmissionCoverUpload: "/api/skills/creator-plan/cover-upload",
  skillSubmissionAssetUpload: "/api/skills/creator-plan/asset-upload",
  skillSubmissionAssetPresign: "/api/skills/creator-plan/asset-presign",
  skillSubmissionSubmit: "/api/skills/creator-plan/submit",
  skillSubmissionList: "/api/skills/creator-plan/submissions",
  skillSubmissionOffline: "/api/skills/creator-plan/offline",
  marketWhitelist: "/api/skills/market/whitelist",
  marketSyncStatus: "/api/skills/market/sync-status",
  marketCheckOperator: "/api/skills/market/check-operator",
  marketOperations: "/api/skills/market/operation",
  marketDeleteOperation: skillName => `/api/skills/market/operation/${encodeURIComponent(skillName)}`,
  marketBatchSaveOperations: "/api/skills/market/operations/batch",
  marketOperatorSubmissions: "/api/skills/market/operator/submissions",
  marketOperatorPublished: "/api/skills/market/operator/published",
  marketOperatorSubmission: submissionId => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}`,
  marketOperatorSubmissionPackage: submissionId => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}/package`,
  marketOperatorSubmissionPackageUpload: submissionId => `/api/skills/market/operator/submissions/${encodeURIComponent(submissionId)}/package-upload`,
  marketOperatorBatchApprove: "/api/skills/market/operator/submissions/batch-approve",
  marketOperatorPublish: "/api/skills/market/operator/publish",
  marketOperatorCategories: "/api/skills/market/categories",
  marketTrending: "/api/skills/market/trending",
  skillFiles: skillName => `/api/skills/${encodeURIComponent(skillName)}/files`,
  skillFileContent: (skillName, filePath) => `/api/skills/${encodeURIComponent(skillName)}/file-content?path=${encodeURIComponent(filePath)}`,
  skillUserTrash: "/api/skills/user/trash",
  skillFork: "/api/skills/fork",
  // Plugin management (local plugin listing, not cloud market)
  plugins: "/api/plugins",
  // Feedback
  feedback: "/api/feedback",
  feedbackUploadAttachment: "/api/feedback/upload-attachment",
  feedbackDetail: ticketId => `/api/feedback/${encodeURIComponent(ticketId)}`,
  // Export
  exportSession: id => `/api/sessions/${id}/export`,
  customMcpApply: "/api/connectors/mcp",
  customMcpAuthorize: "/api/connectors/mcp/authorize",
  customMcpAuthenticate: "/api/connectors/mcp/authenticate",
  projectArchiveActivityBegin: "/api/projects/archive/activity/begin",
  projectArchiveActivityHeartbeat: "/api/projects/archive/activity/heartbeat",
  projectArchiveActivityEnd: "/api/projects/archive/activity/end",
  // Billing
  billingPricing: "/api/v1/billing/pricing",
  billingPromotion: "/api/v1/billing/promotion",
  /** Atomic cloud-side price calculation; reminder policy stays local. */
  creditCalculateCost: "/api/v1/credit/calculate-cost",
  /** Atomic authoritative balance query for the authenticated billing scope. */
  creditBalance: "/api/v1/credit/balance",
  /** Existing wallet envelope used by the balance/insufficient-credit UI. */
  creditWallet: "/api/v1/credit/wallet",
  hailuo03VideoTrialStatus: "/api/v1/promotions/hailuo03-video-trial/status",
  hailuo03VideoTrialClaim: "/api/v1/promotions/hailuo03-video-trial/claim",
  // Home
  hubClientConfig: "/api/v1/hub/client_config",
  /** Cloud-side OAuth code→token exchange for confidential connector providers. */
  connectorOAuthExchange: "/api/v1/connector/oauth/exchange",
  apolloConfig: key => `/api/v1/apollo/config?key=${encodeURIComponent(key)}`,
  /** Legacy path retained for old Desktop releases. */
  homeQuickStartConfig: "/api/v1/home/quick_start_config",
  /** Current Desktop explicitly selects the isolated Apollo v2 key. */
  homeQuickStartConfigV2: "/api/v1/home/quick_start_config?config_version=2",
  // Group 间 MediaCredit 转移（Owner only）。operator_uid 由云网关从登录态解析；
  // 客户端严格发送后端契约的三字段请求；幂等由云端负责。
  creditTransfer: "/api/v1/credit/transfer",
  // Account deletion（账户注销）。
  accountProfile: "/api/v1/account/profile",
  accountHailuoWeb: "/api/v1/account/hailuo-web",
  accountHailuoCancelCheck: "/api/v1/account/cancel/hailuo-check",
  accountHubCancelCheck: "/api/v1/account/cancel/check",
  accountCancelSendCode: "/api/v1/account/cancel/send-code",
  accountDelete: "/api/v1/account/cancel",
  // Team edition (Renderer-safe business data only).
  // Canonical active-context and operation coordination routes are deliberately
  // absent: they are Main-process implementation details and must never become
  // a second Renderer source of truth.
  teamContract: "/api/v1/team/contract",
  teamCapabilities: "/api/v1/team/capabilities",
  groupList: `/backend/group/list?biz_line=${HILO_HUB_BIZ_LINE}`,
  groupCreate: "/backend/group/create",
  /** QueryGroupMembers：按 scope 查成员（InGroup 当前团队全量 / Owned·Manageable 聚合去重候选，无分页）。 */
  groupMembersQuery: "/backend/group/members/query",
  /** BatchAddGroupMembers：按 UID 批量入团（单次上限 100，逐用户结果）。 */
  groupMembersBatchAdd: "/backend/group/members/batch_add",
  teamInvitations: "/api/v1/team/invitations",
  teamInvitation: invitationId => `/api/v1/team/invitations/${encodeURIComponent(invitationId)}`,
  teamDetail: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}`,
  teamRename: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}`,
  teamDelete: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}`,
  teamMembers: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members`,
  teamInviteMembers: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/invite`,
  teamRemoveMember: (groupId, userId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
  teamChangeMemberRole: (groupId, userId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/role`,
  teamLeave: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/leave`,
  teamTransferOwner: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transfer-owner`,
  teamInviteLinks: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/invite-links`,
  teamInviteLinkInfo: (token, region) => {
    const params = new URLSearchParams({
      token
    });
    if (region) params.set("region", region);
    return `/api/v1/team/invite-links/info?${params.toString()}`;
  },
  teamInviteLinkAccept: "/api/v1/team/invite-links/accept",
  teamInviteLinkDecline: "/api/v1/team/invite-links/decline",
  teamInvitationAccept: "/api/v1/team/invitations/accept",
  teamQuota: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/quota`,
  teamMemberQuotas: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/member-quotas`,
  /** 云网关 member/details 代理：全量成员 + Quota 使用 + 历史累计消耗（不分页）。 */
  teamMemberDetails: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/member-details`,
  teamCreditSummary: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/credit-summary`,
  teamTransactions: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transactions`,
  teamSelfTransactions: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/self/transactions`,
  teamMemberTransactions: (groupId, memberId) => `/api/v1/team/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}/transactions`,
  teamTransfers: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/transfers`,
  teamCheckoutSessions: groupId => `/api/v1/team/groups/${encodeURIComponent(groupId)}/checkout-sessions`,
  // WebSocket
  wsChat: "/ws"
};
export function workspaceGatewayUrl(binding, path) {
  const baseUrl = binding.baseUrl.replace(/\/$/, "");
  const requested = new URL(path, `${baseUrl}/`);
  const parsed = new URL(`${requested.pathname}${requested.search}${requested.hash}`, `${baseUrl}/`);
  parsed.searchParams.set(HILO_WORKSPACE_IDENTITY_QUERY, binding.claim);
  parsed.searchParams.set(HILO_WORKSPACE_INSTANCE_QUERY, binding.instanceId);
  parsed.searchParams.set(HILO_WORKSPACE_GENERATION_QUERY, String(binding.generation));
  return parsed.toString();
}
export function withWorkspaceGatewayHeaders(binding, headers) {
  const result = new Headers(headers);
  for (const [key, value] of Object.entries(workspaceGatewayIdentityHeaders(binding))) {
    result.set(key, value);
  }
  return result;
}
export class WorkspaceGatewayClient {
  bindingValue;
  fetchImpl;
  recoverWorkspace;
  recoveryInFlight;
  constructor(options) {
    this.bindingValue = options.binding;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.recoverWorkspace = options.recoverWorkspace;
  }
  get binding() {
    return this.bindingValue;
  }
  url(path) {
    return workspaceGatewayUrl(this.bindingValue, path);
  }
  async request(path, init) {
    return this.performRequest(path, init, true);
  }
  async performRequest(path, init, allowRecovery) {
    const response = await this.fetchImpl(this.url(path), {
      ...init,
      headers: withWorkspaceGatewayHeaders(this.bindingValue, init?.headers)
    });
    if (!allowRecovery || !this.recoverWorkspace || !(await isIdentityError(response))) {
      return response;
    }
    const previousBinding = this.bindingValue;
    const recovered = await this.recoverBinding();
    if (!recovered) return response;
    if (!canReplayAfterRecovery(init, previousBinding, recovered)) {
      return response;
    }
    this.bindingValue = recovered;
    return this.performRequest(path, init, false);
  }
  async recoverBinding() {
    if (!this.recoverWorkspace) return void 0;
    if (this.recoveryInFlight) return this.recoveryInFlight;
    const recovery = this.recoverWorkspace();
    this.recoveryInFlight = recovery;
    try {
      return await recovery;
    } finally {
      if (this.recoveryInFlight === recovery) {
        this.recoveryInFlight = void 0;
      }
    }
  }
}
export function canReplayAfterRecovery(init, previous, recovered) {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  return previous.claim === recovered.claim && previous.instanceId === recovered.instanceId;
}
export async function isIdentityError(response) {
  if (response.status !== 409 && response.status !== 428) return false;
  try {
    const body = await response.clone().json();
    return isWorkspaceIdentityErrorCode(body.code);
  } catch {
    return false;
  }
}
export const ACCOUNT_SENSITIVE_CANVAS_PATHS = /* @__PURE__ */new Set([API_PATHS.speechVoiceDesign, API_PATHS.generateImage, API_PATHS.generateVideo, API_PATHS.generateSpeech, API_PATHS.generateMusic, API_PATHS.generateText, API_PATHS.generateImageSubmit, API_PATHS.generateVideoSubmit, API_PATHS.generateSpeechSubmit, API_PATHS.generateMusicSubmit, API_PATHS.concatenateVideos, API_PATHS.embedAudio, API_PATHS.extractAudio, API_PATHS.voiceIsolation, API_PATHS.lipSync, API_PATHS.asr, API_PATHS.analyzeMedia, API_PATHS.superResolution, API_PATHS.eraseBanana, API_PATHS.redrawBanana, API_PATHS.outpaintBanana, API_PATHS.moveObjectBanana, API_PATHS.removeBackground, API_PATHS.layerDecompose, API_PATHS.enhanceImageMediaKit, API_PATHS.enhanceVideoMediaKit, API_PATHS.hailuo03VideoSuperResolution, API_PATHS.eraseSubtitleMediaKit, API_PATHS.asrMediaKit, API_PATHS.asrWhisper]);
