//! 制作计划。对应官方那 7 个 `plan_*` 工具。
//!
//! planner 先写一份计划（若干 Stage，每个 Stage 下若干 work item），
//! 再由 executor 一个个推进。它是 agent 之间的**共享状态** ——
//! 不是给人看的文档。
//!
//! ## 乐观并发是这里的重点
//!
//! 每次写都要带 `expected_revision`，对不上就拒绝（409）。
//!
//! 没有这个的话：planner 在重排计划、executor 同时把某个 Stage 标成完成，
//! 后写的那个会把前面的整份覆盖掉 —— 而两边都收到"成功"。表现是
//! **执行到一半的进度凭空回退**，或者一个已经做完的 Stage 又被做一遍。
//! 官方那 7 个工具里有 4 个带 `expected_revision`，就是这个原因。
//!
//! ## 存在哪
//!
//! `.hilo/plans/<plan_id>.json`。跟着工作区走 —— 计划和画布是同一件事的
//! 两面，换个工作区就该是另一套计划。

use std::path::{Path, PathBuf};
use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::AppState;

/// Stage 的状态。**和官方的一组一致** —— agent 提示词里按这些字面量分支，
/// 改一个字它就走不到对应的分支上，而且不报错。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StageState {
    Pending,
    InProgress,
    Completed,
    Blocked,
    Skipped,
    Failed,
}

impl StageState {
    /// 已经结束、不该再推进的状态。
    fn terminal(self) -> bool {
        matches!(self, Self::Completed | Self::Skipped)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkItem {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub done: bool,
    /// 未知字段原样带着走。agent 会往里塞我们还不认识的东西 ——
    /// 丢掉的话它下一轮读回来发现自己写的东西没了。
    #[serde(flatten, default)]
    pub extra: serde_json::Map<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stage {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub order: i64,
    #[serde(default = "default_state")]
    pub state: StageState,
    #[serde(default)]
    pub work_items: Vec<WorkItem>,
    #[serde(flatten, default)]
    pub extra: serde_json::Map<String, Value>,
}

fn default_state() -> StageState {
    StageState::Pending
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Plan {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub goal: String,
    /// 每次写 +1。调用方必须带着它写回来，见模块注释。
    #[serde(default)]
    pub revision: u64,
    #[serde(default)]
    pub stages: Vec<Stage>,
    #[serde(flatten, default)]
    pub extra: serde_json::Map<String, Value>,
}

impl Plan {
    fn stage(&self, id: &str) -> Option<&Stage> {
        self.stages.iter().find(|s| s.id == id)
    }
    /// 下一个该做的 Stage：按 order 排序后第一个没结束的。
    fn next_stage(&self) -> Option<&Stage> {
        let mut v: Vec<&Stage> = self.stages.iter().filter(|s| !s.state.terminal()).collect();
        v.sort_by_key(|s| s.order);
        v.into_iter().next()
    }
}

fn dir(ws: &crate::workspace::Workspace) -> PathBuf {
    ws.hilo().join("plans")
}

/// 计划文件。id 会拼进路径，必须挡住 `../`。
fn path_of(ws: &crate::workspace::Workspace, id: &str) -> Option<PathBuf> {
    let ok = !id.is_empty()
        && id.len() <= 64
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    ok.then(|| dir(ws).join(format!("{id}.json")))
}

fn read(path: &Path) -> Option<Plan> {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}

fn save(path: &Path, plan: &Plan) -> std::io::Result<()> {
    if let Some(d) = path.parent() {
        std::fs::create_dir_all(d)?;
    }
    // 先写临时文件再 rename：写一半被杀会留下截断的 JSON，
    // 而 agent 下一轮读到的就是那份。
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, serde_json::to_vec_pretty(plan)?)?;
    std::fs::rename(&tmp, path)
}

fn conflict(expected: Option<u64>, actual: u64) -> Option<(StatusCode, Json<Value>)> {
    match expected {
        // 不带 expected_revision 的写一律拒绝。允许的话，一个忘了带的调用
        // 就能覆盖掉别人刚写的 —— 而这正是乐观并发要防的那件事。
        None => Some((
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "必须带 expected_revision", "revision": actual })),
        )),
        Some(e) if e != actual => Some((
            StatusCode::CONFLICT,
            Json(json!({
                "ok": false,
                "error": "计划已经被改过，请重新读取后再写",
                "expected": e,
                "revision": actual,
            })),
        )),
        _ => None,
    }
}

// ==================== 接口 ====================

#[derive(Debug, Deserialize)]
pub struct WriteBody {
    pub plan_id: String,
    pub plan: Plan,
    #[serde(default)]
    pub expected_revision: Option<u64>,
}

/// 整份写入。**新建时 `expected_revision` 传 0。**
/// 当前这份计划，**给界面看的**。
///
/// 现有那 7 个路由都是 agent 用的（按 id 取、按 stage 取、带乐观并发写），
/// 界面没有一个入口能问"现在在做什么" —— 于是 `plan:changed` 事件发出来
/// 也没人接，整块制作计划对用户是不存在的。
///
/// **取最近改过的那一份。** 一个工作区理论上可以有多份计划（agent 重新
/// 规划时会换 id），但用户关心的永远是正在跑的那个。
pub async fn current(State(state): State<Arc<AppState>>) -> Json<Value> {
    let d = dir(&state.ws);
    let mut best: Option<(std::time::SystemTime, Plan)> = None;
    let Ok(entries) = std::fs::read_dir(&d) else {
        // 目录还不存在 = 一次计划都没写过。**不是错误** ——
        // 界面据此把面板整个收起来。
        return Json(json!({ "ok": true, "plan": Value::Null }));
    };
    for e in entries.flatten() {
        let path = e.path();
        if path.extension().and_then(|x| x.to_str()) != Some("json") {
            continue;
        }
        let Some(plan) = read(&path) else { continue };
        let when = e.metadata().ok().and_then(|m| m.modified().ok());
        let Some(when) = when else { continue };
        if best.as_ref().is_none_or(|(b, _)| when > *b) {
            best = Some((when, plan));
        }
    }
    Json(json!({ "ok": true, "plan": best.map(|(_, p)| p) }))
}

pub async fn write(
    State(state): State<Arc<AppState>>,
    Json(body): Json<WriteBody>,
) -> (StatusCode, Json<Value>) {
    let Some(p) = path_of(&state.ws, &body.plan_id) else {
        return bad("plan_id 不合法");
    };
    let current = read(&p);
    let actual = current.as_ref().map(|c| c.revision).unwrap_or(0);
    if let Some(r) = conflict(body.expected_revision, actual) {
        return r;
    }
    let mut next = body.plan;
    next.id = body.plan_id.clone();
    next.revision = actual + 1;
    if let Err(e) = save(&p, &next) {
        return err(e.to_string());
    }
    state.events.publish(
        "plan:changed",
        json!({ "planId": next.id, "revision": next.revision }),
    );
    ok(json!({ "plan_id": next.id, "revision": next.revision }))
}

#[derive(Debug, Deserialize)]
pub struct GetBody {
    pub plan_id: String,
    #[serde(default)]
    pub stage_id: Option<String>,
    #[serde(default)]
    pub order: Option<i64>,
}

fn locate<'a>(plan: &'a Plan, b: &GetBody) -> Option<&'a Stage> {
    if let Some(id) = &b.stage_id {
        return plan.stage(id);
    }
    if let Some(o) = b.order {
        return plan.stages.iter().find(|s| s.order == o);
    }
    // 都没给就返回"下一个该做的"。agent 常常就是想问这个。
    plan.next_stage()
}

/// Stage 的状态摘要（不含 work item 明细）。
pub async fn get_stage_status(
    State(state): State<Arc<AppState>>,
    Json(body): Json<GetBody>,
) -> (StatusCode, Json<Value>) {
    let Some(plan) = path_of(&state.ws, &body.plan_id).and_then(|p| read(&p)) else {
        return not_found();
    };
    let Some(s) = locate(&plan, &body) else {
        return ok(
            json!({ "revision": plan.revision, "stage": Value::Null, "next_action": "done" }),
        );
    };
    let total = s.work_items.len();
    let done = s.work_items.iter().filter(|w| w.done).count();
    ok(json!({
        "revision": plan.revision,
        "stage": { "id": s.id, "name": s.name, "order": s.order, "state": s.state },
        "progress": { "done": done, "total": total },
        // agent 提示词里会按 next_action 分支，所以这个字段要一直有。
        "next_action": if s.state.terminal() { "advance" } else { "work" },
    }))
}

/// Stage 的完整内容。
pub async fn get_stage_detail(
    State(state): State<Arc<AppState>>,
    Json(body): Json<GetBody>,
) -> (StatusCode, Json<Value>) {
    let Some(plan) = path_of(&state.ws, &body.plan_id).and_then(|p| read(&p)) else {
        return not_found();
    };
    match locate(&plan, &body) {
        Some(s) => ok(json!({ "revision": plan.revision, "stage": s })),
        None => ok(json!({ "revision": plan.revision, "stage": Value::Null })),
    }
}

#[derive(Debug, Deserialize)]
pub struct WorkItemsBody {
    pub plan_id: String,
    #[serde(default)]
    pub stage_id: Option<String>,
    #[serde(default)]
    pub work_item_ids: Option<Vec<String>>,
}

pub async fn get_work_items(
    State(state): State<Arc<AppState>>,
    Json(body): Json<WorkItemsBody>,
) -> (StatusCode, Json<Value>) {
    let Some(plan) = path_of(&state.ws, &body.plan_id).and_then(|p| read(&p)) else {
        return not_found();
    };
    let stages: Vec<&Stage> = match &body.stage_id {
        Some(id) => plan.stage(id).into_iter().collect(),
        None => plan.stages.iter().collect(),
    };
    let items: Vec<&WorkItem> = stages
        .iter()
        .flat_map(|s| s.work_items.iter())
        .filter(|w| match &body.work_item_ids {
            Some(ids) => ids.contains(&w.id),
            None => true,
        })
        .collect();
    ok(json!({ "revision": plan.revision, "work_items": items }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateBody {
    pub plan_id: String,
    pub expected_revision: Option<u64>,
    /// `[{ stage_id, state }]`
    pub updates: Vec<StateUpdate>,
}

#[derive(Debug, Deserialize)]
pub struct StateUpdate {
    pub stage_id: String,
    pub state: StageState,
}

pub async fn update_stage_state(
    State(state): State<Arc<AppState>>,
    Json(body): Json<UpdateBody>,
) -> (StatusCode, Json<Value>) {
    let Some(p) = path_of(&state.ws, &body.plan_id) else {
        return bad("plan_id 不合法");
    };
    let Some(mut plan) = read(&p) else {
        return not_found();
    };
    if let Some(r) = conflict(body.expected_revision, plan.revision) {
        return r;
    }
    // **先全部校验再写**。写一半发现某个 stage_id 不存在就中止的话，
    // 前面几个已经改了 —— 而调用方收到的是失败，会重试整批。
    for u in &body.updates {
        if plan.stage(&u.stage_id).is_none() {
            return bad(&format!("没有这个 Stage: {}", u.stage_id));
        }
    }
    for u in &body.updates {
        if let Some(s) = plan.stages.iter_mut().find(|s| s.id == u.stage_id) {
            s.state = u.state;
        }
    }
    plan.revision += 1;
    if let Err(e) = save(&p, &plan) {
        return err(e.to_string());
    }
    state.events.publish(
        "plan:changed",
        json!({ "planId": plan.id, "revision": plan.revision }),
    );
    ok(json!({ "revision": plan.revision, "next_action": plan.next_stage().map(|s| s.id.clone()) }))
}

#[derive(Debug, Deserialize)]
pub struct PatchBody {
    pub plan_id: String,
    pub expected_revision: Option<u64>,
    #[serde(default)]
    pub stage_id: Option<String>,
    /// 插到哪个 order 之后。不给就追加到末尾。
    #[serde(default)]
    pub after_order: Option<i64>,
    #[serde(default)]
    pub stage: Option<Stage>,
    #[serde(default)]
    pub remove: Option<bool>,
}

/// 改一个 Stage：新增 / 替换 / 删除。
pub async fn patch_stage(
    State(state): State<Arc<AppState>>,
    Json(body): Json<PatchBody>,
) -> (StatusCode, Json<Value>) {
    let Some(p) = path_of(&state.ws, &body.plan_id) else {
        return bad("plan_id 不合法");
    };
    let Some(mut plan) = read(&p) else {
        return not_found();
    };
    if let Some(r) = conflict(body.expected_revision, plan.revision) {
        return r;
    }

    if body.remove.unwrap_or(false) {
        let Some(id) = body.stage_id.as_deref() else {
            return bad("remove 要带 stage_id");
        };
        let before = plan.stages.len();
        plan.stages.retain(|s| s.id != id);
        if plan.stages.len() == before {
            return bad(&format!("没有这个 Stage: {id}"));
        }
    } else if let Some(mut st) = body.stage {
        if let Some(i) = plan.stages.iter().position(|s| s.id == st.id) {
            // 替换时保留原来的 order，除非调用方显式给了 after_order ——
            // 不然改一次内容就会把它挪到末尾。
            if body.after_order.is_none() {
                st.order = plan.stages[i].order;
            }
            plan.stages[i] = st;
        } else {
            if let Some(after) = body.after_order {
                st.order = after + 1;
                // 后面的整体让位，否则 order 会撞在一起，
                // 而排序是按 order 来的 —— 撞了顺序就不确定。
                for s in plan.stages.iter_mut().filter(|s| s.order > after) {
                    s.order += 1;
                }
            } else if st.order == 0 {
                st.order = plan.stages.iter().map(|s| s.order).max().unwrap_or(0) + 1;
            }
            plan.stages.push(st);
        }
    } else {
        return bad("要么给 stage，要么 remove=true");
    }

    plan.stages.sort_by_key(|s| s.order);
    plan.revision += 1;
    if let Err(e) = save(&p, &plan) {
        return err(e.to_string());
    }
    state.events.publish(
        "plan:changed",
        json!({ "planId": plan.id, "revision": plan.revision }),
    );
    ok(json!({ "revision": plan.revision, "stages": plan.stages.len() }))
}

#[derive(Debug, Deserialize)]
pub struct ReplanBody {
    pub plan_id: String,
    pub expected_revision: Option<u64>,
    #[serde(default)]
    pub reason: String,
    /// 保留到这个 Stage 为止（含）。它之后的整段被 `operations` 替换。
    #[serde(default)]
    pub preserve_through_stage_id: Option<String>,
    #[serde(default)]
    pub operations: Vec<Stage>,
}

/// 重排计划的后半段。
///
/// **只换后缀，不动已经做完的部分** —— 这是 replan 和 write 的区别。
/// 整份重写会把 executor 已完成的状态一起抹掉，表现是"做完的又被做一遍"。
pub async fn replan(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ReplanBody>,
) -> (StatusCode, Json<Value>) {
    let Some(p) = path_of(&state.ws, &body.plan_id) else {
        return bad("plan_id 不合法");
    };
    let Some(mut plan) = read(&p) else {
        return not_found();
    };
    if let Some(r) = conflict(body.expected_revision, plan.revision) {
        return r;
    }

    let cut = match &body.preserve_through_stage_id {
        Some(id) => match plan.stage(id) {
            Some(s) => s.order,
            None => return bad(&format!("没有这个 Stage: {id}")),
        },
        // 不给就保留所有已经结束的 Stage。**不能一刀切全删** ——
        // 那等于把已完成的工作扔掉。
        None => plan
            .stages
            .iter()
            .filter(|s| s.state.terminal())
            .map(|s| s.order)
            .max()
            .unwrap_or(i64::MIN),
    };

    plan.stages.retain(|s| s.order <= cut);
    let mut next_order = cut;
    for mut st in body.operations {
        next_order += 1;
        st.order = next_order;
        plan.stages.push(st);
    }
    plan.stages.sort_by_key(|s| s.order);
    plan.revision += 1;
    if let Err(e) = save(&p, &plan) {
        return err(e.to_string());
    }
    state.events.publish(
        "plan:changed",
        json!({ "planId": plan.id, "revision": plan.revision, "reason": body.reason }),
    );
    ok(json!({
        "revision": plan.revision,
        "stages": plan.stages.len(),
        "resume_stage_id": plan.next_stage().map(|s| s.id.clone()),
    }))
}

// ---------- 小工具 ----------

fn ok(mut v: Value) -> (StatusCode, Json<Value>) {
    if let Some(m) = v.as_object_mut() {
        m.insert("ok".into(), json!(true));
    }
    (StatusCode::OK, Json(v))
}
fn bad(msg: &str) -> (StatusCode, Json<Value>) {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({ "ok": false, "error": msg })),
    )
}
fn err(msg: String) -> (StatusCode, Json<Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "ok": false, "error": msg })),
    )
}
fn not_found() -> (StatusCode, Json<Value>) {
    (
        StatusCode::NOT_FOUND,
        Json(json!({ "ok": false, "error": "没有这份计划" })),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn st() -> (Arc<AppState>, tempfile::TempDir) {
        crate::tests::state_with_dir()
    }

    fn stage(id: &str, order: i64, state: StageState) -> Stage {
        Stage {
            id: id.into(),
            name: id.into(),
            order,
            state,
            work_items: vec![],
            extra: Default::default(),
        }
    }

    async fn seed(s: &Arc<AppState>, stages: Vec<Stage>) -> u64 {
        let r = write(
            State(s.clone()),
            Json(WriteBody {
                plan_id: "p1".into(),
                expected_revision: Some(0),
                plan: Plan {
                    goal: "做一支短片".into(),
                    stages,
                    ..Default::default()
                },
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::OK, "{:?}", r.1.0);
        r.1.0["revision"].as_u64().unwrap()
    }

    #[tokio::test]
    async fn a_write_without_expected_revision_is_refused() {
        // 允许的话，一个忘了带的调用就能覆盖掉别人刚写的 ——
        // 而这正是乐观并发要防的那件事。
        let (s, _d) = st();
        let r = write(
            State(s),
            Json(WriteBody {
                plan_id: "p1".into(),
                expected_revision: None,
                plan: Plan::default(),
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn a_stale_revision_is_rejected_instead_of_overwriting() {
        // planner 在重排、executor 同时标完成 —— 后写的把前面整份覆盖掉，
        // 两边都收到"成功"。表现是执行进度凭空回退。
        let (s, _d) = st();
        let rev = seed(&s, vec![stage("a", 1, StageState::Pending)]).await;
        let r = update_stage_state(
            State(s.clone()),
            Json(UpdateBody {
                plan_id: "p1".into(),
                expected_revision: Some(rev - 1), // 过期的
                updates: vec![StateUpdate {
                    stage_id: "a".into(),
                    state: StageState::Completed,
                }],
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::CONFLICT);
        assert_eq!(r.1.0["revision"], rev, "要把当前 revision 告诉调用方");
    }

    #[tokio::test]
    async fn a_batch_update_is_all_or_nothing() {
        // 写一半发现某个 stage_id 不存在就中止的话，前面几个已经改了，
        // 而调用方收到失败会重试整批。
        let (s, _d) = st();
        let rev = seed(
            &s,
            vec![
                stage("a", 1, StageState::Pending),
                stage("b", 2, StageState::Pending),
            ],
        )
        .await;
        let r = update_stage_state(
            State(s.clone()),
            Json(UpdateBody {
                plan_id: "p1".into(),
                expected_revision: Some(rev),
                updates: vec![
                    StateUpdate {
                        stage_id: "a".into(),
                        state: StageState::Completed,
                    },
                    StateUpdate {
                        stage_id: "nope".into(),
                        state: StageState::Completed,
                    },
                ],
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::BAD_REQUEST);

        let d = get_stage_detail(
            State(s),
            Json(GetBody {
                plan_id: "p1".into(),
                stage_id: Some("a".into()),
                order: None,
            }),
        )
        .await;
        assert_eq!(d.1.0["stage"]["state"], "pending", "a 不该被改动");
    }

    #[tokio::test]
    async fn replan_keeps_finished_stages() {
        // 整份重写会把 executor 已完成的状态一起抹掉，
        // 表现是"做完的又被做一遍"。
        let (s, _d) = st();
        let rev = seed(
            &s,
            vec![
                stage("done1", 1, StageState::Completed),
                stage("done2", 2, StageState::Completed),
                stage("todo", 3, StageState::Pending),
            ],
        )
        .await;
        let r = replan(
            State(s.clone()),
            Json(ReplanBody {
                plan_id: "p1".into(),
                expected_revision: Some(rev),
                reason: "换个方向".into(),
                preserve_through_stage_id: None,
                operations: vec![stage("new", 0, StageState::Pending)],
            }),
        )
        .await;
        assert_eq!(r.0, StatusCode::OK, "{:?}", r.1.0);

        let d = get_stage_detail(
            State(s.clone()),
            Json(GetBody {
                plan_id: "p1".into(),
                stage_id: Some("done2".into()),
                order: None,
            }),
        )
        .await;
        assert_eq!(d.1.0["stage"]["state"], "completed", "已完成的必须留着");
        assert_eq!(r.1.0["stages"], 3, "done1 + done2 + new");
        assert_eq!(r.1.0["resume_stage_id"], "new");
    }

    #[tokio::test]
    async fn inserting_after_an_order_shifts_the_rest_instead_of_colliding() {
        // order 撞在一起的话排序结果不确定 —— agent 会按一个不稳定的顺序执行。
        let (s, _d) = st();
        let rev = seed(
            &s,
            vec![
                stage("a", 1, StageState::Pending),
                stage("b", 2, StageState::Pending),
            ],
        )
        .await;
        let _ = patch_stage(
            State(s.clone()),
            Json(PatchBody {
                plan_id: "p1".into(),
                expected_revision: Some(rev),
                stage_id: None,
                after_order: Some(1),
                stage: Some(stage("mid", 0, StageState::Pending)),
                remove: None,
            }),
        )
        .await;
        let plan = read(&path_of(&s.ws, "p1").unwrap()).unwrap();
        let orders: Vec<(String, i64)> = plan
            .stages
            .iter()
            .map(|s| (s.id.clone(), s.order))
            .collect();
        assert_eq!(
            orders,
            vec![("a".into(), 1), ("mid".into(), 2), ("b".into(), 3)],
            "插入后 b 要让位，不能和 mid 撞在 2 上"
        );
    }

    #[tokio::test]
    async fn replacing_a_stage_keeps_its_position() {
        // 不保位置的话，改一次内容就把它挪到末尾 —— 执行顺序被悄悄改了。
        let (s, _d) = st();
        let rev = seed(
            &s,
            vec![
                stage("a", 1, StageState::Pending),
                stage("b", 2, StageState::Pending),
            ],
        )
        .await;
        let mut na = stage("a", 999, StageState::Pending);
        na.name = "改过的 a".into();
        let _ = patch_stage(
            State(s.clone()),
            Json(PatchBody {
                plan_id: "p1".into(),
                expected_revision: Some(rev),
                stage_id: None,
                after_order: None,
                stage: Some(na),
                remove: None,
            }),
        )
        .await;
        let plan = read(&path_of(&s.ws, "p1").unwrap()).unwrap();
        assert_eq!(plan.stages[0].id, "a");
        assert_eq!(plan.stages[0].order, 1, "order 要保住");
        assert_eq!(plan.stages[0].name, "改过的 a");
    }

    #[tokio::test]
    async fn the_next_stage_skips_finished_ones() {
        let (s, _d) = st();
        seed(
            &s,
            vec![
                stage("a", 1, StageState::Completed),
                stage("b", 2, StageState::Skipped),
                stage("c", 3, StageState::Pending),
            ],
        )
        .await;
        let r = get_stage_status(
            State(s),
            Json(GetBody {
                plan_id: "p1".into(),
                stage_id: None,
                order: None,
            }),
        )
        .await;
        assert_eq!(r.1.0["stage"]["id"], "c");
    }

    #[tokio::test]
    async fn a_plan_id_cannot_escape_the_workspace() {
        let (s, _d) = st();
        assert!(path_of(&s.ws, "../../etc/x").is_none());
        assert!(path_of(&s.ws, "ok_id-1").is_some());
    }

    #[tokio::test]
    async fn unknown_fields_survive_a_round_trip() {
        // agent 会往 Stage 里塞我们还不认识的东西。丢掉的话它下一轮读回来
        // 发现自己写的东西没了。
        let (s, _d) = st();
        let mut st1 = stage("a", 1, StageState::Pending);
        st1.extra
            .insert("deliverable".into(), json!("一支 15 秒短片"));
        seed(&s, vec![st1]).await;
        let d = get_stage_detail(
            State(s),
            Json(GetBody {
                plan_id: "p1".into(),
                stage_id: Some("a".into()),
                order: None,
            }),
        )
        .await;
        assert_eq!(d.1.0["stage"]["deliverable"], "一支 15 秒短片");
    }
}
