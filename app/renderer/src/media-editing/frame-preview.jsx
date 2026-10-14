// frame-preview.jsx
import reactExports from "react";
import { __jsx } from "../shared/jsx-runtime.js";
import { MediaClipPanel } from "./media-clip-panel.js";

function FramePreview({ engine, state, loading, previewSize }) {
  const previewCanvasRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !state.previewFrame) return;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) return;
    const { width, height } = state.previewFrame;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    } else {
      canvasContext.clearRect(0, 0, width, height);
    }
    canvasContext.drawImage(state.previewFrame, 0, 0);
  }, [state.previewFrame]);
  reactExports.useEffect(() => {
    if (!engine) return;
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const previewCanvasContext = previewCanvas.getContext("2d");
    if (!previewCanvasContext) return;
    engine.onPreviewFrameDirect = (source, width, height) => {
      if (previewCanvas.width !== width || previewCanvas.height !== height) {
        previewCanvas.width = width;
        previewCanvas.height = height;
      } else {
        previewCanvasContext.clearRect(0, 0, width, height);
      }
      previewCanvasContext.drawImage(source, 0, 0, width, height);
    };
    return () => {
      engine.onPreviewFrameDirect = null;
    };
  }, [engine]);
  const maxPreviewWidth = 768;
  const maxPreviewHeight = 432;
  let displayW = maxPreviewWidth;
  let displayH = maxPreviewHeight;
  if (previewSize.w > 0 && previewSize.h > 0) {
    const aspectRatio = previewSize.w / previewSize.h;
    if (aspectRatio >= maxPreviewWidth / maxPreviewHeight) {
      displayW = maxPreviewWidth;
      displayH = Math.round(maxPreviewWidth / aspectRatio);
    } else {
      displayH = maxPreviewHeight;
      displayW = Math.round(maxPreviewHeight * aspectRatio);
    }
  }
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[var(--canvas-controls-bg)] px-4 py-4">
      <canvas
        ref={previewCanvasRef}
        className="h-full w-full"
        style={{
          maxWidth: displayW,
          maxHeight: displayH,
          objectFit: "contain",
          borderRadius: 6,
        }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
        </div>
      )}
    </div>
  );
}

async function extractFrameAtPlayhead(engine, videoName) {
  const { currentTime } = engine.getState();
  const bitmap = await engine.getPreviewFrame(currentTime);
  if (!bitmap) return null;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const captureCanvasContext = canvas.getContext("2d");
  if (!captureCanvasContext) return null;
  captureCanvasContext.drawImage(bitmap, 0, 0);
  const blob = await new Promise((resolve) => {
    canvas.toBlob((imageBlob) => resolve(imageBlob), "image/png");
  });
  if (!blob) return null;
  const baseName = videoName.replace(/\.[^.]+$/, "");
  const uuid = crypto.randomUUID().slice(0, 4);
  const filename = `${baseName}-frame-${uuid}.png`;
  return {
    blob,
    filename,
  };
}

function VideoFramePanelInner({ videoUrl, videoName, onClose, onExport }) {
  const [previewSize, setPreviewSize] = reactExports.useState({
    w: 640,
    h: 360,
  });
  const handleMediaLoaded = reactExports.useCallback((engine) => {
    const clips = engine.getClips();
    if (clips.length > 0 && clips[0].width > 0 && clips[0].height > 0) {
      setPreviewSize({
        w: clips[0].width,
        h: clips[0].height,
      });
    }
  }, []);
  const renderPreview = reactExports.useCallback(
    (previewProps) => <FramePreview {...previewProps} previewSize={previewSize} />,
    [previewSize],
  );
  return (
    <MediaClipPanel
      mediaUrl={videoUrl}
      mediaName={videoName}
      defaultMime="video/mp4"
      onClose={onClose}
      onExport={onExport}
      renderPreview={renderPreview}
      onMediaLoaded={handleMediaLoaded}
      getExtFromMime={() => "png"}
      titleKey="canvas.extractFrame"
      exportLabelKey="canvas.extractFrame"
      cropEnabled={false}
      produceExport={extractFrameAtPlayhead}
    />
  );
}

export const VideoFramePanel = reactExports.memo(VideoFramePanelInner);
