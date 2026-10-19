import { GatewayScopeContext } from "../infra/runtime-config.js";
import { default as reactExports } from "react";
export function useRequiredGatewayScope() {
  const ctx = reactExports.useContext(GatewayScopeContext);
  if (!ctx) {
    throw new Error(
      "useRequiredGatewayScope must be used within a GatewayScopeProvider. Workspace components require an explicit gateway scope.",
    );
  }
  return ctx;
}

export const CANVAS_V3_ROUTES = {
  architecture: "/api/project/architecture",
  document: "/api/v3/canvas",
  commands: "/api/v3/canvas/commands",
  /** Batch read of Composition content projected for the canvas (POST { compositionIds }). */
  content: "/api/v3/canvas/content",
  images: "/api/v3/canvas/images",
  localFiles: "/api/v3/canvas/local-files",
  previews: "/api/v3/canvas/previews",
  videos: "/api/v3/canvas/videos",
  audios: "/api/v3/canvas/audios",
  media: "/api/v3/canvas/media",
  videoAudioSplits: "/api/v3/canvas/video-audio-splits",
  /** Agent-authored Compositions the canvas has not necessarily viewed yet (GET ?since=&limit=). */
  agentCompositions: "/api/v3/canvas/agent-compositions",
};
