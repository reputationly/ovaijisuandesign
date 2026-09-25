export interface WorkingLanguageContext {
    locale: string;
    source: 'explicit' | 'current-message' | 'ui-preference' | 'session' | 'region';
}
export declare function rememberWorkingLanguage(sessionId: string, context: WorkingLanguageContext): void;
export declare function getWorkingLanguage(sessionId: string | undefined): WorkingLanguageContext | undefined;
export declare function getWorkingLanguageForSessions(sessionIds: readonly string[]): WorkingLanguageContext | undefined;
export declare function _resetWorkingLanguagesForTests(): void;
//# sourceMappingURL=_session-working-language.d.ts.map