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
  // 两套工具面**互斥**：参照在 resource_v3 下用另一个二进制（mcp-tools-v3），
  // 只有 25 个工具；legacy 下才是 57 个。同时注册会让 agent 看到 55 个，
  // 与参照的实际工具面对不上。
  const modules = v3ToolsEnabled() ? V3_MODULES : MODULES;
  for (const register of modules) register(registrar, gateway, region);
}
