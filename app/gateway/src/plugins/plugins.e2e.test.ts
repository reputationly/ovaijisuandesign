import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082", "hex");

describe("插件文件", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let hub = "";

  beforeAll(async () => {
    hub = mkdtempSync(path.join(tmpdir(), "ov-plugins-"));
    mkdirSync(path.join(hub, "plugins", "demo-plugin", "ui"), { recursive: true });
    writeFileSync(path.join(hub, "plugins", "demo-plugin", "ui", "index.html"), "<p>插件</p>");
    writeFileSync(path.join(hub, "plugins", "demo-plugin", "ui", "icon.png"), PNG);
    writeFileSync(path.join(hub, "plugins", "demo-plugin", "manifest.json"), JSON.stringify({
      id: "demo-plugin",
      name: { "zh-CN": "示例" },
      description: { "zh-CN": "一个插件" },
      version: "0.1.0",
      icon: { "zh-CN": "ui/icon.png" },
      entry: "ui/index.html",
      displayMode: "inline",
    }));
    process.env.HILO_DATA_DIR = hub;
    process.env.WORKSPACE_DIR = mkdtempSync(path.join(tmpdir(), "ov-plugins-ws-"));
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    delete process.env.HILO_DATA_DIR;
    delete process.env.WORKSPACE_DIR;
  });

  it("配置按插件分桶，数据和静态文件不越出插件目录", async () => {
    expect((await http.put("/api/plugins/Bad_Id/config/theme").send({ value: 1 })).status).toBe(400);
    expect((await http.put("/api/plugins/demo-plugin/config/theme").send({ value: { color: "red" } })).status).toBe(204);
    expect((await http.get("/api/plugins/demo-plugin/config/theme")).body).toEqual({ value: { color: "red" } });
    expect((await http.get("/api/plugins/demo-plugin/config")).body.keys).toEqual(["theme"]);
    expect((await http.delete("/api/plugins/demo-plugin/config/theme")).status).toBe(200);
    expect((await http.get("/api/plugins/demo-plugin/config/theme")).status).toBe(404);

    const missing = await http.put("/api/plugins/missing-plugin/data/a.png").attach("file", PNG, "a.png");
    expect(missing.status).toBe(404);
    const saved = await http.put("/api/plugins/demo-plugin/data/images/a.png").attach("file", PNG, "a.png");
    expect(saved.body).toEqual({ ok: true, path: "images/a.png" });
    const read = await http.get("/api/plugins/demo-plugin/data/images/a.png").buffer(true).parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => callback(null, Buffer.concat(chunks)));
    });
    expect(read.status).toBe(200);
    expect(Buffer.compare(read.body as Buffer, PNG)).toBe(0);
    expect((await http.get("/api/plugins/demo-plugin/static/ui/index.html")).text).toContain("插件");
    expect((await http.put("/api/plugins/demo-plugin/data/..%2Fescape.png").attach("file", PNG, "escape.png")).status).toBe(400);

    const listed = await http.get("/api/plugins");
    expect(listed.body.plugins).toEqual([expect.objectContaining({ id: "demo-plugin", version: "0.1.0", source: "user", displayMode: "inline", name: { "zh-CN": "示例" } })]);
    const placed = await http.post("/api/plugins/demo-plugin/instantiate").send({ position: { x: 12, y: 24 } });
    expect(placed.status).toBe(201);
    const canvas = await http.get("/api/canvas");
    expect(canvas.body.nodes.find((node: { id: string }) => node.id === placed.body.nodeId).data.pluginId).toBe("demo-plugin");
    expect((await http.post("/api/plugins/missing-plugin/instantiate").send({})).status).toBe(404);
    expect((await http.post("/api/skills/market/install").send({ name: "demo-plugin", skillType: "plugin" })).body).toEqual({ ok: true, id: "demo-plugin" });
    expect((await http.post("/api/skills/market/install").send({ name: "missing-plugin", skillType: "plugin" })).body.error).toContain("not available");
  });

  it("把工作区里的 HTML 收成可列出的插件", async () => {
    writeFileSync(path.join(process.env.WORKSPACE_DIR ?? "", "灯.html"), "<p>本地</p>");
    const installed = await http.post("/api/plugins/install-local").send({ filePath: "灯.html", displayName: "灯牌", width: 320.2, height: 0 });
    expect(installed.body).toEqual({ ok: true, pluginId: "plugin" });
    const listed = await http.get("/api/plugins");
    expect(listed.body.plugins.map((plugin: { id: string }) => plugin.id)).toContain("plugin");
    expect((await http.post("/api/plugins/install-local").send({ filePath: "missing.html" })).body.error).toBe("file_missing");
    expect((await http.post("/api/plugins/install-local").send({ filePath: "notes.txt" })).body.error).toBe("not_html");
    expect((await http.post("/api/plugins/install-local").send({ filePath: "" })).status).toBe(400);
  });

  it("代理调用停住，等画布把插件结果推回来", async () => {
    writeFileSync(path.join(hub, "plugins", "demo-plugin", "manifest.json"), JSON.stringify({
      id: "demo-plugin",
      name: { "zh-CN": "示例" },
      description: { "zh-CN": "一个插件" },
      version: "0.1.0",
      icon: { "zh-CN": "ui/icon.png" },
      entry: "ui/index.html",
      agent: { editorSurface: true, methods: [{ name: "ping", timeoutMs: 5000 }] },
    }));
    const placed = await http.post("/api/plugins/demo-plugin/instantiate").send({});
    const nodeId = placed.body.nodeId as string;
    const events: Record<string, unknown>[] = [];
    app.get(GatewayEventBus).subscribe((message) => events.push(message.payload as Record<string, unknown>));
    const pending = new Promise<request.Response>((resolve, reject) => {
      http.post("/api/plugins/agent/invoke").send({ nodeId, method: "ping", args: { n: 1 } }).end((error, response) => (error ? reject(error) : resolve(response)));
    });
    const invoke = await untilEvent(events);
    expect(invoke).toMatchObject({ type: "plugin_agent_invoke", nodeId, method: "ping", args: { n: 1 } });
    const accepted = await http.post("/api/plugins/agent/result").send({ invokeId: invoke.invokeId, ok: true, result: { pong: true } });
    expect(accepted.body.accepted).toBe(true);
    const finished = await pending;
    expect(finished.body).toEqual({ ok: true, invokeId: invoke.invokeId, result: { pong: true } });
    const opened = await http.post("/api/plugins/agent/open-editor").send({ nodeId, initialMessage: "开始" });
    expect(opened.body).toEqual({ ok: true, nodeId });
    expect(events.at(-1)).toMatchObject({ type: "plugin_editor_open", nodeId, initialMessage: "开始" });
    expect((await http.get("/api/plugins/agent/surface").query({ nodeId })).body).toMatchObject({ ok: true, nodeId, pluginId: "demo-plugin" });
  });

  it("插件脚本必须先有虚拟环境，并且只能跑插件目录里的文件", async () => {
    writeFileSync(path.join(hub, "plugins", "demo-plugin", "hello.py"), "import sys\nprint(sys.stdin.read().strip())\nprint('\\n'.join(sys.argv[1:]))\n");
    writeFileSync(path.join(process.env.WORKSPACE_DIR ?? "", "note.txt"), "workspace");
    const early = await http.post("/api/plugins/demo-plugin/python/run").send({ script: "hello.py" });
    expect(early.body).toMatchObject({ ok: false, exitCode: -1 });
    expect(early.body.stderr).toContain("venv not ready");
    expect((await http.post("/api/plugins/demo-plugin/python/run").send({ script: "../hello.py" })).body.stderr).toContain("outside plugin directory");
    const ensured = await http.post("/api/plugins/demo-plugin/python/ensure-env").send({});
    if (!ensured.body.ok) {
      expect(String(ensured.body.error)).toContain("HUB_PYTHON");
      return;
    }
    const ran = await http.post("/api/plugins/demo-plugin/python/run").send({ script: "hello.py", args: ["--flag"], stdin: "hello", inputPaths: ["note.txt"] });
    expect(ran.body.ok).toBe(true);
    expect(ran.body.stdout).toContain("hello");
    expect(ran.body.stdout).toContain("--flag");
    expect(ran.body.stdout).toContain("note.txt");
  }, 60_000);
});

async function untilEvent(events: Record<string, unknown>[]): Promise<Record<string, unknown>> {
  const end = Date.now() + 2000;
  for (;;) {
    const found = events.find((event) => event.type === "plugin_agent_invoke");
    if (found) return found;
    if (Date.now() > end) throw new Error("timed out waiting for plugin invoke");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
