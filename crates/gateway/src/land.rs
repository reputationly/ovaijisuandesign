//! 把生成结果收进工作区。
//!
//! 平台返回的是一个公网 URL，而调用方要的是**工作区相对路径** ——
//! 官方契约就是 `result: { ok, path, width?, height? }`。中间这一步
//! （下载、按类型归档、去重、登记成资产）目前借上游的
//! `POST /api/files/import-url` 完成。
//!
//! 等自己的资产库写完，换掉这个文件的实现即可，对外的契约不变。

use serde::Deserialize;

use crate::AppState;
use crate::tasks::Product;
use maas_media::PlatformError;

#[derive(Debug, Deserialize)]
struct ImportResponse {
    #[serde(default)]
    imported: Vec<Imported>,
    #[serde(default)]
    errors: Vec<ImportError>,
}

#[derive(Debug, Deserialize)]
struct Imported {
    #[serde(default)]
    path: String,
    #[serde(default)]
    width: Option<u64>,
    #[serde(default)]
    height: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct ImportError {
    #[serde(default)]
    error: String,
}

/// 下载一个公网 URL 到工作区，返回相对路径。
pub async fn land(state: &AppState, url: &str) -> Result<Product, PlatformError> {
    let Some(upstream) = state.upstream.as_deref() else {
        // 说清楚缺的是什么。没有这句的话表现是"生成成功了但画布上什么都没有"。
        return Err(PlatformError::config(
            "结果无法收进工作区：还没有自己的资产库，需要配置 upstream 指向一个 gateway",
        ));
    };

    let resp = state
        .local
        .post(format!("{}/api/files/import-url", upstream.trim_end_matches('/')))
        .json(&serde_json::json!({ "urls": [url] }))
        .send()
        .await
        .map_err(|e| PlatformError::transport(format!("落盘请求失败: {e}")))?;

    let status = resp.status();
    let raw = resp
        .text()
        .await
        .map_err(|e| PlatformError::transport(e.to_string()))?;
    if !status.is_success() {
        return Err(PlatformError::protocol(format!(
            "落盘返回 {status}: {}",
            truncate(&raw, 200)
        )));
    }

    let parsed: ImportResponse = serde_json::from_str(&raw)
        .map_err(|e| PlatformError::protocol(format!("落盘响应解析失败: {e}")))?;

    // **每个 URL 失败时它也回 200**（源码注释原文："returns 200 even if every
    // URL failed"），失败落在 `errors[]`。只看 HTTP 状态会把失败当成功，
    // 然后交给调用方一个空路径。
    let Some(first) = parsed.imported.into_iter().find(|i| !i.path.is_empty()) else {
        let why = parsed
            .errors
            .first()
            .map(|e| e.error.clone())
            .unwrap_or_else(|| "没有返回任何资产".to_string());
        return Err(PlatformError::protocol(format!("收进工作区失败：{why}")));
    };

    Ok(Product {
        path: first.path,
        width: first.width,
        height: first.height,
    })
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        return s.to_string();
    }
    s.chars().take(max).collect::<String>() + "…"
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(raw: &str) -> ImportResponse {
        serde_json::from_str(raw).unwrap()
    }

    #[test]
    fn reads_the_success_shape() {
        let r = parse(
            r#"{"ok":true,"imported":[{"url":"https://x/a.png","id":"1",
                "path":"images/a.png","type":"image","width":1024,"height":1024}]}"#,
        );
        assert_eq!(r.imported[0].path, "images/a.png");
        assert_eq!(r.imported[0].width, Some(1024));
        assert!(r.errors.is_empty());
    }

    #[test]
    fn reads_the_partial_failure_shape() {
        // 这个形状是整件事的关键：HTTP 200，但没有任何资产。
        let r = parse(
            r#"{"ok":true,"imported":[],"errors":[{"url":"https://x/a.png",
                "error":"HTTP 403 Forbidden"}]}"#,
        );
        assert!(r.imported.is_empty());
        assert_eq!(r.errors[0].error, "HTTP 403 Forbidden");
    }

    #[test]
    fn tolerates_missing_dimensions() {
        // 音频没有宽高。这两个字段缺了不该让整次落盘失败。
        let r = parse(r#"{"imported":[{"path":"audios/a.wav","type":"audio"}]}"#);
        assert_eq!(r.imported[0].path, "audios/a.wav");
        assert_eq!(r.imported[0].width, None);
    }
}
