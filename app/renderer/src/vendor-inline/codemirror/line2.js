// 留在这里：ATX_HEADINGS、collectHeadingMarks、collectLinkChrome、collectInlineMarks、isBlankLine$1、HorizontalRuleWidget 在已安装的 @codemirror/view@6.43.6、@codemirror/lang-markdown@6.5.2、@codemirror/language@6.12.4 的 dist/index.js 导出和源码里都不存在。WidgetType 已经从 @codemirror/view 导入。这是应用 Markdown 预览用来收集标记的逻辑，不能改成 npm import。
import { WidgetType } from "@codemirror/view";

export const ATX_HEADINGS = new Set([
  "ATXHeading1",
  "ATXHeading2",
  "ATXHeading3",
  "ATXHeading4",
  "ATXHeading5",
  "ATXHeading6",
]);

export const INLINE_MARKS = {
  Emphasis: "EmphasisMark",
  StrongEmphasis: "EmphasisMark",
  InlineCode: "CodeMark",
  Strikethrough: "StrikethroughMark",
};

function isSpace(state, pos) {
  const ch = state.doc.sliceString(pos, pos + 1);
  return ch === " " || ch === "\t";
}

export function collectHeadingMarks(state, heading, out) {
  for (const mark of heading.getChildren("HeaderMark")) {
    if (mark.from - heading.from <= 3) {
      let to = mark.to;
      while (to < heading.to && isSpace(state, to)) to++;
      out.push({ from: mark.from, to, kind: "hide" });
    } else {
      let from = mark.from;
      while (from > heading.from && isSpace(state, from - 1)) from--;
      out.push({ from, to: mark.to, kind: "hide" });
    }
  }
}

export function collectLinkChrome(link, out) {
  const marks = link.getChildren("LinkMark");
  const open = marks[0];
  const label = marks[1];
  if (!open || !label || label.from <= open.to) return;
  for (const mark of marks) out.push({ from: mark.from, to: mark.to, kind: "hide" });
  for (const url of link.getChildren("URL")) out.push({ from: url.from, to: url.to, kind: "hide" });
  for (const title of link.getChildren("LinkTitle"))
    out.push({ from: title.from, to: title.to, kind: "hide" });
}

export function collectInlineMarks(node, markName, out) {
  for (const mark of node.getChildren(markName)) out.push({ from: mark.from, to: mark.to, kind: "hide" });
}

export function isBlankLine$1(text) {
  return /^[ \t]*$/.test(text);
}

export class HorizontalRuleWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const rule = document.createElement("span");
    rule.className = "cm-md-hr";
    return rule;
  }
}
