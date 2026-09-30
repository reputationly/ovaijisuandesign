import type { SelectedMediaModels } from '@hilo/protocol';
export interface PermissionRulesetLogInput {
    readonly isDev: boolean;
    readonly sessionId?: string;
    readonly agentName?: string;
    readonly added: number;
    readonly cleared: number;
    readonly grantsApplied: number;
    readonly permissionLength: number;
    readonly selected: SelectedMediaModels | null | undefined;
    readonly mediaModelCount: number;
}
export interface PermissionRulesetLogDecision {
    readonly shouldLog: boolean;
    readonly line?: string;
}
type PermissionRulesetLogEnv = Partial<Record<'HILO_PERMISSION_RULESET_LOG', string | undefined>>;
export declare function resetPermissionRulesetLogStateForTest(): void;
export declare function decidePermissionRulesetLog(input: PermissionRulesetLogInput, nowMs?: number, env?: PermissionRulesetLogEnv): PermissionRulesetLogDecision;
export {};
//# sourceMappingURL=permission-log.d.ts.map