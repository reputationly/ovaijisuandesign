import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { traceFile, traceMessages, traceSystem, traceTool } from "./agent-trace.js";

const lines = (file: string): any[] =>
  readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

afterEach(() => {
  delete process.env.OV_AGENT_TRACE;
  delete process.env.HILO_TRACE_DIR;
});

describe("OV_AGENT_TRACE", () => {
  it("默认关闭：一条都不写", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-trace-"));
    process.env.HILO_TRACE_DIR = dir;
    traceSystem("ses_x", ["a"]);
    expect(() => readFileSync(traceFile(), "utf8")).toThrow();
  });

  it("打开后落指纹与形状，不落正文", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-trace-"));
    process.env.OV_AGENT_TRACE = "1";
    process.env.HILO_TRACE_DIR = dir;
    traceSystem("ses_x", ["你是助手", "## Project rules\n…"]);
    traceMessages("ses_x", [
      { info: { role: "user" }, parts: [{ type: "text" }] },
      { info: { role: "assistant" }, parts: [] },
    ]);
    traceTool("before", "ses_x", "design_execute", { argsChars: 42, argsKeys: ["capabilityId"] });
    traceTool("after", "ses_x", "design_execute", { resultChars: 1000 });

    const records = lines(traceFile());
    expect(records.map((r) => r.kind)).toEqual(["system", "messages", "tool", "tool"]);
    expect(records[0]).toMatchObject({ session: "ses_x", blocks: 2 });
    expect(records[0].sha256).toMatch(/^[a-f0-9]{16}$/);
    expect(records[0].chars).toBeGreaterThan(0);
    // 正文不进文件：只有长度/角色/字节数。
    expect(JSON.stringify(records)).not.toContain("你是助手");
    expect(records[1]).toMatchObject({ count: 2, roles: ["user", "assistant"], parts: [1, 0] });
    expect(records[2]).toMatchObject({ phase: "before", tool: "design_execute", argsChars: 42 });
    expect(records[3]).toMatchObject({ phase: "after", resultChars: 1000 });
  });

  it("落盘前把 sk- 凭证脱敏", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ov-trace-"));
    process.env.OV_AGENT_TRACE = "1";
    process.env.HILO_TRACE_DIR = dir;
    traceTool("before", "ses_x", "bash", { argsKeys: ["sk-HxnkMh8GWPBkZNLk4Nksz1ioDhISVYsTAjKnlC6AvLHyEEnA"] });
    const raw = readFileSync(traceFile(), "utf8");
    expect(raw).not.toContain("sk-HxnkMh8G");
    expect(raw).toContain("redacted");
  });
});
