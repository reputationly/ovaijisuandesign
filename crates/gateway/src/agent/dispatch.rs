//! 把一次工具调用接到 gateway 自己的 handler 上。
//!
//! **进程内直调，不发 HTTP 给自己。** 自己给自己发 HTTP 要多一跳、要知道
//! 自己监听在哪个端口（而端口可配、还可能是被别人先起的那个进程），
//! 出错时的错误信息还会变成一个和真实原因无关的网络错误。
//!
//! ## 生成类工具在这里等到底
//!
//! `generate_image` 那几个是"提交拿 task_id → 轮询"。MCP 那边由 TS 侧轮询；
//! 这里由我们自己轮。**必须等出结果再回给模型** —— 回一个 task_id 的话，
//! 模型要么当成已经完成（于是告诉用户"图已生成"而画布上什么都没有），
//! 要么自己发明一个查询工具去轮询。

use std::sync::Arc;
use std::time::{Duration, Instant};

use serde_json::{Value, json};

use crate::AppState;

/// 单个工具的执行上限。
///
/// 视频能跑十分钟，所以给得比一般请求宽。但必须有 —— 没有的话一次卡住的
/// 生成会让整个对话永远停在那一步，而用户看到的只是"还在转"。
const TOOL_TIMEOUT: Duration = Duration::from_secs(12 * 60);
const POLL_INTERVAL: Duration = Duration::from_secs(2);

/// 执行一次工具调用，返回**给模型看的结果**（JSON 字符串）。
///
/// 永远返回 `Ok` —— 工具失败也是一条要回给模型的信息，让它换个做法或者
/// 告诉用户。把失败变成 `Err` 会中断整轮对话，而用户只看到一个红字。
pub async fn call(state: &Arc<AppState>, name: &str, args: &str) -> String {
    let parsed: Value = serde_json::from_str(args).unwrap_or_else(|_| json!({}));
    // 参数解析失败**如实回给模型**，让它重发一次正确的 JSON。
    if serde_json::from_str::<Value>(args).is_err() && !args.trim().is_empty() {
        return err(&format!("参数不是合法 JSON，收到：{args}"));
    }
    let v = &parsed;

    let out = match name {
        "canvas_list_nodes" => {
            let q = v.get("type").and_then(Value::as_str).unwrap_or("");
            let file = crate::canvas::read(&state.ws.canvas_path());
            // 只回模型用得上的几个字段。整份节点结构里有坐标、尺寸、
            // 四套 positions —— 那些对它做决定毫无帮助，只会挤占上下文。
            let nodes: Vec<Value> = file
                .nodes
                .iter()
                .filter(|n| q.is_empty() || n.kind == q)
                .map(|n| {
                    json!({
                        "id": n.id,
                        "type": n.kind,
                        "assetPath": n.asset_id.as_deref()
                            .and_then(|id| state.assets.by_id(id)).map(|a| a.path),
                    })
                })
                .collect();
            json!({ "ok": true, "count": nodes.len(), "nodes": nodes })
        }

        "canvas_get_node" => {
            let ids: Vec<String> = v
                .get("nodeIds")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|x| x.as_str().map(str::to_string))
                        .collect()
                })
                .unwrap_or_default();
            if ids.is_empty() {
                return err("要给 nodeIds");
            }
            let Ok(body) = serde_json::from_value(json!({ "nodeIds": ids })) else {
                return err("nodeIds 形状不对");
            };
            crate::api_canvas::node_detail(axum::extract::State(state.clone()), axum::Json(body))
                .await
                .0
        }

        "list_capabilities" => {
            let body = v.get("modality").and_then(Value::as_str).map(|m| {
                axum::Json(crate::capabilities::Body {
                    modality: Some(m.into()),
                })
            });
            crate::capabilities::list(axum::extract::State(state.clone()), body)
                .await
                .0
        }

        "generate_image" => {
            let body = json!({
                "prompt": v.get("prompt").and_then(Value::as_str).unwrap_or(""),
                "image_paths": v.get("image_paths").cloned().unwrap_or(json!([])),
                "model_id": v.get("model_id"),
                "params": {
                    "aspect_ratio": v.get("aspect_ratio").and_then(Value::as_str).unwrap_or(""),
                    "resolution": v.get("resolution").and_then(Value::as_str).unwrap_or(""),
                },
            });
            return submit_and_wait(state, "image", body).await;
        }

        "generate_video" => {
            let mut body = v.clone();
            body["params"] = json!({
                "aspect_ratio": v.get("aspect_ratio").and_then(Value::as_str).unwrap_or(""),
                "resolution": v.get("resolution").and_then(Value::as_str).unwrap_or(""),
            });
            return submit_and_wait(state, "video", body).await;
        }

        "generate_audio_music" => {
            return submit_and_wait(state, "music", v.clone()).await;
        }

        "lyrics_generation" => {
            let mode = maas_media::lyrics::Mode::parse(v.get("mode").and_then(Value::as_str));
            match maas_media::lyrics::draft(
                &state.client,
                &state.media,
                mode,
                v.get("prompt").and_then(Value::as_str).unwrap_or(""),
                v.get("lyrics").and_then(Value::as_str).unwrap_or(""),
                v.get("title").and_then(Value::as_str),
            )
            .await
            {
                Ok(d) => json!({
                    "ok": true, "song_title": d.song_title,
                    "style_tags": d.style_tags, "lyrics": d.lyrics,
                }),
                Err(e) => return err(&e.message),
            }
        }

        "canvas_write_node" => {
            let kind = v.get("kind").and_then(Value::as_str).unwrap_or_else(|| {
                if v.get("assetPath").is_some() {
                    "media"
                } else {
                    "text"
                }
            });
            if kind == "media" {
                let Some(p) = v.get("assetPath").and_then(Value::as_str) else {
                    return err("kind=media 要给 assetPath");
                };
                let Ok(body) = serde_json::from_value(json!({ "assetPath": p })) else {
                    return err("assetPath 形状不对");
                };
                body_json(
                    crate::api_canvas::media_node(
                        axum::extract::State(state.clone()),
                        axum::Json(body),
                    )
                    .await,
                )
                .await
            } else {
                let Ok(body) = serde_json::from_value(json!({
                    "content": v.get("content").and_then(Value::as_str).unwrap_or(""),
                    "name": v.get("name"),
                })) else {
                    return err("content 形状不对");
                };
                body_json(
                    crate::api_canvas::text_node(
                        axum::extract::State(state.clone()),
                        axum::Json(body),
                    )
                    .await,
                )
                .await
            }
        }

        "canvas_group_nodes" => {
            let Ok(body) = serde_json::from_value(v.clone()) else {
                return err("group_nodes 要给 nodeIds");
            };
            let (_, b) = crate::api_group::group_nodes(
                axum::extract::State(state.clone()),
                axum::Json(body),
            )
            .await;
            b.0
        }

        "read" => {
            let Ok(body) = serde_json::from_value(v.clone()) else {
                return err("要给 file_path");
            };
            let (_, b) =
                crate::api_text::read_file(axum::extract::State(state.clone()), axum::Json(body))
                    .await;
            b.0
        }

        "memory" => {
            let Ok(body) = serde_json::from_value(v.clone()) else {
                return err("memory 要给 action");
            };
            let (_, b) =
                crate::memory::memory(axum::extract::State(state.clone()), axum::Json(body)).await;
            b.0
        }

        // 认不出的工具名**如实说，并列出有哪些**。模型偶尔会凭印象调一个
        // 官方有、我们没实现的工具；告诉它有什么比只说"未知工具"有用。
        other => {
            let names: Vec<&str> = super::catalog::all().iter().map(|t| t.name).collect();
            return err(&format!(
                "没有 {other} 这个工具。可用的是：{}",
                names.join(", ")
            ));
        }
    };
    out.to_string()
}

/// 这次生成的输入素材对应画布上的哪些节点。
///
/// 模型传下来的是工作区相对路径（`image_paths`），而画布节点带的是
/// `assetId`。中间靠资产索引换算。
///
/// **找不到就跳过，不报错。** 输入可能来自工作区里一个还没放上画布的文件
/// （比如 IM 发来的附件），那时候连不上是正常的。
fn source_nodes(state: &Arc<AppState>, body: &Value) -> Vec<String> {
    let paths: Vec<&str> = body
        .get("image_paths")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    if paths.is_empty() {
        return Vec::new();
    }
    let ids: Vec<String> = paths
        .iter()
        .filter_map(|p| state.assets.by_path(p).map(|a| a.id))
        .collect();
    if ids.is_empty() {
        return Vec::new();
    }
    let file = crate::canvas::read(&state.ws.canvas_path());
    file.nodes
        .iter()
        .filter(|n| {
            n.asset_id
                .as_deref()
                .is_some_and(|a| ids.iter().any(|i| i == a))
        })
        .map(|n| n.id.clone())
        .collect()
}

/// 把工作区里的一个文件放到画布上，返回节点 id。
///
/// 走的是 `media_node`,和界面上传、IM 附件同一条路 —— 于是它会被登记进
/// 资产索引、按类型归档、发出 `canvas:changed`。
async fn place(state: &Arc<AppState>, path: &str, sources: &[String]) -> Result<String, String> {
    if path.trim().is_empty() {
        return Err("生成结果里没有 path".into());
    }
    // `sourceNodeIds` 让产物连回它的输入。不带的话画布上是一堆孤立的卡片，
    // **看不出哪张图是从哪张图来的** —— 而这正是画布相对聊天的意义。
    let body = serde_json::from_value(json!({
        "assetPath": path,
        "sourceNodeIds": sources,
    }))
    .map_err(|e| format!("assetPath 形状不对：{e}"))?;
    let v = body_json(
        crate::api_canvas::media_node(axum::extract::State(state.clone()), axum::Json(body)).await,
    )
    .await;
    if v.get("ok").and_then(Value::as_bool) == Some(false) {
        return Err(v
            .get("error")
            .map(|e| e.to_string())
            .unwrap_or_else(|| v.to_string()));
    }
    // 字段是 `nodeId`（`media_node` 新建和复用两条路都回它）。取错名字的话
    // 这里会静默拿到空串，模型下一步想引用这个节点就引用了个空 id。
    v.get("nodeId")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .ok_or_else(|| format!("media_node 没有回 nodeId：{v}"))
}

/// 把一个 `Response` 读成 JSON。
///
/// `media_node` / `text_node` 回的是 `Response` 而不是 `Json<Value>` ——
/// 它们要按情况回不同的状态码和纯文本错误。这里统一收成给模型看的 JSON：
/// **非 2xx 时把正文当错误信息**，那正是"assetPath 不能为空"这类提示，
/// 直接回给模型它就知道该补什么。
async fn body_json(resp: axum::response::Response) -> Value {
    use axum::body::to_bytes;
    let ok = resp.status().is_success();
    let bytes = to_bytes(resp.into_body(), 1 << 20)
        .await
        .unwrap_or_default();
    let text = String::from_utf8_lossy(&bytes).to_string();
    match serde_json::from_str::<Value>(&text) {
        Ok(v) if ok => v,
        Ok(v) => json!({ "ok": false, "error": v }),
        Err(_) => {
            if ok {
                json!({ "ok": true, "result": text })
            } else {
                json!({ "ok": false, "error": text })
            }
        }
    }
}

fn err(msg: &str) -> String {
    json!({ "ok": false, "error": msg }).to_string()
}

/// 提交一次生成并轮询到底。
async fn submit_and_wait(state: &Arc<AppState>, kind: &str, body: Value) -> String {
    // 这次生成用了画布上的哪些节点当输入。**按素材路径反查节点** ——
    // 模型给的是 `images/xxx.png` 这种路径，画布上的节点带的是 assetId。
    let sources = source_nodes(state, &body);
    let bytes = axum::body::Bytes::from(body.to_string());
    let st = axum::extract::State(state.clone());
    let resp = match kind {
        "image" => crate::generate::submit_image(st, bytes).await,
        "video" => crate::generate::submit_video(st, bytes).await,
        _ => crate::generate::submit_music(st, bytes).await,
    };
    let Some(task) = resp
        .0
        .get("task_id")
        .and_then(Value::as_str)
        .map(str::to_string)
    else {
        return err("提交失败，没拿到 task_id");
    };

    let started = Instant::now();
    loop {
        if started.elapsed() > TOOL_TIMEOUT {
            return err("生成超时");
        }
        tokio::time::sleep(POLL_INTERVAL).await;
        let v = crate::generate::task_response(&task, state.tasks.get(&task));
        match v.get("status").and_then(Value::as_str) {
            Some("succeeded") => {
                let path = v
                    .pointer("/result/path")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                // **建节点这一步必须真的做。** 生成只是把文件写进工作区，
                // 画布上什么都不会出现 —— MCP 那条路由 TS 侧的
                // `placeOnCanvas` 负责，这里得我们自己来。
                //
                // 不做而直接回"已放到画布上"的话，模型会照着这句话告诉用户
                // 图已经出好了，用户看到的却是一张空画布。而且 catalog 里
                // 写着"生成类工具会自己建节点，不用再调 canvas_write_node"，
                // 模型连补一刀的机会都没有。
                let placed = place(state, &path, &sources).await;
                // 结果里**带上 path**：模型下一步可能要拿它当底图或参考帧。
                return match placed {
                    Ok(node_id) => json!({
                        "ok": true, "path": path, "nodeId": node_id,
                        "note": "已放到画布上"
                    })
                    .to_string(),
                    // 生成成功但没落上 —— **如实说**。含糊过去的话模型会说
                    // "已放到画布上"，而用户看着空画布无从判断哪一步出了错。
                    Err(e) => json!({
                        "ok": false, "path": path,
                        "error": format!("已生成 {path}，但建画布节点失败：{e}"),
                        "note": "文件在工作区里，可以用 canvas_write_node 重试"
                    })
                    .to_string(),
                };
            }
            Some("failed") => {
                return err(v
                    .get("user_message")
                    .and_then(Value::as_str)
                    .unwrap_or("生成失败"));
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state(dir: &std::path::Path) -> Arc<AppState> {
        let ws = crate::workspace::Workspace::new(dir);
        Arc::new(AppState {
            ws: ws.clone(),
            assets: Arc::new(crate::assets::Assets::load(ws)),
            events: Arc::new(crate::events::Events::new()),
            canvas_lock: Default::default(),
            media: Arc::new(maas_media::MediaConfig::default()),
            client: reqwest::Client::builder().no_proxy().build().unwrap(),
            local: reqwest::Client::builder().no_proxy().build().unwrap(),
            tasks: Arc::new(crate::tasks::TaskStore::new()),
            updater: Arc::new(crate::update::Updater::new()),
            questions: Arc::new(crate::question::Questions::new()),
            activity: Arc::new(crate::activity::Activity::new()),
            agent: Arc::new(crate::agent::Agent::new()),
            feishu: Arc::new(crate::feishu::bridge::Bridge::new()),
            awake: Arc::new(crate::awake::Keeper::default()),
            wechat: Arc::new(crate::wechat::Wechat::new()),
            upstream: None,
            web_dir: None,
        })
    }

    /// 一张真的 1x1 PNG。`media_node` 会去读尺寸，随便几个字节不行。
    const PNG: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F,
        0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00,
        0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    #[tokio::test]
    async fn a_generated_file_really_ends_up_as_a_canvas_node() {
        // 生成只是把文件写进工作区，画布上什么都不会出现。这一步不做而
        // 直接回"已放到画布上"的话，模型会照着这句话告诉用户图已经出好了，
        // 用户看到的却是一张空画布 —— 而且中间没有任何报错。
        let dir = tempfile::tempdir().unwrap();
        let st = state(dir.path());
        std::fs::create_dir_all(dir.path().join("images")).unwrap();
        std::fs::write(dir.path().join("images/a.png"), PNG).unwrap();

        let node_id = place(&st, "images/a.png", &[]).await.expect("应当建出节点");
        assert!(!node_id.is_empty(), "nodeId 不能是空串");

        let file = crate::canvas::read(&st.ws.canvas_path());
        assert_eq!(file.nodes.len(), 1, "画布上应当有一个节点");
        assert_eq!(file.nodes[0].id, node_id);
    }

    #[tokio::test]
    async fn a_missing_file_is_reported_not_swallowed() {
        // 报成功的话模型会说"已放到画布上"，用户看着空画布无从判断
        // 是哪一步出的错。
        let dir = tempfile::tempdir().unwrap();
        let st = state(dir.path());
        let e = place(&st, "images/nope.png", &[]).await.unwrap_err();
        assert!(!e.is_empty(), "错误信息不能是空的");

        assert!(place(&st, "", &[]).await.is_err(), "空 path 也要报错");
        assert!(place(&st, "   ", &[]).await.is_err());
    }

    #[tokio::test]
    async fn placing_the_same_file_twice_does_not_add_a_second_card() {
        // media_node 对同一个资产是复用的。两条路（新建 / 复用）都要回
        // nodeId —— 只认新建那条的话，重试一次就拿到空 id 了。
        let dir = tempfile::tempdir().unwrap();
        let st = state(dir.path());
        std::fs::create_dir_all(dir.path().join("images")).unwrap();
        std::fs::write(dir.path().join("images/a.png"), PNG).unwrap();

        let first = place(&st, "images/a.png", &[]).await.unwrap();
        let second = place(&st, "images/a.png", &[]).await.unwrap();
        assert_eq!(first, second);
        assert_eq!(crate::canvas::read(&st.ws.canvas_path()).nodes.len(), 1);
    }

    #[tokio::test]
    async fn a_generated_node_links_back_to_the_inputs_it_used() {
        // 不连的话画布上是一堆孤立的卡片，看不出哪张图是从哪张图来的 ——
        // 而这正是画布相对聊天的意义。
        let dir = tempfile::tempdir().unwrap();
        let st = state(dir.path());
        std::fs::create_dir_all(dir.path().join("images")).unwrap();
        std::fs::write(dir.path().join("images/a.png"), PNG).unwrap();
        let src = place(&st, "images/a.png", &[]).await.unwrap();

        let found = source_nodes(&st, &json!({ "image_paths": ["images/a.png"] }));
        assert_eq!(found, vec![src.clone()]);

        std::fs::write(dir.path().join("images/b.png"), PNG).unwrap();
        let out = place(&st, "images/b.png", &found).await.unwrap();
        let file = crate::canvas::read(&st.ws.canvas_path());
        assert!(
            file.edges
                .iter()
                .any(|e| e.source == src && e.target == out),
            "产物没有连回它的输入：{:?}",
            file.edges
        );
    }

    #[tokio::test]
    async fn an_input_that_is_not_on_the_canvas_is_skipped_quietly() {
        // 输入可能来自工作区里一个还没放上画布的文件（比如 IM 发来的附件）。
        // 那时候连不上是正常的，**不该报错也不该连错**。
        let dir = tempfile::tempdir().unwrap();
        let st = state(dir.path());
        std::fs::create_dir_all(dir.path().join("images")).unwrap();
        std::fs::write(dir.path().join("images/loose.png"), PNG).unwrap();
        st.assets.enroll("images/loose.png").unwrap();

        assert!(source_nodes(&st, &json!({ "image_paths": ["images/loose.png"] })).is_empty());
        assert!(source_nodes(&st, &json!({})).is_empty());
        assert!(source_nodes(&st, &json!({ "image_paths": [] })).is_empty());
    }
}
