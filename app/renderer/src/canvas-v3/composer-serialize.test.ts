import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 组合器的 `serialize` 必须是 JSON 序列化，**不能**是 VS Code 的 IPC 二进制编码器。
 *
 * 真机崩溃（打开成片/画布立即白屏）：
 *   TypeError: writer.write is not a function
 *     at serialize$2 …
 * 原因是 `ui-components.js` 里 `import { serialize } from ".../vs-buffer.js"`
 * （两参数 `serialize(writer, data)`），而调用点只传一个值。
 */
describe("组合器序列化", () => {
  const source = readFileSync(path.join(import.meta.dirname, "ui-components.js"), "utf8");

  it("不再从 vs-buffer 导入 IPC 序列化器", () => {
    expect(source).not.toMatch(/import\s*\{\s*serialize\s*\}\s*from\s*"\.\.\/vendor-inline\/vscode-base\/vs-buffer\.js"/);
  });

  it("本地 serialize 是 JSON.stringify", () => {
    expect(source).toMatch(/const serialize = \(value\) => JSON\.stringify\(value\);/);
  });
});
