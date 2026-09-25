---
topic: medium-drift
activation_hints: ["插画", "illustration", "动漫", "anime", "3D", "写实", "photo", "油画", "风格", "style"]
modality: image
---

# medium-drift -- keeping one medium

## Activate When
The user names a medium, gives style refs, or several assets in a project must look like they were made the same way.

## Decision Test
Would the result feel wrong rendered in another medium? Then lock the medium. If two requested media contradict each other, ask which one leads rather than averaging them.

## Action
- Close each image or video prompt with one line naming the medium, e.g. `Medium: gouache illustration.`
- One primary medium per asset. Style refs may steer line, palette, light and texture, but do not override the medium line.
- Record the medium lock in the direct call or the Stage Execution Plan stage so the executor repeats it word for word. Add an explicit contrast (`not a photo`) only when the user rejected or mixed incompatible media.
- For strong style transfer, pass the style ref in `image_paths` and state what it contributes; do not rely on adjectives alone.
