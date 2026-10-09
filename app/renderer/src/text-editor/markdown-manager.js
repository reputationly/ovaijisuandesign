// markdown-manager.js
import { STANDARD_HTML_TAGS } from "./standard-html-tags.js";
import {
  attrsEqual,
  callOrReturn,
  decodeHtmlEntities,
  encodeHtmlEntities,
  flattenExtensions,
  g$2,
  generateJSON,
  getExtensionField,
  getSchema,
  marksEqual,
  sortExtensions,
} from "../vendor.js";

const TRAILING_BLANK_LINES = /\n[^\S\n]*(?:\n[^\S\n]*)+$/;

function extractAbsorbedBlankLines(tokens2) {
  return tokens2.flatMap((token2, index2) => {
    var _tokens;
    if (
      token2.type === "space" ||
      ((_tokens = tokens2[index2 + 1]) === null || _tokens === void 0
        ? void 0
        : _tokens.type) === "space"
    )
      return [token2];
    const trailingBlankLines = (token2.raw || "").match(TRAILING_BLANK_LINES);
    if (!trailingBlankLines) return [token2];
    return [
      {
        ...token2,
        raw: (token2.raw || "").slice(0, -trailingBlankLines[0].length),
      },
      {
        type: "space",
        raw: trailingBlankLines[0],
      },
    ];
  });
}

function wrapInMarkdownBlock(prefix, content2) {
  const output = content2
    .split("\n")
    .flatMap((line) => [line, ""])
    .map((line) => `${prefix}${line}`)
    .join("\n");
  return output.slice(0, output.length - 1);
}

function findMarksToClose(currentMarks, nextNode) {
  const marksToClose = [];
  Array.from(currentMarks.entries()).forEach(([markType, currentMark]) => {
    if (!nextNode) {
      marksToClose.push(markType);
      return;
    }
    if (
      !(nextNode.marks || []).find(
        (mark2) =>
          mark2.type === markType && attrsEqual(mark2.attrs, currentMark.attrs),
      )
    )
      marksToClose.push(markType);
  });
  return marksToClose;
}

function findMarksToOpen(activeMarks, currentMarks) {
  const marksToOpen = [];
  Array.from(currentMarks.entries()).forEach(([markType, mark2]) => {
    const activeMark = activeMarks.get(markType);
    if (!activeMark || !attrsEqual(activeMark.attrs, mark2.attrs))
      marksToOpen.push({
        type: markType,
        mark: mark2,
      });
  });
  return marksToOpen;
}

function findMarksToCloseAtEnd(
  activeMarks,
  currentMarks,
  nextNode,
  markSetsEqual,
) {
  const isLastNode = !nextNode;
  const nextNodeHasNoMarks =
    nextNode && (!nextNode.marks || nextNode.marks.length === 0);
  const nextNodeHasDifferentMarks =
    nextNode &&
    nextNode.marks &&
    !markSetsEqual(
      currentMarks,
      new Map(nextNode.marks.map((mark2) => [mark2.type, mark2])),
    );
  const marksToCloseAtEnd = [];
  if (isLastNode || nextNodeHasNoMarks || nextNodeHasDifferentMarks) {
    if (nextNode && nextNode.marks)
      Array.from(activeMarks.entries())
        .reverse()
        .forEach(([markType, activeMark]) => {
          if (
            !nextNode.marks.find(
              (m3) =>
                m3.type === markType && attrsEqual(m3.attrs, activeMark.attrs),
            )
          )
            marksToCloseAtEnd.push(markType);
        });
    else if (isLastNode || nextNodeHasNoMarks)
      marksToCloseAtEnd.push(...Array.from(activeMarks.keys()).reverse());
  }
  return marksToCloseAtEnd;
}

function closeMarksBeforeNode(activeMarks, getMarkClosing) {
  let beforeMarkdown = "";
  Array.from(activeMarks.keys())
    .reverse()
    .forEach((markType) => {
      const closeMarkdown = getMarkClosing(markType, activeMarks.get(markType));
      if (closeMarkdown) beforeMarkdown = closeMarkdown + beforeMarkdown;
    });
  activeMarks.clear();
  return beforeMarkdown;
}

function reopenMarksAfterNode(marksToReopen, activeMarks, getMarkOpening) {
  let afterMarkdown = "";
  Array.from(marksToReopen.entries()).forEach(([markType, mark2]) => {
    const openMarkdown = getMarkOpening(markType, mark2);
    if (openMarkdown) afterMarkdown += openMarkdown;
    activeMarks.set(markType, mark2);
  });
  return afterMarkdown;
}

function isTaskItem(item) {
  const match2 = (item.raw || item.text || "").match(
    /^(\s*)[-+*]\s+\[([ xX])\]\s+/,
  );
  if (match2)
    return {
      isTask: true,
      checked: match2[2].toLowerCase() === "x",
      indentLevel: match2[1].length,
    };
  return {
    isTask: false,
    indentLevel: 0,
  };
}

const HTML_TAG_NAME_PATTERN = /<\/?([a-zA-Z][\w-]*)/g;

function extractHtmlTagNames(html2) {
  const tagNames = [];
  let match2;
  while ((match2 = HTML_TAG_NAME_PATTERN.exec(html2)) !== null)
    tagNames.push(match2[1].toLowerCase());
  return tagNames;
}

function isHtmlUnknownTagName(tagName) {
  const lower2 = tagName.toLowerCase();
  if (lower2.includes("-")) return false;
  return !STANDARD_HTML_TAGS.has(lower2);
}

function htmlContainsUnrecognizedTag(html2, schemaTags) {
  return extractHtmlTagNames(html2).some((tagName) => {
    if (!isHtmlUnknownTagName(tagName)) return false;
    return !schemaTags.has(tagName);
  });
}

export var MarkdownManager = class {
  /**
   * Create a MarkdownManager.
   * @param options.marked Optional marked instance to use (injected).
   * @param options.markedOptions Optional options to pass to marked.setOptions
   * @param options.indentation Indentation settings (style and size).
   * @param options.extensions An array of Tiptap extensions to register for markdown parsing and rendering.
   */
  constructor(options) {
    var _options$marked,
      _options$indentation$,
      _options$indentation,
      _options$indentation$2,
      _options$indentation2;
    this.activeParseLexer = null;
    this.extensionRanks = new Map();
    this.baseExtensions = [];
    this.extensions = [];
    this.codeTypes = new Set();
    this.schemaParseDomTagsCache = null;
    this.inlineNodeTypesCache = null;
    this.lastParseResult = null;
    this.markedInstance =
      (_options$marked =
        options === null || options === void 0 ? void 0 : options.marked) !==
        null && _options$marked !== void 0
        ? _options$marked
        : g$2;
    this.indentStyle =
      (_options$indentation$ =
        options === null ||
        options === void 0 ||
        (_options$indentation = options.indentation) === null ||
        _options$indentation === void 0
          ? void 0
          : _options$indentation.style) !== null &&
      _options$indentation$ !== void 0
        ? _options$indentation$
        : "space";
    this.indentSize =
      (_options$indentation$2 =
        options === null ||
        options === void 0 ||
        (_options$indentation2 = options.indentation) === null ||
        _options$indentation2 === void 0
          ? void 0
          : _options$indentation2.size) !== null &&
      _options$indentation$2 !== void 0
        ? _options$indentation$2
        : 2;
    this.baseExtensions =
      (options === null || options === void 0 ? void 0 : options.extensions) ||
      [];
    if (
      (options === null || options === void 0
        ? void 0
        : options.markedOptions) &&
      typeof this.markedInstance.setOptions === "function"
    )
      this.markedInstance.setOptions(options.markedOptions);
    this.registry = new Map();
    this.nodeTypeRegistry = new Map();
    if (options === null || options === void 0 ? void 0 : options.extensions) {
      this.baseExtensions = options.extensions;
      sortExtensions(flattenExtensions(options.extensions)).forEach((ext) =>
        this.registerExtension(ext),
      );
    }
  }
  /** Returns the underlying marked instance. */
  get instance() {
    return this.markedInstance;
  }
  /** Returns the correct indentCharacter (space or tab) */
  get indentCharacter() {
    return this.indentStyle === "space" ? " " : "	";
  }
  /** Returns the correct indentString repeated X times */
  get indentString() {
    return this.indentCharacter.repeat(this.indentSize);
  }
  /** Helper to quickly check whether a marked instance is available. */
  hasMarked() {
    return !!this.markedInstance;
  }
  /**
   * Register a Tiptap extension (Node/Mark/Extension). This will read
   * `markdownName`, `parseMarkdown`, `renderMarkdown` and `priority` from the
   * extension config (using the same resolution used across the codebase).
   */
  registerExtension(extension2) {
    var _getExtensionField, _markdownCfg$indentsC;
    this.extensions.push(extension2);
    const isCode = callOrReturn(getExtensionField(extension2, "code"));
    const name2 = extension2.name;
    if (isCode) this.codeTypes.add(name2);
    if (!this.extensionRanks.has(name2))
      this.extensionRanks.set(name2, this.extensionRanks.size);
    const tokenName =
      getExtensionField(extension2, "markdownTokenName") || name2;
    const parseMarkdown = getExtensionField(extension2, "parseMarkdown");
    const renderMarkdown = getExtensionField(extension2, "renderMarkdown");
    const tokenizer = getExtensionField(extension2, "markdownTokenizer");
    const markdownCfg =
      (_getExtensionField = getExtensionField(
        extension2,
        "markdownOptions",
      )) !== null && _getExtensionField !== void 0
        ? _getExtensionField
        : null;
    const spec = {
      tokenName,
      nodeName: name2,
      parseMarkdown,
      renderMarkdown,
      isIndenting:
        (_markdownCfg$indentsC =
          markdownCfg === null || markdownCfg === void 0
            ? void 0
            : markdownCfg.indentsContent) !== null &&
        _markdownCfg$indentsC !== void 0
          ? _markdownCfg$indentsC
          : false,
      htmlReopen:
        markdownCfg === null || markdownCfg === void 0
          ? void 0
          : markdownCfg.htmlReopen,
      tokenizer,
    };
    if (tokenName && parseMarkdown) {
      const parseExisting = this.registry.get(tokenName) || [];
      parseExisting.push(spec);
      this.registry.set(tokenName, parseExisting);
    }
    if (renderMarkdown) {
      const renderExisting = this.nodeTypeRegistry.get(name2) || [];
      renderExisting.push(spec);
      this.nodeTypeRegistry.set(name2, renderExisting);
    }
    if (tokenizer && this.hasMarked()) this.registerTokenizer(tokenizer);
  }
  createLexer() {
    return new this.markedInstance.Lexer(this.markedInstance.defaults);
  }
  createTokenizerHelpers(lexer) {
    return {
      inlineTokens: (src) => lexer.inlineTokens(src),
      blockTokens: (src) => lexer.blockTokens(src),
    };
  }
  tokenizeInline(src) {
    var _this$activeParseLexe;
    return (
      (_this$activeParseLexe = this.activeParseLexer) !== null &&
      _this$activeParseLexe !== void 0
        ? _this$activeParseLexe
        : this.createLexer()
    ).inlineTokens(src);
  }
  /**
   * Register a custom tokenizer with marked.js for parsing non-standard markdown syntax.
   */
  registerTokenizer(tokenizer) {
    if (!this.hasMarked()) return;
    const {
      name: name2,
      start: start2,
      level = "inline",
      tokenize: tokenize2,
    } = tokenizer;
    const createTokenizerHelpers = this.createTokenizerHelpers.bind(this);
    const createLexer = this.createLexer.bind(this);
    let startCb;
    if (!start2)
      startCb = (src) => {
        const result = tokenize2(
          src,
          [],
          this.createTokenizerHelpers(this.createLexer()),
        );
        if (result && result.raw) return src.indexOf(result.raw);
        return -1;
      };
    else
      startCb =
        typeof start2 === "function" ? start2 : (src) => src.indexOf(start2);
    const markedExtension = {
      name: name2,
      level,
      start: startCb,
      tokenizer(src, tokens2) {
        const helper = this.lexer
          ? createTokenizerHelpers(this.lexer)
          : createTokenizerHelpers(createLexer());
        const result = tokenize2(src, tokens2, helper);
        if (result && result.type)
          return {
            ...result,
            type: result.type || name2,
            raw: result.raw || "",
            tokens: result.tokens || [],
          };
      },
      childTokens: [],
    };
    this.markedInstance.use({
      extensions: [markedExtension],
    });
  }
  /** Get registered handlers for a token type and try each until one succeeds. */
  getHandlersForToken(type2) {
    try {
      return this.registry.get(type2) || [];
    } catch {
      return [];
    }
  }
  /** Get the first handler for a token type (for backwards compatibility). */
  getHandlerForToken(type2) {
    const markdownHandlers = this.getHandlersForToken(type2);
    if (markdownHandlers.length > 0) return markdownHandlers[0];
    const nodeTypeHandlers = this.getHandlersForNodeType(type2);
    return nodeTypeHandlers.length > 0 ? nodeTypeHandlers[0] : void 0;
  }
  /** Get registered handlers for a node type (for rendering). */
  getHandlersForNodeType(type2) {
    try {
      return this.nodeTypeRegistry.get(type2) || [];
    } catch {
      return [];
    }
  }
  /**
   * Serialize a ProseMirror-like JSON document (or node array) to a Markdown string
   * using registered renderers and fallback renderers.
   */
  serialize(docOrContent) {
    if (!docOrContent) return "";
    const result = this.renderNodes(docOrContent, docOrContent);
    return this.isEmptyOutput(result) ? "" : result;
  }
  /**
   * Check if the markdown output represents an empty document.
   * Empty documents may contain only &nbsp; entities or non-breaking space characters
   * which are used by the Paragraph extension to preserve blank lines.
   */
  isEmptyOutput(markdown2) {
    if (!markdown2 || markdown2.trim() === "") return true;
    return (
      markdown2
        .replace(/&nbsp;/g, "")
        .replace(/\u00A0/g, "")
        .trim() === ""
    );
  }
  /**
   * Parse markdown string into Tiptap JSON document using registered extension handlers.
   */
  parse(markdown2) {
    if (!this.hasMarked())
      throw new Error("No marked instance available for parsing");
    const previousParseLexer = this.activeParseLexer;
    const parseLexer = this.createLexer();
    this.activeParseLexer = parseLexer;
    try {
      const tokens2 = parseLexer.lex(markdown2);
      return {
        type: "doc",
        content: this.parseTokens(tokens2, true),
      };
    } finally {
      this.activeParseLexer = previousParseLexer;
    }
  }
  /**
   * Convert an array of marked tokens into Tiptap JSON nodes using registered extension handlers.
   */
  parseTokens(tokens2, parseImplicitEmptyParagraphs = false) {
    const normalizedTokens = parseImplicitEmptyParagraphs
      ? extractAbsorbedBlankLines(tokens2)
      : tokens2;
    const nonSpaceTokenIndexes = normalizedTokens.reduce(
      (indexes, token2, index2) => {
        if (token2.type !== "space") indexes.push(index2);
        return indexes;
      },
      [],
    );
    let previousNonSpaceTokenIndex = -1;
    let nextNonSpaceTokenPointer = 0;
    return normalizedTokens.flatMap((token2, index2) => {
      while (
        nextNonSpaceTokenPointer < nonSpaceTokenIndexes.length &&
        nonSpaceTokenIndexes[nextNonSpaceTokenPointer] < index2
      ) {
        previousNonSpaceTokenIndex =
          nonSpaceTokenIndexes[nextNonSpaceTokenPointer];
        nextNonSpaceTokenPointer += 1;
      }
      if (parseImplicitEmptyParagraphs && token2.type === "space") {
        var _nonSpaceTokenIndexes;
        const nextNonSpaceTokenIndex =
          (_nonSpaceTokenIndexes =
            nonSpaceTokenIndexes[nextNonSpaceTokenPointer]) !== null &&
          _nonSpaceTokenIndexes !== void 0
            ? _nonSpaceTokenIndexes
            : -1;
        return this.createImplicitEmptyParagraphsFromSpace(
          token2,
          previousNonSpaceTokenIndex,
          nextNonSpaceTokenIndex,
        );
      }
      const parsed = this.parseToken(token2, parseImplicitEmptyParagraphs);
      if (parsed === null) return [];
      return Array.isArray(parsed) ? parsed : [parsed];
    });
  }
  createImplicitEmptyParagraphsFromSpace(
    token2,
    previousNonSpaceTokenIndex,
    nextNonSpaceTokenIndex,
  ) {
    const separatorCount = this.countParagraphSeparators(token2.raw || "");
    if (separatorCount === 0) return [];
    const emptyParagraphCount = Math.max(
      separatorCount -
        (previousNonSpaceTokenIndex === -1 || nextNonSpaceTokenIndex === -1
          ? 0
          : 1),
      0,
    );
    return Array.from(
      {
        length: emptyParagraphCount,
      },
      () => ({
        type: "paragraph",
        content: [],
      }),
    );
  }
  countParagraphSeparators(raw2) {
    return (raw2.replace(/\r\n/g, "\n").match(/\n\n/g) || []).length;
  }
  /**
   * Parse a single token into Tiptap JSON using the appropriate registered handler.
   */
  parseToken(token2, parseImplicitEmptyParagraphs = false) {
    if (!token2.type) return null;
    if (token2.type === "list") return this.parseListToken(token2);
    const handlers2 = this.getHandlersForToken(token2.type);
    const helpers = this.createParseHelpers();
    if (
      handlers2.find((handler) => {
        if (!handler.parseMarkdown) return false;
        const parseResult = handler.parseMarkdown(token2, helpers);
        const normalized = this.normalizeParseResult(parseResult);
        if (
          normalized &&
          (!Array.isArray(normalized) || normalized.length > 0)
        ) {
          this.lastParseResult = normalized;
          return true;
        }
        return false;
      }) &&
      this.lastParseResult
    ) {
      const toReturn = this.lastParseResult;
      this.lastParseResult = null;
      return toReturn;
    }
    return this.parseFallbackToken(token2, parseImplicitEmptyParagraphs);
  }
  /**
   * Parse a list token, handling mixed bullet and task list items by splitting them into separate lists.
   * This ensures that consecutive task items and bullet items are grouped and parsed as separate list nodes.
   *
   * @param token The list token to parse
   * @returns Array of parsed list nodes, or null if parsing fails
   */
  parseListToken(token2) {
    if (!token2.items || token2.items.length === 0)
      return this.parseTokenWithHandlers(token2);
    const hasTask = token2.items.some((item) => isTaskItem(item).isTask);
    const hasNonTask = token2.items.some((item) => !isTaskItem(item).isTask);
    if (
      !hasTask ||
      !hasNonTask ||
      this.getHandlersForToken("taskList").length === 0
    )
      return this.parseTokenWithHandlers(token2);
    const groups = [];
    let currentGroup = [];
    let currentType = null;
    for (let i2 = 0; i2 < token2.items.length; i2 += 1) {
      const item = token2.items[i2];
      const { isTask, checked, indentLevel } = isTaskItem(item);
      let processedItem = item;
      if (isTask) {
        const lines = (item.raw || item.text || "").split("\n");
        const firstLineMatch = lines[0].match(
          /^\s*[-+*]\s+\[([ xX])\]\s+(.*)$/,
        );
        const mainContent = firstLineMatch ? firstLineMatch[2] : "";
        let nestedTokens = [];
        if (lines.length > 1) {
          if (lines.slice(1).join("\n").trim()) {
            const nestedLines = lines.slice(1);
            const nonEmptyLines = nestedLines.filter((line) => line.trim());
            if (nonEmptyLines.length > 0) {
              const minIndent = Math.min(
                ...nonEmptyLines.map(
                  (line) => line.length - line.trimStart().length,
                ),
              );
              const nestedContent = nestedLines
                .map((line) => {
                  if (!line.trim()) return "";
                  return line.slice(minIndent);
                })
                .join("\n")
                .trim();
              if (nestedContent)
                nestedTokens = this.markedInstance.lexer(`${nestedContent}
`);
            }
          }
        }
        processedItem = {
          type: "taskItem",
          raw: "",
          mainContent,
          indentLevel,
          checked: checked !== null && checked !== void 0 ? checked : false,
          text: mainContent,
          tokens: this.tokenizeInline(mainContent),
          nestedTokens,
        };
      }
      const itemType = isTask ? "taskList" : "list";
      if (currentType !== itemType) {
        if (currentGroup.length > 0)
          groups.push({
            type: currentType,
            items: currentGroup,
          });
        currentGroup = [processedItem];
        currentType = itemType;
      } else currentGroup.push(processedItem);
    }
    if (currentGroup.length > 0)
      groups.push({
        type: currentType,
        items: currentGroup,
      });
    const results = [];
    for (let i2 = 0; i2 < groups.length; i2 += 1) {
      const group = groups[i2];
      const subToken = {
        ...token2,
        type: group.type,
        items: group.items,
      };
      const parsed = this.parseToken(subToken);
      if (parsed) {
        if (Array.isArray(parsed)) results.push(...parsed);
        else results.push(parsed);
      }
    }
    return results.length > 0 ? results : null;
  }
  /**
   * Parse a token using registered handlers (extracted for reuse).
   */
  parseTokenWithHandlers(token2) {
    if (!token2.type) return null;
    const handlers2 = this.getHandlersForToken(token2.type);
    const helpers = this.createParseHelpers();
    if (
      handlers2.find((handler) => {
        if (!handler.parseMarkdown) return false;
        const parseResult = handler.parseMarkdown(token2, helpers);
        const normalized = this.normalizeParseResult(parseResult);
        if (
          normalized &&
          (!Array.isArray(normalized) || normalized.length > 0)
        ) {
          this.lastParseResult = normalized;
          return true;
        }
        return false;
      }) &&
      this.lastParseResult
    ) {
      const toReturn = this.lastParseResult;
      this.lastParseResult = null;
      return toReturn;
    }
    return this.parseFallbackToken(token2);
  }
  /**
   * Creates helper functions for parsing markdown tokens.
   * @returns An object containing helper functions for parsing.
   */
  createParseHelpers() {
    return {
      parseInline: (tokens2) => this.parseInlineTokens(tokens2),
      tokenizeInline: (src) => this.tokenizeInline(src),
      parseChildren: (tokens2) => this.parseTokens(tokens2),
      parseBlockChildren: (tokens2) => this.parseTokens(tokens2, true),
      createTextNode: (text2, marks) => {
        return {
          type: "text",
          text: text2,
          marks: marks || void 0,
        };
      },
      createNode: (type2, attrs, content2) => {
        const node2 = {
          type: type2,
          attrs: attrs || void 0,
          content: content2 || void 0,
        };
        if (!attrs || Object.keys(attrs).length === 0) delete node2.attrs;
        return node2;
      },
      applyMark: (markType, content2, attrs) => ({
        mark: markType,
        content: content2,
        attrs: attrs && Object.keys(attrs).length > 0 ? attrs : void 0,
      }),
    };
  }
  /**
   * Escape special regex characters in a string.
   */
  escapeRegex(str2) {
    return str2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  /**
   * Parse inline tokens (bold, italic, links, etc.) into text nodes with marks.
   * This is the complex part that handles mark nesting and boundaries.
   */
  parseInlineTokens(tokens2) {
    const result = [];
    for (let i2 = 0; i2 < tokens2.length; i2 += 1) {
      const token2 = tokens2[i2];
      if (token2.type === "text")
        result.push({
          type: "text",
          text: decodeHtmlEntities(token2.text || ""),
        });
      else if (token2.type === "escape")
        result.push({
          type: "text",
          text: token2.text || "",
        });
      else if (token2.type === "html") {
        var _ref, _token$raw;
        const raw2 = (
          (_ref =
            (_token$raw = token2.raw) !== null && _token$raw !== void 0
              ? _token$raw
              : token2.text) !== null && _ref !== void 0
            ? _ref
            : ""
        ).toString();
        const isClosing = /^<\/[\s]*[\w-]+/i.test(raw2);
        const openMatch = raw2.match(/^<[\s]*([\w-]+)(\s|>|\/|$)/i);
        if (!isClosing && openMatch && !/\/>$/.test(raw2)) {
          const tagName = openMatch[1];
          const escapedTagName = this.escapeRegex(tagName);
          const closingRegex = new RegExp(`^<\\/\\s*${escapedTagName}\\b`, "i");
          let foundIndex = -1;
          const parts = [raw2];
          for (let j2 = i2 + 1; j2 < tokens2.length; j2 += 1) {
            var _ref2, _t$raw;
            const t2 = tokens2[j2];
            const tRaw = (
              (_ref2 =
                (_t$raw = t2.raw) !== null && _t$raw !== void 0
                  ? _t$raw
                  : t2.text) !== null && _ref2 !== void 0
                ? _ref2
                : ""
            ).toString();
            parts.push(tRaw);
            if (t2.type === "html" && closingRegex.test(tRaw)) {
              foundIndex = j2;
              break;
            }
          }
          if (foundIndex !== -1) {
            const mergedRaw = parts.join("");
            const mergedToken = {
              type: "html",
              raw: mergedRaw,
              text: mergedRaw,
              block: false,
            };
            const parsed = this.parseHTMLToken(mergedToken);
            if (parsed) {
              const normalized = this.normalizeParseResult(parsed);
              if (Array.isArray(normalized)) result.push(...normalized);
              else if (normalized) result.push(normalized);
            }
            i2 = foundIndex;
            continue;
          }
        }
        const parsedSingle = this.parseHTMLToken(token2);
        if (parsedSingle) {
          const normalized = this.normalizeParseResult(parsedSingle);
          if (Array.isArray(normalized)) result.push(...normalized);
          else if (normalized) result.push(normalized);
        }
      } else if (token2.type) {
        const markHandler = this.getHandlerForToken(token2.type);
        if (markHandler && markHandler.parseMarkdown) {
          const helpers = this.createParseHelpers();
          const parsed = markHandler.parseMarkdown(token2, helpers);
          if (this.isMarkResult(parsed)) {
            const markedContent = this.applyMarkToContent(
              parsed.mark,
              parsed.content,
              parsed.attrs,
            );
            result.push(...markedContent);
          } else {
            const normalized = this.normalizeParseResult(parsed);
            if (Array.isArray(normalized)) result.push(...normalized);
            else if (normalized) result.push(normalized);
          }
        } else if (token2.tokens)
          result.push(...this.parseInlineTokens(token2.tokens));
      }
    }
    for (let i2 = result.length - 1; i2 > 0; i2 -= 1) {
      const current2 = result[i2];
      const previous2 = result[i2 - 1];
      if (current2.type === "text" && previous2.type === "text") {
        const currentMarks = current2.marks || [];
        const previousMarks = previous2.marks || [];
        if (marksEqual(currentMarks, previousMarks)) {
          previous2.text = (previous2.text || "") + (current2.text || "");
          result.splice(i2, 1);
        }
      }
    }
    return result;
  }
  /**
   * Apply a mark to content nodes.
   */
  applyMarkToContent(markType, content2, attrs) {
    return content2.map((node2) => {
      if (node2.type === "text") {
        const existingMarks = node2.marks || [];
        const newMark = attrs
          ? {
              type: markType,
              attrs,
            }
          : {
              type: markType,
            };
        return {
          ...node2,
          marks: [...existingMarks, newMark],
        };
      }
      return {
        ...node2,
        content: node2.content
          ? this.applyMarkToContent(markType, node2.content, attrs)
          : void 0,
      };
    });
  }
  isMarkResult(result) {
    return result && typeof result === "object" && "mark" in result;
  }
  /**
   * Normalize parse results to ensure they're valid JSONContent.
   */
  normalizeParseResult(result) {
    if (!result) return null;
    if (this.isMarkResult(result)) return result.content;
    return result;
  }
  /**
   * Fallback parsing for common tokens when no specific handler is registered.
   */
  parseFallbackToken(token2, parseImplicitEmptyParagraphs = false) {
    switch (token2.type) {
      case "paragraph":
        return {
          type: "paragraph",
          content: token2.tokens ? this.parseInlineTokens(token2.tokens) : [],
        };
      case "heading":
        return {
          type: "heading",
          attrs: {
            level: token2.depth || 1,
          },
          content: token2.tokens ? this.parseInlineTokens(token2.tokens) : [],
        };
      case "text":
        return {
          type: "text",
          text: decodeHtmlEntities(token2.text || ""),
        };
      case "html":
        return this.parseHTMLToken(token2);
      case "escape":
        return {
          type: "text",
          text: token2.text || "",
        };
      case "space":
        return null;
      default:
        if (token2.tokens)
          return this.parseTokens(token2.tokens, parseImplicitEmptyParagraphs);
        return null;
    }
  }
  /**
   * Parse an HTML token from marked into JSONContent using the registered
   * extensions' `parseHTML` rules. Falls back to literal text when the HTML
   * has nothing for the schema to keep.
   *
   * @param token Marked HTML token (block or inline).
   * @example
   *   parseHTMLToken({ type: 'html', raw: '<em>hi</em>', block: false })
   *   // → text node with an italic mark
   */
  parseHTMLToken(token2) {
    const html2 = token2.text || token2.raw || "";
    if (!html2.trim()) return null;
    if (this.isUnrecognizedHtml(html2))
      return this.htmlAsLiteralText(html2, !!token2.block);
    if (
      typeof window === "undefined" ||
      typeof window.DOMParser === "undefined"
    )
      return this.htmlAsLiteralText(html2, !!token2.block);
    try {
      const parsed = generateJSON(html2, this.baseExtensions);
      if (parsed.type === "doc" && parsed.content) {
        if (token2.block) return parsed.content;
        const inlineContent = this.toInlineContent(parsed.content);
        return inlineContent.length > 0 ? inlineContent : null;
      }
      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse HTML in markdown: ${error}`);
    }
  }
  /**
   * Keep only the inline nodes of parsed HTML content, unwrapping the block
   * nodes around them. Inline HTML sits inside a textblock, where a block node
   * would make the document invalid for the schema.
   *
   * @param content Content array of a parsed HTML fragment.
   * @example
   *   toInlineContent([{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }])
   *   // → [{ type: 'text', text: 'hi' }]
   */
  toInlineContent(content2) {
    const inlineTypes = this.getInlineNodeTypes();
    return content2.flatMap((node2) => {
      if (node2.type && inlineTypes.has(node2.type)) return [node2];
      return node2.content ? this.toInlineContent(node2.content) : [];
    });
  }
  /**
   * Collect the names of the node types the schema treats as inline. Result is
   * cached for the lifetime of the manager since extensions don't change after
   * registration.
   *
   * @example
   *   getInlineNodeTypes().has('text') // → true
   */
  getInlineNodeTypes() {
    if (this.inlineNodeTypesCache) return this.inlineNodeTypesCache;
    const types2 = new Set(["text"]);
    try {
      const schema2 = getSchema(this.baseExtensions);
      Object.values(schema2.nodes).forEach((type2) => {
        if (type2.isInline) types2.add(type2.name);
      });
    } catch {}
    this.inlineNodeTypesCache = types2;
    return types2;
  }
  /**
   * Returns true when the HTML contains a tag that is neither a standard
   * HTML/SVG element nor declared in a registered extension's parseDOM rules.
   *
   * Recognized but empty elements such as `<em></em>` or `<span></span>`,
   * and hyphenated custom elements like `<my-mention>`, are not considered
   * unrecognized.
   *
   * @param html Raw HTML string from a marked token.
   * @example
   *   isUnrecognizedHtml('<enter foo bar>')  // → true
   *   isUnrecognizedHtml('<em></em>')        // → false (empty, but real tag)
   *   isUnrecognizedHtml('<em>hi</em>')      // → false
   *   isUnrecognizedHtml('<my-el></my-el>')  // → false (valid custom element)
   *   isUnrecognizedHtml('<br>')             // → false
   */
  isUnrecognizedHtml(html2) {
    return htmlContainsUnrecognizedTag(html2, this.getSchemaParseDomTags());
  }
  /**
   * Collect the lower-cased tag names declared by the registered extensions'
   * parseDOM rules, so custom node/mark elements that use non-hyphenated,
   * non-standard tag names are treated as recognized HTML. Result is cached for the
   * lifetime of the manager since extensions don't change after registration.
   *
   * @example
   *   // After registering an extension with parseDOM [{ tag: 'something' }]
   *   getSchemaParseDomTags().has('something') // → true
   */
  getSchemaParseDomTags() {
    if (this.schemaParseDomTagsCache) return this.schemaParseDomTagsCache;
    const tags2 = new Set();
    try {
      const schema2 = getSchema(this.baseExtensions);
      const collect = (spec) => {
        const parseDOM =
          spec === null || spec === void 0 ? void 0 : spec.parseDOM;
        if (!Array.isArray(parseDOM)) return;
        parseDOM.forEach((rule) => {
          if (
            typeof (rule === null || rule === void 0 ? void 0 : rule.tag) ===
            "string"
          ) {
            const match2 = rule.tag.match(/^[a-zA-Z][\w-]*/);
            if (match2) tags2.add(match2[0].toLowerCase());
          }
        });
      };
      Object.values(schema2.nodes).forEach((type2) => collect(type2.spec));
      Object.values(schema2.marks).forEach((type2) => collect(type2.spec));
    } catch {}
    this.schemaParseDomTagsCache = tags2;
    return tags2;
  }
  /**
   * Build a JSONContent that preserves the original HTML markup as literal
   * text. Used when the HTML would otherwise be silently dropped during
   * schema-aware parsing.
   *
   * @param html Raw HTML string to preserve verbatim.
   * @param isBlock Whether to wrap the text in a paragraph node (block tokens)
   *   or return it as a bare text node (inline tokens).
   * @example
   *   htmlAsLiteralText('<enter foo>', true)
   *   // → { type: 'paragraph', content: [{ type: 'text', text: '<enter foo>' }] }
   */
  htmlAsLiteralText(html2, isBlock) {
    const text2 = html2.replace(/\s+$/, "");
    if (!text2) return null;
    if (isBlock)
      return {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: text2,
          },
        ],
      };
    return {
      type: "text",
      text: text2,
    };
  }
  /**
   * Encode HTML entities in text unless the node is inside a code context
   * (code mark or code-block parent) where literal characters should be preserved.
   * Also backslash-escape markdown-significant characters in non-code text to
   * prevent them from being misinterpreted as formatting delimiters.
   */
  encodeTextForMarkdown(text2, node2, parentNode2) {
    if (
      ((parentNode2 === null || parentNode2 === void 0
        ? void 0
        : parentNode2.type) != null &&
        this.codeTypes.has(parentNode2.type)) ||
      (node2.marks || []).some((m3) =>
        this.codeTypes.has(typeof m3 === "string" ? m3 : m3.type),
      )
    )
      return text2;
    return this.escapeMarkdownSyntax(encodeHtmlEntities(text2));
  }
  /**
   * Backslash-escape characters that have special meaning in markdown inline
   * syntax. This prevents literal characters in text nodes from being
   * misinterpreted as formatting delimiters when the output is parsed again.
   *
   * The set covers the most common inline markdown syntax characters.
   * Characters inside code blocks/code marks are skipped by the caller
   * (`encodeTextForMarkdown`) via the existing `isInsideCode` guard.
   */
  escapeMarkdownSyntax(text2) {
    return text2.replace(/([\\`*_[\]~])/g, "\\$1");
  }
  renderNodeToMarkdown(node2, parentNode2, index2 = 0, level = 0, meta2 = {}) {
    var _handler$renderMarkdo;
    if (node2.type === "text")
      return this.encodeTextForMarkdown(node2.text || "", node2, parentNode2);
    if (!node2.type) return "";
    const handler = this.getHandlerForToken(node2.type);
    if (!handler) return "";
    const previousNode =
      Array.isArray(
        parentNode2 === null || parentNode2 === void 0
          ? void 0
          : parentNode2.content,
      ) && index2 > 0
        ? parentNode2.content[index2 - 1]
        : void 0;
    const helpers = {
      renderChildren: (nodes, separator) => {
        const childLevel = handler.isIndenting ? level + 1 : level;
        if (!Array.isArray(nodes) && nodes.content)
          return this.renderNodes(
            nodes.content,
            node2,
            separator || "",
            index2,
            childLevel,
          );
        return this.renderNodes(
          nodes,
          node2,
          separator || "",
          index2,
          childLevel,
        );
      },
      renderChild: (childNode, childIndex) => {
        const childLevel = handler.isIndenting ? level + 1 : level;
        return this.renderNodeToMarkdown(
          childNode,
          node2,
          childIndex,
          childLevel,
        );
      },
      indent: (content2) => {
        return this.indentString + content2;
      },
      wrapInBlock: wrapInMarkdownBlock,
    };
    const context = {
      index: index2,
      level,
      parentType:
        parentNode2 === null || parentNode2 === void 0
          ? void 0
          : parentNode2.type,
      previousNode,
      meta: {
        parentAttrs:
          parentNode2 === null || parentNode2 === void 0
            ? void 0
            : parentNode2.attrs,
        ...meta2,
      },
    };
    return (
      ((_handler$renderMarkdo = handler.renderMarkdown) === null ||
      _handler$renderMarkdo === void 0
        ? void 0
        : _handler$renderMarkdo.call(handler, node2, helpers, context)) || ""
    );
  }
  /**
   * Render a node or an array of nodes. Parent type controls how children
   * are joined (which determines newline insertion between children).
   */
  renderNodes(nodeOrNodes, parentNode2, separator = "", index2 = 0, level = 0) {
    if (!Array.isArray(nodeOrNodes)) {
      if (!nodeOrNodes.type) return "";
      return this.renderNodeToMarkdown(nodeOrNodes, parentNode2, index2, level);
    }
    return this.renderNodesWithMarkBoundaries(
      nodeOrNodes,
      parentNode2,
      separator,
      level,
    );
  }
  /**
   * Render an array of nodes while properly tracking mark boundaries.
   * This handles cases where marks span across multiple text nodes.
   */
  renderNodesWithMarkBoundaries(nodes, parentNode2, separator = "", level = 0) {
    const result = [];
    const activeMarks = new Map();
    const reopenWithHtmlOnNextOpen = new Set();
    const markOpeningModes = new Map();
    nodes.forEach((node2, i2) => {
      const nextNode = i2 < nodes.length - 1 ? nodes[i2 + 1] : null;
      if (!node2.type) return;
      if (node2.type === "text") {
        let textContent = this.encodeTextForMarkdown(
          node2.text || "",
          node2,
          parentNode2,
        );
        let currentMarks = new Map(
          (node2.marks || []).map((mark2) => [mark2.type, mark2]),
        );
        let marksToOpen = this.getMarksToOpenForSerialization(
          activeMarks,
          currentMarks,
          nextNode,
        );
        let marksToClose = findMarksToClose(currentMarks, nextNode);
        if (
          textContent.length > 0 &&
          textContent.trim().length === 0 &&
          currentMarks.size > 0
        ) {
          const transientMarks = new Set(
            marksToClose.filter((markType) => !activeMarks.has(markType)),
          );
          if (transientMarks.size > 0) {
            currentMarks = new Map(
              Array.from(currentMarks).filter(
                ([markType]) => !transientMarks.has(markType),
              ),
            );
            marksToOpen = this.getMarksToOpenForSerialization(
              activeMarks,
              currentMarks,
              nextNode,
            );
            marksToClose = findMarksToClose(currentMarks, nextNode);
          }
        }
        const activeMarksClosingHere = marksToClose.filter((markType) =>
          activeMarks.has(markType),
        );
        const hasCrossedBoundary =
          activeMarksClosingHere.length > 0 && marksToOpen.length > 0;
        let middleTrailingWhitespace = "";
        if (marksToClose.length > 0 && !hasCrossedBoundary) {
          const middleTrailingMatch = textContent.match(/(\s+)$/);
          if (middleTrailingMatch) {
            middleTrailingWhitespace = middleTrailingMatch[1];
            textContent = textContent.slice(
              0,
              -middleTrailingWhitespace.length,
            );
          }
        }
        if (!hasCrossedBoundary)
          marksToClose
            .slice()
            .reverse()
            .forEach((markType) => {
              if (!activeMarks.has(markType)) return;
              const mark2 = currentMarks.get(markType);
              const closeMarkdown = this.getMarkClosing(
                markType,
                mark2,
                markOpeningModes.get(markType),
              );
              if (closeMarkdown) textContent += closeMarkdown;
              if (activeMarks.has(markType)) {
                activeMarks.delete(markType);
                markOpeningModes.delete(markType);
              }
            });
        let leadingWhitespace = "";
        if (marksToOpen.length > 0) {
          const leadingMatch = textContent.match(/^(\s+)/);
          if (leadingMatch) {
            leadingWhitespace = leadingMatch[1];
            textContent = textContent.slice(leadingWhitespace.length);
          }
        }
        marksToOpen.forEach(({ type: type2, mark: mark2 }) => {
          const openingMode = reopenWithHtmlOnNextOpen.has(type2)
            ? "html"
            : "markdown";
          const openMarkdown = this.getMarkOpening(type2, mark2, openingMode);
          if (openMarkdown) textContent = openMarkdown + textContent;
          markOpeningModes.set(type2, openingMode);
          reopenWithHtmlOnNextOpen.delete(type2);
        });
        if (!hasCrossedBoundary)
          marksToOpen
            .slice()
            .reverse()
            .forEach(({ type: type2, mark: mark2 }) => {
              activeMarks.set(type2, mark2);
            });
        textContent = leadingWhitespace + textContent;
        let marksToCloseAtEnd;
        if (hasCrossedBoundary) {
          const nextMarkTypes = new Set(
            (
              (nextNode === null || nextNode === void 0
                ? void 0
                : nextNode.marks) || []
            ).map((mark2) => mark2.type),
          );
          marksToOpen.forEach(({ type: type2 }) => {
            if (nextMarkTypes.has(type2) && this.getHtmlReopenTags(type2))
              reopenWithHtmlOnNextOpen.add(type2);
          });
          const activeMarkKeys = Array.from(activeMarks.keys());
          const activeMarksClosingHereLifo = activeMarksClosingHere
            .slice()
            .sort(
              (a2, b3) =>
                activeMarkKeys.indexOf(b3) - activeMarkKeys.indexOf(a2),
            );
          marksToCloseAtEnd = [
            ...marksToOpen.map((m3) => m3.type),
            ...activeMarksClosingHereLifo,
          ];
        } else
          marksToCloseAtEnd = findMarksToCloseAtEnd(
            activeMarks,
            currentMarks,
            nextNode,
            this.markSetsEqual.bind(this),
          );
        let trailingWhitespace = "";
        if (marksToCloseAtEnd.length > 0) {
          const trailingMatch = textContent.match(/(\s+)$/);
          if (trailingMatch) {
            trailingWhitespace = trailingMatch[1];
            textContent = textContent.slice(0, -trailingWhitespace.length);
          }
        }
        marksToCloseAtEnd.forEach((markType) => {
          var _activeMarks$get;
          const mark2 =
            (_activeMarks$get = activeMarks.get(markType)) !== null &&
            _activeMarks$get !== void 0
              ? _activeMarks$get
              : currentMarks.get(markType);
          const closeMarkdown = this.getMarkClosing(
            markType,
            mark2,
            markOpeningModes.get(markType),
          );
          if (closeMarkdown) textContent += closeMarkdown;
          activeMarks.delete(markType);
          markOpeningModes.delete(markType);
        });
        textContent += trailingWhitespace;
        textContent += middleTrailingWhitespace;
        result.push(textContent);
      } else {
        const nodeMarkTypes = new Set(
          (node2.marks || []).map((mark2) => mark2.type),
        );
        const marksToReopen = new Map();
        const openingModesToReopen = new Map();
        activeMarks.forEach((mark2, type2) => {
          if (nodeMarkTypes.has(type2)) {
            var _markOpeningModes$get;
            marksToReopen.set(type2, mark2);
            openingModesToReopen.set(
              type2,
              (_markOpeningModes$get = markOpeningModes.get(type2)) !== null &&
                _markOpeningModes$get !== void 0
                ? _markOpeningModes$get
                : "markdown",
            );
          }
        });
        const beforeMarkdown = closeMarksBeforeNode(
          activeMarks,
          (markType, mark2) => {
            return this.getMarkClosing(
              markType,
              mark2,
              markOpeningModes.get(markType),
            );
          },
        );
        markOpeningModes.clear();
        const nodeContent = this.renderNodeToMarkdown(
          node2,
          parentNode2,
          i2,
          level,
        );
        const afterMarkdown =
          node2.type === "hardBreak"
            ? ""
            : reopenMarksAfterNode(
                marksToReopen,
                activeMarks,
                (markType, mark2) => {
                  var _openingModesToReopen;
                  const openingMode =
                    (_openingModesToReopen =
                      openingModesToReopen.get(markType)) !== null &&
                    _openingModesToReopen !== void 0
                      ? _openingModesToReopen
                      : "markdown";
                  markOpeningModes.set(markType, openingMode);
                  return this.getMarkOpening(markType, mark2, openingMode);
                },
              );
        result.push(beforeMarkdown + nodeContent + afterMarkdown);
      }
    });
    return result.join(separator);
  }
  /**
   * Get the opening markdown syntax for a mark type.
   */
  getMarkOpening(markType, mark2, openingMode = "markdown") {
    if (openingMode === "html") {
      var _this$getHtmlReopenTa;
      return (
        ((_this$getHtmlReopenTa = this.getHtmlReopenTags(markType)) === null ||
        _this$getHtmlReopenTa === void 0
          ? void 0
          : _this$getHtmlReopenTa.open) || ""
      );
    }
    const handlers2 = this.getHandlersForNodeType(markType);
    const handler = handlers2.length > 0 ? handlers2[0] : void 0;
    if (!handler || !handler.renderMarkdown) return "";
    const placeholder = "__TIPTAP_MARKDOWN_PLACEHOLDER__";
    const syntheticNode = {
      type: markType,
      attrs: mark2.attrs || {},
      content: [
        {
          type: "text",
          text: placeholder,
        },
      ],
    };
    try {
      const rendered = handler.renderMarkdown(
        syntheticNode,
        {
          renderChildren: () => placeholder,
          renderChild: () => placeholder,
          indent: (content2) => content2,
          wrapInBlock: (prefix, content2) => prefix + content2,
        },
        {
          index: 0,
          level: 0,
          parentType: "text",
          meta: {},
        },
      );
      const placeholderIndex = rendered.indexOf(placeholder);
      return placeholderIndex >= 0
        ? rendered.substring(0, placeholderIndex)
        : "";
    } catch (err) {
      throw new Error(`Failed to get mark opening for ${markType}: ${err}`);
    }
  }
  /**
   * Get the closing markdown syntax for a mark type.
   */
  getMarkClosing(markType, mark2, openingMode = "markdown") {
    if (openingMode === "html") {
      var _this$getHtmlReopenTa2;
      return (
        ((_this$getHtmlReopenTa2 = this.getHtmlReopenTags(markType)) === null ||
        _this$getHtmlReopenTa2 === void 0
          ? void 0
          : _this$getHtmlReopenTa2.close) || ""
      );
    }
    const handlers2 = this.getHandlersForNodeType(markType);
    const handler = handlers2.length > 0 ? handlers2[0] : void 0;
    if (!handler || !handler.renderMarkdown) return "";
    const placeholder = "__TIPTAP_MARKDOWN_PLACEHOLDER__";
    const syntheticNode = {
      type: markType,
      attrs: mark2.attrs || {},
      content: [
        {
          type: "text",
          text: placeholder,
        },
      ],
    };
    try {
      const rendered = handler.renderMarkdown(
        syntheticNode,
        {
          renderChildren: () => placeholder,
          renderChild: () => placeholder,
          indent: (content2) => content2,
          wrapInBlock: (prefix, content2) => prefix + content2,
        },
        {
          index: 0,
          level: 0,
          parentType: "text",
          meta: {},
        },
      );
      const placeholderIndex = rendered.indexOf(placeholder);
      const placeholderEnd = placeholderIndex + 33;
      return placeholderIndex >= 0 ? rendered.substring(placeholderEnd) : "";
    } catch (err) {
      throw new Error(`Failed to get mark closing for ${markType}: ${err}`);
    }
  }
  /**
   * Returns the inline HTML tags an extension exposes for overlap-boundary
   * reopen handling, if that mark explicitly opted into HTML reopen mode.
   */
  getHtmlReopenTags(markType) {
    const handlers2 = this.getHandlersForNodeType(markType);
    const handler = handlers2.length > 0 ? handlers2[0] : void 0;
    return handler === null || handler === void 0 ? void 0 : handler.htmlReopen;
  }
  /**
   * Check if two mark sets are equal (same types and matching attributes).
   */
  markSetsEqual(marks1, marks2) {
    if (marks1.size !== marks2.size) return false;
    return Array.from(marks1.entries()).every(([type2, mark2]) => {
      const otherMark = marks2.get(type2);
      return otherMark && attrsEqual(mark2.attrs, otherMark.attrs);
    });
  }
  /**
   * Decide the order in which marks open on the current text node.
   *
   * The returned array is iterated head-first when prepending opening
   * delimiters, so the first entry becomes the innermost mark in the emitted
   * markdown and the last becomes the outermost. Two stable signals drive
   * the order — neither one inspects any rendered markdown:
   *
   *   1. Marks that end on this node must be inner relative to marks that
   *      continue into the next node, otherwise the delimiters interleave
   *      instead of nesting.
   *   2. Within each lifetime group, marks are sorted so that lower
   *      registration ranks (i.e. higher Tiptap extension priorities) end up
   *      outermost. ProseMirror assigns mark ranks in the same priority-aware
   *      order Tiptap uses when building the schema, so link (priority 1000)
   *      naturally wraps bold/italic without the serializer needing to peek
   *      at how any particular mark renders.
   */
  getMarksToOpenForSerialization(activeMarks, currentMarks, nextNode) {
    const marksToOpen = findMarksToOpen(activeMarks, currentMarks);
    if (marksToOpen.length <= 1) return marksToOpen;
    const nextMarks =
      (nextNode === null || nextNode === void 0 ? void 0 : nextNode.marks) ||
      [];
    const continuesInNextNode = (markType, attrs) =>
      nextMarks.some(
        (m3) => m3.type === markType && attrsEqual(m3.attrs, attrs),
      );
    const byRankInnerFirst = (a2, b3) => {
      var _this$extensionRanks$, _this$extensionRanks$2;
      const rankA =
        (_this$extensionRanks$ = this.extensionRanks.get(a2.type)) !== null &&
        _this$extensionRanks$ !== void 0
          ? _this$extensionRanks$
          : Number.MAX_SAFE_INTEGER;
      const rankB =
        (_this$extensionRanks$2 = this.extensionRanks.get(b3.type)) !== null &&
        _this$extensionRanks$2 !== void 0
          ? _this$extensionRanks$2
          : Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankB - rankA;
      return a2.type.localeCompare(b3.type);
    };
    const endingHere = marksToOpen
      .filter((mark2) => !continuesInNextNode(mark2.type, mark2.mark.attrs))
      .sort(byRankInnerFirst);
    const continuing = marksToOpen
      .filter((mark2) => continuesInNextNode(mark2.type, mark2.mark.attrs))
      .sort(byRankInnerFirst);
    return [...endingHere, ...continuing];
  }
};
