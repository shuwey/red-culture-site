/* ============================================================
   红色文化传播网 · CloudBase 云函数 ai-chat
   职责：参数校验 → 敏感词拦截 → 提示词组装 → 大模型调用
        → 输出侧安全扫描 → 接地校验(grounding) → 来源提取 → 审计留痕
   安全：密钥仅来自环境变量；前端零密钥；敏感词/未接地命中直接拒答（不消耗模型调用）
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

/* 合规 / 兜底话术 */
const SENSITIVE_MSG = "该内容暂未收录，建议浏览本站的英雄人物、红色地点与历史事件栏目。";
const GROUNDING_MSG = "该问题暂未从本站史料中检索到确切依据，建议浏览本站的英雄人物、红色地点与历史事件栏目。";

/* CloudBase 数据库（用于审计日志，云端函数以管理员身份写入，不受集合安全规则限制） */
let _app = null;
function getApp() {
  if (!_app) {
    const cloudbase = require("@cloudbase/node-sdk");
    _app = cloudbase.init({ env: process.env.TCB_ENV || "cloud1-d0g0aq0bl2cfbcbdf" });
  }
  return _app;
}

/* 审计日志：每次问答留痕，best-effort，失败不影响主流程 */
async function auditLog(rec) {
  try {
    const db = getApp().database();
    await db.collection("ai_logs").add(rec);
  } catch (e) {
    /* 记录失败仅静默忽略，绝不阻塞回答 */
  }
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
      temperature: 0.2,
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

/* 从文本中抽取第一个 {...} JSON 块（兼容模型在 JSON 前后附带说明文字的情况） */
function extractFirstJson(text) {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) return text.slice(s, e + 1);
  return null;
}

/* 归一化 grounded 字段 */
function normalizeGrounded(g) {
  if (typeof g === "string") return /^(true|是)$/i.test(g.trim());
  return g !== false;
}

/* 解析模型输出：期望 JSON {answer, grounded}；兼容代码围栏/前后缀/纯文本，解析失败则整体作为 answer */
function parseModel(raw) {
  let text = String(raw || "").trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const candidates = [text, extractFirstJson(text)].filter(Boolean);
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      if (obj && typeof obj.answer === "string") {
        return { answer: String(obj.answer).trim(), grounded: normalizeGrounded(obj.grounded) };
      }
    } catch (e) {
      /* 尝试下一个候选 */
    }
  }
  return { answer: String(raw || "").trim(), grounded: true };
}

/* 词面接地校验（P1 放宽）：
   旧逻辑——回答出现史料里没有的公元年份即判未接地，过于严格，常误伤
   「广为人知但语料未收录」的正确年份（如 1921 建党）。
   新逻辑——仅当回答「同时包含史料内年份 + 史料外年份」时才视为可能冲突而拒，
   即只拦「与史料已有日期相矛盾」的情况；单纯史料外的年份（如常识性年份）放行。
   真正的「不得编造」仍由系统提示词 + 模型 grounded 自报 + 输出侧敏感词扫描兜底。 */
function lexicalUngrounded(answer, contexts) {
  const ctxText = (contexts || [])
    .map((c) => String(c.text || "") + " " + String(c.title || ""))
    .join(" ");
  const ctxYears = new Set(ctxText.match(/\b(1[89]\d\d|20\d\d)\b/g) || []);
  if (ctxYears.size === 0) return false; // 史料本身无年份 → 不卡
  const ansYears = answer.match(/\b(1[89]\d\d|20\d\d)\b/g) || [];
  const ansSet = new Set(ansYears);
  let hasInside = false;
  let hasOutside = false;
  ansSet.forEach((y) => {
    if (ctxYears.has(y)) hasInside = true;
    else hasOutside = true;
  });
  return hasInside && hasOutside; // 仅冲突才拒，单纯史料外年份放行
}

/* 从回答中提取来源：模型若把 url 写进回答则取命中项；
   否则兜底返回最相关的一条，保证成功回答始终有可核查来源（审计遗留③） */
function extractSources(answer, contexts) {
  if (!contexts || !contexts.length) return [];
  const matched = contexts.filter((c) => c.url && answer.indexOf(c.url) !== -1);
  if (matched.length) {
    return matched.map((c) => ({ title: c.title || "", url: c.url }));
  }
  const top = contexts[0];
  return top && top.url ? [{ title: top.title || "", url: top.url }] : [];
}

/* 入口 */
exports.main = async (event, context) => {
  const question = String((event && event.question) || "").trim();
  const history = Array.isArray(event && event.history) ? event.history.slice(-8) : [];
  // P1：检索上下文上限 3 → 6，让模型看到更宽史料面
  const contexts = Array.isArray(event && event.contexts) ? event.contexts.slice(0, 6) : [];
  const titles = contexts.map((c) => c.title || "");

  let result;
  const log = {
    question: question,
    contexts: titles,
    answer: null,
    status: "",
    sensitive: false,
    grounded: true,
    code: null,
  };

  // 1) 参数校验（问题 1–500 字）
  if (!question) {
    result = envelope(false, null, "INVALID_PARAM", "请输入您想了解的问题。");
    log.status = "invalid";
    log.code = "INVALID_PARAM";
  } else if (question.length > 500) {
    result = envelope(false, null, "INVALID_PARAM", "问题过长，请控制在 500 字以内。");
    log.status = "invalid";
    log.code = "INVALID_PARAM";
  }
  // 2) 输入侧敏感词拦截（命中直接拒答，不调用模型）
  else if (scanSensitive(question)) {
    result = envelope(false, null, "SENSITIVE", SENSITIVE_MSG);
    log.status = "sensitive_in";
    log.sensitive = true;
  }
  // 3) 无史料上下文 → 未收录兜底
  else if (!contexts.length) {
    result = envelope(false, null, "NO_CONTEXT", SENSITIVE_MSG);
    log.status = "no_context";
    log.code = "NO_CONTEXT";
  }
  // 4) 正常链路：调模型 → 输出侧扫描 → 接地校验 → 来源
  else {
    const historyMsgs = history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .map((m) => ({ role: m.role, content: String(m.content) }));
    const messages = [{ role: "system", content: SYSTEM_PROMPT }]
      .concat(historyMsgs)
      .concat([{ role: "user", content: buildUserContent(contexts, question) }]);

    try {
      const raw = await callLLM(messages);
      const parsed = parseModel(raw);
      const ungrounded = parsed.grounded === false || lexicalUngrounded(parsed.answer, contexts);

      if (ungrounded) {
        // 5.1) 接地校验未通过：不下发模型回答，转合规引导语
        result = envelope(false, null, "NO_GROUNDED", GROUNDING_MSG);
        log.status = "grounding";
        log.grounded = false;
        log.answer = parsed.answer; // 仅留痕审计，不返回用户
      } else if (scanSensitive(parsed.answer)) {
        // 5.2) 输出侧安全扫描：模型回答同样过审，命中则不返回
        result = envelope(false, null, "SENSITIVE", SENSITIVE_MSG);
        log.status = "sensitive_out";
        log.sensitive = true;
        log.answer = parsed.answer;
      } else {
        const sources = extractSources(parsed.answer, contexts);
        result = envelope(true, { answer: parsed.answer, sources: sources }, null, null);
        // 模型基于史料无法作答而返回合规引导语时，记为 refusal 而非 ok，便于审计追溯
        log.status = parsed.answer.indexOf("暂未收录") !== -1 ? "refusal" : "ok";
        log.answer = parsed.answer;
      }
    } catch (e) {
      const code = e && e.message === "TIMEOUT" ? "TIMEOUT" : "UPSTREAM_ERROR";
      result = envelope(false, null, code, "助手开小差了，请稍后再试。");
      log.status = "error";
      log.code = code;
    }
  }

  // 6) 审计留痕（best-effort，绝不阻塞用户回答）
  log.createdAt = new Date();
  await auditLog(log);

  return result;
};

/* 导出测试钩子（仅本地单测用，部署无影响） */
module.exports._test = { parseModel, lexicalUngrounded, extractSources, envelope };
