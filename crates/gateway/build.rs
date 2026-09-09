//! 只为了一件事：让 `OVAIJISUAN_VERSION` 的变化能触发重编。
//!
//! 版本号用 `option_env!` 在编译期读进去。没有这一行的话，改了环境变量
//! 但源码没动，cargo 会直接复用缓存 —— CI 上有 rust-cache，表现就是
//! 发了新版而二进制自报的还是上一版的版本号。

fn main() {
    println!("cargo:rerun-if-env-changed=OVAIJISUAN_VERSION");
}
