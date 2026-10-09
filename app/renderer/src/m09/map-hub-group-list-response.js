// map-hub-group-list-response.js
import { useBaseQuery, InfiniteQueryObserver, GatewayHttpError } from "../vendor.js";
export function useInfiniteQuery(options, queryClient2) {
  return useBaseQuery(options, InfiniteQueryObserver, queryClient2);
}
const TEAM_ERROR_CODES = new Set([
  "invalid_request",
  "permission_denied",
  "feature_disabled",
  "resource_not_found",
  "resource_closed",
  "membership_stale",
  "invalid_cursor",
  "version_conflict",
  "idempotency_conflict",
  "quota_insufficient",
  "team_balance_insufficient",
  "operation_not_found",
  "temporarily_unavailable",
]);
const ERROR_CODE_ALIASES = {
  team_context_stale: "membership_stale",
  context_stale: "membership_stale",
  forbidden: "permission_denied",
  not_found: "resource_not_found",
  team_closed: "resource_closed",
};
export class TeamApiError extends Error {
  constructor(payload, options) {
    super(`Team API request failed: ${payload.code}`, options);
    this.payload = payload;
    this.name = "TeamApiError";
  }
}
function normalizeCode(value) {
  if (!value) return "temporarily_unavailable";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^team_/, "");
  if (TEAM_ERROR_CODES.has(normalized)) return normalized;
  return ERROR_CODE_ALIASES[normalized] ?? "temporarily_unavailable";
}
function mapDetails(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const result = {};
  for (const [key2, item] of Object.entries(value)) {
    if (typeof item === "string") result[key2] = item;
  }
  return Object.keys(result).length > 0 ? result : void 0;
}
export function toTeamApiError(error) {
  if (error instanceof TeamApiError) return error;
  if (error instanceof GatewayHttpError) {
    const details = mapDetails(error.details);
    const currentVersion = details?.current_version;
    return new TeamApiError(
      {
        code: normalizeCode(error.code),
        ...(currentVersion
          ? {
              currentVersion,
            }
          : {}),
        ...(details
          ? {
              details,
            }
          : {}),
      },
      {
        cause: error,
      },
    );
  }
  return new TeamApiError(
    {
      code: "temporarily_unavailable",
    },
    {
      cause: error,
    },
  );
}
export function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
}
const UNSIGNED_DECIMAL_RE$1 = /^(0|[1-9]\d*)$/;
const POSITIVE_DECIMAL_RE = /^[1-9]\d*$/;
const SIGNED_DECIMAL_RE$1 = /^-?(0|[1-9]\d*)$/;
const MAX_SIGNED_INT64$1 = 9223372036854775807n;
export class TeamContractError extends Error {
  constructor(field, message2) {
    super(`Invalid Team contract field "${field}": ${message2}`);
    this.field = field;
    this.name = "TeamContractError";
  }
}
export function asRecord$5(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TeamContractError(field, "expected object");
  }
  return value;
}
export function asArray(value, field) {
  if (!Array.isArray(value)) throw new TeamContractError(field, "expected array");
  return value;
}
export function asString$2(value, field) {
  if (typeof value !== "string") throw new TeamContractError(field, "expected string");
  return value;
}
export function asNonEmptyString(value, field) {
  const result = asString$2(value, field).trim();
  if (!result) throw new TeamContractError(field, "must not be empty");
  return result;
}
export function asTransactionId(value, field) {
  return asNonEmptyString(value, field);
}
export function asUnsignedDecimal(value, field) {
  const result = asString$2(value, field);
  if (!UNSIGNED_DECIMAL_RE$1.test(result)) {
    throw new TeamContractError(field, "expected unsigned decimal string");
  }
  return result;
}
export function asPositiveDecimal$1(value, field) {
  const result = asString$2(value, field);
  if (!POSITIVE_DECIMAL_RE.test(result)) {
    throw new TeamContractError(field, "expected positive decimal string");
  }
  return result;
}
export function asPositiveInt64Decimal$1(value, field) {
  const result = asPositiveDecimal$1(value, field);
  if (BigInt(result) > MAX_SIGNED_INT64$1) {
    throw new TeamContractError(field, "expected positive int64 decimal string");
  }
  return result;
}
export function asSignedDecimal(value, field) {
  const result = asString$2(value, field);
  if (!SIGNED_DECIMAL_RE$1.test(result)) {
    throw new TeamContractError(field, "expected signed decimal string");
  }
  return result;
}
export function asSafeInteger$1(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TeamContractError(field, "expected non-negative safe integer");
  }
  return value;
}
export function asBoolean$1(value, field) {
  if (typeof value !== "boolean") throw new TeamContractError(field, "expected boolean");
  return value;
}
export function asNullableDecimal(value, field) {
  return value == null ? null : asUnsignedDecimal(value, field);
}
export function asOptionalString$1(value, field) {
  return value == null ? null : asString$2(value, field);
}
export function asRole(value, field) {
  const role =
    typeof value === "number"
      ? value === 1
        ? "OWNER"
        : value === 4
          ? "ADMIN"
          : value === 2
            ? "MEMBER"
            : ""
      : asString$2(value, field).toUpperCase();
  if (role === "READER" || role === "MEMBER") return "MEMBER";
  if (role === "OWNER" || role === "ADMIN") return role;
  throw new TeamContractError(field, `unsupported role ${role}`);
}
export function mapActionDecision(value, field) {
  if (value == null)
    return {
      allowed: false,
      reasonCode: "contract_missing",
    };
  const record2 = asRecord$5(value, field);
  return {
    allowed: asBoolean$1(record2.allowed, `${field}.allowed`),
    reasonCode: asOptionalString$1(record2.reason_code, `${field}.reason_code`),
  };
}
export function mapStringRecord(value, field) {
  if (value == null) return {};
  const record2 = asRecord$5(value, field);
  const result = {};
  for (const [key2, item] of Object.entries(record2)) {
    result[key2] = asString$2(item, `${field}.${key2}`);
  }
  return result;
}
export function mapTeamFeatureContract(value) {
  const record2 = asRecord$5(value, "contract");
  const gates = asRecord$5(record2.gates ?? {}, "contract.gates");
  const limits = asRecord$5(record2.limits, "contract.limits");
  const compatibility = asString$2(record2.compatibility, "contract.compatibility");
  if (
    compatibility !== "SUPPORTED" &&
    compatibility !== "UPGRADE_REQUIRED" &&
    compatibility !== "TEMPORARILY_UNAVAILABLE"
  ) {
    throw new TeamContractError("contract.compatibility", `unsupported value ${compatibility}`);
  }
  return {
    contractVersion: asUnsignedDecimal(record2.contract_version, "contract.contract_version"),
    minimumClientVersion: asNonEmptyString(
      record2.minimum_client_version,
      "contract.minimum_client_version",
    ),
    compatibility,
    gates: {
      teamRead: gates.team_read === true,
      teamSwitch: gates.team_switch === true,
      teamInvitation: gates.team_invitation === true,
      teamBilling: gates.team_billing === true,
      teamMutation: gates.team_mutation === true,
    },
    limits: {
      maxGroupsIncludingPersonal: asSafeInteger$1(
        limits.max_groups_including_personal,
        "contract.limits.max_groups_including_personal",
      ),
      maxMembersPerTeam: asSafeInteger$1(
        limits.max_members_per_team,
        "contract.limits.max_members_per_team",
      ),
      maxMemberPageSize: asSafeInteger$1(
        limits.max_member_page_size,
        "contract.limits.max_member_page_size",
      ),
    },
  };
}
export function mapTeamCreateResult(value) {
  const record2 = asRecord$5(value, "create_team");
  return {
    groupId: asPositiveDecimal$1(record2.group_id, "create_team.group_id"),
    role: record2.role == null ? "OWNER" : asRole(record2.role, "create_team.role"),
    ...(record2.subject_id === void 0 || record2.subject_id === null
      ? {}
      : {
          subjectId: asPositiveDecimal$1(record2.subject_id, "create_team.subject_id"),
        }),
  };
}
function mapHubGroupListResponse(value) {
  const record2 = asRecord$5(value, "group_list");
  const seenGroupIds = new Set();
  const groups = asArray(record2.groups ?? [], "group_list.groups").map((item, index2) => {
    const field = `group_list.groups[${index2}]`;
    const group = asRecord$5(item, field);
    const groupId2 = asPositiveDecimal$1(group.group_id, `${field}.group_id`);
    if (seenGroupIds.has(groupId2)) {
      throw new TeamContractError(`${field}.group_id`, "expected unique group id");
    }
    seenGroupIds.add(groupId2);
    return {
      groupId: groupId2,
      groupName: typeof group.group_name === "string" ? group.group_name.trim() : "",
      isDefault: asBoolean$1(group.is_default, `${field}.is_default`),
      memberCount:
        group.member_count == null
          ? 0
          : asSafeInteger$1(group.member_count, `${field}.member_count`),
      ...(group.member_limit == null
        ? {}
        : {
            memberLimit: asSafeInteger$1(group.member_limit, `${field}.member_limit`),
          }),
      createdAtMs:
        group.create_at == null ? 0 : asSafeInteger$1(group.create_at, `${field}.create_at`),
    };
  });
  const rolesRecord =
    record2.user_group_roles == null
      ? {}
      : asRecord$5(record2.user_group_roles, "group_list.user_group_roles");
  const userGroupRoles = {};
  for (const [groupId2, role] of Object.entries(rolesRecord)) {
    asPositiveDecimal$1(groupId2, `group_list.user_group_roles.${groupId2}`);
    if (role !== 1 && role !== 2 && role !== 3 && role !== 4) {
      throw new TeamContractError(
        `group_list.user_group_roles.${groupId2}`,
        "expected role 1 | 2 | 3 | 4",
      );
    }
    userGroupRoles[groupId2] = role;
  }
  for (const group of groups) {
    if (userGroupRoles[group.groupId] === void 0) {
      throw new TeamContractError(
        `group_list.user_group_roles.${group.groupId}`,
        "expected role for group",
      );
    }
  }
  return {
    groups,
    userGroupRoles,
  };
}
function mapHubRole(value) {
  if (value === void 0 || value === 0) return null;
  if (value === 1) return "OWNER";
  if (value === 4) return "ADMIN";
  if (value === 2) return "MEMBER";
  return null;
}
function hubGroupListRevision(data2) {
  let hash2 = 17n;
  const sortedGroups = [...data2.groups].sort((left, right) =>
    left.groupId.localeCompare(right.groupId),
  );
  for (const group of sortedGroups) {
    hash2 = (hash2 * 131n + BigInt(group.groupId) + BigInt(group.createdAtMs % 1e6)) % 10n ** 18n;
    hash2 = (hash2 * 131n + BigInt(data2.userGroupRoles[group.groupId] ?? 0)) % 10n ** 18n;
  }
  return hash2.toString();
}
export function mapHubGroupListToTeamContexts(value) {
  const data2 = mapHubGroupListResponse(value);
  return {
    contextsRevision: hubGroupListRevision(data2),
    items: data2.groups.map((group) => {
      const role = mapHubRole(data2.userGroupRoles[group.groupId]);
      const switchAllowed = role !== null;
      return {
        groupId: group.groupId,
        accountType: group.isDefault ? "PERSONAL" : "TEAM",
        displayName: group.groupName,
        lifecycle: "ACTIVE",
        role: group.isDefault ? null : role,
        joinedAtMs: group.createdAtMs,
        lastActiveAtMs: group.createdAtMs,
        dissolvedAtMs: null,
        recordVersion: group.createdAtMs.toString(),
        switchDecision: switchAllowed
          ? {
              allowed: true,
              reasonCode: null,
            }
          : {
              allowed: false,
              reasonCode: "pending_membership",
            },
        dismissDecision: {
          allowed: false,
          reasonCode: "dismiss_not_supported",
        },
      };
    }),
    serverTimeMs: Date.now(),
  };
}
export function mapTeamMutationOk(value) {
  const record2 = asRecord$5(value, "mutation");
  if (record2.ok !== true) throw new TeamContractError("mutation.ok", "expected true");
  return {
    ok: true,
  };
}
export function mapTeamDeleteResult(value) {
  const record2 = asRecord$5(value, "delete_team");
  if (record2.ok !== true) throw new TeamContractError("delete_team.ok", "expected true");
  return {
    ok: true,
    ...(typeof record2.deleted_group_name === "string" && record2.deleted_group_name.trim()
      ? {
          deletedGroupName: record2.deleted_group_name.trim(),
        }
      : {}),
  };
}
export function mapTeamInviteMembersResult(value) {
  const record2 = asRecord$5(value, "invite_members");
  const results = asArray(record2.results, "invite_members.results").map((item, index2) => {
    const row = asRecord$5(item, `invite_members.results[${index2}]`);
    const statusRaw = asString$2(row.status, `invite_members.results[${index2}].status`);
    const status =
      statusRaw === "PENDING" ||
      statusRaw === "FAILED" ||
      statusRaw === "ACCEPTED" ||
      statusRaw === "UNKNOWN"
        ? statusRaw
        : "UNKNOWN";
    return {
      email: asNonEmptyString(row.email, `invite_members.results[${index2}].email`),
      status,
      ...(typeof row.invitation_id === "string" && row.invitation_id.trim()
        ? {
            invitationId: row.invitation_id.trim(),
          }
        : {}),
      ...(typeof row.error_message === "string" && row.error_message.trim()
        ? {
            errorMessage: row.error_message.trim(),
          }
        : {}),
      ...(typeof row.group_name === "string" && row.group_name.trim()
        ? {
            groupName: row.group_name.trim(),
          }
        : {}),
    };
  });
  return {
    successCount: asSafeInteger$1(record2.success_count, "invite_members.success_count"),
    failedCount: asSafeInteger$1(record2.failed_count, "invite_members.failed_count"),
    results,
  };
}
export function mapUserTeamCapabilities(value) {
  const record2 = asRecord$5(value, "capabilities");
  return {
    identityKey: asNonEmptyString(record2.identity_key, "capabilities.identity_key"),
    revision: asUnsignedDecimal(record2.revision, "capabilities.revision"),
    createTeam: mapActionDecision(record2.create_team, "capabilities.create_team"),
    viewInvitations: mapActionDecision(record2.view_invitations, "capabilities.view_invitations"),
  };
}
export function mapTeamCreditSummary(value, field = "credit_summary") {
  const record2 = asRecord$5(value, field);
  const mode2 = asString$2(record2.mode, `${field}.mode`);
  if (mode2 !== "LIMITED" && mode2 !== "UNLIMITED" && mode2 !== "UNAVAILABLE") {
    throw new TeamContractError(`${field}.mode`, `unsupported value ${mode2}`);
  }
  const memberLimit = asNullableDecimal(record2.member_limit, `${field}.member_limit`);
  const memberUsed = asNullableDecimal(record2.member_used, `${field}.member_used`);
  const memberRemaining = asNullableDecimal(record2.member_remaining, `${field}.member_remaining`);
  if (mode2 === "LIMITED" && memberLimit === null) {
    throw new TeamContractError(`${field}.member_limit`, "required for LIMITED summary");
  }
  if (
    mode2 === "LIMITED" &&
    ((memberUsed === null && memberRemaining !== null) ||
      (memberUsed !== null && memberRemaining === null))
  ) {
    throw new TeamContractError(
      field,
      "member_used and member_remaining must both be known or both be null",
    );
  }
  if (mode2 !== "LIMITED" && (memberLimit !== null || memberRemaining !== null)) {
    throw new TeamContractError(
      field,
      "member_limit and member_remaining are only valid for LIMITED summary",
    );
  }
  return {
    groupId: asPositiveDecimal$1(record2.group_id, `${field}.group_id`),
    mode: mode2,
    memberLimit,
    memberUsed,
    memberRemaining,
    teamTotal: asNullableDecimal(record2.team_total, `${field}.team_total`),
    teamUsed: asNullableDecimal(record2.team_used, `${field}.team_used`),
    teamRemaining: asUnsignedDecimal(record2.team_remaining, `${field}.team_remaining`),
    unit: asNonEmptyString(record2.unit, `${field}.unit`),
    updatedAtMs: asSafeInteger$1(record2.updated_at_ms, `${field}.updated_at_ms`),
  };
}
function mapTeamPermissions(value, field, groupId2, revision) {
  const record2 = asRecord$5(value, field);
  return {
    groupId: groupId2,
    membershipRevision: revision,
    manageTeam: mapActionDecision(record2.manage_team, `${field}.manage_team`),
    viewMembers: mapActionDecision(record2.view_members, `${field}.view_members`),
    createInviteLink: mapActionDecision(record2.create_invite_link, `${field}.create_invite_link`),
    revokeInviteLink: mapActionDecision(record2.revoke_invite_link, `${field}.revoke_invite_link`),
    purchaseCredits: mapActionDecision(record2.purchase_credits, `${field}.purchase_credits`),
    configureQuota: mapActionDecision(record2.configure_quota, `${field}.configure_quota`),
    viewTransactions: mapActionDecision(record2.view_transactions, `${field}.view_transactions`),
    leaveTeam: mapActionDecision(record2.leave_team, `${field}.leave_team`),
    transferOwner: mapActionDecision(record2.transfer_owner, `${field}.transfer_owner`),
    dissolveTeam: mapActionDecision(record2.dissolve_team, `${field}.dissolve_team`),
  };
}
export function mapTeamDetail(value) {
  const record2 = asRecord$5(value, "team_detail");
  const groupId2 = asPositiveDecimal$1(record2.group_id, "team_detail.group_id");
  const membershipRevision = asUnsignedDecimal(
    record2.membership_revision,
    "team_detail.membership_revision",
  );
  return {
    groupId: groupId2,
    teamName: asNonEmptyString(record2.team_name, "team_detail.team_name"),
    memberCount: asSafeInteger$1(record2.member_count, "team_detail.member_count"),
    teamVersion: asUnsignedDecimal(record2.team_version, "team_detail.team_version"),
    membershipRevision,
    currentRole: asRole(record2.current_role, "team_detail.current_role"),
    permissions: mapTeamPermissions(
      record2.permissions,
      "team_detail.permissions",
      groupId2,
      membershipRevision,
    ),
    creditSummary:
      record2.credit_summary == null
        ? null
        : mapTeamCreditSummary(record2.credit_summary, "team_detail.credit_summary"),
  };
}
