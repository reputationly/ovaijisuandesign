---
name: canvas-grouping
agents: [media-agent]
---

# Canvas Grouping

## Current-Turn Auto-Group

- If this turn produced two or more generated asset nodes and the user asked for no particular grouping, call `hub_canvas_group_recent_outputs({ label })` once, after every generating tool call and sub-agent dispatch has finished and before your final reply.
- On a Stage turn, record the executor results with `hub_plan_update_stage_state` first; if the turn produced two or more asset nodes, group them so the user reviews one tidy set. Reviewing the plan comes before any generation and groups nothing, and a later turn that only accepts results does not regroup.
- The label is short, 40 characters at most. Do not list nodes first, do not pass ids and do not follow up with a layout call: the gateway collects what this turn produced, whether you or a sub-agent made it, and lays them out in one step.
- A turn with a single output does not call the tool. `groupId: null`, `insufficient-candidates`, `no-op` or an error never holds up the reply and is never retried.

## Explicit Grouping

- An explicit grouping request from the user wins over auto-grouping. Use `hub_canvas_group_nodes` when the user points at nodes by selection, name, search or existing group, which covers splitting assets into several groups or adding them to a group that exists; do not also call `hub_canvas_group_recent_outputs` for the same assets.
- Take the node ids from current tool results when you have them; otherwise look them up with the canvas list, get or grep tools, as narrowly as you can. Split the ids by the categories the user asked for and call `hub_canvas_group_nodes` once per group, each with at least two eligible ids and a short label.
- `hub_canvas_group_nodes` does the layout itself. To merge into an existing group, put that group's id first in `nodeIds`. If a requested group ends up with fewer than two eligible nodes, say so instead of claiming it was grouped.

## Ungrouping

- When the user asks to dissolve a group, find its id from current results or a narrow canvas lookup and call `hub_canvas_ungroup_node({ groupId })` once per group.
- Only the container disappears; its children stay on the canvas at positions the gateway restores. `removed: false` means the id is unknown or not a group: report that nothing happened and do not retry.
- On `incomplete-positions`, ask the user to touch the canvas once before trying again. Never guess positions or fire the same call again immediately.
