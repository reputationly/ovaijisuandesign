// 这份错误边界带 resetKeys，和已装的 react-error-boundary 不是同一份。
import { __jsx } from "../shared/jsx-runtime.js";
import jsxRuntimeExports from "react/jsx-runtime";
import { ErrorBoundary as C$5 } from "react-error-boundary";
import reactExports from "react";

// 下面两个是产物里紧挨着的一组：`_\$4` 是「永远匹配不上」的占位正则，
// `k\$5` 是把模板正则编译成真实正则的编辑器（marked 的 edit 助手）。
// 还原时这一组整块丢了，只剩引用 —— 构建不报错（rollup 当成外部全局量），运行时才炸。
var _$4 = { exec: () => null };
function k$5(u4, e2 = "") {
  let t2 = typeof u4 == "string" ? u4 : u4.source, n2 = { replace: (r2, i2) => {
    let s2 = typeof i2 == "string" ? i2 : i2.source;
    return s2 = s2.replace(m$4.caret, "$1"), t2 = t2.replace(r2, s2), n2;
  }, getRegex: () => new RegExp(t2, e2) };
  return n2;
}

const h$4 = reactExports.createContext(null),
  c$3 = {
    didCatch: false,
    error: null
  };
var be$2 = (() => {
    try {
      return !!new RegExp("(?<=1)(?<!1)");
    } catch {
      return false;
    }
  })(),
  m$4 = {
    codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
    outputLinkReplace: /\\([\[\]])/g,
    indentCodeCompensation: /^(\s+)(?:```)/,
    beginningSpace: /^\s+/,
    endingHash: /#$/,
    startingSpaceChar: /^ /,
    endingSpaceChar: / $/,
    nonSpaceChar: /[^ ]/,
    newLineCharGlobal: /\n/g,
    tabCharGlobal: /\t/g,
    multipleSpaceGlobal: /\s+/g,
    blankLine: /^[ \t]*$/,
    doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
    blockquoteStart: /^ {0,3}>/,
    blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
    blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
    listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
    listIsTask: /^\[[ xX]\] +\S/,
    listReplaceTask: /^\[[ xX]\] +/,
    listTaskCheckbox: /\[[ xX]\]/,
    anyLine: /\n.*\n/,
    hrefBrackets: /^<(.*)>$/,
    tableDelimiter: /[:|]/,
    tableAlignChars: /^\||\| *$/g,
    tableRowBlankLine: /\n[ \t]*$/,
    tableAlignRight: /^ *-+: *$/,
    tableAlignCenter: /^ *:-+: *$/,
    tableAlignLeft: /^ *:-+ *$/,
    startATag: /^<a /i,
    endATag: /^<\/a>/i,
    startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
    endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
    startAngleBracket: /^</,
    endAngleBracket: />$/,
    pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
    unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
    escapeTest: /[&<>"']/,
    escapeReplace: /[&<>"']/g,
    escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
    escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
    caret: /(^|[^\[])\^/g,
    percentDecode: /%25/g,
    findPipe: /\|/g,
    splitPipe: / \|/,
    slashPipe: /\\\|/g,
    carriageReturn: /\r\n|\r/g,
    spaceLine: /^ +$/gm,
    notSpaceStart: /^\S*/,
    endingNewline: /\n$/,
    listItemRegex: (u4) => new RegExp(`^( {0,3}${u4})((?:[	 ][^\\n]*)?(?:\\n|$))`),
    nextBulletRegex: (u4) => new RegExp(`^ {0,${Math.min(3, u4 - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
    hrRegex: (u4) => new RegExp(`^ {0,${Math.min(3, u4 - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
    fencesBeginRegex: (u4) => new RegExp(`^ {0,${Math.min(3, u4 - 1)}}(?:\`\`\`|~~~)`),
    headingBeginRegex: (u4) => new RegExp(`^ {0,${Math.min(3, u4 - 1)}}#`),
    htmlBeginRegex: (u4) => new RegExp(`^ {0,${Math.min(3, u4 - 1)}}<(?:[a-z].*>|!--)`, "i"),
    blockquoteBeginRegex: (u4) => new RegExp(`^ {0,${Math.min(3, u4 - 1)}}>`),
  },
  Re$2 = /^(?:[ \t]*(?:\n|$))+/,
  Oe$3 = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,
  Te$3 = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
  C$8 = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,
  we$3 = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
  Q$5 = / {0,3}(?:[*+-]|\d{1,9}[.)])/,
  se$3 =
    /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  ie$3 = k$5(se$3)
    .replace(/bull/g, Q$5)
    .replace(/blockCode/g, /(?: {4}| {0,3}\t)/)
    .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/)
    .replace(/blockquote/g, / {0,3}>/)
    .replace(/heading/g, / {0,3}#{1,6}/)
    .replace(/html/g, / {0,3}<[^\n>]+>\n/)
    .replace(/\|table/g, "")
    .getRegex(),
  ye$2 = k$5(se$3)
    .replace(/bull/g, Q$5)
    .replace(/blockCode/g, /(?: {4}| {0,3}\t)/)
    .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/)
    .replace(/blockquote/g, / {0,3}>/)
    .replace(/heading/g, / {0,3}#{1,6}/)
    .replace(/html/g, / {0,3}<[^\n>]+>\n/)
    .replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/)
    .getRegex(),
  j$5 = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,
  Pe$2 = /^[^\n]+/,
  F$5 = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,
  Se$2 = k$5(
    /^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/,
  )
    .replace("label", F$5)
    .replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/)
    .getRegex(),
  $e$3 = k$5(/^(bull)([ \t][^\n]+?)?(?:\n|$)/)
    .replace(/bull/g, Q$5)
    .getRegex(),
  v$6 =
    "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",
  U$5 = /<!--(?:-?>|[\s\S]*?(?:-->|$))/,
  _e$1 = k$5(
    "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))",
    "i",
  )
    .replace("comment", U$5)
    .replace("tag", v$6)
    .replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
    .getRegex(),
  oe$3 = k$5(j$5)
    .replace("hr", C$8)
    .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
    .replace("|lheading", "")
    .replace("|table", "")
    .replace("blockquote", " {0,3}>")
    .replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n")
    .replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]")
    .replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)")
    .replace("tag", v$6)
    .getRegex(),
  Le$2 = k$5(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/)
    .replace("paragraph", oe$3)
    .getRegex(),
  K$6 = {
    blockquote: Le$2,
    code: Oe$3,
    def: Se$2,
    fences: Te$3,
    heading: we$3,
    hr: C$8,
    html: _e$1,
    lheading: ie$3,
    list: $e$3,
    newline: Re$2,
    paragraph: oe$3,
    table: _$4,
    text: Pe$2,
  },
  ne$4 = k$5(
    "^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)",
  )
    .replace("hr", C$8)
    .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
    .replace("blockquote", " {0,3}>")
    .replace("code", "(?: {4}| {0,3}	)[^\\n]")
    .replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n")
    .replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]")
    .replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)")
    .replace("tag", v$6)
    .getRegex(),
  Me$1 = {
    ...K$6,
    lheading: ye$2,
    table: ne$4,
    paragraph: k$5(j$5)
      .replace("hr", C$8)
      .replace("heading", " {0,3}#{1,6}(?:\\s|$)")
      .replace("|lheading", "")
      .replace("table", ne$4)
      .replace("blockquote", " {0,3}>")
      .replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n")
      .replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]")
      .replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)")
      .replace("tag", v$6)
      .getRegex(),
  },
  ze$1 = {
    ...K$6,
    html: k$5(
      `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`,
    )
      .replace("comment", U$5)
      .replace(
        /tag/g,
        "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b",
      )
      .getRegex(),
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
    heading: /^(#{1,6})(.*)(?:\n+|$)/,
    fences: _$4,
    lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
    paragraph: k$5(j$5)
      .replace("hr", C$8)
      .replace(
        "heading",
        ` *#{1,6} *[^
]`,
      )
      .replace("lheading", ie$3)
      .replace("|table", "")
      .replace("blockquote", " {0,3}>")
      .replace("|fences", "")
      .replace("|list", "")
      .replace("|html", "")
      .replace("|tag", "")
      .getRegex(),
  },
  Ee$3 = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
  Ie$2 = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
  ae$3 = /^( {2,}|\\)\n(?!\s*$)/,
  Ae$3 = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
  z$6 = /[\p{P}\p{S}]/u,
  H$4 = /[\s\p{P}\p{S}]/u,
  W$6 = /[^\s\p{P}\p{S}]/u,
  Ce$2 = k$5(/^((?![*_])punctSpace)/, "u")
    .replace(/punctSpace/g, H$4)
    .getRegex(),
  le$3 = /(?!~)[\p{P}\p{S}]/u,
  Be$2 = /(?!~)[\s\p{P}\p{S}]/u,
  De$3 = /(?:[^\s\p{P}\p{S}]|~)/u,
  qe$2 = k$5(/link|precode-code|html/, "g")
    .replace(
      "link",
      /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/,
    )
    .replace("precode-", be$2 ? "(?<!`)()" : "(^^|[^`])")
    .replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/)
    .replace("html", /<(?! )[^<>]*?>/)
    .getRegex(),
  ue$3 = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,
  ve$1 = k$5(ue$3, "u").replace(/punct/g, z$6).getRegex(),
  He$2 = k$5(ue$3, "u").replace(/punct/g, le$3).getRegex(),
  pe$2 =
    "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",
  Ze$2 = k$5(pe$2, "gu")
    .replace(/notPunctSpace/g, W$6)
    .replace(/punctSpace/g, H$4)
    .replace(/punct/g, z$6)
    .getRegex(),
  Ge$1 = k$5(pe$2, "gu")
    .replace(/notPunctSpace/g, De$3)
    .replace(/punctSpace/g, Be$2)
    .replace(/punct/g, le$3)
    .getRegex(),
  Ne$2 = k$5(
    "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)",
    "gu",
  )
    .replace(/notPunctSpace/g, W$6)
    .replace(/punctSpace/g, H$4)
    .replace(/punct/g, z$6)
    .getRegex(),
  Qe$1 = k$5(/^~~?(?:((?!~)punct)|[^\s~])/, "u")
    .replace(/punct/g, z$6)
    .getRegex(),
  je$2 =
    "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)",
  Fe$2 = k$5(je$2, "gu")
    .replace(/notPunctSpace/g, W$6)
    .replace(/punctSpace/g, H$4)
    .replace(/punct/g, z$6)
    .getRegex(),
  Ue$1 = k$5(/\\(punct)/, "gu")
    .replace(/punct/g, z$6)
    .getRegex(),
  Ke$1 = k$5(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/)
    .replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/)
    .replace(
      "email",
      /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/,
    )
    .getRegex(),
  We$2 = k$5(U$5).replace("(?:-->|$)", "-->").getRegex(),
  Xe$1 = k$5(
    "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",
  )
    .replace("comment", We$2)
    .replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/)
    .getRegex(),
  q$4 = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/,
  Je$1 = k$5(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/)
    .replace("label", q$4)
    .replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/)
    .replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/)
    .getRegex(),
  ce$3 = k$5(/^!?\[(label)\]\[(ref)\]/)
    .replace("label", q$4)
    .replace("ref", F$5)
    .getRegex(),
  he$3 = k$5(/^!?\[(ref)\](?:\[\])?/)
    .replace("ref", F$5)
    .getRegex(),
  Ve$2 = k$5("reflink|nolink(?!\\()", "g").replace("reflink", ce$3).replace("nolink", he$3).getRegex(),
  re$6 = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,
  X$6 = {
    _backpedal: _$4,
    anyPunctuation: Ue$1,
    autolink: Ke$1,
    blockSkip: qe$2,
    br: ae$3,
    code: Ie$2,
    del: _$4,
    delLDelim: _$4,
    delRDelim: _$4,
    emStrongLDelim: ve$1,
    emStrongRDelimAst: Ze$2,
    emStrongRDelimUnd: Ne$2,
    escape: Ee$3,
    link: Je$1,
    nolink: he$3,
    punctuation: Ce$2,
    reflink: ce$3,
    reflinkSearch: Ve$2,
    tag: Xe$1,
    text: Ae$3,
    url: _$4,
  },
  Ye$1 = {
    ...X$6,
    link: k$5(/^!?\[(label)\]\((.*?)\)/)
      .replace("label", q$4)
      .getRegex(),
    reflink: k$5(/^!?\[(label)\]\s*\[([^\]]*)\]/)
      .replace("label", q$4)
      .getRegex(),
  },
  N$3 = {
    ...X$6,
    emStrongRDelimAst: Ge$1,
    emStrongLDelim: He$2,
    delLDelim: Qe$1,
    delRDelim: Fe$2,
    url: k$5(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/)
      .replace("protocol", re$6)
      .replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/)
      .getRegex(),
    _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
    del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,
    text: k$5(
      /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/,
    )
      .replace("protocol", re$6)
      .getRegex(),
  },
  et$3 = {
    ...N$3,
    br: k$5(ae$3).replace("{2,}", "*").getRegex(),
    text: k$5(N$3.text)
      .replace("\\b_", "\\b_| {2,}\\n")
      .replace(/\{2,\}/g, "*")
      .getRegex(),
  },
  B$7 = {
    normal: K$6,
    gfm: Me$1,
    pedantic: ze$1,
  },
  E$6 = {
    normal: X$6,
    gfm: N$3,
    breaks: et$3,
    pedantic: Ye$1,
  };

// 这个模块对外只给一个「带 resetKeys 的错误边界」。它就是把 `react-error-boundary` 的
// `ErrorBoundary` 转出去 —— 顶部的 import 一直在，但**从来没被用过**，因为导出那行绑错了符号：
// 原本应该是 `C$5`（那个 import），却被写成了 `m$4`。而 `m$4` 在这个文件里是 **marked 的正则规则表**
//（本文件还原时把两块不相干的内容并到了一起）。于是 `ResetErrorBoundary` 成了一个对象 ——
// `AppProviders` 最外层渲染它时 React 报 #130「元素类型是对象」，整棵树落进一个坏掉的边界里。
export { C$5 as ResetErrorBoundary };
