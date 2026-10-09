// home-service.jsx
import "./browser-inspiration-urls-effects.js";
import {
  CompositedSvg,
  desktopMediaIcon,
  PlaybackCirclePauseIcon$1,
  PlaybackCirclePlayIcon$1,
  PlaybackNextIcon$1,
  PlaybackPlayIcon$1,
  PlaybackPreviousIcon$1,
  PlaybackStopIcon$1,
  reactExports,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { ProxyChannel } from "../vendor-inline/vscode-base/channel-client.js";
import {
  client,
  disposables,
  getLocalFolderIconSrc,
  getWorkspaceBundle,
  pruneWorkspaceBundleCache,
  services,
  workspaceId,
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
import {
  Disposable,
  errorListeners,
} from "../vendor-inline/vscode-base/linked-list.js";
import { InstantiationService } from "../settings/instantiation-service.js";
import { cn$2 as cn } from "../infra/dialog-content.jsx";
const IQuarkDriveAuthService = createDecorator("quarkDriveAuthService");
function errorHandler(listener) {
  errorListeners.push(listener);
  return () => {
    const idx = errorListeners.indexOf(listener);
    if (idx >= 0) {
      errorListeners.splice(idx, 1);
    }
  };
}
export const IAssetCenterMainService = createDecorator(
  "assetCenterMainService",
);
services.set(
  IAssetCenterMainService,
  ProxyChannel.toService(client.getChannel("assetCenter")),
);
export const IBundleHandle = createDecorator("bundleHandle");
export const IClipboardService = createDecorator("clipboardService");
services.set(
  IClipboardService,
  ProxyChannel.toService(client.getChannel("clipboard")),
);
export const IDataDirectoryMainService = createDecorator(
  "dataDirectoryMainService",
);
services.set(
  IDataDirectoryMainService,
  ProxyChannel.toService(client.getChannel("dataDirectory")),
);
const IFileHandlersMainService = createDecorator("fileHandlersMainService");
services.set(
  IFileHandlersMainService,
  ProxyChannel.toService(client.getChannel("fileHandlers")),
);
export const IGatewayReadiness = createDecorator("gatewayReadiness");
services.set(
  IGatewayReadiness,
  ProxyChannel.toService(client.getChannel("gateway-readiness")),
);
export const IImBridgeMainService = createDecorator("imBridgeMainService");
services.set(
  IImBridgeMainService,
  ProxyChannel.toService(client.getChannel("imBridge")),
);
export const INetworkDiagnosticsMainService = createDecorator(
  "networkDiagnosticsMainService",
);
services.set(
  INetworkDiagnosticsMainService,
  ProxyChannel.toService(client.getChannel("networkDiagnostics")),
);
export const INotificationMainService = createDecorator(
  "notificationMainService",
);
services.set(
  INotificationMainService,
  ProxyChannel.toService(client.getChannel("notification")),
);
export const IProjectMainService = createDecorator("projectMainService");
services.set(
  IProjectMainService,
  ProxyChannel.toService(client.getChannel("project")),
);
export const IProjectAssetsService = createDecorator("projectAssetsService");
services.set(
  IProjectAssetsService,
  ProxyChannel.toService(client.getChannel("projectAssets")),
);
export const IRendererPowerStateMainService = createDecorator(
  "rendererPowerStateMainService",
);
services.set(
  IRendererPowerStateMainService,
  ProxyChannel.toService(client.getChannel("rendererPowerState")),
);
export const IDesktopSettingsMainService = createDecorator(
  "desktopSettingsMainService",
);
services.set(
  IDesktopSettingsMainService,
  ProxyChannel.toService(client.getChannel("desktopSettings")),
);
export const ITeamAccountService = createDecorator("teamAccountService");
services.set(
  ITeamAccountService,
  ProxyChannel.toService(client.getChannel("team-account")),
);
export function isRecoverableTeamAccountStatus(status) {
  return (
    status === "temporarily_unavailable" ||
    status === "stale" ||
    status === "recovering"
  );
}
export const ITeamDataInvalidationService = createDecorator(
  "teamDataInvalidationService",
);
services.set(
  ITeamDataInvalidationService,
  ProxyChannel.toService(client.getChannel("team-data-invalidation")),
);
export const ITeamOperationService = createDecorator("teamOperationService");
services.set(
  ITeamOperationService,
  ProxyChannel.toService(client.getChannel("team-operation")),
);
const ITrashService = createDecorator("trashService");
services.set(ITrashService, ProxyChannel.toService(client.getChannel("trash")));
export const IUpdaterMainService = createDecorator("updaterMainService");
services.set(
  IUpdaterMainService,
  ProxyChannel.toService(client.getChannel("updater")),
);
export const IWindowMainService = createDecorator("windowMainService");
services.set(
  IWindowMainService,
  ProxyChannel.toService(client.getChannel("window")),
);
export const IWorkspaceService = createDecorator("workspaceService");
if (workspaceId) {
  services.set(
    IWorkspaceService,
    ProxyChannel.toService(client.getChannel(`workspace-${workspaceId}`)),
  );
  services.set(
    IBundleHandle,
    ProxyChannel.toService(
      client.getChannel(`workspace-bundle-${workspaceId}`),
    ),
  );
}
export const instantiationService = new InstantiationService(services);
disposables.add(instantiationService);
const logService = services.get(ILogService);
disposables.add({
  dispose: errorHandler((e2) => {
    const msg = e2 instanceof Error ? (e2.stack ?? e2.message) : String(e2);
    logService.error(`[UnexpectedError] ${msg}`);
  }),
});
export const instantiation = Object.freeze(
  Object.defineProperty(
    {
      __proto__: null,
      disposables,
      getWorkspaceBundle,
      instantiationService,
      pruneWorkspaceBundleCache,
      services,
    },
    Symbol.toStringTag,
    {
      value: "Module",
    },
  ),
);
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key2, kind) => {
  var result =
    kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key2) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if ((decorator = decorators[i2])) result = decorator(result) || result;
  return result;
};
var __decorateParam = (index2, decorator) => (target, key2) =>
  decorator(target, key2, index2);
let HomeService = class extends Disposable {
  constructor(
    hiloApp2,
    logService2,
    projectArchive,
    comfyUiModelDownload,
    skillExport,
    customMcp,
    connector,
    hcpCli,
    quarkDriveAuth,
  ) {
    super();
    this.hiloApp = hiloApp2;
    this.logService = logService2;
    this.projectArchive = projectArchive;
    this.comfyUiModelDownload = comfyUiModelDownload;
    this.skillExport = skillExport;
    this.customMcp = customMcp;
    this.connector = connector;
    this.hcpCli = hcpCli;
    this.quarkDriveAuth = quarkDriveAuth;
  }
};
HomeService = __decorateClass(
  [
    __decorateParam(0, IHiloApp),
    __decorateParam(1, ILogService),
    __decorateParam(2, IProjectArchiveService),
    __decorateParam(3, IComfyUiModelDownloadService),
    __decorateParam(4, ISkillExportService),
    __decorateParam(5, ICustomMcpService),
    __decorateParam(6, IGenericConnectorService),
    __decorateParam(7, IHcpCliService),
    __decorateParam(8, IQuarkDriveAuthService),
  ],
  HomeService,
);
export const homeService = instantiationService.createInstance(HomeService);
disposables.add(homeService);
homeService.logService.info("HomeService initialized");
export function EnterIcon({ size: size2 = 24, ...props }) {
  return (
    <CompositedSvg
      xmlns="http://www.w3.org/2000/svg"
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-icon="enter"
      {...props}
    >
      <path
        d="M8.63686 18.364C8.98833 18.7155 8.98833 19.2853 8.63686 19.6368C8.28539 19.9882 7.71554 19.9882 7.36407 19.6368L2.86407 15.1368C2.69529 14.968 2.60046 14.7391 2.60046 14.5004C2.60046 14.2617 2.69529 14.0328 2.86407 13.864L7.36407 9.36398C7.71554 9.01251 8.28539 9.01251 8.63686 9.36398C8.98833 9.71545 8.98833 10.2853 8.63686 10.6368L5.67384 13.5998H15.5C17.7644 13.5998 19.6 11.7642 19.6 9.49979C19.6 7.23542 17.7644 5.39979 15.5 5.39979H12C11.503 5.39979 11.1 4.99685 11.1 4.49979C11.1 4.00273 11.503 3.59979 12 3.59979H15.5C18.7585 3.59979 21.4 6.24131 21.4 9.49979C21.4 12.7583 18.7585 15.3998 15.5 15.3998H5.67267L8.63686 18.364Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
export const FeedbackIcon = reactExports.forwardRef(function FeedbackIcon22(
  { size: size2 = 24, ...props },
  ref,
) {
  const ariaHidden =
    props["aria-hidden"] ?? (props["aria-label"] ? void 0 : true);
  return (
    <CompositedSvg
      ref={ref}
      {...props}
      width={size2}
      height={size2}
      viewBox="0 0 1024 1024"
      fill="currentColor"
      aria-hidden={ariaHidden}
    >
      <title>{props["aria-label"] ?? "Feedback"}</title>
      <path d="M672 320H352c-17.6 0-32-14.4-32-32s14.4-32 32-32h320c17.6 0 32 14.4 32 32s-14.4 32-32 32ZM544 448H352c-17.6 0-32-14.4-32-32s14.4-32 32-32h192c17.6 0 32 14.4 32 32s-14.4 32-32 32Z" />
      <path d="M960 448v-3.2-3.2-1.6-1.6-3.2-1.6l-1.6-1.6v-1.6-1.6l-1.6-1.6-1.6-1.6-1.6-1.6-1.6-1.6h-1.6L832 352V160c0-52.8-43.2-96-96-96H288c-52.8 0-96 43.2-96 96v192l-112 68.8h-1.6l-1.6 1.6-1.6 1.6-1.6 1.6-1.6 1.6v3.2l-1.6 1.6v430.4c0 52.8 43.2 96 96 96h704c52.8 0 96-43.2 96-96L960 448Zm-92.8 0L832 468.8v-43.2l35.2 22.4ZM288 126.4h448c17.6 0 32 14.4 32 32v350.4l-256 156.8-256-156.8V158.4c0-17.6 14.4-32 32-32Zm-96 342.4L156.8 448l35.2-20.8v41.6ZM864 896H160c-17.6 0-32-14.4-32-32V505.6l368 225.6c1.6 1.6 3.2 1.6 4.8 1.6 1.6 0 1.6 0 3.2 1.6 3.2 0 4.8 1.6 8 1.6s4.8 0 8-1.6c1.6 0 1.6 0 3.2-1.6 1.6 0 3.2-1.6 4.8-1.6l368-225.6V864c0 17.6-14.4 32-32 32Z" />
    </CompositedSvg>
  );
});
FeedbackIcon.displayName = "FeedbackIcon";
export function FilledSkillIcon({
  size: size2 = 24,
  strokeWidth = 2,
  color: color2 = "currentColor",
  className,
  ...rest
}) {
  return (
    <CompositedSvg
      color={color2}
      xmlns="http://www.w3.org/2000/svg"
      width={size2}
      height={size2}
      viewBox="0 0 14 14"
      fill="none"
      strokeWidth={strokeWidth}
      aria-hidden="true"
      data-filled-skill-icon="true"
      className={className}
      {...rest}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.01916 0.25c-0.16092 0 -0.32002 0.034013 -0.46688 0.099809 -0.14165 0.063467 -0.26883 0.155124 -0.37379 0.269316L5.04523 1.74619c-0.1201 -0.24641 -0.28227 -0.47269 -0.48153 -0.66779C4.10172 0.617519 3.47577 0.358645 2.82313 0.358645c-0.65362 0 -1.28048 0.25965 -1.74266 0.721825 -0.462175 0.46218 -0.721825 1.08904 -0.721825 1.74266 0 0.65264 0.258874 1.27859 0.719755 1.74057 0.1927 0.19681 0.41581 0.35743 0.6587 0.47708L0.621448 6.13804c-0.115273 0.10537 -0.207743 0.23331 -0.271639 0.37592C0.284013 6.66082 0.25 6.81992 0.25 6.98084s0.034013 0.32002 0.099809 0.46688c0.063572 0.14189 0.155429 0.26925 0.269887 0.37431L2.08637 9.28871c0.11441 0.11441 0.2771 0.16638 0.43664 0.1395 0.15955 -0.02689 0.29622 -0.12931 0.36681 -0.27489 0.07392 -0.15244 0.17174 -0.29206 0.28976 -0.41359 0.27608 -0.27707 0.65075 -0.43344 1.04195 -0.43478 0.392 -0.00134 0.76848 0.15309 1.04661 0.42933 0.27813 0.27623 0.43514 0.65165 0.43649 1.04364 0.00133 0.39058 -0.15201 0.76588 -0.42643 1.04368 -0.12124 0.1175 -0.26044 0.2149 -0.41236 0.2886 -0.144 0.0698 -0.24588 0.2043 -0.27404 0.3619 -0.02816 0.1575 0.0208 0.319 0.1317 0.4344l1.41232 1.4696c0.10579 0.1164 0.23453 0.2097 0.37814 0.2741 0.14686 0.0658 0.30596 0.0998 0.46688 0.0998s0.32002 -0.034 0.46688 -0.0998c0.14165 -0.0635 0.26881 -0.1551 0.37378 -0.2693l1.13609 -1.1299c0.06501 0.1337 0.14226 0.2617 0.23113 0.3825 0.2813 0.3823 0.66704 0.6753 1.11088 0.8436 0.4438 0.1683 0.9267 0.2048 1.3908 0.1052 0.4641 -0.0996 0.8895 -0.3311 1.2251 -0.6668 0.3357 -0.3356 0.5672 -0.761 0.6668 -1.2251 0.0996 -0.4641 0.0631 -0.947 -0.1052 -1.3908 -0.1683 -0.44384 -0.4613 -0.82958 -0.8436 -1.11088 -0.118 -0.08686 -0.2431 -0.16262 -0.3734 -0.2267l1.1185 -1.10006c0.1152 -0.10537 0.2077 -0.23331 0.2716 -0.37592 0.0658 -0.14686 0.0998 -0.30596 0.0998 -0.46688s-0.034 -0.32002 -0.0998 -0.46688c-0.0638 -0.14245 -0.1562 -0.27025 -0.2713 -0.37556l-1.4867 -1.4677c-0.1148 -0.11327 -0.2771 -0.16426 -0.436 -0.13696 -0.1589 0.02731 -0.2948 0.12956 -0.3652 0.27462 -0.072 0.1486 -0.1668 0.28503 -0.2809 0.40438 -0.2787 0.2483 -0.6415 0.38168 -1.01504 0.37282 -0.37858 -0.00899 -0.73917 -0.16339 -1.00694 -0.43116 -0.26777 -0.26777 -0.42217 -0.62836 -0.43116 -1.00695 -0.00886 -0.37355 0.12452 -0.73632 0.37282 -1.01505 0.11935 -0.11406 0.25578 -0.20884 0.40438 -0.2809 0.144 -0.06983 0.24587 -0.20437 0.27404 -0.36191 0.02816 -0.15755 -0.0208 -0.31905 -0.1317 -0.43444L7.86419 0.623895c-0.1058 -0.116412 -0.23453 -0.209738 -0.37815 -0.274086C7.33918 0.284013 7.18008 0.25 7.01916 0.25Z"
      />
    </CompositedSvg>
  );
}
FilledSkillIcon.displayName = "FilledSkillIcon";
export function LocalFolderIcon({
  className,
  os: os2,
  alt = "",
  draggable,
  "aria-hidden": ariaHidden,
  ...props
}) {
  return (
    <img
      src={getLocalFolderIconSrc(os2)}
      alt={alt}
      aria-hidden={ariaHidden ?? (alt === "" ? true : void 0)}
      draggable={draggable ?? false}
      className={cn(
        "pointer-events-none size-4 shrink-0 object-contain",
        className,
      )}
      {...props}
    />
  );
}
export function MoreHorizontalIcon({ size: size2 = 24, className, ...rest }) {
  return (
    <CompositedSvg
      xmlns="http://www.w3.org/2000/svg"
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
      <circle cx="5" cy="12" r="1.75" />
    </CompositedSvg>
  );
}
export function PanelVisibilityIcon({
  active: active2,
  side = "left",
  ...props
}) {
  return (
    <svg
      viewBox="0 0 18 18"
      width="16"
      height="16"
      aria-hidden="true"
      data-panel-visibility-icon="true"
      data-panel-side={side}
      data-panel-active={active2 ? "true" : "false"}
      {...props}
    >
      <rect
        x="1.25"
        y="2.25"
        width="15.5"
        height="13.5"
        rx="3"
        fill="none"
        className="stroke-current opacity-65"
        strokeWidth="1.25"
      />
      <rect
        x={side === "left" ? "2.75" : "10"}
        y="3.75"
        width="5.25"
        height="10.5"
        rx="1.5"
        className={
          active2 ? "fill-current opacity-60" : "fill-current opacity-[0.12]"
        }
      />
    </svg>
  );
}
PanelVisibilityIcon.displayName = "PanelVisibilityIcon";
export function PencilIcon({
  size: size2 = 24,
  strokeWidth = 2,
  color: color2 = "currentColor",
  className,
  ...rest
}) {
  return (
    <CompositedSvg
      xmlns="http://www.w3.org/2000/svg"
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      color={color2}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="M20.2903 9.2494C20.9512 8.67732 21.3578 7.8661 21.4207 6.99421C21.4835 6.12232 21.1974 5.26118 20.6254 4.60023C20.0533 3.93927 19.2421 3.53265 18.3702 3.4698C17.4983 3.40696 16.6372 3.69305 15.9762 4.26513L3.97962 14.6548C3.68942 14.9053 3.46525 15.2233 3.32686 15.5808L1.42109 20.5455C1.38369 20.6441 1.3737 20.7511 1.39219 20.855C1.41068 20.9589 1.45695 21.0559 1.52609 21.1356C1.59523 21.2154 1.68467 21.2749 1.78491 21.3079C1.88515 21.3409 1.99246 21.3462 2.09545 21.3231L7.2828 20.149C7.65602 20.0642 8.00272 19.889 8.29247 19.639L20.2903 9.2494Z" />
      <path d="M14.4959 5.69751L18.1985 9.97426" />
    </CompositedSvg>
  );
}
PencilIcon.displayName = "PencilIcon";
export const PlaybackPlayIcon = desktopMediaIcon(PlaybackPlayIcon$1);
export const PlaybackStopIcon = desktopMediaIcon(PlaybackStopIcon$1);
export const PlaybackNextIcon = desktopMediaIcon(PlaybackNextIcon$1);
export const PlaybackPreviousIcon = desktopMediaIcon(PlaybackPreviousIcon$1);
export const PlaybackCirclePlayIcon = desktopMediaIcon(
  PlaybackCirclePlayIcon$1,
);
export const PlaybackCirclePauseIcon = desktopMediaIcon(
  PlaybackCirclePauseIcon$1,
);
export const PluginIcon = reactExports.forwardRef(function PluginIcon2(
  { size: size2 = 24, strokeWidth = 2, ...props },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      {...props}
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 15h4" />
      <path d="m14.817 10.995-.971-1.45 1.034-1.232a2 2 0 0 0-2.025-3.238l-1.82.364L9.91 3.885a2 2 0 0 0-3.625.748L6.141 6.55l-1.725.426a2 2 0 0 0-.19 3.756l.657.27" />
      <path d="m18.822 10.995 2.26-5.38a1 1 0 0 0-.557-1.318L16.954 2.9a1 1 0 0 0-1.281.533l-.924 2.122" />
      <path d="M4 12.006A1 1 0 0 1 4.994 11H19a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    </CompositedSvg>
  );
});
PluginIcon.displayName = "PluginIcon";
export function ProjectImportIcon({ size: size2 = 24, className, ...rest }) {
  return (
    <CompositedSvg
      xmlns="http://www.w3.org/2000/svg"
      width={size2}
      height={size2}
      viewBox="0 0 42 40"
      fill="none"
      aria-hidden="true"
      className={className}
      data-project-import-icon="true"
      {...rest}
    >
      <path
        fill="currentColor"
        d="M33.6104 14.7297C37.9686 14.7297 41.5017 18.2632 41.502 22.6213V31.2805C41.5019 35.6389 37.9687 39.1721 33.6104 39.1721H7.8916C3.53336 39.172 4.55277e-05 35.6388 0 31.2805V22.6213C0.000255851 18.2632 3.53349 14.7299 7.8916 14.7297C8.76911 14.7297 9.48047 15.4411 9.48047 16.3186V18.9172C9.48047 19.3573 9.1237 19.7141 8.68359 19.7141C7.01381 19.7145 5.66032 21.0687 5.66016 22.7385V25.6252C5.66016 27.2952 7.01371 28.6492 8.68359 28.6497H32.8184C34.4886 28.6497 35.8428 27.2955 35.8428 25.6252V22.7385C35.8426 21.0684 34.4885 19.7141 32.8184 19.7141C32.3788 19.7141 32.0225 19.3578 32.0225 18.9182V16.3176C32.0225 15.4407 32.7334 14.7297 33.6104 14.7297Z"
      />
      <path
        fill="currentColor"
        d="M24.1804 10.4819H28.6448L28.6282 10.4973C28.8877 10.5291 29.1394 10.6432 29.3386 10.8424C29.8125 11.3164 29.8122 12.0853 29.3386 12.5595L21.6103 20.2877C21.1361 20.7619 20.3674 20.7618 19.8931 20.2877L12.1649 12.5595C11.691 12.0852 11.6908 11.3165 12.1649 10.8424C12.3639 10.6434 12.6147 10.528 12.874 10.4961L12.8586 10.4819H17.3231V0.657633C17.3231 0.294433 17.6175 0 17.9807 0H23.5227C23.8859 0 24.1804 0.294432 24.1804 0.657632V10.4819Z"
      />
    </CompositedSvg>
  );
}
ProjectImportIcon.displayName = "ProjectImportIcon";
export function QuestionPromptIcon({ className, animated = false, actionId }) {
  return (
    <CompositedSvg
      data-action-ui-id={actionId}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 text-muted-foreground",
        animated && "motion-safe:animate-pulse",
        className,
      )}
    >
      <path
        fill="currentColor"
        d="M11.5 2A2.5 2.5 0 0 1 14 4.5v2.1a5.5 5.5 0 0 0-1-.393V6H3v5.5A1.5 1.5 0 0 0 4.5 13h1.707q.149.524.393 1H4.5A2.5 2.5 0 0 1 2 11.5v-7A2.5 2.5 0 0 1 4.5 2zm0 1h-7A1.5 1.5 0 0 0 3 4.5V5h10v-.5A1.5 1.5 0 0 0 11.5 3m4.5 8.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m-4.5 1.88a.625.625 0 1 0 0 1.25a.625.625 0 0 0 0-1.25m0-4.877c-1.048 0-1.864.818-1.853 1.955a.5.5 0 1 0 1-.01c-.006-.579.36-.945.853-.945c.472 0 .853.392.853.95c0 .202-.07.315-.36.544l-.277.215c-.506.404-.716.717-.716 1.288a.5.5 0 0 0 .992.09l.011-.156c.017-.148.1-.254.346-.448l.277-.215c.513-.41.727-.732.727-1.318c0-1.104-.822-1.95-1.853-1.95"
      />
    </CompositedSvg>
  );
}
