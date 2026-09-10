//! 真的去问系统一次。
//!
//! 单元测试只能验"我们以为自己开了"，而这个开关最坏的失效方式恰恰是
//! **以为开了但系统那边什么都没有** —— 用户合上盖子出门，回来发现
//! 一晚上的消息全堆着。所以这里读 `pmset -g assertions` 对一遍。

#![cfg(target_os = "macos")]

fn assertions() -> String {
    String::from_utf8_lossy(
        &std::process::Command::new("pmset")
            .args(["-g", "assertions"])
            .output()
            .expect("跑不了 pmset")
            .stdout,
    )
    .into_owned()
}

/// 本进程名下、指定类型的那条断言。
fn mine(kind: &str) -> Option<String> {
    let pid = format!("pid {}(", std::process::id());
    assertions()
        .lines()
        .find(|l| l.contains(&pid) && l.contains(kind))
        .map(|l| l.trim().to_string())
}

#[test]
fn the_assertion_really_lands_in_the_system_and_really_goes_away() {
    let k = gateway::awake::Keeper::default();
    if k.set(true).is_err() {
        // 无头/受限环境下开不了。这个测试要验的是"开了之后系统认账"，
        // 不是平台能力，开不了就没什么可验的。
        return;
    }

    let display = mine("PreventUserIdleDisplaySleep").expect("显示休眠的断言没进系统");
    let idle = mine("PreventUserIdleSystemSleep").expect("闲置休眠的断言没进系统");

    // 名字必须显示得出来。带中文的 reason 会让这里变成 `named: ""` ——
    // 断言是生效的，但 pmset 里查不出是谁，排查时等于没起名字。
    assert!(
        display.contains("Suanli"),
        "断言名字在 pmset 里显示不出来，多半是 REASON 里混进了非 ASCII：{display}"
    );
    assert!(idle.contains("Suanli"), "{idle}");

    k.set(false).unwrap();
    assert_eq!(
        mine("PreventUserIdleDisplaySleep"),
        None,
        "关掉之后断言还在"
    );
    assert_eq!(mine("PreventUserIdleSystemSleep"), None, "关掉之后断言还在");
}
