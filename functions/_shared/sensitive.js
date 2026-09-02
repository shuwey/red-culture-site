/* ============================================================
   红色文化传播网 · 敏感词扫描（昵称/AI 输入输出共享）
   - D1 优先（D1 命中失败回退硬编码 BASE 列表）
   - 注册/登录/AI 输入输出都会过这层
   - 命中返回 true，调用方决定兜底话术
   ============================================================ */
"use strict";

/* 硬编码 BASE 列表（D1 不可用时兜底；与 schema/001_initial.sql 初始化值一致） */
const BASE_WORDS = [
  "反动", "颠覆国家", "分裂国家", "煽动分裂", "台独", "港独", "藏独", "疆独",
  "法轮", "邪教", "暴乱", "历史虚无主义", "抹黑党史", "歪曲历史", "诋毁英雄",
  "污蔑烈士", "色情", "裸聊", "卖淫", "淫秽", "赌博", "毒品", "冰毒", "摇头丸", "大麻",
  "代办文凭", "代开发票", "招嫖", "办证", "出售个人信息", "代考",
  "怎么骂", "去死", "自杀", "自残", "杀人", "报复社会",
];

/**
 * 扫描敏感词
 * @param {string} text - 待扫描文本
 * @param {D1Database} db - 可选，D1 句柄；为 null 时只检硬编码列表
 * @returns {Promise<{ hit: boolean, word?: string, source?: 'db'|'base' }>}
 */
export async function scanSensitive(text, db) {
  if (!text || typeof text !== "string") return { hit: false };
  const t = text.toLowerCase();

  // 1) 硬编码 BASE（命中立即返回）
  for (const w of BASE_WORDS) {
    if (t.indexOf(w.toLowerCase()) !== -1) {
      return { hit: true, word: w, source: "base" };
    }
  }

  // 2) D1 active 词库
  if (db) {
    try {
      const rows = await db
        .prepare("SELECT word FROM sensitive_words WHERE status = 'active' LIMIT 500")
        .all();
      if (rows && rows.results) {
        for (const r of rows.results) {
          const w = String(r.word || "").toLowerCase();
          if (w && t.indexOf(w) !== -1) {
            return { hit: true, word: r.word, source: "db" };
          }
        }
      }
    } catch (e) {
      // D1 失败不阻塞，继续
    }
  }

  return { hit: false };
}
