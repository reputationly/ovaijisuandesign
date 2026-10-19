/**
 * 项目资源帧（resource frame）的宿主约定。
 *
 * 资源帧是同进程内嵌的一小块界面，由主进程通过 MessagePort 把内容推给它。
 * 这里放的是两端都要用的通道名和体积上限 —— 单独成包，是为了让渲染层不必为了
 * 一个通道名去依赖整个协议包（协议包会拖进一堆后端介面描述）。
 *
 * 体积上限是**硬闸**：这个端口传的是生成出来的图片/视频，不设限的话一个异常请求
 * 就能把主进程和渲染进程一起撑爆。请求上限小、响应上限大，因为回来的可能是成片。
 */

/** 建立资源帧时用的通道名。 */
export const PROJECT_RESOURCE_FRAME_BOOTSTRAP = "hilo:project-resource:bootstrap";

/** 请求体上限（1 MiB）。 */
export const PROJECT_RESOURCE_FRAME_REQUEST_LIMIT = 1024 * 1024;

/** 响应体上限（30 MiB）。成片可能很大，但总得有个头。 */
export const PROJECT_RESOURCE_FRAME_RESPONSE_LIMIT = 30 * 1024 * 1024;

/**
 * 引导消息的协议版本。渲染层按它判断主进程给的字段是不是自己认识的那套。
 */
export const PROJECT_RESOURCE_FRAME_VERSION = 1;

/** `subjectId` / `generationFence` 的长度上限。 */
const SUBJECT_LIMIT = 256;

/**
 * 「这次资源帧属于哪一代生成」的标识。
 *
 * 两个字段缺一不可：`subjectId` 说明是哪个主体，`generationFence` 说明是它的第几代。
 * 只带 subjectId 的话，资源被换掉之后旧帧还会以为自己有效 —— 栅栏就是用来把旧帧挡在外面的。
 */
export interface HostGenerationSubject {
  subjectId: string;
  generationFence: string;
}

/** 校验生成主体。字段是**白名单**的：多一个键就拒绝，避免有人往里塞东西当旁路。 */
export function isHostGenerationSubject(value: unknown): value is HostGenerationSubject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const subject = value as Record<string, unknown>;
  // 控制字符（<32 与 127）会污染下游把它当行处理的日志与协议帧，一律不收
  const valid = (item: unknown): item is string =>
    typeof item === "string" &&
    !!item.trim() &&
    item.length <= SUBJECT_LIMIT &&
    !Array.from(item).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
  return (
    valid(subject.subjectId) &&
    valid(subject.generationFence) &&
    Object.keys(subject).every((key) => ["subjectId", "generationFence"].includes(key))
  );
}

/**
 * 资源帧引导消息里那些**能力开关**。
 *
 * 每个开关独立可选（不给就是关）。列成表是因为它们必须逐个校验类型 ——
 * 漏掉一个，渲染层就会把 `"false"` 这种字符串当真值用。
 */
const CAPABILITY_KEYS = [
  "mediaCapability",
  "canvasCapability",
  "canvasImagesCapability",
  "canvasImageImportCapability",
  "chatComposerCapability",
  "chatSessionCapability",
  "textCompletionCapability",
  "persistenceCapability",
  "canvasReadsCapability",
  "directorCapability",
  "taskExecutionCapability",
  "pageStorageCapability",
  "sidebarOrderCapability",
  "accountGuardCapability",
  "billingPricingCapability",
  "documentsCapability",
  "resourceTagsCapability",
  "canvasPostersCapability",
  "audioWaveformsCapability",
  "canvasMediaImportCapability",
  "canvasTextGenerationCapability",
  "nativeFilesCapability",
  "preferencesCapability",
  "lutsCapability",
  "toolReadsCapability",
  "resourceActionsCapability",
  "compositionClipboardCapability",
] as const;

/**
 * 校验一条引导消息。
 *
 * 这是**边界**：消息由主进程发出、渲染层据此决定开放哪些能力，所以每一项都要验类型；
 * `region` / `initialRoute` 这类枚举也走白名单。最后才检查 `type` 与 `version` ——
 * 前面任何一项不合法都直接判定「不是引导消息」，而不是抛错：调用方会拿这个函数去试
 * 一条未知消息，抛错会把它变成异常路径。
 */
export function isProjectResourceFrameBootstrap(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  const capabilities = message.capabilities;
  if (message.region !== undefined && message.region !== "domestic" && message.region !== "overseas") return false;
  if (message.taskReadCapability !== undefined && typeof message.taskReadCapability !== "boolean") return false;
  for (const key of CAPABILITY_KEYS) {
    if (message[key] !== undefined && typeof message[key] !== "boolean") return false;
  }
  if (message.queryCapability !== undefined && typeof message.queryCapability !== "boolean") return false;
  if (message.pageStorageVersion !== undefined && !Number.isSafeInteger(message.pageStorageVersion)) return false;
  if (message.generationSubject !== undefined && !isHostGenerationSubject(message.generationSubject)) return false;
  if (message.editorEventsCapability !== undefined && typeof message.editorEventsCapability !== "boolean") return false;
  if (message.taskEventsCapability !== undefined && typeof message.taskEventsCapability !== "boolean") return false;
  if (
    capabilities !== undefined &&
    (!capabilities ||
      typeof capabilities !== "object" ||
      Array.isArray(capabilities) ||
      Object.keys(capabilities).some((key) => !["composition", "query"].includes(key)) ||
      ("composition" in capabilities && typeof (capabilities as Record<string, unknown>).composition !== "boolean") ||
      ("query" in capabilities && typeof (capabilities as Record<string, unknown>).query !== "boolean"))
  ) {
    return false;
  }
  return (
    message.type === PROJECT_RESOURCE_FRAME_BOOTSTRAP &&
    message.version === PROJECT_RESOURCE_FRAME_VERSION &&
    typeof message.scopeKey === "string" &&
    message.scopeKey.length > 0 &&
    message.scopeKey.length <= 256
  );
}
