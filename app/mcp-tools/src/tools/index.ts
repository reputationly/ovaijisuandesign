import type { ReleaseRegion } from "../env.js";
import type { GatewayClient } from "../gateway-client.js";
import type { ToolRegistrar } from "../registrar.js";
import { registerAudioTools } from "./audio-tools.js";
import { registerCanvasTools } from "./canvas-tools.js";
import { registerCapabilityTools } from "./capability-tools.js";
import { registerEditingTools } from "./editing-tools.js";
import { registerGenerateImage } from "./generate-image.js";
import { registerGenerateVideo } from "./generate-video.js";
import { registerMemoryTools } from "./memory-tools.js";
import { registerMetaTools } from "./meta-tools.js";
import { registerPlanTools } from "./plan-tools.js";
import { registerSubtitleTools } from "./subtitle-tools.js";
import type { RegisterTools } from "./types.js";
import { registerUtilityTools } from "./utility-tools.js";

export { UNSUPPORTED_TOOLS, UNSUPPORTED_TOOL_NAMES } from "./unsupported.js";

/** 第一波注册的模块。未注册的见 unsupported.ts。 */
const MODULES: RegisterTools[] = [
  registerCapabilityTools,
  registerGenerateImage,
  registerGenerateVideo,
  registerAudioTools,
  registerMetaTools,
  registerSubtitleTools,
  registerEditingTools,
  registerUtilityTools,
  registerCanvasTools,
  registerPlanTools,
  registerMemoryTools,
];

export function registerAllTools(registrar: ToolRegistrar, gateway: GatewayClient, region: ReleaseRegion): void {
  for (const register of MODULES) register(registrar, gateway, region);
}
