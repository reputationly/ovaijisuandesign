// workspace-failure-diagnosis-registry.js

const MIN_SUPPORTED_WINDOWS_BUILD = 17763;

const MIN_SUPPORTED_WINDOWS_VERSION_LABEL =
  "Windows 10 1809 / Windows Server 2019";

export const WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY = {
  network_proxy_suspected: {
    code: "network_proxy_suspected",
    category: "network",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.networkProxy.title",
      zh: "可能是 VPN 或代理影响了本地 AI 服务",
      en: "VPN or proxy may be blocking the local AI service",
    },
    message: {
      key: "bundleError.diagnosis.networkProxy.message",
      zh: "检测到本地 AI 服务启动时可能遇到网络、VPN 或代理问题。",
      en: "The local AI service may be affected by network, VPN, or proxy settings.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.networkProxy.primaryAction",
      zh: "关闭 VPN 后重试",
      en: "Turn off VPN and retry",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.networkProxy.suggestion1",
        zh: "关闭 VPN，或切换到可访问国内服务的节点后重试。",
        en: "Turn off VPN, or switch to a node that can access domestic services, then retry.",
      },
      {
        key: "bundleError.diagnosis.networkProxy.suggestion2",
        zh: "检查系统代理、公司网络策略或证书代理是否拦截本地服务连接。",
        en: "Check whether system proxy, company network policy, or certificate proxy is intercepting local service connections.",
      },
      {
        key: "bundleError.diagnosis.networkProxy.suggestion3",
        zh: "若刚切换过网络，请等待几秒后重新启动 workspace。",
        en: "If you just changed networks, wait a few seconds and restart the workspace.",
      },
    ],
    runbook: "network_proxy",
  },
  runtime_dir_permission: {
    code: "runtime_dir_permission",
    category: "permission",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.runtimeDirPermission.title",
      zh: "本地运行目录没有写入权限",
      en: "The local runtime directory is not writable",
    },
    message: {
      key: "bundleError.diagnosis.runtimeDirPermission.message",
      zh: "本地运行时缓存或数据目录权限异常。",
      en: "The local runtime cache or data directory has a permission problem.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.runtimeDirPermission.primaryAction",
      zh: "检查权限后重试",
      en: "Check permissions and retry",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.runtimeDirPermission.suggestion1",
        zh: "确认当前用户有权限读写本地缓存和数据目录。",
        en: "Make sure the current user can read and write the local cache and data directories.",
      },
      {
        key: "bundleError.diagnosis.runtimeDirPermission.suggestion2",
        zh: "如果目录在外接盘、同步盘或受管控目录中，请切换到本机用户目录后重试。",
        en: "If the directory is on an external drive, synced folder, or managed location, move it under the local user directory and retry.",
      },
    ],
    runbook: "runtime_dir_permission",
  },
  runtime_start_timeout: {
    code: "runtime_start_timeout",
    category: "runtime",
    severity: "recoverable",
    title: {
      key: "bundleError.diagnosis.runtimeStartTimeout.title",
      zh: "本地 AI 服务启动超时",
      en: "The local AI service timed out while starting",
    },
    message: {
      key: "bundleError.diagnosis.runtimeStartTimeout.message",
      zh: "本地 AI 服务启动超时。",
      en: "The local AI service did not become ready in time.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.runtimeStartTimeout.primaryAction",
      zh: "再试一次",
      en: "Retry",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.runtimeStartTimeout.suggestion1",
        zh: "首次启动或更新后系统安全扫描可能较慢，请重试一次。",
        en: "After the first launch or an update, system security scanning may slow startup. Try again once.",
      },
      {
        key: "bundleError.diagnosis.runtimeStartTimeout.suggestion2",
        zh: "如果持续超时，请检查安全软件是否拦截本地 AI runtime。",
        en: "If it keeps timing out, check whether security software is blocking the local AI runtime.",
      },
    ],
    runbook: "runtime_start_timeout",
  },
  runtime_start_failed: {
    code: "runtime_start_failed",
    category: "runtime",
    severity: "unknown",
    title: {
      key: "bundleError.diagnosis.runtimeStartFailed.title",
      zh: "本地 AI 服务没有正常启动",
      en: "The local AI service did not start correctly",
    },
    message: {
      key: "bundleError.diagnosis.runtimeStartFailed.message",
      zh: "本地 AI 服务没有正常启动。",
      en: "The local AI service failed to start correctly.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.runtimeStartFailed.primaryAction",
      zh: "重新启动 workspace",
      en: "Restart workspace",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.runtimeStartFailed.suggestion1",
        zh: "点击重试重新启动 workspace runtime。",
        en: "Click retry to restart the workspace runtime.",
      },
      {
        key: "bundleError.diagnosis.runtimeStartFailed.suggestion2",
        zh: "若问题持续，请导出日志并反馈给支持。",
        en: "If the problem continues, export diagnostics and contact support.",
      },
    ],
    runbook: "runtime_start_failed",
  },
  macos_version_unsupported: {
    code: "macos_version_unsupported",
    category: "runtime",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.macosVersionUnsupported.title",
      zh: "系统版本过低",
      en: "macOS version is too old",
    },
    message: {
      key: "bundleError.diagnosis.macosVersionUnsupported.message",
      zh: "系统版本过低，请升级 macOS 至 13.0 或更高版本。",
      en: "Your macOS version is too old. Upgrade to macOS 13.0 or later.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.macosVersionUnsupported.primaryAction",
      zh: "升级 macOS 后再打开",
      en: "Upgrade macOS and reopen",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.macosVersionUnsupported.suggestion1",
        zh: "macOS 12 及更早版本不支持当前本地 AI 服务。",
        en: "macOS 12 and earlier do not support the current local AI service.",
      },
      {
        key: "bundleError.diagnosis.macosVersionUnsupported.suggestion2",
        zh: "重复重试无法解决，请先升级系统，升级完成后重新打开 MiniMax Design。",
        en: "Retrying will not fix this. Upgrade macOS first, then reopen MiniMax Design.",
      },
    ],
    runbook: "macos_version_unsupported",
  },
  windows_version_unsupported: {
    code: "windows_version_unsupported",
    category: "runtime",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.windowsVersionUnsupported.title",
      zh: "Windows 版本不受支持",
      en: "This Windows version is not supported",
    },
    message: {
      key: "bundleError.diagnosis.windowsVersionUnsupported.message",
      zh: `当前 Windows 版本无法运行本地 AI 服务，请升级至 ${MIN_SUPPORTED_WINDOWS_VERSION_LABEL} 或更高版本。`,
      en: `The local AI service requires ${MIN_SUPPORTED_WINDOWS_VERSION_LABEL} or later.`,
    },
    primaryAction: {
      key: "bundleError.diagnosis.windowsVersionUnsupported.primaryAction",
      zh: "升级 Windows 后再打开",
      en: "Upgrade Windows and reopen",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.windowsVersionUnsupported.suggestion1",
        zh: `最低要求为 ${MIN_SUPPORTED_WINDOWS_VERSION_LABEL}（系统内部版本 ${MIN_SUPPORTED_WINDOWS_BUILD}+）。`,
        en: `Minimum requirement: ${MIN_SUPPORTED_WINDOWS_VERSION_LABEL} (OS build ${MIN_SUPPORTED_WINDOWS_BUILD}+).`,
      },
      {
        key: "bundleError.diagnosis.windowsVersionUnsupported.suggestion2",
        zh: "重复重试或重新安装无法解决，请先升级 Windows。",
        en: "Retrying or reinstalling will not fix this. Upgrade Windows first.",
      },
    ],
    runbook: "windows_version_unsupported",
  },
  windows_version_unverified: {
    code: "windows_version_unverified",
    category: "runtime",
    severity: "recoverable",
    title: {
      key: "bundleError.diagnosis.windowsVersionUnverified.title",
      zh: "暂时无法确认 Windows 版本",
      en: "Unable to verify the Windows version",
    },
    message: {
      key: "bundleError.diagnosis.windowsVersionUnverified.message",
      zh: "Windows 版本核验未完成，本地 AI 服务尚未启动。这不代表您的系统版本过低。",
      en: "The Windows version check could not finish, so the local AI service has not started. This does not mean your Windows version is too old.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.windowsVersionUnverified.primaryAction",
      zh: "稍后重试",
      en: "Retry shortly",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.windowsVersionUnverified.suggestion1",
        zh: "等待几秒后重试，无需修改系统设置或重新安装。",
        en: "Wait a few seconds and retry. There is no need to change system settings or reinstall.",
      },
      {
        key: "bundleError.diagnosis.windowsVersionUnverified.suggestion2",
        zh: "如果仍然失败，请上传诊断并联系支持，确认版本检测是否被系统策略限制。",
        en: "If the check keeps failing, upload diagnostics and contact support to check whether system policy restricts version detection.",
      },
    ],
    runbook: "windows_version_unverified",
  },
  windows_cpu_unsupported: {
    code: "windows_cpu_unsupported",
    category: "runtime",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.windowsCpuUnsupported.title",
      zh: "当前处理器不受支持",
      en: "This processor is not supported",
    },
    message: {
      key: "bundleError.diagnosis.windowsCpuUnsupported.message",
      zh: "本地 AI 服务需要支持 SSE4.2 指令集的 64 位处理器。",
      en: "The local AI service requires a 64-bit processor with SSE4.2 support.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.windowsCpuUnsupported.primaryAction",
      zh: "更换支持的电脑",
      en: "Use a supported computer",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.windowsCpuUnsupported.suggestion1",
        zh: "升级 Windows 或重复安装无法补充处理器指令集。",
        en: "Upgrading Windows or reinstalling cannot add a missing CPU instruction set.",
      },
      {
        key: "bundleError.diagnosis.windowsCpuUnsupported.suggestion2",
        zh: "请在较新的 64 位电脑上安装 MiniMax Design。",
        en: "Install MiniMax Design on a newer 64-bit computer.",
      },
    ],
    runbook: "windows_cpu_unsupported",
  },
  windows_runtime_dependency_failed: {
    code: "windows_runtime_dependency_failed",
    category: "runtime",
    severity: "needs_reinstall",
    title: {
      key: "bundleError.diagnosis.windowsRuntimeDependencyFailed.title",
      zh: "Windows 组件加载失败",
      en: "A Windows component failed to load",
    },
    message: {
      key: "bundleError.diagnosis.windowsRuntimeDependencyFailed.message",
      zh: "Windows 无法加载本地 AI 服务需要的系统组件。",
      en: "Windows could not load a system component required by the local AI service.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.windowsRuntimeDependencyFailed.primaryAction",
      zh: "重启电脑后重新安装",
      en: "Restart, then reinstall",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.windowsRuntimeDependencyFailed.suggestion1",
        zh: "先重启电脑，避免更新或安全软件仍占用旧文件。",
        en: "Restart first so updates or security software release old files.",
      },
      {
        key: "bundleError.diagnosis.windowsRuntimeDependencyFailed.suggestion2",
        zh: "如果仍然失败，请重新安装最新版 MiniMax Design。",
        en: "If it still fails, reinstall the latest MiniMax Design.",
      },
    ],
    runbook: "windows_runtime_dependency_failed",
  },
  windows_binary_incompatible: {
    code: "windows_binary_incompatible",
    category: "binary",
    severity: "needs_reinstall",
    title: {
      key: "bundleError.diagnosis.windowsBinaryIncompatible.title",
      zh: "本地 AI 服务文件不兼容",
      en: "The local AI service file is incompatible",
    },
    message: {
      key: "bundleError.diagnosis.windowsBinaryIncompatible.message",
      zh: "安装文件架构不匹配或文件已经损坏。",
      en: "An installed file has the wrong architecture or is corrupted.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.windowsBinaryIncompatible.primaryAction",
      zh: "重新安装最新版",
      en: "Reinstall the latest version",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.windowsBinaryIncompatible.suggestion1",
        zh: "请从官方渠道重新下载并覆盖安装。",
        en: "Download the latest installer from the official source and reinstall.",
      },
      {
        key: "bundleError.diagnosis.windowsBinaryIncompatible.suggestion2",
        zh: "若安全软件隔离了安装文件，请在恢复文件后重新安装。",
        en: "If security software quarantined an installed file, restore it before reinstalling.",
      },
    ],
    runbook: "windows_binary_incompatible",
  },
  windows_runtime_resource_exhausted: {
    code: "windows_runtime_resource_exhausted",
    category: "runtime",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.windowsRuntimeResourceExhausted.title",
      zh: "系统资源不足",
      en: "Not enough system resources",
    },
    message: {
      key: "bundleError.diagnosis.windowsRuntimeResourceExhausted.message",
      zh: "可用内存、虚拟内存或磁盘空间不足，无法启动本地 AI 服务。",
      en: "The local AI service could not start because memory, virtual memory, or disk space is low.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.windowsRuntimeResourceExhausted.primaryAction",
      zh: "释放资源后重试",
      en: "Free resources and retry",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.windowsRuntimeResourceExhausted.suggestion1",
        zh: "关闭占用大量内存的程序，并确保系统盘和项目盘有足够空间。",
        en: "Close memory-heavy apps and free space on the system and project drives.",
      },
      {
        key: "bundleError.diagnosis.windowsRuntimeResourceExhausted.suggestion2",
        zh: "释放资源后完全退出 MiniMax Design，再重新打开。",
        en: "After freeing resources, fully quit and reopen MiniMax Design.",
      },
    ],
    runbook: "windows_runtime_resource_exhausted",
  },
  windows_runtime_terminated: {
    code: "windows_runtime_terminated",
    category: "runtime",
    severity: "recoverable",
    title: {
      key: "bundleError.diagnosis.windowsRuntimeTerminated.title",
      zh: "本地 AI 服务被终止",
      en: "The local AI service was terminated",
    },
    message: {
      key: "bundleError.diagnosis.windowsRuntimeTerminated.message",
      zh: "本地 AI 服务被系统、安装程序或其他程序强制结束。",
      en: "The local AI service was stopped by Windows, an installer, or another program.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.windowsRuntimeTerminated.primaryAction",
      zh: "重新打开 MiniMax Design",
      en: "Reopen MiniMax Design",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.windowsRuntimeTerminated.suggestion1",
        zh: "如果正在安装更新，请等待安装完成后再打开。",
        en: "If an update is installing, wait for it to finish before reopening.",
      },
      {
        key: "bundleError.diagnosis.windowsRuntimeTerminated.suggestion2",
        zh: "否则请完全退出 MiniMax Design 后重新打开。",
        en: "Otherwise, fully quit and reopen MiniMax Design.",
      },
    ],
    runbook: "windows_runtime_terminated",
  },
  opencode_binary_missing: {
    code: "opencode_binary_missing",
    category: "binary",
    severity: "needs_reinstall",
    title: {
      key: "bundleError.diagnosis.opencodeBinaryMissing.title",
      zh: "本地 AI runtime 文件缺失",
      en: "The local AI runtime file is missing",
    },
    message: {
      key: "bundleError.diagnosis.opencodeBinaryMissing.message",
      zh: "本地 AI runtime 文件缺失。",
      en: "The local AI runtime file is missing.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.opencodeBinaryMissing.primaryAction",
      zh: "重新安装后再试",
      en: "Reinstall and retry",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.opencodeBinaryMissing.suggestion1",
        zh: "请重新下载或重新安装应用后再打开 workspace。",
        en: "Re-download or reinstall the app, then open the workspace again.",
      },
      {
        key: "bundleError.diagnosis.opencodeBinaryMissing.suggestion2",
        zh: "如果安全软件隔离了 runtime 文件，请恢复文件并加入信任。",
        en: "If security software quarantined the runtime file, restore it and add it to trusted items.",
      },
    ],
    runbook: "opencode_binary_missing",
  },
  opencode_binary_corrupted: {
    code: "opencode_binary_corrupted",
    category: "binary",
    severity: "needs_reinstall",
    title: {
      key: "bundleError.diagnosis.opencodeBinaryCorrupted.title",
      zh: "本地 AI runtime 文件可能损坏",
      en: "The local AI runtime file may be corrupted",
    },
    message: {
      key: "bundleError.diagnosis.opencodeBinaryCorrupted.message",
      zh: "本地 AI runtime 文件可能损坏或下载不完整。",
      en: "The local AI runtime file may be corrupted or incompletely downloaded.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.opencodeBinaryCorrupted.primaryAction",
      zh: "重新安装后再试",
      en: "Reinstall and retry",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.opencodeBinaryCorrupted.suggestion1",
        zh: "请重新下载或重新安装应用，让 runtime 文件重新生成。",
        en: "Re-download or reinstall the app so the runtime file is regenerated.",
      },
      {
        key: "bundleError.diagnosis.opencodeBinaryCorrupted.suggestion2",
        zh: "如果近期被安全软件扫描或隔离，请先加入信任后重试。",
        en: "If security software scanned or quarantined it recently, trust the file and retry.",
      },
    ],
    runbook: "opencode_binary_corrupted",
  },
  opencode_binary_blocked: {
    code: "opencode_binary_blocked",
    category: "binary",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.opencodeBinaryBlocked.title",
      zh: "本地 AI runtime 可能被安全软件拦截",
      en: "The local AI runtime may be blocked by security software",
    },
    message: {
      key: "bundleError.diagnosis.opencodeBinaryBlocked.message",
      zh: "本地 AI runtime 可能被系统安全软件或权限策略拦截。",
      en: "The local AI runtime may be blocked by security software or permission policy.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.opencodeBinaryBlocked.primaryAction",
      zh: "加入信任后重试",
      en: "Trust it and retry",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.opencodeBinaryBlocked.suggestion1",
        zh: "检查系统安全软件、企业管控或杀毒软件是否拦截了 AI runtime。",
        en: "Check whether security software, enterprise policy, or antivirus blocked the AI runtime.",
      },
      {
        key: "bundleError.diagnosis.opencodeBinaryBlocked.suggestion2",
        zh: "恢复被隔离的 runtime 文件，加入信任后重试。",
        en: "Restore the quarantined runtime file, add it to trusted items, then retry.",
      },
    ],
    runbook: "opencode_binary_blocked",
  },
  opencode_port_conflict: {
    code: "opencode_port_conflict",
    category: "runtime",
    severity: "recoverable",
    title: {
      key: "bundleError.diagnosis.opencodePortConflict.title",
      zh: "本地 AI 服务端口可能被占用",
      en: "The local AI service port may be occupied",
    },
    message: {
      key: "bundleError.diagnosis.opencodePortConflict.message",
      zh: "本地 AI 服务端口可能被占用。",
      en: "The local AI service port may already be in use.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.opencodePortConflict.primaryAction",
      zh: "换端口重试",
      en: "Retry on another port",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.opencodePortConflict.suggestion1",
        zh: "点击重试，系统会尝试换端口重新启动。",
        en: "Click retry. The system will try restarting on another port.",
      },
      {
        key: "bundleError.diagnosis.opencodePortConflict.suggestion2",
        zh: "如果持续失败，请完全退出应用后重新打开。",
        en: "If it keeps failing, fully quit and reopen the app.",
      },
    ],
    runbook: "opencode_port_conflict",
  },
  opencode_config_broken: {
    code: "opencode_config_broken",
    category: "config",
    severity: "recoverable",
    title: {
      key: "bundleError.diagnosis.opencodeConfigBroken.title",
      zh: "本地 AI 配置文件异常",
      en: "The local AI config file is invalid",
    },
    message: {
      key: "bundleError.diagnosis.opencodeConfigBroken.message",
      zh: "检测到本地 AI 配置文件异常。",
      en: "The local AI config file appears to be invalid.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.opencodeConfigBroken.primaryAction",
      zh: "使用修复后的配置重试",
      en: "Retry with repaired config",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.opencodeConfigBroken.suggestion1",
        zh: "系统已尝试备份异常配置，请点击重试。",
        en: "The system has tried to back up the invalid config. Click retry.",
      },
      {
        key: "bundleError.diagnosis.opencodeConfigBroken.suggestion2",
        zh: "若仍失败，请反馈问题并附带诊断码。",
        en: "If it still fails, report the issue with the diagnosis ID.",
      },
    ],
    runbook: "opencode_config_broken",
  },
  opencode_db_schema_mismatch: {
    code: "opencode_db_schema_mismatch",
    category: "config",
    severity: "recoverable",
    title: {
      key: "bundleError.diagnosis.opencodeDbSchemaMismatch.title",
      zh: "本地 AI 数据库已重建",
      en: "The local AI database was rebuilt",
    },
    message: {
      key: "bundleError.diagnosis.opencodeDbSchemaMismatch.message",
      zh: "本地 AI 数据库与当前版本不兼容，已自动重建。",
      en: "The local AI database was incompatible with this version and has been rebuilt.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.opencodeDbSchemaMismatch.primaryAction",
      zh: "重新启动 workspace",
      en: "Restart workspace",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.opencodeDbSchemaMismatch.suggestion1",
        zh: "历史对话记录不再显示，但原数据库已备份保留，项目文件、画布和素材不受影响。",
        en: "Past conversations no longer appear. The original database is kept as a backup, and your project files, canvas and assets are unaffected.",
      },
      {
        key: "bundleError.diagnosis.opencodeDbSchemaMismatch.suggestion2",
        zh: "若仍失败，请反馈问题并附带诊断码。",
        en: "If it still fails, report the issue with the diagnosis ID.",
      },
    ],
    runbook: "opencode_db_schema_mismatch",
  },
  gateway_start_failed: {
    code: "gateway_start_failed",
    category: "gateway",
    severity: "unknown",
    title: {
      key: "bundleError.diagnosis.gatewayStartFailed.title",
      zh: "本地 workspace 服务没有正常启动",
      en: "The local workspace service did not start",
    },
    message: {
      key: "bundleError.diagnosis.gatewayStartFailed.message",
      zh: "本地 workspace 服务没有正常启动。",
      en: "The local workspace service did not start correctly.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.gatewayStartFailed.primaryAction",
      zh: "重新启动 workspace 服务",
      en: "Restart workspace service",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.gatewayStartFailed.suggestion1",
        zh: "点击重试重新启动 workspace 服务。",
        en: "Click retry to restart the workspace service.",
      },
      {
        key: "bundleError.diagnosis.gatewayStartFailed.suggestion2",
        zh: "如果刚更新过应用，请完全退出后重新打开。",
        en: "If the app was just updated, fully quit and reopen it.",
      },
    ],
    runbook: "gateway_start_failed",
  },
  workspace_data_migration_conflict: {
    code: "workspace_data_migration_conflict",
    category: "storage",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.workspaceDataMigrationConflict.title",
      zh: "项目数据版本不兼容",
      en: "Project data version is incompatible",
    },
    message: {
      key: "bundleError.diagnosis.workspaceDataMigrationConflict.message",
      zh: "检测到无法安全自动处理的本地项目数据版本。应用不会删除或改写原项目数据。",
      en: "The local project data version cannot be handled safely and automatically. The app will not delete or rewrite the original project data.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.workspaceDataMigrationConflict.primaryAction",
      zh: "上传日志并联系支持",
      en: "Upload logs and contact support",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.workspaceDataMigrationConflict.suggestion1",
        zh: "请勿删除、替换或手动修改项目数据库。",
        en: "Do not delete, replace, or manually modify the project database.",
      },
      {
        key: "bundleError.diagnosis.workspaceDataMigrationConflict.suggestion2",
        zh: "上传日志，并将用户 ID 和反馈码发给支持团队。",
        en: "Upload logs and send the user ID and feedback code to support.",
      },
    ],
    runbook: "workspace_data_migration_conflict",
  },
  workspace_data_migration_failed: {
    code: "workspace_data_migration_failed",
    category: "storage",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.workspaceDataMigrationFailed.title",
      zh: "项目数据升级未完成",
      en: "Project data upgrade did not finish",
    },
    message: {
      key: "bundleError.diagnosis.workspaceDataMigrationFailed.message",
      zh: "本地项目数据升级未完成，应用不会自动删除原项目数据。",
      en: "The local project data upgrade did not finish. The app will not automatically delete your original project data.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.workspaceDataMigrationFailed.primaryAction",
      zh: "重新启动项目服务",
      en: "Restart the project service",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.workspaceDataMigrationFailed.suggestion1",
        zh: "点击重试，让应用重新检查并完成项目数据升级。",
        en: "Click retry to let the app check and finish the project data upgrade.",
      },
      {
        key: "bundleError.diagnosis.workspaceDataMigrationFailed.suggestion2",
        zh: "如果持续失败，请不要删除项目数据；请导出诊断报告并联系支持。",
        en: "If it keeps failing, do not delete the project data. Export a diagnostic report and contact support.",
      },
    ],
    runbook: "workspace_data_migration_failed",
  },
  workspace_index_recovery_required: {
    code: "workspace_index_recovery_required",
    category: "storage",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.workspaceIndexRecovery.title",
      zh: "项目素材信息需要恢复",
      en: "Project asset information needs recovery",
    },
    message: {
      key: "bundleError.diagnosis.workspaceIndexRecovery.message",
      zh: "无法安全恢复项目的素材关联。为保护原有内容，已停止自动重建；这不代表素材文件已被删除。",
      en: "The project asset links could not be safely recovered. Automatic rebuilding has stopped to protect existing content; this does not mean the media files were deleted.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.workspaceIndexRecovery.primaryAction",
      zh: "上传日志并联系支持",
      en: "Upload logs and contact support",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.workspaceIndexRecovery.suggestion1",
        zh: "保留完整项目文件夹，不要删除素材、覆盖项目或清理应用数据。",
        en: "Keep the complete project folder. Do not delete media, overwrite the project, or clear app data.",
      },
      {
        key: "bundleError.diagnosis.workspaceIndexRecovery.suggestion2",
        zh: "上传日志并联系支持，在项目副本中核对和恢复素材关联。",
        en: "Upload logs and contact support to verify and recover asset links in a project copy.",
      },
    ],
    runbook: "workspace_index_recovery_required",
  },
  workspace_data_schema_ahead: {
    code: "workspace_data_schema_ahead",
    category: "storage",
    severity: "needs_user_action",
    title: {
      key: "bundleError.diagnosis.workspaceDataSchemaAhead.title",
      zh: "项目数据来自更新版本的应用",
      en: "Project data was created by a newer app version",
    },
    message: {
      key: "bundleError.diagnosis.workspaceDataSchemaAhead.message",
      zh: "该项目数据已由更新版本的应用升级，当前版本无法打开。应用不会修改或删除原项目数据。",
      en: "This project data was upgraded by a newer app version and cannot be opened by the current version. The app will not modify or delete the original project data.",
    },
    primaryAction: {
      key: "bundleError.diagnosis.workspaceDataSchemaAhead.primaryAction",
      zh: "更新应用到最新版本",
      en: "Update the app to the latest version",
    },
    suggestions: [
      {
        key: "bundleError.diagnosis.workspaceDataSchemaAhead.suggestion1",
        zh: "将应用更新到最新版本后重新打开该项目。",
        en: "Update the app to the latest version, then reopen this project.",
      },
      {
        key: "bundleError.diagnosis.workspaceDataSchemaAhead.suggestion2",
        zh: "请勿删除、替换或手动修改项目数据库；更新后数据可直接使用。",
        en: "Do not delete, replace, or manually modify the project database; it will work as-is after updating.",
      },
    ],
    runbook: "workspace_data_schema_ahead",
  },
};
