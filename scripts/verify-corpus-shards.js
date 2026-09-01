#!/usr/bin/env node
// verify-corpus-shards.js —— 2.2 检索一致性验证
// 对比「全量 corpus.json 原 retrieve」与「index+textMap 分片 retrieve」的 top6 结果是否逐条等价。
// 用法: node scripts/verify-corpus-shards.js
const path = require("path");
const ROOT = path.join(__dirname, "..");
const full = require(path.join(ROOT, "data/corpus.json"));
const indexDoc = require(path.join(ROOT, "data", "corpus-index.json"));
const textMap = require(path.join(ROOT, "data", "corpus-text.json"));

function norm(s) { return String(s == null ? "" : s).toLowerCase(); }
function bigrams(s) {
  s = norm(s).replace(/[^一-龥a-z0-9]/g, "");
  const out = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.substr(i, 2));
  return out;
}

// —— 原实现：对全量 items 打分，返回 top6 ——
function retrieveFull(question, items) {
  const q = norm(question);
  const qbg = bigrams(question);
  const scored = items
    .map(function (it) {
      const name = norm(it.name);
      const aliases = (it.aliases || []).map(norm);
      const keywords = (it.keywords || []).map(norm);
      let score = 0;
      if (name && q.indexOf(name) !== -1) score += 5;
      aliases.forEach(function (a) { if (a && q.indexOf(a) !== -1) score += 4; });
      keywords.forEach(function (k) { if (k && q.indexOf(k) !== -1) score += 3; });
      const tbg = bigrams(it.text || "").concat(bigrams(it.name || ""));
      let hit = 0;
      qbg.forEach(function (b) { if (b && tbg.indexOf(b) !== -1) hit++; });
      score += hit;
      return { it: it, score: score };
    })
    .filter(function (x) { return x.score > 0; });
  scored.sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, 6).map(function (x) {
    return { id: x.it.id, title: x.it.name, url: x.it.url, text: x.it.text || x.it.summary || "", book: x.it.book || "", type: x.it.type || "" };
  });
}

// —— 真实前端实现：index + textMap 合并还原成完整条目，复用原 retrieve 算法（零算法改动 → 逐条等价）——
// coarse/fine 分离会漏掉「仅在 text 中提到查询词」的条目，故排名前先合并还原，再用原 retrieve。
function retrieveSharded(question) {
  // 还原：name/aliases/keywords/url/type/book 取自 index，text 取自 textMap
  const fullItems = indexDoc.items.map(function (it) {
    return {
      id: it.id, type: it.type, book: it.book, name: it.name,
      aliases: it.aliases, keywords: it.keywords, url: it.url,
      text: textMap[it.id] != null ? textMap[it.id] : "",
    };
  });
  return retrieveFull(question, fullItems);
}

const QUESTIONS = [
  "《红岩》里江姐是谁",
  "李大钊 生平 就义",
  "五四运动 历史意义",
  "《红星照耀中国》斯诺 采访 毛泽东",
  "遵义会议 主要内容",
  "长征 经过 路线",
  "甫志高 叛变",
  "延安 抗日 根据地",
  "彭雪枫 事迹",
  "秋收起义 时间",
];

let allPass = true;
QUESTIONS.forEach(function (q) {
  const a = retrieveFull(q, full.items);
  const b = retrieveSharded(q);
  const aIds = a.map(function (x) { return x.id; }).join(",");
  const bIds = b.map(function (x) { return x.id; }).join(",");
  const ok = aIds === bIds;
  if (!ok) allPass = false;
  console.log((ok ? "✔" : "✗") + " [" + q + "]");
  if (!ok) {
    console.log("   全量 top6: " + aIds);
    console.log("   分片 top6: " + bIds);
  } else {
    console.log("   top1: " + a[0].id + " (" + (a[0].book || a[0].type) + ")");
  }
});
console.log(allPass ? "\n✔ 全部 10 个样例 top6 逐条等价 —— 分片检索与原实现一致" : "\n✗ 存在不一致，需调整 COARSE_N 或分片策略");
process.exit(allPass ? 0 : 1);
