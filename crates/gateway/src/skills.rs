//! Skill。`GET /api/skills`、`POST /api/skills`、`DELETE /api/skills/{slug}`
//!
//! ## Skill 是什么
//!
//! 官方那个面板里每条是 `名字 /slug` + 一句描述，点一下把这条技能挂到本轮
//! 对话上（`/ecommerce-image`、`/audiobook` 这种）。本质是**一段预置的
//! 提示词**，加上一个能在输入框里用斜杠唤起的短名。
//!
//! ## 存成目录里的 markdown，不是一张表
//!
//! `.hilo/skills/<slug>/SKILL.md`，YAML frontmatter 放元信息、正文是提示词。
//!
//! 这个形状是**照 opencode / Claude 的 skill 约定来的**，不是我们自己发明的：
//! 用户从别处拿到一个 skill 目录，直接拷进来就能用；我们自己写的也能原样
//! 分享出去。存成一张 JSON 表的话，这两个方向都要写导入导出。
//!
//! 另外它天然可读可 diff —— skill 是提示词，提示词是要反复改的，
//! 而改一段藏在 JSON 字符串里的多行文本非常难受。

use std::path::PathBuf;
use std::sync::Arc;

use axum::Json;
use axum::extract::{Path as UrlPath, State};
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Skill {
    /// 斜杠命令用的短名。`/` 后面那截。
    pub slug: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    /// 分类。官方面板顶上那排标签（`短剧漫剧` / `专业影视` / `动画`…）。
    #[serde(default)]
    pub category: String,
    /// 提示词正文。列表里**不带**（几 KB 一条，一次列几十条就是几百 KB，
    /// 而面板上只显示名字和描述）；取单条时才给。
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub body: String,
    /// 我们自带的那批。用户不能删 —— 删了下次启动又会写回来，
    /// 表现是"删不掉"。
    #[serde(default)]
    pub builtin: bool,
}

fn dir(state: &AppState) -> PathBuf {
    state.ws.hilo().join("skills")
}

/// slug 会拼进路径，必须挡住 `../`。
fn is_slug(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 64
        && s.chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        && !s.starts_with('-')
}

/// 拆 YAML frontmatter。
///
/// **只认这个项目真正会遇到的两种写法**，不引 YAML 解析器：
///
/// ```yaml
/// name: brand-ad              # 单行
/// description: |              # 块标量，正文在下面缩进的若干行
///   一段很长的说明…
///   还可以换行
/// trigger-words: [a, b, c]    # 内联数组，当成一整个字符串留着
/// ```
///
/// 块标量那条不能省：官方那 30 个 skill 里有 27 个的 description 是
/// `|` 开头的。只认单行的话，那 27 条的描述全是空的 —— 界面上一片
/// 只有名字没有说明的条目，而且不报错。
///
/// 引一个完整 YAML 解析器的代价是：skill 文件从此必须是合法 YAML，
/// 用户手写时一个缩进错误就整条读不出来，而他要写的只是一段提示词。
fn parse(text: &str) -> (Vec<(String, String)>, String) {
    let Some(rest) = text.strip_prefix("---") else {
        return (vec![], text.to_string());
    };
    let Some(end) = rest.find("\n---") else {
        return (vec![], text.to_string());
    };
    let head = &rest[..end];
    let body = rest[end + 4..].trim_start_matches('\n');

    let mut kv: Vec<(String, String)> = Vec::new();
    let mut lines = head.lines().peekable();
    while let Some(line) = lines.next() {
        // 缩进行属于上一个块标量，在下面一并吃掉；单独遇到就跳过。
        if line.starts_with(' ') || line.trim().is_empty() {
            continue;
        }
        let Some((k, v)) = line.split_once(':') else {
            continue;
        };
        let key = k.trim().to_string();
        let v = v.trim();
        if v == "|" || v == ">" || v == "|-" || v == ">-" {
            // 块标量：把后面所有缩进行收进来。
            let mut buf: Vec<String> = Vec::new();
            while let Some(next) = lines.peek() {
                if next.trim().is_empty() {
                    buf.push(String::new());
                    lines.next();
                    continue;
                }
                if !next.starts_with(' ') {
                    break;
                }
                buf.push(lines.next().unwrap().trim().to_string());
            }
            // `>` 是折叠成一行，`|` 是保留换行。界面上都只显示一行，
            // 所以统一折叠 —— 保留换行的话列表里会被截断得很难看。
            kv.push((key, buf.join(" ").trim().to_string()));
        } else {
            kv.push((key, v.trim_matches('"').to_string()));
        }
    }
    (kv, body.to_string())
}

fn load_one(path: &std::path::Path, slug: &str) -> Option<Skill> {
    let text = std::fs::read_to_string(path.join("SKILL.md")).ok()?;
    // 自带的标记是目录里的 `.builtin` 文件，不是 frontmatter 里的字段 ——
    // 那样就不用改 SKILL.md，和官方那份保持逐字节一致。
    let builtin = path.join(".builtin").exists();
    let (kv, body) = parse(&text);
    let get = |k: &str| {
        kv.iter()
            .find(|(a, _)| a == k)
            .map(|(_, v)| v.clone())
            .unwrap_or_default()
    };
    // 官方那批的 frontmatter 里没有 category / 中文名，那些在 meta.yaml 里。
    // 读不到就留空 —— 界面上按"全部"显示，比编一个分类好。
    let meta = std::fs::read_to_string(path.join("meta.yaml")).unwrap_or_default();
    let meta_get = |k: &str| {
        meta.lines()
            .find_map(|l| l.trim().strip_prefix(&format!("{k}:")))
            .map(|v| v.trim().trim_matches('"').to_string())
            .unwrap_or_default()
    };
    let name = {
        let n = get("name");
        let zh = meta_get("display-name-zh");
        if !zh.is_empty() { zh } else { n }
    };
    let category = {
        let c = get("category");
        if !c.is_empty() { c } else { meta_get("tag-cn") }
    };
    let description = {
        let d = get("description");
        if !d.is_empty() {
            d
        } else {
            meta_get("summary-cn")
        }
    };
    Some(Skill {
        slug: slug.to_string(),
        name: if name.is_empty() {
            slug.to_string()
        } else {
            name
        },
        description,
        category,
        body,
        builtin,
    })
}

pub fn all(state: &AppState) -> Vec<Skill> {
    let Ok(rd) = std::fs::read_dir(dir(state)) else {
        return vec![];
    };
    let mut v: Vec<Skill> = rd
        .flatten()
        .filter(|e| e.path().is_dir())
        .filter_map(|e| {
            let slug = e.file_name().to_string_lossy().to_string();
            is_slug(&slug).then(|| load_one(&e.path(), &slug))?
        })
        .collect();
    // 自带的排前面，其余按名字。**不按文件系统顺序** —— read_dir 的顺序
    // 在不同机器上不一样，用户会看到"每次打开列表顺序都变"。
    v.sort_by(|a, b| b.builtin.cmp(&a.builtin).then(a.name.cmp(&b.name)));
    v
}

pub async fn list(State(state): State<Arc<AppState>>) -> Json<Value> {
    let mut v = all(&state);
    let categories: Vec<String> = {
        let mut c: Vec<String> = v
            .iter()
            .map(|s| s.category.clone())
            .filter(|s| !s.is_empty())
            .collect();
        c.sort();
        c.dedup();
        c
    };
    // 列表里去掉正文，见 [`Skill::body`] 上的注释。
    for s in v.iter_mut() {
        s.body.clear();
    }
    Json(json!({ "ok": true, "skills": v, "categories": categories }))
}

pub async fn get(
    State(state): State<Arc<AppState>>,
    UrlPath(slug): UrlPath<String>,
) -> (StatusCode, Json<Value>) {
    if !is_slug(&slug) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "slug 不合法" })),
        );
    }
    match load_one(&dir(&state).join(&slug), &slug) {
        Some(s) => (StatusCode::OK, Json(json!({ "ok": true, "skill": s }))),
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({ "ok": false, "error": "没有这个 skill" })),
        ),
    }
}

#[derive(Debug, Deserialize)]
pub struct SaveBody {
    pub slug: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub body: Option<String>,
}

pub async fn save(
    State(state): State<Arc<AppState>>,
    Json(b): Json<SaveBody>,
) -> (StatusCode, Json<Value>) {
    let slug = b.slug.trim().to_lowercase();
    if !is_slug(&slug) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "slug 只能是小写字母、数字和连字符" })),
        );
    }
    // 自带的不允许覆盖：覆盖了下次启动会被种子数据写回来，
    // 表现是"改了但改不动"。想改就换个 slug 另存一份。
    if load_one(&dir(&state).join(&slug), &slug).is_some_and(|s| s.builtin) {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "ok": false, "error": "自带的 skill 不能改，换个 slug 另存一份" })),
        );
    }
    let d = dir(&state).join(&slug);
    if let Err(e) = std::fs::create_dir_all(&d) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        );
    }
    let text = format!(
        "---\nname: {}\ndescription: {}\ncategory: {}\n---\n\n{}\n",
        b.name.unwrap_or_else(|| slug.clone()),
        b.description.unwrap_or_default(),
        b.category.unwrap_or_else(|| "我的".into()),
        b.body.unwrap_or_default(),
    );
    match std::fs::write(d.join("SKILL.md"), text) {
        Ok(()) => (StatusCode::OK, Json(json!({ "ok": true, "slug": slug }))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": e.to_string() })),
        ),
    }
}

pub async fn remove(
    State(state): State<Arc<AppState>>,
    UrlPath(slug): UrlPath<String>,
) -> (StatusCode, Json<Value>) {
    if !is_slug(&slug) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "slug 不合法" })),
        );
    }
    let d = dir(&state).join(&slug);
    if load_one(&d, &slug).is_some_and(|s| s.builtin) {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "ok": false, "error": "自带的 skill 删不掉" })),
        );
    }
    // **移到废纸篓，不是真删。** 一个 skill 是用户自己写的一段提示词，
    // 可能攒了很久；官方那句确认文案也写着「此Skill将移入废纸篓，你可以
    // 随时恢复」。和资产删除走同一个地方（工作区的 `.hilo/trash/`）。
    //
    // **失败要如实报。** 这里原来是 `let _ = remove_dir_all(&d)` 然后无条件
    // 返回 `ok: true` —— 删不掉（权限、文件被占用）时界面照样显示删除成功，
    // 刷新一下 skill 又回来了，用户只会觉得这个应用有鬼。
    let bin = state
        .ws
        .root()
        .join(".hilo/trash")
        .join(now_stamp())
        .join("skills");
    if let Err(err) = std::fs::create_dir_all(&bin) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": format!("建废纸篓目录失败: {err}") })),
        );
    }
    match std::fs::rename(&d, bin.join(&slug)) {
        Ok(()) => (StatusCode::OK, Json(json!({ "ok": true }))),
        // 已经不在了也算成功：用户要的是"让它从列表里消失"。
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            (StatusCode::OK, Json(json!({ "ok": true })))
        }
        Err(err) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": format!("删除失败: {err}") })),
        ),
    }
}

/// 在系统文件管理器里打开这个 skill 的目录。官方 `skills.detail.showInFolder`
/// =「在文件夹中显示」。
///
/// skill 就是磁盘上的一个目录（`SKILL.md` + 附带文件）。想加个参考图、
/// 想用自己的编辑器改正文，都得先能找到它 —— 在此之前用户只能自己猜路径。
pub async fn reveal(
    State(state): State<Arc<AppState>>,
    UrlPath(slug): UrlPath<String>,
) -> Json<Value> {
    if !is_slug(&slug) {
        return Json(json!({ "ok": false, "error": "slug 不合法" }));
    }
    let d = dir(&state).join(&slug);
    if !d.exists() {
        return Json(json!({ "ok": false, "error": "这个 skill 的目录不存在" }));
    }
    match crate::logs::reveal_in_file_manager(&d) {
        Ok(()) => Json(json!({ "ok": true, "dir": d.to_string_lossy() })),
        Err(err) => Json(json!({ "ok": false, "error": err.to_string() })),
    }
}

fn now_stamp() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
        .to_string()
}

// ---------------------------------------------------------------------------
// 从别处导入
//
// 官方应用把装好的 skill 放在 `~/.hub/skills/<slug>/`，结构和我们一样
// （`SKILL.md` + frontmatter，外加一个 `meta.yaml` 和 `references/`）。
// 用户自己装的那些，导进他自己的工作区就能用。
//
// **只拷贝，不改写。** 把 meta.yaml 里的中文显示名合并进 frontmatter 之类
// 的"顺手优化"会让导入变成一次有损转换 —— 而用户下次在官方那边更新了
// skill，再导一次就对不上了。原样拷进来，我们的解析器认得多少算多少。
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize, Default)]
pub struct ImportBody {
    /// 从哪导。不给就用默认的 `~/.hub/skills`。
    #[serde(default)]
    pub from: Option<String>,
    /// 已存在的同名 skill 要不要覆盖。默认不覆盖 —— 用户可能改过。
    #[serde(default)]
    pub overwrite: bool,
}

/// 官方应用装 skill 的默认位置。
fn default_source() -> Option<PathBuf> {
    directories::UserDirs::new().map(|d| d.home_dir().join(".hub/skills"))
}

fn copy_dir(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for e in std::fs::read_dir(src)? {
        let e = e?;
        let to = dst.join(e.file_name());
        if e.file_type()?.is_dir() {
            copy_dir(&e.path(), &to)?;
        } else {
            std::fs::copy(e.path(), to)?;
        }
    }
    Ok(())
}

pub async fn import(
    State(state): State<Arc<AppState>>,
    body: Option<Json<ImportBody>>,
) -> (StatusCode, Json<Value>) {
    let b = body.map(|x| x.0).unwrap_or_default();
    let src = match b.from.as_deref().filter(|s| !s.trim().is_empty()) {
        Some(p) => PathBuf::from(shellexpand_home(p)),
        None => match default_source() {
            Some(p) => p,
            None => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"ok":false,"error":"定位不到用户目录"})),
                );
            }
        },
    };
    let Ok(rd) = std::fs::read_dir(&src) else {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({
                "ok": false,
                "error": format!("{} 不存在或读不了。官方应用装的 skill 默认在 ~/.hub/skills。", src.display()),
            })),
        );
    };

    let base = dir(&state);
    let (mut added, mut skipped, mut failed) = (Vec::new(), Vec::new(), Vec::new());
    for e in rd.flatten() {
        let slug = e.file_name().to_string_lossy().to_string();
        if !e.path().is_dir() || !is_slug(&slug) {
            continue;
        }
        // 没有 SKILL.md 的目录不是 skill，跳过而不是报错 —— 那个目录里
        // 可能是缓存或者别的东西。
        if !e.path().join("SKILL.md").is_file() {
            continue;
        }
        let dst = base.join(&slug);
        if dst.join("SKILL.md").exists() && !b.overwrite {
            skipped.push(slug);
            continue;
        }
        // 自带的那几个**永远不覆盖**：覆盖了下次启动种子还会写回来，
        // 表现是"导入成功但内容没变"。
        if load_one(&dst, &slug).is_some_and(|s| s.builtin) {
            skipped.push(slug);
            continue;
        }
        match copy_dir(&e.path(), &dst) {
            Ok(()) => added.push(slug),
            Err(err) => failed.push(json!({ "slug": slug, "error": err.to_string() })),
        }
    }
    (
        StatusCode::OK,
        Json(json!({
            "ok": true, "from": src.to_string_lossy(),
            "added": added, "skipped": skipped, "failed": failed,
        })),
    )
}

/// 只展开开头的 `~`。**不做通配符和变量替换** —— 这个路径来自界面上的
/// 一个输入框，展开得越多能踩到的东西越多。
fn shellexpand_home(p: &str) -> String {
    match p.strip_prefix("~/") {
        Some(rest) => directories::UserDirs::new()
            .map(|d| d.home_dir().join(rest).to_string_lossy().into_owned())
            .unwrap_or_else(|| p.to_string()),
        None => p.to_string(),
    }
}

// ---------------------------------------------------------------------------
// 自带的那批
//
// 30 个 skill、1.6 MB，**从目录铺，不写成 Rust 常量**：那样每个 skill 的
// 正文都要转义成字符串字面量，改一个字要重新编译，而 skill 本来就是
// 要反复改的文本。
//
// 目录来源按可预期性排序，和 `web::locate` 同一个思路：
//
// 1. 可执行文件旁边的 `skills/`（发布包的形态，Tauri resources 拷进去的）
// 2. macOS `.app` 里的 `Contents/Resources/skills`
// 3. 仓库里的 `assets/skills`（`cargo run` 时的形态）
//
// **只在缺的时候写一次**，不是每次启动都覆盖：用户可能改过、也可能删了，
// 每次写回去的话那两个操作看起来完全无效。
// ---------------------------------------------------------------------------

/// 找自带 skill 的目录。
fn seed_dir() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let base = exe.parent()?;
    for c in [base.join("skills"), base.join("../Resources/skills")] {
        if c.is_dir() {
            return Some(c);
        }
    }
    let mut dir = base.to_path_buf();
    while dir.pop() {
        let c = dir.join("assets/skills");
        if c.is_dir() {
            return Some(c);
        }
        // 走到工作区根就停，不要一路翻到用户主目录去。
        if dir.join("Cargo.toml").is_file() {
            break;
        }
    }
    None
}

/// 第一次跑的时候把自带 skill 铺到工作区。
pub fn seed(state: &AppState) {
    let Some(src) = seed_dir() else {
        tracing::debug!("找不到自带 skill 的目录，跳过");
        return;
    };
    let base = dir(state);
    let Ok(rd) = std::fs::read_dir(&src) else {
        return;
    };
    let mut n = 0;
    for e in rd.flatten() {
        let slug = e.file_name().to_string_lossy().to_string();
        if !e.path().is_dir() || !is_slug(&slug) || !e.path().join("SKILL.md").is_file() {
            continue;
        }
        let dst = base.join(&slug);
        // 存在就跳过。**不比较内容也不覆盖** —— 见上面模块注释。
        if dst.join("SKILL.md").exists() {
            continue;
        }
        if copy_dir(&e.path(), &dst).is_ok() {
            // 打一个标记，界面上区分"自带"和"用户自己的"。
            // **写成单独的文件而不是改 SKILL.md** —— 改了的话这份和官方
            // 那份就有了差异，下次更新要先 diff 才知道改了什么。
            let _ = std::fs::write(dst.join(".builtin"), b"1");
            n += 1;
        }
    }
    if n > 0 {
        tracing::info!("铺了 {n} 个自带 skill");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frontmatter_and_body_are_split() {
        let (kv, body) =
            parse("---\nname: 电商图\ndescription: 一句话\n---\n\n正文第一行\n正文第二行\n");
        assert_eq!(kv.iter().find(|(k, _)| k == "name").unwrap().1, "电商图");
        assert_eq!(body.trim(), "正文第一行\n正文第二行");
    }

    #[test]
    fn a_block_scalar_description_is_not_lost() {
        // 官方那 30 个 skill 里有 27 个的 description 是 `|` 开头的。
        // 只认单行的话那 27 条描述全是空的 —— 界面上一片只有名字没有
        // 说明的条目，而且不报错。
        let (kv, body) = parse(
            "---\nname: brand-ad\ndescription: |\n  第一行说明\n  第二行说明\ntrigger-words: [品牌广告, 产品广告]\n---\n\n正文",
        );
        let get = |k: &str| kv.iter().find(|(a, _)| a == k).map(|(_, v)| v.clone());
        assert_eq!(get("name").as_deref(), Some("brand-ad"));
        assert_eq!(get("description").as_deref(), Some("第一行说明 第二行说明"));
        assert_eq!(
            get("trigger-words").as_deref(),
            Some("[品牌广告, 产品广告]")
        );
        assert_eq!(body.trim(), "正文");
    }

    #[test]
    fn a_block_scalar_at_the_very_end_still_closes() {
        // 块标量是最后一个字段时，后面没有非缩进行来终止它。
        let (kv, _) = parse("---\nname: x\ndescription: |\n  只有这一行\n---\n正文");
        assert_eq!(
            kv.iter()
                .find(|(a, _)| a == "description")
                .map(|(_, v)| v.as_str()),
            Some("只有这一行")
        );
    }

    #[test]
    fn a_file_without_frontmatter_is_all_body() {
        // 用户手写时很可能不写 frontmatter。整份当提示词，
        // 比报"格式不对"然后什么都不显示强。
        let (kv, body) = parse("就是一段提示词");
        assert!(kv.is_empty());
        assert_eq!(body, "就是一段提示词");
    }

    #[test]
    fn an_unterminated_frontmatter_does_not_eat_the_body() {
        // 少写一个结束的 `---` 时，把整份当正文而不是当 frontmatter ——
        // 后者会让提示词整个消失，而界面上只是显示一条空 skill。
        let (kv, body) = parse("---\nname: x\n没有结束标记");
        assert!(kv.is_empty());
        assert!(body.contains("没有结束标记"));
    }

    #[test]
    fn slugs_that_could_escape_the_directory_are_refused() {
        assert!(is_slug("ecommerce-image"));
        assert!(!is_slug("../etc"));
        assert!(!is_slug("Has-Upper"));
        assert!(!is_slug(""));
        assert!(!is_slug("-leading"));
    }

    /// 铺一个假的"自带"skill，测试不依赖仓库里实际有哪些。
    fn plant(s: &AppState, slug: &str) -> PathBuf {
        let d = dir(s).join(slug);
        std::fs::create_dir_all(&d).unwrap();
        std::fs::write(
            d.join("SKILL.md"),
            "---\nname: 原版\ndescription: 说明\n---\n正文",
        )
        .unwrap();
        std::fs::write(d.join(".builtin"), b"1").unwrap();
        d
    }

    #[tokio::test]
    async fn seeding_twice_does_not_overwrite_user_edits() {
        // 每次启动都覆盖的话，用户改过的自带 skill 会被悄悄改回去。
        let (s, _d) = crate::tests::state_with_dir();
        let p = plant(&s, "demo-skill").join("SKILL.md");
        std::fs::write(&p, "---\nname: 我改过的\n---\n新正文").unwrap();
        seed(&s);
        assert!(std::fs::read_to_string(&p).unwrap().contains("我改过的"));
    }

    #[tokio::test]
    async fn builtin_is_marked_by_a_file_not_by_frontmatter() {
        // 用 frontmatter 标记的话，我们这份和官方那份就有了差异，
        // 下次更新要先 diff 才知道改了什么。
        let (s, _d) = crate::tests::state_with_dir();
        let d = plant(&s, "demo-skill");
        assert!(load_one(&d, "demo-skill").unwrap().builtin);
        std::fs::remove_file(d.join(".builtin")).unwrap();
        assert!(!load_one(&d, "demo-skill").unwrap().builtin);
        // SKILL.md 本身一个字都没被改过。
        assert!(
            !std::fs::read_to_string(d.join("SKILL.md"))
                .unwrap()
                .contains("builtin")
        );
    }

    #[tokio::test]
    async fn the_list_omits_bodies_but_get_includes_them() {
        // 一条正文几 KB，列几十条就是几百 KB，而面板上只显示名字和描述。
        let (s, _d) = crate::tests::state_with_dir();
        plant(&s, "demo-skill");
        let r = list(State(s.clone())).await;
        let arr = r.0["skills"].as_array().unwrap();
        assert!(!arr.is_empty());
        assert!(arr.iter().all(|x| x.get("body").is_none()));
        let (_, one) = get(State(s), UrlPath("demo-skill".into())).await;
        assert!(one.0["skill"]["body"].as_str().unwrap().contains("正文"));
    }

    #[tokio::test]
    async fn builtins_are_protected_from_edit_and_delete() {
        // 不挡的话：覆盖了下次启动被种子写回来（"改不动"），
        // 删了下次启动又出现（"删不掉"）。
        let (s, _d) = crate::tests::state_with_dir();
        plant(&s, "demo-skill");
        let (code, _) = save(
            State(s.clone()),
            Json(SaveBody {
                slug: "demo-skill".into(),
                name: None,
                description: None,
                category: None,
                body: Some("换掉".into()),
            }),
        )
        .await;
        assert_eq!(code, StatusCode::CONFLICT);
        let (code, _) = remove(State(s), UrlPath("demo-skill".into())).await;
        assert_eq!(code, StatusCode::CONFLICT);
    }
}
