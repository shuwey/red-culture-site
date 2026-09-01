#!/usr/bin/env node
/* ============================================================
   sync-shared.js — 敏感词库单一来源同步
   把 cloudfunctions/_shared/sensitive-words.js 复制到
   cloudfunctions/ai-chat/lib/sensitive-words.js 与
   cloudfunctions/quiz-rank/lib/sensitive-words.js。
   云函数按各自目录单独上传，_shared 不会进包，故必须用副本同步。
   改敏感词只改 _shared，部署前跑一次本脚本即可。
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const SRC = path.join(root, "cloudfunctions", "_shared", "sensitive-words.js");
const TARGETS = [
  path.join(root, "cloudfunctions", "ai-chat", "lib", "sensitive-words.js"),
  path.join(root, "cloudfunctions", "quiz-rank", "lib", "sensitive-words.js"),
];

if (!fs.existsSync(SRC)) {
  console.error("✖ 找不到单一真源:", SRC);
  process.exit(1);
}

const content = fs.readFileSync(SRC, "utf8");

let ok = true;
for (const dest of TARGETS) {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const prev = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : "";
  if (prev === content) {
    console.log("✓ 已一致（无需覆盖）:", path.relative(root, dest));
  } else {
    fs.writeFileSync(dest, content, "utf8");
    console.log("↑ 已同步:", path.relative(root, dest));
  }
}

// 二次校验：两个副本与真源逐字节一致
for (const dest of TARGETS) {
  const c = fs.readFileSync(dest, "utf8");
  if (c !== content) {
    console.error("✖ 同步后不一致:", path.relative(root, dest));
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log("✔ 敏感词库单一来源同步完成：_shared → ai-chat/lib + quiz-rank/lib");
