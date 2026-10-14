// 账号提交被拦住时的事件和错误类型。


export const ACCOUNT_SUBMISSION_BLOCKED_EVENT = "team-account:submission-blocked";
export function dispatchAccountSubmissionBlocked(detail) {
  window.dispatchEvent(new CustomEvent(ACCOUNT_SUBMISSION_BLOCKED_EVENT, {
    detail
  }));
}
export class AccountSubmissionBlockedError extends Error {
  constructor(reasonCode) {
    super(`Account submission blocked: ${reasonCode}`);
    this.reasonCode = reasonCode;
    this.name = "AccountSubmissionBlockedError";
  }
}
