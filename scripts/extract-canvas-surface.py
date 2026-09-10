#!/usr/bin/env python3
"""从 MiniMax Design 的 renderer 产物提取画布交互面，生成 docs/canvas-surface.md。

用法：先解包 app.asar 到某个目录，然后

    python3 scripts/extract-canvas-surface.py <解包目录>

**为什么要有这个脚本**：在此之前是等用户报「这里跟官方不一样」，再去 bundle 里
扒对应那一段 —— 必然是他先发现、我再补，一条一条来。一次性把清单导出来，
才能自己按表走完。

提取三样：
- 所有 `dataActionUiId` 及其 label / description（i18n 已解引用）
- 所有 `data-action-ui-id`
- 节点类型枚举

只记接口事实，不含官方文件原文。应用升级后重跑，`git diff` 就是接口面的变化。
"""
import sys
import pathlib, re, json, collections

ROOT=sys.argv[1] if len(sys.argv)>1 else "."
s="".join(p.read_text(encoding="utf8",errors="replace") for p in sorted((pathlib.Path(ROOT) / "out/renderer/assets").glob("*.js")))

# 1) 所有 MenuItem：label(i18n key) + dataActionUiId
i18n=dict(re.findall(r'"([a-zA-Z][A-Za-z0-9_.]{2,70})":\s*"((?:[^"\\]|\\.)*)"',s))
menu=[]
for m in re.finditer(r'dataActionUiId:\s*"([^"]+)"',s):
    j=m.start()
    seg=s[max(0,j-1200):j]
    lm=None
    for x in re.finditer(r'label:\s*t2\("([^"]+)"',seg): lm=x
    dm=None
    for x in re.finditer(r'description:\s*t2\("([^"]+)"',seg): dm=x
    menu.append((m.group(1), i18n.get(lm.group(1),lm.group(1)) if lm else "", i18n.get(dm.group(1),"") if dm else ""))
# 2) 所有 canvas.* 动作 id
ids=sorted(set(re.findall(r'data-action-ui-id"?\s*[:=]\s*"([^"]+)"',s)))
# 3) 节点类型
types=sorted(set(re.findall(r'CanvasNodeType\.([A-Z][A-Za-z]+)',s)))
json.dump({"menu": menu, "ids": ids, "nodeTypes": types},
          open("/tmp/inv.json", "w"), ensure_ascii=False)
print("菜单项",len(menu),"| 动作 id",len(ids),"| 节点类型",types)
