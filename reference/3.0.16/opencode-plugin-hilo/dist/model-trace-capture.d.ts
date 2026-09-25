import { type ChatModelTrace } from '@hilo/protocol';
type CallContext = Pick<ChatModelTrace, 'session_id' | 'request_id' | 'agent' | 'model_id'>;
export declare function createModelTraceCapture(gatewayUrl: string): {
    attach(context: CallContext, headers: Record<string, string>): void;
    dispose(): Promise<void>;
};
export {};
//# sourceMappingURL=model-trace-capture.d.ts.map