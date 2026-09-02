/* ============================================================
   红色文化传播网 · GET /api/quiz/scores
   - 需登录
   - 返回最近 20 条 + 最佳成绩
   ============================================================ */
import { ok, fail, jsonResponse, preflight, CODES } from "../_shared/envelope.js";
import { requireAuth } from "../_shared/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  const a = await requireAuth(request, env);
  if (!a.ok) return jsonResponse(env, 401, a.response);

  try {
    const recent = await env.DB.prepare(
      "SELECT id, score, total, duration_sec, book, created_at FROM quiz_scores WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
    ).bind(a.user.id).all();
    const best = await env.DB.prepare(
      "SELECT id, score, total, duration_sec, book, created_at FROM quiz_scores WHERE user_id = ? ORDER BY score DESC, duration_sec ASC LIMIT 1"
    ).bind(a.user.id).first();

    const list = (recent && recent.results) || [];
    // 时间戳 ms → ISO 字符串（前端模板习惯）
    const fmt = (r) => ({
      id: r.id,
      score: r.score,
      total: r.total,
      durationSec: r.duration_sec,
      book: r.book,
      createdAt: new Date(r.created_at).toISOString(),
    });

    return jsonResponse(env, 200, ok({
      list: list.map(fmt),
      best: best ? fmt(best) : null,
    }));
  } catch (e) {
    return jsonResponse(env, 500, fail(CODES.QUERY_ERROR, String((e && e.message) || e)));
  }
}

export async function onRequestOptions(context) { return preflight(context.env); }
