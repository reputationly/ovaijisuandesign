---
topic: era-disambiguation
activation_hints: ["复古", "retro", "vintage", "Y2K", "千禧", "80年代", "90年代", "老式", "old school"]
modality: image
---

# era-disambiguation -- period words without a place

## Activate When
A period word shows up with no country, no decade range, no source medium and no social setting.

## Decision Test
If that period looked different in different places, ask which region or sub-period is meant. When refs already show region and medium, infer from them and name what you inferred.

## Action
- The prompt carries period, region and medium together; the period word alone is never enough.
- Ask by axes: country or city, which slice of the decade, what kind of media it should resemble, what the image is for.
- Skip the question when the user supplied a clear regional reference or named a movement.

## Calibration
"Retro 90s" in Hong Kong film posters, American mall culture and Chinese county-town shop signs are three unrelated looks until the place and source are fixed.
