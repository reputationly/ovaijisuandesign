/**
 * `ProjectResourceHttpError` 的唯一归属（第 146 轮）。
 *
 * 此前 `canvas-v3-model.js` 与 `project-resource-client.js` 各有一份，
 * 跨模块 `instanceof` 会失效。叶子模块：不导入 canvas-v3 里任何文件。
 */
class ProjectResourceHttpError extends Error {
  constructor(status, code2, message2) {
    super(message2);
    this.status = status;
    this.code = code2;
    this.name = "ProjectResourceHttpError";
  }
  status;
  code;
  static async fromResponse(response) {
    const fallback = new ProjectResourceHttpError(
      response.status,
      "PROJECT_HTTP_ERROR",
      `Resource request failed (${response.status})`
    );
    let body2;
    try {
      body2 = await response.json();
    } catch {
      return fallback;
    }
    if (!body2 || typeof body2 !== "object" || !("code" in body2) || !("message" in body2))
      return fallback;
    return new ProjectResourceHttpError(response.status, body2.code, body2.message);
  }
}

export { ProjectResourceHttpError };
