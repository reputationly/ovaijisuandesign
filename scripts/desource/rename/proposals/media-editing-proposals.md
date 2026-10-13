# media-editing 导出名 / 文件名提议

- `app/renderer/src/media-editing/editor2.js`：建议将导出类名 `Editor2` 改为 `CanvasEditor`；该类负责管理画布容器、渲染器、形状和绘图工具，名称可以表达其实际职责。
- `app/renderer/src/media-editing/editor2.js`：建议将文件名改为 `canvas-editor.js`；文件主体是管理画布编辑交互的 `Editor2` 类，现文件名中的数字后缀不表达职责。
- `app/renderer/src/media-editing/package.jsx`：建议将导出名 `File$1` 改为 `FileIcon`；该绑定是经 `withIconCompositing` 包装并供调用方作为文件图标使用的组件，`FileIcon` 能表达其用途并去掉编译式后缀。
- `app/renderer/src/media-editing/wt.js`：建议将 `et`、`tt` 分别改为 `IncompleteCodeContext`、`useIsIncompleteCode`；定义和调用点表明它们分别保存未闭合代码状态及读取该状态。
- `app/renderer/src/media-editing/wt.js`：建议将 `nt`、`He` 分别改为 `CodeMetadataContext`、`useCodeMetadata`；上下文默认值持有代码元数据，读取函数通过该上下文返回元数据。
- `app/renderer/src/media-editing/wt.js`：建议将 `De`、`Be`、`D3` 分别改为 `defaultMarkdownTranslations`、`MarkdownTranslationContext`、`useMarkdownTranslations`；它们分别保存默认翻译字典、提供翻译上下文并读取当前翻译。
- `app/renderer/src/media-editing/wt.js`：建议将 `Ve`、`ct2` 分别改为 `MarkdownRenderContext`、`useMarkdownRenderContext`；上下文保存 Markdown 渲染数据，读取函数返回该上下文值。
- `app/renderer/src/media-editing/wt.js`：建议将 `Li`、`de` 分别改为 `useMarkdownCode`、`useMermaidOptions`；它们分别从渲染上下文读取代码文本和 Mermaid 配置。
- `app/renderer/src/media-editing/wt.js`：建议将 `wt`、`ks` 分别改为 `MarkdownRenderCache`、`createMarkdownProcessor`；类实现按插件和选项缓存处理器，函数构造 unified Markdown 处理器。
- `app/renderer/src/media-editing/wt.js`：建议将 `on`、`vs` 分别改为 `identityUrlTransform`、`replaceNodeWithText`；前者原样返回 URL，后者按条件移除子节点或用文本节点替换。
- `app/renderer/src/media-editing/wt.js`：建议将 `xs`、`Ts` 分别改为 `transformUrlProperties`、`shouldSkipElement`；它们分别转换受支持的 URL 属性并按标签过滤及回调结果决定是否跳过元素。
- `app/renderer/src/media-editing/wt.js`：建议将文件名改为 `markdown-and-media-model-utils.js`；该模块同时提供 Markdown 渲染上下文、处理器缓存与 AST 工具，以及媒体模型分类和选择辅助函数。
