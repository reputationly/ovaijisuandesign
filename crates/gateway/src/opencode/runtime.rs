//! 拉起、看护、关掉 `opencode serve`。照官方 `OpenCodeManager`，见
//! `docs/opencode-runtime.md` 第二、五节。
//!
//! 一个工作区一个实例（官方同样如此）。gateway 是它唯一的客户端 ——
//! 地址和 basic auth 凭据只在这里和 [`crate::opencode`] 的桥之间流动，
//! 不给前端。

use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use anyhow::{Context, Result, bail};
use serde::Serialize;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{Mutex, watch};

/// 连接一个在跑的 opencode 所需的全部信息。
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Endpoint {
    pub url: String,
    pub username: String,
    #[serde(skip)]
    pub password: String,
}

impl Endpoint {
    pub fn basic_auth(&self) -> String {
        use base64::Engine;
        let raw = format!("{}:{}", self.username, self.password);
        format!(
            "Basic {}",
            base64::engine::general_purpose::STANDARD.encode(raw)
        )
    }
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum Status {
    Stopped,
    Starting,
    Ready {
        url: String,
        version: String,
    },
    /// 起不来 / 崩溃次数用完。`reason` 原样给用户看。
    Failed {
        reason: String,
    },
}

/// 启动一次要准备的全部东西。由 [`super::prepare`] 算出来。
#[derive(Debug, Clone)]
pub struct LaunchSpec {
    pub binary: PathBuf,
    pub cwd: PathBuf,
    /// 追加 / 覆盖到继承环境上的变量（已经含 `OPENCODE_CONFIG` / `_DIR` 等）。
    pub env: Vec<(String, String)>,
    /// 配置临时文件，stop 时删。
    pub config_file: PathBuf,
}

/// 崩溃后最多自动重启几次。照官方 `maxRestartAttempts`。
const MAX_RESTARTS: u32 = 3;
/// 连续稳定跑这么久，重启计数清零。
const STABLE_RESET: Duration = Duration::from_secs(5 * 60);

pub struct Runtime {
    spec: Mutex<Option<LaunchSpec>>,
    child: Mutex<Option<Child>>,
    status_tx: watch::Sender<Status>,
    endpoint: std::sync::RwLock<Option<Endpoint>>,
    /// 我们自己要停的，看护任务看到进程退出时不要重启。
    stopping: AtomicBool,
    http: reqwest::Client,
}

impl Runtime {
    pub fn new() -> Arc<Self> {
        let (status_tx, _) = watch::channel(Status::Stopped);
        Arc::new(Self {
            spec: Mutex::new(None),
            child: Mutex::new(None),
            status_tx,
            endpoint: std::sync::RwLock::new(None),
            stopping: AtomicBool::new(false),
            // 回环地址，**必须绕开系统代理**（原因见 AppState::local）。
            http: reqwest::Client::builder()
                .no_proxy()
                .build()
                .expect("reqwest client"),
        })
    }

    pub fn status(&self) -> Status {
        self.status_tx.borrow().clone()
    }

    pub fn subscribe(&self) -> watch::Receiver<Status> {
        self.status_tx.subscribe()
    }

    /// 还没走到 spawn 就失败了（配置缺失之类）。记下原因给界面看。
    pub fn fail(&self, reason: String) {
        let _ = self.status_tx.send(Status::Failed { reason });
    }

    /// 在跑时给出连接信息。
    pub fn endpoint(&self) -> Option<Endpoint> {
        self.endpoint.read().ok().and_then(|e| e.clone())
    }

    /// 起一个新实例（已有的先停）。返回时已通过健康检查。
    pub async fn start(self: &Arc<Self>, spec: LaunchSpec) -> Result<Endpoint> {
        self.stop().await;
        *self.spec.lock().await = Some(spec);
        self.stopping.store(false, Ordering::SeqCst);
        let ep = self.spawn_once().await?;
        let me = self.clone();
        tokio::spawn(async move { me.supervise().await });
        Ok(ep)
    }

    async fn spawn_once(self: &Arc<Self>) -> Result<Endpoint> {
        let Some(spec) = self.spec.lock().await.clone() else {
            bail!("没有启动参数");
        };
        let _ = self.status_tx.send(Status::Starting);
        match self.spawn_inner(&spec).await {
            Ok(ep) => Ok(ep),
            Err(e) => {
                let _ = self.status_tx.send(Status::Failed {
                    reason: format!("{e:#}"),
                });
                Err(e)
            }
        }
    }

    async fn spawn_inner(&self, spec: &LaunchSpec) -> Result<Endpoint> {
        check_binary(&spec.binary)?;
        let port = free_port().context("找不到空闲端口")?;
        // 每个实例一对随机凭据。opencode 只靠这个保护 —— 本机别的进程能扫到端口。
        let username = uuid::Uuid::new_v4().to_string();
        let password = uuid::Uuid::new_v4().to_string();

        let mut cmd = Command::new(&spec.binary);
        cmd.args([
            "serve",
            "--hostname",
            "127.0.0.1",
            "--port",
            &port.to_string(),
        ])
        .current_dir(&spec.cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
        for key in SCRUBBED_ENV {
            cmd.env_remove(key);
        }
        for (k, v) in &spec.env {
            cmd.env(k, v);
        }
        cmd.env("OPENCODE_SERVER_USERNAME", &username)
            .env("OPENCODE_SERVER_PASSWORD", &password);
        #[cfg(unix)]
        cmd.process_group(0);
        #[cfg(windows)]
        {
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd
            .spawn()
            .with_context(|| format!("启动 {} 失败", spec.binary.display()))?;
        let listening = Arc::new(AtomicBool::new(false));
        pipe_logs(child.stdout.take(), "stdout", listening.clone());
        pipe_logs(child.stderr.take(), "stderr", listening.clone());
        *self.child.lock().await = Some(child);

        let ep = Endpoint {
            url: format!("http://127.0.0.1:{port}"),
            username,
            password,
        };
        let version = self.wait_healthy(&ep, &listening).await?;
        tracing::info!("opencode {version} 就绪 {}", ep.url);
        if let Ok(mut w) = self.endpoint.write() {
            *w = Some(ep.clone());
        }
        let _ = self.status_tx.send(Status::Ready {
            url: ep.url.clone(),
            version,
        });
        Ok(ep)
    }

    /// 轮询 `/global/health`，要 `{healthy: true, version}`。
    ///
    /// 超时分两级，照官方：软超时之后，如果输出里已经出现过 `listening on`
    /// （进程确实起来了，只是慢 —— 首次启动要迁移 DB），继续等到硬超时。
    async fn wait_healthy(&self, ep: &Endpoint, listening: &AtomicBool) -> Result<String> {
        let soft = if cfg!(target_os = "macos") {
            Duration::from_secs(90)
        } else if cfg!(windows) {
            Duration::from_secs(120)
        } else {
            Duration::from_secs(30)
        };
        let hard = (soft * 2).min(Duration::from_secs(240));
        let start = Instant::now();
        let mut last_err: String;
        loop {
            if let Some(code) = self.exited().await {
                bail!("opencode 启动过程中退出了（退出码 {code}）。详情见日志里的 [opencode] 行");
            }
            match self
                .http
                .get(format!("{}/global/health", ep.url))
                .header("authorization", ep.basic_auth())
                .timeout(Duration::from_secs(2))
                .send()
                .await
            {
                Ok(r) if r.status().is_success() => {
                    let v: serde_json::Value = r.json().await.unwrap_or_default();
                    if v["healthy"] == true {
                        return Ok(v["version"].as_str().unwrap_or("?").to_string());
                    }
                    last_err = format!("health 回的不是 healthy: {v}");
                }
                Ok(r) => last_err = format!("health 回 {}", r.status()),
                Err(e) => last_err = e.to_string(),
            }
            let limit = if listening.load(Ordering::Relaxed) {
                hard
            } else {
                soft
            };
            if start.elapsed() > limit {
                self.kill().await;
                bail!("opencode {}s 内没有就绪：{last_err}", limit.as_secs());
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    }

    /// 进程是否已经退出；退出了给退出码。
    async fn exited(&self) -> Option<i32> {
        let mut guard = self.child.lock().await;
        let child = guard.as_mut()?;
        match child.try_wait() {
            Ok(Some(st)) => Some(st.code().unwrap_or(-1)),
            _ => None,
        }
    }

    /// 看护：进程意外退出时按退避重启。
    async fn supervise(self: Arc<Self>) {
        let mut attempts = 0u32;
        let mut up_since = Instant::now();
        loop {
            // 等它退出。不能持锁 await wait() —— stop() 要拿同一把锁去杀它。
            let code = loop {
                tokio::time::sleep(Duration::from_millis(500)).await;
                if self.stopping.load(Ordering::SeqCst) {
                    return;
                }
                if let Some(code) = self.exited().await {
                    break code;
                }
            };
            if self.stopping.load(Ordering::SeqCst) {
                return;
            }
            if let Ok(mut w) = self.endpoint.write() {
                *w = None;
            }
            if up_since.elapsed() > STABLE_RESET {
                attempts = 0;
            }
            attempts += 1;
            if attempts > MAX_RESTARTS {
                let _ = self.status_tx.send(Status::Failed {
                    reason: format!("opencode 反复退出（最后一次退出码 {code}），已停止自动重启"),
                });
                return;
            }
            // 1s·2^(n-1)，上限 10s，再错开 750ms。
            let backoff = Duration::from_secs(1u64 << (attempts - 1)).min(Duration::from_secs(10))
                + Duration::from_millis(750);
            tracing::warn!(
                "opencode 意外退出（退出码 {code}），{}ms 后第 {attempts} 次重启",
                backoff.as_millis()
            );
            tokio::time::sleep(backoff).await;
            if self.stopping.load(Ordering::SeqCst) {
                return;
            }
            match self.spawn_once().await {
                Ok(_) => up_since = Instant::now(),
                Err(e) => tracing::error!("opencode 重启失败: {e:#}"),
            }
        }
    }

    /// 停掉。先 TERM 整个进程组（opencode 会带着 MCP server 等子进程），
    /// 等 5s（Windows 1s）还在就 KILL。
    pub async fn stop(&self) {
        self.stopping.store(true, Ordering::SeqCst);
        self.kill().await;
        if let Ok(mut w) = self.endpoint.write() {
            *w = None;
        }
        if let Some(spec) = self.spec.lock().await.as_ref() {
            let _ = std::fs::remove_file(&spec.config_file);
        }
        let _ = self.status_tx.send(Status::Stopped);
    }

    async fn kill(&self) {
        let Some(mut child) = self.child.lock().await.take() else {
            return;
        };
        let Some(pid) = child.id() else {
            return;
        };
        terminate_tree(pid);
        let grace = if cfg!(windows) {
            Duration::from_secs(1)
        } else {
            Duration::from_secs(5)
        };
        if tokio::time::timeout(grace, child.wait()).await.is_err() {
            kill_tree(pid);
            let _ = child.kill().await;
        }
    }
}

/// 继承环境时要去掉的：这些由我们显式给，继承下来的旧值会顶掉或混进去。
pub const SCRUBBED_ENV: &[&str] = &[
    "OPENCODE_CONFIG",
    "OPENCODE_CONFIG_DIR",
    "OPENCODE_CONFIG_CONTENT",
    "HILO_WORKFLOWS_DIR",
    "HILO_KNOWLEDGE_DIR",
    "HILO_CONTRACTS_DIR",
    "HILO_AGENT_RUN_ID",
];

/// 不是 opencode 的东西（下载坏了、被截断）会在 spawn 时报一个看不出原因的错。
/// 照官方：存在、至少 1MB。
fn check_binary(p: &std::path::Path) -> Result<()> {
    let meta = std::fs::metadata(p).with_context(|| format!("找不到 opencode: {}", p.display()))?;
    if meta.len() < 1_000_000 {
        bail!(
            "{} 只有 {} 字节，不像是 opencode（下载不完整？）",
            p.display(),
            meta.len()
        );
    }
    Ok(())
}

fn free_port() -> std::io::Result<u16> {
    let l = std::net::TcpListener::bind("127.0.0.1:0")?;
    Ok(l.local_addr()?.port())
}

fn pipe_logs<R>(stream: Option<R>, which: &'static str, listening: Arc<AtomicBool>)
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    let Some(stream) = stream else { return };
    tokio::spawn(async move {
        let mut lines = BufReader::new(stream).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.contains("listening on") {
                listening.store(true, Ordering::Relaxed);
            }
            tracing::info!(target: "opencode", "[opencode {which}] {line}");
        }
    });
}

#[cfg(unix)]
fn terminate_tree(pid: u32) {
    // 进程组 id 就是 pid（spawn 时 process_group(0)）。不引 libc，借系统的 kill。
    let _ = std::process::Command::new("kill")
        .args(["-TERM", "--", &format!("-{pid}")])
        .status();
}

#[cfg(unix)]
fn kill_tree(pid: u32) {
    let _ = std::process::Command::new("kill")
        .args(["-KILL", "--", &format!("-{pid}")])
        .status();
}

#[cfg(windows)]
fn taskkill(args: &[&str]) {
    use std::os::windows::process::CommandExt;
    // 不加这个的话每次停 opencode 都会闪一下黑框。
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let _ = std::process::Command::new("taskkill")
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .status();
}

#[cfg(windows)]
fn terminate_tree(pid: u32) {
    taskkill(&["/T", "/PID", &pid.to_string()]);
}

#[cfg(windows)]
fn kill_tree(pid: u32) {
    taskkill(&["/T", "/F", "/PID", &pid.to_string()]);
}
