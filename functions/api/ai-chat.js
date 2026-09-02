/* ============================================================
   红色文化传播网 · POST /api/ai-chat
   端口 cloudfunctions/ai-chat 到 Cloudflare Workers
   - 验证登录（NO_AUTH 直接拒）
   - 输入侧敏感词拦截
   - 无史料上下文 → NO_CONTEXT
   - 调 DeepSeek（密钥从 env）
   - 输出侧敏感词 / 接地校验 / 来源提取
   - 审计日志 best-effort
   ============================================================ */
"use strict";

import { ok, fail, jsonResponse, preflight, readJson, CODES } from "../_shared/envelope.js";
import { requireAuth, nanoid } from "../_shared/auth.js";
import { scanSensitive } from "../_shared/sensitive.js";

const SYSTEM_PROMPT = `你是"红色历史问答助手"，专为中学红色文化教学服务。
你的回答必须严格基于下方提供的"史料上下文"（contexts 数组），不得编造任何具体事实、人物、年代、地点、事件。
回答要求：
1) 简短、准确、面向中学生（初中/高中水平）。
2) 必须给出史料出处，格式：<人物/事件/地点>（出自<书名>）。
3) 若上下文无足够信息，明确回答"该问题暂未从本站史料中检索到确切依据，建议浏览本站的英雄人物、红色地点与历史事件栏目"，不要编造。
4) 不输出任何与本主题无关的内容（政治敏感、色情、暴力、辱骂等）。
请以 JSON 格式回答：{"answer":"你的回答文本","grounded":true|false}。`;

/* 统一信封 */
function envelope(success, data, code, message) {
  return { success, data: data || null, error: success ? null : { code, message } };
}

const SENSITIVE_MSG = "该内容暂未收录，建议浏览本站的英雄人物、红色地点与历史事件栏目。";
const GROUNDING_MSG = "该问题暂未从本站史料中检索到确切依据，建议浏览本站的英雄人物、红色地点与历史事件栏目。";

/* 调 DeepSeek（OpenAI 兼容） */
async function callLLM(messages, env) {
  const base = (env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  const apiKey = env.DEEPSEEK_API_KEY;
  const model = env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!apiKey) throw new Error("NO_KEY");
  const resp = await fetch(base + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 600,
      top_p: 0.9,
    }),
    // 15s 软超时（CF Workers 全局上限 30s）
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error("UPSTREAM_ERROR: " + resp.status + " " + errText.slice(0, 200));
  }
  const json = await resp.json();
  const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!content) throw new Error("EMPTY");
  return content;
}

function extractFirstJson(text) {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) return text.slice(s, e + 1);
  return null;
}
function normalizeGrounded(g) {
  if (typeof g === "string") return /^(true|是)$/i.test(g.trim());
  return g !== false;
}
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
    } catch (e) { /* 试下一个 */ }
  }
  return { answer: String(raw || "").trim(), grounded: true };
}

/* 词面接地校验（与云函数一致：仅"史料内+史料外"年份冲突才拒） */
function lexicalUngrounded(answer, contexts) {
  const ctxText = (contexts || []).map((c) => String(c.text || "") + " " + String(c.title || "")).join(" ");
  const ctxYears = new Set(ctxText.match(/\b(1[89]\d\d|20\d\d)\b/g) || []);
  if (ctxYears.size === 0) return false;
  const ansYears = answer.match(/\b(1[89]\d\d|20\d\d)\b/g) || [];
  const ansSet = new Set(ansYears);
  let hasInside = false, hasOutside = false;
  ansSet.forEach((y) => { if (ctxYears.has(y)) hasInside = true; else hasOutside = true; });
  return hasInside && hasOutside;
}

function extractSources(answer, contexts) {
  if (!contexts || !contexts.length) return [];
  const srcTitle = (c) => (c.book ? c.book + " · " + (c.title || "") : c.title || "");
  const matched = contexts.filter((c) => c.url && answer.indexOf(c.url) !== -1);
  if (matched.length) return matched.map((c) => ({ title: srcTitle(c), url: c.url }));
  const top = contexts[0];
  return top && top.url ? [{ title: srcTitle(top), url: top.url }] : [];
}

function ensureBookMentioned(answer, contexts) {
  if (!contexts || !contexts.length) return answer;
  const books = contexts.map((c) => c.book).filter((b) => b && typeof b === "string" && b.trim());
  if (!books.length) return answer;
  const book = books[0].trim();
  if (answer.indexOf(book) !== -1) return answer;
  return "（出自" + book + "）" + answer;
}

function buildUserContent(contexts, question) {
  const lines = (contexts || []).map((c, i) =>
    `[#${i + 1}] ${c.title || ""}${c.book ? "（" + c.book + "）" : ""}\n${c.text || ""}`
  );
  return "【史料上下文】\n" + lines.join("\n\n") + "\n\n【问题】\n" + question;
}

async function auditLog(db, rec) {
  try {
    await db.prepare(
      "INSERT INTO ai_logs (id, user_id, question, contexts_json, answer, status, sensitive, grounded, code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      nanoid(12),
      rec.user_id || null,
      rec.question || "",
      rec.contexts ? JSON.stringify(rec.contexts) : null,
      rec.answer || null,
      rec.status || "ok",
      rec.sensitive ? 1 : 0,
      rec.grounded === false ? 0 : 1,
      rec.code || null,
      Date.now()
    ).run();
  } catch (e) { /* 失败不阻塞 */ }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB || !env.DEEPSEEK_API_KEY) {
    return jsonResponse(env, 500, fail("SERVER_NOT_READY", "AI 服务尚未配置完成"));
  }

  const a = await requireAuth(request, env);
  if (!a.ok) return jsonResponse(env, 401, a.response);

  const r = await readJson(request);
  if (!r.ok) return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, r.error));
  const question = String((r.data && r.data.question) || "").trim();
  const history = Array.isArray(r.data && r.data.history) ? r.data.history.slice(-8) : [];
  const contexts = Array.isArray(r.data && r.data.contexts) ? r.data.contexts.slice(0, 6) : [];
  const titles = contexts.map((c) => c.title || "");

  const log = {
    user_id: a.user.id,
    question, contexts: titles, answer: null, status: "",
    sensitive: false, grounded: true, code: null,
  };

  let result;
  if (!question) {
    result = envelope(false, null, CODES.INVALID_PARAM, "请输入您想了解的问题。");
    log.status = "invalid"; log.code = CODES.INVALID_PARAM;
  } else if (question.length > 500) {
    result = envelope(false, null, CODES.INVALID_PARAM, "问题过长，请控制在 500 字以内。");
    log.status = "invalid"; log.code = CODES.INVALID_PARAM;
  } else if (await scanSensitive(question, env.DB).then((r) => r.hit)) {
    result = envelope(false, null, CODES.SENSITIVE, SENSITIVE_MSG);
    log.status = "sensitive_in"; log.sensitive = true;
  } else if (!contexts.length) {
    result = envelope(false, null, CODES.NO_CONTEXT, SENSITIVE_MSG);
    log.status = "no_context"; log.code = CODES.NO_CONTEXT;
  } else {
    const historyMsgs = history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .map((m) => ({ role: m.role, content: String(m.content) }));
    const messages = [{ role: "system", content: SYSTEM_PROMPT }]
      .concat(historyMsgs)
      .concat([{ role: "user", content: buildUserContent(contexts, question) }]);

    try {
      const raw = await callLLM(messages, env);
      const parsed = parseModel(raw);
      const ungrounded = parsed.grounded === false || lexicalUngrounded(parsed.answer, contexts);

      if (ungrounded) {
        result = envelope(false, null, CODES.NO_GROUNDED, GROUNDING_MSG);
        log.status = "grounding"; log.grounded = false; log.answer = parsed.answer;
      } else if ((await scanSensitive(parsed.answer, env.DB)).hit) {
        result = envelope(false, null, CODES.SENSITIVE, SENSITIVE_MSG);
        log.status = "sensitive_out"; log.sensitive = true; log.answer = parsed.answer;
      } else {
        const finalAnswer = ensureBookMentioned(parsed.answer, contexts);
        const sources = extractSources(finalAnswer, contexts);
        result = envelope(true, { answer: finalAnswer, sources }, null, null);
        log.status = finalAnswer.indexOf("暂未收录") !== -1 ? "refusal" : "ok";
        log.answer = finalAnswer;
      }
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      const code = msg.indexOf("TIMEOUT") !== -1 ? CODES.TIMEOUT : (msg === "NO_KEY" ? "NO_KEY" : CODES.UPSTREAM_ERROR);
      const userMsg = code === "NO_KEY" ? "AI 服务尚未配置密钥" : "助手开小差了，请稍后再试。";
      result = envelope(false, null, code, userMsg);
      log.status = "error"; log.code = code;
    }
  }

  log.createdAt = new Date();
  await auditLog(env.DB, log);

  return jsonResponse(env, 200, result);
}

export async function onRequestOptions(context) { return preflight(context.env); }
