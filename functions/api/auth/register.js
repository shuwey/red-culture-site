/* ============================================================
   红色文化传播网 · POST /api/auth/register
   方案4：{ nickname, turnstile_token } —— 昵称 + Turnstile，无密码
   - 校验昵称 + 敏感词 + Turnstile
   - 唯一性检查（首占者拥有昵称）
   - 创建用户 + 颁发会话 cookie
   ============================================================ */
import { ok, fail, jsonResponse, preflight, readJson, CODES } from "../../_shared/envelope.js";
import { nanoid, validateNickname, buildSetCookie, verifyTurnstile } from "../../_shared/auth.js";
import { scanSensitive } from "../../_shared/sensitive.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB || !env.SESSION_SECRET) {
    return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  }
  const r = await readJson(request);
  if (!r.ok) return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, r.error));
  const nickname = String((r.data && r.data.nickname) || "").trim();
  const turnstile = String((r.data && r.data.turnstile_token) || "");
  const honeypot = String((r.data && r.data.honeypot_email) || "").trim();

  // 1) Honeypot 蜜罐（廉价防线，命中即拒，避免对机器人发 siteverify）
  // 前端有一个 CSS 隐藏 + tabindex=-1 + aria-hidden 的 email 字段；真人看不见/不会填，爬虫会自动填。
  if (honeypot) {
    return jsonResponse(env, 400, fail("BOT_DETECTED", "提交被拒绝"));
  }

  // 2) Turnstile 必须过
  const pass = await verifyTurnstile(turnstile, env.TURNSTILE_SECRET, request.headers.get("CF-Connecting-IP"));
  if (!pass) {
    return jsonResponse(env, 403, fail("TURNSTILE_FAIL", "人机验证未通过，请重试"));
  }

  // 3) 昵称合法性
  const nickErr = validateNickname(nickname);
  if (nickErr) return jsonResponse(env, 400, fail(CODES.NICK_INVALID, nickErr));

  // 4) 敏感词
  const sens = await scanSensitive(nickname, env.DB);
  if (sens.hit) {
    return jsonResponse(env, 400, fail(CODES.NICK_BAD, "昵称含不合规内容，请更换"));
  }

  // 5) 唯一性（首占者拥有）
  const lowerNick = nickname.toLowerCase();
  const exist = await env.DB.prepare(
    "SELECT id FROM users WHERE lower_nickname = ?"
  ).bind(lowerNick).first();
  if (exist) {
    return jsonResponse(env, 400, fail(CODES.NICK_TAKEN, "该昵称已被使用，换一个试试"));
  }

  // 6) 创建
  const id = nanoid(12);
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO users (id, nickname, lower_nickname, created_at) VALUES (?, ?, ?, ?)"
  ).bind(id, nickname, lowerNick, now).run();

  const cookie = await buildSetCookie(id, env.SESSION_SECRET);
  return jsonResponse(
    env,
    200,
    ok({ user: { id: id, nickname: nickname } }),
    { "Set-Cookie": cookie.header }
  );
}

export async function onRequestOptions(context) {
  return preflight(context.env);
}
