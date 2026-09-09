//! 生成路由。形状对齐官方本地 gateway 的 `/api/generate/*`。
//!
//! 契约（字段来自 mcp-tools 的 zod schema，少一个都会被判失败）：
//!
//! ```text
//! POST /api/generate/image/submit
//!   body → { backend, model_id, prompt, image_paths[], filename, params{…}, source_tool }
//!   resp ← { ok: true, task_id, status: "processing", media_type: "image" }
//!
//! GET  /api/generate/tasks/<task_id>/query      ← 注意 /query 后缀
//!   resp ← { ok:true, task_id, status:"succeeded", result: { ok:true, path, width?, height? } }
//!        | { ok:true, task_id, status:"processing" }
//!        | { ok:false, task_id, status:"failed", error, error_code, user_message }
//! ```
//!
//! **`/query` 后缀漏掉的话请求会 404，而 mcp-tools 对非 2xx 的查询不写任何
//! 日志** —— 表现是画布上一个没有原因的失败节点。测试钉住这个字面量。

use std::sync::Arc;

use axum::Json;
use axum::body::Bytes;
use axum::extract::{Path, State};
use serde::Deserialize;
use serde_json::{Value, json};

use crate::tasks::TaskState;
use crate::{AppState, land};

/// `POST /api/generate/image/submit` 的请求体。
///
/// 只解我们真正用得上的字段。多余的键（`backend` / `source_tool` /
/// `filename`）照收不误但不参与决策 —— 用哪个模型由**我们的配置**决定，
/// 不由调用方指定的 vendor 决定。
#[derive(Debug, Default, Deserialize)]
pub struct ImageSubmit {
    #[serde(default)]
    pub prompt: String,
    /// 底图。非空走图生图。
    ///
    /// 三种形态都接受（http URL / data URI / 裸 base64），平台侧一样。
    #[serde(default)]
    pub image_paths: Vec<String>,
    #[serde(default)]
    pub params: ImageParams,
}

#[derive(Debug, Default, Deserialize)]
pub struct ImageParams {
    #[serde(default)]
    pub aspect_ratio: String,
    #[serde(default)]
    pub resolution: String,
}

/// 提交。
///
/// **解不出请求体也照常返回 task_id**，让失败带着原因在轮询时回去 ——
/// 调用方把提交失败当硬错误，而画布上更希望看到一个带原因的失败节点。
pub async fn submit_image(State(state): State<Arc<AppState>>, body: Bytes) -> Json<Value> {
    // 自己解而不是用 `Json<T>` 提取器：那个对畸形 body 会直接回 400，
    // 而调用方把提交失败当硬错误。宁可照常发 task_id。
    let req: ImageSubmit = serde_json::from_slice(&body).unwrap_or_else(|err| {
        tracing::warn!("图片提交体解析失败，按空请求处理: {err}");
        ImageSubmit::default()
    });
    let task_id = state.tasks.create();

    tracing::info!(
        task = %task_id,
        edit = !req.image_paths.is_empty(),
        chars = req.prompt.chars().count(),
        "接到图片生成"
    );

    let (st, id) = (state.clone(), task_id.clone());
    tokio::spawn(async move {
        // 平台出图 → 收进工作区。两步都在这里做完，调用方只拿到一个
        // 工作区相对路径 —— 官方契约就是这个形状。
        let result = match maas_media::image::generate(
            &st.client,
            &st.media,
            &req.prompt,
            &req.image_paths,
            &req.params.aspect_ratio,
            &req.params.resolution,
        )
        .await
        {
            Ok(url) => land::land(&st, &url).await,
            Err(err) => Err(err),
        };
        st.tasks.finish(&id, result);
    });

    Json(json!({
        "ok": true,
        "task_id": task_id,
        "status": "processing",
        "media_type": "image",
    }))
}

/// 轮询。
pub async fn query_task(
    State(state): State<Arc<AppState>>,
    Path(task_id): Path<String>,
) -> Json<Value> {
    Json(task_response(&task_id, state.tasks.get(&task_id)))
}

/// 组轮询响应。
///
/// 抽出来是为了能直接断言形状 —— 少一个字段调用方就判失败，而那个失败
/// 不会说清少了什么。
pub fn task_response(task_id: &str, state: Option<TaskState>) -> Value {
    match state {
        Some(TaskState::Succeeded(p)) => {
            let mut result = json!({ "ok": true, "path": p.path });
            // 尺寸给不出也没关系，调用方会自己从文件里读。
            if let Some(w) = p.width {
                result["width"] = json!(w);
            }
            if let Some(h) = p.height {
                result["height"] = json!(h);
            }
            json!({
                "ok": true,
                "task_id": task_id,
                "status": "succeeded",
                "result": result,
            })
        }
        Some(TaskState::Running) => json!({
            "ok": true,
            "task_id": task_id,
            "status": "processing",
        }),
        Some(TaskState::Failed { code, message }) => json!({
            "ok": false,
            "task_id": task_id,
            "status": "failed",
            "error": message,
            // 官方的 `GenerateErrorCode` 是个枚举，自定义字符串会让调用方的
            // zod 解析失败。`backend_error` 是这里唯一诚实的通用值 ——
            // 真正的原因在 `error` / `user_message` 里。
            "error_code": "backend_error",
            "user_message": message,
            "detail_code": code,
        }),
        // 认不出的 id 只可能是服务重启过。**必须回终态**，
        // 回 processing 会让画布一直转到它自己的超时上限。
        None => json!({
            "ok": false,
            "task_id": task_id,
            "status": "failed",
            "error": "任务不存在，gateway 可能已重启",
            "error_code": "backend_error",
            "user_message": "生成任务已失效，请重试",
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_succeeded_task_carries_a_workspace_path_not_a_url() {
        // 官方契约是 path。换成 URL 的话每个调用方都得自己再落一次盘，
        // 而落盘有去重、入库、按类型归档三段逻辑，不该散在调用方手里。
        let v = task_response(
            "t-1",
            Some(TaskState::Succeeded(crate::tasks::Product {
                path: "images/a.png".into(),
                width: Some(1024),
                height: Some(768),
            })),
        );
        assert_eq!(v["status"], "succeeded");
        assert_eq!(v["result"]["ok"], true);
        assert_eq!(v["result"]["path"], "images/a.png");
        assert_eq!(v["result"]["width"], 1024);
        assert_eq!(v["result"]["height"], 768);
        assert!(v["result"].get("url").is_none(), "不该回 URL");
    }

    #[test]
    fn missing_dimensions_are_simply_omitted() {
        // 音频没有宽高。发一个 null 会让调用方的 schema 校验失败。
        let v = task_response(
            "t-1",
            Some(TaskState::Succeeded(crate::tasks::Product {
                path: "audios/a.wav".into(),
                width: None,
                height: None,
            })),
        );
        assert_eq!(v["result"]["path"], "audios/a.wav");
        assert!(v["result"].get("width").is_none());
    }

    #[test]
    fn a_running_task_is_processing() {
        let v = task_response("t-1", Some(TaskState::Running));
        assert_eq!(v["status"], "processing");
        assert_eq!(v["ok"], true);
    }

    #[test]
    fn a_failure_keeps_the_reason_and_uses_an_enum_error_code() {
        // 自定义 error_code 会让调用方的 zod 解析失败，于是连 message
        // 都传不回去 —— 画布上就成了一个没有原因的失败节点。
        let v = task_response(
            "t-1",
            Some(TaskState::Failed {
                code: "platform.model_not_found".into(),
                message: "无可用渠道".into(),
            }),
        );
        assert_eq!(v["status"], "failed");
        assert_eq!(v["error_code"], "backend_error");
        assert_eq!(v["user_message"], "无可用渠道");
        // 真正的码留在一个不参与解析的字段里，日志和排查要用。
        assert_eq!(v["detail_code"], "platform.model_not_found");
    }

    #[test]
    fn an_unknown_task_is_terminal_not_pending() {
        // 回 processing 会让画布转到它自己的超时上限（官方是 6 小时）。
        let v = task_response("t-gone", None);
        assert_eq!(v["status"], "failed");
        assert_eq!(v["ok"], false);
    }

    #[test]
    fn parses_a_submit_body_with_extra_fields() {
        // 调用方会带 backend / filename / source_tool 等我们不用的键，
        // 多一个键就解析失败的话，接官方 mcp-tools 时会全线挂掉。
        let raw = r#"{
            "backend": "nano_banana",
            "model_id": "nano_banana_2_flash",
            "prompt": "a cat",
            "image_paths": [],
            "filename": "cat.png",
            "params": { "aspect_ratio": "16:9", "resolution": "1K" },
            "source_tool": "hub_generate_image"
        }"#;
        let req: ImageSubmit = serde_json::from_str(raw).unwrap();
        assert_eq!(req.prompt, "a cat");
        assert_eq!(req.params.aspect_ratio, "16:9");
        assert!(req.image_paths.is_empty());
    }
}
