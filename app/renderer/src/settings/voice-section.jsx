// voice-section.jsx
// 设置页「音色」分区：列出预置/克隆音色，支持试听、录音、上传与删除。
//
// 为什么要有这一页：平台上**没有"预设音色名"**（音色只能是一段参考音频），助手在需要旁白时
// 只能问用户"用哪个音色"；没有这一页，用户无处上传/录制，对话就卡在那里。
import reactExports from "react";
import { useTranslation } from "react-i18next";
import { __jsx } from "../shared/jsx-runtime.js";
import { Button } from "../infra/dialog-content.jsx";
import { dedupedToast, useScopedHttpClient } from "../infra/agent-http-client.js";
import { SettingGroup, SettingRow } from "./settings-select.jsx";

/** 录音引导文案：中性叙述语气、四声齐全，正常语速 8–9 秒。 */
const RECORD_SCRIPT = "今天天气不错，我打算下午去公园走一走，顺便把上周借的书还掉，回来的路上再买点水果。";
const RECORD_MIN_MS = 3000;
const RECORD_MAX_MS = 20000;

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("读取音频失败"));
    reader.readAsDataURL(blob);
  });
}

export function VoiceSection() {
  const { t } = useTranslation();
  const client = useScopedHttpClient();
  const [voices, setVoices] = reactExports.useState([]);
  const [error, setError] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState("");
  const [recording, setRecording] = reactExports.useState(false);
  const recorderRef = reactExports.useRef(null);
  const chunksRef = reactExports.useRef([]);
  const timerRef = reactExports.useRef(null);

  const reload = reactExports.useCallback(async () => {
    if (!client) return;
    try {
      const list = await client.listVoices();
      setVoices(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      setError(String(err?.message ?? err));
    }
  }, [client]);

  reactExports.useEffect(() => {
    void reload();
  }, [reload]);

  const cloneFromBlob = async (blob, filename) => {
    if (!client) return;
    setBusy("upload");
    try {
      const audio_base64 = await blobToBase64(blob);
      await client.cloneVoiceFromBase64({ audio_base64, filename, demo_text: RECORD_SCRIPT });
      dedupedToast(t("ov.voices.added"), "success");
      await reload();
    } catch (err) {
      dedupedToast(`${t("ov.voices.addFailed")}: ${err?.message ?? err}`, "error");
    } finally {
      setBusy("");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        clearTimeout(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
        if (blob.size > 0) await cloneFromBlob(blob, "recording.webm");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      timerRef.current = setTimeout(() => recorder.state === "recording" && recorder.stop(), RECORD_MAX_MS);
    } catch (err) {
      dedupedToast(`麦克风不可用: ${err?.message ?? err}`, "error");
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    const elapsed = chunksRef.current.length === 0 ? 0 : undefined;
    void elapsed;
    recorder.stop();
  };

  const onPickFile = async (event) => {
    const file = event.target.files?.[0];
    if (file) await cloneFromBlob(file, file.name);
    event.target.value = "";
  };

  const remove = async (voiceId) => {
    if (!client) return;
    setBusy(voiceId);
    try {
      const result = await client.deleteVoice(voiceId);
      if (result?.deleted === false) dedupedToast(result.reason ?? t("ov.voices.cannotDelete"), "error");
      await reload();
    } catch (err) {
      dedupedToast(`${t("ov.voices.deleteFailed")}: ${err?.message ?? err}`, "error");
    } finally {
      setBusy("");
    }
  };

  if (!client) return __jsx("p", { className: "text-xs text-muted-foreground" }, t("ov.voices.noWorkspace"));
  if (error) return __jsx("p", { className: "text-xs text-destructive" }, `${t("ov.voices.loadFailed")}: ${error}`);

  return __jsx("div", {
    className: "space-y-6",
    children: [
      __jsx(SettingGroup, {
        title: t("ov.voices.groupTitle"),
        description: t("ov.voices.groupHint"),
        children: [
          __jsx(SettingRow, {
            label: t("ov.voices.record"),
            description: RECORD_SCRIPT,
            children: [
              recording
                ? __jsx(Button, { variant: "secondary", onClick: stopRecording, children: t("ov.voices.stop") })
                : __jsx(Button, { variant: "secondary", disabled: busy === "upload", onClick: startRecording, children: t("ov.voices.start") }),
            ],
          }),
          __jsx(SettingRow, {
            label: t("ov.voices.upload"),
            description: t("ov.voices.uploadHint"),
            children: __jsx("label", {
              className: "inline-flex",
              children: [
                __jsx("input", {
                  type: "file",
                  accept: "audio/wav,audio/mpeg,audio/mp4,audio/webm,audio/ogg",
                  className: "hidden",
                  onChange: onPickFile,
                  disabled: busy === "upload",
                }),
                __jsx(Button, { variant: "secondary", children: t("ov.voices.pickFile") }),
              ],
            }),
          }),
        ],
      }),
      __jsx(SettingGroup, {
        title: t("ov.voices.list"),
        description: t("ov.voices.countHint", { count: voices.length }),
        children: voices.length === 0
          ? __jsx("p", { className: "text-xs text-muted-foreground" }, t("ov.voices.empty"))
          : voices.map((voice) =>
              __jsx(
                SettingRow,
                {
                  label: voice.name || voice.voice_id,
                  description: [voice.gender, voice.language, voice.voice_id].filter(Boolean).join(" · "),
                  children: [
                    __jsx("audio", {
                      controls: true,
                      preload: "none",
                      className: "h-8",
                      src: client.voicePreviewUrl(voice.voice_id),
                    }),
                    __jsx(Button, {
                      variant: "ghost",
                      disabled: busy === voice.voice_id || String(voice.voice_id).startsWith("preset_"),
                      onClick: () => remove(voice.voice_id),
                      children: t("ov.voices.delete"),
                    }),
                  ],
                },
                voice.voice_id,
              ),
            ),
      }),
    ],
  });
}
