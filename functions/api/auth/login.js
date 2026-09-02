/* ============================================================
   红色文化传播网 · POST /api/auth/login
   方案4：{ nickname, turnstile_token } —— 昵称 + Turnstile，无密码
   - 校验 Turnstile
   - 昵称存在则登录；不存在返回 NICK_NOT_FOUND（引导去注册）
   ============================================================ */
import { ok, fail, jsonResponse, preflight, readJson, CODES } from "../_shared/envelope.js";
import { buildSetCookie, verifyTurnstile } from "../_shared/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB || !env.SESSION_SECRET) {
    return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  }
  const r = await readJson(request);
  if (!r.ok) return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, r.error));
  const nickname = String((r.data && r.data.nickname) || "").trim();
  const turnstile = String((r.data && r.data.turnstile_token) || "");

  const pass = await verifyTurnstile(turnstile, env.TURNSTILE_SECRET, request.headers.get("CF-Connecting-IP"));
  if (!pass) {
    return jsonResponse(env, 403, fail("TURNSTILE_FAIL", "人机验证未通过，请重试"));
  }

  if (!nickname) {
    return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, "请输入昵称"));
  }

  const lowerNick = nickname.toLowerCase();
  const row = await env.DB.prepare(
    "SELECT id, nickname FROM users WHERE lower_nickname = ?"
  ).bind(lowerNick).first();
  if (!row) {
    return jsonResponse(env, 404, fail(CODES.NICK_NOT_FOUND, "昵称不存在，请先注册"));
  }

  await env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
    .bind(Date.now(), row.id).run();

  const cookie = await buildSetCookie(row.id, env.SESSION_SECRET);
  return jsonResponse(
    env,
    200,
    ok({ user: { id: row.id, nickname: row.nickname } }),
    { "Set-Cookie": cookie.header }
  );
}

export async function onRequestOptions(context) {
  return preflight(context.env);
}
