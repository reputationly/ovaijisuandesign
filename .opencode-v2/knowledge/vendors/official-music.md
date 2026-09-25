---
vendor: music
modality: audio.music
status: active
provider: platform
backend: maas
---

# 音乐 -- audio.music 路由卡片（平台模型 minimax-music3）

## 能力

- 文生音乐：一次调用出一首完整曲目，可以是带人声的歌，也可以是纯器乐。
- 风格描述会先由对话模型扩写成结构化的编曲说明再送进音乐模型，所以 `prompt` 写清流派、配器、速度、情绪、人声类型即可，不必堆砌。
- 没有时长参数，成曲长度由模型决定；翻唱、局部重绘不在工具能力内。

## 调用约定

- 不传 `vendor`；`model_id` 用 `music-3.0`。
- `mode: instrumental` 做背景音乐、配乐、纯音乐，`lyrics` 会被忽略。
- `mode: song` 必须带 `lyrics`，而且歌词要先给用户确认。只声明要人声却不给歌词会被拒绝。
- 歌词段落标记用方括号、首字母大写：`[Intro]` `[Verse]` `[Pre-Chorus]` `[Chorus]` `[Post-Chorus]` `[Bridge]` `[Instrumental]` `[Solo]` `[Outro]`。写成 "Verse 1:" 这类散文标题不报错，但编曲会失去段落起伏。
- `prompt` 不能为空；风格描述和歌词分别放在 `prompt` 与 `lyrics`，不要混写。
- 需要固定时长时先生成，再用 `hub_ffmpeg` 截到目标长度并在结尾做淡出。

## 已知 bug

- 扩写风格描述偶尔失败时会退回原描述继续生成，编曲可能偏平；用户不满意时把描述写得更具体再生成一次。
- 生成要排队，耗时可能数分钟；结果带 `do_not_resubmit` 时不要重发。

## Pointer

- 路由总表：`<knowledgeDir>/vendors/platform-routing.md`
