// relight-reducer.jsx
import { __jsx } from "../shared/jsx-runtime.js";
import {
  DEFAULT_COLOR_TEMP$1,
  DEFAULT_LIGHTS,
  MAX_LIGHTS,
  kelvinToHex,
  roundAngle,
} from "./backdrop-gradient-stops.jsx";
import { CANVAS_SIZE } from "./camera-ball.jsx";
import { LightBall } from "./light-ball.jsx";
export const StudioPreview = (props) => {
  return (
    <section className="flex size-full items-center justify-center">
      <div className="flex aspect-square h-full max-w-full items-center justify-center">
        <div
          className="relative"
          style={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
          }}
        >
          <LightBall
            lights={props.lights}
            activeLightId={props.activeLightId}
            imageUrl={props.imageUrl}
            isInteractionDisabled={props.isInteractionDisabled}
            studioMode={props.studioMode}
            onBakeLights={props.onBakeLights}
            onSelectActiveLight={props.onSelectActiveLight}
            onUploadClick={props.onUploadClick}
            translate={props.translate}
          />
        </div>
      </div>
    </section>
  );
};
export const messages$1 = {
  en: {
    // 工具标题 / 引导
    tool_title: "Lighting Studio",
    tool_subtitle: "Smart relighting — freely adjust light direction, intensity, and color",
    upload_prompt: "Upload an image to start",
    upload_hint: "PNG / JPG / WEBP",
    upload_button: "Upload",
    upload_image_caption: "Upload an image",
    // 顶层 Tab
    tab_presets: "Presets",
    tab_custom: "Custom",
    // Custom 子 Tab
    subtab_lighting: "Lighting",
    subtab_background: "Background",
    subtab_effects: "Effects",
    // Presets 分类
    preset_tab_all: "All",
    preset_tab_portrait: "Portrait",
    preset_tab_product: "Product",
    preset_no_effect: "Default",
    // Lighting 面板
    light_1_label: "Light 1",
    light_2_label: "Light 2",
    light_3_label: "Light 3",
    light_add: "Add light",
    light_delete: "Remove",
    light_type_label: "Light type",
    light_type_hard: "Hard Direct",
    light_type_soft: "Soft Diffuse",
    light_type_skylight: "Sky",
    light_intensity_label: "Intensity",
    horizontal_angle_label: "Azimuth",
    vertical_angle_label: "Elevation",
    color_label: "Color",
    color_mode_hex: "HEX",
    color_mode_kelvin: "Kelvin",
    color_temp_label: "Color Temp",
    // Background 面板
    background_label: "Background",
    background_default: "Default",
    background_black: "Studio Black",
    background_white: "Studio White",
    // Effects 面板
    effects_label: "Atmosphere",
    // 生成
    generate_button: "Relight",
    generating_label: "Generating...",
    uploading_label: "Uploading image...",
    uploading_image_label: "Uploading...",
    uploading_image_block_submit: "Image is still uploading, please wait a moment",
    reset: "Reset",
    error_no_image: "Please upload an image first",
    error_render_failed: "Failed to render lighting reference. Please try again",
    error_upload_failed: "Failed to upload reference image",
    error_service_failed: "Service request failed",
    error_generic: "Something went wrong. Please try again",
  },
  zh: {
    tool_title: "光影工作室",
    tool_subtitle: "智能重打光,自由调整光线方向、强度和色彩",
    upload_prompt: "上传图片开始",
    upload_hint: "支持 PNG / JPG / WEBP",
    upload_button: "上传图片",
    upload_image_caption: "上传图片",
    tab_presets: "预设",
    tab_custom: "自定义",
    subtab_lighting: "灯光",
    subtab_background: "背景",
    subtab_effects: "氛围",
    preset_tab_all: "全部",
    preset_tab_portrait: "人物",
    preset_tab_product: "产品",
    preset_no_effect: "默认",
    light_1_label: "灯光 1",
    light_2_label: "灯光 2",
    light_3_label: "灯光 3",
    light_add: "添加灯光",
    light_delete: "移除",
    light_type_label: "灯光类型",
    light_type_hard: "硬直射",
    light_type_soft: "柔性扩散",
    light_type_skylight: "天光",
    light_intensity_label: "强度",
    horizontal_angle_label: "水平角",
    vertical_angle_label: "垂直角",
    color_label: "颜色",
    color_mode_hex: "HEX",
    color_mode_kelvin: "色温",
    color_temp_label: "色温",
    background_label: "背景",
    background_default: "默认",
    background_black: "纯黑棚",
    background_white: "纯白棚",
    effects_label: "氛围特效",
    generate_button: "开始重打光",
    generating_label: "生成中…",
    uploading_label: "正在上传图片…",
    uploading_image_label: "上传中…",
    uploading_image_block_submit: "图片仍在上传,请稍候再点提交",
    reset: "重置参数",
    error_no_image: "请先上传一张图片",
    error_render_failed: "渲染光照参考失败,请重试",
    error_upload_failed: "上传参考图失败",
    error_service_failed: "服务请求失败",
    error_generic: "出错了，请重试",
  },
};
export const INITIAL_STATE$1 = {
  lights: DEFAULT_LIGHTS,
  activeLightId: DEFAULT_LIGHTS[0].id,
  studioMode: "default",
  effectType: "default",
  panelMode: "presets",
  activeSubTab: "lighting",
  selectedPresetId: null,
  imageInfo: null,
};
let nextLightId = 2;
const NEW_LIGHT_PRESET_ANGLES = [
  {
    h: 0,
    v: 0,
  },
  // 第 1 盏(DEFAULT_LIGHTS 已占,这里是兜底)
  {
    h: 60,
    v: 30,
  },
  // 第 2 盏:右上
  {
    h: -60,
    v: 30,
  },
  // 第 3 盏:左上
];
function makeNewLight(id2, slotIndex) {
  const preset2 = NEW_LIGHT_PRESET_ANGLES[slotIndex] ?? NEW_LIGHT_PRESET_ANGLES[0];
  return {
    id: id2,
    type: "spotlight",
    intensity: 60,
    horizontalAngle: preset2.h,
    verticalAngle: preset2.v,
    colorMode: "kelvin",
    color: "#ffffff",
    colorTemp: DEFAULT_COLOR_TEMP$1,
  };
}
export function relightReducer(state2, action) {
  switch (action.type) {
    case "SET_PANEL_MODE":
      return {
        ...state2,
        panelMode: action.mode,
      };
    case "SET_ACTIVE_SUB_TAB":
      return {
        ...state2,
        activeSubTab: action.tab,
      };
    case "SET_ACTIVE_LIGHT":
      return {
        ...state2,
        activeLightId: action.id,
      };
    case "UPDATE_LIGHT": {
      const next2 = state2.lights.map((l2) =>
        l2.id === action.id
          ? {
              ...l2,
              ...action.updates,
            }
          : l2,
      );
      return {
        ...state2,
        lights: next2,
        panelMode: "custom",
        selectedPresetId: null,
      };
    }
    case "UPDATE_LIGHTS_BATCH": {
      const updateMap = new Map(action.updates.map((u4) => [u4.id, u4]));
      const next2 = state2.lights.map((l2) => {
        const u4 = updateMap.get(l2.id);
        if (!u4) return l2;
        return {
          ...l2,
          horizontalAngle: u4.horizontalAngle,
          verticalAngle: u4.verticalAngle,
        };
      });
      return {
        ...state2,
        lights: next2,
        panelMode: "custom",
        selectedPresetId: null,
      };
    }
    case "ADD_LIGHT": {
      if (state2.lights.length >= MAX_LIGHTS) return state2;
      const id2 = `light${nextLightId++}`;
      const newLight = makeNewLight(id2, state2.lights.length);
      return {
        ...state2,
        lights: [...state2.lights, newLight],
        activeLightId: id2,
        panelMode: "custom",
        selectedPresetId: null,
      };
    }
    case "DELETE_LIGHT": {
      if (state2.lights.length <= 1) return state2;
      const next2 = state2.lights.filter((l2) => l2.id !== action.id);
      const activeStillThere = next2.some((l2) => l2.id === state2.activeLightId);
      return {
        ...state2,
        lights: next2,
        activeLightId: activeStillThere ? state2.activeLightId : next2[0].id,
        panelMode: "custom",
        selectedPresetId: null,
      };
    }
    case "SET_STUDIO_MODE":
      return {
        ...state2,
        studioMode: action.mode,
        panelMode: "custom",
        selectedPresetId: null,
      };
    case "SET_EFFECT_TYPE":
      return {
        ...state2,
        effectType: action.effect,
        panelMode: "custom",
        selectedPresetId: null,
      };
    case "SELECT_PRESET": {
      const presetLight = action.lights[0];
      return {
        ...state2,
        selectedPresetId: action.presetId,
        lights: presetLight ? [presetLight] : state2.lights.slice(0, 1),
        activeLightId: presetLight?.id || state2.activeLightId,
        studioMode: action.studioMode,
        effectType: action.effectType,
        panelMode: "presets",
      };
    }
    case "RESET_CUSTOM":
      return {
        ...state2,
        lights: DEFAULT_LIGHTS,
        activeLightId: DEFAULT_LIGHTS[0].id,
        studioMode: "default",
        effectType: "default",
        panelMode: "presets",
        selectedPresetId: null,
      };
    case "ENSURE_CUSTOM_MODE":
      if (state2.panelMode === "custom") return state2;
      return {
        ...state2,
        panelMode: "custom",
        selectedPresetId: null,
      };
    case "SET_IMAGE":
      return {
        ...state2,
        imageInfo: action.info,
      };
    default:
      return state2;
  }
}
const MAX_RELIGHT_LIGHTS = 1;
function toLightRawJson(light) {
  const raw2 = {
    lightType: light.type,
    lightness: (light.intensity / 10).toFixed(1),
    azimuth: `${roundAngle(light.horizontalAngle)}°`,
    elevation: `${roundAngle(light.verticalAngle)}°`,
  };
  if (light.colorMode === "kelvin") {
    raw2.kelvin = `${light.colorTemp}K`;
  } else {
    raw2.color = light.color;
  }
  return JSON.stringify(raw2);
}
export function buildRelightControlParams(args) {
  const limited = args.lights.slice(0, MAX_RELIGHT_LIGHTS);
  const serializeAt = (index2) => {
    const light = limited[index2];
    return light ? toLightRawJson(light) : "";
  };
  return {
    light1: serializeAt(0),
    light2: serializeAt(1),
    light3: serializeAt(2),
    background: args.studioMode,
    effect: args.effectType?.trim() || "default",
  };
}
const MAX_EDGE = 1024;
const REFERENCE_FALLBACK_INPUT_SIZE = {
  width: MAX_EDGE,
  height: 512,
};
const CAMERA_Z = 5.6;
const TAN_HALF_FOV = Math.tan((21 * Math.PI) / 180);
const LIGHT_DISTANCE = 4;
function getReferenceSize(userImageWidth, userImageHeight) {
  if (
    !Number.isFinite(userImageWidth) ||
    !Number.isFinite(userImageHeight) ||
    userImageWidth <= 0 ||
    userImageHeight <= 0
  ) {
    return {
      ...REFERENCE_FALLBACK_INPUT_SIZE,
    };
  }
  return userImageWidth >= userImageHeight
    ? {
        width: MAX_EDGE,
        height: Math.max(1, Math.round((userImageHeight / userImageWidth) * MAX_EDGE)),
      }
    : {
        width: Math.max(1, Math.round((userImageWidth / userImageHeight) * MAX_EDGE)),
        height: MAX_EDGE,
      };
}
function toLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function toSRGB(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(
    255 * (clamped <= 31308e-7 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055),
  );
}
function colorRGB(hex2) {
  const expanded = /^#[0-9a-f]{3}$/i.test(hex2)
    ? `#${hex2[1]}${hex2[1]}${hex2[2]}${hex2[2]}${hex2[3]}${hex2[3]}`
    : hex2;
  const value = /^#[0-9a-f]{6}$/i.test(expanded)
    ? Number.parseInt(expanded.slice(1), 16)
    : 16777215;
  return [
    toLinear((value >> 16) / 255),
    toLinear(((value >> 8) & 255) / 255),
    toLinear((value & 255) / 255),
  ];
}
const STUDIOS = {
  default: {
    ambient: 0.4,
    hemisphere: 0.25,
    ground: colorRGB("#dce0ea"),
  },
  black: {
    ambient: 0.2,
    hemisphere: 0.12,
    ground: colorRGB("#3a3f4a"),
  },
  white: {
    ambient: 0.5,
    hemisphere: 0.32,
    ground: colorRGB("#eceef3"),
  },
};
const finite = (value, fallback) => (Number.isFinite(value) ? value : fallback);
function prepareLight(light) {
  const az = (finite(light.horizontalAngle, 0) * Math.PI) / 180;
  const el = (finite(light.verticalAngle, 0) * Math.PI) / 180;
  const soft = light.type === "rectAreaLight";
  const directional = light.type === "directionalLight";
  const angle = Math.PI / (soft ? 2.5 : 5.5);
  return {
    x: Math.cos(el) * Math.sin(az),
    y: Math.sin(el),
    z: Math.cos(el) * Math.cos(az),
    directional,
    intensity:
      ((Math.max(0, Math.min(100, finite(light.intensity, 50))) / 100) * 3.2 + 0.3) *
      (directional ? 1.15 : soft ? 0.95 : 1.2),
    color: colorRGB(
      light.colorMode === "hex" ? light.color : kelvinToHex(finite(light.colorTemp, 5600)),
    ),
    cone: Math.cos(angle),
    innerCone: Math.cos(angle * (1 - (soft ? 0.75 : 0.22))),
  };
}
export function renderRelightPixels(params) {
  const { width, height } = getReferenceSize(params.userImageWidth, params.userImageHeight);
  const data2 = new Uint8ClampedArray(width * height * 4);
  const studio = STUDIOS[params.studioMode] ?? STUDIOS.default;
  const lights = params.lights.length
    ? params.lights.slice(0, 3).map(prepareLight)
    : [
        {
          x: 1 / Math.sqrt(6),
          y: 1 / Math.sqrt(6),
          z: 2 / Math.sqrt(6),
          directional: true,
          intensity: 1.2,
          color: [1, 1, 1],
          cone: 0,
          innerCone: 0,
        },
      ];
  const scale2 = (2 * TAN_HALF_FOV) / height;
  const radius = 1 / (scale2 * Math.sqrt(CAMERA_Z * CAMERA_Z - 1));
  const radiusSquared = radius * radius;
  const minX = Math.max(0, Math.floor(width / 2 - radius - 1));
  const maxX = Math.min(width - 1, Math.ceil(width / 2 + radius + 1));
  const minY = Math.max(0, Math.floor(height / 2 - radius - 1));
  const maxY = Math.min(height - 1, Math.ceil(height / 2 + radius + 1));
  for (let y4 = minY; y4 <= maxY; y4++) {
    for (let x2 = minX; x2 <= maxX; x2++) {
      let px = x2 + 0.5 - width / 2;
      let py = height / 2 - y4 - 0.5;
      const distance2 = Math.hypot(px, py);
      if (distance2 > radius + Math.SQRT1_2) continue;
      let coverage = 1;
      if (distance2 > radius - Math.SQRT1_2) {
        let hits = 0;
        for (let sy = 0; sy < 4; sy++) {
          for (let sx = 0; sx < 4; sx++) {
            const dx = px + (sx + 0.5) / 4 - 0.5;
            const dy = py + (sy + 0.5) / 4 - 0.5;
            if (dx * dx + dy * dy <= radiusSquared) hits++;
          }
        }
        if (!hits) continue;
        coverage = hits / 16;
        if (distance2 >= radius) {
          const shrink = (radius * (1 - 1e-8)) / distance2;
          px *= shrink;
          py *= shrink;
        }
      }
      const u4 = px * scale2;
      const v2 = py * scale2;
      const a2 = 1 + u4 * u4 + v2 * v2;
      const t2 =
        (CAMERA_Z - Math.sqrt(Math.max(0, CAMERA_Z * CAMERA_Z - a2 * (CAMERA_Z * CAMERA_Z - 1)))) /
        a2;
      const nx = t2 * u4;
      const ny = t2 * v2;
      const nz = CAMERA_Z - t2;
      const invView = 1 / Math.sqrt(a2);
      const vx = -u4 * invView;
      const vy = -v2 * invView;
      const vz = invView;
      const nv = Math.max(1e-5, nx * vx + ny * vy + nz * vz);
      const sky = ny * 0.5 + 0.5;
      let r2 =
        (studio.ambient + studio.hemisphere * (studio.ground[0] * (1 - sky) + sky)) / Math.PI;
      let g2 =
        (studio.ambient + studio.hemisphere * (studio.ground[1] * (1 - sky) + sky)) / Math.PI;
      let b3 =
        (studio.ambient + studio.hemisphere * (studio.ground[2] * (1 - sky) + sky)) / Math.PI;
      for (const light of lights) {
        let lx = light.x;
        let ly = light.y;
        let lz = light.z;
        let attenuation = 1;
        if (!light.directional) {
          lx = lx * LIGHT_DISTANCE - nx;
          ly = ly * LIGHT_DISTANCE - ny;
          lz = lz * LIGHT_DISTANCE - nz;
          const inverseLength = 1 / Math.hypot(lx, ly, lz);
          lx *= inverseLength;
          ly *= inverseLength;
          lz *= inverseLength;
          const cosine = lx * light.x + ly * light.y + lz * light.z;
          const ramp = Math.max(
            0,
            Math.min(1, (cosine - light.cone) / (light.innerCone - light.cone)),
          );
          attenuation = ramp * ramp * (3 - 2 * ramp);
        }
        const nl = Math.max(0, nx * lx + ny * ly + nz * lz);
        if (nl <= 0 || attenuation === 0) continue;
        const hx = lx + vx;
        const hy = ly + vy;
        const hz = lz + vz;
        const invHalf = 1 / Math.hypot(hx, hy, hz);
        const nh = Math.max(0, (nx * hx + ny * hy + nz * hz) * invHalf);
        const vh = Math.max(0, Math.min(1, (vx * hx + vy * hy + vz * hz) * invHalf));
        const alphaSquared = 0.3 ** 4;
        const denominator = nh * nh * (alphaSquared - 1) + 1;
        const distribution = alphaSquared / (Math.PI * denominator * denominator);
        const visibility =
          0.5 /
          (nl * Math.sqrt(nv * nv * (1 - alphaSquared) + alphaSquared) +
            nv * Math.sqrt(nl * nl * (1 - alphaSquared) + alphaSquared));
        const fresnel = 0.04 + 0.96 * (1 - vh) ** 5;
        const radiance =
          light.intensity * attenuation * nl * (1 / Math.PI + distribution * visibility * fresnel);
        r2 += light.color[0] * radiance;
        g2 += light.color[1] * radiance;
        b3 += light.color[2] * radiance;
      }
      const offset2 = (y4 * width + x2) * 4;
      data2[offset2] = toSRGB(r2);
      data2[offset2 + 1] = toSRGB(g2);
      data2[offset2 + 2] = toSRGB(b3);
      data2[offset2 + 3] = Math.round(coverage * 255);
    }
  }
  return {
    width,
    height,
    data: data2,
  };
}
