import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import { initTheme } from "./appearance"
import "./styles.css"

// **在 React 渲染之前挂主题 class。** 放进 effect 的话，偏好深色的用户
// 每次启动都会先看到一帧白屏 —— 那一帧很显眼，而且看起来像应用卡了一下。
initTheme()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
