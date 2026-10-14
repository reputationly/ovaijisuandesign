// 额度展示的解析和兜底文案是团队页的规则。


export function parseCreditAmount(value) {
  if (/^-\d+$/.test(value)) {
    return {
      value: null,
      reasonCode: "negative_credit_contract_value"
    };
  }
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    return {
      value: null,
      reasonCode: "invalid_credit_decimal"
    };
  }
  return {
    value: BigInt(value),
    reasonCode: null
  };
}
export function invalidDisplay(mode, teamRemaining, reasonCode) {
  return {
    status: "INVALID",
    mode,
    availableAmount: null,
    memberRemaining: null,
    memberUsed: null,
    memberLimit: null,
    teamRemaining,
    reasonCode
  };
}
export function unavailableDisplay({
  mode,
  memberLimit = null,
  teamRemaining,
  reasonCode
}) {
  return {
    status: "UNAVAILABLE",
    mode,
    availableAmount: null,
    memberRemaining: null,
    memberUsed: null,
    memberLimit,
    teamRemaining,
    reasonCode
  };
}
export function minCreditAmount(a, b) {
  const left = BigInt(a);
  const right = BigInt(b);
  return (left < right ? left : right).toString();
}
export function deriveTeamCreditDisplay(summary) {
  const sourceMode = summary.mode === "UNAVAILABLE" ? null : summary.mode;
  const parsedTeamRemaining = parseCreditAmount(summary.teamRemaining);
  if (parsedTeamRemaining.reasonCode) {
    return invalidDisplay(sourceMode, null, parsedTeamRemaining.reasonCode);
  }
  if (summary.mode === "UNAVAILABLE") {
    return unavailableDisplay({
      mode: null,
      teamRemaining: summary.teamRemaining,
      reasonCode: "upstream_quota_unavailable"
    });
  }
  if (summary.mode === "UNLIMITED") {
    if (summary.memberUsed !== null) {
      const parsedMemberUsed = parseCreditAmount(summary.memberUsed);
      if (parsedMemberUsed.reasonCode) {
        return invalidDisplay("UNLIMITED", summary.teamRemaining, parsedMemberUsed.reasonCode);
      }
    }
    return {
      status: "READY",
      mode: "UNLIMITED",
      availableAmount: summary.teamRemaining,
      memberRemaining: null,
      memberUsed: summary.memberUsed,
      memberLimit: null,
      teamRemaining: summary.teamRemaining,
      reasonCode: null
    };
  }
  if (summary.memberLimit === null) {
    return unavailableDisplay({
      mode: "LIMITED",
      teamRemaining: summary.teamRemaining,
      reasonCode: "member_limit_unavailable"
    });
  }
  const parsedMemberLimit = parseCreditAmount(summary.memberLimit);
  if (parsedMemberLimit.reasonCode) {
    return invalidDisplay("LIMITED", summary.teamRemaining, parsedMemberLimit.reasonCode);
  }
  if (summary.memberUsed === null || summary.memberRemaining === null) {
    return unavailableDisplay({
      mode: "LIMITED",
      memberLimit: summary.memberLimit,
      teamRemaining: summary.teamRemaining,
      reasonCode: "member_usage_unavailable"
    });
  }
  const parsedMemberUsed = parseCreditAmount(summary.memberUsed);
  if (parsedMemberUsed.reasonCode) {
    return invalidDisplay("LIMITED", summary.teamRemaining, parsedMemberUsed.reasonCode);
  }
  const parsedMemberRemaining = parseCreditAmount(summary.memberRemaining);
  if (parsedMemberRemaining.reasonCode) {
    return invalidDisplay("LIMITED", summary.teamRemaining, parsedMemberRemaining.reasonCode);
  }
  const memberLimit = parsedMemberLimit.value;
  const memberUsed = parsedMemberUsed.value;
  const memberRemaining = parsedMemberRemaining.value;
  if (memberLimit === null || memberUsed === null || memberRemaining === null) {
    return invalidDisplay("LIMITED", summary.teamRemaining, "invalid_credit_decimal");
  }
  const expectedRemaining = memberLimit > memberUsed ? memberLimit - memberUsed : 0n;
  if (memberRemaining !== expectedRemaining) {
    return invalidDisplay("LIMITED", summary.teamRemaining, "member_remaining_mismatch");
  }
  return {
    status: "READY",
    mode: "LIMITED",
    availableAmount: minCreditAmount(summary.memberRemaining, summary.teamRemaining),
    memberRemaining: summary.memberRemaining,
    memberUsed: summary.memberUsed,
    memberLimit: summary.memberLimit,
    teamRemaining: summary.teamRemaining,
    reasonCode: null
  };
}
export function deriveActiveScope(snapshot) {
  if (!snapshot?.identityKey || !snapshot.activeContext) return null;
  return {
    identityKey: snapshot.identityKey,
    groupId: snapshot.activeContext.groupId,
    epoch: snapshot.activeContext.epoch,
    membershipRevision: snapshot.activeContext.membershipRevision
  };
}
export function isBillableSubmission(kind) {
  return kind === "chat" || kind === "queue" || kind === "retry" || kind === "auto_send" || kind === "remote_tool" || kind === "canvas" || kind === "plugin_dag";
}
