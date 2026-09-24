import { describe, expect, it } from "vitest";

import { buildTableDocument, newTablePath } from "./table-document.js";

describe("表格文档", () => {
  it("没给列：一列空表", () => {
    const d = buildTableDocument({});
    expect(d.columns).toMatchObject([{ title: "Text", type: "text", visible: true, width: 200 }]);
    expect(d.rows).toEqual([]);
  });

  it("单元格按下标挂到列 id；数组只进附件列；空值跳过；筛选按下标换成列 id", () => {
    const d = buildTableDocument({
      columns: [{ title: "名字" }, { title: "数量", type: "number", width: 120 }, { title: "图", type: "attachment", visible: false }],
      rows: [{ cells: ["猫", 3, ["a.png"]] }, { cells: [["x"], null] }],
      filter: { match: "all", conditions: [{ columnIndex: 1, op: "gt", value: 1 }, { columnIndex: 9, op: "empty" }] },
      rowHeight: "tall",
    });
    const [name, qty, pic] = d.columns;
    expect(qty).toMatchObject({ type: "number", width: 120 });
    expect(pic).toMatchObject({ visible: false });
    expect(name).not.toHaveProperty("visible");
    expect(d.rows[0]!.cells).toEqual({ [name!.id]: "猫", [qty!.id]: 3, [pic!.id]: ["a.png"] });
    expect(d.rows[1]!.cells).toEqual({});
    expect(d.filter).toMatchObject({ match: "all", conditions: [{ columnId: qty!.id, op: "gt", value: 1 }] });
    expect(d.rowHeight).toBe("tall");
  });

  it("路径落在文件接口放行的格式里", () => {
    expect(newTablePath()).toMatch(/^\.hilo\/tables\/[A-Za-z0-9_-]+\.htable$/);
  });
});
