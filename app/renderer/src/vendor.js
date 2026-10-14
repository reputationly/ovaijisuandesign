import { EntityDecoder, DecodingMode } from "entities";
import { Parser as Parser2, TokenizerMode } from "parse5";
import { fromParse5 } from "hast-util-from-parse5";
import { ok as ok$1 } from "devlop";
import { raw } from "hast-util-raw";
import { webNamespaces } from "web-namespaces";
import { toParse5 } from "hast-util-to-parse5";
import { ShikiError as ShikiError$1 } from "@shikijs/types";
import { splitLines, codeToTokensWithThemes, getLastGrammarStateFromMap, setLastGrammarStateToMap, resolveColorReplacements, codeToTokensBase, applyColorReplacements, isSpecialTheme, normalizeTheme, normalizeGetter, resolveLangAlias, resolveLangs, getLastGrammarState, isSpecialLang } from "@shikijs/primitive";


import { ccount } from "ccount";
import { whitespace } from "hast-util-whitespace";
import { parse as parse$2, stringify as stringify$2 } from "comma-separated-tokens";
import { stringify as stringify$1, parse as parse$1 } from "space-separated-tokens";
import { svg, html as html$5, find as find$1, hastToReact, normalize as normalize$3 } from "property-information";
import { htmlVoidElements } from "html-void-elements";
import { stringifyEntities } from "stringify-entities";
import { characterEntities } from "character-entities";
import { zwitch } from "zwitch";
import { TreeFragment, IterMode } from "@lezer/common";
import { tags as tags$1 } from "@lezer/highlight";
import { ExternalTokenizer } from "@lezer/lr";
import { indentString, indentUnit, defineLanguageFacet } from "@codemirror/language";
import { BubbleMenu } from "@tiptap/react/menus";
import { BlockPolicy } from "rehype-harden";
import { select, pointer } from "d3-selection";
import { drag as __npmDrag } from "d3-drag";
import { zoom, zoomIdentity as identity$2, zoomTransform as __npmZoomTransform } from "d3-zoom";
import { useFloating as useFloating$1, hide as hide$1, offset, flip, shift as shift$1, limitShift, size, size as size$1 } from "@floating-ui/react-dom";
import { getDocument as __webpack_exports__getDocument } from "pdfjs-dist";
import { interrupt } from "d3-transition";
import { blankLine as blankLine$2, content as content$1, list as list$2, blockQuote, definition as definition$1, codeIndented, headingAtx, thematicBreak as thematicBreak$2, setextUnderline, htmlFlow, codeFenced, characterReference, characterEscape, lineEnding, labelStartImage, attention, autolink, htmlText, labelStartLink, hardBreakEscape, labelEnd, codeText } from "micromark-core-commonmark";
import { postprocess, parse, preprocess } from "micromark";
import { decodeString } from "micromark-util-decode-string";
import { Decoration as Decoration2, Direction, ViewPlugin, BidiSpan, logException } from "@codemirror/view";
import clsx from "clsx";
import remarkGfm from "remark-gfm";
import { urlAttributes } from "html-url-attributes";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { VFile } from "vfile";
import { visit } from "unist-util-visit";
import { useHydrated, createRoute, reactUse, useNavigate, useSearch, useRouter, useParams, createRootRoute } from "@tanstack/react-router";
// 内联实现删掉后，getStoreFactory 继续从包入口拿这两个符号。
import { batch, createStore } from "@tanstack/store";
import { KeyboardCode, closestCorners, getFirstCollision, getScrollableAncestors, closestCenter, DndContext, KeyboardSensor, PointerSensor, DragOverlay } from "@dnd-kit/core";
import { StyleModule } from "style-mod";
import { invariant, replaceEqualDeep as replaceEqualDeep$1, isDangerousProtocol, exactPathTest, removeTrailingSlash, deepEqual, functionalUpdate as functionalUpdate$1, preloadWarning, BaseRoute, BaseRootRoute, isModuleNotFoundError, isNotFound, escapeHtml, storageKey as storageKey$1, defaultGetScrollRestorationKey, createControlledPromise, getLocationChangeInfo, isRedirect, rootRouteId, trimPathRight, RouterCore, redirect } from "@tanstack/router-core";
import { isServer as isServer$1 } from "@tanstack/router-core/isServer";
import { Dropcursor, Gapcursor, Placeholder, UndoRedo, TrailingNode } from "@tiptap/extensions";
import { createCustomEqual, sameValueZeroEqual, deepEqual as deepEqual$1 } from "fast-equals";
import { EditorContext, NodeViewWrapper, ReactNodeViewRenderer, EditorContent, useEditor, useEditorState as useEditorState$1 } from "@tiptap/react";
import { color as color$1 } from "d3-color";
import { interpolateRgb, interpolateString, interpolateTransformSvg, interpolateTransformCss, interpolateZoom, interpolate as interpolate$1 } from "d3-interpolate";
import { toRegExp } from "oniguruma-to-es";
import { I18nContext, getI18n, useTranslation, initReactI18next } from "react-i18next";

import { StarterKit } from "@tiptap/starter-kit";
import { Extension, callOrReturn, getExtensionField, isNodeEmpty, getChangedRanges, isNodeSelection, Editor as Editor$1, isTextSelection, NodeView, getRenderedAttributes, Node as Node$3, mergeAttributes, wrappingInputRule, Mark as Mark2, markInputRule, markPasteRule, textblockTypeInputRule, canInsertNode, nodeInputRule, combineTransactionSteps, findChildrenInRange, getMarksBetween, getAttributes, InputRule, PasteRule, renderNestedMarkdownContent, getNodeType, getNodeAtPosition, isNodeActive, isAtStartOfNode, isAtEndOfNode, getPreviousBlockSibling, parseIndentedBlocks, findParentNodeClosestToPos, posToDOMRect, getText, getTextSerializersFromSchema, commands as commands_exports, attrsEqual, decodeHtmlEntities, encodeHtmlEntities, flattenExtensions, generateJSON, getSchema, marksEqual, sortExtensions } from "@tiptap/core";
import { Code } from "@tiptap/extension-code";
import { Italic } from "@tiptap/extension-italic";
import { Link as Link$1 } from "@tiptap/extension-link";
import { BulletList, ListItem, ListKeymap, OrderedList } from "@tiptap/extension-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Strike } from "@tiptap/extension-strike";
import { Underline } from "@tiptap/extension-underline";
import { Document } from "@tiptap/extension-document";
import { Text as Text$1 } from "@tiptap/extension-text";
import { useQueryClient, useQuery, useMutation, useQueries, useIsMutating, queryOptions, QueryClientProvider } from "@tanstack/react-query";
import { createSelectorCreator, lruMemoize } from "reselect";
import { FontStyle, INITIAL, EncodedTokenMetadata, Registry as Registry$1, Theme } from "@shikijs/vscode-textmate";
import { shouldThrowError, QueriesObserver, notifyManager, QueryObserver, environmentManager, replaceEqualDeep, MutationObserver as MutationObserver$1, QueryClient, focusManager, isCancelledError, InfiniteQueryObserver } from "@tanstack/query-core";
import { createBrowserHistory, parseHref } from "@tanstack/history";
import { tokenize, find as find$2, registerCustomProtocol, reset } from "linkifyjs";
import { useStoreApi } from "./vendor-fork/xyflow/react/index.js";

import { gfmAutolinkLiteral } from "micromark-extension-gfm-autolink-literal";
import { toOnigurumaAst as o$1 } from "oniguruma-parser";
import { slug as w$1, createGroup as A$1, createLookaroundAssertion as K$1, createUnicodeProperty as Q$1, createAlternative as b$1, createAssertion as F$1, createCharacter as m$1, createCharacterClass as C$2, createCharacterSet as E$2, createBackreference as k$1, createCapturingGroup as P$1, createSubroutine as O$1, parse as J$1 } from "oniguruma-parser/parser";
import { traverse as S$2 } from "oniguruma-parser/traverser";
import { OnigUnicodePropertyMap as _ } from "oniguruma-parser/unicode";
import { DecorationSet, EditorView as EditorView$1, Decoration as Decoration$1 } from "prosemirror-view";
import { gapCursor } from "prosemirror-gapcursor";
import { CellSelection, addColumnBefore, addColumnAfter, deleteColumn, addRowBefore, addRowAfter, deleteRow, deleteTable, mergeCells, splitCell, toggleHeader, toggleHeaderCell, setCellAttr, goToNextCell, fixTables, columnResizing, tableEditing } from "prosemirror-tables";
import { findClusterBreak, RangeValue, RangeSet, MapMode, EditorSelection, Facet, StateEffect, ChangeSet, Text, CharCategory, Annotation, codePointAt, codePointSize, combineConfig, StateField, Transaction as Transaction2, ChangeDesc, fromCodePoint, Prec, RangeSetBuilder } from "@codemirror/state";
import { toDate, constructFrom, getDaysInMonth, format, addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, differenceInCalendarMonths, eachMonthOfInterval, eachYearOfInterval, endOfISOWeek, endOfMonth, endOfWeek, endOfYear, getISOWeek, getMonth, getYear, getWeek, isAfter, isBefore, isDate, isSameDay, isSameMonth, isSameYear, max, min, startOfDay, startOfISOWeek, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { enUS as enUS$1 } from "date-fns/locale";
import { offset as offset$2, autoPlacement as autoPlacement$1, shift as shift$3, flip as flip$2, hide as hide$3, arrow as arrow$4, inline as inline$1, limitShift as limitShift$2, computePosition as computePosition$1 } from "@floating-ui/core";
import { computePosition, offset as offset$1, shift as shift$2, limitShift as limitShift$1, flip as flip$1, hide as hide$2, autoUpdate, platform, arrow as arrow$3, autoPlacement, inline } from "@floating-ui/dom";
import { CanvasNodeType, GROUP_LABEL_MAX_LENGTH, SIZE_STROKE_WIDTH_MAP, getDefaultStrokeWidth, HILO_APP_ID, HILO_BIZ_ID, HILO_DEFAULT_VERSION_CODE, VERSION_CODE_SEMVER_CORE_PATTERN, normalizeVersionCodeForCloud, ASSET_MODEL_USER_UPLOADED, ASSET_MODEL_IMPORTED, isUserProvidedAssetModel, regionToLocale, RUNTIME_CONFIG_KEY, DEFAULT_RUNTIME_CONFIG, parseSemver, compareSemver, CONNECTOR_TOKEN_SOURCE, MEDIA_EXTENSIONS, inferMediaKind, LIBTV_CONNECTOR, MEDIA_LINEAGE_REQUEST_HEADER, MEDIA_LINEAGE_MAX_HASH_BYTES, MEDIA_LINEAGE_HEADER_BYTES, MEDIA_LINEAGE_MAX_REFERENCES, MEDIA_LINEAGE_MAX_TEXT, mediaLineageToken, mediaLineagePath, mediaLineageFilename, mediaLineageFormat, finite$1, mediaLineageFields, mediaLineageError, isMediaLineageImage, HILO_WORKSPACE_IDENTITY_HEADER, HILO_WORKSPACE_IDENTITY_QUERY, HILO_WORKSPACE_INSTANCE_HEADER, HILO_WORKSPACE_INSTANCE_QUERY, HILO_WORKSPACE_GENERATION_HEADER, HILO_WORKSPACE_GENERATION_QUERY, HILO_CANVAS_WRITER_REVISION_HEADER, WORKSPACE_IDENTITY_MISMATCH_CODE, WORKSPACE_IDENTITY_REQUIRED_CODE, workspaceGatewayIdentityHeaders, isWorkspaceIdentityErrorCode, encodePath, DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT, VIDEO_PLAYBACK_IDENTITY_QUERY_KEYS, videoPlaybackPath, HILO_HUB_BIZ_LINE, API_PATHS, BACKEND_VIBE_STORYBOARD, GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT, GROUP_ID_HEADER, PERF_LOG_FLUSH, PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP, measurePerfCounters, measurePerf, mergePerfMetadata, clamp$c, AUTO_PAN_DISTANCE, maskAutoPanSides, hasDraggedAncestor, getDragSnapReferenceBounds, getDragSnapAffectedIds, getDragBounds, interpolateNumber, AUTO_PAN_ARM_SLACK, getNodesSelectionActiveOnPointerUp, edgeZones, DEFAULT_LARGE_MOVE_FACTOR, getKeyboardMoveFactor, OVERSCAN_PX, RECOMPUTE_DELTA_PX, cascadeAbsolutePosition, AssetMetadataStoreContext, clamp$b, AUTO_DEDUPE_ID_PREFIX, isPlainToastContent, hashToastFingerprint, withAutomaticDedupeId, PROMPT_FONT_SIZE_MIN, PROMPT_FONT_SIZE_MAX, PROMPT_FONT_SIZE_DEFAULT, STORAGE_KEY$a, normalizePromptFontSize, readPersistedPromptFontSize, persistPromptFontSize, stateAttributesMapping$a, clamp$a, FRAME_HEADER_SIZE$1, Bitstream, NOT_DIRTY, CHILD_DIRTY, CONTENT_DIRTY, NODE_DIRTY, none$3, noSpec, normalizeTableCellAlign, parseAlign, normalizeTableCellAlignFromAttributes, createAlignAttribute, parseColgroupWidth, parseColwidth, COLLAPSIBLE_WHITESPACE, isEmptyCellElement, fillEmptyCellContent, getColStyleDeclaration, updateColumns, TableView as TableView2, createColGroup, getTableNodeTypes, escapeTableCellPipes, preprocessTablePipes, collapseWhitespace, renderTableToMarkdown, rangeFrom, rangeTo, WidgetType as WidgetType2, EmptyLine, CommentEnd, ProcessingEnd, define_process_env_default$1, lessThan, greaterThan, slash as slash$1, question as question$1, bang, dash as dash$1, descendantOp, Unit, identifier as identifier$2, callee, VariableName, queryIdentifier, queryVariableName, QueryCallee, flowPointToMiniMap, findHitTarget, IMAGE_EDIT_TOOLS, STORAGE_KEY$6, DEFAULT_TOOL, isMergedImageEditTool, readPersisted, probeMediaDurationSec, VIDEO_EXTENSIONS$1, AUDIO_EXTENSIONS$1, mediaKindFromFile, _cachedConfig, getRuntimeConfig, dummyStore, STATIC_TRANSITIONING_PROPS, intersectionObserverOptions, define_process_env_default, EventEmitter as EventEmitter3, customMcpNameIdentity, PlatformContext, usePlatform, MAX_VALUE_LEN, fmtValue, workspaceGatewayUrl, withWorkspaceGatewayHeaders, WorkspaceGatewayClient, canReplayAfterRecovery, isIdentityError, GENERATE_ERROR_CODES, normalizeGenerationFailurePresentation, normalizeGenerateErrorCode, LOG_TAG, defaultLogger, DEFAULT_READ_TIMEOUT_MS, DEFAULT_GENERATE_TIMEOUT_MS, DEFAULT_GENERATE_VIDEO_TIMEOUT_MS, MAX_CANVAS_WRITER_WORKSPACES, CANVAS_WRITER_REVISIONS_PER_MS, canvasWriterRevisions, nextCanvasWriterRevision, advanceCanvasWriterRevision, normalizeRecoveredBinding, headersToRecord, isSafeIdentityRecoveryMethod, ApiError, selectedRequestGroupId, setSelectedRequestGroupId, normalizeGatewayBaseUrl, toCloudLang, getOsName, getBrowserName, getDeviceMemory, GLOBAL_STORAGE_VERSION, GLOBAL_STORAGE_DEFAULTS, WORKSPACE_STORAGE_VERSION, WORKSPACE_STORAGE_DEFAULTS, noop as noop2, resolveEnabled, parseCreditAmount, invalidDisplay, unavailableDisplay, minCreditAmount, deriveTeamCreditDisplay, deriveActiveScope, isBillableSubmission, ACCOUNT_SUBMISSION_BLOCKED_EVENT, dispatchAccountSubmissionBlocked, GatewayScopeContext, useGatewayScope, useGatewayBaseUrl, CurrentWorkspaceContext, useCurrentWorkspace, storageKeys, storageWriteQueues, enqueueStorageWrite, LS_PREFIX, UNDEFINED_STORAGE_VALUE, isUndefinedStorageValue, toStorageQueryData, resolveStorageQueryData, localCacheKey, readLocalCache$2, writeLocalCache$2, removeLocalCache, _rendererGlobalDefaults, getRendererGlobalDefaults, ACCOUNT_SENSITIVE_CANVAS_PATHS, AccountSubmissionBlockedError, resolveNewProjectPreferences, updateNewProjectPreferences, CDN_BASE_MAP, PUBLIC_ASSET_BASE_MAP, getCdnRegion, cdnPublicAsset, CDN_TOUCHDESIGNER_COMPONENTS, matchesLocalConnectorServer, libtvIconUrl, namesMatch, originsMatch, BROWSER_ASSET_SOURCE_METADATA_KEYS, safeSourcePageUrl, browserAssetSourceMetadata, MAX_ACTIVE_FINGERPRINTS, FINGERPRINT_WAIT_MS, MAX_ACTIVE_HEADER_READS, activeHeaderReads, activeFingerprints, mediaFingerprintFile, mediaLineageRequestId, warnEnrollError, Context as Context2, Target as Target2, tryParseJson$1, BROWSER_IMAGE_EDIT_ACTIONS, isBrowserImageEditAction, BROWSER_IMAGE_EDIT_EVENT } from "./infra/from-vendor.js";
import { keymap as keymap$1, keydownHandler } from "prosemirror-keymap";
import { ErrorBoundary as C$5 } from "react-error-boundary";
// Plus$1 和包装还要调用 0.468.0 的公开工厂和图标，内联外壳已经删掉。
import { createLucideIcon, Activity, AppWindow as AppWindow$1, Archive as Archive$1, ArrowDown as ArrowDown$1, ArrowDownToLine as ArrowDownToLine$1, ArrowLeft as ArrowLeft$1, ArrowLeftRight as ArrowLeftRight$1, ArrowLeftToLine as ArrowLeftToLine$1, ArrowRight as ArrowRight$1, ArrowRightToLine as ArrowRightToLine$1, ArrowUp as ArrowUp$1, ArrowUpDown as ArrowUpDown$1, ArrowUpFromLine as ArrowUpFromLine$1, ArrowUpRight as ArrowUpRight$1, ArrowUpToLine as ArrowUpToLine$1, AtSign as AtSign$1, AudioLines as AudioLines$1, AudioWaveform as AudioWaveform$2, BadgeCheck as BadgeCheck$1, BadgeInfo as BadgeInfo$1, Bell as Bell$1, BellRing as BellRing$1, Bold as Bold$2, BookUser as BookUser$1, Bot as Bot$1, Box as Box$1, Boxes as Boxes$1, Bug as Bug$1, Calculator as Calculator$1, ChartNoAxesCombined as ChartNoAxesCombined$1, Check as Check$1, CheckCheck as CheckCheck$1, ChevronDown as ChevronDown$1, ChevronLeft as ChevronLeft$1, ChevronRight as ChevronRight$2, ChevronUp as ChevronUp$1, Circle as Circle$1, CircleAlert as CircleAlert$1, CircleArrowUp as CircleArrowUp$1, CircleCheck, CircleMinus as CircleMinus$1, CirclePlus, CircleX as CircleX$1, Clipboard, ClipboardList as ClipboardList$1, Cloud as Cloud$1, CloudDownload as CloudDownload$1, CloudUpload as CloudUpload$1, Code as Code$2, Cog as Cog$1, Command as Command$1, Compass as Compass$1, Copy as Copy$1, CopyPlus as CopyPlus$1, CreditCard as CreditCard$1, Crosshair as Crosshair$1, Crown as Crown$1, Download as Download$1, Earth, Ellipsis as Ellipsis$1, ExternalLink as ExternalLink$1, Eye as Eye$1, EyeOff as EyeOff$1, FileImage as FileImage$1, FilePlus2 as FilePlus2$1, Film as Film$1, FolderClock as FolderClock$1, FolderClosed as FolderClosed$1, FolderInput as FolderInput$1, FolderMinus as FolderMinus$1, FolderOpen as FolderOpen$1, FolderPlus as FolderPlus$1, FolderUp as FolderUp$1, FolderX as FolderX$1, Gauge as Gauge$1, Gift, GitCompare as GitCompare$1, Globe as Globe$1, GraduationCap as GraduationCap$1, Grid2x2, Grid2x2Plus as Grid2x2Plus$1, Grid3x3, GripHorizontal, GripVertical as GripVertical$1, Hand as Hand$1, Headphones as Headphones$1, History as History$1, House, ImagePlus as ImagePlus$1, Import as Import$1, Inbox as Inbox$1, Info as Info$2, Italic as Italic$2, KeyRound as KeyRound$1, Keyboard as Keyboard$1, Languages as Languages$1, Layers as Layers$1, Layers2 as Layers2$1, LayoutGrid as LayoutGrid$1, LayoutList as LayoutList$1, LayoutTemplate as LayoutTemplate$1, Library as Library$1, Lightbulb as Lightbulb$1, Link2 as Link2$1, ListChecks as ListChecks$1, LoaderCircle as LoaderCircle$1, Lock as Lock$1, LockKeyhole as LockKeyhole$1, Mail as Mail$1, Map as Map$2, MapPin as MapPin$1, Maximize as Maximize$1, MessageCircle as MessageCircle$1, MessageCircleMore as MessageCircleMore$1, MessageSquareMore as MessageSquareMore$1, Minus as Minus$1, Monitor as Monitor$1, MonitorUp as MonitorUp$1, Music as Music$1, Music2 as Music2$1, Network as Network$1, Newspaper as Newspaper$1, NotebookPen as NotebookPen$1, OctagonX, PackageSearch as PackageSearch$1, Palette as Palette$1, PanelBottomClose as PanelBottomClose$1, PanelLeftClose as PanelLeftClose$1, PanelLeftOpen as PanelLeftOpen$1, PanelRightClose as PanelRightClose$1, PanelRightOpen as PanelRightOpen$1, PanelsTopLeft as PanelsTopLeft$1, Pencil as Pencil$1, PencilRuler as PencilRuler$1, Phone as Phone$1, Pin as Pin$1, PinOff as PinOff$1, Podcast as Podcast$1, Power as Power$1, Redo2 as Redo2$1, Regex as Regex$1, Repeat2 as Repeat2$1, RotateCcw as RotateCcw$1, RotateCw as RotateCw$1, Save as Save$1, Scan as Scan$1, Scissors as Scissors$1, ScrollText as ScrollText$1, Search as Search$1, Send as Send$1, Server, ServerOff as ServerOff$1, Share2 as Share2$1, ShieldAlert as ShieldAlert$1, ShieldCheck as ShieldCheck$1, ShieldOff as ShieldOff$1, Shuffle as Shuffle$1, Slash as Slash$1, Smartphone as Smartphone$1, Speech as Speech$1, Split as Split$1, SquareDashed as SquareDashed$1, SquareMousePointer as SquareMousePointer$1, StickyNote as StickyNote$1, Sun as Sun$1, SwatchBook as SwatchBook$1, Tag as Tag$2, ThumbsDown as ThumbsDown$1, ThumbsUp as ThumbsUp$1, Trash2 as Trash2$1, TrendingUp as TrendingUp$1, TriangleAlert as TriangleAlert$1, Tv as Tv$1, Underline as Underline$2, Undo2 as Undo2$1, Upload as Upload$1, User as User$1, UserRound as UserRound$1, UserRoundPlus as UserRoundPlus$1, Users as Users$1, Video as Video$1, VideoOff as VideoOff$1, Volume2 as Volume2$1, VolumeX as VolumeX$1, WandSparkles as WandSparkles$1, WholeWord as WholeWord$1, Wifi, WifiOff as WifiOff$1, Workflow as Workflow$1, Wrench as Wrench$1, X as X$8, Zap as Zap$1, ZoomIn as ZoomIn$1, ZoomOut as ZoomOut$1 } from "lucide-react";
import { chainCommands, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock as splitBlock$1, exitCode, joinUp, joinDown, joinBackward, joinForward, joinTextblockBackward, joinTextblockForward, lift, selectNodeBackward, selectNodeForward, selectParentNode, selectTextblockEnd, selectTextblockStart, setBlockType, wrapIn } from "prosemirror-commands";
import { keyName, base, shift } from "w3c-keyname";
import { isShadowRoot, isElement, isHTMLElement as isHTMLElement$1, getComputedStyle as getComputedStyle$1, getNodeName, isNode as isNode$1, getWindow as getWindow$1, isWebKit as isWebKit$2, isLastTraversableNode, getParentNode, getFrameElement, getNodeScroll, getDocumentElement, isTopLayer, isOverflowElement, getOverflowAncestors, isContainingBlock, isTableElement, getContainingBlock } from "@floating-ui/utils/dom";
import { floor, getSideAxis, getAlignmentAxis, getAxisLength, getSide as getSide$1, getAlignment, evaluate, getPaddingObject, rectToClientRect, min as min$2, getOppositeAlignmentPlacement, placements, getAlignmentSides, getOppositePlacement, getExpandedPlacements, getOppositeAxisPlacements, sides, max as max$2, getOppositeAxis, round, createCoords } from "@floating-ui/utils";
import __ov_react from "react";
import reactExports from "react";
import __ov_react_jsx_runtime from "react/jsx-runtime";
import jsxRuntimeExports from "react/jsx-runtime";
import __ov_react_dom from "react-dom";
import reactDomExports from "react-dom";
import __ov_react_dom_client from "react-dom/client";
import clientExports from "react-dom/client";
import __ov_use_sync_external_store_shim from "use-sync-external-store/shim";
import shimExports from "use-sync-external-store/shim";
import __ov_use_sync_external_store_shim_with_selector from "use-sync-external-store/shim/with-selector";
import withSelectorExports from "use-sync-external-store/shim/with-selector";
import { tabbable, isTabbable, focusable } from "tabbable";
import crelt from "crelt";
import { canUseDOM, getEventCoordinates, getWindow, isDocument, isHTMLElement, isSVGElement, isWindow, isNode, getOwnerDocument, add as add$2, isKeyboardEvent, subtract, findFirstFocusableNode, CSS as CSS$1 } from "@dnd-kit/utilities";
import { HiddenText, LiveRegion } from "@dnd-kit/accessibility";
import { Virtualizer, observeElementRect, observeElementOffset, elementScroll } from "@tanstack/virtual-core";
import { ascending } from "d3-array";
import { dispatch } from "d3-dispatch";
import { timer as timer$1, timeout, now } from "d3-timer";
import { easeCubicInOut as cubicInOut } from "d3-ease";
import { asciiAlphanumeric, markdownSpace, markdownLineEnding, markdownLineEndingOrSpace, unicodeWhitespace, unicodePunctuation, asciiAlpha, asciiControl, asciiAtext, asciiPunctuation, asciiHexDigit, asciiDigit } from "micromark-util-character";
import { factoryDestination } from "micromark-factory-destination";
import { factorySpace } from "micromark-factory-space";
import { factoryTitle } from "micromark-factory-title";
import { splice, push } from "micromark-util-chunked";
import { subtokenize } from "micromark-util-subtokenize";
import { factoryWhitespace } from "micromark-factory-whitespace";
import { classifyCharacter } from "micromark-util-classify-character";
import { factoryLabel } from "micromark-factory-label";
import { htmlRawNames, htmlBlockNames } from "micromark-util-html-tag-name";
import { normalizeIdentifier } from "micromark-util-normalize-identifier";
import { resolveAll } from "micromark-util-resolve-all";
import { combineExtensions } from "micromark-util-combine-extensions";
import OrderedMap from "orderedmap";
import { ReplaceError, Fragment, Slice, MarkType, Mark as Mark$1, Node as Node$4, NodeRange, DOMSerializer, DOMParser as DOMParser$1, Schema as Schema$2 } from "prosemirror-model";
import { ReplaceStep, ReplaceAroundStep, Transform, liftTarget, replaceStep, canJoin, joinPoint, canSplit, findWrapping, dropPoint, RemoveMarkStep, Mapping, Step, StepResult, StepMap } from "prosemirror-transform";
import { NodeSelection, Selection, TextSelection, AllSelection, Plugin, PluginKey, EditorState as EditorState$1, SelectionRange as SelectionRange$1 } from "prosemirror-state";
import RopeSequence from "rope-sequence";
import { undo as undo$1, redo as redo$1, history as history$1, closeHistory, undoDepth as undoDepth$1, redoDepth as redoDepth$1 } from "prosemirror-history";
import { liftListItem, sinkListItem, wrapInList } from "prosemirror-schema-list";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";
import { createTailwindMerge } from "tailwind-merge";
import { Accordion as __baseUiNamespace0 } from "@base-ui/react/accordion";
import { AlertDialog as __baseUiNamespace1 } from "@base-ui/react/alert-dialog";
import { Avatar as __baseUiNamespace2 } from "@base-ui/react/avatar";
import { Button as Button$3 } from "@base-ui/react/button";
import { Checkbox as __baseUiNamespace3 } from "@base-ui/react/checkbox";
import { ContextMenu as __baseUiNamespace4 } from "@base-ui/react/context-menu";
import { Dialog as __baseUiNamespace5 } from "@base-ui/react/dialog";
import { Field as __baseUiNamespace6 } from "@base-ui/react/field";
import { Menu as __baseUiNamespace7 } from "@base-ui/react/menu";
import { mergeProps as mergeProps$1 } from "@base-ui/react/merge-props";
import { Popover as __baseUiNamespace8 } from "@base-ui/react/popover";
import { PreviewCard as __baseUiNamespace9 } from "@base-ui/react/preview-card";
import { Progress as __baseUiNamespace10 } from "@base-ui/react/progress";
import { Radio as __baseUiNamespace11 } from "@base-ui/react/radio";
import { RadioGroup as RadioGroup$1 } from "@base-ui/react/radio-group";
import { ScrollArea as __baseUiNamespace12 } from "@base-ui/react/scroll-area";
import { Select as __baseUiNamespace13 } from "@base-ui/react/select";
import { Slider as __baseUiNamespace14 } from "@base-ui/react/slider";
import { Switch as __baseUiNamespace15 } from "@base-ui/react/switch";
import { Tabs as __baseUiNamespace16 } from "@base-ui/react/tabs";
import { Toggle as Toggle$1 } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroup$1 } from "@base-ui/react/toggle-group";
import { Tooltip as __baseUiNamespace17 } from "@base-ui/react/tooltip";
import { useRender } from "@base-ui/react/use-render";
import formatErrorMessage from "@base-ui/utils/formatErrorMessage";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useTimeout } from "@base-ui/utils/useTimeout";

export { AvatarRootContext, useAvatarRootContext } from "@base-ui/react/esm/avatar/root/AvatarRootContext.js";
export { avatarStateAttributesMapping } from "@base-ui/react/esm/avatar/root/stateAttributesMapping.js";
export { usePopoverRootContext } from "@base-ui/react/esm/popover/root/PopoverRootContext.js";
export { ProgressRootContext } from "@base-ui/react/esm/progress/root/ProgressRootContext.js";
export { progressStateAttributesMapping } from "@base-ui/react/esm/progress/root/stateAttributesMapping.js";
export { SelectGroupContext, useSelectGroupContext } from "@base-ui/react/esm/select/group/SelectGroupContext.js";
export { useBaseUiId } from "@base-ui/react/esm/utils/useBaseUiId.js";
export { useRenderElement } from "@base-ui/react/esm/utils/useRenderElement.js";
export { valueToPercent } from "@base-ui/react/esm/utils/valueToPercent.js";
const AccordionHeader = __baseUiNamespace0.Header;
const AccordionItem$1 = __baseUiNamespace0.Item;
const AccordionPanel = __baseUiNamespace0.Panel;
const AccordionRoot = __baseUiNamespace0.Root;
const AccordionTrigger$1 = __baseUiNamespace0.Trigger;
const AlertDialogRoot = __baseUiNamespace1.Root;
const AvatarImage$1 = __baseUiNamespace2.Image;
const CheckboxRoot = __baseUiNamespace3.Root;
const ContextMenuRoot = __baseUiNamespace4.Root;
const ContextMenuTrigger$1 = __baseUiNamespace4.Trigger;
const DialogBackdrop = __baseUiNamespace1.Backdrop;
const DialogClose$1 = __baseUiNamespace1.Close;
const DialogDescription$2 = __baseUiNamespace1.Description;
const DialogPopup = __baseUiNamespace1.Popup;
const DialogPortal$2 = __baseUiNamespace1.Portal;
const DialogRoot = __baseUiNamespace5.Root;
const DialogTitle$2 = __baseUiNamespace1.Title;
const DialogTrigger$1 = __baseUiNamespace1.Trigger;
const FieldControl = __baseUiNamespace6.Control;
const FieldRoot = __baseUiNamespace6.Root;
const MenuGroup = __baseUiNamespace4.Group;
const MenuGroupLabel = __baseUiNamespace4.GroupLabel;
const MenuItem$3 = __baseUiNamespace4.Item;
const MenuPopup = __baseUiNamespace4.Popup;
const MenuPortal = __baseUiNamespace4.Portal;
const MenuPositioner = __baseUiNamespace4.Positioner;
const MenuRadioGroup = __baseUiNamespace4.RadioGroup;
const MenuRadioItem = __baseUiNamespace4.RadioItem;
const MenuRadioItemIndicator = __baseUiNamespace4.RadioItemIndicator;
const MenuRoot = __baseUiNamespace7.Root;
const MenuSubmenuRoot = __baseUiNamespace4.SubmenuRoot;
const MenuSubmenuTrigger = __baseUiNamespace4.SubmenuTrigger;
const MenuTrigger = __baseUiNamespace7.Trigger;
const PopoverArrow$1 = __baseUiNamespace8.Arrow;
const PopoverPopup = __baseUiNamespace8.Popup;
const PopoverPortal = __baseUiNamespace8.Portal;
const PopoverPositioner = __baseUiNamespace8.Positioner;
const PopoverRoot = __baseUiNamespace8.Root;
const PopoverTrigger$1 = __baseUiNamespace8.Trigger;
const PreviewCardPopup = __baseUiNamespace9.Popup;
const PreviewCardPortal = __baseUiNamespace9.Portal;
const PreviewCardPositioner = __baseUiNamespace9.Positioner;
const PreviewCardRoot = __baseUiNamespace9.Root;
const PreviewCardTrigger$1 = __baseUiNamespace9.Trigger;
const ProgressRoot = __baseUiNamespace10.Root;
const RadioIndicator = __baseUiNamespace11.Indicator;
const RadioRoot = __baseUiNamespace11.Root;
const ScrollAreaCorner = __baseUiNamespace12.Corner;
const ScrollAreaRoot = __baseUiNamespace12.Root;
const ScrollAreaScrollbar = __baseUiNamespace12.Scrollbar;
const ScrollAreaThumb = __baseUiNamespace12.Thumb;
const ScrollAreaViewport = __baseUiNamespace12.Viewport;
const SelectIcon = __baseUiNamespace13.Icon;
const SelectItem$2 = __baseUiNamespace13.Item;
const SelectItemIndicator = __baseUiNamespace13.ItemIndicator;
const SelectItemText = __baseUiNamespace13.ItemText;
const SelectList = __baseUiNamespace13.List;
const SelectPopup = __baseUiNamespace13.Popup;
const SelectPortal = __baseUiNamespace13.Portal;
const SelectPositioner = __baseUiNamespace13.Positioner;
const SelectRoot = __baseUiNamespace13.Root;
const SelectScrollDownArrow = __baseUiNamespace13.ScrollDownArrow;
const SelectScrollUpArrow = __baseUiNamespace13.ScrollUpArrow;
const SelectTrigger$2 = __baseUiNamespace13.Trigger;
const SelectValue$2 = __baseUiNamespace13.Value;
const SliderControl$1 = __baseUiNamespace14.Control;
const SliderIndicator = __baseUiNamespace14.Indicator;
const SliderRoot = __baseUiNamespace14.Root;
const SliderThumb = __baseUiNamespace14.Thumb;
const SliderTrack = __baseUiNamespace14.Track;
const SwitchRoot = __baseUiNamespace15.Root;
const SwitchThumb = __baseUiNamespace15.Thumb;
const TabsIndicator = __baseUiNamespace16.Indicator;
const TabsList$1 = __baseUiNamespace16.List;
const TabsPanel = __baseUiNamespace16.Panel;
const TabsRoot = __baseUiNamespace16.Root;
const TabsTab = __baseUiNamespace16.Tab;
const TooltipPopup = __baseUiNamespace17.Popup;
const TooltipPortal = __baseUiNamespace17.Portal;
const TooltipPositioner = __baseUiNamespace17.Positioner;
const TooltipProvider$2 = __baseUiNamespace17.Provider;
const TooltipRoot = __baseUiNamespace17.Root;
const TooltipTrigger$1 = __baseUiNamespace17.Trigger;

function _mergeNamespaces(n2, m3) {
  for (var i2 = 0; i2 < m3.length; i2++) {
    const e2 = m3[i2];
    if (typeof e2 !== "string" && !Array.isArray(e2)) {
      for (const k2 in e2) {
        if (k2 !== "default" && !(k2 in n2)) {
          const d2 = Object.getOwnPropertyDescriptor(e2, k2);
          if (d2) {
            Object.defineProperty(n2, k2, d2.get ? d2 : {
              enumerable: true,
              get: () => e2[k2]
            });
          }
        }
      }
    }
  }
  return Object.freeze(Object.defineProperty(n2, Symbol.toStringTag, {
    value: "Module"
  }));
}
const scriptRel = /* @__PURE__ */function detectScriptRel() {
  const relList = typeof document !== "undefined" && document.createElement("link").relList;
  return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
}();
const assetsURL = function (dep, importerUrl) {
  return new URL(dep, importerUrl).href;
};
const seen = {};
const __ovVitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    let allSettled2 = function (promises) {
      return Promise.all(promises.map(p3 => Promise.resolve(p3).then(value => ({
        status: "fulfilled",
        value
      }), reason => ({
        status: "rejected",
        reason
      }))));
    };
    const links = document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = allSettled2(deps.map(dep => {
      dep = assetsURL(dep, importerUrl);
      if (dep in seen) return;
      seen[dep] = true;
      const isCss = dep.endsWith(".css");
      const cssSelector = isCss ? '[rel="stylesheet"]' : "";
      const isBaseRelative = !!importerUrl;
      if (isBaseRelative) {
        for (let i2 = links.length - 1; i2 >= 0; i2--) {
          const link22 = links[i2];
          if (link22.href === dep && (!isCss || link22.rel === "stylesheet")) {
            return;
          }
        }
      } else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
        return;
      }
      const link2 = document.createElement("link");
      link2.rel = isCss ? "stylesheet" : scriptRel;
      if (!isCss) {
        link2.as = "script";
      }
      link2.crossOrigin = "";
      link2.href = dep;
      if (cspNonce) {
        link2.setAttribute("nonce", cspNonce);
      }
      document.head.appendChild(link2);
      if (isCss) {
        return new Promise((res, rej) => {
          link2.addEventListener("load", res);
          link2.addEventListener("error", () => rej(new Error(`Unable to preload CSS for ${dep}`)));
        });
      }
    }));
  }
  function handlePreloadError(err) {
    const e2 = new Event("vite:preloadError", {
      cancelable: true
    });
    e2.payload = err;
    window.dispatchEvent(e2);
    if (!e2.defaultPrevented) {
      throw err;
    }
  }
  return promise.then(res => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
function getDefaultExportFromCjs$1(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
function normalizeLabel$1(label) {
  if (typeof label !== "string") return void 0;
  const trimmed = label.trim();
  if (trimmed.length === 0) return void 0;
  return trimmed.length > GROUP_LABEL_MAX_LENGTH ? trimmed.slice(0, GROUP_LABEL_MAX_LENGTH) : trimmed;
}

const React = /* @__PURE__ */getDefaultExportFromCjs$1(reactExports);
const React$1 = /* @__PURE__ */_mergeNamespaces({
  __proto__: null,
  default: React
}, [reactExports]);
const createLucideIcon$1 = (iconName, iconNode, viewBox = "0 0 24 24", isFillIcon = false) => {
  const Component = reactExports.forwardRef(({
    color: color2 = "currentColor",
    size: size2 = 20,
    strokeWidth,
    className,
    children: children2,
    ...props
  }, ref) => {
    const strokeWidthValue = strokeWidth !== void 0 ? strokeWidth : getDefaultStrokeWidth(size2);
    const svgProps = isFillIcon ? {
      // Fill 图标：使用 fill 属性，不设置 stroke
      ref,
      xmlns: "http://www.w3.org/2000/svg",
      width: size2,
      height: size2,
      viewBox,
      fill: color2,
      className,
      ...props
    } : {
      // Stroke 图标（Lucide 风格）：使用 stroke 属性
      ref,
      xmlns: "http://www.w3.org/2000/svg",
      width: size2,
      height: size2,
      viewBox,
      fill: "none",
      stroke: color2,
      strokeWidth: strokeWidthValue,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      ...props
    };
    return reactExports.createElement("svg", svgProps, [...iconNode.map(([tag, attrs], i2) => reactExports.createElement(tag, {
      key: i2,
      ...attrs
    })), ...(Array.isArray(children2) ? children2 : children2 ? [children2] : [])]);
  });
  Component.displayName = iconName.split("-").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  return Component;
};
const Brain$3 = createLucideIcon$1("brain", [["path", {
  "d": "M12 18V5m3 8a4.17 4.17 0 0 1-3-4a4.17 4.17 0 0 1-3 4m8.598-6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"
}], ["path", {
  "d": "M17.997 5.125a4 4 0 0 1 2.526 5.77"
}], ["path", {
  "d": "M18 18a4 4 0 0 0 2-7.464"
}], ["path", {
  "d": "M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"
}], ["path", {
  "d": "M6 18a4 4 0 0 1-2-7.464"
}], ["path", {
  "d": "M6.003 5.125a4 4 0 0 0-2.526 5.77"
}]], "0 0 24 24", false);
const Check$3 = createLucideIcon$1("check", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M20 6L9 17l-5-5"
}]], "0 0 24 24", false);
const ChevronDown$3 = createLucideIcon$1("chevron-down", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "m6 9l6 6l6-6"
}]], "0 0 24 24", false);
const CircleAlert$3 = createLucideIcon$1("circle-alert", [["circle", {
  "cx": "12",
  "cy": "12",
  "r": "10"
}], ["path", {
  "d": "M12 8v4m0 4h.01"
}]], "0 0 24 24", false);
const Clapperboard$3 = createLucideIcon$1("clapperboard", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M20.2 6L3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Zm-14-.7l3.1 3.9m3.1-5.8l3.1 4M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
}]], "0 0 24 24", false);
const Download$3 = createLucideIcon$1("download", [["path", {
  "d": "M12 15V3m9 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
}], ["path", {
  "d": "m7 10l5 5l5-5"
}]], "0 0 24 24", false);
const ExternalLink$3 = createLucideIcon$1("external-link", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M15 3h6v6m-11 5L21 3m-3 10v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
}]], "0 0 24 24", false);
const Eye$3 = createLucideIcon$1("eye", [["path", {
  "d": "M2.062 12.348a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 19.876 0a1 1 0 0 1 0 .696a10.75 10.75 0 0 1-19.876 0"
}], ["circle", {
  "cx": "12",
  "cy": "12",
  "r": "3"
}]], "0 0 24 24", false);
const File$4 = createLucideIcon$1("file", [["path", {
  "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
}], ["path", {
  "d": "M14 2v5a1 1 0 0 0 1 1h5"
}]], "0 0 24 24", false);
const Film$3 = createLucideIcon$1("film", [["rect", {
  "width": "18",
  "height": "18",
  "x": "3",
  "y": "3",
  "rx": "2"
}], ["path", {
  "d": "M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18m0-13.5h4m-4 9h4"
}]], "0 0 24 24", false);
const FolderInput$3 = createLucideIcon$1("folder-input", [["path", {
  "d": "M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1m0-4h10"
}], ["path", {
  "d": "m9 16l3-3l-3-3"
}]], "0 0 24 24", false);
const Headphones$3 = createLucideIcon$1("headphones", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"
}]], "0 0 24 24", false);
const Megaphone$3 = createLucideIcon$1("megaphone", [["path", {
  "d": "M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
}], ["path", {
  "d": "M6 14a12 12 0 0 0 2.4 7.2a2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14M8 6v8"
}]], "0 0 24 24", false);
const Music$3 = createLucideIcon$1("music", [["path", {
  "d": "M9 18V5l12-2v13"
}], ["circle", {
  "cx": "6",
  "cy": "18",
  "r": "3"
}], ["circle", {
  "cx": "18",
  "cy": "16",
  "r": "3"
}]], "0 0 24 24", false);
const Package$3 = createLucideIcon$1("package", [["path", {
  "d": "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zm1 .27V12"
}], ["path", {
  "d": "M3.29 7L12 12l8.71-5M7.5 4.27l9 5.15"
}]], "0 0 24 24", false);
const Plus$3 = createLucideIcon$1("plus", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M5 12h14m-7-7v14"
}]], "0 0 24 24", false);
const Search$3 = createLucideIcon$1("search", [["path", {
  "d": "m21 21l-4.34-4.34"
}], ["circle", {
  "cx": "11",
  "cy": "11",
  "r": "8"
}]], "0 0 24 24", false);
const Share2$3 = createLucideIcon$1("share-2", [["circle", {
  "cx": "18",
  "cy": "5",
  "r": "3"
}], ["circle", {
  "cx": "6",
  "cy": "12",
  "r": "3"
}], ["circle", {
  "cx": "18",
  "cy": "19",
  "r": "3"
}], ["path", {
  "d": "m8.59 13.51l6.83 3.98m-.01-10.98l-6.82 3.98"
}]], "0 0 24 24", false);
const ShoppingBag$3 = createLucideIcon$1("shopping-bag", [["path", {
  "d": "M16 10a4 4 0 0 1-8 0M3.103 6.034h17.794"
}], ["path", {
  "d": "M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"
}]], "0 0 24 24", false);
const Square$3 = createLucideIcon$1("square", [["rect", {
  "width": "18",
  "height": "18",
  "x": "3",
  "y": "3",
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "rx": "2"
}]], "0 0 24 24", false);
const Trash2$3 = createLucideIcon$1("trash-2", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M10 11v6m4-6v6m5-11v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
}]], "0 0 24 24", false);
const Ungroup$1 = createLucideIcon$1("ungroup", [["rect", {
  "width": "8",
  "height": "6",
  "x": "5",
  "y": "4",
  "rx": "1"
}], ["rect", {
  "width": "8",
  "height": "6",
  "x": "11",
  "y": "14",
  "rx": "1"
}]], "0 0 24 24", false);
const Video$3 = createLucideIcon$1("video", [["path", {
  "d": "m16 13l5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"
}], ["rect", {
  "width": "14",
  "height": "12",
  "x": "2",
  "y": "6",
  "rx": "2"
}]], "0 0 24 24", false);
const Wrench$3 = createLucideIcon$1("wrench", [["path", {
  "fill": "none",
  "stroke": "currentColor",
  "strokeLinecap": "round",
  "strokeLinejoin": "round",
  "strokeWidth": "2",
  "d": "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
}]], "0 0 24 24", false);
const IconCompositingContext = reactExports.createContext(true);
const ICON_CLASS_FILTERS = "var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)";
function withIconCompositing(Glyph) {
  const Composited = reactExports.forwardRef(function CompositedIcon({
    children: children2,
    style: style2,
    color: color2 = "currentColor",
    stroke,
    fill,
    className,
    ...props
  }, ref) {
    const id2 = `icon-paint-${reactExports.useId().replace(/:/g, "")}`;
    const enabled = reactExports.useContext(IconCompositingContext);
    const strokePaint = style2?.stroke ?? stroke ?? color2;
    const fillPaint = style2?.fill ?? fill;
    const layered = fillPaint && fillPaint !== "none" && fillPaint !== "currentColor" && fillPaint !== strokePaint && strokePaint !== "none";
    if (!enabled || layered) {
      return /* @__PURE__ */jsxRuntimeExports.jsx(Glyph, {
        ...props,
        ...(stroke === void 0 ? {} : {
          stroke
        }),
        ...(fill === void 0 ? {} : {
          fill
        }),
        ref,
        style: style2,
        color: color2,
        className,
        children: children2
      });
    }
    const paint = strokePaint === "none" ? fillPaint ?? color2 : strokePaint;
    const fillsCurrentColor = /(?:^|\s)fill-current(?:\s|$)/.test(className ?? "");
    return /* @__PURE__ */jsxRuntimeExports.jsxs(Glyph, {
      ...props,
      ref,
      color: color2,
      stroke: stroke ?? color2,
      fill: fill ?? "none",
      className,
      "data-icon-compositing": "color-union",
      style: {
        ...style2,
        stroke: strokePaint === "none" ? "none" : `rgb(from ${strokePaint} r g b / 1)`,
        ...(fillsCurrentColor || fillPaint && fillPaint !== "none" ? {
          fill: `rgb(from ${fillPaint ?? "currentColor"} r g b / 1)`
        } : {}),
        filter: [`url(#${id2})`, (style2?.filter ?? props.filter) === "none" ? void 0 : style2?.filter ?? props.filter ?? ICON_CLASS_FILTERS].filter(Boolean).join(" ")
      },
      children: [/* @__PURE__ */jsxRuntimeExports.jsx("defs", {
        children: /* @__PURE__ */jsxRuntimeExports.jsxs("filter", {
          filterUnits: "userSpaceOnUse",
          id: id2,
          x: "-50%",
          y: "-50%",
          width: "200%",
          height: "200%",
          colorInterpolationFilters: "sRGB",
          children: [/* @__PURE__ */jsxRuntimeExports.jsx("feFlood", {
            floodColor: paint
          }), /* @__PURE__ */jsxRuntimeExports.jsx("feComposite", {
            in2: "SourceGraphic",
            operator: "in"
          })]
        })
      }), children2]
    });
  });
  Composited.displayName = `Composited(${Glyph.displayName ?? "Icon"})`;
  return Composited;
}
const TONES = {
  muted: {
    color: "var(--icon-muted-ink)",
    alpha: "var(--icon-muted-alpha)"
  },
  topbar: {
    color: "var(--icon-topbar-ink)",
    alpha: "var(--icon-topbar-alpha)"
  },
  "canvas-muted": {
    color: "var(--canvas-controls-text-muted-solid)",
    alpha: "var(--canvas-controls-text-muted-opacity)"
  },
  control: {
    color: "var(--icon-control-ink, var(--foreground))",
    alpha: "var(--icon-control-alpha, 1)"
  }
};
function MonochromeIcon({
  children: children2,
  tone
}) {
  const {
    color: color2,
    alpha: alpha2
  } = TONES[tone];
  const style2 = children2.props.style;
  const existingFilter = style2?.filter && style2.filter !== "none" ? `${style2.filter} ` : "";
  return reactExports.cloneElement(children2, {
    "data-icon-tone": tone,
    style: {
      ...style2,
      color: color2,
      filter: `${existingFilter}opacity(${alpha2})`
    }
  });
}
const CompositedSvg = reactExports.forwardRef(function CompositedSvg2({
  children: children2,
  style: style2,
  ...props
}, ref) {
  const id2 = `icon-paint-${reactExports.useId().replace(/:/g, "")}`;
  const enabled = reactExports.useContext(IconCompositingContext);
  if (!enabled) return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: forwards the existing caller accessibility attributes and title.
    /* @__PURE__ */
    jsxRuntimeExports.jsx("svg", {
      ...props,
      ref,
      style: style2,
      children: children2
    })
  );
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: forwards the existing caller accessibility attributes and title.
    /* @__PURE__ */
    jsxRuntimeExports.jsxs("svg", {
      ...props,
      ref,
      "data-icon-compositing": "color-union",
      style: {
        ...style2,
        filter: [`url(#${id2})`, (style2?.filter ?? props.filter) === "none" ? void 0 : style2?.filter ?? props.filter ?? ICON_CLASS_FILTERS].filter(Boolean).join(" ")
      },
      children: [/* @__PURE__ */jsxRuntimeExports.jsx("defs", {
        children: /* @__PURE__ */jsxRuntimeExports.jsxs("filter", {
          filterUnits: "userSpaceOnUse",
          id: id2,
          x: "-50%",
          y: "-50%",
          width: "200%",
          height: "200%",
          colorInterpolationFilters: "sRGB",
          children: [/* @__PURE__ */jsxRuntimeExports.jsx("feFlood", {
            floodColor: "currentColor"
          }), /* @__PURE__ */jsxRuntimeExports.jsx("feComposite", {
            in2: "SourceGraphic",
            operator: "in"
          })]
        })
      }), /* @__PURE__ */jsxRuntimeExports.jsx("g", {
        style: {
          color: "rgb(from currentColor r g b / 1)"
        },
        children: children2
      })]
    })
  );
});
function createMediaIcon(name2, geometry) {
  const Icon2 = reactExports.forwardRef(function MediaIcon({
    size: size2 = 24,
    absoluteStrokeWidth: _absoluteStrokeWidth,
    children: children2,
    className,
    ...props
  }, ref) {
    return /* @__PURE__ */jsxRuntimeExports.jsxs(CompositedSvg, {
      width: size2,
      height: size2,
      "aria-hidden": "true",
      ...props,
      ref,
      className: `lucide lucide-${name2.toLowerCase()}${className ? ` ${className}` : ""}`,
      viewBox: "0 0 12 12",
      fill: "currentColor",
      stroke: "none",
      "data-media-icon": name2,
      children: [/* @__PURE__ */jsxRuntimeExports.jsx("g", {
        fill: "currentColor",
        stroke: "none",
        children: geometry
      }), children2]
    });
  });
  Icon2.displayName = `Playback${name2}Icon`;
  return Icon2;
}
const PlaybackPlayIcon$1 = createMediaIcon("Play", /* @__PURE__ */jsxRuntimeExports.jsx("path", {
  d: "M3.1 2.35c0-.58.63-.94 1.13-.65l5.42 3.13c.5.29.5 1.01 0 1.3L4.23 9.3c-.5.29-1.13-.07-1.13-.65v-6.3Z"
}));
const PlaybackPauseIcon$1 = createMediaIcon("Pause", /* @__PURE__ */jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
  children: [/* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "3",
    y: "1.8",
    width: "2.1",
    height: "8.4",
    rx: "0.7"
  }), /* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "6.9",
    y: "1.8",
    width: "2.1",
    height: "8.4",
    rx: "0.7"
  })]
}));
const PlaybackStopIcon$1 = createMediaIcon("Stop", /* @__PURE__ */jsxRuntimeExports.jsx("rect", {
  x: "2.5",
  y: "2.5",
  width: "7",
  height: "7",
  rx: "1"
}));
const nextGeometry = /* @__PURE__ */jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, {
  children: [/* @__PURE__ */jsxRuntimeExports.jsx("path", {
    d: "M2.5 2.75Q2.5 2 3.15 2.4L7.85 5.6Q8.5 6 7.85 6.4L3.15 9.6Q2.5 10 2.5 9.25Z"
  }), /* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "9",
    y: "2.25",
    width: "1.25",
    height: "7.5",
    rx: "0.5"
  })]
});
const PlaybackNextIcon$1 = createMediaIcon("Next", nextGeometry);
const PlaybackPreviousIcon$1 = createMediaIcon("Previous", /* @__PURE__ */jsxRuntimeExports.jsx("g", {
  transform: "translate(12 0) scale(-1 1)",
  children: nextGeometry
}));
const Brain$2 = /* @__PURE__ */withIconCompositing(Brain$3);
const Check$2 = /* @__PURE__ */withIconCompositing(Check$3);
const ChevronDown$2 = /* @__PURE__ */withIconCompositing(ChevronDown$3);
const CircleAlert$2 = /* @__PURE__ */withIconCompositing(CircleAlert$3);
const Clapperboard$2 = /* @__PURE__ */withIconCompositing(Clapperboard$3);
const Download$2 = /* @__PURE__ */withIconCompositing(Download$3);
const ExternalLink$2 = /* @__PURE__ */withIconCompositing(ExternalLink$3);
const Eye$2 = /* @__PURE__ */withIconCompositing(Eye$3);
const File$3 = /* @__PURE__ */withIconCompositing(File$4);
const Film$2 = /* @__PURE__ */withIconCompositing(Film$3);
const FolderInput$2 = /* @__PURE__ */withIconCompositing(FolderInput$3);
const Headphones$2 = /* @__PURE__ */withIconCompositing(Headphones$3);
const Megaphone$2 = /* @__PURE__ */withIconCompositing(Megaphone$3);
const Music$2 = /* @__PURE__ */withIconCompositing(Music$3);
const Package$2 = /* @__PURE__ */withIconCompositing(Package$3);
const Plus$2 = /* @__PURE__ */withIconCompositing(Plus$3);
const Search$2 = /* @__PURE__ */withIconCompositing(Search$3);
const Share2$2 = /* @__PURE__ */withIconCompositing(Share2$3);
const ShoppingBag$2 = /* @__PURE__ */withIconCompositing(ShoppingBag$3);
const Square$2 = /* @__PURE__ */withIconCompositing(Square$3);
const Trash2$2 = /* @__PURE__ */withIconCompositing(Trash2$3);
const Video$2 = /* @__PURE__ */withIconCompositing(Video$3);
const Wrench$2 = /* @__PURE__ */withIconCompositing(Wrench$3);
function isRecord$g(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function satisfiesMinHubVersion(minHubVersion, appVersion) {
  if (!minHubVersion) return true;
  if (parseSemver(minHubVersion) === null) return false;
  if (!appVersion || parseSemver(appVersion) === null) return true;
  return compareSemver(appVersion, minHubVersion) >= 0;
}
function isDynamicallyDeliverable(manifest) {
  const {
    mcp,
    cli,
    skills
  } = manifest.capabilities;
  if (!mcp && !cli && !(skills && skills.length > 0)) return false;
  const managedInterpreter = mcp?.kind === "local" && (mcp.launch.command === "node" || mcp.launch.command === "python");
  if (mcp?.kind === "local" && managedInterpreter && !mcp.bundle && !mcp.pypi) return false;
  if (cli && cli.install.strategy === "bundle" && !cli.install.bundle) {
    const ridesMcpBundle = mcp?.kind === "local" && mcp.bundle !== void 0 && mcp.packageName === cli.packageName;
    if (!ridesMcpBundle) return false;
  }
  const pathSkills = (skills ?? []).filter(skill => skill.path !== void 0);
  if (pathSkills.length > 0 && !(mcp?.kind === "local" && mcp.bundle)) return false;
  return true;
}
function buildHcpCatalogEntries(dynamic) {
  const skipped = [];
  const byConnectorId = /* @__PURE__ */new Map();
  for (const manifest of dynamic) {
    if (!isDynamicallyDeliverable(manifest)) {
      skipped.push({
        connectorId: manifest.connectorId,
        reason: "requires_release"
      });
      continue;
    }
    if (byConnectorId.has(manifest.connectorId)) continue;
    byConnectorId.set(manifest.connectorId, manifest);
  }
  const entries2 = [...byConnectorId.values()].map(manifest => ({
    manifest,
    source: "dynamic"
  }));
  entries2.sort((a2, b3) => a2.manifest.order - b3.manifest.order);
  return {
    entries: entries2,
    skipped
  };
}
function emptyConnectorMarketPolicy() {
  return {
    permission: {
      isOperator: false
    },
    visibility: {
      visibleConnectorIds: []
    }
  };
}
function findConnectorMentions(text2) {
  return [...text2.matchAll(new RegExp(String.raw`(?<=^|\s)${CONNECTOR_TOKEN_SOURCE}`, "gu"))].map(match2 => ({
    serverName: match2[1],
    ...(match2[2] ? {
      displayName: match2[2]
    } : {}),
    start: match2.index,
    end: match2.index + match2[0].length
  }));
}







const createStoreImpl = createState2 => {
  let state2;
  const listeners2 = /* @__PURE__ */new Set();
  const setState = (partial, replace2) => {
    const nextState = typeof partial === "function" ? partial(state2) : partial;
    if (!Object.is(nextState, state2)) {
      const previousState = state2;
      state2 = (replace2 != null ? replace2 : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state2, nextState);
      listeners2.forEach(listener => listener(state2, previousState));
    }
  };
  const getState = () => state2;
  const getInitialState2 = () => initialState;
  const subscribe2 = listener => {
    listeners2.add(listener);
    return () => listeners2.delete(listener);
  };
  const api = {
    setState,
    getState,
    getInitialState: getInitialState2,
    subscribe: subscribe2
  };
  const initialState = state2 = createState2(setState, getState, api);
  return api;
};
const createStore$1 = createState2 => createState2 ? createStoreImpl(createState2) : createStoreImpl;
const identity = arg => arg;
function useStore$2(api, selector2 = identity) {
  const slice2 = React.useSyncExternalStore(api.subscribe, React.useCallback(() => selector2(api.getState()), [api, selector2]), React.useCallback(() => selector2(api.getInitialState()), [api, selector2]));
  React.useDebugValue(slice2);
  return slice2;
}
const createImpl = createState2 => {
  const api = createStore$1(createState2);
  const useBoundStore = selector2 => useStore$2(api, selector2);
  Object.assign(useBoundStore, api);
  return useBoundStore;
};
const create$2 = createState2 => createState2 ? createImpl(createState2) : createImpl;
const playGeometry = /* @__PURE__ */jsxRuntimeExports.jsx("path", {
  d: "M6.13281 5.74789C6.13286 5.37642 6.53561 5.14439 6.85742 5.32992L11.04 7.74301C11.3621 7.92878 11.3621 8.39318 11.04 8.57895L6.85742 10.992C6.53566 11.1775 6.13295 10.9454 6.13281 10.5741V5.74789Z",
  fill: "var(--primary-foreground)"
});
const pauseGeometry = /* @__PURE__ */jsxRuntimeExports.jsxs("g", {
  fill: "var(--media-circle-pause-foreground, var(--primary-foreground))",
  children: [/* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "5.3335",
    y: "5.16663",
    width: "1.88889",
    height: "5.66667",
    rx: "0.472222"
  }), /* @__PURE__ */jsxRuntimeExports.jsx("rect", {
    x: "8.82227",
    y: "5.16663",
    width: "1.88889",
    height: "5.66667",
    rx: "0.472222"
  })]
});
const CircleMediaSvg = reactExports.forwardRef(function CircleMediaSvg2({
  size: size2 = 16,
  absoluteStrokeWidth: _absoluteStrokeWidth,
  iconName,
  children: children2,
  ...props
}, ref) {
  return /* @__PURE__ */jsxRuntimeExports.jsxs("svg", {
    width: size2,
    height: size2,
    "aria-hidden": "true",
    ...props,
    ref,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "none",
    "data-media-icon": `Circle${iconName}`,
    children: [/* @__PURE__ */jsxRuntimeExports.jsx("circle", {
      cx: "8",
      cy: "8",
      r: "8",
      fill: "var(--primary)"
    }), children2]
  });
});
function createCircleMediaIcon(name2, geometry) {
  const Icon2 = reactExports.forwardRef(function CircleMediaIcon({
    children: children2,
    ...props
  }, ref) {
    return /* @__PURE__ */jsxRuntimeExports.jsxs(CircleMediaSvg, {
      ...props,
      ref,
      iconName: name2,
      children: [geometry, children2]
    });
  });
  Icon2.displayName = `PlaybackCircle${name2}Icon`;
  return Icon2;
}
const PlaybackCirclePlayIcon$1 = createCircleMediaIcon("Play", playGeometry);
const PlaybackCirclePauseIcon$1 = createCircleMediaIcon("Pause", pauseGeometry);
const PlaybackCircleToggleIcon = reactExports.forwardRef(function PlaybackCircleToggleIcon2({
  playing = false,
  children: children2,
  ...props
}, ref) {
  return /* @__PURE__ */jsxRuntimeExports.jsxs(CircleMediaSvg, {
    ...props,
    ref,
    iconName: playing ? "Pause" : "Play",
    children: [[{
      name: "play",
      visible: !playing,
      geometry: playGeometry
    }, {
      name: "pause",
      visible: playing,
      geometry: pauseGeometry
    }].map(({
      name: name2,
      visible,
      geometry
    }) => /* @__PURE__ */jsxRuntimeExports.jsx("g", {
      "data-playback-glyph": name2,
      className: `origin-center [transform-box:view-box] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none ${visible ? "scale-100 opacity-100" : "scale-60 opacity-0"}`,
      children: geometry
    }, name2)), children2]
  });
});
const Plus$1 = createLucideIcon("Plus", [["path", {
  d: "M12 5.5v13",
  key: "ov-plus-v"
}], ["path", {
  d: "M5.5 12h13",
  key: "ov-plus-h"
}], ["circle", {
  cx: "12",
  cy: "5.5",
  r: "1.7",
  key: "ov-plus-top"
}], ["circle", {
  cx: "12",
  cy: "18.5",
  r: "1.7",
  key: "ov-plus-bottom"
}]]);
const ActivityIcon = /* @__PURE__ */withIconCompositing(Activity);
const AlertCircle = /* @__PURE__ */withIconCompositing(CircleAlert$1);
const AlertTriangle = /* @__PURE__ */withIconCompositing(TriangleAlert$1);
const AlertTriangleIcon = /* @__PURE__ */withIconCompositing(TriangleAlert$1);
const AppWindow = /* @__PURE__ */withIconCompositing(AppWindow$1);
const Archive = /* @__PURE__ */withIconCompositing(Archive$1);
const ArrowDown = /* @__PURE__ */withIconCompositing(ArrowDown$1);
const ArrowDownToLine = /* @__PURE__ */withIconCompositing(ArrowDownToLine$1);
const ArrowLeft = /* @__PURE__ */withIconCompositing(ArrowLeft$1);
const ArrowLeftRight = /* @__PURE__ */withIconCompositing(ArrowLeftRight$1);
const ArrowLeftToLine = /* @__PURE__ */withIconCompositing(ArrowLeftToLine$1);
const ArrowRight = /* @__PURE__ */withIconCompositing(ArrowRight$1);
const ArrowRightToLine = /* @__PURE__ */withIconCompositing(ArrowRightToLine$1);
const ArrowUp = /* @__PURE__ */withIconCompositing(ArrowUp$1);
const ArrowUpDown = /* @__PURE__ */withIconCompositing(ArrowUpDown$1);
const ArrowUpFromLine = /* @__PURE__ */withIconCompositing(ArrowUpFromLine$1);
const ArrowUpRight = /* @__PURE__ */withIconCompositing(ArrowUpRight$1);
const ArrowUpToLine = /* @__PURE__ */withIconCompositing(ArrowUpToLine$1);
const AtSign = /* @__PURE__ */withIconCompositing(AtSign$1);
const AudioLines = /* @__PURE__ */withIconCompositing(AudioLines$1);
const AudioWaveform$1 = /* @__PURE__ */withIconCompositing(AudioWaveform$2);
const BadgeCheck = /* @__PURE__ */withIconCompositing(BadgeCheck$1);
const BadgeInfo = /* @__PURE__ */withIconCompositing(BadgeInfo$1);
const Bell = /* @__PURE__ */withIconCompositing(Bell$1);
const BellRing = /* @__PURE__ */withIconCompositing(BellRing$1);
const Bold$1 = /* @__PURE__ */withIconCompositing(Bold$2);
const BookUser = /* @__PURE__ */withIconCompositing(BookUser$1);
const Bot = /* @__PURE__ */withIconCompositing(Bot$1);
const Box = /* @__PURE__ */withIconCompositing(Box$1);
const Boxes = /* @__PURE__ */withIconCompositing(Boxes$1);
const BoxSelect = /* @__PURE__ */withIconCompositing(SquareDashed$1);
const Bug = /* @__PURE__ */withIconCompositing(Bug$1);
const Calculator = /* @__PURE__ */withIconCompositing(Calculator$1);
const ChartNoAxesCombined = /* @__PURE__ */withIconCompositing(ChartNoAxesCombined$1);
const Check = /* @__PURE__ */withIconCompositing(Check$1);
const CheckCheck = /* @__PURE__ */withIconCompositing(CheckCheck$1);
const CheckCircle2 = /* @__PURE__ */withIconCompositing(CircleCheck);
const CheckCircle2Icon = /* @__PURE__ */withIconCompositing(CircleCheck);
const ChevronDown = /* @__PURE__ */withIconCompositing(ChevronDown$1);
const ChevronDownIcon$1 = /* @__PURE__ */withIconCompositing(ChevronDown$1);
const ChevronLeft = /* @__PURE__ */withIconCompositing(ChevronLeft$1);
const ChevronLeftIcon = /* @__PURE__ */withIconCompositing(ChevronLeft$1);
const ChevronRight$1 = /* @__PURE__ */withIconCompositing(ChevronRight$2);
const ChevronRightIcon = /* @__PURE__ */withIconCompositing(ChevronRight$2);
const ChevronUp = /* @__PURE__ */withIconCompositing(ChevronUp$1);
const ChevronUpIcon = /* @__PURE__ */withIconCompositing(ChevronUp$1);
const CircleAlert = /* @__PURE__ */withIconCompositing(CircleAlert$1);
const CircleArrowUp = /* @__PURE__ */withIconCompositing(CircleArrowUp$1);
const CircleCheckIcon = /* @__PURE__ */withIconCompositing(CircleCheck);
const CircleIcon = /* @__PURE__ */withIconCompositing(Circle$1);
const CircleMinus = /* @__PURE__ */withIconCompositing(CircleMinus$1);
const CircleX = /* @__PURE__ */withIconCompositing(CircleX$1);
const ClipboardIcon = /* @__PURE__ */withIconCompositing(Clipboard);
const ClipboardList = /* @__PURE__ */withIconCompositing(ClipboardList$1);
const Cloud = /* @__PURE__ */withIconCompositing(Cloud$1);
const CloudDownload = /* @__PURE__ */withIconCompositing(CloudDownload$1);
const CloudIcon = /* @__PURE__ */withIconCompositing(Cloud$1);
const CloudUpload = /* @__PURE__ */withIconCompositing(CloudUpload$1);
const Code$1 = /* @__PURE__ */withIconCompositing(Code$2);
const Cog = /* @__PURE__ */withIconCompositing(Cog$1);
const Command = /* @__PURE__ */withIconCompositing(Command$1);
const Compass = /* @__PURE__ */withIconCompositing(Compass$1);
const Copy = /* @__PURE__ */withIconCompositing(Copy$1);
const CopyPlus = /* @__PURE__ */withIconCompositing(CopyPlus$1);
const CreditCard = /* @__PURE__ */withIconCompositing(CreditCard$1);
const Crosshair = /* @__PURE__ */withIconCompositing(Crosshair$1);
const Crown = /* @__PURE__ */withIconCompositing(Crown$1);
const DownloadIcon = /* @__PURE__ */withIconCompositing(Download$1);
const Ellipsis = /* @__PURE__ */withIconCompositing(Ellipsis$1);
const ExternalLink = /* @__PURE__ */withIconCompositing(ExternalLink$1);
const Eye = /* @__PURE__ */withIconCompositing(Eye$1);
const EyeIcon$1 = /* @__PURE__ */withIconCompositing(Eye$1);
const EyeOff = /* @__PURE__ */withIconCompositing(EyeOff$1);
const EyeOffIcon$1 = /* @__PURE__ */withIconCompositing(EyeOff$1);
const FileImage = /* @__PURE__ */withIconCompositing(FileImage$1);
const FilePlus2 = /* @__PURE__ */withIconCompositing(FilePlus2$1);
const Film = /* @__PURE__ */withIconCompositing(Film$1);
const FolderClock = /* @__PURE__ */withIconCompositing(FolderClock$1);
const FolderClosed = /* @__PURE__ */withIconCompositing(FolderClosed$1);
const FolderInput = /* @__PURE__ */withIconCompositing(FolderInput$1);
const FolderMinus = /* @__PURE__ */withIconCompositing(FolderMinus$1);
const FolderOpenIcon = /* @__PURE__ */withIconCompositing(FolderOpen$1);
const FolderPlus = /* @__PURE__ */withIconCompositing(FolderPlus$1);
const FolderUp = /* @__PURE__ */withIconCompositing(FolderUp$1);
const FolderX = /* @__PURE__ */withIconCompositing(FolderX$1);
const Gauge = /* @__PURE__ */withIconCompositing(Gauge$1);
const GiftIcon = /* @__PURE__ */withIconCompositing(Gift);
const GitCompare = /* @__PURE__ */withIconCompositing(GitCompare$1);
const Globe = /* @__PURE__ */withIconCompositing(Globe$1);
const Globe2 = /* @__PURE__ */withIconCompositing(Earth);
const GraduationCap = /* @__PURE__ */withIconCompositing(GraduationCap$1);
const Grid2X2 = /* @__PURE__ */withIconCompositing(Grid2x2);
const Grid2x2Plus = /* @__PURE__ */withIconCompositing(Grid2x2Plus$1);
const Grid3X3 = /* @__PURE__ */withIconCompositing(Grid3x3);
const GripHorizontalIcon = /* @__PURE__ */withIconCompositing(GripHorizontal);
const GripVertical = /* @__PURE__ */withIconCompositing(GripVertical$1);
const Hand = /* @__PURE__ */withIconCompositing(Hand$1);
const Headphones = /* @__PURE__ */withIconCompositing(Headphones$1);
const HistoryIcon = /* @__PURE__ */withIconCompositing(History$1);
const Home = /* @__PURE__ */withIconCompositing(House);
const ImagePlus = /* @__PURE__ */withIconCompositing(ImagePlus$1);
const Import = /* @__PURE__ */withIconCompositing(Import$1);
const Inbox = /* @__PURE__ */withIconCompositing(Inbox$1);
const Info$1 = /* @__PURE__ */withIconCompositing(Info$2);
const InfoIcon$1 = /* @__PURE__ */withIconCompositing(Info$2);
const Italic$1 = /* @__PURE__ */withIconCompositing(Italic$2);
const KeyRound = /* @__PURE__ */withIconCompositing(KeyRound$1);
const Keyboard = /* @__PURE__ */withIconCompositing(Keyboard$1);
const Languages = /* @__PURE__ */withIconCompositing(Languages$1);
const Layers = /* @__PURE__ */withIconCompositing(Layers$1);
const Layers2 = /* @__PURE__ */withIconCompositing(Layers2$1);
const Layers3 = /* @__PURE__ */withIconCompositing(Layers$1);
const LayoutGrid = /* @__PURE__ */withIconCompositing(LayoutGrid$1);
const LayoutList = /* @__PURE__ */withIconCompositing(LayoutList$1);
const LayoutTemplate = /* @__PURE__ */withIconCompositing(LayoutTemplate$1);
const Library = /* @__PURE__ */withIconCompositing(Library$1);
const Lightbulb = /* @__PURE__ */withIconCompositing(Lightbulb$1);
const Link2 = /* @__PURE__ */withIconCompositing(Link2$1);
const ListChecks = /* @__PURE__ */withIconCompositing(ListChecks$1);
const Loader2 = /* @__PURE__ */withIconCompositing(LoaderCircle$1);
const Loader2Icon = /* @__PURE__ */withIconCompositing(LoaderCircle$1);
const LoaderCircle = /* @__PURE__ */withIconCompositing(LoaderCircle$1);
const Lock = /* @__PURE__ */withIconCompositing(Lock$1);
const LockKeyhole = /* @__PURE__ */withIconCompositing(LockKeyhole$1);
const Mail = /* @__PURE__ */withIconCompositing(Mail$1);
const Map$1 = /* @__PURE__ */withIconCompositing(Map$2);
const MapPin = /* @__PURE__ */withIconCompositing(MapPin$1);
const Maximize = /* @__PURE__ */withIconCompositing(Maximize$1);
const MessageCircle = /* @__PURE__ */withIconCompositing(MessageCircle$1);
const MessageCircleMore = /* @__PURE__ */withIconCompositing(MessageCircleMore$1);
const MessageSquareMore = /* @__PURE__ */withIconCompositing(MessageSquareMore$1);
const Minus = /* @__PURE__ */withIconCompositing(Minus$1);
const MinusIcon = /* @__PURE__ */withIconCompositing(Minus$1);
const Monitor = /* @__PURE__ */withIconCompositing(Monitor$1);
const MonitorUp = /* @__PURE__ */withIconCompositing(MonitorUp$1);
const MoreHorizontal = /* @__PURE__ */withIconCompositing(Ellipsis$1);
const Music = /* @__PURE__ */withIconCompositing(Music$1);
const Music2 = /* @__PURE__ */withIconCompositing(Music2$1);
const Network = /* @__PURE__ */withIconCompositing(Network$1);
const Newspaper = /* @__PURE__ */withIconCompositing(Newspaper$1);
const NotebookPen = /* @__PURE__ */withIconCompositing(NotebookPen$1);
const OctagonXIcon = /* @__PURE__ */withIconCompositing(OctagonX);
const PackageSearch = /* @__PURE__ */withIconCompositing(PackageSearch$1);
const Palette = /* @__PURE__ */withIconCompositing(Palette$1);
const PanelBottomClose = /* @__PURE__ */withIconCompositing(PanelBottomClose$1);
const PanelLeftClose = /* @__PURE__ */withIconCompositing(PanelLeftClose$1);
const PanelLeftOpen = /* @__PURE__ */withIconCompositing(PanelLeftOpen$1);
const PanelRightClose = /* @__PURE__ */withIconCompositing(PanelRightClose$1);
const PanelRightOpen = /* @__PURE__ */withIconCompositing(PanelRightOpen$1);
const PanelsTopLeft = /* @__PURE__ */withIconCompositing(PanelsTopLeft$1);
const Pencil = /* @__PURE__ */withIconCompositing(Pencil$1);
const PencilRuler = /* @__PURE__ */withIconCompositing(PencilRuler$1);
const Phone = /* @__PURE__ */withIconCompositing(Phone$1);
const Pin = /* @__PURE__ */withIconCompositing(Pin$1);
const PinIcon = /* @__PURE__ */withIconCompositing(Pin$1);
const PinOff = /* @__PURE__ */withIconCompositing(PinOff$1);
const Plus = /* @__PURE__ */withIconCompositing(Plus$1);
const PlusCircle = /* @__PURE__ */withIconCompositing(CirclePlus);
const Podcast = /* @__PURE__ */withIconCompositing(Podcast$1);
const Power = /* @__PURE__ */withIconCompositing(Power$1);
const Redo2 = /* @__PURE__ */withIconCompositing(Redo2$1);
const Regex = /* @__PURE__ */withIconCompositing(Regex$1);
const Repeat2 = /* @__PURE__ */withIconCompositing(Repeat2$1);
const RotateCcw = /* @__PURE__ */withIconCompositing(RotateCcw$1);
const RotateCw = /* @__PURE__ */withIconCompositing(RotateCw$1);
const Save = /* @__PURE__ */withIconCompositing(Save$1);
const Scan = /* @__PURE__ */withIconCompositing(Scan$1);
const Scissors = /* @__PURE__ */withIconCompositing(Scissors$1);
const ScrollText = /* @__PURE__ */withIconCompositing(ScrollText$1);
const Search = /* @__PURE__ */withIconCompositing(Search$1);
const SearchIcon = /* @__PURE__ */withIconCompositing(Search$1);
const Send = /* @__PURE__ */withIconCompositing(Send$1);
const ServerIcon = /* @__PURE__ */withIconCompositing(Server);
const ServerOff = /* @__PURE__ */withIconCompositing(ServerOff$1);
const Share2 = /* @__PURE__ */withIconCompositing(Share2$1);
const ShieldAlert = /* @__PURE__ */withIconCompositing(ShieldAlert$1);
const ShieldCheck = /* @__PURE__ */withIconCompositing(ShieldCheck$1);
const ShieldCheckIcon = /* @__PURE__ */withIconCompositing(ShieldCheck$1);
const ShieldOff = /* @__PURE__ */withIconCompositing(ShieldOff$1);
const Shuffle = /* @__PURE__ */withIconCompositing(Shuffle$1);
const Slash = /* @__PURE__ */withIconCompositing(Slash$1);
const Smartphone = /* @__PURE__ */withIconCompositing(Smartphone$1);
const Speech = /* @__PURE__ */withIconCompositing(Speech$1);
const Split = /* @__PURE__ */withIconCompositing(Split$1);
const SquareDashed = /* @__PURE__ */withIconCompositing(SquareDashed$1);
const SquareMousePointer = /* @__PURE__ */withIconCompositing(SquareMousePointer$1);
const StickyNote = /* @__PURE__ */withIconCompositing(StickyNote$1);
const Sun = /* @__PURE__ */withIconCompositing(Sun$1);
const SwatchBook = /* @__PURE__ */withIconCompositing(SwatchBook$1);
const Tag$1 = /* @__PURE__ */withIconCompositing(Tag$2);
const ThumbsDown = /* @__PURE__ */withIconCompositing(ThumbsDown$1);
const ThumbsUp = /* @__PURE__ */withIconCompositing(ThumbsUp$1);
const Trash2Icon = /* @__PURE__ */withIconCompositing(Trash2$1);
const TrendingUp = /* @__PURE__ */withIconCompositing(TrendingUp$1);
const TriangleAlert = /* @__PURE__ */withIconCompositing(TriangleAlert$1);
const TriangleAlertIcon = /* @__PURE__ */withIconCompositing(TriangleAlert$1);
const Tv = /* @__PURE__ */withIconCompositing(Tv$1);
const Underline$1 = /* @__PURE__ */withIconCompositing(Underline$2);
const Undo2 = /* @__PURE__ */withIconCompositing(Undo2$1);
const UploadIcon$1 = /* @__PURE__ */withIconCompositing(Upload$1);
const User = /* @__PURE__ */withIconCompositing(User$1);
const UserRound = /* @__PURE__ */withIconCompositing(UserRound$1);
const UserRoundPlus = /* @__PURE__ */withIconCompositing(UserRoundPlus$1);
const UsersIcon = /* @__PURE__ */withIconCompositing(Users$1);
const Video = /* @__PURE__ */withIconCompositing(Video$1);
const VideoOff = /* @__PURE__ */withIconCompositing(VideoOff$1);
const Volume2 = /* @__PURE__ */withIconCompositing(Volume2$1);
const Volume2Icon = /* @__PURE__ */withIconCompositing(Volume2$1);
const VolumeXIcon = /* @__PURE__ */withIconCompositing(VolumeX$1);
const Wand2 = /* @__PURE__ */withIconCompositing(WandSparkles$1);
const WandSparkles = /* @__PURE__ */withIconCompositing(WandSparkles$1);
const WholeWord = /* @__PURE__ */withIconCompositing(WholeWord$1);
const WifiIcon = /* @__PURE__ */withIconCompositing(Wifi);
const WifiOff = /* @__PURE__ */withIconCompositing(WifiOff$1);
const WifiOffIcon = /* @__PURE__ */withIconCompositing(WifiOff$1);
const Workflow = /* @__PURE__ */withIconCompositing(Workflow$1);
const Wrench = /* @__PURE__ */withIconCompositing(Wrench$1);
const X$7 = /* @__PURE__ */withIconCompositing(X$8);
const XIcon = /* @__PURE__ */withIconCompositing(X$8);
const Zap = /* @__PURE__ */withIconCompositing(Zap$1);
const ZoomIn = /* @__PURE__ */withIconCompositing(ZoomIn$1);
const ZoomOut = /* @__PURE__ */withIconCompositing(ZoomOut$1);
function withArtworkOpacity(style2, opacity) {
  return {
    ...style2,
    filter: [style2?.filter === "none" ? void 0 : style2?.filter, `opacity(${opacity})`].filter(Boolean).join(" ")
  };
}
createSelectorCreator({
  memoize: lruMemoize,
  memoizeOptions: {
    maxSize: 1,
    equalityCheck: Object.is
  }
});


const BODY = "M98.2014 38.8205L98.2662 45.3986V103.694C98.2662 107.132 96.9005 110.429 94.4697 112.86C92.0389 115.29 88.7421 116.656 85.3044 116.656H20.4955C17.0578 116.656 13.7609 115.29 11.3301 112.86C8.8993 110.429 7.53369 107.132 7.53369 103.694V12.9618C7.53369 9.5241 8.8993 6.22722 11.3301 3.79642C13.7609 1.36561 17.0578 0 20.4955 0H54.6822C57.7217 0 60.6576 1.06287 62.9907 3.00713L95.8747 30.4602C97.3459 31.6916 98.2014 33.5127 98.2014 35.4375V38.8141V38.8205Z";
const FOLD = "M61.2405 4.17435C60.5923 3.62919 59.6022 4.08643 59.5969 4.93342L59.4548 27.6103C59.4538 28.6239 59.6531 29.6278 60.0412 30.5642C60.4294 31.5006 60.9987 32.3511 61.7165 33.0667C62.4344 33.7824 63.2866 34.3492 64.2241 34.7345C65.1617 35.1198 66.1662 35.316 67.1798 35.3119H95.5234C96.4565 35.3119 96.8812 34.1472 96.167 33.5466L61.2405 4.17435Z";
const ARCHIVE_ZIPPER = "M11.1768 32.8037C12.1608 32.8037 12.9589 33.6009 12.959 34.585C12.959 35.569 12.1608 36.3672 11.1768 36.3672H6.47949V39.2822H11.1768C12.1608 39.2822 12.959 40.0804 12.959 41.0645C12.9589 42.0484 12.1608 42.8457 11.1768 42.8457H6.47949V46.0859H1.78223C0.79817 46.0859 -8.60288e-08 45.2878 0 44.3037C9.98125e-05 43.3197 0.798231 42.5225 1.78223 42.5225H6.47949V39.6064H1.78223C0.79817 39.6064 -8.60288e-08 38.8083 0 37.8242C0.000227585 36.8404 0.79831 36.043 1.78223 36.043H6.47949V32.8037H11.1768ZM11.1768 26C12.1608 26 12.959 26.7982 12.959 27.7822C12.9588 28.7661 12.1607 29.5635 11.1768 29.5635H6.47949V32.8037H1.78223C0.798182 32.8037 1.94808e-05 32.0055 0 31.0215C8.60291e-08 30.0374 0.79817 29.2393 1.78223 29.2393H6.47949V26H11.1768ZM6.79492 0C9.82327 0.000105874 12.3238 2.36775 12.4883 5.3916L12.9961 14.7529C13.1891 18.3098 10.3571 21.2997 6.79492 21.2998C3.23269 21.2998 0.400744 18.3099 0.59375 14.7529L1.10254 5.3916C1.26706 2.36773 3.76653 3.69844e-05 6.79492 0ZM6.79492 10.5C4.45169 10.5 2.55176 12.3999 2.55176 14.7432C2.55192 17.0863 4.45179 18.9853 6.79492 18.9854C9.13799 18.9852 11.0379 17.0862 11.0381 14.7432C11.0381 12.4 9.13809 10.5001 6.79492 10.5Z";
const JPEG = "M15.9119 63.7994H20.071V75.8676C20.0653 76.9983 19.7955 77.9869 19.2614 78.8335C18.7273 79.6744 17.9886 80.3278 17.0455 80.7937C16.108 81.2596 15.0227 81.4926 13.7898 81.4926C12.6989 81.4926 11.7074 81.3023 10.8153 80.9216C9.92898 80.5409 9.22159 79.95 8.69318 79.1489C8.17045 78.3477 7.91193 77.3221 7.91761 76.0721H12.1193C12.1364 76.521 12.2216 76.9045 12.375 77.2227C12.5341 77.5352 12.7528 77.771 13.0312 77.9301C13.3097 78.0892 13.642 78.1687 14.0284 78.1687C14.4318 78.1687 14.7727 78.0835 15.0511 77.9131C15.3295 77.7369 15.5398 77.4784 15.6818 77.1375C15.8295 76.7966 15.9063 76.3733 15.9119 75.8676V63.7994ZM25.1195 81.254V63.7994H32.3297C33.6365 63.7994 34.7643 64.0551 35.7132 64.5665C36.6678 65.0721 37.4036 65.7795 37.9206 66.6886C38.4376 67.592 38.6962 68.6432 38.6962 69.842C38.6962 71.0466 38.432 72.1006 37.9036 73.004C37.3808 73.9017 36.6337 74.5977 35.6621 75.092C34.6905 75.5864 33.5371 75.8335 32.2018 75.8335H27.753V72.5096H31.4178C32.0541 72.5096 32.5854 72.3989 33.0115 72.1773C33.4433 71.9557 33.77 71.646 33.9916 71.2483C34.2132 70.8449 34.324 70.3761 34.324 69.842C34.324 69.3023 34.2132 68.8364 33.9916 68.4443C33.77 68.0466 33.4433 67.7398 33.0115 67.5239C32.5797 67.3079 32.0484 67.2 31.4178 67.2H29.3382V81.254H25.1195ZM43.1757 81.254V63.7994H55.3462V67.2256H47.3945V70.8051H54.724V74.2398H47.3945V77.8278H55.3462V81.254H43.1757ZM71.8428 69.5011C71.7462 69.1432 71.6041 68.8278 71.4166 68.5551C71.2291 68.2767 70.999 68.0409 70.7263 67.8477C70.4536 67.6545 70.1411 67.5096 69.7888 67.4131C69.4365 67.3108 69.0501 67.2596 68.6297 67.2596C67.7831 67.2596 67.0501 67.4642 66.4308 67.8733C65.8172 68.2824 65.3428 68.879 65.0075 69.6631C64.6723 70.4415 64.5047 71.3875 64.5047 72.5011C64.5047 73.6204 64.6666 74.575 64.9905 75.3648C65.3143 76.1545 65.7831 76.7568 66.3967 77.1716C67.0104 77.5864 67.7547 77.7937 68.6297 77.7937C69.4024 77.7937 70.0558 77.6687 70.5899 77.4187C71.1297 77.1631 71.5388 76.8023 71.8172 76.3364C72.0956 75.8704 72.2348 75.3221 72.2348 74.6915L73.0189 74.7852H68.7746V71.7085H76.3001V74.0182C76.3001 75.5807 75.9678 76.9187 75.303 78.0324C74.6439 79.146 73.7348 80.0011 72.5757 80.5977C71.4223 81.1943 70.0956 81.4926 68.5956 81.4926C66.9308 81.4926 65.4678 81.1318 64.2064 80.4102C62.945 79.6886 61.9621 78.6602 61.2575 77.325C60.553 75.9841 60.2007 74.3932 60.2007 72.5523C60.2007 71.1204 60.4138 69.8506 60.8399 68.7426C61.2661 67.629 61.8598 66.6858 62.6212 65.9131C63.3882 65.1403 64.2746 64.5551 65.2803 64.1574C66.2916 63.7596 67.3797 63.5608 68.5445 63.5608C69.5558 63.5608 70.4962 63.7057 71.3655 63.9954C72.2405 64.2852 73.0132 64.6943 73.6837 65.2227C74.3598 65.7511 74.9081 66.379 75.3286 67.1062C75.749 67.8335 76.0104 68.6318 76.1126 69.5011H71.8428Z";
const FILE_TYPE_EXTENSIONS = {
  photoshop: ["psd", "psb"],
  vector: ["ai", "eps", "svg"],
  pdf: ["pdf"],
  document: ["doc", "docx", "odt", "rtf"],
  spreadsheet: ["xls", "xlsx", "csv", "ods"],
  presentation: ["ppt", "pptx", "key", "odp"],
  image: ["jpg", "jpeg", "png", "webp", "gif", "heic", "tiff", "bmp", "avif"],
  video: ["mp4", "mov", "webm", "avi", "mkv"],
  design: ["fig", "sketch"],
  audio: ["mp3", "wav", "aac", "flac", "ogg", "m4a"],
  archive: ["zip", "rar", "7z", "tar", "gz"],
  code: ["txt", "md", "json", "js", "ts", "html", "css", "py", "xml", "yaml"]
};
const extensions = new Map(Object.entries(FILE_TYPE_EXTENSIONS).flatMap(([category, values3]) => values3.map(ext => [ext, category])));
for (const ext of ["tsx", "jsx", "vue", "svelte", "go", "rs", "java", "c", "cpp", "h", "hpp", "rb", "php", "swift", "kt", "scala", "sh", "bash", "zsh", "scss", "less", "sass", "yml", "toml", "jsonc", "log", "mjs", "cjs", "kts", "cc", "cs", "fish", "sql", "htm", "lua", "dart", "r", "proto", "srt", "vtt", "ass", "ssa"]) extensions.set(ext, "code");
for (const ext of ["bz2", "xz", "tgz"]) extensions.set(ext, "archive");
for (const ext of ["heif", "tif", "ico"]) extensions.set(ext, "image");
extensions.set("htable", "spreadsheet");
const exactMime = {
  "application/pdf": "pdf",
  "image/vnd.adobe.photoshop": "psd",
  "application/vnd.adobe.photoshop": "psd",
  "image/svg+xml": "svg",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/csv": "csv",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/json": "json",
  "application/zip": "zip"
};
function extensionOf$1(filename) {
  const leaf = filename?.split(/[\\/]/).pop() ?? "";
  if (leaf.includes("://") || filename?.includes("://")) return "";
  const dot2 = leaf.lastIndexOf(".");
  const extension2 = dot2 > 0 ? leaf.slice(dot2 + 1).toLowerCase() : "";
  return /^[a-z0-9][a-z0-9_-]*$/.test(extension2) ? extension2 : "";
}
function broadCategory(kind) {
  if (kind === "image" || kind === "video" || kind === "audio") return kind;
  if (kind === "text" || kind === "subtitle") return "code";
  return void 0;
}
function classifyFileType({
  filename,
  mime,
  mediaKind: mediaKind2
}) {
  const extension2 = extensionOf$1(filename);
  const normalizedMime = mime?.split(";", 1)[0]?.trim().toLowerCase();
  const mimeExtension = normalizedMime ? exactMime[normalizedMime] : void 0;
  if (mimeExtension && !(normalizedMime === "text/plain" && extensions.get(extension2) === "code")) {
    return {
      category: extensions.get(mimeExtension) ?? "neutral",
      recognition: "known",
      typeLabel: mimeExtension.toUpperCase()
    };
  }
  const extensionCategory = extensions.get(extension2);
  const inferred = inferMediaKind(normalizedMime, extension2);
  const mimeCategory = normalizedMime && /^(image|video|audio)\//.test(normalizedMime) ? broadCategory(inferred) : void 0;
  const compatible = mimeCategory === extensionCategory || mimeCategory === "image" && (extensionCategory === "photoshop" || extensionCategory === "vector");
  if (mimeCategory && !compatible) {
    return {
      category: mimeCategory,
      recognition: "known",
      typeLabel: "FILE"
    };
  }
  const hostCategory = broadCategory(mediaKind2);
  const hostCompatible = hostCategory === extensionCategory || hostCategory === "image" && (extensionCategory === "photoshop" || extensionCategory === "vector") || hostCategory === "code" && (extensionCategory === "document" || extensionCategory === "spreadsheet");
  if (!mimeCategory && hostCategory && extensionCategory && !hostCompatible) {
    return {
      category: hostCategory,
      recognition: "known",
      typeLabel: "FILE"
    };
  }
  const category = extensionCategory ?? hostCategory ?? broadCategory(inferred);
  return {
    category: category ?? "neutral",
    recognition: category ? "known" : extension2 ? "unknown" : "missing",
    typeLabel: extension2.toUpperCase() || "FILE"
  };
}





































function ActionListPanel({
  render: render2,
  ref,
  className,
  ...props
}) {
  return useRender({
    defaultTagName: "div",
    render: render2,
    ref,
    props: {
      ...(!render2 && {
        "data-slot": "action-list-panel"
      }),
      "data-action-list-part": "panel",
      ...props,
      className: clsx("action-list-menu", className)
    }
  });
}
function ActionListItem({
  render: render2,
  ref,
  className,
  variant = "default",
  ...props
}) {
  return useRender({
    defaultTagName: "button",
    render: render2,
    ref,
    props: {
      ...(!render2 && {
        type: "button"
      }),
      ...(!render2 && {
        "data-slot": "action-list-item"
      }),
      "data-action-list-part": "item",
      "data-variant": variant,
      ...props,
      className: clsx("action-list-item", className)
    }
  });
}
function ActionListSeparator({
  render: render2,
  ref,
  className,
  ...props
}) {
  return useRender({
    defaultTagName: "hr",
    render: render2,
    ref,
    props: {
      ...(!render2 && {
        "data-slot": "action-list-separator"
      }),
      "data-action-list-part": "separator",
      ...props,
      className: clsx("action-list-separator", className)
    }
  });
}
const usePromptFontSizeStore = create$2((set2, get3) => ({
  fontSize: readPersistedPromptFontSize(),
  setFontSize: fontSize => {
    const normalized = normalizePromptFontSize(fontSize);
    if (get3().fontSize === normalized) return;
    set2({
      fontSize: normalized
    });
    persistPromptFontSize(normalized);
  },
  resetFontSize: () => {
    const current2 = get3().fontSize;
    if (current2 === PROMPT_FONT_SIZE_DEFAULT) return;
    set2({
      fontSize: PROMPT_FONT_SIZE_DEFAULT
    });
    persistPromptFontSize(PROMPT_FONT_SIZE_DEFAULT);
  }
}));
function useMusicPromptLayout(showsLyrics, hasReadOnlyLyrics, expanded) {
  const fontSize = usePromptFontSizeStore(state2 => state2.fontSize);
  return {
    fontSize,
    prompt: {
      flex: "1.25 1 0%",
      // One full line, 12px input padding and the 32px metadata row.
      minHeight: showsLyrics ? fontSize * 1.5 + 44 : void 0
    },
    lyrics: {
      flex: "2 1 0%",
      minHeight: fontSize * 1.5 + (hasReadOnlyLyrics ? 5 : 9)
    },
    // Reserve the font-height increase for both inputs in compact mode.
    extraHeight: showsLyrics && !expanded ? Math.max(0, (fontSize - PROMPT_FONT_SIZE_DEFAULT) * 3) : 0
  };
}
















































































































































































































































































































































































































































































































































































({
  "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock$1)
});
var src_default$1 = Placeholder;
createCustomEqual({
  strict: true,
  createInternalComparator: () => sameValueZeroEqual
});
createCustomEqual({
  circular: true,
  createInternalComparator: () => sameValueZeroEqual
});
createCustomEqual({
  circular: true,
  createInternalComparator: () => sameValueZeroEqual,
  strict: true
});

function useSensor(sensor, options) {
  return reactExports.useMemo(() => ({
    sensor,
    options: options != null ? options : {}
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sensor, options]);
}
function useSensors() {
  for (var _len = arguments.length, sensors = new Array(_len), _key = 0; _key < _len; _key++) {
    sensors[_key] = arguments[_key];
  }
  return reactExports.useMemo(() => [...sensors].filter(sensor => sensor != null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [...sensors]);
}











const Operation = {
  Remove: "remove",
  Replace: "replace",
  Add: "add"
};
"function" == typeof SuppressedError && SuppressedError;

function unreachable() {}






























































































































const {
  toString
} = {};
const {
  keys
} = Object;














































































































































const useIsomorphicLayoutEffect = typeof document !== "undefined" ? reactExports.useLayoutEffect : reactExports.useEffect;
function useVirtualizerBase({
  useFlushSync = true,
  ...options
}) {
  const rerender = reactExports.useReducer(() => ({}), {})[1];
  const resolvedOptions = {
    ...options,
    onChange: (instance22, sync) => {
      var _a2;
      if (useFlushSync && sync) {
        reactDomExports.flushSync(rerender);
      } else {
        rerender();
      }
      (_a2 = options.onChange) == null ? void 0 : _a2.call(options, instance22, sync);
    }
  };
  const [instance2] = reactExports.useState(() => new Virtualizer(resolvedOptions));
  instance2.setOptions(resolvedOptions);
  useIsomorphicLayoutEffect(() => {
    return instance2._didMount();
  }, []);
  useIsomorphicLayoutEffect(() => {
    return instance2._willUpdate();
  });
  return instance2;
}
function useVirtualizer(options) {
  return useVirtualizerBase({
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    ...options
  });
}
const isIterable = obj => Symbol.iterator in obj;
const hasIterableEntries = value =>
// HACK: avoid checking entries type
"entries" in value;
const compareEntries = (valueA, valueB) => {
  const mapA = valueA instanceof Map ? valueA : new Map(valueA.entries());
  const mapB = valueB instanceof Map ? valueB : new Map(valueB.entries());
  if (mapA.size !== mapB.size) {
    return false;
  }
  for (const [key2, value] of mapA) {
    if (!mapB.has(key2) || !Object.is(value, mapB.get(key2))) {
      return false;
    }
  }
  return true;
};
const compareIterables = (valueA, valueB) => {
  const iteratorA = valueA[Symbol.iterator]();
  const iteratorB = valueB[Symbol.iterator]();
  let nextA = iteratorA.next();
  let nextB = iteratorB.next();
  while (!nextA.done && !nextB.done) {
    if (!Object.is(nextA.value, nextB.value)) {
      return false;
    }
    nextA = iteratorA.next();
    nextB = iteratorB.next();
  }
  return !!nextA.done && !!nextB.done;
};
function shallow(valueA, valueB) {
  if (Object.is(valueA, valueB)) {
    return true;
  }
  if (typeof valueA !== "object" || valueA === null || typeof valueB !== "object" || valueB === null) {
    return false;
  }
  if (Object.getPrototypeOf(valueA) !== Object.getPrototypeOf(valueB)) {
    return false;
  }
  if (isIterable(valueA) && isIterable(valueB)) {
    if (hasIterableEntries(valueA) && hasIterableEntries(valueB)) {
      return compareEntries(valueA, valueB);
    }
    return compareIterables(valueA, valueB);
  }
  return compareEntries({
    entries: () => Object.entries(valueA)
  }, {
    entries: () => Object.entries(valueB)
  });
}
const MIN_SELECTED_NODE_SIZE = 4;
const SELECTED_GLOW_BLUR = 5;
const NODE_HIT_SLOP = 2;
function nodeToMiniMapRect(node2, layout, minSize = 0) {
  const topLeft = flowPointToMiniMap({
    x: node2.x,
    y: node2.y
  }, layout);
  const width = node2.width * layout.scale;
  const height = node2.height * layout.scale;
  const paddedWidth = Math.max(width, minSize);
  const paddedHeight = Math.max(height, minSize);
  return {
    x: topLeft.x - (paddedWidth - width) / 2,
    y: topLeft.y - (paddedHeight - height) / 2,
    width: paddedWidth,
    height: paddedHeight
  };
}
const ENTRY_OFFSET = 14;
const ENTRY_DROP_RADIUS = 24;
function findConnectionTarget(nodeLookup, dropFlow, sourceId, zoom2, excludedTargets) {
  if (findHitTarget(nodeLookup, dropFlow, sourceId) !== null) {
    return findHitTarget(nodeLookup, dropFlow, sourceId, excludedTargets);
  }
  const source = nodeLookup.get(sourceId);
  if (source && findHitTarget(/* @__PURE__ */new Map([[sourceId, source]]), dropFlow, "") !== null) return null;
  if (!Number.isFinite(zoom2) || zoom2 <= 0) return null;
  let bestId = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestZ = Number.NEGATIVE_INFINITY;
  for (const [id2, node2] of nodeLookup) {
    if (id2 === sourceId || node2.hidden || node2.type === CanvasNodeType.Group) continue;
    if (excludedTargets?.has(id2)) continue;
    if ((node2.measured?.width ?? node2.width ?? 0) <= 0) continue;
    if ((node2.measured?.height ?? node2.height ?? 0) <= 0) continue;
    const bounds = node2.internals.handleBounds;
    const {
      x: x2,
      y: y4
    } = node2.internals.positionAbsolute;
    for (const handle2 of [...(bounds?.target ?? []), ...(bounds?.source ?? [])]) {
      if (handle2.position !== "left" && handle2.position !== "right") continue;
      const offset2 = handle2.position === "left" ? -ENTRY_OFFSET : ENTRY_OFFSET;
      const dx = (dropFlow.x - x2 - handle2.x - handle2.width / 2) * zoom2 - offset2;
      const dy = (dropFlow.y - y4 - handle2.y - handle2.height / 2) * zoom2;
      const distance2 = Math.hypot(dx, dy);
      if (distance2 > ENTRY_DROP_RADIUS || distance2 > bestDistance) continue;
      const z3 = node2.internals.z ?? 0;
      if (distance2 === bestDistance && z3 < bestZ) continue;
      bestId = id2;
      bestDistance = distance2;
      bestZ = z3;
    }
  }
  return bestId;
}
function ConnectionTargetMarker({
  edges
}) {
  const store = useStoreApi();
  reactExports.useEffect(() => {
    let markedNode = null;
    let markedEntry = null;
    let previousSourceId = null;
    let excluded = /* @__PURE__ */new Set();
    const clear = () => {
      markedNode?.classList.remove("node-connection-target");
      markedEntry?.removeAttribute("data-connection-target");
      markedNode = null;
      markedEntry = null;
    };
    const update2 = () => {
      const {
        connection,
        transform: transform2,
        nodeLookup,
        domNode
      } = store.getState();
      if (!connection.inProgress || !connection.fromNode || !domNode) {
        clear();
        return;
      }
      const sourceId = connection.fromNode.id;
      if (sourceId !== previousSourceId) {
        previousSourceId = sourceId;
        excluded = new Set(edges.filter(edge => edge.source === sourceId).map(edge => edge.target));
      }
      const point2 = {
        x: (connection.pointer.x - transform2[0]) / transform2[2],
        y: (connection.pointer.y - transform2[1]) / transform2[2]
      };
      const id2 = connection.isValid ? connection.toNode?.id : findConnectionTarget(nodeLookup, point2, sourceId, transform2[2], excluded);
      const node2 = id2 ? domNode.querySelector(`.react-flow__node[data-id="${CSS.escape(id2)}"]`) : null;
      let entry = null;
      let distance2 = Number.POSITIVE_INFINITY;
      if (node2) {
        const rootBounds = domNode.getBoundingClientRect();
        const x2 = rootBounds.left + connection.pointer.x;
        const y4 = rootBounds.top + connection.pointer.y;
        for (const candidate of node2.querySelectorAll(".node-handle-plus:not([data-hidden])")) {
          const rect = candidate.getBoundingClientRect();
          const d2 = Math.hypot(x2 - rect.left - rect.width / 2, y4 - rect.top - rect.height / 2);
          if (d2 < distance2) {
            distance2 = d2;
            entry = candidate;
          }
        }
      }
      if (node2 === markedNode && entry === markedEntry) return;
      clear();
      markedNode = node2;
      markedEntry = entry;
      markedNode?.classList.add("node-connection-target");
      markedEntry?.setAttribute("data-connection-target", "true");
    };
    const unsubscribe = store.subscribe((state2, previous2) => {
      if (state2.connection !== previous2.connection || state2.transform !== previous2.transform) update2();
    });
    update2();
    return () => {
      unsubscribe();
      clear();
    };
  }, [store, edges]);
  return null;
}
function selectGeneratedMediaNodeIds(nodes) {
  return nodes.filter(node2 => {
    if (node2.type !== CanvasNodeType.Image && node2.type !== CanvasNodeType.Video && node2.type !== CanvasNodeType.Audio) return false;
    const data2 = node2.data;
    if (!data2 || typeof data2 !== "object") return false;
    const model = "model" in data2 ? data2.model : void 0;
    return !("backend" in data2 && data2.backend === BACKEND_VIBE_STORYBOARD) && !isUserProvidedAssetModel(model) && ("source_tool" in data2 && data2.source_tool || model);
  }).map(node2 => node2.id);
}
const nameCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base"
});
const nonEmpty = value => typeof value === "string" && value.trim() ? value.trim() : void 0;
function tidyNodeName(node2, options) {
  const data2 = node2.data && typeof node2.data === "object" ? node2.data : {};
  const authored = node2.type === "group" ? data2.label : node2.type === "table" ? data2.title : data2.name;
  return nonEmpty(authored) ?? nonEmpty(options?.assetName?.(node2)) ?? nonEmpty(data2.path)?.split(/[\\/]/).filter(Boolean).at(-1);
}
function addedAt(node2) {
  const value = node2.meta?.addedAt;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function stableOrder(a2, b3) {
  const at2 = addedAt(a2);
  const bt2 = addedAt(b3);
  if (at2 !== bt2) {
    if (at2 === void 0) return 1;
    if (bt2 === void 0) return -1;
    return at2 - bt2;
  }
  return a2.id < b3.id ? -1 : a2.id > b3.id ? 1 : 0;
}
function orderTidyNodes(nodes, options = {}) {
  const names = new Map(nodes.map(node2 => [node2.id, tidyNodeName(node2, options)]));
  return [...nodes].sort((a2, b3) => {
    if (options.sortBy !== "addedAt") {
      const an2 = names.get(a2.id);
      const bn2 = names.get(b3.id);
      if (an2 === void 0 && bn2 !== void 0) return 1;
      if (bn2 === void 0 && an2 !== void 0) return -1;
      if (an2 !== void 0 && bn2 !== void 0) {
        const compared = nameCollator.compare(an2, bn2);
        if (compared !== 0) return compared;
      }
    }
    return stableOrder(a2, b3);
  });
}
function pinnedTidyNodeIds(nodes) {
  const byId = new Map(nodes.map(node2 => [node2.id, node2]));
  const pinned = /* @__PURE__ */new Set();
  for (const node2 of nodes) {
    if (!node2.meta?.locked) continue;
    let current2 = node2;
    const visited = /* @__PURE__ */new Set();
    while (current2 && !visited.has(current2.id)) {
      visited.add(current2.id);
      pinned.add(current2.id);
      current2 = current2.parentId ? byId.get(current2.parentId) : void 0;
    }
  }
  return pinned;
}
create$2((set2, get3) => ({
  tool: readPersisted(),
  setTool: tool2 => {
    if (get3().tool === tool2) return;
    set2({
      tool: tool2
    });
    try {
      window.localStorage.setItem(STORAGE_KEY$6, tool2);
    } catch {}
  }
}));
const AUTH_TRACK_EVENTS = {
  AUTH_LOGIN_START: "auth_login_start",
  AUTH_LOGIN_DISPATCH: "auth_login_dispatch",
  AUTH_LOGIN_STRATEGY_CHANGED: "auth_login_strategy_changed",
  AUTH_LOGIN_SUCCESS: "auth_login_success",
  AUTH_LOGIN_FAILED: "auth_login_failed",
  AUTH_LOGIN_CALLBACK_IGNORED: "auth_login_callback_ignored",
  AUTH_LOGOUT: "auth_logout"
};
function ClientOnly({
  children: children2,
  fallback = null
}) {
  return useHydrated() ? /* @__PURE__ */jsxRuntimeExports.jsx(React.Fragment, {
    children: children2
  }) : /* @__PURE__ */jsxRuntimeExports.jsx(React.Fragment, {
    children: fallback
  });
}


















function createFileRoute(path2) {
  if (typeof path2 === "object") return new FileRoute(path2, {
    silent: true
  }).createRoute(path2);
  return new FileRoute(path2, {
    silent: true
  }).createRoute;
}
var FileRoute = class {
  constructor(path2, _opts) {
    this.path = path2;
    this.createRoute = options => {
      const route = createRoute(options);
      route.isRoot = false;
      return route;
    };
    this.silent = _opts?.silent;
  }
};
function lazyRouteComponent(importer, exportName) {
  let loadPromise;
  let comp;
  let error;
  let reload;
  const load2 = () => {
    if (!loadPromise) loadPromise = importer().then(res => {
      loadPromise = void 0;
      comp = res[exportName];
    }).catch(err => {
      error = err;
      if (isModuleNotFoundError(error)) {
        if (error instanceof Error && typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
          const storageKey2 = `tanstack_router_reload:${error.message}`;
          if (!sessionStorage.getItem(storageKey2)) {
            sessionStorage.setItem(storageKey2, "1");
            reload = true;
          }
        }
      }
    });
    return loadPromise;
  };
  const lazyComp = function Lazy(props) {
    if (reload) {
      window.location.reload();
      throw new Promise(() => {});
    }
    if (error) throw error;
    if (!comp) if (reactUse) reactUse(load2());else throw load2();
    return reactExports.createElement(comp, props);
  };
  lazyComp.preload = load2;
  return lazyComp;
}
var getStoreFactory = opts => {
  return {
    createMutableStore: createStore,
    createReadonlyStore: createStore,
    batch
  };
};
const isString = obj => typeof obj === "string";





































































function isWorkspaceFolderMissingError(error) {
  return error instanceof Error && error.name === "WorkspaceFolderMissingError";
}
function desktopMediaIcon(Glyph) {
  return reactExports.forwardRef(function DesktopMediaIcon({
    size: size2 = 16,
    ...props
  }, ref) {
    return /* @__PURE__ */jsxRuntimeExports.jsx(Glyph, {
      size: size2,
      ...props,
      ref
    });
  });
}
const ICON_STROKE_SPEC = [{
  size: 12,
  stroke: 1,
  className: "size-3"
}, {
  size: 14,
  stroke: 1,
  className: "size-3.5"
}, {
  size: 16,
  stroke: 1.25,
  className: "size-4"
}, {
  size: 20,
  stroke: 1.5,
  className: "size-5"
}, {
  size: 24,
  stroke: 1.75,
  className: "size-6"
}, {
  size: 32,
  stroke: 2,
  className: "size-8"
}];
function getIconStrokeWidth(size2, viewBoxSize = 24) {
  const spec = ICON_STROKE_SPEC.find(entry => entry.size === size2);
  if (!spec) throw new Error(`Unsupported stroke icon size: ${size2}`);
  return spec.stroke * viewBoxSize / size2;
}
function fmt(tag, action, meta2) {
  if (!meta2) return `${tag} ${action}`;
  const tail = Object.entries(meta2).map(([k2, v2]) => `${k2}=${fmtValue(v2)}`).join(" ");
  return tail ? `${tag} ${action} ${tail}` : `${tag} ${action}`;
}
function emit$6(category, level, action, meta2) {
  const tag = `[${category}]`;
  const msg = fmt(tag, action, meta2);
  const consoleFn = level === "debug" ? console.log : console[level];
  consoleFn(msg);
  try {
    void window.hilo?.logger?.[level]?.(msg, category);
  } catch {}
}
function makeLogger(category) {
  return {
    debug: (action, meta2) => emit$6(category, "debug", action, meta2),
    info: (action, meta2) => emit$6(category, "info", action, meta2),
    warn: (action, meta2) => emit$6(category, "warn", action, meta2),
    error: (action, meta2) => emit$6(category, "error", action, meta2)
  };
}
const workspaceLog = makeLogger("workspace");
function readRecord(value) {
  return value && typeof value === "object" ? value : void 0;
}
var M$3 = (e2, i2, s2, u4, m3, a2, l2, h2) => {
  let d2 = document.documentElement,
    w3 = ["light", "dark"];
  function p3(n2) {
    (Array.isArray(e2) ? e2 : [e2]).forEach(y4 => {
      let k2 = y4 === "class",
        S3 = k2 && a2 ? m3.map(f2 => a2[f2] || f2) : m3;
      k2 ? (d2.classList.remove(...S3), d2.classList.add(a2 && a2[n2] ? a2[n2] : n2)) : d2.setAttribute(y4, n2);
    }), R2(n2);
  }
  function R2(n2) {
    h2 && w3.includes(n2) && (d2.style.colorScheme = n2);
  }
  function c3() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (u4) p3(u4);else try {
    let n2 = localStorage.getItem(i2) || s2,
      y4 = l2 && n2 === "system" ? c3() : n2;
    p3(y4);
  } catch (n2) {}
};
var x$4 = reactExports.createContext(void 0),
  U$3 = {
    setTheme: e2 => {},
    themes: []
  },
  z$3 = () => {
    var e2;
    return (e2 = reactExports.useContext(x$4)) != null ? e2 : U$3;
  };
reactExports.memo(({
  forcedTheme: e2,
  storageKey: i2,
  attribute: s2,
  enableSystem: u4,
  enableColorScheme: m3,
  defaultTheme: a2,
  value: l2,
  themes: h2,
  nonce: d2,
  scriptProps: w3
}) => {
  let p3 = JSON.stringify([s2, i2, a2, e2, h2, l2, u4, m3]).slice(1, -1);
  return reactExports.createElement("script", {
    ...w3,
    suppressHydrationWarning: true,
    nonce: typeof window == "undefined" ? d2 : "",
    dangerouslySetInnerHTML: {
      __html: `(${M$3.toString()})(${p3})`
    }
  });
});
function isPlainObject$1(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function resolveUpdater(updater, prev) {
  const next2 = typeof updater === "function" ? updater(prev) : updater;
  if (isPlainObject$1(next2) && isPlainObject$1(prev)) {
    return {
      ...prev,
      ...next2
    };
  }
  return next2;
}
let pendingLogLines = [];
function flush() {
  if (pendingLogLines.length === 0) return;
  const start2 = performance.now();
  const lines = pendingLogLines;
  pendingLogLines = [];
  const combined = lines.join("\n");
  try {
    window.hilo.logger.info(combined, "perf");
  } catch {} finally {
    measurePerf(PERF_LOG_FLUSH, start2, {
      lines: lines.length,
      bytes: combined.length
    });
  }
}
let decisionVersion = 0;
const listeners$8 = /* @__PURE__ */new Set();
function emit$5() {
  decisionVersion += 1;
  for (const listener of listeners$8) listener();
}
const QUERY_KEY$1 = ["models"];
function getDefault(key2) {
  const [scope, field] = key2.split(".");
  if (scope === "workspace") {
    return WORKSPACE_STORAGE_DEFAULTS[field];
  }
  return getRendererGlobalDefaults()[field];
}
function useStorage(key2, options = {}) {
  const enabled = options.enabled ?? true;
  const [scope, field] = key2.split(".");
  const isGlobal = scope === "global";
  const defaultValue2 = getDefault(key2);
  const platform2 = usePlatform();
  const queryClient2 = useQueryClient();
  const hasStorage = !!platform2.storage;
  reactExports.useEffect(() => {
    if (!enabled || key2 !== "global.config") return;
    return platform2.storage?.onGlobalConfigChanged?.(patch2 => {
      const next2 = queryClient2.setQueryData(storageKeys.global("config"), prev => ({
        ...getRendererGlobalDefaults().config,
        ...prev,
        ...patch2
      }));
      writeLocalCache$2("global.config", next2);
    });
  }, [enabled, key2, platform2.storage, queryClient2]);
  const workspaceDir = useCurrentWorkspace();
  const cacheKey = localCacheKey(scope, field, workspaceDir);
  const placeholder = reactExports.useMemo(() => enabled ? readLocalCache$2(cacheKey) : void 0, [cacheKey, enabled]);
  const queryKey = isGlobal ? storageKeys.global(field) : storageKeys.workspace(workspaceDir, field);
  const {
    data: rawData,
    isFetched
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!platform2.storage) throw new Error("storage unavailable");
      const value2 = isGlobal ? await platform2.storage.globalGet(field) : await platform2.storage.workspaceGet(workspaceDir, field);
      return toStorageQueryData(value2, defaultValue2);
    },
    enabled: enabled && (isGlobal ? hasStorage : !!workspaceDir && hasStorage),
    staleTime: Number.POSITIVE_INFINITY
  });
  const persistedData = resolveStorageQueryData(rawData);
  const isHydrated = enabled && isFetched;
  const data2 = enabled ? isHydrated ? persistedData ?? defaultValue2 : persistedData ?? placeholder ?? defaultValue2 : defaultValue2;
  reactExports.useEffect(() => {
    if (!enabled || !isHydrated) return;
    if (persistedData === void 0 && defaultValue2 === void 0) {
      removeLocalCache(cacheKey);
      return;
    }
    writeLocalCache$2(cacheKey, persistedData ?? defaultValue2);
  }, [cacheKey, defaultValue2, enabled, isHydrated, persistedData]);
  const {
    mutateAsync
  } = useMutation({
    mutationFn: async ({
      field: f2,
      value: value2,
      global: global2,
      directory
    }) => {
      if (!platform2.storage) return;
      if (global2) {
        await platform2.storage.globalSet(f2, value2);
      } else {
        await platform2.storage.workspaceSet(directory, f2, value2);
      }
    }
  });
  const value = data2;
  const requestSeqRef = reactExports.useRef(0);
  const setValueAsync = reactExports.useCallback(async updater => {
    if (!enabled) return false;
    const dir = workspaceDir;
    const global2 = isGlobal;
    if (!global2 && !dir) return false;
    const qk = global2 ? storageKeys.global(field) : storageKeys.workspace(dir, field);
    const activeCacheKey = localCacheKey(global2 ? "global" : "workspace", field, dir);
    return enqueueStorageWrite(activeCacheKey, async () => {
      await queryClient2.cancelQueries({
        queryKey: qk
      });
      const cached = queryClient2.getQueryData(qk);
      const queryState = queryClient2.getQueryState(qk);
      const localCached = readLocalCache$2(activeCacheKey);
      const hasHydratedCache = queryState?.status === "success";
      const resolvedCached = resolveStorageQueryData(cached);
      const current2 = hasHydratedCache ? resolvedCached ?? defaultValue2 : localCached ?? defaultValue2;
      const restoreQueryData = hasHydratedCache ? cached ?? toStorageQueryData(current2, defaultValue2) : toStorageQueryData(current2, defaultValue2);
      const shouldRestoreLocalCache = hasHydratedCache ? !isUndefinedStorageValue(restoreQueryData) : localCached !== void 0;
      const next2 = resolveUpdater(updater, current2);
      const requestId = (requestSeqRef.current ?? 0) + 1;
      requestSeqRef.current = requestId;
      queryClient2.setQueryData(qk, toStorageQueryData(next2, defaultValue2));
      if (next2 === void 0) {
        removeLocalCache(activeCacheKey);
      } else {
        writeLocalCache$2(activeCacheKey, next2);
      }
      try {
        await mutateAsync({
          field,
          value: next2,
          global: global2,
          directory: dir
        });
        return true;
      } catch (error) {
        console.error(`[useStorage] Failed to persist ${field}:`, error);
        if (requestSeqRef.current === requestId) {
          queryClient2.setQueryData(qk, restoreQueryData);
          if (shouldRestoreLocalCache) {
            writeLocalCache$2(activeCacheKey, current2);
          } else {
            removeLocalCache(activeCacheKey);
          }
        }
        return false;
      }
    });
  }, [defaultValue2, enabled, field, isGlobal, mutateAsync, queryClient2, workspaceDir]);
  const setValue = reactExports.useCallback(updater => {
    void setValueAsync(updater).catch(error => {
      console.error(`[useStorage] Unexpected async setter error for ${field}:`, error);
    });
  }, [setValueAsync, field]);
  return [value, setValue, setValueAsync, isHydrated];
}
















































































































































function formatDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function useNewProjectFolder() {
  const platform2 = usePlatform();
  const [config2, setConfig] = useStorage("global.config");
  const {
    folderPath
  } = resolveNewProjectPreferences(config2);
  const setFolderPath = reactExports.useCallback(next2 => {
    setConfig(previous2 => updateNewProjectPreferences(previous2, {
      folderPath: next2
    }));
  }, [setConfig]);
  reactExports.useEffect(() => {
    if (!folderPath) return;
    let cancelled = false;
    const validate = async () => {
      try {
        if (await platform2.fs.exists(folderPath)) return;
        if (cancelled) return;
        setConfig(previous2 => resolveNewProjectPreferences(previous2).folderPath === folderPath ? updateNewProjectPreferences(previous2, {
          folderPath: void 0
        }) : previous2);
      } catch (error) {
        workspaceLog.info("new-project: folder-check-failed", {
          error
        });
      }
    };
    void validate();
    window.addEventListener("focus", validate);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", validate);
    };
  }, [folderPath, platform2.fs, setConfig]);
  return [folderPath, setFolderPath];
}
const CDN_BROWSER_START_ICON = {
  light: cdnPublicAsset({
    domestic: "browser-start-light-c973f13f8fb1.png",
    overseas: "browser-start-light-c973f13f8fb1.png"
  }),
  dark: cdnPublicAsset({
    domestic: "browser-start-dark-96ed32bceae3.png",
    overseas: "browser-start-dark-96ed32bceae3.png"
  })
};
function resolveConnectorIcon(icon) {
  return icon.urls[getCdnRegion()];
}
const CONNECTOR_SETUP_ASSET_BY_KEY = {
  "touchdesigner-components": CDN_TOUCHDESIGNER_COMPONENTS
};
function resolveConnectorSetupAsset(setupAssetKey) {
  return CONNECTOR_SETUP_ASSET_BY_KEY[setupAssetKey];
}
const h$4 = reactExports.createContext(null),
  c$3 = {
    didCatch: false,
    error: null
  };
let m$4 = class m extends reactExports.Component {
  constructor(e2) {
    super(e2), this.resetErrorBoundary = this.resetErrorBoundary.bind(this), this.state = c$3;
  }
  static getDerivedStateFromError(e2) {
    return {
      didCatch: true,
      error: e2
    };
  }
  resetErrorBoundary(...e2) {
    const {
      error: t2
    } = this.state;
    t2 !== null && (this.props.onReset?.({
      args: e2,
      reason: "imperative-api"
    }), this.setState(c$3));
  }
  componentDidCatch(e2, t2) {
    this.props.onError?.(e2, t2);
  }
  componentDidUpdate(e2, t2) {
    const {
        didCatch: o2
      } = this.state,
      {
        resetKeys: s2
      } = this.props;
    o2 && t2.error !== null && C$5(e2.resetKeys, s2) && (this.props.onReset?.({
      next: s2,
      prev: e2.resetKeys,
      reason: "keys"
    }), this.setState(c$3));
  }
  render() {
    const {
        children: e2,
        fallbackRender: t2,
        FallbackComponent: o2,
        fallback: s2
      } = this.props,
      {
        didCatch: n2,
        error: a2
      } = this.state;
    let i2 = e2;
    if (n2) {
      const u4 = {
        error: a2,
        resetErrorBoundary: this.resetErrorBoundary
      };
      if (typeof t2 == "function") i2 = t2(u4);else if (o2) i2 = reactExports.createElement(o2, u4);else if (s2 !== void 0) i2 = s2;else throw a2;
    }
    return reactExports.createElement(h$4.Provider, {
      value: {
        didCatch: n2,
        error: a2,
        resetErrorBoundary: this.resetErrorBoundary
      }
    }, i2);
  }
};
const FIGMA_DESKTOP_MCP = {
  name: "figma-desktop",
  endpoint: "http://127.0.0.1:3845/mcp"
};
let mergedCache;
function registerDynamicHcpManifests(manifests) {
  const {
    entries: entries2,
    skipped
  } = buildHcpCatalogEntries(manifests);
  mergedCache = Object.freeze(entries2);
  return skipped;
}
function getMergedHcpCatalogEntries() {
  if (mergedCache) return mergedCache;
  return [];
}
function getMergedHcpCatalog() {
  return getMergedHcpCatalogEntries().map(entry => entry.manifest);
}
function findHcpConnector(connectorId) {
  return getMergedHcpCatalogEntries().find(entry => entry.manifest.connectorId === connectorId)?.manifest;
}
function namesMatch$1(left, right) {
  return left.trim().toLocaleLowerCase() === right.toLocaleLowerCase();
}
function originsMatch$1(left, right) {
  if (!left) return false;
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}
function matchesRemoteConnectorServer(server, remote) {
  return server.transport !== "stdio" && (originsMatch$1(server.endpoint, remote.endpoint) || server.transport === void 0 && server.endpoint === void 0 && namesMatch$1(server.name, remote.serverName));
}
function hcpToDefinition(connectorId) {
  const manifest = findHcpConnector(connectorId);
  if (!manifest) return void 0;
  const mcp = manifest.capabilities.mcp;
  const iconUrl = resolveConnectorIcon(manifest.icon);
  if (mcp?.kind === "remote") {
    return {
      id: connectorId,
      serverName: mcp.serverName,
      displayName: manifest.displayName.en || manifest.displayName.zh || connectorId,
      iconUrl,
      matches: server => matchesRemoteConnectorServer(server, mcp)
    };
  }
  return {
    id: connectorId,
    serverName: mcp?.serverName ?? connectorId,
    displayName: manifest.displayName.en || manifest.displayName.zh || connectorId,
    iconUrl,
    matches: server => matchesLocalConnectorServer(server, connectorId)
  };
}
const SPECIAL_CONNECTORS = {
  figma: () => ({
    id: "figma",
    serverName: FIGMA_DESKTOP_MCP.name,
    displayName: "Figma",
    iconUrl: (() => {
      const manifest = findHcpConnector("figma");
      return manifest ? resolveConnectorIcon(manifest.icon) : "";
    })(),
    matches: server => server.transport !== "stdio" && originsMatch(server.endpoint, FIGMA_DESKTOP_MCP.endpoint) && namesMatch(server.name, FIGMA_DESKTOP_MCP.name)
  }),
  libtv: () => ({
    id: "libtv",
    serverName: LIBTV_CONNECTOR.id,
    displayName: "LibTV",
    iconUrl: libtvIconUrl,
    matches: server => server.name === LIBTV_CONNECTOR.id && server.transport !== "stdio" && originsMatch(server.endpoint, LIBTV_CONNECTOR.url)
  })
};
function buildOfficialConnectorList() {
  const result = [];
  for (const factory of Object.values(SPECIAL_CONNECTORS)) {
    result.push(factory());
  }
  for (const manifest of getMergedHcpCatalog()) {
    const id2 = manifest.connectorId;
    if (SPECIAL_CONNECTORS[id2]) continue;
    const def = hcpToDefinition(id2);
    if (def) result.push(def);
  }
  return result;
}


















function isVisibleCloudUpload(item) {
  return item.kind === "upload" && (item.status === "pending" || item.status === "uploading");
}
function getVisibleCloudUploads(transfers, searchQuery) {
  const query = searchQuery.trim().toLowerCase();
  return transfers.filter(item => isVisibleCloudUpload(item) && item.name.toLowerCase().includes(query));
}
"function" == typeof SuppressedError && SuppressedError;
function cloneDraftEditorDoc(value) {
  if (!value || typeof value !== "object" || !("type" in value) || value.type !== "doc") return void 0;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return void 0;
  }
}
function editorDocSnapshot(value) {
  const editorDoc = cloneDraftEditorDoc(value);
  return editorDoc ? {
    editorDoc
  } : {};
}
function basename$8(path2) {
  return path2.split("/").pop() ?? "";
}
function uploadResponseFilename(res, originalName) {
  return /\.gif$/i.test(res.relative) && !/\.gif$/i.test(originalName) ? basename$8(res.relative) : originalName;
}
const GRID_COLUMN_COUNT_WIDE = 5;
function estimateGridRowSize(containerWidth, columnCount) {
  const horizontalPadding = 20;
  const columnGaps = (columnCount - 1) * 8;
  const tileWidth = (containerWidth - horizontalPadding - columnGaps) / columnCount;
  const thumbnailHeight = Math.max(0, tileWidth) * 2 / 3;
  const infoHeight = 48;
  const rowGap = 8;
  return thumbnailHeight + infoHeight + rowGap;
}
function createConnectorInventory(load2) {
  let snapshot2 = {
    servers: [],
    loading: false,
    failed: false,
    loaded: false
  };
  const listeners2 = /* @__PURE__ */new Set();
  let pending2;
  let timer2;
  let revision = 0;
  const publish = next2 => {
    snapshot2 = next2;
    for (const listener of listeners2) listener();
  };
  const refresh = () => {
    if (pending2) return pending2;
    const requestedRevision = revision;
    publish({
      ...snapshot2,
      loading: true
    });
    pending2 = Promise.resolve().then(load2).then(servers => {
      if (requestedRevision === revision) publish({
        servers,
        loading: false,
        failed: false,
        loaded: true
      });
      return snapshot2.servers;
    }, error => {
      if (requestedRevision === revision) publish({
        ...snapshot2,
        loading: false,
        failed: true
      });
      throw error;
    }).finally(() => {
      pending2 = void 0;
    });
    return pending2;
  };
  return {
    getSnapshot: () => snapshot2,
    refresh,
    update(updater) {
      revision += 1;
      publish({
        ...snapshot2,
        servers: updater(snapshot2.servers),
        loading: false
      });
    },
    subscribe(listener) {
      listeners2.add(listener);
      timer2 ??= setInterval(() => {
        void refresh().catch(() => void 0);
      }, 3e3);
      return () => {
        listeners2.delete(listener);
        if (!listeners2.size) {
          clearInterval(timer2);
          timer2 = void 0;
        }
      };
    }
  };
}
function getSkillCoverUrl(skill) {
  if (getRuntimeConfig().region === "overseas") {
    const overseasCover = skill.coverUrlEn?.trim();
    if (overseasCover) return overseasCover;
  }
  return skill.coverUrl?.trim() || "";
}



















function isBrowserImageEditRequest(value) {
  if (!value || typeof value !== "object") return false;
  const request = value;
  return request.file instanceof File && request.file.type.startsWith("image/") && isBrowserImageEditAction(request.action) && typeof request.pageUrl === "string" && typeof request.pageTitle === "string";
}
function browserImageEditPrompt(t2, action) {
  const prompts = {
    "remove-background": () => t2("workspace.browser.imageEdit.prompt.removeBackground", "请使用专用抠图能力处理本次附件中的图片，保留原图主体和精细边缘，去除背景并输出透明背景 PNG，不重新生成主体。"),
    upscale: () => t2("workspace.browser.imageEdit.prompt.upscale", "请使用专用图像超清能力处理本次附件中的图片，提升分辨率和细节清晰度，保持主体、构图、色彩与原有风格，不重绘原图；未指定输出尺寸时使用默认设置。"),
    "describe-prompt": () => t2("workspace.browser.imageEdit.prompt.describePrompt", "请反推这张图片的提示词。"),
    "separate-layers": () => t2("workspace.browser.imageEdit.prompt.separateLayers", "请使用专用图层分离能力处理本次附件中的图片，按主体、背景及主要元素输出底图和独立 PNG 图层，保留分离图层的透明通道及位置信息，并说明实际图层顺序；不要重新生成替代元素。")
  };
  return prompts[action]();
}
function localizedI18nText(text2, language2) {
  return language2.toLowerCase().startsWith("zh") ? text2.zh : text2.en;
}
function connectorDescription(t2, language2, connectorId, description) {
  return t2(`connectors.catalog.${connectorId}.description`, localizedI18nText(description, language2));
}
function isSkillsOnly(manifest) {
  return manifest.capabilities.mcp === void 0 && (manifest.capabilities.skills?.length ?? 0) > 0;
}
function supportsConnectorDialog(manifest) {
  if (manifest.ui.dialog === "local-app") return false;
  if (manifest.auth.kind === "cliAuth" || manifest.auth.kind === "hubOAuthProfile") return true;
  if (isSkillsOnly(manifest)) return true;
  const mcp = manifest.capabilities.mcp;
  if (mcp?.kind !== "remote") return false;
  if (manifest.auth.kind === "apiKey") return true;
  const templates = [...Object.values(mcp.headers ?? {}), ...Object.values(mcp.queryParams ?? {})];
  return !templates.some(value => value.includes("${user_config."));
}
const connectorPromptActionLabelKey = {
  requiresInstall: "connectors.detail.downloadToConnect",
  installing: "connectors.detail.useAfterInstallation",
  requiresConnection: "connectors.detail.connectToUse",
  ready: "connectors.detail.tryInChat",
  requiresEnable: "connectors.detail.enableToUse",
  requiresRecovery: "connectors.detail.reconnectToUse"
};
const CONNECTOR_STATUS_VISUAL = {
  connected: {
    tone: "neutral",
    markerTone: "success"
  },
  saved: {
    tone: "muted",
    markerTone: "muted"
  },
  needs_auth: {
    tone: "warning",
    markerTone: "warning"
  },
  disabled: {
    tone: "warning",
    markerTone: "warning"
  },
  notConnected: {
    tone: "muted",
    markerTone: "muted"
  },
  removing: {
    tone: "muted",
    markerTone: "warning"
  },
  checking: {
    tone: "muted",
    markerTone: "muted"
  },
  installing: {
    tone: "muted",
    markerTone: "warning"
  }
};
const connectorSummaryActionLabelKey = {
  authorize: "connectors.detail.authorize",
  connect: "connectors.detail.connect",
  install: "connectors.connector.install",
  reinstall: "connectors.connector.reinstall",
  try: "connectors.detail.try",
  update: "connectors.connector.update"
};
function isRecord$2(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const FILE_ACTIVITY_KIND_BY_TOOL = {
  hub_read: "read",
  hub_analyse_media: "analyseMedia"
};
function getFileActivityKind(toolName2) {
  return FILE_ACTIVITY_KIND_BY_TOOL[toolName2];
}
function collectMediaResultRecords(payload) {
  if (Array.isArray(payload)) return payload.filter(isRecord$2);
  if (!isRecord$2(payload)) return [];
  if (Array.isArray(payload.results)) return payload.results.filter(isRecord$2);
  return [payload];
}
function hasMediaAnalysisFailure(toolResult) {
  if (!toolResult) return false;
  return collectMediaResultRecords(tryParseJson$1(toolResult)).some(record2 => isRecord$2(record2.semantic) && record2.semantic.source === "error" || isRecord$2(record2.metadata) && record2.metadata.ok === false);
}
const TAB_CONTENT_ENTER_CLASS_NAME = "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200";
export { ACCOUNT_SUBMISSION_BLOCKED_EVENT, API_PATHS, ARCHIVE_ZIPPER, AUTH_TRACK_EVENTS, AccordionHeader, AccordionItem$1, AccordionPanel, AccordionRoot, AccordionTrigger$1, AccountSubmissionBlockedError, ActionListItem, ActionListPanel, ActionListSeparator, ActivityIcon, AlertCircle, AlertDialogRoot, AlertTriangle, AlertTriangleIcon, ApiError, AppWindow, Archive, ArrowDown, ArrowDownToLine, ArrowLeft, ArrowLeftRight, ArrowLeftToLine, ArrowRight, ArrowRightToLine, ArrowUp, ArrowUpDown, ArrowUpFromLine, ArrowUpRight, ArrowUpToLine, AssetMetadataStoreContext, AtSign, AudioLines, AudioWaveform$1, AvatarImage$1, BACKEND_VIBE_STORYBOARD, BODY, BROWSER_ASSET_SOURCE_METADATA_KEYS, BROWSER_IMAGE_EDIT_EVENT, BadgeCheck, BadgeInfo, Bell, BellRing, BidiSpan, BlockPolicy, Bold$1, BookUser, Bot, Box, BoxSelect, Boxes, Brain$2, BubbleMenu, Bug, Button$3, CDN_BASE_MAP, CDN_BROWSER_START_ICON, CONNECTOR_STATUS_VISUAL, CONNECTOR_TOKEN_SOURCE, CSS$1, Calculator, CanvasNodeType, ChangeSet, CharCategory, ChartNoAxesCombined, Check, Check$2, CheckCheck, CheckCircle2, CheckCircle2Icon, CheckboxRoot, ChevronDown, ChevronDown$2, ChevronDownIcon$1, ChevronLeft, ChevronLeftIcon, ChevronRight$1, ChevronRightIcon, ChevronUp, ChevronUpIcon, CircleAlert, CircleAlert$2, CircleArrowUp, CircleCheckIcon, CircleIcon, CircleMinus, CircleX, Clapperboard$2, ClientOnly, ClipboardIcon, ClipboardList, Cloud, CloudDownload, CloudIcon, CloudUpload, Code$1, Cog, Command, CommentEnd, Compass, CompositedSvg, ConnectionTargetMarker, ContextMenuRoot, ContextMenuTrigger$1, Copy, CopyPlus, CreditCard, Crosshair, Crown, CurrentWorkspaceContext, DEFAULT_RUNTIME_CONFIG, DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT, DOMParser$1, DOMSerializer, Decoration$1, Decoration2, DecorationSet, DialogBackdrop, DialogClose$1, DialogDescription$2, DialogPopup, DialogPortal$2, DialogRoot, DialogTitle$2, DialogTrigger$1, Direction, DndContext, Download$2, DownloadIcon, DragOverlay, EditorContent, EditorSelection, Ellipsis, EmptyLine, Extension, ExternalLink, ExternalLink$2, ExternalTokenizer, Eye, Eye$2, EyeIcon$1, EyeOff, EyeOffIcon$1, FILE_TYPE_EXTENSIONS, FOLD, Facet, FieldControl, FieldRoot, File$3, FileImage, FilePlus2, Film, Film$2, FolderClock, FolderClosed, FolderInput, FolderInput$2, FolderMinus, FolderOpenIcon, FolderPlus, FolderUp, FolderX, GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT, GLOBAL_STORAGE_VERSION, GRID_COLUMN_COUNT_WIDE, GROUP_ID_HEADER, GatewayScopeContext, Gauge, GiftIcon, GitCompare, Globe, Globe2, GraduationCap, Grid2X2, Grid2x2Plus, Grid3X3, GripHorizontalIcon, GripVertical, HILO_HUB_BIZ_LINE, HILO_WORKSPACE_GENERATION_QUERY, HILO_WORKSPACE_IDENTITY_HEADER, HILO_WORKSPACE_IDENTITY_QUERY, HILO_WORKSPACE_INSTANCE_QUERY, Hand, Headphones, Headphones$2, HistoryIcon, Home, ICON_STROKE_SPEC, IconCompositingContext, ImagePlus, Import, Inbox, InfiniteQueryObserver, Info$1, InfoIcon$1, Italic$1, IterMode, JPEG, KeyRound, Keyboard, KeyboardSensor, LIBTV_CONNECTOR, Languages, Layers, Layers2, Layers3, LayoutGrid, LayoutList, LayoutTemplate, Library, Lightbulb, Link2, ListChecks, Loader2, Loader2Icon, LoaderCircle, Lock, LockKeyhole, MEDIA_EXTENSIONS, MEDIA_LINEAGE_MAX_REFERENCES, MEDIA_LINEAGE_REQUEST_HEADER, MIN_SELECTED_NODE_SIZE, Mail, Map$1, MapPin, Maximize, Megaphone$2, MenuGroup, MenuGroupLabel, MenuItem$3, MenuPopup, MenuPortal, MenuPositioner, MenuRadioGroup, MenuRadioItem, MenuRadioItemIndicator, MenuRoot, MenuSubmenuRoot, MenuSubmenuTrigger, MenuTrigger, MessageCircle, MessageCircleMore, MessageSquareMore, Minus, MinusIcon, Monitor, MonitorUp, MonochromeIcon, MoreHorizontal, Music, Music$2, Music2, NODE_HIT_SLOP, Network, Newspaper, Node$3, Node$4, NodeSelection, NodeViewWrapper, NotebookPen, OctagonXIcon, Operation, PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP, PERF_LOG_FLUSH, PROMPT_FONT_SIZE_DEFAULT, PROMPT_FONT_SIZE_MAX, PROMPT_FONT_SIZE_MIN, Package$2, PackageSearch, Palette, PanelBottomClose, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PanelsTopLeft, Pencil, PencilRuler, Phone, Pin, PinIcon, PinOff, PlatformContext, PlaybackCirclePauseIcon$1, PlaybackCirclePlayIcon$1, PlaybackCircleToggleIcon, PlaybackNextIcon$1, PlaybackPauseIcon$1, PlaybackPlayIcon$1, PlaybackPreviousIcon$1, PlaybackStopIcon$1, Plugin, PluginKey, Plus, Plus$1, Plus$2, PlusCircle, Podcast, PointerSensor, PopoverArrow$1, PopoverPopup, PopoverPortal, PopoverPositioner, PopoverRoot, PopoverTrigger$1, Power, Prec, PreviewCardPopup, PreviewCardPortal, PreviewCardPositioner, PreviewCardRoot, PreviewCardTrigger$1, ProcessingEnd, ProgressRoot, QUERY_KEY$1, QueryClient, QueryClientProvider, RadioGroup$1, RadioIndicator, RadioRoot, RangeSetBuilder, React, ReactNodeViewRenderer, Redo2, Regex, Repeat2, RotateCcw, RotateCw, RouterCore, SELECTED_GLOW_BLUR, SPECIAL_CONNECTORS, Save, Scan, Scissors, ScrollAreaCorner, ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport, ScrollText, Search, Search$2, SearchIcon, SelectIcon, SelectItem$2, SelectItemIndicator, SelectItemText, SelectList, SelectPopup, SelectPortal, SelectPositioner, SelectRoot, SelectScrollDownArrow, SelectScrollUpArrow, SelectTrigger$2, SelectValue$2, Selection, Send, ServerIcon, ServerOff, Share2, Share2$2, ShieldAlert, ShieldCheck, ShieldCheckIcon, ShieldOff, ShoppingBag$2, Shuffle, Slash, Slice, SliderControl$1, SliderIndicator, SliderRoot, SliderThumb, SliderTrack, Smartphone, Speech, Split, Square$2, SquareDashed, SquareMousePointer, StarterKit, StateEffect, StateField, Step, StepMap, StepResult, StickyNote, StyleModule, Sun, SwatchBook, SwitchRoot, SwitchThumb, TAB_CONTENT_ENTER_CLASS_NAME, TableView2, TabsIndicator, TabsList$1, TabsPanel, TabsRoot, TabsTab, Tag$1, Text, TextSelection, ThumbsDown, ThumbsUp, Toggle$1, ToggleGroup$1, TooltipPopup, TooltipPortal, TooltipPositioner, TooltipProvider$2, TooltipRoot, TooltipTrigger$1, Transaction2, Trash2$2, Trash2Icon, TreeFragment, TrendingUp, TriangleAlert, TriangleAlertIcon, Tv, U$3, Underline$1, Undo2, Ungroup$1, UploadIcon$1, User, UserRound, UserRoundPlus, UsersIcon, Video, Video$2, VideoOff, ViewPlugin, Volume2, Volume2Icon, VolumeXIcon, WORKSPACE_IDENTITY_MISMATCH_CODE, WORKSPACE_STORAGE_DEFAULTS, Wand2, WandSparkles, WholeWord, WidgetType2, WifiIcon, WifiOff, WifiOffIcon, Workflow, WorkspaceGatewayClient, Wrench, Wrench$2, X$7, XIcon, Zap, ZoomIn, ZoomOut, __ovVitePreload, __webpack_exports__getDocument, attrsEqual, basename$8, browserAssetSourceMetadata, browserImageEditPrompt, buildOfficialConnectorList, callOrReturn, cdnPublicAsset, classifyFileType, clientExports, closeHistory, closestCenter, clsx, collectMediaResultRecords, combineConfig, commands_exports, compareSemver, connectorDescription, connectorPromptActionLabelKey, connectorSummaryActionLabelKey, create$2, createConnectorInventory, createControlledPromise, createFileRoute, createRootRoute, createStore$1, createTailwindMerge, crelt, decisionVersion, decodeHtmlEntities, defineLanguageFacet, deriveActiveScope, deriveTeamCreditDisplay, desktopMediaIcon, dispatchAccountSubmissionBlocked, editorDocSnapshot, emit$5, emptyConnectorMarketPolicy, encodeHtmlEntities, estimateGridRowSize, findClusterBreak, findConnectionTarget, findConnectorMentions, findHcpConnector, findHitTarget, flattenExtensions, flowPointToMiniMap, flush, focusManager, formatDate, formatErrorMessage, generateJSON, getCdnRegion, getDefaultExportFromCjs$1, getExtensionField, getFileActivityKind, getIconStrokeWidth, getLocationChangeInfo, getMergedHcpCatalog, getRuntimeConfig, getSchema, getSkillCoverUrl, getStoreFactory, getVisibleCloudUploads, hasMediaAnalysisFailure, hcpToDefinition, indentString, inferMediaKind, initReactI18next, invariant, isBrowserImageEditRequest, isCancelledError, isNotFound, isRecord$2, isRecord$g, isRedirect, isServer$1, isSkillsOnly, isUserProvidedAssetModel, isWorkspaceFolderMissingError, isWorkspaceIdentityErrorCode, jsxRuntimeExports, lazyRouteComponent, listeners$8, localizedI18nText, logException, m$4, makeLogger, marksEqual, matchesLocalConnectorServer, matchesRemoteConnectorServer, measurePerf, mediaLineageRequestId, mergeAttributes, mergeProps$1, minCreditAmount, namesMatch, nodeToMiniMapRect, normalizeGatewayBaseUrl, normalizeLabel$1, orderTidyNodes, parseSemver, pendingLogLines, pinnedTidyNodeIds, probeMediaDurationSec, queryOptions, rangeFrom, rangeTo, raw, reactDomExports, reactExports, readRecord, redirect, redo$1, redoDepth$1, regionToLocale, registerDynamicHcpManifests, remarkGfm, remarkParse, remarkRehype, replaceEqualDeep$1, resolveConnectorIcon, resolveConnectorSetupAsset, resolveNewProjectPreferences, rootRouteId, satisfiesMinHubVersion, selectGeneratedMediaNodeIds, selectedRequestGroupId, shallow, shimExports, sortExtensions, src_default$1, storageKeys, supportsConnectorDialog, tags$1, tidyNodeName, toJsxRuntime, trimPathRight, tryParseJson$1, undo$1, undoDepth$1, unified, updateNewProjectPreferences, uploadResponseFilename, urlAttributes, useCurrentWorkspace, useEditor, useEditorState$1, useGatewayBaseUrl, useGatewayScope, useIsMutating, useIsoLayoutEffect, useMusicPromptLayout, useMutation, useNavigate, useNewProjectFolder, useParams, usePlatform, usePromptFontSizeStore, useQueries, useQuery, useQueryClient, useRender, useRouter, useSearch, useSensor, useSensors, useStorage, useStore$2, useTimeout, useTranslation, useVirtualizer, videoPlaybackPath, visit, withArtworkOpacity, withAutomaticDedupeId, withIconCompositing, withWorkspaceGatewayHeaders, workspaceGatewayUrl, workspaceLog, x$4, z$3 };
export{ADTS,AUDIO_CODECS,AdtsInputFormat,AdtsOutputFormat,AudioSample,AudioSampleSink,AudioSampleSource,BlobSource,BufferTarget,CanvasSink,ConversionCanceledError,CustomAudioEncoder,CustomPathedSource,EncodedAudioPacketSource,EncodedPacket,EncodedPacketSink,EncodedVideoPacketSource,FLAC,FlacInputFormat,FlacOutputFormat,InputAudioTrack,InputFormat,InputVideoTrack,IsobmffInputFormat,MATROSKA,MP3,MP4,MPEG_TS,MatroskaInputFormat,MkvOutputFormat,MovOutputFormat,Mp3InputFormat,Mp3OutputFormat,Mp4OutputFormat,NON_PCM_AUDIO_CODECS,NullTarget,OGG,OggInputFormat,OggOutputFormat,Output,OutputTrackGroup,PathedSource,QTFF,QUALITY_HIGH,QuickTimeInputFormat,ReadableStreamSource,Source,SourceRef,UnsupportedInputFormatError,UrlSource,VIDEO_CODECS,VideoSample,VideoSampleSink,VideoSampleSource,WAVE,WEBM,WavOutputFormat,WaveInputFormat,WebMInputFormat,WebMOutputFormat,desc,getEncodableAudioCodecs,getFirstEncodableVideoCodec,prefer,registerEncoder}from"mediabunny";
