// settle-operation.js
import { instance } from "../vendor.js";
import { dedupedToast } from "../infra/agent-http-client.js";

const SKILL_APPLYING_TOAST_ID = "skill-applying";

const OPERATION_TIMEOUT_MS = 6e4;

const timeoutHandles = new Set();

let pendingOperationCount = 0;

let successMessage;

let successRender;

let infoMessage;

let errorMessage;

function settleOperation(result, message2, render2) {
  pendingOperationCount -= 1;
  if (result === "error") {
    errorMessage ??= message2;
  } else if (result === "info") {
    infoMessage ??= message2;
  } else if (render2) {
    successRender = render2;
  } else {
    successMessage = message2;
  }
  if (pendingOperationCount > 0) return;
  const finalErrorMessage = errorMessage;
  const finalInfoMessage = infoMessage;
  const finalSuccessMessage = successMessage;
  const finalSuccessRender = successRender;
  pendingOperationCount = 0;
  successMessage = void 0;
  successRender = void 0;
  infoMessage = void 0;
  errorMessage = void 0;
  for (const handle2 of timeoutHandles) {
    clearTimeout(handle2);
  }
  timeoutHandles.clear();
  if (finalErrorMessage !== void 0) {
    dedupedToast.error(finalErrorMessage, {
      id: SKILL_APPLYING_TOAST_ID,
    });
    return;
  }
  if (finalInfoMessage !== void 0) {
    dedupedToast.info(finalInfoMessage, {
      id: SKILL_APPLYING_TOAST_ID,
    });
    return;
  }
  if (finalSuccessRender !== void 0) {
    finalSuccessRender(SKILL_APPLYING_TOAST_ID);
    return;
  }
  if (finalSuccessMessage !== void 0) {
    dedupedToast.success(finalSuccessMessage, {
      id: SKILL_APPLYING_TOAST_ID,
    });
  }
}

export function beginSkillApplyingToast(message2) {
  pendingOperationCount += 1;
  if (pendingOperationCount === 1) {
    dedupedToast.loading(message2, {
      id: SKILL_APPLYING_TOAST_ID,
    });
  }
  let settled = false;
  const settleOnce = (result, resultMessage, render2) => {
    if (settled) return;
    settled = true;
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandles.delete(timeoutHandle);
    }
    settleOperation(result, resultMessage, render2);
  };
  const timeoutHandle = setTimeout(() => {
    timeoutHandles.delete(timeoutHandle);
    settleOnce("info", instance.t("skills.restartQueued"));
  }, OPERATION_TIMEOUT_MS);
  timeoutHandles.add(timeoutHandle);
  return {
    pending: (pendingMessage) => {
      if (settled) return;
      dedupedToast.loading(pendingMessage, {
        id: SKILL_APPLYING_TOAST_ID,
      });
    },
    success: (resultMessage) => settleOnce("success", resultMessage),
    successWith: (render2) => settleOnce("success", void 0, render2),
    info: (resultMessage) => settleOnce("info", resultMessage),
    error: (resultMessage) => settleOnce("error", resultMessage),
  };
}
