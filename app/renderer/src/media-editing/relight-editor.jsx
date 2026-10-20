// relight-editor.jsx
import { kelvinToHex, roundAngle } from "./color-stops.js";
import { __jsx } from "../shared/jsx-runtime.js";
import { CANVAS_SIZE, ToolResetIcon } from "./plane-quad.jsx";
import { LightBall } from "./light-ball.jsx";
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "./lucide-icon-wraps.js";
import { dedupedToast } from "../infra/agent-http-client.js";
import { ToolSlider } from "./tool-slider.jsx";
import { LeftPanel, SegmentedControl } from "./segmented-control.jsx";
import { Ban, useCanvasBridge } from "./package.jsx";
import { presets } from "./presets.js";
import { CreditCostBadge, Tooltip } from "../generation/missing-asset-card.jsx";
import { BACKEND_VIBE_RELIGHT } from "../generation/to-workspace-browser-url.js";
import { invalid$6 } from "../canvas-v3/canvas-v3-model.js";
const DEFAULT_COLOR_TEMP = 6500;
const MAX_LIGHTS = 1;
const LIGHT_TYPE_OPTIONS = [
  {
    value: "spotlight",
    labelKey: "light_type_hard",
  },
  {
    value: "rectAreaLight",
    labelKey: "light_type_soft",
  },
  {
    value: "directionalLight",
    labelKey: "light_type_skylight",
  },
];
const AZIMUTH_RANGE = {
  min: -180,
  max: 180,
};
const ELEVATION_RANGE = {
  min: -90,
  max: 90,
};
const ANGLE_STEP = 5;
const POWER_RANGE = {
  min: 10,
  max: 100,
};
const POWER_STEP = 10;
const COLOR_TEMP_RANGE = {
  min: 1e3,
  max: 1e4,
};
const COLOR_TEMP_STEP = 100;
const BACKGROUND_OPTIONS = [
  {
    value: "default",
    labelKey: "background_default",
  },
  {
    value: "black",
    labelKey: "background_black",
  },
  {
    value: "white",
    labelKey: "background_white",
  },
];
const NO_EFFECT_ID = "default";
const DEFAULT_LIGHT_COLOR = "#ffdf99";
const DEFAULT_LIGHTS = [
  {
    id: "light1",
    type: "spotlight",
    intensity: 50,
    horizontalAngle: 0,
    verticalAngle: 90,
    colorMode: "kelvin",
    color: DEFAULT_LIGHT_COLOR,
    colorTemp: DEFAULT_COLOR_TEMP,
  },
];
const LIGHT_INPUT_IDS = ["light1", "light2", "light3"];
function normalizeEffectType(raw) {
  if (!raw) return "default";
  return raw.trim();
}
function parsePresetPrompt(rawPrompt) {
  let inputs;
  try {
    inputs = JSON.parse(rawPrompt);
  } catch {
    return null;
  }
  const inputMap = new Map(inputs.map((input) => [input.id, input]));
  const settingInput = inputMap.get("setting");
  let settingData = {};
  if (settingInput?.data) {
    try {
      settingData = JSON.parse(settingInput.data);
    } catch {}
  }
  const studioMode = settingData.background || "default";
  const effectType = normalizeEffectType(settingData.effect);
  const lights = [];
  LIGHT_INPUT_IDS.forEach((lightInputId) => {
    const lightInput = inputMap.get(lightInputId);
    if (!lightInput?.data) return;
    try {
      const raw = JSON.parse(lightInput.data);
      const hasKelvin = !!raw.kelvin;
      lights.push({
        id: lightInputId,
        type: raw.lightType || "spotlight",
        horizontalAngle: parseFloat(raw.azimuth || "0") || 0,
        verticalAngle: parseFloat(raw.elevation || "0") || 0,
        intensity: Math.round(parseFloat(raw.lightness || "1") * 10),
        color: raw.color || "#ffffff",
        colorTemp: hasKelvin
          ? Number.parseInt(raw.kelvin ?? "", 10) || DEFAULT_COLOR_TEMP
          : DEFAULT_COLOR_TEMP,
        colorMode: hasKelvin ? "kelvin" : "hex",
      });
    } catch {}
  });
  return {
    lights,
    studioMode,
    effectType,
  };
}
const PresetCard = ({ isSelected, label, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-[90px] flex-col items-center gap-1 text-left transition-opacity ${isSelected ? "" : "hover:opacity-90"}`}
    >
      <div
        className={`relative size-[90px] overflow-hidden rounded-md bg-hl_bg_05 transition-all duration-200 ${isSelected ? "ring-[1.5px] ring-hl_text_00" : "ring-0"}`}
      >
        {children}
      </div>
      <span
        className={`w-full truncate text-center text-[11px] leading-4 ${isSelected ? "font-medium text-hl_text_00" : "font-normal text-hl_text_02"}`}
        title={label}
      >
        {label}
      </span>
    </button>
  );
};
const PresetMediaCover = ({ coverUrl, videoUrl, alt, isActive }) => {
  const videoRef = reactExports.useRef(null);
  const [hovered, setHovered] = reactExports.useState(false);
  const shouldPlay = (isActive || hovered) && Boolean(videoUrl);
  reactExports.useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !shouldPlay) return;
    videoElement.currentTime = 0;
    videoElement.play().catch(() => {});
  }, [shouldPlay]);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover only previews media; the parent button owns activation
    <div
      className="relative size-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {coverUrl && (
        <img
          src={coverUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={240}
          height={240}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {shouldPlay && videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted={true}
          loop={true}
          playsInline={true}
          preload="metadata"
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
};
const CATEGORY_TABS = [
  {
    key: "all",
    labelKey: "preset_tab_all",
  },
  {
    key: "portrait",
    labelKey: "preset_tab_portrait",
  },
  {
    key: "product",
    labelKey: "preset_tab_product",
  },
];
const NO_EFFECT_PRESET = {
  id: NO_EFFECT_ID,
  title: "原图",
  category: void 0,
  thumbUrl: "",
  videoUrl: "",
  rawPrompt: "",
  parsed: null,
  parsedPrompt: {
    lights: [],
    studioMode: "default",
    effectType: "default",
  },
  effectType: "default",
};
const PresetsPanel = ({
  translate,
  selectedPresetId,
  onSelect,
  onResetToOriginal,
  panelMode,
}) => {
  const [activeCategory, setActiveCategory] = reactExports.useState("all");
  const all = reactExports.useMemo(() => {
    return presets.map((preset) => {
      const parsed = parsePresetPrompt(preset.rawPrompt) || {
        lights: [],
        studioMode: "default",
        effectType: "default",
      };
      return {
        ...preset,
        parsedPrompt: parsed,
        effectType: parsed.effectType ?? "default",
      };
    });
  }, []);
  const list = reactExports.useMemo(() => {
    if (activeCategory === "all") return [NO_EFFECT_PRESET, ...all];
    return all.filter((preset) => preset.category === activeCategory);
  }, [all, activeCategory]);
  const handleSelect = (preset) => {
    if (preset.id === NO_EFFECT_ID) {
      onResetToOriginal();
      return;
    }
    onSelect(preset);
  };
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="flex gap-2 overflow-x-auto px-4">
        {CATEGORY_TABS.map(({ key, labelKey }) => {
          const active = key === activeCategory;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium transition-colors ${active ? "border-hl_text_00 bg-hl_text_00 text-hl_text_05" : "border-hl_line_01 text-hl_text_02 hover:bg-hl_bg_05 hover:text-hl_text_00"}`}
            >
              {translate(labelKey)}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-[repeat(3,90px)] gap-x-3 gap-y-2 px-4 pb-3">
        {list.map((preset) => {
          const isSelected =
            (panelMode === "presets" && selectedPresetId === preset.id) ||
            (preset.id === NO_EFFECT_ID &&
              panelMode === "presets" &&
              !selectedPresetId);
          return (
            <PresetCard
              key={preset.id}
              isSelected={isSelected}
              label={
                preset.id === NO_EFFECT_ID
                  ? translate("preset_no_effect")
                  : preset.title
              }
              onClick={() => handleSelect(preset)}
            >
              {preset.id === NO_EFFECT_ID || !preset.thumbUrl ? (
                <div className="flex size-full items-center justify-center bg-hl_bg_05 text-hl_text_03">
                  <Ban size={40} strokeWidth={1.5} />
                </div>
              ) : (
                <PresetMediaCover
                  coverUrl={preset.thumbUrl}
                  videoUrl={preset.videoUrl || void 0}
                  alt={preset.title}
                  isActive={isSelected}
                />
              )}
            </PresetCard>
          );
        })}
      </div>
    </div>
  );
};
const BackgroundPanel = ({ translate, studioMode, onChange }) => {
  const options = BACKGROUND_OPTIONS.map(({ value, labelKey }) => ({
    value,
    label: translate(labelKey),
  }));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-hl_text_02 text-[13px] font-medium leading-5">
        {translate("background_label")}
      </span>
      <SegmentedControl
        options={options}
        value={studioMode}
        dataActionUiIdPrefix="canvas.relight.background"
        onChange={(value) => onChange(value)}
      />
    </div>
  );
};
const ColorSection = ({
  translate,
  colorMode,
  colorTemp,
  onColorModeChange,
  onColorTempChange,
}) => {
  const handleColorTempChange = reactExports.useCallback(
    (kelvin) => {
      if (colorMode !== "kelvin") onColorModeChange("kelvin");
      onColorTempChange(kelvin);
    },
    [colorMode, onColorModeChange, onColorTempChange],
  );
  return (
    <ToolSlider
      className="min-w-0"
      dataActionUiId="canvas.relight.color-temperature"
      label={translate("color_temp_label")}
      value={colorTemp}
      min={COLOR_TEMP_RANGE.min}
      max={COLOR_TEMP_RANGE.max}
      step={COLOR_TEMP_STEP}
      markerValue={DEFAULT_COLOR_TEMP}
      thumbSize={18}
      trackAppearance="temperature"
      formatValue={(kelvin) => `${kelvin}K`}
      onChange={handleColorTempChange}
    />
  );
};
const formatDegree = (angle) => `${roundAngle(angle)}°`;
const formatIntensity = (intensity) => String(intensity);
const LightingPanel = ({
  translate,
  lights,
  activeLightId,
  onUpdateLight,
}) => {
  const activeLight = reactExports.useMemo(
    () => lights.find((light) => light.id === activeLightId) ?? lights[0],
    [activeLightId, lights],
  );
  const lightTypeOpts = reactExports.useMemo(
    () =>
      LIGHT_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        label: translate(option.labelKey),
      })),
    [translate],
  );
  const updateActive = reactExports.useCallback(
    (updates) => {
      if (activeLightId) onUpdateLight(activeLightId, updates);
    },
    [activeLightId, onUpdateLight],
  );
  if (!activeLight) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <ToolSlider
          className="min-w-0"
          dataActionUiId="canvas.relight.azimuth"
          label={translate("horizontal_angle_label")}
          value={activeLight.horizontalAngle}
          min={AZIMUTH_RANGE.min}
          max={AZIMUTH_RANGE.max}
          step={ANGLE_STEP}
          formatValue={formatDegree}
          onChange={(horizontalAngle) =>
            updateActive({
              horizontalAngle,
            })
          }
        />
        <ToolSlider
          className="min-w-0"
          dataActionUiId="canvas.relight.elevation"
          label={translate("vertical_angle_label")}
          value={activeLight.verticalAngle}
          min={ELEVATION_RANGE.min}
          max={ELEVATION_RANGE.max}
          step={ANGLE_STEP}
          formatValue={formatDegree}
          onChange={(verticalAngle) =>
            updateActive({
              verticalAngle,
            })
          }
        />
      </div>
      <ToolSlider
        className="min-w-0"
        dataActionUiId="canvas.relight.intensity"
        label={translate("light_intensity_label")}
        value={activeLight.intensity}
        min={POWER_RANGE.min}
        max={POWER_RANGE.max}
        step={POWER_STEP}
        formatValue={formatIntensity}
        onChange={(intensity) =>
          updateActive({
            intensity,
          })
        }
      />
      <ColorSection
        translate={translate}
        colorMode={activeLight.colorMode}
        colorTemp={activeLight.colorTemp}
        onColorModeChange={(mode) =>
          updateActive({
            colorMode: mode,
          })
        }
        onColorTempChange={(kelvin) =>
          updateActive({
            colorTemp: kelvin,
          })
        }
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-hl_text_02 text-[13px] font-medium leading-5">
          {translate("light_type_label")}
        </span>
        <SegmentedControl
          options={lightTypeOpts}
          value={activeLight.type}
          dataActionUiIdPrefix="canvas.relight.light-type"
          onChange={(lightType) =>
            updateActive({
              type: lightType,
            })
          }
        />
      </div>
    </div>
  );
};
const RelightControlsPanel = ({
  translate,
  state,
  dispatch,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <LightingPanel
        translate={translate}
        lights={state.lights}
        activeLightId={state.activeLightId}
        onUpdateLight={(lightId, updates) =>
          dispatch({
            type: "UPDATE_LIGHT",
            id: lightId,
            updates,
          })
        }
      />
      <BackgroundPanel
        translate={translate}
        studioMode={state.studioMode}
        onChange={(mode) =>
          dispatch({
            type: "SET_STUDIO_MODE",
            mode,
          })
        }
      />
    </div>
  );
};
const StudioPreview = (props) => {
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
const messages = {
  en: {
    // 工具标题 / 引导
    tool_title: "Lighting Studio",
    tool_subtitle:
      "Smart relighting — freely adjust light direction, intensity, and color",
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
    uploading_image_block_submit:
      "Image is still uploading, please wait a moment",
    reset: "Reset",
    error_no_image: "Please upload an image first",
    error_render_failed:
      "Failed to render lighting reference. Please try again",
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
const INITIAL_STATE = {
  lights: DEFAULT_LIGHTS,
  activeLightId: DEFAULT_LIGHTS[0].id,
  studioMode: "default",
  effectType: "default",
  panelMode: "presets",
  activeSubTab: "lighting",
  selectedPresetId: null,
  imageInfo: null,
};
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
function makeNewLight(lightId, slotIndex) {
  const preset =
    NEW_LIGHT_PRESET_ANGLES[slotIndex] ?? NEW_LIGHT_PRESET_ANGLES[0];
  return {
    id: lightId,
    type: "spotlight",
    intensity: 60,
    horizontalAngle: preset.h,
    verticalAngle: preset.v,
    colorMode: "kelvin",
    color: "#ffffff",
    colorTemp: DEFAULT_COLOR_TEMP,
  };
}
let nextLightId = 2;
function relightReducer(state, action) {
  switch (action.type) {
    case "SET_PANEL_MODE":
      return {
        ...state,
        panelMode: action.mode,
      };
    case "SET_ACTIVE_SUB_TAB":
      return {
        ...state,
        activeSubTab: action.tab,
      };
    case "SET_ACTIVE_LIGHT":
      return {
        ...state,
        activeLightId: action.id,
      };
    case "UPDATE_LIGHT": {
      const next = state.lights.map((light) =>
        light.id === action.id
          ? {
              ...light,
              ...action.updates,
            }
          : light,
      );
      return {
        ...state,
        lights: next,
        panelMode: "custom",
        selectedPresetId: null,
      };
    }
    case "UPDATE_LIGHTS_BATCH": {
      const updateMap = new Map(action.updates.map((lightUpdate) => [lightUpdate.id, lightUpdate]));
      const next = state.lights.map((light) => {
        const lightUpdate = updateMap.get(light.id);
        if (!lightUpdate) return light;
        return {
          ...light,
          horizontalAngle: lightUpdate.horizontalAngle,
          verticalAngle: lightUpdate.verticalAngle,
        };
      });
      return {
        ...state,
        lights: next,
        panelMode: "custom",
        selectedPresetId: null,
      };
    }
    case "ADD_LIGHT": {
      if (state.lights.length >= MAX_LIGHTS) return state;
      const lightId = `light${nextLightId++}`;
      const newLight = makeNewLight(lightId, state.lights.length);
      return {
        ...state,
        lights: [...state.lights, newLight],
        activeLightId: lightId,
        panelMode: "custom",
        selectedPresetId: null,
      };
    }
    case "DELETE_LIGHT": {
      if (state.lights.length <= 1) return state;
      const next = state.lights.filter((light) => light.id !== action.id);
      const activeStillThere = next.some(
        (light) => light.id === state.activeLightId,
      );
      return {
        ...state,
        lights: next,
        activeLightId: activeStillThere ? state.activeLightId : next[0].id,
        panelMode: "custom",
        selectedPresetId: null,
      };
    }
    case "SET_STUDIO_MODE":
      return {
        ...state,
        studioMode: action.mode,
        panelMode: "custom",
        selectedPresetId: null,
      };
    case "SET_EFFECT_TYPE":
      return {
        ...state,
        effectType: action.effect,
        panelMode: "custom",
        selectedPresetId: null,
      };
    case "SELECT_PRESET": {
      const presetLight = action.lights[0];
      return {
        ...state,
        selectedPresetId: action.presetId,
        lights: presetLight ? [presetLight] : state.lights.slice(0, 1),
        activeLightId: presetLight?.id || state.activeLightId,
        studioMode: action.studioMode,
        effectType: action.effectType,
        panelMode: "presets",
      };
    }
    case "RESET_CUSTOM":
      return {
        ...state,
        lights: DEFAULT_LIGHTS,
        activeLightId: DEFAULT_LIGHTS[0].id,
        studioMode: "default",
        effectType: "default",
        panelMode: "presets",
        selectedPresetId: null,
      };
    case "ENSURE_CUSTOM_MODE":
      if (state.panelMode === "custom") return state;
      return {
        ...state,
        panelMode: "custom",
        selectedPresetId: null,
      };
    case "SET_IMAGE":
      return {
        ...state,
        imageInfo: action.info,
      };
    default:
      return state;
  }
}
const MAX_RELIGHT_LIGHTS = 1;
function toLightRawJson(light) {
  const raw = {
    lightType: light.type,
    lightness: (light.intensity / 10).toFixed(1),
    azimuth: `${roundAngle(light.horizontalAngle)}°`,
    elevation: `${roundAngle(light.verticalAngle)}°`,
  };
  if (light.colorMode === "kelvin") {
    raw.kelvin = `${light.colorTemp}K`;
  } else {
    raw.color = light.color;
  }
  return JSON.stringify(raw);
}
function buildRelightControlParams(args) {
  const limited = args.lights.slice(0, MAX_RELIGHT_LIGHTS);
  const serializeAt = (index) => {
    const light = limited[index];
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
        height: Math.max(
          1,
          Math.round((userImageHeight / userImageWidth) * MAX_EDGE),
        ),
      }
    : {
        width: Math.max(
          1,
          Math.round((userImageWidth / userImageHeight) * MAX_EDGE),
        ),
        height: MAX_EDGE,
      };
}
function toLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function toSRGB(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(
    255 *
      (clamped <= 31308e-7
        ? 12.92 * clamped
        : 1.055 * clamped ** (1 / 2.4) - 0.055),
  );
}
function colorRGB(hex) {
  const expanded = /^#[0-9a-f]{3}$/i.test(hex)
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
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
function finite(value, field, min = 0) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) invalid$6(field);
  return value;
}
function prepareLight(light) {
  const azimuthRadians = (finite(light.horizontalAngle, 0) * Math.PI) / 180;
  const elevationRadians = (finite(light.verticalAngle, 0) * Math.PI) / 180;
  const soft = light.type === "rectAreaLight";
  const directional = light.type === "directionalLight";
  const angle = Math.PI / (soft ? 2.5 : 5.5);
  return {
    x: Math.cos(elevationRadians) * Math.sin(azimuthRadians),
    y: Math.sin(elevationRadians),
    z: Math.cos(elevationRadians) * Math.cos(azimuthRadians),
    directional,
    intensity:
      ((Math.max(0, Math.min(100, finite(light.intensity, 50))) / 100) * 3.2 +
        0.3) *
      (directional ? 1.15 : soft ? 0.95 : 1.2),
    color: colorRGB(
      light.colorMode === "hex"
        ? light.color
        : kelvinToHex(finite(light.colorTemp, 5600)),
    ),
    cone: Math.cos(angle),
    innerCone: Math.cos(angle * (1 - (soft ? 0.75 : 0.22))),
  };
}
function renderRelightPixels(params) {
  const { width, height } = getReferenceSize(
    params.userImageWidth,
    params.userImageHeight,
  );
  const data = new Uint8ClampedArray(width * height * 4);
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
  const scale = (2 * TAN_HALF_FOV) / height;
  const radius = 1 / (scale * Math.sqrt(CAMERA_Z * CAMERA_Z - 1));
  const radiusSquared = radius * radius;
  const minX = Math.max(0, Math.floor(width / 2 - radius - 1));
  const maxX = Math.min(width - 1, Math.ceil(width / 2 + radius + 1));
  const minY = Math.max(0, Math.floor(height / 2 - radius - 1));
  const maxY = Math.min(height - 1, Math.ceil(height / 2 + radius + 1));
  for (let pixelRow = minY; pixelRow <= maxY; pixelRow++) {
    for (let pixelColumn = minX; pixelColumn <= maxX; pixelColumn++) {
      let pixelOffsetX = pixelColumn + 0.5 - width / 2;
      let pixelOffsetY = height / 2 - pixelRow - 0.5;
      const distance = Math.hypot(pixelOffsetX, pixelOffsetY);
      if (distance > radius + Math.SQRT1_2) continue;
      let coverage = 1;
      if (distance > radius - Math.SQRT1_2) {
        let hits = 0;
        for (let sampleYIndex = 0; sampleYIndex < 4; sampleYIndex++) {
          for (let sampleXIndex = 0; sampleXIndex < 4; sampleXIndex++) {
            const sampleXOffset = pixelOffsetX + (sampleXIndex + 0.5) / 4 - 0.5;
            const sampleYOffset = pixelOffsetY + (sampleYIndex + 0.5) / 4 - 0.5;
            if (sampleXOffset * sampleXOffset + sampleYOffset * sampleYOffset <= radiusSquared) hits++;
          }
        }
        if (!hits) continue;
        coverage = hits / 16;
        if (distance >= radius) {
          const shrink = (radius * (1 - 1e-8)) / distance;
          pixelOffsetX *= shrink;
          pixelOffsetY *= shrink;
        }
      }
      const viewPlaneX = pixelOffsetX * scale;
      const viewPlaneY = pixelOffsetY * scale;
      const rayDirectionLengthSquared = 1 + viewPlaneX * viewPlaneX + viewPlaneY * viewPlaneY;
      const rayDistance =
        (CAMERA_Z -
          Math.sqrt(
            Math.max(0, CAMERA_Z * CAMERA_Z - rayDirectionLengthSquared * (CAMERA_Z * CAMERA_Z - 1)),
          )) /
        rayDirectionLengthSquared;
      const surfaceNormalX = rayDistance * viewPlaneX;
      const surfaceNormalY = rayDistance * viewPlaneY;
      const surfaceNormalZ = CAMERA_Z - rayDistance;
      const invView = 1 / Math.sqrt(rayDirectionLengthSquared);
      const viewDirectionX = -viewPlaneX * invView;
      const viewDirectionY = -viewPlaneY * invView;
      const viewDirectionZ = invView;
      const normalViewDot = Math.max(1e-5, surfaceNormalX * viewDirectionX + surfaceNormalY * viewDirectionY + surfaceNormalZ * viewDirectionZ);
      const skyBlend = surfaceNormalY * 0.5 + 0.5;
      let linearRed =
        (studio.ambient +
          studio.hemisphere * (studio.ground[0] * (1 - skyBlend) + skyBlend)) /
        Math.PI;
      let linearGreen =
        (studio.ambient +
          studio.hemisphere * (studio.ground[1] * (1 - skyBlend) + skyBlend)) /
        Math.PI;
      let linearBlue =
        (studio.ambient +
          studio.hemisphere * (studio.ground[2] * (1 - skyBlend) + skyBlend)) /
        Math.PI;
      for (const light of lights) {
        let lightDirectionX = light.x;
        let lightDirectionY = light.y;
        let lightDirectionZ = light.z;
        let attenuation = 1;
        if (!light.directional) {
          lightDirectionX = lightDirectionX * LIGHT_DISTANCE - surfaceNormalX;
          lightDirectionY = lightDirectionY * LIGHT_DISTANCE - surfaceNormalY;
          lightDirectionZ = lightDirectionZ * LIGHT_DISTANCE - surfaceNormalZ;
          const inverseLength = 1 / Math.hypot(lightDirectionX, lightDirectionY, lightDirectionZ);
          lightDirectionX *= inverseLength;
          lightDirectionY *= inverseLength;
          lightDirectionZ *= inverseLength;
          const cosine = lightDirectionX * light.x + lightDirectionY * light.y + lightDirectionZ * light.z;
          const ramp = Math.max(
            0,
            Math.min(1, (cosine - light.cone) / (light.innerCone - light.cone)),
          );
          attenuation = ramp * ramp * (3 - 2 * ramp);
        }
        const normalLightDot = Math.max(0, surfaceNormalX * lightDirectionX + surfaceNormalY * lightDirectionY + surfaceNormalZ * lightDirectionZ);
        if (normalLightDot <= 0 || attenuation === 0) continue;
        const halfwayVectorX = lightDirectionX + viewDirectionX;
        const halfwayVectorY = lightDirectionY + viewDirectionY;
        const halfwayVectorZ = lightDirectionZ + viewDirectionZ;
        const invHalf = 1 / Math.hypot(halfwayVectorX, halfwayVectorY, halfwayVectorZ);
        const normalHalfwayDot = Math.max(0, (surfaceNormalX * halfwayVectorX + surfaceNormalY * halfwayVectorY + surfaceNormalZ * halfwayVectorZ) * invHalf);
        const viewHalfwayDot = Math.max(
          0,
          Math.min(1, (viewDirectionX * halfwayVectorX + viewDirectionY * halfwayVectorY + viewDirectionZ * halfwayVectorZ) * invHalf),
        );
        const alphaSquared = 0.3 ** 4;
        const denominator = normalHalfwayDot * normalHalfwayDot * (alphaSquared - 1) + 1;
        const distribution =
          alphaSquared / (Math.PI * denominator * denominator);
        const visibility =
          0.5 /
          (normalLightDot * Math.sqrt(normalViewDot * normalViewDot * (1 - alphaSquared) + alphaSquared) +
            normalViewDot * Math.sqrt(normalLightDot * normalLightDot * (1 - alphaSquared) + alphaSquared));
        const fresnel = 0.04 + 0.96 * (1 - viewHalfwayDot) ** 5;
        const radiance =
          light.intensity *
          attenuation *
          normalLightDot *
          (1 / Math.PI + distribution * visibility * fresnel);
        linearRed += light.color[0] * radiance;
        linearGreen += light.color[1] * radiance;
        linearBlue += light.color[2] * radiance;
      }
      const offset = (pixelRow * width + pixelColumn) * 4;
      data[offset] = toSRGB(linearRed);
      data[offset + 1] = toSRGB(linearGreen);
      data[offset + 2] = toSRGB(linearBlue);
      data[offset + 3] = Math.round(coverage * 255);
    }
  }
  return {
    width,
    height,
    data,
  };
}
function renderInWorker(params) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL(
        /* @vite-ignore */
        "" +
          new URL("./relight-reference.worker.js", import.meta.url)
            .href,
        import.meta.url,
      ),
      {
        type: "module",
        name: "relight-reference",
      },
    );
    let settled = false;
    const finish = (error, blob) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      if (error) reject(error);
      else if (blob) resolve(blob);
      else reject(new Error("Missing lighting reference PNG"));
    };
    const timer = setTimeout(
      () => finish(new Error("Lighting reference worker timed out")),
      15e3,
    );
    worker.onmessage = (event) => {
      const result = event.data;
      if (result.blob instanceof Blob && result.blob.size > 0)
        finish(void 0, result.blob);
      else finish(new Error(result.error || "Invalid lighting reference PNG"));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish(new Error(event.message || "Lighting reference worker failed"));
    };
    worker.onmessageerror = () =>
      finish(new Error("Lighting reference worker message failed"));
    try {
      worker.postMessage(params);
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
async function renderOnMainThread(params) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  const { width, height, data } = renderRelightPixels(params);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    const image = context.createImageData(width, height);
    image.data.set(data);
    context.putImageData(image, 0, 0);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
async function renderRelightReference(params) {
  try {
    if (
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined"
    ) {
      try {
        return await renderInWorker(params);
      } catch (error) {
        console.warn(
          "[renderRelightReference] Worker failed, falling back to Canvas 2D",
          error,
        );
      }
    }
    if (typeof document === "undefined") return null;
    return await renderOnMainThread(params);
  } catch (error) {
    console.error("[renderRelightReference] 渲染失败", error);
    return null;
  }
}
const RELIGHT_GENERATE_COUNT = 1;
const RELIGHT_CREDIT_COST = 60;
function readableError(error, serviceErrorMessage) {
  const raw = error instanceof Error ? error.message : String(error);
  if (/<!doctype\s+html|<html[\s>]/i.test(raw)) return serviceErrorMessage;
  return raw.length > 240 ? `${raw.slice(0, 240)}…` : raw;
}
function loadImageDimensions(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || 1024,
        height: image.naturalHeight || 1024,
      });
    image.onerror = () =>
      resolve({
        width: 1024,
        height: 1024,
      });
    image.src = url;
  });
}
export function RelightEditor({
  nodeId,
  imageUrl,
  imagePath,
  imageWidth,
  imageHeight,
  onClose,
}) {
  const { i18n, t } = useTranslation();
  const translate = reactExports.useMemo(
    () => (key) => {
      const locale = i18n.resolvedLanguage?.startsWith("zh") ? "zh" : "en";
      return messages[locale][key] ?? key;
    },
    [i18n.resolvedLanguage],
  );
  const { pickAsset, submitImg2Image, uploadFileToCdn } = useCanvasBridge();
  const [state, dispatch] = reactExports.useReducer(relightReducer, {
    ...INITIAL_STATE,
    imageInfo: imageUrl
      ? {
          url: imageUrl,
          pendingUpload: false,
        }
      : null,
  });
  const [sourcePath, setSourcePath] = reactExports.useState(imagePath ?? null);
  const [sourceSize, setSourceSize] = reactExports.useState({
    width: imageWidth,
    height: imageHeight,
  });
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const submitLockRef = reactExports.useRef(false);
  const handleBakeLights = reactExports.useCallback((results) => {
    dispatch({
      type: "UPDATE_LIGHTS_BATCH",
      updates: results.map((result) => ({
        ...result,
        horizontalAngle: roundAngle(result.horizontalAngle),
        verticalAngle: roundAngle(result.verticalAngle),
      })),
    });
  }, []);
  const handlePickImage = reactExports.useCallback(async () => {
    if (!pickAsset) return;
    try {
      const selected = (
        await pickAsset({
          type: "image",
        })
      )?.[0];
      if (!selected?.url || !selected.path) return;
      dispatch({
        type: "SET_IMAGE",
        info: {
          url: selected.url,
          pendingUpload: false,
        },
      });
      setSourcePath(selected.path);
      setSourceSize({
        width: selected.width,
        height: selected.height,
      });
    } catch (error) {
      dedupedToast.error(
        `${translate("error_upload_failed")}: ${readableError(error, translate("error_service_failed"))}`,
      );
    }
  }, [pickAsset, translate]);
  const handleReset = reactExports.useCallback(
    () =>
      dispatch({
        type: "RESET_CUSTOM",
      }),
    [],
  );
  const handleSelectPreset = reactExports.useCallback((preset) => {
    dispatch({
      type: "SELECT_PRESET",
      presetId: preset.id,
      lights: preset.parsedPrompt.lights?.slice(0, 1) ?? [],
      studioMode: preset.parsedPrompt.studioMode ?? "default",
      effectType: preset.effectType,
    });
  }, []);
  const handleSubmit = reactExports.useCallback(async () => {
    const sourceUrl = state.imageInfo?.url;
    if (
      submitLockRef.current ||
      !sourceUrl ||
      !sourcePath ||
      !submitImg2Image ||
      !uploadFileToCdn
    ) {
      return;
    }
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const dimensions =
        sourceSize.width && sourceSize.height
          ? {
              width: sourceSize.width,
              height: sourceSize.height,
            }
          : await loadImageDimensions(sourceUrl);
      const reference = await renderRelightReference({
        lights: state.lights,
        studioMode: state.studioMode,
        userImageWidth: dimensions.width,
        userImageHeight: dimensions.height,
      });
      if (!reference) throw new Error(translate("error_render_failed"));
      const referenceUrl = await uploadFileToCdn(
        new File([reference], `relight-reference-${Date.now()}.png`, {
          type: "image/png",
        }),
      );
      const params = buildRelightControlParams({
        lights: state.lights,
        studioMode: state.studioMode,
        effectType: state.effectType,
      });
      const submission = submitImg2Image(
        nodeId,
        "Relight",
        "relight_image_v4",
        {
          ...params,
          reference_img: referenceUrl,
        },
        [sourcePath],
        void 0,
        RELIGHT_GENERATE_COUNT,
        "Relight",
        false,
        BACKEND_VIBE_RELIGHT,
      );
      onClose();
      const result = await submission;
      if (!result.success)
        throw new Error(result.error || translate("error_generic"));
    } catch (error) {
      dedupedToast.error(
        `${translate("error_generic")}: ${readableError(error, translate("error_service_failed"))}`,
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    nodeId,
    onClose,
    sourcePath,
    sourceSize,
    state,
    submitImg2Image,
    translate,
    uploadFileToCdn,
  ]);
  const disabled =
    isSubmitting ||
    !state.imageInfo?.url ||
    !sourcePath ||
    !submitImg2Image ||
    !uploadFileToCdn;
  const totalCreditCost = RELIGHT_CREDIT_COST;
  const estimatedCostLabel = t("canvas.billing.estimatedCost", {
    cost: totalCreditCost,
    defaultValue: "预计消耗 {{cost}} 积分",
  });
  return (
    <div className="multi-angle-theme flex h-full min-h-0 flex-col bg-hl_bg_01">
      <header className="shrink-0 px-4 pb-1 pt-3 pr-10">
        <h2 className="text-hl_text_00 text-sm font-semibold leading-5">
          {translate("tool_title")}
        </h2>
      </header>
      <div className="min-h-0 flex-1">
        <LeftPanel
          leftContentScrollable={false}
          leftContent={
            <div className="flex h-full min-h-0 flex-col">
              <div
                className="relative mx-3 mb-3 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--hl_relight_surface)] p-3"
                data-action-ui-id="canvas.relight.control-card"
              >
                <button
                  type="button"
                  data-action-ui-id="canvas.relight.reset"
                  className="absolute right-2 top-2 z-10 flex h-7 items-center gap-1 rounded-md px-2 text-xs text-hl_text_03 transition-colors hover:bg-hl_bg_07 hover:text-hl_text_00 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={handleReset}
                >
                  <ToolResetIcon />
                  <span>{translate("reset")}</span>
                </button>
                <div className="h-[212px] shrink-0">
                  <StudioPreview
                    translate={translate}
                    lights={state.lights}
                    activeLightId={state.activeLightId}
                    imageUrl={state.imageInfo?.url ?? null}
                    studioMode={state.studioMode}
                    isInteractionDisabled={isSubmitting}
                    onBakeLights={handleBakeLights}
                    onSelectActiveLight={(lightId) =>
                      dispatch({
                        type: "SET_ACTIVE_LIGHT",
                        id: lightId,
                      })
                    }
                    onUploadClick={() => void handlePickImage()}
                  />
                </div>
                <section
                  className="nowheel min-h-0 flex-1 overflow-y-auto overscroll-contain pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  onWheelCapture={(event) => event.stopPropagation()}
                >
                  <RelightControlsPanel
                    translate={translate}
                    state={state}
                    dispatch={dispatch}
                  />
                </section>
              </div>
            </div>
          }
          leftFooter={null}
          rightScrollClassName="mt-2"
          rightContent={
            <section
              className="nowheel flex flex-col overscroll-contain pb-3"
              onWheelCapture={(event) => event.stopPropagation()}
            >
              <PresetsPanel
                translate={translate}
                selectedPresetId={state.selectedPresetId}
                panelMode={state.panelMode}
                onSelect={handleSelectPreset}
                onResetToOriginal={handleReset}
              />
            </section>
          }
          rightFooter={
            <div className="flex shrink-0 items-center justify-end gap-2 bg-hl_bg_01 px-4 py-2">
              {!isSubmitting && (
                <Tooltip content={estimatedCostLabel} side="top">
                  <span
                    className="inline-flex h-8 shrink-0 items-center rounded-md px-2 transition-colors duration-150 hover:bg-[var(--canvas-controls-hover)]"
                    data-action-ui-id="popover.credit-cost"
                  >
                    <CreditCostBadge cost={totalCreditCost} compact={true} />
                  </span>
                </Tooltip>
              )}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={disabled}
                aria-label={translate(
                  isSubmitting ? "generating_label" : "generate_button",
                )}
                title={translate(
                  isSubmitting ? "generating_label" : "generate_button",
                )}
                className="flex size-8 items-center justify-center rounded-md bg-hl_text_00 text-[13px] text-hl_text_05 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                data-action-ui-id="canvas.relight.generate"
              >
                {isSubmitting ? (
                  <Loader2
                    size={14}
                    strokeWidth={1.5}
                    className="animate-spin"
                  />
                ) : (
                  <span aria-hidden="true">↑</span>
                )}
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
