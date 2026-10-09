// insert-newline-continue-markup-command.js
import { EditorSelection, countColumn, LanguageSupport, dontComplete, jsxSublanguage, typescriptKeywords, keywords, completeFromList, android, elementName$1, findOpenTag, completeCloseTag, completeTag, completeAttrName, completeAttrValue, completeStartTag, eventAttributes, elementName, selfClosers, isHeading, isList, data, foldService, findSectionEnd, GFM, Subscript, Superscript, Emoji, LanguageDescription, getContext, renumberList, blankLine$1, normalizeIndent, nonTightList } from "../vendor.js";
import { Schema3 } from "../m15/line2.js";
import { NodeProp } from "@lezer/common";
import { configureNesting, ifNotIn, parser$2, parser$3 } from "./base-theme.js";
import { EditorView2 } from "./editor-view2.js";
import {
  css,
  cssLanguage,
  javascriptLanguage,
  localCompletionSource,
  snippets,
  typescriptSnippets,
} from "./javascript-language.js";
import {
  LRLanguage,
  Language,
  ParseContext2,
  bracketMatchingHandle,
  foldNodeProp,
  indentNodeProp,
  languageDataProp,
  sublanguageProp,
  syntaxTree,
} from "./tree-node.js";
const typescriptLanguage = javascriptLanguage.configure(
  {
    dialect: "ts",
  },
  "typescript",
);
const jsxLanguage = javascriptLanguage.configure({
  dialect: "jsx",
  props: [sublanguageProp.add((n2) => (n2.isTop ? [jsxSublanguage] : void 0))],
});
const tsxLanguage = javascriptLanguage.configure(
  {
    dialect: "jsx ts",
    props: [sublanguageProp.add((n2) => (n2.isTop ? [jsxSublanguage] : void 0))],
  },
  "typescript",
);
function javascript(config2 = {}) {
  let lang = config2.jsx
    ? config2.typescript
      ? tsxLanguage
      : jsxLanguage
    : config2.typescript
      ? typescriptLanguage
      : javascriptLanguage;
  let completions = config2.typescript
    ? typescriptSnippets.concat(typescriptKeywords)
    : snippets.concat(keywords);
  return new LanguageSupport(lang, [
    javascriptLanguage.data.of({
      autocomplete: ifNotIn(dontComplete, completeFromList(completions)),
    }),
    javascriptLanguage.data.of({
      autocomplete: localCompletionSource,
    }),
    config2.jsx ? autoCloseTags$1 : [],
  ]);
}
const autoCloseTags$1 = EditorView2.inputHandler.of((view2, from2, to, text2, defaultInsert) => {
  if (
    (android ? view2.composing : view2.compositionStarted) ||
    view2.state.readOnly ||
    from2 != to ||
    (text2 != ">" && text2 != "/") ||
    !javascriptLanguage.isActiveAt(view2.state, from2, -1)
  )
    return false;
  let base2 = defaultInsert(),
    { state: state2 } = base2;
  let closeTags = state2.changeByRange((range2) => {
    var _a2;
    let { head: head2 } = range2,
      around = syntaxTree(state2).resolveInner(head2 - 1, -1),
      name2;
    if (around.name == "JSXStartTag") around = around.parent;
    if (
      state2.doc.sliceString(head2 - 1, head2) != text2 ||
      (around.name == "JSXAttributeValue" && around.to > head2)
    );
    else if (text2 == ">" && around.name == "JSXFragmentTag") {
      return {
        range: range2,
        changes: {
          from: head2,
          insert: `</>`,
        },
      };
    } else if (text2 == "/" && around.name == "JSXStartCloseTag") {
      let empty2 = around.parent,
        base3 = empty2.parent;
      if (
        base3 &&
        empty2.from == head2 - 2 &&
        ((name2 = elementName$1(state2.doc, base3.firstChild, head2)) ||
          ((_a2 = base3.firstChild) === null || _a2 === void 0 ? void 0 : _a2.name) ==
            "JSXFragmentTag")
      ) {
        let insert2 = `${name2}>`;
        return {
          range: EditorSelection.cursor(head2 + insert2.length, -1),
          changes: {
            from: head2,
            insert: insert2,
          },
        };
      }
    } else if (text2 == ">") {
      let openTag = findOpenTag(around);
      if (
        openTag &&
        openTag.name == "JSXOpenTag" &&
        !/^\/?>|^<\//.test(state2.doc.sliceString(head2, head2 + 2)) &&
        (name2 = elementName$1(state2.doc, openTag, head2))
      )
        return {
          range: range2,
          changes: {
            from: head2,
            insert: `</${name2}>`,
          },
        };
    }
    return {
      range: range2,
    };
  });
  if (closeTags.changes.empty) return false;
  view2.dispatch([
    base2,
    state2.update(closeTags, {
      userEvent: "input.complete",
      scrollIntoView: true,
    }),
  ]);
  return true;
});
function htmlCompletionFor(schema2, context) {
  let { state: state2, pos } = context,
    tree = syntaxTree(state2).resolveInner(pos, -1),
    around = tree.resolve(pos);
  for (let scan = pos, before; around == tree && (before = tree.childBefore(scan));) {
    let last2 = before.lastChild;
    if (!last2 || !last2.type.isError || last2.from < last2.to) break;
    around = tree = before;
    scan = last2.from;
  }
  if (tree.name == "TagName") {
    return tree.parent && /CloseTag$/.test(tree.parent.name)
      ? completeCloseTag(state2, tree, tree.from, pos)
      : completeTag(state2, schema2, tree, tree.from, pos);
  } else if (tree.name == "StartTag" || tree.name == "IncompleteTag") {
    return completeTag(state2, schema2, tree, pos, pos);
  } else if (tree.name == "StartCloseTag" || tree.name == "IncompleteCloseTag") {
    return completeCloseTag(state2, tree, pos, pos);
  } else if (
    tree.name == "OpenTag" ||
    tree.name == "SelfClosingTag" ||
    tree.name == "AttributeName"
  ) {
    return completeAttrName(
      state2,
      schema2,
      tree,
      tree.name == "AttributeName" ? tree.from : pos,
      pos,
    );
  } else if (
    tree.name == "Is" ||
    tree.name == "AttributeValue" ||
    tree.name == "UnquotedAttributeValue"
  ) {
    return completeAttrValue(state2, schema2, tree, tree.name == "Is" ? pos : tree.from, pos);
  } else if (
    context.explicit &&
    (around.name == "Element" || around.name == "Text" || around.name == "Document")
  ) {
    return completeStartTag(state2, schema2, tree, pos);
  } else {
    return null;
  }
}
export function htmlCompletionSource(context) {
  return htmlCompletionFor(Schema3.default, context);
}
function htmlCompletionSourceWith(config2) {
  let { extraTags, extraGlobalAttributes: extraAttrs } = config2;
  let schema2 = extraAttrs || extraTags ? new Schema3(extraTags, extraAttrs) : Schema3.default;
  return (context) => htmlCompletionFor(schema2, context);
}
const jsonParser = javascriptLanguage.parser.configure({
  top: "SingleExpression",
});
const defaultNesting = [
  {
    tag: "script",
    attrs: (attrs) => attrs.type == "text/typescript" || attrs.lang == "ts",
    parser: typescriptLanguage.parser,
  },
  {
    tag: "script",
    attrs: (attrs) => attrs.type == "text/babel" || attrs.type == "text/jsx",
    parser: jsxLanguage.parser,
  },
  {
    tag: "script",
    attrs: (attrs) => attrs.type == "text/typescript-jsx",
    parser: tsxLanguage.parser,
  },
  {
    tag: "script",
    attrs(attrs) {
      return /^(importmap|speculationrules|application\/(.+\+)?json)$/i.test(attrs.type);
    },
    parser: jsonParser,
  },
  {
    tag: "script",
    attrs(attrs) {
      return (
        !attrs.type ||
        /^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^module$|^$/i.test(attrs.type)
      );
    },
    parser: javascriptLanguage.parser,
  },
  {
    tag: "style",
    attrs(attrs) {
      return (
        (!attrs.lang || attrs.lang == "css") &&
        (!attrs.type || /^(text\/)?(x-)?(stylesheet|css)$/i.test(attrs.type))
      );
    },
    parser: cssLanguage.parser,
  },
];
const defaultAttrs = [
  {
    name: "style",
    parser: cssLanguage.parser.configure({
      top: "Styles",
    }),
  },
].concat(
  eventAttributes.map((name2) => ({
    name: name2,
    parser: javascriptLanguage.parser,
  })),
);
const htmlPlain = LRLanguage.define({
  name: "html",
  parser: parser$2.configure({
    props: [
      indentNodeProp.add({
        Element(context) {
          let after = /^(\s*)(<\/)?/.exec(context.textAfter);
          if (context.node.to <= context.pos + after[0].length) return context.continue();
          return context.lineIndent(context.node.from) + (after[2] ? 0 : context.unit);
        },
        "OpenTag CloseTag SelfClosingTag"(context) {
          return context.column(context.node.from) + context.unit;
        },
        Document(context) {
          if (context.pos + /\s*/.exec(context.textAfter)[0].length < context.node.to)
            return context.continue();
          let endElt = null,
            close2;
          for (let cur = context.node; ;) {
            let last2 = cur.lastChild;
            if (!last2 || last2.name != "Element" || last2.to != cur.to) break;
            endElt = cur = last2;
          }
          if (
            endElt &&
            !(
              (close2 = endElt.lastChild) &&
              (close2.name == "CloseTag" || close2.name == "SelfClosingTag")
            )
          )
            return context.lineIndent(endElt.from) + context.unit;
          return null;
        },
      }),
      foldNodeProp.add({
        Element(node2) {
          let first2 = node2.firstChild,
            last2 = node2.lastChild;
          if (!first2 || first2.name != "OpenTag") return null;
          return {
            from: first2.to,
            to: last2.name == "CloseTag" ? last2.from : node2.to,
          };
        },
      }),
      bracketMatchingHandle.add({
        "OpenTag CloseTag": (node2) => node2.getChild("TagName"),
      }),
    ],
  }),
  languageData: {
    commentTokens: {
      block: {
        open: "<!--",
        close: "-->",
      },
    },
    indentOnInput: /^\s*<\/\w+\W$/,
    wordChars: "-_",
  },
});
const htmlLanguage = htmlPlain.configure({
  wrap: configureNesting(defaultNesting, defaultAttrs),
});
export function html$2(config2 = {}) {
  let dialect = "",
    wrap2;
  if (config2.matchClosingTags === false) dialect = "noMatch";
  if (config2.selfClosingTags === true) dialect = (dialect ? dialect + " " : "") + "selfClosing";
  if (
    (config2.nestedLanguages && config2.nestedLanguages.length) ||
    (config2.nestedAttributes && config2.nestedAttributes.length)
  )
    wrap2 = configureNesting(
      (config2.nestedLanguages || []).concat(defaultNesting),
      (config2.nestedAttributes || []).concat(defaultAttrs),
    );
  let lang = wrap2
    ? htmlPlain.configure({
        wrap: wrap2,
        dialect,
      })
    : dialect
      ? htmlLanguage.configure({
          dialect,
        })
      : htmlLanguage;
  return new LanguageSupport(lang, [
    htmlLanguage.data.of({
      autocomplete: htmlCompletionSourceWith(config2),
    }),
    config2.autoCloseTags !== false ? autoCloseTags : [],
    javascript().support,
    css().support,
  ]);
}
const autoCloseTags = EditorView2.inputHandler.of((view2, from2, to, text2, insertTransaction) => {
  if (
    view2.composing ||
    view2.state.readOnly ||
    from2 != to ||
    (text2 != ">" && text2 != "/") ||
    !htmlLanguage.isActiveAt(view2.state, from2, -1)
  )
    return false;
  let base2 = insertTransaction(),
    { state: state2 } = base2;
  let closeTags = state2.changeByRange((range2) => {
    var _a2, _b, _c;
    let didType = state2.doc.sliceString(range2.from - 1, range2.to) == text2;
    let { head: head2 } = range2,
      after = syntaxTree(state2).resolveInner(head2, -1),
      name2;
    if (didType && text2 == ">" && after.name == "EndTag") {
      let tag = after.parent;
      if (
        ((_b = (_a2 = tag.parent) === null || _a2 === void 0 ? void 0 : _a2.lastChild) === null ||
        _b === void 0
          ? void 0
          : _b.name) != "CloseTag" &&
        (name2 = elementName(state2.doc, tag.parent, head2)) &&
        !selfClosers.has(name2)
      ) {
        let to2 = head2 + (state2.doc.sliceString(head2, head2 + 1) === ">" ? 1 : 0);
        let insert2 = `</${name2}>`;
        return {
          range: range2,
          changes: {
            from: head2,
            to: to2,
            insert: insert2,
          },
        };
      }
    } else if (didType && text2 == "/" && after.name == "IncompleteCloseTag") {
      let tag = after.parent;
      if (
        after.from == head2 - 2 &&
        ((_c = tag.lastChild) === null || _c === void 0 ? void 0 : _c.name) != "CloseTag" &&
        (name2 = elementName(state2.doc, tag, head2)) &&
        !selfClosers.has(name2)
      ) {
        let to2 = head2 + (state2.doc.sliceString(head2, head2 + 1) === ">" ? 1 : 0);
        let insert2 = `${name2}>`;
        return {
          range: EditorSelection.cursor(head2 + insert2.length, -1),
          changes: {
            from: head2,
            to: to2,
            insert: insert2,
          },
        };
      }
    }
    return {
      range: range2,
    };
  });
  if (closeTags.changes.empty) return false;
  view2.dispatch([
    base2,
    state2.update(closeTags, {
      userEvent: "input.complete",
      scrollIntoView: true,
    }),
  ]);
  return true;
});
const headingProp = new NodeProp();
const commonmark = parser$3.configure({
  props: [
    foldNodeProp.add((type2) => {
      return !type2.is("Block") || type2.is("Document") || isHeading(type2) != null || isList(type2)
        ? void 0
        : (tree, state2) => ({
            from: state2.doc.lineAt(tree.from).to,
            to: tree.to,
          });
    }),
    headingProp.add(isHeading),
    indentNodeProp.add({
      Document: () => null,
    }),
    languageDataProp.add({
      Document: data,
    }),
  ],
});
export const headerIndent = foldService.of((state2, start2, end2) => {
  for (let node2 = syntaxTree(state2).resolveInner(end2, -1); node2; node2 = node2.parent) {
    if (node2.from < start2) break;
    let heading2 = node2.type.prop(headingProp);
    if (heading2 == null) continue;
    let upto = findSectionEnd(node2, heading2);
    if (upto > end2)
      return {
        from: end2,
        to: upto,
      };
  }
  return null;
});
export function mkLang(parser2) {
  return new Language(data, parser2, [], "markdown");
}
export const commonmarkLanguage = mkLang(commonmark);
const extended = commonmark.configure([
  GFM,
  Subscript,
  Superscript,
  Emoji,
  {
    props: [
      foldNodeProp.add({
        Table: (tree, state2) => ({
          from: state2.doc.lineAt(tree.from).to,
          to: tree.to,
        }),
      }),
    ],
  },
]);
export const markdownLanguage = mkLang(extended);
export function getCodeParser(languages, defaultLanguage) {
  return (info2) => {
    if (info2 && languages) {
      let found2 = null;
      info2 = /\S*/.exec(info2)[0];
      if (typeof languages == "function") found2 = languages(info2);
      else found2 = LanguageDescription.matchLanguageName(languages, info2, true);
      if (found2 instanceof LanguageDescription)
        return found2.support
          ? found2.support.language.parser
          : ParseContext2.getSkippingParser(found2.load());
      else if (found2) return found2.parser;
    }
    return defaultLanguage ? defaultLanguage.parser : null;
  };
}
export const insertNewlineContinueMarkupCommand =
  (config2 = {}) =>
  ({ state: state2, dispatch: dispatch2 }) => {
    let tree = syntaxTree(state2),
      { doc: doc2 } = state2;
    let dont = null,
      changes = state2.changeByRange((range2) => {
        if (
          !range2.empty ||
          (!markdownLanguage.isActiveAt(state2, range2.from, -1) &&
            !markdownLanguage.isActiveAt(state2, range2.from, 1))
        )
          return (dont = {
            range: range2,
          });
        let pos = range2.from,
          line = doc2.lineAt(pos);
        let context = getContext(tree.resolveInner(pos, -1), doc2);
        while (context.length && context[context.length - 1].from > pos - line.from) context.pop();
        if (!context.length)
          return (dont = {
            range: range2,
          });
        let inner = context[context.length - 1];
        if (inner.to - inner.spaceAfter.length > pos - line.from)
          return (dont = {
            range: range2,
          });
        let emptyLine =
          pos >= inner.to - inner.spaceAfter.length && !/\S/.test(line.text.slice(inner.to));
        if (inner.item && emptyLine) {
          let first2 = inner.node.firstChild,
            second = inner.node.getChild("ListItem", "ListItem");
          if (
            first2.to >= pos ||
            (second && second.to < pos) ||
            (line.from > 0 && !/[^\s>]/.test(doc2.lineAt(line.from - 1).text)) ||
            config2.nonTightLists === false
          ) {
            let next2 = context.length > 1 ? context[context.length - 2] : null;
            let delTo,
              insert3 = "";
            if (next2 && next2.item) {
              delTo = line.from + next2.from;
              insert3 = next2.marker(doc2, 1);
            } else {
              delTo = line.from + (next2 ? next2.to : 0);
            }
            let changes3 = [
              {
                from: delTo,
                to: pos,
                insert: insert3,
              },
            ];
            if (inner.node.name == "OrderedList") renumberList(inner.item, doc2, changes3, -2);
            if (next2 && next2.node.name == "OrderedList") renumberList(next2.item, doc2, changes3);
            return {
              range: EditorSelection.cursor(delTo + insert3.length),
              changes: changes3,
            };
          } else {
            let insert3 = blankLine$1(context, state2, line);
            return {
              range: EditorSelection.cursor(pos + insert3.length + 1),
              changes: {
                from: line.from,
                insert: insert3 + state2.lineBreak,
              },
            };
          }
        }
        if (inner.node.name == "Blockquote" && emptyLine && line.from) {
          let prevLine = doc2.lineAt(line.from - 1),
            quoted = />\s*$/.exec(prevLine.text);
          if (quoted && quoted.index == inner.from) {
            let changes3 = state2.changes([
              {
                from: prevLine.from + quoted.index,
                to: prevLine.to,
              },
              {
                from: line.from + inner.from,
                to: line.to,
              },
            ]);
            return {
              range: range2.map(changes3),
              changes: changes3,
            };
          }
        }
        let changes2 = [];
        if (inner.node.name == "OrderedList") renumberList(inner.item, doc2, changes2);
        let continued = inner.item && inner.item.from < line.from;
        let insert2 = "";
        if (!continued || /^[\s\d.)\-+*>]*/.exec(line.text)[0].length >= inner.to) {
          for (let i2 = 0, e2 = context.length - 1; i2 <= e2; i2++) {
            insert2 +=
              i2 == e2 && !continued
                ? context[i2].marker(doc2, 1)
                : context[i2].blank(
                    i2 < e2
                      ? countColumn(line.text, 4, context[i2 + 1].from) - insert2.length
                      : null,
                  );
          }
        }
        let from2 = pos;
        while (from2 > line.from && /\s/.test(line.text.charAt(from2 - line.from - 1))) from2--;
        insert2 = normalizeIndent(insert2, state2);
        if (nonTightList(inner.node, state2.doc))
          insert2 = blankLine$1(context, state2, line) + state2.lineBreak + insert2;
        changes2.push({
          from: from2,
          to: pos,
          insert: state2.lineBreak + insert2,
        });
        return {
          range: EditorSelection.cursor(from2 + insert2.length + 1),
          changes: changes2,
        };
      });
    if (dont) return false;
    dispatch2(
      state2.update(changes, {
        scrollIntoView: true,
        userEvent: "input",
      }),
    );
    return true;
  };
