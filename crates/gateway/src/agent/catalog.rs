//! 应用内 agent 能用的工具目录。
//!
//! ## 为什么在 Rust 里再定义一份
//!
//! `mcp/src/tools.ts` 那 26 个是给**外部 opencode** 用的：opencode 通过
//! stdio 拉起 MCP server，server 再 HTTP 打回 gateway。
//!
//! 应用内的 agent 不走那条路 —— 它就在 gateway 进程里，**直接调自己的
//! handler**。中间插一个 MCP server 意味着：多一个进程、多一跳 HTTP、
//! 而且 agent 要等 opencode 起来才能干活。
//!
//! 代价是同一批工具有两处定义。用一个测试钉住：这里的每个名字都必须在
//! 官方那 58 个里（`docs/mcp-tools.md`），且和 MCP 那份的交集不为空。
//! 不同步的地方是**描述文本**，那本来就该按调用场景各写各的 ——
//! MCP 那份是写给 opencode 的官方 agent 看的，这份是写给我们自己的
//! 提示词看的。
//!
//! ## 描述怎么写
//!
//! 每条都要说清**什么时候用**和**什么时候别用**。只写"生成图片"的话，
//! 模型会拿它去做视频的关键帧、去做图生图，然后失败。

use serde_json::{Value, json};

/// 一个工具。
pub struct Tool {
    pub name: &'static str,
    pub description: &'static str,
    /// JSON Schema。`type: object` 那一层由 [`schema`] 补上。
    pub params: fn() -> Value,
}

fn s(desc: &str) -> Value {
    json!({ "type": "string", "description": desc })
}

/// 全部工具。**顺序就是模型看到的顺序** —— 把最常用的放前面：
/// 上下文里靠前的工具被选中的概率明显更高。
pub fn all() -> Vec<Tool> {
    vec![
        Tool {
            name: "canvas_list_nodes",
            description: "列出画布上现有的节点。**动手之前先调它** —— \
                用户说「把那张图…」时，你需要先知道画布上有什么、id 是什么。",
            params: || json!({ "type": { "type": "string", "description": "只看某一类：image / video / audio / text" } }),
        },
        Tool {
            name: "canvas_get_node",
            description: "读一个或多个节点的详情，文本节点会带上正文。\
                只要 id 和类型的话用 canvas_list_nodes 就够了，别用这个。",
            params: || json!({ "nodeIds": { "type": "array", "items": { "type": "string" } } }),
        },
        Tool {
            name: "list_capabilities",
            description: "这台机器上哪些模态可用、各自用的什么模型。\
                **不确定能不能做某件事时先问它**，而不是调用失败之后才知道。",
            params: || json!({ "modality": s("image / video / audio / speech，不给就全部") }),
        },
        Tool {
            name: "generate_image",
            description: "生成图片并放到画布上。传 image_paths 就是**图生图**\
                （改一张已有的图、换背景、换风格）；不传就是文生图。\
                视频的关键帧也用它先出图，别直接 generate_video。",
            params: || {
                json!({
                    "prompt": s("画面描述。越具体越好：主体、构图、光线、风格。"),
                    "image_paths": { "type": "array", "items": { "type": "string" },
                        "description": "底图的工作区相对路径。非空则走图生图。" },
                    "model_id": s("官方模型名，如 nano-banana。会路由到本机配置的模型。"),
                    "aspect_ratio": s("如 16:9 / 1:1 / 9:16"),
                    "resolution": s("如 1K / 2K"),
                })
            },
        },
        Tool {
            name: "generate_video",
            description: "生成视频并放到画布上。**先出关键帧再生视频** —— \
                视频比图贵得多也慢得多，构图不对的话在图那一步就该发现。\
                first_frame_image / last_frame_image 是关键帧；泛泛的风格参考\
                放 reference_image_paths，两者不是一回事。",
            params: || {
                json!({
                    "prompt": s("画面和运动的描述"),
                    "mode": s("first-last-frame / reference / text，不给按输入推断"),
                    "first_frame_image": s("首帧图的工作区相对路径"),
                    "last_frame_image": s("尾帧图的工作区相对路径"),
                    "reference_image_paths": { "type": "array", "items": { "type": "string" } },
                    "duration": { "type": "integer", "description": "秒" },
                    "model_id": s("官方模型名"),
                })
            },
        },
        Tool {
            name: "lyrics_generation",
            description: "起草或润色歌词，返回 song_title / style_tags / lyrics。\
                **要出带唱词的歌时必须先调它，并把结果原样念给用户确认**，\
                不要自己编歌词直接去生成。mode=edit 用来润色用户已经给的稿子。",
            params: || {
                json!({
                    "mode": s("write_full_song 或 edit"),
                    "prompt": s("主题和风格。write_full_song 时必填。"),
                    "lyrics": s("待润色的原稿。edit 时必填。"),
                    "title": s("指定歌名"),
                })
            },
        },
        Tool {
            name: "generate_audio_music",
            description: "生成音乐并放到画布上。prompt 写**风格**（流派/速度/\
                配器/情绪），lyrics 写**唱词** —— 两者必须分开传，揉在一起会\
                让引擎把风格描述唱出来，而且不报错。纯器乐传 mode=instrumental。",
            params: || {
                json!({
                    "prompt": s("风格描述。不是歌词。"),
                    "lyrics": s("唱词。纯器乐时留空。"),
                    "mode": s("song 或 instrumental"),
                    "model_id": s("官方模型名"),
                })
            },
        },
        Tool {
            name: "canvas_write_node",
            description: "在画布上写一个节点。kind=text 写 Markdown 文本\
                （分镜表、脚本、说明都用它）；kind=media 把工作区里已有的文件\
                放上画布。生成类工具会自己建节点，不用再调这个。",
            params: || {
                json!({
                    "kind": s("text 或 media"),
                    "content": s("[text] Markdown 正文"),
                    "name": s("[text] 文件名，不带扩展名"),
                    "assetPath": s("[media] 工作区相对路径"),
                })
            },
        },
        Tool {
            name: "canvas_group_nodes",
            description: "把几个节点framed 成一组，给它一个标签。\
                一轮做出多个产物之后用它归拢，画布不会散成一片。",
            params: || {
                json!({
                    "nodeIds": { "type": "array", "items": { "type": "string" } },
                    "label": s("组的名字"),
                })
            },
        },
        Tool {
            name: "read",
            description: "读工作区里的一个文本文件。二进制会被拒绝 —— \
                图片和音视频用画布节点看，别拿这个读。",
            params: || {
                json!({
                    "file_path": s("工作区相对路径"),
                    "offset": { "type": "integer" },
                    "limit": { "type": "integer" },
                })
            },
        },
        Tool {
            name: "memory",
            description: "跨轮记忆。action=write 记下用户的偏好和约定，\
                action=search / read 取回。**用户说「以后都这样」时要写一条**，\
                否则下次对话你不会知道。",
            params: || {
                json!({
                    "action": s("write / read / search / list / delete"),
                    "name": s("记忆名，小写字母数字连字符"),
                    "body": s("正文"),
                    "description": s("一句话说明，搜索时会匹配它"),
                    "query": s("search 时的关键词"),
                })
            },
        },
    ]
}

/// 转成 OpenAI 的 `tools` 数组。
pub fn schema() -> Vec<Value> {
    all()
        .into_iter()
        .map(|t| {
            let props = (t.params)();
            // required 一律留空。**模型漏填一个字段时，让工具自己报错并把
            // 原因回给它**，比让平台在请求层拒绝好 —— 后者的错误信息是
            // schema 违规，模型看不出该补什么。
            json!({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": { "type": "object", "properties": props, "required": [] },
                },
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_tool_name_is_one_of_the_officials() {
        // 自创名字的话，官方那套 agent 提示词永远不会提到它，
        // 而我们自己的提示词又和官方分叉了。
        let spec = include_str!("../../../../docs/mcp-tools.md");
        for t in all() {
            assert!(
                spec.contains(&format!("`{}`", t.name)),
                "{} 不在官方工具清单里",
                t.name
            );
        }
    }

    #[test]
    fn descriptions_say_when_not_to_use_the_tool() {
        // 只写"生成图片"的话，模型会拿它去做视频关键帧、去做图生图，
        // 然后失败。每条都要有边界。
        for t in all() {
            assert!(
                t.description.chars().count() > 20,
                "{} 的描述太短，说不清什么时候该用",
                t.name
            );
        }
    }

    #[test]
    fn the_schema_is_a_valid_tools_array() {
        let s = schema();
        assert_eq!(s.len(), all().len());
        for t in &s {
            assert_eq!(t["type"], "function");
            assert!(
                t["function"]["name"]
                    .as_str()
                    .is_some_and(|n| !n.is_empty())
            );
            assert_eq!(t["function"]["parameters"]["type"], "object");
        }
    }

    #[test]
    fn the_most_used_tools_come_first() {
        // 上下文里靠前的工具被选中的概率明显更高。看画布应该排在
        // 生成之前 —— 先看再动。
        let names: Vec<&str> = all().iter().map(|t| t.name).collect();
        let list = names
            .iter()
            .position(|n| *n == "canvas_list_nodes")
            .unwrap();
        let gen_at = names.iter().position(|n| *n == "generate_image").unwrap();
        assert!(
            list < gen_at,
            "canvas_list_nodes 应该排在 generate_image 前面"
        );
    }
}
