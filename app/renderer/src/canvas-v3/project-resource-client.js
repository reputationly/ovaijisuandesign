/**
 * 项目资源客户端 —— 从产物主包整段取回（第 84 轮）。
 *
 * 三段连续代码合成一个模块：
 *   A. 资源读取/搜索/版本列表/回执的解析器（`parseProjectResource*`）
 *   B. `PROJECT_RESOURCE_HTTP_ROUTES`：资源接口的路由表
 *   C. `ProjectResourceHttpError` + `createProjectResourceClient`：
 *      把 POST + 校验 + 解析串起来，失败时抛带 status/code 的错误
 *
 * 只搬实现，未改语义。
 */
import { ProjectResourceHttpError } from "./shared/ProjectResourceHttpError.js";
// ==== P3 严格归并 ====
import { PROJECT_RESOURCE_HTTP_ROUTES, assertProjectResourceDetail, detail, page$1, parseListProjectResourceVersionsResult, parseProjectResourceReadResults, parseProjectResourceReceipt, parseSearchProjectResourcesResult, resource, version } from "./canvas-v3-model.js";
// ==== P3 严格归并 ====
import { array$2, enumeration$1, id$5, integer$2, invalid$5, nullableId, object$3, string$1 } from "./canvas-v3-model.js";
import {
  ProjectResourceConflictKind,
  ProjectResourceCommandType,
  ProjectResourceUpdateKind,
} from "../../../packages/protocol/src/project-v3/command.ts";
import {
  ProjectResourceKind,
  ProjectResourceLifecycle,
  ProjectResourceReadErrorCode,
  ProjectResourceSource,
  ProjectResourceVersionStatus,
} from "../../../packages/protocol/src/project-v3/resource.ts";
import { AssetRole } from "../../../packages/protocol/src/asset-role.ts";

// ==== 响应校验小工具（产物里与本模块紧邻，整段搬）====






















function createProjectResourceClient(request) {
  async function post2(path2, body2, options2) {
    const response = await request(path2, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body2),
      ...options2?.signal ? { signal: options2.signal } : {}
    });
    if (!response.ok) throw await ProjectResourceHttpError.fromResponse(response);
    return response.json();
  }
  return {
    async getResources(selectors2, options2) {
      const request2 = { selectors: selectors2 };
      const count2 = selectors2.length;
      return parseProjectResourceReadResults(await post2(PROJECT_RESOURCE_HTTP_ROUTES.get, request2, options2), count2);
    },
    async search(query, options2) {
      return parseSearchProjectResourcesResult(await post2(PROJECT_RESOURCE_HTTP_ROUTES.search, query, options2));
    },
    async listResourceVersions(query, options2) {
      return parseListProjectResourceVersionsResult(
        await post2(PROJECT_RESOURCE_HTTP_ROUTES.listVersions, query, options2)
      );
    },
    async execute(envelope) {
      const snapshot2 = structuredClone(envelope);
      return parseProjectResourceReceipt(await post2(PROJECT_RESOURCE_HTTP_ROUTES.commands, snapshot2), snapshot2);
    }
  };
}

export {
  PROJECT_RESOURCE_HTTP_ROUTES,
  ProjectResourceHttpError,
  createProjectResourceClient,
  parseProjectResourceReadResults,
  parseSearchProjectResourcesResult,
  parseListProjectResourceVersionsResult,
  parseProjectResourceReceipt,
};
