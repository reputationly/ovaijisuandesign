//! 两件事：让 `OVAIJISUAN_VERSION` 的变化触发重编，以及给 Windows 的 exe
//! 嵌图标。
//!
//! 版本号用 `option_env!` 在编译期读进去。没有 rerun-if-env-changed 的话，
//! 改了环境变量但源码没动，cargo 会直接复用缓存 —— CI 上有 rust-cache，
//! 表现就是发了新版而二进制自报的还是上一版的版本号。

fn main() {
    println!("cargo:rerun-if-env-changed=OVAIJISUAN_VERSION");

    #[cfg(windows)]
    {
        // 路径相对 crate 根。图标换了要重编，否则 exe 里还是旧的。
        println!("cargo:rerun-if-changed=../../assets/icon.ico");
        let mut res = winresource::WindowsResource::new();
        res.set_icon("../../assets/icon.ico");
        // 资源里的版本号跟着二进制走：Windows 的「属性 → 详细信息」读的是
        // 这里，和 `ovgw --version` 对不上的话排查时会被带偏。
        if let Some(v) = option_env!("OVAIJISUAN_VERSION") {
            res.set("FileVersion", v).set("ProductVersion", v);
        }
        if let Err(e) = res.compile() {
            // **不要 panic。** 嵌图标失败不该让整个构建挂掉 —— 没有图标的
            // 二进制完全能用，而一个图标问题拦住发版是不成比例的。
            println!("cargo:warning=嵌入 Windows 图标失败，继续构建: {e}");
        }
    }
}
