// is-diff-review-session-ready.js
import { Ct$2 as Ct } from "../vendor-inline/minified/ct.js";
export function Tt(input, options = {}) {
  return new Ct(input, options);
}
export function isDiffReviewSessionReady(session) {
  return session.contentReady === true || session.baselineMarkdown !== void 0;
}
