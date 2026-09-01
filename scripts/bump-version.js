#!/usr/bin/env node
/* ============================================================
   bump-version.js — 统一升级某个资源的 ?v= 版本号
   用法：node scripts/bump-version.js <OLD> <NEW>
   例：  node scripts/bump-version.js 20260831d 20260901a
   只把 ?v=OLD 替换为 ?v=NEW（精确匹配，不动其它资源版本），
   并在替换后打印命中文件，便于人工在 45 页 + 红文页各验一次。
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

const OLD = process.argv[2];
const NEW = process.argv[3];
if (!OLD || !NEW) {
  console.error("用法：node scripts/bump-version.js <OLD> <NEW>");
  process.exit(1);
}
if (OLD === NEW) {
  console.error("OLD 与 NEW 相同，跳过。");
  process.exit(0);
}

const ROOT = path.resolve(__dirname, "..");
const SKIP = new Set([".git", ".workbuddy", "node_modules", "generated-images", "appeal-attachments", "cloudfunctions"]);
const EXT = new Set([".html", ".css", ".js"]);

const needle = `?v=${OLD}`;
const repl = `?v=${NEW}`;

let files = 0;
let hits = 0;
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!SKIP.has(name)) walk(p);
    } else if (EXT.has(path.extname(name)) && !name.startsWith(".")) {
      const c = fs.readFileSync(p, "utf8");
      if (c.includes(needle)) {
        fs.writeFileSync(p, c.split(needle).join(repl), "utf8");
        files++;
        const n = c.split(needle).length - 1;
        hits += n;
        console.log(`↑ ${path.relative(ROOT, p)}  (${n} 处)`);
      }
    }
  }
}
walk(ROOT);

console.log(`✔ 替换完成：${files} 个文件，${hits} 处 ?v= 由 ${OLD} → ${NEW}`);
if (files === 0) console.log("（未命中，确认 OLD 版本号是否正确）");
