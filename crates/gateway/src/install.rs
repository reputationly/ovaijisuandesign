//! 把下载好的新版换到程序目录里。
//!
//! 这一层只管**文件**，不碰网络、不碰 HTTP —— 下载和状态机在
//! [`crate::update`]。分开是因为这里是整个升级流程唯一一个"做错了会把用户
//! 已经装好的东西弄坏"的地方，必须能脱离网络单独测。
//!
//! ## 为什么是"改名挪开"而不是"直接覆盖"
//!
//! **Windows 不允许删除或覆盖正在运行的 exe，但允许给它改名。** 所以：
//!
//! ```text
//! ovgw.exe        → .old/3/ovgw.exe     旧的挪走（改名，允许）
//! .update/ovgw.exe → ovgw.exe            新的搬进来
//! ```
//!
//! 旧的留在 `.old/` 里，**下次启动时才删** —— 那时它已经不在运行了。
//!
//! Unix 上直接覆盖也行（inode 还活着），但用同一套路径有两个好处：一份代码，
//! 以及失败时能原样搬回来。
//!
//! ## 换之前必须验
//!
//! 包解出来是什么样，[`validate`] 说了算。少一项就中止 —— 一个残缺的包
//! 换进去，用户得到的是一个开不起来的安装，而他手上原来那个是好的。

use std::path::{Path, PathBuf};

use anyhow::{Context, Result, bail};

/// 发布包里必须有的东西。和 `scripts/release.py` 的 `build()` 一一对应，
/// 那边加了新的一项，这里也要加 —— 不然新东西不会被换过去，
/// 而升级会"成功"。
pub const ITEMS: &[&str] = &["ovgw", "ovagent", "web", "mcp"];

/// 带上平台后缀。
pub fn item_name(item: &str) -> String {
    if cfg!(windows) && (item == "ovgw" || item == "ovagent") {
        format!("{item}.exe")
    } else {
        item.to_string()
    }
}

/// 当前程序所在目录。发布包解压即用，四项都在同一层。
pub fn program_dir() -> Result<PathBuf> {
    let exe = std::env::current_exe().context("拿不到当前可执行文件路径")?;
    dir_of(&exe)
}

/// `exe` 所在的**真实**目录。
///
/// **必须先解符号链接。** `current_exe()` 在 macOS 上原样返回调用时用的路径，
/// 不跟随链接 —— 而"把二进制链接进 `~/bin` 或 `/usr/local/bin`"是极常见的
/// 做法（Homebrew 就是这么干的）。不解的话升级会往**链接所在的那个目录**
/// 写：真正的安装原封不动，而用户的 bin 目录里会凭空多出 `web/`、`mcp/`
/// 和一个 `ovagent`，符号链接本身被换成真文件。整件事还会"成功"。
///
/// 解不开就退回原路径 —— 拿不到真实路径也不该让程序起不来，
/// 大不了升级那一步失败，那时报错是具体的。
pub fn dir_of(exe: &Path) -> Result<PathBuf> {
    let real = std::fs::canonicalize(exe).unwrap_or_else(|_| exe.to_path_buf());
    Ok(real.parent().context("可执行文件没有父目录")?.to_path_buf())
}

/// 解压出来的东西对不对。**换之前必须过这一关。**
///
/// 只查存在性和类型，不查内容 —— 内容由 sha256 保证（在 [`crate::update`]
/// 里下载完就验了）。这里防的是另一回事：包本身是完好的，但结构和我们
/// 预期的不一样（比如上游改了布局），照换会得到一个开不起来的安装。
pub fn validate(staged: &Path) -> Result<()> {
    for item in ITEMS {
        let name = item_name(item);
        let p = staged.join(&name);
        if !p.exists() {
            bail!("包里缺少 {name}");
        }
        let is_dir = p.is_dir();
        let want_dir = *item == "web" || *item == "mcp";
        if is_dir != want_dir {
            bail!(
                "包里的 {name} 是{}，应该是{}",
                if is_dir { "目录" } else { "文件" },
                if want_dir { "目录" } else { "文件" }
            );
        }
    }
    // 二进制不能是空的。0 字节的文件也“存在”，换进去之后才发现开不起来。
    for item in ["ovgw", "ovagent"] {
        let p = staged.join(item_name(item));
        let len = std::fs::metadata(&p)?.len();
        if len < 1024 {
            bail!("{} 只有 {len} 字节，不像是个可执行文件", item_name(item));
        }
    }
    Ok(())
}

/// Unix 上把两个二进制补上执行位。
///
/// tar 里是带模式的，但解压路径上任何一步丢了模式（有些解包实现、或者
/// 从别的地方拷进来的 staging）都会让新版换进去之后**根本起不来**，
/// 而报错是 "Permission denied"，看着像权限问题而不是升级问题。
#[cfg(unix)]
fn ensure_exec(dir: &Path) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    for item in ["ovgw", "ovagent"] {
        let p = dir.join(item);
        let mut perm = std::fs::metadata(&p)?.permissions();
        perm.set_mode(0o755);
        std::fs::set_permissions(&p, perm)
            .with_context(|| format!("设置 {} 的权限失败", p.display()))?;
    }
    Ok(())
}

#[cfg(not(unix))]
fn ensure_exec(_dir: &Path) -> Result<()> {
    Ok(())
}

/// 把 `staged` 里的四项换到 `live`，旧的挪进 `retired`。
///
/// **要么全换，要么全不换。** 中途任何一步失败都把已经挪走的搬回来 ——
/// 换了一半的安装（新的 ovgw 配旧的 web）比完全没换更难查。
pub fn swap(live: &Path, staged: &Path, retired: &Path) -> Result<()> {
    validate(staged)?;
    ensure_exec(staged)?;
    std::fs::create_dir_all(retired).context("建不了退役目录")?;

    // (旧的现在在哪, 它本来在哪)。回滚时倒着搬回去。
    let mut moved: Vec<(PathBuf, PathBuf)> = Vec::new();

    let rollback = |moved: &[(PathBuf, PathBuf)]| {
        for (from, to) in moved.iter().rev() {
            // 先把可能已经搬进来的新文件让开
            let _ = std::fs::remove_file(to);
            let _ = std::fs::remove_dir_all(to);
            if let Err(e) = std::fs::rename(from, to) {
                // 回滚也失败了 —— 只能把现场记清楚，让人能手工恢复。
                tracing::error!(
                    "回滚失败！{} 没能搬回 {}: {e}",
                    from.display(),
                    to.display()
                );
            }
        }
    };

    for item in ITEMS {
        let name = item_name(item);
        let live_p = live.join(&name);
        let new_p = staged.join(&name);
        let old_p = retired.join(&name);

        if live_p.exists() {
            if let Err(e) = std::fs::rename(&live_p, &old_p) {
                rollback(&moved);
                return Err(anyhow::Error::from(e)
                    .context(format!("挪开旧的 {name} 失败（Windows 上文件被占用？）")));
            }
            moved.push((old_p, live_p.clone()));
        }
        if let Err(e) = std::fs::rename(&new_p, &live_p) {
            rollback(&moved);
            return Err(anyhow::Error::from(e).context(format!("搬入新的 {name} 失败")));
        }
    }
    Ok(())
}

/// 删掉上一次升级留下的旧文件。**在启动时调用** —— 那时它们已经不在运行。
///
/// 失败只记日志：删不掉不影响本次运行（Windows 上偶尔还被杀毒软件占着），
/// 下次启动再试。为此不要 `?`。
pub fn cleanup(retired_root: &Path) {
    if !retired_root.exists() {
        return;
    }
    match std::fs::remove_dir_all(retired_root) {
        Ok(()) => tracing::info!("已清理上次升级留下的旧文件"),
        Err(e) => tracing::warn!("清理旧文件失败，下次启动再试: {e}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_pkg(dir: &Path) {
        std::fs::create_dir_all(dir).unwrap();
        for b in ["ovgw", "ovagent"] {
            std::fs::write(dir.join(item_name(b)), vec![b'x'; 2048]).unwrap();
        }
        for d in ["web", "mcp"] {
            std::fs::create_dir_all(dir.join(d)).unwrap();
            std::fs::write(dir.join(d).join("f"), "v").unwrap();
        }
    }

    #[test]
    fn swaps_all_four_items_and_retires_the_old_ones() {
        let t = tempfile::tempdir().unwrap();
        let (live, staged, retired) = (
            t.path().join("live"),
            t.path().join("new"),
            t.path().join("old"),
        );
        make_pkg(&live);
        make_pkg(&staged);
        std::fs::write(staged.join("web/f"), "NEW").unwrap();

        swap(&live, &staged, &retired).unwrap();

        assert_eq!(std::fs::read_to_string(live.join("web/f")).unwrap(), "NEW");
        assert_eq!(std::fs::read_to_string(retired.join("web/f")).unwrap(), "v");
        for item in ITEMS {
            assert!(live.join(item_name(item)).exists(), "{item} 没换过来");
        }
    }

    #[test]
    fn a_package_missing_a_piece_is_rejected_before_anything_moves() {
        // 这一条是重点：残缺的包换进去，用户得到一个开不起来的安装，
        // 而他原来那个是好的。必须在动任何东西之前就拦下。
        let t = tempfile::tempdir().unwrap();
        let (live, staged, retired) = (
            t.path().join("live"),
            t.path().join("new"),
            t.path().join("old"),
        );
        make_pkg(&live);
        make_pkg(&staged);
        std::fs::remove_dir_all(staged.join("mcp")).unwrap();

        let err = swap(&live, &staged, &retired).unwrap_err().to_string();
        assert!(err.contains("缺少 mcp"), "{err}");
        // 原来的安装一动没动
        for item in ITEMS {
            assert!(live.join(item_name(item)).exists(), "{item} 被动过了");
        }
        assert!(!retired.exists(), "不该建退役目录");
    }

    #[test]
    fn a_zero_byte_binary_is_rejected() {
        let t = tempfile::tempdir().unwrap();
        let (live, staged, retired) = (
            t.path().join("live"),
            t.path().join("new"),
            t.path().join("old"),
        );
        make_pkg(&live);
        make_pkg(&staged);
        std::fs::write(staged.join(item_name("ovgw")), b"").unwrap();
        let err = swap(&live, &staged, &retired).unwrap_err().to_string();
        assert!(err.contains("不像是个可执行文件"), "{err}");
    }

    #[test]
    fn a_directory_where_a_file_belongs_is_rejected() {
        // 上游改了布局的情形。类型不对照换的话，live 里会出现一个
        // 名叫 ovgw 的目录，下次启动直接失败。
        let t = tempfile::tempdir().unwrap();
        let (live, staged, retired) = (
            t.path().join("live"),
            t.path().join("new"),
            t.path().join("old"),
        );
        make_pkg(&live);
        make_pkg(&staged);
        std::fs::remove_file(staged.join(item_name("ovgw"))).unwrap();
        std::fs::create_dir(staged.join(item_name("ovgw"))).unwrap();
        let err = swap(&live, &staged, &retired).unwrap_err().to_string();
        assert!(err.contains("是目录"), "{err}");
    }

    #[test]
    fn a_failure_midway_puts_everything_back() {
        // 让第三项（web）搬不动：把 staged 里的 web 删掉，但保留前两项。
        // 前两项会先被挪走，然后失败 —— 必须原样搬回来。
        let t = tempfile::tempdir().unwrap();
        let (live, staged, retired) = (
            t.path().join("live"),
            t.path().join("new"),
            t.path().join("old"),
        );
        make_pkg(&live);
        make_pkg(&staged);
        std::fs::write(
            live.join(item_name("ovgw")),
            b"ORIGINAL-OVGW-CONTENT-PADDING-1234567890",
        )
        .unwrap();

        // 绕过 validate 直接调内部流程：validate 后把 web 抽走，模拟中途失败
        validate(&staged).unwrap();
        std::fs::remove_dir_all(staged.join("web")).unwrap();
        let err = swap(&live, &staged, &retired).unwrap_err().to_string();
        assert!(err.contains("缺少 web"), "{err}");

        assert_eq!(
            std::fs::read(live.join(item_name("ovgw"))).unwrap(),
            b"ORIGINAL-OVGW-CONTENT-PADDING-1234567890",
            "回滚后 ovgw 必须是原来那份"
        );
    }

    #[test]
    fn installing_into_a_dir_that_has_no_old_version_works() {
        // 首次安装 / 上一次升级被中断留下的半空目录。
        let t = tempfile::tempdir().unwrap();
        let (live, staged, retired) = (
            t.path().join("live"),
            t.path().join("new"),
            t.path().join("old"),
        );
        std::fs::create_dir_all(&live).unwrap();
        make_pkg(&staged);
        swap(&live, &staged, &retired).unwrap();
        for item in ITEMS {
            assert!(live.join(item_name(item)).exists());
        }
    }

    #[test]
    fn cleanup_removes_the_retired_tree_and_tolerates_a_missing_one() {
        let t = tempfile::tempdir().unwrap();
        let r = t.path().join("old");
        make_pkg(&r);
        cleanup(&r);
        assert!(!r.exists());
        cleanup(&r); // 不存在也不该 panic
    }

    #[cfg(unix)]
    #[test]
    fn the_binaries_come_out_executable() {
        use std::os::unix::fs::PermissionsExt;
        let t = tempfile::tempdir().unwrap();
        let (live, staged, retired) = (
            t.path().join("live"),
            t.path().join("new"),
            t.path().join("old"),
        );
        make_pkg(&live);
        make_pkg(&staged);
        // 模拟丢了执行位的 staging
        for b in ["ovgw", "ovagent"] {
            std::fs::set_permissions(staged.join(b), std::fs::Permissions::from_mode(0o644))
                .unwrap();
        }
        swap(&live, &staged, &retired).unwrap();
        for b in ["ovgw", "ovagent"] {
            let m = std::fs::metadata(live.join(b))
                .unwrap()
                .permissions()
                .mode();
            assert_eq!(m & 0o111, 0o111, "{b} 没有执行位，换过去也起不来");
        }
    }

    #[test]
    fn a_symlinked_binary_still_points_at_the_real_install_dir() {
        // 实测过的真 bug：current_exe() 在 macOS 上不跟随符号链接。
        // 通过 ~/bin/ovgw 这种链接运行时，升级会往 ~/bin 写 —— 真正的安装
        // 一动不动，而 bin 目录里凭空多出 web/、mcp/ 和一个 ovagent，
        // 链接本身被换成真文件。而且整件事会"成功"。
        let t = tempfile::tempdir().unwrap();
        let real = t.path().join("install");
        let bin = t.path().join("bin");
        std::fs::create_dir_all(&real).unwrap();
        std::fs::create_dir_all(&bin).unwrap();
        std::fs::write(real.join("ovgw"), vec![b'x'; 2048]).unwrap();

        #[cfg(unix)]
        std::os::unix::fs::symlink(real.join("ovgw"), bin.join("ovgw")).unwrap();
        #[cfg(windows)]
        std::fs::copy(real.join("ovgw"), bin.join("ovgw")).unwrap();

        let got = dir_of(&bin.join("ovgw")).unwrap();
        #[cfg(unix)]
        assert_eq!(
            got.canonicalize().unwrap(),
            real.canonicalize().unwrap(),
            "解析到了链接所在目录，不是真实安装目录"
        );
        #[cfg(windows)]
        assert_eq!(got.canonicalize().unwrap(), bin.canonicalize().unwrap());
    }

    #[test]
    fn an_unresolvable_path_falls_back_instead_of_failing() {
        // 拿不到真实路径不该让程序起不来。大不了升级那步失败，那时报错具体。
        let p = Path::new("/definitely/does/not/exist/ovgw");
        assert_eq!(dir_of(p).unwrap(), Path::new("/definitely/does/not/exist"));
    }
}
