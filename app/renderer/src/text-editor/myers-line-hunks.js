// myers-line-hunks.js

const MYERS_MAX_D = 2e3;

export function myersLineHunks(oldLines, newLines) {
  let start2 = 0;
  const oldLen = oldLines.length;
  const newLen = newLines.length;
  while (
    start2 < oldLen &&
    start2 < newLen &&
    oldLines[start2] === newLines[start2]
  )
    start2 += 1;
  let oldEnd = oldLen;
  let newEnd = newLen;
  while (
    oldEnd > start2 &&
    newEnd > start2 &&
    oldLines[oldEnd - 1] === newLines[newEnd - 1]
  ) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  const oldSlice = oldLines.slice(start2, oldEnd);
  const newSlice = newLines.slice(start2, newEnd);
  const oldLength = oldSlice.length;
  const newLength = newSlice.length;
  if (oldLength === 0 && newLength === 0) return [];
  if (oldLength === 0)
    return [
      {
        oldStart: start2,
        oldCount: 0,
        newStart: start2,
        newCount: newLength,
      },
    ];
  if (newLength === 0)
    return [
      {
        oldStart: start2,
        oldCount: oldLength,
        newStart: start2,
        newCount: 0,
      },
    ];
  const max2 = Math.min(oldLength + newLength, MYERS_MAX_D);
  const offset2 = max2;
  let frontier = new Int32Array(2 * max2 + 2);
  const trace = [];
  let foundD = -1;
  for (let editDistance = 0; editDistance <= max2; editDistance += 1) {
    trace.push(frontier.slice());
    const next2 = frontier.slice();
    for (let diagonal = -editDistance; diagonal <= editDistance; diagonal += 2) {
      if (diagonal < -max2 || diagonal > max2) continue;
      let x;
      if (
        diagonal === -editDistance ||
        (diagonal !== editDistance && frontier[diagonal - 1 + offset2] < frontier[diagonal + 1 + offset2])
      ) {
        x = frontier[diagonal + 1 + offset2];
      } else {
        x = frontier[diagonal - 1 + offset2] + 1;
      }
      let y = x - diagonal;
      while (x < oldLength && y < newLength && oldSlice[x] === newSlice[y]) {
        x += 1;
        y += 1;
      }
      next2[diagonal + offset2] = x;
      if (x >= oldLength && y >= newLength) {
        foundD = editDistance;
        break;
      }
    }
    frontier = next2;
    if (foundD >= 0) break;
  }
  if (foundD < 0) return null;
  const ops = [];
  let x = oldLength;
  let y = newLength;
  for (let editDistance = foundD; editDistance > 0; editDistance -= 1) {
    const prev = trace[editDistance];
    if (!prev) return null;
    const diagonal = x - y;
    let prevK;
    if (
      diagonal === -editDistance ||
      (diagonal !== editDistance && prev[diagonal - 1 + offset2] < prev[diagonal + 1 + offset2])
    ) {
      prevK = diagonal + 1;
    } else {
      prevK = diagonal - 1;
    }
    const prevX = prev[prevK + offset2];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push("equal");
      x -= 1;
      y -= 1;
    }
    if (x === prevX) {
      ops.push("insert");
      y -= 1;
    } else {
      ops.push("delete");
      x -= 1;
    }
  }
  while (x > 0 && y > 0) {
    ops.push("equal");
    x -= 1;
    y -= 1;
  }
  while (x > 0) {
    ops.push("delete");
    x -= 1;
  }
  while (y > 0) {
    ops.push("insert");
    y -= 1;
  }
  ops.reverse();
  const hunks = [];
  let oldLine = start2;
  let newLine = start2;
  let current2 = null;
  for (const op of ops) {
    if (op === "equal") {
      if (current2) {
        hunks.push(current2);
        current2 = null;
      }
      oldLine += 1;
      newLine += 1;
      continue;
    }
    current2 ??= {
      oldStart: oldLine,
      oldCount: 0,
      newStart: newLine,
      newCount: 0,
    };
    if (op === "delete") {
      current2.oldCount += 1;
      oldLine += 1;
    } else {
      current2.newCount += 1;
      newLine += 1;
    }
  }
  if (current2) hunks.push(current2);
  return hunks;
}
