// 对渲染层的补丁：{ id, file（按前缀匹配，带哈希的文件名写到哈希之前）, find, replace, count（默认 1）, within? }。
// 只放界面代码里写死、没法从主进程或 gateway 侧改的东西。
//
// find 可以是带 g 的正则，replace 可以是函数；within: [开始锚点, 结束锚点] 把替换限定在一段区间里。
// 具体语义见 build.mjs。
export const VERSION = "3.0.16";

// 主 bundle 和首页那块懒加载的 chunk。同前缀（assets/index-）的文件有好几个，这里写全名免得误伤。
const MAIN = "assets/index-C4qF1HE0.js";
const HOME = "assets/index-CzL_EVKV.js";

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

export const PATCHES = [
  // ---------------------------------------------------------------------------------------------
  // 一、品牌名
  // ---------------------------------------------------------------------------------------------

  // 窗口标题（启动时 React 还没接管前显示的就是这个）。
  { id: "brand.html-title", file: "index.html", find: "<title>MiniMax Design</title>", replace: `<title>${NAME_ZH}</title>` },

  // i18n 资源里的完整产品名。数量是两份资源里逐条数出来的，文案增减时这里会报错提醒复查。
  { id: "brand.i18n-en", file: MAIN, within: EN_I18N, find: /MiniMax Design/g, replace: NAME_EN, count: 100 },
  { id: "brand.i18n-zh", file: MAIN, within: ZH_I18N, find: /( ?)MiniMax Design( ?)/g, replace: zhName, count: 102 },

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
    find: "/* @__PURE__ */ jsxRuntimeExports.jsx(\n              ComfyUiSubmenu,",
    replace: "false && /* @__PURE__ */ jsxRuntimeExports.jsx(\n              ComfyUiSubmenu,",
  },
  // 设置里的 ComfyUI 分区。当前分区找不到时会退回第一项，删掉这一行不会让打开设置的旧参数出错。
  {
    id: "scope.comfyui-settings",
    file: MAIN,
    find: '  { id: "comfyui", icon: Blocks, labelKey: "settings.comfyui.title" },\n',
    replace: "",
  },
  // 输入框占位符末尾的 "Design 使用指南 ↗ · H3 使用指南 ↗" 外链，指向参照产品的在线文档，不给链接。
  {
    id: "scope.creation-guide-links",
    file: MAIN,
    find: "function CreationGuidePlaceholder({ guides, source }) {\n",
    replace: "function CreationGuidePlaceholder({ source }) {\n  const guides = [];\n",
  },
];
