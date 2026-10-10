import { jsxRuntimeExports } from "./vendor.js";
import "./infra/agent-http-client.js";
import "@lezer/lr";
import "@lezer/common";
import "react-day-picker";
import "docx-preview";
import "tailwind-merge";
import "./assets/asset-center-page.jsx";
import "./assets/add-entity-dialog.jsx";
import "./assets/preset-tags.jsx";
import "./assets/audio-play-button.jsx";
import "./assets/entity-delete-confirm.jsx";
import "./assets/entity-edit-dialog.jsx";
import "./assets/text-preview.jsx";
import "./assets/import-entity-conflict-error.js";
import "./infra/init-track.js";
import "./infra/sanitize-track-props.js";
import "./infra/use-online.jsx";
import "./assets/page-state-boundary.jsx";
import "./assets/page-state-view.jsx";
import "./assets/key-entries.js";
import "./infra/select-content.jsx";
import "./infra/dialog-content.jsx";
import "./infra/badge-variants.jsx";
import "./infra/checkbox.jsx";
import "./assets/use-materialize-entity.js";
import "./assets/catalog-page-heading.jsx";
import "./generation/select-content.jsx";
import "./generation/resolve-video-billing-tooltip.js";
import "./generation/calc-video-cost.js";
import "./generation/calc-video-cost-breakdown.js";
import "./generation/missing-asset-card.jsx";
import "./generation/media-error-card.jsx";
import "./generation/media-generation-error-overlay.jsx";
import "./canvas/fullscreen-icon.jsx";
import "./canvas/file-missing-icon.jsx";
import "./canvas/generating-media-area.jsx";
import "./vendor-inline/mediabunny/hls-segmented-input.js";
import "./generation/use-portal-anchor-placement.jsx";
import "./generation/model-chip.jsx";
import "./text-editor/build-asr-gateway-request.js";
import "./text-editor/myers-line-hunks.js";
import "./infra/parse-connector-selection.js";
import "./infra/normalize-v2-registry.js";
import "./infra/parse-capability-search-result.js";
import "./infra/parse-connector-catalog.js";
import "./generation/expand-arrow-icon.jsx";
import "./generation/dual-submit-buttons.jsx";
import "./generation/param-tabs.jsx";
import "./generation/submit-button.jsx";
import "./generation/time-intervals.jsx";
import "./generation/params-chip.jsx";
import "./generation/params-popup.jsx";
import "./generation/prompt-font-size-control.jsx";
import "./generation/segmented-switch.jsx";
import "./canvas/is-reexecutable-generation-node.js";
import "./canvas/prune-persisted-node-data.js";
import "./generation/param-label-fallbacks.js";
import "./generation/resolve-reference-texts.js";
import "./generation/aspect-ratio-grid.jsx";
import "./generation/resolution-tabs.jsx";
import "./generation/param-slider.jsx";
import "./generation/slider.jsx";
import "./vendor-inline/mediabunny/inline-worker.js";
import "./text-editor/table-document-to-llm-content.js";
import "./text-editor/map-canvas-reference-resolutions.js";
import "./text-editor/normalize-ad-attribution-url.js";
import "./text-editor/parse-table-document.js";
import "./text-editor/restore-canvas-reference-paths.js";
import "./generation/to-workspace-browser-url.js";
import "./generation/domestic-model-display-aliases.js";
import "./generation/text-models.js";
import "./media-editing/timeline-event-handler.js";
import "./media-editing/duration-tiers.js";
import "./assets/parse-prompt-to-tiptap.js";
import "./assets/compile-chip-prompt-for-model.js";
import "./assets/use-assets-ref-validate.js";
import "./canvas/use-inline-rename.jsx";
import "./canvas/proximity-handle-inner.jsx";
import "./canvas/node-header-inner.jsx";
import "./media-editing/use-warn-missing-asset-meta.jsx";
import "./media-editing/audio-lightbox.jsx";
import "./media-editing/media-lightbox.jsx";
import "./media-editing/toolbar-item.jsx";
import "./media-editing/use-canvas-shortcut-guard.js";
import "./media-editing/use-lightbox-media-actions.jsx";
import "./media-editing/use-lightbox-media-actions-effects.js";
import "./canvas/node-shell-inner.jsx";
import "./canvas/node-body-inner.jsx";
import "./canvas/reconcile-media-fallback-style.js";
import "./canvas/use-media-node-actions.jsx";
import "./media-editing/audio-full-body-popover-gap-offset.js";
import "./media-editing/media-hover-preview.jsx";
import "./media-editing/use-hover-preview.js";
import "./media-editing/resolve-panorama-generation-presentation.js";
import "./media-editing/canvas-image.jsx";
import "./media-editing/param-quality-slider.jsx";
import "./media-editing/reference-navigation-provider.jsx";
import "./media-editing/get-reference-navigation-defaults.jsx";
import "./media-editing/use-reference-attachment-navigation.js";
import "./media-editing/use-video-reference-navigation.js";
import "./media-editing/image-lightbox.jsx";
import "./media-editing/video-lightbox.jsx";
import "./media-editing/build-video-thumb-base.jsx";
import "./media-editing/media-clip-panel.js";
import "./generation/mention-picker-popover.jsx";
import "./media-editing/panorama-generation-panel.jsx";
import "./media-editing/panorama-viewer.jsx";
import "./chat/rich-prompt-input.jsx";
import "./chat/merge-direct-reference-metadata.js";
import "./infra/capture-placement-reservation-ms.js";
import "./media-editing/use-preview-text.jsx";
import "./media-editing/text-hover-preview.jsx";
import "./media-editing/video-preview.jsx";
import "./assets/reconcile-first-last-frame-default-paths.js";
import "./assets/use-attachment-state.js";
import "./generation/attachment-bar.jsx";
import "./media-editing/first-last-frame-image-slots.jsx";
import "./media-editing/free-path-shape.js";
import "./media-editing/base-backend.jsx";
import "./media-editing/parse-cube-lut.js";
import "./media-editing/image-edit-pricing.js";
import "./media-editing/group-node-inner.jsx";
import "./media-editing/calc-crop-rect.js";
import "./media-editing/color-adjust-dialog.jsx";
import "./media-editing/color-adjust-slider.jsx";
import "./media-editing/customize-toolbar-dialog.jsx";
import "./media-editing/director-stage-header-icon.jsx";
import "./media-editing/default-settings.js";
import "./generation/i2-v-aspect-ratio-field.jsx";
import "./media-editing/customize-toolbar-dialog-2.jsx";
import "./media-editing/enhance-image-popover.jsx";
import "./media-editing/image-node-toolbar-section.jsx";
import "./media-editing/node-tool-interaction.js";
import "./media-editing/split-selected-cells-to-blobs.js";
import "./media-editing/keep-tag-in-canvas.js";
import "./media-editing/draw-shape-tool.js";
import "./media-editing/mosaic-shape.js";
import "./media-editing/tag-shape.js";
import "./media-editing/text-shape.js";
import "./media-editing/arrow-shape.js";
import "./media-editing/hit-handle.js";
import "./media-editing/mosaic-tool.js";
import "./media-editing/select-tool.js";
import "./media-editing/tag-tool.js";
import "./generation/model-param-select.jsx";
import "./media-editing/group-color-presets.jsx";
import "./media-editing/history-manager.js";
import "./media-editing/renderer.js";
import "./media-editing/input.jsx";
import "./media-editing/web-gl-backend.js";
import "./media-editing/web-gpu-backend.js";
import "./media-editing/layer-decompose-prompt.jsx";
import "./media-editing/single-position.js";
import "./vendor-inline/codemirror/editor-state2.js";
import "./media-editing/image-editor.jsx";
import "./media-editing/use-editor-state.js";
import "./media-editing/image-inplace-editor.jsx";
import "./media-editing/storyboard-resize-max-edge.js";
import "./media-editing/watermark-popover.jsx";
import "./vendor-inline/codemirror/input-state2.js";
import "./media-editing/compute-multi-image-grid-positions.jsx";
import "./media-editing/canvas-sticker-assets.jsx";
import "./media-editing/create-column.jsx";
import "./media-editing/progress-bar-inner.jsx";
import "./media-editing/sticker-node-toolbar.jsx";
import "./media-editing/video-multi-overlay.jsx";
import "./media-editing/video-player-inner.jsx";
import "./media-editing/round-dots-inner.jsx";
import "./text-editor/overlay-scrollbar-inner.jsx";
import "./text-editor/table-node-inner.jsx";
import "./text-editor/annotation-gutter.jsx";
import "./text-editor/annotation-input.jsx";
import "./text-editor/table-node-inner.jsx";
import "./text-editor/table-node-inner-effects.js";
import "./text-editor/table-ops.jsx";
import "./media-editing/asr-popover.jsx";
import "./media-editing/video-tool-meta.jsx";
import "./media-editing/enhance-video-popover.jsx";
import "./media-editing/erase-subtitle-editor.jsx";
import "./media-editing/erase-subtitle-popover.jsx";
import "./media-editing/hailuo03-super-resolution-popover.jsx";
import "./media-editing/video-color-adjust-dialog.jsx";
import "./media-editing/resolve-video-popover-model-initialization.js";
import "./media-editing/frame-preview.jsx";
import "./media-editing/video-node-toolbar-section.jsx";
import "./canvas/load-source-as-png-blob.js";
import "./canvas/create-canvas-resize-actions.js";
import "./canvas/canvas-shell.jsx";
import "./canvas/canvas-command-panel-content.jsx";
import "./canvas/canvas-high-blast-delete-dialog.jsx";
import "./canvas/canvas-load-error.jsx";
import "./canvas/canvas-pane-context-menu.jsx";
import "./canvas/remap-clipboard.js";
import "./canvas/use-canvas-add-node.js";
import "./canvas/use-renderable-content-change.js";
import "./canvas/canvas-toolbar.jsx";
import "./canvas/empty-viewport-toast.jsx";
import "./canvas/multi-select-plus-handle-inner.jsx";
import "./canvas/cursor-icon.jsx";
import "./canvas/hilo-media-plugin.js";
import "./canvas/create-paste-node-transformer.js";
import "./canvas/use-persist.js";
import "./canvas/selection-toolbar.js";
import "./canvas/resolve-canvas-focus-targets.js";
import "./canvas/sticker-cursor-preview-content.jsx";
import "./canvas/get-canvas-task-snapshot.js";
import "./canvas/resolve-visibility-priority-focus.js";
import "./canvas/use-canvas-interaction-tool.js";
import "./canvas/use-canvas-context-menus.js";
import "./canvas/use-canvas.js";
import "./canvas/use-canvas-add-node-menus.jsx";
import "./canvas/use-canvas-viewport-focus.js";
import "./canvas/use-group-execution.js";
import "./canvas/use-history-state.js";
import "./canvas/canvas-toolbar-extension-button.jsx";
import "./canvas/canvas-view-controls.jsx";
import "./i18n/canvas-node-tools.jsx";
import "./infra/transitioner.jsx";
import "./i18n/en.js";
import "./i18n/init-rum.js";
import "./infra/error-safety-image-output-blocked.js";
import "./workspace/browser-inspiration-urls.js";
import "./workspace/comfy-ui-download-progress-host.jsx";
import "./workspace/home-service.jsx";
import "./workspace/use-prompt-icon.jsx";
import "./workspace/browser-inspiration-urls-effects.js";
import "./settings/parse-custom-mcp-arguments.js";
import "./settings/normalize-custom-mcp-launch.js";
import "./settings/normalize-config.js";
import "./chat/chat-state-diagnostics.js";
import "./chat/part-store.js";
import "./workspace/shortcut-categories.jsx";
import "./chat/attach-handoff-targets-to-sub-messages.js";
import "./chat/prepare-browser-hover-snapshot.js";
import "./chat/create-history-sub-agent-message.js";
import "./chat/reduce-server-message.js";
import "./workspace/shortcut-hint.jsx";
import "./workspace/other-modifiers.js";
import "./infra/find-last-index.js";
import "./i18n/zh.js";
import "./team/account-switcher-view.jsx";
import "./team/team-account-summary.jsx";
import "./team/team-panel-stale.jsx";
import "./settings/auth-provider.jsx";
import "./settings/settings-select.jsx";
import "./team/team-management-detail-loading.jsx";
import "./team/team-management-member-table.jsx";
import "./team/team-member-quota-usage-cell.jsx";
import "./team/credit-details-dialog.jsx";
import "./team/credit-ledger-table.jsx";
import "./team/credit-reminder-settings.jsx";
import "./team/derive-subscription-status.js";
import "./chat/chat-controller.js";
import "./team/team-panel-loading.jsx";
import "./infra/error-boundary.jsx";
import "./infra/error-fallback-ui.jsx";
import "./settings/attach-native-toast-surface.jsx";
import "./infra/select-startup-visible-preview-workspace.js";
import "./infra/start-perf-observer.js";
import "./settings/canvas-help-button.jsx";
import "./settings/use-direct-feedback.jsx";
import "./settings/log-error-boundary.js";
import "./team/create-team-form-surface.jsx";
import "./team/infinite-scroll-container.jsx";
import "./team/use-wallet-query.jsx";
import "./chat/session-store.js";
import "./team/team-panel-error.jsx";
import "./team/calendar.jsx";
import "./team/team-credit-history-section.jsx";
import "./team/team-credit-summary-surface.jsx";
import "./team/account-submission-blocked-host.jsx";
import "./team/create-team-dialog.jsx";
import "./team/team-operation-host.jsx";
import "./team/alert-variants.jsx";
import "./team/team-provider.jsx";
import "./team/hailuo-credit-row.jsx";
import "./canvas/popover-title.jsx";
import "./team/account-switcher-row-surface.jsx";
import "./team/use-team-transactions-feed-query.jsx";
import "./team/map-hub-cancel-check.js";
import "./assets/asset-center-relocation-coach-mark.jsx";
import "./assets/assets-dropzone-empty.jsx";
import "./assets/read-entity-drag-data.js";
import "./assets/attachment-row.jsx";
import "./assets/folder-drill-down-picker.jsx";
import "./assets/resize-col-handle.jsx";
import "./assets/use-materialized-entities.jsx";
import "./assets/asset-mention-list.jsx";
import "./assets/use-coach-mark-sequence.js";
import "./settings/changelog-detail-dialog.jsx";
import "./settings/changelog-table.jsx";
import "./settings/persist-visible-workspace-manual-order.js";
import "./settings/use-project-actions.js";
import "./team/copy-icon-button.jsx";
import "./canvas/uploading-assets.jsx";
import "./canvas/delete-local-node-dialog.jsx";
import "./canvas/transfers-button.jsx";
import "./infra/inline-rename-input.jsx";
import "./infra/hub-logo.jsx";
import "./settings/hilo-canvas-data-source.js";
import "./settings/workspace-initial-payload-cache.js";
import "./settings/use-asset-lineage.js";
import "./settings/migration-dialog.jsx";
import "./settings/trial-granted-popup.jsx";
import "./workspace/context-menu-content.jsx";
import "./workspace/add-to-project-sub-menu.jsx";
import "./workspace/create-project-dialog.jsx";
import "./workspace/toast-workspace-open-result.js";
import "./workspace/use-folder-permission-gate.jsx";
import "./workspace/new-workspace-dialog-effects.js";
import "./settings/connector-dialog-frame.jsx";
import "./settings/connector-relationship-graphic.jsx";
import "./workspace/project-invite-prompt.jsx";
import "./workspace/use-project-delete.js";
import "./settings/update-sidebar-widget-inner.jsx";
import "./settings/version-row.jsx";
import "./settings/server-driven-popup-orchestrator.jsx";
import "./workspace/coach-mark-popup.jsx";
import "./workspace/offline-banner.jsx";
import "./workspace/use-coach-mark.js";
import "./settings/get-data-directory-main-service.js";
import "./settings/use-settings.js";
import "./settings/normalize-hailuo03-video-trial-eligibility.js";
import "./settings/feature-popup.jsx";
import "./settings/use-feature-popup-action.js";
import "./settings/use-im-accounts.jsx";
import "./settings/integration-more-menu.jsx";
import "./settings/integration-status-pill.jsx";
import "./settings/restart-banner.jsx";
import "./settings/use-assets.js";
import "./settings/use-media-actions.js";
import "./infra/delete-node-dialog.jsx";
import "./infra/new-folder-dialog.jsx";
import "./infra/move-node-dialog.jsx";
import "./infra/project-asset-thumbnail-generation.jsx";
import "./infra/use-move-dnd.js";
import "./workspace/use-new-workspace-dialog.jsx";
import "./settings/parse-home-survey.js";
import "./settings/request-prompt-prefill.jsx";
import "./workspace/use-project-archive-actions.js";
import "./settings/updater-provider.jsx";
import "./assets/inline-input.jsx";
import "./assets/promote-to-asset-form.jsx";
import "./infra/bundle-error-screen.jsx";
import "./infra/remote-tool-dialog.jsx";
import "./infra/use-retry-hint-active.js";
import "./generation/filter-trigger.jsx";
import "./workspace/canvas-sidebar-overlay.jsx";
import "./workspace/home-widget-host.jsx";
import "./workspace/workspace-asset-center-relocation-coach-mark.jsx";
import "./workspace/use-canvas-sidebar-controller.js";
import "./text-editor/read-preview-text-response.jsx";
import "./text-editor/image-annotation-dialog.jsx";
import "./media-editing/auto-feedback-toast-listener.js";
import "./media-editing/derive-session-task-snapshot.jsx";
import "./media-editing/remote-tool-host.jsx";
import "./media-editing/use-bundle-status.js";
import "./workspace/save-to-project-assets-dialog.jsx";
import "./assets/asset-picker-dialog.jsx";
import "./assets/preview-media.jsx";
import "./text-editor/load-text-edit-bindings-with-fallback.js";
import "./assets/rename-local-node-dialog.jsx";
import "./assets/use-file-explorer-canvas-integration.js";
import "./text-editor/use-placeholder-asset-source.jsx";
import "./text-editor/use-canvas-image-annotation-host.jsx";
import "./text-editor/use-project-asset-references.jsx";
import "./canvas/conflict-resolution-dialog.jsx";
import "./canvas/use-canvas-tags.js";
import "./media-editing/use-plugin-chat-bridge.js";
import "./canvas/use-canvas-node-error-feedback.js";
import "./canvas/use-generation-lifecycle-actions.js";
import "./canvas/use-plugin-dag-bridge.js";
import "./chat/use-queued-user-message-cancellation.js";
import "./chat/use-remote-tool-session.js";
import "./chat/handle-session-created-response.js";
import "./chat/text-edit-session-binding-persister.js";
import "./chat/use-model-defaults.js";
import "./chat/use-chat-cancel.js";
import "./chat/use-chat-model-selection.js";
import "./chat/use-session-list-retry.js";
import "./chat/use-visible-conversation-hydration-timeout.js";
import "./chat/use-session-focus-coordinator.js";
import "./chat/use-session-stall.js";
import "./chat/use-session-tab-persistence.js";
import "./workspace/resolve-retry-message-payload.jsx";
import "./workspace/read-bounded-blob.js";
import "./workspace/use-workspace-canvas-persistence.js";
import "./text-editor/attachment-preview.jsx";
import "./text-editor/get-wire-content-text.jsx";
import "./text-editor/creation-guide-placeholder.jsx";
import "./text-editor/file-drop-feedback.jsx";
import "./text-editor/build-doc-content-from-input.js";
import "./canvas/canvas-area.jsx";
import "./generation/file-chip.jsx";
import "./generation/use-astra-send-gate.js";
import "./chat/create-expanded-composer-actions-measurer.jsx";
import "./chat/mention-popover.jsx";
import "./chat/use-composer-placeholder-actions.jsx";
import "./chat/highlight-decoration.js";
import "./chat/mention-ref-node.js";
import "./workspace/slash-command-popover.jsx";
import "./workspace/clip-editor-skill-categories.js";
import "./assets/workspace-chat-provider.jsx";
import "./assets/use-canvas-model-registry-hydration.js";
import "./assets/use-plugin-editor-output-selection.js";
import "./workspace/text-editor-skill-categories.jsx";
import "./workspace/skill-filter-bar.jsx";
import "./workspace/use-market-skills.js";
import "./chat/find-trailing-trigger.js";
import "./chat/use-drop-handler.js";
import "./chat/use-local-comfy-ui-workflows.js";
import "./chat/use-mention.js";
import "./workspace/use-message-history.js";
import "./workspace/use-slash-command.js";
import "./text-editor/instantiate-plugin-on-canvas.js";
import "./assets/classify-upload-error.js";
import "./assets/use-upload.js";
import "./chat/collect-fallback-turn-artifacts.js";
import "./settings/local-connector-dialog.jsx";
import "./settings/use-connector-catalog.js";
import "./settings/make-async-image-task.jsx";
import "./settings/connector-summary-action.jsx";
import "./settings/local-connector-setup-content.jsx";
import "./team/activity-group.jsx";
import "./team/error-message.jsx";
import "./settings/connector-hub-o-auth-section.jsx";
import "./settings/connector-prompt-action.jsx";
import "./settings/custom-connector-dialog.jsx";
import "./generation/domestic-param-labels.jsx";
import "./chat/chat-empty-state.jsx";
import "./text-editor/capability-search-card.jsx";
import "./chat/assistant-message-actions.jsx";
import "./chat/use-copy.jsx";
import "./chat/history-anchor-rail-impl.jsx";
import "./chat/mock-media-gen-messages.js";
import "./chat/use-auto-scroll.js";
import "./chat/use-bottom-anchor-state.js";
import "./generation/chat-toolbar.jsx";
import "./generation/media-model-selector.jsx";
import "./generation/use-tool-confirm-edit-state.js";
import "./generation/use-chat-toolbar.jsx";
import "./generation/use-loop-guard-settlement.js";
import "./chat/sub-agent-group.jsx";
import "./chat/rich-user-prompt-content.jsx";
import "./chat/sent-annotation-cards.jsx";
import "./chat/chat-compliance-notice.jsx";
import "./chat/mode-selector.jsx";
import "./chat/promo-banner.jsx";
import "./chat/use-attachment-face-notice-gate.jsx";
import "./media-editing/turn-artifact-strip.jsx";
import "./generation/replace-configured-model-names-for-current-region.js";
import "./chat/chat-header-container.jsx";
import "./chat/chat-history-loading-state.jsx";
import "./chat/use-browser-chat-media.jsx";
import "./chat/document-edit-review-bar.jsx";
import "./chat/use-tool-confirm-settlement.js";
import "./workspace/use-ensure-skill-ready.js";
import "./workspace/use-home-quick-start-config.js";
import "./chat/at.jsx";
import "./chat/ae.jsx";
import "./chat/use-history-rail-state.js";
import "./chat/qs.jsx";
import "./media-editing/message-list-props-equal.jsx";
import "./chat/loop-guard-ask-dock.jsx";
import "./chat/question-dock.jsx";
import "./chat/message-turn.jsx";
import "./chat/busy-tip-indicator.jsx";
import "./text-editor/production-plan-timeline.jsx";
import "./text-editor/skill-reload-dock.jsx";
import "./workspace/sidebar-release-badge.jsx";
import "./media-editing/scroll-bar.jsx";
import "./workspace/stage-prompt-editor-card.jsx";
import "./workspace/sidebar-nav-button.jsx";
import "./media-editing/merge-browser-bookmarks.js";
import "./workspace/move-workspace-dialog.jsx";
import "./settings/recent-project-group-header.jsx";
import "./generation/user-menu-account-summary.jsx";
import "./workspace/workspace-browser.jsx";
import "./infra/app-root-effects.js";
import "./workspace/topbar-search-dialog-lazy.jsx";
import "./infra/gateway-http-error.jsx";
import "./infra/gateway-fetch.js";
import "./infra/perform-gateway-fetch.js";
import "./assets/credit-query-keys.jsx";
import "./assets/gateway-scope-provider.jsx";
import "./assets/wrap-as-asset-center-error.js";
import "./infra/file-type-icon.jsx";
import "./infra/create-recently-added-store.js";
import "./canvas/node-shell-inner.jsx";
import "./workspace/use-deep-link-router.js";
import "./workspace/deferred-thumbnail-image-generation.jsx";
import "./workspace/tool-label-definitions.js";
import "./assets/draft-controller.js";
import "./assets/read-envelope.js";
import "./workspace/set-home-widget-dev-preview-mode.js";
import "./vendor-inline/vscode-base/graph.jsx";
import "./settings/request-prompt-prefill.jsx";
import "./workspace/build-inspiration-media-showcase-collections.js";
import "./vendor-inline/vscode-base/linked-list.js";
import "./media-editing/package.jsx";
import "./workspace/build-media-showcase-collections.js";
import "./workspace/parse-project-archive-item.js";
import "./media-editing/unwrap-mcp-json-record.js";
import "./media-editing/group-into-activity-groups.js";
import "./generation/normalize-skill-detail-metadata.js";
import "./generation/map-cloud-skill-to-market-skill-info.js";
import "./generation/build-model-pricing-name-maps.js";
import "./media-editing/wt.js";
import "./workspace/asset-lineage-query-key.js";
import "./canvas/diagnostic-history-tools.js";
import "./settings/use-active-runtime.js";
import "./chat/has-structured-success-payload.js";
import "./workspace/parse-localized-text.js";
import "./infra/split-pinned-inventory.js";
import "./workspace/topbar-search-dialog-lazy.jsx";
import "./infra/split-pinned-inventory-effects.js";
import "./infra/schedule.js";
import "./infra/track-events.js";
import "./infra/match-view.jsx";
import "./canvas/resolve-workspace-failure-diagnosis.js";
import "./assets/list-all-cloud-folders.js";
import "./assets/debug-dump-cloud-project-assets.js";
import "./assets/use-cloud-folder.js";
import "./assets/use-cloud-search.js";
import "./assets/use-cloud-review-nodes.js";
import "./assets/gate-cloud-asset-uploads.js";
import "./workspace/topbar-state-context.jsx";
import "./generation/use-mention-models.jsx";
import "./generation/settle-operation.js";
import "./generation/use-skill-categories.js";
import "./generation/read-bounded-blob.js";
import "./settings/use-auto-announcement.js";
import "./settings/clear-trial-granted-for-user.js";
import "./settings/use-popup.js";
import "./generation/use-model-catalog-scope-key.js";
import "./generation/normalize-model-info.js";
import "./workspace/normalize-project-entries.js";
import "./workspace/merge-workspace-inventory.js";
import "./assets/create-remote-tool-sdk.js";
import "./vendor-inline/vscode-base/channel-client.js";
import "./infra/use-plugin-metadata-store.js";
import "./infra/create-html-iframe-pool-store.jsx";
import "./vendor-inline/minified/ct.js";
import "./infra/shallow-copy.js";
import "./vendor-inline/minified/h.js";
import "./canvas/we.js";
import "./vendor-inline/codemirror/line2.js";
import "./vendor-inline/immer/make-creator.js";
import "./vendor-inline/immer/map-handler.js";
import "./vendor-inline/immer/proxy-handler.js";
import "./vendor-inline/minified/s2.js";
import "./canvas/use-start-crop-from-node.js";
import "./media-editing/use-start-cloud-edit-from-node.js";
import "./vendor-inline/vscode-base/vs-buffer.js";
function __jsx(type, props, ...children) {
  const { key, ...rest } = props ?? {};
  if (children.length === 1) rest.children = children[0];
  else if (children.length > 1) rest.children = children;
  return children.length > 1
    ? jsxRuntimeExports.jsxs(type, rest, key)
    : jsxRuntimeExports.jsx(type, rest, key);
}
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */

/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/*
 * @license
 * docx-preview <https://github.com/VolodymyrBaydalka/docxjs>
 * Released under Apache License 2.0  <https://github.com/VolodymyrBaydalka/docxjs/blob/master/LICENSE>
 * Copyright Volodymyr Baydalka
 */
/**
 * table-core
 *
 * Copyright (c) TanStack
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
/**
 * react-table
 *
 * Copyright (c) TanStack
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
/*! For license information please see dagre.esm.js.LEGAL.txt */
