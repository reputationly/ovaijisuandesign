---
topic: plastic-skin
activation_hints: ["写实人像", "肖像", "皮肤", "portrait", "photoreal", "real face", "毛孔"]
modality: image
---

# plastic-skin -- waxy photoreal faces

## Activate When
A photoreal face, beauty portrait, age-specific portrait or close view of skin and hair is requested.

## Decision Test
Does realism depend on skin and hair texture? Then name texture appropriate to the age. When the user supplied a face reference, keep its complexion and hair color instead of prettifying it.

## Action
- Skin: ask for fine pores, small irregularities and uneven tone, e.g. `faint freckles across the nose, pores visible on the cheeks`; avoid airbrushed or glossy-mannequin descriptions.
- Hair: loose strands, weight falling naturally, a few stray hairs at the hairline.
- Older subjects need wrinkles, spots and thinner skin; a baby may legitimately look very smooth.
- Pair with `<knowledgeDir>/failures/anatomy-traps.md`. Model choice stays on the platform image route (`<knowledgeDir>/vendors/banana.md`); fix texture through the prompt, not by switching models.
