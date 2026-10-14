// 这套几何对不上已装的 lucide，工厂比公开的 createLucideIcon 多 viewBox 和填充参数。
import reactExports from "react";
import { withIconCompositing } from "./icon-compositing.js";

export const SIZE_STROKE_WIDTH_MAP = {
  12: 1.33,
  14: 1.33,
  16: 1.67,
  20: 2.33,
  24: 2.67,
  32: 3
};
export const getDefaultStrokeWidth = size => {
  const sizeNum = typeof size === "string" ? parseInt(size, 10) : size;
  if (SIZE_STROKE_WIDTH_MAP[sizeNum] !== void 0) {
    return SIZE_STROKE_WIDTH_MAP[sizeNum];
  }
  if (sizeNum <= 14) return 1.33;
  if (sizeNum <= 16) return 1.67;
  if (sizeNum <= 20) return 2.33;
  if (sizeNum <= 24) return 2.67;
  return 3;
};


const createLucideIcon$1 = (iconName, iconNode, viewBox = "0 0 24 24", isFillIcon = false) => {
  const Component = reactExports.forwardRef(({
    color: color2 = "currentColor",
    size: size2 = 20,
    strokeWidth,
    className,
    children: children2,
    ...props
  }, ref) => {
    const strokeWidthValue = strokeWidth !== void 0 ? strokeWidth : getDefaultStrokeWidth(size2);
    const svgProps = isFillIcon ? {
      // Fill 图标：使用 fill 属性，不设置 stroke
      ref,
      xmlns: "http://www.w3.org/2000/svg",
      width: size2,
      height: size2,
      viewBox,
      fill: color2,
      className,
      ...props
    } : {
      // Stroke 图标（Lucide 风格）：使用 stroke 属性
      ref,
      xmlns: "http://www.w3.org/2000/svg",
      width: size2,
      height: size2,
      viewBox,
      fill: "none",
      stroke: color2,
      strokeWidth: strokeWidthValue,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      ...props
    };
    return reactExports.createElement("svg", svgProps, [...iconNode.map(([tag, attrs], i2) => reactExports.createElement(tag, {
      key: i2,
      ...attrs
    })), ...(Array.isArray(children2) ? children2 : children2 ? [children2] : [])]);
  });
  Component.displayName = iconName.split("-").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  return Component;
};
const Brain$3 = createLucideIcon$1("brain", [["path", {
  "d": "M12 18V5m3 8a4.17 4.17 0 0 1-3-4a4.17 4.17 0 0 1-3 4m8.598-6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"
}], ["path", {
  "d": "M17.997 5.125a4 4 0 0 1 2.526 5.77"
}], ["path", {
  "d": "M18 18a4 4 0 0 0 2-7.464"
}], ["path", {
  "d": "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"
}], ["path", {
  "d": "M6 18a4 4 0 0 1-2-7.464"
}], ["path", {
  "d": "M6.003 5.125a4 4 0 0 0-2.526 5.77"
}]], "0 0 24 24", false);
const Check$3 = createLucideIcon$1("check", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M20 6L9 17l-5-5"
}]], "0 0 24 24", false);
const ChevronDown$3 = createLucideIcon$1("chevron-down", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "m6 9l6 6l6-6"
}]], "0 0 24 24", false);
const CircleAlert$3 = createLucideIcon$1("circle-alert", [["circle", {
  "cx": "12",
  "cy": "12",
  "r": "10"
}], ["path", {
  "d": "M12 8v4m0 4h.01"
}]], "0 0 24 24", false);
const Clapperboard$3 = createLucideIcon$1("clapperboard", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M20.2 6L3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Zm-14-.7l3.1 3.9m3.1-5.8l3.1 4M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
}]], "0 0 24 24", false);
const Download$3 = createLucideIcon$1("download", [["path", {
  "d": "M12 15V3m9 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
}], ["path", {
  "d": "m7 10l5 5l5-5"
}]], "0 0 24 24", false);
const ExternalLink$3 = createLucideIcon$1("external-link", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M15 3h6v6m-11 5L21 3m-3 10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
}]], "0 0 24 24", false);
const Eye$3 = createLucideIcon$1("eye", [["path", {
  "d": "M2.062 12.348a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 19.876 0a1 1 0 0 1 0 .696a10.75 10.75 0 0 1-19.876 0"
}], ["circle", {
  "cx": "12",
  "cy": "12",
  "r": "3"
}]], "0 0 24 24", false);
const File$4 = createLucideIcon$1("file", [["path", {
  "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
}], ["path", {
  "d": "M14 2v5a1 1 0 0 0 1 1h5"
}]], "0 0 24 24", false);
const Film$3 = createLucideIcon$1("film", [["rect", {
  "width": "18",
  "height": "18",
  "x": "3",
  "y": "3",
  "rx": "2"
}], ["path", {
  "d": "M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18m0-13.5h4m-4 9h4"
}]], "0 0 24 24", false);
const FolderInput$3 = createLucideIcon$1("folder-input", [["path", {
  "d": "M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1m0-4h10"
}], ["path", {
  "d": "m9 16l3-3l-3-3"
}]], "0 0 24 24", false);
const Headphones$3 = createLucideIcon$1("headphones", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"
}]], "0 0 24 24", false);
const Megaphone$3 = createLucideIcon$1("megaphone", [["path", {
  "d": "M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
}], ["path", {
  "d": "M6 14a12 12 0 0 0 2.4 7.2a2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14M8 6v8"
}]], "0 0 24 24", false);
const Music$3 = createLucideIcon$1("music", [["path", {
  "d": "M9 18V5l12-2v13"
}], ["circle", {
  "cx": "6",
  "cy": "18",
  "r": "3"
}], ["circle", {
  "cx": "18",
  "cy": "16",
  "r": "3"
}]], "0 0 24 24", false);
const Package$3 = createLucideIcon$1("package", [["path", {
  "d": "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zm1 .27V12"
}], ["path", {
  "d": "M3.29 7L12 12l8.71-5M7.5 4.27l9 5.15"
}]], "0 0 24 24", false);
const Plus$3 = createLucideIcon$1("plus", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M5 12h14m-7-7v14"
}]], "0 0 24 24", false);
const Search$3 = createLucideIcon$1("search", [["path", {
  "d": "m21 21l-4.34-4.34"
}], ["circle", {
  "cx": "11",
  "cy": "11",
  "r": "8"
}]], "0 0 24 24", false);
const Share2$3 = createLucideIcon$1("share-2", [["circle", {
  "cx": "18",
  "cy": "5",
  "r": "3"
}], ["circle", {
  "cx": "6",
  "cy": "12",
  "r": "3"
}], ["circle", {
  "cx": "18",
  "cy": "19",
  "r": "3"
}], ["path", {
  "d": "m8.59 13.51l6.83 3.98m-.01-10.98l-6.82 3.98"
}]], "0 0 24 24", false);
const ShoppingBag$3 = createLucideIcon$1("shopping-bag", [["path", {
  "d": "M16 10a4 4 0 0 1-8 0M3.103 6.034h17.794"
}], ["path", {
  "d": "M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"
}]], "0 0 24 24", false);
const Square$3 = createLucideIcon$1("square", [["rect", {
  "width": "18",
  "height": "18",
  "x": "3",
  "y": "3",
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "rx": "2"
}]], "0 0 24 24", false);
const Trash2$3 = createLucideIcon$1("trash-2", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
}]], "0 0 24 24", false);
export const Ungroup$1 = createLucideIcon$1("ungroup", [["rect", {
  "width": "8",
  "height": "6",
  "x": "5",
  "y": "4",
  "rx": "1"
}], ["rect", {
  "width": "8",
  "height": "6",
  "x": "11",
  "y": "14",
  "rx": "1"
}]], "0 0 24 24", false);
const Video$3 = createLucideIcon$1("video", [["path", {
  "d": "m16 13l5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"
}], ["rect", {
  "width": "14",
  "height": "12",
  "x": "2",
  "y": "6",
  "rx": "2"
}]], "0 0 24 24", false);
const Wrench$3 = createLucideIcon$1("wrench", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
}]], "0 0 24 24", false);
export const Brain$2 = /* @__PURE__ */withIconCompositing(Brain$3);
export const Check$2 = /* @__PURE__ */withIconCompositing(Check$3);
export const ChevronDown$2 = /* @__PURE__ */withIconCompositing(ChevronDown$3);
export const CircleAlert$2 = /* @__PURE__ */withIconCompositing(CircleAlert$3);
export const Clapperboard$2 = /* @__PURE__ */withIconCompositing(Clapperboard$3);
export const Download$2 = /* @__PURE__ */withIconCompositing(Download$3);
export const ExternalLink$2 = /* @__PURE__ */withIconCompositing(ExternalLink$3);
export const Eye$2 = /* @__PURE__ */withIconCompositing(Eye$3);
export const File$3 = /* @__PURE__ */withIconCompositing(File$4);
export const Film$2 = /* @__PURE__ */withIconCompositing(Film$3);
export const FolderInput$2 = /* @__PURE__ */withIconCompositing(FolderInput$3);
export const Headphones$2 = /* @__PURE__ */withIconCompositing(Headphones$3);
export const Megaphone$2 = /* @__PURE__ */withIconCompositing(Megaphone$3);
export const Music$2 = /* @__PURE__ */withIconCompositing(Music$3);
export const Package$2 = /* @__PURE__ */withIconCompositing(Package$3);
export const Plus$2 = /* @__PURE__ */withIconCompositing(Plus$3);
export const Search$2 = /* @__PURE__ */withIconCompositing(Search$3);
export const Share2$2 = /* @__PURE__ */withIconCompositing(Share2$3);
export const ShoppingBag$2 = /* @__PURE__ */withIconCompositing(ShoppingBag$3);
export const Square$2 = /* @__PURE__ */withIconCompositing(Square$3);
export const Trash2$2 = /* @__PURE__ */withIconCompositing(Trash2$3);
export const Video$2 = /* @__PURE__ */withIconCompositing(Video$3);
export const Wrench$2 = /* @__PURE__ */withIconCompositing(Wrench$3);
