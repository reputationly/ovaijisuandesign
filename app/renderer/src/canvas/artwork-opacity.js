// 把透明度写进作品滤镜。


export function withArtworkOpacity(style2, opacity) {
  return {
    ...style2,
    filter: [style2?.filter === "none" ? void 0 : style2?.filter, `opacity(${opacity})`].filter(Boolean).join(" ")
  };
}
