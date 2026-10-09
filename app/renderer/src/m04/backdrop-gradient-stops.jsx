// backdrop-gradient-stops.jsx
import { reactExports } from "../vendor.js";
import { Ban } from "../m15/parse-item.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { SegmentedControl$1, ToolSlider } from "./multi-angle-editor.jsx";
import { presets } from "./ready-sub-image-card.jsx";
export const DEFAULT_COLOR_TEMP$1 = 6500;
export const MAX_LIGHTS = 1;
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
export const DEFAULT_LIGHTS = [
  {
    id: "light1",
    type: "spotlight",
    intensity: 50,
    horizontalAngle: 0,
    verticalAngle: 90,
    colorMode: "kelvin",
    color: DEFAULT_LIGHT_COLOR,
    colorTemp: DEFAULT_COLOR_TEMP$1,
  },
];
const LIGHT_INPUT_IDS = ["light1", "light2", "light3"];
function normalizeEffectType(raw2) {
  if (!raw2) return "default";
  return raw2.trim();
}
function parsePresetPrompt(rawPrompt) {
  let inputs;
  try {
    inputs = JSON.parse(rawPrompt);
  } catch {
    return null;
  }
  const inputMap = new Map(inputs.map((i2) => [i2.id, i2]));
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
  LIGHT_INPUT_IDS.forEach((id2) => {
    const lightInput = inputMap.get(id2);
    if (!lightInput?.data) return;
    try {
      const raw2 = JSON.parse(lightInput.data);
      const hasKelvin = !!raw2.kelvin;
      lights.push({
        id: id2,
        type: raw2.lightType || "spotlight",
        horizontalAngle: parseFloat(raw2.azimuth || "0") || 0,
        verticalAngle: parseFloat(raw2.elevation || "0") || 0,
        intensity: Math.round(parseFloat(raw2.lightness || "1") * 10),
        color: raw2.color || "#ffffff",
        colorTemp: hasKelvin
          ? Number.parseInt(raw2.kelvin ?? "", 10) || DEFAULT_COLOR_TEMP$1
          : DEFAULT_COLOR_TEMP$1,
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
const PresetCard = ({ isSelected, label, onClick, children: children2 }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-[90px] flex-col items-center gap-1 text-left transition-opacity ${isSelected ? "" : "hover:opacity-90"}`}
    >
      <div
        className={`relative size-[90px] overflow-hidden rounded-md bg-hl_bg_05 transition-all duration-200 ${isSelected ? "ring-[1.5px] ring-hl_text_00" : "ring-0"}`}
      >
        {children2}
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
const PresetMediaCover = ({ coverUrl, videoUrl, alt, isActive: isActive2 }) => {
  const videoRef = reactExports.useRef(null);
  const [hovered, setHovered] = reactExports.useState(false);
  const shouldPlay = (isActive2 || hovered) && Boolean(videoUrl);
  reactExports.useEffect(() => {
    const v2 = videoRef.current;
    if (!v2 || !shouldPlay) return;
    v2.currentTime = 0;
    v2.play().catch(() => {});
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
export const PresetsPanel = ({
  translate: translate2,
  selectedPresetId,
  onSelect,
  onResetToOriginal,
  panelMode,
}) => {
  const [activeCategory, setActiveCategory] = reactExports.useState("all");
  const all2 = reactExports.useMemo(() => {
    return presets.map((p3) => {
      const parsed = parsePresetPrompt(p3.rawPrompt) || {
        lights: [],
        studioMode: "default",
        effectType: "default",
      };
      return {
        ...p3,
        parsedPrompt: parsed,
        effectType: parsed.effectType ?? "default",
      };
    });
  }, []);
  const list2 = reactExports.useMemo(() => {
    if (activeCategory === "all") return [NO_EFFECT_PRESET, ...all2];
    return all2.filter((p3) => p3.category === activeCategory);
  }, [all2, activeCategory]);
  const handleSelect = (preset2) => {
    if (preset2.id === NO_EFFECT_ID) {
      onResetToOriginal();
      return;
    }
    onSelect(preset2);
  };
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="flex gap-2 overflow-x-auto px-4">
        {CATEGORY_TABS.map(({ key: key2, labelKey }) => {
          const active2 = key2 === activeCategory;
          return (
            <button
              key={key2}
              type="button"
              onClick={() => setActiveCategory(key2)}
              className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium transition-colors ${active2 ? "border-hl_text_00 bg-hl_text_00 text-hl_text_05" : "border-hl_line_01 text-hl_text_02 hover:bg-hl_bg_05 hover:text-hl_text_00"}`}
            >
              {translate2(labelKey)}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-[repeat(3,90px)] gap-x-3 gap-y-2 px-4 pb-3">
        {list2.map((preset2) => {
          const isSelected =
            (panelMode === "presets" && selectedPresetId === preset2.id) ||
            (preset2.id === NO_EFFECT_ID && panelMode === "presets" && !selectedPresetId);
          return (
            <PresetCard
              key={preset2.id}
              isSelected={isSelected}
              label={preset2.id === NO_EFFECT_ID ? translate2("preset_no_effect") : preset2.title}
              onClick={() => handleSelect(preset2)}
            >
              {preset2.id === NO_EFFECT_ID || !preset2.thumbUrl ? (
                <div className="flex size-full items-center justify-center bg-hl_bg_05 text-hl_text_03">
                  <Ban size={40} strokeWidth={1.5} />
                </div>
              ) : (
                <PresetMediaCover
                  coverUrl={preset2.thumbUrl}
                  videoUrl={preset2.videoUrl || void 0}
                  alt={preset2.title}
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
const BackgroundPanel = ({ translate: translate2, studioMode, onChange }) => {
  const options = BACKGROUND_OPTIONS.map(({ value, labelKey }) => ({
    value,
    label: translate2(labelKey),
  }));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-hl_text_02 text-[13px] font-medium leading-5">
        {translate2("background_label")}
      </span>
      <SegmentedControl$1
        options={options}
        value={studioMode}
        dataActionUiIdPrefix="canvas.relight.background"
        onChange={(value) => onChange(value)}
      />
    </div>
  );
};
export const roundAngle = (deg) => Math.round(deg);
const ColorSection = ({
  translate: translate2,
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
      label={translate2("color_temp_label")}
      value={colorTemp}
      min={COLOR_TEMP_RANGE.min}
      max={COLOR_TEMP_RANGE.max}
      step={COLOR_TEMP_STEP}
      markerValue={DEFAULT_COLOR_TEMP$1}
      thumbSize={18}
      trackAppearance="temperature"
      formatValue={(kelvin) => `${kelvin}K`}
      onChange={handleColorTempChange}
    />
  );
};
const formatDegree = (v2) => `${roundAngle(v2)}°`;
const formatIntensity = (v2) => String(v2);
const LightingPanel = ({ translate: translate2, lights, activeLightId, onUpdateLight }) => {
  const activeLight = reactExports.useMemo(
    () => lights.find((light) => light.id === activeLightId) ?? lights[0],
    [activeLightId, lights],
  );
  const lightTypeOpts = reactExports.useMemo(
    () =>
      LIGHT_TYPE_OPTIONS.map((opt) => ({
        value: opt.value,
        label: translate2(opt.labelKey),
      })),
    [translate2],
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
          label={translate2("horizontal_angle_label")}
          value={activeLight.horizontalAngle}
          min={AZIMUTH_RANGE.min}
          max={AZIMUTH_RANGE.max}
          step={ANGLE_STEP}
          formatValue={formatDegree}
          onChange={(v2) =>
            updateActive({
              horizontalAngle: v2,
            })
          }
        />
        <ToolSlider
          className="min-w-0"
          dataActionUiId="canvas.relight.elevation"
          label={translate2("vertical_angle_label")}
          value={activeLight.verticalAngle}
          min={ELEVATION_RANGE.min}
          max={ELEVATION_RANGE.max}
          step={ANGLE_STEP}
          formatValue={formatDegree}
          onChange={(v2) =>
            updateActive({
              verticalAngle: v2,
            })
          }
        />
      </div>
      <ToolSlider
        className="min-w-0"
        dataActionUiId="canvas.relight.intensity"
        label={translate2("light_intensity_label")}
        value={activeLight.intensity}
        min={POWER_RANGE.min}
        max={POWER_RANGE.max}
        step={POWER_STEP}
        formatValue={formatIntensity}
        onChange={(v2) =>
          updateActive({
            intensity: v2,
          })
        }
      />
      <ColorSection
        translate={translate2}
        colorMode={activeLight.colorMode}
        colorTemp={activeLight.colorTemp}
        onColorModeChange={(mode2) =>
          updateActive({
            colorMode: mode2,
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
          {translate2("light_type_label")}
        </span>
        <SegmentedControl$1
          options={lightTypeOpts}
          value={activeLight.type}
          dataActionUiIdPrefix="canvas.relight.light-type"
          onChange={(v2) =>
            updateActive({
              type: v2,
            })
          }
        />
      </div>
    </div>
  );
};
export const RelightControlsPanel = ({
  translate: translate2,
  state: state2,
  dispatch: dispatch2,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <LightingPanel
        translate={translate2}
        lights={state2.lights}
        activeLightId={state2.activeLightId}
        onUpdateLight={(id2, updates) =>
          dispatch2({
            type: "UPDATE_LIGHT",
            id: id2,
            updates,
          })
        }
      />
      <BackgroundPanel
        translate={translate2}
        studioMode={state2.studioMode}
        onChange={(mode2) =>
          dispatch2({
            type: "SET_STUDIO_MODE",
            mode: mode2,
          })
        }
      />
    </div>
  );
};
const COLOR_STOPS = [
  {
    k: 1e3,
    r: 255,
    g: 140,
    b: 20,
  },
  {
    k: 1800,
    r: 255,
    g: 179,
    b: 71,
  },
  {
    k: 3200,
    r: 255,
    g: 210,
    b: 161,
  },
  {
    k: 5600,
    r: 255,
    g: 255,
    b: 255,
  },
  {
    k: 7e3,
    r: 232,
    g: 241,
    b: 255,
  },
  {
    k: 1e4,
    r: 150,
    g: 157,
    b: 245,
  },
];
const lerp = (a2, b3, t2) => Math.round(a2 + (b3 - a2) * t2);
export function kelvinToHex(kelvin) {
  const clamped = Math.max(
    COLOR_STOPS[0].k,
    Math.min(COLOR_STOPS[COLOR_STOPS.length - 1].k, kelvin),
  );
  let lo = COLOR_STOPS[0];
  let hi = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i2 = 0; i2 < COLOR_STOPS.length - 1; i2++) {
    if (clamped >= COLOR_STOPS[i2].k && clamped <= COLOR_STOPS[i2 + 1].k) {
      lo = COLOR_STOPS[i2];
      hi = COLOR_STOPS[i2 + 1];
      break;
    }
  }
  const t2 = hi.k === lo.k ? 0 : (clamped - lo.k) / (hi.k - lo.k);
  const r2 = lerp(lo.r, hi.r, t2);
  const g2 = lerp(lo.g, hi.g, t2);
  const b3 = lerp(lo.b, hi.b, t2);
  const toHex = (v2) => Math.max(0, Math.min(255, v2)).toString(16).padStart(2, "0");
  return `#${toHex(r2)}${toHex(g2)}${toHex(b3)}`;
}
const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const normalizeHexColor = (hex2) => {
  if (!HEX_COLOR_REGEX.test(hex2)) return null;
  const lower2 = hex2.toLowerCase();
  if (lower2.length === 7) return lower2;
  const [, r2, g2, b3] = lower2;
  return `#${r2}${r2}${g2}${g2}${b3}${b3}`;
};
export const DEFAULT_COLOR_TEMP = 6500;
export const RADIUS = 88;
export const MERIDIANS = 6;
export const PARALLELS = 4;
export const WIRE_FRONT_OPACITY = 0.72;
export const WIRE_BACK_OPACITY = 0.28;
export const EQUATOR_FRONT_OPACITY = 0.6;
export const EQUATOR_BACK_OPACITY = 0.22;
export const MARKER_HIT_SIZE = 32;
export const PHOTO_WIDTH = 56;
export const PHOTO_HEIGHT = 56;
export const INTENSITY_MIN = 10;
export const INTENSITY_MAX = 100;
export const OPACITY_MIN = 0.1;
export const OPACITY_MAX = 0.6;
export const CONE_LENGTH_RATIO = 0.85;
export const CONE_SHAPE = {
  spotlight: {
    radiusInner: 0.12,
    radiusOuter: 0.018,
  },
  rectAreaLight: {
    radiusInner: 0.22,
    radiusOuter: 0.033,
  },
  directionalLight: {
    radiusInner: 0.6,
    radiusOuter: 0.09,
  },
};
export const BACKDROP_GRADIENT_STOPS = {
  black: [
    {
      color: "#C7C7C7",
      opacity: "0",
    },
    {
      offset: "0.129808",
      color: "#C7C7C7",
      opacity: "0.8",
    },
    {
      offset: "0.649038",
      color: "#383838",
      opacity: "0.8",
    },
    {
      offset: "0.884615",
      color: "#8C8C8C",
      opacity: "0.8",
    },
    {
      offset: "1",
      color: "#8C8C8C",
      opacity: "0",
    },
  ],
  white: [
    {
      color: "white",
      opacity: "0",
    },
    {
      offset: "0.149038",
      color: "white",
    },
    {
      offset: "0.367644",
      color: "white",
    },
    {
      offset: "0.649038",
      color: "#E1E1E1",
    },
    {
      offset: "0.781949",
      color: "white",
    },
    {
      offset: "0.894231",
      color: "white",
    },
    {
      offset: "1",
      color: "white",
      opacity: "0",
    },
  ],
};
