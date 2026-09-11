# 应用名与可执行文件名

| | 值 | 谁看得见 |
|---|---|---|
| `productName` | 蒜狸小助手 | Finder / Dock / 菜单栏 / dmg / 开始菜单 / 安装向导 |
| `mainBinaryName`（macOS） | 蒜狸小助手 | `Contents/MacOS/`、活动监视器 |
| `mainBinaryName`（Windows / Linux） | `ovdesktop` | `.exe` 文件名、任务管理器 |

## 为什么 Windows 上不能用中文可执行文件名

试过，**打不出 MSI**。CI 上的表现是 `candle` 通过、`light` 失败：

```
Running candle for "...\wix\x64\main.wxs"
Running light to produce ...\bundle\msi\蒜狸小助手_3.0.12_x64_en-US.msi
failed to bundle project: `failed to run ...\WixTools314\light.exe`
```

`light.exe` 是把文件塞进 MSI cab 的那一步，WiX 3 对非 ASCII 的**源文件名**
处理不干净（MSI 输出文件名带中文是没问题的 —— 改名之前每次发布都这样，
一直是好的）。Tauri 不转发 light 的 stderr，所以日志里只有这一句。

macOS 那边没有这个限制，所以用 `tauri.macos.conf.json` 单独覆盖。
Tauri v2 会把 `tauri.<platform>.conf.json` 合并到基础配置上。

**改这里之前先想清楚**：`mainBinaryName` 提到根配置里去，Windows 的包会
当场打不出来，而错误信息和"名字"这件事看不出任何关系。
