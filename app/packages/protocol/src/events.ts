/**
 * gateway 经 `/ws` 广播给所有客户端的事件名。帧格式 `{ event, data }`（Nest WsAdapter）。
 */
export const GATEWAY_EVENTS = [
  "canvas:updated",
  "canvas:focus",
  "canvas:node-generating",
  "assets:changed",
  "assets:changed_batch",
  "canvas-tags:registry-changed",
  "dependencies:changed",
  "dirs:changed",
  "plugin-storage:changed",
  "plugin-agent:invoke",
  "plugin-editor:open",
  "document-edit:result",
  "skills:reload",
  "memory:changed",
  "plan:changed",
  "sessions:changed",
] as const;
export type GatewayEvent = (typeof GATEWAY_EVENTS)[number];
