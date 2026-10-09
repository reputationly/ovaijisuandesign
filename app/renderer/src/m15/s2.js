// s2.js
import { d, D$1, W$1, K2, k, I, SKIP, visitParents } from "../vendor.js";
import { C2, E$1, F, J2, L$1, Q, T, V2, X, Z, c2, f, j } from "./kn.js";
var Ln = /<[a-zA-Z/][^>]*$/;
var x = (n2) => {
  let r2 = n2.match(Ln);
  return !r2 || r2.index === void 0 || c2(n2, r2.index) ? n2 : n2.substring(0, r2.index).trimEnd();
};
var En = (n2) =>
  !n2.match(D$1) ||
  n2.includes(`
`)
    ? null
    : n2.endsWith("``") && !n2.endsWith("```")
      ? `${n2}\``
      : n2;
var Mn = (n2) => (n2.match(/```/g) || []).length % 2 === 1;
var nn$1 = (n2) => {
  let r2 = En(n2);
  if (r2 !== null) return r2;
  let e2 = n2.match(W$1);
  if (e2 && !Mn(n2)) {
    let i2 = e2[2];
    if (!i2 || d.test(i2)) return n2;
    if (L$1(n2) % 2 === 1) return `${n2}\``;
  }
  return n2;
};
var en$1 = (n2, r2) =>
  (r2 >= 2 && n2.substring(r2 - 2, r2 + 1) === "```") ||
  (r2 >= 1 && n2.substring(r2 - 1, r2 + 2) === "```") ||
  (r2 <= n2.length - 3 && n2.substring(r2, r2 + 3) === "```");
var Nn$1 = (n2) => {
  let r2 = 0,
    e2 = false;
  for (let i2 = 0; i2 < n2.length - 1; i2 += 1)
    (n2[i2] === "`" && !en$1(n2, i2) && (e2 = !e2),
      !e2 && n2[i2] === "$" && n2[i2 + 1] === "$" && ((r2 += 1), (i2 += 1)));
  return r2;
};
var yn$1 = (n2) => {
  let r2 = 0,
    e2 = false;
  for (let i2 = 0; i2 < n2.length; i2 += 1) {
    if (n2[i2] === "\\") {
      i2 += 1;
      continue;
    }
    if (n2[i2] === "`" && !en$1(n2, i2)) {
      e2 = !e2;
      continue;
    }
    !e2 && n2[i2] === "$" && (i2 + 1 < n2.length && n2[i2 + 1] === "$" ? (i2 += 1) : (r2 += 1));
  }
  return r2;
};
var Rn = (n2) => {
  if (n2.endsWith("$") && !n2.endsWith("$$")) return `${n2}$`;
  let r2 = n2.indexOf("$$");
  return r2 !== -1 &&
    n2.indexOf(
      `
`,
      r2,
    ) !== -1 &&
    !n2.endsWith(`
`)
    ? `${n2}
$$`
    : `${n2}$$`;
};
var rn$1 = (n2) => (Nn$1(n2) % 2 === 0 ? n2 : Rn(n2));
var sn$1 = (n2) => (yn$1(n2) % 2 === 1 ? `${n2}$` : n2);
var Un = (n2, r2, e2) => {
  if (n2.substring(r2 + 2).includes(")")) return null;
  let s2 = X(n2, r2);
  if (s2 === -1 || c2(n2, s2)) return null;
  let o2 = s2 > 0 && n2[s2 - 1] === "!",
    t2 = o2 ? s2 - 1 : s2,
    a2 = n2.substring(0, t2);
  if (o2) return a2;
  let l2 = n2.substring(s2 + 1, r2);
  return e2 === "text-only" ? `${a2}${l2}` : `${a2}[${l2}](streamdown:incomplete-link)`;
};
var on$1 = (n2, r2) => {
  for (let e2 = 0; e2 < r2; e2++)
    if (n2[e2] === "[" && !c2(n2, e2)) {
      if (e2 > 0 && n2[e2 - 1] === "!") continue;
      let i2 = C2(n2, e2);
      if (i2 === -1) return e2;
      if (i2 + 1 < n2.length && n2[i2 + 1] === "(") {
        let s2 = n2.indexOf(")", i2 + 2);
        s2 !== -1 && (e2 = s2);
      }
    }
  return r2;
};
var Wn$1 = (n2, r2, e2) => {
  let i2 = r2 > 0 && n2[r2 - 1] === "!",
    s2 = i2 ? r2 - 1 : r2;
  if (!n2.substring(r2 + 1).includes("]")) {
    let a2 = n2.substring(0, s2);
    if (i2) return a2;
    if (e2 === "text-only") {
      let l2 = on$1(n2, r2);
      return n2.substring(0, l2) + n2.substring(l2 + 1);
    }
    return `${n2}](streamdown:incomplete-link)`;
  }
  if (C2(n2, r2) === -1) {
    let a2 = n2.substring(0, s2);
    if (i2) return a2;
    if (e2 === "text-only") {
      let l2 = on$1(n2, r2);
      return n2.substring(0, l2) + n2.substring(l2 + 1);
    }
    return `${n2}](streamdown:incomplete-link)`;
  }
  return null;
};
var B = (n2, r2 = "protocol") => {
  let e2 = n2.lastIndexOf("](");
  if (e2 !== -1 && !c2(n2, e2)) {
    let i2 = Un(n2, e2, r2);
    if (i2 !== null) return i2;
  }
  for (let i2 = n2.length - 1; i2 >= 0; i2 -= 1)
    if (n2[i2] === "[" && !c2(n2, i2)) {
      let s2 = Wn$1(n2, i2, r2);
      if (s2 !== null) return s2;
    }
  return n2;
};
var Kn = /^-{1,2}$/;
var Hn = /^[\s]*-{1,2}[\s]+$/;
var Dn = /^={1,2}$/;
var wn$1 = /^[\s]*={1,2}[\s]+$/;
var ln$1 = (n2) => {
  if (!n2 || typeof n2 != "string") return n2;
  let r2 = n2.lastIndexOf(`
`);
  if (r2 === -1) return n2;
  let e2 = n2.substring(r2 + 1),
    i2 = n2.substring(0, r2),
    s2 = e2.trim();
  if (Kn.test(s2) && !e2.match(Hn)) {
    let t2 = i2
      .split(
        `
`,
      )
      .at(-1);
    if (t2 && t2.trim().length > 0) return `${n2}​`;
  }
  if (Dn.test(s2) && !e2.match(wn$1)) {
    let t2 = i2
      .split(
        `
`,
      )
      .at(-1);
    if (t2 && t2.trim().length > 0) return `${n2}​`;
  }
  return n2;
};
var Gn$1 = new RegExp("(?<=[\\p{L}\\p{N}_])~(?!~)(?=[\\p{L}\\p{N}_])", "gu");
var tn$1 = (n2) =>
  !n2 || typeof n2 != "string" || !n2.includes("~")
    ? n2
    : n2.replace(Gn$1, (r2, e2) => (c2(n2, e2) ? r2 : "\\~"));
var an$1 = (n2) => {
  var e2, i2;
  let r2 = n2.match(K2);
  if (r2) {
    let s2 = r2[2];
    if (!s2 || d.test(s2)) return n2;
    let o2 = n2.lastIndexOf(r2[1]);
    if (c2(n2, o2) || f(n2, o2)) return n2;
    if (((e2 = n2.match(T)) == null ? void 0 : e2.length) % 2 === 1) return `${n2}~~`;
  } else {
    let s2 = n2.match(F);
    if (s2) {
      let o2 = n2.lastIndexOf(s2[0].slice(0, 2));
      if (c2(n2, o2) || f(n2, o2)) return n2;
      if (((i2 = n2.match(T)) == null ? void 0 : i2.length) % 2 === 1) return `${n2}~`;
    }
  }
  return n2;
};
export var S2 = (n2) => n2 !== false;
export var Fn$1 = (n2) => n2 === true;
export var u3 = {
  SINGLE_TILDE: 0,
  COMPARISON_OPERATORS: 5,
  HTML_TAGS: 10,
  SETEXT_HEADINGS: 15,
  LINKS: 20,
  BOLD_ITALIC: 30,
  BOLD: 35,
  ITALIC_DOUBLE_UNDERSCORE: 40,
  ITALIC_SINGLE_ASTERISK: 41,
  ITALIC_SINGLE_UNDERSCORE: 42,
  INLINE_CODE: 50,
  STRIKETHROUGH: 60,
  KATEX: 70,
  INLINE_KATEX: 75,
  DEFAULT: 100,
};
export var Xn$1 = [
  {
    handler: {
      name: "singleTilde",
      handle: tn$1,
      priority: u3.SINGLE_TILDE,
    },
    optionKey: "singleTilde",
  },
  {
    handler: {
      name: "comparisonOperators",
      handle: E$1,
      priority: u3.COMPARISON_OPERATORS,
    },
    optionKey: "comparisonOperators",
  },
  {
    handler: {
      name: "htmlTags",
      handle: x,
      priority: u3.HTML_TAGS,
    },
    optionKey: "htmlTags",
  },
  {
    handler: {
      name: "setextHeadings",
      handle: ln$1,
      priority: u3.SETEXT_HEADINGS,
    },
    optionKey: "setextHeadings",
  },
  {
    handler: {
      name: "links",
      handle: B,
      priority: u3.LINKS,
    },
    optionKey: "links",
    earlyReturn: (n2) => n2.endsWith("](streamdown:incomplete-link)"),
  },
  {
    handler: {
      name: "boldItalic",
      handle: V2,
      priority: u3.BOLD_ITALIC,
    },
    optionKey: "boldItalic",
  },
  {
    handler: {
      name: "bold",
      handle: j,
      priority: u3.BOLD,
    },
    optionKey: "bold",
  },
  {
    handler: {
      name: "italicDoubleUnderscore",
      handle: Q,
      priority: u3.ITALIC_DOUBLE_UNDERSCORE,
    },
    optionKey: "italic",
  },
  {
    handler: {
      name: "italicSingleAsterisk",
      handle: Z,
      priority: u3.ITALIC_SINGLE_ASTERISK,
    },
    optionKey: "italic",
  },
  {
    handler: {
      name: "italicSingleUnderscore",
      handle: J2,
      priority: u3.ITALIC_SINGLE_UNDERSCORE,
    },
    optionKey: "italic",
  },
  {
    handler: {
      name: "inlineCode",
      handle: nn$1,
      priority: u3.INLINE_CODE,
    },
    optionKey: "inlineCode",
  },
  {
    handler: {
      name: "strikethrough",
      handle: an$1,
      priority: u3.STRIKETHROUGH,
    },
    optionKey: "strikethrough",
  },
  {
    handler: {
      name: "katex",
      handle: rn$1,
      priority: u3.KATEX,
    },
    optionKey: "katex",
  },
  {
    handler: {
      name: "inlineKatex",
      handle: sn$1,
      priority: u3.INLINE_KATEX,
    },
    optionKey: "inlineKatex",
  },
];
export var zn$1 = (n2) => {
  var e2;
  let r2 = (e2 = n2 == null ? void 0 : n2.linkMode) != null ? e2 : "protocol";
  return Xn$1.filter(({ handler: i2, optionKey: s2 }) =>
    i2.name === "links"
      ? S2(n2 == null ? void 0 : n2.links) || S2(n2 == null ? void 0 : n2.images)
      : i2.name === "inlineKatex"
        ? Fn$1(n2 == null ? void 0 : n2.inlineKatex)
        : S2(n2 == null ? void 0 : n2[s2]),
  ).map(({ handler: i2, earlyReturn: s2 }) =>
    i2.name === "links"
      ? {
          handler: k(I({}, i2), {
            handle: (o2) => B(o2, r2),
          }),
          earlyReturn: r2 === "protocol" ? s2 : void 0,
        }
      : {
          handler: i2,
          earlyReturn: s2,
        },
  );
};
export var vn$1 = (n2, r2) => {
  var t2;
  if (!n2 || typeof n2 != "string") return n2;
  let e2 = n2.endsWith(" ") && !n2.endsWith("  ") ? n2.slice(0, -1) : n2,
    i2 = zn$1(r2),
    s2 = ((t2 = r2 == null ? void 0 : r2.handlers) != null ? t2 : []).map((a2) => {
      var l2;
      return {
        handler: k(I({}, a2), {
          priority: (l2 = a2.priority) != null ? l2 : u3.DEFAULT,
        }),
        earlyReturn: void 0,
      };
    }),
    o2 = [...i2, ...s2].sort((a2, l2) => {
      var _2, P3;
      return (
        ((_2 = a2.handler.priority) != null ? _2 : 0) -
        ((P3 = l2.handler.priority) != null ? P3 : 0)
      );
    });
  for (let { handler: a2, earlyReturn: l2 } of o2)
    if (((e2 = a2.handle(e2)), l2 != null && l2(e2))) return e2;
  return e2;
};
export var $e$1 = vn$1;
var St = /\s/;
var Fn = /^\s+$/;
var zn = new Set(["code", "pre", "svg", "math", "annotation"]);
var _n = (e2) => typeof e2 == "object" && e2 !== null && "type" in e2 && e2.type === "element";
var qn = (e2) => e2.some((t2) => _n(t2) && zn.has(t2.tagName));
var $n = (e2) => {
  let t2 = [],
    o2 = "",
    n2 = false;
  for (let r2 of e2) {
    let s2 = St.test(r2);
    (s2 !== n2 && o2 && (t2.push(o2), (o2 = "")), (o2 += r2), (n2 = s2));
  }
  return (o2 && t2.push(o2), t2);
};
var Wn = (e2) => {
  let t2 = [],
    o2 = "";
  for (let n2 of e2) St.test(n2) ? (o2 += n2) : (o2 && (t2.push(o2), (o2 = "")), t2.push(n2));
  return (o2 && t2.push(o2), t2);
};
var Zn = (e2, t2, o2, n2, r2, s2) => {
  let a2 = `--sd-animation:sd-${t2};--sd-duration:${r2 ? 0 : o2}ms;--sd-easing:${n2}`;
  return (
    s2 && (a2 += `;--sd-delay:${s2}ms`),
    {
      type: "element",
      tagName: "span",
      properties: {
        "data-sd-animate": true,
        style: a2,
      },
      children: [
        {
          type: "text",
          value: e2,
        },
      ],
    }
  );
};
var Xn = (e2, t2, o2, n2, r2) => {
  let s2 = t2.at(-1);
  if (!(s2 && "children" in s2)) return;
  if (qn(t2)) return SKIP;
  let a2 = s2,
    l2 = a2.children.indexOf(e2);
  if (l2 === -1) return;
  let i2 = e2.value;
  if (!i2.trim()) {
    r2.count += i2.length;
    return;
  }
  let d2 = o2.sep === "char" ? Wn(i2) : $n(i2),
    c3 = n2.prevContentLength,
    p3 = d2.map((m3) => {
      let u4 = r2.count;
      if (((r2.count += m3.length), Fn.test(m3)))
        return {
          type: "text",
          value: m3,
        };
      let f2 = c3 > 0 && u4 < c3,
        h2 = f2 ? 0 : r2.newIndex++ * o2.stagger;
      return Zn(m3, o2.animation, o2.duration, o2.easing, f2, h2);
    });
  return (a2.children.splice(l2, 1, ...p3), l2 + p3.length);
};
var Jn = 0;
export function be(e2) {
  var s2, a2, l2, i2, d2;
  let t2 = {
      animation: (s2 = e2 == null ? void 0 : e2.animation) != null ? s2 : "fadeIn",
      duration: (a2 = e2 == null ? void 0 : e2.duration) != null ? a2 : 150,
      easing: (l2 = e2 == null ? void 0 : e2.easing) != null ? l2 : "ease",
      sep: (i2 = e2 == null ? void 0 : e2.sep) != null ? i2 : "word",
      stagger: (d2 = e2 == null ? void 0 : e2.stagger) != null ? d2 : 40,
    },
    o2 = {
      prevContentLength: 0,
      lastRenderCharCount: 0,
    },
    n2 = Jn++,
    r2 = () => (c3) => {
      let p3 = {
        count: 0,
        newIndex: 0,
      };
      (visitParents(c3, "text", (m3, u4) => Xn(m3, u4, t2, o2, p3)),
        (o2.lastRenderCharCount = p3.count),
        (o2.prevContentLength = 0));
    };
  return (
    Object.defineProperty(r2, "name", {
      value: `rehypeAnimate$${n2}`,
    }),
    {
      name: "animate",
      type: "animate",
      rehypePlugin: r2,
      setPrevContentLength(c3) {
        o2.prevContentLength = c3;
      },
      getLastRenderCharCount() {
        let c3 = o2.lastRenderCharCount;
        return ((o2.lastRenderCharCount = 0), c3);
      },
    }
  );
}
be();
