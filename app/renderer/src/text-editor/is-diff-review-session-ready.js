// is-diff-review-session-ready.js
import { Travels as Ct } from "travels";
export function Tt(input, options = {}) {
  return new Ct(input, options);
}
export function isDiffReviewSessionReady(session) {
  return session.contentReady === true || session.baselineMarkdown !== void 0;
}
