/* ============================================================
   红色文化传播网 · POST /api/admin/correction
   - 用户纠错提交（无需登录，匿名亦可）
   - Body: { contentType, quote, description, contact }
   ============================================================ */
import { ok, fail, jsonResponse, preflight, readJson, CODES } from "../../_shared/envelope.js";
import { nanoid } from "../../_shared/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  const r = await readJson(request);
  if (!r.ok) return jsonResponse(env, 400, fail(CODES.INVALID_PARAM, r.error));
  const contentType = String((r.data && r.data.contentType) || "通用").slice(0, 20);
  const quote = String((r.data && r.data.quote) || "").slice(0, 500);
  const description = String((r.data && r.data.description) || "").trim().slice(0, 1000);
  const contact = String((r.data && r.data.contact) || "").slice(0, 100);
  const uid = String((r.data && r.data.uid) || "").slice(0, 64) || null;

  if (!description) {
    return jsonResponse(env, 400, fail("DESC_EMPTY", "请填写问题描述"));
  }

  const id = nanoid(12);
  const now = Date.now();
  try {
    await env.DB.prepare(
      "INSERT INTO corrections (id, user_id, content_type, quote, description, contact, status, handle_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)"
    ).bind(id, uid, contentType, quote, description, contact, now, now).run();
    return jsonResponse(env, 200, ok({ id }));
  } catch (e) {
    return jsonResponse(env, 500, fail(CODES.SAVE_ERROR, String((e && e.message) || e)));
  }
}

export async function onRequestOptions(context) { return preflight(context.env); }
