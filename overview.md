# 湘江 / 腊子口 / 会宁 AI 图整改

**提交**：`43051b0` · **部署**：224 文件全 200 · **日期**：2026-09-02

## 结果

| 地点 | 处理 | 现状 |
|---|---|---|
| **会宁** | 不动 | 已是 Wikimedia `会师塔.jpg`（CC BY-SA 3.0 DarthVachel）真实照 |
| **湘江** | 换真实图 | Wikimedia `Xiangjiang Campaign Memorial Hall, Quanzhou`，CC BY-SA 4.0，N509FZ |
| **腊子口** | 不放图 | Commons 搜 Lazikou/腊子口/腊子口战役 三个查询均无真实图，按"实在没有合适的就不要图了"整块删除 figure |

## 改动清单

- ➕ `assets/images/xiangjiang-memorial.jpg`（165 KB，960×640，CC BY-SA 4.0 N509FZ）
- ✏️ `place-xiangjiang.html`：figure 改用真实图 + 完整署名 figcaption
- ✏️ `place-lazikou.html`：删除整个 `<figure>`，页面无图
- ✏️ `script.js`：`AI_IMAGE_FILES` 移除 `xiangjiang.png` / `lazikou.png`
- ➖ `git rm assets/images/xiangjiang.png`、`assets/images/lazikou.png`
- 🧹 顺手 strip `event-changzheng.html` 被可视化编辑器复发注入的 564 个 data-* 噪音属性

## 合规结论

- 全站 AI 白名单从 7 张压到 **4 张**（card-heroes / card-events / long-march / wuqi），全站"部分配图 AI"footer 文案仍成立。
- 腊子口与瓦窑堡同处理（"宁缺毋滥"），日后有合规真实图可补建。

## 线上核验

- `place-xiangjiang.html` ✓ 新图 + N509FZ + CC BY-SA 4.0
- `place-lazikou.html` ✓ 无 figure / 无 AI
- `place-huining.html` ✓ DarthVachel + CC BY-SA 3.0
- `assets/images/xiangjiang-memorial.jpg` ✓ 200
