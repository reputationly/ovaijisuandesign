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
/// **只认最朴素的 `key: value`**，不引 YAML 解析器：这里的字段就四个，
/// 而一个完整的 YAML 解析器会把 skill 文件变成"必须合法 YAML"——用户手写
/// 时一个缩进错误就整条读不出来，而他要写的只是一段提示词。
fn parse(text: &str) -> (Vec<(String, String)>, String) {
    let Some(rest) = text.strip_prefix("---") else {
        return (vec![], text.to_string());
    };
    let Some(end) = rest.find("\n---") else {
        return (vec![], text.to_string());
    };
    let head = &rest[..end];
    let body = rest[end + 4..].trim_start_matches('\n');
    let kv = head
        .lines()
        .filter_map(|l| l.split_once(':'))
        .map(|(k, v)| (k.trim().to_string(), v.trim().trim_matches('"').to_string()))
        .collect();
    (kv, body.to_string())
}

fn load_one(path: &std::path::Path, slug: &str) -> Option<Skill> {
    let text = std::fs::read_to_string(path.join("SKILL.md")).ok()?;
    let (kv, body) = parse(&text);
    let get = |k: &str| {
        kv.iter()
            .find(|(a, _)| a == k)
            .map(|(_, v)| v.clone())
            .unwrap_or_default()
    };
    let name = get("name");
    Some(Skill {
        slug: slug.to_string(),
        name: if name.is_empty() {
            slug.to_string()
        } else {
            name
        },
        description: get("description"),
        category: get("category"),
        body,
        builtin: get("builtin") == "true",
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
    let _ = std::fs::remove_dir_all(&d);
    (StatusCode::OK, Json(json!({ "ok": true })))
}

// ---------------------------------------------------------------------------
// 自带的那几个
//
// **只在目录不存在时写一次**，不是每次启动都覆盖：用户可能把自带的删了，
// 每次启动写回来的话那个删除操作看起来完全无效。
// ---------------------------------------------------------------------------

const SEEDS: &[(&str, &str, &str, &str, &str)] = &[
    (
        "ecommerce-image",
        "电商商品图",
        "从实拍图生成平台合规的电商组图",
        "电商",
        "你在做电商商品图。\n\n从用户给的实拍图出发，产出一组可直接上架的商品图：\n\n1. 先用 canvas_list_nodes 看画布上有什么，确认底图。\n2. 主图 1:1，纯色或极简背景，商品居中、占画面 70~80%，不要投影穿帮。\n3. 细节图 2~3 张，各突出一个卖点（材质 / 做工 / 尺寸参照）。\n4. 场景图 1 张，把商品放进真实使用场景。\n\n注意：不要在图上生成任何文字（平台会判违规），不要改变商品本身的颜色和形状。\n每出一张就放到画布上，全部完成后用一句话说明每张的用途。",
    ),
    (
        "audiobook",
        "有声书",
        "把书籍段落转成多角色有声书",
        "音频",
        "你在做有声书。\n\n1. 先把用户给的文本按角色拆开，旁白单独一路。\n2. 每个角色配一个音色，**在开始合成前把分配方案说给用户确认** ——\n   音色一旦定了，后面几十段都跟着它，改起来要全部重做。\n3. 用 generate_audio_speech 逐段合成，一段一个节点。\n4. 合成完用 canvas_group_nodes 按章节分组。\n\n如果 list_capabilities 显示 speech 不可用，直接告诉用户缺什么，不要硬试。",
    ),
    (
        "music-video",
        "音乐短片",
        "一首歌配一支有分镜的短片",
        "专业影视",
        "你在做音乐短片。\n\n顺序不能反：\n\n1. lyrics_generation 起草歌词，**原样念给用户确认**再往下走。\n2. generate_audio_music 出歌，prompt 写风格不写歌词，两者分开传。\n3. 按歌词段落拆分镜，每段一句话描述画面。\n4. 每个分镜先 generate_image 出关键帧，用户确认后再 generate_video。\n\n先出图再出视频是有意的：视频比图贵得多也慢得多，构图不对的话在图这一步就该发现。",
    ),
    (
        "storyboard",
        "分镜脚本",
        "把一段剧情拆成可拍的分镜",
        "短剧漫剧",
        "你在做分镜。\n\n1. 用 plan_write 把整条片子拆成 Stage，每个 Stage 是一场戏。\n2. 每场拆成 3~8 个镜头，每个镜头写：景别、机位、时长、画面内容、声音。\n3. 用 canvas_write_node 把分镜表写成文本节点放上画布。\n4. 用户确认后再逐镜出图。\n\n不要一上来就出图 —— 分镜是用来讨论的，图是用来执行的。",
    ),
];

/// 第一次跑的时候把自带 skill 铺到工作区。
pub fn seed(state: &AppState) {
    let base = dir(state);
    for (slug, name, desc, cat, body) in SEEDS {
        let d = base.join(slug);
        // 存在就跳过。**不比较内容也不覆盖** —— 见上面模块注释。
        if d.join("SKILL.md").exists() {
            continue;
        }
        if std::fs::create_dir_all(&d).is_err() {
            continue;
        }
        let text = format!(
            "---\nname: {name}\ndescription: {desc}\ncategory: {cat}\nbuiltin: true\n---\n\n{body}\n"
        );
        let _ = std::fs::write(d.join("SKILL.md"), text);
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

    #[tokio::test]
    async fn seeding_twice_does_not_overwrite_user_edits() {
        // 每次启动都覆盖的话，用户改过的自带 skill 会被悄悄改回去。
        let (s, _d) = crate::tests::state_with_dir();
        seed(&s);
        let p = dir(&s).join("audiobook/SKILL.md");
        std::fs::write(&p, "---\nname: 我改过的\n---\n新正文").unwrap();
        seed(&s);
        assert!(std::fs::read_to_string(&p).unwrap().contains("我改过的"));
    }

    #[tokio::test]
    async fn the_list_omits_bodies_but_get_includes_them() {
        // 一条正文几 KB，列几十条就是几百 KB，而面板上只显示名字和描述。
        let (s, _d) = crate::tests::state_with_dir();
        seed(&s);
        let r = list(State(s.clone())).await;
        let arr = r.0["skills"].as_array().unwrap();
        assert!(!arr.is_empty());
        assert!(arr.iter().all(|x| x.get("body").is_none()));
        let (_, one) = get(State(s), UrlPath("audiobook".into())).await;
        assert!(one.0["skill"]["body"].as_str().unwrap().contains("有声书"));
    }

    #[tokio::test]
    async fn builtins_are_protected_from_edit_and_delete() {
        // 不挡的话：覆盖了下次启动被种子写回来（"改不动"），
        // 删了下次启动又出现（"删不掉"）。
        let (s, _d) = crate::tests::state_with_dir();
        seed(&s);
        let (code, _) = save(
            State(s.clone()),
            Json(SaveBody {
                slug: "audiobook".into(),
                name: None,
                description: None,
                category: None,
                body: Some("换掉".into()),
            }),
        )
        .await;
        assert_eq!(code, StatusCode::CONFLICT);
        let (code, _) = remove(State(s), UrlPath("audiobook".into())).await;
        assert_eq!(code, StatusCode::CONFLICT);
    }
}
