import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

// 这条用例要把整个 agent 配置目录同步一遍，Windows 上磁盘慢，默认 5 秒不够。
vi.setConfig({ testTimeout: 60_000 });

import { buildOpencodeConfig, fileUrl } from "./config.js";
import { locateProfile, mergeSkillDirs } from "./index.js";
import { assertProfileComplete, deepMerge, parseFrontmatter, STAGING_MARKER, stageProfile, syncProfile } from "./profile.js";

function write(p: string, s: string) {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, s);
}
const tmp = () => mkdtempSync(path.join(tmpdir(), "ov-oc-"));
const repoRoot = path.resolve(import.meta.dirname, "../../../../..");

describe("仓库自带的 agent 配置", () => {
  it("开发时从 assets/agent-profiles/v2/config 读，完整、能同步、能 staging，合同拼进了 agent", () => {
    const saved = process.env.OV_AGENT_PROFILE_DIR;
    delete process.env.OV_AGENT_PROFILE_DIR;
    try {
      const dir = locateProfile({ repoRoot });
      expect(dir).toBe(path.join(repoRoot, "assets/agent-profiles/v2/config"));
      assertProfileComplete(dir!);
      const synced = path.join(tmp(), "synced");
      syncProfile(dir!, synced, "0.0.0-test");
      assertProfileComplete(synced);
      const staging = path.join(tmp(), "staging");
      stageProfile(synced, staging);
      const media = readFileSync(path.join(staging, "agents/media-agent.md"), "utf8");
      expect(media).toContain("<knowledge-base>");
      expect(readFileSync(path.join(staging, "plugins/session-header.ts"), "utf8")).toContain("x-hilo-workspace");
    } finally {
      if (saved !== undefined) process.env.OV_AGENT_PROFILE_DIR = saved;
    }
  });
});

describe("profile", () => {
  it("frontmatter 的 agents 认三种写法", () => {
    expect(parseFrontmatter("---\nname: a\nagents: [media-agent, 'executor']\n---\n").agents).toEqual(["media-agent", "executor"]);
    const block = parseFrontmatter('---\nagents:\n  - router\n  - "planner"\nname: b\n---\n');
    expect(block.agents).toEqual(["router", "planner"]);
    expect(block.name).toBe("b");
    expect(parseFrontmatter("---\nagents: '*'\n---\n").agents).toEqual(["*"]);
  });

  it("合同和知识库 / 工作流头按规则拼进 agent", () => {
    const s = tmp();
    write(path.join(s, "base.json"), "{}");
    write(path.join(s, "agents/media-agent.md"), "---\nmode: primary\n---\n\n主 agent\n");
    write(path.join(s, "agents/executor.md"), "---\nmode: subagent\n---\n执行\n");
    write(path.join(s, "agents/router.md"), "路由\n");
    write(path.join(s, "contracts/baseline.md"), "---\nname: baseline\nagents: [media-agent, executor]\n---\n\n基线规则\n");
    write(path.join(s, "contracts/README.md"), "不是合同");
    write(path.join(s, "contracts/orphan.md"), "---\nname: orphan\n---\n没说给谁");
    write(path.join(s, "knowledge/vendors/x.md"), "x");
    write(path.join(s, "workflows/workflow.md"), "索引");

    const staging = path.join(tmp(), "s");
    const r = stageProfile(s, staging);
    expect(r.contracts).toBe(1);

    const media = readFileSync(path.join(staging, "agents/media-agent.md"), "utf8");
    // frontmatter 后那个空行保留（结束分隔符后的贪婪 \s*\n），正文 trim。
    expect(media.startsWith("---\nmode: primary\n---\n\n主 agent\n\n<!-- Contracts:")).toBe(true);
    expect(media).toContain('<contract name="baseline">\n基线规则\n</contract>');
    // 主 agent 拿轻量版知识库头（没有"禁止主动浏览"那句）+ 工作流头。
    expect(media).toContain("When this SP cites a relative knowledge path");
    expect(media).not.toContain("MUST NOT proactively browse");
    expect(media.trimEnd().endsWith("</workflows-base>")).toBe(true);

    const exec = readFileSync(path.join(staging, "agents/executor.md"), "utf8");
    expect(exec).toContain("MUST NOT proactively browse");
    expect(exec).toContain("<workflows-base>");

    // 没匹配到合同的子 agent 原样输出，一个字不加。
    expect(readFileSync(path.join(staging, "agents/router.md"), "utf8")).toBe("路由\n");
    expect(readFileSync(path.join(staging, "knowledge/vendors/x.md"), "utf8")).toBe("x");
    expect(readFileSync(path.join(staging, STAGING_MARKER), "utf8")).toContain('"contractsCount":1');
  });

  it("缺的条目逐个点名", () => {
    const d = tmp();
    write(path.join(d, "base.json"), "{}");
    expect(() => assertProfileComplete(d)).toThrow(/agents\/media-agent\.md.*knowledge\/vendors/s);
  });

  it("深合并：对象递归、数组整个替换", () => {
    const a = { agent: { x: { tools: { a: true } } }, plugin: ["p1"] };
    expect(deepMerge(a, { agent: { x: { tools: { b: true } } }, plugin: ["p2"] })).toEqual({
      agent: { x: { tools: { a: true, b: true } } },
      plugin: ["p2"],
    });
  });
});

describe("技能目录", () => {
  it("用户技能和自带技能同名时用户的优先", () => {
    expect(mergeSkillDirs(["/u/a", "/u/b"], ["/s/b", "/s/c"])).toEqual(["/u/a", "/u/b", "/s/c"]);
  });
});

describe("config", () => {
  it("file:// 要百分号编码 —— 数据目录带空格", () => {
    // Windows 上根前面会多一个盘符（file:///D:/Users/…），要验的是编码。
    expect(fileUrl("/Users/a/Library/Application Support/ov/x.ts")).toMatch(/^file:\/\/\/(?:[A-Z]:\/)?Users\/a\/Library\/Application%20Support\/ov\/x\.ts$/);
    expect(fileUrl("/tmp/蒜狸/p.js")).toMatch(/^file:\/\/\/(?:[A-Z]:\/)?tmp\/%E8%92%9C%E7%8B%B8\/p\.js$/);
  });

  it("按自定义模型那条路径拼", () => {
    const d = tmp();
    write(
      path.join(d, "base.json"),
      JSON.stringify({
        default_agent: "media-agent",
        small_model: "x/y",
        agent: { "media-agent": { model: "cloud/m", mode: "primary" } },
        mcp: { hub: { type: "local", command: ["node", "../mcp-tools/dist/main.js"], environment: { GATEWAY_URL: "http://localhost:8001" } } },
        plugin: [".opencode-v2/plugins/session-header.ts"],
      }),
    );
    write(path.join(d, "base.domestic.json"), JSON.stringify({ experimental: { mcp_timeout: 1 } }));
    const cfg = buildOpencodeConfig({
      profileDir: d,
      region: "domestic",
      platform: { base_url: "https://maas.example/v1", api_key: "sk-x", chat_model: "qwen3" },
      mcp: { command: ["node", "/opt/mcp/main.js"], environment: { GATEWAY_URL: "http://127.0.0.1:8100" } },
      extraPlugins: ["/opt/ov/hilo.js"],
      skillsPaths: [],
    });
    expect(cfg.model).toBe("maas/qwen3");
    expect(cfg.provider["maas"].npm).toBe("@ai-sdk/openai-compatible");
    expect(cfg.agent["media-agent"].model).toBeUndefined();
    expect(cfg.small_model).toBeUndefined();
    // 知识库在工作区外，不能是 ask。
    expect(cfg.permission.external_directory).toBe("allow");
    expect(cfg.compaction.reserved).toBe(40_000);
    expect(cfg.experimental.mcp_timeout).toBe(1);
    expect(cfg.mcp.hub.command[1]).toBe("/opt/mcp/main.js");
    expect(cfg.mcp.hub.environment.GATEWAY_URL).toBe("http://127.0.0.1:8100");
    expect(cfg.plugin[0]).toMatch(/^file:\/\/.*\/plugins\/session-header\.ts$/);
    expect(cfg.plugin[1]).toMatch(/^file:\/\/\/(?:[A-Z]:\/)?opt\/ov\/hilo\.js$/);
  });
});
