/* ============================================================
   红色文化传播网 · GET /api/auth/me
   - 读取当前会话，返回 { uid, nick } 或未登录 { uid: null }
   - 供前端轮询/恢复登录态
   ============================================================ */
import { ok, fail, jsonResponse, preflight, CODES } from "../_shared/envelope.js";
import { getCurrentUser } from "../_shared/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB || !env.SESSION_SECRET) {
    return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  }
  const user = await getCurrentUser(request, env);
  if (!user) {
    return jsonResponse(env, 200, ok({ user: null }));
  }
  return jsonResponse(env, 200, ok({ user: { id: user.id, nickname: user.nickname } }));
}

export async function onRequestOptions(context) {
  return preflight(context.env);
}
