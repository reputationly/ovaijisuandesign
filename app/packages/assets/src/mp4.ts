/**
 * 从 MP4 / MOV 里读画面尺寸和时长。
 *
 * ## 为什么要自己解
 *
 * 读不到视频尺寸时，画布上每个视频节点都退回默认的 350x350 **方块**，而视频
 * 本身多半是 16:9 —— 尺寸对不上，怎么刷新都不会变。
 *
 * 不依赖 ffprobe：为两个整数去等一个外部进程不划算，而且它不可用时的表现
 * 正好是"安静地退回方块"。MP4 的尺寸就在 `tkhd` 盒子里，自己解更可靠。
 *
 * ## 只解够用的部分
 *
 * ```text
 * moov
 *  ├─ mvhd            时长（timescale + duration）
 *  └─ trak
 *      ├─ tkhd        画面尺寸（宽高是 16.16 定点数）
 *      └─ ...
 * ```
 *
 * 不递归解全部盒子，按需往下钻。解析失败一律返回 null —— 拿不到尺寸只是退回
 * 默认值，不该让一次资产登记失败。
 */
import { open } from "node:fs/promises";

export interface VideoInfo {
  width: number;
  height: number;
  /** 秒。读不到时是 null。 */
  duration: number | null;
}

/**
 * 盒子头：`[4 字节大小][4 字节类型]`。返回 `[类型, 内容起点, 盒子终点]`。
 * 大小为 1 时后面跟 8 字节的扩展大小（大于 4GB 的文件会用到）；为 0 表示
 * "一直到文件末尾"。
 */
function readBox(buf: Buffer, at: number): [string, number, number] | null {
  if (at + 8 > buf.length) return null;
  const size = buf.readUInt32BE(at);
  const kind = buf.toString("latin1", at + 4, at + 8);
  let body: number;
  let end: number;
  if (size === 1) {
    if (at + 16 > buf.length) return null;
    const big = buf.readBigUInt64BE(at + 8);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    body = at + 16;
    end = at + Number(big);
  } else if (size === 0) {
    body = at + 8;
    end = buf.length;
  } else if (size < 8) {
    // **小于 8 是坏数据。** 不拦的话外层循环的 `at = end` 不前进，变成死循环 ——
    // 一个坏文件能让整个登记流程卡住。
    return null;
  } else {
    body = at + 8;
    end = at + size;
  }
  if (body > buf.length || end > buf.length || end < body) return null;
  return [kind, body, end];
}

function find(buf: Buffer, at: number, end: number, want: string): [number, number] | null {
  while (at < end) {
    const box = readBox(buf, at);
    if (!box) return null;
    const [kind, body, boxEnd] = box;
    if (kind === want) return [body, boxEnd];
    at = boxEnd;
  }
  return null;
}

/** 解析。**读不到就是 null，不抛。** */
export function probeMp4(bytes: Buffer): VideoInfo | null {
  const moov = find(bytes, 0, bytes.length, "moov");
  if (!moov) return null;
  const [moovBody, moovEnd] = moov;

  // 时长在 mvhd 里。拿不到不影响尺寸。
  const mvhd = find(bytes, moovBody, moovEnd, "mvhd");
  const duration = mvhd ? mvhdDuration(bytes, mvhd[0]) : null;

  // 尺寸在 trak/tkhd 里。**一个文件可能有多条 trak**（视频 + 音频），音频轨的
  // tkhd 宽高是 0 —— 要跳过它，否则拿到 0x0，而 0 尺寸的节点在画布上看不见。
  let at = moovBody;
  while (at < moovEnd) {
    const box = readBox(bytes, at);
    if (!box) return null;
    const [kind, body, boxEnd] = box;
    if (kind === "trak") {
      const tkhd = find(bytes, body, boxEnd, "tkhd");
      const size = tkhd ? tkhdSize(bytes, tkhd[0]) : null;
      if (size && size[0] > 0 && size[1] > 0) {
        return { width: size[0], height: size[1], duration };
      }
    }
    at = boxEnd;
  }
  return null;
}

/**
 * `tkhd` 的宽高：在盒子末尾，16.16 定点数。版本 0 的内容是 84 字节、版本 1 是
 * 96（时间字段从 32 位变 64 位）。宽高永远是最后 8 个字节。
 */
function tkhdSize(buf: Buffer, body: number): [number, number] | null {
  const version = buf[body];
  const len = version === 0 ? 84 : version === 1 ? 96 : null;
  if (len === null) return null;
  const end = body + len;
  if (end > buf.length) return null;
  // 四舍五入而不是截断 —— 有些编码器会写 1919.99 这种。
  const round = (v: number) => Math.round(v / 65536);
  return [round(buf.readUInt32BE(end - 8)), round(buf.readUInt32BE(end - 4))];
}

/** `mvhd` 的时长 = duration / timescale 秒。 */
function mvhdDuration(buf: Buffer, body: number): number | null {
  const version = buf[body];
  let tsAt: number;
  let durAt: number;
  let durLen: number;
  if (version === 0) {
    // version(1) + flags(3) + created(4) + modified(4) → timescale(4) + duration(4)
    [tsAt, durAt, durLen] = [body + 12, body + 16, 4];
  } else if (version === 1) {
    [tsAt, durAt, durLen] = [body + 20, body + 28, 8];
  } else {
    return null;
  }
  if (durAt + durLen > buf.length) return null;
  const timescale = buf.readUInt32BE(tsAt);
  // 除零会得到 Infinity，序列化成 JSON 是 null —— 调用方拿到一个"有值但不是数"
  // 的东西。直接当读不到。
  if (timescale === 0) return null;
  const duration = durLen === 4 ? buf.readUInt32BE(durAt) : Number(buf.readBigUInt64BE(durAt));
  return duration / timescale;
}

const HEAD = 4 * 1024 * 1024;

/**
 * 读文件。**只读前 4MB**：`moov` 通常在头部（给流播放优化过的文件更是如此），
 * 一个视频动辄几十 MB，整份读进内存只为拿两个整数不划算。头部没有时再试整份，
 * 但只对 256MB 以内的文件 —— 2GB 的文件全读进内存会把进程撑爆。
 */
export async function probeMp4File(file: string): Promise<VideoInfo | null> {
  let fh;
  try {
    fh = await open(file, "r");
  } catch {
    return null;
  }
  try {
    const { size } = await fh.stat();
    const head = Buffer.alloc(Math.min(size, HEAD));
    await fh.read(head, 0, head.length, 0);
    const got = probeMp4(head);
    if (got) return got;
    if (size <= HEAD || size > 256 * 1024 * 1024) return null;
    const all = Buffer.alloc(size);
    await fh.read(all, 0, size, 0);
    return probeMp4(all);
  } catch {
    return null;
  } finally {
    await fh.close();
  }
}
