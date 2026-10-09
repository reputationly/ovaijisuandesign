// build-inspiration-media-showcase-collections.js
import { b2, d, H, M, N, R$1 as R, raw, w2, y$1 as y } from "../vendor.js";
import {
  buildFeaturedItems,
  FEATURED_SHOWCASE_COLLECTION_ID,
  HOME_SHOWCASE_MAX_ITEMS_PER_COLLECTION,
  HOME_SHOWCASE_MAX_TOTAL_ITEMS,
  showcaseBadgeProps,
  showcaseOrientation,
  uniqueItemsByVideoUrl,
} from "./parse-project-archive-item.js";
import { sceneItems } from "./output-item.js";
export function buildInspirationMediaShowcaseCollections({
  categories,
  featuredLabel,
  showcase,
}) {
  const featuredScenes = categories
    .filter(
      (category) => category.kind === "scene" && category.showcase === true,
    )
    .map((category) => ({
      scene: category.scene,
      entries: sceneItems(category.scene, category.videoUrl),
    }));
  const featuredItems = buildFeaturedItems(featuredScenes);
  let remainingItemBudget = HOME_SHOWCASE_MAX_TOTAL_ITEMS;
  const collections = [
    ...(featuredItems.length > 0
      ? [
          {
            id: FEATURED_SHOWCASE_COLLECTION_ID,
            label:
              showcase?.tabs[FEATURED_SHOWCASE_COLLECTION_ID]?.label ??
              featuredLabel,
            labelEn:
              showcase?.tabs[FEATURED_SHOWCASE_COLLECTION_ID]?.labelEn ??
              featuredLabel,
            ...showcaseBadgeProps(showcase, FEATURED_SHOWCASE_COLLECTION_ID),
            videoOrientation: showcaseOrientation(
              showcase,
              FEATURED_SHOWCASE_COLLECTION_ID,
            ),
            items: featuredItems,
          },
        ]
      : []),
    ...categories.flatMap((category) => {
      if (
        category.kind !== "scene" ||
        category.id === FEATURED_SHOWCASE_COLLECTION_ID
      )
        return [];
      const items = uniqueItemsByVideoUrl(
        sceneItems(category.scene, category.videoUrl).map(({ item }) => item),
      );
      return items.length > 0
        ? [
            {
              id: category.id,
              label: category.name,
              labelEn: category.nameEn,
              ...showcaseBadgeProps(showcase, category.id),
              videoOrientation: showcaseOrientation(showcase, category.id),
              items,
            },
          ]
        : [];
    }),
  ];
  return collections.flatMap((collection) => {
    if (remainingItemBudget <= 0) return [];
    const items = collection.items.slice(
      0,
      Math.min(HOME_SHOWCASE_MAX_ITEMS_PER_COLLECTION, remainingItemBudget),
    );
    remainingItemBudget -= items.length;
    return items.length > 0
      ? [
          {
            ...collection,
            items,
          },
        ]
      : [];
  });
}
export function resolveHomeFeaturedSkillPrompt(skill, preset2, isZh) {
  if (isZh) return preset2?.prompt || skill.guidePrompt || skill.guidePromptEn;
  return preset2?.promptEn || skill.guidePromptEn || skill.guidePrompt;
}
export function rehypeRaw(options) {
  return function (tree, file) {
    const result =
      /** @type {Root} */
      raw(tree, {
        ...options,
        file,
      });
    return result;
  };
}
export var c2 = (n2, r2) => {
  let e2 = false,
    i2 = false;
  for (let s2 = 0; s2 < r2; s2 += 1) {
    if (n2[s2] === "\\" && s2 + 1 < n2.length && n2[s2 + 1] === "`") {
      s2 += 1;
      continue;
    }
    if (n2.substring(s2, s2 + 3) === "```") {
      ((i2 = !i2), (s2 += 2));
      continue;
    }
    !i2 && n2[s2] === "`" && (e2 = !e2);
  }
  return e2 || i2;
};
var hn = (n2, r2) => {
  let e2 = n2.substring(r2, r2 + 3) === "```",
    i2 = r2 > 0 && n2.substring(r2 - 1, r2 + 2) === "```",
    s2 = r2 > 1 && n2.substring(r2 - 2, r2 + 1) === "```";
  return e2 || i2 || s2;
};
export var L = (n2) => {
  let r2 = 0;
  for (let e2 = 0; e2 < n2.length; e2 += 1) {
    if (n2[e2] === "\\" && e2 + 1 < n2.length && n2[e2 + 1] === "`") {
      e2 += 1;
      continue;
    }
    n2[e2] === "`" && !hn(n2, e2) && (r2 += 1);
  }
  return r2;
};
export var f = (n2, r2) => {
  let e2 = false,
    i2 = false,
    s2 = -1;
  for (let o2 = 0; o2 < n2.length; o2 += 1) {
    if (n2[o2] === "\\" && o2 + 1 < n2.length && n2[o2 + 1] === "`") {
      o2 += 1;
      continue;
    }
    if (n2.substring(o2, o2 + 3) === "```") {
      ((i2 = !i2), (o2 += 2));
      continue;
    }
    if (!i2 && n2[o2] === "`")
      if (e2) {
        if (s2 < r2 && r2 < o2) return true;
        ((e2 = false), (s2 = -1));
      } else ((e2 = true), (s2 = o2));
  }
  return false;
};
var mn = /^(\s*(?:[-*+]|\d+[.)]) +)>(=?\s*[$]?\d)/gm;
export var E = (n2) =>
  !n2 || typeof n2 != "string" || !n2.includes(">")
    ? n2
    : n2.replace(mn, (r2, e2, i2, s2) => (c2(n2, s2) ? r2 : `${e2}\\>${i2}`));
var G = /(__)([^_]+)_$/;
export var F = /(~~)([^~]+)~$/;
export var T = /~~/g;
export var g = (n2) => {
  if (!n2) return false;
  let r2 = n2.charCodeAt(0);
  return (r2 >= 48 && r2 <= 57) ||
    (r2 >= 65 && r2 <= 90) ||
    (r2 >= 97 && r2 <= 122) ||
    r2 === 95
    ? true
    : H.test(n2);
};
export var X = (n2, r2) => {
  let e2 = 1;
  for (let i2 = r2 - 1; i2 >= 0; i2 -= 1)
    if (n2[i2] === "]") e2 += 1;
    else if (n2[i2] === "[" && ((e2 -= 1), e2 === 0)) return i2;
  return -1;
};
export var C2 = (n2, r2) => {
  let e2 = 1;
  for (let i2 = r2 + 1; i2 < n2.length; i2 += 1)
    if (n2[i2] === "[") e2 += 1;
    else if (n2[i2] === "]" && ((e2 -= 1), e2 === 0)) return i2;
  return -1;
};
export var h = (n2, r2) => {
  let e2 = false,
    i2 = false;
  for (let s2 = 0; s2 < n2.length && s2 < r2; s2 += 1) {
    if (n2[s2] === "\\" && n2[s2 + 1] === "$") {
      s2 += 1;
      continue;
    }
    n2[s2] === "$" &&
      (n2[s2 + 1] === "$"
        ? ((i2 = !i2), (s2 += 1), (e2 = false))
        : i2 || (e2 = !e2));
  }
  return e2 || i2;
};
var p2 = (n2, r2, e2) => {
  let i2 = 0;
  for (let l2 = r2 - 1; l2 >= 0; l2 -= 1)
    if (
      n2[l2] ===
      `
`
    ) {
      i2 = l2 + 1;
      break;
    }
  let s2 = n2.length;
  for (let l2 = r2; l2 < n2.length; l2 += 1)
    if (
      n2[l2] ===
      `
`
    ) {
      s2 = l2;
      break;
    }
  let o2 = n2.substring(i2, s2),
    t2 = 0,
    a2 = false;
  for (let l2 of o2)
    if (l2 === e2) t2 += 1;
    else if (l2 !== " " && l2 !== "	") {
      a2 = true;
      break;
    }
  return t2 >= 3 && !a2;
};
var kn = (n2, r2, e2, i2) =>
  e2 === "\\" || (n2.includes("$") && h(n2, r2))
    ? true
    : e2 !== "*" && i2 === "*"
      ? (r2 < n2.length - 2 ? n2[r2 + 2] : "") !== "*"
      : !!(
          e2 === "*" ||
          (e2 && i2 && g(e2) && g(i2)) ||
          ((!e2 ||
            e2 === " " ||
            e2 === "	" ||
            e2 ===
              `
`) &&
            (!i2 ||
              i2 === " " ||
              i2 === "	" ||
              i2 ===
                `
`))
        );
var Y = (n2) => {
  let r2 = 0,
    e2 = false,
    i2 = n2.length;
  for (let s2 = 0; s2 < i2; s2 += 1) {
    if (
      n2[s2] === "`" &&
      s2 + 2 < i2 &&
      n2[s2 + 1] === "`" &&
      n2[s2 + 2] === "`"
    ) {
      ((e2 = !e2), (s2 += 2));
      continue;
    }
    if (e2 || n2[s2] !== "*") continue;
    let o2 = s2 > 0 ? n2[s2 - 1] : "",
      t2 = s2 < i2 - 1 ? n2[s2 + 1] : "";
    kn(n2, s2, o2, t2) || (r2 += 1);
  }
  return r2;
};
var Cn = (n2) => {
  let r2 = 0,
    e2 = 0,
    i2 = false;
  for (let s2 = 0; s2 < n2.length; s2 += 1) {
    if (
      n2[s2] === "`" &&
      s2 + 2 < n2.length &&
      n2[s2 + 1] === "`" &&
      n2[s2 + 2] === "`"
    ) {
      (e2 >= 3 && (r2 += Math.floor(e2 / 3)), (e2 = 0), (i2 = !i2), (s2 += 2));
      continue;
    }
    i2 ||
      (n2[s2] === "*"
        ? (e2 += 1)
        : (e2 >= 3 && (r2 += Math.floor(e2 / 3)), (e2 = 0)));
  }
  return (e2 >= 3 && (r2 += Math.floor(e2 / 3)), r2);
};
export var A = (n2) => {
  let r2 = 0,
    e2 = false;
  for (let i2 = 0; i2 < n2.length; i2 += 1) {
    if (
      n2[i2] === "`" &&
      i2 + 2 < n2.length &&
      n2[i2 + 1] === "`" &&
      n2[i2 + 2] === "`"
    ) {
      ((e2 = !e2), (i2 += 2));
      continue;
    }
    e2 ||
      (n2[i2] === "*" &&
        i2 + 1 < n2.length &&
        n2[i2 + 1] === "*" &&
        ((r2 += 1), (i2 += 1)));
  }
  return r2;
};
var v = (n2) => {
  let r2 = 0,
    e2 = false;
  for (let i2 = 0; i2 < n2.length; i2 += 1) {
    if (
      n2[i2] === "`" &&
      i2 + 2 < n2.length &&
      n2[i2 + 1] === "`" &&
      n2[i2 + 2] === "`"
    ) {
      ((e2 = !e2), (i2 += 2));
      continue;
    }
    e2 ||
      (n2[i2] === "_" &&
        i2 + 1 < n2.length &&
        n2[i2 + 1] === "_" &&
        ((r2 += 1), (i2 += 1)));
  }
  return r2;
};
var An = (n2, r2, e2) => {
  if (!r2 || d.test(r2)) return true;
  let s2 = n2.substring(0, e2).lastIndexOf(`
`),
    o2 = s2 === -1 ? 0 : s2 + 1,
    t2 = n2.substring(o2, e2);
  return b2.test(t2) &&
    r2.includes(`
`)
    ? true
    : p2(n2, e2, "*");
};
export var j = (n2) => {
  let r2 = n2.match(M);
  if (!r2) return n2;
  let e2 = r2[2],
    i2 = n2.lastIndexOf(r2[1]);
  return c2(n2, i2) || f(n2, i2) || An(n2, e2, i2)
    ? n2
    : A(n2) % 2 === 1
      ? e2.endsWith("*")
        ? `${n2}*`
        : `${n2}**`
      : n2;
};
var Bn = (n2, r2, e2) => {
  if (!r2 || d.test(r2)) return true;
  let s2 = n2.substring(0, e2).lastIndexOf(`
`),
    o2 = s2 === -1 ? 0 : s2 + 1,
    t2 = n2.substring(o2, e2);
  return b2.test(t2) &&
    r2.includes(`
`)
    ? true
    : p2(n2, e2, "_");
};
export var Q = (n2) => {
  let r2 = n2.match(N);
  if (!r2) {
    let o2 = n2.match(G);
    if (o2) {
      let t2 = n2.lastIndexOf(o2[1]);
      if (!(c2(n2, t2) || f(n2, t2)) && v(n2) % 2 === 1) return `${n2}_`;
    }
    return n2;
  }
  let e2 = r2[2],
    i2 = n2.lastIndexOf(r2[1]);
  return c2(n2, i2) || f(n2, i2) || Bn(n2, e2, i2)
    ? n2
    : v(n2) % 2 === 1
      ? `${n2}__`
      : n2;
};
var Sn = (n2) => {
  let r2 = false;
  for (let e2 = 0; e2 < n2.length; e2 += 1) {
    if (
      n2[e2] === "`" &&
      e2 + 2 < n2.length &&
      n2[e2 + 1] === "`" &&
      n2[e2 + 2] === "`"
    ) {
      ((r2 = !r2), (e2 += 2));
      continue;
    }
    if (
      !r2 &&
      n2[e2] === "*" &&
      n2[e2 - 1] !== "*" &&
      n2[e2 + 1] !== "*" &&
      n2[e2 - 1] !== "\\" &&
      !h(n2, e2)
    ) {
      let i2 = e2 > 0 ? n2[e2 - 1] : "",
        s2 = e2 < n2.length - 1 ? n2[e2 + 1] : "";
      if (
        ((!i2 ||
          i2 === " " ||
          i2 === "	" ||
          i2 ===
            `
`) &&
          (!s2 ||
            s2 === " " ||
            s2 === "	" ||
            s2 ===
              `
`)) ||
        (i2 && s2 && g(i2) && g(s2))
      )
        continue;
      return e2;
    }
  }
  return -1;
};
export var Z = (n2) => {
  if (!n2.match(R)) return n2;
  let e2 = Sn(n2);
  if (e2 === -1 || c2(n2, e2) || f(n2, e2)) return n2;
  let i2 = n2.substring(e2 + 1);
  return !i2 || d.test(i2) ? n2 : Y(n2) % 2 === 1 ? `${n2}*` : n2;
};
var $n = (n2) => {
  let r2 = A(n2),
    e2 = Y(n2);
  return r2 % 2 === 0 && e2 % 2 === 0;
};
var On = (n2, r2, e2) =>
  !r2 || d.test(r2) || c2(n2, e2) || f(n2, e2) ? true : p2(n2, e2, "*");
export var V2 = (n2) => {
  if (w2.test(n2)) return n2;
  let r2 = n2.match(y);
  if (!r2) return n2;
  let e2 = r2[2],
    i2 = n2.lastIndexOf(r2[1]);
  return On(n2, e2, i2)
    ? n2
    : Cn(n2) % 2 === 1
      ? $n(n2)
        ? n2
        : `${n2}***`
      : n2;
};
