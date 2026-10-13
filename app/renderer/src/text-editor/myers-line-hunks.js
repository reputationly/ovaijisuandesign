// myers-line-hunks.js

const MYERS_MAX_D = 2e3;

export function myersLineHunks(oldLines, newLines) {
  let start = 0;
  const oldLen = oldLines.length;
  const newLen = newLines.length;
  while (
    start < oldLen &&
    start < newLen &&
    oldLines[start] === newLines[start]
  )
    start += 1;
  let oldEnd = oldLen;
  let newEnd = newLen;
  while (
    oldEnd > start &&
    newEnd > start &&
    oldLines[oldEnd - 1] === newLines[newEnd - 1]
  ) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  const oldSlice = oldLines.slice(start, oldEnd);
  const newSlice = newLines.slice(start, newEnd);
  const oldLength = oldSlice.length;
  const newLength = newSlice.length;
  if (oldLength === 0 && newLength === 0) return [];
  if (oldLength === 0)
    return [
      {
        oldStart: start,
        oldCount: 0,
        newStart: start,
        newCount: newLength,
      },
    ];
  if (newLength === 0)
    return [
      {
        oldStart: start,
        oldCount: oldLength,
        newStart: start,
        newCount: 0,
      },
    ];
  const max = Math.min(oldLength + newLength, MYERS_MAX_D);
  const offset = max;
  let frontier = new Int32Array(2 * max + 2);
  const trace = [];
  let foundD = -1;
  for (let editDistance = 0; editDistance <= max; editDistance += 1) {
    trace.push(frontier.slice());
    const next = frontier.slice();
    for (let diagonal = -editDistance; diagonal <= editDistance; diagonal += 2) {
      if (diagonal < -max || diagonal > max) continue;
      let x;
      if (
        diagonal === -editDistance ||
        (diagonal !== editDistance && frontier[diagonal - 1 + offset] < frontier[diagonal + 1 + offset])
      ) {
        x = frontier[diagonal + 1 + offset];
      } else {
        x = frontier[diagonal - 1 + offset] + 1;
      }
      let y = x - diagonal;
      while (x < oldLength && y < newLength && oldSlice[x] === newSlice[y]) {
        x += 1;
        y += 1;
      }
      next[diagonal + offset] = x;
      if (x >= oldLength && y >= newLength) {
        foundD = editDistance;
        break;
      }
    }
    frontier = next;
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
      (diagonal !== editDistance && prev[diagonal - 1 + offset] < prev[diagonal + 1 + offset])
    ) {
      prevK = diagonal + 1;
    } else {
      prevK = diagonal - 1;
    }
    const prevX = prev[prevK + offset];
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
  let oldLine = start;
  let newLine = start;
  let current = null;
  for (const op of ops) {
    if (op === "equal") {
      if (current) {
        hunks.push(current);
        current = null;
      }
      oldLine += 1;
      newLine += 1;
      continue;
    }
    current ??= {
      oldStart: oldLine,
      oldCount: 0,
      newStart: newLine,
      newCount: 0,
    };
    if (op === "delete") {
      current.oldCount += 1;
      oldLine += 1;
    } else {
      current.newCount += 1;
      newLine += 1;
    }
  }
  if (current) hunks.push(current);
  return hunks;
}
