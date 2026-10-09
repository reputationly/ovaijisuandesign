// map-team-credit-summary.js
import { InfiniteQueryObserver, useBaseQuery } from "../vendor.js";

export function useInfiniteQuery(options, queryClient2) {
  return useBaseQuery(options, InfiniteQueryObserver, queryClient2);
}

export class TeamApiError extends Error {
  constructor(payload, options) {
    super(`Team API request failed: ${payload.code}`, options);
    this.payload = payload;
    this.name = "TeamApiError";
  }
}

const UNSIGNED_DECIMAL_RE$1 = /^(0|[1-9]\d*)$/;

const POSITIVE_DECIMAL_RE = /^[1-9]\d*$/;

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

export function asString$2(value, field) {
  if (typeof value !== "string")
    throw new TeamContractError(field, "expected string");
  return value;
}

export function asNonEmptyString(value, field) {
  const result = asString$2(value, field).trim();
  if (!result) throw new TeamContractError(field, "must not be empty");
  return result;
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

export function asSafeInteger$1(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TeamContractError(field, "expected non-negative safe integer");
  }
  return value;
}

export function asNullableDecimal(value, field) {
  return value == null ? null : asUnsignedDecimal(value, field);
}

export function mapTeamCreditSummary(value, field = "credit_summary") {
  const record2 = asRecord$5(value, field);
  const mode2 = asString$2(record2.mode, `${field}.mode`);
  if (mode2 !== "LIMITED" && mode2 !== "UNLIMITED" && mode2 !== "UNAVAILABLE") {
    throw new TeamContractError(`${field}.mode`, `unsupported value ${mode2}`);
  }
  const memberLimit = asNullableDecimal(
    record2.member_limit,
    `${field}.member_limit`,
  );
  const memberUsed = asNullableDecimal(
    record2.member_used,
    `${field}.member_used`,
  );
  const memberRemaining = asNullableDecimal(
    record2.member_remaining,
    `${field}.member_remaining`,
  );
  if (mode2 === "LIMITED" && memberLimit === null) {
    throw new TeamContractError(
      `${field}.member_limit`,
      "required for LIMITED summary",
    );
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
  if (
    mode2 !== "LIMITED" &&
    (memberLimit !== null || memberRemaining !== null)
  ) {
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
    teamRemaining: asUnsignedDecimal(
      record2.team_remaining,
      `${field}.team_remaining`,
    ),
    unit: asNonEmptyString(record2.unit, `${field}.unit`),
    updatedAtMs: asSafeInteger$1(
      record2.updated_at_ms,
      `${field}.updated_at_ms`,
    ),
  };
}
