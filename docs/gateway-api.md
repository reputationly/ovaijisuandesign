# gateway HTTP 接口面

官方本地 gateway（MiniMax Design **3.0.16**）注册的全部路由。

这是**要对齐的接口规格**：只要我们的 gateway 提供同样的路由和形状，
官方的 mcp-tools 和渲染进程都能直接接上，反过来我们的前端也能接官方
gateway —— 每一块都能单独和官方那块对跑。

> 只记接口事实。响应形状去 `gateway/dist/main.js` 里核对，它没有混淆。
> 由 `scripts/extract-gateway-routes.py` 从 NestJS 装饰器静态提取，应用升级后重跑。

共 466 条，75 个控制器。**我们同名同方法实现了 25 条**
（行首 `✓`；按 `app/gateway/src` 的 NestJS 装饰器比对，路径参数名不计）。

## PluginSdkController（0/1）

```
  GET    /__hub-sdk__.js
```

## AssetCenterController（0/31）

```
  GET    /api/asset-center/attachments/:aid
  GET    /api/asset-center/attachments/:aid/blob
  GET    /api/asset-center/attachments/:aid/playback
  PATCH  /api/asset-center/attachments/:aid/prompt
  POST   /api/asset-center/blobs
  GET    /api/asset-center/blobs/playback
  GET    /api/asset-center/blobs/preview
  GET    /api/asset-center/entities
  POST   /api/asset-center/entities
  GET    /api/asset-center/entities-export
  POST   /api/asset-center/entities-from-paths
  DELETE /api/asset-center/entities/:eid
  GET    /api/asset-center/entities/:eid
  PATCH  /api/asset-center/entities/:eid
  POST   /api/asset-center/entities/:eid/attachments-from-workspace
  GET    /api/asset-center/entities/:eid/cover
  POST   /api/asset-center/entities/:eid/drop-to-canvas
  GET    /api/asset-center/entities/:eid/export
  DELETE /api/asset-center/entities/:eid/materialize
  POST   /api/asset-center/entities/:eid/materialize
  POST   /api/asset-center/import
  POST   /api/asset-center/internal/reset
  GET    /api/asset-center/library-status
  GET    /api/asset-center/lookup-attachment
  POST   /api/asset-center/migrate
  GET    /api/asset-center/search
  GET    /api/asset-center/suggestions
  POST   /api/asset-center/suggestions
  POST   /api/asset-center/suggestions/:sid/approve
  POST   /api/asset-center/suggestions/:sid/reject
  GET    /api/asset-center/workspace-refs
```

## AssetPreviewController（0/3）

```
  GET    /api/asset/:id/metadata
  GET    /api/asset/text-preview
  GET    /api/internal/document/read
```

## FilesController（5/57）

```
  GET    /api/asset/peaks
  GET    /api/asset/video-playback
  GET    /api/asset/video-stream
✓ GET    /api/assets
  POST   /api/assets/:id/locate
  POST   /api/assets/:id/merge-candidate
  PATCH  /api/assets/:id/metadata
  POST   /api/assets/:id/remove-missing
  PATCH  /api/assets/:id/tags
  GET    /api/assets/changes
  POST   /api/assets/reconcile
  PATCH  /api/assets/tags/batch
  PATCH  /api/assets/tags/mutations/batch
  GET    /api/assets/{*folder}
✓ GET    /api/canvas
✓ POST   /api/canvas
  POST   /api/canvas/add-node
  POST   /api/canvas/recovery-result
  GET    /api/canvas/tag-registry
  POST   /api/canvas/tags
  DELETE /api/canvas/tags/:id
  PATCH  /api/canvas/tags/:id
  GET    /api/canvas/tags/:id/impact
  PUT    /api/canvas/tags/order
  GET    /api/files
  POST   /api/files/adopt
  POST   /api/files/anchor-project-asset
  POST   /api/files/check-conflicts
  GET    /api/files/content
  PUT    /api/files/content
  POST   /api/files/copy
  POST   /api/files/delete
  GET    /api/files/dirs
  POST   /api/files/duplicate
  POST   /api/files/fork-rename
  POST   /api/files/import-external
✓ POST   /api/files/import-url
  GET    /api/files/mention-search
  POST   /api/files/mkdir
  POST   /api/files/move
  GET    /api/files/project-asset-mention-search
  POST   /api/files/project-asset-propagate
  POST   /api/files/rename
  GET    /api/files/scan-media
  POST   /api/files/text-asset
  POST   /api/files/track
  POST   /api/files/upload-cdn
  GET    /api/files/workspace-summary
  GET    /api/local-file
  GET    /api/thumbnail/{*filepath}
  POST   /api/upload
  POST   /api/upload/commit
  POST   /api/upload/commit/abort
  POST   /api/upload/commit/finalize
  POST   /api/upload/staging/delete
✓ GET    /api/workspace
  POST   /api/workspace
```

## AuthController（0/3）

```
  POST   /api/auth/group
  GET    /api/auth/token
  POST   /api/auth/token
```

## AvatarController（0/3）

```
  POST   /api/avatar
  GET    /api/avatar/:assetId
  PATCH  /api/avatar/:assetId
```

## BenchmarkController（0/4）

```
  POST   /api/benchmark/control
  POST   /api/benchmark/intervene
  POST   /api/benchmark/live-events/register
  GET    /api/benchmark/runs/:sessionId
```

## BrowserController（0/1）

```
  POST   /api/browser/automation
```

## CanvasReferencesController（0/3）

```
  GET    /api/canvas-references/content
  POST   /api/canvas-references/resolve
  GET    /api/canvas-references/search
```

## CanvasGroupExecutorController（0/1）

```
  POST   /api/canvas/execute-group
```

## CanvasController（6/26）

```
  POST   /api/canvas/file-node
  POST   /api/canvas/focus
  POST   /api/canvas/generation/reconcile
✓ POST   /api/canvas/group
  POST   /api/canvas/group-recent-outputs
✓ POST   /api/canvas/media-node
✓ GET    /api/canvas/nodes
  POST   /api/canvas/nodes-group
  POST   /api/canvas/nodes/delete
✓ POST   /api/canvas/nodes/detail
  POST   /api/canvas/placeholder
  POST   /api/canvas/placeholder-group
  POST   /api/canvas/placeholder/cleanup
  POST   /api/canvas/placeholder/fail
  POST   /api/canvas/plugin-data
  POST   /api/canvas/plugin-data/read
  GET    /api/canvas/search
  GET    /api/canvas/selection
  POST   /api/canvas/selection
  POST   /api/canvas/split-sub-images
  POST   /api/canvas/table-node
  POST   /api/canvas/text-edit-state
✓ POST   /api/canvas/text-node
  POST   /api/canvas/text-node/apply-edits
  POST   /api/canvas/text-node/revert-edits
✓ POST   /api/canvas/ungroup
```

## ChatModelTraceController（0/2）

```
  GET    /api/chat/model-traces
  POST   /api/chat/model-traces
```

## LaneController（0/4）

```
  GET    /api/cloud-env/config
  POST   /api/cloud-env/config
  GET    /api/lane/config
  POST   /api/lane/config
```

## ComfyUiWorkflowController（0/23）

```
  POST   /api/comfyui/commands/:requestId/ack
  GET    /api/comfyui/compiler/status
  GET    /api/comfyui/featured-workflows
  POST   /api/comfyui/inputs/import
  GET    /api/comfyui/launch-args
  PUT    /api/comfyui/launch-args
  GET    /api/comfyui/node-workflows/:sourceNodeId
  POST   /api/comfyui/runs
  GET    /api/comfyui/workflows
  DELETE /api/comfyui/workflows/:workflowId
  GET    /api/comfyui/workflows/:workflowId
  PATCH  /api/comfyui/workflows/:workflowId/agent-access
  POST   /api/comfyui/workflows/:workflowId/clear-deleted-bindings
  GET    /api/comfyui/workflows/:workflowId/dependencies
  PUT    /api/comfyui/workflows/:workflowId/editable
  PUT    /api/comfyui/workflows/:workflowId/executable
  POST   /api/comfyui/workflows/:workflowId/install
  PATCH  /api/comfyui/workflows/:workflowId/metadata
  POST   /api/comfyui/workflows/:workflowId/open
  POST   /api/comfyui/workflows/:workflowId/run
  POST   /api/comfyui/workflows/draft-parameters
  POST   /api/comfyui/workflows/import
  POST   /api/comfyui/workflows/preflight
```

## CustomMcpController（0/2）

```
  POST   /api/connectors/mcp
  POST   /api/connectors/mcp/authenticate
```

## ConnectorPreparationController（0/1）

```
  POST   /api/connectors/prepare
```

## DagController（0/3）

```
  POST   /api/dag/run
  POST   /api/dag/run-and-watch
  GET    /api/dag/run/:runId
```

## DependenciesController（0/5）

```
  POST   /api/dependencies
  GET    /api/dependencies/:assetId/downstream
  GET    /api/dependencies/:assetId/inputs
  GET    /api/dependencies/:assetId/upstream
  DELETE /api/dependencies/:id
```

## NetworkDiagnosticsController（0/1）

```
  GET    /api/diagnostics/network
```

## EditController（0/23）

```
  POST   /api/edit/analyze-media
  POST   /api/edit/asr
  POST   /api/edit/asr-mediakit
  POST   /api/edit/asr-whisper
  POST   /api/edit/audio-separate
  POST   /api/edit/concatenate-videos
  POST   /api/edit/embed-audio
  POST   /api/edit/enhance-image
  POST   /api/edit/enhance-video-mediakit
  POST   /api/edit/erase-banana
  POST   /api/edit/erase-subtitle-mediakit
  POST   /api/edit/extract-audio
  POST   /api/edit/ffmpeg
  POST   /api/edit/generate-text
  POST   /api/edit/generate-text-messages
  POST   /api/edit/hailuo03-video-super-resolution
  POST   /api/edit/layer-decompose
  POST   /api/edit/lip-sync
  POST   /api/edit/move-object-banana
  POST   /api/edit/outpaint-banana
  POST   /api/edit/redraw-banana
  POST   /api/edit/remove-background
  POST   /api/edit/super-resolution
```

## FeedbackController（0/5）

```
  GET    /api/feedback
  POST   /api/feedback
  GET    /api/feedback/:ticketId
  PUT    /api/feedback/:ticketId
  POST   /api/feedback/upload-attachment
```

## FeedbackExtractorController（0/2）

```
  POST   /api/feedback-extractor/config
  POST   /api/feedback-extractor/notify-manual-write
```

## TextVersionController（0/9）

```
  GET    /api/files/versions
  POST   /api/files/versions
  DELETE /api/files/versions/:id
  PATCH  /api/files/versions/:id
  GET    /api/files/versions/:id/content
  POST   /api/files/versions/:id/materialize
  POST   /api/files/versions/:id/restore
  GET    /api/files/versions/diff
  POST   /api/files/versions/summarize
```

## GenerateController（1/13）

```
  POST   /api/generate/image
  POST   /api/generate/text
  POST   /api/generate/video
  POST   /api/generation-queue/cancel
  GET    /api/generation-queue/summary
  POST   /api/generation/cancel
  GET    /api/mention-models
✓ GET    /api/models
  GET    /api/models/image
  GET    /api/models/video
  GET    /api/v1/models/concurrency/limits
  POST   /api/v1/models/concurrency/usage
  GET    /api/v1/models/config
```

## GenerateAsyncController（5/6）

```
✓ POST   /api/generate/image/submit
  GET    /api/generate/metrics
✓ POST   /api/generate/music/submit
✓ POST   /api/generate/speech/submit
✓ GET    /api/generate/tasks/:task_id/query
✓ POST   /api/generate/video/submit
```

## MusicController（2/4）

```
  POST   /api/generate/music
  GET    /api/models/music
✓ POST   /api/music/cover/preprocess
✓ POST   /api/music/lyrics/generate
```

## SpeechController（0/6）

```
  POST   /api/generate/speech
  GET    /api/models/speech
  POST   /api/speech/voice_clone
  POST   /api/speech/voice_design
  POST   /api/speech/voice_isolation
  GET    /api/speech/voices
```

## HealthController（1/5）

```
  GET    /api/health
  GET    /api/health/activity
✓ GET    /api/health/live
  GET    /api/health/ready
  DELETE /api/health/suspend-lease
```

## HeartbeatController（0/1）

```
  POST   /api/heartbeat
```

## I18nController（0/1）

```
  POST   /api/i18n/lang
```

## ComfyUiDesignProxyController（0/1）

```
  ALL    /api/internal/comfyui/design/{*path}
```

## ChatAttachmentCdnController（0/2）

```
  POST   /api/internal/sessions/:opencodeSessionId/attachment-observations
  POST   /api/internal/sessions/:opencodeSessionId/attachment-outputs
```

## InternalSessionController（0/15）

```
  POST   /api/internal/sessions/:opencodeSessionId/loop-guard/ask
  GET    /api/internal/sessions/:opencodeSessionId/loop-guard/settlements/:requestId
  POST   /api/internal/sessions/:opencodeSessionId/mcp-tool-call
  POST   /api/internal/sessions/:opencodeSessionId/open-comfyui
  GET    /api/internal/sessions/:opencodeSessionId/request-group
  GET    /api/internal/sessions/:opencodeSessionId/root
  GET    /api/internal/sessions/:opencodeSessionId/selected-models
  POST   /api/internal/sessions/:opencodeSessionId/tool-confirm/ask
  POST   /api/internal/sessions/:uiSessionId/loop-guard-trip
  GET    /api/internal/sessions/:uiSessionId/metrics
  GET    /api/internal/sessions/any-busy
  GET    /api/internal/sessions/billing-current-scope
  GET    /api/internal/sessions/metrics
  GET    /api/internal/sessions/opencode-busy
  POST   /api/internal/sessions/request-group-diagnostic
```

## InternalComfyUiWorkflowController（0/5）

```
  GET    /api/internal/sessions/:runtimeSessionId/comfyui-runs/:batchId/status
  POST   /api/internal/sessions/:runtimeSessionId/edit-comfyui-workflow
  POST   /api/internal/sessions/:runtimeSessionId/run-comfyui-workflow
  POST   /api/internal/sessions/:runtimeSessionId/save-comfyui-run-workflow
  POST   /api/internal/sessions/:runtimeSessionId/save-comfyui-workflow
```

## InternalToolSchemaController（0/1）

```
  POST   /api/internal/tool-metas
```

## LogUploadController（0/1）

```
  POST   /api/logs/request-upload
```

## LutsController（0/4）

```
  GET    /api/luts
  DELETE /api/luts/:name
  GET    /api/luts/content
  POST   /api/luts/import
```

## MediaPreviewController（0/1）

```
  POST   /api/media/heic-preview
```

## MemoryController（1/5）

```
  GET    /api/memory
✓ POST   /api/memory
  DELETE /api/memory/:scope/:name
  GET    /api/memory/:scope/:name
  GET    /api/memory/search
```

## MemoryCompactionController（0/8）

```
  GET    /api/memory-compaction/config
  POST   /api/memory-compaction/config
  POST   /api/memory-compaction/execute
  GET    /api/memory-compaction/preview
  POST   /api/memory-compaction/rewrite/execute
  POST   /api/memory-compaction/rewrite/preview
  GET    /api/memory-compaction/snapshots
  POST   /api/memory-compaction/snapshots/:id/restore
```

## RecentAutoFeedbackController（0/1）

```
  GET    /api/memory/recent-auto
```

## NodePackagesController（0/4）

```
  GET    /api/node-packages
  DELETE /api/node-packages/:name
  GET    /api/node-packages/:name
  POST   /api/node-packages/ensure
```

## UndoController（0/1）

```
  POST   /api/operations/undo
```

## PlanController（0/3）

```
  POST   /api/plan/notify-changed
  GET    /api/plan/review
  PATCH  /api/plan/stage-work-items
```

## PluginsController（0/6）

```
  GET    /api/plugins
  GET    /api/plugins/:id/data/{*path}
  PUT    /api/plugins/:id/data/{*path}
  POST   /api/plugins/:id/instantiate
  GET    /api/plugins/:id/static/{*path}
  POST   /api/plugins/install-local
```

## PluginConfigController（0/4）

```
  GET    /api/plugins/:id/config
  DELETE /api/plugins/:id/config/:key
  GET    /api/plugins/:id/config/:key
  PUT    /api/plugins/:id/config/:key
```

## PluginPythonController（0/2）

```
  POST   /api/plugins/:id/python/ensure-env
  POST   /api/plugins/:id/python/run
```

## PluginAgentController（0/4）

```
  POST   /api/plugins/agent/invoke
  POST   /api/plugins/agent/open-editor
  POST   /api/plugins/agent/result
  GET    /api/plugins/agent/surface
```

## ProjectArchiveActivityController（0/3）

```
  POST   /api/projects/archive/activity/begin
  POST   /api/projects/archive/activity/end
  POST   /api/projects/archive/activity/heartbeat
```

## ProjectArchiveController（0/5）

```
  POST   /api/projects/archive/asset-hashes
  POST   /api/projects/archive/export
  POST   /api/projects/archive/import
  POST   /api/projects/archive/prepare-export
  POST   /api/projects/archive/rewrite-vault-paths
```

## PythonPackagesController（0/4）

```
  GET    /api/python-packages
  DELETE /api/python-packages/:name
  GET    /api/python-packages/:name
  POST   /api/python-packages/ensure
```

## RemoteToolsController（0/2）

```
  POST   /api/remote-tools/open-gui
  GET    /api/remote-tools/scripts/:toolName/{*entry}
```

## RuntimeController（0/2）

```
  GET    /api/runtime/models
  POST   /api/runtime/opencode-url
```

## SafetyController（0/1）

```
  POST   /api/safety/check-text
```

## SearchController（0/1）

```
  POST   /api/search/images
```

## ExportController（0/1）

```
  GET    /api/sessions/:id/export
```

## SkillsController（1/8）

```
✓ GET    /api/skills
  GET    /api/skills/:name/file-content
  GET    /api/skills/:name/files
  POST   /api/skills/:name/toggle
  POST   /api/skills/permissions
  POST   /api/skills/reload
  GET    /api/skills/runtime
  POST   /api/skills/upload-check
```

## SkillMarketController（1/39）

```
  POST   /api/skills/creator-plan/asset-presign
  POST   /api/skills/creator-plan/asset-upload
  POST   /api/skills/creator-plan/cover-upload
  POST   /api/skills/creator-plan/offline
  GET    /api/skills/creator-plan/submissions
  POST   /api/skills/creator-plan/submit
  POST   /api/skills/fork
✓ POST   /api/skills/import
  POST   /api/skills/import/confirm-staging
  GET    /api/skills/market
  DELETE /api/skills/market/:name/preview
  POST   /api/skills/market/:name/preview
  GET    /api/skills/market/:name/preview-file
  GET    /api/skills/market/categories
  POST   /api/skills/market/categories
  GET    /api/skills/market/check-operator
  GET    /api/skills/market/detail
  POST   /api/skills/market/install
  GET    /api/skills/market/operation
  POST   /api/skills/market/operation
  DELETE /api/skills/market/operation/:skillName
  POST   /api/skills/market/operations/batch
  POST   /api/skills/market/operator/publish
  GET    /api/skills/market/operator/published
  GET    /api/skills/market/operator/submissions
  POST   /api/skills/market/operator/submissions/:submissionId
  POST   /api/skills/market/operator/submissions/:submissionId/package
  POST   /api/skills/market/operator/submissions/:submissionId/package-upload
  POST   /api/skills/market/operator/submissions/batch-approve
  PATCH  /api/skills/market/preference
  GET    /api/skills/market/search
  POST   /api/skills/market/sync
  GET    /api/skills/market/sync-status
  GET    /api/skills/market/trending
  DELETE /api/skills/market/uninstall
  GET    /api/skills/market/whitelist
  POST   /api/skills/submission/save
  POST   /api/skills/submission/stage
  POST   /api/skills/user/trash
```

## TestAsyncController（0/3）

```
  GET    /api/test-async/status/:taskId
  POST   /api/test-async/submit
  POST   /api/test-async/submit-and-watch
```

## AccountController（0/7）

```
  POST   /api/v1/account/cancel
  GET    /api/v1/account/cancel/check
  GET    /api/v1/account/cancel/hailuo-check
  POST   /api/v1/account/cancel/send-code
  GET    /api/v1/account/hailuo-web
  GET    /api/v1/account/profile
  POST   /api/v1/account/profile
```

## ApolloConfigController（0/1）

```
  GET    /api/v1/apollo/config
```

## BillingController（0/6）

```
  GET    /api/v1/billing/pricing
  GET    /api/v1/billing/promotion
  POST   /api/v1/billing/session-cost
  GET    /api/v1/billing/transactions
  POST   /api/v1/promotions/hailuo03-video-trial/claim
  GET    /api/v1/promotions/hailuo03-video-trial/status
```

## ClientConfigController（0/1）

```
  GET    /api/v1/client_config
```

## CloudFolderController（0/10）

```
  POST   /api/v1/cloud-folder/folders
  GET    /api/v1/cloud-folder/nodes
  DELETE /api/v1/cloud-folder/nodes/:nodeId
  PUT    /api/v1/cloud-folder/nodes/:nodeId/move
  PUT    /api/v1/cloud-folder/nodes/:nodeId/rename
  GET    /api/v1/cloud-folder/review-nodes
  GET    /api/v1/cloud-folder/search
  GET    /api/v1/cloud-folder/storage
  POST   /api/v1/cloud-folder/upload
  POST   /api/v1/cloud-folder/upload-from-path
```

## CreditController（0/3）

```
  POST   /api/v1/credit/migrate
  POST   /api/v1/credit/transfer
  GET    /api/v1/credit/wallet
```

## HomeQuickStartConfigController（0/1）

```
  GET    /api/v1/home/quick_start_config
```

## HubClientConfigController（0/1）

```
  GET    /api/v1/hub/client_config
```

## PopupController（0/1）

```
  GET    /api/v1/popup
```

## CloudProjectController（0/9）

```
  POST   /api/v1/project-invites/accept
  GET    /api/v1/projects
  POST   /api/v1/projects
  DELETE /api/v1/projects/:projectId
  PUT    /api/v1/projects/:projectId
  POST   /api/v1/projects/:projectId/invites
  POST   /api/v1/projects/:projectId/leave
  GET    /api/v1/projects/:projectId/members
  DELETE /api/v1/projects/:projectId/members/:userId
```

## TeamController（0/31）

```
  GET    /api/v1/team/capabilities
  GET    /api/v1/team/contexts
  GET    /api/v1/team/contract
  POST   /api/v1/team/groups
  DELETE /api/v1/team/groups/:groupId
  GET    /api/v1/team/groups/:groupId
  PUT    /api/v1/team/groups/:groupId
  POST   /api/v1/team/groups/:groupId/checkout-sessions
  GET    /api/v1/team/groups/:groupId/credit-summary
  GET    /api/v1/team/groups/:groupId/invite-links
  POST   /api/v1/team/groups/:groupId/invite-links
  POST   /api/v1/team/groups/:groupId/leave
  GET    /api/v1/team/groups/:groupId/member-details
  DELETE /api/v1/team/groups/:groupId/member-quotas
  POST   /api/v1/team/groups/:groupId/member-quotas
  GET    /api/v1/team/groups/:groupId/members
  DELETE /api/v1/team/groups/:groupId/members/:userId
  POST   /api/v1/team/groups/:groupId/members/:userId/role
  GET    /api/v1/team/groups/:groupId/members/:userId/transactions
  POST   /api/v1/team/groups/:groupId/members/invite
  GET    /api/v1/team/groups/:groupId/quota
  GET    /api/v1/team/groups/:groupId/self/transactions
  GET    /api/v1/team/groups/:groupId/transactions
  POST   /api/v1/team/groups/:groupId/transfer-owner
  GET    /api/v1/team/groups/:groupId/transfers
  GET    /api/v1/team/invitations
  GET    /api/v1/team/invitations/:invitationId
  POST   /api/v1/team/invitations/accept
  POST   /api/v1/team/invite-links/accept
  POST   /api/v1/team/invite-links/decline
  GET    /api/v1/team/invite-links/info
```

## UserController（0/1）

```
  GET    /api/v1/user/equity
```

## WatermarkController（0/1）

```
  POST   /api/watermark/config
```

## WebMediaController（0/1）

```
  POST   /api/web-media/yt-dlp
```

## HubGroupController（0/4）

```
  POST   /backend/group/create
  GET    /backend/group/list
  POST   /backend/group/members/batch_add
  POST   /backend/group/members/query
```

## StaticController（2/2）

```
✓ GET    /files/id/:assetId
✓ GET    /files/{*path}
```
