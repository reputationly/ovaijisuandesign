// browser-inspiration-urls.jsx
import {
  services,
  ProxyChannel,
  client,
  workspaceId,
  disposables,
  getWorkspaceBundle,
  pruneWorkspaceBundleCache,
  Disposable,
  useTranslation,
  reactExports,
  dedupedToast,
  isActiveComfyUiDownloadTask,
  ComfyUiDownloadProgressContext,
  CompositedSvg,
  getLocalFolderIconSrc,
  desktopMediaIcon,
  PlaybackPlayIcon$1,
  PlaybackStopIcon$1,
  PlaybackNextIcon$1,
  PlaybackPreviousIcon$1,
  PlaybackCirclePlayIcon$1,
  PlaybackCirclePauseIcon$1,
  ICON_STROKE_SPEC,
  getIconStrokeWidth,
} from "../vendor.js";
import { cn$2 } from "../asset-center/shared/use-browser-overlay-dialog-props.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import {
  IComfyUiModelDownloadService,
  ICustomMcpService,
  IGenericConnectorService,
  IHcpCliService,
  IHiloApp,
  ILogService,
  IProjectArchiveService,
  IQuarkDriveAuthService,
  ISkillExportService,
  InstantiationService,
  createDecorator,
  errorHandler,
  isComfyUiModelAlreadyDownloaded,
} from "./instantiation-service.js";
export const IAssetCenterMainService = createDecorator("assetCenterMainService");
export const IBundleHandle = createDecorator("bundleHandle");
export const IClipboardService = createDecorator("clipboardService");
export const IDataDirectoryMainService = createDecorator("dataDirectoryMainService");
const IFileHandlersMainService = createDecorator("fileHandlersMainService");
createDecorator("fileHandlersService");
export const IGatewayReadiness = createDecorator("gatewayReadiness");
export const IImBridgeMainService = createDecorator("imBridgeMainService");
createDecorator("imBridgeService");
export const INetworkDiagnosticsMainService = createDecorator("networkDiagnosticsMainService");
export const INotificationMainService = createDecorator("notificationMainService");
createDecorator("notificationService");
export const IProjectMainService = createDecorator("projectMainService");
export const IProjectAssetsService = createDecorator("projectAssetsService");
export const IRendererPowerStateMainService = createDecorator("rendererPowerStateMainService");
export const IDesktopSettingsMainService = createDecorator("desktopSettingsMainService");
export const ITeamAccountService = createDecorator("teamAccountService");
export function isRecoverableTeamAccountStatus(status) {
  return status === "temporarily_unavailable" || status === "stale" || status === "recovering";
}
export const ITeamDataInvalidationService = createDecorator("teamDataInvalidationService");
export const ITeamOperationService = createDecorator("teamOperationService");
const ITrashService = createDecorator("trashService");
export const IUpdaterMainService = createDecorator("updaterMainService");
createDecorator("updaterService");
export const IWindowMainService = createDecorator("windowMainService");
createDecorator("windowService");
export const IWorkspaceService = createDecorator("workspaceService");
services.set(ILogService, ProxyChannel.toService(client.getChannel("log")));
services.set(IWindowMainService, ProxyChannel.toService(client.getChannel("window")));
services.set(IHiloApp, ProxyChannel.toService(client.getChannel("hilo")));
services.set(ICustomMcpService, ProxyChannel.toService(client.getChannel("custom-mcp")));
services.set(
  IGenericConnectorService,
  ProxyChannel.toService(client.getChannel("generic-connector")),
);
services.set(IHcpCliService, ProxyChannel.toService(client.getChannel("hcp-cli")));
services.set(IGatewayReadiness, ProxyChannel.toService(client.getChannel("gateway-readiness")));
services.set(
  IDesktopSettingsMainService,
  ProxyChannel.toService(client.getChannel("desktopSettings")),
);
services.set(IDataDirectoryMainService, ProxyChannel.toService(client.getChannel("dataDirectory")));
services.set(IAssetCenterMainService, ProxyChannel.toService(client.getChannel("assetCenter")));
services.set(ITeamAccountService, ProxyChannel.toService(client.getChannel("team-account")));
services.set(ITeamOperationService, ProxyChannel.toService(client.getChannel("team-operation")));
services.set(
  ITeamDataInvalidationService,
  ProxyChannel.toService(client.getChannel("team-data-invalidation")),
);
services.set(INotificationMainService, ProxyChannel.toService(client.getChannel("notification")));
services.set(
  INetworkDiagnosticsMainService,
  ProxyChannel.toService(client.getChannel("networkDiagnostics")),
);
services.set(
  IRendererPowerStateMainService,
  ProxyChannel.toService(client.getChannel("rendererPowerState")),
);
services.set(IUpdaterMainService, ProxyChannel.toService(client.getChannel("updater")));
services.set(IImBridgeMainService, ProxyChannel.toService(client.getChannel("imBridge")));
services.set(IFileHandlersMainService, ProxyChannel.toService(client.getChannel("fileHandlers")));
services.set(ITrashService, ProxyChannel.toService(client.getChannel("trash")));
services.set(IClipboardService, ProxyChannel.toService(client.getChannel("clipboard")));
services.set(IProjectAssetsService, ProxyChannel.toService(client.getChannel("projectAssets")));
services.set(IProjectMainService, ProxyChannel.toService(client.getChannel("project")));
services.set(IProjectArchiveService, ProxyChannel.toService(client.getChannel("projectArchive")));
services.set(
  IComfyUiModelDownloadService,
  ProxyChannel.toService(client.getChannel("comfyUiModelDownload")),
);
services.set(ISkillExportService, ProxyChannel.toService(client.getChannel("skillExport")));
if (workspaceId) {
  services.set(
    IWorkspaceService,
    ProxyChannel.toService(client.getChannel(`workspace-${workspaceId}`)),
  );
  services.set(
    IBundleHandle,
    ProxyChannel.toService(client.getChannel(`workspace-bundle-${workspaceId}`)),
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
window.addEventListener("unload", () => {
  disposables.dispose();
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
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key2) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if ((decorator = decorators[i2])) result = decorator(result) || result;
  return result;
};
var __decorateParam = (index2, decorator) => (target, key2) => decorator(target, key2, index2);
const IHomeService = createDecorator("homeService");
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
services.set(IHomeService, homeService);
disposables.add(homeService);
homeService.logService.info("HomeService initialized");
export function ComfyUiDownloadProgressHost({ children: children2 }) {
  const { t: t2 } = useTranslation();
  const [tasks, setTasks] = reactExports.useState([]);
  reactExports.useEffect(() => {
    let mounted = true;
    void homeService.comfyUiModelDownload.getTasks().then((initial) => {
      if (mounted) setTasks(initial.filter((task) => !task.hidden || task.status === "failed"));
    });
    const subscription = homeService.comfyUiModelDownload.onDidChange((task) => {
      setTasks((current2) => {
        const withoutTask = current2.filter((item) => item.id !== task.id);
        return task.hidden && task.status !== "failed" ? withoutTask : [...withoutTask, task];
      });
      if (task.hidden && task.status !== "failed") return;
      if (task.status === "completed") {
        if (task.untrustedSourceModels.length) {
          dedupedToast.warning(
            t2("chat.workflow.downloadCompletedUnsupportedSources", {
              count: task.untrustedSourceModels.length,
            }),
          );
        } else if (isComfyUiModelAlreadyDownloaded(task)) {
          dedupedToast.success(t2("chat.workflow.downloadAlreadyAvailable"));
        } else if (task.missingSourceModels.length) {
          dedupedToast.success(
            t2("chat.workflow.downloadCompletedMissingSources", {
              count: task.missingSourceModels.length,
            }),
          );
        } else {
          dedupedToast.success(t2("chat.workflow.downloadCompleted"));
        }
      } else if (task.status === "failed") {
        dedupedToast.error(task.error || t2("chat.workflow.downloadFailed"));
      }
    });
    return () => {
      mounted = false;
      subscription.dispose();
    };
  }, [t2]);
  const activeTasks = reactExports.useMemo(
    () => tasks.filter(isActiveComfyUiDownloadTask),
    [tasks],
  );
  const cancelTask = reactExports.useCallback((taskId) => {
    void homeService.comfyUiModelDownload.cancelTask(taskId);
  }, []);
  const dismissTask = reactExports.useCallback((taskId) => {
    setTasks((current2) => current2.filter((task) => task.id !== taskId));
    void homeService.comfyUiModelDownload.dismissTask(taskId);
  }, []);
  const clearFinished = reactExports.useCallback(() => {
    const finished = tasks.filter((task) => !isActiveComfyUiDownloadTask(task));
    setTasks((current2) => current2.filter(isActiveComfyUiDownloadTask));
    void Promise.all(finished.map((task) => homeService.comfyUiModelDownload.dismissTask(task.id)));
  }, [tasks]);
  const openModelsFolder = reactExports.useCallback(() => {
    void homeService.comfyUiModelDownload.openModelsFolder().catch(() => {
      dedupedToast.error(t2("chat.workflow.downloadOpenFolderFailed"));
    });
  }, [t2]);
  const value = reactExports.useMemo(
    () => ({
      tasks,
      activeTasks,
      cancelTask,
      dismissTask,
      clearFinished,
      openModelsFolder,
    }),
    [activeTasks, cancelTask, clearFinished, dismissTask, openModelsFolder, tasks],
  );
  return (
    <ComfyUiDownloadProgressContext.Provider value={value}>
      {children2}
    </ComfyUiDownloadProgressContext.Provider>
  );
}
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
  const ariaHidden = props["aria-hidden"] ?? (props["aria-label"] ? void 0 : true);
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
      className={cn$2("pointer-events-none size-4 shrink-0 object-contain", className)}
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
export function PanelVisibilityIcon({ active: active2, side = "left", ...props }) {
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
        className={active2 ? "fill-current opacity-60" : "fill-current opacity-[0.12]"}
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
export const PlaybackCirclePlayIcon = desktopMediaIcon(PlaybackCirclePlayIcon$1);
export const PlaybackCirclePauseIcon = desktopMediaIcon(PlaybackCirclePauseIcon$1);
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
      className={cn$2(
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
export const RetryIcon = reactExports.forwardRef(function RetryIcon22(
  { size: size2 = 24, style: style2, ...props },
  ref,
) {
  const ariaHidden = props["aria-hidden"] ?? (props["aria-label"] ? void 0 : true);
  return (
    <CompositedSvg
      ref={ref}
      {...props}
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={ariaHidden}
      style={{
        ...style2,
        // Retain the asset tone after painting the complete glyph.
        filter: [style2?.filter === "none" ? void 0 : style2?.filter, "opacity(0.85)"]
          .filter(Boolean)
          .join(" "),
      }}
    >
      <title>{props["aria-label"] ?? "Retry"}</title>
      <path
        d="M20.8128 9.96004C21.1123 10.1009 21.2992 10.4013 21.3011 10.7266C21.4176 11.6856 21.3857 12.6787 21.1858 13.6749C20.1769 18.7026 15.283 21.9609 10.2552 20.9522C7.54129 20.4077 5.34204 18.7293 4.05303 16.5128L5.6087 15.6085C6.64962 17.3984 8.42209 18.7487 10.6097 19.1876C14.3119 19.9301 17.9226 17.8019 19.1399 14.3389L17.5638 14.0225C17.3322 13.9758 17.2431 13.6914 17.4066 13.5206L20.8128 9.96004ZM2.81378 10.3262C3.82264 5.29847 8.71662 2.04025 13.7444 3.04891C16.458 3.59349 18.6567 5.2711 19.9456 7.48738L18.3899 8.39266C17.349 6.60274 15.5775 5.25248 13.3899 4.81355C9.68787 4.07088 6.07735 6.19867 4.85968 9.66121L6.43292 9.97664C6.6646 10.0233 6.75455 10.3077 6.59112 10.4786L3.18389 14.0391C2.88075 13.8966 2.69387 13.5907 2.69659 13.2608C2.58201 12.306 2.61487 11.3178 2.81378 10.3262Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
});
RetryIcon.displayName = "RetryIcon";
export function SkillIcon({
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
      <path d="M15.0507 5.15106C15.1639 5.26431 15.3051 5.34533 15.46 5.38578C15.6149 5.42623 15.7777 5.42463 15.9318 5.38117C16.0858 5.3377 16.2255 5.25393 16.3364 5.1385C16.4473 5.02306 16.5254 4.88014 16.5626 4.72446C16.656 4.33558 16.8514 3.97862 17.1286 3.69035C17.4059 3.40209 17.7549 3.19293 18.1398 3.08443C18.5248 2.97593 18.9316 2.972 19.3186 3.07304C19.7055 3.17409 20.0586 3.37646 20.3413 3.65932C20.624 3.94217 20.8263 4.29529 20.9272 4.6823C21.0281 5.06931 21.024 5.47623 20.9154 5.86115C20.8068 6.24606 20.5975 6.59507 20.3092 6.87222C20.0209 7.14937 19.6639 7.34465 19.275 7.43794C19.1193 7.4752 18.9764 7.5533 18.861 7.6642C18.7456 7.77509 18.6618 7.91477 18.6183 8.06883C18.5749 8.22289 18.5733 8.38575 18.6137 8.54063C18.6542 8.69551 18.7352 8.8368 18.8484 8.94993L20.363 10.4637C20.5647 10.6655 20.7248 10.905 20.8339 11.1686C20.9431 11.4322 20.9993 11.7147 20.9993 12C20.9993 12.2853 20.9431 12.5678 20.8339 12.8314C20.7248 13.095 20.5647 13.3345 20.363 13.5363L18.8484 15.051C18.7353 15.1642 18.594 15.2452 18.4392 15.2857C18.2843 15.3261 18.1214 15.3245 17.9674 15.2811C17.8133 15.2376 17.6737 15.1538 17.5628 15.0384C17.4519 14.923 17.3738 14.7801 17.3366 14.6244C17.2431 14.2355 17.0478 13.8785 16.7705 13.5903C16.4933 13.302 16.1443 13.0928 15.7593 12.9843C15.3744 12.8758 14.9675 12.8719 14.5806 12.973C14.1936 13.074 13.8406 13.2764 13.5579 13.5592C13.2751 13.8421 13.0729 14.1952 12.972 14.5822C12.8711 14.9692 12.8751 15.3761 12.9837 15.7611C13.0924 16.146 13.3016 16.495 13.59 16.7721C13.8783 17.0493 14.2353 17.2446 14.6242 17.3379C14.7798 17.3751 14.9228 17.4532 15.0382 17.5641C15.1536 17.675 15.2374 17.8147 15.2808 17.9687C15.3243 18.1228 15.3259 18.2857 15.2854 18.4405C15.245 18.5954 15.164 18.7367 15.0507 18.8498L13.5362 20.3636C13.3344 20.5654 13.095 20.7254 12.8314 20.8346C12.5678 20.9438 12.2853 21 12 21C11.7147 21 11.4322 20.9438 11.1686 20.8346C10.905 20.7254 10.6656 20.5654 10.4638 20.3636L8.94926 18.8489C8.83613 18.7357 8.69486 18.6547 8.53999 18.6142C8.38512 18.5738 8.22227 18.5754 8.06823 18.6188C7.91418 18.6623 7.77451 18.7461 7.66362 18.8615C7.55273 18.9769 7.47464 19.1199 7.43738 19.2755C7.34397 19.6644 7.14859 20.0214 6.87136 20.3096C6.59414 20.5979 6.24509 20.8071 5.86016 20.9156C5.47524 21.0241 5.06835 21.028 4.6814 20.927C4.29445 20.8259 3.94143 20.6235 3.65869 20.3407C3.37595 20.0578 3.17371 19.7047 3.0728 19.3177C2.97189 18.9307 2.97595 18.5238 3.08458 18.1389C3.1932 17.7539 3.40245 17.4049 3.69079 17.1278C3.97913 16.8506 4.33612 16.6554 4.72501 16.5621C4.88068 16.5248 5.02359 16.4467 5.13901 16.3358C5.25444 16.2249 5.3382 16.0852 5.38166 15.9312C5.42513 15.7771 5.42672 15.6142 5.38627 15.4594C5.34583 15.3045 5.26481 15.1632 5.15158 15.0501L3.637 13.5363C3.43526 13.3345 3.27523 13.095 3.16605 12.8314C3.05687 12.5678 3.00068 12.2853 3.00068 12C3.00068 11.7147 3.05687 11.4322 3.16605 11.1686C3.27523 10.905 3.43526 10.6655 3.637 10.4637L5.15158 8.94903C5.2647 8.83578 5.40598 8.75476 5.56084 8.71431C5.71571 8.67386 5.87856 8.67545 6.03261 8.71892C6.18665 8.76239 6.32632 8.84616 6.43721 8.96159C6.5481 9.07702 6.62619 9.21995 6.66345 9.37562C6.75687 9.76451 6.95225 10.1215 7.22947 10.4097C7.5067 10.698 7.85574 10.9072 8.24067 11.0157C8.62559 11.1242 9.03248 11.1281 9.41943 11.027C9.80638 10.926 10.1594 10.7236 10.4421 10.4408C10.7249 10.1579 10.9271 9.8048 11.028 9.41779C11.1289 9.03078 11.1249 8.62386 11.0163 8.23894C10.9076 7.85402 10.6984 7.50502 10.41 7.22787C10.1217 6.95072 9.76471 6.75544 9.37582 6.66215C9.22016 6.62489 9.07724 6.54679 8.96182 6.43589C8.84639 6.32499 8.76263 6.18532 8.71917 6.03126C8.6757 5.8772 8.67411 5.71434 8.71456 5.55946C8.755 5.40458 8.83602 5.26329 8.94926 5.15016L10.4638 3.63637C10.6656 3.43462 10.905 3.27458 11.1686 3.16539C11.4322 3.0562 11.7147 3 12 3C12.2853 3 12.5678 3.0562 12.8314 3.16539C13.095 3.27458 13.3344 3.43462 13.5362 3.63637L15.0507 5.15106Z" />
    </CompositedSvg>
  );
}
SkillIcon.displayName = "SkillIcon";
const TagXIcon = reactExports.forwardRef(function TagXIcon2(
  { size: size2 = 24, strokeWidth = 2, className, ...props },
  ref,
) {
  return (
    <CompositedSvg
      ref={ref}
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["lucide lucide-tag-x-icon lucide-tag-x", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <path d="m16.5 6.5-3.914-3.914A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.43 2.43 0 0 0 3.42 0l1.79-1.79" />
      <path d="m16.5 10.5 5 5" />
      <path d="m21.5 10.5-5 5" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </CompositedSvg>
  );
});
TagXIcon.displayName = "TagXIcon";
export function UsePromptIcon({ size: size2 = 24, className, ...rest }) {
  return (
    <CompositedSvg
      xmlns="http://www.w3.org/2000/svg"
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      data-icon="use-prompt"
      {...rest}
    >
      <path
        d="M3.84453 3.84453C2.71849 4.97056 2.71849 6.79623 3.84453 7.92226L5.43227 9.51C5.44419 9.49622 5.45669 9.48276 5.46978 9.46967L9.46978 5.46967C9.48284 5.45662 9.49625 5.44415 9.50999 5.43226L7.92226 3.84453C6.79623 2.71849 4.97056 2.71849 3.84453 3.84453Z"
        fill="currentColor"
      />
      <path
        d="M10.5679 6.49012C10.556 6.50386 10.5435 6.51728 10.5304 6.53033L6.53044 10.5303C6.51735 10.5434 6.5039 10.5559 6.49011 10.5678L16.0777 20.1555C17.2038 21.2815 19.0294 21.2815 20.1555 20.1555C21.2815 19.0294 21.2815 17.2038 20.1555 16.0777L10.5679 6.49012Z"
        fill="currentColor"
      />
      <path
        d="M16.1 2.30719C16.261 1.8976 16.8385 1.8976 16.9994 2.30719L17.4298 3.40247C17.479 3.52752 17.5776 3.62651 17.7022 3.67583L18.7934 4.1078C19.2015 4.26934 19.2015 4.849 18.7934 5.01054L17.7022 5.44252C17.5776 5.49184 17.479 5.59082 17.4298 5.71587L16.9995 6.81115C16.8385 7.22074 16.261 7.22074 16.1 6.81116L15.6697 5.71587C15.6205 5.59082 15.5219 5.49184 15.3973 5.44252L14.3061 5.01054C13.898 4.849 13.898 4.26934 14.3061 4.1078L15.3973 3.67583C15.5219 3.62651 15.6205 3.52752 15.6697 3.40247L16.1 2.30719Z"
        fill="currentColor"
      />
      <path
        d="M19.9672 9.12945C20.1281 8.71987 20.7057 8.71987 20.8666 9.12945L21.0235 9.5288C21.0727 9.65385 21.1713 9.75284 21.2959 9.80215L21.6937 9.95965C22.1018 10.1212 22.1018 10.7009 21.6937 10.8624L21.2959 11.0199C21.1713 11.0692 21.0727 11.1682 21.0235 11.2932L20.8666 11.6926C20.7057 12.1022 20.1281 12.1022 19.9672 11.6926L19.8103 11.2932C19.7611 11.1682 19.6625 11.0692 19.5379 11.0199L19.14 10.8624C18.732 10.7009 18.732 10.1212 19.14 9.95965L19.5379 9.80215C19.6625 9.75284 19.7611 9.65385 19.8103 9.5288L19.9672 9.12945Z"
        fill="currentColor"
      />
      <path
        d="M5.1332 15.3072C5.29414 14.8976 5.87167 14.8976 6.03261 15.3072L6.18953 15.7065C6.23867 15.8316 6.33729 15.9306 6.46188 15.9799L6.85975 16.1374C7.26783 16.2989 7.26783 16.8786 6.85975 17.0401L6.46188 17.1976C6.33729 17.2469 6.23867 17.3459 6.18953 17.471L6.03261 17.8703C5.87167 18.2799 5.29414 18.2799 5.1332 17.8703L4.97628 17.471C4.92714 17.3459 4.82852 17.2469 4.70393 17.1976L4.30606 17.0401C3.89798 16.8786 3.89798 16.2989 4.30606 16.1374L4.70393 15.9799C4.82852 15.9306 4.92714 15.8316 4.97628 15.7065L5.1332 15.3072Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}
UsePromptIcon.displayName = "UsePromptIcon";
export const ICON_TEXT_SPEC = {
  compact: {
    textClassName: "text-xs font-normal",
    iconSize: 12,
  },
  menu: {
    textClassName: "text-sm font-normal",
    iconSize: 16,
  },
  button: {
    textClassName: "text-sm font-medium",
    iconSize: 16,
  },
};
export function StrokeIcon({ icon: Glyph, size: size2, viewBoxSize = 24, className }) {
  const spec = ICON_STROKE_SPEC.find((entry) => entry.size === size2);
  if (!spec) throw new Error(`Unsupported stroke icon size: ${size2}`);
  return (
    <Glyph
      size={size2}
      strokeWidth={getIconStrokeWidth(size2, viewBoxSize)}
      className={cn$2(className, spec.className, "shrink-0")}
      aria-hidden={true}
    />
  );
}
export const BROWSER_INSPIRATION_URLS = {
  "xinpianchang.com": "https://www.xinpianchang.com/",
  "xiaohongshu.com": "https://www.xiaohongshu.com/explore",
  "bilibili.com": "https://www.bilibili.com/",
  "douyin.com": "https://www.douyin.com/",
  "weibo.com": "https://weibo.com/",
  "movie.douban.com": "https://movie.douban.com/",
  "zcool.com.cn": "https://www.zcool.com.cn/",
  "huaban.com": "https://huaban.com/",
  "cnu.cc": "http://www.cnu.cc/",
  "tvcbook.com": "https://www.tvcbook.com/discover",
  "campaign.nowness.cn": "https://campaign.nowness.cn/",
  "cinehello.com": "https://cinehello.com/",
  "manamana.net": "https://www.manamana.net/",
  "d-arts.cn": "https://www.d-arts.cn/",
  "digitaling.com": "https://www.digitaling.com/projects",
  "adquan.com": "https://www.adquan.com/case_library/index",
  "meihua.info": "https://www.meihua.info/",
  "topys.cn": "https://www.topys.cn/",
  "promonews.tv": "https://www.promonews.tv/",
  "shotdeck.com": "https://shotdeck.com/",
  "site.frameset.app": "https://site.frameset.app/",
  "itsnicethat.com": "https://www.itsnicethat.com/projects-creatives",
  "are.na": "https://www.are.na/",
  "underconsideration.com": "https://www.underconsideration.com/brandnew/",
  "design360.cn": "https://design360.cn/",
  "thetype.com": "https://www.thetype.com/",
  "hiiibrand.com": "https://www.hiiibrand.com/",
  "gtn9.com": "https://www.gtn9.com/",
  "ui.cn": "https://www.ui.cn/",
  "uisdc.com": "https://www.uisdc.com/",
  "hao.uisdc.com": "https://hao.uisdc.com/",
  "dezeen.com": "https://www.dezeen.com/",
  "designboom.com": "https://www.designboom.com/",
  "archdaily.cn": "https://www.archdaily.cn/cn",
  "gooood.cn": "https://www.gooood.cn/",
  "designverse.com.cn": "https://www.designverse.com.cn/",
  "adstyle.com.cn": "https://www.adstyle.com.cn/",
  "shejipi.com": "https://www.shejipi.com/",
  "puxiang.com": "https://www.puxiang.com/",
  "film-grab.com": "https://film-grab.com/",
  "behance.net": "https://www.behance.net/featured",
  "artstation.com": "https://www.artstation.com/",
  "pinterest.com": "https://www.pinterest.com/",
  "mubi.com": "https://mubi.com/en/notebook",
  "awwwards.com": "https://www.awwwards.com/",
  "cosmos.so": "https://www.cosmos.so/",
  "shot.cafe": "https://shot.cafe/stream/",
  "flim.ai": "https://flim.ai/",
  "eyecannndy.com": "https://eyecannndy.com/",
  "shotonwhat.com": "https://shotonwhat.com/",
  "theasc.com": "https://theasc.com/articles",
  "directorslibrary.com": "https://directorslibrary.com/latest/",
  "shots.net": "https://shots.net/the-work",
  "lbbonline.com": "https://lbbonline.com/",
  "directorsnotes.com": "https://directorsnotes.com/",
  "nowness.com": "https://www.nowness.com/",
  "artofthetitle.com": "https://www.artofthetitle.com/",
  "motionographer.com": "https://motionographer.com/",
  "stashmedia.tv": "https://www.stashmedia.tv/",
  "the-brandidentity.com": "https://the-brandidentity.com/",
  "bpando.org": "https://bpando.org/",
  "thedieline.com": "https://thedieline.com/",
  "commarts.com": "https://www.commarts.com/",
  "dandad.org": "https://www.dandad.org/awards/professional/",
  "fontsinuse.com": "https://fontsinuse.com/",
  "creativeboom.com": "https://www.creativeboom.com/",
  "abduzeedo.com": "https://abduzeedo.com/",
  "archdaily.com": "https://www.archdaily.com/",
  "wallpaper.com": "https://www.wallpaper.com/",
  "design-milk.com": "https://design-milk.com/",
  "core77.com": "https://www.core77.com/",
  "siteinspire.com": "https://www.siteinspire.com/",
  "mobbin.com": "https://mobbin.com/",
  "godly.website": "https://godly.website/",
  "land-book.com": "https://land-book.com/",
  "savee.it": "https://savee.it/",
  "designspiration.com": "https://www.designspiration.com/",
  "thisiscolossal.com": "https://www.thisiscolossal.com/",
  "booooooom.com": "https://www.booooooom.com/",
};
