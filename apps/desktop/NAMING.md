# 应用名与 Windows 安装包的语言

| | 值 |
|---|---|
| `productName` | 蒜狸小助手 |
| `mainBinaryName` | 蒜狸小助手 |

Finder / Dock / 菜单栏 / dmg / 开始菜单 / 安装向导 / 活动监视器 / 任务管理器,
全都是「蒜狸小助手」。

## Windows：`wix.language` 必须是 zh-CN

**不设的话 MSI 打不出来。** WiX 默认按 `en-US` 生成，对应的 MSI 字符串表用
代码页 **1252（西欧）**,装不下中文 —— 而产品名和可执行文件名都是中文，
会被写进 `main.wxs` 的十几处字符串里：

```
main.wxs(23) : error LGHT0311 : A string was provided with characters that are
not available in the specified database code page '1252'.
```

`zh-CN` 对应代码页 936，中文放得下。

**这一条是"能不能用中文名"的唯一前提。** 谁要是哪天把 language 去掉或改回
en-US，Windows 的包会当场打不出来，而报错信息和"语言"这件事看不出关系。

## 排查这个问题花了三轮，记下来免得重走

Tauri **不转发子进程的 stderr**,light.exe 失败时日志里只有一句
`failed to run light.exe`。照着这一句猜了两次，两次都错：

1. 以为是中文的**可执行文件名** —— 改回 ASCII，照样失败。
2. 以为是 MSI **输出文件名**里的中文 —— 那个一直是中文，之前都是好的。

真因要给打包命令加 `-v` 才看得到（已经加在 release.yml 里了）。

还有一个方法论上的教训：判断"上次成功和这次只差这一个变量"时要当心 ——
上次成功是两天前，中间整个 gateway 都动过，那个前提本身就不成立。
