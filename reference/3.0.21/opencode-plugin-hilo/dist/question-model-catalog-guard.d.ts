import type { ModelInfo } from '@hilo/protocol/proto';
type MediaCategory = 'image' | 'video' | 'audio';
type ModelSelectionCategory = MediaCategory | 'all';
export declare function questionModelSelectionCategory(args: unknown): ModelSelectionCategory | undefined;
/**
 * Prevent a stale Skill or model hallucination from reaching QuestionDock.
 *
 * Question payloads are natural language and carry no model id, so this guard
 * deliberately activates only when the question itself explicitly asks the
 * user to choose a model. Current display names and legacy aliases that resolve
 * to exactly one live model are accepted. Retired names and ambiguous family
 * names are returned to the Agent so it can regenerate the card.
 */
export declare function assertQuestionModelOptionsMatchCatalog(args: unknown, models: readonly ModelInfo[]): void;
export {};
//# sourceMappingURL=question-model-catalog-guard.d.ts.map