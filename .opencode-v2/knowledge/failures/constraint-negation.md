---
topic: constraint-negation
activation_hints: ["no ", "without", "不要", "禁止", "去掉", "negative", "exclude", "remove"]
modality: image
---

# constraint-negation -- asking for absence

## Activate When
The request excludes something, asks to remove an element, stacks a long list of negatives, or says something must appear only once.

## Decision Test
Naming a forbidden thing tends to summon it. If the negative wording would make the object prominent, describe the scene as it should look instead. The platform image route has no separate negative-prompt field, so everything goes in the prompt body.

## Action
- Write the desired empty state: `a bare white wall`, `open grassland stretching to the horizon, untouched`.
- A medium exclusion may stay short and explicit: `painted, not photographic`.
- Do not paste long comma-separated negative lists; they read as a subject list to this model.
- State "only once" in plain words a single time: `the slogan appears a single time, placed in the lower third`.
- For removal edits, pass the source in `image_paths` and describe what fills the area afterwards, not the object being removed.
