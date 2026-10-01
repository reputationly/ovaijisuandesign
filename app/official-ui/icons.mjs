// 界面图标的定制表。**改图标只改这个文件** —— build.mjs 会把这张表编译进产物，
// 换掉官方那两个图标工厂的数据来源，不动官方任何一行实现。
//
// 键就是官方图标名（两个工厂各自的第一个参数）：
//   Plus、ChevronDown  —— 大写驼峰那套（265 个，class 是 lucide-plus）
//   plus、chevron-down —— 小写连字符那套（24 个，来自另一个库）
//
// 值有两种写法：
//
//   1) 图标数据（lucide 的 path 数组）—— 复用官方的渲染，颜色 / 尺寸 / 描边 / className 全部原样：
//        Plus: [["path", { d: "M12 5.5v13" }], ["path", { d: "M5.5 12h13" }]],
//
//   2) 组件 —— 自己画。调用方传进来的 props 从第一个参数拿，需要 jsx / react 时用第二个参数 h：
//        House: (props, h) => h.jsx("img", { width: props.size, height: props.size, src: "..." }),
//      h 里有：jsx、jsxs、Fragment（官方同一套运行时）、react（React 本身）、
//              createElement、Icon（官方那个画 svg 的壳子，收 iconNode）。
//
// 没写的图标继续用官方那份数据。表里函数的第二种写法**不能引用任何外部名字**
// （要用什么都从 h 里拿）：这张表是用 toString() 贴进产物的，闭包不会跟着过去。
export const ICONS = {
  // 示例：加号两端加端点。形状和官方明显不同，8 屏里每屏都能看到好几个，适合验证整条链路。
  Plus: [
    ["path", { d: "M12 5.5v13" }],
    ["path", { d: "M5.5 12h13" }],
    ["circle", { cx: "12", cy: "5.5", r: "1.7" }],
    ["circle", { cx: "12", cy: "18.5", r: "1.7" }],
  ],
};
