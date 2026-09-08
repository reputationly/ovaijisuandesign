//! 生成任务表。
//!
//! 平台侧图片是同步的、视频音频是另一套 id，而调用方（mcp-tools / 画布）
//! 统一按"提交拿 id → 轮询"用。所以这里自己铸 id 立刻返回，真正的调用丢到
//! 后台，轮询时按这张表回答。

use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use maas_media::PlatformError;

/// 终态任务保留多久。
///
/// 必须有这个上限：调用方拿到终态就不再轮询了，没有淘汰的话这张表在长会话里
/// 只增不减。半小时足够任何一个正常的轮询周期。
const KEEP_TERMINAL: Duration = Duration::from_secs(30 * 60);

#[derive(Debug, Clone)]
pub enum TaskState {
    Running,
    /// 结果的**公网可下载 URL**。落盘、归档、建节点是调用方的事。
    Succeeded { url: String },
    Failed { code: String, message: String },
}

impl TaskState {
    fn is_terminal(&self) -> bool {
        !matches!(self, Self::Running)
    }
}

#[derive(Debug)]
struct Entry {
    state: TaskState,
    /// 进入终态的时刻，用于淘汰。
    settled_at: Option<Instant>,
}

#[derive(Debug, Default)]
pub struct TaskStore {
    inner: Mutex<HashMap<String, Entry>>,
    seq: AtomicU64,
}

impl TaskStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// 铸一个 task_id 并登记为进行中。
    pub fn create(&self) -> String {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let seq = self.seq.fetch_add(1, Ordering::Relaxed);
        let id = format!("t-{nanos:x}-{seq:x}");
        self.set(&id, TaskState::Running);
        id
    }

    pub fn set(&self, id: &str, state: TaskState) {
        let Ok(mut map) = self.inner.lock() else { return };
        let settled_at = state.is_terminal().then(Instant::now);
        map.insert(id.to_string(), Entry { state, settled_at });
        // 顺手扫一遍。任务量本来就不大，单独起一个清理线程不值当。
        map.retain(|_, e| match e.settled_at {
            Some(at) => at.elapsed() < KEEP_TERMINAL,
            None => true,
        });
    }

    pub fn get(&self, id: &str) -> Option<TaskState> {
        Some(self.inner.lock().ok()?.get(id)?.state.clone())
    }

    /// 把一次平台调用的结果登记成终态。
    pub fn finish(&self, id: &str, result: Result<String, PlatformError>) {
        let state = match result {
            Ok(url) => {
                tracing::info!(task = id, "生成完成");
                TaskState::Succeeded { url }
            }
            Err(err) => {
                tracing::warn!(task = id, code = %err.code, "生成失败: {}", err.message);
                TaskState::Failed {
                    code: err.code,
                    message: err.message,
                }
            }
        };
        self.set(id, state);
    }

    #[cfg(test)]
    fn len(&self) -> usize {
        self.inner.lock().unwrap().len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_new_task_starts_running() {
        let s = TaskStore::new();
        let id = s.create();
        assert!(matches!(s.get(&id), Some(TaskState::Running)));
    }

    #[test]
    fn ids_are_unique() {
        let s = TaskStore::new();
        assert_ne!(s.create(), s.create());
    }

    #[test]
    fn finish_records_both_outcomes() {
        let s = TaskStore::new();
        let ok = s.create();
        s.finish(&ok, Ok("https://x/a.png".into()));
        assert!(matches!(s.get(&ok), Some(TaskState::Succeeded { .. })));

        let bad = s.create();
        s.finish(&bad, Err(PlatformError::config("缺模型")));
        match s.get(&bad) {
            Some(TaskState::Failed { message, .. }) => assert_eq!(message, "缺模型"),
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn an_unknown_id_is_none() {
        // 认不出的 id 只可能是服务重启过。调用方要据此回终态失败 ——
        // 回 processing 会让画布一直转到它自己的超时上限。
        assert!(TaskStore::new().get("t-nope").is_none());
    }

    #[test]
    fn running_tasks_are_never_evicted() {
        // 淘汰只针对终态。把在途任务扫掉会让轮询突然查不到，
        // 表现成"生成到一半任务消失了"。
        let s = TaskStore::new();
        let running = s.create();
        for _ in 0..50 {
            let id = s.create();
            s.finish(&id, Ok("https://x/a.png".into()));
        }
        assert!(matches!(s.get(&running), Some(TaskState::Running)));
    }

    #[test]
    fn terminal_tasks_are_evicted_once_stale() {
        // 没有淘汰这张表在长会话里只增不减。
        let s = TaskStore::new();
        let old = s.create();
        s.finish(&old, Ok("https://x/a.png".into()));
        // 直接把 settled_at 拨回去，避免测试真的等半小时。
        {
            let mut map = s.inner.lock().unwrap();
            let e = map.get_mut(&old).unwrap();
            e.settled_at = Some(Instant::now() - KEEP_TERMINAL - Duration::from_secs(1));
        }
        let fresh = s.create();
        assert!(s.get(&old).is_none(), "过期的终态任务应被淘汰");
        assert!(s.get(&fresh).is_some());
        assert_eq!(s.len(), 1);
    }
}
