// asset-lineage-query-key.js
import {
  actionTrailLog,
  projectLog,
} from "../vendor-inline/vscode-base/graph.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { GatewayHttpError } from "../infra/gateway-http-error.jsx";
import { MemberRole } from "../generation/normalize-skill-detail-metadata.js";
import { reactExports } from "../vendor.js";
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
  upstream: (assetId, depth, scopeKey = DEFAULT_GATEWAY_SCOPE_KEY) => [
    ...ASSET_LINEAGE_QUERY_PREFIX,
    scopeKey,
    assetId,
    "upstream",
    depth ?? null,
  ],
  downstream: (assetId, depth, scopeKey = DEFAULT_GATEWAY_SCOPE_KEY) => [
    ...ASSET_LINEAGE_QUERY_PREFIX,
    scopeKey,
    assetId,
    "downstream",
    depth ?? null,
  ],
  inputs: (assetId, scopeKey = DEFAULT_GATEWAY_SCOPE_KEY) => [
    ...ASSET_LINEAGE_QUERY_PREFIX,
    scopeKey,
    assetId,
    "inputs",
  ],
};
const TAG_REGISTRY_QUERY_KEY = ["canvas", "tag-registry"];
export function canvasTagRegistryQueryKey(gatewayScopeKey) {
  return [...TAG_REGISTRY_QUERY_KEY, gatewayScopeKey];
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
export async function checkTextSafety(content) {
  if (!content.trim())
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
        content,
      }),
      timeoutMs: TEXT_SAFETY_TIMEOUT_MS,
    });
    const payload = await response.json();
    return mapTextSafetyCheckResult(payload);
  } catch (error) {
    actionTrailLog.warn(
      "text-safety check failed; allowing by fail-open policy",
      {
        error,
      },
    );
    return {
      pass: true,
      decision: "error_bypass",
    };
  }
}
function mapMemberRole(raw) {
  const value = Number(raw ?? 0);
  return value === MemberRole.MEMBER_ROLE_CREATOR ||
    value === MemberRole.MEMBER_ROLE_MEMBER
    ? value
    : MemberRole.MEMBER_ROLE_UNSPECIFIED;
}
export function mapCloudProject(raw) {
  if (!raw || typeof raw.id !== "string" || !raw.id) return null;
  return {
    id: raw.id,
    name: typeof raw.name === "string" ? raw.name : "",
    creatorId: typeof raw.creator_id === "string" ? raw.creator_id : "",
    myRole: mapMemberRole(raw.my_role),
    createdAt: Number(raw.created_at ?? 0),
    updatedAt: Number(raw.updated_at ?? 0),
    memberCount: Number(raw.member_count ?? 0),
    usedBytes: Number(raw.used_bytes ?? 0),
    totalBytes: Number(raw.total_bytes ?? 0),
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
    if (typeof userMessage === "string" && userMessage.trim())
      return userMessage.trim();
  }
  return void 0;
}
export async function requestJson(path, init) {
  let resp;
  try {
    resp = await gatewayFetch(path, init);
  } catch (err) {
    if (err instanceof GatewayHttpError) {
      throw new CloudProjectRequestError(err.status, err.userMessage);
    }
    throw err;
  }
  return await resp.json().catch(() => ({}));
}
export async function listCloudProjects() {
  const data = await requestJson("/api/v1/projects");
  const projects = Array.isArray(data.projects) ? data.projects : [];
  return projects.map(mapCloudProject).filter((project) => project !== null);
}
function mapProjectMember(raw) {
  if (!raw || typeof raw.user_id !== "string" || !raw.user_id) return null;
  return {
    userId: raw.user_id,
    nickname: typeof raw.nickname === "string" ? raw.nickname : "",
    avatarUrl: typeof raw.avatar_url === "string" ? raw.avatar_url : "",
    role: mapMemberRole(raw.role),
    joinedAt: Number(raw.joined_at ?? 0),
  };
}
export async function listProjectMembers(projectId) {
  const data = await requestJson(
    `/api/v1/projects/${encodeURIComponent(projectId)}/members`,
  );
  const members = Array.isArray(data.members) ? data.members : [];
  return members.map(mapProjectMember).filter((member) => member !== null);
}
export async function removeProjectMember(projectId, userId) {
  await requestJson(
    `/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );
}
export async function createProjectInviteLink(projectId) {
  const data = await requestJson(
    `/api/v1/projects/${encodeURIComponent(projectId)}/invites`,
    {
      method: "POST",
    },
  );
  const token = typeof data.token === "string" ? data.token : "";
  if (!token) {
    throw new CloudProjectRequestError(200, void 0);
  }
  return {
    token,
    expireAt: Number(data.expire_at ?? 0),
  };
}
let fallbackSequence = 0;
export function createProjectOperationId(action) {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `${action}:${randomId}`;
  fallbackSequence += 1;
  return `${action}:${Date.now().toString(36)}:${fallbackSequence.toString(36)}`;
}
export function logProjectOperationAttempt(action, operationId, meta) {
  projectLog.info(`${action} attempt`, {
    operationId,
    ...meta,
  });
  return Date.now();
}
export function logProjectOperationSuccess(
  action,
  operationId,
  startedAt,
  meta,
) {
  projectLog.info(`${action} ok`, {
    operationId,
    durationMs: Date.now() - startedAt,
    ...meta,
  });
}
export function logProjectOperationBlocked(
  action,
  operationId,
  startedAt,
  stage,
  reason,
  meta,
) {
  projectLog.warn(`${action} blocked`, {
    operationId,
    stage,
    reason,
    durationMs: Date.now() - startedAt,
    ...meta,
  });
}
function readErrorCode(error) {
  if (typeof error !== "object" || error === null) return void 0;
  const code = Reflect.get(error, "code");
  if (typeof code === "string" && code.trim())
    return code.trim().slice(0, 80);
  const status = Reflect.get(error, "status");
  if (typeof status === "number" && Number.isFinite(status))
    return `http_${status}`;
  return void 0;
}
function projectOperationError(error) {
  const errorCode = readErrorCode(error);
  return {
    errorKind: error instanceof Error ? error.name : typeof error,
    errorCode: errorCode ?? "unknown",
  };
}
export function logProjectOperationFailure(
  action,
  operationId,
  startedAt,
  stage,
  error,
  meta,
) {
  projectLog.error(`${action} failed`, {
    operationId,
    stage,
    durationMs: Date.now() - startedAt,
    ...projectOperationError(error),
    ...meta,
  });
}
export function retainCompleteWorkspaceCatalog(entries) {
  return [...entries];
}
function finiteManualOrder(workspace) {
  return typeof workspace.manualOrder === "number" &&
    Number.isFinite(workspace.manualOrder)
    ? workspace.manualOrder
    : void 0;
}
export function sortRecentWorkspacesByStableOrder(workspaces) {
  return workspaces
    .map((workspace, sourceIndex) => ({
      workspace,
      sourceIndex,
    }))
    .sort((leftItem, rightItem) => {
      const aOrder = finiteManualOrder(leftItem.workspace);
      const bOrder = finiteManualOrder(rightItem.workspace);
      if (aOrder === void 0 && bOrder !== void 0) return -1;
      if (aOrder !== void 0 && bOrder === void 0) return 1;
      if (aOrder !== void 0 && bOrder !== void 0 && aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return (
        rightItem.workspace.openedAt - leftItem.workspace.openedAt ||
        leftItem.sourceIndex - rightItem.sourceIndex
      );
    })
    .map(({ workspace }) => workspace);
}
