import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
      expect(dir).toBe(path.join(repoRoot, "assets/agent-profiles/v3/config"));
      assertProfileComplete(dir!, "v3");
      const synced = path.join(tmp(), "synced");
      syncProfile(dir!, synced, "0.0.0-test");
      assertProfileComplete(synced, "v3");
      const staging = path.join(tmp(), "staging");
      stageProfile(synced, staging);
      const media = readFileSync(path.join(staging, "agents/media-agent.md"), "utf8");
      // v3 不注入 v2 的路径头（它们写死 `hub_read`）。
      expect(media).not.toContain("<knowledge-base>");
      expect(readFileSync(path.join(staging, "plugins/session-header.ts"), "utf8")).toContain("x-hilo-workspace");
    } finally {
      if (saved !== undefined) process.env.OV_AGENT_PROFILE_DIR = saved;
    }
  });
});

describe("v3 不注入 v2 的路径头", () => {
  it("v3：media-agent 里没有 <knowledge-base>/<workflows-base>（那两块写的是 v2 的 hub_read）", () => {
    const saved = process.env.HILO_PROJECT_ARCHITECTURE;
    process.env.HILO_PROJECT_ARCHITECTURE = "resource_v3";
    try {
      const s = tmp();
      write(path.join(s, "base.json"), "{}");
      write(path.join(s, "agents/media-agent.md"), "---\nmode: primary\n---\n\n主 agent\n");
      write(path.join(s, "knowledge/vendors/x.md"), "x");
      write(path.join(s, "workflows/workflow.md"), "索引");
      const staging = path.join(tmp(), "s");
      stageProfile(s, staging);
      const media = readFileSync(path.join(staging, "agents/media-agent.md"), "utf8");
      expect(media).not.toContain("<knowledge-base>");
      expect(media).not.toContain("<workflows-base>");
      expect(media).not.toContain("hub_read");
    } finally {
      if (saved === undefined) delete process.env.HILO_PROJECT_ARCHITECTURE;
      else process.env.HILO_PROJECT_ARCHITECTURE = saved;
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
    // v3 里主 agent 不再拼 v2 的"相对路径"版；有合同时拿到的是 `<knowledgeDir>` 版
    // （和参照的 knowledgeHeaderForSubAgent 一致）。
    expect(media).not.toContain("When this SP cites a relative knowledge path");
    expect(media).toContain("<knowledgeDir>");
    // v3 不注入 <workflows-base>（那是 v2 的路径头）。
    expect(media).not.toContain("<workflows-base>");

    const exec = readFileSync(path.join(staging, "agents/executor.md"), "utf8");
    expect(exec).toContain("MUST NOT proactively browse");
    expect(exec).not.toContain("<workflows-base>");

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
    expect(cfg.provider["maas"].models.qwen3.variants.max).toEqual({ reasoningEffort: "max", enable_thinking: true });
    expect(cfg.agent["media-agent"].model).toBeUndefined();
    expect(cfg.agent["media-agent"].variant).toBe("max");
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


  it("对话模型多选：目录里的模型都进 provider，配置那个仍是默认", () => {
    const d = mkdtempSync(path.join(tmpdir(), "ov-opencode-"));
    const cfg = buildOpencodeConfig({
      profileDir: d,
      region: "domestic",
      platform: {
        base_url: "https://maas.example/v1",
        api_key: "sk-x",
        chat_model: "qwen3",
        chat_models: ["qwen3", "GLM-5", "deepseek-v4-1-flash"],
      },
      mcp: { command: ["node", "/opt/mcp/main.js"], environment: { GATEWAY_URL: "http://127.0.0.1:8100" } },
      extraPlugins: [],
      skillsPaths: [],
    });
    // 默认仍是配置里那个；其余按给的顺序列出来，用户才能在界面上换。
    expect(cfg.model).toBe("maas/qwen3");
    expect(Object.keys(cfg.provider["maas"].models)).toEqual(["qwen3", "GLM-5", "deepseek-v4-1-flash"]);
    // 每个条目都得是完整形状：opencode 缺 tool_call / limit 会按不可用处理。
    for (const name of Object.keys(cfg.provider["maas"].models)) {
      expect(cfg.provider["maas"].models[name]).toMatchObject({ id: name, name, tool_call: true });
    }
  });
});

// MCP 启动命令要注入到 **profile 声明的那个服务** 上。
//
// v3 的 profile 声明 `mcp.design`（命令是相对路径 `../mcp-tools-v3/dist/main.js`，起不来），
// v2 声明 `mcp.hub`。原来无条件写 `config.mcp.hub`：v3 下 `design` 起不来、`design_*` 工具
// 一个都没有，真正的命令却挂在一个多出来的 `hub` 服务上 —— agent 永远看不到
// `design_execute`（真会话里就是这么卡住的）。
describe("MCP 服务的注入位置", () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
  const inputs = (profileDir: string) => ({
    profileDir,
    region: "domestic" as const,
    platform: { base_url: "http://127.0.0.1:9/v1", api_key: "k", chat_model: "" } as never,
    mcp: { command: ["node", "/opt/mcp/main.js"], environment: { GATEWAY_URL: "http://127.0.0.1:8100" } },
    extraPlugins: [] as string[],
    skillsPaths: [] as string[],
  });

  it("v3 profile：命令进 mcp.design，架构开关来自 profile，不再多出一个 hub", () => {
    const cfg = buildOpencodeConfig(inputs(path.join(repoRoot, "assets/agent-profiles/v3/config")) as never);
    expect(cfg.mcp.design.command).toEqual(["node", "/opt/mcp/main.js"]);
    expect(cfg.mcp.design.environment).toMatchObject({
      GATEWAY_URL: "http://127.0.0.1:8100",
      HILO_PROJECT_ARCHITECTURE: "resource_v3",
    });
    expect(cfg.mcp.hub).toBeUndefined();
  });

  it("v2 profile：命令进 mcp.hub，没有 design 服务", () => {
    const cfg = buildOpencodeConfig(inputs(path.join(repoRoot, "assets/agent-profiles/v2/config")) as never);
    expect(cfg.mcp.hub.command).toEqual(["node", "/opt/mcp/main.js"]);
    expect(cfg.mcp.hub.environment.GATEWAY_URL).toBe("http://127.0.0.1:8100");
    expect(cfg.mcp.design).toBeUndefined();
  });
});

describe("没有搜索源时不暴露 design_image_search", () => {
  const build = (): Record<string, any> => {
    const dir = path.join(repoRoot, "assets/agent-profiles/v3/config");
    return buildOpencodeConfig({
      profileDir: dir,
      region: "domestic",
      platform: { base_url: "http://127.0.0.1:1/v1", api_key: "sk-test", chat_model: "qwen3.8-flash-fp8" } as never,
      mcp: { command: ["node", "x.js"], environment: {} },
      extraPlugins: [],
      skillsPaths: [],
    });
  };

  it("默认关掉（本机没有搜索供应商）", () => {
    const saved = process.env.OV_IMAGE_SEARCH;
    delete process.env.OV_IMAGE_SEARCH;
    try {
      expect(build().agent["media-agent"].tools.design_image_search).toBe(false);
    } finally {
      if (saved !== undefined) process.env.OV_IMAGE_SEARCH = saved;
    }
  });

  it("接了搜索源（OV_IMAGE_SEARCH=1）就放出来，交给 profile 的默认值", () => {
    const saved = process.env.OV_IMAGE_SEARCH;
    process.env.OV_IMAGE_SEARCH = "1";
    try {
      // profile 里本来就显式开着它；这里只验"我们不覆盖成 false"。
      expect(build().agent["media-agent"].tools.design_image_search).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.OV_IMAGE_SEARCH;
      else process.env.OV_IMAGE_SEARCH = saved;
    }
  });
});

describe("思考档位", () => {
  it("默认 high：请求体带 reasoning_effort=high、enable_thinking=true", async () => {
    const { reasoningOptions } = await import("./config.js");
    expect(reasoningOptions(undefined)).toEqual({ reasoningEffort: "high", enable_thinking: true });
  });

  it("none：关掉推理与开关；非法值回落到 high", async () => {
    const { reasoningOptions } = await import("./config.js");
    expect(reasoningOptions("none")).toEqual({ reasoningEffort: "none", enable_thinking: false });
    expect(reasoningOptions("bogus")).toEqual({ reasoningEffort: "high", enable_thinking: true });
    expect(reasoningOptions("low")).toEqual({ reasoningEffort: "low", enable_thinking: true });
    // 平台实测接受 max / xhigh（max 的 reasoning_tokens 最多），别把它们当非法值回落。
    expect(reasoningOptions("max")).toEqual({ reasoningEffort: "max", enable_thinking: true });
    expect(reasoningOptions("xhigh")).toEqual({ reasoningEffort: "xhigh", enable_thinking: true });
  });
});
