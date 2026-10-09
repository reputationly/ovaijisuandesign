// 对渲染层的补丁：{ id, file（按前缀匹配，带哈希的文件名写到哈希之前）, find, replace, count（默认 1）, within? }。
// 只放界面代码里写死、没法从主进程或 gateway 侧改的东西。
//
// find 可以是带 g 的正则，replace 可以是函数；within: [开始锚点, 结束锚点] 把替换限定在一段区间里。
// 具体语义见 build.mjs。
export const VERSION = "3.0.21";

// 主 bundle 和首页那块懒加载的 chunk。同前缀（assets/index-）的文件有好几个，这里写全名免得误伤。
const MAIN = "assets/index-ZNI5SgRm.js";
const HOME = "assets/index-CHLulaMq.js";

// 产品名。英文名和 app/desktop 旧界面的 i18n 保持一致。
const NAME_ZH = "蒜狸小助手";
const NAME_EN = "Suanli Assistant";
// 句子里把产品名当简称用的地方（"在 Design 验收"之类）。
const SHORT_ZH = "蒜狸";
const SHORT_EN = "Suanli";

// 拷进产物的我们自己的资源：{ src（相对本目录）, dest（相对产物根目录） }。
export const ASSETS = [
  // 蒜狸形象，替换侧栏、首页、对话空状态里的 logo。从 app/desktop 旧界面的 mascot.png 缩到 192px，
  // 界面上最大只画到 46px，原图 512px 白占体积。
  { src: "assets/suanli-mascot.png", dest: "assets/suanli-mascot.png" },
  // 品牌字体子集（马善政，OFL），只含品牌名和几句标语用到的字，来源见 scripts/brand-font.py。
  { src: "assets/suanli-brand.woff2", dest: "assets/suanli-brand.woff2" },
];

// 中文句子里产品名换成汉字以后，原来为了隔开拉丁字母留的空格要去掉（"退出 X 后" → "退出X后"），
// 挨着拉丁字母、数字、插值（{{version}}）的空格保留。
const CJK = /[\p{Script=Han}　-〿＀-￯]/u;
const zhName = (_m, before, after, offset, text) =>
  (before && !CJK.test(text[offset - 1] ?? "") ? before : "") +
  NAME_ZH +
  (after && !CJK.test(text[offset + _m.length] ?? "") ? after : "");

// i18n 资源对象的区间：品牌名只在这两段里整体替换，同一个文件里的模型 id、厂商名、存储键都不碰。
const EN_I18N = ["const en$2 = {", "\n};"];
const ZH_I18N = ["const zh = {", "\n};"];

// 单条 i18n 文案的替换：按 `"key": "原文"` 整条匹配，原文变了就对不上、构建失败。
// id 以 -en / -zh 结尾，决定只在哪一份资源里找（有些文案中英文两份原文相同）。
const i18n = (id, key, from, to) => ({
  id,
  file: MAIN,
  within: id.endsWith("-zh") ? ZH_I18N : EN_I18N,
  find: `"${key}": "${from}"`,
  replace: `"${key}": "${to}"`,
});

// ---------------------------------------------------------------------------------------------
// 六、设置页「平台接入」：我们的 MaaS 平台配置分区（地址 / 密钥 / 各模态模型）
// ---------------------------------------------------------------------------------------------
// 组件代码、服务代理、i18n 文案都在 platform-section.mjs 里，这里只做拼接和挂载：
//   1. 代码插在官方 SECTIONS 数组前面（PlatformSection 组件 + __ovPlatformService 服务代理）；
//   2. SECTIONS / SECTION_COMPONENTS 各加一行（icon 用 ServerIcon —— 产物里已有的包装版图标）；
//   3. i18n 两份资源各加一组 ov.platform.* 键；
//   4. SettingsDialogProvider 挂首次引导：没配过密钥自动弹到本分区（sessionStorage 只挡当次会话内的重复弹）。
// 数据走主进程 platform-settings 通道（get / save，见 app/desktop/src/main/index.ts）。
import { PlatformSection, PlatformServiceShim, FirstRunShim, ConnectionIndicatorShim, I18N_ZH, I18N_EN } from "./platform-section.mjs";

const i18nInsert = (obj) => Object.entries(obj).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n");

export const PATCHES = [
  // ---------------------------------------------------------------------------------------------
  // 一、品牌名
  // ---------------------------------------------------------------------------------------------

  // 窗口标题（启动时 React 还没接管前显示的就是这个）。
  { id: "brand.html-title", file: "index.html", find: "<title>MiniMax Design</title>", replace: `<title>${NAME_ZH}</title>` },

  // i18n 资源里的完整产品名。数量是两份资源里逐条数出来的，文案增减时这里会报错提醒复查。
  { id: "brand.i18n-en", file: MAIN, within: EN_I18N, find: /MiniMax Design/g, replace: NAME_EN, count: 113 },
  { id: "brand.i18n-zh", file: MAIN, within: ZH_I18N, find: /( ?)MiniMax Design( ?)/g, replace: zhName, count: 113 },

  // 首页标题的 i18n 键。界面上实际画的是 HubWordmark（见下面 logo 一节），这里只是别让资源里留着旧名。
  i18n("brand.hero-title-en", "home.heroTitle", "MiniMax <brand>Design</brand>", "Suanli <brand>Assistant</brand>"),
  i18n("brand.hero-title-zh", "home.heroTitle", "MiniMax <brand>Design</brand>", `<brand>${NAME_ZH}</brand>`),

  // 句子里只写了 "Design" 当简称的文案。
  i18n("brand.short-libtv-catalog-en", "connectors.catalog.libtv.description", "Create images and video with LibTV, then bring the results onto your Design canvas.", `Create images and video with LibTV, then bring the results onto your ${SHORT_EN} canvas.`),
  i18n("brand.short-libtv-catalog-zh", "connectors.catalog.libtv.description", "使用 LibTV 创作图片和视频，将结果回传到 Design 画布。", `使用 LibTV 创作图片和视频，将结果回传到${SHORT_ZH}画布。`),
  i18n("brand.short-libtv-hint-en", "connectors.libtv.hint", "Open a Design task before connecting. Sign-in does not generate media or spend credits.", `Open a ${SHORT_EN} task before connecting. Sign-in does not generate media or spend credits.`),
  i18n("brand.short-libtv-hint-zh", "connectors.libtv.hint", "请先打开一个 Design 任务。登录授权不会生成媒体或消耗创作积分。", `请先打开一个${SHORT_ZH}任务。登录授权不会生成媒体或消耗创作积分。`),
  i18n("brand.short-libtv-runtime-en", "connectors.libtv.runtimeRequired", "Open a Design task, wait for it to be ready, then connect again.", `Open a ${SHORT_EN} task, wait for it to be ready, then connect again.`),
  i18n("brand.short-libtv-runtime-zh", "connectors.libtv.runtimeRequired", "请打开一个 Design 任务，等待就绪后重新连接。", `请打开一个${SHORT_ZH}任务，等待就绪后重新连接。`),
  i18n("brand.short-libtv-detail-en", "connectors.detail.libtv.description", "Create images and video with LibTV, then bring the results onto your Design canvas. Image and video generation uses credits from your LibTV account, without consuming Design credits.", `Create images and video with LibTV, then bring the results onto your ${SHORT_EN} canvas. Image and video generation uses credits from your LibTV account, without consuming ${SHORT_EN} credits.`),
  i18n("brand.short-libtv-detail-zh", "connectors.detail.libtv.description", "使用 LibTV 创作图片和视频，将结果回传到 Design 画布。图片和视频生成直接使用 LibTV 账户积分，不消耗 Design 积分。", `使用 LibTV 创作图片和视频，将结果回传到${SHORT_ZH}画布。图片和视频生成直接使用 LibTV 账户积分，不消耗${SHORT_ZH}积分。`),
  i18n("brand.short-invite-en", "project.invite.expiryNote", "This invitation link is valid for 24 hours. Please send it to the Design users participating in the project.", `This invitation link is valid for 24 hours. Please send it to the ${SHORT_EN} users participating in the project.`),
  i18n("brand.short-invite-zh", "project.invite.expiryNote", "邀请链接 24 小时内有效，请发送给参与项目共创的 Design 用户", `邀请链接 24 小时内有效，请发送给参与项目共创的${SHORT_ZH}用户`),
  i18n("brand.short-choose-en", "skills.submission.chooseDesign", "Choose from Design", `Choose from ${SHORT_EN}`),
  i18n("brand.short-choose-zh", "skills.submission.chooseDesign", "从 Design 选择", `从${SHORT_ZH}选择`),
  i18n("brand.short-no-skills-en", "skills.submission.noDesignSkills", "No Skills created in Design yet.", `No Skills created in ${SHORT_EN} yet.`),
  i18n("brand.short-no-skills-zh", "skills.submission.noDesignSkills", "暂无 Design 创建的 Skill。", `暂无${SHORT_ZH}创建的 Skill。`),
  i18n("brand.short-review-role-en", "skills.operation.reviewerRoleHint", "Operations: inspect, validate in Design, and review submissions", `Operations: inspect, validate in ${SHORT_EN}, and review submissions`),
  i18n("brand.short-review-role-zh", "skills.operation.reviewerRoleHint", "普通运营：可查看详情、Design 验收和审核", `普通运营：可查看详情、${SHORT_ZH}验收和审核`),
  i18n("brand.short-review-perm-en", "skills.operation.reviewerPermissionDescription", "Can view submissions, validate them in Design, approve, or reject; publishing and configuration are unavailable.", `Can view submissions, validate them in ${SHORT_EN}, approve, or reject; publishing and configuration are unavailable.`),
  i18n("brand.short-review-perm-zh", "skills.operation.reviewerPermissionDescription", "可查看投稿、在 Design 验收、通过或拒绝；不能发布和配置资源。", `可查看投稿、在${SHORT_ZH}验收、通过或拒绝；不能发布和配置资源。`),
  i18n("brand.short-test-en", "skills.operation.testDesign", "Test in Design", `Test in ${SHORT_EN}`),
  i18n("brand.short-test-zh", "skills.operation.testDesign", "在 Design 验收", `在${SHORT_ZH}验收`),
  i18n("brand.short-test-error-en", "skills.operation.designError", "Failed to start Design validation", `Failed to start ${SHORT_EN} validation`),
  i18n("brand.short-test-error-zh", "skills.operation.designError", "无法启动 Design 验收", `无法启动${SHORT_ZH}验收`),
  i18n("brand.short-test-pass-en", "skills.operation.pass_designSuccess", "Design validation marked as passed", `${SHORT_EN} validation marked as passed`),
  i18n("brand.short-test-pass-zh", "skills.operation.pass_designSuccess", "已标记 Design 验收通过", `已标记${SHORT_ZH}验收通过`),

  // 新建项目的名称占位符拿品牌名举例。
  i18n("brand.project-placeholder-en", "project.create.namePlaceholder", "e.g. MiniMax promo video", `e.g. ${SHORT_EN} promo video`),
  i18n("brand.project-placeholder-zh", "project.create.namePlaceholder", "例如：MiniMax宣传片", `例如：${SHORT_ZH}宣传片`),

  // 账号设置里英文的 UID 标签带着参照产品的姐妹品牌名，中文本来就只写 "UID"，对齐成一样。
  i18n("brand.account-uid-en", "settings.account.uidLabel", "Hailuo UID", "UID"),

  // 对话空状态的副标题是模型营销语，换成我们的标语（和旧界面首页那句一致）。
  i18n("brand.chat-empty-subtitle-en", "chat.emptyRecommendations.subtitle", "Explore H3 today!", "Say the word, Suanli does the rest"),
  i18n("brand.chat-empty-subtitle-zh", "chat.emptyRecommendations.subtitle", "探索 H3，开启全新体验", "说一句话，剩下的交给蒜狸"),

  // 工作区切换时同步的窗口标题，写死在代码里、不走 i18n。
  {
    id: "brand.window-title",
    file: MAIN,
    find: "const title = active2 ? `${active2.projectName} - MiniMax Design` : \"MiniMax Design\";",
    replace: `const title = active2 ? \`\${active2.projectName} - ${NAME_ZH}\` : "${NAME_ZH}";`,
  },
  // Windows 自绘标题栏左上角的产品名。
  {
    id: "brand.titlebar-name",
    file: MAIN,
    find: '/* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0", children: "MiniMax Design" }),',
    replace: `/* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0", children: "${NAME_ZH}" }),`,
  },
  // 工作区启动失败页的处理建议，中英文写死在诊断表里、不走 i18n。
  {
    id: "brand.diagnosis-zh",
    file: MAIN,
    within: ["const WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY = {", "function resolveWorkspaceFailureDiagnosis("],
    find: /(?<=zh: "[^"\n]*)( ?)MiniMax Design( ?)/g,
    replace: zhName,
    count: 6,
  },
  {
    id: "brand.diagnosis-en",
    file: MAIN,
    within: ["const WORKSPACE_FAILURE_DIAGNOSIS_REGISTRY = {", "function resolveWorkspaceFailureDiagnosis("],
    find: /(?<=en: "[^"\n]*)MiniMax Design/g,
    replace: NAME_EN,
    count: 6,
  },
  // 首页灵感卡片的默认署名。下面那个 Set 还靠旧署名识别远端数据，所以只改展示用的两个常量。
  {
    id: "brand.showcase-attribution",
    file: MAIN,
    find: 'const DEFAULT_SHOWCASE_ATTRIBUTION = "MiniMax Design官方";\nconst DEFAULT_SHOWCASE_ATTRIBUTION_EN = "MiniMax Design Official";',
    replace: `const DEFAULT_SHOWCASE_ATTRIBUTION = "${NAME_ZH}官方";\nconst DEFAULT_SHOWCASE_ATTRIBUTION_EN = "${NAME_EN} Official";`,
  },
  // 技能卡片上内置技能的作者名。
  {
    id: "brand.skill-author",
    file: HOME,
    find: 'return isZh ? "MiniMax Design官方" : "MiniMax Design Official";\n  }\n  return author || (isOfficialSkill(skill) ? "MiniMax Design" : "");',
    replace: `return isZh ? "${NAME_ZH}官方" : "${NAME_EN} Official";\n  }\n  return author || (isOfficialSkill(skill) ? "${NAME_ZH}" : "");`,
  },

  // ---------------------------------------------------------------------------------------------
  // 二、logo 和字标
  // ---------------------------------------------------------------------------------------------
  // HubLogo（带眼珠跟随动画的 SVG 头像）和 HubWordmark（英文字标 SVG）是全站唯一的两个品牌组件，
  // 侧栏、首页、对话空状态、登录弹窗都引用它们。在原函数前面插一个同名的新实现，原函数改名留着不用，
  // 调用方一个都不用动。新 HubLogo 吞掉 winkOnHover / eyeTrackingScope 这两个动画参数，免得落到 <img> 上。
  {
    id: "logo.wordmark",
    file: MAIN,
    find: 'function HubWordmark({\n  width = 158,\n  height = 24,\n  alt = "MiniMax Design",',
    replace: [
      'const SUANLI_MASCOT_URL = "" + new URL("suanli-mascot.png", import.meta.url).href;',
      `function HubWordmark({ width = 158, height = 24, alt = "${NAME_ZH}", className, style, ...rest }) {`,
      "  return /* @__PURE__ */ jsxRuntimeExports.jsx(\"span\", {",
      '    role: "img",',
      '    "aria-label": alt,',
      '    className: cn$2("suanli-wordmark inline-flex shrink-0 items-center whitespace-nowrap", className),',
      // 字号按高度放大一点：毛笔楷书的字面比 SVG 字标的字高小，同样高度看着会缩一圈。
      "    style: { height, maxWidth: width, fontSize: Math.round(height * 1.2), lineHeight: `${height}px`, ...style },",
      "    ...rest,",
      `    children: "${NAME_ZH}"`,
      "  });",
      "}",
      "function HubWordmark$reference({",
      "  width = 158,",
      "  height = 24,",
      '  alt = "MiniMax Design",',
    ].join("\n"),
  },
  {
    id: "logo.mark",
    file: MAIN,
    find: 'function HubLogo({\n  size: size2 = 20,\n  className,\n  alt = "MiniMax Design",',
    replace: [
      `function HubLogo({ size: size2 = 20, className, alt = "${NAME_ZH}", winkOnHover: _winkOnHover, eyeTrackingScope: _eyeTrackingScope, style, ...rest }) {`,
      "  return /* @__PURE__ */ jsxRuntimeExports.jsx(\"img\", {",
      "    src: SUANLI_MASCOT_URL,",
      "    width: size2,",
      "    height: size2,",
      "    alt,",
      "    draggable: false,",
      '    className: cn$2("shrink-0 select-none object-contain", className),',
      "    style: { width: size2, height: size2, ...style },",
      "    ...rest",
      "  });",
      "}",
      "function HubLogo$reference({",
      "  size: size2 = 20,",
      "  className,",
      '  alt = "MiniMax Design",',
    ].join("\n"),
  },
  // 字标用的字体。放在 index.html 里而不是主 CSS：主 CSS 带哈希、又是一整块压缩样式，插在这里最不容易撞车。
  // 颜色跟着字标原来的前景色变量走，深浅主题各有一份。
  {
    id: "logo.wordmark-font",
    file: "index.html",
    find: "  </head>",
    replace: [
      "    <style>",
      "      @font-face {",
      '        font-family: "Suanli Brand";',
      '        src: url("./assets/suanli-brand.woff2") format("woff2");',
      "        font-weight: 400;",
      "        font-style: normal;",
      "        font-display: block;",
      "      }",
      "      .suanli-wordmark {",
      '        font-family: "Suanli Brand", var(--font-heading, system-ui), sans-serif;',
      "        font-weight: 400;",
      "        letter-spacing: 0.06em;",
      "        color: var(--hub-wordmark-foreground, currentColor);",
      "        -webkit-font-smoothing: antialiased;",
      "      }",
      "    </style>",
      "  </head>",
    ].join("\n"),
  },

  // ---------------------------------------------------------------------------------------------
  // 三、登录和营销弹窗
  // ---------------------------------------------------------------------------------------------
  // "全面接入 H3 · 立即登录" 弹窗：没登录过的新用户启动时自动弹，受保护的操作也会强制弹。
  // 我们没有账号体系，两个入口都掐掉；弹窗组件本身留着，永远不会 open。
  {
    id: "popup.login-gate-auto",
    file: MAIN,
    find: "    if (!sessionDismissedRef.current) {\n      setIsOpen(true);\n    }\n",
    replace: "",
  },
  {
    id: "popup.login-gate-force",
    file: MAIN,
    find: "  const forceOpen = reactExports.useCallback(() => {\n    sessionDismissedRef.current = false;\n    writeSessionDismissed(false);\n    setIsOpen(true);\n  }, []);",
    replace: "  const forceOpen = reactExports.useCallback(() => {\n  }, []);",
  },
  // 服务端下发的运营弹窗（新功能 / 迁移 / 通用公告）和首页顶上的公告条共用这一个查询，关掉查询两处一起消失。
  {
    id: "popup.server-driven",
    file: MAIN,
    find: "  const enabled = !forcedUpdate && !isLoading && isLoggedIn && !!userID;\n  const fallbackQueryKey = userID ? [...creditQueryKeys.popupByIdentity(userID)",
    replace: "  const enabled = false;\n  const fallbackQueryKey = userID ? [...creditQueryKeys.popupByIdentity(userID)",
  },
  // 首页的促销活动：每天自动弹一次的折扣弹窗和输入框上方的促销角标，都看这个开关。
  {
    id: "popup.promotion",
    file: HOME,
    find: "  const isShow = !!data && now >= data.startTimeMs && now < data.endTimeMs;",
    replace: "  const isShow = false && !!data && now >= data.startTimeMs && now < data.endTimeMs;",
  },

  // ---------------------------------------------------------------------------------------------
  // 四、不做的功能：内置浏览器、ComfyUI 工作流、使用指南外链
  // ---------------------------------------------------------------------------------------------
  // 工作区左上角"画布 / 浏览器"切换。只剩画布一个选项就没必要切了，整块不画；它是绝对定位浮在画布上的，
  // 不占布局。首次进入时指向浏览器按钮的引导气泡长在这个组件里，一起没了。
  {
    id: "scope.browser-switch",
    file: MAIN,
    find: "isActive2 && canvasOpen && (!editSurfaceActive || browserOpen) ? /* @__PURE__ */ jsxRuntimeExports.jsx(\"div\", { className: \"workspace-view-switch",
    replace: "false ? /* @__PURE__ */ jsxRuntimeExports.jsx(\"div\", { className: \"workspace-view-switch",
  },
  // 侧栏的 "ComfyUI 工作流 Beta" 入口。
  {
    id: "scope.comfyui-sidebar",
    file: MAIN,
    find: ',\n    {\n      to: "/workflows",\n      icon: Workflow,\n      label: t2("homeSidebar.comfyWorkflows"),\n      badgeTarget: "workflows",\n      releaseBadge: sidebarBadges.workflows\n    }\n  ];',
    replace: "\n  ];",
  },
  // 直接打开 /workflows（旧的最近访问、深链）时回首页，不留一个半能用的页面。
  {
    id: "scope.comfyui-route",
    file: MAIN,
    find: 'const Route$a = createFileRoute("/_home/workflows/")({\n',
    replace: 'const Route$a = createFileRoute("/_home/workflows/")({\n  beforeLoad: () => {\n    throw redirect({ to: "/" });\n  },\n',
  },
  // 画布"添加节点"菜单里的 ComfyUI 子菜单。
  {
    id: "scope.comfyui-canvas-menu",
    file: MAIN,
    find: "/* @__PURE__ */ jsxRuntimeExports.jsx(\n            ComfyUiSubmenu,",
    replace: "false && /* @__PURE__ */ jsxRuntimeExports.jsx(\n            ComfyUiSubmenu,",
  },
  // 设置里的 ComfyUI 分区。当前分区找不到时会退回第一项，删掉这一行不会让打开设置的旧参数出错。
  {
    id: "scope.comfyui-settings",
    file: MAIN,
    find: '  { id: "comfyui", icon: Blocks, labelKey: "settings.comfyui.title" },\n',
    replace: "",
  },
  // 自定义模型不做（2026-09-26 定）：设置里的"模型"分区（添加自定义提供商和模型）。
  // 当前分区找不到时会退回第一项，从别处带着 "models" 打开设置也不会出错。
  {
    id: "scope.custom-models-settings",
    file: MAIN,
    find: '  { id: "models", icon: Bot, labelKey: "settings.models.title" },\n',
    replace: "",
  },
  // 对话框模型选择器右上角的"自定义模型"按钮，点了就是跳到上面那个分区。
  {
    id: "scope.custom-models-picker",
    file: MAIN,
    find: "trailing: /* @__PURE__ */ jsxRuntimeExports.jsxs(\n                Button$1,\n                {\n                  type: \"button\",\n                  variant: \"ghost\",\n                  size: \"xs\",\n                  onClick: handleConfigureCustom,",
    replace: "trailing: false && /* @__PURE__ */ jsxRuntimeExports.jsxs(\n                Button$1,\n                {\n                  type: \"button\",\n                  variant: \"ghost\",\n                  size: \"xs\",\n                  onClick: handleConfigureCustom,",
  },
  // 对话框模型选择器的 Agent 标签页只认一份写死的模型 id 表（参照自家的几个对话模型），
  // 我们平台的对话模型永远进不了这张表，标签页一直是「该类别暂无可用模型」。gateway 本来
  // 只回当前可用的模型，照单全收。
  //
  // 3.0.21 起这份表从"白名单式"（Set + has 过滤）变成"排序表"（Map + 按序重排，不在表里的进不去），
  // 所以要把 filter 那一整段换掉，而不是像 3.0.20 那样只删过滤谓词。同一版还新增了会员门禁
  // （BUILTIN_AGENT_MODEL_ACCESS，界面据此打「会员」标、发送时拦一道会员校验），我们没有订阅
  // 体系，会一律当成非会员挡下来，一并清空。
  {
    id: "agent-models.no-whitelist",
    file: MAIN,
    find: "...normalizedModels.filter((model) => SELECTABLE_AGENT_MODEL_ORDER.has(model.id)).sort(\n      (a2, b3) => (SELECTABLE_AGENT_MODEL_ORDER.get(a2.id) ?? 0) - (SELECTABLE_AGENT_MODEL_ORDER.get(b3.id) ?? 0)\n    ),",
    replace: "...normalizedModels,",
  },
  {
    id: "agent-models.no-membership-gate",
    file: MAIN,
    find: "BUILTIN_AGENT_MODEL_ACCESS = {\n  \"alpha/alpha\": { requirement: \"membership\" },\n  \"alpha/claude-opus-5-5\": { requirement: \"membership\" },\n  \"gamma/gamma-6-astra\": { requirement: \"membership\" },\n  \"gamma/gpt-6-astra\": { requirement: \"membership\" }\n};",
    replace: "BUILTIN_AGENT_MODEL_ACCESS = {};",
  },
  // 输入框占位符末尾的 "Design 使用指南 ↗ · H3 使用指南 ↗" 外链，指向参照产品的在线文档，不给链接。
  {
    id: "scope.creation-guide-links",
    file: MAIN,
    find: "function CreationGuidePlaceholder({\n  guides,\n  source,\n  triggerMention,\n  triggerSlash\n}) {\n",
    replace: "function CreationGuidePlaceholder({ source, triggerMention, triggerSlash }) {\n  const guides = [];\n",
  },

  // ---------------------------------------------------------------------------------------------
  // 五、首页「创作灵感」：示例和素材都由本地 gateway 提供（数据见 app/gateway/src/cloud-config/home-showcase.ts）
  // ---------------------------------------------------------------------------------------------
  // 快速开始配置里的素材地址（封面、附件）只认两个 CDN 域名的 https，别的一律丢掉；点示例时下载附件也
  // 过同一道检查（重定向后的最终地址也查）。这里加一条放行：gateway 的示例素材路由。配置里写相对路径
  // `/api/v1/home/showcase-assets/…`，按当前连着的 gateway 补全——端口每次启动都可能换，写死的话缓存的
  // 上一份配置就对不上了；已经补全过的绝对地址（下载后的 response.url）同源同前缀也认。
  // gateway 还没就绪（拿不到地址）时照旧丢掉，等 gateway 就绪后重新拉配置再补上。
  {
    id: "home-showcase.local-assets",
    file: MAIN,
    find: 'function normalizeHomeQuickStartAssetUrl(value) {\n  if (typeof value !== "string") return void 0;\n  const text2 = value.trim();\n  if (!text2) return void 0;\n',
    replace: [
      "function localHomeShowcaseAssetUrl(text2) {",
      "  let origin;",
      "  try {",
      "    origin = new URL(getBaseUrl() ?? \"\").origin;",
      "  } catch {",
      "    return void 0;",
      "  }",
      "  try {",
      "    const url2 = text2.startsWith(\"/\") && !text2.startsWith(\"//\") ? new URL(text2, origin) : new URL(text2);",
      "    return url2.origin === origin && url2.pathname.startsWith(\"/api/v1/home/showcase-assets/\") ? url2.toString() : void 0;",
      "  } catch {",
      "    return void 0;",
      "  }",
      "}",
      "function normalizeHomeQuickStartAssetUrl(value) {",
      '  if (typeof value !== "string") return void 0;',
      "  const text2 = value.trim();",
      "  if (!text2) return void 0;",
      "  const localUrl = localHomeShowcaseAssetUrl(text2);",
      "  if (localUrl) return localUrl;",
      "",
    ].join("\n"),
  },

  // ---------------------------------------------------------------------------------------------
  // 六（续）、「平台接入」分区的挂载补丁
  // ---------------------------------------------------------------------------------------------

  // 组件 + 服务代理，插在官方 SECTIONS 数组前（那里所有依赖的标识符都已定义）。
  {
    id: "platform-section.code",
    file: MAIN,
    find: "const SECTIONS = [",
    replace: PlatformServiceShim + "\n" + PlatformSection + "\nconst SECTIONS = [",
  },
  // 导航项：放在「网络」后面。icon 用 ServerIcon（产物里 withIconCompositing 包装过的，SECTIONS 前已定义）。
  {
    id: "platform-section.nav",
    file: MAIN,
    find: '  { id: "network", icon: Globe, labelKey: "settings.networkSection" },\n',
    replace: '  { id: "network", icon: Globe, labelKey: "settings.networkSection" },\n  { id: "platform", icon: ServerIcon, labelKey: "ov.platform.nav" },\n',
  },
  // 组件映射。
  {
    id: "platform-section.component",
    file: MAIN,
    find: "  network: NetworkSection,\n",
    replace: "  network: NetworkSection,\n  platform: PlatformSection,\n",
  },
  // 首次引导：没配过密钥就自动弹设置到本分区（挂在 SettingsDialogProvider 的第一个 effect 后面，
  // 那里有 openSettings 这个局部函数）。sessionStorage 挡住本次会话内的重复弹；真正"不再弹"靠 hasApiKey。
  {
    id: "platform-section.first-run",
    file: MAIN,
    find: "  reactExports.useEffect(() => {\n    if (!isLoggedIn) setOpen(false);\n  }, [isLoggedIn]);",
    replace: "  reactExports.useEffect(() => {\n    if (!isLoggedIn) setOpen(false);\n  }, [isLoggedIn]);\n  " + FirstRunShim.trim() + "\n  __ovPlatformFirstRun();",
  },
  // i18n：两份资源各加一组键。挂在 settings.network.proxyGroup 那一行后面（两份资源里都唯一）。
  {
    id: "platform-section.i18n-zh",
    file: MAIN,
    within: ZH_I18N,
    find: '  "settings.network.proxyGroup": "代理",\n',
    replace: '  "settings.network.proxyGroup": "代理",\n' + i18nInsert(I18N_ZH) + "\n",
  },
  {
    id: "platform-section.i18n-en",
    file: MAIN,
    within: EN_I18N,
    find: '  "settings.network.proxyGroup": "Proxy",\n',
    replace: '  "settings.network.proxyGroup": "Proxy",\n' + i18nInsert(I18N_EN) + "\n",
  },

  // ---------------------------------------------------------------------------------------------
  // 十一、模型不让用户看见：隐藏首页 / 对话 / 画布里的模型按钮（2026-10 定）
  // ---------------------------------------------------------------------------------------------
  // 模型由产品预设定（`@ov/protocol` 的 PLATFORM_PRESET），界面不展示、不让选。五处入口：
  //   1. 对话输入框的「模型」按钮，连同弹层和分隔线：ChatToolbar 的 showModelSelector 默认改为 false。
  //      技能按钮由 showSkillSelector 单独控制，不受影响。
  //   2. 首页输入框的「模型」按钮（首页 chunk 里有自己的一份组件）：直接不渲染。
  //   3. 画布生成面板的模型芯片（图 / 视频 / 音乐 / 文本）：组件根节点返回 null；参数芯片照常显示。
  //   4. `@` 菜单的模型候选：网关不给（见 listMentionModels）；分类里的「模型」标签也去掉。
  //   5. 引导文案里「模型都能选」改掉（见下面两条）。
  // 锚点都是唯一一处（count 默认 1），3.0.21 上核对过；改版本时这里会先报错，不会静默失效。
  {
    id: "mention.hide-models-tab",
    file: MAIN,
    find: '  { key: "workflows", labelKey: "mention.popover.workflows", fallback: "Workflows" },\n  { key: "models", labelKey: "mention.popover.models", fallback: "Models" }\n];',
    replace: '  { key: "workflows", labelKey: "mention.popover.workflows", fallback: "Workflows" }\n];',
  },
  {
    id: "composer.hide-model-button",
    file: MAIN,
    find: "  showModelSelector = true,",
    replace: "  showModelSelector = false,",
  },
  {
    id: "home-composer.hide-model-button",
    file: HOME,
    find: '    /* @__PURE__ */ jsxRuntimeExports.jsxs(\n      "button",\n      {\n        ref: modelButtonRef,\n        type: "button",\n        "data-action-ui-id": "home-model-btn",',
    replace: '    null && /* @__PURE__ */ jsxRuntimeExports.jsxs(\n      "button",\n      {\n        ref: modelButtonRef,\n        type: "button",\n        "data-action-ui-id": "home-model-btn",',
  },
  {
    id: "model-chip.hide",
    file: MAIN,
    find: '  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [\n    /* @__PURE__ */ jsxRuntimeExports.jsxs(\n      "button",\n      {\n        ref: triggerRef,\n        type: "button",\n        onClick: (e2) => {\n          e2.stopPropagation();\n          if (!disabled2) setOpen((v2) => !v2);',
    replace: '  return null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [\n    /* @__PURE__ */ jsxRuntimeExports.jsxs(\n      "button",\n      {\n        ref: triggerRef,\n        type: "button",\n        onClick: (e2) => {\n          e2.stopPropagation();\n          if (!disabled2) setOpen((v2) => !v2);',
  },
  // 新手引导（首页输入框 @ 键提示）原文说「指定某个模型、模型都能选」，`@` 里已经没有模型了，改成不提模型。
  // 两处文案都在：首页那块 chunk 里的兜底文案、主 bundle 里的中文资源。
  {
    id: "coach-mark.at-key-copy.home",
    file: HOME,
    find: "想引用具体某张图或指定某个模型？输入 @ 直接挑——文件、模型都能选",
    replace: "想引用具体某张图或某个文件？输入 @ 直接挑——文件、素材都能选",
  },
  {
    id: "coach-mark.at-key-copy.main",
    file: MAIN,
    find: "想引用具体某张图或指定某个模型？输入 @ 直接挑——文件、模型都能选",
    replace: "想引用具体某张图或某个文件？输入 @ 直接挑——文件、素材都能选",
  },

  // ---------------------------------------------------------------------------------------------
  // 十二、用户菜单「帮助」里暂不提供的三项：教程、更新日志、用户协议（2026-10 定）
  // ---------------------------------------------------------------------------------------------
  // 只去掉这三个入口的渲染；同一分组里的「版本更新」保留。协议的子菜单靠那一行打开，一起去掉就不会再出现。
  // 锚点都是唯一一处（count 默认 1），3.0.21 上核对过。
  {
    id: "user-menu.hide-tutorial",
    file: MAIN,
    find: '                    /* @__PURE__ */ jsxRuntimeExports.jsx(\n                      MenuButton,\n                      {\n                        icon: GraduationCap,',
    replace: '                    null && /* @__PURE__ */ jsxRuntimeExports.jsx(\n                      MenuButton,\n                      {\n                        icon: GraduationCap,',
  },
  {
    id: "user-menu.hide-changelog",
    file: MAIN,
    find: 'onChangelog && /* @__PURE__ */ jsxRuntimeExports.jsx(\n                      MenuButton,\n                      {\n                        icon: FileText,\n                        label: t2("homeSidebar.changelog"),',
    replace: 'false && /* @__PURE__ */ jsxRuntimeExports.jsx(\n                      MenuButton,\n                      {\n                        icon: FileText,\n                        label: t2("homeSidebar.changelog"),',
  },
  {
    id: "user-menu.hide-protocol",
    file: MAIN,
    find: '/* @__PURE__ */ jsxRuntimeExports.jsx(UserProtocolMenuRow, { submenu: protocolSubmenu }),',
    replace: 'null && /* @__PURE__ */ jsxRuntimeExports.jsx(UserProtocolMenuRow, { submenu: protocolSubmenu }),',
  },

  // ---------------------------------------------------------------------------------------------
  // 十三、没有账户体系：隐藏账号管理和个人账户，左下角改成平台连接状态（2026-10 定）
  // ---------------------------------------------------------------------------------------------
  // 我们只有一个本地用户，没有登录、订阅、积分，所以：
  //   - 设置里的「账号管理」分区整个去掉（当前分区找不到时会退回第一项，从别处打开设置不会出错）；
  //   - 用户菜单顶上的头像 / 用户名 / UID、账户卡片（个人账号、积分余额、订阅、团队切换）、「退出登录」都不渲染；
  //   - 侧栏左下角原来显示头像和用户名的地方，换成连接状态：绿点「已连接」/ 红点「未连接」，悬停看原因。
  //     点它照样打开用户菜单（设置、主题、记忆管理、飞书/微信入口都在里面）。窄侧栏那种只有头像的布局，换成一个小圆点。
  // 连接状态来自主进程 platform-settings 通道的 status()，见 app/desktop/src/main/platform-connection.ts。
  // 锚点都是唯一一处（count 默认 1），3.0.21 上核对过。
  {
    id: "account.hide-settings-nav",
    file: MAIN,
    find: '  { id: "account", icon: CircleUserRound, labelKey: "settings.account.title" },\n',
    replace: "",
  },
  {
    id: "account.hide-account-summary",
    file: MAIN,
    find: 'function UserMenuAccountSummary({ children: children2 }) {\n  return /* @__PURE__ */ jsxRuntimeExports.jsx(',
    replace: 'function UserMenuAccountSummary({ children: children2 }) {\n  return null && /* @__PURE__ */ jsxRuntimeExports.jsx(',
  },
  {
    id: "account.hide-menu-header",
    file: MAIN,
    find: '/* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pt-4 pb-3", children:',
    replace: 'null && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pt-4 pb-3", children:',
  },
  {
    id: "account.hide-logout",
    file: MAIN,
    find: '                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(\n                    MenuButton,\n                    {\n                      icon: LogOut,',
    replace: '                  null && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(\n                    MenuButton,\n                    {\n                      icon: LogOut,',
  },
  // 连接状态组件插在 SidebarUserMenu 前面（顶层声明，渲染时已经可用）。
  {
    id: "sidebar.connection-shim",
    file: MAIN,
    find: "function SidebarUserMenu({",
    replace: ConnectionIndicatorShim + "\nfunction SidebarUserMenu({",
  },
  // 宽侧栏：头像 + 用户名 → 连接状态（点击仍打开用户菜单）。
  {
    id: "sidebar.connection-pill",
    file: MAIN,
    find: '                      renderAvatar("size-7", 14, void 0, showRenewalBadge),\n                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate text-body-14", children: user.username || t2("sidebar.user") })',
    replace: "                      /* @__PURE__ */ jsxRuntimeExports.jsx(OvConnectionPill, {})",
  },
  // 窄侧栏：头像 → 小圆点。
  {
    id: "sidebar.connection-dot",
    file: MAIN,
    find: 'children: renderAvatar("size-7", 14, "text-xs", showRenewalBadge)',
    replace: "children: /* @__PURE__ */ jsxRuntimeExports.jsx(OvConnectionDot, {})",
  },
  // 按钮本身的 title 是用户名（悬停会弹出来），去掉。药丸和圆点上自己的 title 保留，悬停显示连接原因。
  {
    id: "sidebar.connection-title-wide",
    file: MAIN,
    find: '                title: user.username || t2("sidebar.user"),\n                "aria-haspopup": "dialog",\n                "aria-expanded": open,\n                "aria-controls": menuId,\n                onClick: handleAvatarTriggerClick,\n                className: "group/avatar-trigger flex h-10 w-full min-w-0',
    replace: '                title: void 0,\n                "aria-haspopup": "dialog",\n                "aria-expanded": open,\n                "aria-controls": menuId,\n                onClick: handleAvatarTriggerClick,\n                className: "group/avatar-trigger flex h-10 w-full min-w-0',
  },
  {
    id: "sidebar.connection-title-compact",
    file: MAIN,
    find: '                title: user.username || t2("sidebar.user"),\n                "aria-haspopup": "dialog",\n                "aria-expanded": open,\n                "aria-controls": menuId,\n                onClick: handleAvatarTriggerClick,\n                className: cn$2(\n                  "group/avatar-trigger flex size-8',
    replace: '                title: void 0,\n                "aria-haspopup": "dialog",\n                "aria-expanded": open,\n                "aria-controls": menuId,\n                onClick: handleAvatarTriggerClick,\n                className: cn$2(\n                  "group/avatar-trigger flex size-8',
  },

  // ---------------------------------------------------------------------------------------------
  // 十四、新装用户的首页引导：不再创建示例项目（「项目新手指引」「查看项目使用指南」）
  // ---------------------------------------------------------------------------------------------
  // 首页输入框上方的引导（HomeInputCoachMarks）只给新装用户看。原来有三步，最后一步「项目库」的按钮会调用
  // openSampleProject()：导入内置的 sample-project.zip，生成侧栏里的「项目新手指引」分组和「查看项目使用指南」
  // 项目。新装用户不需要，这一步整个去掉。
  // 第一步「@」原来锚在模型按钮上，十一节已经把那个按钮隐藏了；锚点取不到时弹层直接不渲染，引导会卡在看不见的
  // 第一步，连后面的「/」也出不来。改锚到仍然可见的「技能」按钮，两步提示都能正常显示。
  // 引导的已看版本由剩下的步骤决定（maxRevision 变成 1），已经看过旧第三步（@2）的用户不会再弹。
  // 锚点都是唯一一处（count 默认 1），3.0.21 上核对过。
  {
    id: "coach-mark.home-input.first-step-anchor",
    file: HOME,
    find: '      anchorRef: modelButtonRef,\n      titleKey: "coachMark.home.atKey.title",',
    replace: '      anchorRef: skillButtonRef,\n      titleKey: "coachMark.home.atKey.title",',
  },
  {
    id: "coach-mark.home-input.drop-project-library",
    file: HOME,
    find: '    ...[],\n    {\n      kind: "project-library",\n      revision: PROJECT_LIBRARY_REVISION,\n      anchorRef: projectsNavRef,\n      titleKey: "coachMark.home.projectLibrary.title",\n      titleFallback: "项目库",\n      descKey: "coachMark.home.projectLibrary.desc",\n      descFallback: "所有项目都在这里集中管理。点击下一步，为你创建一个示例项目，快速上手工作区。",\n      ctaKey: "coachMark.next",\n      ctaFallback: "下一步",\n      side: "right",\n      align: "center"\n    }\n  ];',
    replace: "  ];",
  },

  // ---------------------------------------------------------------------------------------------
  // 十五、客户端不支持水印：不弹「AI 生成水印设置」，不展示水印开关和入口，默认不加水印（2026-10 定）
  // ---------------------------------------------------------------------------------------------
  // 官方的水印开关靠 setWatermarkEnabled 通知后端；我们的客户端没有这条通道（stub-channels.ts 里按成功返回），
  // 开关其实不生效，还会显示「当前：有水印」。所以整块去掉：
  //   - 启动时的「AI 生成水印设置」弹窗（国内区域、没设过就弹）：候选条件直接置假，永远不开；
  //   - 首页引导和资产重定位提示原来要等这个弹窗选完才显示（configReady），改成只等配置读完；
  //   - 设置 → 通用 里的「去除水印」整行去掉；
  //   - 画布上的「水印设置」快捷入口：只在有水印时才显示，这里直接不渲染；
  //   - 出厂默认值改成「无水印、已处理过弹窗」（和主进程 global-store 的默认值保持一致）。
  // 锚点都是唯一一处（count 默认 1），3.0.21 上核对过。
  {
    id: "watermark.onboarding-never-open",
    file: MAIN,
    find: "  const candidate = isHydrated && !!config2 && config2.watermarkOnboardingShown !== true;",
    replace: "  const candidate = false;",
  },
  {
    id: "watermark.config-ready-main",
    file: MAIN,
    find: '  const configReady = configHydrated && (getRuntimeConfig().region !== "domestic" || config2.watermarkOnboardingShown === true);',
    replace: "  const configReady = configHydrated;",
  },
  {
    id: "watermark.config-ready-home",
    file: HOME,
    find: '  const configReady = configHydrated && (getRuntimeConfig().region !== "domestic" || config.watermarkOnboardingShown === true);',
    replace: "  const configReady = configHydrated;",
  },
  {
    id: "watermark.defaults",
    file: MAIN,
    find: "    watermarkEnabled: true,\n    watermarkOnboardingShown: false,",
    replace: "    watermarkEnabled: false,\n    watermarkOnboardingShown: true,",
  },
  {
    id: "watermark.settings-row",
    file: MAIN,
    find: '      /* @__PURE__ */ jsxRuntimeExports.jsx(\n        SettingRow,\n        {\n          label: t2("settings.removeWatermark"),',
    replace: '      null && /* @__PURE__ */ jsxRuntimeExports.jsx(\n        SettingRow,\n        {\n          label: t2("settings.removeWatermark"),',
  },
  {
    id: "watermark.canvas-chip",
    file: MAIN,
    find: "  const watermarkEnabled = config2?.watermarkEnabled ?? true;\n  if (!watermarkEnabled) return null;",
    replace: "  const watermarkEnabled = false;\n  if (!watermarkEnabled) return null;",
  },

  // ---------------------------------------------------------------------------------------------
  // 十、草稿不该持久化"附件所有权"，否则首页示例点不动
  // ---------------------------------------------------------------------------------------------
  //
  // 症状：输入框里手动加过附件（还没发出去），点首页的示例/场景卡片，弹
  // 「部分附件仍在发送中，请重试发送以完成处理」，并且提示词和示例图片都不刷新。
  //
  // 机制（全在官方渲染层里，不是 gateway 的问题）：
  // ① 附件只有在**发送**时才会被 `commitFiles()` 打上 `commitOperationId`（=已发布到工作区、
  //    有台账兜底的所有权标记）；发送成功后 `finalizeCommit` 清掉它。
  // ② 发送中途被打断（或关掉应用）时，`DraftController.set` 会把当前草稿存进 localStorage，
  //    而 `stripForPersist` 是 `{ ...attachment, previewUrl: "" }` —— **把 `commitOperationId`
  //    一起存了进去**。
  // ③ 重启后 `loadDraft` 把附件连同这个所有权一起还原，成为"幽灵所有权"。渲染器内存侧的
  //    `flushUploadFinalizeOutbox` 挂载时会把该 operation finalize 掉（gateway 台账消失），
  //    但 **persist 下来的草稿没被清**，于是这个附件一直带着它。
  // ④ 点首页示例 → `applyChatShowcaseSelection` 调 `clearAttachments({source:"scene-query"})`
  //    再 `addFromLocal`。`clear` 只对 `source === "scene-query"` 的附件去 finalize，幽灵附件
  //    source 不是它、不在 `dropping` 里、operation 没被释放；而 `guardCommittedOwnership`
  //    是无视 source 过滤遍历**全部**在架附件算 blocked 的，于是整个 `updateAttachments` 被拒
  //    → `replaceAttachments` 返回 false → `applyChatShowcaseSelection` 在设置附件处提前 return，
  //    **连提示词都停在旧值**，再弹那条 toast。
  //
  // 修法（最小改动、与官方设计一致）：所有权是**进程内的运行时状态**，不该进持久化；台账清理
  // 由 `hilo:upload-commit-finalize-outbox:v1` 那套 outbox 负责，草稿不需要背它。
  // 照 `previewUrl` 的既有写法，在持久化时把这两个字段剥掉。
  {
    id: "chat.draft-strip-commit-ownership",
    file: MAIN,
    find: 'function stripForPersist(attachment) {\n  return { ...attachment, previewUrl: "" };\n}',
    replace: [
      "function stripForPersist(attachment) {",
      "  const { commitOperationId: __ovOperationId, commitSourcePath: __ovSourcePath, ...rest } = attachment;",
      '  return { ...rest, previewUrl: "" };',
      "}",
    ].join("\n"),
  },
  // 上面那条只管以后存进去的。已经被污染过的草稿（升级前存下的）在**读取时**再洗一次，
  // 这样不用让用户手动清缓存，第一次打开就把幽灵所有权丢掉。
  {
    id: "chat.draft-strip-commit-ownership-on-load",
    file: MAIN,
    find: "      attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],",
    replace: "      attachments: (Array.isArray(parsed.attachments) ? parsed.attachments : []).map(stripForPersist),",
  },
];