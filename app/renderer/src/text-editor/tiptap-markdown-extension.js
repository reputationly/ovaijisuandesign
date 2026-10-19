/**
 * TipTap 的 Markdown 扩展。
 *
 * 产物里有两个 `Markdown`：一个是 markdown **处理器函数**（`Markdown`），
 * 一个是这个 **TipTap 扩展**（`Markdown$1`）—— `$1` 被剥掉后两者撞名，
 * 于是 `useEditor({ extensions: [..., Markdown, ...] })` 拿到的是处理器函数，
 * 扩展没装上、`editor.getMarkdown` 也就不存在：
 *
 *     TypeError: fsEditor?.getMarkdown is not a function
 *
 * 按产物把它单独还原成一个模块。
 */
import { commands as commands_exports, Extension } from "@tiptap/core";
import { MarkdownManager } from "./markdown-manager.js";

/** 内容不是字符串时一律按 json 处理（与产物一致）。 */
function assumeContentType(content, contentType) {
  if (typeof content !== "string") return "json";
  return contentType;
}

export const Markdown = Extension.create({
  name: "markdown",
  addOptions() {
    return {
      indentation: {
        style: "space",
        size: 2
      },
      marked: void 0,
      markedOptions: {}
    };
  },
  addCommands() {
    return {
      setContent: (content2, options2) => {
        if (!(options2 === null || options2 === void 0 ? void 0 : options2.contentType)) return commands_exports.setContent(content2, options2);
        if (assumeContentType(content2, options2 === null || options2 === void 0 ? void 0 : options2.contentType) !== "markdown" || !this.editor.markdown) return commands_exports.setContent(content2, options2);
        const mdContent = this.editor.markdown.parse(content2);
        return commands_exports.setContent(mdContent, options2);
      },
      insertContent: (value, options2) => {
        if (!(options2 === null || options2 === void 0 ? void 0 : options2.contentType)) return commands_exports.insertContent(value, options2);
        if (assumeContentType(value, options2 === null || options2 === void 0 ? void 0 : options2.contentType) !== "markdown" || !this.editor.markdown) return commands_exports.insertContent(value, options2);
        const mdContent = this.editor.markdown.parse(value);
        return commands_exports.insertContent(mdContent, options2);
      },
      insertContentAt: (position2, value, options2) => {
        if (!(options2 === null || options2 === void 0 ? void 0 : options2.contentType)) return commands_exports.insertContentAt(position2, value, options2);
        if (assumeContentType(value, options2 === null || options2 === void 0 ? void 0 : options2.contentType) !== "markdown" || !this.editor.markdown) return commands_exports.insertContentAt(position2, value, options2);
        const mdContent = this.editor.markdown.parse(value);
        return commands_exports.insertContentAt(position2, mdContent, options2);
      }
    };
  },
  addStorage() {
    return { manager: new MarkdownManager({
      indentation: this.options.indentation,
      marked: this.options.marked,
      markedOptions: this.options.markedOptions,
      extensions: []
    }) };
  },
  onBeforeCreate() {
    var _json$content;
    if (this.editor.markdown) {
      console.error("[tiptap][markdown]: There is already a `markdown` property on the editor instance. This might lead to unexpected behavior.");
      return;
    }
    this.storage.manager = new MarkdownManager({
      indentation: this.options.indentation,
      marked: this.options.marked,
      markedOptions: this.options.markedOptions,
      extensions: this.editor.extensionManager.baseExtensions
    });
    this.editor.markdown = this.storage.manager;
    this.editor.getMarkdown = () => {
      return this.storage.manager.serialize(this.editor.getJSON());
    };
    if (!this.editor.options.contentType) return;
    if (assumeContentType(this.editor.options.content, this.editor.options.contentType) !== "markdown") return;
    if (!this.editor.markdown) throw new Error('[tiptap][markdown]: The `contentType` option is set to "markdown", but the Markdown extension is not added to the editor. Please add the Markdown extension to use this feature.');
    if (this.editor.options.content === void 0 || typeof this.editor.options.content !== "string") throw new Error('[tiptap][markdown]: The `contentType` option is set to "markdown", but the initial content is not a string. Please provide the initial content as a markdown string.');
    const json2 = this.editor.markdown.parse(this.editor.options.content);
    if (json2.content?.length) this.editor.options.content = json2;
  }
});
function combineDOMRects(rect1, rect2) {
  const top2 = Math.min(rect1.top, rect2.top);
  const bottom = Math.max(rect1.bottom, rect2.bottom);
  const left = Math.min(rect1.left, rect2.left);
  const width = Math.max(rect1.right, rect2.right) - left;
  const height = bottom - top2;
  return new DOMRect(left, top2, width, height);
}
