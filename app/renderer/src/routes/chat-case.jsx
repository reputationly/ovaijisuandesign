// chat-case.jsx
import { GENERATION_FAILURE_ERROR_CODES } from "../chat/has-structured-success-payload.js";
import { useTranslation, reactExports, jsxRuntimeExports, useSearch, MessageCircleMore, Check } from "../vendor.js";
import { ActivityGroup } from "../team/activity-group.jsx";
import { groupIntoActivityGroups } from "../media-editing/group-into-activity-groups.js";
import { Icon } from "../vendor-inline/vscode-base/graph.jsx";
import { ProductionPlanTimeline } from "../text-editor/production-plan-timeline.jsx";
import { RecoveringChildrenProvider } from "../generation/use-mention-models.jsx";
import { MessageList } from "../media-editing/message-list-props-equal.jsx";
import { QuestionDock } from "../chat/question-dock.jsx";
import { LoopGuardAskDock } from "../chat/loop-guard-ask-dock.jsx";
import { StageConfirmationBar } from "../text-editor/skill-reload-dock.jsx";
import { StagePromptEditorCard } from "../workspace/stage-prompt-editor-card.jsx";
import { E as ERROR_CARD_PREVIEW_MESSAGES } from "../error-card-fixtures-GXqelGnw.js";
import { __jsx } from "../shared/jsx-runtime.js";
const PLANNER_CHILD_ID = "chat-case-planner-child";
const EXECUTOR_CHILD_ID = "chat-case-executor-child";
const TEXT_OUTPUT_NODE_ID = "11111111-1111-4111-8111-111111111111";
const IMAGE_OUTPUT_NODE_ID = "22222222-2222-4222-8222-222222222222";
const VIDEO_OUTPUT_NODE_ID = "33333333-3333-4333-8333-333333333333";
const AUDIO_OUTPUT_NODE_ID = "44444444-4444-4444-8444-444444444444";
const PLANNER_TASK =
  "为山岚咖啡夏季冷萃新品制定完整创意方案。基于品牌手作、自然、克制的调性，输出 30 秒竖屏短片的情绪曲线、6 镜分镜、旁白、声音设计和品牌落版方式。";
const DIRECTION_QUESTION =
  "我建议按「克制的慢萃品牌片」继续：自然光、慢动作、声音细节，不使用高饱和饮料广告处理。可以吗？";
const MULTI_QUESTION_FIXTURE = [
  {
    header: "标题方向",
    question: "三个平台的标题更偏品牌表达，还是更偏真实体验？",
    options: [
      {
        label: "品牌表达",
        description: "突出“慢萃”和产品质感",
      },
      {
        label: "真实体验",
        description: "从第一口冷萃的感受切入",
      },
      {
        label: "分别处理",
        description: "按三个平台的内容语境分别调整",
      },
    ],
  },
  {
    header: "发布平台",
    question: "这次优先适配哪些发布平台？",
    multiple: true,
    options: [
      {
        label: "抖音",
        description: "强调前三秒吸引力与节奏",
      },
      {
        label: "小红书",
        description: "强调真实体验与生活方式",
      },
      {
        label: "视频号",
        description: "强调品牌信息与完整叙事",
      },
    ],
  },
  {
    header: "首句语气",
    question: "发布文案的第一句话用哪种语气？",
    options: [
      {
        label: "克制陈述",
        description: "直接说明新品和核心体验",
      },
      {
        label: "感受切入",
        description: "从夏日第一口冷萃的感受开始",
      },
      {
        label: "品牌宣言",
        description: "用一句简短口号建立品牌态度",
      },
    ],
  },
  {
    header: "剪辑节奏",
    question: "不同平台的剪辑节奏需要如何处理？",
    options: [
      {
        label: "统一节奏",
        description: "三个平台沿用同一版成片节奏",
      },
      {
        label: "平台适配",
        description: "根据平台习惯分别调整镜头密度",
      },
      {
        label: "轻微调整",
        description: "只调整开头和结尾的停留时长",
      },
    ],
  },
  {
    header: "交付规格",
    question: "最终需要保留哪些交付规格？",
    multiple: true,
    options: [
      {
        label: "9:16 竖屏",
        description: "用于抖音和小红书",
      },
      {
        label: "16:9 横屏",
        description: "用于视频号和大屏展示",
      },
      {
        label: "无字幕版本",
        description: "便于后续再次编辑",
      },
    ],
  },
];
const IMAGE_RECONNECT_DUPLICATE_ARGS = JSON.stringify({
  vendor: "gpt-image",
  model_id: "gpt-image-2",
  count: 2,
  prompt:
    "A cheerful cartoon illustration of two small puppies dancing together in a bright studio, playful poses, clean full-body composition.",
  filenames: ["puppy-dance-1", "puppy-dance-2"],
  vendor_params: {
    aspect_ratio: "1:1",
    resolution: "2K",
  },
});
const CHAT_CASE_RECONNECT_DUPLICATE_MESSAGES = [
  {
    id: "case-image-reconnect-history-running",
    role: "agent",
    type: "tool",
    content: "hub_generate_image",
    toolName: "hub_generate_image",
    toolStatus: "running",
    toolArgs: IMAGE_RECONNECT_DUPLICATE_ARGS,
  },
  {
    id: "case-image-reconnect-live-completed",
    partId: "prt-case-image-reconnect-live",
    callID: "call-case-image-reconnect-live",
    role: "agent",
    type: "tool",
    content: "hub_generate_image",
    toolName: "hub_generate_image",
    toolStatus: "ok",
    toolArgs: IMAGE_RECONNECT_DUPLICATE_ARGS,
    toolResult: JSON.stringify({
      paths: [
        "output_files/puppy-dance-1.png",
        "output_files/puppy-dance-2.png",
      ],
      width: 2048,
      height: 2048,
    }),
  },
];
const CHAT_CASE_RECONNECT_DUPLICATE_CONTENT_INDEX = [
  "原始数据：历史 running 记录无 partId / callID",
  "原始数据：实时 completed 记录有 partId / callID",
  "两条记录的工具和参数完全相同",
  "预期界面：只展示 completed 的「生成 2 张图片」",
];
const CHAT_CASE_PRODUCTION_CONFIRM_OVERLAP_MESSAGES = [
  {
    id: "case-production-confirm-overlap-user",
    role: "user",
    type: "text",
    content: "按这个制作方向继续。",
  },
  {
    id: "case-production-confirm-overlap-agent",
    role: "agent",
    type: "text",
    content:
      "我已经把请求路由到制作流程，并生成了第一阶段计划。\n\n如果这版没问题，请继续；如果要改，直接说你要调整的点。",
  },
];
const CHAT_CASE_PRODUCTION_CONFIRM_OVERLAP_CONTENT_INDEX = [
  "最新 Agent 回复已完成",
  "复制 / 更多操作栏常驻",
  "制作阶段等待用户确认",
  "「继续」按钮复用生产环境布局",
];
const CHAT_CASE_PLAN = {
  revision: 5,
  title: "山岚冷萃夏季新品短片",
  sources: [],
  stages: [
    {
      id: "intent",
      order: 1,
      name: "确认制作意图",
      goal: "确认制作意图",
      status: "done",
      depends_on: [],
      work_items: [],
      runtime_refs: [],
      reference_labels: {},
      stage_names: {},
      produced_count: 1,
      work_item_count: 1,
    },
    {
      id: "references",
      order: 2,
      name: "整理品牌与视觉参考",
      goal: "整理品牌与视觉参考",
      status: "done",
      depends_on: ["intent"],
      work_items: [],
      runtime_refs: [],
      reference_labels: {},
      stage_names: {},
      produced_count: 1,
      work_item_count: 1,
    },
    {
      id: "storyboard",
      order: 3,
      name: "设计六镜分镜方案",
      goal: "设计六镜分镜方案",
      status: "done",
      depends_on: ["references"],
      work_items: [],
      runtime_refs: [],
      reference_labels: {},
      stage_names: {},
      produced_count: 6,
      work_item_count: 6,
    },
    {
      id: "clips",
      order: 4,
      name: "生成视频片段",
      goal: "生成视频片段",
      status: "waiting_user",
      waiting_reason: "plan_review",
      depends_on: ["storyboard"],
      review: {
        before_execution: [
          "确认六个镜头的提示词和参考素材",
          "确认 9:16、1080p 和单镜头时长",
        ],
      },
      work_items: [
        {
          id: "shot-1",
          name: "冰块入杯",
          prompt:
            "超近景，透明冰块落入玻璃杯，自然逆光，木质桌面，竖屏饮品广告镜头。",
          model: "Seedance 2.0",
          aspect_ratio: "9:16",
          resolution: "1080p",
          duration: "5",
        },
        {
          id: "shot-2",
          name: "冷萃穿过冰块",
          prompt:
            "琥珀色冷萃液缓慢穿过冰块，杯壁冷凝水清晰，克制的慢镜头移动。",
          model: "Seedance 2.0",
          aspect_ratio: "9:16",
          resolution: "1080p",
          duration: "5",
        },
      ],
      runtime_refs: [
        {
          id: "shot-1",
          path: "output_files/coffee-summer-shot-01.mp4",
        },
        {
          id: "shot-2",
          path: "output_files/coffee-summer-shot-02.mp4",
        },
      ],
      reference_labels: {},
      stage_names: {},
      produced_count: 6,
      work_item_count: 6,
    },
  ],
  pending_stages: [
    {
      id: "finalReview",
      order: 5,
      name: "确认最终交付",
    },
  ],
  next_stage: void 0,
  waiting_user: true,
};
function subAgent(
  id,
  agent,
  task,
  subMessages,
  resolved,
  childSessionId,
  cancelled = false,
) {
  return {
    id,
    role: "agent",
    type: "sub_agent",
    content: task,
    task,
    agent,
    childSessionId,
    resolved,
    cancelled,
    subMessages,
  };
}
const PLANNER_QUESTION = subAgent(
  "case-planner-questioning",
  "planner",
  PLANNER_TASK,
  [
    {
      id: "case-planner-thinking",
      type: "thinking",
      content:
        "正在核对投放平台、画幅与人物露出限制，再整理需要用户确认的关键项。",
    },
    {
      id: "case-planner-question",
      type: "question",
      content: "请选择最终投放画幅",
      requestId: "case-question-request",
      resolved: false,
      questionData: {
        questions: [
          {
            header: "画面比例",
            question: "这支短片主要投放在哪种画幅？",
            options: [
              {
                label: "9:16",
                description: "短视频平台竖屏",
              },
              {
                label: "1:1",
                description: "社交媒体方形",
              },
              {
                label: "16:9",
                description: "横屏播放",
              },
            ],
          },
        ],
      },
    },
  ],
  false,
  PLANNER_CHILD_ID,
);
const PLANNER_DONE = subAgent(
  "case-planner-done",
  "planner",
  PLANNER_TASK,
  [
    {
      id: "case-planner-read",
      type: "tool",
      content: "hub_read",
      args: JSON.stringify({
        file_path: "brand-brief.md",
      }),
      toolStatus: "ok",
    },
    {
      id: "case-planner-result",
      type: "text",
      content:
        "创意方案已完成。\n\n**核心概念：把夏天，慢慢萃出来**\n\n1. 0–4 秒：冰块落入玻璃杯，近距离收录清脆碰撞声。\n2. 4–9 秒：冷萃液穿过冰块，逆光表现琥珀色与气泡。\n3. 9–14 秒：手冲壶、磨豆和称重三个手作细节快速交替。\n4. 14–20 秒：杯壁冷凝水滑落，人物端起咖啡走向窗边。\n5. 20–27 秒：产品定格，露出「山岚冷萃」瓶身与原料。\n6. 27–30 秒：品牌标志与口号落版。\n\n声音从环境白噪开始，中段加入轻电子节拍，片尾只保留冰块声和品牌口号。",
    },
  ],
  true,
  PLANNER_CHILD_ID,
);
const EXECUTOR_RUNNING = subAgent(
  "case-executor-running",
  "executor",
  "按已确认分镜生成 6 个视频镜头，并完成配乐与成片合成。",
  [
    {
      id: "case-executor-video-running",
      type: "tool",
      content: "hub_generate_video",
      args: JSON.stringify({
        vendor: "seedance",
        model_id: "seedance2.0",
        prompt:
          "超近景，琥珀色咖啡液穿过透明冰块，冷凝水与细密气泡清晰可见，逆光，手作饮品广告质感。",
        filename: "coffee-summer-shot-04",
        vendor_params: {
          aspect_ratio: "9:16",
          duration: 5,
          resolution: "1080p",
        },
      }),
      toolStatus: "running",
    },
    {
      id: "case-executor-canvas-running",
      type: "tool",
      content: "hub_canvas_write_node",
      args: JSON.stringify({
        kind: "media",
        assetPath: "output_files/coffee-summer-shot-04.mp4",
        name: "冷萃穿过冰块",
      }),
      toolStatus: "running",
    },
  ],
  false,
  EXECUTOR_CHILD_ID,
  true,
);
const EXECUTOR_DONE = subAgent(
  "case-executor-done",
  "executor",
  "按已确认分镜生成 6 个视频镜头，并完成配乐与成片合成。",
  [
    {
      id: "case-executor-video-done",
      type: "tool",
      content:
        'hub_generate_video: {"path":"output_files/coffee-summer-30s.mp4","duration":30,"resolution":"1080p"}',
      args: JSON.stringify({
        vendor: "seedance",
        model_id: "seedance2.0",
        prompt: "夏日冷萃咖啡新品广告，竖屏，冰感，手作质感。",
        filename: "coffee-summer-30s",
        vendor_params: {
          aspect_ratio: "9:16",
          duration: 30,
          resolution: "1080p",
        },
      }),
      toolStatus: "ok",
    },
    {
      id: "case-executor-result",
      type: "text",
      content: "6 个镜头、品牌落版和背景音乐已完成，成片已写入项目输出目录。",
    },
  ],
  true,
  EXECUTOR_CHILD_ID,
);
const CHAT_CASE_ERROR_MESSAGES = ERROR_CARD_PREVIEW_MESSAGES;
const CHAT_CASE_MESSAGES = [
  {
    id: "case-user-request",
    role: "user",
    type: "text",
    content:
      "我们准备发布「山岚冷萃」夏季新品，需要一支可以直接发到短视频平台的品牌片。\n\n要求：\n- 30 秒，竖屏优先\n- 要有夏日、冰感和手作质感，但不要做成普通饮料广告\n- 色调以琥珀色、木色和自然光为主\n- 需要完整分镜、成片和一份发布说明\n- 片尾口号用「把夏天，慢慢萃出来」\n\n你先给我确定创意方向，再开始生成。",
  },
  {
    id: "case-assistant-intro",
    role: "agent",
    type: "text",
    content:
      "明白。我会先查同类新品短片的视觉趋势，并结合你给出的品牌关键词完成创意规划。方向确认后，再把关键帧、视频镜头和音乐任务交给内容生成 Agent。\n\n我会重点控制三件事：\n\n- **冰感**：通过冷凝水、透明冰块和近距离声音建立感受\n- **手作感**：保留磨豆、称重、注水等真实动作\n- **品牌感**：减少快速炫技，使用自然光和克制的镜头移动",
  },
  {
    id: "case-read-brand-brief",
    role: "agent",
    type: "tool",
    content: "hub_read",
    toolName: "hub_read",
    toolStatus: "ok",
    toolArgs: JSON.stringify({
      file_path: "brand-brief.md",
    }),
    toolResult: "# 山岚冷萃品牌资料\n自然、手作、克制，避免高饱和快消表达。",
  },
  {
    id: "case-research-summary",
    role: "agent",
    type: "text",
    content:
      "参考案例已经整理完成。近期饮品短片普遍使用高饱和水果色和快速剪辑，因此这支片子更适合反向处理：降低饱和度、拉长液体与冷凝水镜头，用声音细节强化“慢萃”的差异。接下来我让创作规划 Agent 把这个方向拆成可执行分镜。",
  },
  {
    id: "case-direction-question-history",
    role: "agent",
    type: "tool",
    content: "question",
    toolName: "question",
    toolStatus: "ok",
    toolArgs: JSON.stringify({
      questions: [
        {
          header: "创意方向",
          question: DIRECTION_QUESTION,
          options: [
            {
              label: "按推荐执行",
              description: "继续拆解分镜与制作计划",
            },
            {
              label: "调整方向",
              description: "补充新的视觉和叙事要求",
            },
          ],
        },
      ],
    }),
    toolResult: `"${DIRECTION_QUESTION}"="按推荐执行"`,
  },
  {
    id: "case-multi-question-history",
    role: "agent",
    type: "tool",
    content: "question",
    toolName: "question",
    toolStatus: "ok",
    toolArgs: JSON.stringify({
      questions: MULTI_QUESTION_FIXTURE,
    }),
    toolResult: [
      `"${MULTI_QUESTION_FIXTURE[0].question}"="分别处理"`,
      `"${MULTI_QUESTION_FIXTURE[1].question}"="抖音, 小红书"`,
      `"${MULTI_QUESTION_FIXTURE[2].question}"="感受切入"`,
    ].join("\n"),
  },
  {
    id: "case-direction-question-dismissed",
    role: "agent",
    type: "tool",
    content: "question",
    toolName: "question",
    toolStatus: "error",
    toolArgs: JSON.stringify({
      questions: [
        {
          header: "创意方向",
          question: "是否需要补充更多品牌参考后再继续？",
          options: [
            {
              label: "补充参考",
              description: "先补充品牌素材和竞品案例",
            },
            {
              label: "直接继续",
              description: "沿用当前方向进入分镜制作",
            },
          ],
        },
      ],
    }),
    toolResult: "QuestionRejectedError: User dismissed this question",
  },
  {
    id: "case-direction-question-interrupted",
    role: "agent",
    type: "tool",
    content: "question",
    toolName: "question",
    toolStatus: "error",
    toolArgs: JSON.stringify({
      questions: [
        {
          header: "创意方向",
          question: "这支短片需要优先突出冰感，还是手作质感？",
          options: [
            {
              label: "冰感",
              description: "突出冷凝水、冰块和清凉声音",
            },
            {
              label: "手作质感",
              description: "突出磨豆、称重和慢萃过程",
            },
          ],
        },
      ],
    }),
    toolResult: "Tool execution interrupted before completion",
  },
  PLANNER_QUESTION,
  {
    id: "case-user-ratio-answer",
    role: "user",
    type: "text",
    content:
      "选 9:16，主要发短视频平台。人物不用露脸，手部和局部动作就可以。产品瓶身上的字要清楚，最后的口号至少停留 2 秒。",
  },
  PLANNER_DONE,
  {
    id: "case-user-confirm-answer",
    role: "user",
    type: "text",
    content:
      "这个方向可以。按这套视觉继续，把 6 个镜头都生成出来；如果音乐太抢，就优先保留环境声。",
  },
  EXECUTOR_RUNNING,
  ...CHAT_CASE_ERROR_MESSAGES,
  {
    id: "case-cancelled",
    role: "agent",
    type: "cancelled",
    content: "[Request interrupted by user]",
  },
  {
    id: "case-compaction",
    role: "agent",
    type: "compaction_status",
    content: "compacted",
  },
  {
    id: "case-recovered",
    role: "agent",
    type: "text",
    content:
      "[系统恢复]\n已保留前面完成的 6 个视频镜头，并恢复背景音乐任务。不会重新生成或覆盖已有成片。",
  },
  {
    id: "case-user-continue",
    role: "user",
    type: "text",
    content:
      "继续完成。音乐用更轻一点的版本，保留冰块入杯和倒咖啡的原声。最后请把成片、分镜说明和发布时需要注意的文案一起给我。",
  },
  EXECUTOR_DONE,
  {
    id: "case-final-answer",
    role: "agent",
    type: "text",
    content:
      "短片已经完成。\n\n### 成片结构\n\n- **0–9 秒｜建立冰感**：冰块入杯、冷萃液穿过冰块，保留清晰的碰撞和液体原声。\n- **9–20 秒｜突出手作**：磨豆、称重、注水和杯壁冷凝水依次出现，剪辑速度逐渐加快。\n- **20–27 秒｜产品定格**：瓶身正面朝向镜头，标签文字保持清晰，背景仍保留自然光变化。\n- **27–30 秒｜品牌落版**：画面收静，只保留「把夏天，慢慢萃出来」和一声冰块轻响。\n\n### 交付内容\n\n1. 30 秒 9:16 成片，1080p。\n2. 六镜分镜与每个镜头的生成提示词。\n3. 音乐与环境声使用说明。\n4. 短视频平台发布文案建议。\n\n整体没有使用高饱和饮料广告的常见处理，而是通过自然光、慢动作和声音细节建立“慢萃”的品牌识别。",
  },
  {
    id: "case-canvas-outputs",
    role: "agent",
    type: "tool",
    content: "hub_canvas_write_node",
    toolName: "hub_canvas_write_node",
    toolStatus: "ok",
    toolArgs: JSON.stringify({
      items: [
        {
          kind: "text",
          name: "分镜与发布说明",
          content: "# 山岚冷萃分镜与发布说明",
        },
        {
          kind: "media",
          assetPath: "output_files/coffee-summer-cover.png",
        },
        {
          kind: "media",
          assetPath: "output_files/coffee-summer-30s.mp4",
        },
        {
          kind: "media",
          assetPath: "output_files/coffee-summer-bgm.mp3",
        },
      ],
    }),
    toolResult: JSON.stringify({
      batch: true,
      ok: true,
      results: [
        {
          index: 0,
          kind: "text",
          ok: true,
          nodeId: TEXT_OUTPUT_NODE_ID,
          created: true,
        },
        {
          index: 1,
          kind: "media",
          ok: true,
          nodeId: IMAGE_OUTPUT_NODE_ID,
          assetType: "image",
          assetPath: "output_files/coffee-summer-cover.png",
        },
        {
          index: 2,
          kind: "media",
          ok: true,
          nodeId: VIDEO_OUTPUT_NODE_ID,
          assetType: "video",
          assetPath: "output_files/coffee-summer-30s.mp4",
        },
        {
          index: 3,
          kind: "media",
          ok: true,
          nodeId: AUDIO_OUTPUT_NODE_ID,
          assetType: "audio",
          assetPath: "output_files/coffee-summer-bgm.mp3",
        },
      ],
    }),
  },
  {
    id: "case-output-anchor-summary",
    role: "agent",
    type: "text",
    content: [
      "产物已经整理到画布，可以直接从这里定位：",
      "",
      `- 分镜与发布说明.md：\`${TEXT_OUTPUT_NODE_ID}\``,
      `- 山岚冷萃封面.png：\`${IMAGE_OUTPUT_NODE_ID}\``,
      `- 山岚冷萃成片.mp4：\`${VIDEO_OUTPUT_NODE_ID}\``,
      `- 山岚冷萃配乐.mp3：\`${AUDIO_OUTPUT_NODE_ID}\``,
    ].join("\n"),
  },
  {
    id: "case-user-billing-trigger",
    role: "user",
    type: "text",
    content: "再生成一张横版备用封面，保持同一套琥珀色、冰感和自然光风格。",
  },
  {
    id: "case-billing-insufficient",
    role: "agent",
    type: "error",
    content: "",
    error: {
      error_code: "BILLING_INSUFFICIENT_BALANCE",
      user_message: "",
      retryable: false,
    },
  },
  {
    id: "case-billing-agent-text",
    role: "agent",
    type: "text",
    content:
      "账号积分不足，这次无法直接生成。\n\n报错信息：`billing_insufficient_balance`，Hub 账户需要先充值才能继续生成。",
  },
  {
    id: "case-user-model-mismatch-trigger",
    role: "user",
    type: "text",
    content: "积分恢复了，请改用 Design Image 2 生成横版备用封面。",
  },
  {
    id: "case-image-model-mismatch",
    role: "agent",
    type: "tool",
    content: "hub_generate_image",
    toolName: "hub_generate_image",
    toolStatus: "error",
    toolArgs: JSON.stringify({
      vendor: "gpt-image",
      model_id: "gpt-image-2",
      prompt: "山岚冷萃夏季新品横版封面，琥珀色、冰感和自然光。",
      filename: "coffee-summer-landscape-cover",
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "2K",
      },
    }),
    toolResult: JSON.stringify({
      is_error: true,
      message:
        "Selected image models do not include vendor=gpt-image. selected_ids=[nano_banana_2_flash, kling-image-o1] available_vendors=[banana, kling]",
    }),
  },
  {
    id: "case-user-follow-up",
    role: "user",
    type: "text",
    content:
      "成片方向没问题。再帮我查一下，如果分别发到抖音、小红书和视频号，标题和第一句话应该怎么调整？不要用太夸张的营销词。",
  },
  {
    id: "case-search-running",
    role: "agent",
    type: "tool",
    content: "webfetch",
    toolName: "webfetch",
    toolStatus: "running",
    toolArgs: JSON.stringify({
      query: "咖啡新品短片平台标题写法",
    }),
  },
  {
    id: "case-platform-question",
    role: "agent",
    type: "question",
    content: "请选择标题表达方向",
    requestId: "case-platform-question-request",
    resolved: false,
    questionData: {
      questions: MULTI_QUESTION_FIXTURE,
    },
  },
];
const CHAT_CASE_PENDING_QUESTION = CHAT_CASE_MESSAGES.at(-1);
const CHAT_CASE_SINGLE_PENDING_QUESTION = {
  id: "case-single-question-preview",
  role: "agent",
  type: "question",
  content: "请选择短片的核心创意方向",
  requestId: "case-single-question-preview-request",
  resolved: false,
  questionData: {
    questions: [
      {
        header: "创意方向",
        question: "这支短片更适合突出冰感，还是突出手作质感？",
        options: [
          {
            label: "突出冰感",
            description: "强化冰块、冷凝水和清凉声音",
          },
          {
            label: "突出手作",
            description: "强化磨豆、称重和慢萃过程",
          },
          {
            label: "平衡处理",
            description: "冰感负责吸引注意，手作建立品牌质感",
          },
        ],
      },
    ],
  },
};
const LONG_QUESTION_PLAN = Array.from(
  {
    length: 16,
  },
  (_, index) =>
    `${String(index + 1).padStart(2, "0")} 镜头方案：保持同一产品、人物与服装，使用克制的镜头运动和统一的冷调光线。画面需要明确交代主体位置、景别、焦段、动作、材质细节与环境关系，并在进入下一镜头前保留自然的视觉衔接。`,
).join("\n\n");
const CHAT_CASE_LONG_PENDING_QUESTION = {
  id: "case-long-question-overflow-preview",
  role: "agent",
  type: "question",
  content: "请审核长方案并确认是否继续",
  requestId: "case-long-question-overflow-preview-request",
  resolved: false,
  questionData: {
    questions: [
      {
        header: "方案确认",
        question: `请审核以下完整制作方案。

${LONG_QUESTION_PLAN}`,
        options: [
          {
            label: "确认并生成",
            description: "锁定当前方案并进入生成阶段",
          },
          {
            label: "修改方案",
            description: "补充修改意见，暂不开始生成",
          },
        ],
        custom: true,
      },
    ],
  },
};
const CHAT_CASE_LOOP_GUARD = {
  id: "case-loop-guard-preview",
  role: "agent",
  type: "loop_guard_ask",
  content: "检测到重复调用，需要用户确认后继续。",
  requestId: "case-loop-guard-preview-request",
  loopGuardSessionId: "chat-case-complete",
  resolved: false,
  loopGuardData: {
    tool: "hub_generate_video",
    hits: 3,
    window: 5,
    recent_tools: ["hub_generate_video", "hub_canvas_write_node"],
    message: "",
  },
};
const CHAT_CASE_CONTENT_INDEX = [
  "完整用户需求",
  "助手 Markdown 回复",
  "读取文件与文件详情",
  "已完成的问题确认",
  "已完成的多问题确认",
  "已取消的问题确认",
  "已中断的问题确认",
  "创作规划 Agent 询问中",
  "子 Agent 思考与任务详情",
  "创作规划 Agent 已完成",
  "内容生成 Agent 已中断",
  "内容生成 Agent 已完成",
  "媒体生成参数与进度",
  "处理画布内容",
  "文本产物定位画布",
  "图片产物定位画布",
  "视频产物定位画布",
  "音频产物定位画布",
  "Agent 正文产物锚点",
  "错误卡片：网络请求超时",
  "错误卡片：网络无法连接",
  "错误卡片：对话连接已中断",
  "错误卡片：对话服务启动中",
  "错误卡片：当前对话暂不可用",
  "错误卡片：服务响应中断",
  "错误卡片：未细分运行时错误兜底",
  "错误卡片：服务端内部故障兜底",
  "积分不足卡片与 Agent 正文脱敏",
  "媒体生成失败详情与模型名脱敏",
  "用户中断",
  "上下文压缩与恢复",
  "主 Agent 搜索中",
  "单问题询问 Dock 与选项",
  "边界多问题询问 Dock 与滚动导航",
  "Loop Guard 确认 Dock",
  "检查与修改提示词",
];
const PROVIDER_DIAGNOSTIC =
  "Provider request failed with an internal diagnostic.";
function toolMessage(id, toolResult, prompt) {
  return {
    id: `generation-failure-replay-${id}`,
    role: "agent",
    type: "tool",
    content: "hub_generate_video",
    toolName: "hub_generate_video",
    toolStatus: "error",
    toolArgs: JSON.stringify({
      prompt,
      duration: 6,
      aspect_ratio: "16:9",
    }),
    toolResult,
  };
}
function structuredFailure(fields) {
  return JSON.stringify({
    ok: false,
    ...fields,
  });
}
function createGenerationFailureReplayCases(language) {
  const serverUserMessage = language.toLowerCase().startsWith("zh")
    ? "模型参数有误，请检查设置后重试。"
    : "Invalid model parameters. Check the settings and try again.";
  const prompt = language.toLowerCase().startsWith("zh")
    ? "两只活泼的小狗在阳光充足的摄影棚中奔跑。"
    : "Two playful puppies running through a sunlit studio.";
  const mappedCodeCases = GENERATION_FAILURE_ERROR_CODES.map((errorCode) => ({
    id: `code-${errorCode}`,
    label: errorCode,
    source: "error_code",
    message: toolMessage(
      `code-${errorCode}`,
      structuredFailure({
        error: PROVIDER_DIAGNOSTIC,
        error_code: errorCode,
      }),
      prompt,
    ),
  }));
  return [
    {
      id: "server-user-message",
      label: "user_message + content_policy_violation",
      source: "user_message",
      message: toolMessage(
        "server-user-message",
        structuredFailure({
          error: PROVIDER_DIAGNOSTIC,
          error_code: "content_policy_violation",
          user_message: serverUserMessage,
        }),
        prompt,
      ),
    },
    ...mappedCodeCases,
    {
      id: "client-error-fallback",
      label: "client_error",
      source: "raw_error",
      message: toolMessage(
        "client-error-fallback",
        structuredFailure({
          error: "The selected aspect ratio is not supported by this model.",
          error_code: "client_error",
        }),
        prompt,
      ),
    },
    {
      id: "backend-error-fallback",
      label: "backend_error",
      source: "raw_error",
      message: toolMessage(
        "backend-error-fallback",
        structuredFailure({
          error:
            "The upstream generation service returned an unexpected response.",
          error_code: "backend_error",
        }),
        prompt,
      ),
    },
    {
      id: "raw-text-fallback",
      label: "plain text toolResult",
      source: "raw_error",
      message: toolMessage(
        "raw-text-fallback",
        "The generation request was rejected by the upstream provider.",
        prompt,
      ),
    },
    {
      id: "generic-fallback",
      label: "no displayable detail",
      source: "generic",
      message: toolMessage("generic-fallback", structuredFailure({}), prompt),
    },
  ];
}
const SOURCE_LABEL_KEYS = {
  user_message: "debug.generationFailureReplay.source.userMessage",
  error_code: "debug.generationFailureReplay.source.errorCode",
  raw_error: "debug.generationFailureReplay.source.rawError",
  generic: "debug.generationFailureReplay.source.generic",
};
function activityGroupFor(message) {
  const [node] = groupIntoActivityGroups([message]);
  if (!node || node.kind !== "activity-group") {
    throw new Error(
      `Generation failure replay did not produce an activity group: ${message.id}`,
    );
  }
  return node;
}
function GenerationFailureReplayPage() {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const cases = reactExports.useMemo(
    () => createGenerationFailureReplayCases(language),
    [language],
  );
  return (
    <main
      className="h-full w-full overflow-y-auto bg-muted p-4"
      data-action-ui-id="debug.generation-failure-replay"
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <header className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-body-14 font-medium text-foreground">
                {t("debug.generationFailureReplay.title")}
              </h1>
              <p className="mt-1 text-body-12 text-muted-foreground">
                {t("debug.generationFailureReplay.subtitle")}
              </p>
            </div>
            <div className="text-caption-11 text-muted-foreground">
              {t("debug.generationFailureReplay.summary", {
                count: cases.length,
                language,
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption-11 text-muted-foreground">
            {Object.keys(SOURCE_LABEL_KEYS).map((source) => (
              <span key={source}>
                <code className="font-mono text-foreground/70">{source}</code>
                {" · "}
                {t(SOURCE_LABEL_KEYS[source])}
              </span>
            ))}
          </div>
        </header>
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cases.map((replayCase) => (
            <article
              key={replayCase.id}
              className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
              data-action-ui-id={`debug.generation-failure-replay.case.${replayCase.id}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
                <code className="min-w-0 truncate font-mono text-caption-11 text-foreground/70">
                  {replayCase.label}
                </code>
                <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-caption-10 text-muted-foreground">
                  {t(SOURCE_LABEL_KEYS[replayCase.source])}
                </span>
              </div>
              <div className="min-w-0 p-4">
                <ActivityGroup
                  data={activityGroupFor(replayCase.message)}
                  isStreaming={false}
                  showThinkingSummary={false}
                  defaultDetailExpanded={true}
                />
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
function ChatCasePage() {
  const { t } = useTranslation();
  const search = useSearch({
    from: "/_app/debug/chat-case",
  });
  if (search.case === "generation-errors")
    return <GenerationFailureReplayPage />;
  const isReconnectDuplicateCase = search.case === "image-reconnect-duplicate";
  const isProductionConfirmOverlapCase =
    search.case === "production-confirm-overlap";
  const isQuestionOverflowCase = search.case === "question-overflow";
  const messages = isQuestionOverflowCase
    ? []
    : isReconnectDuplicateCase
      ? CHAT_CASE_RECONNECT_DUPLICATE_MESSAGES
      : isProductionConfirmOverlapCase
        ? CHAT_CASE_PRODUCTION_CONFIRM_OVERLAP_MESSAGES
        : CHAT_CASE_MESSAGES;
  const contentIndex = isQuestionOverflowCase
    ? ["超长方案文本", "QuestionTool 选项", "固定底部操作区", "小屏内部滚动"]
    : isReconnectDuplicateCase
      ? CHAT_CASE_RECONNECT_DUPLICATE_CONTENT_INDEX
      : isProductionConfirmOverlapCase
        ? CHAT_CASE_PRODUCTION_CONFIRM_OVERLAP_CONTENT_INDEX
        : CHAT_CASE_CONTENT_INDEX;
  const caseName = isQuestionOverflowCase
    ? "小屏长方案 QuestionTool 滚动"
    : isReconnectDuplicateCase
      ? "图片生成完成后重复记录（Reconnect mock）"
      : isProductionConfirmOverlapCase
        ? "制作确认按钮与消息操作栏重叠"
        : t("debug.chatCase.caseName");
  const conversationTitle = isQuestionOverflowCase
    ? "长方案确认"
    : isReconnectDuplicateCase
      ? "图片生成重复记录复现"
      : isProductionConfirmOverlapCase
        ? "制作确认重叠复现"
        : t("debug.chatCase.conversationTitle");
  const conversationSubtitle =
    isQuestionOverflowCase ||
    isReconnectDuplicateCase ||
    isProductionConfirmOverlapCase
      ? "Static renderer state · no gateway calls"
      : t("debug.chatCase.conversationSubtitle");
  const reviewStage = CHAT_CASE_PLAN.stages.find(
    (stage) => stage.status === "waiting_user",
  );
  const productionConfirmOverlapStage = reviewStage
    ? {
        ...reviewStage,
        runtime_refs: [],
      }
    : void 0;
  const conversationTail =
    isProductionConfirmOverlapCase && productionConfirmOverlapStage ? (
      <div data-action-ui-id="production-plan.confirmation-overlap-repro">
        <StageConfirmationBar
          stage={productionConfirmOverlapStage}
          finalStage={false}
          onConfirm={() => {}}
        />
      </div>
    ) : !isQuestionOverflowCase && !isReconnectDuplicateCase && reviewStage ? (
      <div
        className="flex flex-col gap-2"
        data-action-ui-id="production-plan.conversation-card-clips"
      >
        <StagePromptEditorCard
          stage={reviewStage}
          saveStageWorkItems={async () => ({
            changedItemIds: [],
            revision: CHAT_CASE_PLAN.revision,
          })}
        />
        <StageConfirmationBar
          stage={reviewStage}
          finalStage={false}
          onConfirm={() => {}}
        />
      </div>
    ) : null;
  return (
    <div
      data-action-ui-id="debug-chat-case"
      className="flex h-full min-h-0 w-full overflow-hidden bg-muted p-4"
    >
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1120px] grid-cols-[260px_minmax(480px,760px)] gap-4">
        <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Icon
              icon={MessageCircleMore}
              size="md"
              className="text-muted-foreground"
            />
            <div>
              <h1 className="text-body-14 font-medium text-foreground">
                {t("debug.chatCase.title")}
              </h1>
              <p className="text-caption-11 text-muted-foreground">
                {t("debug.chatCase.subtitle")}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-lg bg-muted p-3">
            <p className="text-caption-11 text-muted-foreground">
              {t("debug.chatCase.caseLabel")}
            </p>
            <p className="mt-1 text-body-13 text-foreground">{caseName}</p>
          </div>
          <p className="mt-5 text-caption-10 uppercase tracking-wide text-foreground/30">
            {t("debug.chatCase.includes")}
          </p>
          <div className="mt-2 flex min-h-0 flex-col gap-1 overflow-y-auto">
            {contentIndex.map((item) => (
              <div
                key={item}
                className="flex min-h-8 items-center gap-2 rounded-md px-2"
              >
                <Icon
                  icon={Check}
                  size="xs"
                  className="text-muted-foreground"
                />
                <span className="text-body-12 text-foreground/70">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-lg border border-border p-3">
            <p className="text-caption-11 leading-relaxed text-muted-foreground">
              {t("debug.chatCase.help")}
            </p>
          </div>
        </aside>
        <section className="flex min-h-0 min-w-0 justify-center overflow-hidden rounded-xl border border-border bg-background p-4">
          <div className="flex h-full min-h-0 w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
              <div className="min-w-0">
                <h2 className="truncate text-body-14 font-medium text-foreground">
                  {conversationTitle}
                </h2>
                <p className="truncate text-caption-10 text-muted-foreground">
                  {conversationSubtitle}
                </p>
              </div>
            </header>
            {!isQuestionOverflowCase &&
              !isReconnectDuplicateCase &&
              !isProductionConfirmOverlapCase && (
                <ProductionPlanTimeline
                  model={CHAT_CASE_PLAN}
                  loading={false}
                />
              )}
            {!isQuestionOverflowCase && (
              <RecoveringChildrenProvider value={new Set()}>
                <MessageList
                  messages={messages}
                  busy={false}
                  focusedSessionId={
                    isReconnectDuplicateCase
                      ? "chat-case-image-reconnect-duplicate"
                      : "chat-case-complete"
                  }
                  onSend={() => true}
                  onRetry={() => true}
                  conversationTail={conversationTail}
                  showTurnArtifacts={false}
                />
              </RecoveringChildrenProvider>
            )}
            {isQuestionOverflowCase && (
              <div
                data-action-ui-id="debug-chat-case-question-overflow"
                className="min-h-0 flex-1 overflow-hidden px-2 pb-2"
              >
                <QuestionDock
                  question={CHAT_CASE_LONG_PENDING_QUESTION}
                  onSend={() => {}}
                />
              </div>
            )}
            {!isQuestionOverflowCase &&
              !isReconnectDuplicateCase &&
              !isProductionConfirmOverlapCase && (
                <div className="scrollbar-none max-h-[58vh] shrink-0 overflow-y-auto px-2 pb-2">
                  <QuestionDock
                    question={CHAT_CASE_SINGLE_PENDING_QUESTION}
                    onSend={() => {}}
                  />
                  <div className="mx-auto w-full max-w-sm">
                    <QuestionDock
                      question={CHAT_CASE_PENDING_QUESTION}
                      onSend={() => {}}
                    />
                  </div>
                  <LoopGuardAskDock
                    message={CHAT_CASE_LOOP_GUARD}
                    onSend={() => {}}
                    shortcutsEnabled={false}
                  />
                </div>
              )}
          </div>
        </section>
      </div>
    </div>
  );
}
const SplitComponent = ChatCasePage;
export { SplitComponent as component };
