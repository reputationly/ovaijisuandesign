import { mkdtempSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { MediaConfigService } from "./media-config.service.js";

/**
 * 配置缓存的判据是**文件内容**，不是 mtime。
 *
 * 真实场景：Windows 的 NTFS 时间粒度粗，用户在设置里连续保存两次（换 key，两次内容
 * 字节数一模一样）可能落在同一个 mtime 上。只按 mtime 缓存的话 gateway 会继续用旧配置，
 * 表现是"换了 key，生成还在用旧账号"。这条用例把"mtime 不变、大小不变、内容变了"钉住。
 */
function service(dir: string) {
  return new MediaConfigService({ mediaConfigPath: path.join(dir, "config.json") } as never);
}

describe("MediaConfigService 的缓存判据", () => {
  it("mtime 与大小都不变、只有内容变了，也要立刻读到新配置", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-mc-hash-"));
    const file = path.join(dir, "config.json");
    const frozen = new Date(1_700_000_000_000);
    writeFileSync(file, JSON.stringify({ platform: { api_key: "sk-A" } }));
    utimesSync(file, frozen, frozen);
    const svc = service(dir);
    expect(svc.currentConfig?.().platform.api_key ?? svc.load().platform.api_key).toBe("sk-A");

    // 换 key：内容长度相同，并把 mtime **强制写回**第一次的值 ——
    // 这就是 Windows 粗粒度时间戳下"同一毫秒内保存两次"的真实效果。
    const before = statSync(file);
    writeFileSync(file, JSON.stringify({ platform: { api_key: "sk-B" } }));
    utimesSync(file, frozen, frozen);
    expect(statSync(file).mtimeMs).toBe(before.mtimeMs);
    expect(statSync(file).size).toBe(before.size);
    expect(svc.load().platform.api_key).toBe("sk-B");
  });
});
