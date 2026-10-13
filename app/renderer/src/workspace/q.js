// q.js
import {
  A as countDoubleAsteriskMarkers,
  c2 as isInsideMarkdownCode,
  f as isInsideInlineCode,
  g as isWordCharacter,
  h as isInsideMath,
} from "./build-inspiration-media-showcase-collections.js";
import { d as onlyWhitespaceOrMarkdownMarkersPattern, U as trailingUnderscorePattern } from "../vendor.js";
var hasClosingParenBeforeLineBreak = (text, position) => {
  for (let scanIndex = position; scanIndex < text.length; scanIndex += 1) {
    if (text[scanIndex] === ")") return true;
    if (
      text[scanIndex] ===
      `
`
    )
      return false;
  }
  return false;
};
var isInsideMarkdownLinkDestination = (text, position) => {
  for (let scanIndex = position - 1; scanIndex >= 0; scanIndex -= 1) {
    if (text[scanIndex] === ")") return false;
    if (text[scanIndex] === "(")
      return scanIndex > 0 && text[scanIndex - 1] === "]" ? hasClosingParenBeforeLineBreak(text, position) : false;
    if (
      text[scanIndex] ===
      `
`
    )
      return false;
  }
  return false;
};
var isInsideAngleBracketTag = (text, position) => {
  for (let scanIndex = position - 1; scanIndex >= 0; scanIndex -= 1) {
    if (text[scanIndex] === ">") return false;
    if (text[scanIndex] === "<") {
      let tagStartCharacter = scanIndex + 1 < text.length ? text[scanIndex + 1] : "";
      return (tagStartCharacter >= "a" && tagStartCharacter <= "z") || (tagStartCharacter >= "A" && tagStartCharacter <= "Z") || tagStartCharacter === "/";
    }
    if (
      text[scanIndex] ===
      `
`
    )
      return false;
  }
  return false;
};
var isUnderscoreExcludedFromEmphasis = (text, position, previousCharacter, nextCharacter) =>
  !!(
    previousCharacter === "\\" ||
    (text.includes("$") && isInsideMath(text, position)) ||
    isInsideMarkdownLinkDestination(text, position) ||
    isInsideAngleBracketTag(text, position) ||
    previousCharacter === "_" ||
    nextCharacter === "_" ||
    (previousCharacter && nextCharacter && isWordCharacter(previousCharacter) && isWordCharacter(nextCharacter))
  );
var countValidUnderscoreDelimiters = (text) => {
  let delimiterCount = 0,
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
    if (insideFencedCode || text[scanIndex] !== "_") continue;
    let previousCharacter = scanIndex > 0 ? text[scanIndex - 1] : "",
      nextCharacter = scanIndex < textLength - 1 ? text[scanIndex + 1] : "";
    isUnderscoreExcludedFromEmphasis(text, scanIndex, previousCharacter, nextCharacter) || (delimiterCount += 1);
  }
  return delimiterCount;
};
var findOpeningUnderscoreDelimiter = (text) => {
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
      text[scanIndex] === "_" &&
      text[scanIndex - 1] !== "_" &&
      text[scanIndex + 1] !== "_" &&
      text[scanIndex - 1] !== "\\" &&
      !isInsideMath(text, scanIndex) &&
      !isInsideMarkdownLinkDestination(text, scanIndex)
    ) {
      let previousCharacter = scanIndex > 0 ? text[scanIndex - 1] : "",
        nextCharacter = scanIndex < text.length - 1 ? text[scanIndex + 1] : "";
      if (previousCharacter && nextCharacter && isWordCharacter(previousCharacter) && isWordCharacter(nextCharacter)) continue;
      return scanIndex;
    }
  }
  return -1;
};
var appendClosingUnderscore = (text) => {
  let endIndex = text.length;
  for (
    ;
    endIndex > 0 &&
    text[endIndex - 1] ===
      `
`;
  )
    endIndex -= 1;
  if (endIndex < text.length) {
    let textBeforeTrailingNewlines = text.slice(0, endIndex),
      trailingNewlines = text.slice(endIndex);
    return `${textBeforeTrailingNewlines}_${trailingNewlines}`;
  }
  return `${text}_`;
};
var appendUnderscoreBeforeTrailingAsterisks = (text) => {
  if (!text.endsWith("**")) return null;
  let textWithoutTrailingAsterisks = text.slice(0, -2);
  if (countDoubleAsteriskMarkers(textWithoutTrailingAsterisks) % 2 !== 1) return null;
  let doubleAsteriskIndex = textWithoutTrailingAsterisks.indexOf("**"),
    underscoreIndex = findOpeningUnderscoreDelimiter(textWithoutTrailingAsterisks);
  return doubleAsteriskIndex !== -1 && underscoreIndex !== -1 && doubleAsteriskIndex < underscoreIndex ? `${textWithoutTrailingAsterisks}_**` : null;
};
export var J2 = (text) => {
  if (!text.match(trailingUnderscorePattern)) return text;
  let openingUnderscoreIndex = findOpeningUnderscoreDelimiter(text);
  if (openingUnderscoreIndex === -1) return text;
  let trailingText = text.substring(openingUnderscoreIndex + 1);
  if (!trailingText || onlyWhitespaceOrMarkdownMarkersPattern.test(trailingText) || isInsideMarkdownCode(text, openingUnderscoreIndex) || isInsideInlineCode(text, openingUnderscoreIndex)) return text;
  if (countValidUnderscoreDelimiters(text) % 2 === 1) {
    let repairedText = appendUnderscoreBeforeTrailingAsterisks(text);
    return repairedText !== null ? repairedText : appendClosingUnderscore(text);
  }
  return text;
};
