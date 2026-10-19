// 读取 Electron asar 归档：只按头部索引取字节，不解压内部条目、不执行任何代码。
//
// 头部布局（已对 3.0.21 / 4.0.0 两个包实测过）：
//   [0:4]  pickle 长度（恒为 4）
//   [4:8]  header 总长
//   [8:12] payload 长度（= JSON 长度 + 4 字节长度前缀 + 对齐填充）
//   [12:16] JSON 长度
//   数据区起点 = 8 + header 总长，条目里的 offset 相对数据区起点。
//
// 用 node 的 fs 直接读偏移，不走 @electron/asar —— 那条路会把整包读进内存并支持解包，
// 这里只需要「列清单」和「读一段字节」两件事。
import { closeSync, openSync, readSync, statSync } from "node:fs";

const HEADER_BYTES = 16;
const ASAR_BASE_OFFSET = 8;

export class AsarArchive {
  #fd;
  #base;
  #root;

  constructor(filePath) {
    this.#fd = openSync(filePath, "r");
    const head = Buffer.alloc(HEADER_BYTES);
    if (readSync(this.#fd, head, 0, HEADER_BYTES, 0) !== HEADER_BYTES) {
      closeSync(this.#fd);
      throw new Error(`asar 头部读不满 ${HEADER_BYTES} 字节：${filePath}`);
    }
    const headerSize = head.readUInt32LE(4);
    const jsonLength = head.readUInt32LE(12);
    const json = Buffer.alloc(jsonLength);
    const got = readSync(this.#fd, json, 0, jsonLength, HEADER_BYTES);
    if (got !== jsonLength) {
      closeSync(this.#fd);
      throw new Error(`asar 头部 JSON 读不满 ${jsonLength} 字节：${filePath}`);
    }
    this.#root = JSON.parse(json.toString("utf8"));
    this.#base = ASAR_BASE_OFFSET + headerSize;
    if (this.#base > statSync(filePath).size) {
      closeSync(this.#fd);
      throw new Error(`asar 数据区起点 ${this.#base} 超过文件长度：${filePath}`);
    }
  }

  close() {
    closeSync(this.#fd);
  }

  /** 路径 → 目录节点；找不到返回 null。 */
  #node(path) {
    let node = this.#root;
    for (const part of String(path).split("/")) {
      if (part === "") continue;
      if (!node.files || !(part in node.files)) return null;
      node = node.files[part];
    }
    return node;
  }

  /** 展平成 `路径 → { offset, size }`，只含文件。 */
  entries(prefix = "") {
    const out = new Map();
    const start = this.#node(prefix);
    if (!start) return out;
    const walk = (node, path) => {
      for (const [name, child] of Object.entries(node.files ?? {})) {
        const next = path ? `${path}/${name}` : name;
        if (child.files) walk(child, next);
        else out.set(next, { offset: Number(child.offset), size: Number(child.size ?? 0) });
      }
    };
    walk(start, prefix);
    return out;
  }

  read(path) {
    const node = this.#node(path);
    if (!node) throw new Error(`asar 里没有这个路径：${path}`);
    if (node.files) throw new Error(`这是目录不是文件：${path}`);
    const size = Number(node.size ?? 0);
    const buf = Buffer.alloc(size);
    const got = readSync(this.#fd, buf, 0, size, this.#base + Number(node.offset));
    if (got !== size) throw new Error(`读不满 ${size} 字节：${path}`);
    return buf;
  }
}

/** 从 Info.plist 文本取 CFBundleShortVersionString / CFBundleVersion。直接扫文本，无额外依赖。 */
export function readPlistVersion(plistText) {
  const short = /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]*)<\/string>/.exec(plistText);
  const build = /<key>CFBundleVersion<\/key>\s*<string>([^<]*)<\/string>/.exec(plistText);
  return { version: short?.[1] ?? "unknown", build: build?.[1] ?? "unknown" };
}
