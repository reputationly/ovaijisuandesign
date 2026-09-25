# Workflows — directory guide

At runtime the router reads `workflow.md`: media-agent hands it that path, and the planner later sees only the `workflow_match` the router picked. This README is for people and agents editing the directory; it describes where things live and where the writing rules are.

## Layout

```text
workflows/
  workflow.md                 routing index consumed at runtime
  README.md                   this guide
  AUTHORING.md                how to write a workflow or reference file
  <project_type>/workflow.md  one file per selectable project workflow
  drama-series/reference/     stage templates used only by drama-series
  mv/reference/               intent, music, concept, storyboard and clip-prompt notes used only by mv
  _shared/                    utilities several workflows reuse; never a workflow_match target
```

Workflows that are switched off are left out of this profile entirely, so there is no archive folder to maintain.

## Where to edit

- Adding, removing or retargeting a selectable workflow: change the tables in `workflow.md`.
- Changing how a workflow or reference file is shaped: start with `AUTHORING.md`.
- Keep this guide brief and do not copy the routing tables into it.
