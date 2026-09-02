/* ============================================================
   红色文化传播网 · /api/admin/words/delete
   - 需 ADMIN_TOKEN
   - Body: { id }
   ============================================================ */
import { ok, fail, jsonResponse, preflight, readJson, CODES } from "../_shared/envelope.js";

function checkToken(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;
  const hdr = request.headers.get("x-admin-token") || "";
  if (hdr && hdr.length === expected.length) {
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hdr.charCodeAt(i);
    if (diff === 0) return true;
  }
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  if (!checkToken(request, env)) {
    return jsonResponse(env, 403, fail(CODES.FORBIDDEN, "管理员令牌无效"));
  }
  const r = await readJson(request);
  if (!r.ok) return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, r.error));
  const id = String((r.data && r.data.id) || "");
  if (!id) return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, "缺少 id"));
  try {
    await env.DB.prepare("DELETE FROM sensitive_words WHERE id = ?").bind(id).run();
    return jsonResponse(env, 200, ok({ ok: true }));
  } catch (e) {
    return jsonResponse(env, 500, fail(CODES.SAVE_ERROR, String((e && e.message) || e)));
  }
}

export async function onRequestOptions(context) { return preflight(context.env); }
