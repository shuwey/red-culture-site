/* ============================================================
   红色文化传播网 · 敏感词运营管理（/api/admin/words*）
   - GET    /api/admin/words       列表（按 status 过滤）
   - POST   /api/admin/words       新增（pending）
   - POST   /api/admin/words/approve  审核通过
   - POST   /api/admin/words/reject   驳回
   - POST   /api/admin/words/delete   删除
   全部需 ADMIN_TOKEN
   ============================================================ */
import { ok, fail, jsonResponse, preflight, readJson, CODES } from "../../_shared/envelope.js";
import { nanoid } from "../../_shared/auth.js";

function checkToken(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;
  // 接受 header x-admin-token 或 body.adminToken
  const hdr = request.headers.get("x-admin-token") || "";
  if (hdr && hdr.length === expected.length) {
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hdr.charCodeAt(i);
    if (diff === 0) return true;
  }
  return false;
}

async function requireAdmin(request, env) {
  if (!checkToken(request, env)) {
    return { ok: false, response: jsonResponse(env, 403, fail(CODES.FORBIDDEN, "管理员令牌无效或未配置")) };
  }
  return { ok: true };
}

/* GET /api/admin/words */
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  const a = await requireAdmin(request, env);
  if (!a.ok) return a.response;
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let q = "SELECT id, word, category, status, created_at, approved_at FROM sensitive_words";
    const params = [];
    if (status) { q += " WHERE status = ?"; params.push(status); }
    q += " ORDER BY created_at DESC LIMIT 500";
    const rows = await env.DB.prepare(q).bind(...params).all();
    const list = (rows && rows.results) || [];
    return jsonResponse(env, 200, ok({
      items: list.map((r) => ({
        id: r.id, word: r.word, category: r.category, status: r.status,
        createdAt: new Date(r.created_at).toISOString(),
        approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : null,
      })),
    }));
  } catch (e) {
    return jsonResponse(env, 500, fail(CODES.QUERY_ERROR, String((e && e.message) || e)));
  }
}

/* POST /api/admin/words（add） */
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  const a = await requireAdmin(request, env);
  if (!a.ok) return a.response;
  const r = await readJson(request);
  if (!r.ok) return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, r.error));
  const word = String((r.data && r.data.word) || "").trim().slice(0, 50);
  const category = String((r.data && r.data.category) || "运营新增").slice(0, 50);
  if (!word) return jsonResponse(env, 400, fail("WORD_EMPTY", "敏感词不能为空"));
  try {
    const exist = await env.DB.prepare("SELECT id FROM sensitive_words WHERE word = ?").bind(word).first();
    if (exist) return jsonResponse(env, 400, fail("WORD_EXISTS", "敏感词已存在"));
    const id = nanoid(12);
    const now = Date.now();
    await env.DB.prepare(
      "INSERT INTO sensitive_words (id, word, category, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
    ).bind(id, word, category, now).run();
    return jsonResponse(env, 200, ok({ id }));
  } catch (e) {
    return jsonResponse(env, 500, fail(CODES.SAVE_ERROR, String((e && e.message) || e)));
  }
}

export async function onRequestOptions(context) { return preflight(context.env); }
