// is-diff-review-session-ready.js
import { Ct$2 as Ct } from "../vendor-inline/minified/ct.js";
export function Tt(t2, e2 = {}) {
  return new Ct(t2, e2);
}
export function isDiffReviewSessionReady(session) {
  return session.contentReady === true || session.baselineMarkdown !== void 0;
}
