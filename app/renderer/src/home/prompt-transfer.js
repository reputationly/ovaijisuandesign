// 点击「使用提示词」时的飞行动效与到达反馈。
import { copyRect, cssNumber, prefersReducedMotion } from "./motion-utils.js";
const USE_PROMPT_FLIGHT_DURATION_MS = 440;
const USE_PROMPT_ARRIVAL_DURATION_MS = 220;
const USE_PROMPT_FLIGHT_BALL_SIZE_PX = 32;
const USE_PROMPT_FLIGHT_SAMPLES = [{
  offset: 0,
  opacity: 1,
  scale: 1
}, {
  offset: 0.16,
  opacity: 0.98,
  scale: 0.92
}, {
  offset: 0.32,
  opacity: 0.92,
  scale: 0.78
}, {
  offset: 0.5,
  opacity: 0.76,
  scale: 0.6
}, {
  offset: 0.68,
  opacity: 0.48,
  scale: 0.42
}, {
  offset: 0.84,
  opacity: 0.18,
  scale: 0.26
}, {
  offset: 0.94,
  opacity: 0.04,
  scale: 0.14
}, {
  offset: 1,
  opacity: 0,
  scale: 0.08
}];
let activeTransfer = null;
let activeArrival = null;
let reusableFlightBall = null;
function buildParabolicFlightKeyframes(translateX, translateY) {
  const distance = Math.hypot(translateX, translateY);
  const arcHeight = Math.min(192, Math.max(84, distance * 0.3));
  return USE_PROMPT_FLIGHT_SAMPLES.map(({
    offset,
    opacity,
    scale
  }) => {
    const curveLift = arcHeight * 4 * offset * (1 - offset);
    const x = translateX * offset;
    const y = translateY * offset - curveLift;
    return {
      offset,
      opacity,
      transform: `translate3d(${cssNumber(x)}px, ${cssNumber(y)}px, 0) scale(${scale})`
    };
  });
}
function deactivateFlightBall(element) {
  element.classList.remove("home-use-prompt-flight");
  element.style.visibility = "hidden";
  element.style.opacity = "0";
  element.style.transform = "none";
}
function prepareReusableFlightBall(template) {
  const connectedBalls = Array.from(document.querySelectorAll(".home-use-prompt-flight-ball"));
  const ball = (reusableFlightBall?.isConnected ? reusableFlightBall : connectedBalls[0]) ?? document.createElement("span");
  reusableFlightBall = ball;
  for (const extraBall of connectedBalls) {
    if (extraBall === ball) continue;
    for (const animation of extraBall.getAnimations?.() ?? []) animation.cancel();
    extraBall.remove();
  }
  for (const animation of ball.getAnimations?.() ?? []) animation.cancel();
  ball.className = "home-use-prompt-flight-ball";
  ball.setAttribute("aria-hidden", "true");
  ball.setAttribute("tabindex", "-1");
  ball.replaceChildren(...Array.from(template.childNodes, node => node.cloneNode(true)));
  if (!ball.isConnected) document.body.append(ball);
  return ball;
}
function removeActiveTransfer() {
  const transfer = activeTransfer;
  if (!transfer) return;
  activeTransfer = null;
  transfer.animation.cancel();
  deactivateFlightBall(transfer.element);
}
function removeActiveArrival() {
  const arrival = activeArrival;
  if (!arrival) return;
  activeArrival = null;
  arrival.animation.cancel();
  arrival.element.remove();
}
function playArrivalFeedback(target) {
  removeActiveArrival();
  const targetRect = target.getBoundingClientRect();
  if (targetRect.width <= 0 || targetRect.height <= 0) return;
  const arrival = document.createElement("span");
  arrival.className = "home-use-prompt-arrival";
  arrival.setAttribute("aria-hidden", "true");
  arrival.style.left = `${targetRect.left}px`;
  arrival.style.top = `${targetRect.top}px`;
  arrival.style.width = `${targetRect.width}px`;
  arrival.style.height = `${targetRect.height}px`;
  arrival.style.borderRadius = getComputedStyle(target).borderRadius;
  document.body.append(arrival);
  const animation = arrival.animate([{
    opacity: 0.1,
    transform: "scale(0.994)"
  }, {
    offset: 0.4,
    opacity: 0.5,
    transform: "scale(1.016)"
  }, {
    offset: 0.72,
    opacity: 0.2,
    transform: "scale(0.998)"
  }, {
    opacity: 0,
    transform: "scale(1.003)"
  }], {
    duration: USE_PROMPT_ARRIVAL_DURATION_MS,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
  });
  activeArrival = {
    animation,
    element: arrival
  };
  const handleRemoval = () => {
    if (activeArrival?.animation === animation) activeArrival = null;
    arrival.remove();
  };
  animation.onfinish = handleRemoval;
  animation.oncancel = handleRemoval;
}
export function captureHomeUsePromptTransferOrigin(source) {
  const visual = document.createElement("span");
  visual.className = "home-use-prompt-flight-ball";
  const sourceIcon = source.querySelector("svg");
  if (sourceIcon) {
    const icon = sourceIcon.cloneNode(true);
    icon.removeAttribute("id");
    icon.setAttribute("aria-hidden", "true");
    visual.append(icon);
  }
  return {
    rect: copyRect(source.getBoundingClientRect()),
    visual
  };
}
export function playHomeUsePromptTransfer(origin, target) {
  if (prefersReducedMotion() || typeof origin.visual.animate !== "function") return;
  const targetRect = target.getBoundingClientRect();
  if (origin.rect.width <= 0 || origin.rect.height <= 0 || targetRect.width <= 0 || targetRect.height <= 0) {
    return;
  }
  removeActiveTransfer();
  removeActiveArrival();
  const visual = prepareReusableFlightBall(origin.visual);
  visual.classList.add("home-use-prompt-flight");
  const sourceCenterX = origin.rect.left + origin.rect.width / 2;
  const sourceCenterY = origin.rect.top + origin.rect.height / 2;
  visual.style.left = `${sourceCenterX - USE_PROMPT_FLIGHT_BALL_SIZE_PX / 2}px`;
  visual.style.top = `${sourceCenterY - USE_PROMPT_FLIGHT_BALL_SIZE_PX / 2}px`;
  visual.style.width = `${USE_PROMPT_FLIGHT_BALL_SIZE_PX}px`;
  visual.style.height = `${USE_PROMPT_FLIGHT_BALL_SIZE_PX}px`;
  visual.style.visibility = "visible";
  visual.style.opacity = "1";
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const translateX = targetCenterX - sourceCenterX;
  const translateY = targetCenterY - sourceCenterY;
  const animation = visual.animate(buildParabolicFlightKeyframes(translateX, translateY), {
    duration: USE_PROMPT_FLIGHT_DURATION_MS,
    easing: "cubic-bezier(0.32, 0, 0.18, 1)",
    fill: "forwards"
  });
  activeTransfer = {
    animation,
    element: visual
  };
  const handleFinish = () => {
    if (activeTransfer?.animation !== animation) return;
    activeTransfer = null;
    animation.cancel();
    deactivateFlightBall(visual);
    playArrivalFeedback(target);
  };
  animation.onfinish = handleFinish;
  animation.oncancel = () => {
    if (activeTransfer?.animation !== animation) return;
    activeTransfer = null;
    deactivateFlightBall(visual);
  };
}
