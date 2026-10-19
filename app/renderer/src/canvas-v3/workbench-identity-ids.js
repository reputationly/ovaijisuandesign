/**
 * 工作台身份相关的几个纯函数 —— 从产物取回（第 106 轮）。
 *
 * `useWorkbenchIdentity` 只依赖这几个（不是整片 native 基础设施）：
 *   - `workbenchIdentity`：按 key 生成并缓存 UUID
 *   - `deriveGenerationSubject`：从 userId/groupId/billingScope 派生代际主体
 *   - `isPageStorageIdentity`：判断身份是否满足页存储要求
 *   - `sha256Hex`：**同步** SHA-256（产物里是手写实现，`opaque()` 需要同步）
 *
 * 只搬实现，未改语义。
 */
// SHA-256 轮常量（第 138 轮补：`K2[i2]` 缺定义）
const K2 = [
  0x428a2f98,
  0x71374491,
  0xb5c0fbcf,
  0xe9b5dba5,
  0x3956c25b,
  0x59f111f1,
  0x923f82a4,
  0xab1c5ed5,
  0xd807aa98,
  0x12835b01,
  0x243185be,
  0x550c7dc3,
  0x72be5d74,
  0x80deb1fe,
  0x9bdc06a7,
  0xc19bf174,
  0xe49b69c1,
  0xefbe4786,
  0x0fc19dc6,
  0x240ca1cc,
  0x2de92c6f,
  0x4a7484aa,
  0x5cb0a9dc,
  0x76f988da,
  0x983e5152,
  0xa831c66d,
  0xb00327c8,
  0xbf597fc7,
  0xc6e00bf3,
  0xd5a79147,
  0x06ca6351,
  0x14292967,
  0x27b70a85,
  0x2e1b2138,
  0x4d2c6dfc,
  0x53380d13,
  0x650a7354,
  0x766a0abb,
  0x81c2c92e,
  0x92722c85,
  0xa2bfe8a1,
  0xa81a664b,
  0xc24b8b70,
  0xc76c51a3,
  0xd192e819,
  0xd6990624,
  0xf40e3585,
  0x106aa070,
  0x19a4c116,
  0x1e376c08,
  0x2748774c,
  0x34b0bcb5,
  0x391c0cb3,
  0x4ed8aa4a,
  0x5b9cca4f,
  0x682e6ff3,
  0x748f82ee,
  0x78a5636f,
  0x84c87814,
  0x8cc70208,
  0x90befffa,
  0xa4506ceb,
  0xbef9a3f7,
  0xc67178f2,
];

// ==== 逐文件收敛 ====


const opaque = (kind2, parts) => `${kind2[0]}_${sha256Hex(JSON.stringify(["hilo:v3-generation", 1, kind2, ...parts]))}`;

const identities = /* @__PURE__ */ new Map();

function workbenchIdentity(key2) {
  let id2 = identities.get(key2);
  if (!id2) {
    id2 = crypto.randomUUID();
    identities.set(key2, id2);
  }
  return id2;
}

function deriveGenerationSubject(input) {
  if (!input.userId) return void 0;
  return Object.freeze({
    subjectId: opaque("subject", [input.userId, input.groupId ?? "personal"]),
    generationFence: opaque("fence", [`${input.userId}:${input.billingScope ?? ""}`])
  });
}

function isPageStorageIdentity(value) {
  return !!value && [value.workspaceId, value.userId, value.accountKey].every(
    (part) => typeof part === "string" && !!part.trim()
  ) && !!taskRecoveryWorkspaceId(value.workspaceId);
}

function taskRecoveryWorkspaceId(value) {
  if (typeof value !== "string" || !value.trim() || value === "app" || /^https?:\/\//i.test(value))
    return void 0;
  return value;
}

function sha256Hex(text2) {
  const data2 = new TextEncoder().encode(text2);
  const length2 = Math.ceil((data2.length + 9) / 64) * 64;
  const bytes2 = new Uint8Array(length2);
  bytes2.set(data2);
  bytes2[data2.length] = 128;
  const view2 = new DataView(bytes2.buffer);
  const bits = data2.length * 8;
  view2.setUint32(length2 - 8, Math.floor(bits / 2 ** 32));
  view2.setUint32(length2 - 4, bits >>> 0);
  const h2 = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
  const w3 = new Uint32Array(64);
  const rotr = (x2, n2) => x2 >>> n2 | x2 << 32 - n2;
  for (let offset2 = 0; offset2 < length2; offset2 += 64) {
    for (let i2 = 0; i2 < 16; i2++) w3[i2] = view2.getUint32(offset2 + i2 * 4);
    for (let i2 = 16; i2 < 64; i2++) {
      const s0 = rotr(w3[i2 - 15], 7) ^ rotr(w3[i2 - 15], 18) ^ w3[i2 - 15] >>> 3;
      const s1 = rotr(w3[i2 - 2], 17) ^ rotr(w3[i2 - 2], 19) ^ w3[i2 - 2] >>> 10;
      w3[i2] = w3[i2 - 16] + s0 + w3[i2 - 7] + s1 | 0;
    }
    let [a2, b3, c3, d2, e2, f2, g2, k2] = h2;
    for (let i2 = 0; i2 < 64; i2++) {
      const t1 = k2 + (rotr(e2, 6) ^ rotr(e2, 11) ^ rotr(e2, 25)) + (e2 & f2 ^ ~e2 & g2) + K2[i2] + w3[i2] | 0;
      const t2 = (rotr(a2, 2) ^ rotr(a2, 13) ^ rotr(a2, 22)) + (a2 & b3 ^ a2 & c3 ^ b3 & c3) | 0;
      k2 = g2;
      g2 = f2;
      f2 = e2;
      e2 = d2 + t1 | 0;
      d2 = c3;
      c3 = b3;
      b3 = a2;
      a2 = t1 + t2 | 0;
    }
    h2[0] += a2;
    h2[1] += b3;
    h2[2] += c3;
    h2[3] += d2;
    h2[4] += e2;
    h2[5] += f2;
    h2[6] += g2;
    h2[7] += k2;
  }
  return Array.from(h2, (x2) => x2.toString(16).padStart(8, "0")).join("");
}

export {
  sha256Hex,
  opaque,
  identities,
  workbenchIdentity,
  deriveGenerationSubject,
  isPageStorageIdentity,
  taskRecoveryWorkspaceId,
};
