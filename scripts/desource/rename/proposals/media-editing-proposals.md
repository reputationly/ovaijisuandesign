# media-editing 导出名 / 文件名提议

- `app/renderer/src/media-editing/package.jsx`：建议将导出名 `File$1` 改为 `FileIcon`；该绑定是经 `withIconCompositing` 包装并供调用方作为文件图标使用的组件，`FileIcon` 能表达其用途并去掉编译式后缀。
