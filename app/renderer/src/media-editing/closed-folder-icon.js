/**
 * ClosedFolderIcon（4.0.3 新增）：带分隔线的「闭合文件夹」图标。
 *
 * 移植自参照 index-B3Ss5vz1.js 第 2781 行起：
 *   withIconCompositing(createLucideIcon("FolderClosed", [ 轮廓 path, 中缝 path ]))
 * **SVG 路径数据逐字照搬**（这是图标的全部内容，改一个坐标就画错）。
 *
 * 为什么要自建而不是直接用 lucide 的 FolderClosed：
 * 参照用的是自定义几何（轮廓 + 一条 10.8 高度的中缝），
 * 与 lucide 自带的 FolderClosed 不完全一样；而且它要经 withIconCompositing
 * 走本仓库的图标合成管线（描边/填充的统一处理）。
 */

import { createLucideIcon } from "lucide-react";

import { withIconCompositing } from "../canvas-v3/main-exports.js";

export const ClosedFolderIcon = withIconCompositing(
  createLucideIcon("FolderClosed", [
    [
      "path",
      {
        d: "M9.849024 3.719532 C10.39692 3.71964 10.924932 3.928212 11.325 4.30254 L12.85374 5.734572 C13.10064 5.965632 13.42728 6.094212 13.76544 6.094344 H19.05528 C20.3808 6.094344 21.45558 7.169232 21.45588 8.493744 V17.652 C21.45588 18.97746 20.3808 20.05254 19.05528 20.05254 H4.943556 C3.618312 20.05224 2.543556 18.97728 2.543556 17.652 V6.119532 C2.543688 4.794336 3.618396 3.719808 4.943556 3.719532 Z",
        key: "outline",
      },
    ],
    ["path", { d: "M2.543556 10.8H21.45588", key: "divider" }],
  ]),
);
