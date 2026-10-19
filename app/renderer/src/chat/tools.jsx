import { ArrowFilledIcon, MosaicIcon } from "./anchor-gap.jsx";
import { Tag as Tag$1 } from "@lezer/highlight";
import { Type as Type$1 } from "js-yaml";
import { Circle as Circle$1, MousePointer2, Pencil, Slash as Slash$1, Square as Square$2 } from "lucide-react";
export const TOOLS = [{
  id: "select",
  i18nKey: "imageEdit.toolSelect",
  defaultLabel: "Select",
  Icon: MousePointer2
}, {
  id: "rectangle",
  i18nKey: "imageEdit.toolRectangle",
  defaultLabel: "Rectangle",
  Icon: Square$2
}, {
  id: "ellipse",
  i18nKey: "imageEdit.toolEllipse",
  defaultLabel: "Ellipse",
  Icon: Circle$1
}, {
  id: "arrow",
  i18nKey: "imageEdit.toolArrow",
  defaultLabel: "Arrow",
  Icon: ArrowFilledIcon
}, {
  id: "line",
  i18nKey: "imageEdit.toolLine",
  defaultLabel: "Line",
  Icon: Slash$1
}, {
  id: "brush",
  i18nKey: "imageEdit.toolBrush",
  defaultLabel: "Brush",
  Icon: Pencil
}, {
  id: "text",
  i18nKey: "imageEdit.toolText",
  defaultLabel: "Text",
  Icon: Type$1
}, {
  id: "tag",
  i18nKey: "imageEdit.toolTag",
  defaultLabel: "Tag",
  Icon: Tag$1
}, {
  id: "mosaic",
  i18nKey: "imageEdit.toolMosaic",
  defaultLabel: "Mosaic",
  Icon: MosaicIcon
}];