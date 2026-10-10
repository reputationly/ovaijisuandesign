// auth-provider.jsx
import { getRuntimeConfig, reactExports, useNavigate, usePlatform, useTranslation } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import {
  entriesByWorkspace,
  flushWorkspaceCanvasPersistence,
} from "./settings-select.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { authExpiredBus } from "../infra/gateway-http-error.jsx";
import { AuthContext } from "../assets/credit-query-keys.jsx";
import { TRACK_EVENTS } from "../infra/track-events.js";
import { AlertDialog } from "../infra/dialog-content.jsx";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../infra/badge-variants.jsx";
import { homeService } from "../workspace/home-service.jsx";
import { markTrackUserAnonymous } from "../i18n/canvas-node-tools.jsx";
import { clearTrackUser, setTrackUser } from "../infra/init-track.js";
import { trackEvent } from "../infra/sanitize-track-props.js";
import { normalizeAdAttribution } from "../text-editor/normalize-ad-attribution-url.js";

const ATTEMPT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAuthLoginAttemptId(value) {
  return typeof value === "string" && ATTEMPT_ID_PATTERN.test(value);
}

async function flushAllWorkspaceCanvasPersistence() {
  const results = [];
  for (const workspaceId2 of Array.from(entriesByWorkspace.keys())) {
    results.push({
      workspaceId: workspaceId2,
      instanceIds: await flushWorkspaceCanvasPersistence(workspaceId2),
    });
  }
  return results;
}

function discardAllWorkspaceCanvasPersistence() {
  entriesByWorkspace.clear();
}

function buildAuthLoginTrackingProps(attempt) {
  if (!attempt) {
    return {
      attempt_id: "unknown",
      dispatch_seq: 0,
      strategy: "unknown",
      strategy_reason: "callback_without_local_attempt",
      protocol_registered: null,
    };
  }
  return {
    attempt_id: attempt.attemptId,
    dispatch_seq: attempt.dispatchSeq,
    strategy: attempt.strategy,
    strategy_reason: attempt.reason,
    protocol_registered: attempt.protocolRegistered,
  };
}

function authLoginAttemptDurationMs(attempt) {
  if (!attempt) return -1;
  return Date.now() - attempt.startedAt;
}

function createPendingAuthLoginAttempt(attemptId, dispatchSeq) {
  return {
    attemptId,
    dispatchSeq,
    strategy: "unknown",
    reason: "invoke_pending",
    protocolRegistered: null,
    startedAt: Date.now(),
  };
}

const LOGIN_URL = `${getRuntimeConfig().domain}/login`;

const RENEWAL_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1e3;

const AUTH_EXPIRED_DEDUPE_MS = 5e3;

const AUTH_EXPIRED_GRACE_MS = 1500;

const MAX_COMPLETED_AUTH_CALLBACKS = 50;

function isWorkspaceRenderer() {
  return new URLSearchParams(window.location.search).has("workspaceId");
}

export function AuthProvider({ children: children2 }) {
  const platform2 = usePlatform();
  const navigate = useNavigate();
  const navigateRef = reactExports.useRef(navigate);
  navigateRef.current = navigate;
  const { t: t2 } = useTranslation();
  const [user, setUser] = reactExports.useState(null);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [unauthenticatedReason, setUnauthenticatedReason] =
    reactExports.useState("initial");
  const [unsavedLogoutOpen, setUnsavedLogoutOpen] =
    reactExports.useState(false);
  const [expiredOpen, setExpiredOpen] = reactExports.useState(false);
  const [browserLogin, setBrowserLogin] = reactExports.useState(null);
  const browserLoginRef = reactExports.useRef(null);
  const updateBrowserLogin = reactExports.useCallback((next2) => {
    browserLoginRef.current = next2;
    setBrowserLogin(next2);
  }, []);
  const lastExpiredAtRef = reactExports.useRef(0);
  const gracePendingRef = reactExports.useRef(null);
  const authEpochRef = reactExports.useRef(0);
  const authTransitionEpochRef = reactExports.useRef(null);
  const authExpiryCheckRef = reactExports.useRef(null);
  const authWriteQueueRef = reactExports.useRef(Promise.resolve());
  const completedTokensRef = reactExports.useRef(new Set());
  const remoteLogoutRef = reactExports.useRef(false);
  const logoutInFlightRef = reactExports.useRef(false);
  const loginAttemptRef = reactExports.useRef(null);
  const loginDispatchPromiseRef = reactExports.useRef(null);
  const loginDispatchInFlightRef = reactExports.useRef(false);
  const tRef = reactExports.useRef(t2);
  tRef.current = t2;
  const userRef = reactExports.useRef(user);
  const applyUser = reactExports.useCallback((next2) => {
    userRef.current = next2;
    setUser(next2);
  }, []);
  const cancelExpiredLogout = reactExports.useCallback(() => {
    if (gracePendingRef.current) clearTimeout(gracePendingRef.current);
    gracePendingRef.current = null;
    lastExpiredAtRef.current = 0;
    setExpiredOpen(false);
  }, []);
  const writeAuth = reactExports.useCallback((epoch, write) => {
    const pending2 = authWriteQueueRef.current.then(async () => {
      if (authEpochRef.current !== epoch) return false;
      await write();
      return authEpochRef.current === epoch;
    });
    authWriteQueueRef.current = pending2.catch(() => void 0);
    return pending2;
  }, []);
  reactExports.useEffect(
    () => () => {
      authEpochRef.current += 1;
    },
    [],
  );
  const persistUser = reactExports.useCallback(
    async (u4, epoch, proof) => {
      if (typeof __HILO_AUTH__ !== "undefined") {
        const auth = __HILO_AUTH__;
        setIsLoading(true);
        let stored;
        try {
          stored = await writeAuth(epoch, () =>
            auth.storeAuth({
              ...u4,
              proof,
            }),
          );
        } catch (error) {
          if (authEpochRef.current === epoch) {
            const snapshot2 = await auth.getStoredAuth().catch(() => null);
            if (
              authEpochRef.current === epoch &&
              (!snapshot2 ||
                snapshot2.tokens.accessToken !== userRef.current?.accessToken ||
                snapshot2.user.userID !== userRef.current?.userID)
            ) {
              applyUser(null);
              setUnauthenticatedReason("signed-out");
            }
          }
          throw error;
        } finally {
          if (authEpochRef.current === epoch) setIsLoading(false);
        }
        if (!stored) return false;
      }
      if (authEpochRef.current !== epoch) return false;
      cancelExpiredLogout();
      setUnauthenticatedReason("initial");
      applyUser(u4);
      setIsLoading(false);
      if (u4.userID) {
        setTrackUser(
          u4.userID,
          u4.username
            ? {
                username: u4.username,
              }
            : void 0,
        );
      }
      trackEvent(TRACK_EVENTS.AUTH_LOGIN_SUCCESS, {
        ...buildAuthLoginTrackingProps(loginAttemptRef.current),
        stage: "completed",
        user_id: u4.userID ?? "unknown",
        has_id_token: Boolean(u4.idToken),
      });
      loginAttemptRef.current = null;
      if (typeof __HILO_AUTH__ !== "undefined") {
        try {
          await __HILO_AUTH__.notifyAuthChanged();
        } catch {}
      }
      return authEpochRef.current === epoch;
    },
    [applyUser, cancelExpiredLogout, writeAuth],
  );
  const clearUser = reactExports.useCallback(
    async (options) => {
      const epoch = options?.epoch ?? ++authEpochRef.current;
      updateBrowserLogin(null);
      cancelExpiredLogout();
      const closeWorkspaces = options?.closeWorkspaces ?? true;
      const navigateHome = options?.navigateHome ?? true;
      const trackLogout = options?.trackLogout ?? true;
      const nextUnauthenticatedReason =
        options?.unauthenticatedReason ?? "signed-out";
      if (navigateHome) {
        try {
          await navigate({
            to: "/",
          });
        } catch (err) {
          console.error("[auth] navigate to home failed:", err);
        }
      }
      if (authEpochRef.current !== epoch) return false;
      if (closeWorkspaces) {
        try {
          const result = await homeService.hiloApp.closeAllWorkspaces({
            discardUnsavedChanges: options?.discardUnsavedChanges,
          });
          if (!result.closed) {
            throw new Error(
              `Workspace teardown blocked: ${result.reason ?? "unknown"}`,
            );
          }
        } catch (err) {
          console.error("[auth] closeAllWorkspaces failed:", err);
          throw err;
        }
      }
      if (authEpochRef.current !== epoch) return false;
      if (typeof __HILO_AUTH__ !== "undefined") {
        const auth = __HILO_AUTH__;
        const cleared = await writeAuth(epoch, () => auth.clearAuth());
        if (!cleared) return false;
      }
      setUnauthenticatedReason(nextUnauthenticatedReason);
      if (userRef.current && trackLogout) {
        trackEvent(TRACK_EVENTS.AUTH_LOGOUT, {
          user_id: userRef.current.userID,
        });
      }
      applyUser(null);
      setIsLoading(false);
      loginAttemptRef.current = null;
      loginDispatchPromiseRef.current = null;
      loginDispatchInFlightRef.current = false;
      completedTokensRef.current.clear();
      clearTrackUser();
      if (typeof __HILO_AUTH__ !== "undefined") {
        try {
          await __HILO_AUTH__.notifyAuthChanged();
        } catch {}
      }
      return authEpochRef.current === epoch;
    },
    [applyUser, cancelExpiredLogout, navigate, updateBrowserLogin, writeAuth],
  );
  const login = reactExports.useCallback(() => {
    if (typeof __HILO_AUTH__ !== "undefined") {
      if (loginDispatchInFlightRef.current || logoutInFlightRef.current) return;
      const existingAttempt = loginAttemptRef.current;
      const attemptId = existingAttempt?.attemptId ?? crypto.randomUUID();
      const dispatchSeq = (existingAttempt?.dispatchSeq ?? 0) + 1;
      const pendingAttempt = existingAttempt
        ? {
            ...existingAttempt,
            dispatchSeq,
          }
        : createPendingAuthLoginAttempt(attemptId, dispatchSeq);
      loginAttemptRef.current = pendingAttempt;
      if (!existingAttempt) {
        authEpochRef.current += 1;
        updateBrowserLogin(null);
        completedTokensRef.current.clear();
        cancelExpiredLogout();
        trackEvent(TRACK_EVENTS.AUTH_LOGIN_START, {
          ...buildAuthLoginTrackingProps(pendingAttempt),
          stage: "invoked",
          method: "electron",
        });
      }
      loginDispatchInFlightRef.current = true;
      const dispatchStartedAt = Date.now();
      const dispatchEpoch = authEpochRef.current;
      const dispatchPromise = (async () => {
        try {
          const result = await __HILO_AUTH__.login(attemptId, dispatchSeq);
          if (dispatchEpoch !== authEpochRef.current) return;
          if (loginAttemptRef.current?.attemptId === attemptId) {
            loginAttemptRef.current = {
              ...result,
              startedAt: pendingAttempt.startedAt,
            };
          }
          const trackingProps = buildAuthLoginTrackingProps(result);
          if (!result.success) {
            console.error("[auth] login start failed:", result.error);
            trackEvent(TRACK_EVENTS.AUTH_LOGIN_FAILED, {
              ...trackingProps,
              stage: "invoke",
              error_type: "business",
              // result.reason is the stable strategy failure enum
              // (system_browser_start_error / in_app_start_error / ...).
              error_code: result.reason,
              error_message: result.error ?? "unknown",
              duration_ms: Date.now() - dispatchStartedAt,
            });
            loginAttemptRef.current = null;
            dedupedToast.error(
              result.error ?? tRef.current("auth.loginFailed"),
            );
            return;
          }
          trackEvent(TRACK_EVENTS.AUTH_LOGIN_DISPATCH, {
            ...trackingProps,
            stage: "dispatched",
            method:
              result.strategy === "in_app"
                ? "electron-in-app"
                : "electron-deeplink",
            duration_ms: Date.now() - dispatchStartedAt,
          });
        } catch (err) {
          if (dispatchEpoch !== authEpochRef.current) return;
          console.error("[auth] login invoke failed:", err);
          trackEvent(TRACK_EVENTS.AUTH_LOGIN_FAILED, {
            ...buildAuthLoginTrackingProps(pendingAttempt),
            stage: "invoke",
            error_type: "unknown",
            error_code: "login_invoke_failed",
            error_message: err instanceof Error ? err.message : String(err),
            duration_ms: Date.now() - dispatchStartedAt,
          });
          loginAttemptRef.current = null;
          dedupedToast.error(tRef.current("auth.loginFailed"));
        }
      })();
      loginDispatchPromiseRef.current = dispatchPromise;
      void dispatchPromise.finally(() => {
        if (loginDispatchPromiseRef.current === dispatchPromise) {
          loginDispatchPromiseRef.current = null;
          loginDispatchInFlightRef.current = false;
        }
      });
    } else {
      trackEvent(TRACK_EVENTS.AUTH_LOGIN_START, {
        ...buildAuthLoginTrackingProps(null),
        stage: "dispatched",
        method: "browser",
      });
      platform2.shell.openExternal(LOGIN_URL);
    }
  }, [cancelExpiredLogout, platform2, updateBrowserLogin]);
  reactExports.useEffect(() => {
    if (typeof __HILO_AUTH__ === "undefined") {
      markTrackUserAnonymous();
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const restoreEpoch = authEpochRef.current;
    (async () => {
      try {
        const { tokens: tokens2, user: storedUser } =
          await __HILO_AUTH__.getStoredAuth();
        if (cancelled || restoreEpoch !== authEpochRef.current) return;
        if (!tokens2.accessToken) {
          markTrackUserAnonymous();
          setUnauthenticatedReason("signed-out");
          setIsLoading(false);
          return;
        }
        const cached = {
          accessToken: tokens2.accessToken,
          idToken: tokens2.idToken,
          adAttribution: normalizeAdAttribution(tokens2.adAttribution),
          userID: storedUser.userID,
          avatar: storedUser.avatar,
          username: storedUser.username,
        };
        setUnauthenticatedReason("initial");
        applyUser(cached);
        if (cached.userID) {
          setTrackUser(
            cached.userID,
            cached.username
              ? {
                  username: cached.username,
                }
              : void 0,
          );
        }
        try {
          const payload = JSON.parse(atob(tokens2.accessToken.split(".")[1]));
          const expMs = (payload.exp ?? 0) * 1e3;
          if (expMs - Date.now() < RENEWAL_THRESHOLD_MS) {
            console.log("[auth] Token expiring soon, attempting renewal...");
            const { token: newToken, error: renewError } =
              await __HILO_AUTH__.renewToken(tokens2.accessToken);
            if (
              !cancelled &&
              restoreEpoch === authEpochRef.current &&
              newToken &&
              !renewError
            ) {
              console.log("[auth] Token renewed successfully");
              const current2 = await __HILO_AUTH__.getStoredAuth();
              if (cancelled || restoreEpoch !== authEpochRef.current) return;
              if (current2.tokens.accessToken) {
                applyUser({
                  accessToken: current2.tokens.accessToken,
                  idToken: current2.tokens.idToken,
                  adAttribution: normalizeAdAttribution(
                    current2.tokens.adAttribution,
                  ),
                  ...current2.user,
                });
              }
            } else {
              console.warn("[auth] Token renewal failed:", renewError);
            }
          }
        } catch {}
      } finally {
        markTrackUserAnonymous();
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUser]);
  reactExports.useEffect(() => {
    if (typeof __HILO_AUTH__ === "undefined") return;
    let cancelled = false;
    let processing = null;
    let pendingCallback = null;
    let lastIgnoredCallbackKey;
    const isCurrent = (attempt) =>
      !cancelled && attempt.epoch === authEpochRef.current;
    const processCallback = async (data2, attempt, confirmedLegacy = false) => {
      try {
        const {
          user: info2,
          error,
          authGeneration,
          requiresConfirmation,
        } = await __HILO_AUTH__.fetchUserInfo(
          data2.accessToken,
          confirmedLegacy ? void 0 : data2.loginAttemptId,
        );
        if (error === "stale_callback") {
          if (cancelled) return;
          const callbackAttemptId = isAuthLoginAttemptId(data2.loginAttemptId)
            ? data2.loginAttemptId
            : void 0;
          const ignoredKey = `${authEpochRef.current}:${callbackAttemptId ?? "unknown"}`;
          if (lastIgnoredCallbackKey !== ignoredKey) {
            lastIgnoredCallbackKey = ignoredKey;
            const epochCurrent = isCurrent(attempt);
            trackEvent(TRACK_EVENTS.AUTH_LOGIN_CALLBACK_IGNORED, {
              reason: "superseded_login",
              callback_attempt_id: callbackAttemptId,
              signed_in: Boolean(userRef.current),
              login_pending: Boolean(loginAttemptRef.current),
              callback_epoch_current: epochCurrent,
            });
            if (
              epochCurrent &&
              !userRef.current &&
              !logoutInFlightRef.current &&
              !browserLoginRef.current
            ) {
              dedupedToast.error(tRef.current("auth.loginPageExpired"), {
                id: "auth-login-page-expired",
              });
            }
          }
          return;
        }
        if (!isCurrent(attempt)) return;
        if (info2) {
          if (
            typeof authGeneration !== "number" ||
            !Number.isSafeInteger(authGeneration)
          )
            throw new Error("Missing auth commit generation");
          if (
            (!data2.loginAttemptId || requiresConfirmation) &&
            !confirmedLegacy
          ) {
            updateBrowserLogin({
              user: {
                ...info2,
                accessToken: data2.accessToken,
              },
              epoch: attempt.epoch,
              // Revalidate on confirmation; the dialog can remain open longer
              // than the credential lifetime or another login attempt.
              confirm: () => processCallback(data2, attempt, true),
            });
            return;
          }
          attempt.epoch = ++authEpochRef.current;
          authTransitionEpochRef.current = attempt.epoch;
          updateBrowserLogin(null);
          cancelExpiredLogout();
          const previous2 = userRef.current;
          if (previous2?.userID && previous2.userID !== info2.userID) {
            await flushAllWorkspaceCanvasPersistence();
            if (!isCurrent(attempt)) return;
            await navigateRef.current({
              to: "/",
            });
            await flushAllWorkspaceCanvasPersistence();
            if (!isCurrent(attempt)) return;
            const result = await homeService.hiloApp.closeAllWorkspaces({});
            if (!result.closed)
              throw new Error("Account switch blocked by unsaved work");
            if (!isCurrent(attempt)) return;
          }
          const persisted = await persistUser(
            {
              accessToken: data2.accessToken,
              idToken: data2.idToken,
              adAttribution: normalizeAdAttribution(data2.adAttribution),
              ...info2,
            },
            attempt.epoch,
            {
              generation: authGeneration,
              loginAttemptId: confirmedLegacy ? void 0 : data2.loginAttemptId,
              confirmedLegacy,
            },
          );
          if (persisted && isCurrent(attempt)) {
            const completed = completedTokensRef.current;
            completed.add(data2.accessToken);
            if (completed.size > MAX_COMPLETED_AUTH_CALLBACKS) {
              const oldest = completed.values().next().value;
              if (oldest) completed.delete(oldest);
            }
          }
        } else {
          trackEvent(TRACK_EVENTS.AUTH_LOGIN_FAILED, {
            ...buildAuthLoginTrackingProps(loginAttemptRef.current),
            stage: "fetch_user",
            error_type: error === "token_invalid" ? "auth" : "network",
            error_code: error ?? "fetch_user_network_error",
            error_message: error ?? "network_error",
            duration_ms: authLoginAttemptDurationMs(loginAttemptRef.current),
          });
          loginAttemptRef.current = null;
          dedupedToast.error(
            tRef.current(
              error === "token_invalid"
                ? "auth.loginFailed"
                : "auth.loginNetworkError",
            ),
          );
        }
      } catch (err) {
        if (!isCurrent(attempt)) return;
        if (
          err instanceof Error &&
          /AUTH_(ATTEMPT|SYNC)_SUPERSEDED/.test(err.message)
        )
          return;
        console.error("[auth] onAuthCallback unexpected error:", err);
        trackEvent(TRACK_EVENTS.AUTH_LOGIN_FAILED, {
          ...buildAuthLoginTrackingProps(loginAttemptRef.current),
          stage: "callback",
          error_type: "unknown",
          error_code: "login_callback_error",
          error_message: err instanceof Error ? err.message : String(err),
          duration_ms: authLoginAttemptDurationMs(loginAttemptRef.current),
        });
        loginAttemptRef.current = null;
        dedupedToast.error(tRef.current("auth.loginFailed"));
      } finally {
        if (authTransitionEpochRef.current === attempt.epoch)
          authTransitionEpochRef.current = null;
      }
    };
    const handleCallback = async (data2) => {
      if (logoutInFlightRef.current) return;
      if (completedTokensRef.current.has(data2.accessToken)) return;
      if (processing && isCurrent(processing)) {
        if (processing.token !== data2.accessToken) pendingCallback = data2;
        return;
      }
      const attempt = {
        token: data2.accessToken,
        epoch: authEpochRef.current,
      };
      processing = attempt;
      pendingCallback = null;
      try {
        await processCallback(data2, attempt);
      } finally {
        if (processing === attempt) {
          processing = null;
          const next2 = pendingCallback;
          pendingCallback = null;
          if (isCurrent(attempt) && next2) await handleCallback(next2);
        }
      }
    };
    const unsub = __HILO_AUTH__.onAuthCallback(async (data2) => {
      const epoch = authEpochRef.current;
      try {
        const pendingDispatch = loginDispatchPromiseRef.current;
        if (pendingDispatch) await pendingDispatch;
        if (cancelled || epoch !== authEpochRef.current) return;
        await handleCallback(data2);
      } catch (err) {
        console.error("[auth] onAuthCallback dispatch ordering error:", err);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [cancelExpiredLogout, persistUser, updateBrowserLogin]);
  reactExports.useEffect(() => {
    if (typeof __HILO_AUTH__ === "undefined") return;
    let cancelled = false;
    let readVersion = 0;
    const unsub = __HILO_AUTH__.onAuthChanged(async () => {
      const epoch = authEpochRef.current;
      const version2 = ++readVersion;
      try {
        const { tokens: tokens2, user: storedUser } =
          await __HILO_AUTH__.getStoredAuth();
        if (
          cancelled ||
          epoch !== authEpochRef.current ||
          version2 !== readVersion
        )
          return;
        const tokenChanged =
          (tokens2.accessToken || "") !== (userRef.current?.accessToken || "");
        if (
          Boolean(tokens2.accessToken) !==
            Boolean(userRef.current?.accessToken) ||
          (storedUser.userID || "") !== (userRef.current?.userID || "")
        ) {
          authEpochRef.current += 1;
          updateBrowserLogin(null);
        }
        if (tokenChanged) cancelExpiredLogout();
        setIsLoading(false);
        if (tokens2.accessToken) {
          setUnauthenticatedReason("initial");
          applyUser({
            accessToken: tokens2.accessToken,
            idToken: tokens2.idToken,
            adAttribution: normalizeAdAttribution(tokens2.adAttribution),
            userID: storedUser.userID,
            avatar: storedUser.avatar,
            username: storedUser.username,
          });
          if (storedUser.userID) {
            setTrackUser(
              storedUser.userID,
              storedUser.username
                ? {
                    username: storedUser.username,
                  }
                : void 0,
            );
          }
        } else {
          setUnauthenticatedReason("signed-out");
          applyUser(null);
          completedTokensRef.current.clear();
          clearTrackUser();
        }
      } catch {}
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [applyUser, cancelExpiredLogout, updateBrowserLogin]);
  const handleAuthExpired = reactExports.useCallback(() => {
    const auth = typeof __HILO_AUTH__ === "undefined" ? void 0 : __HILO_AUTH__;
    const expiredToken = userRef.current?.accessToken;
    const epoch = authEpochRef.current;
    if (
      !auth ||
      !expiredToken ||
      logoutInFlightRef.current ||
      browserLoginRef.current ||
      authTransitionEpochRef.current === epoch
    )
      return;
    if (
      authExpiryCheckRef.current?.token === expiredToken &&
      authExpiryCheckRef.current.epoch === epoch
    )
      return;
    const now2 = Date.now();
    if (now2 - lastExpiredAtRef.current < AUTH_EXPIRED_DEDUPE_MS) return;
    lastExpiredAtRef.current = now2;
    const check = {
      token: expiredToken,
      epoch,
    };
    authExpiryCheckRef.current = check;
    void (async () => {
      try {
        const { user: current2, error } =
          await auth.fetchUserInfo(expiredToken);
        if (
          authEpochRef.current !== epoch ||
          userRef.current?.accessToken !== expiredToken ||
          current2 ||
          error !== "token_invalid"
        )
          return;
        dedupedToast.error(tRef.current("auth.sessionExpired.toast"));
        trackEvent(TRACK_EVENTS.AUTH_LOGIN_FAILED, {
          stage: "runtime",
          error_type: "auth",
          error_code: "session_expired_401",
          error_message: "session_expired_401",
          duration_ms: 0,
        });
        if (gracePendingRef.current) clearTimeout(gracePendingRef.current);
        gracePendingRef.current = setTimeout(() => {
          gracePendingRef.current = null;
          if (
            authEpochRef.current !== epoch ||
            userRef.current?.accessToken !== expiredToken
          )
            return;
          void clearUser({
            closeWorkspaces: false,
            navigateHome: false,
            trackLogout: false,
            unauthenticatedReason: "expired",
          })
            .then((cleared) => {
              if (cleared) setExpiredOpen(true);
            })
            .catch((error2) => {
              console.error("[auth] expired session cleanup failed:", error2);
            });
        }, AUTH_EXPIRED_GRACE_MS);
      } catch (error) {
        console.warn("[auth] Could not verify current session expiry:", error);
      } finally {
        if (authExpiryCheckRef.current === check)
          authExpiryCheckRef.current = null;
      }
    })();
  }, [clearUser]);
  reactExports.useEffect(() => {
    const unsub = authExpiredBus.on(() => {
      if (typeof __HILO_AUTH__ !== "undefined" && isWorkspaceRenderer()) {
        void __HILO_AUTH__.notifyAuthExpired().catch((err) => {
          console.error("[auth] notifyAuthExpired failed:", err);
          handleAuthExpired();
        });
        return;
      }
      handleAuthExpired();
    });
    return () => {
      unsub();
      if (gracePendingRef.current) {
        clearTimeout(gracePendingRef.current);
        gracePendingRef.current = null;
      }
    };
  }, [handleAuthExpired]);
  reactExports.useEffect(() => {
    if (typeof __HILO_AUTH__ === "undefined") return;
    return __HILO_AUTH__.onAuthExpired(handleAuthExpired);
  }, [handleAuthExpired]);
  const openRemoteLogout = reactExports.useCallback(async () => {
    if (typeof __HILO_AUTH__ === "undefined") return;
    const attemptId = crypto.randomUUID();
    authEpochRef.current += 1;
    updateBrowserLogin(null);
    loginAttemptRef.current = createPendingAuthLoginAttempt(attemptId, 1);
    try {
      const result = await __HILO_AUTH__.logout(attemptId);
      if (!result.success)
        dedupedToast.error(tRef.current("auth.logoutFailed"));
    } catch (error) {
      console.error("[auth] browser logout failed:", error);
      dedupedToast.error(tRef.current("auth.logoutFailed"));
    }
  }, [updateBrowserLogin]);
  const handleExpiredRelogin = reactExports.useCallback(() => {
    setExpiredOpen(false);
    void openRemoteLogout();
  }, [openRemoteLogout]);
  const handleCancelBrowserLogin = reactExports.useCallback(() => {
    if (!browserLoginRef.current) return;
    authEpochRef.current += 1;
    updateBrowserLogin(null);
  }, [updateBrowserLogin]);
  const handleConfirmBrowserLogin = reactExports.useCallback(() => {
    const pending2 = browserLoginRef.current;
    if (pending2 && pending2 !== browserLogin) return;
    if (!pending2 || pending2.epoch !== authEpochRef.current) {
      updateBrowserLogin(null);
      return;
    }
    updateBrowserLogin(null);
    void pending2.confirm();
  }, [browserLogin, updateBrowserLogin]);
  const requestClearUser = reactExports.useCallback(
    async (remoteLogout = false) => {
      if (logoutInFlightRef.current) return;
      logoutInFlightRef.current = true;
      remoteLogoutRef.current = remoteLogout;
      const epoch = ++authEpochRef.current;
      cancelExpiredLogout();
      let locallyCleared = false;
      try {
        await flushAllWorkspaceCanvasPersistence();
        if (epoch !== authEpochRef.current) return;
        await navigate({
          to: "/",
        });
        await flushAllWorkspaceCanvasPersistence();
        if (epoch !== authEpochRef.current) return;
        const cleared = await clearUser({
          navigateHome: false,
          epoch,
        });
        if (cleared) {
          logoutInFlightRef.current = false;
          locallyCleared = true;
          if (remoteLogout) await openRemoteLogout();
        }
      } catch (err) {
        console.error("[auth] canvas flush before logout failed:", err);
        setUnsavedLogoutOpen(true);
      } finally {
        if (!locallyCleared) logoutInFlightRef.current = false;
      }
    },
    [cancelExpiredLogout, clearUser, navigate, openRemoteLogout],
  );
  const handleDiscardAndLogout = reactExports.useCallback(() => {
    setUnsavedLogoutOpen(false);
    discardAllWorkspaceCanvasPersistence();
    void clearUser({
      discardUnsavedChanges: true,
    })
      .then(async (cleared) => {
        if (cleared && remoteLogoutRef.current) await openRemoteLogout();
      })
      .catch((err) => {
        console.error("[auth] destructive logout failed:", err);
        dedupedToast.error(tRef.current("auth.logoutFailed"));
      });
  }, [clearUser, openRemoteLogout]);
  const logout = reactExports.useCallback(() => {
    void requestClearUser(true);
  }, [requestClearUser]);
  const clearLocalAuth = reactExports.useCallback(() => {
    void requestClearUser();
  }, [requestClearUser]);
  const updateUsername = reactExports.useCallback(
    async (username) => {
      const current2 = userRef.current;
      if (!current2?.userID) return;
      const expectedUserID = current2.userID;
      const next2 = {
        ...current2,
        username,
      };
      applyUser(next2);
      if (current2.userID) {
        setTrackUser(current2.userID, {
          username,
        });
      }
      if (typeof __HILO_AUTH__ === "undefined") return;
      const auth = __HILO_AUTH__;
      try {
        await writeAuth(authEpochRef.current, () =>
          auth.storeUsername(username, expectedUserID),
        );
      } catch (err) {
        console.warn("[auth] persist username failed:", err);
      }
      try {
        await __HILO_AUTH__.notifyAuthChanged();
      } catch (err) {
        console.warn("[auth] notify username change failed:", err);
      }
    },
    [applyUser, writeAuth],
  );
  const value = reactExports.useMemo(
    () => ({
      user,
      isLoggedIn: user !== null,
      isLoading,
      unauthenticatedReason,
      login,
      logout,
      clearLocalAuth,
      updateUsername,
    }),
    [
      user,
      isLoading,
      unauthenticatedReason,
      login,
      logout,
      clearLocalAuth,
      updateUsername,
    ],
  );
  return (
    <AuthContext value={value}>
      {children2}
      <AlertDialog
        open={browserLogin !== null}
        onOpenChange={(open) => {
          if (!open) handleCancelBrowserLogin();
        }}
      >
        <AlertDialogContent
          size="sm"
          data-action-ui-id="auth:confirm-browser-login"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t2("auth.confirmBrowserLogin.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t2("auth.confirmBrowserLogin.description", {
                account: browserLogin?.user.username
                  ? `${browserLogin.user.username} (${browserLogin.user.userID ?? ""})`
                  : (browserLogin?.user.userID ?? ""),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelBrowserLogin}
              data-action-ui-id="auth:confirm-browser-login:cancel"
            >
              {t2("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBrowserLogin}
              data-action-ui-id="auth:confirm-browser-login:confirm"
            >
              {t2("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={expiredOpen} onOpenChange={setExpiredOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t2("auth.sessionExpired.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t2("auth.sessionExpired.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t2("auth.sessionExpired.later")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleExpiredRelogin}>
              {t2("auth.sessionExpired.relogin")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={unsavedLogoutOpen} onOpenChange={setUnsavedLogoutOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t2("auth.unsavedLogout.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t2("auth.unsavedLogout.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t2("auth.unsavedLogout.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDiscardAndLogout}
            >
              {t2("auth.unsavedLogout.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthContext>
  );
}
