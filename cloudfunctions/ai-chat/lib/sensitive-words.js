/* ============================================================
   红色文化传播网 · ai-chat 云函数：敏感词表与匹配（P0 安全内置）
   仅服务端使用，命中直接拒答（不调用大模型 / 不放回模型回答）。
   内置基线词库 + 环境变量热更新（SENSITIVE_EXTRA，JSON 数组或逗号分隔），
   运营可在不改代码、不重部署的情况下扩充词库。
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

/**
 * 合并内置词库与环境变量 SENSITIVE_EXTRA（支持 JSON 数组或逗号分隔，自动去重/去空）。
 * @returns {string[]}
 */
function resolveWordList() {
  let extra = [];
  const raw = process.env.SENSITIVE_EXTRA;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) extra = parsed.map(String);
    } catch (e) {
      // 非 JSON 则按逗号分隔
      extra = String(raw)
        .split(",")
        .map((s) => s.trim());
    }
  }
  const set = new Set();
  BASE_SENSITIVE_WORDS.concat(extra).forEach((w) => {
    const t = String(w || "").trim().toLowerCase();
    if (t) set.add(t);
  });
  return Array.from(set);
}

/* 懒加载词库（首次调用时解析，支持运行时环境变量变化） */
let _wordsCache = null;
function wordList() {
  if (!_wordsCache) _wordsCache = resolveWordList();
  return _wordsCache;
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

module.exports = { BASE_SENSITIVE_WORDS, scanSensitive, resolveWordList };
