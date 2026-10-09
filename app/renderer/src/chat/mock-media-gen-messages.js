// mock-media-gen-messages.js

let _seq = 0;

function id() {
  return `mock_media_gen_${++_seq}`;
}

const PREFIX = "hub_";

function tool(name2, args, result, status = "ok") {
  const fullName = `${PREFIX}${name2}`;
  return {
    id: id(),
    role: "agent",
    type: "tool",
    content: fullName,
    toolName: fullName,
    toolStatus: status,
    toolArgs: JSON.stringify(args),
    toolResult: JSON.stringify(result),
  };
}

function running(name2, args) {
  const fullName = `${PREFIX}${name2}`;
  return {
    id: id(),
    role: "agent",
    type: "tool",
    content: fullName,
    toolName: fullName,
    toolStatus: "running",
    toolArgs: JSON.stringify(args),
  };
}

export const MOCK_MEDIA_GEN_MESSAGES = [
  // User prompt
  {
    id: id(),
    role: "user",
    type: "text",
    content: "[Mock] Media generation test — all categories (domestic region)",
  },
  // ═══════════════════════════════════════════════════════════════
  // IMAGE — capability dispatcher (hub_generate_image)
  // ═══════════════════════════════════════════════════════════════
  // 1. banana — single image, no refs
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2_flash",
      prompt:
        "A cute orange cat sitting on a sunlit windowsill, soft bokeh background",
      filename: "kitten-orange-tabby-windowsill",
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1K",
      },
    },
    {
      paths: ["kitten-orange-tabby-windowsill.jpg"],
      width: 1024,
      height: 1024,
    },
  ),
  // 2. banana — with reference images (image editing). Demonstrates
  //    aspect_ratio_source + aspect_ratio_evidence (internal contract,
  //    hidden from the user but shipped to the gateway).
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2",
      prompt: "Restyle this photo into watercolor painting",
      image_paths: ["cute-piglet-meadow.jpg"],
      filename: "cute-pink-piglet-spring-meadow",
      vendor_params: {
        aspect_ratio: "3:2",
        resolution: "2K",
      },
      aspect_ratio_source: "source_ref",
      aspect_ratio_evidence: {
        tool: "hub_analyse_media",
        file_path: "cute-piglet-meadow.jpg",
        width: 2048,
        height: 1365,
        aspect_ratio: "3:2",
        ok: true,
        media_type: "image",
      },
    },
    {
      paths: ["cute-pink-piglet-spring-meadow.png"],
      width: 2048,
      height: 1365,
    },
  ),
  // 3. banana batch — count=3, dispatcher fan-out (prompts + filenames).
  //    NOTE: vendor_params is shared across all outputs; aspect_ratios is
  //    no longer a per-item array in dispatcher.
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2_flash",
      count: 3,
      prompts: [
        "Cyberpunk cityscape at night, neon reflections on wet streets Cyberpunk cityscape at night, neon reflections on wet streets",
        "Cute croc splashing in a pond with lily pads",
        "Cute pig baking in a cozy kitchen",
      ],
      filenames: [
        "cyberpunk-01-megacity-skyline",
        "cute-croc-splashing",
        "kitchen-baking-pig",
      ],
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1K",
      },
    },
    {
      total: 3,
      succeeded: 3,
      results: [
        {
          index: 1,
          paths: ["cyberpunk-01-megacity-skyline.jpg"],
          width: 1024,
          height: 1024,
        },
        {
          index: 2,
          paths: ["cute-croc-splashing.png"],
          width: 1024,
          height: 1024,
        },
        {
          index: 3,
          paths: ["kitchen-baking-pig.png"],
          width: 1024,
          height: 1024,
        },
      ],
    },
  ),
  // 4. gpt-image (unified) — image editing with reference. Unified vendor
  //    resolves to the cloud-catalog image model id "g-image-2".
  tool(
    "generate_image",
    {
      vendor: "gpt-image",
      model_id: "gpt-image-2",
      prompt:
        "Futuristic humanoid robot in various poses, clean white background",
      image_paths: ["futuristic-humanoid-robot.jpg"],
      filename: "futuristic-robot-running-pose",
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1k",
      },
      aspect_ratio_source: "source_ref",
    },
    {
      paths: ["futuristic-robot-running-pose.png"],
    },
  ),
  // 5. seedream — with reference images (i2i)
  tool(
    "generate_image",
    {
      vendor: "seedream",
      model_id: "doubao-seedream-5-0-pro-260628",
      prompt: "Cute piglet running through green grass in warm sunshine",
      image_paths: ["cute-piglet-meadow.png"],
      filename: "cute-pink-piglet-running-grass",
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "2k",
      },
      aspect_ratio_source: "source_ref",
    },
    {
      paths: ["cute-pink-piglet-running-grass.png"],
      width: 2048,
      height: 2048,
    },
  ),
  // 6. midjourney — t2i with style flags expressed inside prompt
  tool(
    "generate_image",
    {
      vendor: "midjourney",
      model_id: "midjourney",
      prompt:
        "A croc standing at a mystical gateway with stone stairs --ar 16:9 --v 8.1",
      filename: "crocs-gateway-stairway",
    },
    {
      paths: ["crocs-gateway-stairway.jpg"],
    },
  ),
  // 7. kling (image) — multi-ref / character consistency. Maps to
  //    cloud-catalog model id "kling-image".
  tool(
    "generate_image",
    {
      vendor: "kling",
      model_id: "kling-v3-omni",
      prompt:
        "Croc character evolution poster with <<<image_1>>> as the protagonist",
      image_paths: ["cute-croc-basking.png"],
      filename: "crocs-gateway-evolution",
      vendor_params: {
        aspect_ratio: "3:4",
        resolution: "2k",
      },
      aspect_ratio_source: "source_ref",
    },
    {
      paths: ["crocs-gateway-evolution.png"],
    },
  ),
  // 8. Image generation — failed (content policy)
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2_flash",
      prompt: "This generation will fail due to content policy",
      filename: "will-fail",
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1K",
      },
    },
    {
      paths: [],
      error: "Generation failed: content policy violation",
    },
    "error",
  ),
  // ═══════════════════════════════════════════════════════════════
  // VIDEO — capability dispatcher (hub_generate_video)
  // ═══════════════════════════════════════════════════════════════
  // 9. seedance t2v — text-only
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "t2v",
      model_id: "seedance2.0",
      prompt:
        "A cute pink piglet running happily through a spring meadow with wildflowers",
      filename: "pink_piglet_meadow",
      duration: 5,
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      path: "pink_piglet_meadow.mp4",
    },
  ),
  // 10. seedance i2v — explicit opening frame
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "i2v",
      model_id: "seedance2.0",
      prompt: "The piglet slowly turns to face the camera and smiles",
      filename: "clip_01",
      duration: 5,
      first_frame_image: "cute-piglet-meadow.png",
      vendor_params: {
        aspect_ratio: "9:16",
        resolution: "720p",
        generate_audio: true,
      },
    },
    {
      path: "clip_01.mp4",
    },
  ),
  // 11. seedance multimodal — reference images + audio
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "multimodal",
      model_id: "seedance2.0",
      prompt:
        "Use image 1 as the character, make it dance to audio 1 in a meadow",
      filename: "clip_004",
      duration: 8,
      reference_image_paths: ["cute-pig-grass-sunshine.png"],
      reference_audio_urls: ["cyberpunk-synthwave-bgm.mp3"],
      vendor_params: {
        aspect_ratio: "9:16",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      path: "clip_004.mp4",
    },
  ),
  // 12. seedance video-edit — driving video + style refs
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "video-edit",
      model_id: "seedance2.0",
      prompt: "Replace the background with a cyberpunk city from image 1",
      filename: "clip_005",
      duration: 5,
      reference_video_urls: ["clip_01.mp4"],
      reference_image_paths: ["cyberpunk-01-megacity-skyline.jpg"],
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      path: "clip_005.mp4",
    },
  ),
  // 13. seedance video-extend — continue an existing clip
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "video-extend",
      model_id: "seedance2.0",
      prompt:
        "Continue the scene with the character walking away into the sunset",
      filename: "clip_006",
      duration: 5,
      reference_video_urls: ["clip_005.mp4"],
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      path: "clip_006.mp4",
    },
  ),
  // 14. seedance first-last-frame — head + tail keyframes
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "first-last-frame",
      model_id: "seedance2.0-fast",
      prompt: "Smooth transition from the meadow shot to the city skyline",
      filename: "transition_keyframes",
      duration: 5,
      first_frame_image: "cute-piglet-meadow.png",
      last_frame_image: "cyberpunk-01-megacity-skyline.jpg",
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "720p",
      },
    },
    {
      path: "transition_keyframes.mp4",
    },
  ),
  // 15. MiniMax-H3 — t2v. Dispatcher does not batch
  //     videos; emit one task per output deliverable.
  tool(
    "generate_video",
    {
      vendor: "MiniMax",
      mode: "t2v",
      model_id: "MiniMax-H3",
      prompt: "Cute kitten playing with yarn ball",
      filename: "clip_007",
      duration: 6,
      vendor_params: {
        resolution: "2K",
        generate_audio: false,
      },
    },
    {
      path: "clip_007.mp4",
    },
  ),
  // 16. MiniMax-H3 — i2v with first_frame_image
  tool(
    "generate_video",
    {
      vendor: "MiniMax",
      mode: "i2v",
      model_id: "MiniMax-H3",
      prompt: "Corgi running through grass in slow motion",
      filename: "clip_008",
      duration: 10,
      first_frame_image: "corgi-running-sunlit-grass.png",
      vendor_params: {
        resolution: "2K",
      },
    },
    {
      path: "clip_008.mp4",
    },
  ),
  // 17. veo3 (unified Veo3) — t2v with canonical model_id
  tool(
    "generate_video",
    {
      vendor: "veo3",
      mode: "t2v",
      model_id: "veo-3.1-fast-generate-001",
      prompt:
        "A cat astronaut floating in a spaceship, looking out the window at Earth",
      filename: "temp_123",
      duration: 8,
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "720p",
      },
    },
    {
      path: "temp_123.mp4",
    },
  ),
  // 19. kling — multimodal mode (multi-shot capable)
  tool(
    "generate_video",
    {
      vendor: "kling",
      mode: "multimodal",
      model_id: "kling-v3-omni",
      prompt: "A cute scottish fold kitten exploring a teacup in spring garden",
      filename: "temp_12345",
      duration: 5,
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "1080P",
        generate_audio: true,
      },
    },
    {
      path: "temp_12345.mp4",
    },
  ),
  // 21. kling — avatar mode (digital human lip-sync)
  tool(
    "generate_video",
    {
      vendor: "kling",
      mode: "avatar",
      model_id: "kling-video-o1",
      prompt: "Speak with gentle expression and slight head movement",
      filename: "temp_12",
      first_frame_image: "asian-woman-character-ref.png",
      audio_path: "audios/rainy-night-whisper.mp3",
      vendor_params: {
        mode: "pro",
      },
    },
    {
      path: "temp_12.mp4",
    },
  ),
  // 23. MiniMax-H3 — i2v with audio driver (lip-sync flavor)
  tool(
    "generate_video",
    {
      vendor: "MiniMax",
      mode: "i2v",
      model_id: "MiniMax-H3",
      prompt: "The cat narrator speaks naturally with subtle expressions",
      filename: "videos/final",
      duration: 8,
      first_frame_image: "tabby-cat-podcast-host.jpg",
      audio_path: "audios/rainy-night-whisper.mp3",
      vendor_params: {
        resolution: "2K",
      },
    },
    {
      path: "videos/final.mp4",
    },
  ),
  // ═══════════════════════════════════════════════════════════════
  // SPEECH / TTS — unified dispatcher
  // ═══════════════════════════════════════════════════════════════
  // 24. generate_audio_speech — single TTS
  tool(
    "generate_audio_speech",
    {
      texts: "Hello world, this is a test of the text to speech system.",
      voice_ids: "Friendly_Person",
      model_name: "speech-2.8-hd",
      speeds: 1,
      filenames: "laughter-sfx",
    },
    {
      ok: true,
      path: "laughter-sfx.mp3",
      duration: 3.2,
    },
  ),
  // 25. generate_audio_speech — with emotion + pronunciation_dict
  tool(
    "generate_audio_speech",
    {
      texts: "今晚的雨声真好听，适合安静地入睡。",
      voice_ids: "zh_female_shuangkuai",
      model_name: "speech-2.8-hd",
      speeds: 0.9,
      emotions: "calm",
      pronunciation_dict: {
        tone: ["处理/(chu3)(li3)"],
      },
      filenames: "rain",
    },
    {
      ok: true,
      path: "rain.mp3",
      duration: 4.5,
    },
  ),
  // 26. generate_audio_speech — multi-speaker dialogue
  tool(
    "generate_audio_speech",
    {
      texts: [
        "欢迎来到动物播客！",
        "今天我们聊聊可爱的小猪。",
        "太棒了，我最喜欢小猪！",
      ],
      voice_ids: [
        "zh_female_shuangkuai",
        "zh_male_wennuanmomo",
        "zh_female_shuangkuai",
      ],
      filenames: ["applause-sfx", "surprise-sfx", "audio_trimmed"],
      emotions: ["happy", "calm", "happy"],
      speeds: [1, 1, 1.1],
      model_name: "speech-2.8-hd",
    },
    {
      total: 3,
      results: [
        {
          index: 0,
          ok: true,
          path: "applause-sfx.mp3",
          duration: 2.1,
        },
        {
          index: 1,
          ok: true,
          path: "surprise-sfx.mp3",
          duration: 2.5,
        },
        {
          index: 2,
          ok: true,
          path: "audio_trimmed.mp3",
          duration: 2.3,
        },
      ],
    },
  ),
  // 27. voice_prepare clone
  tool(
    "voice_prepare",
    {
      items: [
        {
          action: "clone",
          audio_path: "audios/rainy-night-whisper.mp3",
        },
      ],
    },
    {
      ok: true,
      results: [
        {
          action: "clone",
          ok: true,
          voice_id: "hub_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        },
      ],
    },
  ),
  // 28. audio_separate
  tool(
    "audio_separate",
    {
      audio_path: "cyberpunk-synthwave-bgm.mp3",
      filename: "audio_trimmed",
    },
    {
      ok: true,
      voice_audio_path: "audio_trimmed_voice.aac",
      background_audio_path: "audio_trimmed_background.aac",
    },
  ),
  // ═══════════════════════════════════════════════════════════════
  // MUSIC — unified dispatcher and cover surface
  // ═══════════════════════════════════════════════════════════════
  // 29. lyrics_generation — write_full_song. Outputs TEXT (song_title /
  //      style_tags / lyrics), NOT a media file. Must render as a normal
  //      tool action; treating it as media generation made the file-count
  //      success check report 0 → false "Generation failed".
  tool(
    "lyrics_generation",
    {
      mode: "write_full_song",
      prompt:
        "中文原创流行舞曲歌词，主题围绕跳舞、律动、灯光、释放快乐与跟随节拍起舞；欢快、动感、积极、轻松、派对感，不要悲伤氛围；节奏明确，副歌有记忆点，适合带人声的流行舞曲",
      title: "今晚一起跳舞吧",
    },
    {
      song_title: "今晚一起跳舞吧",
      style_tags: "Pop, Dance, Upbeat, Female Vocals, Party",
      lyrics:
        "[Verse 1]\n灯光亮起的瞬间\n心跳跟着节拍点\n\n[Chorus]\n今晚一起跳舞吧\n在星光下释放吧",
    },
  ),
  // 30. generate_audio_music — with lyrics
  tool(
    "generate_audio_music",
    {
      vendor: "official",
      model_id: "music-3.0",
      mode: "song",
      prompt: "Upbeat pop song about cute animals, female vocals, energetic",
      lyrics:
        "[Verse 1]\n小猪小猪真可爱\n草地上跑来跑去\n\n[Chorus]\n今晚一起跳舞吧\n在星光下",
      filename: "cyberpunk-synthwave-bgm",
    },
    {
      path: "cyberpunk-synthwave-bgm.mp3",
      duration: 45,
    },
  ),
  // 31. generate_audio_music — BGM
  tool(
    "generate_audio_music",
    {
      vendor: "official",
      model_id: "music-3.0",
      mode: "instrumental",
      prompt:
        "Soft piano, rainy night atmosphere, gentle and calming, lo-fi ambient",
      filename: "rain",
    },
    {
      path: "rain.mp3",
      duration: 60,
    },
  ),
  // 32. music_cover — one-shot cover
  tool(
    "music_cover",
    {
      action: "generate",
      prompt: "Jazz piano cover, mellow and intimate nighttime atmosphere",
      audio: "cyberpunk-synthwave-bgm.mp3",
      filename: "laughter-sfx",
    },
    {
      path: "laughter-sfx.mp3",
      duration: 55,
    },
  ),
  // 33. music_cover prepare_lyrics — intermediate. Returns
  //     cover_feature_id + formatted_lyrics (NO media file). Echoed into
  //     data for the later music_cover generate action. Must not show as failed.
  tool(
    "music_cover",
    {
      action: "prepare_lyrics",
      audio: "cyberpunk-synthwave-bgm.mp3",
    },
    {
      cover_feature_id: "cf_a1b2c3d4e5f6",
      formatted_lyrics:
        "[Intro]\n\n[Verse]\n灯光亮起的瞬间\n心跳跟着节拍点\n\n[Chorus]\n今晚一起跳舞吧\n\n[Outro]",
      audio_duration: 48,
      structure_result: "Intro/Verse/Chorus/Outro",
    },
  ),
  // ═══════════════════════════════════════════════════════════════
  // EDITING — active dedicated tools
  // ═══════════════════════════════════════════════════════════════
  // 34. merge_videos
  tool(
    "merge_videos",
    {
      video_paths: ["clip_005.mp4", "clip_006.mp4", "clip_007.mp4"],
      filename: "merged_video",
      scale_mode: "first",
    },
    {
      path: "merged_video.mp4",
    },
  ),
  // 36. batch_lip_sync
  tool(
    "batch_lip_sync",
    {
      video_paths: ["clip_005.mp4", "clip_006.mp4"],
      audio_paths: ["applause-sfx.mp3", "surprise-sfx.mp3"],
      filenames: ["clip_007", "clip_008"],
    },
    {
      results: [
        {
          ok: true,
          path: "clip_007.mp4",
        },
        {
          ok: true,
          path: "clip_008.mp4",
        },
      ],
    },
  ),
  // 38. image_remove_background
  tool(
    "image_remove_background",
    {
      image_path: "cute-pig-chef.jpg",
      filename: "cute-little-pig-realistic-cinematic",
    },
    {
      path: "cute-little-pig-realistic-cinematic.png",
    },
  ),
  // 39. ffmpeg — general purpose (trim video)
  tool(
    "ffmpeg",
    {
      args: [
        "-i",
        "merged_video.mp4",
        "-ss",
        "00:00:05",
        "-t",
        "00:00:10",
        "-c",
        "copy",
      ],
      output_type: "video",
      filename: "temp_12",
    },
    {
      path: "temp_12.mp4",
    },
  ),
  // ═══════════════════════════════════════════════════════════════
  // SPECIAL STATES
  // ═══════════════════════════════════════════════════════════════
  // 40. Running state — video generation in progress (seedance t2v)
  running("generate_video", {
    vendor: "seedance",
    mode: "t2v",
    model_id: "seedance2.0-fast",
    prompt:
      "Cinematic drone shot of a forest at dawn, mist rising between trees",
    filename: "forest-dawn",
    duration: 5,
    vendor_params: {
      aspect_ratio: "16:9",
      resolution: "480p",
      generate_audio: true,
    },
  }),
  // 41. Running state — image generation in progress (banana)
  running("generate_image", {
    vendor: "banana",
    model_id: "nano_banana_2",
    prompt: "Oil painting of a Venice canal at golden hour",
    filename: "venice-canal",
    vendor_params: {
      aspect_ratio: "3:2",
      resolution: "2K",
    },
  }),
  // 42. Error state — video failed (seedance deepfake guard)
  tool(
    "generate_video",
    {
      vendor: "seedance",
      mode: "i2v",
      model_id: "seedance2.0",
      prompt: "Animate this character walking",
      filename: "person-walking",
      first_frame_image: "asian-woman-character-ref.png",
      duration: 5,
      vendor_params: {
        aspect_ratio: "16:9",
        resolution: "480p",
        generate_audio: true,
      },
    },
    {
      error:
        "Error: Seedance 2.0 rejected a real-person image after gateway handling. Do not perform MCP-side avatar registration; private-asset retry is owned by the gateway Seedance backend. Revise the source media or prompt, or report the upstream rejection with the original error. Original error: may contain real person",
    },
    "error",
  ),
  // 43. Error state — TTS failed
  tool(
    "generate_audio_speech",
    {
      texts: "Some text that triggers safety filter",
      voice_ids: "Friendly_Person",
      model_name: "speech-2.8-hd",
      speeds: 1,
      filenames: "will-fail-tts",
    },
    {
      ok: false,
      error: "Content moderation: input text contains prohibited content",
    },
    "error",
  ),
  // 44. Batch with partial failure — image batch (banana, count=3)
  tool(
    "generate_image",
    {
      vendor: "banana",
      model_id: "nano_banana_2_flash",
      count: 3,
      prompts: [
        "Cute pig sleeping in hay",
        "Prohibited content here",
        "Cute pig with water barrel",
      ],
      filenames: [
        "cute-pink-pig-soft-hay",
        "prohibited",
        "cute-pig-water-barrel",
      ],
      vendor_params: {
        aspect_ratio: "1:1",
        resolution: "1K",
      },
    },
    {
      total: 3,
      succeeded: 2,
      results: [
        {
          index: 1,
          paths: ["cute-pink-pig-soft-hay.png"],
          width: 1024,
          height: 1024,
        },
        {
          index: 2,
          error: "Content policy violation",
        },
        {
          index: 3,
          paths: ["cute-pig-water-barrel.png"],
          width: 1024,
          height: 1024,
        },
      ],
    },
  ),
  // 45. Aborted — plain-text tool result (OpenCode failToolCall path). On
  //     history replay the tool comes back with a non-JSON result and a
  //     toolStatus that maps to 'ok' (older rows carry no explicit error
  //     status). The card must still surface the abort reason instead of
  //     rendering nothing. See message-reducer ERROR_RESULT_PATTERN /
  //     TimelineItem unparsedFailure fallback.
  {
    id: id(),
    role: "agent",
    type: "tool",
    content: `${PREFIX}generate_image`,
    toolName: `${PREFIX}generate_image`,
    toolStatus: "ok",
    toolArgs: JSON.stringify({
      vendor: "gpt-image",
      model_id: "gpt-image-2",
      count: 2,
      prompts: [
        "A cute puppy playing beside a small garden watering can in warm afternoon light",
        "A cute puppy curled on a picnic blanket in a quiet park",
      ],
      filenames: ["puppy-watering-can", "puppy-picnic-blanket"],
      vendor_params: {
        aspect_ratio: "1:1",
      },
    }),
    toolResult: "hub_generate_image: Tool execution aborted",
  },
];
