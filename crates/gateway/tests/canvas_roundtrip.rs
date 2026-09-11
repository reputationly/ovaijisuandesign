#[test]
fn unknown_node_fields_survive_a_round_trip() {
    // 前端往节点上写 `meta.tagIds`、`sizes`、`isEmpty` 这些后端不解释的字段。
    // 它们靠 `#[serde(flatten)] extra` 原样带进带出 —— **这条路没测的话，
    // 哪天给 Node 加一个字段、名字和 extra 里某个撞了，那个字段就会被
    // 悄悄吃掉**，而画布照样能存能读。
    let raw = r#"{
      "version": 1, "mode": "workflow",
      "nodes": [{
        "id": "n1", "type": "image", "positions": {},
        "assetId": "a1",
        "sizes": { "workflow": { "width": 9, "height": 9 } },
        "isEmpty": false,
        "meta": { "tagIds": ["color:red"], "官方写的": 1 },
        "round": 3
      }],
      "edges": [{ "id": "e1", "source": "n1", "target": "n2", "type": "default",
                  "sourceHandle": "a", "targetHandle": "b" }],
      "canvasTags": { "version": 2, "tags": [] }
    }"#;
    let f: gateway::canvas::CanvasFile = serde_json::from_str(raw).unwrap();
    let back: serde_json::Value = serde_json::to_value(&f).unwrap();

    // 我们解释的字段
    assert_eq!(back["nodes"][0]["assetId"], "a1");
    // 我们**不**解释的字段，一个都不能丢
    for k in ["sizes", "isEmpty", "meta", "round"] {
        assert!(!back["nodes"][0][k].is_null(), "节点上的 {k} 被吃掉了");
    }
    assert_eq!(back["nodes"][0]["meta"]["tagIds"][0], "color:red");
    assert_eq!(back["nodes"][0]["meta"]["官方写的"], 1);
    for k in ["sourceHandle", "targetHandle"] {
        assert!(!back["edges"][0][k].is_null(), "边上的 {k} 被吃掉了");
    }
    // 文件顶层的未知字段（标签注册表就存在这里）
    assert_eq!(back["canvasTags"]["version"], 2);
}
