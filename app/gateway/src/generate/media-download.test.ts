import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { downloadMediaToDir, extensionFor, sanitizeFilename } from "./media-download.js";

const PNG_URI = `data:application/octet-stream;base64,${Buffer.from("89504e470d0a1a0a0000", "hex").toString("base64")}`;

describe("下载落盘", () => {
  it("文件名清洗：去保留字符、空白折成 -、最长 60", () => {
    expect(sanitizeFilename('a/b:c*?"<>| d')).toBe("abc-d");
    expect(sanitizeFilename("  --x  y--  ")).toBe("x-y");
    expect(sanitizeFilename("长".repeat(80))).toHaveLength(60);
  });

  it("扩展名看字节，不信 octet-stream 和没有扩展名的签名地址", () => {
    expect(extensionFor("application/octet-stream", "/sig/abc", Buffer.from("89504e470d0a1a0a", "hex"))).toBe(".png");
    expect(extensionFor("", "", Buffer.concat([Buffer.alloc(4), Buffer.from("ftypM4A ")]))).toBe(".m4a");
    expect(extensionFor("audio/mpeg", "/x", Buffer.from("zz"))).toBe(".mp3");
    expect(extensionFor("", "/a/b.JPEG", Buffer.from("zz"))).toBe(".jpg");
    expect(extensionFor("", "", Buffer.from("zz"))).toBe(".bin");
  });

  it("重名不覆盖（_1、_2），名字里的扩展名以实际内容为准，没给名字用 12 位随机名", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-dl-"));
    expect(path.basename(await downloadMediaToDir(PNG_URI, dir, "猫.jpg"))).toBe("猫.png");
    expect(path.basename(await downloadMediaToDir(PNG_URI, dir, "猫"))).toBe("猫_1.png");
    const [a, b] = await Promise.all([downloadMediaToDir(PNG_URI, dir, "猫"), downloadMediaToDir(PNG_URI, dir, "猫")]);
    expect(new Set([path.basename(a), path.basename(b)])).toEqual(new Set(["猫_2.png", "猫_3.png"]));
    expect(path.basename(await downloadMediaToDir(PNG_URI, dir))).toMatch(/^[0-9a-f-]{12}\.png$/);
    // 暂存文件不留下。
    expect(readdirSync(dir).filter((f) => f.startsWith(".staged"))).toEqual([]);
  });
});
