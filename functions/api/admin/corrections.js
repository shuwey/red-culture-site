/* ============================================================
   红色文化传播网 · 纠错管理（/api/admin/corrections）
   - GET  /api/admin/corrections   列表（按 status 过滤，需 ADMIN_TOKEN）
   ============================================================ */
import { ok, fail, jsonResponse, preflight, CODES } from "../../_shared/envelope.js";

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

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  if (!checkToken(request, env)) {
    return jsonResponse(env, 403, fail(CODES.FORBIDDEN, "管理员令牌无效或未配置"));
  }
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let q =
      "SELECT id, user_id, content_type, quote, description, contact, status, handle_note, created_at, updated_at FROM corrections";
    const params = [];
    if (status) {
      q += " WHERE status = ?";
      params.push(status);
    }
    q += " ORDER BY created_at DESC LIMIT 500";
    const rows = await env.DB.prepare(q).bind(...params).all();
    const list = (rows && rows.results) || [];
    return jsonResponse(env, 200, ok({
      items: list.map((r) => ({
        id: r.id,
        userId: r.user_id,
        contentType: r.content_type,
        quote: r.quote,
        description: r.description,
        contact: r.contact,
        status: r.status,
        handleNote: r.handle_note,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      })),
    }));
  } catch (e) {
    return jsonResponse(env, 500, fail(CODES.QUERY_ERROR, String((e && e.message) || e)));
  }
}

export async function onRequestOptions(context) { return preflight(context.env); }
