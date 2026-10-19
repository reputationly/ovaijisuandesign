import { __jsx } from "../shared/jsx-runtime.js";
export function longEdge(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return void 0;
  return Math.max(width, height);
}
export const DESIGN_CONTEXT_OPEN = "<design_context>\n";
export const DESIGN_CONTEXT_CLOSE = "\n</design_context>";
export const LEADING_CONTEXT_RE = /^<design_context>\n([\s\S]*?)\n<\/design_context>(?:\n\n([\s\S]*))?$/;
export function prependHiddenContext(content2, context) {
  const existing2 = LEADING_CONTEXT_RE.exec(content2);
  const body2 = existing2 ? `${context}

${existing2[1]}` : context;
  return `${DESIGN_CONTEXT_OPEN}${body2}${DESIGN_CONTEXT_CLOSE}

${existing2 ? existing2[2] ?? "" : content2}`;
}