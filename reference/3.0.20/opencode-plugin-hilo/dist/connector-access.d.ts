import { type ConnectorSessionAccess } from '@hilo/protocol';
/** OpenCode filters resolved tool names against message.tools after chat.params.
 * A per-message dictionary also covers tools added by an MCP tools/list refresh,
 * without mutating the shared Agent or granting over explicit user denies.
 */
export declare function filterConnectorMessageTools(message: {
    tools?: Record<string, boolean>;
}, access: ConnectorSessionAccess): void;
/** Read on every model request. No global allow grants and no child-session inheritance. */
export declare function connectorAccess(gateway: string, sessionId: string): Promise<ConnectorSessionAccess>;
export declare function guardConnectorTool(gateway: string, sessionId: string, tool: string, args: Record<string, unknown>): Promise<void>;
export declare function consumeConnectorContinuation(gateway: string, sessionId: string, parts: readonly unknown[]): Promise<void>;
//# sourceMappingURL=connector-access.d.ts.map