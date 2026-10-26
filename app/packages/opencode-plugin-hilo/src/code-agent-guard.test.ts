import { describe, expect, it } from "vitest";

import { createCodeAgentBindings, guardCodeAgentTool, isCodeAgentGuardedTool } from "./code-agent-guard.js";

const DIR = "/w";
const WORK = "/w/code/proj";

describe("code-agent 路径守卫", () => {
  it("只守卫文件/命令类工具", () => {
    for (const tool of ["read", "write", "edit", "list", "glob", "grep", "bash", "apply_patch"]) expect(isCodeAgentGuardedTool(tool)).toBe(true);
    for (const tool of ["design_execute", "design_read", "question"]) expect(isCodeAgentGuardedTool(tool)).toBe(false);
  });

  it("没开 Code Project：先 open（不能放行任何文件操作）", () => {
    const guard = guardCodeAgentTool({ tool: "read", args: { filePath: "a.txt" }, workDir: undefined, directory: DIR });
    expect(guard).toMatchObject({ allowed: false });
    expect((guard as { message: string }).message).toContain("design_code_project_open");
  });

  it("树内放行、树外拒绝", () => {
    expect(guardCodeAgentTool({ tool: "read", args: { filePath: `${WORK}/a.txt` }, workDir: WORK, directory: DIR })).toEqual({ allowed: true });
    const escaped = guardCodeAgentTool({ tool: "read", args: { filePath: "/etc/passwd" }, workDir: WORK, directory: DIR });
    expect(escaped.allowed).toBe(false);
    // `..` 也要拦住
    expect(guardCodeAgentTool({ tool: "bash", args: { workdir: `${WORK}/../..` }, workDir: WORK, directory: DIR }).allowed).toBe(false);
  });

  it("可选参数缺省就指到工作树根（bash 在树里跑）", () => {
    const args: Record<string, unknown> = {};
    expect(guardCodeAgentTool({ tool: "bash", args, workDir: WORK, directory: DIR })).toEqual({ allowed: true });
    expect(args.workdir).toBe(WORK);
  });

  it("必填路径缺失就拒绝，不猜", () => {
    expect(guardCodeAgentTool({ tool: "write", args: {}, workDir: WORK, directory: DIR }).allowed).toBe(false);
    expect(guardCodeAgentTool({ tool: "read", args: { filePath: 42 }, workDir: WORK, directory: DIR }).allowed).toBe(false);
  });

  it("apply_patch 逐条检查补丁里的路径", () => {
    const ok = guardCodeAgentTool({ tool: "apply_patch", args: { patchText: `*** Begin Patch\n*** Update File: ${WORK}/a.ts\n*** End Patch` }, workDir: WORK, directory: DIR });
    expect(ok).toEqual({ allowed: true });
    const bad = guardCodeAgentTool({ tool: "apply_patch", args: { patchText: "*** Add File: /tmp/x.sh" }, workDir: WORK, directory: DIR });
    expect(bad.allowed).toBe(false);
  });

  it("binding 查询：拿到 workDir、缓存、失败抛错（不静默放过）", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return { ok: true, json: async () => ({ binding: { workDir: WORK } }) } as unknown as Response;
    }) as unknown as typeof fetch;
    const bindings = createCodeAgentBindings("http://gw", fetchImpl);
    expect(await bindings.get("ses_1")).toBe(WORK);
    expect(await bindings.get("ses_1")).toBe(WORK);
    expect(calls).toBe(1);

    const failing = createCodeAgentBindings("http://gw", (async () => ({ ok: false, status: 503 }) as unknown as Response) as unknown as typeof fetch);
    await expect(failing.get("ses_1")).rejects.toThrow(/HTTP 503/);
  });
});
