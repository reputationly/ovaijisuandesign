import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer, type Server, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

import type { INestApplication } from "@nestjs/common";
import yaml from "js-yaml";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { GatewayEventBus } from "../common/gateway-event-bus.js";
import { skillStagingRoot } from "./skill-import.service.js";

/** 测试用的最小 zip：每个条目 deflate，Unix 权限写进外部属性。 */
function makeZip(files: Record<string, string | { content: string; mode: number }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, v] of Object.entries(files)) {
    const content = Buffer.from(typeof v === "string" ? v : v.content);
    const mode = typeof v === "string" ? 0o100644 : v.mode;
    const data = deflateRawSync(content);
    const nameBuf = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt8(3, 5);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE((mode << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

function plant(dir: string, name: string, frontmatter: string, meta?: Record<string, unknown>) {
  const d = path.join(dir, name);
  mkdirSync(d, { recursive: true });
  writeFileSync(path.join(d, "SKILL.md"), `---\n${frontmatter}\n---\n\n# ${name}\n\n正文。\n`);
  if (meta) writeFileSync(path.join(d, "meta.yaml"), yaml.dump(meta));
  return d;
}

/** 假 opencode：只管 `GET /skill`，`mode` 切换成功 / 失败 / 空列表。 */
function fakeOpencode() {
  const state = { mode: "ok" as "ok" | "fail" | "empty", hits: 0 };
  const sse = new Set<ServerResponse>();
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url!, "http://x");
    if (url.pathname === "/global/event") {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(": hi\n\n");
      sse.add(res);
      req.on("close", () => sse.delete(res));
      return;
    }
    if (url.pathname === "/skill") {
      state.hits++;
      if (state.mode === "fail") {
        res.statusCode = 500;
        return res.end();
      }
      res.setHeader("content-type", "application/json");
      return res.end(
        JSON.stringify(
          state.mode === "empty"
            ? []
            : [
                { name: "alpha", description: "运行时描述" },
                { name: "helper", description: "子 agent 技能" },
              ],
        ),
      );
    }
    res.statusCode = 404;
    res.end();
  });
  return { server, state, sse };
}

describe("本地技能路由", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let root = "";
  let installed = "";
  let user = "";
  const events: any[] = [];
  const oc = fakeOpencode();
  const envKeys = ["WORKSPACE_DIR", "HILO_DATA_DIR", "HUB_SKILLS_DIR", "HUB_USER_SKILLS_DIR", "OPENCODE_CONFIG_DIR"] as const;
  // os.tmpdir() 在 POSIX 上看 TMPDIR，在 Windows 上看 TEMP / TMP，三个都要指过去
  const tmpKeys = ["TMPDIR", "TEMP", "TMP"] as const;
  const savedTmp = Object.fromEntries(tmpKeys.map((k) => [k, process.env[k]]));

  beforeAll(async () => {
    await new Promise<void>((r) => oc.server.listen(0, "127.0.0.1", () => r()));
    root = mkdtempSync(path.join(tmpdir(), "ov-skills-e2e-"));
    installed = path.join(root, "hub", "skills");
    user = path.join(root, "user-skills");
    // 导入的暂存目录在系统 tmp 下；指到临时根里，测试清理时不碰机器上真在用的暂存。
    const tmp = path.join(root, "tmp");
    mkdirSync(tmp);
    for (const k of tmpKeys) process.env[k] = tmp;
    process.env.WORKSPACE_DIR = path.join(root, "ws");
    mkdirSync(process.env.WORKSPACE_DIR);
    process.env.HILO_DATA_DIR = path.join(root, "hub");
    process.env.HUB_SKILLS_DIR = installed;
    process.env.HUB_USER_SKILLS_DIR = user;
    process.env.OPENCODE_CONFIG_DIR = path.join(root, "config");
    mkdirSync(process.env.OPENCODE_CONFIG_DIR);
    // 默认全开，beta* 默认关：覆盖精确名、前缀通配和 `*` 三种规则。
    writeFileSync(
      path.join(process.env.OPENCODE_CONFIG_DIR, "base.json"),
      JSON.stringify({ agent: { "media-agent": { permission: { skill: { "*": "allow", "beta*": "deny" } } } } }),
    );
    plant(installed, "alpha", "name: alpha\ndescription: 第一个\ntags: [video, ad]\nallowed-tools: hub_generate_image, hub_edit", {
      version: "1.2.3",
      "display-name-zh": "阿尔法",
      "summary-cn": "中文简介",
      "complete-tags-en": ["Ads", "Video / Editing"],
      source: "official-featured",
    });
    const alpha = path.join(installed, "alpha");
    mkdirSync(path.join(alpha, "references"));
    writeFileSync(path.join(alpha, "references", "guide.md"), "参考");
    writeFileSync(path.join(alpha, "logo.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(path.join(alpha, "big.txt"), "x".repeat(600 * 1024));
    writeFileSync(path.join(root, "secret.txt"), "外面的文件");
    plant(installed, "beta-one", "name: beta-one\ndescription: 默认关");
    plant(path.join(installed, "sub-agent-skills"), "helper", "name: helper");
    plant(user, "mine", "name: mine\ndescription: 我自己的");
    // 同名时用户目录优先。
    plant(user, "alpha-dup", "name: alpha\ndescription: 用户目录里的同名技能");
    mkdirSync(path.join(user, "not-a-skill"));

    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
    app.get(GatewayEventBus).subscribe((m) => events.push(m));
  });

  afterAll(async () => {
    await app.close();
    oc.server.closeAllConnections();
    oc.server.close();
    rmSync(root, { recursive: true, force: true });
    for (const k of envKeys) delete process.env[k];
    for (const k of tmpKeys) {
      if (savedTmp[k] === undefined) delete process.env[k];
      else process.env[k] = savedTmp[k];
    }
  });

  const byName = (list: any[], name: string) => list.find((s) => s.name === name);

  describe("列表和开关", () => {
    it("GET /api/skills：扫两个目录，同名用户优先；字段取自 frontmatter + meta.yaml", async () => {
      const r = await http.get("/api/skills");
      expect(r.status).toBe(200);
      const names = r.body.map((s: any) => s.name).sort();
      expect(names).toEqual(["alpha", "beta-one", "mine"]);
      const alpha = byName(r.body, "alpha");
      expect(alpha.source).toBe("user");
      expect(alpha.description).toBe("用户目录里的同名技能");
      const mine = byName(r.body, "mine");
      expect(mine).toMatchObject({ source: "user", enabled: true, version: "0.1.0", guidePrompt: "为我解释一下这个技能的最佳使用方式。", tools: [], tagEn: "" });
      expect(typeof mine.updatedAt).toBe("number");
      expect(byName(r.body, "beta-one")).toMatchObject({ source: "installed", enabled: false });
    });

    it("POST /api/skills/:name/toggle：写覆盖文件，回 skill + userOverrides；关掉被通配放行的记 deny", async () => {
      let r = await http.post("/api/skills/mine/toggle").send({ enabled: false });
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ ok: true, skill: { name: "mine", enabled: false }, userOverrides: { mine: "deny" } });
      const file = path.join(root, "hub", "skill-permissions.json");
      expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ mine: "deny" });
      // 开回去：默认就是开的，不留覆盖。
      r = await http.post("/api/skills/mine/toggle").send({ enabled: true });
      expect(r.body.userOverrides).toEqual({});
      // 默认关的打开要记 allow。
      r = await http.post("/api/skills/beta-one/toggle").send({ enabled: true });
      expect(r.body).toMatchObject({ skill: { enabled: true }, userOverrides: { "beta-one": "allow" } });
      r = await http.post("/api/skills/nope/toggle").send({ enabled: true });
      expect(r.status).toBe(404);
      expect(r.body.message).toBe('Skill "nope" not found');
    });

    it("POST /api/skills/permissions：整份替换内存里的覆盖", async () => {
      const r = await http.post("/api/skills/permissions").send({ overrides: { alpha: "deny" } });
      expect(r.body).toEqual({ ok: true });
      const list = (await http.get("/api/skills")).body;
      expect(byName(list, "alpha").enabled).toBe(false);
      expect(byName(list, "beta-one").enabled).toBe(false);
      await http.post("/api/skills/permissions").send({});
      expect(byName((await http.get("/api/skills")).body, "alpha").enabled).toBe(true);
    });
  });

  describe("文件浏览", () => {
    it("GET /api/skills/:name/files：目录在前，隐藏项不列", async () => {
      const r = await http.get("/api/skills/beta-one/files");
      expect(r.status).toBe(200);
      expect(r.body.skillName).toBe("beta-one");
      expect(r.body.skillPath).toBe(path.join(installed, "beta-one"));
      expect(r.body.tree).toEqual([{ name: "SKILL.md", path: "SKILL.md", isDirectory: false, size: expect.any(Number) }]);
      // alpha 名下是用户目录那份（先到先得）；已装那份按目录名找不到。
      const inst = await http.get("/api/skills/alpha/files");
      expect(inst.body.skillPath).toBe(path.join(user, "alpha-dup"));
    });

    it("GET /api/skills/:name/file-content：文本、图片 base64、超大、越界", async () => {
      // 让 alpha 解析到已装那份：临时把用户目录里的同名技能改名。
      const dup = path.join(user, "alpha-dup", "SKILL.md");
      const saved = readFileSync(dup, "utf8");
      writeFileSync(dup, saved.replace("name: alpha", "name: alpha-dup"));
      try {
        let r = await http.get("/api/skills/alpha/file-content").query({ path: "references/guide.md" });
        expect(r.body).toEqual({ content: "参考", mimeType: "text/markdown" });
        r = await http.get("/api/skills/alpha/file-content").query({ path: "logo.png" });
        expect(r.body).toEqual({ content: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64"), mimeType: "image/png" });
        r = await http.get("/api/skills/alpha/file-content").query({ path: "big.txt" });
        expect(r.body).toEqual({ content: "", mimeType: "text/plain", tooLarge: true });
        r = await http.get("/api/skills/alpha/file-content").query({ path: "../../../secret.txt" });
        expect(r.status).toBe(400);
        expect(r.body.message).toBe("Path traversal is not allowed");
        r = await http.get("/api/skills/alpha/file-content").query({ path: "missing.md" });
        expect(r.status).toBe(404);
        expect(r.body.message).toBe('File "missing.md" not found');
        r = await http.get("/api/skills/alpha/file-content");
        expect(r.status).toBe(400);
        expect(r.body.message).toBe("path query parameter is required");
      } finally {
        writeFileSync(dup, saved);
      }
    });

    it("非法技能名 400，找不到 404", async () => {
      let r = await http.get("/api/skills/..%2Fetc/files");
      expect(r.status).toBe(400);
      expect(r.body.message).toBe("Invalid skill name");
      r = await http.get("/api/skills/ghost/files");
      expect(r.status).toBe(404);
      expect(r.body.message).toBe('Skill "ghost" not found');
    });
  });

  describe("运行时列表", () => {
    it("opencode 还没连上：等一下后退回本地扫描", async () => {
      const r = await http.get("/api/skills/runtime");
      expect(r.status).toBe(200);
      expect(r.body.map((s: any) => s.name).sort()).toEqual(["alpha", "beta-one", "mine"]);
    });

    it("连上后用 opencode 的列表，过滤子 agent 技能、补本地字段、写缓存；opencode 挂了用缓存", async () => {
      const port = (oc.server.address() as { port: number }).port;
      await http.post("/api/runtime/opencode-url").send({ url: `http://127.0.0.1:${port}` });
      let r = await http.get("/api/skills/runtime");
      expect(r.body).toHaveLength(1);
      expect(r.body[0]).toMatchObject({ name: "alpha", description: "运行时描述", source: "user", enabled: true, tools: [] });
      const cache = path.join(root, "hub", "runtimes", "opencode-skills-last-known-good.json");
      expect(JSON.parse(readFileSync(cache, "utf8"))).toMatchObject({ version: 1, skills: [{ name: "alpha" }, { name: "helper" }] });

      oc.state.mode = "fail";
      r = await http.get("/api/skills/runtime");
      expect(r.body.map((s: any) => s.name)).toEqual(["alpha"]);

      // 空列表不写缓存，也不当真：退回缓存。
      oc.state.mode = "empty";
      r = await http.get("/api/skills/runtime");
      expect(r.body.map((s: any) => s.name)).toEqual(["alpha"]);

      // 缓存也没有：退回本地扫描。
      rmSync(cache);
      oc.state.mode = "fail";
      r = await http.get("/api/skills/runtime");
      expect(r.body.map((s: any) => s.name).sort()).toEqual(["alpha", "beta-one", "mine"]);
      oc.state.mode = "ok";
    });
  });

  describe("reload / upload-check", () => {
    it("reload 广播 skills:reload，只带有值的字段", async () => {
      let r = await http.post("/api/skills/reload").send({ skills: ["a", "b"], autoUpdate: true });
      expect(r.body).toEqual({ ok: true });
      expect(events.at(-1)).toEqual({ event: "skills:reload", payload: { type: "skills_reload", unloadedSkills: ["a", "b"], autoUpdate: true } });
      r = await http.post("/api/skills/reload").send({});
      expect(events.at(-1)).toEqual({ event: "skills:reload", payload: { type: "skills_reload" } });
    });

    it("upload-check 只校验名字", async () => {
      expect((await http.post("/api/skills/upload-check").send({ name: "alpha" })).body).toEqual({ ok: true });
      const r = await http.post("/api/skills/upload-check").send({ name: "../x" });
      expect(r.status).toBe(400);
      expect(r.body.message).toBe("Invalid skill name");
    });
  });

  describe("fork / 删除", () => {
    it("fork 已装技能到用户目录：my-<name>，重名加序号，改写 SKILL.md 和 meta.yaml", async () => {
      let r = await http.post("/api/skills/fork").send({ name: "alpha" });
      expect(r.body).toEqual({ ok: true, name: "my-alpha" });
      const dir = path.join(user, "my-alpha");
      expect(readFileSync(path.join(dir, "SKILL.md"), "utf8")).toMatch(/^name: my-alpha$/m);
      expect(yaml.load(readFileSync(path.join(dir, "meta.yaml"), "utf8"))).toMatchObject({ name: "my-alpha", version: "0.1.0", "display-name-zh": "阿尔法" });
      expect(existsSync(path.join(dir, "references", "guide.md"))).toBe(true);
      r = await http.post("/api/skills/fork").send({ name: "alpha" });
      expect(r.body).toEqual({ ok: true, name: "my-alpha-2" });
      expect(byName((await http.get("/api/skills")).body, "my-alpha")).toMatchObject({ source: "user", version: "0.1.0" });
    });

    it("fork 的错误：缺名字、非法名字、不在已装目录", async () => {
      expect((await http.post("/api/skills/fork").send({})).body).toEqual({ ok: false, error: "name is required" });
      expect((await http.post("/api/skills/fork").send({ name: "../x" })).body).toEqual({ ok: false, error: "invalid skill name" });
      expect((await http.post("/api/skills/fork").send({ name: "mine" })).body).toEqual({ ok: false, error: 'Skill "mine" not found in installed skills' });
    });

    it("user/trash 只给出用户技能的路径，不动文件", async () => {
      let r = await http.post("/api/skills/user/trash").send({ name: "mine" });
      expect(r.body).toEqual({ ok: true, path: path.join(user, "mine") });
      expect(existsSync(path.join(user, "mine"))).toBe(true);
      r = await http.post("/api/skills/user/trash").send({ name: "beta-one" });
      expect(r.body).toEqual({ ok: false, error: 'Skill "beta-one" not found in user skills' });
      expect((await http.post("/api/skills/user/trash").send({})).body).toEqual({ ok: false, error: "name is required" });
      expect((await http.post("/api/skills/user/trash").send({ name: "a/b" })).body).toEqual({ ok: false, error: "invalid skill name" });
    });
  });

  describe("导入", () => {
    beforeEach(() => rmSync(skillStagingRoot(), { recursive: true, force: true }));

    const EXPORTED = "exported-by: MiniMax-hub";

    it("导出的 .md 直接装进用户目录；缺的引用列出来", async () => {
      const md = `---\nname: from-md\n${EXPORTED}\ndescription: 导出的\n---\n\n读 references/a.md 再开始。\n`;
      const r = await http.post("/api/skills/import").attach("file", Buffer.from(md), "from-md.md");
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ ok: true, needsRestart: true, autoFixed: false, skill: { name: "from-md", source: "user", enabled: true }, missingReferences: ["references/a.md"] });
      expect(readFileSync(path.join(user, "from-md", "SKILL.md"), "utf8")).toBe(md);
    });

    it("第三方 .md 没有 name：用文件名补上，先暂存等适配；确认后装进用户目录", async () => {
      const md = "# 我的技能\n\n这是一段简介。\n\n更多内容。\n";
      let r = await http.post("/api/skills/import").attach("file", Buffer.from(md), "Cool Skill.md");
      expect(r.body).toMatchObject({ ok: true, needsAdaptation: true, skill: { name: "cool-skill", summary: "这是一段简介。" } });
      expect(r.body.conflict).toBeUndefined();
      const staged = r.body.stagingPath;
      expect(staged).toBe(path.join(root, "tmp", "ov-skill-staging", "cool-skill"));
      expect(readFileSync(path.join(staged, "SKILL.md"), "utf8")).toBe(`---\nname: cool-skill\nsummary-en: "这是一段简介。"\n---\n\n${md}`);

      r = await http.post("/api/skills/import/confirm-staging").send({ stagingPath: staged, name: "cool-renamed" });
      expect(r.body).toMatchObject({ ok: true, needsRestart: true, skill: { name: "cool-renamed", source: "user" } });
      expect(readFileSync(path.join(user, "cool-renamed", "SKILL.md"), "utf8")).toMatch(/^name: cool-renamed$/m);
      expect(existsSync(staged)).toBe(false);
    });

    it("zip：包里套一层目录也认；第三方包和已装技能重名时给建议名", async () => {
      const zip = makeZip({
        "pkg/SKILL.md": "---\nname: alpha\ndescription: 第三方同名\n---\n\n见 scripts/run.sh\n",
        "pkg/scripts/run.sh": { content: "#!/bin/sh\necho hi\n", mode: 0o100755 },
        "__MACOSX/._x": "junk",
      });
      const r = await http.post("/api/skills/import").attach("file", zip, "pkg.zip");
      expect(r.body).toMatchObject({ ok: true, needsAdaptation: true, conflict: { type: "official", existingName: "alpha" }, suggestedName: "my-alpha-3" });
      const staged = r.body.stagingPath;
      expect(existsSync(path.join(staged, "scripts", "run.sh"))).toBe(true);
      if (process.platform !== "win32") expect(readFileSync(path.join(staged, "scripts", "run.sh"), "utf8")).toContain("echo hi");
      // 解压用的临时目录不留在用户目录里。
      expect(readdirSync(user).some((n) => n.startsWith("__import"))).toBe(false);
    });

    it("导出的 zip 直接装：套的那层去掉，可执行位保留", async () => {
      const zip = makeZip({
        "outer/SKILL.md": `---\nname: zipped\n${EXPORTED}\n---\n\n跑 scripts/run.sh\n`,
        "outer/scripts/run.sh": { content: "#!/bin/sh\n", mode: 0o100755 },
      });
      const r = await http.post("/api/skills/import").attach("file", zip, "zipped.zip");
      expect(r.body).toMatchObject({ ok: true, needsRestart: true, skill: { name: "zipped" } });
      expect(r.body.missingReferences).toBeUndefined();
      const script = path.join(user, "zipped", "scripts", "run.sh");
      expect(existsSync(script)).toBe(true);
      if (process.platform !== "win32") expect(statSync(script).mode & 0o111).not.toBe(0);
      expect(byName((await http.get("/api/skills")).body, "zipped")).toMatchObject({ source: "user" });
    });

    it("导出的包和用户技能重名：暂存 + conflict，不覆盖", async () => {
      const md = `---\nname: mine\n${EXPORTED}\n---\n\n新版本\n`;
      const r = await http.post("/api/skills/import").attach("file", Buffer.from(md), "mine.md");
      expect(r.body).toMatchObject({ ok: true, conflict: { type: "user", existingName: "mine" }, suggestedName: "my-mine" });
      expect(r.body.needsAdaptation).toBeUndefined();
      expect(readFileSync(path.join(user, "mine", "SKILL.md"), "utf8")).toContain("我自己的");
    });

    // 纯 JS 解压失败后会退到系统工具：Windows 上是 PowerShell 的 Expand-Archive，启动就要十几秒
    it("坏的 zip：两种解压都失败时回 extract_failed", { timeout: 90_000 }, async () => {
      const r = await http.post("/api/skills/import").attach("file", Buffer.from("not a zip"), "bad.zip");
      expect(r.body).toMatchObject({ ok: false, errorType: "extract_failed" });
    });

    it("导入的错误：没文件、类型不对、zip 里没有 SKILL.md、名字非法", async () => {
      let r = await http.post("/api/skills/import");
      expect(r.status).toBe(400);
      expect(r.body.message).toBe("file is required");
      // 扩展名不在白名单：multer 丢掉，按没收到文件处理。
      r = await http.post("/api/skills/import").attach("file", Buffer.from("x"), "a.exe");
      expect(r.status).toBe(400);
      r = await http.post("/api/skills/import").attach("file", Buffer.from("x"), "a.png");
      expect(r.body).toEqual({ ok: false, errorType: "unsupported_type", error: "Only .zip and .md files are supported" });
      r = await http.post("/api/skills/import").attach("file", makeZip({ "readme.txt": "hi" }), "x.zip");
      expect(r.body).toEqual({ ok: false, errorType: "no_skill_md", error: "SKILL.md not found in zip file" });
      r = await http.post("/api/skills/import").attach("file", Buffer.from("---\nname: ../evil\n---\n"), "evil.md");
      expect(r.body).toEqual({ ok: false, errorType: "invalid_format", error: 'Invalid skill name: "../evil"', missingFields: ["name"] });
      r = await http.post("/api/skills/import").attach("file", Buffer.from("\n\n"), "skill.md");
      expect(r.body).toEqual({ ok: false, errorType: "invalid_format", error: "Cannot determine skill name. Please add a name field to the file.", missingFields: ["name"] });
    });

    it("zip 里的 ../ 条目跳过，不会写到目标外面", async () => {
      const zip = makeZip({ "SKILL.md": `---\nname: slip\n${EXPORTED}\n---\n`, "../../escaped.txt": "boom" });
      const r = await http.post("/api/skills/import").attach("file", zip, "slip.zip");
      expect(r.body).toMatchObject({ ok: true, skill: { name: "slip" } });
      expect(existsSync(path.join(root, "escaped.txt"))).toBe(false);
      expect(existsSync(path.join(user, "escaped.txt"))).toBe(false);
    });

    it("confirm-staging 的错误", async () => {
      let r = await http.post("/api/skills/import/confirm-staging").send({ name: "x" });
      expect(r.status).toBe(400);
      expect(r.body.message).toBe("name and stagingPath are required");
      r = await http.post("/api/skills/import/confirm-staging").send({ name: "../x", stagingPath: "/tmp/a" });
      expect(r.body.message).toBe("Invalid skill name");
      r = await http.post("/api/skills/import/confirm-staging").send({ name: "x", stagingPath: user });
      expect(r.body).toEqual({ ok: false, errorType: "invalid_staging_path", error: "Invalid staging path" });
      r = await http.post("/api/skills/import/confirm-staging").send({ name: "x", stagingPath: path.join(skillStagingRoot(), "gone") });
      expect(r.body).toEqual({ ok: false, errorType: "staging_not_found", error: "Staging directory not found. Please re-upload the file." });
    });
  });

  describe("技能市场（自带技能）", () => {
    // 渲染层的公共参数一并带上：它们必须被忽略，而不是当成筛选条件或让请求 400。
    const COMMON = "device_platform=desktop&app_id=3001&version_code=3.0.16&unix=1";

    it("只列已装目录里的自带技能（不含用户技能和子代理技能）；来源按 meta 的 source 分精选 / 用户 / 其他", async () => {
      let r = await http.get(`/api/skills/market?page=1&page_size=20&${COMMON}`);
      expect(r.status).toBe(200);
      expect(r.body.total).toBe(2);
      expect(r.body.skills.map((s: any) => s.name).sort()).toEqual(["alpha", "beta-one"]);
      r = await http.get(`/api/skills/market?page=1&page_size=20&source=official-featured&${COMMON}`);
      expect(r.body).toMatchObject({ total: 1, skills: [{ name: "alpha", source: "official-featured" }] });
      r = await http.get("/api/skills/market?source=community");
      expect(r.body).toMatchObject({ total: 1, skills: [{ name: "beta-one" }] });
      // 「其他」是 meta 里写 official 的，这里没有。
      r = await http.get("/api/skills/market?source=official");
      expect(r.body).toEqual({ skills: [], total: 0 });
    });

    it("条目字段齐全、一律已装；没写分类代码时从标签的一级分类推出来", async () => {
      const r = await http.get("/api/skills/market?source=official-featured");
      const alpha = byName(r.body.skills, "alpha");
      expect(alpha).toMatchObject({
        name: "alpha",
        version: "1.2.3",
        displayNameZh: "阿尔法",
        summaryZh: "中文简介",
        description: "第一个",
        tags: ["video", "ad"],
        tagEn: "Ads",
        completeTagsEn: ["Ads", "Video / Editing"],
        categoryCodes: ["Ads", "Video"],
        installed: true,
        updateAvailable: false,
        installedVersion: "1.2.3",
        guidePrompt: "为我解释一下这个技能的最佳使用方式。",
      });
    });

    it("按标签筛、分页、搜索；插件市场是空的", async () => {
      let r = await http.get("/api/skills/market?tag=Video");
      expect(r.body.skills.map((s: any) => s.name)).toEqual(["alpha"]);
      r = await http.get("/api/skills/market?page=2&page_size=1");
      expect(r.body.total).toBe(2);
      expect(r.body.skills).toHaveLength(1);
      r = await http.get("/api/skills/market/search?query=阿尔法&page=1&page_size=20");
      expect(r.body).toMatchObject({ total: 1, skills: [{ name: "alpha" }] });
      r = await http.get("/api/skills/market?skill_type=plugin");
      expect(r.body).toEqual({ plugins: [], total: 0 });
    });

    it("分类从标签归纳；同步状态、运营身份、投稿记录回空结果", async () => {
      let r = await http.get(`/api/skills/market/categories?tag_type=all&${COMMON}`);
      expect(r.body.categories.map((c: any) => [c.tag_type, c.category])).toEqual([
        ["category", "Ads"],
        ["category", "Video"],
        ["stage", "Editing"],
      ]);
      r = await http.get("/api/skills/market/categories");
      expect(r.body.categories.map((c: any) => c.category)).toEqual(["Ads", "Video"]);
      expect(r.body.categories[0]).toMatchObject({ en_name: "Ads", cn_name: "Ads", enabled: true, sort_order: 0 });
      r = await http.get("/api/skills/market/sync-status");
      expect(r.body).toEqual({ syncing: false, progress: null, lastSyncAt: null, lastSyncResult: null });
      r = await http.get("/api/skills/market/check-operator");
      expect(r.body).toEqual({ is_operator: false, role: "none" });
      r = await http.get("/api/skills/creator-plan/submissions");
      expect(r.body).toEqual({ submissions: [] });
    });
  });
});
