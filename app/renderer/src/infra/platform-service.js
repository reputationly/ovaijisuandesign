// platform-service.js
// 主进程的 platform-settings 通道（get / save / status），和其他桌面服务走同一条 ProxyChannel 总线。
import { ProxyChannel } from "../vendor-inline/vscode-base/channel-client.js";
import { client } from "../vendor-inline/vscode-base/graph.jsx";
export const platformService = ProxyChannel.toService(client.getChannel("platform-settings"));
