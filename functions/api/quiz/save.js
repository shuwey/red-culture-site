/* ============================================================
   红色文化传播网 · POST /api/quiz/save
   - 需登录
   - Body: { score, total, durationSec, book }
   - 写入 quiz_scores
   - 昵称脱敏（手机号/邮箱/敏感词置空，与 CloudBase 时期一致）
   ============================================================ */
import { ok, fail, jsonResponse, preflight, readJson, CODES } from "../_shared/envelope.js";
import { requireAuth, nanoid } from "../_shared/auth.js";
import { scanSensitive } from "../_shared/sensitive.js";

const NICK_BAD_WORDS = [
  "反动", "颠覆国家", "分裂国家", "煽动分裂", "台独", "港独", "藏独", "疆独",
  "法轮", "邪教", "历史虚无主义", "抹黑党史", "歪曲历史", "诋毁英雄",
  "污蔑烈士", "色情", "裸聊", "卖淫", "淫秽", "赌博", "毒品", "代办文凭",
  "代开发票", "招嫖", "办证", "出售个人信息", "代考", "去死", "自杀", "自残",
  "杀人", "报复社会",
];

function isContactLike(nick) {
  return /^1[3-9]\d{9}$/.test(nick) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nick);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  const a = await requireAuth(request, env);
  if (!a.ok) return jsonResponse(env, 401, a.response);

  const r = await readJson(request);
  if (!r.ok) return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, r.error));
  const score = Number(r.data && r.data.score) || 0;
  const total = Number(r.data && r.data.total) || 0;
  const durationSec = Number(r.data && r.data.durationSec) || 0;
  const book = String((r.data && r.data.book) || "").trim().slice(0, 50);

  if (total <= 0 || score < 0 || score > total) {
    return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, "成绩参数异常"));
  }
  if (durationSec < 0 || durationSec > 36000) {
    return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, "用时参数异常"));
  }

  // 昵称脱敏
  let nick = String(a.user.nickname || "").trim();
  const lower = nick.toLowerCase();
  const hitBad = NICK_BAD_WORDS.some((w) => lower.indexOf(w.toLowerCase()) !== -1) || (await scanSensitive(nick, env.DB)).hit;
  if (isContactLike(nick) || hitBad) nick = "";

  const id = nanoid(12);
  const now = Date.now();
  try {
    await env.DB.prepare(
      "INSERT INTO quiz_scores (id, user_id, nickname, score, total, duration_sec, book, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, a.user.id, nick, score, total, durationSec, book, now).run();
    return jsonResponse(env, 200, ok({ id }));
  } catch (e) {
    return jsonResponse(env, 500, fail(CODES.SAVE_ERROR, String((e && e.message) || e)));
  }
}

export async function onRequestOptions(context) { return preflight(context.env); }
