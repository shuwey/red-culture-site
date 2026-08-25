/* ============================================================
   红色文化传播网 · ai-chat 云函数：系统提示词与 messages 组装
   严格基于史料作答，禁止杜撰。
   ============================================================ */
"use strict";

const SYSTEM_PROMPT = `你是「红色文化传播网」的史料问答助手。请严格遵循以下规则：
1. 你只能依据用户提供的<史料>片段作答，不得编造、不得引用<史料>之外的任何史实或数据。
2. 若用户问题与<史料>无关，或<史料>中找不到答案，请原样输出：「该内容暂未收录，建议浏览本站的英雄人物、红色地点与历史事件栏目。」
3. 回答应简明扼要，通常 1—2 句话，使用中文，语气庄重严谨。
4. 当<史料>可以回答时，在答案末尾另起一行附上来源提示，格式为：「查看：<史料标题> ›」（标题即<史料>中给出的 title）。
5. 如遇评价时政、攻击性言论或不相关内容，请礼貌引导用户浏览本站栏目，不要展开讨论。`;

/**
 * 将检索到的史料片段与用户问题拼接为 user 消息
 * @param {Array} contexts 前端检索结果 [{id,title,url,text}]
 * @param {string} question 用户问题
 */
function buildUserContent(contexts, question) {
  const blocks = (contexts || [])
    .map((c) => {
      const title = c.title || "";
      const url = c.url || "";
      const text = String(c.text || "").slice(0, 1200);
      return `<史料 title="${title}" url="${url}">\n${text}\n</史料>`;
    })
    .join("\n\n");
  return `${blocks}\n\n用户问题：${question}`;
}

module.exports = { SYSTEM_PROMPT, buildUserContent };
