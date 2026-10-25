import { PlatformError } from "@ov/maas-media";
import { describe, expect, it } from "vitest";

import { describeFailure } from "./generation-runner.service.js";

/**
 * 渲染层的任务解析器只接受参照那份 `problem.code` 枚举（`Invalid Task response`
 * 会让整张卡片空掉），而且要求 `source` 与 code 同源。这里把映射钉住。
 */
const REFERENCE_CODES: Record<string, string> = {
  BILLING_INSUFFICIENT: "billing",
  PROVIDER_CONCURRENCY: "provider",
  PROVIDER_REJECTED: "provider",
  PROVIDER_UNAVAILABLE: "provider",
  INTERNAL_ERROR: "system",
};

describe("平台失败的语义化", () => {
  const cases: { body: Record<string, unknown>; code: string; contains: RegExp }[] = [
    { body: { error: { code: "insufficient_user_quota", message: "quota" } }, code: "BILLING_INSUFFICIENT", contains: /额度/ },
    { body: { error: { code: "rate_limited", message: "slow down" } }, code: "PROVIDER_CONCURRENCY", contains: /频繁/ },
    { body: { error: { code: "sensitive_words_detected", message: "blocked" } }, code: "PROVIDER_REJECTED", contains: /审核/ },
    { body: { error: { code: "prompt_blocked", message: "blocked" } }, code: "PROVIDER_REJECTED", contains: /审核/ },
    { body: { error: { code: "model_not_found", message: "no such model" } }, code: "PROVIDER_REJECTED", contains: /没有这个模型/ },
    { body: { error: { code: "capability_unavailable", message: "no storage" } }, code: "PROVIDER_REJECTED", contains: /能力/ },
  ];
  for (const item of cases) {
    it(`平台码 ${String((item.body.error as { code: string }).code)} → ${item.code}`, () => {
      const failure = describeFailure(PlatformError.fromBody(403, JSON.stringify(item.body)));
      expect(failure.problemCode).toBe(item.code);
      expect(failure.source).toBe(REFERENCE_CODES[item.code]);
      expect(failure.userMessage).toMatch(item.contains);
      // 技术原文留着：日志和排障要它。
      expect(failure.message).not.toBe("");
    });
  }

  it("传输失败按「提交结果未确认」报，而不是笼统的后端错误", () => {
    const failure = describeFailure(PlatformError.fromFetch(new Error("socket hang up"), "https://x/v1/videos", "send"));
    expect(failure.problemCode).toBe("PROVIDER_UNAVAILABLE");
    expect(failure.code).toBe("network_error");
    expect(failure.userMessage).toMatch(/未确认/);
  });

  it("认不出的平台码保留技术原文，仍给一个合法的问题码", () => {
    const failure = describeFailure(PlatformError.fromBody(500, JSON.stringify({ error: { code: "weird_new_code", message: "boom" } })));
    expect(failure.problemCode).toBe("PROVIDER_REJECTED");
    expect(failure.message).toBe("boom");
    expect(REFERENCE_CODES[failure.problemCode]).toBe(failure.source);
  });

  it("普通异常不外泄成未定义码；磁盘满单独报", () => {
    const plain = describeFailure(new Error("内容不合规"));
    expect(plain).toMatchObject({ code: "backend_error", problemCode: "PROVIDER_REJECTED", source: "provider", userMessage: "内容不合规" });
    const disk = describeFailure(new Error("ENOSPC: no space left on device"));
    expect(disk).toMatchObject({ code: "storage_full", problemCode: "INTERNAL_ERROR", source: "system" });
  });
});
