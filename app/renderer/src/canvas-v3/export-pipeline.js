import { BLOB_WRITE_CHUNK_BYTES } from "./export-presets.js";

import { DRAFT_META_NEW_VERSION, JIANYING_FLAVOR_SPECS, clampSpeed, deriveRatio, hexToRgbFloat, pxToJianyingFontSize, secToMicros, uuid } from "./device-capabilities.js";
import { Check, DialogContent, DialogHeader, DialogTitle, LoaderCircle, TriangleAlert } from "./main-exports.js";
import { Dialog } from "../canvas/separator.jsx";
import { Film } from "../media-editing/lucide-icon-wraps.js";
import { Progress } from "../team/team-management-detail-loading.jsx";
import { X } from "lucide-react";
import { Button } from "../infra/dialog-content.jsx";
import jsxRuntimeExports from "react/jsx-runtime";

// ---- 第 221 轮：hub 访问的注入点 ----
// `getHub` / `getAssetFile` 来自 use-window-chrome chunk（未还原）。不返回假数据。
let __hubAccess;
export function setHubAccess(access) {
  __hubAccess = access;
}
function requireHubAccess() {
  if (!__hubAccess) throw new Error("HUB_ACCESS_UNAVAILABLE: getHub / getAssetFile 尚未还原");
  return __hubAccess;
}

/**
 * 导出管线：剪映工程转换 / FCPXML / 导出对话框（第 220 轮从 EditorInterface chunk 取回）。
 *
 * 参考：EditorInterface-DwXc-S2S.js 2585–3739，共 13 个声明。
 */

export function buildTextContent(text, color, fontSize) {
  const content = {
    text,
    styles: [
      {
        fill: {
          alpha: 1,
          content: {
            render_type: "solid",
            solid: { color: hexToRgbFloat(color ?? "#FFFFFF") }
          }
        },
        font: { id: "", path: "" },
        range: [0, text.length],
        size: fontSize ?? 32
      }
    ]
  };
  return JSON.stringify(content);
}

export function mapKeyframeProperty(prop) {
  switch (prop) {
    case "volume":
      return "KFTypeVolume";
    case "opacity":
      return "KFTypeAlpha";
    case "x":
      return "KFTypePositionX";
    case "y":
      return "KFTypePositionY";
    default:
      return null;
  }
}

export function buildPlatform(flavor) {
  const spec = JIANYING_FLAVOR_SPECS[flavor];
  return {
    app_id: spec.appId,
    app_source: spec.appSource,
    app_version: spec.appVersion,
    device_id: "",
    hard_disk_id: "",
    mac_address: "",
    os: "mac",
    os_version: ""
  };
}

export function projectToJianying(project2, options = {}) {
  const draftName = options.draftName?.trim() || project2.name || "Clip Studio Export";
  const flavor = options.flavor ?? "jianying";
  const { width, height, frameRate } = project2.settings;
  const fps = Math.max(1, Math.round(frameRate));
  const totalDurationSec = project2.timeline.duration;
  const totalDurationMicros = secToMicros(totalDurationSec);
  const nowSec = Math.floor(Date.now() / 1e3);
  const nowMicros = Date.now() * 1e3;
  const videos = [];
  const audios = [];
  const texts = [];
  const speeds = [];
  const audio_fades = [];
  const sound_channel_mappings = [];
  const canvases = [];
  const videoMaterialMap = /* @__PURE__ */ new Map();
  const audioMaterialMap = /* @__PURE__ */ new Map();
  function getVideoMaterialId(mediaId) {
    let id = videoMaterialMap.get(mediaId);
    if (!id) {
      id = uuid();
      videoMaterialMap.set(mediaId, id);
      const mediaItem = project2.mediaLibrary.items.find((item) => item.id === mediaId);
      if (mediaItem) {
        videos.push({
          id,
          type: "video",
          path: mediaItem.name,
          material_name: mediaItem.name,
          duration: secToMicros(mediaItem.metadata.duration),
          width: mediaItem.metadata.width || width,
          height: mediaItem.metadata.height || height,
          create_time: nowSec,
          crop: {
            lower_left_x: 0,
            lower_left_y: 1,
            lower_right_x: 1,
            lower_right_y: 1,
            upper_left_x: 0,
            upper_left_y: 0,
            upper_right_x: 1,
            upper_right_y: 0
          },
          crop_ratio: "free",
          crop_scale: 1,
          category_name: "local",
          category_id: "",
          check_flag: 63487,
          extra_type_option: 0,
          formula_id: "",
          gameplay: null,
          has_audio: true,
          has_sound_separated: false,
          hdr_type: 0,
          intensifies_audio_path: "",
          intensifies_path: "",
          is_ai_generate_content: false,
          is_copyright: false,
          is_text_edit_overdub: false,
          is_unified_beauty_mode: false,
          local_id: "",
          local_material_id: "",
          material_id: "",
          matting: {
            flag: 0,
            has_use_quick_brush: false,
            has_use_quick_eraser: false,
            interactiveTime: [],
            path: "",
            strokes: []
          },
          media_path: "",
          object_locked: null,
          origin_material_id: "",
          picture_from: "none",
          picture_set_category_id: "",
          picture_set_category_name: "",
          request_id: "",
          reverse_intensifies_path: "",
          reverse_path: "",
          smart_motion: null,
          source: 0,
          source_platform: 0,
          stable: { matrix_path: "", stable_level: 0, time_range: { duration: 0, start: 0 } },
          team_id: "",
          video_algorithm: {
            algorithms: [],
            complement_frame_config: null,
            deflicker: null,
            gameplay_configs: [],
            motion_blur_config: null,
            mouth_shape_driver: null,
            noise_reduction: null,
            path: "",
            quality_enhance: null,
            time_range: null
          }
        });
      }
    }
    return id;
  }
  function getAudioMaterialId(mediaId) {
    let id = audioMaterialMap.get(mediaId);
    if (!id) {
      id = uuid();
      audioMaterialMap.set(mediaId, id);
      const mediaItem = project2.mediaLibrary.items.find((item) => item.id === mediaId);
      if (mediaItem) {
        audios.push({
          id,
          type: "extract_music",
          path: mediaItem.name,
          name: mediaItem.name,
          duration: secToMicros(mediaItem.metadata.duration),
          category_id: "local",
          category_name: "local",
          check_flag: 1,
          id_internal: "",
          is_ai_clone_tone: false,
          is_text_edit_overdub: false,
          is_ugc: false,
          local_material_id: "",
          music_id: "",
          query: "",
          request_id: "",
          resource_id: "",
          search_id: "",
          source_from: "",
          source_platform: 0,
          team_id: "",
          text_id: "",
          tone_category_id: "",
          tone_category_name: "",
          tone_effect_id: "",
          tone_effect_name: "",
          tone_platform: "",
          tone_second_category_id: "",
          tone_second_category_name: "",
          tone_speaker: "",
          tone_type: "",
          wave_points: []
        });
      }
    }
    return id;
  }
  const tracks = [];
  let videoRenderIndex = 0;
  let audioRenderIndex = 0;
  const isVideoTrack = (t) => t.type === "video" || t.type === "image";
  const isSafeMainTrack = (t) => {
    const clips = [...t.clips].sort((a, b) => a.startTime - b.startTime);
    if (clips.length === 0) return false;
    if (clips[0].startTime > 1e-3) return false;
    let end = 0;
    for (const c of clips) {
      if (c.startTime - end > 1e-3) return false;
      end = Math.max(end, c.startTime + c.duration);
    }
    return true;
  };
  const warnings = [];
  const videoTracksBottomUp = project2.timeline.tracks.filter(isVideoTrack).reverse();
  const mainIdx = videoTracksBottomUp.findIndex(isSafeMainTrack);
  let orderedVideoTracks;
  if (mainIdx >= 0) {
    orderedVideoTracks = [
      videoTracksBottomUp[mainIdx],
      ...videoTracksBottomUp.filter((_, i) => i !== mainIdx)
    ];
  } else {
    orderedVideoTracks = videoTracksBottomUp;
    if (videoTracksBottomUp.length > 0) {
      warnings.push(
        "剪映主轨不支持起始空隙，最下方轨道的片段位置可能被剪映自动前移"
      );
    }
  }
  const orderedTracks = [
    ...orderedVideoTracks,
    ...project2.timeline.tracks.filter((t) => !isVideoTrack(t))
  ];
  for (const track of orderedTracks) {
    if (track.clips.length === 0) continue;
    const isVideo = track.type === "video" || track.type === "image";
    const segments = [];
    for (const clip of track.clips) {
      const materialId = isVideo ? getVideoMaterialId(clip.mediaId) : getAudioMaterialId(clip.mediaId);
      const speed = clampSpeed(clip.speed);
      const rawSourceDurSec = Math.max(0, clip.outPoint - clip.inPoint);
      const playDurSec = rawSourceDurSec / speed;
      const sourceStart = secToMicros(clip.inPoint);
      const sourceDuration = secToMicros(rawSourceDurSec);
      const targetStart = secToMicros(Math.max(0, clip.startTime));
      const targetDuration = secToMicros(playDurSec);
      const speedId = uuid();
      speeds.push({
        id: speedId,
        type: "speed",
        mode: 0,
        speed,
        curve_speed: null
      });
      const scmId = uuid();
      sound_channel_mappings.push({
        id: scmId,
        audio_channel_mapping: 0,
        is_config_open: false,
        type: "none"
      });
      const extraRefs = [speedId, scmId];
      if (isVideo) {
        const canvasId = uuid();
        canvases.push({
          id: canvasId,
          type: "canvas_color",
          album_image: "",
          blur: 0,
          color: "",
          image: "",
          image_id: "",
          image_name: "",
          source_platform: 0,
          team_id: ""
        });
        extraRefs.push(canvasId);
      }
      const fadeIn = clip.fade?.fadeIn ?? 0;
      const fadeOut = clip.fade?.fadeOut ?? 0;
      if (fadeIn > 0 || fadeOut > 0) {
        const fadeId = uuid();
        audio_fades.push({
          id: fadeId,
          type: "audio_fade",
          fade_in_duration: secToMicros(fadeIn),
          fade_out_duration: secToMicros(fadeOut),
          fade_type: 0
        });
        extraRefs.push(fadeId);
      }
      const propertyGroups = {};
      for (const kf of clip.keyframes) {
        const ptype = mapKeyframeProperty(kf.property);
        if (!ptype) continue;
        if (!propertyGroups[ptype]) propertyGroups[ptype] = [];
        const value = typeof kf.value === "number" ? kf.value : 1;
        propertyGroups[ptype].push({
          id: uuid(),
          time_offset: secToMicros(kf.time - clip.startTime),
          values: [value],
          curveType: "Line",
          graphID: "",
          left_control: { x: 0, y: 0 },
          right_control: { x: 0, y: 0 }
        });
      }
      const commonKeyframes = Object.entries(propertyGroups).map(([ptype, list]) => ({
        id: uuid(),
        keyframe_list: list.sort((a, b) => a.time_offset - b.time_offset),
        material_id: materialId,
        property_type: ptype
      }));
      const segment = {
        id: uuid(),
        material_id: materialId,
        source_timerange: { start: sourceStart, duration: sourceDuration },
        target_timerange: { start: targetStart, duration: targetDuration },
        extra_material_refs: extraRefs,
        speed,
        volume: track.muted ? 0 : clip.volume,
        visible: !track.hidden,
        clip: {
          alpha: clip.transform.opacity,
          flip: { horizontal: false, vertical: false },
          rotation: clip.transform.rotation,
          scale: { x: clip.transform.scale.x, y: clip.transform.scale.y },
          transform: {
            x: clip.transform.position.x / (width / 2),
            y: -clip.transform.position.y / (height / 2)
          }
        },
        common_keyframes: commonKeyframes,
        render_index: isVideo ? videoRenderIndex : audioRenderIndex,
        track_attribute: 0,
        track_render_index: 0,
        uniform_scale: { on: true, value: 1 },
        enable_adjust: true,
        enable_lut: true,
        enable_color_wheels: true,
        enable_color_curves: true,
        enable_color_match_adjust: false,
        enable_smart_color_adjust: false,
        enable_video_mask: true,
        is_placeholder: false,
        is_tone_modify: false,
        last_nonzero_volume: clip.volume,
        reverse: clip.reversed ?? false,
        template_id: "",
        template_scene: "default",
        intensifies_audio: false,
        lyric_keyframes: null,
        keyframe_refs: [],
        group_id: "",
        hdr_settings: null,
        cartoon: false
      };
      segments.push(segment);
    }
    if (segments.length > 0) {
      tracks.push({
        id: uuid(),
        type: isVideo ? "video" : "audio",
        attribute: 0,
        flag: 0,
        segments
      });
      if (isVideo) videoRenderIndex += 1;
      else audioRenderIndex += 1;
    }
  }
  for (const mediaItem of project2.mediaLibrary.items) {
    if (mediaItem.type === "audio") {
      if (!audioMaterialMap.has(mediaItem.id)) getAudioMaterialId(mediaItem.id);
    } else if (!videoMaterialMap.has(mediaItem.id)) {
      getVideoMaterialId(mediaItem.id);
    }
  }
  const projectTextClips = project2.textClips ?? [];
  const textTrackIds = [
    ...project2.timeline.tracks.filter((track) => track.type === "text").map((track) => track.id),
    ...projectTextClips.map((clip) => clip.trackId).filter(
      (trackId, index, ids) => !project2.timeline.tracks.some((track) => track.id === trackId) && ids.indexOf(trackId) === index
    )
  ];
  let textRenderIndex = 14e3;
  for (const trackId of textTrackIds) {
    const sourceTrack = project2.timeline.tracks.find((track) => track.id === trackId);
    const sourceClips = projectTextClips.filter(
      (clip) => clip.trackId === trackId && clip.text && clip.duration > 0
    );
    if (sourceClips.length === 0) continue;
    const textSegments = [];
    for (const textClip of sourceClips) {
      const style = textClip.style;
      const materialId = uuid();
      const numericWeight = typeof style.fontWeight === "number" ? style.fontWeight : style.fontWeight === "bold" ? 700 : 400;
      const jianyingFontSize = pxToJianyingFontSize(style.fontSize);
      texts.push({
        id: materialId,
        type: "text",
        content: buildTextContent(textClip.text, style.color, jianyingFontSize),
        font_name: style.fontFamily,
        font_size: jianyingFontSize,
        font_path: "",
        text_color: style.color,
        border_color: style.strokeColor ?? "#000000",
        border_width: style.strokeWidth ?? 0,
        has_shadow: Boolean(style.shadowColor && style.shadowBlur),
        shadow_color: style.shadowColor ?? "#000000",
        shadow_distance: Math.hypot(style.shadowOffsetX ?? 0, style.shadowOffsetY ?? 0),
        bold_width: numericWeight >= 600 ? 0.08 : 0,
        italic_degree: style.fontStyle === "italic" ? 15 : 0,
        underline: style.textDecoration === "underline",
        underline_offset: 0.22,
        underline_width: 0.05,
        alignment: style.textAlign === "left" ? 0 : style.textAlign === "right" ? 2 : 1,
        line_feed: 1,
        line_max_width: 0.82,
        letter_spacing: style.letterSpacing,
        line_spacing: Math.max(0, style.lineHeight - 1),
        background_color: style.backgroundColor ?? "",
        background_alpha: 1,
        background_height: 0.14,
        background_horizontal_offset: 0,
        background_round_radius: 0,
        background_style: style.backgroundColor ? 1 : 0,
        background_vertical_offset: 0,
        background_width: 0.14,
        check_flag: 7,
        combo_info: { text_templates: [] },
        force_apply_line_max_width: false,
        global_alpha: textClip.transform.opacity,
        group_id: "",
        is_rich_text: false,
        ktv_color: "",
        layer_weight: 1,
        recognize_task_id: "",
        recognize_type: 0,
        relevance_segment: [],
        shadow_alpha: 0.8,
        shadow_angle: -45,
        shadow_smoothing: style.shadowBlur ?? 0,
        shape_clip_x: false,
        shape_clip_y: false,
        style_name: "",
        sub_type: 0,
        subtitle_keywords: null,
        subtitle_template_original_fontsize: 0,
        text_alpha: textClip.transform.opacity,
        text_curve: null,
        text_preset_resource_id: "",
        text_size: jianyingFontSize,
        text_to_audio_ids: [],
        tts_auto_update: false,
        typesetting: 0,
        underline_color: style.color,
        use_effect_default_color: true,
        words: { end_time: [], start_time: [], text: [] }
      });
      const duration = secToMicros(textClip.duration);
      textSegments.push({
        id: uuid(),
        material_id: materialId,
        source_timerange: { start: 0, duration },
        target_timerange: { start: secToMicros(textClip.startTime), duration },
        extra_material_refs: [],
        speed: 1,
        volume: 1,
        visible: !sourceTrack?.hidden,
        clip: {
          alpha: textClip.transform.opacity,
          flip: { horizontal: false, vertical: false },
          rotation: textClip.transform.rotation,
          scale: textClip.transform.scale,
          transform: {
            x: textClip.transform.position.x * 2 - 1,
            y: 1 - textClip.transform.position.y * 2
          }
        },
        common_keyframes: [],
        render_index: textRenderIndex++,
        track_attribute: 0,
        track_render_index: 0,
        uniform_scale: { on: true, value: 1 },
        enable_adjust: false,
        enable_lut: false,
        enable_color_wheels: false,
        enable_color_curves: false,
        enable_color_match_adjust: false,
        enable_smart_color_adjust: false,
        enable_video_mask: false,
        is_placeholder: false,
        is_tone_modify: false,
        last_nonzero_volume: 1,
        reverse: false,
        template_id: "",
        template_scene: "default",
        intensifies_audio: false,
        lyric_keyframes: null,
        keyframe_refs: [],
        group_id: "",
        hdr_settings: null,
        cartoon: false
      });
    }
    tracks.push({
      id: uuid(),
      type: "text",
      attribute: 0,
      flag: 0,
      segments: textSegments
    });
  }
  if (projectTextClips.some(
    (clip) => clip.animation != null && clip.animation.preset !== "none" || clip.keyframes.length > 0 || clip.behindSubject
  )) {
    warnings.push("文字轨道已导出；部分文字动画、关键帧和人物遮挡效果需在剪映中重新设置");
  }
  if (project2.timeline.subtitles.length > 0) {
    const textSegments = [];
    for (const subtitle of project2.timeline.subtitles) {
      if (!subtitle.text || subtitle.endTime <= subtitle.startTime) continue;
      const textMaterialId = uuid();
      const style = subtitle.style;
      const jianyingFontSize = pxToJianyingFontSize(style?.fontSize ?? 32);
      texts.push({
        id: textMaterialId,
        type: "text",
        content: buildTextContent(
          subtitle.text,
          style?.color ?? "#FFFFFF",
          jianyingFontSize
        ),
        font_name: style?.fontFamily ?? "",
        font_size: jianyingFontSize,
        font_path: "",
        text_color: style?.color ?? "#FFFFFF",
        border_color: "#000000",
        border_width: 0.08,
        has_shadow: false,
        shadow_color: "#000000",
        shadow_distance: 0,
        bold_width: 0,
        italic_degree: 0,
        underline: false,
        underline_offset: 0.22,
        underline_width: 0.05,
        alignment: 1,
        line_feed: 1,
        line_max_width: 0.82,
        letter_spacing: 0,
        line_spacing: 0.02,
        background_color: style?.backgroundColor ?? "",
        background_alpha: 1,
        background_height: 0.14,
        background_horizontal_offset: 0,
        background_round_radius: 0,
        background_style: 0,
        background_vertical_offset: 0,
        background_width: 0.14,
        check_flag: 7,
        combo_info: { text_templates: [] },
        force_apply_line_max_width: false,
        global_alpha: 1,
        group_id: "",
        is_rich_text: false,
        ktv_color: "",
        layer_weight: 1,
        recognize_task_id: "",
        recognize_type: 0,
        relevance_segment: [],
        shadow_alpha: 0.8,
        shadow_angle: -45,
        shadow_smoothing: 0.45,
        shape_clip_x: false,
        shape_clip_y: false,
        style_name: "",
        sub_type: 0,
        subtitle_keywords: null,
        subtitle_template_original_fontsize: 0,
        text_alpha: 1,
        text_curve: null,
        text_preset_resource_id: "",
        text_size: jianyingFontSize,
        text_to_audio_ids: [],
        tts_auto_update: false,
        typesetting: 0,
        underline_color: "",
        use_effect_default_color: true,
        words: { end_time: [], start_time: [], text: [] }
      });
      const yNorm = style?.position === "top" ? 0.76 : style?.position === "center" ? 0 : -0.76;
      textSegments.push({
        id: uuid(),
        material_id: textMaterialId,
        source_timerange: {
          start: 0,
          duration: secToMicros(subtitle.endTime - subtitle.startTime)
        },
        target_timerange: {
          start: secToMicros(subtitle.startTime),
          duration: secToMicros(subtitle.endTime - subtitle.startTime)
        },
        extra_material_refs: [],
        speed: 1,
        volume: 1,
        visible: true,
        clip: {
          alpha: 1,
          flip: { horizontal: false, vertical: false },
          rotation: 0,
          scale: { x: 1, y: 1 },
          transform: { x: 0, y: yNorm }
        },
        common_keyframes: [],
        render_index: 14e3,
        track_attribute: 0,
        track_render_index: 0,
        uniform_scale: { on: true, value: 1 },
        enable_adjust: false,
        enable_lut: false,
        enable_color_wheels: false,
        enable_color_curves: false,
        enable_color_match_adjust: false,
        enable_smart_color_adjust: false,
        enable_video_mask: false,
        is_placeholder: false,
        is_tone_modify: false,
        last_nonzero_volume: 1,
        reverse: false,
        template_id: "",
        template_scene: "default",
        intensifies_audio: false,
        lyric_keyframes: null,
        keyframe_refs: [],
        group_id: "",
        hdr_settings: null,
        cartoon: false
      });
    }
    if (textSegments.length > 0) {
      tracks.push({
        id: uuid(),
        type: "text",
        attribute: 0,
        flag: 0,
        segments: textSegments
      });
    }
  }
  const materials = {
    adjusts: [],
    ai_translates: [],
    audio_balances: [],
    audio_effects: [],
    audio_fades,
    audio_track_indexes: [],
    audios,
    beats: [],
    canvases,
    chromas: [],
    color_curves: [],
    common_mask: [],
    digital_humans: [],
    drafts: [],
    effects: [],
    filters: [],
    flowers: [],
    green_screens: [],
    handwrites: [],
    hsl: [],
    images: [],
    log_color_wheels: [],
    loudnesses: [],
    manual_deformations: [],
    masks: [],
    material_animations: [],
    material_colors: [],
    multi_language_refs: [],
    placeholders: [],
    plugin_effects: [],
    primary_color_wheels: [],
    realtime_denoises: [],
    shapes: [],
    smart_crops: [],
    smart_relights: [],
    sound_channel_mappings,
    speeds,
    stickers: [],
    tail_leaders: [],
    text_templates: [],
    texts,
    time_marks: [],
    transitions: [],
    video_effects: [],
    video_trackings: [],
    videos,
    vocal_beautifys: [],
    vocal_separations: []
  };
  const draftId = uuid();
  const platform = buildPlatform(flavor);
  const draftContent = {
    canvas_config: { width, height, ratio: deriveRatio(width, height) },
    color_space: 0,
    config: { adjust_max_index: 1, attachment_info: null, combination_max_index: 1 },
    cover: null,
    create_time: nowSec,
    duration: totalDurationMicros,
    extra_info: null,
    fps,
    free_render_index_mode_on: false,
    group_container: null,
    id: draftId,
    keyframe_graph_list: [],
    keyframes: {
      adjusts: [],
      audios: [],
      effects: [],
      filters: [],
      handwrites: [],
      stickers: [],
      texts: [],
      videos: []
    },
    last_modified_platform: platform,
    materials,
    mutable_config: null,
    name: "",
    new_version: DRAFT_META_NEW_VERSION,
    platform,
    relationships: [],
    render_index_track_mode_on: false,
    retouch_cover: null,
    source: "default",
    static_cover_image_path: "",
    time_marks: null,
    tracks,
    update_time: nowSec,
    version: 36e4
  };
  const draftMaterialsValue = [];
  const allMediaIds = /* @__PURE__ */ new Set([...videoMaterialMap.keys(), ...audioMaterialMap.keys()]);
  for (const mediaId of allMediaIds) {
    const mediaItem = project2.mediaLibrary.items.find((item) => item.id === mediaId);
    if (mediaItem) {
      const materialId = videoMaterialMap.get(mediaId) ?? audioMaterialMap.get(mediaId);
      draftMaterialsValue.push({
        create_time: nowSec,
        duration: secToMicros(mediaItem.metadata.duration),
        extra_info: mediaItem.name,
        file_Path: mediaItem.name,
        id: materialId,
        import_time: nowSec,
        import_time_ms: nowMicros,
        item_source: 1,
        md5: "",
        metetype: mediaItem.type === "audio" ? "audio" : "video",
        roughcut_time_range: { duration: -1, start: -1 },
        sub_time_range: { duration: -1, start: -1 },
        type: 0
      });
    }
  }
  const draftMeta = {
    cloud_package_completed_time: "",
    draft_cloud_capcut_purchase_info: "",
    draft_cloud_last_action_download: false,
    draft_cloud_materials: [],
    draft_cloud_purchase_info: "",
    draft_cloud_template_id: "",
    draft_cloud_tutorial_info: "",
    draft_cloud_videocut_purchase_info: "",
    draft_cover: "draft_cover.jpg",
    draft_deeplink_url: "",
    draft_enterprise_info: {
      draft_enterprise_extra: "",
      draft_enterprise_id: "",
      draft_enterprise_name: "",
      enterprise_material: []
    },
    draft_fold_path: "",
    draft_id: draftId,
    draft_is_ai_packaging_used: false,
    draft_is_ai_shorts: false,
    draft_is_ai_translate: false,
    draft_is_article_video_draft: false,
    draft_is_from_deeplink: "false",
    draft_is_invisible: false,
    draft_materials: [{ type: 0, value: draftMaterialsValue }],
    draft_materials_copied_info: [],
    draft_name: draftName,
    draft_new_version: DRAFT_META_NEW_VERSION,
    draft_removable_storage_device: "",
    draft_root_path: "",
    draft_segment_extra_info: [],
    draft_timeline_materials_size_: 0,
    draft_type: "",
    tm_draft_cloud_completed: "",
    tm_draft_cloud_modified: 0,
    tm_draft_create: nowMicros,
    tm_draft_modified: nowMicros,
    tm_draft_removed: 0,
    tm_duration: totalDurationMicros
  };
  return {
    draftContent,
    draftMeta,
    warnings: warnings.length > 0 ? warnings : void 0
  };
}

export const esc = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

async function downloadTimelineFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const save = requireHubAccess().getHub()?.ui?.saveFile;
  if (save) {
    const saved = await save({ source: blob, suggestedName: filename, mimeType: type });
    if (!saved) throw new DOMException("Save cancelled", "AbortError");
    return saved.path;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return void 0;
}

export function timelineToFcpxml(project2) {
  const { timeline, settings, mediaLibrary } = project2;
  const fps = Math.max(1, Math.round(settings.frameRate || 30));
  const time = (seconds) => `${Math.max(0, Math.round(seconds * fps))}/${fps}s`;
  const media = new Map(mediaLibrary.items.map((item) => [item.id, item]));
  const used = timeline.tracks.flatMap((track) => track.clips.map((clip) => ({ track, clip })));
  const resources = used.filter(({ clip }) => media.has(clip.mediaId)).map(({ clip }) => clip.mediaId).filter((id, index, all) => all.indexOf(id) === index).map((id, index) => {
    const item = media.get(id);
    const src = item.originalUrl || `media://${encodeURIComponent(item.name)}`;
    return `    <asset id="r${index + 1}" name="${esc(item.name)}" start="0s" duration="${time(Math.max(item.metadata.duration, 1))}" hasVideo="${item.type === "audio" ? 0 : 1}" hasAudio="${item.type === "image" ? 0 : 1}"><media-rep kind="original-media" src="${esc(src)}"/></asset>`;
  });
  const resourceIds = new Map(
    [...new Set(used.map(({ clip }) => clip.mediaId))].map((id, index) => [id, `r${index + 1}`])
  );
  const clips = used.map(({ track, clip }) => {
    const ref = resourceIds.get(clip.mediaId);
    if (!ref) return "";
    const duration2 = Math.max(0, clip.outPoint - clip.inPoint) / Math.max(clip.speed || 1, 1e-3);
    const lane = track.type === "audio" ? -1 : 1;
    return `          <asset-clip ref="${ref}" lane="${lane}" offset="${time(clip.startTime)}" name="${esc(media.get(clip.mediaId)?.name || clip.mediaId)}" start="${time(clip.inPoint)}" duration="${time(duration2)}"/>`;
  }).filter(Boolean);
  const duration = Math.max(timeline.duration, 1);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<!DOCTYPE fcpxml>",
    '<fcpxml version="1.10"><resources>',
    `    <format id="r0" name="FFVideoFormat${settings.height}p${fps}" frameDuration="1/${fps}s" width="${settings.width}" height="${settings.height}"/>`,
    ...resources,
    "  </resources>",
    `  <library><event name="${esc(project2.name)}"><project name="${esc(project2.name)}"><sequence format="r0" duration="${time(duration)}" tcStart="0s" tcFormat="NDF"><spine><gap name="Timeline" offset="0s" duration="${time(duration)}" start="0s">`,
    ...clips,
    "          </gap></spine></sequence></project></event></library>",
    "</fcpxml>"
  ].join("\n");
}

export function timelineToJianying(project2, options) {
  const result = projectToJianying(project2, options);
  const output = {
    draft_content: result.draftContent,
    draft_meta_info: result.draftMeta,
    __notice: "浏览器环境导出说明：1. 创建草稿目录 2. 将此 JSON 拆分为 draft_content.json 和 draft_meta_info.json 3. 将项目中使用的媒体文件复制到草稿目录根下（保持原文件名）4. 在剪映中打开该草稿目录"
  };
  return JSON.stringify(output, null, 2);
}

async function exportToJianying(options) {
  const { project: project2, flavor = "jianying", openApp = true, onProgress } = options;
  const hub = requireHubAccess().getHub();
  if (typeof window === "undefined" || !hub) {
    return {
      success: false,
      error: "此功能需要在 Hub 环境中运行"
    };
  }
  try {
    await hub.ready;
    onProgress?.({ phase: "detect" });
    if (!hub.python) {
      return {
        success: false,
        error: "hub.python 不可用，请确保在最新版 Hub 中运行"
      };
    }
    const envResult = await hub.python.ensureEnv();
    if (!envResult.ready) {
      return {
        success: false,
        error: `Python 环境未就绪: ${envResult.error || "未知错误"}`
      };
    }
    const probeResult = await hub.python.run({
      script: "python/export-to-jianying.py",
      stdin: JSON.stringify({ action: "probe", flavor }),
      timeoutMs: 15e3
    });
    try {
      const probe = JSON.parse(probeResult.stdout);
      if (!probe.success) {
        return { success: false, error: probe.error || "检测剪映客户端失败" };
      }
    } catch {
      return {
        success: false,
        error: `检测剪映失败 (exit ${probeResult.exitCode}):
${probeResult.stderr || probeResult.stdout}`
      };
    }
    const mediaIdList = project2.mediaLibrary.items.map((item) => item.id);
    const mediaIds = new Set(mediaIdList);
    for (const track of project2.timeline.tracks) {
      for (const clip of track.clips) {
        if (!mediaIds.has(clip.mediaId)) {
          throw new Error(`时间线引用了不存在的素材（${clip.mediaId}）`);
        }
      }
    }
    const usedExportNames = /* @__PURE__ */ new Set();
    const exportNames = /* @__PURE__ */ new Map();
    for (const mediaId of mediaIdList) {
      const item = project2.mediaLibrary.items.find((media) => media.id === mediaId);
      if (!item) throw new Error(`时间线引用了不存在的素材（${mediaId}）`);
      const sanitized = item.name.replace(/[\\/:*?"<>|]/g, "_").split("").map((char) => char.charCodeAt(0) < 32 ? "_" : char).join("").trim() || `media-${mediaId}`;
      const dot = sanitized.lastIndexOf(".");
      const stem = dot > 0 ? sanitized.slice(0, dot) : sanitized;
      const ext = dot > 0 ? sanitized.slice(dot) : "";
      let candidate = sanitized;
      let suffix = 2;
      while (usedExportNames.has(candidate.toLocaleLowerCase())) {
        candidate = `${stem}_${suffix}${ext}`;
        suffix += 1;
      }
      usedExportNames.add(candidate.toLocaleLowerCase());
      exportNames.set(mediaId, candidate);
    }
    onProgress?.({ phase: "convert" });
    const exportProject = {
      ...project2,
      mediaLibrary: {
        ...project2.mediaLibrary,
        items: project2.mediaLibrary.items.map((item) => ({
          ...item,
          name: exportNames.get(item.id) ?? item.name
        }))
      }
    };
    const jianyingData = projectToJianying(exportProject, {
      flavor,
      draftName: "minimax design项目导入"
    });
    const mediaFiles = [];
    const exportSession = crypto.randomUUID();
    const resolveMediaBlob = async (mediaItem) => {
      if (mediaItem.blob) return mediaItem.blob;
      if (mediaItem.assetId) {
        const file = await requireHubAccess().getAssetFile(mediaItem.assetId);
        if (file) return file;
      }
      throw new Error(`无法读取素材“${mediaItem.name}”，请重新导入该素材后再导出剪映`);
    };
    const totalMedia = mediaIdList.length;
    let mediaIndex = 0;
    for (const mediaId of mediaIdList) {
      mediaIndex += 1;
      const mediaItem = project2.mediaLibrary.items.find((item) => item.id === mediaId);
      if (!mediaItem) throw new Error(`时间线引用了不存在的素材（${mediaId}）`);
      const mediaBlob = await resolveMediaBlob(mediaItem);
      const exportName = exportNames.get(mediaId);
      onProgress?.({
        phase: "media",
        current: mediaIndex,
        total: totalMedia,
        fileName: mediaItem.name
      });
      const writeFile = hub.files?.writeToPluginDir;
      if (!writeFile) {
        throw new Error("hub.files.writeToPluginDir 不可用");
      }
      await writeFile({
        path: `jianying-export/${exportSession}/${exportName}`,
        source: mediaBlob
      });
      mediaFiles.push({
        srcPath: `jianying-export/${exportSession}/${exportName}`,
        destFileName: exportName
      });
    }
    onProgress?.({ phase: "env" });
    onProgress?.({ phase: "install" });
    const payload = {
      draft_content: jianyingData.draftContent,
      draft_meta_info: jianyingData.draftMeta,
      media_files: mediaFiles,
      flavor,
      open: openApp
    };
    const pythonResult = await hub.python.run({
      script: "python/export-to-jianying.py",
      stdin: JSON.stringify(payload),
      timeoutMs: 12e4
    });
    let result;
    try {
      const parsed = JSON.parse(pythonResult.stdout);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Python 返回值不是对象");
      }
      result = parsed;
    } catch {
      return {
        success: false,
        error: `Python 脚本执行失败 (exit ${pythonResult.exitCode}):
${pythonResult.stderr || pythonResult.stdout}`
      };
    }
    if (result.success && result.mode === "zip") {
      if (typeof result.zipName !== "string" || typeof result.zipRelPath !== "string") {
        return { success: false, error: "Python 返回的草稿包信息不完整" };
      }
      const zipPath = `/api/plugins/clip-studio/data/${result.zipRelPath.split("/").map(encodeURIComponent).join("/")}?v=${encodeURIComponent(exportSession)}`;
      const zipUrl = hub.gatewayUrl(zipPath);
      if (!zipUrl) throw new Error("Editor workspace gateway is not ready");
      return {
        success: true,
        mode: "zip",
        zipName: result.zipName,
        zipDelivery: "download",
        zipUrl,
        warnings: jianyingData.warnings
      };
    }
    if (result.success) {
      return {
        success: true,
        mode: "installed",
        draftPath: typeof result.draftPath === "string" ? result.draftPath : void 0,
        draftId: typeof result.draftId === "string" ? result.draftId : void 0,
        warnings: jianyingData.warnings,
        needsManualRestart: Boolean(result.needsManualRestart)
      };
    }
    return {
      success: false,
      error: [result.error, result.hint].filter(Boolean).join("；") || "未知错误"
    };
  } catch (error2) {
    return {
      success: false,
      error: error2 instanceof Error ? error2.message : String(error2)
    };
  }
}

export const PHASE_META = {
  detect: { zh: "正在检测剪映客户端…", en: "Detecting JianyingPro…", from: 0, to: 10 },
  convert: {
    zh: "转换项目为剪映草稿格式…",
    en: "Converting project to draft format…",
    from: 10,
    to: 20
  },
  media: { zh: "写入媒体文件", en: "Writing media files", from: 20, to: 65 },
  env: { zh: "准备安装草稿…", en: "Preparing draft installation…", from: 65, to: 70 },
  install: {
    zh: "正在生成或安装剪映草稿…",
    en: "Generating or installing draft…",
    from: 70,
    to: 100
  }
};

export function computeJianyingExportProgress(p) {
  if (!p) return 0;
  const meta = PHASE_META[p.phase];
  if (p.phase === "media" && p.total && p.total > 0) {
    const done = Math.max(0, (p.current ?? 1) - 1);
    return meta.from + (meta.to - meta.from) * done / p.total;
  }
  return meta.from;
}

export const JianyingExportDialog = ({
  state,
  onClose,
  isZh
}) => {
  const { status, progress } = state;
  const pct = status === "success" ? 100 : computeJianyingExportProgress(progress);
  const meta = progress ? PHASE_META[progress.phase] : null;
  let phaseText = "";
  if (meta) {
    phaseText = isZh ? meta.zh : meta.en;
    if (progress?.phase === "media" && progress.total) {
      phaseText += ` (${progress.current}/${progress.total})`;
      if (progress.fileName) phaseText += ` · ${progress.fileName}`;
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open: state.open,
      onOpenChange: (open) => {
        if (!open && status !== "exporting") onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DialogContent,
        {
          className: "max-w-md",
          onPointerDownOutside: (e) => status === "exporting" && e.preventDefault(),
          onEscapeKeyDown: (e) => status === "exporting" && e.preventDefault(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 text-[15px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Film, { size: 16 }),
              isZh ? "导出到剪映" : "Export to JianyingPro"
            ] }) }),
            status === "exporting" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 py-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[13px] text-muted-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "animate-spin shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: phaseText || (isZh ? "正在准备…" : "Preparing…") })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, { value: pct, className: "h-2" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: isZh ? "正在写入草稿，请勿关闭编辑器…" : "Writing draft files, please keep the editor open…" })
            ] }),
            status === "success" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 py-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[13px] text-foreground", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid place-items-center size-5 rounded-full bg-emerald-500/15 text-emerald-500 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 12 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: state.mode === "zip" ? state.zipDelivery === "download" ? isZh ? "未检测到剪映，草稿包已生成" : "JianyingPro not detected. Draft package generated" : isZh ? "未检测到剪映，草稿包已导出到画布" : "JianyingPro not detected. Draft package exported to canvas" : state.needsManualRestart ? isZh ? "导入完成，重启剪映后可查看最新导入" : "Import complete. Restart JianyingPro to see the new draft" : isZh ? "草稿已导出，正在打开剪映…" : "Draft exported. Opening JianyingPro…" })
              ] }),
              state.mode === "zip" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-md bg-muted p-2.5 text-[12px] text-muted-foreground", children: state.zipDelivery === "download" ? isZh ? `请下载「${state.zipName ?? "草稿包"}」，解压后运行 python3 install.py 即可自动导入（包内附安装说明）。` : `Download "${state.zipName ?? "the package"}", unzip it and run python3 install.py (instructions included).` : isZh ? `「${state.zipName ?? "草稿包"}」已插入画布，也可下载到本地。安装剪映后，解压并运行 python3 install.py 即可自动导入（包内附安装说明）。` : `"${state.zipName ?? "The package"}" was added to the canvas and can also be downloaded. After installing JianyingPro, unzip it and run python3 install.py (instructions included).` }),
              state.needsManualRestart && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-[12px] text-amber-600 dark:text-amber-400", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 14, className: "shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isZh ? "剪映当前正在运行，本次导入不会中断或关闭剪映。请保存当前工作并重启剪映，即可看到最新导入的草稿。" : "JianyingPro is currently running and was not interrupted. Save your work and restart it to see the newly imported draft." })
              ] }),
              !!state.warnings?.length && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1 rounded-md bg-muted p-2.5 text-[12px] text-muted-foreground", children: state.warnings.map((w, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                "• ",
                w
              ] }, i)) }),
              state.draftPath && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "break-all text-[11px] text-muted-foreground", children: state.draftPath }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end gap-2", children: state.zipUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: state.zipUrl, download: state.zipName, children: isZh ? "下载草稿包" : "Download package" }) }) })
            ] }),
            status === "error" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 py-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2 text-[13px] text-destructive", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid place-items-center size-5 rounded-full bg-destructive/15 shrink-0 mt-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 12 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "break-all whitespace-pre-wrap", children: (isZh ? "导出失败：" : "Export failed: ") + (state.error ?? "") })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "secondary", onClick: onClose, children: isZh ? "关闭" : "Close" }) })
            ] })
          ]
        }
      )
    }
  );
};

