/**
 * 云端下发的配置 / 运营位 / 计费活动的本地默认值。
 *
 * 这些接口原本都是转发到云端网关的；我们没有云端，直接回「云端没有配置」时渲染层最终会落到的那份内容。
 * 能回成功响应就回成功响应：渲染层对失败的处理各不相同（有的重试、有的记埋点、有的整块不渲染），
 * 回一份形状正确的空配置，界面走的是和「云端什么都没配」完全一样的分支。
 */

/** 弹窗：云端出错时就是「不弹」—— popup_type=0（NONE）。undefined 字段序列化时本来就不出现，这里直接省掉。 */
export const EMPTY_POPUP = {
  announcements: [],
  popup_type: 0,
  id: "",
  title: "",
  description: "",
  can_close: true,
  mute_range_time: 0,
  cover_url: "",
  video_url: "",
  banner_text: "",
} as const;

/** 计费活动：没有活动，也没有参与活动的模型。 */
export const EMPTY_PROMOTION = { promotion: null, models: [] } as const;

/** 视频试用活动：不可领、没领过、活动未开始。领取接口失败时也回这一份。 */
export const EMPTY_VIDEO_TRIAL_STATUS = {
  claimed: false,
  claimable: false,
  freeCount: 0,
  remainingCount: 0,
  claimHint: "",
  activityActive: false,
} as const;

/**
 * Apollo 配置项的本地默认值（值就是配置本身，渲染层按 Apollo 原样解析）。
 *
 * 每一份都是渲染层自己兜底用的那份配置换成 Apollo 的写法（snake_case、中英文分开写），
 * 所以界面和「拉配置失败、用内置兜底」看起来一样，只是不再有失败请求和重试。
 */
export const APOLLO_DEFAULTS: Readonly<Record<string, unknown>> = {
  // 工具调用在对话里的显示名 / 图标映射：空表 = 全部按工具原名显示。
  tool_call_display_config: { displayLabels: {}, labelIds: {} },
  // 首页三个一级页签：创作灵感、Skill（技能市场的精选来源）、精选项目。
  home_tabs_showcase_config: {
    schema_version: 1,
    enabled: true,
    default_primary_id: "inspiration",
    primary_categories: [
      // 云端原文（3.0.21 应用拉到的 home_tabs_showcase_config）里 provider 还带 config_key / section_type 两个字段。
      { id: "inspiration", title: { zh: "创作灵感", en: "Inspiration" }, provider: { type: "quick-start-v2", config_key: "home_quick_start_config_v2", section_type: "prompt" } },
      {
        id: "skill",
        title: { zh: "Skill", en: "Skill" },
        default_secondary_id: "all",
        provider: { type: "skill-market", config_key: "home_skill_showcase_config", source: "official-featured" },
        secondary_categories: [{ id: "all", title: { zh: "全部", en: "All" } }],
      },
      { id: "projects", title: { zh: "精选项目", en: "Featured Projects" }, provider: { type: "project-showcase" } },
    ],
  },
  // Skill 页签下的二级分类：只有「全部」，数据来自技能市场的精选来源。
  home_skill_showcase_config: {
    schema_version: 1,
    enabled: true,
    default_secondary_id: "all",
    secondary_categories: [{ id: "all", title: { zh: "全部", en: "All" }, query: { source: "official-featured" } }],
  },
  // 精选项目：没有内容（项目包都放在云端）。
  home_project_showcase_config: { schema_version: 1, enabled: true, sections: [] },
  // 首页 / 侧栏的运营入口：一个都没有。
  hub_entries: {},
  // ComfyUI 精选工作流目录：空对象 = 未发布。
  comfyui_featured_workflows: {},
};

/** 积分钱包：没有计费，钱包为空（界面上余额显示成 "--"）。 */
export const EMPTY_WALLET = { wallets: [], migrate_end_time: 0 } as const;

/** 计费价格表：enabled=false 表示不计费，其余字段渲染层都有默认值。 */
export const PRICING_DISABLED = { enabled: false } as const;

/**
 * 团队功能协议：渲染层逐字段严格校验，少一个字段就整条报错。
 * 所有团队能力关闭、标成暂不可用，界面只保留个人空间。
 */
export const TEAM_CONTRACT_UNAVAILABLE = {
  contract_version: "1",
  minimum_client_version: "0.0.0",
  compatibility: "TEMPORARILY_UNAVAILABLE",
  gates: { team_read: false, team_switch: false, team_invitation: false, team_billing: false, team_mutation: false },
  limits: { max_groups_including_personal: 1, max_members_per_team: 0, max_member_page_size: 0 },
} as const;

/**
 * 团队列表：一个都没有。个人空间的 id 由主进程给（不是正整数），渲染层对这里的 group_id
 * 要求正整数，伪造一条对不上号，所以留空。
 */
export const EMPTY_GROUP_LIST = { groups: [], user_group_roles: {} } as const;
