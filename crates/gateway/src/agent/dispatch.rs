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
                    .unwrap_or("");
                // 结果里**带上 path**：模型下一步可能要拿它当底图或参考帧。
                return json!({ "ok": true, "path": path,
                    "note": "已放到画布上" })
                .to_string();
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
