---
topic: brand-injection
activation_hints: ["logo", "品牌色", "标识", "brand color", "商标", "hex", "#[0-9A-F]{6}", "VI", "包装", "brand guideline"]
modality: image
---

# brand-injection -- owned brand assets

## Activate When
Brand colors, a logo, a VI manual, packaging, storefront signage, a named product, or a reference that might contain someone's trademark is part of the task. Naming a format or medium alone does not count.

## Decision Test
Treat every brand element as a controlled asset. Keep what the user owns and supplied, drop marks that belong to third parties, and never decide where a brand color goes just because the color was mentioned.

## Action
- Convert hex codes into color words people can see and pin each one to a surface: `deep teal on the bottle cap and the label band`. Do not flood the background with it unless asked.
- Declare a brand color twice: in the reference image and in the prompt text. One source alone tends to drift.
- A logo must arrive as an image in `image_paths`; never ask the model to draw a logo from its name. Use an edit call on the supplied logo or product photo (`<knowledgeDir>/vendors/banana.md`).
- For a palette or guideline document, extract what each color means, then write where it is used and where it must not appear.
