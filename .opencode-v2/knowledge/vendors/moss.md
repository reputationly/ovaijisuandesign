---
vendor: moss
modality: audio.tts
status: active
provider: platform
backend: maas
---

# moss -- audio.tts 路由卡片（平台模型 indextts-2.5）

## 能力

- 平台语音模型是零样本克隆：每个音色 id 在用户设置的音色表里对应一段参考音频，合成时模仿那段声音。
- 平台**没有预设音色**，也不能靠文字描述设计新音色；工具里的克隆 / 设计动作在本平台不可用。
- `texts` 是字符串时出一条，是数组时每条出一个文件；多角色对白按角色分别指定音色。

## 选择边界

- 旁白、对白配音、朗读都走这一条；想要"电影感演绎"也只能靠文本和参考音频本身，没有另一个引擎可换。
- 视频里需要人物开口时，优先让视频模型自带音轨（见 `minimax.md`），只有需要独立音频或后期混音时才单独合成。

## 调用约定

- 不传 `vendor`；`model_name` 用 `speech-2.8-hd`（只是接口词，实际都落到平台语音模型）。
- 音色 id 只能来自三处：用户亲口给的 id（`voice_id_source: "user"`）、`hub_voice_prepare` 的 `search_catalog` 结果（`"catalog"`）。不要编造，也不要依赖工具的缺省音色。
- `search_catalog` 必须带 language；音色表里的条目没有语言标注，搜索可能一个都搜不到。搜不到时直接问用户用哪个音色 id；用户也不知道就说明要先在设置里配置音色映射。
- 语速、情绪、音调、音量等参数平台不生效；语气靠文本措辞和标点表达。
- 需要精确时长（对口型、卡点）时，用结果里的 `duration` 或 `hub_audio_meta` 取实测值。

## 已知 bug

- 设置里没配语音模型时报"models.speech 未配置"：告诉用户去设置补，不要重试。
- 音色 id 不在音色表里会报错并列出可用 id，照列出的 id 重新选一次即可，别换成陌生音色。

## Pointer

- 路由总表：`<knowledgeDir>/vendors/platform-routing.md`
