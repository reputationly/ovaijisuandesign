// 项目详情页的标签页定义与可见性。
const PROJECT_DETAIL_TABS = [
  {
    key: "creations",
    labelKey: "project.tabs.creations",
    infoKey: "project.tabs.creationsInfo",
    visibleFor: ["local", "team"],
    comingSoon: false,
  },
  {
    key: "localAssets",
    labelKey: "project.tabs.localAssets",
    infoKey: "project.tabs.localAssetsInfo",
    comingSoonInfoKey: "project.tabs.localAssetsComingSoonInfo",
    visibleFor: ["local"],
    comingSoon: false,
  },
  {
    key: "cloudAssets",
    labelKey: "project.tabs.cloudAssets",
    infoKey: "project.tabs.cloudAssetsInfo",
    visibleFor: ["team"],
    comingSoon: false,
  },
];
export function visibleProjectDetailTabs(kind) {
  return PROJECT_DETAIL_TABS.filter((tab) => tab.visibleFor.includes(kind));
}
