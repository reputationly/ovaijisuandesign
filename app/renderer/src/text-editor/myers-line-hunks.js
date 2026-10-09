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
  const a2 = oldLines.slice(start2, oldEnd);
  const b3 = newLines.slice(start2, newEnd);
  const n2 = a2.length;
  const m3 = b3.length;
  if (n2 === 0 && m3 === 0) return [];
  if (n2 === 0)
    return [
      {
        oldStart: start2,
        oldCount: 0,
        newStart: start2,
        newCount: m3,
      },
    ];
  if (m3 === 0)
    return [
      {
        oldStart: start2,
        oldCount: n2,
        newStart: start2,
        newCount: 0,
      },
    ];
  const max2 = Math.min(n2 + m3, MYERS_MAX_D);
  const offset2 = max2;
  let v2 = new Int32Array(2 * max2 + 2);
  const trace = [];
  let foundD = -1;
  for (let d2 = 0; d2 <= max2; d2 += 1) {
    trace.push(v2.slice());
    const next2 = v2.slice();
    for (let k2 = -d2; k2 <= d2; k2 += 2) {
      if (k2 < -max2 || k2 > max2) continue;
      let x22;
      if (
        k2 === -d2 ||
        (k2 !== d2 && v2[k2 - 1 + offset2] < v2[k2 + 1 + offset2])
      ) {
        x22 = v2[k2 + 1 + offset2];
      } else {
        x22 = v2[k2 - 1 + offset2] + 1;
      }
      let y22 = x22 - k2;
      while (x22 < n2 && y22 < m3 && a2[x22] === b3[y22]) {
        x22 += 1;
        y22 += 1;
      }
      next2[k2 + offset2] = x22;
      if (x22 >= n2 && y22 >= m3) {
        foundD = d2;
        break;
      }
    }
    v2 = next2;
    if (foundD >= 0) break;
  }
  if (foundD < 0) return null;
  const ops = [];
  let x2 = n2;
  let y4 = m3;
  for (let d2 = foundD; d2 > 0; d2 -= 1) {
    const prev = trace[d2];
    if (!prev) return null;
    const k2 = x2 - y4;
    let prevK;
    if (
      k2 === -d2 ||
      (k2 !== d2 && prev[k2 - 1 + offset2] < prev[k2 + 1 + offset2])
    ) {
      prevK = k2 + 1;
    } else {
      prevK = k2 - 1;
    }
    const prevX = prev[prevK + offset2];
    const prevY = prevX - prevK;
    while (x2 > prevX && y4 > prevY) {
      ops.push("equal");
      x2 -= 1;
      y4 -= 1;
    }
    if (x2 === prevX) {
      ops.push("insert");
      y4 -= 1;
    } else {
      ops.push("delete");
      x2 -= 1;
    }
  }
  while (x2 > 0 && y4 > 0) {
    ops.push("equal");
    x2 -= 1;
    y4 -= 1;
  }
  while (x2 > 0) {
    ops.push("delete");
    x2 -= 1;
  }
  while (y4 > 0) {
    ops.push("insert");
    y4 -= 1;
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
