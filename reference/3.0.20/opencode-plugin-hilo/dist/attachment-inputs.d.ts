/** Only explicit attachment parts / the gateway manifest, never prose paths. */
export declare function userAttachmentPaths(parts: readonly unknown[]): string[];
/** Shared input-field convention; do not scan prompts, commands or output paths. */
export declare function toolAttachmentPaths(args: unknown): string[];
interface StableRef {
    attachment_source: 'asset_vault';
    attachment_id: string;
}
export declare function reportAttachmentObservationFailure(sessionId: string, error: unknown): void;
/** Resolve IDs before the model request; media uploads remain gateway-owned. */
export declare function observeAttachmentInputs(gatewayUrl: string, sessionId: string, paths: string[], tool?: {
    callId: string;
    chatTurnId: string;
}): Promise<StableRef[]>;
export {};
//# sourceMappingURL=attachment-inputs.d.ts.map