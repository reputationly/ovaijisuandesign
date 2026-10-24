/**
 * Code Project（代码工作树）的 HTTP 契约。
 *
 * 工作树、checkpoint、publish 都在本地 gateway 完成；publish 交给已有的
 * `/api/v3/deliveries` 落到 Resources，不经过任何外部服务。
 */
export const CODE_PROJECT_HTTP_PATHS = {
  open: "/api/v3/code-projects/open",
  status: "/api/v3/code-projects/status",
  checkpoint: "/api/v3/code-projects/checkpoint",
  publish: "/api/v3/code-projects/publish",
  binding: "/api/v3/code-projects/binding",
} as const;

/** 单个待发布文件的上限；目录会先打包，源码快照按 zip 计。 */
export const CODE_PUBLISH_MAX_FILE_BYTES = 500 * 1024 * 1024;
