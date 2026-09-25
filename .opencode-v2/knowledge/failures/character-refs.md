---
topic: character-refs
activation_hints: ["multi-ref", "image_paths", "reference_image_paths", "同一人", "角色一致", "三视图", "多视图", "多状态", "画风", "主体特征"]
modality: multi
---
# character-refs -- binding references to roles

## Activate When
References transfer a character, place, style, voice or design, or two or more outputs must share one visual identity.

## Decision Test
Read this after the take/adapt/ignore decisions exist and the risk is in wiring: several refs bound to the wrong roles, identity that must hold across outputs, reference count limits, or which video slot a ref belongs in. The keep/drop decisions themselves belong to `semantic-judgment`; do not revisit them here.

## Action
- The ref capsules and semantic decisions are authoritative. If they are missing, produce them first, then write the prompt.
- When N>=2 outputs share a subject, reuse or make as few subject refs as the layout allows. One clear group shot can anchor several named people; split into one ref per subject only for isolation, legibility or a count limit.
- A ref that donates several dimensions keeps all of them in the handoff; never shrink it to its surface look.
- Name each ref's job in the prompt and keep one stable name per character across calls.
- Platform limits: `hub_generate_image` takes up to 10 images in `image_paths`; video `mode=multimodal` takes up to 4 `reference_image_paths`, 3 `reference_video_urls` and 3 `reference_audio_urls`. Over the cap, merge refs into a sheet or drop the weakest, and say so.
- For video, frame slots (`first_frame_image` / `last_frame_image`) are only for an opening or closing image; identity and style refs go in the reference lists (`<knowledgeDir>/vendors/minimax.md`).
