# 源码改名工具

本目录提供基于 Babel AST 的文件路径、绑定和导出名改写工具。代码只按 AST 节点偏移拼接，保留其余源码格式；写盘前会在内存中解析并执行等价检查。

## 命令

```sh
node scripts/desource/rename/rename-files.mjs map.json --dry-run
node scripts/desource/rename/rename-files.mjs map.json
node scripts/desource/rename/rename-identifiers.mjs map.json --mode local
node scripts/desource/rename/rename-identifiers.mjs map.json --mode export
node scripts/desource/rename/list-short-identifiers.mjs app/renderer/src/chat/example.jsx --json
node scripts/desource/rename/list-short-identifiers.mjs app/renderer/src/chat/example.jsx --template .probe/rename-map.json
```

CLI 默认从脚本位置确定仓库根；`--root`、`--src` 可覆盖根目录和源码目录。`--dry-run` 只写报告，不修改源码。`--report` 可指定报告路径；省略时报告写入 `.probe/desource/rename/`。

## 映射格式

文件映射使用仓库相对路径：

```json
{
  "app/renderer/src/chat/old.jsx": "app/renderer/src/chat/new.jsx"
}
```

局部绑定映射的 key 为 `旧名@行` 或 `旧名@行:列`，value 为新标识符：

```json
{
  "app/renderer/src/chat/new.jsx": {
    "e2@14:17": "message"
  }
}
```

导出映射以导出文件路径为 key，内部对象为旧导出名到新导出名的映射。短标识符列表工具支持 `--template` 输出空值映射模板。

## 映射示例 + 典型工作流

先列出目标文件的短绑定，并生成可填写的局部映射模板：

```sh
node scripts/desource/rename/list-short-identifiers.mjs app/renderer/src/chat/example.jsx --json
node scripts/desource/rename/list-short-identifiers.mjs app/renderer/src/chat/example.jsx \
  --template .probe/desource/rename/example-map.json
```

结合声明、所有引用和参数调用处填写语义化名称；导入绑定还应查看来源模块的实现：

```json
{
  "app/renderer/src/chat/example.jsx": {
    "e2@14:17": "markdownText",
    "t2@29:11": "isStreaming"
  }
}
```

先 dry-run 检查冲突、拒绝项和等价结果，再正式执行。只有报告中的改名、拒绝项和等价结果符合预期时才落盘：

```sh
node scripts/desource/rename/rename-identifiers.mjs \
  .probe/desource/rename/example-map.json --mode local --dry-run
node scripts/desource/rename/rename-identifiers.mjs \
  .probe/desource/rename/example-map.json --mode local
node scripts/desource/check-undef.mjs
pnpm -w turbo run build
```

## 命名自审规则

- 函数名描述函数体实际执行的行为，不按调用场景猜测。
- 传给 `onX` 属性的函数或值，名称应与该事件的实际语义一致。
- `useState` 解构使用 `[x, setX]` 形式。
- 布尔值以 `is`、`has`、`should` 或 `can` 开头，并核对表达式为真时名称描述的条件确实成立。
- 编译产生的临时变量按其实际持有的值命名；例如可选链展开产生的 `var a; (a = x.props) == null …`，应按 `a` 保存的属性对象命名。
- 不确定具体语义时使用中性的描述名，不猜测更具体的职责。
- TSV 中每条映射写一句依据，用最终名字描述它持有的值或执行的行为；提交前逐条对照函数体自审。

## 报告

文件改名报告包括 `renames`、逐处引用的文件/行/列/旧新说明符、警告和统计。标识符报告按文件记录 `renames`、`rejected`、`skipped` 及等价摘要，其中包括绑定数、规范化 SHA-256 和外部可见名称差异。

## 已知限制

- 文件路径映射不允许链式映射；目录索引形式改写为显式索引文件路径。
- 局部改名逐条执行，中间态冲突会拒绝，因此互换两个绑定名不支持。
- 外层同名绑定在待改名作用域子树中有引用时，保守拒绝潜在遮蔽。
- export 模式只支持可静态分析的命名导入/再导出、受限命名空间访问，以及 `import(...).then((m) => ...)` 形式；整体传递命名空间、动态解构和 `export *` 需要先改成显式形式。
- 等价校验是结构级 alpha 归一化，不替代运行时行为或资源内容校验。
