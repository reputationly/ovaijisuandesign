/**
 * LQIP 地址推导的自检（4.0.3 增量）。
 *
 * 为什么单独做：渲染层没有测试运行器（`app/renderer` 的 scripts 只有 build），
 * 而这套 LQIP 的行为规则很具体 —— 只对回环地址、只在原图比占位图大时才生成、
 * 缩略图接口和视频音频一律不生成。写错一条就会给每个 <img> 多打一次无用的请求。
 *
 * 被测模块 app/renderer/src/media-editing/lqip-url.js 是从参照
 * index-B3Ss5vz1.js 的 deriveLqipUrl 原样抽出来的（不含 React，可直接跑）。
 */
// 静态 import：run-all 会用 esbuild 把每个 check 打成单文件再跑，
// 运行时拼绝对路径的 dynamic import 打不进去（第一版就是这么失败的）。
import {
  LQIP_PIXEL_WIDTH,
  deriveLqipUrl,
} from "../../../app/renderer/src/media-editing/lqip-url.js";

const cases = [
  // [说明, 输入, 期望]
  ["回环 http + w>64 才生成", "http://127.0.0.1:8080/api/asset/file.png?w=800&path=a.png", (u) =>
    u?.includes("w=64") && u?.includes("thumbnail_fallback=error")],
  ["localhost 也算回环", "http://localhost:8080/a.png?w=800", (u) => !!u],
  ["IPv6 回环 [::1]", "http://[::1]:8080/a.png?w=800", (u) => !!u],
  ["外部主机不生成", "https://cdn.example.com/a.png?w=800", (u) => u === undefined],
  ["非 http(s) 不生成", "data:image/png;base64,AAAA?w=800", (u) => u === undefined],
  ["w 等于占位宽度不生成", `http://127.0.0.1/a.png?w=${LQIP_PIXEL_WIDTH}`, (u) => u === undefined],
  ["w 小于占位宽度不生成", "http://127.0.0.1/a.png?w=32", (u) => u === undefined],
  ["没有 w 参数不生成", "http://127.0.0.1/a.png", (u) => u === undefined],
  ["缩略图接口不生成", "http://127.0.0.1:8080/api/thumbnail/a.png?w=800", (u) => u === undefined],
  ["视频扩展名不生成", "http://127.0.0.1/a.mp4?w=800", (u) => u === undefined],
  ["音频扩展名不生成", "http://127.0.0.1/a.mp3?w=800", (u) => u === undefined],
  ["扩展名在 path 参数里也认", "http://127.0.0.1:8080/f?w=800&path=x.mov", (u) => u === undefined],
  ["大写扩展名也认", "http://127.0.0.1/a.MP4?w=800", (u) => u === undefined],
  ["相对地址不生成", "/a.png?w=800", (u) => u === undefined],
  ["空值不生成", "", (u) => u === undefined],
  ["undefined 不生成", undefined, (u) => u === undefined],
];

let bad = 0;
for (const [label, input, ok] of cases) {
  let out;
  try {
    out = deriveLqipUrl(input);
  } catch (err) {
    console.log(`  ✗ ${label}：抛错 ${err instanceof Error ? err.message : String(err)}`);
    bad += 1;
    continue;
  }
  if (!ok(out)) {
    console.log(`  ✗ ${label}：得到 ${JSON.stringify(out)}`);
    bad += 1;
  }
}

// 生成出来的地址必须保留原有查询参数（path=… 这类不能被丢掉）
const kept = deriveLqipUrl("http://127.0.0.1:8080/f?w=800&path=sub%2Fa.png&x=1");
if (!kept?.includes("path=sub%2Fa.png") || !kept?.includes("x=1")) {
  console.log(`  ✗ 原有查询参数被丢掉：${kept}`);
  bad += 1;
}

if (bad) {
  console.log(`✗ LQIP 地址推导：${bad} 条不符合预期`);
  process.exit(1);
}
console.log(`✓ LQIP 地址推导：${cases.length + 1} 条全部符合预期`);
