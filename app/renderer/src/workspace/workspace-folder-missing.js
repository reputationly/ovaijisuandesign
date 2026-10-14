// 判断错误是不是 `WorkspaceFolderMissingError`。


export function isWorkspaceFolderMissingError(error) {
  return error instanceof Error && error.name === "WorkspaceFolderMissingError";
}
