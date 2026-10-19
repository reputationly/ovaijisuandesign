/**
 * `WorkspaceCanvasPersistenceChangedError` 的唯一归属（第 146 轮）。
 * 叶子模块：不导入 canvas-v3 里任何文件。
 */
class WorkspaceCanvasPersistenceChangedError extends Error {
  constructor() {
    super("Canvas changed while waiting for the durability barrier");
    this.name = "WorkspaceCanvasPersistenceChangedError";
  }
}

export { WorkspaceCanvasPersistenceChangedError };
