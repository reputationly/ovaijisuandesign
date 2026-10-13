// home-widget-host.jsx
import {
  getSnapshot,
  HOME_WIDGET_DEV_PREVIEW_EVENT,
  snapshot,
} from "./set-home-widget-dev-preview-mode.js";
import { reactExports, usePlatform, useTranslation, X$7 as CloseIcon } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button, cn$2 as cn } from "../infra/dialog-content.jsx";
import { openExternalUrl } from "../vendor-inline/vscode-base/graph.jsx";
import { useRouterState } from "../vendor-inline/vscode-base/linked-list.js";
import { useAuth } from "../assets/credit-query-keys.jsx";
import { DEFAULT_HOME_WIDGET_CONFIG } from "./tool-label-definitions.js";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { useHubClientConfig } from "../settings/parse-home-survey.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
const listeners = new Set();
function subscribeHomeWidgetDevPreview(listener) {
  listeners.add(listener);
  if (typeof window === "undefined") return () => listeners.delete(listener);
  window.addEventListener(HOME_WIDGET_DEV_PREVIEW_EVENT, listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(HOME_WIDGET_DEV_PREVIEW_EVENT, listener);
  };
}
function useHomeWidgetDevPreviewMode() {
  return reactExports.useSyncExternalStore(
    subscribeHomeWidgetDevPreview,
    getSnapshot,
    () => snapshot,
  );
}
const HOME_WIDGET_DISMISSAL_PREFIX = "hilo.home-widget.dismissed";
function getHomeSurveyDismissalKey(accountScope, surveyId) {
  return `${HOME_WIDGET_DISMISSAL_PREFIX}.${JSON.stringify([accountScope, surveyId])}`;
}
function isHomeSurveyDismissed(
  accountScope,
  surveyId,
  now = Date.now(),
  storage = typeof window === "undefined" ? void 0 : window.localStorage,
) {
  if (!storage) return false;
  try {
    const raw = storage.getItem(
      getHomeSurveyDismissalKey(accountScope, surveyId),
    );
    if (!raw) return false;
    const dismissedUntil = Number(raw);
    return Number.isFinite(dismissedUntil) && dismissedUntil > now;
  } catch {
    return false;
  }
}
function dismissHomeSurvey(
  accountScope,
  surveyId,
  cooldownMs,
  now = Date.now(),
  storage = typeof window === "undefined" ? void 0 : window.localStorage,
) {
  if (!storage) return;
  try {
    storage.setItem(
      getHomeSurveyDismissalKey(accountScope, surveyId),
      String(now + Math.max(0, cooldownMs)),
    );
  } catch {}
}
const HomeSurveyCard = ({ survey, onCta, onDismiss }) => {
  const { t: translate } = useTranslation();
  const [imageVisible, setImageVisible] = reactExports.useState(true);
  reactExports.useEffect(() => {
    setImageVisible(Boolean(survey.imageUrl));
  }, [survey.imageUrl]);
  return (
    <article
      className="elevated-surface-border w-full overflow-hidden rounded-[10px] bg-popover p-[3px] text-popover-foreground shadow-lg"
      data-action-ui-id="home-widget.survey"
    >
      <div className="relative">
        <div data-action-ui-id="home-widget.survey.preview">
          {imageVisible ? (
            <div className="relative aspect-[16/8] w-full overflow-hidden rounded-[7px] bg-muted">
              <img
                src={survey.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setImageVisible(false)}
              />
            </div>
          ) : null}
          <div className="px-2 pt-2 pb-1">
            <h3 className="line-clamp-2 text-sm font-medium text-foreground">
              {survey.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {survey.description}
            </p>
          </div>
        </div>
        {survey.dismissible ? (
          <button
            type="button"
            className="absolute top-1.5 right-1.5 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/45 text-white transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80"
            onClick={onDismiss}
            aria-label={translate("common.close")}
            data-action-ui-id="home-widget.survey.close"
          >
            <CloseIcon className="size-2.5" strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
      <div className="px-2 pt-1 pb-2">
        <Button
          type="button"
          size="sm"
          className={cn("h-8 w-full min-w-0 rounded-[7px]")}
          onClick={onCta}
          data-action-ui-id="home-widget.survey.cta"
        >
          {survey.ctaLabel}
        </Button>
      </div>
    </article>
  );
};
export const HomeWidgetHost = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isHomeRoute = pathname === "/";
  const { user } = useAuth();
  const accountScope = user?.userID ? `user:${user.userID}` : "anonymous";
  const { homeWidget: configuredWidget } = useHubClientConfig();
  const { t: translate } = useTranslation();
  const platform = usePlatform();
  const preview = useHomeWidgetDevPreviewMode();
  const isSurveyPreview = preview.selection === "survey";
  const homeWidget =
    preview.selection === "empty" || preview.selection === "update"
      ? {
          enabled: false,
          survey: null,
        }
      : (configuredWidget ?? DEFAULT_HOME_WIDGET_CONFIG);
  const survey = homeWidget.survey;
  const surveyId = survey?.id ?? null;
  const surveyKey = surveyId
    ? getHomeSurveyDismissalKey(accountScope, surveyId)
    : null;
  const [dismissedSurveyKey, setDismissedSurveyKey] = reactExports.useState(
    () =>
      !isSurveyPreview &&
      surveyId &&
      isHomeSurveyDismissed(accountScope, surveyId)
        ? surveyKey
        : null,
  );
  const ctaRequestRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    void preview.revision;
    setDismissedSurveyKey(
      !isSurveyPreview &&
        surveyId &&
        isHomeSurveyDismissed(accountScope, surveyId)
        ? surveyKey
        : null,
    );
    ctaRequestRef.current = null;
    return () => {
      ctaRequestRef.current = null;
    };
  }, [accountScope, surveyId, surveyKey, preview.revision, isSurveyPreview]);
  const surveyAvailable = Boolean(
    isHomeRoute &&
    homeWidget.enabled &&
    survey &&
    surveyKey !== dismissedSurveyKey &&
    (isSurveyPreview || !isHomeSurveyDismissed(accountScope, survey.id)),
  );
  reactExports.useEffect(() => {
    if (!surveyAvailable || !survey || isSurveyPreview) return;
    trackEvent(TRACK_EVENTS.HOME_WIDGET_VIEW, {
      widget_type: "survey",
      widget_id: survey.id,
      placement: "home-bottom-right",
    });
  }, [survey, surveyAvailable, isSurveyPreview]);
  const handleDismissSurvey = () => {
    if (!survey?.dismissible) return;
    if (!isSurveyPreview)
      dismissHomeSurvey(accountScope, survey.id, survey.cooldownMs);
    setDismissedSurveyKey(surveyKey);
    if (!isSurveyPreview) {
      trackEvent(TRACK_EVENTS.HOME_WIDGET_DISMISS, {
        widget_type: "survey",
        widget_id: survey.id,
        placement: "home-bottom-right",
      });
    }
  };
  const handleSurveyCta = () => {
    if (!survey || ctaRequestRef.current) return;
    const requestToken = Symbol();
    ctaRequestRef.current = requestToken;
    if (!isSurveyPreview) {
      trackEvent(TRACK_EVENTS.HOME_WIDGET_CLICK, {
        widget_type: "survey",
        widget_id: survey.id,
        placement: "home-bottom-right",
        action: "cta",
      });
    }
    void openExternalUrl(platform, survey.ctaUrl, {
      source: "home-widget.survey",
    }).then((opened) => {
      if (opened && !isSurveyPreview) {
        dismissHomeSurvey(accountScope, survey.id, survey.cooldownMs);
      }
      if (ctaRequestRef.current !== requestToken) return;
      ctaRequestRef.current = null;
      if (opened) {
        setDismissedSurveyKey(surveyKey);
        return;
      }
      if (!isSurveyPreview) {
        trackEvent(TRACK_EVENTS.HOME_WIDGET_ACTION_FAILED, {
          widget_type: "survey",
          widget_id: survey.id,
          placement: "home-bottom-right",
          action: "cta",
          reason: "external_link_failed",
        });
      }
      dedupedToast.error(translate("homeWidget.actionFailed"));
    });
  };
  if (!surveyAvailable || !survey) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute right-4 bottom-4 z-40 w-[min(256px,calc(100%-2rem))]",
      )}
      data-action-ui-id="home-widget"
      data-widget-type="survey"
    >
      <div className="pointer-events-auto">
        <HomeSurveyCard
          survey={survey}
          onCta={handleSurveyCta}
          onDismiss={handleDismissSurvey}
        />
      </div>
    </div>
  );
};
