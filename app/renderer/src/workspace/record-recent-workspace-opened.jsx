// record-recent-workspace-opened.jsx
import { reactExports, DialogTrigger$1, API_PATHS } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { GatewayHttpError, gatewayFetch } from "../infra/agent-ws-client.jsx";
import { applyAssetReplayEvents, requestAssetWorkspaceResync } from "../assets/apply-asset-change.jsx";
import { actionTrailLog, projectLog } from "../vendor-inline/vscode-base/graph.jsx";
import { MemberRole } from "../generation/push-inline.js";
export function isRenderableAssetType(type2) {
  return (
    type2 === "image" ||
    type2 === "video" ||
    type2 === "audio" ||
    type2 === "text" ||
    type2 === "file"
  );
}
const ASSET_LINEAGE_QUERY_PREFIX = ["asset-lineage"];
const DEFAULT_GATEWAY_SCOPE_KEY = "app";
export const assetLineageQueryKey = {
  /** Top-level prefix; matches every lineage / descendants / inputs query. */
  all: () => [...ASSET_LINEAGE_QUERY_PREFIX],
  /** Every cache entry tied to a specific child asset id (any direction / depth). */
  child: (assetId, scopeKey = DEFAULT_GATEWAY_SCOPE_KEY) => [
    ...ASSET_LINEAGE_QUERY_PREFIX,
    scopeKey,
    assetId,
  ],
  upstream: (assetId, depth2, scopeKey = DEFAULT_GATEWAY_SCOPE_KEY) => [
    ...ASSET_LINEAGE_QUERY_PREFIX,
    scopeKey,
    assetId,
    "upstream",
    depth2 ?? null,
  ],
  downstream: (assetId, depth2, scopeKey = DEFAULT_GATEWAY_SCOPE_KEY) => [
    ...ASSET_LINEAGE_QUERY_PREFIX,
    scopeKey,
    assetId,
    "downstream",
    depth2 ?? null,
  ],
  inputs: (assetId, scopeKey = DEFAULT_GATEWAY_SCOPE_KEY) => [
    ...ASSET_LINEAGE_QUERY_PREFIX,
    scopeKey,
    assetId,
    "inputs",
  ],
};
export function invalidateAssetLineageQueries(qc, childId, parentId, scopeKey) {
  if (!scopeKey) {
    qc.invalidateQueries({
      queryKey: assetLineageQueryKey.all(),
    });
    return;
  }
  qc.invalidateQueries({
    queryKey: assetLineageQueryKey.child(childId, scopeKey),
  });
  if (parentId) {
    qc.invalidateQueries({
      queryKey: assetLineageQueryKey.child(parentId, scopeKey),
    });
  }
}
const DEFAULT_ASSET_CHANGES_REPLAY_LIMIT = 500;
export async function replayAssetChangesOrFallback({
  qc,
  gatewayScopeKey,
  gatewayFetch: gatewayFetch2,
  request,
  syncAssetMeta,
  onReplayApplied,
  onFallbackResync,
  replayLimit = DEFAULT_ASSET_CHANGES_REPLAY_LIMIT,
}) {
  try {
    const response = await gatewayFetch2(buildAssetChangesReplayUrl(request, replayLimit));
    if (!response.ok) throw new Error(`asset changes replay failed: ${response.status}`);
    const manifest = await response.json();
    if (manifest.has_gap || manifest.has_more) {
      requestFallbackResync(qc, gatewayScopeKey, onFallbackResync);
      return;
    }
    const replayToSeq = request.toSeq;
    const replayEvents =
      replayToSeq === void 0
        ? manifest.events
        : manifest.events.filter((event) => (event.seq ?? 0) <= replayToSeq);
    applyAssetReplayEvents({
      qc,
      gatewayScopeKey,
      events: replayEvents,
      syncAssetMeta,
    });
    onReplayApplied?.();
  } catch {
    requestFallbackResync(qc, gatewayScopeKey, onFallbackResync);
  }
}
function buildAssetChangesReplayUrl(request, replayLimit = DEFAULT_ASSET_CHANGES_REPLAY_LIMIT) {
  const qs = new URLSearchParams({
    workspace_id: request.workspaceId,
    after_seq: String(request.afterSeq),
    limit: String(replayLimit),
  });
  if (request.eventEpoch) qs.set("event_epoch", request.eventEpoch);
  if (request.toSeq !== void 0) qs.set("to_seq", String(request.toSeq));
  return `${API_PATHS.assetChanges}?${qs}`;
}
function requestFallbackResync(qc, gatewayScopeKey, onFallbackResync) {
  requestAssetWorkspaceResync({
    qc,
    gatewayScopeKey,
    reason: "seq-gap",
  });
  onFallbackResync?.();
}
const TAG_REGISTRY_QUERY_KEY = ["canvas", "tag-registry"];
export function canvasTagRegistryQueryKey(gatewayScopeKey) {
  return [...TAG_REGISTRY_QUERY_KEY, gatewayScopeKey];
}
const WORKSPACE_FILE_PATH_PREFIX = "/files/";
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);
export function rebindWorkspaceAssetMetadataUrls(assets, resolveGatewayUrl) {
  let nextAssets;
  for (const [key2, meta2] of assets) {
    let parsed;
    try {
      parsed = new URL(meta2.url);
    } catch {
      continue;
    }
    if (
      !LOOPBACK_HOSTNAMES.has(parsed.hostname) ||
      !parsed.pathname.startsWith(WORKSPACE_FILE_PATH_PREFIX)
    ) {
      continue;
    }
    const reboundUrl = resolveGatewayUrl(`${parsed.pathname}${parsed.search}`);
    if (!reboundUrl || reboundUrl === meta2.url) continue;
    nextAssets ??= new Map(assets);
    nextAssets.set(key2, {
      ...meta2,
      url: reboundUrl,
    });
  }
  return nextAssets ?? assets;
}
export const ASSET_STATE_BREADCRUMB_INTERVAL_MS = 3e4;
export function guardedSubmissionKind(msg) {
  if (msg.type === "message") {
    return msg.delivery === "defer_if_busy" ? "queue" : "chat";
  }
  if (msg.type === "skill_gui_event" && msg.event_type === "generate:submit") {
    return "remote_tool";
  }
  return null;
}
export const WSConnectionContext = reactExports.createContext(null);
export function useWSConnection() {
  const ctx = reactExports.useContext(WSConnectionContext);
  if (!ctx) {
    throw new Error(
      "useWSConnection must be used within AppWSConnectionProvider or WorkspaceWSConnectionProvider",
    );
  }
  return ctx;
}
export function SheetTrigger({ ...props }) {
  return <DialogTrigger$1 data-slot="sheet-trigger" {...props} />;
}
export const SettingsDialogCtx = reactExports.createContext(null);
const TEXT_SAFETY_PATH = "/api/safety/check-text";
const TEXT_SAFETY_TIMEOUT_MS = 5e3;
function mapTextSafetyCheckResult(value) {
  if (!value || typeof value !== "object") {
    throw new TypeError("Text safety response must be an object");
  }
  const result = value;
  if (typeof result.pass !== "boolean" || typeof result.decision !== "string") {
    throw new TypeError("Text safety response is invalid");
  }
  return {
    pass: result.pass,
    decision: result.decision,
  };
}
export async function checkTextSafety(content2) {
  if (!content2.trim())
    return {
      pass: true,
      decision: "empty_bypass",
    };
  try {
    const response = await gatewayFetch(TEXT_SAFETY_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: content2,
      }),
      timeoutMs: TEXT_SAFETY_TIMEOUT_MS,
    });
    const payload = await response.json();
    return mapTextSafetyCheckResult(payload);
  } catch (error) {
    actionTrailLog.warn("text-safety check failed; allowing by fail-open policy", {
      error,
    });
    return {
      pass: true,
      decision: "error_bypass",
    };
  }
}
function mapMemberRole(raw2) {
  const value = Number(raw2 ?? 0);
  return value === MemberRole.MEMBER_ROLE_CREATOR || value === MemberRole.MEMBER_ROLE_MEMBER
    ? value
    : MemberRole.MEMBER_ROLE_UNSPECIFIED;
}
function mapCloudProject(raw2) {
  if (!raw2 || typeof raw2.id !== "string" || !raw2.id) return null;
  return {
    id: raw2.id,
    name: typeof raw2.name === "string" ? raw2.name : "",
    creatorId: typeof raw2.creator_id === "string" ? raw2.creator_id : "",
    myRole: mapMemberRole(raw2.my_role),
    createdAt: Number(raw2.created_at ?? 0),
    updatedAt: Number(raw2.updated_at ?? 0),
    memberCount: Number(raw2.member_count ?? 0),
    usedBytes: Number(raw2.used_bytes ?? 0),
    totalBytes: Number(raw2.total_bytes ?? 0),
  };
}
export class CloudProjectRequestError extends Error {
  constructor(status, userMessage) {
    super(userMessage || `cloud project request failed (${status})`);
    this.status = status;
    this.userMessage = userMessage;
    this.name = "CloudProjectRequestError";
  }
}
export function cloudErrorDisplayMessage(err) {
  if (err instanceof CloudProjectRequestError) return err.userMessage;
  if (err instanceof GatewayHttpError) return err.userMessage;
  if (typeof err === "object" && err !== null && "userMessage" in err) {
    const userMessage = err.userMessage;
    if (typeof userMessage === "string" && userMessage.trim()) return userMessage.trim();
  }
  return void 0;
}
async function requestJson$1(path2, init2) {
  let resp;
  try {
    resp = await gatewayFetch(path2, init2);
  } catch (err) {
    if (err instanceof GatewayHttpError) {
      throw new CloudProjectRequestError(err.status, err.userMessage);
    }
    throw err;
  }
  return await resp.json().catch(() => ({}));
}
export async function createCloudProject(name2) {
  const data2 = await requestJson$1("/api/v1/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name2,
    }),
  });
  const project2 = mapCloudProject(data2.project);
  if (!project2) {
    throw new CloudProjectRequestError(200, void 0);
  }
  return project2;
}
export async function listCloudProjects() {
  const data2 = await requestJson$1("/api/v1/projects");
  const projects = Array.isArray(data2.projects) ? data2.projects : [];
  return projects.map(mapCloudProject).filter((project2) => project2 !== null);
}
export async function renameCloudProject(projectId, name2) {
  await requestJson$1(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name2,
    }),
  });
}
export async function deleteCloudProject(projectId) {
  await requestJson$1(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}
function mapProjectMember(raw2) {
  if (!raw2 || typeof raw2.user_id !== "string" || !raw2.user_id) return null;
  return {
    userId: raw2.user_id,
    nickname: typeof raw2.nickname === "string" ? raw2.nickname : "",
    avatarUrl: typeof raw2.avatar_url === "string" ? raw2.avatar_url : "",
    role: mapMemberRole(raw2.role),
    joinedAt: Number(raw2.joined_at ?? 0),
  };
}
export async function listProjectMembers(projectId) {
  const data2 = await requestJson$1(`/api/v1/projects/${encodeURIComponent(projectId)}/members`);
  const members = Array.isArray(data2.members) ? data2.members : [];
  return members.map(mapProjectMember).filter((member) => member !== null);
}
export async function removeProjectMember(projectId, userId) {
  await requestJson$1(
    `/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );
}
export async function createProjectInviteLink(projectId) {
  const data2 = await requestJson$1(`/api/v1/projects/${encodeURIComponent(projectId)}/invites`, {
    method: "POST",
  });
  const token2 = typeof data2.token === "string" ? data2.token : "";
  if (!token2) {
    throw new CloudProjectRequestError(200, void 0);
  }
  return {
    token: token2,
    expireAt: Number(data2.expire_at ?? 0),
  };
}
export async function acceptProjectInvite(token2) {
  const data2 = await requestJson$1("/api/v1/project-invites/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: token2,
    }),
  });
  const project2 = mapCloudProject(data2.project);
  if (!project2) {
    throw new CloudProjectRequestError(200, void 0);
  }
  return project2;
}
let fallbackSequence = 0;
export function createProjectOperationId(action) {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `${action}:${randomId}`;
  fallbackSequence += 1;
  return `${action}:${Date.now().toString(36)}:${fallbackSequence.toString(36)}`;
}
function projectOperationError(error) {
  const errorCode = readErrorCode(error);
  return {
    errorKind: error instanceof Error ? error.name : typeof error,
    errorCode: errorCode ?? "unknown",
  };
}
export function logProjectOperationAttempt(action, operationId, meta2) {
  projectLog.info(`${action} attempt`, {
    operationId,
    ...meta2,
  });
  return Date.now();
}
export function logProjectOperationSuccess(action, operationId, startedAt, meta2) {
  projectLog.info(`${action} ok`, {
    operationId,
    durationMs: Date.now() - startedAt,
    ...meta2,
  });
}
export function logProjectOperationFailure(action, operationId, startedAt, stage, error, meta2) {
  projectLog.error(`${action} failed`, {
    operationId,
    stage,
    durationMs: Date.now() - startedAt,
    ...projectOperationError(error),
    ...meta2,
  });
}
export function logProjectOperationBlocked(action, operationId, startedAt, stage, reason, meta2) {
  projectLog.warn(`${action} blocked`, {
    operationId,
    stage,
    reason,
    durationMs: Date.now() - startedAt,
    ...meta2,
  });
}
function readErrorCode(error) {
  if (typeof error !== "object" || error === null) return void 0;
  const code2 = Reflect.get(error, "code");
  if (typeof code2 === "string" && code2.trim()) return code2.trim().slice(0, 80);
  const status = Reflect.get(error, "status");
  if (typeof status === "number" && Number.isFinite(status)) return `http_${status}`;
  return void 0;
}
export function retainCompleteWorkspaceCatalog(entries2) {
  return [...entries2];
}
function finiteManualOrder(workspace) {
  return typeof workspace.manualOrder === "number" && Number.isFinite(workspace.manualOrder)
    ? workspace.manualOrder
    : void 0;
}
export function sortRecentWorkspacesByStableOrder(workspaces) {
  return workspaces
    .map((workspace, sourceIndex) => ({
      workspace,
      sourceIndex,
    }))
    .sort((a2, b3) => {
      const aOrder = finiteManualOrder(a2.workspace);
      const bOrder = finiteManualOrder(b3.workspace);
      if (aOrder === void 0 && bOrder !== void 0) return -1;
      if (aOrder !== void 0 && bOrder === void 0) return 1;
      if (aOrder !== void 0 && bOrder !== void 0 && aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return b3.workspace.openedAt - a2.workspace.openedAt || a2.sourceIndex - b3.sourceIndex;
    })
    .map(({ workspace }) => workspace);
}
export function recordRecentWorkspaceOpened(workspaces, workspacePath, openedAt, options = {}) {
  const pathsEqual = options.pathsEqual ?? ((left, right) => left === right);
  const matchesOpenedWorkspace = (path2) =>
    pathsEqual(path2, workspacePath) ||
    (options.previousWorkspacePath !== void 0 && pathsEqual(path2, options.previousWorkspacePath));
  const ordered = sortRecentWorkspacesByStableOrder(workspaces);
  const deduped = [];
  let matchedOpenedWorkspaceIndex;
  const seenPaths = new Set();
  for (const workspace of ordered) {
    if (matchesOpenedWorkspace(workspace.path)) {
      if (matchedOpenedWorkspaceIndex !== void 0) {
        const retained = deduped[matchedOpenedWorkspaceIndex];
        if (retained) {
          deduped[matchedOpenedWorkspaceIndex] = {
            ...retained,
            ...(retained.displayName === void 0 && workspace.displayName !== void 0
              ? {
                  displayName: workspace.displayName,
                }
              : {}),
            ...(retained.coverImage === void 0 && workspace.coverImage !== void 0
              ? {
                  coverImage: workspace.coverImage,
                }
              : {}),
          };
        }
        continue;
      }
      matchedOpenedWorkspaceIndex = deduped.length;
    } else {
      if (seenPaths.has(workspace.path)) continue;
      seenPaths.add(workspace.path);
    }
    deduped.push(workspace);
  }
  const existingIndex = deduped.findIndex((workspace) => matchesOpenedWorkspace(workspace.path));
  if (existingIndex === -1) {
    deduped.unshift({
      path: workspacePath,
      openedAt,
    });
  } else {
    const existing = deduped[existingIndex];
    if (existing)
      deduped[existingIndex] = {
        ...existing,
        path: workspacePath,
        openedAt,
      };
  }
  return deduped.map((workspace, manualOrder) => ({
    ...workspace,
    manualOrder,
  }));
}
