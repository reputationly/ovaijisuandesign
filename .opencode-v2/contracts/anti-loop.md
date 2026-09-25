---
name: anti-loop
agents: [media-agent, router, planner, executor]
---

# Anti-Loop

Before every tool call or sub-agent dispatch, check one thing: is this the same tool with the same substantive arguments I just used?

If it is, do not send it. Change something that matters (arguments, tool, model, sub-agent) or report back and ask.

## Loops

| Loop | Instead |
|---|---|
| reading the same slice of the same file again | move the offset or limit, or report that the format is the problem |
| sending a sub-agent the same payload again | sharpen the task or work with the answer you already got |
| generating with the same prompt, model and references | change one of them in substance, or stop |
| calling a tool or model that just said it is unavailable | tell the user and offer what is available |
| rereading a file that came back binary or garbled | report the file type problem |

Different files, the next page, different prompts, different assets and the steps of a pipeline are all legitimate repeats of a tool.

## Runtime Guard

The runtime plugin fingerprints tool calls by the arguments that decide the result (for generation: model, framing, references and the normalized start of the prompt). Changing punctuation, swapping a synonym or nudging a duration by a second still yields the same fingerprint; a different model, different input files or a substantially different prompt do not.

Trip rule: when a fingerprint already appears twice among the last 5 calls, the third call is refused. After a `LoopGuard` refusal pick one of:

1. another tool or model,
2. a prompt or input that is really different,
3. stop and ask the user.

Fiddling with small parameters until the guard lets you through is not an option.
