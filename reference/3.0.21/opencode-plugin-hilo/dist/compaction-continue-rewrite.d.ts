/**
 * Rewrites OpenCode's post-compaction "auto-continue" prompt so the model
 * resumes in the user's language instead of defaulting to English.
 *
 * After OpenCode compacts the context it injects a synthetic user message:
 *
 *   "Continue if you have next steps, or stop and ask for clarification if you
 *    are unsure how to proceed."
 *
 * (the overflow variant prepends an extra paragraph about oversized media).
 *
 * That English prompt nudges the model to continue in English. We can't change
 * the binary (the string is compiled into opencode 1.2.27), but
 * `experimental.chat.messages.transform` runs right before the LLM request and
 * lets us edit the in-flight copy — no DB mutation, history stays intact.
 *
 * IMPORTANT: we must NOT rely on "respond in the same language as the
 * conversation". OpenCode's `filterCompacted` drops everything before the
 * compaction anchor, so the post-compaction LLM context is mostly the English
 * summary + this English continue prompt — the user's original (e.g. Chinese)
 * messages are gone. Telling the model to "match the conversation language"
 * would make it pick English. Instead we inject an EXPLICIT target language
 * resolved from `HILO_USER_LANG` (the desktop language preference, forwarded
 * into the OpenCode process env at spawn). Falls back to a neutral instruction
 * when the env is absent.
 */
export declare function hasPendingCompactionContinuePrompt(messages: readonly unknown[]): boolean;
/**
 * Mutates `messages` in place: for every synthetic user text part that is a
 * compaction continue prompt, append an explicit language instruction (once).
 * Returns the number of parts rewritten (for diagnostics).
 */
export declare function rewriteCompactionContinueLanguage(messages: readonly unknown[], preferredLanguage?: string): number;
//# sourceMappingURL=compaction-continue-rewrite.d.ts.map