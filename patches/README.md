# 不能直接升级的包

这些改动是应用行为，不在对应 npm 版本的公开代码里。升级时先读这里，再把同一处改动打回新版本，然后跑界面门禁。不要为了消掉补丁改应用。

| 包 | 文件 | 为什么还留着 |
|---|---|---|
| `@base-ui/react@1.3.0` | `patches/@base-ui__react@1.3.0.patch` | 补上 `./esm/*` 导出。应用按深路径引用包内模块，公开 `exports` 没有这条，解析会失败。 |
| `mediabunny@1.44.2` | `patches/mediabunny@1.44.2.patch` | 补上 `bitstream.js` 的导出。HEVC 参数、可变长整数和 Ogg 页写入与这份应用用的行为不一致，按应用侧保留。 |
| `@mediabunny/mp3-encoder@1.44.2` | `patches/@mediabunny__mp3-encoder@1.44.2.patch` | 短尾帧不再提前返回空头，帧头里也不再带 `lowSamplingFrequency`。和现有解码路径一致。 |
| `mutative@1.3.0` | `patches/mutative@1.3.0.patch` | 严格模式下直接读可变数据一律拒绝；创建 store 时不再要求选项必须是普通对象。 |

xyflow 不在这张表里。应用改过的画布行为在 `app/renderer/src/vendor-fork/xyflow/`，升级步骤写在同目录的 `CHANGES.md`。renderer 不再依赖 npm 上的 `@xyflow/react` 和 `@xyflow/system`。
