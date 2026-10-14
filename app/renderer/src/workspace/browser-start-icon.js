// 浏览器起始图标的 CDN 路径。
import { cdnPublicAsset } from "../infra/runtime-config.js";

export const CDN_BROWSER_START_ICON = {
  light: cdnPublicAsset({
    domestic: "browser-start-light-c973f13f8fb1.png",
    overseas: "browser-start-light-c973f13f8fb1.png"
  }),
  dark: cdnPublicAsset({
    domestic: "browser-start-dark-96ed32bceae3.png",
    overseas: "browser-start-dark-96ed32bceae3.png"
  })
};
