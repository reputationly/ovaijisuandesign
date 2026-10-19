/**
 * 保留字/危险属性名集合（第 146 轮）。
 * 叶子模块：不导入 canvas-v3 里任何文件。
 */
const forbidden = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);

export { forbidden };
