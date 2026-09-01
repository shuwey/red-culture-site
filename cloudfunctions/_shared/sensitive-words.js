/* ============================================================
   红色文化传播网 · 敏感词表与匹配（单一真源 / Single Source of Truth）
   ★ 本文件是敏感词库的唯一来源。ai-chat 与 quiz-rank 两个云函数
     通过 scripts/sync-shared.js 在部署前把本文件同步复制到各自的
     lib/sensitive-words.js。切勿直接编辑 lib/ 下的副本——改动这里即可。
   ----------------------------------------------------------------
   生效词库 = 内置 BASE 基线 + 环境变量 SENSITIVE_EXTRA（热更新）
            + 云端 sensitive_words 集合中 status=active 的词（运营后台维护、需审核）
   运行时：模块加载即异步预热云端词库，并每 2 分钟刷新；scanSensitive 同步命中缓存，
           保证不破坏 index.js 的同步调用链。云端读取失败/未配置时安全回退到 BASE+EXTRA。
   仅服务端使用，命中直接拒答（不调用大模型 / 不放回模型回答）。
   ============================================================ */
"use strict";

/* 内置基线词库（持续维护，覆盖政治安全 / 历史虚无主义 / 谣言 / 违法 / 自伤等） */
const BASE_SENSITIVE_WORDS = [
  // —— 涉政攻击 / 煽动分裂（含繁体变体）——
  "反动", "颠覆国家", "颠覆政权", "分裂国家", "煽动分裂",
  "台独", "臺獨", "港独", "港獨", "藏独", "疆独",
  "法轮", "法輪", "邪教", "暴乱", "颜色革命",
  // —— 历史虚无主义 / 歪曲党史国史（重点防护）——
  "历史虚无主义", "抹黑党史", "恶意抹黑", "造谣传谣", "歪曲历史", "歪曲党史",
  "诋毁英雄", "污蔑烈士", "质疑长征", "否认抗战", "为汉奸翻案", "为反动派翻案",
  // —— 色情 / 暴力 / 赌博 / 毒品 ——
  "色情", "裸聊", "卖淫", "淫秽", "赌博", "博彩", "私彩",
  "毒品", "冰毒", "摇头丸", "大麻",
  // —— 诈骗 / 违禁交易 ——
  "代办文凭", "代开发票", "招嫖", "办证", "出售个人信息", "代考",
  // —— 自伤 / 攻击性诱导（不回答，引导浏览栏目）——
  "怎么骂", "去死", "自杀", "自残", "杀人", "报复社会",
];

/* ---------- 云端词库（sensitive_words 集合 status=active） ---------- */
let _app = null;
function getApp() {
  if (!_app) {
    const cloudbase = require("@cloudbase/node-sdk");
    _app = cloudbase.init({ env: process.env.TCB_ENV || "cloud1-d0g0aq0bl2cfbcbdf" });
  }
  return _app;
}

let _dbWords = []; // 当前生效的云端 active 词（原子替换）
let _loading = false;
const REFRESH_MS = 120000; // 2 分钟刷新一次

async function refreshDbWords() {
  if (_loading) return;
  _loading = true;
  try {
    const db = getApp().database();
    const res = await db
      .collection("sensitive_words")
      .where({ status: "active" })
      .limit(500)
      .get();
    const ws = ((res && res.data) || []).map((d) => d.word).filter(Boolean);
    _dbWords = ws; // 原子替换，避免读取中途出现半成品
  } catch (e) {
    /* 读取失败：保留上一次结果（首次则为空，BASE 仍生效），绝不阻塞主流程 */
  } finally {
    _loading = false;
  }
}

/* 模块加载即预热（不 await，避免阻塞初始化），并定时刷新 */
refreshDbWords();
if (typeof setInterval === "function") {
  setInterval(refreshDbWords, REFRESH_MS);
}

/* ---------- 环境变量 SENSITIVE_EXTRA 解析（热更新） ---------- */
function resolveExtra() {
  const raw = process.env.SENSITIVE_EXTRA;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch (e) {
    /* 非 JSON 则按逗号分隔 */
  }
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* 合并生效词库：BASE + EXTRA + 云端 active */
function wordList() {
  const set = new Set();
  const all = BASE_SENSITIVE_WORDS.concat(resolveExtra()).concat(_dbWords);
  all.forEach((w) => {
    const t = String(w || "").trim().toLowerCase();
    if (t) set.add(t);
  });
  return Array.from(set);
}

/**
 * 扫描文本是否命中敏感词（大小写不敏感，含繁体/简体统一小写比较）。
 * 命中返回 true。
 * @param {string} text
 * @returns {boolean}
 */
function scanSensitive(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  const words = wordList();
  for (let i = 0; i < words.length; i++) {
    if (t.indexOf(words[i]) !== -1) return true;
  }
  return false;
}

/* 供本地单测：触发热更新并取当前云端词 */
async function _refreshAndGetDb() {
  await refreshDbWords();
  return _dbWords;
}

module.exports = {
  BASE_SENSITIVE_WORDS,
  scanSensitive,
  resolveWordList: wordList,
  refreshDbWords,
  _refreshAndGetDb,
};
