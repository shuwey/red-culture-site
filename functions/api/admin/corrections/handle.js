/* ============================================================
   红色文化传播网 · 纠错处理（/api/admin/corrections/handle）
   - POST  { id, status, handleNote }   需 ADMIN_TOKEN
   - status: pending / resolved / rejected
   ============================================================ */
import { ok, fail, jsonResponse, preflight, readJson, CODES } from "../../_shared/envelope.js";

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
    return jsonResponse(env, 403, fail(CODES.FORBIDDEN, "管理员令牌无效或未配置"));
  }
  const r = await readJson(request);
  if (!r.ok) return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, r.error));
  const id = String((r.data && r.data.id) || "").slice(0, 64);
  const status = String((r.data && r.data.status) || "").slice(0, 20);
  const handleNote = String((r.data && r.data.handleNote) || "").slice(0, 500);
  if (!id) return jsonResponse(env, 400, fail("ID_EMPTY", "缺少纠错记录 ID"));
  if (!["pending", "resolved", "rejected"].includes(status)) {
    return jsonResponse(env, 400, fail("BAD_STATUS", "状态非法"));
  }
  try {
    const exist = await env.DB.prepare("SELECT id FROM corrections WHERE id = ?").bind(id).first();
    if (!exist) return jsonResponse(env, 404, fail(CODES.NOT_FOUND, "纠错记录不存在"));
    await env.DB.prepare(
      "UPDATE corrections SET status = ?, handle_note = ?, updated_at = ? WHERE id = ?"
    ).bind(status, handleNote, Date.now(), id).run();
    return jsonResponse(env, 200, ok({ id, status }));
  } catch (e) {
    return jsonResponse(env, 500, fail(CODES.SAVE_ERROR, String((e && e.message) || e)));
  }
}

export async function onRequestOptions(context) { return preflight(context.env); }
