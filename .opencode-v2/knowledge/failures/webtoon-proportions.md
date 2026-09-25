---
topic: webtoon-proportions
activation_hints: ["漫剧", "韩漫", "国漫", "webtoon", "manga", "comic", "分镜", "storyboard", "头身"]
modality: image
---

# webtoon-proportions -- stylized body scale

## Activate When
The work is webtoon, manga, donghua, comic-style storyboard or recurring stylized character art.

## Decision Test
When head-to-body ratio defines the look, fix it before generating anything. If the sub-style is unclear, ask; never blend webtoon, manga and donghua proportions into an average.

## Action
- Korean webtoon: tall figures around 8 to 9 heads, long legs, slim shoulders and waist.
- Japanese manga: around 6 to 7 heads, big eyes, small nose and mouth.
- Chinese donghua: 5 to 7 heads depending on whether the direction is cute or semi-realistic.
- The same character across shots repeats its head-count anchor in every prompt and is generated from a character sheet passed in `image_paths`.
