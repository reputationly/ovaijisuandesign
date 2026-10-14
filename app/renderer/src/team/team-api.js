// team-api.js
import {
  asNonEmptyString,
  asNullableDecimal,
  asPositiveDecimal,
  asRecord,
  asSafeInteger,
  asString,
  asUnsignedDecimal,
  mapTeamCreditSummary,
  TeamApiError,
  TeamContractError,
} from "./map-team-credit-summary.js";
import { GatewayHttpError } from "../infra/gateway-http-error.jsx";
import { gatewayFetch } from "../infra/gateway-fetch.js";
import { API_PATHS, HILO_HUB_BIZ_LINE } from "../infra/workspace-gateway.js";
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
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") result[key] = item;
  }
  return Object.keys(result).length > 0 ? result : void 0;
}
function toTeamApiError(error) {
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
function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
}
const SIGNED_DECIMAL_RE = /^-?(0|[1-9]\d*)$/;
const INT64_MAX = 9223372036854775807n;
function asArray(value, field) {
  if (!Array.isArray(value))
    throw new TeamContractError(field, "expected array");
  return value;
}
function asTransactionId(value, field) {
  return asNonEmptyString(value, field);
}
function asPositiveInt64DecimalString(value, field) {
  const result = asPositiveDecimal(value, field);
  if (BigInt(result) > INT64_MAX) {
    throw new TeamContractError(
      field,
      "expected positive int64 decimal string",
    );
  }
  return result;
}
function asSignedDecimal(value, field) {
  const result = asString(value, field);
  if (!SIGNED_DECIMAL_RE.test(result)) {
    throw new TeamContractError(field, "expected signed decimal string");
  }
  return result;
}
function asBoolean(value, field) {
  if (typeof value !== "boolean")
    throw new TeamContractError(field, "expected boolean");
  return value;
}
function asOptionalString(value, field) {
  return value == null ? null : asString(value, field);
}
function asRole(value, field) {
  const role =
    typeof value === "number"
      ? value === 1
        ? "OWNER"
        : value === 4
          ? "ADMIN"
          : value === 2
            ? "MEMBER"
            : ""
      : asString(value, field).toUpperCase();
  if (role === "READER" || role === "MEMBER") return "MEMBER";
  if (role === "OWNER" || role === "ADMIN") return role;
  throw new TeamContractError(field, `unsupported role ${role}`);
}
function mapActionDecision(value, field) {
  if (value == null)
    return {
      allowed: false,
      reasonCode: "contract_missing",
    };
  const record = asRecord(value, field);
  return {
    allowed: asBoolean(record.allowed, `${field}.allowed`),
    reasonCode: asOptionalString(record.reason_code, `${field}.reason_code`),
  };
}
function mapStringRecord(value, field) {
  if (value == null) return {};
  const record = asRecord(value, field);
  const result = {};
  for (const [key, item] of Object.entries(record)) {
    result[key] = asString(item, `${field}.${key}`);
  }
  return result;
}
function mapTeamFeatureContract(value) {
  const record = asRecord(value, "contract");
  const gates = asRecord(record.gates ?? {}, "contract.gates");
  const limits = asRecord(record.limits, "contract.limits");
  const compatibility = asString(
    record.compatibility,
    "contract.compatibility",
  );
  if (
    compatibility !== "SUPPORTED" &&
    compatibility !== "UPGRADE_REQUIRED" &&
    compatibility !== "TEMPORARILY_UNAVAILABLE"
  ) {
    throw new TeamContractError(
      "contract.compatibility",
      `unsupported value ${compatibility}`,
    );
  }
  return {
    contractVersion: asUnsignedDecimal(
      record.contract_version,
      "contract.contract_version",
    ),
    minimumClientVersion: asNonEmptyString(
      record.minimum_client_version,
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
      maxGroupsIncludingPersonal: asSafeInteger(
        limits.max_groups_including_personal,
        "contract.limits.max_groups_including_personal",
      ),
      maxMembersPerTeam: asSafeInteger(
        limits.max_members_per_team,
        "contract.limits.max_members_per_team",
      ),
      maxMemberPageSize: asSafeInteger(
        limits.max_member_page_size,
        "contract.limits.max_member_page_size",
      ),
    },
  };
}
function mapTeamCreateResult(value) {
  const record = asRecord(value, "create_team");
  return {
    groupId: asPositiveDecimal(record.group_id, "create_team.group_id"),
    role:
      record.role == null ? "OWNER" : asRole(record.role, "create_team.role"),
    ...(record.subject_id === void 0 || record.subject_id === null
      ? {}
      : {
          subjectId: asPositiveDecimal(
            record.subject_id,
            "create_team.subject_id",
          ),
        }),
  };
}
function mapHubGroupListResponse(value) {
  const record = asRecord(value, "group_list");
  const seenGroupIds = new Set();
  const groups = asArray(record.groups ?? [], "group_list.groups").map(
    (item, index) => {
      const field = `group_list.groups[${index}]`;
      const group = asRecord(item, field);
      const groupId = asPositiveDecimal(group.group_id, `${field}.group_id`);
      if (seenGroupIds.has(groupId)) {
        throw new TeamContractError(
          `${field}.group_id`,
          "expected unique group id",
        );
      }
      seenGroupIds.add(groupId);
      return {
        groupId,
        groupName:
          typeof group.group_name === "string" ? group.group_name.trim() : "",
        isDefault: asBoolean(group.is_default, `${field}.is_default`),
        memberCount:
          group.member_count == null
            ? 0
            : asSafeInteger(group.member_count, `${field}.member_count`),
        ...(group.member_limit == null
          ? {}
          : {
              memberLimit: asSafeInteger(
                group.member_limit,
                `${field}.member_limit`,
              ),
            }),
        createdAtMs:
          group.create_at == null
            ? 0
            : asSafeInteger(group.create_at, `${field}.create_at`),
      };
    },
  );
  const rolesRecord =
    record.user_group_roles == null
      ? {}
      : asRecord(record.user_group_roles, "group_list.user_group_roles");
  const userGroupRoles = {};
  for (const [groupId, role] of Object.entries(rolesRecord)) {
    asPositiveDecimal(groupId, `group_list.user_group_roles.${groupId}`);
    if (role !== 1 && role !== 2 && role !== 3 && role !== 4) {
      throw new TeamContractError(
        `group_list.user_group_roles.${groupId}`,
        "expected role 1 | 2 | 3 | 4",
      );
    }
    userGroupRoles[groupId] = role;
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
function hubGroupListRevision(data) {
  let hash = 17n;
  const sortedGroups = [...data.groups].sort((left, right) =>
    left.groupId.localeCompare(right.groupId),
  );
  for (const group of sortedGroups) {
    hash =
      (hash * 131n + BigInt(group.groupId) + BigInt(group.createdAtMs % 1e6)) %
      10n ** 18n;
    hash =
      (hash * 131n + BigInt(data.userGroupRoles[group.groupId] ?? 0)) %
      10n ** 18n;
  }
  return hash.toString();
}
function mapHubGroupListToTeamContexts(value) {
  const data = mapHubGroupListResponse(value);
  return {
    contextsRevision: hubGroupListRevision(data),
    items: data.groups.map((group) => {
      const role = mapHubRole(data.userGroupRoles[group.groupId]);
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
function mapTeamMutationOk(value) {
  const record = asRecord(value, "mutation");
  if (record.ok !== true)
    throw new TeamContractError("mutation.ok", "expected true");
  return {
    ok: true,
  };
}
function mapTeamDeleteResult(value) {
  const record = asRecord(value, "delete_team");
  if (record.ok !== true)
    throw new TeamContractError("delete_team.ok", "expected true");
  return {
    ok: true,
    ...(typeof record.deleted_group_name === "string" &&
    record.deleted_group_name.trim()
      ? {
          deletedGroupName: record.deleted_group_name.trim(),
        }
      : {}),
  };
}
function mapTeamInviteMembersResult(value) {
  const record = asRecord(value, "invite_members");
  const results = asArray(record.results, "invite_members.results").map(
    (item, index) => {
      const row = asRecord(item, `invite_members.results[${index}]`);
      const statusRaw = asString(
        row.status,
        `invite_members.results[${index}].status`,
      );
      const status =
        statusRaw === "PENDING" ||
        statusRaw === "FAILED" ||
        statusRaw === "ACCEPTED" ||
        statusRaw === "UNKNOWN"
          ? statusRaw
          : "UNKNOWN";
      return {
        email: asNonEmptyString(
          row.email,
          `invite_members.results[${index}].email`,
        ),
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
    },
  );
  return {
    successCount: asSafeInteger(
      record.success_count,
      "invite_members.success_count",
    ),
    failedCount: asSafeInteger(
      record.failed_count,
      "invite_members.failed_count",
    ),
    results,
  };
}
function mapUserTeamCapabilities(value) {
  const record = asRecord(value, "capabilities");
  return {
    identityKey: asNonEmptyString(
      record.identity_key,
      "capabilities.identity_key",
    ),
    revision: asUnsignedDecimal(record.revision, "capabilities.revision"),
    createTeam: mapActionDecision(
      record.create_team,
      "capabilities.create_team",
    ),
    viewInvitations: mapActionDecision(
      record.view_invitations,
      "capabilities.view_invitations",
    ),
  };
}
function mapTeamPermissions(value, field, groupId, revision) {
  const record = asRecord(value, field);
  return {
    groupId,
    membershipRevision: revision,
    manageTeam: mapActionDecision(record.manage_team, `${field}.manage_team`),
    viewMembers: mapActionDecision(
      record.view_members,
      `${field}.view_members`,
    ),
    createInviteLink: mapActionDecision(
      record.create_invite_link,
      `${field}.create_invite_link`,
    ),
    revokeInviteLink: mapActionDecision(
      record.revoke_invite_link,
      `${field}.revoke_invite_link`,
    ),
    purchaseCredits: mapActionDecision(
      record.purchase_credits,
      `${field}.purchase_credits`,
    ),
    configureQuota: mapActionDecision(
      record.configure_quota,
      `${field}.configure_quota`,
    ),
    viewTransactions: mapActionDecision(
      record.view_transactions,
      `${field}.view_transactions`,
    ),
    leaveTeam: mapActionDecision(record.leave_team, `${field}.leave_team`),
    transferOwner: mapActionDecision(
      record.transfer_owner,
      `${field}.transfer_owner`,
    ),
    dissolveTeam: mapActionDecision(
      record.dissolve_team,
      `${field}.dissolve_team`,
    ),
  };
}
function mapTeamDetail(value) {
  const record = asRecord(value, "team_detail");
  const groupId = asPositiveDecimal(record.group_id, "team_detail.group_id");
  const membershipRevision = asUnsignedDecimal(
    record.membership_revision,
    "team_detail.membership_revision",
  );
  return {
    groupId,
    teamName: asNonEmptyString(record.team_name, "team_detail.team_name"),
    memberCount: asSafeInteger(
      record.member_count,
      "team_detail.member_count",
    ),
    teamVersion: asUnsignedDecimal(
      record.team_version,
      "team_detail.team_version",
    ),
    membershipRevision,
    currentRole: asRole(record.current_role, "team_detail.current_role"),
    permissions: mapTeamPermissions(
      record.permissions,
      "team_detail.permissions",
      groupId,
      membershipRevision,
    ),
    creditSummary:
      record.credit_summary == null
        ? null
        : mapTeamCreditSummary(
            record.credit_summary,
            "team_detail.credit_summary",
          ),
  };
}
function mapQuotaUsage(value, field) {
  const record = asRecord(value, field);
  const mode = asString(record.mode, `${field}.mode`);
  if (mode !== "LIMITED" && mode !== "UNLIMITED" && mode !== "UNAVAILABLE") {
    throw new TeamContractError(`${field}.mode`, `unsupported value ${mode}`);
  }
  const limit = asNullableDecimal(record.limit, `${field}.limit`);
  const used = asNullableDecimal(record.used, `${field}.used`);
  const remaining = asNullableDecimal(record.remaining, `${field}.remaining`);
  if (mode === "LIMITED" && limit === null) {
    throw new TeamContractError(field, "LIMITED quota requires limit");
  }
  if (mode === "UNLIMITED" && (limit !== null || remaining !== null)) {
    throw new TeamContractError(
      field,
      "UNLIMITED quota must not include limit or remaining",
    );
  }
  if (
    mode === "UNAVAILABLE" &&
    (limit !== null || used !== null || remaining !== null)
  ) {
    throw new TeamContractError(
      field,
      "UNAVAILABLE quota must not include amounts",
    );
  }
  return {
    mode,
    limit,
    used,
    remaining,
  };
}
function mapMember(value, index) {
  const field = `members.items[${index}]`;
  const record = asRecord(value, field);
  const permissions = asRecord(
    record.permissions ?? {},
    `${field}.permissions`,
  );
  return {
    userId: asPositiveDecimal(record.user_id, `${field}.user_id`),
    displayName: asNonEmptyString(
      record.display_name,
      `${field}.display_name`,
    ),
    role: asRole(record.role, `${field}.role`),
    memberVersion: asUnsignedDecimal(
      record.member_version,
      `${field}.member_version`,
    ),
    quota: mapQuotaUsage(record.quota, `${field}.quota`),
    permissions: {
      changeRole: mapActionDecision(
        permissions.change_role,
        `${field}.permissions.change_role`,
      ),
      changeQuota: mapActionDecision(
        permissions.change_quota,
        `${field}.permissions.change_quota`,
      ),
      removeMember: mapActionDecision(
        permissions.remove_member,
        `${field}.permissions.remove_member`,
      ),
      viewUsage: mapActionDecision(
        permissions.view_usage,
        `${field}.permissions.view_usage`,
      ),
      viewTransactions: mapActionDecision(
        permissions.view_transactions,
        `${field}.permissions.view_transactions`,
      ),
    },
  };
}
function mapTeamMembersPage(value) {
  const record = asRecord(value, "members");
  return {
    items: asArray(record.items, "members.items").map(mapMember),
    nextCursor: asOptionalString(record.next_cursor, "members.next_cursor"),
    hasMore: asBoolean(record.has_more, "members.has_more"),
    membershipRevision: asUnsignedDecimal(
      record.membership_revision,
      "members.membership_revision",
    ),
    serverTimeMs: asSafeInteger(
      record.server_time_ms,
      "members.server_time_ms",
    ),
  };
}
function mapPastTeamMember(value, field) {
  const record = asRecord(value, field);
  const userId = asPositiveDecimal(record.user_id, `${field}.user_id`);
  const userName =
    record.name == null || record.name === ""
      ? userId
      : asString(record.name, `${field}.name`);
  return {
    groupId: asPositiveDecimal(record.group_id, `${field}.group_id`),
    userId,
    userName,
  };
}
function mapQueryGroupMembers(value) {
  const record = asRecord(value, "query_members");
  const members =
    record.members == null
      ? []
      : asArray(record.members, "query_members.members");
  return members.map((member, index) =>
    mapPastTeamMember(member, `query_members.members[${index}]`),
  );
}
function mapTeamMemberDetail(value, index) {
  const field = `member_details.items[${index}]`;
  const record = asRecord(value, field);
  const userId = asPositiveDecimal(record.user_id, `${field}.user_id`);
  const userName =
    record.user_name == null || record.user_name === ""
      ? userId
      : asString(record.user_name, `${field}.user_name`);
  const quotaUsage =
    record.quota_usage == null
      ? null
      : asRecord(record.quota_usage, `${field}.quota_usage`);
  return {
    userId,
    userName,
    quotaLimit:
      quotaUsage === null
        ? null
        : asUnsignedDecimal(
            quotaUsage.quota_limit,
            `${field}.quota_usage.quota_limit`,
          ),
    quotaUsed:
      quotaUsage === null
        ? null
        : asUnsignedDecimal(
            quotaUsage.quota_used,
            `${field}.quota_usage.quota_used`,
          ),
    totalUsed: asUnsignedDecimal(record.total_used, `${field}.total_used`),
  };
}
function mapTeamMemberDetails(value) {
  const record = asRecord(value, "member_details");
  return asArray(record.items, "member_details.items").map(
    mapTeamMemberDetail,
  );
}
function mapBatchAddMembersResults(value) {
  const record = asRecord(value, "batch_add");
  return asArray(record.results, "batch_add.results").map((item, index) => {
    const field = `batch_add.results[${index}]`;
    const row = asRecord(item, field);
    const status = asString(row.status, `${field}.status`);
    if (status !== "ADDED" && status !== "FAILED") {
      throw new TeamContractError(
        `${field}.status`,
        `unsupported value ${status}`,
      );
    }
    return {
      userId: asPositiveDecimal(row.user_id, `${field}.user_id`),
      status,
      errorCode:
        row.error_code == null || row.error_code === ""
          ? null
          : asString(row.error_code, `${field}.error_code`),
    };
  });
}
function mapInviteLink(value, index) {
  const field = `invite_links.items[${index}]`;
  const record = asRecord(value, field);
  const status = asString(record.status, `${field}.status`);
  if (
    status !== "ACTIVE" &&
    status !== "EXPIRED" &&
    status !== "REVOKED" &&
    status !== "EXHAUSTED"
  ) {
    throw new TeamContractError(
      `${field}.status`,
      `unsupported value ${status}`,
    );
  }
  return {
    inviteLinkId: asNonEmptyString(
      record.invite_link_id,
      `${field}.invite_link_id`,
    ),
    version: asNonEmptyString(record.version, `${field}.version`),
    role: asRole(record.role, `${field}.role`),
    expiresAtMs: asSafeInteger(record.expires_at_ms, `${field}.expires_at_ms`),
    usageLimit: asSafeInteger(record.usage_limit, `${field}.usage_limit`),
    usedCount: asSafeInteger(record.used_count, `${field}.used_count`),
    status,
    maskedUrl: asNonEmptyString(record.masked_url, `${field}.masked_url`),
  };
}
function mapTeamInviteLinksPage(value) {
  const record = asRecord(value, "invite_links");
  return {
    items: asArray(record.items, "invite_links.items").map(mapInviteLink),
    nextCursor: asOptionalString(
      record.next_cursor,
      "invite_links.next_cursor",
    ),
    hasMore: asBoolean(record.has_more, "invite_links.has_more"),
    serverTimeMs: asSafeInteger(
      record.server_time_ms,
      "invite_links.server_time_ms",
    ),
  };
}
function mapTeamInviteLinkCreateResult(value) {
  const record = asRecord(value, "invite_link_create");
  return {
    token: asNonEmptyString(record.token, "invite_link_create.token"),
  };
}
function mapTeamInviteLinkInfo(value) {
  const record = asRecord(value, "invite_link_info");
  const source = asRecord(record.link_info ?? record, "invite_link_info");
  const rawStatus = source.status;
  const status =
    rawStatus === 1 || rawStatus === "ACTIVE"
      ? "ACTIVE"
      : rawStatus === 2 || rawStatus === "REVOKED"
        ? "REVOKED"
        : rawStatus === 3 || rawStatus === "EXPIRED"
          ? "EXPIRED"
          : rawStatus === "EXHAUSTED"
            ? "EXHAUSTED"
            : null;
  if (!status)
    throw new TeamContractError("invite_link_info.status", "unsupported value");
  return {
    token: asNonEmptyString(source.token, "invite_link_info.token"),
    groupId: asPositiveDecimal(source.group_id, "invite_link_info.group_id"),
    groupName: asNonEmptyString(
      source.group_name,
      "invite_link_info.group_name",
    ),
    inviterName: asString(
      source.inviter_name ?? source.creator_name,
      "invite_link_info.inviter_name",
    ),
    memberCount: asSafeInteger(
      source.member_count,
      "invite_link_info.member_count",
    ),
    role: asRole(source.role, "invite_link_info.role"),
    expiresAtMs:
      source.expires_at_ms == null && source.expire_at == null
        ? null
        : asSafeInteger(
            source.expires_at_ms ?? source.expire_at,
            "invite_link_info.expires_at_ms",
          ),
    usageLimit: asSafeInteger(
      source.usage_limit ?? source.max_uses ?? 0,
      "invite_link_info.usage_limit",
    ),
    usedCount: asSafeInteger(
      source.used_count ?? 0,
      "invite_link_info.used_count",
    ),
    status,
  };
}
function mapTeamInviteLinkAcceptResult(value) {
  const record = asRecord(value, "invite_link_accept");
  return {
    status: asSafeInteger(record.status, "invite_link_accept.status"),
    ...(record.group_id === void 0
      ? {}
      : {
          groupId: asPositiveDecimal(
            record.group_id,
            "invite_link_accept.group_id",
          ),
        }),
    ...(record.group_name === void 0
      ? {}
      : {
          groupName: asNonEmptyString(
            record.group_name,
            "invite_link_accept.group_name",
          ),
        }),
    ...(record.role === void 0
      ? {}
      : {
          role: asRole(record.role, "invite_link_accept.role"),
        }),
  };
}
function mapTeamQuota(value) {
  const record = asRecord(value, "quota");
  const defaultMode = asString(record.default_mode, "quota.default_mode");
  if (
    defaultMode !== "LIMITED" &&
    defaultMode !== "UNLIMITED" &&
    defaultMode !== "MIXED" &&
    defaultMode !== "UNAVAILABLE"
  ) {
    throw new TeamContractError(
      "quota.default_mode",
      `unsupported value ${defaultMode}`,
    );
  }
  const resetPolicy = asString(record.reset_policy, "quota.reset_policy");
  if (resetPolicy !== "NONE") {
    throw new TeamContractError(
      "quota.reset_policy",
      `unsupported value ${resetPolicy}`,
    );
  }
  const memberLimit = asNullableDecimal(
    record.member_limit,
    "quota.member_limit",
  );
  const memberRemaining = asNullableDecimal(
    record.member_remaining,
    "quota.member_remaining",
  );
  if (defaultMode === "LIMITED" && memberLimit === null) {
    throw new TeamContractError("quota", "LIMITED quota requires limit");
  }
  if (
    defaultMode !== "LIMITED" &&
    (memberLimit !== null || memberRemaining !== null)
  ) {
    throw new TeamContractError(
      "quota",
      "non-LIMITED quota must not include limit or remaining",
    );
  }
  return {
    quotaRevision: asUnsignedDecimal(
      record.quota_revision,
      "quota.quota_revision",
    ),
    defaultMode,
    teamRemaining: asUnsignedDecimal(
      record.team_remaining,
      "quota.team_remaining",
    ),
    memberLimit,
    memberUsed: asNullableDecimal(record.member_used, "quota.member_used"),
    memberRemaining,
    eligibleMemberCount: asSafeInteger(
      record.eligible_member_count,
      "quota.eligible_member_count",
    ),
    resetPolicy,
  };
}
function mapTransaction(value, index) {
  const field = `transactions.items[${index}]`;
  const record = asRecord(value, field);
  return {
    transactionId: asTransactionId(
      record.transaction_id,
      `${field}.transaction_id`,
    ),
    createdAtMs: asSafeInteger(record.created_at_ms, `${field}.created_at_ms`),
    amount: asSignedDecimal(record.amount, `${field}.amount`),
    balanceAfter: asNullableDecimal(
      record.balance_after,
      `${field}.balance_after`,
    ),
    category: asNonEmptyString(record.category, `${field}.category`),
    billingType:
      asOptionalString(record.billing_type, `${field}.billing_type`) ?? "",
    modelKey: asOptionalString(record.model_key, `${field}.model_key`) ?? "",
    modelDisplayName:
      asOptionalString(
        record.model_display_name,
        `${field}.model_display_name`,
      ) ?? "",
    mediaType:
      asOptionalString(record.media_type, `${field}.media_type`) ?? "",
    memberUid:
      asOptionalString(record.member_uid, `${field}.member_uid`) ?? "",
    userName: asOptionalString(record.user_name, `${field}.user_name`) ?? "",
    creditCategory:
      asOptionalString(record.credit_category, `${field}.credit_category`) ??
      "",
    localizationParams: mapStringRecord(
      record.localization_params,
      `${field}.localization_params`,
    ),
  };
}
const TRANSFER_DIRECTIONS = new Set(["IN", "OUT", "UNSPECIFIED"]);
function asTransferDirection(value, field) {
  const result = asString(value, field).trim().toUpperCase();
  if (!TRANSFER_DIRECTIONS.has(result)) {
    throw new TeamContractError(field, `unsupported value ${result}`);
  }
  return result;
}
function mapTransfer(value, index) {
  const field = `transfers.items[${index}]`;
  const record = asRecord(value, field);
  return {
    transferId: asNonEmptyString(record.transfer_id, `${field}.transfer_id`),
    createdAtMs: asSafeInteger(record.created_at_ms, `${field}.created_at_ms`),
    amount: asSignedDecimal(record.amount, `${field}.amount`),
    direction: asTransferDirection(record.direction, `${field}.direction`),
    counterpartyGroupId:
      asOptionalString(
        record.counterparty_group_id,
        `${field}.counterparty_group_id`,
      ) ?? "",
    counterpartyGroupName:
      asOptionalString(
        record.counterparty_group_name,
        `${field}.counterparty_group_name`,
      ) ?? "",
  };
}
function mapTeamTransfersPage(value) {
  const record = asRecord(value, "transfers");
  return {
    items: asArray(record.items, "transfers.items").map(mapTransfer),
    nextCursor: asOptionalString(record.next_cursor, "transfers.next_cursor"),
    hasMore: asBoolean(record.has_more, "transfers.has_more"),
    serverTimeMs: asSafeInteger(
      record.server_time_ms,
      "transfers.server_time_ms",
    ),
  };
}
function mapTeamTransactionsPage(value) {
  const record = asRecord(value, "transactions");
  return {
    items: asArray(record.items, "transactions.items").map(mapTransaction),
    nextCursor: asOptionalString(
      record.next_cursor,
      "transactions.next_cursor",
    ),
    hasMore: asBoolean(record.has_more, "transactions.has_more"),
    serverTimeMs: asSafeInteger(
      record.server_time_ms,
      "transactions.server_time_ms",
    ),
    groupUsed:
      record.group_used == null
        ? null
        : asSignedDecimal(record.group_used, "transactions.group_used"),
    totalAmount:
      record.total_amount == null
        ? null
        : asSignedDecimal(record.total_amount, "transactions.total_amount"),
  };
}
function mapTeamCheckoutSession(value) {
  const record = asRecord(value, "checkout_session");
  const signedUrl = asNonEmptyString(
    record.signed_url,
    "checkout_session.signed_url",
  );
  let url;
  try {
    url = new URL(signedUrl);
  } catch {
    throw new TeamContractError(
      "checkout_session.signed_url",
      "expected absolute URL",
    );
  }
  if (url.protocol !== "https:") {
    throw new TeamContractError(
      "checkout_session.signed_url",
      "expected HTTPS URL",
    );
  }
  return {
    checkoutSessionId: asPositiveDecimal(
      record.checkout_session_id,
      "checkout_session.checkout_session_id",
    ),
    signedUrl,
    expiresAtMs: asSafeInteger(
      record.expires_at_ms,
      "checkout_session.expires_at_ms",
    ),
  };
}
function mapTeamCreditTransferResult(value) {
  const record = asRecord(value, "credit_transfer");
  return {
    transferRecordId: asPositiveInt64DecimalString(
      record.transfer_record_id,
      "credit_transfer.transfer_record_id",
    ),
    transferredCredit: asPositiveInt64DecimalString(
      record.transferred_credit,
      "credit_transfer.transferred_credit",
    ),
  };
}
const MAX_TEAM_MEMBER_PAGES = 500;
const MAX_SIGNED_INT64 = 9223372036854775807n;
const PAST_TEAM_SCOPE_MANAGEABLE_GROUP = 2;
const SCOPE_IN_GROUP = 0;
const PAST_TEAM_FILTER_USER_ID = 1;
const PAST_TEAM_FILTER_USER_NAME = 2;
const DIGITS_ONLY_RE = /^\d+$/;
function dedupeByUserId(members) {
  const seen = new Set();
  const result = [];
  for (const member of members) {
    if (seen.has(member.userId)) continue;
    seen.add(member.userId);
    result.push(member);
  }
  return result;
}
function asPositiveInt64Decimal(value, field) {
  const decimal = asPositiveDecimal(value, field);
  if (BigInt(decimal) > MAX_SIGNED_INT64) {
    throw new TeamContractError(
      field,
      "expected positive int64 decimal string",
    );
  }
  return decimal;
}
function appendQuery(path, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
async function fetchMapped(path, init, mapper) {
  const signal = init?.signal ?? void 0;
  try {
    const response = await gatewayFetch(path, init);
    const value = await response.json();
    signal?.throwIfAborted();
    const mapped = mapper(value);
    signal?.throwIfAborted();
    return mapped;
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) throw error;
    if (error instanceof TeamContractError) throw error;
    throw toTeamApiError(error);
  }
}
function assertScopeMatch(scope, actualGroupId) {
  if (scope.groupId !== actualGroupId) {
    throw new TeamContractError(
      "scope.group_id",
      "response does not match requested group",
    );
  }
}
export const teamApi = {
  getContract(clientVersion, options = {}) {
    return fetchMapped(
      appendQuery(API_PATHS.teamContract, {
        client_version: clientVersion,
      }),
      {
        signal: options.signal,
      },
      mapTeamFeatureContract,
    );
  },
  listContexts(options = {}) {
    return fetchMapped(
      API_PATHS.groupList,
      {
        signal: options.signal,
      },
      mapHubGroupListToTeamContexts,
    );
  },
  async getCapabilities(expectedIdentityKey, options = {}) {
    const capabilities = await fetchMapped(
      API_PATHS.teamCapabilities,
      {
        headers: {
          "X-Hilo-Identity-Key": expectedIdentityKey,
        },
        signal: options.signal,
      },
      mapUserTeamCapabilities,
    );
    if (capabilities.identityKey !== expectedIdentityKey) {
      throw new TeamContractError(
        "capabilities.identity_key",
        "response does not match the active identity",
      );
    }
    return capabilities;
  },
  async getTeamDetail(scope, options = {}) {
    const detail = await fetchMapped(
      API_PATHS.teamDetail(scope.groupId),
      {
        signal: options.signal,
      },
      mapTeamDetail,
    );
    assertScopeMatch(scope, detail.groupId);
    return detail;
  },
  /**
   * 全量成员明细（云网关 GET /api/v1/group/member/details 代理）：
   * 名称 + Quota 使用 + 历史累计消耗。不分页，搜索在客户端完成。
   */
  listMemberDetails(scope, options = {}) {
    return fetchMapped(
      API_PATHS.teamMemberDetails(scope.groupId),
      {
        signal: options.signal,
      },
      mapTeamMemberDetails,
    );
  },
  async listMembers(request, options = {}) {
    const path = appendQuery(API_PATHS.teamMembers(request.scope.groupId), {
      keyword: request.keyword,
      cursor: request.cursor,
      page_size: request.pageSize,
    });
    const page = await fetchMapped(
      path,
      {
        signal: options.signal,
      },
      mapTeamMembersPage,
    );
    assertScopeMatch(request.scope, request.scope.groupId);
    return page;
  },
  async listAllMemberIds(scope, pageSize, options = {}) {
    const memberIds = [];
    const seenMemberIds = new Set();
    const seenCursors = new Set();
    let cursor = null;
    for (let pageIndex = 0; pageIndex < MAX_TEAM_MEMBER_PAGES; pageIndex += 1) {
      const cursorKey = cursor ?? "FIRST";
      if (seenCursors.has(cursorKey)) {
        throw new TeamContractError(
          "members.next_cursor",
          "cursor must make forward progress",
        );
      }
      seenCursors.add(cursorKey);
      const page = await teamApi.listMembers(
        {
          scope,
          keyword: "",
          cursor,
          pageSize,
        },
        options,
      );
      for (const member of page.items) {
        if (!member.permissions.changeQuota.allowed) continue;
        if (seenMemberIds.has(member.userId)) {
          throw new TeamContractError(
            "members.items.user_id",
            "member ids must be unique",
          );
        }
        seenMemberIds.add(member.userId);
        memberIds.push(member.userId);
      }
      if (!page.hasMore) return memberIds;
      if (page.nextCursor === null) {
        throw new TeamContractError(
          "members.next_cursor",
          "has_more requires a cursor",
        );
      }
      cursor = page.nextCursor;
    }
    throw new TeamContractError(
      "members.next_cursor",
      "member pagination exceeded its bound",
    );
  },
  /**
   * 过往团队成员查询（QueryGroupMembers，/backend/group/members/query）。
   *
   * 新 IDL 无分页：OwnedGroup/ManageableGroup scope 下 BFF 返回聚合、去重后的
   * 候选成员，并已排除当前 Group（X-Group-Id）已有成员。
   * 搜索模糊匹配由服务端完成：纯数字关键词按 UID 过滤，否则按用户名过滤。
   * 客户端按 userId 去重保序（防御性，避免重复 React key）。
   */
  async queryPastTeamMembers(request, options = {}) {
    const keyword = request.keyword?.trim() ?? "";
    const members = await fetchMapped(
      API_PATHS.groupMembersQuery,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query_scope: PAST_TEAM_SCOPE_MANAGEABLE_GROUP,
          ...(keyword
            ? {
                filters: [
                  {
                    filter_type: DIGITS_ONLY_RE.test(keyword)
                      ? PAST_TEAM_FILTER_USER_ID
                      : PAST_TEAM_FILTER_USER_NAME,
                    filter_values: [keyword],
                  },
                ],
              }
            : {}),
        }),
        signal: options.signal,
      },
      mapQueryGroupMembers,
    );
    return dedupeByUserId(members);
  },
  /**
   * 当前团队全量成员（QueryGroupMembers query_scope=InGroup），流水筛选下拉数据源。
   *
   * IDL：InGroup 下单次返回当前 Group（X-Group-Id）全量成员，filters 不下发；
   * 搜索由调用方在客户端按名称/UID 模糊匹配。防御性按 scope.groupId 过滤
   * （避免切换团队竞态下串数据），并按 userId 去重保序。
   */
  async listInGroupMembers(scope, options = {}) {
    const members = await fetchMapped(
      API_PATHS.groupMembersQuery,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query_scope: SCOPE_IN_GROUP,
        }),
        signal: options.signal,
      },
      mapQueryGroupMembers,
    );
    return dedupeByUserId(
      members.filter((member) => member.groupId === scope.groupId),
    );
  },
  /**
   * 按 UID 批量入团（BatchAddGroupMembers，/backend/group/members/batch_add）。
   * 单次上限 100；逐用户结果透传，已存在成员 errorCode = member_already_exists。
   * request_id 仅用于链路审计，不作幂等键。
   */
  batchAddGroupMembers(request, options = {}) {
    return fetchMapped(
      API_PATHS.groupMembersBatchAdd,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group_id: request.scope.groupId,
          user_ids: request.userIds,
          ...(request.quotaLimit === void 0
            ? {}
            : {
                quota_config: {
                  quota_limit: request.quotaLimit,
                },
              }),
          request_id: crypto.randomUUID(),
        }),
        signal: options.signal,
      },
      mapBatchAddMembersResults,
    );
  },
  listInviteLinks(scope, cursor, options = {}) {
    return fetchMapped(
      appendQuery(API_PATHS.teamInviteLinks(scope.groupId), {
        cursor,
      }),
      {
        signal: options.signal,
      },
      mapTeamInviteLinksPage,
    );
  },
  createInviteLink(request, options = {}) {
    return fetchMapped(
      API_PATHS.teamInviteLinks(request.scope.groupId),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "MEMBER",
          max_uses: request.maxUses,
          expire_seconds: request.expireSeconds,
          ...(request.quotaLimit === void 0
            ? {}
            : {
                quota_config: {
                  quota_limit: request.quotaLimit,
                },
              }),
        }),
        signal: options.signal,
      },
      mapTeamInviteLinkCreateResult,
    );
  },
  getInviteLinkInfo(token, region, options = {}) {
    return fetchMapped(
      API_PATHS.teamInviteLinkInfo(token, region),
      {
        signal: options.signal,
      },
      mapTeamInviteLinkInfo,
    );
  },
  acceptInviteLink(token, options = {}) {
    return fetchMapped(
      API_PATHS.teamInviteLinkAccept,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invite_token: token,
        }),
        signal: options.signal,
      },
      mapTeamInviteLinkAcceptResult,
    );
  },
  acceptInvitation(invitationId, options = {}) {
    return fetchMapped(
      API_PATHS.teamInvitationAccept,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitation_id: invitationId,
        }),
        signal: options.signal,
      },
      mapTeamInviteLinkAcceptResult,
    );
  },
  getQuota(scope, options = {}) {
    return fetchMapped(
      API_PATHS.teamQuota(scope.groupId),
      {
        signal: options.signal,
      },
      mapTeamQuota,
    );
  },
  setMemberQuotas(scope, memberIds, limit, options = {}) {
    return fetchMapped(
      API_PATHS.teamMemberQuotas(scope.groupId),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quotas: memberIds.map((memberId) => ({
            member_uid: memberId,
            quota_limit: limit,
          })),
        }),
        signal: options.signal,
      },
      mapTeamMutationOk,
    );
  },
  clearMemberQuotas(scope, memberIds, options = {}) {
    return fetchMapped(
      API_PATHS.teamMemberQuotas(scope.groupId),
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_uids: memberIds,
        }),
        signal: options.signal,
      },
      mapTeamMutationOk,
    );
  },
  async getCreditSummary(scope, options = {}) {
    const summary = await fetchMapped(
      API_PATHS.teamCreditSummary(scope.groupId),
      {
        signal: options.signal,
      },
      mapTeamCreditSummary,
    );
    assertScopeMatch(scope, summary.groupId);
    return summary;
  },
  listTransactions(request, options = {}) {
    const basePath = request.memberId
      ? API_PATHS.teamMemberTransactions(
          request.scope.groupId,
          request.memberId,
        )
      : request.selfOnly
        ? API_PATHS.teamSelfTransactions(request.scope.groupId)
        : API_PATHS.teamTransactions(request.scope.groupId);
    const path = appendQuery(basePath, {
      cursor: request.cursor,
      category: request.category ?? null,
      // gateway 省略时兜底 20；导出链路显式传大页（EXPORT_PAGE_SIZE）压请求次数。
      page_size: request.pageSize ?? null,
      start_time: request.startTime ?? null,
      end_time: request.endTime ?? null,
    });
    return fetchMapped(
      path,
      {
        signal: options.signal,
      },
      mapTeamTransactionsPage,
    );
  },
  listTransfers(request, options = {}) {
    const path = appendQuery(API_PATHS.teamTransfers(request.scope.groupId), {
      cursor: request.cursor,
      page_size: request.pageSize ?? null,
    });
    return fetchMapped(
      path,
      {
        signal: options.signal,
      },
      mapTeamTransfersPage,
    );
  },
  createCheckoutSession(scope, idempotencyKey, options = {}) {
    return fetchMapped(
      API_PATHS.teamCheckoutSessions(scope.groupId),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
        }),
        signal: options.signal,
      },
      mapTeamCheckoutSession,
    );
  },
  createTeam(teamName, options = {}) {
    return fetchMapped(
      API_PATHS.groupCreate,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group_name: teamName,
          biz_line: HILO_HUB_BIZ_LINE,
        }),
        signal: options.signal,
      },
      mapTeamCreateResult,
    );
  },
  renameTeam(groupId, teamName, options = {}) {
    return fetchMapped(
      API_PATHS.teamRename(groupId),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_name: teamName,
        }),
        signal: options.signal,
      },
      mapTeamMutationOk,
    );
  },
  deleteTeam(groupId, options = {}) {
    return fetchMapped(
      API_PATHS.teamDelete(groupId),
      {
        method: "DELETE",
        signal: options.signal,
      },
      mapTeamDeleteResult,
    );
  },
  leaveTeam(groupId, options = {}) {
    const { newOwnerUserId, signal } = options;
    return fetchMapped(
      API_PATHS.teamLeave(groupId),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          newOwnerUserId
            ? {
                new_owner_user_id: newOwnerUserId,
              }
            : {},
        ),
        signal,
      },
      mapTeamMutationOk,
    );
  },
  removeMember(scope, userId, options = {}) {
    return fetchMapped(
      API_PATHS.teamRemoveMember(scope.groupId, userId),
      {
        method: "DELETE",
        signal: options.signal,
      },
      mapTeamMutationOk,
    );
  },
  changeMemberRole(scope, userId, role, options = {}) {
    return fetchMapped(
      API_PATHS.teamChangeMemberRole(scope.groupId, userId),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
        }),
        signal: options.signal,
      },
      mapTeamMutationOk,
    );
  },
  transferOwner(scope, newOwnerUserId, options = {}) {
    return fetchMapped(
      API_PATHS.teamTransferOwner(scope.groupId),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_owner_user_id: newOwnerUserId,
        }),
        signal: options.signal,
      },
      mapTeamMutationOk,
    );
  },
  inviteMembers(groupId, emails, options = {}) {
    return fetchMapped(
      API_PATHS.teamInviteMembers(groupId),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails,
          ...(options.quotaLimit === void 0
            ? {}
            : {
                quota_config: {
                  quota_limit: options.quotaLimit,
                },
              }),
        }),
        signal: options.signal,
      },
      mapTeamInviteMembersResult,
    );
  },
  /**
   * Group 间 MediaCredit 转移（Owner only）。
   *
   * operator_uid 与幂等处理均由云网关负责，客户端严格发送三字段请求。
   */
  transferCredits(scope, toGroupId, credit, options = {}) {
    const fromGroupId = asPositiveInt64Decimal(
      scope.groupId,
      "credit_transfer.from_group_id",
    );
    const targetGroupId = asPositiveInt64Decimal(
      toGroupId,
      "credit_transfer.to_group_id",
    );
    if (fromGroupId === targetGroupId) {
      throw new TeamContractError(
        "credit_transfer.to_group_id",
        "source and target groups must differ",
      );
    }
    const amount = Number(credit);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new TeamContractError(
        "credit_transfer.credit",
        "expected positive integer",
      );
    }
    return fetchMapped(
      API_PATHS.creditTransfer,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from_group_id: fromGroupId,
          to_group_id: targetGroupId,
          credit: amount,
        }),
        signal: options.signal,
      },
      mapTeamCreditTransferResult,
    );
  },
};
