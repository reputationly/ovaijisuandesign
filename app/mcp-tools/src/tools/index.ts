import type { ReleaseRegion } from "../env.js";
import type { GatewayClient } from "../gateway-client.js";
import type { ToolRegistrar } from "../registrar.js";
import { registerAudioTools } from "./audio-tools.js";
import { registerCanvasTools } from "./canvas-tools.js";
import { registerCapabilityTools } from "./capability-tools.js";
import { registerEditingTools } from "./editing-tools.js";
import { registerGenerateImage } from "./generate-image.js";
import { registerGenerateVideo } from "./generate-video.js";
import { registerImageEnhance } from "./image-enhance.js";
import { registerMemoryTools } from "./memory-tools.js";
import { registerMetaTools } from "./meta-tools.js";
import { registerPlanTools } from "./plan-tools.js";
import { registerSubtitleTools } from "./subtitle-tools.js";
import type { RegisterTools } from "./types.js";
import { registerUtilityTools } from "./utility-tools.js";
import { registerV3Tools } from "./v3-tools.js";

export { UNSUPPORTED_TOOLS, UNSUPPORTED_TOOL_NAMES } from "./unsupported.js";

/** 第一波注册的模块。未注册的见 unsupported.ts。 */
const MODULES: RegisterTools[] = [
  registerCapabilityTools,
  registerGenerateImage,
  registerGenerateVideo,
  registerImageEnhance,
  registerAudioTools,
  registerMetaTools,
  registerSubtitleTools,
  registerEditingTools,
  registerUtilityTools,
  registerCanvasTools,
  registerPlanTools,
  registerMemoryTools,
];

/**
 * v3 专属工具（第 256 轮起）。
 *
 * 参照只在 `HILO_PROJECT_ARCHITECTURE=resource_v3` 下注册这 25 个工具
 * （实测：不设该变量时 mcp-tools-v3 直接抛
 *  "V3 MCP requires HILO_PROJECT_ARCHITECTURE=resource_v3"）。
 * 所以这里同样按架构开关，legacy 的工具面（57 个）保持不变。
 */
const V3_MODULES: RegisterTools[] = [registerV3Tools];

export function v3ToolsEnabled(): boolean {
  return process.env.HILO_PROJECT_ARCHITECTURE === "resource_v3";
}

export function registerAllTools(registrar: ToolRegistrar, gateway: GatewayClient, region: ReleaseRegion): void {
  for (const register of MODULES) register(registrar, gateway, region);
  if (v3ToolsEnabled()) for (const register of V3_MODULES) register(registrar, gateway, region);
}
