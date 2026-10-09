// selection-toolbar.js
import { reactExports } from "../vendor.js";
import { SelectionToolbarInner } from "./selection-toolbar-inner.jsx";

export const SelectionToolbar = reactExports.memo(SelectionToolbarInner);

export const PROMPT_PREVIEW_MAX = 200;
