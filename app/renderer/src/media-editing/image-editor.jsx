// image-editor.jsx
import { Editor2 } from "./editor2.js";
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

function createEditor(options) {
  return new Editor2(options);
}

export const ImageEditor = reactExports.forwardRef(
  function ImageEditor2(props, ref) {
    const containerRef = reactExports.useRef(null);
    const editorRef = reactExports.useRef(null);
    const callbacksRef = reactExports.useRef({
      onChange: props.onChange,
      onReady: props.onReady,
      onError: props.onError,
    });
    const initRef = reactExports.useRef({
      src: props.src,
      width: props.width,
      height: props.height,
      initialTool: props.initialTool,
      initialStyle: props.initialStyle,
      disableShortcuts: props.disableShortcuts,
    });
    reactExports.useLayoutEffect(() => {
      if (!containerRef.current) return;
      const editor = createEditor({
        container: containerRef.current,
        image: initRef.current.src,
        width: initRef.current.width,
        height: initRef.current.height,
        initialStyle: initRef.current.initialStyle,
        disableShortcuts: initRef.current.disableShortcuts,
      });
      editorRef.current = editor;
      if (initRef.current.initialTool) {
        editor.setTool(initRef.current.initialTool);
      }
      const offChange = editor.on("change", (state2) => {
        callbacksRef.current.onChange?.(state2);
      });
      const offReady = editor.on("ready", () => {
        callbacksRef.current.onReady?.();
      });
      const offError = editor.on("error", (error) =>
        callbacksRef.current.onError?.(error),
      );
      return () => {
        offError();
        offChange();
        offReady();
        editor.destroy();
        editorRef.current = null;
      };
    }, []);
    const initialSrcRef = reactExports.useRef(props.src);
    reactExports.useEffect(() => {
      if (props.src === initialSrcRef.current) return;
      void editorRef.current?.loadImage(props.src).catch(() => void 0);
    }, [props.src]);
    reactExports.useEffect(() => {
      if (props.uiScale === void 0) return;
      editorRef.current?.setUiScale(props.uiScale);
    }, [props.uiScale]);
    reactExports.useEffect(() => {
      callbacksRef.current.onChange = props.onChange;
      callbacksRef.current.onReady = props.onReady;
      callbacksRef.current.onError = props.onError;
    }, [props.onChange, props.onReady, props.onError]);
    reactExports.useImperativeHandle(
      ref,
      () => ({
        setTool: (t2) => editorRef.current?.setTool(t2),
        setStyle: (s2) => editorRef.current?.setStyle(s2),
        undo: () => editorRef.current?.undo(),
        redo: () => editorRef.current?.redo(),
        clear: () => editorRef.current?.clear(),
        deleteSelected: () => editorRef.current?.deleteSelected(),
        loadImage: (src) => {
          const editor = editorRef.current;
          if (!editor) return Promise.resolve();
          return editor.loadImage(src);
        },
        toBlob: (type2, quality) => {
          const editor = editorRef.current;
          if (!editor)
            return Promise.reject(new Error("ImageEditor not ready"));
          return editor.toBlob(type2, quality);
        },
        toDataURL: (type2, quality) => {
          const editor = editorRef.current;
          if (!editor) return "";
          return editor.toDataURL(type2, quality);
        },
        getEditor: () => editorRef.current,
        getSize: () => editorRef.current?.getSize() ?? null,
      }),
      [],
    );
    return (
      <div
        ref={containerRef}
        className={props.className}
        style={{
          position: "relative",
          display: "inline-block",
          userSelect: "none",
          ...props.style,
        }}
      />
    );
  },
);
