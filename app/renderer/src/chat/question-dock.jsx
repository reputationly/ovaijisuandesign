// question-dock.jsx
import {
  Check,
  ChevronDown,
  CompositedSvg,
  jsxRuntimeExports,
  reactExports,
  useTranslation,
} from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import {
  RadioGroup,
  RadioGroupItem,
  shouldIgnoreChatGlobalShortcut,
} from "../media-editing/message-list-props-equal.jsx";
import { PencilLine } from "../media-editing/package.jsx";
import { useMentionModels } from "../generation/use-mention-models.jsx";
import { ChatToolbar } from "../generation/chat-toolbar.jsx";
import { Button } from "../infra/dialog-content.jsx";
import { Checkbox } from "../infra/checkbox.jsx";
import { CHAT_CONTENT_MAX_WIDTH_PX } from "./ae.jsx";
import { resolveShortcutDisplay } from "../workspace/other-modifiers.js";
import { isMacPlatform } from "../workspace/shortcut-hint.jsx";
import { QuestionPromptIcon } from "../workspace/home-service.jsx";
import {
  redactForCurrentRegion,
  replaceConfiguredModelNamesForCurrentRegion,
} from "../generation/replace-configured-model-names-for-current-region.js";
import { localizeRecommendedQuestionOptionLabel } from "../text-editor/capability-search-card.jsx";
import { Label } from "../team/use-wallet-query.jsx";
import { MessageInput } from "./chat-compliance-notice.jsx";
import { MEDIA_FILE_ACCEPT } from "../text-editor/build-asr-gateway-request.js";
function QuestionSelectionCheck({ selected: selected2 }) {
  return (
    <CompositedSvg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`size-3 shrink-0 overflow-visible [&_path]:[stroke-dasharray:24] [&_path]:transition-[stroke-dashoffset] [&_path]:duration-200 [&_path]:ease-out motion-reduce:[&_path]:transition-none ${selected2 ? "[&_path]:[stroke-dashoffset:0]" : "[&_path]:[stroke-dashoffset:-24]"}`}
    >
      <path
        d="M12.75 5.05 6.35 11.55 3.2 9.4"
        pathLength="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CompositedSvg>
  );
}
const QUESTION_ATTACHMENT_MAX_COUNT = 4;
const OPTION_SHORTCUT_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function getOptionShortcutKey(optionIndex) {
  return OPTION_SHORTCUT_KEYS[optionIndex] ?? null;
}
function getQuestionSubmitBlockReason(
  questionIndex,
  answers,
  customTexts,
  customAttachments,
) {
  const attachments = customAttachments[questionIndex] ?? [];
  if (attachments.some((attachment) => attachment.status === "error")) {
    return "attachment-failed";
  }
  if (
    attachments.some(
      (attachment) =>
        attachment.status === "uploading" ||
        (attachment.status === "done" && !attachment.relativePath),
    )
  ) {
    return "attachment-uploading";
  }
  if ((answers[questionIndex]?.length ?? 0) > 0) return null;
  if (customTexts[questionIndex]?.trim()) return null;
  if (
    attachments.some(
      (attachment) =>
        attachment.status === "done" && Boolean(attachment.relativePath),
    )
  ) {
    return null;
  }
  return "unanswered";
}
function findFirstQuestionSubmitBlocker(
  questionCount,
  answers,
  customTexts,
  customAttachments,
) {
  for (let questionIndex = 0; questionIndex < questionCount; questionIndex++) {
    const reason = getQuestionSubmitBlockReason(
      questionIndex,
      answers,
      customTexts,
      customAttachments,
    );
    if (reason)
      return {
        questionIndex,
        reason,
      };
  }
  return null;
}
function buildQuestionReplyMessage(requestId, selectedAnswers, customAnswers) {
  const attachmentContexts = [];
  const answers = selectedAnswers.map((selected2, questionIndex) => {
    const custom = customAnswers[questionIndex];
    if (custom?.attachments.length) {
      attachmentContexts.push({
        question_index: questionIndex,
        attachments: [...custom.attachments],
        ...(custom.attachmentRefs?.length
          ? {
              attachment_refs: [...custom.attachmentRefs],
            }
          : {}),
      });
    }
    return custom?.text.trim()
      ? [...selected2, custom.text.trim()]
      : [...selected2];
  });
  return {
    type: "question_reply",
    id: requestId,
    answers,
    ...(attachmentContexts.length > 0
      ? {
          attachment_contexts: attachmentContexts,
        }
      : {}),
  };
}
export function QuestionDock({
  question: question2,
  submissionFailureId,
  onSend,
  isPresented = true,
  onFileDropHandlerChange,
}) {
  const { t: t2 } = useTranslation();
  const { data: mentionModels = [] } = useMentionModels();
  const displayAgentText = reactExports.useCallback(
    (text2) =>
      replaceConfiguredModelNamesForCurrentRegion(
        redactForCurrentRegion(text2),
        mentionModels,
      ),
    [mentionModels],
  );
  const displayQuestionOptionLabel = reactExports.useCallback(
    (label) =>
      localizeRecommendedQuestionOptionLabel(displayAgentText(label), t2),
    [displayAgentText, t2],
  );
  const raw2 = question2.questionData?.questions;
  const questions = Array.isArray(raw2) ? raw2 : [];
  const requestId = question2.requestId;
  const [currentIndex, setCurrentIndex] = reactExports.useState(0);
  const [answers, setAnswers] = reactExports.useState(() =>
    questions.map(() => []),
  );
  const [customTexts, setCustomTexts] = reactExports.useState(() =>
    questions.map(() => ""),
  );
  const [customAttachments, setCustomAttachments] = reactExports.useState(() =>
    questions.map(() => []),
  );
  const [editingCustom, setEditingCustom] = reactExports.useState(() =>
    questions.map(() => false),
  );
  const [collapsed, setCollapsed] = reactExports.useState(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [submitBlocker, setSubmitBlocker] = reactExports.useState(null);
  const questionDockRef = reactExports.useRef(null);
  const composerRefs = reactExports.useRef(questions.map(() => null));
  const committedCustomAnswersRef = reactExports.useRef(
    questions.map(() => ({
      text: "",
      attachments: [],
    })),
  );
  const customPreviousAnswersRef = reactExports.useRef(questions.map(() => []));
  const customRestoreTimerRef = reactExports.useRef(null);
  const customTextsRef = reactExports.useRef(customTexts);
  const suppressAutoAdvanceRef = reactExports.useRef(null);
  const autoAdvanceTimerRef = reactExports.useRef(null);
  const submitLockRef = reactExports.useRef(false);
  const submissionDispatchedRef = reactExports.useRef(false);
  const handledSubmissionFailureIdRef = reactExports.useRef(void 0);
  const previousQuestionMessageIdRef = reactExports.useRef(question2.id);
  const focusDockAfterNavigationRef = reactExports.useRef(null);
  customTextsRef.current = customTexts;
  const releaseSubmissionForRetry = reactExports.useCallback(() => {
    if (!submissionDispatchedRef.current) return;
    submissionDispatchedRef.current = false;
    submitLockRef.current = false;
    setSubmitting(false);
  }, []);
  reactExports.useEffect(() => {
    if (
      !submissionFailureId ||
      handledSubmissionFailureIdRef.current === submissionFailureId
    ) {
      return;
    }
    handledSubmissionFailureIdRef.current = submissionFailureId;
    releaseSubmissionForRetry();
  }, [releaseSubmissionForRetry, submissionFailureId]);
  reactExports.useEffect(() => {
    if (previousQuestionMessageIdRef.current === question2.id) return;
    previousQuestionMessageIdRef.current = question2.id;
    releaseSubmissionForRetry();
  }, [question2.id, releaseSubmissionForRetry]);
  const toggleCollapsed = reactExports.useCallback(
    () => setCollapsed((c3) => !c3),
    [],
  );
  const shortcutLabel = resolveShortcutDisplay(
    "CommandOrControl+Shift+D",
    isMacPlatform() ? "darwin" : "win32",
  ).text;
  const currentQuestion = questions[currentIndex];
  const isMultiple = currentQuestion?.multiple ?? false;
  const isLastQuestion = currentIndex === questions.length - 1;
  const handleCurrentQuestionFileDrop = reactExports.useCallback(
    (event) => composerRefs.current[currentIndex]?.handleFileDrop?.(event),
    [currentIndex],
  );
  reactExports.useEffect(() => {
    onFileDropHandlerChange?.(handleCurrentQuestionFileDrop);
    return () => onFileDropHandlerChange?.(void 0);
  }, [handleCurrentQuestionFileDrop, onFileDropHandlerChange]);
  const firstSubmitBlocker = reactExports.useMemo(
    () =>
      findFirstQuestionSubmitBlocker(
        questions.length,
        answers,
        customTexts,
        customAttachments,
      ),
    [answers, customAttachments, customTexts, questions.length],
  );
  const clearPendingAutoAdvance = reactExports.useCallback(() => {
    if (!autoAdvanceTimerRef.current) return;
    clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
  }, []);
  const handleGoToQuestion = reactExports.useCallback(
    (questionIndex) => {
      if (submitLockRef.current) return;
      clearPendingAutoAdvance();
      setCurrentIndex(questionIndex);
    },
    [clearPendingAutoAdvance],
  );
  const handleSelectOption = reactExports.useCallback(
    (label) => {
      if (customRestoreTimerRef.current) {
        clearTimeout(customRestoreTimerRef.current);
        customRestoreTimerRef.current = null;
      }
      customPreviousAnswersRef.current[currentIndex] = [];
      setAnswers((prev) => {
        const updated = [...prev];
        const current2 = [...(updated[currentIndex] ?? [])];
        if (isMultiple) {
          const idx = current2.indexOf(label);
          if (idx >= 0) {
            current2.splice(idx, 1);
          } else {
            current2.push(label);
          }
        } else {
          if (current2[0] === label) {
            updated[currentIndex] = [];
            return updated;
          }
          updated[currentIndex] = [label];
          composerRefs.current[currentIndex]?.reset();
          setEditingCustom((prev2) => {
            const ec = [...prev2];
            ec[currentIndex] = false;
            return ec;
          });
          return updated;
        }
        updated[currentIndex] = current2;
        return updated;
      });
    },
    [currentIndex, isMultiple],
  );
  const handleSelectOptionByKeyboard = reactExports.useCallback(
    (optionIndex) => {
      const option2 = currentQuestion?.options[optionIndex];
      if (!option2) return;
      if (!isMultiple && answers[currentIndex]?.[0] === option2.label) return;
      if (!isMultiple) suppressAutoAdvanceRef.current = currentIndex;
      handleSelectOption(option2.label);
    },
    [answers, currentIndex, currentQuestion, handleSelectOption, isMultiple],
  );
  const prevAnswersRef = reactExports.useRef(answers);
  reactExports.useEffect(() => {
    const prev = prevAnswersRef.current;
    prevAnswersRef.current = answers;
    if (isMultiple) return;
    const currentAnswer = answers[currentIndex] ?? [];
    const prevAnswer = prev[currentIndex] ?? [];
    if (suppressAutoAdvanceRef.current === currentIndex) {
      suppressAutoAdvanceRef.current = null;
      return;
    }
    if (
      currentAnswer.length > 0 &&
      prevAnswer.length === 0 &&
      !isLastQuestion
    ) {
      clearPendingAutoAdvance();
      autoAdvanceTimerRef.current = setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        focusDockAfterNavigationRef.current = questionDockRef.current?.contains(
          document.activeElement,
        )
          ? currentIndex + 1
          : null;
        setCurrentIndex((index2) =>
          index2 === currentIndex ? index2 + 1 : index2,
        );
      }, 150);
      return clearPendingAutoAdvance;
    }
  }, [
    answers,
    clearPendingAutoAdvance,
    currentIndex,
    isMultiple,
    isLastQuestion,
  ]);
  reactExports.useEffect(() => {
    if (focusDockAfterNavigationRef.current !== currentIndex) return;
    focusDockAfterNavigationRef.current = null;
    questionDockRef.current?.focus({
      preventScroll: true,
    });
  }, [currentIndex]);
  const handleCustomTextChange = reactExports.useCallback(
    (questionIndex, text2) => {
      setCustomTexts((prev) => {
        const updated = [...prev];
        updated[questionIndex] = text2;
        return updated;
      });
      if (!questions[questionIndex]?.multiple && text2.trim()) {
        setAnswers((prev) => {
          const updated = [...prev];
          updated[questionIndex] = [];
          return updated;
        });
      }
    },
    [questions],
  );
  const handleStartCustom = reactExports.useCallback(
    (questionIndex) => {
      if (customRestoreTimerRef.current) {
        clearTimeout(customRestoreTimerRef.current);
        customRestoreTimerRef.current = null;
      }
      if (!questions[questionIndex]?.multiple) {
        const currentSelection = answers[questionIndex] ?? [];
        if (customPreviousAnswersRef.current[questionIndex]?.length === 0) {
          customPreviousAnswersRef.current[questionIndex] = [
            ...currentSelection,
          ];
        }
        if (currentSelection.length > 0) {
          setAnswers((prev) => {
            const updated = [...prev];
            updated[questionIndex] = [];
            return updated;
          });
        }
      }
      setEditingCustom((prev) => {
        const updated = [...prev];
        updated[questionIndex] = true;
        return updated;
      });
    },
    [answers, questions],
  );
  const handleStopCustom = reactExports.useCallback(
    (questionIndex) => {
      setEditingCustom((prev) => {
        const updated = [...prev];
        updated[questionIndex] = false;
        return updated;
      });
      if (questions[questionIndex]?.multiple) return;
      const hasAttachment = customAttachments[questionIndex]?.some(
        (attachment) =>
          attachment.status === "done" && Boolean(attachment.relativePath),
      );
      if (customTexts[questionIndex]?.trim() || hasAttachment) {
        customPreviousAnswersRef.current[questionIndex] = [];
        return;
      }
      customRestoreTimerRef.current = setTimeout(() => {
        customRestoreTimerRef.current = null;
        const previousSelection =
          customPreviousAnswersRef.current[questionIndex] ?? [];
        customPreviousAnswersRef.current[questionIndex] = [];
        if (
          previousSelection.length === 0 ||
          customTextsRef.current[questionIndex]?.trim()
        )
          return;
        setAnswers((prev) => {
          if ((prev[questionIndex]?.length ?? 0) > 0) return prev;
          suppressAutoAdvanceRef.current = questionIndex;
          const updated = [...prev];
          updated[questionIndex] = previousSelection;
          return updated;
        });
      }, 0);
    },
    [customAttachments, customTexts, questions],
  );
  const handleCancelCustom = reactExports.useCallback(
    (questionIndex = currentIndex) => {
      if (customRestoreTimerRef.current) {
        clearTimeout(customRestoreTimerRef.current);
        customRestoreTimerRef.current = null;
      }
      if (!questions[questionIndex]?.multiple) {
        const previousSelection =
          customPreviousAnswersRef.current[questionIndex] ?? [];
        customPreviousAnswersRef.current[questionIndex] = [];
        if (previousSelection.length > 0) {
          setAnswers((prev) => {
            suppressAutoAdvanceRef.current = questionIndex;
            const updated = [...prev];
            updated[questionIndex] = previousSelection;
            return updated;
          });
        }
      }
      setEditingCustom((prev) => {
        const updated = [...prev];
        updated[questionIndex] = false;
        return updated;
      });
      composerRefs.current[questionIndex]?.reset();
    },
    [currentIndex, questions],
  );
  reactExports.useEffect(() => {
    return () => {
      if (customRestoreTimerRef.current)
        clearTimeout(customRestoreTimerRef.current);
      clearPendingAutoAdvance();
    };
  }, [clearPendingAutoAdvance]);
  const handleCustomAttachmentsChange = reactExports.useCallback(
    (questionIndex, attachments) => {
      setCustomAttachments((prev) => {
        const updated = [...prev];
        updated[questionIndex] = attachments;
        return updated;
      });
      if (attachments.length > 0 && !questions[questionIndex]?.multiple) {
        handleStartCustom(questionIndex);
      }
    },
    [handleStartCustom, questions],
  );
  const handleCustomCommit = reactExports.useCallback(
    (
      questionIndex,
      text2,
      filePaths,
      canvasNodeAttachments,
      entityRefs,
      pluginNodeAttachments,
      _allowDataDirectoryFallback,
      _languageDetectionText,
      attachmentRefs,
    ) => {
      if (
        canvasNodeAttachments?.length ||
        entityRefs?.length ||
        pluginNodeAttachments?.length
      ) {
        return false;
      }
      committedCustomAnswersRef.current[questionIndex] = {
        text: text2,
        attachments: [...filePaths],
        ...(attachmentRefs?.length
          ? {
              attachmentRefs: [...attachmentRefs],
            }
          : {}),
      };
      return true;
    },
    [],
  );
  reactExports.useEffect(() => {
    setSubmitBlocker((current2) => {
      if (!current2) return current2;
      const reason = getQuestionSubmitBlockReason(
        current2.questionIndex,
        answers,
        customTexts,
        customAttachments,
      );
      if (reason === current2.reason) return current2;
      return reason
        ? {
            ...current2,
            reason,
          }
        : null;
    });
  }, [answers, customAttachments, customTexts]);
  const handleSubmit = reactExports.useCallback(async () => {
    if (!requestId || submitLockRef.current || submissionDispatchedRef.current)
      return;
    if (firstSubmitBlocker) {
      clearPendingAutoAdvance();
      setSubmitBlocker(firstSubmitBlocker);
      if (firstSubmitBlocker.questionIndex !== currentIndex) {
        focusDockAfterNavigationRef.current = firstSubmitBlocker.questionIndex;
        setCurrentIndex(firstSubmitBlocker.questionIndex);
      }
      return;
    }
    submitLockRef.current = true;
    setSubmitBlocker(null);
    setSubmitting(true);
    let dispatched = false;
    try {
      const customAnswerSubmissions = [];
      for (
        let questionIndex = 0;
        questionIndex < questions.length;
        questionIndex++
      ) {
        const hasCustomText = Boolean(customTexts[questionIndex]?.trim());
        const hasCustomAttachment = customAttachments[questionIndex]?.some(
          (attachment) =>
            attachment.status === "done" && Boolean(attachment.relativePath),
        );
        if (!hasCustomText && !hasCustomAttachment) {
          committedCustomAnswersRef.current[questionIndex] = {
            text: "",
            attachments: [],
          };
          continue;
        }
        const composer = composerRefs.current[questionIndex];
        if (!composer) return;
        customAnswerSubmissions.push(composer.submit());
      }
      if (customAnswerSubmissions.length > 0) {
        const accepted = await Promise.all(customAnswerSubmissions);
        if (accepted.some((result) => !result)) return;
      }
      const scopedAnswers = Array.from(
        {
          length: questions.length,
        },
        (_2, questionIndex) => answers[questionIndex] ?? [],
      );
      const scopedCustomAnswers = Array.from(
        {
          length: questions.length,
        },
        (_2, questionIndex) =>
          committedCustomAnswersRef.current[questionIndex] ?? {
            text: "",
            attachments: [],
          },
      );
      const sent = onSend(
        buildQuestionReplyMessage(
          requestId,
          scopedAnswers,
          scopedCustomAnswers,
        ),
      );
      if (sent === false) return;
      submissionDispatchedRef.current = true;
      dispatched = true;
    } finally {
      if (!dispatched) {
        submitLockRef.current = false;
        setSubmitting(false);
      }
    }
  }, [
    answers,
    clearPendingAutoAdvance,
    currentIndex,
    customAttachments,
    customTexts,
    firstSubmitBlocker,
    onSend,
    questions.length,
    requestId,
  ]);
  const handleKeyboardAdvance = reactExports.useCallback(() => {
    if (submitLockRef.current || submissionDispatchedRef.current) return;
    clearPendingAutoAdvance();
    if (isLastQuestion) {
      void handleSubmit();
      return;
    }
    const nextIndex = Math.min(currentIndex + 1, questions.length - 1);
    focusDockAfterNavigationRef.current = nextIndex;
    setCurrentIndex(nextIndex);
  }, [
    clearPendingAutoAdvance,
    currentIndex,
    handleSubmit,
    isLastQuestion,
    questions.length,
  ]);
  const handleDismiss = reactExports.useCallback(() => {
    if (!requestId || submitLockRef.current || submissionDispatchedRef.current)
      return;
    onSend({
      type: "question_reject",
      id: requestId,
    });
  }, [requestId, onSend]);
  const keydownRef = reactExports.useRef(() => {});
  keydownRef.current = (e2) => {
    if (!isPresented) return;
    const questionDockTarget =
      e2.target instanceof HTMLElement
        ? e2.target.closest('[data-action-ui-id="chat-question-dock"]')
        : null;
    if (questionDockTarget !== questionDockRef.current) return;
    const selectedOptionTarget =
      e2.target instanceof HTMLElement
        ? e2.target.closest(
            '[data-question-option="true"][data-selected="true"]',
          )
        : null;
    const optionTarget =
      e2.target instanceof HTMLElement
        ? e2.target.closest('[data-question-option="true"]')
        : null;
    if (e2.key === "Escape" && questionDockTarget && !e2.defaultPrevented) {
      e2.preventDefault();
      if (editingCustom[currentIndex]) {
        handleCancelCustom();
      } else {
        handleDismiss();
      }
      return;
    }
    const isPlainEnter =
      e2.key === "Enter" &&
      !e2.shiftKey &&
      !e2.metaKey &&
      !e2.ctrlKey &&
      !e2.altKey &&
      !e2.repeat &&
      !e2.isComposing &&
      e2.keyCode !== 229;
    if (isPlainEnter && selectedOptionTarget && !collapsed) {
      e2.preventDefault();
      handleKeyboardAdvance();
      return;
    }
    const optionShortcutIndex =
      e2.key.length === 1
        ? OPTION_SHORTCUT_KEYS.indexOf(e2.key.toUpperCase())
        : -1;
    const isOptionShortcut =
      optionShortcutIndex >= 0 &&
      !e2.shiftKey &&
      !e2.metaKey &&
      !e2.ctrlKey &&
      !e2.altKey &&
      !e2.repeat &&
      !e2.isComposing &&
      e2.keyCode !== 229;
    if (
      isOptionShortcut &&
      !collapsed &&
      !editingCustom[currentIndex] &&
      (e2.target === questionDockRef.current || optionTarget)
    ) {
      if (currentQuestion?.options[optionShortcutIndex]) {
        e2.preventDefault();
        handleSelectOptionByKeyboard(optionShortcutIndex);
      }
      return;
    }
    if (shouldIgnoreChatGlobalShortcut(e2)) return;
    if (
      (e2.metaKey || e2.ctrlKey) &&
      e2.shiftKey &&
      (e2.key === "d" || e2.key === "D")
    ) {
      e2.preventDefault();
      toggleCollapsed();
      return;
    }
    if (e2.key === "Escape") {
      if (editingCustom[currentIndex]) {
        handleCancelCustom();
      } else {
        handleDismiss();
      }
      return;
    }
    if (collapsed) return;
    if (isPlainEnter && !editingCustom[currentIndex]) {
      e2.preventDefault();
      handleKeyboardAdvance();
    }
  };
  reactExports.useEffect(() => {
    if (!isPresented) return;
    const dock = questionDockRef.current;
    if (!dock) return;
    const handler = (event) => keydownRef.current(event);
    dock.addEventListener("keydown", handler);
    return () => dock.removeEventListener("keydown", handler);
  }, [isPresented]);
  if (!currentQuestion || !requestId) return null;
  const currentAnswers = answers[currentIndex] ?? [];
  const questionLabelId = `chat-question-label-${requestId}-${currentIndex}`;
  const activeSubmitBlockReason =
    submitBlocker?.questionIndex === currentIndex ? submitBlocker.reason : null;
  const submitBlockMessage = activeSubmitBlockReason
    ? {
        unanswered: t2(
          "chat.question.answerRequired",
          "Answer this question before submitting.",
        ),
        "attachment-uploading": t2(
          "chat.question.attachmentUploading",
          "This attachment is still uploading. Submit after it finishes.",
        ),
        "attachment-failed": t2(
          "chat.question.attachmentFailed",
          "Attachment upload failed. Retry or remove it before submitting.",
        ),
      }[activeSubmitBlockReason]
    : null;
  const answeredCount = questions.reduce(
    (n2, _2, i2) =>
      n2 +
      ((answers[i2]?.length ?? 0) > 0 ||
      customTexts[i2]?.trim() ||
      customAttachments[i2]?.some(
        (attachment) =>
          attachment.status === "done" && Boolean(attachment.relativePath),
      )
        ? 1
        : 0),
    0,
  );
  const progressLabel =
    questions.length > 1 ? `${currentIndex + 1}/${questions.length}` : null;
  const headerBar = (
    <div
      data-action-ui-id="chat-question-header"
      className={`flex min-h-8 min-w-0 gap-2 pr-3 ${questions.length === 1 ? "pl-3" : "pl-4"} ${collapsed ? "items-center" : "items-start"} ${questions.length === 1 ? "pt-3 pb-2.5" : "py-2.5"}`}
    >
      {questions.length === 1 && (
        <QuestionPromptIcon
          actionId="chat-question-active-icon"
          className="mt-0.5"
        />
      )}
      <div
        data-action-ui-id="chat-question-heading-group"
        className="min-w-0 flex-1"
      >
        <div
          className={`flex min-w-0 gap-1.5 ${collapsed ? "items-center" : "items-start"}`}
        >
          {questions.length > 1 && (
            <span className="shrink-0 text-sm font-medium leading-5 text-foreground">
              {currentIndex + 1}.
            </span>
          )}
          <span
            className={`min-w-0 flex-1 text-sm font-medium leading-5 text-foreground ${collapsed ? "truncate" : "whitespace-pre-wrap"}`}
          >
            <span id={questionLabelId}>
              {displayAgentText(currentQuestion.question)}
            </span>
            {!collapsed && isMultiple && (
              <span className="ml-2 text-body-12 font-normal text-muted-foreground">
                ({t2("chat.question.multiSelect")})
              </span>
            )}
          </span>
          {collapsed && progressLabel && (
            <span className="shrink-0 text-caption-11 text-muted-foreground">
              {progressLabel}
            </span>
          )}
          {collapsed && questions.length > 1 && (
            <span className="shrink-0 text-caption-11 text-muted-foreground">
              ({answeredCount}/{questions.length})
            </span>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        data-action-ui-id="chat-question-toggle"
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? t2("chat.question.expand", "Expand")
            : t2("chat.question.collapse", "Collapse")
        }
        title={
          collapsed
            ? `${t2("chat.question.expand", "Expand")} (${shortcutLabel})`
            : `${t2("chat.question.collapse", "Collapse")} (${shortcutLabel})`
        }
        tabIndex={collapsed ? -1 : void 0}
        aria-hidden={collapsed ? true : void 0}
        className={`shrink-0 text-muted-foreground aria-expanded:bg-transparent ${collapsed ? "pointer-events-none" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          toggleCollapsed();
        }}
      >
        <Icon
          icon={ChevronDown}
          size="md"
          strokeWidth={1.5}
          className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
        />
      </Button>
    </div>
  );
  return (
    <div
      ref={questionDockRef}
      data-action-ui-id="chat-question-dock"
      data-collapsed={collapsed ? "true" : "false"}
      tabIndex={-1}
      className="flex max-h-full min-h-0 flex-col bg-transparent pt-2 outline-none"
    >
      <div
        data-action-ui-id="chat-question-dock-content"
        className="relative mx-auto flex max-h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border-solid border-border bg-card [border-width:var(--divider-width)]"
        style={{
          maxWidth: `${CHAT_CONTENT_MAX_WIDTH_PX}px`,
        }}
      >
        {collapsed && (
          <button
            type="button"
            data-action-ui-id="chat-question-card-expand-target"
            aria-expanded="false"
            aria-label={t2("chat.question.expand", "Expand")}
            className="absolute inset-0 z-10 size-full cursor-pointer rounded-xl bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={toggleCollapsed}
          />
        )}
        {!collapsed && questions.length > 1 && (
          <div
            data-action-ui-id="chat-question-stepper"
            className="scrollbar-none min-w-0 overflow-x-auto px-3 pt-3"
          >
            <div
              data-action-ui-id="chat-question-stepper-track"
              className="flex min-w-full flex-nowrap items-center"
            >
              {questions.map((q2, i2) => {
                const answered = Boolean(
                  answers[i2]?.length > 0 ||
                  customTexts[i2]?.trim() ||
                  customAttachments[i2]?.some(
                    (attachment) =>
                      attachment.status === "done" &&
                      Boolean(attachment.relativePath),
                  ),
                );
                const previousAnswered =
                  i2 > 0 &&
                  Boolean(
                    answers[i2 - 1]?.length > 0 ||
                    customTexts[i2 - 1]?.trim() ||
                    customAttachments[i2 - 1]?.some(
                      (attachment) =>
                        attachment.status === "done" &&
                        Boolean(attachment.relativePath),
                    ),
                  );
                const active2 = i2 === currentIndex;
                return jsxRuntimeExports.jsxs(
                  reactExports.Fragment,
                  {
                    children: [
                      i2 > 0 && (
                        <span
                          data-action-ui-id={`chat-question-step-connector-${i2}`}
                          aria-hidden="true"
                          className={`mx-1 h-px min-w-3 max-w-7 flex-1 transition-colors duration-200 ${previousAnswered ? "bg-foreground/25" : "bg-border"}`}
                        />
                      ),
                      <button
                        type="button"
                        data-action-ui-id={`chat-question-step-${i2}`}
                        data-answered={answered ? "true" : "false"}
                        aria-current={active2 ? "step" : void 0}
                        aria-label={`${i2 + 1}. ${displayAgentText(q2.header)}`}
                        title={displayAgentText(q2.header)}
                        className="group flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                        onClick={() => handleGoToQuestion(i2)}
                      >
                        <span
                          className={`flex size-6 items-center justify-center rounded-full border transition-[color,background-color,border-color,box-shadow] duration-200 ${active2 ? "border-foreground bg-foreground text-background" : answered ? "border-foreground/20 bg-muted/60 text-foreground" : "border-foreground/20 bg-transparent text-muted-foreground group-hover:border-foreground/40 group-hover:text-foreground"}`}
                        >
                          {answered ? (
                            <QuestionSelectionCheck selected={true} />
                          ) : (
                            <span className="text-caption-10 leading-none">
                              {i2 + 1}
                            </span>
                          )}
                        </span>
                      </button>,
                    ],
                  },
                  q2.header,
                );
              })}
            </div>
          </div>
        )}
        <div
          data-action-ui-id="chat-question-scroll-region"
          className={collapsed ? "contents" : "min-h-0 flex-1 overflow-y-auto"}
        >
          {headerBar}
          {!collapsed && (
            <div
              data-action-ui-id="chat-question-body"
              className="flex min-w-0 flex-col gap-2 px-3 pt-0 pb-3"
            >
              <div
                data-action-ui-id="chat-question-choice-list"
                className="flex min-h-0 flex-col gap-1.5"
              >
                {currentQuestion.options.length > 0 &&
                  (isMultiple ? (
                    <fieldset
                      aria-labelledby={questionLabelId}
                      data-action-ui-id="chat-question-options"
                      className="flex max-h-[min(36vh,18rem)] flex-col gap-1.5 overflow-y-auto"
                    >
                      {currentQuestion.options.map((opt, i2) => {
                        const isSelected = currentAnswers.includes(opt.label);
                        const optionId = `chat-question-${requestId}-${currentIndex}-${i2}`;
                        const optionShortcutKey = getOptionShortcutKey(i2);
                        return (
                          <Label
                            key={opt.label}
                            htmlFor={optionId}
                            data-action-ui-id={`chat-question-option-${i2}`}
                            data-question-option="true"
                            data-selected={isSelected ? "true" : "false"}
                            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${isSelected ? "border-foreground bg-foreground/[0.02] text-foreground" : "border-border bg-transparent text-foreground hover:bg-muted/30"}`}
                          >
                            <span
                              aria-hidden="true"
                              data-action-ui-id={`chat-question-option-shortcut-${i2}`}
                              className="w-4 shrink-0 text-center text-body-14 font-normal leading-5 text-foreground/70"
                            >
                              {optionShortcutKey}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="text-body-13 font-medium leading-5">
                                {displayQuestionOptionLabel(opt.label)}
                              </span>
                              {opt.description && (
                                <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                                  {displayAgentText(opt.description)}
                                </span>
                              )}
                            </span>
                            <Checkbox
                              id={optionId}
                              checked={isSelected}
                              aria-keyshortcuts={optionShortcutKey?.toLowerCase()}
                              onCheckedChange={() =>
                                handleSelectOption(opt.label)
                              }
                              shape="circle"
                              size="sm"
                              data-action-ui-id={`chat-question-option-index-${i2}`}
                            />
                          </Label>
                        );
                      })}
                    </fieldset>
                  ) : (
                    <RadioGroup
                      aria-labelledby={questionLabelId}
                      value={currentAnswers[0] ?? ""}
                      onValueChange={handleSelectOption}
                      data-action-ui-id="chat-question-options"
                      className="max-h-[min(36vh,18rem)] gap-1.5 overflow-y-auto"
                    >
                      {currentQuestion.options.map((opt, i2) => {
                        const isSelected = currentAnswers.includes(opt.label);
                        const optionId = `chat-question-${requestId}-${currentIndex}-${i2}`;
                        const optionShortcutKey = getOptionShortcutKey(i2);
                        return (
                          <Label
                            key={opt.label}
                            htmlFor={optionId}
                            data-action-ui-id={`chat-question-option-${i2}`}
                            data-question-option="true"
                            data-selected={isSelected ? "true" : "false"}
                            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${isSelected ? "border-foreground bg-foreground/[0.02] text-foreground" : "border-border bg-transparent text-foreground hover:bg-muted/30"}`}
                          >
                            <RadioGroupItem
                              id={optionId}
                              value={opt.label}
                              aria-keyshortcuts={optionShortcutKey?.toLowerCase()}
                              className="pointer-events-none absolute size-px overflow-hidden border-0 p-0 opacity-0"
                            />
                            <span
                              aria-hidden="true"
                              data-action-ui-id={`chat-question-option-shortcut-${i2}`}
                              className="w-4 shrink-0 text-center text-body-14 font-normal leading-5 text-foreground/70"
                            >
                              {optionShortcutKey}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="text-body-13 font-medium leading-5">
                                {displayQuestionOptionLabel(opt.label)}
                              </span>
                              {opt.description && (
                                <span className="text-body-12 font-normal leading-[18px] text-muted-foreground">
                                  {displayAgentText(opt.description)}
                                </span>
                              )}
                            </span>
                            <span className="flex w-7 shrink-0 items-center justify-center">
                              <span
                                data-action-ui-id={`chat-question-option-index-${i2}`}
                                className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-foreground bg-foreground text-background" : "border-foreground/30 bg-transparent text-transparent"}`}
                              >
                                <QuestionSelectionCheck selected={isSelected} />
                              </span>
                            </span>
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  ))}
                {questions.map((info2, questionIndex) => {
                  if (info2.custom === false) return null;
                  const active2 = questionIndex === currentIndex;
                  const multiple = info2.multiple ?? false;
                  const selected2 =
                    Boolean(customTexts[questionIndex]?.trim()) ||
                    customAttachments[questionIndex]?.some(
                      (attachment) =>
                        attachment.status === "done" &&
                        Boolean(attachment.relativePath),
                    ) ||
                    (!multiple && editingCustom[questionIndex]);
                  return (
                    <div
                      key={`${requestId}-${questionIndex}`}
                      hidden={!active2}
                      className={active2 ? "block" : "hidden"}
                    >
                      <div
                        data-action-ui-id={
                          active2 ? "chat-question-custom-option" : void 0
                        }
                        className={`flex w-full items-start gap-2 rounded-lg border p-2 transition-colors ${selected2 ? "border-foreground bg-foreground/[0.02]" : "border-border bg-transparent hover:bg-muted/30"}`}
                        onFocusCapture={() => handleStartCustom(questionIndex)}
                        onBlurCapture={(event) => {
                          if (
                            !event.currentTarget.contains(event.relatedTarget)
                          ) {
                            handleStopCustom(questionIndex);
                          }
                        }}
                        onKeyDownCapture={(event) => {
                          if (event.key !== "Escape") return;
                          event.preventDefault();
                          event.stopPropagation();
                          handleCancelCustom(questionIndex);
                          event.target.blur();
                        }}
                      >
                        <span
                          aria-hidden="true"
                          data-action-ui-id="chat-question-custom-icon"
                          className={`flex h-8 w-4 translate-x-1 shrink-0 items-center justify-center transition-colors ${selected2 ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          <Icon
                            icon={PencilLine}
                            size="md"
                            strokeWidth={1.25}
                            aria-hidden={true}
                          />
                        </span>
                        <MessageInput
                          ref={(node2) => {
                            composerRefs.current[questionIndex] = node2;
                          }}
                          fileDropScope="parent"
                          onSend={(
                            text2,
                            filePaths,
                            canvasNodeAttachments,
                            entityRefs,
                            pluginNodeAttachments,
                            allowDataDirectoryFallback,
                            languageDetectionText,
                            attachmentRefs,
                          ) =>
                            handleCustomCommit(
                              questionIndex,
                              text2,
                              filePaths,
                              canvasNodeAttachments,
                              entityRefs,
                              pluginNodeAttachments,
                              allowDataDirectoryFallback,
                              languageDetectionText,
                              attachmentRefs,
                            )
                          }
                          clearOnSend={false}
                          busy={submitting}
                          attachmentAccept={MEDIA_FILE_ACCEPT.image}
                          replacementAccept={MEDIA_FILE_ACCEPT.image}
                          attachmentMaxCount={QUESTION_ATTACHMENT_MAX_COUNT}
                          hideSubmitAction={true}
                          submitOnEnter={false}
                          onPlainEnter={(event) => {
                            if (!event.repeat) handleKeyboardAdvance();
                          }}
                          enableSlashCommands={false}
                          hideAssetMention={true}
                          placeholder={t2("chat.question.customPlaceholder")}
                          editorAriaLabel={
                            questions.length === 1
                              ? t2("chat.question.other")
                              : `${t2("chat.question.other")}: ${redactForCurrentRegion(info2.header)}`
                          }
                          editorActionId={`chat-question-custom-input-${questionIndex}`}
                          toolbar={(context) => (
                            <ChatToolbar
                              {...context}
                              busy={submitting}
                              running={false}
                              selectedMediaModels={void 0}
                              onModelSelectionChange={() => {}}
                              showModelSelector={false}
                              showSkillSelector={false}
                            />
                          )}
                          onInputChange={(text2) =>
                            handleCustomTextChange(questionIndex, text2)
                          }
                          onAttachmentsChange={(attachments) =>
                            handleCustomAttachmentsChange(
                              questionIndex,
                              attachments,
                            )
                          }
                          className="question-dock-composer @container/composer min-w-0 flex-1 bg-transparent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <div
            data-action-ui-id="chat-question-actions"
            className="shrink-0 px-3 pt-1 pb-3"
          >
            {submitBlockMessage && (
              <p
                role="status"
                aria-live="polite"
                data-action-ui-id="chat-question-submit-blocker"
                data-reason={activeSubmitBlockReason ?? void 0}
                className={`mb-2 text-body-12 leading-[18px] ${activeSubmitBlockReason === "attachment-failed" ? "text-destructive" : "text-muted-foreground"}`}
              >
                {submitBlockMessage}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-[34px] rounded-md text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
                disabled={submitting}
              >
                {t2("chat.question.dismiss")}
              </Button>
              {currentIndex > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-[34px] rounded-md"
                  onClick={() => handleGoToQuestion(currentIndex - 1)}
                  disabled={submitting}
                >
                  {t2("chat.question.back")}
                </Button>
              )}
              {isLastQuestion ? (
                <Button
                  type="button"
                  data-action-ui-id="chat-question-submit"
                  className="h-[34px] rounded-md"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  <Icon icon={Check} size="sm" aria-hidden={true} />
                  {t2("chat.question.submit")}
                </Button>
              ) : (
                <Button
                  type="button"
                  data-action-ui-id="chat-question-next"
                  className="h-[34px] rounded-md"
                  onClick={() => handleGoToQuestion(currentIndex + 1)}
                  disabled={submitting}
                >
                  {t2("chat.question.next")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
