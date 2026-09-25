---
name: semantic-judgment
agents: [media-agent, executor]
---

# Semantic Judgment Contract

Good multimodal output depends on giving every input a job. Turning every observation about a reference into prompt words does not help; deciding what each input contributes does.

## Intent Priority

1. What the user explicitly asked for.
2. Signals from the active references.
3. Project state the user approved.
4. Defaults from vendor cards and failure cards.

A lower level never overrides a higher one. A short request is not an unclear one when it can be acted on. Labels about identity or demographics need the user's statement, the user's approval or strong evidence in a reference; without that, stay neutral or ask. By default a reference image is a source of contributions: salient visible traits that fit the request (identity anchors, the subject's design, traits shared across refs, the world or background, composition, medium, ratio evidence) are kept through `take` or `adapt` even when the user does not repeat them in words.

## Input Roles

| Role | Donates | Does not donate |
|---|---|---|
| `source/edit` | the facts of the subject, its structure and count, composition, medium, ratio, the base to edit | new taste, story, lighting or extra interpretation |
| `layout` | rough number of subjects, pose and action, how they sit in space, camera, ratio when meant | fidelity of look, placeholder backgrounds or materials, UI, text or chart remnants |
| `style/design` | how it is rendered, its medium and composition, the transferable design of subjects and world, a meaningful background when it is part of what the ref shows | exact identity, pose, layout or crop unless asked |
| `character/scene` | continuity of a person or a place and its required anchors | artifacts of whatever carried the image |
| `mood` | feeling and broad atmosphere | subject, framing, identity or setting details |

A subject in a reference has two layers: its exact identity and placement, and its portable design. A newly requested subject replaces the exact identity; design and shared visible traits that still fit remain evidence to carry. Within the same broad kind of content, structural traits attached to a subject are design and must travel when compatible.

When the user wants the same character, person or look, what most visibly defines that character must persist; it is not a styling option. Extra limbs or wings, silhouette-defining structures, core costume or gear, and distinctive markings are taken or adapted whenever they fit. Keeping one identity consistent does not mean copying it onto unrelated subjects of a source.

What a reference contributes goes beyond its surface rendering: identity, medium, composition, portable design of subjects and world, shared visible traits and a visible design language can all come from it. Fantasy body parts and other silhouette-shaping design travel as design.

## Reference Contribution Map

References are the visual authority. Analysis helps assign roles, measure ratios and recover traits that must be kept; it never replaces the images with a paragraph.

For reference-bearing work, `ref_analyses[]` in the Stage detail (earlier semantic reads, whose `ids` say which refs they cover) together with the current ref capsules count as the reading of the active refs; reuse them when they cover the refs. Run one `hub_analyse_media type:"both"` pass only for a ref nothing covers, or when what was read earlier clearly cannot answer something this task depends on, and ask it only for the missing evidence: subjects, their number and relations, the main action, the setting, composition, broad medium or style, distinctive portable design traits, and how the carrier is built. Leave colour and text out of the question. Dimensions and durations come from metadata.

Before writing a prompt, give each input the dimensions it serves: `identity`, `style`, `design`, `world`, `layout`, `action`, `medium` or `ratio`. One ref can serve several. Signals on the content plane belong to what is depicted (subjects, scenes, actions, composition, medium, style) and contribute through their dimensions when they fit; structural signals of subjects and worlds usually contribute as `design`. What remains of the carrier (the frame, the capture device, the document holding the image) is structure, not content.

Transfer rule: whenever `identity`, `design` or shared visible traits contribute, the final prompt names concrete visible traits taken from the semantic evidence. Words about medium, paper, mood, softness or a vague design language do not keep identity or design alive on their own. If the prompt only describes surface treatment and drops fitting identity or design traits, rewrite it before generating.

Order of salience: fitting identity traits, shared traits and primary visible traits outrank minor motifs, emblems and surface texture. Recurring traits, added body parts, a distinctive silhouette, core costume or gear, markings and forms that define the world are named before optional ornament. New props or actions are combined with fitting structural traits; ask only when two things truly cannot coexist.

Write the prompt in this order: the user's request, then short role statements for the refs, then the traits that must carry over. For short requests that can be acted on, keep close to the user's wording. The analysis picks role facts; it does not become an art-direction essay. Carry the content-plane traits of active refs whenever leaving them out would noticeably change the result, in this order of priority: the topology of source or layout, the requested identity, structures attached to or shaping the subject, core props, costume or gear, a meaningful world or background, then medium and composition.

For contributing refs, fitting identity traits, shared visible traits and primary visible traits are carried over. They count even if they show up in only one ref, and count more when several refs show them. A generic subject word in the request does not strip fantasy or structural traits the refs show. Not mentioning a trait is not rejecting it. New props and actions join the carried traits instead of erasing them; if a new prop or action lands where a carried structure already sits on the body, keep both through composition, layering or stylization, and ask only for a true conflict. Concrete visible nouns hold identity and design better than abstractions.

Never shrink a required identity, design or shared trait into a token decoration. If your reasoning finds such a trait and then considers leaving it out, put it in the prompt or ask; never drop it silently because a new prop, pose or action was added.

When restyling a source or layout, the source decides the subject slots, their count and relations, pose and action, camera and framing, and ratio; the contributing refs restyle what fills them. A precise character identity (a request for "the same person" counts) goes only to slots the user named, the main slot or slots that clearly match; the other slots remain distinct supporting subjects that fit. Do not fill unmatched source subjects by repeating or alternating the identities you have, and a change of clothes does not make a new person. State the source's invariants briefly and let the source image carry the layout.

The contribution map is internal planning, not prompt text. The prompt says what the refs positively bring and keeps `ignore` decisions silent. Something being absent is not a negative instruction.

People often describe references loosely. Treat each reference image as a visible source of contributions and let the role map settle, dimension by dimension, which of the five decisions applies; do not reduce loose wording to surface rendering.

`world` is the environment the final asset lives in. A meaningful visible environment can supply it. Backgrounds that mainly hold blockouts, UI, masks, documents or placeholders supply topology, not a world. When no higher-priority setting is named, the meaningful world of a contributing ref becomes the final world: name concrete setting anchors and the structure of the environment, not only a mood. If a source or layout ref holds several retained subjects, keep their count, roles and relations and apply the target style, world and medium to all of them; exact identity goes to the main or named slots.

Keep the order in which the user attached inputs when passing them to a tool, above all when the user says things like "the second picture". Assign roles in the prompt rather than reordering. Reorder only when a tool gives slots fixed meanings, and then make the prompt's labels follow the order actually sent.

A character multi-view or 三视图 request is one sheet with the same person in the named views. Plain 三视图 means front, side and back; without a stated ratio use 16:9 landscape so full-body views fit. A richer six-view character sheet can be required by a selected workflow or Stage plan, but that requirement never redefines a user's plain 三视图. Other named variants, states, versions or options are not sheets unless asked.

Video references are ordinary references by default, not keyframes. Guidance about identity, style, design, world or action goes into the general reference fields (`mode=multimodal`). First and last frame fields are for an opening frame, a closing frame, an exact start or end image, or a transition between keyframes.

## Decisions

| Decision | Use when | Prompt effect |
|---|---|---|
| `take` | the content is required or must continue exactly | carried almost exactly |
| `adapt` | a portable signal that fits | carried in recomposed visual language |
| `ignore` | carrier, substrate, artifact, incidental or incompatible signal | left out silently, never written as prose |
| `block` | explicit rejection, a policy or tool limit, or a real contradiction | stated as a constraint |
| `ask` | several valid choices that change the result materially | asked before running |

## Prompt Boundary

A final prompt describes the intended result clearly and completely. Before writing or repairing an image prompt, decide its mode:

- `new generation`: set up the target composition with whatever subject, setting, action, composition and visual direction the request needs.
- `reference-based generation`: set up the target composition, then name each contributing reference's role and what it should visibly add.
- `source edit`: treat the source as the current state and describe the change, where it happens, what it should look like, and the few continuity links that keep the edit base intact.

Start from what the user wants now, phrased in their language. Elaborate the change just enough that it can run and looks coherent. Source and reference files already hold the established visual facts; sum up continuity through the few elements whose loss would really change the result.

How much detail a prompt carries follows the visual complexity of the result: a simple change stays short; structured objects and effects get enough concrete detail to be reproduced and blended in; new compositions and redesigns get a full visual brief. Settle the mode and content first and apply vendor guidance afterwards. A vendor card can adjust phrasing and respect model limits, but it never changes what the task is, never forces a template or length, and never inflates an edit into a fresh design brief. Workflow prompts written by the planner are sent unchanged; this contract checks their intent and reference consistency rather than rewriting them.

- Anything you add (a subject, an identity label, a detail of place, a spatial relation, a pose, light, camera, material, era or culture, a story beat) must be backed by user intent, reference evidence, approved state or a hard model requirement.
- Edits and restyles keep the source's structure by default: number of subjects, their relative positions, camera, rough pose and layout, visible relations between objects, and supporting subjects. Carrier refs supply structure or action; a contributing world ref supplies the intended world in positive terms.
- Colour travels visually through source and reference files. Colour words come only from the user, brand guidelines or an approved written palette.
- The number of outputs belongs to execution settings and never appears in a prompt. Each prompt covers a single finished artifact, and outcomes the user meant to be separate stay separate; only a layout the user asked to compose is one combined outcome. Several target artifacts sharing a subject identity need an existing subject reference, or a reference image generated directly beforehand, before the finals. The reference topology follows the final topology: a group or relationship ref can hold several distinct subjects when their traits and relations read clearly, and splitting into one ref per subject is not the default.
- A replacement target stays in the user's wording and become more specific only through user intent, source or reference evidence, or approved state.
- Originality means recomposing while keeping fitting content-plane signals through their dimensions.
- Write requested, `take` and `adapt` decisions in positive terms and keep `ignore` silent. Use `block` only for explicit rejection, policy or tool limits, or real contradiction, and `ask` only when valid choices would change the result materially.

## Evidence

`metadata` proves size and duration; `semantic` supports observations about meaning. Never use one kind of evidence for the other's claims. Primary signals of a ref weigh more than incidental ones; if removing a signal would make the output feel unrelated to the refs, take or adapt it through its dimension. A newly requested subject, object or action does not cancel fitting ref traits. For image refs with no stated ratio: when every relevant ref rounds to one and the same supported ratio, use it and attach the measured evidence; when they disagree, ask, or fall back to a ratio fixed by the user, the platform or the project.
