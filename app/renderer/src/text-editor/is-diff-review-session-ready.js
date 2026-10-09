// is-diff-review-session-ready.js
import { Ct$2 } from "../vendor-inline/minified/ct.js";

export function Tt$1(t2, e2 = {}) {
  return new Ct$2(t2, e2);
}

export function isDiffReviewSessionReady(session) {
  return session.contentReady === true || session.baselineMarkdown !== void 0;
}
