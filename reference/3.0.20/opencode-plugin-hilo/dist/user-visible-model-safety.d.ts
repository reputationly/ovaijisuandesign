/**
 * Byte-stable naming safety rule appended to every root and sub-agent prompt.
 *
 * The picker-filtered `hub_list_capabilities` result is the single runtime
 * source for both model availability and user-visible display names. Keeping
 * the rule catalog-independent preserves prompt-cache locality.
 */
export declare function formatUserVisibleModelSafetyBlock(): string;
//# sourceMappingURL=user-visible-model-safety.d.ts.map