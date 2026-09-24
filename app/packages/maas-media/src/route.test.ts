import { describe, expect, it } from "vitest";

import { type Models, defaultModels } from "./config.js";
import { Modality, modalityOf, route } from "./route.js";

function models(): Models {
  return {
    ...defaultModels(),
    image: "qwen-image",
    image_edit: "qwen-image-edit",
    video: "minimax-h3-fl2va",
    video_ref: "minimax-h3-ref2va",
    music: "minimax-music3",
    music_edit: "ace-step-v1",
    speech: null,
  };
}

describe("route", () => {
  it("no model given uses the configured default", () => {
    const r = route(models(), null, Modality.Image)!;
    expect(r.model).toBe("qwen-image");
    expect(r.substituted).toBe(false);
  });

  it("an official name is swapped and reported", () => {
    // 静默换掉会让人以为用的是它要的那个模型。
    const r = route(models(), "nano-banana", Modality.Image)!;
    expect(r.model).toBe("qwen-image");
    expect(r.requested).toBe("nano-banana");
    expect(r.substituted).toBe(true);
  });

  it("naming our own model is left alone", () => {
    // 允许直接指定我们平台上的模型，不该被"路由"一下又换回默认。
    const r = route(models(), "qwen-image-edit", Modality.Image)!;
    expect(r.model).toBe("qwen-image-edit");
    expect(r.substituted).toBe(false);
  });

  it("edit models do not fall into the text to image bucket", () => {
    // 顺序写反的话 `qwen-image-edit` 会被 `qwen-image` 先命中，
    // 于是所有图生图请求都静默走成了文生图。
    expect(modalityOf("seedream-5-layer-decompose")).toBe(Modality.ImageEdit);
    expect(modalityOf("nano_banana_2")).toBe(Modality.Image);
    const r = route(models(), "seedream-5-layer-decompose", Modality.Image)!;
    expect(r.model).toBe("qwen-image-edit");
  });

  it("official video and music names land on the right modality", () => {
    const m = models();
    expect(route(m, "MiniMax-Hailuo-2.3", Modality.Video)!.model).toBe("minimax-h3-fl2va");
    expect(route(m, "music-3.0", Modality.Music)!.model).toBe("minimax-music3");
    // 参考生视频有单独的 checkpoint。
    expect(route(m, "minimax-h3-ref2va", Modality.Video)!.model).toBe("minimax-h3-ref2va");
  });

  it("an unknown name falls back to this calls modality", () => {
    // 外部随时会冒出新模型名。认不出不该变成一次失败 ——
    // agent 手里的提示词是通用的，不可能知道这台机器上配了什么。
    const r = route(models(), "brand-new-model-9", Modality.Video)!;
    expect(r.model).toBe("minimax-h3-fl2va");
    expect(r.substituted).toBe(true);
  });

  it("a modality with nothing configured returns none", () => {
    // speech 没配。**这时必须是 null 而不是硬塞一个别的模态的模型** ——
    // 拿出图的模型去合成语音，上游会返回一个看不懂的错误。
    expect(route(models(), "speech-2.8-hd", Modality.Speech)).toBeNull();
  });

  it("cover does not fall into the text to music bucket", () => {
    // `music-cover` 里含 `music`。顺序写反的话翻唱会静默走成文生音乐，
    // 出来一首和原曲完全无关的歌 —— 有声音、不报错。
    expect(modalityOf("music-cover")).toBe(Modality.MusicEdit);
    expect(modalityOf("music-3.0")).toBe(Modality.Music);
    expect(route(models(), "music-cover", Modality.Music)!.model).toBe("ace-step-v1");
  });

  it("music edit never falls back to plain music", () => {
    // 只有 ACE-Step 吃 cover / repaint。退回文生音乐等于换了首歌。
    const m = models();
    m.music_edit = null;
    expect(route(m, "music-cover", Modality.MusicEdit)).toBeNull();
  });

  it("image edit falls back to image when not configured", () => {
    const m = models();
    m.image_edit = null;
    expect(route(m, null, Modality.ImageEdit)!.model).toBe("qwen-image");
  });

  it("the models on our own platform are recognised", () => {
    // 这几个名字里没有 image / video 之类的线索。认不出的话 route()
    // 会把它们悄悄换成该模态的默认模型 —— 用户点名要 z-image，
    // 拿到的是 qwen-image 出的图，而且**不报错**。
    for (const m of ["z-image", "id4", "kr2", "hunyuan-image-3", "sensenova-u1.5"]) {
      expect(modalityOf(m), m).toBe(Modality.Image);
    }
    for (const m of ["swiftvr", "seedvr2"]) {
      expect(modalityOf(m), m).toBe(Modality.Video);
    }
    for (const m of ["breeze-tts-2", "indextts-2.5"]) {
      expect(modalityOf(m), m).toBe(Modality.Speech);
    }
    expect(modalityOf("minimax-music3")).toBe(Modality.Music);
    expect(modalityOf("ace-step")).toBe(Modality.MusicEdit);
    expect(modalityOf("minimax-h3-fl2va")).toBe(Modality.Video);
    expect(modalityOf("minimax-h3-ref2va")).toBe(Modality.VideoRef);
  });

  it("a model the platform really has is used as asked", () => {
    // 平台上真有 z-image 时，点名要它就该拿到它 —— 而不是被
    // "认不出 → 退回默认"换成 qwen-image。
    const m = models();
    m.image = "z-image";
    const r = route(m, "z-image", Modality.Image)!;
    expect(r.model).toBe("z-image");
    expect(r.substituted).toBe(false);
  });

  it("naming our own cover model does not silently get text to music", () => {
    // music_edit 不在 `configured` 里的话，点名 ace-step 会退回
    // 文生音乐那个模型 —— 出来一段和原曲完全无关的歌，有声音、不报错。
    const m = models();
    const cover = m.music_edit;
    if (cover === null) throw new Error("测试夹具要配一个翻唱模型");
    let r = route(m, cover, Modality.MusicEdit)!;
    expect(r.model).toBe(cover);
    expect(r.substituted, "点名我们自己配的模型不该被替换").toBe(false);
    // 就算调用方把模态传成了 Music，也不该拿文生音乐顶上。
    r = route(m, cover, Modality.Music)!;
    expect(r.model, "被换成了文生音乐 —— 出来的歌和原曲无关").toBe(cover);
  });
});
