/**
 * 生成最小可用的 `.pptx`（PowerPoint 2007+ 的 OOXML 包）。
 *
 * 用 `node:zlib` 自己写 ZIP，不引第三方依赖 —— 网关这边没有打包库，
 * 而 PPTX 就是一个 ZIP：`[Content_Types].xml` + `_rels/.rels` +
 * `ppt/presentation.xml` + 母版/版式/主题 + 每页 `slideN.xml`。
 *
 * 页面内容极简：一张图片铺满（可选标题）。不做动画/占位符继承，
 * 目标是"能被 PowerPoint / WPS / python-pptx 正常打开并显示图片"。
 */
import { deflateRawSync } from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

function zip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBytes, compressed);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(compressed.length, 20);
    dir.writeUInt32LE(entry.data.length, 24);
    dir.writeUInt16LE(nameBytes.length, 28);
    dir.writeUInt16LE(0, 30);
    dir.writeUInt16LE(0, 32);
    dir.writeUInt16LE(0, 34);
    dir.writeUInt16LE(0, 36);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBytes);
    offset += local.length + nameBytes.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, centralBuffer, end]);
}

export interface SlideImage {
  data: Buffer;
  type: "png" | "jpeg";
}

export interface SlideSpec {
  /** 单图（兼容旧用法）。 */
  image?: Buffer;
  /** 单图扩展名（png/jpeg）。 */
  imageType?: "png" | "jpeg";
  /** 多图排版（1~4 张）：1 铺满、2 并排、3 一大两小、4 田字。 */
  images?: SlideImage[];
  /** 可选标题，显示在图片下方的文本框里。 */
  title?: string;
  /** 纯文字页的要点（有 bullets 且没有图片时生成文字页）。 */
  bullets?: string[];
}

/** 幻灯片上的图片（兼容 `image` + `imageType` 的旧写法）。 */
function slideImages(spec: SlideSpec): SlideImage[] {
  if (Array.isArray(spec.images) && spec.images.length) return spec.images.slice(0, 4);
  if (spec.image) return [{ data: spec.image, type: spec.imageType ?? "png" }];
  return [];
}

const EMU_PER_INCH = 914400;
const SLIDE_CX = 12192000; // 13.333in 16:9
const SLIDE_CY = 6858000;

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function contentTypes(slides: number): string {
  const overrides = Array.from({ length: slides }, (_, i) =>
    `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="jpeg" ContentType="image/jpeg"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${overrides}
</Types>`;
}

function rootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
}

function presentation(slides: number): string {
  const ids = Array.from({ length: slides }, (_, i) =>
    `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${ids}</p:sldIdLst>
<p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
}

function presentationRels(slides: number): string {
  const slideRels = Array.from({ length: slides }, (_, i) =>
    `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slideRels}
<Relationship Id="rId${slides + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;
}

const GROUP = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;

function slideMaster(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>${GROUP}</p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;
}

const MASTER_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

function slideLayout(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree>${GROUP}</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;
}

const LAYOUT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

function theme(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Deck">
<a:themeElements>
<a:clrScheme name="Deck">
<a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
<a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>
<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>
<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Deck"><a:majorFont><a:latin typeface="Calibri"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme>
<a:fmtScheme name="Deck">
<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;
}

/** 把 n 张图摆进一页（返回 off/ext），按 1/2/3/4 张分别排版。 */
function gridCells(count: number, height: number): { x: number; y: number; cx: number; cy: number }[] {
  const gap = 91440;
  if (count <= 1) return [{ x: 0, y: 0, cx: SLIDE_CX, cy: height }];
  if (count === 2) {
    const cellWidth = Math.floor((SLIDE_CX - gap) / 2);
    return [0, 1].map((column) => ({ x: column * (cellWidth + gap), y: 0, cx: cellWidth, cy: height }));
  }
  if (count === 3) {
    const bigWidth = Math.floor(SLIDE_CX * 0.6);
    const smallWidth = SLIDE_CX - bigWidth - gap;
    const half = Math.floor((height - gap) / 2);
    return [
      { x: 0, y: 0, cx: bigWidth, cy: height },
      { x: bigWidth + gap, y: 0, cx: smallWidth, cy: half },
      { x: bigWidth + gap, y: half + gap, cx: smallWidth, cy: height - half - gap },
    ];
  }
  const cellWidth = Math.floor((SLIDE_CX - gap) / 2);
  const cellHeight = Math.floor((height - gap) / 2);
  return [0, 1, 2, 3].map((cell) => ({
    x: (cell % 2) * (cellWidth + gap),
    y: Math.floor(cell / 2) * (cellHeight + gap),
    cx: cellWidth,
    cy: cellHeight,
  }));
}

function slideXml(index: number, spec: SlideSpec): string {
  const images = slideImages(spec);
  const bullets = Array.isArray(spec.bullets) ? spec.bullets.filter((item) => typeof item === "string" && item.trim() !== "") : [];
  const hasTitle = typeof spec.title === "string" && spec.title.trim() !== "";
  const footer = hasTitle || bullets.length ? 900000 : 0;
  const bodyHeight = SLIDE_CY - footer;
  const pictures = images.map((_, order) => {
    const cell = gridCells(images.length, bodyHeight)[order]!;
    return `<p:pic><p:nvPicPr><p:cNvPr id="${order + 2}" name="Image ${index + 1}-${order + 1}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
<p:blipFill><a:blip r:embed="rId${order + 1}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
<p:spPr><a:xfrm><a:off x="${cell.x}" y="${cell.y}"/><a:ext cx="${cell.cx}" cy="${cell.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
  }).join("");
  const titleId = images.length + 2;
  const titleBox = hasTitle
    ? `<p:sp><p:nvSpPr><p:cNvPr id="${titleId}" name="Title ${index + 1}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="457200" y="${SLIDE_CY - 850000}"/><a:ext cx="${SLIDE_CX - 914400}" cy="700000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
<p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="2000"/><a:t>${esc(spec.title!)}</a:t></a:r></a:p></p:txBody></p:sp>`
    : "";
  const bulletsBox = bullets.length
    ? `<p:sp><p:nvSpPr><p:cNvPr id="${titleId + 1}" name="Body ${index + 1}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="${SLIDE_CX - 1828800}" cy="${bodyHeight - 914400}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
<p:txBody><a:bodyPr anchor="t"/><a:lstStyle/>${bullets.map((item) => `<a:p><a:pPr marL="342900" indent="-342900"/><a:r><a:rPr lang="zh-CN" sz="1800"/><a:t>${esc(item)}</a:t></a:r></a:p>`).join("")}</p:txBody></p:sp>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>${GROUP}
${pictures}${titleBox}${bulletsBox}
</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

/** 图片在包内的文件名：单图用 `slide3.png`，多图用 `slide3-2.png`。 */
function mediaName(index: number, order: number, type: SlideImage["type"]): string {
  return `slide${index + 1}${order === 0 ? "" : `-${order + 1}`}.${type}`;
}

function slideRels(index: number, images: SlideImage[]): string {
  const relationships = images.map((image, order) =>
    `<Relationship Id="rId${order + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName(index, order, image.type)}"/>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${relationships}
</Relationships>`;
}

/** 把若干图片打成一册 PPTX（每张一页，可选标题）。 */
export function buildDeck(slides: SlideSpec[]): Buffer {
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes(slides.length), "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rootRels(), "utf8") },
    { name: "ppt/presentation.xml", data: Buffer.from(presentation(slides.length), "utf8") },
    { name: "ppt/_rels/presentation.xml.rels", data: Buffer.from(presentationRels(slides.length), "utf8") },
    { name: "ppt/slideMasters/slideMaster1.xml", data: Buffer.from(slideMaster(), "utf8") },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: Buffer.from(MASTER_RELS, "utf8") },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: Buffer.from(slideLayout(), "utf8") },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", data: Buffer.from(LAYOUT_RELS, "utf8") },
    { name: "ppt/theme/theme1.xml", data: Buffer.from(theme(), "utf8") },
  ];
  slides.forEach((spec, index) => {
    const images = slideImages(spec);
    entries.push({ name: `ppt/slides/slide${index + 1}.xml`, data: Buffer.from(slideXml(index, spec), "utf8") });
    entries.push({ name: `ppt/slides/_rels/slide${index + 1}.xml.rels`, data: Buffer.from(slideRels(index, images), "utf8") });
    images.forEach((image, order) => {
      entries.push({ name: `ppt/media/${mediaName(index, order, image.type)}`, data: image.data });
    });
  });
  return zip(entries);
}
