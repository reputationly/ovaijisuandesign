// delete-markup-backward.js
import { EditorSelection, ViewPlugin, Prec, Facet, StateEffect, StateField, Decoration2, RangeSetBuilder, countColumn, LanguageSupport, getContext, normalizeIndent, contextNodeForDelete, nonPlainText, combineConfig, validRegExp, StringQuery, regexpCursor, stringCursor, crelt, phrase, AnnounceMargin, Break } from "../../vendor.js";
import { getAnnotationSelectionRanges } from "../../text-editor/annotation-highlight.js";
import { RegExpQuery, SearchState, setSearchQuery, togglePanel, selectedMatchMark, matchMark, ATX_HEADINGS, INLINE_MARKS, collectHeadingMarks, collectLinkChrome, collectInlineMarks, isBlankLine$1 } from "./line2.js";
import { blankLine, blankLineExtra, horizontalRule, hiddenMark } from "../../text-editor/locate-hunks-in-doc.js";
import { EditorState2 } from "./editor-state2.js";
import { TEXT_EDIT_SELECTION_MAX_LENGTH } from "../../text-editor/myers-line-hunks.js";
import { CompletionContext, MarkdownParser, parseCode } from "./base-theme.js";
import { EditorView2 } from "./editor-view2.js";
import {
  commonmarkLanguage,
  getCodeParser,
  headerIndent,
  html$2,
  htmlCompletionSource,
  insertNewlineContinueMarkupCommand,
  markdownLanguage,
  mkLang,
} from "./insert-newline-continue-markup-command.js";
import { getPanel, keymap, runScopeHandlers, showPanel, syntaxTree } from "./tree-node.js";
const insertNewlineContinueMarkup = insertNewlineContinueMarkupCommand();
const deleteMarkupBackward = ({ state: state2, dispatch: dispatch2 }) => {
  let tree = syntaxTree(state2);
  let dont = null,
    changes = state2.changeByRange((range2) => {
      let pos = range2.from,
        { doc: doc2 } = state2;
      if (range2.empty && markdownLanguage.isActiveAt(state2, range2.from)) {
        let line = doc2.lineAt(pos);
        let context = getContext(contextNodeForDelete(tree, pos), doc2);
        if (context.length) {
          let inner = context[context.length - 1];
          let spaceEnd = inner.to - inner.spaceAfter.length + (inner.spaceAfter ? 1 : 0);
          if (pos - line.from > spaceEnd && !/\S/.test(line.text.slice(spaceEnd, pos - line.from)))
            return {
              range: EditorSelection.cursor(line.from + spaceEnd),
              changes: {
                from: line.from + spaceEnd,
                to: pos,
              },
            };
          if (
            pos - line.from == spaceEnd &&
            // Only apply this if we're on the line that has the
            // construct's syntax, or there's only indentation in the
            // target range
            ((inner.item && line.from <= inner.item.from) ||
              /^[\s>]*$/.test(line.text.slice(0, inner.to)))
          ) {
            let start2 = line.from + inner.from;
            if (
              inner.item &&
              inner.node.from < inner.item.from &&
              /\S/.test(line.text.slice(inner.from, inner.to))
            ) {
              let insert2 = inner.blank(
                countColumn(line.text, 4, inner.to) - countColumn(line.text, 4, inner.from),
              );
              if (start2 == line.from) insert2 = normalizeIndent(insert2, state2);
              return {
                range: EditorSelection.cursor(start2 + insert2.length),
                changes: {
                  from: start2,
                  to: line.from + inner.to,
                  insert: insert2,
                },
              };
            }
            if (start2 < pos)
              return {
                range: EditorSelection.cursor(start2),
                changes: {
                  from: start2,
                  to: pos,
                },
              };
          }
        }
      }
      return (dont = {
        range: range2,
      });
    });
  if (dont) return false;
  dispatch2(
    state2.update(changes, {
      scrollIntoView: true,
      userEvent: "delete",
    }),
  );
  return true;
};
const markdownKeymap = [
  {
    key: "Enter",
    run: insertNewlineContinueMarkup,
  },
  {
    key: "Backspace",
    run: deleteMarkupBackward,
  },
];
const htmlNoMatch = html$2({
  matchClosingTags: false,
});
export function markdown(config2 = {}) {
  let {
    codeLanguages,
    defaultCodeLanguage,
    addKeymap = true,
    base: { parser: parser2 } = commonmarkLanguage,
    completeHTMLTags = true,
    pasteURLAsLink: pasteURL = true,
    htmlTagLanguage = htmlNoMatch,
  } = config2;
  if (!(parser2 instanceof MarkdownParser))
    throw new RangeError("Base parser provided to `markdown` should be a Markdown parser");
  let extensions2 = config2.extensions ? [config2.extensions] : [];
  let support = [htmlTagLanguage.support, headerIndent],
    defaultCode;
  if (pasteURL) support.push(pasteURLAsLink);
  if (defaultCodeLanguage instanceof LanguageSupport) {
    support.push(defaultCodeLanguage.support);
    defaultCode = defaultCodeLanguage.language;
  } else if (defaultCodeLanguage) {
    defaultCode = defaultCodeLanguage;
  }
  let codeParser =
    codeLanguages || defaultCode ? getCodeParser(codeLanguages, defaultCode) : void 0;
  extensions2.push(
    parseCode({
      codeParser,
      htmlParser: htmlTagLanguage.language.parser,
    }),
  );
  if (addKeymap) support.push(Prec.high(keymap.of(markdownKeymap)));
  let lang = mkLang(parser2.configure(extensions2));
  if (completeHTMLTags)
    support.push(
      lang.data.of({
        autocomplete: htmlTagCompletion,
      }),
    );
  return new LanguageSupport(lang, support);
}
function htmlTagCompletion(context) {
  let { state: state2, pos } = context,
    m3 = /<[:\-\.\w\u00b7-\uffff]*$/.exec(state2.sliceDoc(pos - 25, pos));
  if (!m3) return null;
  let tree = syntaxTree(state2).resolveInner(pos, -1);
  while (tree && !tree.type.isTop) {
    if (
      tree.name == "CodeBlock" ||
      tree.name == "FencedCode" ||
      tree.name == "ProcessingInstructionBlock" ||
      tree.name == "CommentBlock" ||
      tree.name == "Link" ||
      tree.name == "Image"
    )
      return null;
    tree = tree.parent;
  }
  return {
    from: pos - m3[0].length,
    to: pos,
    options: htmlTagCompletions(),
    validFor: /^<[:\-\.\w\u00b7-\uffff]*$/,
  };
}
let _tagCompletions = null;
function htmlTagCompletions() {
  if (_tagCompletions) return _tagCompletions;
  let result = htmlCompletionSource(
    new CompletionContext(
      EditorState2.create({
        extensions: htmlNoMatch,
      }),
      0,
      true,
    ),
  );
  return (_tagCompletions = result ? result.options : []);
}
const pasteURLAsLink = EditorView2.domEventHandlers({
  paste: (event, view2) => {
    var _a2;
    let { main: main2 } = view2.state.selection;
    if (main2.empty) return false;
    let link2 =
      (_a2 = event.clipboardData) === null || _a2 === void 0 ? void 0 : _a2.getData("text/plain");
    if (!link2 || !/^(https?:\/\/|mailto:|xmpp:|www\.)/.test(link2)) return false;
    if (/^www\./.test(link2)) link2 = "https://" + link2;
    if (!markdownLanguage.isActiveAt(view2.state, main2.from, 1)) return false;
    let tree = syntaxTree(view2.state),
      crossesNode = false;
    tree.iterate({
      from: main2.from,
      to: main2.to,
      enter: (node2) => {
        if (node2.from > main2.from || nonPlainText.test(node2.name)) crossesNode = true;
      },
      leave: (node2) => {
        if (node2.to < main2.to) crossesNode = true;
      },
    });
    if (crossesNode) return false;
    view2.dispatch({
      changes: [
        {
          from: main2.from,
          insert: "[",
        },
        {
          from: main2.to,
          insert: `](${link2})`,
        },
      ],
      userEvent: "input.paste",
      scrollIntoView: true,
    });
    return true;
  },
});
const searchConfigFacet = Facet.define({
  combine(configs) {
    return combineConfig(configs, {
      top: false,
      caseSensitive: false,
      literal: false,
      regexp: false,
      wholeWord: false,
      createPanel: (view2) => new SearchPanel(view2),
      scrollToMatch: (range2) => EditorView2.scrollIntoView(range2),
    });
  },
});
export function search$1(config2) {
  return searchExtensions;
}
export class SearchQuery {
  /**
  Create a query object.
  */
  constructor(config2) {
    this.search = config2.search;
    this.caseSensitive = !!config2.caseSensitive;
    this.literal = !!config2.literal;
    this.regexp = !!config2.regexp;
    this.replace = config2.replace || "";
    this.valid = !!this.search && (!this.regexp || validRegExp(this.search));
    this.unquoted = this.unquote(this.search);
    this.wholeWord = !!config2.wholeWord;
    this.test = config2.test;
  }
  /**
  @internal
  */
  unquote(text2) {
    return this.literal
      ? text2
      : text2.replace(/\\([nrt\\])/g, (_2, ch) =>
          ch == "n" ? "\n" : ch == "r" ? "\r" : ch == "t" ? "	" : "\\",
        );
  }
  /**
  Compare this query to another query.
  */
  eq(other) {
    return (
      this.search == other.search &&
      this.replace == other.replace &&
      this.caseSensitive == other.caseSensitive &&
      this.regexp == other.regexp &&
      this.wholeWord == other.wholeWord &&
      this.test == other.test
    );
  }
  /**
  @internal
  */
  create() {
    return this.regexp ? new RegExpQuery(this) : new StringQuery(this);
  }
  /**
  Get a search cursor for this query, searching through the given
  range in the given state.
  */
  getCursor(state2, from2 = 0, to) {
    let st2 = state2.doc
      ? state2
      : EditorState2.create({
          doc: state2,
        });
    if (to == null) to = st2.doc.length;
    return this.regexp ? regexpCursor(this, st2, from2, to) : stringCursor(this, st2, from2, to);
  }
}
const searchState = StateField.define({
  create(state2) {
    return new SearchState(defaultQuery(state2).create(), null);
  },
  update(value, tr2) {
    for (let effect2 of tr2.effects) {
      if (effect2.is(setSearchQuery)) value = new SearchState(effect2.value.create(), value.panel);
      else if (effect2.is(togglePanel))
        value = new SearchState(value.query, effect2.value ? createSearchPanel : null);
    }
    return value;
  },
  provide: (f2) => showPanel.from(f2, (val) => val.panel),
});
const searchHighlighter = ViewPlugin.fromClass(
  class {
    constructor(view2) {
      this.view = view2;
      this.decorations = this.highlight(view2.state.field(searchState));
    }
    update(update2) {
      let state2 = update2.state.field(searchState);
      if (
        state2 != update2.startState.field(searchState) ||
        update2.docChanged ||
        update2.selectionSet ||
        update2.viewportChanged
      )
        this.decorations = this.highlight(state2);
    }
    highlight({ query, panel }) {
      if (!panel || !query.spec.valid) return Decoration2.none;
      let { view: view2 } = this;
      let builder = new RangeSetBuilder();
      for (let i2 = 0, ranges = view2.visibleRanges, l2 = ranges.length; i2 < l2; i2++) {
        let { from: from2, to } = ranges[i2];
        while (i2 < l2 - 1 && to > ranges[i2 + 1].from - 2 * 250) to = ranges[++i2].to;
        query.highlight(view2.state, from2, to, (from3, to2) => {
          let selected2 = view2.state.selection.ranges.some(
            (r2) => r2.from == from3 && r2.to == to2,
          );
          builder.add(from3, to2, selected2 ? selectedMatchMark : matchMark);
        });
      }
      return builder.finish();
    }
  },
  {
    decorations: (v2) => v2.decorations,
  },
);
function searchCommand(f2) {
  return (view2) => {
    let state2 = view2.state.field(searchState, false);
    return state2 && state2.query.spec.valid ? f2(view2, state2) : openSearchPanel(view2);
  };
}
const findNext = searchCommand((view2, { query }) => {
  let { to } = view2.state.selection.main;
  let next2 = query.nextMatch(view2.state, to, to);
  if (!next2) return false;
  let selection2 = EditorSelection.single(next2.from, next2.to);
  let config2 = view2.state.facet(searchConfigFacet);
  view2.dispatch({
    selection: selection2,
    effects: [announceMatch(view2, next2), config2.scrollToMatch(selection2.main, view2)],
    userEvent: "select.search",
  });
  selectSearchInput(view2);
  return true;
});
const findPrevious = searchCommand((view2, { query }) => {
  let { state: state2 } = view2,
    { from: from2 } = state2.selection.main;
  let prev = query.prevMatch(state2, from2, from2);
  if (!prev) return false;
  let selection2 = EditorSelection.single(prev.from, prev.to);
  let config2 = view2.state.facet(searchConfigFacet);
  view2.dispatch({
    selection: selection2,
    effects: [announceMatch(view2, prev), config2.scrollToMatch(selection2.main, view2)],
    userEvent: "select.search",
  });
  selectSearchInput(view2);
  return true;
});
const selectMatches = searchCommand((view2, { query }) => {
  let ranges = query.matchAll(view2.state, 1e3);
  if (!ranges || !ranges.length) return false;
  view2.dispatch({
    selection: EditorSelection.create(ranges.map((r2) => EditorSelection.range(r2.from, r2.to))),
    userEvent: "select.search.matches",
  });
  return true;
});
const replaceNext = searchCommand((view2, { query }) => {
  let { state: state2 } = view2,
    { from: from2, to } = state2.selection.main;
  if (state2.readOnly) return false;
  let match2 = query.nextMatch(state2, from2, from2);
  if (!match2) return false;
  let next2 = match2;
  let changes = [],
    selection2,
    replacement;
  let effects = [];
  if (!next2.precise) {
    next2 = query.nextMatch(state2, next2.from, next2.to);
  } else if (next2.from == from2 && next2.to == to) {
    replacement = state2.toText(query.getReplacement(next2));
    changes.push({
      from: next2.from,
      to: next2.to,
      insert: replacement,
    });
    next2 = query.nextMatch(state2, next2.from, next2.to);
    effects.push(
      EditorView2.announce.of(
        state2.phrase("replaced match on line $", state2.doc.lineAt(from2).number) + ".",
      ),
    );
  }
  let changeSet = view2.state.changes(changes);
  if (next2) {
    selection2 = EditorSelection.single(next2.from, next2.to).map(changeSet);
    effects.push(announceMatch(view2, next2));
    effects.push(state2.facet(searchConfigFacet).scrollToMatch(selection2.main, view2));
  }
  view2.dispatch({
    changes: changeSet,
    selection: selection2,
    effects,
    userEvent: "input.replace",
  });
  return true;
});
export const replaceAll = searchCommand((view2, { query }) => {
  if (view2.state.readOnly) return false;
  let changes = [];
  for (let match2 of query.matchAll(view2.state, 1e9)) {
    let { from: from2, to, precise } = match2;
    if (precise)
      changes.push({
        from: from2,
        to,
        insert: query.getReplacement(match2),
      });
  }
  if (!changes.length) return false;
  let announceText = view2.state.phrase("replaced $ matches", changes.length) + ".";
  view2.dispatch({
    changes,
    effects: EditorView2.announce.of(announceText),
    userEvent: "input.replace.all",
  });
  return true;
});
function createSearchPanel(view2) {
  return view2.state.facet(searchConfigFacet).createPanel(view2);
}
function defaultQuery(state2, fallback) {
  var _a2, _b, _c, _d, _e2;
  let sel = state2.selection.main;
  let selText = sel.empty || sel.to > sel.from + 100 ? "" : state2.sliceDoc(sel.from, sel.to);
  if (fallback && !selText) return fallback;
  let config2 = state2.facet(searchConfigFacet);
  return new SearchQuery({
    search: (
      (_a2 = fallback === null || fallback === void 0 ? void 0 : fallback.literal) !== null &&
      _a2 !== void 0
        ? _a2
        : config2.literal
    )
      ? selText
      : selText.replace(/\n/g, "\\n"),
    caseSensitive:
      (_b = fallback === null || fallback === void 0 ? void 0 : fallback.caseSensitive) !== null &&
      _b !== void 0
        ? _b
        : config2.caseSensitive,
    literal:
      (_c = fallback === null || fallback === void 0 ? void 0 : fallback.literal) !== null &&
      _c !== void 0
        ? _c
        : config2.literal,
    regexp:
      (_d = fallback === null || fallback === void 0 ? void 0 : fallback.regexp) !== null &&
      _d !== void 0
        ? _d
        : config2.regexp,
    wholeWord:
      (_e2 = fallback === null || fallback === void 0 ? void 0 : fallback.wholeWord) !== null &&
      _e2 !== void 0
        ? _e2
        : config2.wholeWord,
  });
}
function getSearchInput(view2) {
  let panel = getPanel(view2, createSearchPanel);
  return panel && panel.dom.querySelector("[main-field]");
}
function selectSearchInput(view2) {
  let input = getSearchInput(view2);
  if (input && input == view2.root.activeElement) input.select();
}
const openSearchPanel = (view2) => {
  let state2 = view2.state.field(searchState, false);
  if (state2 && state2.panel) {
    let searchInput = getSearchInput(view2);
    if (searchInput && searchInput != view2.root.activeElement) {
      let query = defaultQuery(view2.state, state2.query.spec);
      if (query.valid)
        view2.dispatch({
          effects: setSearchQuery.of(query),
        });
      searchInput.focus();
      searchInput.select();
    }
  } else {
    view2.dispatch({
      effects: [
        togglePanel.of(true),
        state2
          ? setSearchQuery.of(defaultQuery(view2.state, state2.query.spec))
          : StateEffect.appendConfig.of(searchExtensions),
      ],
    });
  }
  return true;
};
const closeSearchPanel = (view2) => {
  let state2 = view2.state.field(searchState, false);
  if (!state2 || !state2.panel) return false;
  let panel = getPanel(view2, createSearchPanel);
  if (panel && panel.dom.contains(view2.root.activeElement)) view2.focus();
  view2.dispatch({
    effects: togglePanel.of(false),
  });
  return true;
};
class SearchPanel {
  constructor(view2) {
    this.view = view2;
    let query = (this.query = view2.state.field(searchState).query.spec);
    this.commit = this.commit.bind(this);
    this.searchField = crelt("input", {
      value: query.search,
      placeholder: phrase(view2, "Find"),
      "aria-label": phrase(view2, "Find"),
      class: "cm-textfield",
      name: "search",
      form: "",
      "main-field": "true",
      onchange: this.commit,
      onkeyup: this.commit,
    });
    this.replaceField = crelt("input", {
      value: query.replace,
      placeholder: phrase(view2, "Replace"),
      "aria-label": phrase(view2, "Replace"),
      class: "cm-textfield",
      name: "replace",
      form: "",
      onchange: this.commit,
      onkeyup: this.commit,
    });
    this.caseField = crelt("input", {
      type: "checkbox",
      name: "case",
      form: "",
      checked: query.caseSensitive,
      onchange: this.commit,
    });
    this.reField = crelt("input", {
      type: "checkbox",
      name: "re",
      form: "",
      checked: query.regexp,
      onchange: this.commit,
    });
    this.wordField = crelt("input", {
      type: "checkbox",
      name: "word",
      form: "",
      checked: query.wholeWord,
      onchange: this.commit,
    });
    function button(name2, onclick, content2) {
      return crelt(
        "button",
        {
          class: "cm-button",
          name: name2,
          onclick,
          type: "button",
        },
        content2,
      );
    }
    this.dom = crelt(
      "div",
      {
        onkeydown: (e2) => this.keydown(e2),
        class: "cm-search",
      },
      [
        this.searchField,
        button("next", () => findNext(view2), [phrase(view2, "next")]),
        button("prev", () => findPrevious(view2), [phrase(view2, "previous")]),
        button("select", () => selectMatches(view2), [phrase(view2, "all")]),
        crelt("label", null, [this.caseField, phrase(view2, "match case")]),
        crelt("label", null, [this.reField, phrase(view2, "regexp")]),
        crelt("label", null, [this.wordField, phrase(view2, "by word")]),
        ...(view2.state.readOnly
          ? []
          : [
              crelt("br"),
              this.replaceField,
              button("replace", () => replaceNext(view2), [phrase(view2, "replace")]),
              button("replaceAll", () => replaceAll(view2), [phrase(view2, "replace all")]),
            ]),
        crelt(
          "button",
          {
            name: "close",
            onclick: () => closeSearchPanel(view2),
            "aria-label": phrase(view2, "close"),
            type: "button",
          },
          ["×"],
        ),
      ],
    );
  }
  commit() {
    let query = new SearchQuery({
      search: this.searchField.value,
      caseSensitive: this.caseField.checked,
      regexp: this.reField.checked,
      wholeWord: this.wordField.checked,
      replace: this.replaceField.value,
    });
    if (!query.eq(this.query)) {
      this.query = query;
      this.view.dispatch({
        effects: setSearchQuery.of(query),
      });
    }
  }
  keydown(e2) {
    if (runScopeHandlers(this.view, e2, "search-panel")) {
      e2.preventDefault();
    } else if (e2.keyCode == 13 && e2.target == this.searchField) {
      e2.preventDefault();
      (e2.shiftKey ? findPrevious : findNext)(this.view);
    } else if (e2.keyCode == 13 && e2.target == this.replaceField) {
      e2.preventDefault();
      replaceNext(this.view);
    }
  }
  update(update2) {
    for (let tr2 of update2.transactions)
      for (let effect2 of tr2.effects) {
        if (effect2.is(setSearchQuery) && !effect2.value.eq(this.query))
          this.setQuery(effect2.value);
      }
  }
  setQuery(query) {
    this.query = query;
    this.searchField.value = query.search;
    this.replaceField.value = query.replace;
    this.caseField.checked = query.caseSensitive;
    this.reField.checked = query.regexp;
    this.wordField.checked = query.wholeWord;
  }
  mount() {
    this.searchField.select();
  }
  get pos() {
    return 80;
  }
  get top() {
    return this.view.state.facet(searchConfigFacet).top;
  }
}
function announceMatch(view2, { from: from2, to }) {
  let line = view2.state.doc.lineAt(from2),
    lineEnd2 = view2.state.doc.lineAt(to).to;
  let start2 = Math.max(line.from, from2 - AnnounceMargin),
    end2 = Math.min(lineEnd2, to + AnnounceMargin);
  let text2 = view2.state.sliceDoc(start2, end2);
  if (start2 != line.from) {
    for (let i2 = 0; i2 < AnnounceMargin; i2++)
      if (!Break.test(text2[i2 + 1]) && Break.test(text2[i2])) {
        text2 = text2.slice(i2);
        break;
      }
  }
  if (end2 != lineEnd2) {
    for (let i2 = text2.length - 1; i2 > text2.length - AnnounceMargin; i2--)
      if (!Break.test(text2[i2 - 1]) && Break.test(text2[i2])) {
        text2 = text2.slice(0, i2);
        break;
      }
  }
  return EditorView2.announce.of(
    `${view2.state.phrase("current match")}. ${text2} ${view2.state.phrase("on line")} ${line.number}.`,
  );
}
const baseTheme = EditorView2.baseTheme({
  ".cm-panel.cm-search": {
    padding: "2px 6px 4px",
    position: "relative",
    "& [name=close]": {
      position: "absolute",
      top: "0",
      right: "4px",
      backgroundColor: "inherit",
      border: "none",
      font: "inherit",
      padding: 0,
      margin: 0,
    },
    "& input, & button, & label": {
      margin: ".2em .6em .2em 0",
    },
    "& input[type=checkbox]": {
      marginRight: ".2em",
    },
    "& label": {
      fontSize: "80%",
      whiteSpace: "pre",
    },
  },
  "&light .cm-searchMatch": {
    backgroundColor: "#ffff0054",
  },
  "&dark .cm-searchMatch": {
    backgroundColor: "#00ffff8a",
  },
  "&light .cm-searchMatch-selected": {
    backgroundColor: "#ff6a0054",
  },
  "&dark .cm-searchMatch-selected": {
    backgroundColor: "#ff00ff8a",
  },
});
const searchExtensions = [searchState, Prec.low(searchHighlighter), baseTheme];
function computeLivePreviewRanges(state2, from2, to) {
  const out = [];
  syntaxTree(state2).iterate({
    from: from2,
    to,
    enter: (ref) => {
      const name2 = ref.name;
      if (name2 === "HorizontalRule") {
        out.push({
          from: ref.from,
          to: ref.to,
          kind: "horizontal-rule",
        });
        return;
      }
      const node2 =
        ATX_HEADINGS.has(name2) || name2 in INLINE_MARKS || name2 === "Link" ? ref.node : null;
      if (!node2) return;
      if (ATX_HEADINGS.has(name2)) collectHeadingMarks(state2, node2, out);
      else if (name2 === "Link") collectLinkChrome(node2, out);
      else collectInlineMarks(node2, INLINE_MARKS[name2] ?? "", out);
    },
  });
  for (let pos = from2; pos <= to;) {
    const line = state2.doc.lineAt(pos);
    if (isBlankLine$1(line.text)) {
      const prevBlank = line.from > 0 && isBlankLine$1(state2.doc.lineAt(line.from - 1).text);
      out.push({
        from: line.from,
        to: line.from,
        kind: prevBlank ? "blank-line-extra" : "blank-line",
      });
    }
    pos = line.to + 1;
  }
  return out;
}
function buildDecorations$2(view2) {
  const decorations2 = [];
  const atoms = [];
  for (const { from: from2, to } of view2.visibleRanges) {
    for (const range2 of computeLivePreviewRanges(view2.state, from2, to)) {
      if (range2.kind === "blank-line" || range2.kind === "blank-line-extra") {
        decorations2.push(
          (range2.kind === "blank-line" ? blankLine : blankLineExtra).range(range2.from),
        );
        continue;
      }
      if (range2.to <= range2.from) continue;
      const deco = range2.kind === "horizontal-rule" ? horizontalRule : hiddenMark;
      decorations2.push(deco.range(range2.from, range2.to));
      atoms.push(deco.range(range2.from, range2.to));
    }
  }
  return {
    decorations: Decoration2.set(decorations2, true),
    atoms: Decoration2.set(atoms, true),
  };
}
const livePreviewTheme = EditorView2.baseTheme({
  ".cm-md-hr": {
    display: "inline-block",
    width: "100%",
    height: "0",
    verticalAlign: "middle",
    borderTop: "1px solid var(--border-muted, #e5e7eb)",
  },
  // Absolute line-heights override the editor's relative one so these lines
  // shrink for real; font-size shrinks the caret with them.
  ".cm-line.cm-md-blank": {
    fontSize: "0.375rem",
    lineHeight: "0.375rem",
  },
  ".cm-line.cm-md-blank-extra": {
    fontSize: "0.125rem",
    lineHeight: "0.125rem",
  },
});
export function markdownLivePreview() {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations;
      atoms;
      constructor(view2) {
        ({ decorations: this.decorations, atoms: this.atoms } = buildDecorations$2(view2));
      }
      update(update2) {
        if (
          update2.docChanged ||
          update2.viewportChanged ||
          // The Markdown parse advances asynchronously on large documents.
          syntaxTree(update2.state) !== syntaxTree(update2.startState)
        ) {
          ({ decorations: this.decorations, atoms: this.atoms } = buildDecorations$2(update2.view));
        }
      }
    },
    {
      decorations: (value) => value.decorations,
      provide: (plugin2) =>
        EditorView2.atomicRanges.of((view2) => view2.plugin(plugin2)?.atoms ?? Decoration2.none),
    },
  );
  return [plugin, livePreviewTheme];
}
const SELECTION_ANCHOR_CONTEXT_LENGTH = 32;
const SELECTION_ANCHOR_MAX_LENGTH = TEXT_EDIT_SELECTION_MAX_LENGTH;
const EMPTY_SELECTION_STATE = {
  anchor: null,
};
export function buildPmSelectionState(state2) {
  const ranges = getAnnotationSelectionRanges(state2.selection);
  if (ranges.length === 0) return EMPTY_SELECTION_STATE;
  const anchors2 = [];
  let totalLength = 0;
  for (const { from: from2, to } of ranges) {
    const exact = state2.doc.textBetween(from2, to, " ", " ");
    if (!exact.trim()) continue;
    totalLength += exact.length;
    anchors2.push({
      exact,
      prefix: state2.doc.textBetween(
        Math.max(0, from2 - SELECTION_ANCHOR_CONTEXT_LENGTH),
        from2,
        " ",
        " ",
      ),
      suffix: state2.doc.textBetween(
        to,
        Math.min(state2.doc.content.size, to + SELECTION_ANCHOR_CONTEXT_LENGTH),
        " ",
        " ",
      ),
    });
  }
  if (anchors2.length === 0) return EMPTY_SELECTION_STATE;
  if (totalLength > SELECTION_ANCHOR_MAX_LENGTH) {
    return {
      anchor: null,
      oversizedLength: totalLength,
    };
  }
  return {
    anchor: anchors2[0],
    anchors: anchors2,
  };
}
function buildSourceSelectionState(length2, selectionStart, selectionEnd, slice2) {
  if (selectionStart == null || selectionEnd == null) return EMPTY_SELECTION_STATE;
  const from2 = Math.min(selectionStart, selectionEnd);
  const to = Math.max(selectionStart, selectionEnd);
  if (from2 >= to) return EMPTY_SELECTION_STATE;
  if (to - from2 > SELECTION_ANCHOR_MAX_LENGTH) {
    return {
      anchor: null,
      oversizedLength: to - from2,
    };
  }
  const exact = slice2(from2, to);
  if (!exact.trim()) return EMPTY_SELECTION_STATE;
  return {
    anchor: {
      exact,
      prefix: slice2(Math.max(0, from2 - SELECTION_ANCHOR_CONTEXT_LENGTH), from2),
      suffix: slice2(to, Math.min(length2, to + SELECTION_ANCHOR_CONTEXT_LENGTH)),
    },
  };
}
export function buildTextareaSelectionState(value, selectionStart, selectionEnd) {
  return buildSourceSelectionState(value.length, selectionStart, selectionEnd, (from2, to) =>
    value.slice(from2, to),
  );
}
export function buildCodeMirrorSelectionState(state2) {
  const { from: from2, to } = state2.selection.main;
  return buildSourceSelectionState(state2.doc.length, from2, to, (start2, end2) =>
    state2.sliceDoc(start2, end2),
  );
}
export function buildCodeMirrorSelectionAnchor(state2) {
  return buildCodeMirrorSelectionState(state2).anchor;
}
