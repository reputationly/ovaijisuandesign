// map-team-credit-summary.js
export { useInfiniteQuery } from "@tanstack/react-query";
export class TeamApiError extends Error {
  constructor(payload, options) {
    super(`Team API request failed: ${payload.code}`, options);
    this.payload = payload;
    this.name = "TeamApiError";
  }
}
const UNSIGNED_DECIMAL_RE = /^(0|[1-9]\d*)$/;
const POSITIVE_DECIMAL_RE = /^[1-9]\d*$/;
export class TeamContractError extends Error {
  constructor(field, message) {
    super(`Invalid Team contract field "${field}": ${message}`);
    this.field = field;
    this.name = "TeamContractError";
  }
}
export function asRecord(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TeamContractError(field, "expected object");
  }
  return value;
}
export function asString(value, field) {
  if (typeof value !== "string")
    throw new TeamContractError(field, "expected string");
  return value;
}
export function asNonEmptyString(value, field) {
  const result = asString(value, field).trim();
  if (!result) throw new TeamContractError(field, "must not be empty");
  return result;
}
export function asUnsignedDecimal(value, field) {
  const result = asString(value, field);
  if (!UNSIGNED_DECIMAL_RE.test(result)) {
    throw new TeamContractError(field, "expected unsigned decimal string");
  }
  return result;
}
export function asPositiveDecimal(value, field) {
  const result = asString(value, field);
  if (!POSITIVE_DECIMAL_RE.test(result)) {
    throw new TeamContractError(field, "expected positive decimal string");
  }
  return result;
}
export function asSafeInteger(value, field) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TeamContractError(field, "expected non-negative safe integer");
  }
  return value;
}
export function asNullableDecimal(value, field) {
  return value == null ? null : asUnsignedDecimal(value, field);
}
export function mapTeamCreditSummary(value, field = "credit_summary") {
  const record = asRecord(value, field);
  const mode = asString(record.mode, `${field}.mode`);
  if (mode !== "LIMITED" && mode !== "UNLIMITED" && mode !== "UNAVAILABLE") {
    throw new TeamContractError(`${field}.mode`, `unsupported value ${mode}`);
  }
  const memberLimit = asNullableDecimal(
    record.member_limit,
    `${field}.member_limit`,
  );
  const memberUsed = asNullableDecimal(
    record.member_used,
    `${field}.member_used`,
  );
  const memberRemaining = asNullableDecimal(
    record.member_remaining,
    `${field}.member_remaining`,
  );
  if (mode === "LIMITED" && memberLimit === null) {
    throw new TeamContractError(
      `${field}.member_limit`,
      "required for LIMITED summary",
    );
  }
  if (
    mode === "LIMITED" &&
    ((memberUsed === null && memberRemaining !== null) ||
      (memberUsed !== null && memberRemaining === null))
  ) {
    throw new TeamContractError(
      field,
      "member_used and member_remaining must both be known or both be null",
    );
  }
  if (
    mode !== "LIMITED" &&
    (memberLimit !== null || memberRemaining !== null)
  ) {
    throw new TeamContractError(
      field,
      "member_limit and member_remaining are only valid for LIMITED summary",
    );
  }
  return {
    groupId: asPositiveDecimal(record.group_id, `${field}.group_id`),
    mode,
    memberLimit,
    memberUsed,
    memberRemaining,
    teamTotal: asNullableDecimal(record.team_total, `${field}.team_total`),
    teamUsed: asNullableDecimal(record.team_used, `${field}.team_used`),
    teamRemaining: asUnsignedDecimal(
      record.team_remaining,
      `${field}.team_remaining`,
    ),
    unit: asNonEmptyString(record.unit, `${field}.unit`),
    updatedAtMs: asSafeInteger(record.updated_at_ms, `${field}.updated_at_ms`),
  };
}
