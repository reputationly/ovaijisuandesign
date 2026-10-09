// browser-inspiration-urls-effects.js
import { ProxyChannel } from "../vendor-inline/vscode-base/channel-client.js";
import {
  client,
  disposables,
  services,
} from "../vendor-inline/vscode-base/graph.jsx";
import {
  createDecorator,
  IComfyUiModelDownloadService,
  ICustomMcpService,
  IGenericConnectorService,
  IHcpCliService,
  IHiloApp,
  ILogService,
  IProjectArchiveService,
  ISkillExportService,
} from "../settings/parse-custom-mcp-arguments.js";

createDecorator("fileHandlersService");

createDecorator("imBridgeService");

createDecorator("notificationService");

createDecorator("updaterService");

createDecorator("windowService");

services.set(ILogService, ProxyChannel.toService(client.getChannel("log")));

services.set(IHiloApp, ProxyChannel.toService(client.getChannel("hilo")));

services.set(
  ICustomMcpService,
  ProxyChannel.toService(client.getChannel("custom-mcp")),
);

services.set(
  IGenericConnectorService,
  ProxyChannel.toService(client.getChannel("generic-connector")),
);

services.set(
  IHcpCliService,
  ProxyChannel.toService(client.getChannel("hcp-cli")),
);

services.set(
  IProjectArchiveService,
  ProxyChannel.toService(client.getChannel("projectArchive")),
);

services.set(
  IComfyUiModelDownloadService,
  ProxyChannel.toService(client.getChannel("comfyUiModelDownload")),
);

services.set(
  ISkillExportService,
  ProxyChannel.toService(client.getChannel("skillExport")),
);

window.addEventListener("unload", () => {
  disposables.dispose();
});
