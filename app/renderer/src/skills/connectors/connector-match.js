// 连接器名字、来源和本地服务匹配是连接器市场的规则。


export const CONNECTOR_TOKEN_SOURCE = String.raw`@connector:([a-zA-Z0-9_.-]{1,80})(?:\[([\p{Script=Han}a-zA-Z0-9_. -]{1,80})\])?(?=\s|$)`;
export const LIBTV_CONNECTOR = {
  id: "libtv",
  url: "https://mcp.liblib.tv/mcp"
};
export function customMcpNameIdentity(mcpName) {
  return mcpName.trim().replace(/[^a-zA-Z0-9_-]/gu, "_").toLowerCase();
}
export function matchesLocalConnectorServer(server, connectorId) {
  return (server.transport === void 0 || server.transport === "stdio") && customMcpNameIdentity(server.name) === customMcpNameIdentity(connectorId);
}
export const libtvIconUrl = "data:image/svg+xml,%3c!--%20LibTV%20plugin%200.4.4%20artwork:%20https://github.com/liblib-ai/marketplace/blob/main/plugins/libtv/assets/libtv-icon.svg%20--%3e%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='64'%20height='64'%20viewBox='0%200%2048%2048'%20fill='none'%3e%3crect%20width='48'%20height='48'%20rx='10'%20fill='%23000'%20/%3e%3cg%20transform='translate(11.397%2015.692)'%20fill='%23fff'%3e%3cpath%20d='M16.5757%2016.616H0L0.832729%2012.1982H17.6504L16.5757%2016.616Z'%20/%3e%3cpath%20d='M0%2016.616L2.31411%204.34598H6.76176L4.4459%2016.616H0Z'%20/%3e%3cpath%20d='M8.26945%200H25.2063L24.3736%204.41609H7.54366L8.26945%200Z'%20/%3e%3cpath%20d='M25.2062%200L22.8921%2012.27L18.3796%2012.2718L20.7604%200H25.2062Z'%20/%3e%3c/g%3e%3c/svg%3e";
export function namesMatch(left, right) {
  return left.trim().toLocaleLowerCase() === right.toLocaleLowerCase();
}
export function originsMatch(left, right) {
  if (!left) return false;
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}
