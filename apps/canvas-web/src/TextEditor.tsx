import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import { EditorContent, useEditor } from "@tiptap/react"
import { useEffect, useRef } from "react"

/**
 * 文本节点的编辑器。
 *
 * ## 为什么是纯文本 schema，而不是 StarterKit
 *
 * 画布的文本节点存的是 **Markdown 源码**（落盘就是工作区里的一个 `.md`）。
 * 用 tiptap 的富文本 schema 打开它会出两种事，而且都不报错：
 *
 * - `setContent(string)` 走的是 HTML 解析，源码里的 `<br>`、`<div>` 会被
 *   当标签吃掉
 * - StarterKit 带 heading / list / bold 等节点，保存时序列化回去的是
 *   编辑器认为的结构，而不是用户原来那份源码
 *
 * 两种都表现为"编辑完保存，Markdown 悄悄变了形"。所以这里把 schema 收窄到
 * `doc + paragraph + text`：一行一个段落，进出都是纯文本。
 *
 * 用 tiptap 而不是 `<textarea>`，是为了和官方那边的选型对齐 ——
 * 将来要加行内标注、协同光标、`@` 提及时，扩展点已经在了。
 */
export function TextEditor({
  value,
  onChange,
  onDone,
}: {
  value: string
  onChange: (next: string) => void
  onDone: () => void
}) {
  // onChange 每次都是新函数，直接进 tiptap 的回调会闭包到旧值。
  const latest = useRef(onChange)
  latest.current = onChange

  const editor = useEditor({
    extensions: [Document, Paragraph, Text],
    // 一行一个段落。空行也要保留 —— Markdown 里空行是段落分隔符，
    // 吃掉它会把两段并成一段。
    content: {
      type: "doc",
      content: value.split("\n").map((line) => ({
        type: "paragraph",
        ...(line ? { content: [{ type: "text", text: line }] } : {}),
      })),
    },
    editorProps: {
      attributes: {
        class: "h-full w-full overflow-auto p-2.5 font-mono text-[11px] leading-6 outline-none",
      },
    },
    onUpdate: ({ editor }) => latest.current(editor.getText({ blockSeparator: "\n" })),
  })

  useEffect(() => {
    editor?.commands.focus("end")
  }, [editor])

  return (
    <div
      className="h-full w-full"
      // 画布在拖拽/缩放时会吞掉指针事件，编辑器里必须挡住。
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        // Esc 退出编辑；Cmd/Ctrl+Enter 保存并退出。
        if (e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key === "Enter")) {
          e.preventDefault()
          onDone()
        }
      }}
    >
      <EditorContent editor={editor} className="h-full w-full" />
    </div>
  )
}
