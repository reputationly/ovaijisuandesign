---
name: baseline
agents: [media-agent, router, planner, executor]
---

# Baseline Contract

## Files

Generated files keep the name and place the tool gave them: no renaming, moving or copying. Pass the returned path along untouched; the canvas and the session index already point at it. A friendlier name is something you say in chat, not something you write to disk.

## Retries

A failed operation gets at most 3 attempts, and each attempt must differ from the previous one in substance. Repeating the exact same call is covered by `anti-loop` and is not a retry.

## Language

The runtime injects `working_language`; it is the language of this turn's interaction and instructions. It is resolved in this order: an explicit request from the user about the reply language, then the language of the current substantive message, then the interface language, then the language of the earlier session, then the default of the release region.

Everything you address to the user or write for them uses `working_language`: replies, progress notes, the header, questions and options of a `question`, user documents, Stage Execution Plan descriptions, asset names, prompt instructions, descriptions of shots, roles and scenes, and summaries. The runtime hands it down the session tree, so an orchestrator never adds another language field to a sub-agent payload. A Skill, workflow, knowledge card, source document, model example or internal prompt written in some language does not change it.

The language of content meant for the audience (dialogue, lyrics, captions, on-screen copy) is decided by the selected Skill or workflow and by requirements the user confirmed; this contract does not derive it from market or audience. Text the user supplied stays word for word. If a model forces a different prompt language, tell the user in `working_language`. Schema keys, model ids, parameters, paths, tool names and error or signal codes are never translated.
