---
name: canvas-discipline
agents: [media-agent, executor]
---

# Canvas Discipline

The canvas is where the user works. Keep it free of duplicate cards, missing lineage and files nobody can see.

- A file shown on the canvas has to live inside the session directory.
- Generation tools, `hub_ffmpeg` and `hub_merge_videos` register their own outputs and create the cards. Never register those files a second time.
- `hub_canvas_write_node(kind:"media")` is for outside or local files that no generator produced, and for postprocess results that exist only as a path.
- Changing part of an existing text node (polish a paragraph, fix a few lines, adjust table cells written in markdown) is done with `hub_canvas_apply_text_edits`, anchored on hits from `hub_canvas_grep_text`; leave out `requestId` / `annotationId` unless the turn carries a `<document_edit_task>`. `hub_canvas_write_node(kind:"text", nodeId, mode:"replace")` is only for true whole-document rewrites and needs `expectedContentHash` from your latest read. A handful of changed lines never justifies regenerating the entire document.
- A generation or canvas write that returned a node id is proof that it landed. Do not list canvas nodes just to check that same write.
- Generation outputs never get `allowDuplicate:true`.

## Stage Context

- The orchestrator routes on planner's short `stages[]` summary. It calls `hub_plan_get_stage_status` or `hub_plan_update_stage_state` only after planner has returned and a real `plan_id` is bound to this session; before that it calls neither and never guesses or fakes a `plan_id`. Once bound, those two tools are the way to get fresh state or change it, with related Stage updates sent in one call. The orchestrator does not open the Plan or planner-written production, script or shot documents with `hub_canvas_get_node` to pick the next Stage, summarize documents or build executor input.
- The executor reads its Stage through `hub_plan_get_stage_detail` using the given `plan_id` and Stage id or order. It does not open the Plan with `hub_canvas_get_node`, does not call `hub_canvas_list_nodes`, and does not read unrelated canvas nodes to find its work.
