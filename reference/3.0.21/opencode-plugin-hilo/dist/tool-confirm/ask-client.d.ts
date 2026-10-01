import { type ToolConfirmAskResponse } from '@hilo/protocol';
/**
 * 04 (R1-3): client-side deadline for the tool-confirm ask round-trip.
 *
 * The gateway owns the shared user-decision deadline. A gateway that is
 * alive-but-stuck (or a half-dead socket) must not hang this fetch
 * indefinitely, so the HTTP transport adds a short shared grace period for
 * the gateway's terminal verdict to arrive. If the request still fails,
 * generation / billing-capable tools and ComfyUI approval workflows fail
 * closed while read-only tools remain available.
 */
export interface ToolConfirmAskInput {
    sessionID: string;
    callID?: string;
    tool: string;
    args: Record<string, unknown>;
}
export declare function askToolConfirmViaGateway(gatewayUrl: string, input: ToolConfirmAskInput): Promise<ToolConfirmAskResponse>;
//# sourceMappingURL=ask-client.d.ts.map