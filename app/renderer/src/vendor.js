import { EntityDecoder, DecodingMode } from "entities";
import { Parser as Parser2, TokenizerMode } from "parse5";
import { fromParse5 } from "hast-util-from-parse5";
import { ok as ok$1 } from "devlop";
import { raw } from "hast-util-raw";
import { webNamespaces } from "web-namespaces";
import { toParse5 } from "hast-util-to-parse5";
import { ShikiError as ShikiError$1 } from "@shikijs/types";
import { splitLines, codeToTokensWithThemes, getLastGrammarStateFromMap, setLastGrammarStateToMap, resolveColorReplacements, codeToTokensBase, applyColorReplacements, isSpecialTheme, normalizeTheme, normalizeGetter, resolveLangAlias, resolveLangs, getLastGrammarState, isSpecialLang } from "@shikijs/primitive";
import { ShikiError as ShikiError$2, createBundledHighlighter } from "@shikijs/core";
import { createOnigurumaEngine } from "@shikijs/engine-oniguruma";
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
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
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
function requireReact() {
  return __ov_react;
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
var Xt$2 = Object.defineProperty;
var a$1 = (t2, e2) => () => (t2 && (e2 = t2(t2 = 0)), e2);
var s$4 = (t2, e2) => {
  for (var p3 in e2) Xt$2(t2, p3, {
    get: e2[p3],
    enumerable: true
  });
};
var P$7 = {};
s$4(P$7, {
  default: () => Wt$2
});
var Wt$2,
  F$6 = a$1(() => {
    Wt$2 = [{
      type: "cmnt",
      match: /(;|#).*/gm
    }, {
      expand: "str"
    }, {
      expand: "num"
    }, {
      type: "num",
      match: /\$[\da-fA-F]*\b/g
    }, {
      type: "kwd",
      match: /^[a-z]+\s+[a-z.]+\b/gm,
      sub: [{
        type: "func",
        match: /^[a-z]+/g
      }]
    }, {
      type: "kwd",
      match: /^\t*[a-z][a-z\d]*\b/gm
    }, {
      match: /%|\$/g,
      type: "oper"
    }];
  });
var $$8 = {};
s$4($$8, {
  default: () => T$6
});
var M$7,
  T$6,
  f$4 = a$1(() => {
    M$7 = {
      type: "var",
      match: /\$\w+|\${[^}]*}|\$\([^)]*\)/g
    }, T$6 = [{
      sub: "todo",
      match: /#.*/g
    }, {
      type: "str",
      match: /(["'])((?!\1)[^\r\n\\]|\\[^])*\1?/g,
      sub: [M$7]
    }, {
      type: "oper",
      match: /(?<=\s|^)\.*\/[a-z/_.-]+/gi
    }, {
      type: "kwd",
      match: /\s-[a-zA-Z]+|$<|[&|;]+|\b(unset|readonly|shift|export|if|fi|else|elif|while|do|done|for|until|case|esac|break|continue|exit|return|trap|wait|eval|exec|then|declare|enable|local|select|typeset|time|add|remove|install|update|delete)(?=\s|$)/g
    }, {
      expand: "num"
    }, {
      type: "func",
      match: /(?<=(^|\||\&\&|\;)\s*)[a-z_.-]+(?=\s|$)/gmi
    }, {
      type: "bool",
      match: /(?<=\s|^)(true|false)(?=\s|$)/g
    }, {
      type: "oper",
      match: /[=(){}<>!]+/g
    }, {
      type: "var",
      match: /(?<=\s|^)[\w_]+(?=\s*=)/g
    }, M$7];
  });
var v$7 = {};
s$4(v$7, {
  default: () => jt$2
});
var jt$2,
  B$7 = a$1(() => {
    jt$2 = [{
      match: /[^\[\->+.<\]\s].*/g,
      sub: "todo"
    }, {
      type: "func",
      match: /\.+/g
    }, {
      type: "kwd",
      match: /[<>]+/g
    }, {
      type: "oper",
      match: /[+-]+/g
    }];
  });
var G$5 = {};
s$4(G$5, {
  default: () => Kt$1
});
var Kt$1,
  H$5 = a$1(() => {
    Kt$1 = [{
      match: /\/\/.*\n?|\/\*((?!\*\/)[^])*(\*\/)?/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      expand: "num"
    }, {
      type: "kwd",
      match: /#\s*include (<.*>|".*")/g,
      sub: [{
        type: "str",
        match: /(<|").*/g
      }]
    }, {
      match: /asm\s*{[^}]*}/g,
      sub: [{
        type: "kwd",
        match: /^asm/g
      }, {
        match: /[^{}]*(?=}$)/g,
        sub: "asm"
      }]
    }, {
      type: "kwd",
      match: /\*|&|#[a-z]+\b|\b(asm|auto|double|int|struct|break|else|long|switch|case|enum|register|typedef|char|extern|return|union|const|float|short|unsigned|continue|for|signed|void|default|goto|sizeof|volatile|do|if|static|while)\b/g
    }, {
      type: "oper",
      match: /[/*+:?&|%^~=!,<>.^-]+/g
    }, {
      type: "func",
      match: /[a-zA-Z_][\w_]*(?=\s*\()/g
    }, {
      type: "class",
      match: /\b[A-Z][\w_]*\b/g
    }];
  });
var _$5 = {};
s$4(_$5, {
  default: () => Vt$1
});
var Vt$1,
  k$6 = a$1(() => {
    Vt$1 = [{
      match: /\/\*((?!\*\/)[^])*(\*\/)?/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      type: "kwd",
      match: /@\w+\b|\b(and|not|only|or)\b|\b[a-z-]+(?=[^{}]*{)/g
    }, {
      type: "var",
      match: /\b[\w-]+(?=\s*:)|(::?|\.)[\w-]+(?=[^{}]*{)/g
    }, {
      type: "func",
      match: /#[\w-]+(?=[^{}]*{)/g
    }, {
      type: "num",
      match: /#[\da-f]{3,8}/g
    }, {
      type: "num",
      match: /\d+(\.\d+)?(cm|mm|in|px|pt|pc|em|ex|ch|rem|vm|vh|vmin|vmax|%)?/g,
      sub: [{
        type: "var",
        match: /[a-z]+|%/g
      }]
    }, {
      match: /url\([^)]*\)/g,
      sub: [{
        type: "func",
        match: /url(?=\()/g
      }, {
        type: "str",
        match: /[^()]+/g
      }]
    }, {
      type: "func",
      match: /\b[a-zA-Z]\w*(?=\s*\()/g
    }, {
      type: "num",
      match: /\b[a-z-]+\b/g
    }];
  });
var z$7 = {};
s$4(z$7, {
  default: () => qt$2
});
var qt$2,
  Y$4 = a$1(() => {
    qt$2 = [{
      expand: "strDouble"
    }, {
      type: "oper",
      match: /,/g
    }];
  });
var Z$4 = {};
s$4(Z$4, {
  default: () => I$5
});
var I$5,
  N$4 = a$1(() => {
    I$5 = [{
      type: "deleted",
      match: /^[-<].*/gm
    }, {
      type: "insert",
      match: /^[+>].*/gm
    }, {
      type: "kwd",
      match: /!.*/gm
    }, {
      type: "section",
      match: /^@@.*@@$|^\d.*|^([*-+])\1\1.*/gm
    }];
  });
var X$6 = {};
s$4(X$6, {
  default: () => Qt$1
});
var Qt$1,
  W$7 = a$1(() => {
    f$4();
    Qt$1 = [{
      type: "kwd",
      match: /^(FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/gmi
    }, ...T$6];
  });
var j$5 = {};
s$4(j$5, {
  default: () => Jt$2
});
var Jt$2,
  K$6 = a$1(() => {
    N$4();
    Jt$2 = [{
      match: /^#.*/gm,
      sub: "todo"
    }, {
      expand: "str"
    }, ...I$5, {
      type: "func",
      match: /^(\$ )?git(\s.*)?$/gm
    }, {
      type: "kwd",
      match: /^commit \w+$/gm
    }];
  });
var V$6 = {};
s$4(V$6, {
  default: () => te$3
});
var te$3,
  q$5 = a$1(() => {
    te$3 = [{
      match: /\/\/.*\n?|\/\*((?!\*\/)[^])*(\*\/)?/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      expand: "num"
    }, {
      type: "kwd",
      match: /\*|&|\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g
    }, {
      type: "func",
      match: /[a-zA-Z_][\w_]*(?=\s*\()/g
    }, {
      type: "class",
      match: /\b[A-Z][\w_]*\b/g
    }, {
      type: "oper",
      match: /[+\-*\/%&|^~=!<>.^-]+/g
    }];
  });
var J$6 = {};
s$4(J$6, {
  default: () => A$5,
  name: () => u$4,
  properties: () => l$4,
  xmlElement: () => o$5
});
var Q$6,
  ee$3,
  u$4,
  l$4,
  o$5,
  A$5,
  R$6 = a$1(() => {
    Q$6 = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�", ee$3 = Q$6 + "\\-\\.0-9·̀-ͯ‿-⁀", u$4 = `[${Q$6}][${ee$3}]*`, l$4 = `\\s*(\\s+${u$4}\\s*(=\\s*([^"']\\S*|("|')(\\\\[^]|(?!\\4)[^])*\\4?)?)?\\s*)*`, o$5 = {
      match: RegExp(`<[/!?]?${u$4}${l$4}[/!?]?>`, "g"),
      sub: [{
        type: "var",
        match: RegExp(`^<[/!?]?${u$4}`, "g"),
        sub: [{
          type: "oper",
          match: /^<[\/!?]?/g
        }]
      }, {
        type: "str",
        match: /=\s*([^"']\S*|("|')(\\[^]|(?!\2)[^])*\2?)/g,
        sub: [{
          type: "oper",
          match: /^=/g
        }]
      }, {
        type: "oper",
        match: /[\/!?]?>/g
      }, {
        type: "class",
        match: RegExp(u$4, "g")
      }]
    }, A$5 = [{
      match: /<!--((?!-->)[^])*-->/g,
      sub: "todo"
    }, {
      type: "class",
      match: /<!\[CDATA\[[\s\S]*?\]\]>/gi
    }, o$5, {
      type: "str",
      match: RegExp(`<\\?${u$4}([^?]|\\?[^?>])*\\?+>`, "g"),
      sub: [{
        type: "var",
        match: RegExp(`^<\\?${u$4}`, "g"),
        sub: [{
          type: "oper",
          match: /^<\?/g
        }]
      }, {
        type: "oper",
        match: /\?+>$/g
      }]
    }, {
      type: "var",
      match: /&(#x?)?[\da-z]{1,8};/gi
    }];
  });
var tt$4 = {};
s$4(tt$4, {
  default: () => ae$3
});
var ae$3,
  et$4 = a$1(() => {
    R$6();
    ae$3 = [{
      type: "class",
      match: /<!DOCTYPE("[^"]*"|'[^']*'|[^"'>])*>/gi,
      sub: [{
        type: "str",
        match: /"[^"]*"|'[^']*'/g
      }, {
        type: "oper",
        match: /^<!|>$/g
      }, {
        type: "var",
        match: /DOCTYPE/gi
      }]
    }, {
      match: RegExp(`<style${l$4}>((?!</style>)[^])*</style\\s*>`, "g"),
      sub: [{
        match: RegExp(`^<style${l$4}>`, "g"),
        sub: o$5.sub
      }, {
        match: RegExp(`${o$5.match}|[^]*(?=</style\\s*>$)`, "g"),
        sub: "css"
      }, o$5]
    }, {
      match: RegExp(`<script${l$4}>((?!<\/script>)[^])*<\/script\\s*>`, "g"),
      sub: [{
        match: RegExp(`^<script${l$4}>`, "g"),
        sub: o$5.sub
      }, {
        match: RegExp(`${o$5.match}|[^]*(?=<\/script\\s*>$)`, "g"),
        sub: "js"
      }, o$5]
    }, ...A$5];
  });
var se$3,
  E$7,
  d$4 = a$1(() => {
    se$3 = [["bash", [/#!(\/usr)?\/bin\/bash/g, 500], [/\b(if|elif|then|fi|echo)\b|\$/g, 10]], ["html", [/<\/?[a-z-]+[^\n>]*>/g, 10], [/^\s+<!DOCTYPE\s+html/g, 500]], ["http", [/^(GET|HEAD|POST|PUT|DELETE|PATCH|HTTP)\b/g, 500]], ["js", [/\b(console|await|async|function|export|import|this|class|for|let|const|map|join|require|document|window)\b/g, 10]], ["ts", [/\b(console|await|async|function|export|import|this|class|for|let|const|map|join|require|document|window|implements|interface|namespace)\b/g, 10]], ["py", [/\b(def|print|await|async|class|and|or|lambda|import|from|self|asyncio|pass|True|False|None|__init__)\b/g, 10]], ["sql", [/\b(SELECT|INSERT|FROM)\b/g, 50]], ["pl", [/#!(\/usr)?\/bin\/perl/g, 500], [/\b(use|print)\b|\$/g, 10]], ["lua", [/#!(\/usr)?\/bin\/lua/g, 500]], ["make", [/\b(ifneq|endif|if|elif|then|fi|echo|.PHONY|^[a-z]+ ?:$)\b|\$/gm, 10]], ["uri", [/https?:|mailto:|tel:|ftp:/g, 30]], ["css", [/^(@import|@page|@media|(\.|#)[a-z]+)/gm, 20]], ["diff", [/^[+><-]/gm, 10], [/^@@ ?[-+,0-9 ]+ ?@@/gm, 25]], ["md", [/^(>|\t\*|\t\d+.)/gm, 10], [/\[.*\](.*)/g, 10]], ["docker", [/^(FROM|ENTRYPOINT|RUN)/gm, 500]], ["xml", [/<\/?[a-z-]+[^\n>]*>/g, 10], [/^<\?xml/g, 500]], ["c", [/#include\b|\bprintf\s+\(/g, 100]], ["rs", [/^\s+(use|fn|mut|match)\b/gm, 100]], ["go", [/\b(func|fmt|package)\b/g, 100]], ["java", [/^import\s+java/gm, 500]], ["asm", [/^(section|global main|extern|\t(call|mov|ret))/gm, 100]], ["css", [/^(@import|@page|@media|(\.|#)[a-z]+)/gm, 20]], ["json", [/\b(true|false|null|\{})\b|\"[^"]+\":/g, 10]], ["yaml", [/^(\s+)?[a-z][a-z0-9]*:/gmi, 10]]], E$7 = t2 => se$3.map(([e2, ...p3]) => [e2, p3.reduce((n2, [m3, c3]) => n2 + [...t2.matchAll(m3)].length * c3, 0)]).filter(([e2, p3]) => p3 > 20).sort((e2, p3) => p3[1] - e2[1])[0]?.[0] || "plain";
  });
var at$3 = {};
s$4(at$3, {
  default: () => pe$2
});
var pe$2,
  st$3 = a$1(() => {
    d$4();
    pe$2 = [{
      type: "kwd",
      match: /^(GET|HEAD|POST|PUT|DELETE|CONNECT|OPTIONS|TRACE|PATCH|PRI|SEARCH)\b/gm
    }, {
      expand: "str"
    }, {
      type: "section",
      match: /\bHTTP\/[\d.]+\b/g
    }, {
      expand: "num"
    }, {
      type: "oper",
      match: /[,;:=]/g
    }, {
      type: "var",
      match: /[a-zA-Z][\w-]*(?=:)/g
    }, {
      match: /\n\n[^]*/g,
      sub: E$7
    }];
  });
var pt$2 = {};
s$4(pt$2, {
  default: () => ne$4
});
var ne$4,
  nt$4 = a$1(() => {
    ne$4 = [{
      match: /(^[ \f\t\v]*)[#;].*/gm,
      sub: "todo"
    }, {
      type: "var",
      match: /.*(?==)/g
    }, {
      type: "section",
      match: /^\s*\[.+\]\s*$/gm
    }, {
      type: "oper",
      match: /=/g
    }, {
      type: "str",
      match: /.*/g
    }];
  });
var ct$3 = {};
s$4(ct$3, {
  default: () => ce$3
});
var ce$3,
  mt$2 = a$1(() => {
    ce$3 = [{
      match: /\/\/.*\n?|\/\*((?!\*\/)[^])*(\*\/)?/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      expand: "num"
    }, {
      type: "kwd",
      match: /\b(abstract|assert|boolean|break|byte|case|catch|char|class|continue|const|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|package|private|protected|public|requires|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while)\b/g
    }, {
      type: "oper",
      match: /[/*+:?&|%^~=!,<>.^-]+/g
    }, {
      type: "func",
      match: /[a-zA-Z_][\w_]*(?=\s*\()/g
    }, {
      type: "class",
      match: /\b[A-Z][\w_]*\b/g
    }];
  });
var rt$3 = {};
s$4(rt$3, {
  default: () => O$6
});
var O$6,
  L$7 = a$1(() => {
    O$6 = [{
      match: /\/\*\*((?!\*\/)[^])*(\*\/)?/g,
      sub: "jsdoc"
    }, {
      match: /\/\/.*\n?|\/\*((?!\*\/)[^])*(\*\/)?/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      match: /`((?!`)[^]|\\[^])*`?/g,
      sub: "js_template_literals"
    }, {
      type: "kwd",
      match: /=>|\b(this|set|get|as|async|await|break|case|catch|class|const|constructor|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|let|var|of|new|package|private|protected|public|return|static|super|switch|throw|throws|try|typeof|void|while|with|yield)\b/g
    }, {
      match: /\/((?!\/)[^\r\n\\]|\\.)+\/[dgimsuy]*/g,
      sub: "regex"
    }, {
      expand: "num"
    }, {
      type: "num",
      match: /\b(NaN|null|undefined|[A-Z][A-Z_]*)\b/g
    }, {
      type: "bool",
      match: /\b(true|false)\b/g
    }, {
      type: "oper",
      match: /[/*+:?&|%^~=!,<>.^-]+/g
    }, {
      type: "class",
      match: /\b[A-Z][\w_]*\b/g
    }, {
      type: "func",
      match: /[a-zA-Z$_][\w$_]*(?=\s*((\?\.)?\s*\(|=\s*(\(?[\w,{}\[\])]+\)? =>|function\b)))/g
    }];
  });
var ot$3 = {};
s$4(ot$3, {
  default: () => me$1,
  type: () => re$6
});
var me$1,
  re$6,
  ut$2 = a$1(() => {
    me$1 = [{
      match: new class {
        exec(t2) {
          let e2 = this.lastIndex,
            p3,
            n2 = m3 => {
              for (; ++e2 < t2.length - 2;) if (t2[e2] == "{") n2();else if (t2[e2] == "}") return;
            };
          for (; e2 < t2.length; ++e2) if (t2[e2 - 1] != "\\" && t2[e2] == "$" && t2[e2 + 1] == "{") return p3 = e2++, n2(), this.lastIndex = e2 + 1, {
            index: p3,
            0: t2.slice(p3, e2 + 1)
          };
          return null;
        }
      }(),
      sub: [{
        type: "kwd",
        match: /^\${|}$/g
      }, {
        match: /(?!^\$|{)[^]+(?=}$)/g,
        sub: "js"
      }]
    }], re$6 = "str";
  });
var lt$3 = {};
s$4(lt$3, {
  default: () => x$8,
  type: () => oe$3
});
var x$8,
  oe$3,
  S$7 = a$1(() => {
    x$8 = [{
      type: "err",
      match: /\b(TODO|FIXME|DEBUG|OPTIMIZE|WARNING|XXX|BUG)\b/g
    }, {
      type: "class",
      match: /\bIDEA\b/g
    }, {
      type: "insert",
      match: /\b(CHANGED|FIX|CHANGE)\b/g
    }, {
      type: "oper",
      match: /\bQUESTION\b/g
    }], oe$3 = "cmnt";
  });
var Et$2 = {};
s$4(Et$2, {
  default: () => ue$3,
  type: () => le$3
});
var ue$3,
  le$3,
  ht$2 = a$1(() => {
    S$7();
    ue$3 = [{
      type: "kwd",
      match: /@\w+/g
    }, {
      type: "class",
      match: /{[\w\s|<>,.@\[\]]+}/g
    }, {
      type: "var",
      match: /\[[\w\s="']+\]/g
    }, ...x$8], le$3 = "cmnt";
  });
var it$3 = {};
s$4(it$3, {
  default: () => Ee$3
});
var Ee$3,
  gt$2 = a$1(() => {
    Ee$3 = [{
      type: "var",
      match: /(("|')((?!\2)[^\r\n\\]|\\[^])*\2|[a-zA-Z]\w*)(?=\s*:)/g
    }, {
      expand: "str"
    }, {
      expand: "num"
    }, {
      type: "num",
      match: /\bnull\b/g
    }, {
      type: "bool",
      match: /\b(true|false)\b/g
    }];
  });
var dt$4 = {};
s$4(dt$4, {
  default: () => C$a
});
var C$a,
  D$7 = a$1(() => {
    d$4();
    C$a = [{
      type: "cmnt",
      match: /^>.*|(=|-)\1+/gm
    }, {
      type: "class",
      match: /\*\*((?!\*\*).)*\*\*/g
    }, {
      match: /```((?!```)[^])*\n```/g,
      sub: t2 => ({
        type: "kwd",
        sub: [{
          match: /\n[^]*(?=```)/g,
          sub: t2.split(`
`)[0].slice(3) || E$7(t2)
        }]
      })
    }, {
      type: "str",
      match: /`[^`]*`/g
    }, {
      type: "var",
      match: /~~((?!~~).)*~~/g
    }, {
      type: "kwd",
      match: /\b_\S([^\n]*?\S)?_\b|\*\S([^\n]*?\S)?\*/g
    }, {
      type: "kwd",
      match: /^\s*(\*|\d+\.)\s/gm
    }, {
      type: "func",
      match: /\[[^\]]*]\([^)]*\)|<[^>]*>/g,
      sub: [{
        type: "oper",
        match: /^\[[^\]]*]/g
      }]
    }];
  });
var bt$3 = {};
s$4(bt$3, {
  default: () => he$3
});
var he$3,
  yt$2 = a$1(() => {
    D$7();
    d$4();
    he$3 = [{
      type: "insert",
      match: /(leanpub-start-insert)((?!leanpub-end-insert)[^])*(leanpub-end-insert)?/g,
      sub: [{
        type: "insert",
        match: /leanpub-(start|end)-insert/g
      }, {
        match: /(?!leanpub-start-insert)((?!leanpub-end-insert)[^])*/g,
        sub: E$7
      }]
    }, {
      type: "deleted",
      match: /(leanpub-start-delete)((?!leanpub-end-delete)[^])*(leanpub-end-delete)?/g,
      sub: [{
        type: "deleted",
        match: /leanpub-(start|end)-delete/g
      }, {
        match: /(?!leanpub-start-delete)((?!leanpub-end-delete)[^])*/g,
        sub: E$7
      }]
    }, ...C$a];
  });
var Tt$2 = {};
s$4(Tt$2, {
  default: () => ie$4
});
var ie$4,
  ft$3 = a$1(() => {
    ie$4 = [{
      type: "cmnt",
      match: /^#.*/gm
    }, {
      expand: "strDouble"
    }, {
      expand: "num"
    }, {
      type: "err",
      match: /\b(err(or)?|[a-z_-]*exception|warn|warning|failed|ko|invalid|not ?found|alert|fatal)\b/gi
    }, {
      type: "num",
      match: /\b(null|undefined)\b/gi
    }, {
      type: "bool",
      match: /\b(false|true|yes|no)\b/gi
    }, {
      type: "oper",
      match: /\.|,/g
    }];
  });
var It$1 = {};
s$4(It$1, {
  default: () => ge$2
});
var ge$2,
  Nt$1 = a$1(() => {
    ge$2 = [{
      match: /^#!.*|--(\[(=*)\[((?!--\]\2\])[^])*--\]\2\]|.*)/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      type: "kwd",
      match: /\b(and|break|do|else|elseif|end|for|function|if|in|local|not|or|repeat|return|then|until|while)\b/g
    }, {
      type: "bool",
      match: /\b(true|false|nil)\b/g
    }, {
      type: "oper",
      match: /[+*/%^#=~<>:,.-]+/g
    }, {
      expand: "num"
    }, {
      type: "func",
      match: /[a-z_]+(?=\s*[({])/g
    }];
  });
var At$3 = {};
s$4(At$3, {
  default: () => de$4
});
var de$4,
  Rt$2 = a$1(() => {
    de$4 = [{
      match: /^\s*#.*/gm,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      type: "oper",
      match: /[${}()]+/g
    }, {
      type: "class",
      match: /.PHONY:/gm
    }, {
      type: "section",
      match: /^[\w.]+:/gm
    }, {
      type: "kwd",
      match: /\b(ifneq|endif)\b/g
    }, {
      expand: "num"
    }, {
      type: "var",
      match: /[A-Z_]+(?=\s*=)/g
    }, {
      match: /^.*$/gm,
      sub: "bash"
    }];
  });
var Ot$2 = {};
s$4(Ot$2, {
  default: () => be$2
});
var be$2,
  Lt$1 = a$1(() => {
    be$2 = [{
      match: /#.*/g,
      sub: "todo"
    }, {
      type: "str",
      match: /(["'])(\\[^]|(?!\1)[^])*\1?/g
    }, {
      expand: "num"
    }, {
      type: "kwd",
      match: /\b(any|break|continue|default|delete|die|do|else|elsif|eval|for|foreach|given|goto|if|last|local|my|next|our|package|print|redo|require|return|say|state|sub|switch|undef|unless|until|use|when|while|not|and|or|xor)\b/g
    }, {
      type: "oper",
      match: /[-+*/%~!&<>|=?,]+/g
    }, {
      type: "func",
      match: /[a-z_]+(?=\s*\()/g
    }];
  });
var xt$2 = {};
s$4(xt$2, {
  default: () => ye$2
});
var ye$2,
  St$2 = a$1(() => {
    ye$2 = [{
      expand: "strDouble"
    }];
  });
var Ct$3 = {};
s$4(Ct$3, {
  default: () => Te$3
});
var Te$3,
  Dt$2 = a$1(() => {
    Te$3 = [{
      match: /#.*/g,
      sub: "todo"
    }, {
      type: "str",
      match: /f("""|''')(\\[^]|(?!\1)[^])*\1?|f("|')(\\[^]|(?!\3).)*\3?/gi,
      sub: [{
        type: "var",
        match: /{[^{}]*}/g,
        sub: [{
          match: /(?!^{)[^]*(?=}$)/g,
          sub: "py"
        }]
      }]
    }, {
      match: /("""|''')(\\[^]|(?!\1)[^])*\1?/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      type: "kwd",
      match: /\b(and|as|assert|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g
    }, {
      type: "bool",
      match: /\b(False|True|None)\b/g
    }, {
      expand: "num"
    }, {
      type: "func",
      match: /[a-z_]\w*(?=\s*\()/gi
    }, {
      type: "oper",
      match: /[-/*+<>,=!&|^%]+/g
    }, {
      type: "class",
      match: /\b[A-Z][\w_]*\b/g
    }];
  });
var wt$3 = {};
s$4(wt$3, {
  default: () => fe$1,
  type: () => Ie$2
});
var fe$1,
  Ie$2,
  Ut$2 = a$1(() => {
    fe$1 = [{
      match: /^(?!\/).*/gm,
      sub: "todo"
    }, {
      type: "num",
      match: /\[((?!\])[^\\]|\\.)*\]/g
    }, {
      type: "kwd",
      match: /\||\^|\$|\\.|\w+($|\r|\n)/g
    }, {
      type: "var",
      match: /\*|\+|\{\d+,\d+\}/g
    }], Ie$2 = "oper";
  });
var Pt$2 = {};
s$4(Pt$2, {
  default: () => Ne$2
});
var Ne$2,
  Ft$2 = a$1(() => {
    Ne$2 = [{
      match: /\/\/.*\n?|\/\*((?!\*\/)[^])*(\*\/)?/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      expand: "num"
    }, {
      type: "kwd",
      match: /\b(as|break|const|continue|crate|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while|async|await|dyn|abstract|become|box|do|final|macro|override|priv|typeof|unsized|virtual|yield|try)\b/g
    }, {
      type: "oper",
      match: /[/*+:?&|%^~=!,<>.^-]+/g
    }, {
      type: "class",
      match: /\b[A-Z][\w_]*\b/g
    }, {
      type: "func",
      match: /[a-zA-Z_][\w_]*(?=\s*!?\s*\()/g
    }];
  });
var Mt$1 = {};
s$4(Mt$1, {
  default: () => Ae$3
});
var Ae$3,
  $t$2 = a$1(() => {
    Ae$3 = [{
      match: /--.*\n?|\/\*((?!\*\/)[^])*(\*\/)?/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      type: "func",
      match: /\b(AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/g
    }, {
      type: "kwd",
      match: /\b(ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:_INSERT|COL)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|kwdS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:S|ING)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/g
    }, {
      type: "num",
      match: /\.?\d[\d.oxa-fA-F-]*|\bNULL\b/g
    }, {
      type: "bool",
      match: /\b(TRUE|FALSE)\b/g
    }, {
      type: "oper",
      match: /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|DIV|IN|ILIKE|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/g
    }, {
      type: "var",
      match: /@\S+/g
    }];
  });
var vt$2 = {};
s$4(vt$2, {
  default: () => Re$2
});
var Re$2,
  Bt$1 = a$1(() => {
    Re$2 = [{
      match: /#.*/g,
      sub: "todo"
    }, {
      type: "str",
      match: /("""|''')((?!\1)[^]|\\[^])*\1?/g
    }, {
      expand: "str"
    }, {
      type: "section",
      match: /^\[.+\]\s*$/gm
    }, {
      type: "num",
      match: /\b(inf|nan)\b|\d[\d:ZT.-]*/g
    }, {
      expand: "num"
    }, {
      type: "bool",
      match: /\b(true|false)\b/g
    }, {
      type: "oper",
      match: /[+,.=-]/g
    }, {
      type: "var",
      match: /\w+(?= \=)/g
    }];
  });
var Gt$1 = {};
s$4(Gt$1, {
  default: () => Oe$3
});
var Oe$3,
  Ht$1 = a$1(() => {
    L$7();
    Oe$3 = [{
      type: "type",
      match: /:\s*(any|void|number|boolean|string|object|never|enum)\b/g
    }, {
      type: "kwd",
      match: /\b(type|namespace|typedef|interface|public|private|protected|implements|declare|abstract|readonly)\b/g
    }, ...O$6];
  });
var _t$2 = {};
s$4(_t$2, {
  default: () => Le$2
});
var Le$2,
  kt$2 = a$1(() => {
    Le$2 = [{
      match: /^#.*/gm,
      sub: "todo"
    }, {
      type: "class",
      match: /^\w+(?=:?)/gm
    }, {
      type: "num",
      match: /:\d+/g
    }, {
      type: "oper",
      match: /[:/&?]|\w+=/g
    }, {
      type: "func",
      match: /[.\w]+@|#[\w]+$/gm
    }, {
      type: "var",
      match: /\w+\.\w+(\.\w+)*/g
    }];
  });
var zt$2 = {};
s$4(zt$2, {
  default: () => xe$1
});
var xe$1,
  Yt$2 = a$1(() => {
    xe$1 = [{
      match: /#.*/g,
      sub: "todo"
    }, {
      expand: "str"
    }, {
      type: "str",
      match: /(>|\|)\r?\n((\s[^\n]*)?(\r?\n|$))*/g
    }, {
      type: "type",
      match: /!![a-z]+/g
    }, {
      type: "bool",
      match: /\b(Yes|No)\b/g
    }, {
      type: "oper",
      match: /[+:-]/g
    }, {
      expand: "num"
    }, {
      type: "var",
      match: /[a-zA-Z]\w*(?=:)/g
    }];
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




var cjs$2 = {};
var cjs$1;
var hasRequiredCjs$2;
function requireCjs$2() {
  if (hasRequiredCjs$2) return cjs$1;
  hasRequiredCjs$2 = 1;
  var COMMENT_REGEX = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
  var NEWLINE_REGEX = /\n/g;
  var WHITESPACE_REGEX = /^\s*/;
  var PROPERTY_REGEX = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/;
  var COLON_REGEX = /^:\s*/;
  var VALUE_REGEX = /^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/;
  var SEMICOLON_REGEX = /^[;\s]*/;
  var TRIM_REGEX = /^\s+|\s+$/g;
  var NEWLINE = "\n";
  var FORWARD_SLASH = "/";
  var ASTERISK2 = "*";
  var EMPTY_STRING = "";
  var TYPE_COMMENT = "comment";
  var TYPE_DECLARATION = "declaration";
  function index2(style2, options) {
    if (typeof style2 !== "string") {
      throw new TypeError("First argument must be a string");
    }
    if (!style2) return [];
    options = options || {};
    var lineno = 1;
    var column = 1;
    function updatePosition(str2) {
      var lines = str2.match(NEWLINE_REGEX);
      if (lines) lineno += lines.length;
      var i2 = str2.lastIndexOf(NEWLINE);
      column = ~i2 ? str2.length - i2 : column + str2.length;
    }
    function position2() {
      var start2 = {
        line: lineno,
        column
      };
      return function (node2) {
        node2.position = new Position2(start2);
        whitespace2();
        return node2;
      };
    }
    function Position2(start2) {
      this.start = start2;
      this.end = {
        line: lineno,
        column
      };
      this.source = options.source;
    }
    Position2.prototype.content = style2;
    function error(msg) {
      var err = new Error(options.source + ":" + lineno + ":" + column + ": " + msg);
      err.reason = msg;
      err.filename = options.source;
      err.line = lineno;
      err.column = column;
      err.source = style2;
      if (options.silent) ;else {
        throw err;
      }
    }
    function match2(re2) {
      var m3 = re2.exec(style2);
      if (!m3) return;
      var str2 = m3[0];
      updatePosition(str2);
      style2 = style2.slice(str2.length);
      return m3;
    }
    function whitespace2() {
      match2(WHITESPACE_REGEX);
    }
    function comments(rules) {
      var c3;
      rules = rules || [];
      while (c3 = comment2()) {
        if (c3 !== false) {
          rules.push(c3);
        }
      }
      return rules;
    }
    function comment2() {
      var pos = position2();
      if (FORWARD_SLASH != style2.charAt(0) || ASTERISK2 != style2.charAt(1)) return;
      var i2 = 2;
      while (EMPTY_STRING != style2.charAt(i2) && (ASTERISK2 != style2.charAt(i2) || FORWARD_SLASH != style2.charAt(i2 + 1))) {
        ++i2;
      }
      i2 += 2;
      if (EMPTY_STRING === style2.charAt(i2 - 1)) {
        return error("End of comment missing");
      }
      var str2 = style2.slice(2, i2 - 2);
      column += 2;
      updatePosition(str2);
      style2 = style2.slice(i2);
      column += 2;
      return pos({
        type: TYPE_COMMENT,
        comment: str2
      });
    }
    function declaration() {
      var pos = position2();
      var prop = match2(PROPERTY_REGEX);
      if (!prop) return;
      comment2();
      if (!match2(COLON_REGEX)) return error("property missing ':'");
      var val = match2(VALUE_REGEX);
      var ret = pos({
        type: TYPE_DECLARATION,
        property: trim(prop[0].replace(COMMENT_REGEX, EMPTY_STRING)),
        value: val ? trim(val[0].replace(COMMENT_REGEX, EMPTY_STRING)) : EMPTY_STRING
      });
      match2(SEMICOLON_REGEX);
      return ret;
    }
    function declarations() {
      var decls = [];
      comments(decls);
      var decl;
      while (decl = declaration()) {
        if (decl !== false) {
          decls.push(decl);
          comments(decls);
        }
      }
      return decls;
    }
    whitespace2();
    return declarations();
  }
  function trim(str2) {
    return str2 ? str2.replace(TRIM_REGEX, EMPTY_STRING) : EMPTY_STRING;
  }
  cjs$1 = index2;
  return cjs$1;
}
var hasRequiredCjs$1;
function requireCjs$1() {
  if (hasRequiredCjs$1) return cjs$2;
  hasRequiredCjs$1 = 1;
  var __importDefault = cjs$2 && cjs$2.__importDefault || function (mod) {
    return mod && mod.__esModule ? mod : {
      "default": mod
    };
  };
  Object.defineProperty(cjs$2, "__esModule", {
    value: true
  });
  cjs$2.default = StyleToObject;
  const inline_style_parser_1 = __importDefault(requireCjs$2());
  function StyleToObject(style2, iterator) {
    let styleObject = null;
    if (!style2 || typeof style2 !== "string") {
      return styleObject;
    }
    const declarations = (0, inline_style_parser_1.default)(style2);
    const hasIterator = typeof iterator === "function";
    declarations.forEach(declaration => {
      if (declaration.type !== "declaration") {
        return;
      }
      const {
        property,
        value
      } = declaration;
      if (hasIterator) {
        iterator(property, value, declaration);
      } else if (value) {
        styleObject = styleObject || {};
        styleObject[property] = value;
      }
    });
    return styleObject;
  }
  return cjs$2;
}

























































































































const {
  toString
} = {};
const {
  keys
} = Object;










































































const changelog = "https://github.com/remarkjs/react-markdown/blob/main/changelog.md";
const emptyPlugins = [];
const emptyRemarkRehypeOptions = {
  allowDangerousHtml: true
};
const safeProtocol$1 = /^(https?|ircs?|mailto|xmpp)$/i;
const deprecations = [{
  from: "astPlugins",
  id: "remove-buggy-html-in-markdown-parser"
}, {
  from: "allowDangerousHtml",
  id: "remove-buggy-html-in-markdown-parser"
}, {
  from: "allowNode",
  id: "replace-allownode-allowedtypes-and-disallowedtypes",
  to: "allowElement"
}, {
  from: "allowedTypes",
  id: "replace-allownode-allowedtypes-and-disallowedtypes",
  to: "allowedElements"
}, {
  from: "className",
  id: "remove-classname"
}, {
  from: "disallowedTypes",
  id: "replace-allownode-allowedtypes-and-disallowedtypes",
  to: "disallowedElements"
}, {
  from: "escapeHtml",
  id: "remove-buggy-html-in-markdown-parser"
}, {
  from: "includeElementIndex",
  id: "#remove-includeelementindex"
}, {
  from: "includeNodeIndex",
  id: "change-includenodeindex-to-includeelementindex"
}, {
  from: "linkTarget",
  id: "remove-linktarget"
}, {
  from: "plugins",
  id: "change-plugins-to-remarkplugins",
  to: "remarkPlugins"
}, {
  from: "rawSourcePos",
  id: "#remove-rawsourcepos"
}, {
  from: "renderers",
  id: "change-renderers-to-components",
  to: "components"
}, {
  from: "source",
  id: "change-source-to-children",
  to: "children"
}, {
  from: "sourcePos",
  id: "#remove-sourcepos"
}, {
  from: "transformImageUri",
  id: "#add-urltransform",
  to: "urlTransform"
}, {
  from: "transformLinkUri",
  id: "#add-urltransform",
  to: "urlTransform"
}];
function Markdown$1(options) {
  const processor = createProcessor(options);
  const file = createFile(options);
  return post(processor.runSync(processor.parse(file), file), options);
}
function createProcessor(options) {
  const rehypePlugins = options.rehypePlugins || emptyPlugins;
  const remarkPlugins = options.remarkPlugins || emptyPlugins;
  const remarkRehypeOptions = options.remarkRehypeOptions ? {
    ...options.remarkRehypeOptions,
    ...emptyRemarkRehypeOptions
  } : emptyRemarkRehypeOptions;
  const processor = unified().use(remarkParse).use(remarkPlugins).use(remarkRehype, remarkRehypeOptions).use(rehypePlugins);
  return processor;
}
function createFile(options) {
  const children2 = options.children || "";
  const file = new VFile();
  if (typeof children2 === "string") {
    file.value = children2;
  }
  return file;
}
function post(tree, options) {
  const allowedElements = options.allowedElements;
  const allowElement = options.allowElement;
  const components2 = options.components;
  const disallowedElements = options.disallowedElements;
  const skipHtml = options.skipHtml;
  const unwrapDisallowed = options.unwrapDisallowed;
  const urlTransform2 = options.urlTransform || defaultUrlTransform;
  for (const deprecation of deprecations) {
    if (Object.hasOwn(options, deprecation.from)) {
      unreachable("Unexpected `" + deprecation.from + "` prop, " + (deprecation.to ? "use `" + deprecation.to + "` instead" : "remove it") + " (see <" + changelog + "#" + deprecation.id + "> for more info)");
    }
  }
  visit(tree, transform2);
  return toJsxRuntime(tree, {
    Fragment: jsxRuntimeExports.Fragment,
    components: components2,
    ignoreInvalidStyle: true,
    jsx: jsxRuntimeExports.jsx,
    jsxs: jsxRuntimeExports.jsxs,
    passKeys: true,
    passNode: true
  });
  function transform2(node2, index2, parent) {
    if (node2.type === "raw" && parent && typeof index2 === "number") {
      if (skipHtml) {
        parent.children.splice(index2, 1);
      } else {
        parent.children[index2] = {
          type: "text",
          value: node2.value
        };
      }
      return index2;
    }
    if (node2.type === "element") {
      let key2;
      for (key2 in urlAttributes) {
        if (Object.hasOwn(urlAttributes, key2) && Object.hasOwn(node2.properties, key2)) {
          const value = node2.properties[key2];
          const test = urlAttributes[key2];
          if (test === null || test.includes(node2.tagName)) {
            node2.properties[key2] = urlTransform2(String(value || ""), key2, node2);
          }
        }
      }
    }
    if (node2.type === "element") {
      let remove2 = allowedElements ? !allowedElements.includes(node2.tagName) : disallowedElements ? disallowedElements.includes(node2.tagName) : false;
      if (!remove2 && allowElement && typeof index2 === "number") {
        remove2 = !allowElement(node2, index2, parent);
      }
      if (remove2 && parent && typeof index2 === "number") {
        if (unwrapDisallowed && node2.children) {
          parent.children.splice(index2, 1, ...node2.children);
        } else {
          parent.children.splice(index2, 1);
        }
        return index2;
      }
    }
  }
}
function defaultUrlTransform(value) {
  const colon2 = value.indexOf(":");
  const questionMark = value.indexOf("?");
  const numberSign = value.indexOf("#");
  const slash2 = value.indexOf("/");
  if (
  // If there is no protocol, it’s relative.
  colon2 === -1 ||
  // If the first colon is after a `?`, `#`, or `/`, it’s not a protocol.
  slash2 !== -1 && colon2 > slash2 || questionMark !== -1 && colon2 > questionMark || numberSign !== -1 && colon2 > numberSign ||
  // It is a protocol, it should be allowed.
  safeProtocol$1.test(value.slice(0, colon2))) {
    return value;
  }
  return "";
}



































































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
var lib = {};
var propTypes = {
  exports: {}
};
var ReactPropTypesSecret_1;
var hasRequiredReactPropTypesSecret;
function requireReactPropTypesSecret() {
  if (hasRequiredReactPropTypesSecret) return ReactPropTypesSecret_1;
  hasRequiredReactPropTypesSecret = 1;
  var ReactPropTypesSecret = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
  ReactPropTypesSecret_1 = ReactPropTypesSecret;
  return ReactPropTypesSecret_1;
}
var factoryWithThrowingShims;
var hasRequiredFactoryWithThrowingShims;
function requireFactoryWithThrowingShims() {
  if (hasRequiredFactoryWithThrowingShims) return factoryWithThrowingShims;
  hasRequiredFactoryWithThrowingShims = 1;
  var ReactPropTypesSecret = /* @__PURE__ */requireReactPropTypesSecret();
  function emptyFunction() {}
  function emptyFunctionWithReset() {}
  emptyFunctionWithReset.resetWarningCache = emptyFunction;
  factoryWithThrowingShims = function () {
    function shim2(props, propName, componentName, location2, propFullName, secret) {
      if (secret === ReactPropTypesSecret) {
        return;
      }
      var err = new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");
      err.name = "Invariant Violation";
      throw err;
    }
    shim2.isRequired = shim2;
    function getShim() {
      return shim2;
    }
    var ReactPropTypes = {
      array: shim2,
      bigint: shim2,
      bool: shim2,
      func: shim2,
      number: shim2,
      object: shim2,
      string: shim2,
      symbol: shim2,
      any: shim2,
      arrayOf: getShim,
      element: shim2,
      elementType: shim2,
      instanceOf: getShim,
      node: shim2,
      objectOf: getShim,
      oneOf: getShim,
      oneOfType: getShim,
      shape: getShim,
      exact: getShim,
      checkPropTypes: emptyFunctionWithReset,
      resetWarningCache: emptyFunction
    };
    ReactPropTypes.PropTypes = ReactPropTypes;
    return ReactPropTypes;
  };
  return factoryWithThrowingShims;
}
var hasRequiredPropTypes;
function requirePropTypes() {
  if (hasRequiredPropTypes) return propTypes.exports;
  hasRequiredPropTypes = 1;
  {
    propTypes.exports = /* @__PURE__ */requireFactoryWithThrowingShims()();
  }
  return propTypes.exports;
}
var ErrorCorrectLevel;
var hasRequiredErrorCorrectLevel;
function requireErrorCorrectLevel() {
  if (hasRequiredErrorCorrectLevel) return ErrorCorrectLevel;
  hasRequiredErrorCorrectLevel = 1;
  ErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
  };
  return ErrorCorrectLevel;
}
var mode;
var hasRequiredMode;
function requireMode() {
  if (hasRequiredMode) return mode;
  hasRequiredMode = 1;
  mode = {
    MODE_NUMBER: 1 << 0,
    MODE_ALPHA_NUM: 1 << 1,
    MODE_8BIT_BYTE: 1 << 2,
    MODE_KANJI: 1 << 3
  };
  return mode;
}
var _8BitByte;
var hasRequired_8BitByte;
function require_8BitByte() {
  if (hasRequired_8BitByte) return _8BitByte;
  hasRequired_8BitByte = 1;
  var mode2 = requireMode();
  function QR8bitByte(data2) {
    this.mode = mode2.MODE_8BIT_BYTE;
    this.data = data2;
  }
  QR8bitByte.prototype = {
    getLength: function (buffer) {
      return this.data.length;
    },
    write: function (buffer) {
      for (var i2 = 0; i2 < this.data.length; i2++) {
        buffer.put(this.data.charCodeAt(i2), 8);
      }
    }
  };
  _8BitByte = QR8bitByte;
  return _8BitByte;
}
var RSBlock;
var hasRequiredRSBlock;
function requireRSBlock() {
  if (hasRequiredRSBlock) return RSBlock;
  hasRequiredRSBlock = 1;
  var ECL = requireErrorCorrectLevel();
  function QRRSBlock(totalCount, dataCount) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }
  QRRSBlock.RS_BLOCK_TABLE = [
  // L
  // M
  // Q
  // H
  // 1
  [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
  // 2
  [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
  // 3
  [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
  [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
  // 5
  [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
  // 6
  [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
  [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
  // 8
  [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
  // 9
  [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
  [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
  // 11
  [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
  // 12
  [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
  // 13
  [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
  // 14
  [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
  // 15
  [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12],
  // 16
  [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
  // 17
  [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
  // 18
  [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
  // 19
  [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
  // 20
  [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
  // 21
  [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
  // 22
  [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
  // 23
  [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
  // 24
  [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
  // 25
  [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
  // 26
  [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
  // 27
  [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
  // 28
  [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
  // 29
  [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
  // 30
  [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
  // 31
  [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
  // 32
  [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
  // 33
  [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
  // 34
  [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
  // 35
  [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
  // 36
  [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
  // 37
  [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
  // 38
  [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
  // 39
  [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
  // 40
  [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]];
  QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
    var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
    if (rsBlock == void 0) {
      throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
    }
    var length2 = rsBlock.length / 3;
    var list2 = new Array();
    for (var i2 = 0; i2 < length2; i2++) {
      var count2 = rsBlock[i2 * 3 + 0];
      var totalCount = rsBlock[i2 * 3 + 1];
      var dataCount = rsBlock[i2 * 3 + 2];
      for (var j2 = 0; j2 < count2; j2++) {
        list2.push(new QRRSBlock(totalCount, dataCount));
      }
    }
    return list2;
  };
  QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case ECL.L:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case ECL.M:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case ECL.Q:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case ECL.H:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default:
        return void 0;
    }
  };
  RSBlock = QRRSBlock;
  return RSBlock;
}
var BitBuffer;
var hasRequiredBitBuffer;
function requireBitBuffer() {
  if (hasRequiredBitBuffer) return BitBuffer;
  hasRequiredBitBuffer = 1;
  function QRBitBuffer() {
    this.buffer = new Array();
    this.length = 0;
  }
  QRBitBuffer.prototype = {
    get: function (index2) {
      var bufIndex = Math.floor(index2 / 8);
      return (this.buffer[bufIndex] >>> 7 - index2 % 8 & 1) == 1;
    },
    put: function (num, length2) {
      for (var i2 = 0; i2 < length2; i2++) {
        this.putBit((num >>> length2 - i2 - 1 & 1) == 1);
      }
    },
    getLengthInBits: function () {
      return this.length;
    },
    putBit: function (bit) {
      var bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) {
        this.buffer.push(0);
      }
      if (bit) {
        this.buffer[bufIndex] |= 128 >>> this.length % 8;
      }
      this.length++;
    }
  };
  BitBuffer = QRBitBuffer;
  return BitBuffer;
}
var math;
var hasRequiredMath;
function requireMath() {
  if (hasRequiredMath) return math;
  hasRequiredMath = 1;
  var QRMath = {
    glog: function (n2) {
      if (n2 < 1) {
        throw new Error("glog(" + n2 + ")");
      }
      return QRMath.LOG_TABLE[n2];
    },
    gexp: function (n2) {
      while (n2 < 0) {
        n2 += 255;
      }
      while (n2 >= 256) {
        n2 -= 255;
      }
      return QRMath.EXP_TABLE[n2];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  };
  for (var i2 = 0; i2 < 8; i2++) {
    QRMath.EXP_TABLE[i2] = 1 << i2;
  }
  for (var i2 = 8; i2 < 256; i2++) {
    QRMath.EXP_TABLE[i2] = QRMath.EXP_TABLE[i2 - 4] ^ QRMath.EXP_TABLE[i2 - 5] ^ QRMath.EXP_TABLE[i2 - 6] ^ QRMath.EXP_TABLE[i2 - 8];
  }
  for (var i2 = 0; i2 < 255; i2++) {
    QRMath.LOG_TABLE[QRMath.EXP_TABLE[i2]] = i2;
  }
  math = QRMath;
  return math;
}
var Polynomial;
var hasRequiredPolynomial;
function requirePolynomial() {
  if (hasRequiredPolynomial) return Polynomial;
  hasRequiredPolynomial = 1;
  var math2 = requireMath();
  function QRPolynomial(num, shift2) {
    if (num.length == void 0) {
      throw new Error(num.length + "/" + shift2);
    }
    var offset2 = 0;
    while (offset2 < num.length && num[offset2] == 0) {
      offset2++;
    }
    this.num = new Array(num.length - offset2 + shift2);
    for (var i2 = 0; i2 < num.length - offset2; i2++) {
      this.num[i2] = num[i2 + offset2];
    }
  }
  QRPolynomial.prototype = {
    get: function (index2) {
      return this.num[index2];
    },
    getLength: function () {
      return this.num.length;
    },
    multiply: function (e2) {
      var num = new Array(this.getLength() + e2.getLength() - 1);
      for (var i2 = 0; i2 < this.getLength(); i2++) {
        for (var j2 = 0; j2 < e2.getLength(); j2++) {
          num[i2 + j2] ^= math2.gexp(math2.glog(this.get(i2)) + math2.glog(e2.get(j2)));
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e2) {
      if (this.getLength() - e2.getLength() < 0) {
        return this;
      }
      var ratio = math2.glog(this.get(0)) - math2.glog(e2.get(0));
      var num = new Array(this.getLength());
      for (var i2 = 0; i2 < this.getLength(); i2++) {
        num[i2] = this.get(i2);
      }
      for (var i2 = 0; i2 < e2.getLength(); i2++) {
        num[i2] ^= math2.gexp(math2.glog(e2.get(i2)) + ratio);
      }
      return new QRPolynomial(num, 0).mod(e2);
    }
  };
  Polynomial = QRPolynomial;
  return Polynomial;
}
var util;
var hasRequiredUtil;
function requireUtil() {
  if (hasRequiredUtil) return util;
  hasRequiredUtil = 1;
  var Mode = requireMode();
  var Polynomial2 = requirePolynomial();
  var math2 = requireMath();
  var QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7
  };
  var QRUtil = {
    PATTERN_POSITION_TABLE: [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]],
    G15: 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0,
    G18: 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0,
    G15_MASK: 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1,
    getBCHTypeInfo: function (data2) {
      var d2 = data2 << 10;
      while (QRUtil.getBCHDigit(d2) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
        d2 ^= QRUtil.G15 << QRUtil.getBCHDigit(d2) - QRUtil.getBCHDigit(QRUtil.G15);
      }
      return (data2 << 10 | d2) ^ QRUtil.G15_MASK;
    },
    getBCHTypeNumber: function (data2) {
      var d2 = data2 << 12;
      while (QRUtil.getBCHDigit(d2) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
        d2 ^= QRUtil.G18 << QRUtil.getBCHDigit(d2) - QRUtil.getBCHDigit(QRUtil.G18);
      }
      return data2 << 12 | d2;
    },
    getBCHDigit: function (data2) {
      var digit = 0;
      while (data2 != 0) {
        digit++;
        data2 >>>= 1;
      }
      return digit;
    },
    getPatternPosition: function (typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },
    getMask: function (maskPattern, i2, j2) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000:
          return (i2 + j2) % 2 == 0;
        case QRMaskPattern.PATTERN001:
          return i2 % 2 == 0;
        case QRMaskPattern.PATTERN010:
          return j2 % 3 == 0;
        case QRMaskPattern.PATTERN011:
          return (i2 + j2) % 3 == 0;
        case QRMaskPattern.PATTERN100:
          return (Math.floor(i2 / 2) + Math.floor(j2 / 3)) % 2 == 0;
        case QRMaskPattern.PATTERN101:
          return i2 * j2 % 2 + i2 * j2 % 3 == 0;
        case QRMaskPattern.PATTERN110:
          return (i2 * j2 % 2 + i2 * j2 % 3) % 2 == 0;
        case QRMaskPattern.PATTERN111:
          return (i2 * j2 % 3 + (i2 + j2) % 2) % 2 == 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    },
    getErrorCorrectPolynomial: function (errorCorrectLength) {
      var a2 = new Polynomial2([1], 0);
      for (var i2 = 0; i2 < errorCorrectLength; i2++) {
        a2 = a2.multiply(new Polynomial2([1, math2.gexp(i2)], 0));
      }
      return a2;
    },
    getLengthInBits: function (mode2, type2) {
      if (1 <= type2 && type2 < 10) {
        switch (mode2) {
          case Mode.MODE_NUMBER:
            return 10;
          case Mode.MODE_ALPHA_NUM:
            return 9;
          case Mode.MODE_8BIT_BYTE:
            return 8;
          case Mode.MODE_KANJI:
            return 8;
          default:
            throw new Error("mode:" + mode2);
        }
      } else if (type2 < 27) {
        switch (mode2) {
          case Mode.MODE_NUMBER:
            return 12;
          case Mode.MODE_ALPHA_NUM:
            return 11;
          case Mode.MODE_8BIT_BYTE:
            return 16;
          case Mode.MODE_KANJI:
            return 10;
          default:
            throw new Error("mode:" + mode2);
        }
      } else if (type2 < 41) {
        switch (mode2) {
          case Mode.MODE_NUMBER:
            return 14;
          case Mode.MODE_ALPHA_NUM:
            return 13;
          case Mode.MODE_8BIT_BYTE:
            return 16;
          case Mode.MODE_KANJI:
            return 12;
          default:
            throw new Error("mode:" + mode2);
        }
      } else {
        throw new Error("type:" + type2);
      }
    },
    getLostPoint: function (qrCode) {
      var moduleCount = qrCode.getModuleCount();
      var lostPoint = 0;
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount; col++) {
          var sameCount = 0;
          var dark = qrCode.isDark(row, col);
          for (var r2 = -1; r2 <= 1; r2++) {
            if (row + r2 < 0 || moduleCount <= row + r2) {
              continue;
            }
            for (var c3 = -1; c3 <= 1; c3++) {
              if (col + c3 < 0 || moduleCount <= col + c3) {
                continue;
              }
              if (r2 == 0 && c3 == 0) {
                continue;
              }
              if (dark == qrCode.isDark(row + r2, col + c3)) {
                sameCount++;
              }
            }
          }
          if (sameCount > 5) {
            lostPoint += 3 + sameCount - 5;
          }
        }
      }
      for (var row = 0; row < moduleCount - 1; row++) {
        for (var col = 0; col < moduleCount - 1; col++) {
          var count2 = 0;
          if (qrCode.isDark(row, col)) count2++;
          if (qrCode.isDark(row + 1, col)) count2++;
          if (qrCode.isDark(row, col + 1)) count2++;
          if (qrCode.isDark(row + 1, col + 1)) count2++;
          if (count2 == 0 || count2 == 4) {
            lostPoint += 3;
          }
        }
      }
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount - 6; col++) {
          if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) {
            lostPoint += 40;
          }
        }
      }
      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount - 6; row++) {
          if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) {
            lostPoint += 40;
          }
        }
      }
      var darkCount = 0;
      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount; row++) {
          if (qrCode.isDark(row, col)) {
            darkCount++;
          }
        }
      }
      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    }
  };
  util = QRUtil;
  return util;
}
var QRCode_1;
var hasRequiredQRCode;
function requireQRCode() {
  if (hasRequiredQRCode) return QRCode_1;
  hasRequiredQRCode = 1;
  var BitByte = require_8BitByte();
  var RSBlock2 = requireRSBlock();
  var BitBuffer2 = requireBitBuffer();
  var util2 = requireUtil();
  var Polynomial2 = requirePolynomial();
  function QRCode2(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }
  var proto2 = QRCode2.prototype;
  proto2.addData = function (data2) {
    var newData = new BitByte(data2);
    this.dataList.push(newData);
    this.dataCache = null;
  };
  proto2.isDark = function (row, col) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(row + "," + col);
    }
    return this.modules[row][col];
  };
  proto2.getModuleCount = function () {
    return this.moduleCount;
  };
  proto2.make = function () {
    if (this.typeNumber < 1) {
      var typeNumber = 1;
      for (typeNumber = 1; typeNumber < 40; typeNumber++) {
        var rsBlocks = RSBlock2.getRSBlocks(typeNumber, this.errorCorrectLevel);
        var buffer = new BitBuffer2();
        var totalDataCount = 0;
        for (var i2 = 0; i2 < rsBlocks.length; i2++) {
          totalDataCount += rsBlocks[i2].dataCount;
        }
        for (var i2 = 0; i2 < this.dataList.length; i2++) {
          var data2 = this.dataList[i2];
          buffer.put(data2.mode, 4);
          buffer.put(data2.getLength(), util2.getLengthInBits(data2.mode, typeNumber));
          data2.write(buffer);
        }
        if (buffer.getLengthInBits() <= totalDataCount * 8) break;
      }
      this.typeNumber = typeNumber;
    }
    this.makeImpl(false, this.getBestMaskPattern());
  };
  proto2.makeImpl = function (test, maskPattern) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (var row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount);
      for (var col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null;
      }
    }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }
    if (this.dataCache == null) {
      this.dataCache = QRCode2.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    }
    this.mapData(this.dataCache, maskPattern);
  };
  proto2.setupPositionProbePattern = function (row, col) {
    for (var r2 = -1; r2 <= 7; r2++) {
      if (row + r2 <= -1 || this.moduleCount <= row + r2) continue;
      for (var c3 = -1; c3 <= 7; c3++) {
        if (col + c3 <= -1 || this.moduleCount <= col + c3) continue;
        if (0 <= r2 && r2 <= 6 && (c3 == 0 || c3 == 6) || 0 <= c3 && c3 <= 6 && (r2 == 0 || r2 == 6) || 2 <= r2 && r2 <= 4 && 2 <= c3 && c3 <= 4) {
          this.modules[row + r2][col + c3] = true;
        } else {
          this.modules[row + r2][col + c3] = false;
        }
      }
    }
  };
  proto2.getBestMaskPattern = function () {
    var minLostPoint = 0;
    var pattern = 0;
    for (var i2 = 0; i2 < 8; i2++) {
      this.makeImpl(true, i2);
      var lostPoint = util2.getLostPoint(this);
      if (i2 == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i2;
      }
    }
    return pattern;
  };
  proto2.createMovieClip = function (target_mc, instance_name, depth2) {
    var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth2);
    var cs2 = 1;
    this.make();
    for (var row = 0; row < this.modules.length; row++) {
      var y4 = row * cs2;
      for (var col = 0; col < this.modules[row].length; col++) {
        var x2 = col * cs2;
        var dark = this.modules[row][col];
        if (dark) {
          qr_mc.beginFill(0, 100);
          qr_mc.moveTo(x2, y4);
          qr_mc.lineTo(x2 + cs2, y4);
          qr_mc.lineTo(x2 + cs2, y4 + cs2);
          qr_mc.lineTo(x2, y4 + cs2);
          qr_mc.endFill();
        }
      }
    }
    return qr_mc;
  };
  proto2.setupTimingPattern = function () {
    for (var r2 = 8; r2 < this.moduleCount - 8; r2++) {
      if (this.modules[r2][6] != null) {
        continue;
      }
      this.modules[r2][6] = r2 % 2 == 0;
    }
    for (var c3 = 8; c3 < this.moduleCount - 8; c3++) {
      if (this.modules[6][c3] != null) {
        continue;
      }
      this.modules[6][c3] = c3 % 2 == 0;
    }
  };
  proto2.setupPositionAdjustPattern = function () {
    var pos = util2.getPatternPosition(this.typeNumber);
    for (var i2 = 0; i2 < pos.length; i2++) {
      for (var j2 = 0; j2 < pos.length; j2++) {
        var row = pos[i2];
        var col = pos[j2];
        if (this.modules[row][col] != null) {
          continue;
        }
        for (var r2 = -2; r2 <= 2; r2++) {
          for (var c3 = -2; c3 <= 2; c3++) {
            if (r2 == -2 || r2 == 2 || c3 == -2 || c3 == 2 || r2 == 0 && c3 == 0) {
              this.modules[row + r2][col + c3] = true;
            } else {
              this.modules[row + r2][col + c3] = false;
            }
          }
        }
      }
    }
  };
  proto2.setupTypeNumber = function (test) {
    var bits = util2.getBCHTypeNumber(this.typeNumber);
    for (var i2 = 0; i2 < 18; i2++) {
      var mod = !test && (bits >> i2 & 1) == 1;
      this.modules[Math.floor(i2 / 3)][i2 % 3 + this.moduleCount - 8 - 3] = mod;
    }
    for (var i2 = 0; i2 < 18; i2++) {
      var mod = !test && (bits >> i2 & 1) == 1;
      this.modules[i2 % 3 + this.moduleCount - 8 - 3][Math.floor(i2 / 3)] = mod;
    }
  };
  proto2.setupTypeInfo = function (test, maskPattern) {
    var data2 = this.errorCorrectLevel << 3 | maskPattern;
    var bits = util2.getBCHTypeInfo(data2);
    for (var i2 = 0; i2 < 15; i2++) {
      var mod = !test && (bits >> i2 & 1) == 1;
      if (i2 < 6) {
        this.modules[i2][8] = mod;
      } else if (i2 < 8) {
        this.modules[i2 + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i2][8] = mod;
      }
    }
    for (var i2 = 0; i2 < 15; i2++) {
      var mod = !test && (bits >> i2 & 1) == 1;
      if (i2 < 8) {
        this.modules[8][this.moduleCount - i2 - 1] = mod;
      } else if (i2 < 9) {
        this.modules[8][15 - i2 - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i2 - 1] = mod;
      }
    }
    this.modules[this.moduleCount - 8][8] = !test;
  };
  proto2.mapData = function (data2, maskPattern) {
    var inc = -1;
    var row = this.moduleCount - 1;
    var bitIndex = 7;
    var byteIndex = 0;
    for (var col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col--;
      while (true) {
        for (var c3 = 0; c3 < 2; c3++) {
          if (this.modules[row][col - c3] == null) {
            var dark = false;
            if (byteIndex < data2.length) {
              dark = (data2[byteIndex] >>> bitIndex & 1) == 1;
            }
            var mask = util2.getMask(maskPattern, row, col - c3);
            if (mask) {
              dark = !dark;
            }
            this.modules[row][col - c3] = dark;
            bitIndex--;
            if (bitIndex == -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  };
  QRCode2.PAD0 = 236;
  QRCode2.PAD1 = 17;
  QRCode2.createData = function (typeNumber, errorCorrectLevel, dataList) {
    var rsBlocks = RSBlock2.getRSBlocks(typeNumber, errorCorrectLevel);
    var buffer = new BitBuffer2();
    for (var i2 = 0; i2 < dataList.length; i2++) {
      var data2 = dataList[i2];
      buffer.put(data2.mode, 4);
      buffer.put(data2.getLength(), util2.getLengthInBits(data2.mode, typeNumber));
      data2.write(buffer);
    }
    var totalDataCount = 0;
    for (var i2 = 0; i2 < rsBlocks.length; i2++) {
      totalDataCount += rsBlocks[i2].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(QRCode2.PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }
      buffer.put(QRCode2.PAD1, 8);
    }
    return QRCode2.createBytes(buffer, rsBlocks);
  };
  QRCode2.createBytes = function (buffer, rsBlocks) {
    var offset2 = 0;
    var maxDcCount = 0;
    var maxEcCount = 0;
    var dcdata = new Array(rsBlocks.length);
    var ecdata = new Array(rsBlocks.length);
    for (var r2 = 0; r2 < rsBlocks.length; r2++) {
      var dcCount = rsBlocks[r2].dataCount;
      var ecCount = rsBlocks[r2].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r2] = new Array(dcCount);
      for (var i2 = 0; i2 < dcdata[r2].length; i2++) {
        dcdata[r2][i2] = 255 & buffer.buffer[i2 + offset2];
      }
      offset2 += dcCount;
      var rsPoly = util2.getErrorCorrectPolynomial(ecCount);
      var rawPoly = new Polynomial2(dcdata[r2], rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r2] = new Array(rsPoly.getLength() - 1);
      for (var i2 = 0; i2 < ecdata[r2].length; i2++) {
        var modIndex = i2 + modPoly.getLength() - ecdata[r2].length;
        ecdata[r2][i2] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }
    var totalCodeCount = 0;
    for (var i2 = 0; i2 < rsBlocks.length; i2++) {
      totalCodeCount += rsBlocks[i2].totalCount;
    }
    var data2 = new Array(totalCodeCount);
    var index2 = 0;
    for (var i2 = 0; i2 < maxDcCount; i2++) {
      for (var r2 = 0; r2 < rsBlocks.length; r2++) {
        if (i2 < dcdata[r2].length) {
          data2[index2++] = dcdata[r2][i2];
        }
      }
    }
    for (var i2 = 0; i2 < maxEcCount; i2++) {
      for (var r2 = 0; r2 < rsBlocks.length; r2++) {
        if (i2 < ecdata[r2].length) {
          data2[index2++] = ecdata[r2][i2];
        }
      }
    }
    return data2;
  };
  QRCode_1 = QRCode2;
  return QRCode_1;
}
var QRCodeSvg = {};
var hasRequiredQRCodeSvg;
function requireQRCodeSvg() {
  if (hasRequiredQRCodeSvg) return QRCodeSvg;
  hasRequiredQRCodeSvg = 1;
  Object.defineProperty(QRCodeSvg, "__esModule", {
    value: true
  });
  var _extends = Object.assign || function (target) {
    for (var i2 = 1; i2 < arguments.length; i2++) {
      var source = arguments[i2];
      for (var key2 in source) {
        if (Object.prototype.hasOwnProperty.call(source, key2)) {
          target[key2] = source[key2];
        }
      }
    }
    return target;
  };
  var _propTypes = /* @__PURE__ */requirePropTypes();
  var _propTypes2 = _interopRequireDefault(_propTypes);
  var _react = requireReact();
  var _react2 = _interopRequireDefault(_react);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }
  function _objectWithoutProperties(obj, keys2) {
    var target = {};
    for (var i2 in obj) {
      if (keys2.indexOf(i2) >= 0) continue;
      if (!Object.prototype.hasOwnProperty.call(obj, i2)) continue;
      target[i2] = obj[i2];
    }
    return target;
  }
  var propTypes2 = {
    bgColor: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.string]).isRequired,
    bgD: _propTypes2.default.string.isRequired,
    fgColor: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.string]).isRequired,
    fgD: _propTypes2.default.string.isRequired,
    size: _propTypes2.default.number.isRequired,
    title: _propTypes2.default.string,
    viewBoxSize: _propTypes2.default.number.isRequired,
    xmlns: _propTypes2.default.string
  };
  var QRCodeSvg$1 = (0, _react.forwardRef)(function (_ref, ref) {
    var bgColor = _ref.bgColor,
      bgD = _ref.bgD,
      fgD = _ref.fgD,
      fgColor = _ref.fgColor,
      size2 = _ref.size,
      title = _ref.title,
      viewBoxSize = _ref.viewBoxSize,
      _ref$xmlns = _ref.xmlns,
      xmlns2 = _ref$xmlns === void 0 ? "http://www.w3.org/2000/svg" : _ref$xmlns,
      props = _objectWithoutProperties(_ref, ["bgColor", "bgD", "fgD", "fgColor", "size", "title", "viewBoxSize", "xmlns"]);
    return _react2.default.createElement("svg", _extends({}, props, {
      height: size2,
      ref,
      viewBox: "0 0 " + viewBoxSize + " " + viewBoxSize,
      width: size2,
      xmlns: xmlns2
    }), title ? _react2.default.createElement("title", null, title) : null, _react2.default.createElement("path", {
      d: bgD,
      fill: bgColor
    }), _react2.default.createElement("path", {
      d: fgD,
      fill: fgColor
    }));
  });
  QRCodeSvg$1.displayName = "QRCodeSvg";
  QRCodeSvg$1.propTypes = propTypes2;
  QRCodeSvg.default = QRCodeSvg$1;
  return QRCodeSvg;
}
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib;
  hasRequiredLib = 1;
  Object.defineProperty(lib, "__esModule", {
    value: true
  });
  lib.QRCode = void 0;
  var _extends = Object.assign || function (target) {
    for (var i2 = 1; i2 < arguments.length; i2++) {
      var source = arguments[i2];
      for (var key2 in source) {
        if (Object.prototype.hasOwnProperty.call(source, key2)) {
          target[key2] = source[key2];
        }
      }
    }
    return target;
  };
  var _propTypes = /* @__PURE__ */requirePropTypes();
  var _propTypes2 = _interopRequireDefault(_propTypes);
  var _ErrorCorrectLevel = requireErrorCorrectLevel();
  var _ErrorCorrectLevel2 = _interopRequireDefault(_ErrorCorrectLevel);
  var _QRCode = requireQRCode();
  var _QRCode2 = _interopRequireDefault(_QRCode);
  var _react = requireReact();
  var _react2 = _interopRequireDefault(_react);
  var _QRCodeSvg = requireQRCodeSvg();
  var _QRCodeSvg2 = _interopRequireDefault(_QRCodeSvg);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }
  function _objectWithoutProperties(obj, keys2) {
    var target = {};
    for (var i2 in obj) {
      if (keys2.indexOf(i2) >= 0) continue;
      if (!Object.prototype.hasOwnProperty.call(obj, i2)) continue;
      target[i2] = obj[i2];
    }
    return target;
  }
  function bytesToBinaryString(bytes2) {
    return bytes2.map(function (b3) {
      return String.fromCharCode(b3 & 255);
    }).join("");
  }
  function encodeStringToUtf8Bytes(input) {
    return Array.from(new TextEncoder().encode(input));
  }
  var propTypes2 = {
    bgColor: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.string]),
    fgColor: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.string]),
    level: _propTypes2.default.string,
    size: _propTypes2.default.number,
    value: _propTypes2.default.string.isRequired
  };
  var QRCode2 = (0, _react.forwardRef)(function (_ref, ref) {
    var _ref$bgColor = _ref.bgColor,
      bgColor = _ref$bgColor === void 0 ? "#FFFFFF" : _ref$bgColor,
      _ref$fgColor = _ref.fgColor,
      fgColor = _ref$fgColor === void 0 ? "#000000" : _ref$fgColor,
      _ref$level = _ref.level,
      level = _ref$level === void 0 ? "L" : _ref$level,
      _ref$size = _ref.size,
      size2 = _ref$size === void 0 ? 256 : _ref$size,
      value = _ref.value,
      props = _objectWithoutProperties(_ref, ["bgColor", "fgColor", "level", "size", "value"]);
    var qrcode = new _QRCode2.default(-1, _ErrorCorrectLevel2.default[level]);
    var utf8Bytes = encodeStringToUtf8Bytes(value);
    var binaryString = bytesToBinaryString(utf8Bytes);
    qrcode.addData(binaryString, "Byte");
    qrcode.make();
    var cells2 = qrcode.modules;
    return _react2.default.createElement(_QRCodeSvg2.default, _extends({}, props, {
      bgColor,
      bgD: cells2.map(function (row, rowIndex) {
        return row.map(function (cell, cellIndex) {
          return !cell ? "M " + cellIndex + " " + rowIndex + " l 1 0 0 1 -1 0 Z" : "";
        }).join(" ");
      }).join(" "),
      fgColor,
      fgD: cells2.map(function (row, rowIndex) {
        return row.map(function (cell, cellIndex) {
          return cell ? "M " + cellIndex + " " + rowIndex + " l 1 0 0 1 -1 0 Z" : "";
        }).join(" ");
      }).join(" "),
      ref,
      size: size2,
      viewBoxSize: cells2.length
    }));
  });
  lib.QRCode = QRCode2;
  QRCode2.displayName = "QRCode";
  QRCode2.propTypes = propTypes2;
  lib.default = QRCode2;
  return lib;
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
const bundledLanguagesInfo = [{
  "id": "abap",
  "name": "ABAP",
  "import": () => import("@shikijs/langs/abap")
}, {
  "id": "actionscript-3",
  "name": "ActionScript",
  "import": () => import("@shikijs/langs/actionscript-3")
}, {
  "id": "ada",
  "name": "Ada",
  "import": () => import("@shikijs/langs/ada")
}, {
  "id": "angular-html",
  "name": "Angular HTML",
  "import": () => import("@shikijs/langs/angular-html")
}, {
  "id": "angular-ts",
  "name": "Angular TypeScript",
  "import": () => import("@shikijs/langs/angular-ts")
}, {
  "id": "apache",
  "name": "Apache Conf",
  "import": () => import("@shikijs/langs/apache")
}, {
  "id": "apex",
  "name": "Apex",
  "import": () => import("@shikijs/langs/apex")
}, {
  "id": "apl",
  "name": "APL",
  "import": () => import("@shikijs/langs/apl")
}, {
  "id": "applescript",
  "name": "AppleScript",
  "import": () => import("@shikijs/langs/applescript")
}, {
  "id": "ara",
  "name": "Ara",
  "import": () => import("@shikijs/langs/ara")
}, {
  "id": "asciidoc",
  "name": "AsciiDoc",
  "aliases": ["adoc"],
  "import": () => import("@shikijs/langs/asciidoc")
}, {
  "id": "asm",
  "name": "Assembly",
  "import": () => import("@shikijs/langs/asm")
}, {
  "id": "astro",
  "name": "Astro",
  "import": () => import("@shikijs/langs/astro")
}, {
  "id": "awk",
  "name": "AWK",
  "import": () => import("@shikijs/langs/awk")
}, {
  "id": "ballerina",
  "name": "Ballerina",
  "import": () => import("@shikijs/langs/ballerina")
}, {
  "id": "bat",
  "name": "Batch File",
  "aliases": ["batch"],
  "import": () => import("@shikijs/langs/bat")
}, {
  "id": "beancount",
  "name": "Beancount",
  "import": () => import("@shikijs/langs/beancount")
}, {
  "id": "berry",
  "name": "Berry",
  "aliases": ["be"],
  "import": () => import("@shikijs/langs/berry")
}, {
  "id": "bibtex",
  "name": "BibTeX",
  "import": () => import("@shikijs/langs/bibtex")
}, {
  "id": "bicep",
  "name": "Bicep",
  "import": () => import("@shikijs/langs/bicep")
}, {
  "id": "bird2",
  "name": "BIRD2 Configuration",
  "aliases": ["bird"],
  "import": () => import("@shikijs/langs/bird2")
}, {
  "id": "blade",
  "name": "Blade",
  "import": () => import("@shikijs/langs/blade")
}, {
  "id": "bsl",
  "name": "1C (Enterprise)",
  "aliases": ["1c"],
  "import": () => import("@shikijs/langs/bsl")
}, {
  "id": "c",
  "name": "C",
  "import": () => import("@shikijs/langs/c")
}, {
  "id": "c3",
  "name": "C3",
  "import": () => import("@shikijs/langs/c3")
}, {
  "id": "cadence",
  "name": "Cadence",
  "aliases": ["cdc"],
  "import": () => import("@shikijs/langs/cadence")
}, {
  "id": "cairo",
  "name": "Cairo",
  "import": () => import("@shikijs/langs/cairo")
}, {
  "id": "clarity",
  "name": "Clarity",
  "import": () => import("@shikijs/langs/clarity")
}, {
  "id": "clojure",
  "name": "Clojure",
  "aliases": ["clj"],
  "import": () => import("@shikijs/langs/clojure")
}, {
  "id": "cmake",
  "name": "CMake",
  "import": () => import("@shikijs/langs/cmake")
}, {
  "id": "cobol",
  "name": "COBOL",
  "import": () => import("@shikijs/langs/cobol")
}, {
  "id": "codeowners",
  "name": "CODEOWNERS",
  "import": () => import("@shikijs/langs/codeowners")
}, {
  "id": "codeql",
  "name": "CodeQL",
  "aliases": ["ql"],
  "import": () => import("@shikijs/langs/codeql")
}, {
  "id": "coffee",
  "name": "CoffeeScript",
  "aliases": ["coffeescript"],
  "import": () => import("@shikijs/langs/coffee")
}, {
  "id": "common-lisp",
  "name": "Common Lisp",
  "aliases": ["lisp"],
  "import": () => import("@shikijs/langs/common-lisp")
}, {
  "id": "coq",
  "name": "Coq",
  "import": () => import("@shikijs/langs/coq")
}, {
  "id": "cpp",
  "name": "C++",
  "aliases": ["c++"],
  "import": () => import("@shikijs/langs/cpp")
}, {
  "id": "crystal",
  "name": "Crystal",
  "import": () => import("@shikijs/langs/crystal")
}, {
  "id": "csharp",
  "name": "C#",
  "aliases": ["c#", "cs"],
  "import": () => import("@shikijs/langs/csharp")
}, {
  "id": "css",
  "name": "CSS",
  "import": () => import("@shikijs/langs/css")
}, {
  "id": "csv",
  "name": "CSV",
  "import": () => import("@shikijs/langs/csv")
}, {
  "id": "cue",
  "name": "CUE",
  "import": () => import("@shikijs/langs/cue")
}, {
  "id": "cypher",
  "name": "Cypher",
  "aliases": ["cql"],
  "import": () => import("@shikijs/langs/cypher")
}, {
  "id": "d",
  "name": "D",
  "import": () => import("@shikijs/langs/d")
}, {
  "id": "dart",
  "name": "Dart",
  "import": () => import("@shikijs/langs/dart")
}, {
  "id": "dax",
  "name": "DAX",
  "import": () => import("@shikijs/langs/dax")
}, {
  "id": "desktop",
  "name": "Desktop",
  "import": () => import("@shikijs/langs/desktop")
}, {
  "id": "diff",
  "name": "Diff",
  "import": () => import("@shikijs/langs/diff")
}, {
  "id": "docker",
  "name": "Dockerfile",
  "aliases": ["dockerfile"],
  "import": () => import("@shikijs/langs/docker")
}, {
  "id": "dotenv",
  "name": "dotEnv",
  "import": () => import("@shikijs/langs/dotenv")
}, {
  "id": "dream-maker",
  "name": "Dream Maker",
  "import": () => import("@shikijs/langs/dream-maker")
}, {
  "id": "edge",
  "name": "Edge",
  "import": () => import("@shikijs/langs/edge")
}, {
  "id": "elixir",
  "name": "Elixir",
  "import": () => import("@shikijs/langs/elixir")
}, {
  "id": "elm",
  "name": "Elm",
  "import": () => import("@shikijs/langs/elm")
}, {
  "id": "emacs-lisp",
  "name": "Emacs Lisp",
  "aliases": ["elisp"],
  "import": () => import("@shikijs/langs/emacs-lisp")
}, {
  "id": "erb",
  "name": "ERB",
  "import": () => import("@shikijs/langs/erb")
}, {
  "id": "erlang",
  "name": "Erlang",
  "aliases": ["erl"],
  "import": () => import("@shikijs/langs/erlang")
}, {
  "id": "fennel",
  "name": "Fennel",
  "import": () => import("@shikijs/langs/fennel")
}, {
  "id": "fish",
  "name": "Fish",
  "import": () => import("@shikijs/langs/fish")
}, {
  "id": "fluent",
  "name": "Fluent",
  "aliases": ["ftl"],
  "import": () => import("@shikijs/langs/fluent")
}, {
  "id": "fortran-fixed-form",
  "name": "Fortran (Fixed Form)",
  "aliases": ["f", "for", "f77"],
  "import": () => import("@shikijs/langs/fortran-fixed-form")
}, {
  "id": "fortran-free-form",
  "name": "Fortran (Free Form)",
  "aliases": ["f90", "f95", "f03", "f08", "f18"],
  "import": () => import("@shikijs/langs/fortran-free-form")
}, {
  "id": "fsharp",
  "name": "F#",
  "aliases": ["f#", "fs"],
  "import": () => import("@shikijs/langs/fsharp")
}, {
  "id": "gdresource",
  "name": "GDResource",
  "aliases": ["tscn", "tres"],
  "import": () => import("@shikijs/langs/gdresource")
}, {
  "id": "gdscript",
  "name": "GDScript",
  "aliases": ["gd"],
  "import": () => import("@shikijs/langs/gdscript")
}, {
  "id": "gdshader",
  "name": "GDShader",
  "import": () => import("@shikijs/langs/gdshader")
}, {
  "id": "genie",
  "name": "Genie",
  "import": () => import("@shikijs/langs/genie")
}, {
  "id": "gherkin",
  "name": "Gherkin",
  "import": () => import("@shikijs/langs/gherkin")
}, {
  "id": "git-commit",
  "name": "Git Commit Message",
  "import": () => import("@shikijs/langs/git-commit")
}, {
  "id": "git-rebase",
  "name": "Git Rebase Message",
  "import": () => import("@shikijs/langs/git-rebase")
}, {
  "id": "gleam",
  "name": "Gleam",
  "import": () => import("@shikijs/langs/gleam")
}, {
  "id": "glimmer-js",
  "name": "Glimmer JS",
  "aliases": ["gjs"],
  "import": () => import("@shikijs/langs/glimmer-js")
}, {
  "id": "glimmer-ts",
  "name": "Glimmer TS",
  "aliases": ["gts"],
  "import": () => import("@shikijs/langs/glimmer-ts")
}, {
  "id": "glsl",
  "name": "GLSL",
  "import": () => import("@shikijs/langs/glsl")
}, {
  "id": "gn",
  "name": "GN",
  "import": () => import("@shikijs/langs/gn")
}, {
  "id": "gnuplot",
  "name": "Gnuplot",
  "import": () => import("@shikijs/langs/gnuplot")
}, {
  "id": "go",
  "name": "Go",
  "import": () => import("@shikijs/langs/go")
}, {
  "id": "graphql",
  "name": "GraphQL",
  "aliases": ["gql"],
  "import": () => import("@shikijs/langs/graphql")
}, {
  "id": "groovy",
  "name": "Groovy",
  "import": () => import("@shikijs/langs/groovy")
}, {
  "id": "hack",
  "name": "Hack",
  "import": () => import("@shikijs/langs/hack")
}, {
  "id": "haml",
  "name": "Ruby Haml",
  "import": () => import("@shikijs/langs/haml")
}, {
  "id": "handlebars",
  "name": "Handlebars",
  "aliases": ["hbs"],
  "import": () => import("@shikijs/langs/handlebars")
}, {
  "id": "haskell",
  "name": "Haskell",
  "aliases": ["hs"],
  "import": () => import("@shikijs/langs/haskell")
}, {
  "id": "haxe",
  "name": "Haxe",
  "import": () => import("@shikijs/langs/haxe")
}, {
  "id": "hcl",
  "name": "HashiCorp HCL",
  "import": () => import("@shikijs/langs/hcl")
}, {
  "id": "hjson",
  "name": "Hjson",
  "import": () => import("@shikijs/langs/hjson")
}, {
  "id": "hlsl",
  "name": "HLSL",
  "import": () => import("@shikijs/langs/hlsl")
}, {
  "id": "html",
  "name": "HTML",
  "import": () => import("@shikijs/langs/html")
}, {
  "id": "html-derivative",
  "name": "HTML (Derivative)",
  "import": () => import("@shikijs/langs/html-derivative")
}, {
  "id": "http",
  "name": "HTTP",
  "import": () => import("@shikijs/langs/http")
}, {
  "id": "hurl",
  "name": "Hurl",
  "import": () => import("@shikijs/langs/hurl")
}, {
  "id": "hxml",
  "name": "HXML",
  "import": () => import("@shikijs/langs/hxml")
}, {
  "id": "hy",
  "name": "Hy",
  "import": () => import("@shikijs/langs/hy")
}, {
  "id": "imba",
  "name": "Imba",
  "import": () => import("@shikijs/langs/imba")
}, {
  "id": "ini",
  "name": "INI",
  "aliases": ["properties"],
  "import": () => import("@shikijs/langs/ini")
}, {
  "id": "java",
  "name": "Java",
  "import": () => import("@shikijs/langs/java")
}, {
  "id": "javascript",
  "name": "JavaScript",
  "aliases": ["js", "cjs", "mjs"],
  "import": () => import("@shikijs/langs/javascript")
}, {
  "id": "jinja",
  "name": "Jinja",
  "import": () => import("@shikijs/langs/jinja")
}, {
  "id": "jison",
  "name": "Jison",
  "import": () => import("@shikijs/langs/jison")
}, {
  "id": "json",
  "name": "JSON",
  "import": () => import("@shikijs/langs/json")
}, {
  "id": "json5",
  "name": "JSON5",
  "import": () => import("@shikijs/langs/json5")
}, {
  "id": "jsonc",
  "name": "JSON with Comments",
  "import": () => import("@shikijs/langs/jsonc")
}, {
  "id": "jsonl",
  "name": "JSON Lines",
  "import": () => import("@shikijs/langs/jsonl")
}, {
  "id": "jsonnet",
  "name": "Jsonnet",
  "import": () => import("@shikijs/langs/jsonnet")
}, {
  "id": "jssm",
  "name": "JSSM",
  "aliases": ["fsl"],
  "import": () => import("@shikijs/langs/jssm")
}, {
  "id": "jsx",
  "name": "JSX",
  "import": () => import("@shikijs/langs/jsx")
}, {
  "id": "julia",
  "name": "Julia",
  "aliases": ["jl"],
  "import": () => import("@shikijs/langs/julia")
}, {
  "id": "just",
  "name": "Just",
  "import": () => import("@shikijs/langs/just")
}, {
  "id": "kdl",
  "name": "KDL",
  "import": () => import("@shikijs/langs/kdl")
}, {
  "id": "kotlin",
  "name": "Kotlin",
  "aliases": ["kt", "kts"],
  "import": () => import("@shikijs/langs/kotlin")
}, {
  "id": "kusto",
  "name": "Kusto",
  "aliases": ["kql"],
  "import": () => import("@shikijs/langs/kusto")
}, {
  "id": "latex",
  "name": "LaTeX",
  "import": () => import("@shikijs/langs/latex")
}, {
  "id": "lean",
  "name": "Lean 4",
  "aliases": ["lean4"],
  "import": () => import("@shikijs/langs/lean")
}, {
  "id": "less",
  "name": "Less",
  "import": () => import("@shikijs/langs/less")
}, {
  "id": "liquid",
  "name": "Liquid",
  "import": () => import("@shikijs/langs/liquid")
}, {
  "id": "llvm",
  "name": "LLVM IR",
  "import": () => import("@shikijs/langs/llvm")
}, {
  "id": "log",
  "name": "Log file",
  "import": () => import("@shikijs/langs/log")
}, {
  "id": "logo",
  "name": "Logo",
  "import": () => import("@shikijs/langs/logo")
}, {
  "id": "lua",
  "name": "Lua",
  "import": () => import("@shikijs/langs/lua")
}, {
  "id": "luau",
  "name": "Luau",
  "import": () => import("@shikijs/langs/luau")
}, {
  "id": "make",
  "name": "Makefile",
  "aliases": ["makefile"],
  "import": () => import("@shikijs/langs/make")
}, {
  "id": "markdown",
  "name": "Markdown",
  "aliases": ["md"],
  "import": () => import("@shikijs/langs/markdown")
}, {
  "id": "marko",
  "name": "Marko",
  "import": () => import("@shikijs/langs/marko")
}, {
  "id": "matlab",
  "name": "MATLAB",
  "import": () => import("@shikijs/langs/matlab")
}, {
  "id": "mdc",
  "name": "MDC",
  "import": () => import("@shikijs/langs/mdc")
}, {
  "id": "mdx",
  "name": "MDX",
  "import": () => import("@shikijs/langs/mdx")
}, {
  "id": "mermaid",
  "name": "Mermaid",
  "aliases": ["mmd"],
  "import": () => import("@shikijs/langs/mermaid")
}, {
  "id": "mipsasm",
  "name": "MIPS Assembly",
  "aliases": ["mips"],
  "import": () => import("@shikijs/langs/mipsasm")
}, {
  "id": "mojo",
  "name": "Mojo",
  "import": () => import("@shikijs/langs/mojo")
}, {
  "id": "moonbit",
  "name": "MoonBit",
  "aliases": ["mbt", "mbti"],
  "import": () => import("@shikijs/langs/moonbit")
}, {
  "id": "move",
  "name": "Move",
  "import": () => import("@shikijs/langs/move")
}, {
  "id": "narrat",
  "name": "Narrat Language",
  "aliases": ["nar"],
  "import": () => import("@shikijs/langs/narrat")
}, {
  "id": "nextflow",
  "name": "Nextflow",
  "aliases": ["nf"],
  "import": () => import("@shikijs/langs/nextflow")
}, {
  "id": "nextflow-groovy",
  "name": "nextflow-groovy",
  "import": () => import("@shikijs/langs/nextflow-groovy")
}, {
  "id": "nginx",
  "name": "Nginx",
  "import": () => import("@shikijs/langs/nginx")
}, {
  "id": "nim",
  "name": "Nim",
  "import": () => import("@shikijs/langs/nim")
}, {
  "id": "nix",
  "name": "Nix",
  "import": () => import("@shikijs/langs/nix")
}, {
  "id": "nushell",
  "name": "nushell",
  "aliases": ["nu"],
  "import": () => import("@shikijs/langs/nushell")
}, {
  "id": "objective-c",
  "name": "Objective-C",
  "aliases": ["objc"],
  "import": () => import("@shikijs/langs/objective-c")
}, {
  "id": "objective-cpp",
  "name": "Objective-C++",
  "import": () => import("@shikijs/langs/objective-cpp")
}, {
  "id": "ocaml",
  "name": "OCaml",
  "import": () => import("@shikijs/langs/ocaml")
}, {
  "id": "odin",
  "name": "Odin",
  "import": () => import("@shikijs/langs/odin")
}, {
  "id": "openscad",
  "name": "OpenSCAD",
  "aliases": ["scad"],
  "import": () => import("@shikijs/langs/openscad")
}, {
  "id": "pascal",
  "name": "Pascal",
  "import": () => import("@shikijs/langs/pascal")
}, {
  "id": "perl",
  "name": "Perl",
  "import": () => import("@shikijs/langs/perl")
}, {
  "id": "php",
  "name": "PHP",
  "import": () => import("@shikijs/langs/php")
}, {
  "id": "pkl",
  "name": "Pkl",
  "import": () => import("@shikijs/langs/pkl")
}, {
  "id": "plsql",
  "name": "PL/SQL",
  "import": () => import("@shikijs/langs/plsql")
}, {
  "id": "po",
  "name": "Gettext PO",
  "aliases": ["pot", "potx"],
  "import": () => import("@shikijs/langs/po")
}, {
  "id": "polar",
  "name": "Polar",
  "import": () => import("@shikijs/langs/polar")
}, {
  "id": "postcss",
  "name": "PostCSS",
  "import": () => import("@shikijs/langs/postcss")
}, {
  "id": "powerquery",
  "name": "PowerQuery",
  "import": () => import("@shikijs/langs/powerquery")
}, {
  "id": "powershell",
  "name": "PowerShell",
  "aliases": ["ps", "ps1"],
  "import": () => import("@shikijs/langs/powershell")
}, {
  "id": "prisma",
  "name": "Prisma",
  "import": () => import("@shikijs/langs/prisma")
}, {
  "id": "prolog",
  "name": "Prolog",
  "import": () => import("@shikijs/langs/prolog")
}, {
  "id": "proto",
  "name": "Protocol Buffer 3",
  "aliases": ["protobuf"],
  "import": () => import("@shikijs/langs/proto")
}, {
  "id": "pug",
  "name": "Pug",
  "aliases": ["jade"],
  "import": () => import("@shikijs/langs/pug")
}, {
  "id": "puppet",
  "name": "Puppet",
  "import": () => import("@shikijs/langs/puppet")
}, {
  "id": "purescript",
  "name": "PureScript",
  "import": () => import("@shikijs/langs/purescript")
}, {
  "id": "python",
  "name": "Python",
  "aliases": ["py"],
  "import": () => import("@shikijs/langs/python")
}, {
  "id": "qml",
  "name": "QML",
  "import": () => import("@shikijs/langs/qml")
}, {
  "id": "qmldir",
  "name": "QML Directory",
  "import": () => import("@shikijs/langs/qmldir")
}, {
  "id": "qss",
  "name": "Qt Style Sheets",
  "import": () => import("@shikijs/langs/qss")
}, {
  "id": "r",
  "name": "R",
  "import": () => import("@shikijs/langs/r")
}, {
  "id": "racket",
  "name": "Racket",
  "import": () => import("@shikijs/langs/racket")
}, {
  "id": "raku",
  "name": "Raku",
  "aliases": ["perl6"],
  "import": () => import("@shikijs/langs/raku")
}, {
  "id": "razor",
  "name": "ASP.NET Razor",
  "import": () => import("@shikijs/langs/razor")
}, {
  "id": "reg",
  "name": "Windows Registry Script",
  "import": () => import("@shikijs/langs/reg")
}, {
  "id": "regexp",
  "name": "RegExp",
  "aliases": ["regex"],
  "import": () => import("@shikijs/langs/regexp")
}, {
  "id": "rel",
  "name": "Rel",
  "import": () => import("@shikijs/langs/rel")
}, {
  "id": "riscv",
  "name": "RISC-V",
  "import": () => import("@shikijs/langs/riscv")
}, {
  "id": "ron",
  "name": "RON",
  "import": () => import("@shikijs/langs/ron")
}, {
  "id": "rosmsg",
  "name": "ROS Interface",
  "import": () => import("@shikijs/langs/rosmsg")
}, {
  "id": "rst",
  "name": "reStructuredText",
  "import": () => import("@shikijs/langs/rst")
}, {
  "id": "ruby",
  "name": "Ruby",
  "aliases": ["rb"],
  "import": () => import("@shikijs/langs/ruby")
}, {
  "id": "rust",
  "name": "Rust",
  "aliases": ["rs"],
  "import": () => import("@shikijs/langs/rust")
}, {
  "id": "sas",
  "name": "SAS",
  "import": () => import("@shikijs/langs/sas")
}, {
  "id": "sass",
  "name": "Sass",
  "import": () => import("@shikijs/langs/sass")
}, {
  "id": "scala",
  "name": "Scala",
  "import": () => import("@shikijs/langs/scala")
}, {
  "id": "scheme",
  "name": "Scheme",
  "import": () => import("@shikijs/langs/scheme")
}, {
  "id": "scss",
  "name": "SCSS",
  "import": () => import("@shikijs/langs/scss")
}, {
  "id": "sdbl",
  "name": "1C (Query)",
  "aliases": ["1c-query"],
  "import": () => import("@shikijs/langs/sdbl")
}, {
  "id": "shaderlab",
  "name": "ShaderLab",
  "aliases": ["shader"],
  "import": () => import("@shikijs/langs/shaderlab")
}, {
  "id": "shellscript",
  "name": "Shell",
  "aliases": ["bash", "sh", "shell", "zsh"],
  "import": () => import("@shikijs/langs/shellscript")
}, {
  "id": "shellsession",
  "name": "Shell Session",
  "aliases": ["console"],
  "import": () => import("@shikijs/langs/shellsession")
}, {
  "id": "smalltalk",
  "name": "Smalltalk",
  "import": () => import("@shikijs/langs/smalltalk")
}, {
  "id": "solidity",
  "name": "Solidity",
  "import": () => import("@shikijs/langs/solidity")
}, {
  "id": "soy",
  "name": "Closure Templates",
  "aliases": ["closure-templates"],
  "import": () => import("@shikijs/langs/soy")
}, {
  "id": "sparql",
  "name": "SPARQL",
  "import": () => import("@shikijs/langs/sparql")
}, {
  "id": "splunk",
  "name": "Splunk Query Language",
  "aliases": ["spl"],
  "import": () => import("@shikijs/langs/splunk")
}, {
  "id": "sql",
  "name": "SQL",
  "import": () => import("@shikijs/langs/sql")
}, {
  "id": "ssh-config",
  "name": "SSH Config",
  "import": () => import("@shikijs/langs/ssh-config")
}, {
  "id": "stata",
  "name": "Stata",
  "import": () => import("@shikijs/langs/stata")
}, {
  "id": "stylus",
  "name": "Stylus",
  "aliases": ["styl"],
  "import": () => import("@shikijs/langs/stylus")
}, {
  "id": "surrealql",
  "name": "SurrealQL",
  "aliases": ["surql"],
  "import": () => import("@shikijs/langs/surrealql")
}, {
  "id": "svelte",
  "name": "Svelte",
  "import": () => import("@shikijs/langs/svelte")
}, {
  "id": "swift",
  "name": "Swift",
  "import": () => import("@shikijs/langs/swift")
}, {
  "id": "system-verilog",
  "name": "SystemVerilog",
  "import": () => import("@shikijs/langs/system-verilog")
}, {
  "id": "systemd",
  "name": "Systemd Units",
  "import": () => import("@shikijs/langs/systemd")
}, {
  "id": "talonscript",
  "name": "TalonScript",
  "aliases": ["talon"],
  "import": () => import("@shikijs/langs/talonscript")
}, {
  "id": "tasl",
  "name": "Tasl",
  "import": () => import("@shikijs/langs/tasl")
}, {
  "id": "tcl",
  "name": "Tcl",
  "import": () => import("@shikijs/langs/tcl")
}, {
  "id": "templ",
  "name": "Templ",
  "import": () => import("@shikijs/langs/templ")
}, {
  "id": "terraform",
  "name": "Terraform",
  "aliases": ["tf", "tfvars"],
  "import": () => import("@shikijs/langs/terraform")
}, {
  "id": "tex",
  "name": "TeX",
  "import": () => import("@shikijs/langs/tex")
}, {
  "id": "toml",
  "name": "TOML",
  "import": () => import("@shikijs/langs/toml")
}, {
  "id": "ts-tags",
  "name": "TypeScript with Tags",
  "aliases": ["lit"],
  "import": () => import("@shikijs/langs/ts-tags")
}, {
  "id": "tsv",
  "name": "TSV",
  "import": () => import("@shikijs/langs/tsv")
}, {
  "id": "tsx",
  "name": "TSX",
  "import": () => import("@shikijs/langs/tsx")
}, {
  "id": "turtle",
  "name": "Turtle",
  "import": () => import("@shikijs/langs/turtle")
}, {
  "id": "twig",
  "name": "Twig",
  "import": () => import("@shikijs/langs/twig")
}, {
  "id": "typescript",
  "name": "TypeScript",
  "aliases": ["ts", "cts", "mts"],
  "import": () => import("@shikijs/langs/typescript")
}, {
  "id": "typespec",
  "name": "TypeSpec",
  "aliases": ["tsp"],
  "import": () => import("@shikijs/langs/typespec")
}, {
  "id": "typst",
  "name": "Typst",
  "aliases": ["typ"],
  "import": () => import("@shikijs/langs/typst")
}, {
  "id": "v",
  "name": "V",
  "import": () => import("@shikijs/langs/v")
}, {
  "id": "vala",
  "name": "Vala",
  "import": () => import("@shikijs/langs/vala")
}, {
  "id": "vb",
  "name": "Visual Basic",
  "aliases": ["cmd"],
  "import": () => import("@shikijs/langs/vb")
}, {
  "id": "verilog",
  "name": "Verilog",
  "import": () => import("@shikijs/langs/verilog")
}, {
  "id": "vhdl",
  "name": "VHDL",
  "import": () => import("@shikijs/langs/vhdl")
}, {
  "id": "viml",
  "name": "Vim Script",
  "aliases": ["vim", "vimscript"],
  "import": () => import("@shikijs/langs/viml")
}, {
  "id": "vue",
  "name": "Vue",
  "import": () => import("@shikijs/langs/vue")
}, {
  "id": "vue-html",
  "name": "Vue HTML",
  "import": () => import("@shikijs/langs/vue-html")
}, {
  "id": "vue-vine",
  "name": "Vue Vine",
  "import": () => import("@shikijs/langs/vue-vine")
}, {
  "id": "vyper",
  "name": "Vyper",
  "aliases": ["vy"],
  "import": () => import("@shikijs/langs/vyper")
}, {
  "id": "wasm",
  "name": "WebAssembly",
  "import": () => import("@shikijs/langs/wasm")
}, {
  "id": "wenyan",
  "name": "Wenyan",
  "aliases": ["文言"],
  "import": () => import("@shikijs/langs/wenyan")
}, {
  "id": "wgsl",
  "name": "WGSL",
  "import": () => import("@shikijs/langs/wgsl")
}, {
  "id": "wikitext",
  "name": "Wikitext",
  "aliases": ["mediawiki", "wiki"],
  "import": () => import("@shikijs/langs/wikitext")
}, {
  "id": "wit",
  "name": "WebAssembly Interface Types",
  "import": () => import("@shikijs/langs/wit")
}, {
  "id": "wolfram",
  "name": "Wolfram",
  "aliases": ["wl"],
  "import": () => import("@shikijs/langs/wolfram")
}, {
  "id": "xml",
  "name": "XML",
  "import": () => import("@shikijs/langs/xml")
}, {
  "id": "xsl",
  "name": "XSL",
  "import": () => import("@shikijs/langs/xsl")
}, {
  "id": "yaml",
  "name": "YAML",
  "aliases": ["yml"],
  "import": () => import("@shikijs/langs/yaml")
}, {
  "id": "zenscript",
  "name": "ZenScript",
  "import": () => import("@shikijs/langs/zenscript")
}, {
  "id": "zig",
  "name": "Zig",
  "import": () => import("@shikijs/langs/zig")
}];
const bundledLanguagesBase = Object.fromEntries(bundledLanguagesInfo.map(i2 => [i2.id, i2.import]));
const bundledLanguagesAlias = Object.fromEntries(bundledLanguagesInfo.flatMap(i2 => i2.aliases?.map(a2 => [a2, i2.import]) || []));
const bundledLanguages = {
  ...bundledLanguagesBase,
  ...bundledLanguagesAlias
};
const bundledThemesInfo = [{
  "id": "andromeeda",
  "displayName": "Andromeeda",
  "type": "dark",
  "import": () => import("@shikijs/themes/andromeeda")
}, {
  "id": "aurora-x",
  "displayName": "Aurora X",
  "type": "dark",
  "import": () => import("@shikijs/themes/aurora-x")
}, {
  "id": "ayu-dark",
  "displayName": "Ayu Dark",
  "type": "dark",
  "import": () => import("@shikijs/themes/ayu-dark")
}, {
  "id": "ayu-light",
  "displayName": "Ayu Light",
  "type": "light",
  "import": () => import("@shikijs/themes/ayu-light")
}, {
  "id": "ayu-mirage",
  "displayName": "Ayu Mirage",
  "type": "dark",
  "import": () => import("@shikijs/themes/ayu-mirage")
}, {
  "id": "catppuccin-frappe",
  "displayName": "Catppuccin Frappé",
  "type": "dark",
  "import": () => import("@shikijs/themes/catppuccin-frappe")
}, {
  "id": "catppuccin-latte",
  "displayName": "Catppuccin Latte",
  "type": "light",
  "import": () => import("@shikijs/themes/catppuccin-latte")
}, {
  "id": "catppuccin-macchiato",
  "displayName": "Catppuccin Macchiato",
  "type": "dark",
  "import": () => import("@shikijs/themes/catppuccin-macchiato")
}, {
  "id": "catppuccin-mocha",
  "displayName": "Catppuccin Mocha",
  "type": "dark",
  "import": () => import("@shikijs/themes/catppuccin-mocha")
}, {
  "id": "dark-plus",
  "displayName": "Dark Plus",
  "type": "dark",
  "import": () => import("@shikijs/themes/dark-plus")
}, {
  "id": "dracula",
  "displayName": "Dracula Theme",
  "type": "dark",
  "import": () => import("@shikijs/themes/dracula")
}, {
  "id": "dracula-soft",
  "displayName": "Dracula Theme Soft",
  "type": "dark",
  "import": () => import("@shikijs/themes/dracula-soft")
}, {
  "id": "everforest-dark",
  "displayName": "Everforest Dark",
  "type": "dark",
  "import": () => import("@shikijs/themes/everforest-dark")
}, {
  "id": "everforest-light",
  "displayName": "Everforest Light",
  "type": "light",
  "import": () => import("@shikijs/themes/everforest-light")
}, {
  "id": "github-dark",
  "displayName": "GitHub Dark",
  "type": "dark",
  "import": () => import("@shikijs/themes/github-dark")
}, {
  "id": "github-dark-default",
  "displayName": "GitHub Dark Default",
  "type": "dark",
  "import": () => import("@shikijs/themes/github-dark-default")
}, {
  "id": "github-dark-dimmed",
  "displayName": "GitHub Dark Dimmed",
  "type": "dark",
  "import": () => import("@shikijs/themes/github-dark-dimmed")
}, {
  "id": "github-dark-high-contrast",
  "displayName": "GitHub Dark High Contrast",
  "type": "dark",
  "import": () => import("@shikijs/themes/github-dark-high-contrast")
}, {
  "id": "github-light",
  "displayName": "GitHub Light",
  "type": "light",
  "import": () => import("@shikijs/themes/github-light")
}, {
  "id": "github-light-default",
  "displayName": "GitHub Light Default",
  "type": "light",
  "import": () => import("@shikijs/themes/github-light-default")
}, {
  "id": "github-light-high-contrast",
  "displayName": "GitHub Light High Contrast",
  "type": "light",
  "import": () => import("@shikijs/themes/github-light-high-contrast")
}, {
  "id": "gruvbox-dark-hard",
  "displayName": "Gruvbox Dark Hard",
  "type": "dark",
  "import": () => import("@shikijs/themes/gruvbox-dark-hard")
}, {
  "id": "gruvbox-dark-medium",
  "displayName": "Gruvbox Dark Medium",
  "type": "dark",
  "import": () => import("@shikijs/themes/gruvbox-dark-medium")
}, {
  "id": "gruvbox-dark-soft",
  "displayName": "Gruvbox Dark Soft",
  "type": "dark",
  "import": () => import("@shikijs/themes/gruvbox-dark-soft")
}, {
  "id": "gruvbox-light-hard",
  "displayName": "Gruvbox Light Hard",
  "type": "light",
  "import": () => import("@shikijs/themes/gruvbox-light-hard")
}, {
  "id": "gruvbox-light-medium",
  "displayName": "Gruvbox Light Medium",
  "type": "light",
  "import": () => import("@shikijs/themes/gruvbox-light-medium")
}, {
  "id": "gruvbox-light-soft",
  "displayName": "Gruvbox Light Soft",
  "type": "light",
  "import": () => import("@shikijs/themes/gruvbox-light-soft")
}, {
  "id": "horizon",
  "displayName": "Horizon",
  "type": "dark",
  "import": () => import("@shikijs/themes/horizon")
}, {
  "id": "horizon-bright",
  "displayName": "Horizon Bright",
  "type": "dark",
  "import": () => import("@shikijs/themes/horizon-bright")
}, {
  "id": "houston",
  "displayName": "Houston",
  "type": "dark",
  "import": () => import("@shikijs/themes/houston")
}, {
  "id": "kanagawa-dragon",
  "displayName": "Kanagawa Dragon",
  "type": "dark",
  "import": () => import("@shikijs/themes/kanagawa-dragon")
}, {
  "id": "kanagawa-lotus",
  "displayName": "Kanagawa Lotus",
  "type": "light",
  "import": () => import("@shikijs/themes/kanagawa-lotus")
}, {
  "id": "kanagawa-wave",
  "displayName": "Kanagawa Wave",
  "type": "dark",
  "import": () => import("@shikijs/themes/kanagawa-wave")
}, {
  "id": "laserwave",
  "displayName": "LaserWave",
  "type": "dark",
  "import": () => import("@shikijs/themes/laserwave")
}, {
  "id": "light-plus",
  "displayName": "Light Plus",
  "type": "light",
  "import": () => import("@shikijs/themes/light-plus")
}, {
  "id": "material-theme",
  "displayName": "Material Theme",
  "type": "dark",
  "import": () => import("@shikijs/themes/material-theme")
}, {
  "id": "material-theme-darker",
  "displayName": "Material Theme Darker",
  "type": "dark",
  "import": () => import("@shikijs/themes/material-theme-darker")
}, {
  "id": "material-theme-lighter",
  "displayName": "Material Theme Lighter",
  "type": "light",
  "import": () => import("@shikijs/themes/material-theme-lighter")
}, {
  "id": "material-theme-ocean",
  "displayName": "Material Theme Ocean",
  "type": "dark",
  "import": () => import("@shikijs/themes/material-theme-ocean")
}, {
  "id": "material-theme-palenight",
  "displayName": "Material Theme Palenight",
  "type": "dark",
  "import": () => import("@shikijs/themes/material-theme-palenight")
}, {
  "id": "min-dark",
  "displayName": "Min Dark",
  "type": "dark",
  "import": () => import("@shikijs/themes/min-dark")
}, {
  "id": "min-light",
  "displayName": "Min Light",
  "type": "light",
  "import": () => import("@shikijs/themes/min-light")
}, {
  "id": "monokai",
  "displayName": "Monokai",
  "type": "dark",
  "import": () => import("@shikijs/themes/monokai")
}, {
  "id": "night-owl",
  "displayName": "Night Owl",
  "type": "dark",
  "import": () => import("@shikijs/themes/night-owl")
}, {
  "id": "night-owl-light",
  "displayName": "Night Owl Light",
  "type": "light",
  "import": () => import("@shikijs/themes/night-owl-light")
}, {
  "id": "nord",
  "displayName": "Nord",
  "type": "dark",
  "import": () => import("@shikijs/themes/nord")
}, {
  "id": "one-dark-pro",
  "displayName": "One Dark Pro",
  "type": "dark",
  "import": () => import("@shikijs/themes/one-dark-pro")
}, {
  "id": "one-light",
  "displayName": "One Light",
  "type": "light",
  "import": () => import("@shikijs/themes/one-light")
}, {
  "id": "plastic",
  "displayName": "Plastic",
  "type": "dark",
  "import": () => import("@shikijs/themes/plastic")
}, {
  "id": "poimandres",
  "displayName": "Poimandres",
  "type": "dark",
  "import": () => import("@shikijs/themes/poimandres")
}, {
  "id": "red",
  "displayName": "Red",
  "type": "dark",
  "import": () => import("@shikijs/themes/red")
}, {
  "id": "rose-pine",
  "displayName": "Rosé Pine",
  "type": "dark",
  "import": () => import("@shikijs/themes/rose-pine")
}, {
  "id": "rose-pine-dawn",
  "displayName": "Rosé Pine Dawn",
  "type": "light",
  "import": () => import("@shikijs/themes/rose-pine-dawn")
}, {
  "id": "rose-pine-moon",
  "displayName": "Rosé Pine Moon",
  "type": "dark",
  "import": () => import("@shikijs/themes/rose-pine-moon")
}, {
  "id": "slack-dark",
  "displayName": "Slack Dark",
  "type": "dark",
  "import": () => import("@shikijs/themes/slack-dark")
}, {
  "id": "slack-ochin",
  "displayName": "Slack Ochin",
  "type": "light",
  "import": () => import("@shikijs/themes/slack-ochin")
}, {
  "id": "snazzy-light",
  "displayName": "Snazzy Light",
  "type": "light",
  "import": () => import("@shikijs/themes/snazzy-light")
}, {
  "id": "solarized-dark",
  "displayName": "Solarized Dark",
  "type": "dark",
  "import": () => import("@shikijs/themes/solarized-dark")
}, {
  "id": "solarized-light",
  "displayName": "Solarized Light",
  "type": "light",
  "import": () => import("@shikijs/themes/solarized-light")
}, {
  "id": "synthwave-84",
  "displayName": "Synthwave '84",
  "type": "dark",
  "import": () => import("@shikijs/themes/synthwave-84")
}, {
  "id": "tokyo-night",
  "displayName": "Tokyo Night",
  "type": "dark",
  "import": () => import("@shikijs/themes/tokyo-night")
}, {
  "id": "vesper",
  "displayName": "Vesper",
  "type": "dark",
  "import": () => import("@shikijs/themes/vesper")
}, {
  "id": "vitesse-black",
  "displayName": "Vitesse Black",
  "type": "dark",
  "import": () => import("@shikijs/themes/vitesse-black")
}, {
  "id": "vitesse-dark",
  "displayName": "Vitesse Dark",
  "type": "dark",
  "import": () => import("@shikijs/themes/vitesse-dark")
}, {
  "id": "vitesse-light",
  "displayName": "Vitesse Light",
  "type": "light",
  "import": () => import("@shikijs/themes/vitesse-light")
}];
const bundledThemes = Object.fromEntries(bundledThemesInfo.map(i2 => [i2.id, i2.import]));
var __defProp = Object.defineProperty;
const createHighlighter = /* @__PURE__ */createBundledHighlighter({
  langs: bundledLanguages,
  themes: bundledThemes,
  engine: () => createOnigurumaEngine((() => import("@shikijs/engine-oniguruma/wasm-inlined"))())
});
var S$1 = createJavaScriptRegexEngine({
    forgiving: true
  }),
  C$1 = Object.fromEntries(bundledLanguagesInfo.flatMap(e2 => {
    var n2;
    return ((n2 = e2.aliases) != null ? n2 : []).map(t2 => [t2, e2.id]);
  })),
  r = new Set(Object.keys(bundledLanguages)),
  B$1 = e2 => {
    let t2 = e2.trim().toLowerCase(),
      g2 = C$1[t2];
    return g2 || (r.has(t2), t2);
  },
  c$1 = /* @__PURE__ */new Map(),
  p$1 = /* @__PURE__ */new Map(),
  s$1 = /* @__PURE__ */new Map(),
  o = e2 => {
    var n2;
    return typeof e2 == "string" ? e2 : (n2 = e2.name) != null ? n2 : "custom";
  },
  v$1 = (e2, n2) => `${e2}-${o(n2[0])}-${o(n2[1])}`,
  x$1 = (e2, n2, t2) => {
    let g2 = e2.slice(0, 100),
      u4 = e2.length > 100 ? e2.slice(-100) : "";
    return `${n2}:${t2[0]}:${t2[1]}:${e2.length}:${g2}:${u4}`;
  },
  P2 = (e2, n2) => {
    let t2 = v$1(e2, n2);
    if (c$1.has(t2)) return c$1.get(t2);
    let g2 = createHighlighter({
      themes: n2,
      langs: [e2],
      engine: S$1
    });
    return c$1.set(t2, g2), g2;
  };
function $$2(e2 = {}) {
  var t2;
  let n2 = (t2 = e2.themes) != null ? t2 : ["github-light", "github-dark"];
  return {
    name: "shiki",
    type: "code-highlighter",
    supportsLanguage(g2) {
      let u4 = B$1(g2);
      return r.has(u4);
    },
    getSupportedLanguages() {
      return Array.from(r);
    },
    getThemes() {
      return n2;
    },
    highlight({
      code: g2,
      language: u4,
      themes: h2
    }, m3) {
      let i2 = B$1(u4),
        d2 = [o(h2[0]), o(h2[1])],
        a2 = x$1(g2, i2, d2);
      if (p$1.has(a2)) return p$1.get(a2);
      m3 && (s$1.has(a2) || s$1.set(a2, /* @__PURE__ */new Set()), s$1.get(a2).add(m3));
      let f2 = r.has(i2) ? i2 : "text";
      return P2(f2, h2).then(l2 => {
        let y4 = l2.getLoadedLanguages().includes(i2) ? i2 : "text",
          L2 = l2.codeToTokens(g2, {
            lang: y4,
            themes: {
              light: d2[0],
              dark: d2[1]
            }
          });
        p$1.set(a2, L2);
        let T2 = s$1.get(a2);
        if (T2) {
          for (let H2 of T2) H2(L2);
          s$1.delete(a2);
        }
      }).catch(l2 => {
        console.error("[Streamdown Code] Failed to highlight code:", l2), s$1.delete(a2);
      }), null;
    }
  };
}
var G$1 = $$2();


















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
export { $$8, $t$2, ACCOUNT_SUBMISSION_BLOCKED_EVENT, API_PATHS, ARCHIVE_ZIPPER, AUTH_TRACK_EVENTS, AccordionHeader, AccordionItem$1, AccordionPanel, AccordionRoot, AccordionTrigger$1, AccountSubmissionBlockedError, ActionListItem, ActionListPanel, ActionListSeparator, ActivityIcon, AlertCircle, AlertDialogRoot, AlertTriangle, AlertTriangleIcon, ApiError, AppWindow, Archive, ArrowDown, ArrowDownToLine, ArrowLeft, ArrowLeftRight, ArrowLeftToLine, ArrowRight, ArrowRightToLine, ArrowUp, ArrowUpDown, ArrowUpFromLine, ArrowUpRight, ArrowUpToLine, AssetMetadataStoreContext, At$3, AtSign, AudioLines, AudioWaveform$1, AvatarImage$1, B$7, BACKEND_VIBE_STORYBOARD, BODY, BROWSER_ASSET_SOURCE_METADATA_KEYS, BROWSER_IMAGE_EDIT_EVENT, BadgeCheck, BadgeInfo, Bell, BellRing, BidiSpan, BlockPolicy, Bold$1, BookUser, Bot, Box, BoxSelect, Boxes, Brain$2, Bt$1, BubbleMenu, Bug, Button$3, CDN_BASE_MAP, CDN_BROWSER_START_ICON, CONNECTOR_STATUS_VISUAL, CONNECTOR_TOKEN_SOURCE, CSS$1, Calculator, CanvasNodeType, ChangeSet, CharCategory, ChartNoAxesCombined, Check, Check$2, CheckCheck, CheckCircle2, CheckCircle2Icon, CheckboxRoot, ChevronDown, ChevronDown$2, ChevronDownIcon$1, ChevronLeft, ChevronLeftIcon, ChevronRight$1, ChevronRightIcon, ChevronUp, ChevronUpIcon, CircleAlert, CircleAlert$2, CircleArrowUp, CircleCheckIcon, CircleIcon, CircleMinus, CircleX, Clapperboard$2, ClientOnly, ClipboardIcon, ClipboardList, Cloud, CloudDownload, CloudIcon, CloudUpload, Code$1, Cog, Command, CommentEnd, Compass, CompositedSvg, ConnectionTargetMarker, ContextMenuRoot, ContextMenuTrigger$1, Copy, CopyPlus, CreditCard, Crosshair, Crown, Ct$3, CurrentWorkspaceContext, D$7, DEFAULT_RUNTIME_CONFIG, DEFAULT_VIDEO_PLAYBACK_MAX_HEIGHT, DOMParser$1, DOMSerializer, Decoration$1, Decoration2, DecorationSet, DialogBackdrop, DialogClose$1, DialogDescription$2, DialogPopup, DialogPortal$2, DialogRoot, DialogTitle$2, DialogTrigger$1, Direction, DndContext, Download$2, DownloadIcon, DragOverlay, Dt$2, EditorContent, EditorSelection, Ellipsis, EmptyLine, Et$2, Extension, ExternalLink, ExternalLink$2, ExternalTokenizer, Eye, Eye$2, EyeIcon$1, EyeOff, EyeOffIcon$1, F$6, FILE_TYPE_EXTENSIONS, FOLD, Facet, FieldControl, FieldRoot, File$3, FileImage, FilePlus2, Film, Film$2, FolderClock, FolderClosed, FolderInput, FolderInput$2, FolderMinus, FolderOpenIcon, FolderPlus, FolderUp, FolderX, Ft$2, G$1, G$5, GENERATE_ERROR_CODE_IMAGE_ASPECT_RATIO_CONFLICT, GLOBAL_STORAGE_VERSION, GRID_COLUMN_COUNT_WIDE, GROUP_ID_HEADER, GatewayScopeContext, Gauge, GiftIcon, GitCompare, Globe, Globe2, GraduationCap, Grid2X2, Grid2x2Plus, Grid3X3, GripHorizontalIcon, GripVertical, Gt$1, H$5, HILO_HUB_BIZ_LINE, HILO_WORKSPACE_GENERATION_QUERY, HILO_WORKSPACE_IDENTITY_HEADER, HILO_WORKSPACE_IDENTITY_QUERY, HILO_WORKSPACE_INSTANCE_QUERY, Hand, Headphones, Headphones$2, HistoryIcon, Home, Ht$1, ICON_STROKE_SPEC, IconCompositingContext, ImagePlus, Import, Inbox, InfiniteQueryObserver, Info$1, InfoIcon$1, It$1, Italic$1, IterMode, J$6, JPEG, K$6, KeyRound, Keyboard, KeyboardSensor, L$7, LIBTV_CONNECTOR, Languages, Layers, Layers2, Layers3, LayoutGrid, LayoutList, LayoutTemplate, Library, Lightbulb, Link2, ListChecks, Loader2, Loader2Icon, LoaderCircle, Lock, LockKeyhole, Lt$1, MEDIA_EXTENSIONS, MEDIA_LINEAGE_MAX_REFERENCES, MEDIA_LINEAGE_REQUEST_HEADER, MIN_SELECTED_NODE_SIZE, Mail, Map$1, MapPin, Markdown$1, Maximize, Megaphone$2, MenuGroup, MenuGroupLabel, MenuItem$3, MenuPopup, MenuPortal, MenuPositioner, MenuRadioGroup, MenuRadioItem, MenuRadioItemIndicator, MenuRoot, MenuSubmenuRoot, MenuSubmenuTrigger, MenuTrigger, MessageCircle, MessageCircleMore, MessageSquareMore, Minus, MinusIcon, Monitor, MonitorUp, MonochromeIcon, MoreHorizontal, Mt$1, Music, Music$2, Music2, N$4, NODE_HIT_SLOP, Network, Newspaper, Node$3, Node$4, NodeSelection, NodeViewWrapper, NotebookPen, Nt$1, OctagonXIcon, Operation, Ot$2, P$7, PERF_CANVAS_PERSIST_HTTP_ROUNDTRIP, PERF_LOG_FLUSH, PROMPT_FONT_SIZE_DEFAULT, PROMPT_FONT_SIZE_MAX, PROMPT_FONT_SIZE_MIN, Package$2, PackageSearch, Palette, PanelBottomClose, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PanelsTopLeft, Pencil, PencilRuler, Phone, Pin, PinIcon, PinOff, PlatformContext, PlaybackCirclePauseIcon$1, PlaybackCirclePlayIcon$1, PlaybackCircleToggleIcon, PlaybackNextIcon$1, PlaybackPauseIcon$1, PlaybackPlayIcon$1, PlaybackPreviousIcon$1, PlaybackStopIcon$1, Plugin, PluginKey, Plus, Plus$1, Plus$2, PlusCircle, Podcast, PointerSensor, PopoverArrow$1, PopoverPopup, PopoverPortal, PopoverPositioner, PopoverRoot, PopoverTrigger$1, Power, Prec, PreviewCardPopup, PreviewCardPortal, PreviewCardPositioner, PreviewCardRoot, PreviewCardTrigger$1, ProcessingEnd, ProgressRoot, Pt$2, QUERY_KEY$1, QueryClient, QueryClientProvider, R$6, RadioGroup$1, RadioIndicator, RadioRoot, RangeSetBuilder, React, ReactNodeViewRenderer, Redo2, Regex, Repeat2, RotateCcw, RotateCw, RouterCore, Rt$2, S$7, SELECTED_GLOW_BLUR, SPECIAL_CONNECTORS, Save, Scan, Scissors, ScrollAreaCorner, ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport, ScrollText, Search, Search$2, SearchIcon, SelectIcon, SelectItem$2, SelectItemIndicator, SelectItemText, SelectList, SelectPopup, SelectPortal, SelectPositioner, SelectRoot, SelectScrollDownArrow, SelectScrollUpArrow, SelectTrigger$2, SelectValue$2, Selection, Send, ServerIcon, ServerOff, Share2, Share2$2, ShieldAlert, ShieldCheck, ShieldCheckIcon, ShieldOff, ShoppingBag$2, Shuffle, Slash, Slice, SliderControl$1, SliderIndicator, SliderRoot, SliderThumb, SliderTrack, Smartphone, Speech, Split, Square$2, SquareDashed, SquareMousePointer, St$2, StarterKit, StateEffect, StateField, Step, StepMap, StepResult, StickyNote, StyleModule, Sun, SwatchBook, SwitchRoot, SwitchThumb, TAB_CONTENT_ENTER_CLASS_NAME, TableView2, TabsIndicator, TabsList$1, TabsPanel, TabsRoot, TabsTab, Tag$1, Text, TextSelection, ThumbsDown, ThumbsUp, Toggle$1, ToggleGroup$1, TooltipPopup, TooltipPortal, TooltipPositioner, TooltipProvider$2, TooltipRoot, TooltipTrigger$1, Transaction2, Trash2$2, Trash2Icon, TreeFragment, TrendingUp, TriangleAlert, TriangleAlertIcon, Tt$2, Tv, U$3, Underline$1, Undo2, Ungroup$1, UploadIcon$1, User, UserRound, UserRoundPlus, UsersIcon, Ut$2, V$6, Video, Video$2, VideoOff, ViewPlugin, Volume2, Volume2Icon, VolumeXIcon, W$7, WORKSPACE_IDENTITY_MISMATCH_CODE, WORKSPACE_STORAGE_DEFAULTS, Wand2, WandSparkles, WholeWord, WidgetType2, WifiIcon, WifiOff, WifiOffIcon, Workflow, WorkspaceGatewayClient, Wrench, Wrench$2, X$6, X$7, XIcon, Y$4, Yt$2, Z$4, Zap, ZoomIn, ZoomOut, _$5, __ovVitePreload, __webpack_exports__getDocument, _t$2, at$3, attrsEqual, basename$8, browserAssetSourceMetadata, browserImageEditPrompt, bt$3, buildOfficialConnectorList, callOrReturn, cdnPublicAsset, classifyFileType, clientExports, closeHistory, closestCenter, clsx, collectMediaResultRecords, combineConfig, commands_exports, compareSemver, connectorDescription, connectorPromptActionLabelKey, connectorSummaryActionLabelKey, create$2, createConnectorInventory, createControlledPromise, createFileRoute, createRootRoute, createStore$1, createTailwindMerge, crelt, ct$3, decisionVersion, decodeHtmlEntities, defineLanguageFacet, deriveActiveScope, deriveTeamCreditDisplay, desktopMediaIcon, dispatchAccountSubmissionBlocked, dt$4, editorDocSnapshot, emit$5, emptyConnectorMarketPolicy, encodeHtmlEntities, estimateGridRowSize, et$4, f$4, findClusterBreak, findConnectionTarget, findConnectorMentions, findHcpConnector, findHitTarget, flattenExtensions, flowPointToMiniMap, flush, focusManager, formatDate, formatErrorMessage, ft$3, generateJSON, getCdnRegion, getDefaultExportFromCjs$1, getExtensionField, getFileActivityKind, getIconStrokeWidth, getLocationChangeInfo, getMergedHcpCatalog, getRuntimeConfig, getSchema, getSkillCoverUrl, getStoreFactory, getVisibleCloudUploads, gt$2, hasMediaAnalysisFailure, hcpToDefinition, ht$2, indentString, inferMediaKind, initReactI18next, invariant, isBrowserImageEditRequest, isCancelledError, isNotFound, isRecord$2, isRecord$g, isRedirect, isServer$1, isSkillsOnly, isUserProvidedAssetModel, isWorkspaceFolderMissingError, isWorkspaceIdentityErrorCode, it$3, j$5, jsxRuntimeExports, k$6, kt$2, lazyRouteComponent, listeners$8, localizedI18nText, logException, lt$3, m$4, makeLogger, marksEqual, matchesLocalConnectorServer, matchesRemoteConnectorServer, measurePerf, mediaLineageRequestId, mergeAttributes, mergeProps$1, minCreditAmount, mt$2, namesMatch, nodeToMiniMapRect, normalizeGatewayBaseUrl, normalizeLabel$1, nt$4, orderTidyNodes, ot$3, parseSemver, pendingLogLines, pinnedTidyNodeIds, probeMediaDurationSec, pt$2, q$5, queryOptions, rangeFrom, rangeTo, raw, reactDomExports, reactExports, readRecord, redirect, redo$1, redoDepth$1, regionToLocale, registerDynamicHcpManifests, remarkGfm, remarkParse, remarkRehype, replaceEqualDeep$1, requireLib, resolveConnectorIcon, resolveConnectorSetupAsset, resolveNewProjectPreferences, rootRouteId, rt$3, satisfiesMinHubVersion, selectGeneratedMediaNodeIds, selectedRequestGroupId, shallow, shimExports, sortExtensions, src_default$1, st$3, storageKeys, supportsConnectorDialog, tags$1, tidyNodeName, toJsxRuntime, trimPathRight, tryParseJson$1, tt$4, undo$1, undoDepth$1, unified, updateNewProjectPreferences, uploadResponseFilename, urlAttributes, useCurrentWorkspace, useEditor, useEditorState$1, useGatewayBaseUrl, useGatewayScope, useIsMutating, useIsoLayoutEffect, useMusicPromptLayout, useMutation, useNavigate, useNewProjectFolder, useParams, usePlatform, usePromptFontSizeStore, useQueries, useQuery, useQueryClient, useRender, useRouter, useSearch, useSensor, useSensors, useStorage, useStore$2, useTimeout, useTranslation, useVirtualizer, ut$2, v$7, videoPlaybackPath, visit, vt$2, withArtworkOpacity, withAutomaticDedupeId, withIconCompositing, withWorkspaceGatewayHeaders, workspaceGatewayUrl, workspaceLog, wt$3, x$4, xt$2, yt$2, z$3, z$7, zt$2 };
export{ADTS,AUDIO_CODECS,AdtsInputFormat,AdtsOutputFormat,AudioSample,AudioSampleSink,AudioSampleSource,BlobSource,BufferTarget,CanvasSink,ConversionCanceledError,CustomAudioEncoder,CustomPathedSource,EncodedAudioPacketSource,EncodedPacket,EncodedPacketSink,EncodedVideoPacketSource,FLAC,FlacInputFormat,FlacOutputFormat,InputAudioTrack,InputFormat,InputVideoTrack,IsobmffInputFormat,MATROSKA,MP3,MP4,MPEG_TS,MatroskaInputFormat,MkvOutputFormat,MovOutputFormat,Mp3InputFormat,Mp3OutputFormat,Mp4OutputFormat,NON_PCM_AUDIO_CODECS,NullTarget,OGG,OggInputFormat,OggOutputFormat,Output,OutputTrackGroup,PathedSource,QTFF,QUALITY_HIGH,QuickTimeInputFormat,ReadableStreamSource,Source,SourceRef,UnsupportedInputFormatError,UrlSource,VIDEO_CODECS,VideoSample,VideoSampleSink,VideoSampleSource,WAVE,WEBM,WavOutputFormat,WaveInputFormat,WebMInputFormat,WebMOutputFormat,desc,getEncodableAudioCodecs,getFirstEncodableVideoCodec,prefer,registerEncoder}from"mediabunny";
