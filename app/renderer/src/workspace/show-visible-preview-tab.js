// show-visible-preview-tab.js
import { visiblePreviewTabsStore } from "./create-visible-preview-tabs-store.js";

export function showVisiblePreviewTab(entry) {
  visiblePreviewTabsStore.show(entry);
}
