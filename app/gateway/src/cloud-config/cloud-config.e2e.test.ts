import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../bootstrap.js";
import { HOME_SHOWCASE_ASSET_FILES } from "./home-showcase.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

// 渲染层给每个请求挂的公共参数，路由必须当它们不存在。
const COMMON = "device_platform=desktop&app_id=3001&version_code=3.0.16&biz_id=0&unix=1790348478040&os_name=macOS";

describe("云端配置类路由的本地默认值", () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let root = "";

  beforeAll(async () => {
    root = mkdtempSync(path.join(tmpdir(), "ov-cloud-config-e2e-"));
    process.env.WORKSPACE_DIR = root;
    process.env.HILO_DATA_DIR = path.join(root, "hub");
    // 已装技能直接指到仓库自带的那批：首页示例绑定的技能必须在里面。
    process.env.HUB_SKILLS_DIR = path.join(REPO, "assets/skills");
    app = await createApp();
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
    delete process.env.WORKSPACE_DIR;
    delete process.env.HILO_DATA_DIR;
    delete process.env.HUB_SKILLS_DIR;
    rmSync(root, { recursive: true, force: true });
  });

  it("client_config / hub client_config：空对象，渲染层每一项都走默认", async () => {
    expect((await http.get(`/api/v1/client_config?${COMMON}`)).body).toEqual({});
    expect((await http.get(`/api/v1/hub/client_config?${COMMON}`)).body).toEqual({});
  });

  it("Apollo：认识的 key 回渲染层能解析的配置，不认识的 404", async () => {
    let r = await http.get(`/api/v1/apollo/config?key=tool_call_display_config&${COMMON}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ displayLabels: {}, labelIds: {} });

    r = await http.get(`/api/v1/apollo/config?key=home_tabs_showcase_config&${COMMON}`);
    expect(r.body).toMatchObject({ schema_version: 1, enabled: true, default_primary_id: "inspiration" });
    const skillTab = r.body.primary_categories.find((c: any) => c.id === "skill");
    expect(skillTab.provider).toMatchObject({ type: "skill-market", source: "official-featured" });

    r = await http.get("/api/v1/apollo/config?key=home_skill_showcase_config");
    expect(r.body.secondary_categories).toEqual([{ id: "all", title: { zh: "全部", en: "All" }, query: { source: "official-featured" } }]);
    expect((await http.get("/api/v1/apollo/config?key=home_project_showcase_config")).body).toEqual({ schema_version: 1, enabled: true, sections: [] });
    expect((await http.get("/api/v1/apollo/config?key=hub_entries")).body).toEqual({});
    expect((await http.get("/api/v1/apollo/config?key=no_such_key")).status).toBe(404);
  });

  it("首页快速开始：云端原文去掉「工具互联」后（7 分区 152 条示例），按渲染层解析规则逐条校验", async () => {
    const r = await http.get(`/api/v1/home/quick_start_config?config_version=2&${COMMON}`);
    expect(r.status).toBe(200);
    const cfg = r.body;
    // 整份配置：版本号、开关、分区数、序列化后的大小（渲染层超过 1MB 整份丢弃）。
    expect(cfg.schema_version).toBe(2);
    expect(cfg.enabled).toBe(true);
    expect(cfg.sections.length).toBeLessThanOrEqual(16);
    expect(Buffer.byteLength(JSON.stringify(cfg))).toBeLessThan(1_000_000);

    // 云端原文 8 个分区去掉「工具互联」（产品暂不提供，见 HIDDEN_SHOWCASE_SECTION_IDS），其余顺序与云端一致。
    // 隐藏的分区连同它的页签、素材都不该出现在任何地方。
    expect(JSON.stringify(cfg)).not.toContain("tool-integration");
    const scenes = cfg.sections.filter((s: any) => s.type === "prompt");
    expect(scenes.map((s: any) => s.id)).toEqual([
      "effects-packaging",
      "influencer-marketing",
      "cinematic-intro",
      "mv",
      "game-pv",
      "brand-advertising",
      "ui-motion",
    ]);
    expect(scenes.every((s: any) => s.showcase === true)).toBe(true);

    let total = 0;
    for (const s of scenes) {
      expectIdentifier(s.id);
      expectLocalized(s.title);
      // 云端分区不带 icon（渲染层有自己的兜底图标）；手写兜底配置才有 icon。
      expect(s.items.length).toBeGreaterThan(0);
      expect(s.items.length).toBeLessThanOrEqual(64);
      expect(new Set(s.items.map((i: any) => i.id)).size).toBe(s.items.length);
      total += s.items.length;
      for (const it of s.items) {
        expectIdentifier(it.id);
        expectLocalized(it.title);
        expectLocalized(it.prompt);
        // 云端示例没有 description（渲染层拿提示词当卡片描述）；有 skill / media 的也不该有。
        expect(it.description).toBeUndefined();
        expect(it.skill).toBeUndefined();
        // model_id 是 {domestic, overseas}（两个区域的模型 id 不同，如 gamma-6-astra / gpt-6-astra）。
        if (it.model_id !== undefined) {
          expect(typeof it.model_id.domestic).toBe("string");
          expect(typeof it.model_id.overseas).toBe("string");
        }
        // attachments 是可选字段（云端有 12 条示例没有这个字段）；类型有 image / video / audio。
        if (it.attachments !== undefined) {
          expect(it.attachments.length).toBeLessThanOrEqual(14);
          for (const a of it.attachments) {
            expect(["image", "video", "audio"]).toContain(a.type);
            expect(a.name.trim()).toBe(a.name);
            // aliases 可选（云端有附件没这个字段）。
            if (a.aliases !== undefined) {
              expect(a.aliases.every((x: unknown) => typeof x === "string" && x.trim().length > 0)).toBe(true);
            }
          }
        }
        // 云端示例的提示词不带 /技能名 前缀（不依赖技能市场），整份配置一条绑技能的都没有。
        for (const text of [it.prompt.zh, it.prompt.en]) {
          expect(text.startsWith("/")).toBe(false);
        }
      }
    }
    // 7 分区共 152 条（12+7+18+11+30+36+38；原文 8 分区 165 条，去掉的「工具互联」是 13 条）。
    expect(total).toBe(152);

    // 每条示例都有输出（效果演示：封面 + 视频，cover/video 是 {domestic, overseas}）。
    for (const s of scenes) {
      for (const it of s.items) {
        expect(it.outputs.length).toBeGreaterThan(0);
        for (const o of it.outputs) {
          expectIdentifier(o.id);
          expectLocalized(o.title);
          expect(["image", "video"]).toContain(o.media);
          expect(typeof o.cover.domestic).toBe("string");
          // image 类输出没有 video 字段。
          if (o.video !== undefined) expect(typeof o.video.domestic).toBe("string");
        }
      }
    }
    // 云端原文没有精选技能分区（Skill 页签的数据来自 home_skill_showcase_config，不在这里）。
    expect(cfg.sections.filter((s: any) => s.type === "skill")).toHaveLength(0);
  });

  it("首页示例素材：配置里的图片地址都能从静态路由取到（视频保持 CDN 原地址）", async () => {
    const cfg = (await http.get("/api/v1/home/quick_start_config?config_version=2")).body;
    const imageUrls = new Set<string>();
    const videoUrls = new Set<string>();
    for (const s of cfg.sections) {
      for (const it of s.items) {
        for (const a of it.attachments ?? []) {
          const urls = [a.url.domestic, a.url.overseas];
          if (a.type === "image") for (const url of urls) imageUrls.add(url);
          else for (const url of urls) videoUrls.add(url); // video / audio 附件保持 CDN
        }
        for (const o of it.outputs) {
          if (o.cover) for (const url of [o.cover.domestic, o.cover.overseas]) imageUrls.add(url);
          if (o.video) for (const url of [o.video.domestic, o.video.overseas]) videoUrls.add(url);
        }
      }
    }
    // 422 个图片 URL 全部本地化（domestic/overseas 各自的 key）；304 个媒体 URL（video/audio 附件 + 输出视频）保持 CDN。
    // （原文 452 / 318，去掉「工具互联」的 13 条示例后剩下这些。）
    expect(imageUrls.size).toBe(422);
    expect([...imageUrls].every((u) => u.startsWith("/api/v1/home/showcase-assets/"))).toBe(true);
    expect(videoUrls.size).toBe(304);
    // 视频主机有三种（cdn.hailuoai.com / cdn.hailuoai.video / cdn.hailuo.ai），原文如此。
    expect([...videoUrls].every((u) => /^https:\/\/cdn\.hailuoai\.(com|video)\/|^https:\/\/cdn\.hailuo\.ai\//.test(u))).toBe(true);

    // 抽 3 张图核对。**这里有两种合法环境，用同一份断言盖住**：
    //
    // - 仓库里下过素材（本地开发）：`assets/home-showcase/media/` 有文件 → 200，字节逐一对得上。
    // - 仓库里没下过（CI、新 clone、发布包）：那个目录是 gitignore 的，CI 不下载 →
    //   路由 302 回登记的 CDN 原地址。这正是注释里写的那条契约
    //   （「新 clone / 发布包没带素材时界面照常工作，只是图走网络」）。
    //
    // 之前这里无条件要求 200 + 读本地文件比对，于是 **CI 必挂** —— 那条断言是 1b2ff45 加的，
    // 而 CI 上一轮成功（2adc15e）在它之前，所以它从来没在 CI 上跑过。
    const manifest = JSON.parse(readFileSync(path.join(REPO, "assets/home-showcase/media-manifest.json"), "utf8")) as Record<string, { url: string }>;
    for (const url of [...imageUrls].slice(0, 3)) {
      const key = decodeURIComponent(url.split("/").pop()!);
      const local = path.join(REPO, "assets/home-showcase/media", key);
      if (existsSync(local)) {
        const r = await http.get(url).buffer(true);
        expect(r.status, key).toBe(200);
        expect(r.headers["content-type"]).toMatch(/^image\//);
        expect(Buffer.compare(r.body, readFileSync(local)), key).toBe(0);
      } else {
        // redirects(0)：默认 supertest 会跟 302，跟了就看不到这个状态本身。
        const r = await http.get(url).redirects(0);
        expect(r.status, key).toBe(302);
        expect(r.headers.location, key).toBe(manifest[key]?.url);
      }
    }

    // legacy 的 8 个文件 + 使用教程 PDF 也还在（渲染层缓存的旧配置还引用）。
    for (const name of HOME_SHOWCASE_ASSET_FILES) {
      const r = await http.get(`/api/v1/home/showcase-assets/${encodeURIComponent(name)}`);
      expect(r.status, name).toBe(200);
    }
    expect((await http.get("/api/v1/home/showcase-assets/nope.png")).status).toBe(404);
    expect((await http.get(`/api/v1/home/showcase-assets/${encodeURIComponent("../../package.json")}`)).status).toBe(404);
    expect((await http.get(`/api/v1/home/showcase-assets/..%2Fskills`)).status).toBe(404);
  });

  it("云端示例没有技能绑定（这正是换云端原文的收益：不会弹「安装 Skill 失败」）", async () => {
    const cfg = (await http.get("/api/v1/home/quick_start_config?config_version=2")).body;
    for (const s of cfg.sections) {
      for (const it of s.items) {
        expect(it.skill, `${it.id}`).toBeUndefined();
        expect(it.prompt.zh.startsWith("/") || it.prompt.en.startsWith("/"), `${it.id}`).toBe(false);
      }
    }
    // 自带技能市场照常工作（Skill 页签的数据源），和创作灵感无关。
    const local = await http.get("/api/skills");
    const names = new Set((local.body.skills ?? local.body).map((x: any) => x.name));
    expect(names.has("3d-animation-short-generator")).toBe(true);
  });

  it("图片本地还没有时 302 回 CDN（新 clone / 发布包没带素材时界面照常工作）", async () => {
    const manifest = JSON.parse(readFileSync(path.join(REPO, "assets/home-showcase/media-manifest.json"), "utf8")) as Record<string, { url: string }>;
    const [key, entry] = Object.entries(manifest)[0]!;
    const file = path.join(REPO, "assets/home-showcase/media", key);
    // CI 上 media/ 整个目录都不存在（gitignore + CI 不下载），这时候没有可挪走的文件，
    // 直接断言 302 即可 —— 挪一个不存在的文件会 ENOENT，那才是这条用例在 CI 上挂的原因。
    if (!existsSync(file)) {
      const direct = await http.get(`/api/v1/home/showcase-assets/${key}`).redirects(0).buffer(true);
      expect(direct.status).toBe(302);
      expect(direct.headers.location).toBe(entry.url);
      return;
    }
    const backup = `${file}.e2e-bak`;
    renameSync(file, backup);
    try {
      // superagent 默认跟 302，关掉才能看到这个状态本身。
      const r = await http.get(`/api/v1/home/showcase-assets/${key}`).redirects(0).buffer(true);
      expect(r.status).toBe(302);
      expect(r.headers.location).toBe(entry.url);
    } finally {
      renameSync(backup, file);
    }
  });

  it("首启预热写进可写缓存后，路由优先发缓存那份（而不是包内那份旧图）", async () => {
    // 缓存目录由 HILO_HOMESHOWCASE_CACHE 指定（主进程给 userData/home-showcase）。
    // 必须在 createApp 之前设好 —— showcaseCacheDir 是每次请求时读的，但这里要跟
    // 路由读的是同一个值，设晚了就测不到这条路径。
    const cacheRoot = path.join(root, "home-showcase-cache");
    process.env.HILO_HOMESHOWCASE_CACHE = cacheRoot;
    try {
      const manifest = JSON.parse(readFileSync(path.join(REPO, "assets/home-showcase/media-manifest.json"), "utf8")) as Record<string, { url: string }>;
      const [key] = Object.entries(manifest)[0]!;
      const media = path.join(cacheRoot, "media");
      mkdirSync(media, { recursive: true });
      // 内容故意和真图不一样：能断言出「发的是缓存那份」而不是碰巧命中包内。
      writeFileSync(path.join(media, key), "缓存里的图");

      const r = await http.get(`/api/v1/home/showcase-assets/${key}`).buffer(true);
      expect(r.status).toBe(200);
      expect(r.body.toString()).toBe("缓存里的图");
    } finally {
      delete process.env.HILO_HOMESHOWCASE_CACHE;
    }
  });

  it("弹窗 / 计费活动 / 视频试用：「不弹」「没有活动」「不可领」", async () => {
    expect((await http.get(`/api/v1/popup?${COMMON}`)).body).toEqual({
      announcements: [],
      popup_type: 0,
      id: "",
      title: "",
      description: "",
      can_close: true,
      mute_range_time: 0,
      cover_url: "",
      video_url: "",
      banner_text: "",
    });
    expect((await http.get(`/api/v1/billing/promotion?${COMMON}`)).body).toEqual({ promotion: null, models: [] });
    const empty = { claimed: false, claimable: false, freeCount: 0, remainingCount: 0, claimHint: "", activityActive: false };
    expect((await http.get(`/api/v1/promotions/hailuo03-video-trial/status?${COMMON}`)).body).toEqual(empty);
    const claim = await http.post("/api/v1/promotions/hailuo03-video-trial/claim");
    expect(claim.status).toBe(201);
    expect(claim.body).toEqual(empty);
  });

  it("积分钱包、计费价格、团队协议、团队列表：不计费、团队功能暂不可用", async () => {
    expect((await http.get(`/api/v1/credit/wallet?${COMMON}`)).body).toEqual({ wallets: [], migrate_end_time: 0 });
    expect((await http.get(`/api/v1/billing/pricing?${COMMON}`)).body).toEqual({ enabled: false });
    const contract = (await http.get(`/api/v1/team/contract?client_version=3.0.16&${COMMON}`)).body;
    // 渲染层逐字段严格校验：兼容性只认三个值，limits 三个字段都要是整数
    expect(contract.compatibility).toBe("TEMPORARILY_UNAVAILABLE");
    expect(Object.values(contract.gates).every((v) => v === false)).toBe(true);
    for (const k of ["max_groups_including_personal", "max_members_per_team", "max_member_page_size"]) expect(Number.isSafeInteger(contract.limits[k])).toBe(true);
    expect((await http.get(`/backend/group/list?biz_line=4&${COMMON}`)).body).toEqual({ groups: [], user_group_roles: {} });
  });

  it("插件、ComfyUI 工作流：空列表", async () => {
    expect((await http.get(`/api/plugins?${COMMON}`)).body).toEqual({ plugins: [] });
    expect((await http.get(`/api/comfyui/workflows?${COMMON}`)).body).toEqual({ workflows: [] });
    expect((await http.get("/api/comfyui/featured-workflows?locale=zh")).body).toEqual({ workflows: [], total: 0 });
  });

  it("资产中心：库还没建时列表为空、未初始化；参数写错 400", async () => {
    expect((await http.get(`/api/asset-center/entities?${COMMON}`)).body).toEqual({ entities: [] });
    expect((await http.get("/api/asset-center/entities?type=character&limit=5&sort=use_count")).body).toEqual({ entities: [] });
    expect((await http.get("/api/asset-center/library-status")).body).toEqual({ initialized: false });
    expect((await http.get("/api/asset-center/entities?type=monster")).status).toBe(400);
    expect((await http.get("/api/asset-center/entities?limit=0")).status).toBe(400);
    expect((await http.get("/api/asset-center/entities?sort=random")).status).toBe(400);
    expect((await http.get(`/api/asset-center/workspace-refs?workspace=${encodeURIComponent(root)}`)).body).toEqual({ refs: [] });
    expect((await http.get("/api/asset-center/workspace-refs?workspace=relative")).status).toBe(400);
  });
});

// 渲染层配置里的 id / 技能名规则：小写字母数字开头，只含小写字母数字和 . _ -，最长 128。
function expectIdentifier(v: unknown) {
  expect(v).toMatch(/^[a-z0-9][a-z0-9._-]{0,127}$/);
}

// 中英文都要有、去掉首尾空白后不能为空（缺一边时渲染层拿另一边顶上，这里要求两边都写全）。
function expectLocalized(v: any) {
  expect(typeof v?.zh === "string" && v.zh.trim().length > 0).toBe(true);
  expect(typeof v?.en === "string" && v.en.trim().length > 0).toBe(true);
}
