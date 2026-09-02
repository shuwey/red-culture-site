/* ============================================================
   红色文化传播网 · POST /api/auth/logout
   - 清除会话 cookie
   ============================================================ */
import { ok, jsonResponse, preflight } from "../../_shared/envelope.js";
import { clearSetCookie } from "../../_shared/auth.js";

export async function onRequestPost(context) {
  const { env } = context;
  return jsonResponse(env, 200, ok({ ok: true }), { "Set-Cookie": clearSetCookie() });
}

export async function onRequestOptions(context) {
  return preflight(context.env);
}
