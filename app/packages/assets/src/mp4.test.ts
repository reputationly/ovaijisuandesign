import { describe, expect, it } from "vitest";

import { probeMp4 } from "./mp4.js";

function boxed(kind: string, body: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length + 8, 0);
  head.write(kind, 4, "latin1");
  return Buffer.concat([head, body]);
}

// tkhd v0 的**内容**是 84 字节（盒子总长 92），宽高是最后 8 个。
// 写成 84 - 8 会得到一个短 8 字节的盒子，读到的是矩阵的尾巴而不是宽高。
function tkhd(w: number, h: number): Buffer {
  const b = Buffer.alloc(84);
  b.writeUInt32BE(Math.trunc(w * 65536) >>> 0, 76);
  b.writeUInt32BE(Math.trunc(h * 65536) >>> 0, 80);
  return boxed("tkhd", b);
}

function make(width: number, height: number, timescale: number, duration: number, audioFirst: boolean): Buffer {
  // mvhd v0 的内容里，timescale 在偏移 12、duration 在 16。
  const mv = Buffer.alloc(100);
  mv.writeUInt32BE(timescale, 12);
  mv.writeUInt32BE(duration, 16);
  const video = boxed("trak", tkhd(width, height));
  const audio = boxed("trak", tkhd(0, 0));
  const moov = boxed("moov", Buffer.concat([boxed("mvhd", mv), ...(audioFirst ? [audio, video] : [video, audio])]));
  return Buffer.concat([boxed("ftyp", Buffer.from("isom\0\0\x02\0isomiso2", "latin1")), moov]);
}

describe("probeMp4", () => {
  it("读出尺寸和时长", () => {
    const got = probeMp4(make(1920, 1080, 600, 3000, false));
    expect(got).toEqual({ width: 1920, height: 1080, duration: 5 });
  });

  it("跳过音频轨 —— 它的宽高是 0，取到的话节点在画布上看不见", () => {
    const got = probeMp4(make(1280, 720, 1000, 5000, true));
    expect([got?.width, got?.height]).toEqual([1280, 720]);
  });

  it("定点数四舍五入而不是截断", () => {
    expect(probeMp4(make(1919.99, 1080, 600, 600, false))?.width).toBe(1920);
  });

  it("timescale 为 0 时时长是 null，不是 Infinity", () => {
    const got = probeMp4(make(640, 480, 0, 100, false));
    expect(got).toEqual({ width: 640, height: 480, duration: null });
  });

  it("垃圾数据不崩也不死循环", () => {
    expect(probeMp4(Buffer.alloc(0))).toBeNull();
    expect(probeMp4(Buffer.from("not an mp4 at all"))).toBeNull();
    // 盒子大小声明成 0..7 —— 不拦的话外层循环不前进。
    for (let size = 0; size < 8; size++) {
      const b = Buffer.alloc(40);
      b.writeUInt32BE(size, 0);
      b.write("moov", 4, "latin1");
      probeMp4(b);
    }
    const huge = Buffer.alloc(8);
    huge.writeUInt32BE(0xffffffff, 0);
    huge.write("moov", 4, "latin1");
    expect(probeMp4(huge)).toBeNull();
  });

  it("没有 moov 就是 null", () => {
    const b = Buffer.from([0, 0, 0, 16, ...Buffer.from("ftyp"), 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(probeMp4(b)).toBeNull();
  });
});
