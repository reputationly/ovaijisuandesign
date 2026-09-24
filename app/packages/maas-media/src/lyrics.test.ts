import { describe, expect, it } from "vitest";

import { type Client, createClient } from "./client.js";
import { type MediaConfig, defaultMediaConfig, defaultModels } from "./config.js";
import { PlatformError } from "./error.js";
import { MAX_TOKENS, Mode, SYSTEM_PROMPT, TEMPERATURE, TIMEOUT_MS, draft, parse, sanitize } from "./lyrics.js";

/** 本该失败的调用竟然成功了。放在 `.then(unexpected, …)` 里，让失败分支的类型收窄成 PlatformError。 */
const unexpected = (): never => {
  throw new Error("本该失败");
};

function offline(): Client {
  return createClient({
    fetch: () => {
      throw new Error("这个用例不该发出任何网络请求");
    },
  });
}

describe("lyrics", () => {
  it("strips code fences and preamble", () => {
    // 这两种污染都不会报错，只会被当成歌词唱出来。
    const raw = "好的，这是为你写的歌词：\n\n```lyrics\n[Verse]\n夏天的风\n[Chorus]\n我们还在\n```";
    expect(sanitize(raw)).toBe("[Verse]\n夏天的风\n[Chorus]\n我们还在");
  });

  it("keeps unmarked lyrics rather than emptying them", () => {
    // 少了结构信息，但总比交出空歌词强。
    expect(sanitize("  夏天的风轻轻吹过  ")).toBe("夏天的风轻轻吹过");
  });

  it("drops a preamble that precedes the first marker", () => {
    expect(sanitize("这是歌词：\n[Verse]\n夏天的风")).toBe("[Verse]\n夏天的风");
  });

  it("the contract pins the section markers", () => {
    // 写成 `Verse 1:` 不报错，只是让编曲拿不到结构信息。
    for (const marker of ["[Intro]", "[Verse]", "[Chorus]", "[Bridge]", "[Outro]"]) {
      expect(SYSTEM_PROMPT.includes(marker), `缺少 ${marker}`).toBe(true);
    }
  });

  // -- 三段输出 -------------------------------------------------------------

  it("splits title style and lyrics", () => {
    const raw =
      "TITLE: 今晚一起跳舞吧\nSTYLE: Pop, Dance, Upbeat\nLYRICS:\n[Verse]\n灯光亮起的瞬间\n[Chorus]\n今晚一起跳舞吧";
    const d = parse(raw);
    expect(d.song_title).toBe("今晚一起跳舞吧");
    expect(d.style_tags).toBe("Pop, Dance, Upbeat");
    expect(d.lyrics).toBe("[Verse]\n灯光亮起的瞬间\n[Chorus]\n今晚一起跳舞吧");
  });

  it("a missing header still yields the lyrics", () => {
    // 模型偶尔会忘掉格式直接开始写词。丢掉整份输出比交出一首没歌名的歌
    // 差得多 —— 歌名能让用户补，歌词重写要再花一次额度和一分半钟。
    const d = parse("[Verse]\n夏天的风\n[Chorus]\n我们还在");
    expect(d.lyrics).toBe("[Verse]\n夏天的风\n[Chorus]\n我们还在");
    expect(d.song_title).toBe("");
  });

  it("a fenced block around the whole thing is still parsed", () => {
    const raw = "```\nTITLE: 夏天\nSTYLE: Folk\nLYRICS:\n[Verse]\n风\n```";
    const d = parse(raw);
    expect(d.song_title).toBe("夏天");
    expect(d.lyrics).toBe("[Verse]\n风");
  });

  it("lyrics containing brackets and quotes survive", () => {
    // 这正是不用 JSON 的原因：这份内容塞进 JSON 字符串，模型转义错一个
    // 字整份就解不出来，而那时歌词已经写好了、只是取不出来。
    const raw = 'TITLE: "引号" 之歌\nSTYLE: Rock\nLYRICS:\n[Verse]\n他说："走吧"\n[Chorus]\n{再见}';
    const d = parse(raw);
    expect(d.song_title).toBe('"引号" 之歌');
    expect(d.lyrics).toContain('"走吧"');
    expect(d.lyrics).toContain("{再见}");
  });

  // -- 模式 -----------------------------------------------------------------

  it("an unknown mode writes rather than edits", () => {
    // edit 走错会去改一份不存在的稿。
    expect(Mode.parse("edit")).toBe(Mode.Edit);
    expect(Mode.parse("write_full_song")).toBe(Mode.WriteFullSong);
    expect(Mode.parse("shrug")).toBe(Mode.WriteFullSong);
    expect(Mode.parse(null)).toBe(Mode.WriteFullSong);
  });

  it("an empty brief is reported before any network call", async () => {
    const err = await draft(offline(), defaultMediaConfig(), Mode.WriteFullSong, "   ", "", null).then(unexpected, (e: unknown) => e as PlatformError);
    expect(err).toBeInstanceOf(PlatformError);
    expect(err.code).toBe("dpp.config");
    expect(err.message).toContain("风格描述");
  });

  it("editing nothing is refused instead of inventing a song", async () => {
    // 凭空编的那首会被当成"润色后的用户原稿"念给用户听。
    const err = await draft(offline(), defaultMediaConfig(), Mode.Edit, "抒情", "  ", null).then(unexpected, (e: unknown) => e as PlatformError);
    expect(err).toBeInstanceOf(PlatformError);
    expect(err.message).toContain("write_full_song");
  });
});

// ---------------------------------------------------------------------------
// TS 移植新增
// ---------------------------------------------------------------------------

describe("lyrics（TS 移植新增）", () => {
  function cfg(): MediaConfig {
    return {
      platform: { base_url: "https://maas.example.com/v1", api_key: "k", chat_model: "qwen" },
      models: defaultModels(),
    };
  }

  it("点了名的歌名压过模型起的；温度 / 预算 / 超时照 Rust", async () => {
    let sent: Record<string, unknown> = {};
    const client = createClient({
      fetch: async (_input, init) => {
        sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json({
          choices: [{ message: { content: "TITLE: 模型起的\nSTYLE: Folk\nLYRICS:\n[Verse]\n风" } }],
        });
      },
    });
    const d = await draft(client, cfg(), Mode.Edit, "抒情", "夏天的风", "我起的");
    expect(d).toEqual({ song_title: "我起的", style_tags: "Folk", lyrics: "[Verse]\n风" });
    expect(sent.temperature).toBe(TEMPERATURE);
    expect(sent.max_tokens).toBe(MAX_TOKENS);
    expect([TEMPERATURE, MAX_TOKENS, TIMEOUT_MS]).toEqual([0.8, 4000, 90_000]);
    const user = (sent.messages as { content: string }[])[1]!.content;
    expect(user).toBe(
      "把下面这份歌词扩展并润色成一首完整的歌，保持原有的意思和意象：\n\n夏天的风\n\n风格要求：抒情\n\n歌名用：我起的",
    );
  });

  it("模型只回了开场白、没有歌词时报协议错误", async () => {
    const client = createClient({
      fetch: async () => Response.json({ choices: [{ message: { content: "TITLE: x\nLYRICS:\n   " } }] }),
    });
    const err = await draft(client, cfg(), Mode.WriteFullSong, "夏天", "").then(unexpected, (e: unknown) => e as PlatformError);
    expect(err.code).toBe("dpp.protocol");
  });
});
