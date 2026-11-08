# 品牌字体

`suanli-brand.woff2` = **Ma Shan Zheng Regular v2.003**（OFL-1.1，Google Fonts）的子集。

## 为什么要子集

全字重 5.6MB，界面只用到品牌名那几个字。这里按「品牌名 + 侧栏字标」实际出现的字裁成
~15KB 的 woff2（`fontTools.subset`，保留 name 表与 layout 特性）。

## 改品牌名时必须重做子集

原来的子集只含 47 个字形（`蒜狸小助手` 那 5 个字都在）。改成 `蒜狸设计台` 后，
**设 / 台 不在里面**，浏览器按字回退到系统字体 —— 于是同一行里一半毛笔楷书、
一半黑体，看起来像两种字体拼在一起。

重做步骤：

```bash
curl -s -o /tmp/mashanzheng.ttf \
  "https://fonts.gstatic.com/s/mashanzheng/v18/NaPecZTRCLxvwo41b4gvzkXaRMQ.ttf"
pip install brotli
python3 - <<'PY'
from fontTools import subset
from fontTools.ttLib import TTFont
need = {ord(c) for c in "蒜狸设计台"}
full = TTFont("/tmp/mashanzheng.ttf")
opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]
opts.name_IDs = ["*"]; opts.name_legacy = True; opts.name_languages = ["*"]
sub = subset.Subsetter(options=opts); sub.populate(unicodes=need); sub.subset(full)
full.flavor = "woff2"; full.save("app/renderer/src/brand/suanli-brand.woff2")
PY
```

OFL 允许再分发与修改，但保留字体名与版权声明；`name` 表已在子集里原样保留。
