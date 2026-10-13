// build-inspiration-media-showcase-collections.js
import { b2 as unorderedListMarkerPattern, d as markdownDelimiterOrWhitespacePattern, H as wordCharacterPattern, M as doubleAsteriskMatchPattern, N as doubleUnderscoreMatchPattern, R$1 as singleAsteriskMatchPattern, raw, w2 as excessiveAsteriskRunPattern, y$1 as tripleAsteriskMatchPattern } from "../vendor.js";
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
export function resolveHomeFeaturedSkillPrompt(skill, preset, isZh) {
  if (isZh) return preset?.prompt || skill.guidePrompt || skill.guidePromptEn;
  return preset?.promptEn || skill.guidePromptEn || skill.guidePrompt;
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
export var c2 = (text, position) => {
  let insideInlineCode = false,
    insideFencedCode = false;
  for (let scanIndex = 0; scanIndex < position; scanIndex += 1) {
    if (text[scanIndex] === "\\" && scanIndex + 1 < text.length && text[scanIndex + 1] === "`") {
      scanIndex += 1;
      continue;
    }
    if (text.substring(scanIndex, scanIndex + 3) === "```") {
      ((insideFencedCode = !insideFencedCode), (scanIndex += 2));
      continue;
    }
    !insideFencedCode && text[scanIndex] === "`" && (insideInlineCode = !insideInlineCode);
  }
  return insideInlineCode || insideFencedCode;
};
var isFenceMarkerAtPosition = (text, position) => {
  let hasFenceStartingAtPosition = text.substring(position, position + 3) === "```",
    hasFenceBeforePosition = position > 0 && text.substring(position - 1, position + 2) === "```",
    hasFenceEndingAtPosition = position > 1 && text.substring(position - 2, position + 1) === "```";
  return hasFenceStartingAtPosition || hasFenceBeforePosition || hasFenceEndingAtPosition;
};
export var L = (text) => {
  let backtickCount = 0;
  for (let scanIndex = 0; scanIndex < text.length; scanIndex += 1) {
    if (text[scanIndex] === "\\" && scanIndex + 1 < text.length && text[scanIndex + 1] === "`") {
      scanIndex += 1;
      continue;
    }
    text[scanIndex] === "`" && !isFenceMarkerAtPosition(text, scanIndex) && (backtickCount += 1);
  }
  return backtickCount;
};
export var f = (text, position) => {
  let insideInlineCode = false,
    insideFencedCode = false,
    inlineCodeStart = -1;
  for (let scanIndex = 0; scanIndex < text.length; scanIndex += 1) {
    if (text[scanIndex] === "\\" && scanIndex + 1 < text.length && text[scanIndex + 1] === "`") {
      scanIndex += 1;
      continue;
    }
    if (text.substring(scanIndex, scanIndex + 3) === "```") {
      ((insideFencedCode = !insideFencedCode), (scanIndex += 2));
      continue;
    }
    if (!insideFencedCode && text[scanIndex] === "`")
      if (insideInlineCode) {
        if (inlineCodeStart < position && position < scanIndex) return true;
        ((insideInlineCode = false), (inlineCodeStart = -1));
      } else ((insideInlineCode = true), (inlineCodeStart = scanIndex));
  }
  return false;
};
var listItemGreaterThanNumberPattern = /^(\s*(?:[-*+]|\d+[.)]) +)>(=?\s*[$]?\d)/gm;
export var E = (text) =>
  !text || typeof text != "string" || !text.includes(">")
    ? text
    : text.replace(listItemGreaterThanNumberPattern, (matchText, listPrefix, comparisonOperand, matchOffset) => (c2(text, matchOffset) ? matchText : `${listPrefix}\\>${comparisonOperand}`));
var closingUnderscorePattern = /(__)([^_]+)_$/;
export var F = /(~~)([^~]+)~$/;
export var T = /~~/g;
export var g = (character) => {
  if (!character) return false;
  let characterCode = character.charCodeAt(0);
  return (characterCode >= 48 && characterCode <= 57) ||
    (characterCode >= 65 && characterCode <= 90) ||
    (characterCode >= 97 && characterCode <= 122) ||
    characterCode === 95
    ? true
    : wordCharacterPattern.test(character);
};
export var X = (text, closingBracketIndex) => {
  let bracketDepth = 1;
  for (let scanIndex = closingBracketIndex - 1; scanIndex >= 0; scanIndex -= 1)
    if (text[scanIndex] === "]") bracketDepth += 1;
    else if (text[scanIndex] === "[" && ((bracketDepth -= 1), bracketDepth === 0)) return scanIndex;
  return -1;
};
export var C2 = (text, openingBracketIndex) => {
  let bracketDepth = 1;
  for (let scanIndex = openingBracketIndex + 1; scanIndex < text.length; scanIndex += 1)
    if (text[scanIndex] === "[") bracketDepth += 1;
    else if (text[scanIndex] === "]" && ((bracketDepth -= 1), bracketDepth === 0)) return scanIndex;
  return -1;
};
export var h = (text, position) => {
  let insideInlineMath = false,
    insideDisplayMath = false;
  for (let scanIndex = 0; scanIndex < text.length && scanIndex < position; scanIndex += 1) {
    if (text[scanIndex] === "\\" && text[scanIndex + 1] === "$") {
      scanIndex += 1;
      continue;
    }
    text[scanIndex] === "$" &&
      (text[scanIndex + 1] === "$"
        ? ((insideDisplayMath = !insideDisplayMath), (scanIndex += 1), (insideInlineMath = false))
        : insideDisplayMath || (insideInlineMath = !insideInlineMath));
  }
  return insideInlineMath || insideDisplayMath;
};
var isThematicBreakLine = (text, position, markerCharacter) => {
  let lineStartIndex = 0;
  for (let lineIndex = position - 1; lineIndex >= 0; lineIndex -= 1)
    if (
      text[lineIndex] ===
      `
`
    ) {
      lineStartIndex = lineIndex + 1;
      break;
    }
  let lineEndIndex = text.length;
  for (let lineIndex = position; lineIndex < text.length; lineIndex += 1)
    if (
      text[lineIndex] ===
      `
`
    ) {
      lineEndIndex = lineIndex;
      break;
    }
  let lineText = text.substring(lineStartIndex, lineEndIndex),
    markerCount = 0,
    hasOtherContent = false;
  for (let character of lineText)
    if (character === markerCharacter) markerCount += 1;
    else if (character !== " " && character !== "	") {
      hasOtherContent = true;
      break;
    }
  return markerCount >= 3 && !hasOtherContent;
};
var isValidEmphasisDelimiter = (text, position, previousCharacter, nextCharacter) =>
  previousCharacter === "\\" || (text.includes("$") && h(text, position))
    ? true
    : previousCharacter !== "*" && nextCharacter === "*"
      ? (position < text.length - 2 ? text[position + 2] : "") !== "*"
      : !!(
          previousCharacter === "*" ||
          (previousCharacter && nextCharacter && g(previousCharacter) && g(nextCharacter)) ||
          ((!previousCharacter ||
            previousCharacter === " " ||
            previousCharacter === "	" ||
            previousCharacter ===
              `
`) &&
            (!nextCharacter ||
              nextCharacter === " " ||
              nextCharacter === "	" ||
              nextCharacter ===
                `
`))
        );
var countValidAsteriskDelimiters = (text) => {
  let validMarkerCount = 0,
    insideFencedCode = false,
    textLength = text.length;
  for (let scanIndex = 0; scanIndex < textLength; scanIndex += 1) {
    if (
      text[scanIndex] === "`" &&
      scanIndex + 2 < textLength &&
      text[scanIndex + 1] === "`" &&
      text[scanIndex + 2] === "`"
    ) {
      ((insideFencedCode = !insideFencedCode), (scanIndex += 2));
      continue;
    }
    if (insideFencedCode || text[scanIndex] !== "*") continue;
    let previousCharacter = scanIndex > 0 ? text[scanIndex - 1] : "",
      nextCharacter = scanIndex < textLength - 1 ? text[scanIndex + 1] : "";
    isValidEmphasisDelimiter(text, scanIndex, previousCharacter, nextCharacter) || (validMarkerCount += 1);
  }
  return validMarkerCount;
};
var countTripleAsteriskRuns = (text) => {
  let tripleMarkerCount = 0,
    asteriskRunLength = 0,
    insideFencedCode = false;
  for (let scanIndex = 0; scanIndex < text.length; scanIndex += 1) {
    if (
      text[scanIndex] === "`" &&
      scanIndex + 2 < text.length &&
      text[scanIndex + 1] === "`" &&
      text[scanIndex + 2] === "`"
    ) {
      (asteriskRunLength >= 3 && (tripleMarkerCount += Math.floor(asteriskRunLength / 3)), (asteriskRunLength = 0), (insideFencedCode = !insideFencedCode), (scanIndex += 2));
      continue;
    }
    insideFencedCode ||
      (text[scanIndex] === "*"
        ? (asteriskRunLength += 1)
        : (asteriskRunLength >= 3 && (tripleMarkerCount += Math.floor(asteriskRunLength / 3)), (asteriskRunLength = 0)));
  }
  return (asteriskRunLength >= 3 && (tripleMarkerCount += Math.floor(asteriskRunLength / 3)), tripleMarkerCount);
};
export var A = (text) => {
  let doubleAsteriskCount = 0,
    insideFencedCode = false;
  for (let scanIndex = 0; scanIndex < text.length; scanIndex += 1) {
    if (
      text[scanIndex] === "`" &&
      scanIndex + 2 < text.length &&
      text[scanIndex + 1] === "`" &&
      text[scanIndex + 2] === "`"
    ) {
      ((insideFencedCode = !insideFencedCode), (scanIndex += 2));
      continue;
    }
    insideFencedCode ||
      (text[scanIndex] === "*" &&
        scanIndex + 1 < text.length &&
        text[scanIndex + 1] === "*" &&
        ((doubleAsteriskCount += 1), (scanIndex += 1)));
  }
  return doubleAsteriskCount;
};
var countDoubleUnderscoreMarkers = (text) => {
  let doubleUnderscoreCount = 0,
    insideFencedCode = false;
  for (let scanIndex = 0; scanIndex < text.length; scanIndex += 1) {
    if (
      text[scanIndex] === "`" &&
      scanIndex + 2 < text.length &&
      text[scanIndex + 1] === "`" &&
      text[scanIndex + 2] === "`"
    ) {
      ((insideFencedCode = !insideFencedCode), (scanIndex += 2));
      continue;
    }
    insideFencedCode ||
      (text[scanIndex] === "_" &&
        scanIndex + 1 < text.length &&
        text[scanIndex + 1] === "_" &&
        ((doubleUnderscoreCount += 1), (scanIndex += 1)));
  }
  return doubleUnderscoreCount;
};
var isAsteriskEmphasisInListContext = (text, delimiterContent, delimiterIndex) => {
  if (!delimiterContent || markdownDelimiterOrWhitespacePattern.test(delimiterContent)) return true;
  let lineBreakIndex = text.substring(0, delimiterIndex).lastIndexOf(`
`),
    lineStartIndex = lineBreakIndex === -1 ? 0 : lineBreakIndex + 1,
    linePrefix = text.substring(lineStartIndex, delimiterIndex);
  return unorderedListMarkerPattern.test(linePrefix) &&
    delimiterContent.includes(`
`)
    ? true
    : isThematicBreakLine(text, delimiterIndex, "*");
};
export var j = (text) => {
  let match = text.match(doubleAsteriskMatchPattern);
  if (!match) return text;
  let delimiterContent = match[2],
    delimiterIndex = text.lastIndexOf(match[1]);
  return c2(text, delimiterIndex) || f(text, delimiterIndex) || isAsteriskEmphasisInListContext(text, delimiterContent, delimiterIndex)
    ? text
    : A(text) % 2 === 1
      ? delimiterContent.endsWith("*")
        ? `${text}*`
        : `${text}**`
      : text;
};
var isUnderscoreEmphasisInListContext = (text, delimiterContent, delimiterIndex) => {
  if (!delimiterContent || markdownDelimiterOrWhitespacePattern.test(delimiterContent)) return true;
  let lineBreakIndex = text.substring(0, delimiterIndex).lastIndexOf(`
`),
    lineStartIndex = lineBreakIndex === -1 ? 0 : lineBreakIndex + 1,
    linePrefix = text.substring(lineStartIndex, delimiterIndex);
  return unorderedListMarkerPattern.test(linePrefix) &&
    delimiterContent.includes(`
`)
    ? true
    : isThematicBreakLine(text, delimiterIndex, "_");
};
export var Q = (text) => {
  let match = text.match(doubleUnderscoreMatchPattern);
  if (!match) {
    let strongUnderscoreMatch = text.match(closingUnderscorePattern);
    if (strongUnderscoreMatch) {
      let delimiterIndex = text.lastIndexOf(strongUnderscoreMatch[1]);
      if (!(c2(text, delimiterIndex) || f(text, delimiterIndex)) && countDoubleUnderscoreMarkers(text) % 2 === 1) return `${text}_`;
    }
    return text;
  }
  let delimiterContent = match[2],
    delimiterIndex = text.lastIndexOf(match[1]);
  return c2(text, delimiterIndex) || f(text, delimiterIndex) || isUnderscoreEmphasisInListContext(text, delimiterContent, delimiterIndex)
    ? text
    : countDoubleUnderscoreMarkers(text) % 2 === 1
      ? `${text}__`
      : text;
};
var findSingleAsteriskDelimiter = (text) => {
  let insideFencedCode = false;
  for (let scanIndex = 0; scanIndex < text.length; scanIndex += 1) {
    if (
      text[scanIndex] === "`" &&
      scanIndex + 2 < text.length &&
      text[scanIndex + 1] === "`" &&
      text[scanIndex + 2] === "`"
    ) {
      ((insideFencedCode = !insideFencedCode), (scanIndex += 2));
      continue;
    }
    if (
      !insideFencedCode &&
      text[scanIndex] === "*" &&
      text[scanIndex - 1] !== "*" &&
      text[scanIndex + 1] !== "*" &&
      text[scanIndex - 1] !== "\\" &&
      !h(text, scanIndex)
    ) {
      let previousCharacter = scanIndex > 0 ? text[scanIndex - 1] : "",
        nextCharacter = scanIndex < text.length - 1 ? text[scanIndex + 1] : "";
      if (
        ((!previousCharacter ||
          previousCharacter === " " ||
          previousCharacter === "	" ||
          previousCharacter ===
            `
`) &&
          (!nextCharacter ||
            nextCharacter === " " ||
            nextCharacter === "	" ||
            nextCharacter ===
              `
`)) ||
        (previousCharacter && nextCharacter && g(previousCharacter) && g(nextCharacter))
      )
        continue;
      return scanIndex;
    }
  }
  return -1;
};
export var Z = (text) => {
  if (!text.match(singleAsteriskMatchPattern)) return text;
  let delimiterIndex = findSingleAsteriskDelimiter(text);
  if (delimiterIndex === -1 || c2(text, delimiterIndex) || f(text, delimiterIndex)) return text;
  let trailingText = text.substring(delimiterIndex + 1);
  return !trailingText || markdownDelimiterOrWhitespacePattern.test(trailingText) ? text : countValidAsteriskDelimiters(text) % 2 === 1 ? `${text}*` : text;
};
var hasBalancedAsteriskDelimiters = (text) => {
  let doubleAsteriskCount = A(text),
    singleAsteriskCount = countValidAsteriskDelimiters(text);
  return doubleAsteriskCount % 2 === 0 && singleAsteriskCount % 2 === 0;
};
var isAsteriskDelimiterInListContext = (text, delimiterContent, delimiterIndex) =>
  !delimiterContent || markdownDelimiterOrWhitespacePattern.test(delimiterContent) || c2(text, delimiterIndex) || f(text, delimiterIndex) ? true : isThematicBreakLine(text, delimiterIndex, "*");
export var V2 = (text) => {
  if (excessiveAsteriskRunPattern.test(text)) return text;
  let match = text.match(tripleAsteriskMatchPattern);
  if (!match) return text;
  let tripleAsteriskContent = match[2],
    delimiterIndex = text.lastIndexOf(match[1]);
  return isAsteriskDelimiterInListContext(text, tripleAsteriskContent, delimiterIndex)
    ? text
    : countTripleAsteriskRuns(text) % 2 === 1
      ? hasBalancedAsteriskDelimiters(text)
        ? text
        : `${text}***`
      : text;
};
