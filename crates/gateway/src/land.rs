//! 把生成结果收进工作区。
//!
//! 平台返回的是一个公网 URL，而调用方要的是**工作区相对路径** ——
//! 官方契约就是 `result: { ok, path, width?, height? }`。
//!
//! 真正的下载 + 归档 + 登记在 [`crate::api_files::import_one`]，
//! 和 `POST /api/files/import-url` 是同一段代码 —— 走进程内直调而不是
//! 自己给自己发一次 HTTP：省一跳，也不会因为端口/代理的问题失败。

use crate::AppState;
use crate::tasks::Product;
use maas_media::PlatformError;

/// 下载一个公网 URL 到工作区，返回相对路径。
pub async fn land(state: &AppState, url: &str) -> Result<Product, PlatformError> {
    let asset = crate::api_files::import_one(state, url)
        .await
        // 这里的失败信息会一路显示到画布上，所以要说清是哪一步 ——
        // "生成失败"和"生成好了但收不进工作区"是完全不同的两件事。
        .map_err(|err| PlatformError::protocol(format!("收进工作区失败：{err:#}")))?;

    Ok(Product {
        path: asset.path,
        width: asset.width.map(u64::from),
        height: asset.height.map(u64::from),
        extra: vec![],
    })
}
