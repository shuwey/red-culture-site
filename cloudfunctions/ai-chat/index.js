/* ============================================================
   红色文化传播网 · CloudBase 云函数 ai-chat
   职责：参数校验 → 敏感词拦截 → 提示词组装 → 大模型调用 → 来源提取
   安全：密钥仅来自环境变量；前端零密钥；敏感词命中直接拒答（不消耗模型调用）
   部署：cloudfunctions/ai-chat（package.json 已声明依赖）

   入口约定（CloudBase 云函数）：
     exports.main = async (event, context) => envelope
     - event 即 callFunction({ data }) 中的 data 对象：
       { question, history, contexts }
     - 返回值由 CloudBase 序列化后作为 res.result 回传前端
   ============================================================ */
"use strict";

const https = require("https");
const { SYSTEM_PROMPT, buildUserContent } = require("./lib/prompt");
const { scanSensitive } = require("./lib/sensitive-words");

/* 统一信封 */
function envelope(success, data, code, message) {
  return {
    success: success,
    data: data || null,
    error: success ? null : { code: code, message: message },
  };
}

/* 调用 OpenAI 兼容接口（Node 原生 https，零额外依赖） */
function callLLM(messages) {
  return new Promise((resolve, reject) => {
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
    if (!apiKey) {
      reject(new Error("NO_KEY"));
      return;
    }
    const payload = JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 600,
      top_p: 0.9,
    });
    let url;
    try {
      url = new URL(base + "/chat/completions");
    } catch (e) {
      reject(new Error("BAD_URL"));
      return;
    }
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(buf);
          if (json.error) {
            reject(new Error(json.error.message || "UPSTREAM_ERROR"));
            return;
          }
          const content =
            json.choices &&
            json.choices[0] &&
            json.choices[0].message &&
            json.choices[0].message.content;
          if (!content) {
            reject(new Error("EMPTY"));
            return;
          }
          resolve(content);
        } catch (e) {
          reject(new Error("PARSE_ERROR"));
        }
      });
    });
    req.on("error", (e) => reject(e));
    req.setTimeout(15000, () => {
      req.destroy(new Error("TIMEOUT"));
    });
    req.write(payload);
    req.end();
  });
}

/* 从回答中提取命中的语料 url 作为来源 */
function extractSources(answer, contexts) {
  if (!contexts || !contexts.length) return [];
  return contexts
    .filter((c) => c.url && answer.indexOf(c.url) !== -1)
    .map((c) => ({ title: c.title || "", url: c.url }));
}

/* 入口 */
exports.main = async (event, context) => {
  const question = String((event && event.question) || "").trim();
  const history = Array.isArray(event && event.history) ? event.history.slice(-8) : [];
  const contexts = Array.isArray(event && event.contexts) ? event.contexts.slice(0, 3) : [];

  // 1) 参数校验（问题 1–500 字）
  if (!question) {
    return envelope(false, null, "INVALID_PARAM", "请输入您想了解的问题。");
  }
  if (question.length > 500) {
    return envelope(false, null, "INVALID_PARAM", "问题过长，请控制在 500 字以内。");
  }

  // 2) 敏感词拦截（P0 内置，命中直接拒答，不调用模型）
  if (scanSensitive(question)) {
    return envelope(
      false,
      null,
      "SENSITIVE",
      "该内容暂未收录，建议浏览本站的英雄人物、红色地点与历史事件栏目。"
    );
  }

  // 3) 无史料上下文 → 未收录兜底
  if (!contexts || contexts.length === 0) {
    return envelope(
      false,
      null,
      "NO_CONTEXT",
      "该内容暂未收录，建议浏览本站的英雄人物、红色地点与历史事件栏目。"
    );
  }

  // 4) 组装 messages
  const historyMsgs = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content) }));
  const messages = [{ role: "system", content: SYSTEM_PROMPT }]
    .concat(historyMsgs)
    .concat([{ role: "user", content: buildUserContent(contexts, question) }]);

  // 5) 调用模型
  try {
    const answer = await callLLM(messages);
    // 5.1) 输出侧安全扫描：模型回答同样过审，命中敏感词则不放回，转合规引导语
    if (scanSensitive(answer)) {
      return envelope(
        false,
        null,
        "SENSITIVE",
        "该内容暂未收录，建议浏览本站的英雄人物、红色地点与历史事件栏目。"
      );
    }
    const sources = extractSources(answer, contexts);
    return envelope(true, { answer: answer.trim(), sources: sources }, null, null);
  } catch (e) {
    const code = e && e.message === "TIMEOUT" ? "TIMEOUT" : "UPSTREAM_ERROR";
    return envelope(false, null, code, "助手开小差了，请稍后再试。");
  }
};
