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

import { __jsx } from "../shared/jsx-runtime.js";
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

/**
 * OpenFolderIcon（4.0.3 新增）：带透视的「打开文件夹」图标，与 ClosedFolderIcon 配对。
 * 路径数据逐字取自参照 createLucideIcon("FolderOpen", [...])。
 */
export const OpenFolderIcon = withIconCompositing(
  createLucideIcon("FolderOpen", [
    [
      "path",
      {
        d: "M21.45396 10.800588 L21.452388 8.491992 C21.4509 7.167564 20.37624 6.094344 19.0518 6.094344 H13.76304 C13.42446 6.0942 13.09782 5.966256 12.850764 5.733396 L11.326764 4.304292 C10.92642 3.929016 10.39776 3.719532 9.849024 3.719532 H4.943556 C3.618396 3.719808 2.543688 4.794336 2.543556 6.119532 V17.652 C2.543556 18.97728 3.618312 20.05224 4.943556 20.05254 H19.03188 C20.12478 20.05254 21.08028 19.31388 21.35508 18.25608 L22.83048 12.579504 C23.06544 11.67588 22.38672 10.800588 21.45408 10.800588 H9.333396 C8.51436 10.800588 7.76526 11.263512 7.3998 11.996448 L5.603316 15.6",
        key: "outline",
      },
    ],
  ]),
);


/**
 * 首页项目选择器里的文件夹图标（4.0.3）。
 * 就是 ClosedFolderIcon 加了固定尺寸与更细的描边 —— 参照里也是这么封装的。
 */
export function HomeProjectFolderIcon() {
  return __jsx(ClosedFolderIcon, {
    size: 16,
    strokeWidth: 1.44,
    className: "size-4 shrink-0",
    "aria-hidden": true,
  });
}
