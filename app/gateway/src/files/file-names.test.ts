import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { deriveImportTarget, sanitizeFileName, uploadFileName, writeFileExclusive } from "./file-names.js";
import { assertPublicUrl, isPrivateAddress } from "./ssrf.js";

describe("文件名", () => {
  it("sanitizeFileName：非法字符变空格、压空白、去开头的点、按码点截断", () => {
    expect(sanitizeFileName('a/b:c*d?"e<f>g|h', 60)).toBe("a b c d e f g h");
    expect(sanitizeFileName("  ..隐藏  ")).toBe("隐藏");
    expect(sanitizeFileName("一二三四五六七八九十十一十二十三", 12)).toBe("一二三四五六七八九十十一");
    expect(sanitizeFileName("😀".repeat(20), 3)).toBe("😀😀😀");
  });

  it("deriveImportTarget：按类型进子目录，取不到名字用 download-<ms>", () => {
    const now = new Date(1700000000000);
    expect(deriveImportTarget("https://x.com/a/%E7%8C%AB.PNG?sig=1", now)).toBe("images/猫.png");
    expect(deriveImportTarget("https://x.com/v/clip.mp4/", now)).toBe("videos/clip.mp4");
    expect(deriveImportTarget("https://x.com/", now)).toBe("files/download-1700000000000");
    expect(deriveImportTarget("https://x.com/noext", now)).toBe("files/noext");
  });

  it("uploadFileName：latin1 还原成 utf8，去掉分隔符和开头的点", () => {
    const latin1 = Buffer.from("猫.png", "utf8").toString("latin1");
    expect(uploadFileName(latin1)).toBe("猫.png");
    expect(uploadFileName("../x")).toBe("__x");
    expect(uploadFileName(".bashrc")).toBe("_bashrc");
  });

  it("writeFileExclusive：绝不覆盖，依次 name(1)、name(2)", async () => {
    const d = mkdtempSync(path.join(tmpdir(), "ov-wx-"));
    const a = await writeFileExclusive(path.join(d, "shot.png"), "1");
    const b = await writeFileExclusive(path.join(d, "shot.png"), "2");
    const c = await writeFileExclusive(path.join(d, "shot.png"), "3");
    expect([a, b, c].map((p) => path.basename(p))).toEqual(["shot.png", "shot(1).png", "shot(2).png"]);
    expect(readFileSync(a, "utf8")).toBe("1");
  });
});

describe("SSRF", () => {
  it("内网和本机地址都算私有", () => {
    for (const a of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.1.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(a), a).toBe(true);
    }
    for (const a of ["8.8.8.8", "172.32.0.1", "2001:4860::8888"]) expect(isPrivateAddress(a), a).toBe(false);
  });

  it("拒绝非 http(s)、坏 URL、字面量内网地址", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow(/scheme-not-allowed/);
    await expect(assertPublicUrl("not a url")).rejects.toThrow(/invalid-url/);
    await expect(assertPublicUrl("http://127.0.0.1:8100/api")).rejects.toThrow(/private-address/);
    await expect(assertPublicUrl("http://[::1]/x")).rejects.toThrow(/private-address/);
  });
});
