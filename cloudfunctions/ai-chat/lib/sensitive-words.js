/* ============================================================
   红色文化传播网 · ai-chat 云函数：敏感词表与匹配（P0 安全内置）
   仅服务端使用，命中直接拒答（不调用大模型）。
   ============================================================ */
"use strict";

const SENSITIVE_WORDS = [
  // 涉政攻击 / 煽动分裂
  "反动", "颠覆国家", "分裂国家", "台独", "港独", "藏独", "疆独", "法轮", "邪教",
  // 色情 / 暴力 / 赌博 / 毒品
  "色情", "裸聊", "卖淫", "淫秽", "赌博", "博彩", "私彩", "毒品", "冰毒", "摇头丸",
  // 诈骗 / 违禁交易
  "代办文凭", "代开发票", "招嫖", "办证",
  // 自伤 / 攻击性诱导（不回答，引导浏览栏目）
  "怎么骂", "去死", "自杀", "自残", "杀人",
];

/**
 * 扫描文本是否命中敏感词（大小写不敏感）
 * @param {string} text
 * @returns {boolean}
 */
function scanSensitive(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  for (let i = 0; i < SENSITIVE_WORDS.length; i++) {
    if (t.indexOf(SENSITIVE_WORDS[i].toLowerCase()) !== -1) return true;
  }
  return false;
}

module.exports = { SENSITIVE_WORDS, scanSensitive };
