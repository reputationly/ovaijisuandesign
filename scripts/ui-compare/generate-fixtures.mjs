import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function makePdf() {
  const stream = "BT /F1 18 Tf 40 110 Td (PDF.js fixture page) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body);
}

function seededText(seed, length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789 ";
  const result = new Array(length);
  let state = seed >>> 0;
  for (let i = 0; i < length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    result[i] = alphabet[state % alphabet.length];
  }
  return result.join("");
}

export function generateFixtures(workspace) {
  const filesDir = path.join(workspace, "ui-compare-fixtures");
  mkdirSync(filesDir, { recursive: true });
  const pdfPath = path.join(filesDir, "viewer.pdf");
  const videoPath = path.join(filesDir, "viewer.mp4");
  const audioPath = path.join(filesDir, "viewer.wav");
  const markdownPath = path.join(filesDir, "preview.md");
  const jsPath = path.join(filesDir, "editor.js");
  const sourceMarkdownPath = path.join(filesDir, "editor.md");
  writeFileSync(pdfPath, makePdf());
  writeFileSync(markdownPath, [
    "# Markdown preview fixture",
    "",
    "Fenced JavaScript code block:",
    "",
    "```js",
    "const answer = 42;",
    "console.log(answer);",
    "```",
    "",
    "| Feature | Value |",
    "| --- | --- |",
    "| GFM table | rendered |",
    "",
  ].join("\n"));
  // 编辑模式阈值为 500,000 字符，运行时 fixture 用固定种子生成并超过该值。
  writeFileSync(jsPath, `const fixtureValue = 42;\n// ${seededText(0x51a7, 500_512)}\n`);
  writeFileSync(sourceMarkdownPath, `# Source editor fixture\n\n${seededText(0x4d44, 500_512)}\n`);
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
    "color=c=blue:s=96x64:r=10:d=1", "-an", "-c:v", "libx264",
    "-preset", "ultrafast", "-crf", "35", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", videoPath,
  ]);
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
    "sine=frequency=440:sample_rate=8000:duration=1", "-ac", "1",
    "-c:a", "pcm_s16le", audioPath,
  ]);

  const canvasPath = path.join(workspace, ".hilo", "canvas.json");
  const canvas = JSON.parse(readFileSync(canvasPath, "utf8"));
  const node = (id, type, x, y, width, height, filePath) => ({
    id,
    type,
    positions: { workflow: { x, y } },
    size: { width, height },
    data: { path: filePath },
  });
  const relativePath = (filePath) =>
    path.relative(workspace, filePath).split(path.sep).join("/");
  canvas.nodes.push(
    node("c0a00000-0000-4000-8000-000000000002", "text", 800, 410, 360, 280, relativePath(markdownPath)),
    node("c0a00000-0000-4000-8000-000000000003", "text", 1200, 38, 340, 240, relativePath(jsPath)),
    node("c0a00000-0000-4000-8000-000000000004", "text", 1200, 320, 340, 240, relativePath(sourceMarkdownPath)),
  );
  writeFileSync(canvasPath, `${JSON.stringify(canvas, null, 2)}\n`);
}
