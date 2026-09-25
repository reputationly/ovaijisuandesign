---
topic: intent-overreach
activation_hints: ["改成", "短指令", "上色", "换成", "润色", "simple edit", "restyle", "short request", "prompt rewrite"]
modality: multi
---

# intent-overreach -- inflating a short request

## Activate When
A brief, actionable request is growing into an over-detailed sub-agent payload or final prompt, especially when a source image or canvas asset is involved.

## Decision Test
It has gone wrong when the prompt adds concrete choices nobody grounded, or narrows the user's target into something more specific than they said (see the Prompt Boundary in `semantic-judgment`). If several reasonable readings would change the result a lot, ask; otherwise keep the user's own target in front.

## Action
- Settle the `intent_contract` (requested / take / adapt / ignore / block / ask_if) before drafting the prompt.
- Keep the requested change close to the user's wording and put it first.
- Source edits get a short prompt built from the source/ref decisions; analysis output is evidence, not extra art direction.
- Do not swap a general target for particular props, parts, symbols or moods the user never mentioned.
- Replacing a background or setting: the named place is the setting. Do not pick a sub-type, camera angle, list of parts, materials or lighting on the user's behalf.
- Let incidental source layout change when the requested transformation needs a natural recomposition.
- Tell finished visual sources apart from rough guides. A sketch, blockout or previz frame gives composition, action and camera; ask for a fully rendered scene instead of keeping its grey placeholders.
- Judge the draft against what the user originally asked, not against your rewrite.
