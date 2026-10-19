/**
 * 文档编辑用的标记与解析正则。
 *
 * 编辑器把「这次要改什么」包在标签里随消息发给模型，回头再从消息里把这段剥出来。
 * 剥的时候用**非贪婪**匹配是有意的：结束标签只会出现一次（gateway 在用户内容之前发出），
 * 所以第一个匹配就是真正的边界 —— 即使用户正文里恰好写了同样的字面量。
 */
export const DOCUMENT_EDIT_TASK_TAG = "document_edit_task";
export const DOCUMENT_EDIT_TASK_RE = new RegExp(`^<${DOCUMENT_EDIT_TASK_TAG}>\\n\\n([\\s\\S]*?)\\n\\n</${DOCUMENT_EDIT_TASK_TAG}>(?:\\n\\n([\\s\\S]*))?$`);
export const PLUGIN_EDITING_CONTEXT_TAG = "plugin_editing_context";
export const EDITING_CONTEXT_WRAPPER_RES = [PLUGIN_EDITING_CONTEXT_TAG].map(
  // Non-greedy body: the closing tag appears exactly once (the gateway emits
  // it before the user content), so the FIRST match is the real boundary even
  // if the user text happens to contain the literal.
  (tag) => new RegExp(`^<${tag}>\\n\\n[\\s\\S]*?\\n\\n</${tag}>(?:\\n\\n([\\s\\S]*))?$`)
);

