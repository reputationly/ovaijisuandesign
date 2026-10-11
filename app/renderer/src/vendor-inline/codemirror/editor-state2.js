// EditorState / Compartment 用发布包。括号扫描还留在这里，它写的是 configuration2 里那张 types 表。
import { types } from "../../text-editor/configuration2.js";
export { Compartment, EditorState as EditorState2 } from "@codemirror/state";

const Brackets = Object.create(null);
const BracketStack = [];
for (let p3 of ["()", "[]", "{}"]) {
  let l2 = p3.charCodeAt(0),
    r2 = p3.charCodeAt(1);
  Brackets[l2] = r2;
  Brackets[r2] = -l2;
}
export function processBracketPairs(line, rFrom, rTo, isolates, outerType) {
  let oppositeType = outerType == 1 ? 2 : 1;
  for (let iI = 0, sI = 0, context = 0; iI <= isolates.length; iI++) {
    let from2 = iI ? isolates[iI - 1].to : rFrom,
      to = iI < isolates.length ? isolates[iI].from : rTo;
    for (let i2 = from2, ch, br, type2; i2 < to; i2++) {
      if ((br = Brackets[(ch = line.charCodeAt(i2))])) {
        if (br < 0) {
          for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
            if (BracketStack[sJ + 1] == -br) {
              let flags = BracketStack[sJ + 2];
              let type3 =
                flags & 2 ? outerType : !(flags & 4) ? 0 : flags & 1 ? oppositeType : outerType;
              if (type3) types[i2] = types[BracketStack[sJ]] = type3;
              sI = sJ;
              break;
            }
          }
        } else if (BracketStack.length == 189) {
          break;
        } else {
          BracketStack[sI++] = i2;
          BracketStack[sI++] = ch;
          BracketStack[sI++] = context;
        }
      } else if ((type2 = types[i2]) == 2 || type2 == 1) {
        let embed = type2 == outerType;
        context = embed ? 0 : 1;
        for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
          let cur = BracketStack[sJ + 2];
          if (cur & 2) break;
          if (embed) {
            BracketStack[sJ + 2] |= 2;
          } else {
            if (cur & 4) break;
            BracketStack[sJ + 2] |= 4;
          }
        }
      }
    }
  }
}
