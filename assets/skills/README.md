# 自带的 Skill

这批来自 MiniMax Design（`meta.yaml` 里 `author-cn: MiniMax Design` /
`source: official`），原样收录，没有改写。

**保留了每个 skill 自己的 `meta.yaml`**，出处和作者信息都在里面 ——
去掉那些会让它们看起来像我们写的。

第一次启动时由 `gateway::skills::seed` 铺到工作区的
`.hilo/skills/<slug>/`，之后**不再覆盖**：用户改过的那份是他自己的。

要更新到新版本，重新从官方应用的 `~/.hub/skills` 拷一遍，或者在
Skill 页点「导入」。
