/* ============================================================
   红色文化传播网 · GET /api/quiz/rank
   - 公开接口（无需登录）
   - 聚合每位用户最佳成绩，按 score DESC、duration ASC 排序，取 top 50
   - 只回传 nickname/score/total/durationSec/createdAt，隐私字段剥离
   - 昵称脱敏（联系方式/敏感词置空 → 显示"匿名用户"）
   ============================================================ */
import { ok, fail, jsonResponse, preflight, CODES } from "../_shared/envelope.js";
import { scanSensitive } from "../_shared/sensitive.js";

const NICK_BAD_WORDS = [
  "反动", "颠覆国家", "分裂国家", "台独", "港独", "藏独", "疆独",
  "法轮", "邪教", "历史虚无主义", "抹黑党史", "歪曲历史", "诋毁英雄",
  "污蔑烈士", "色情", "赌博", "毒品", "代办文凭", "代考",
];
const isContactLike = (n) => /^1[3-9]\d{9}$/.test(n) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n);

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return jsonResponse(env, 500, fail("SERVER_NOT_READY", "服务尚未配置完成"));
  try {
    // 小站数据量有限，limit 5000 后内存聚合
    const rowsRes = await env.DB.prepare(
      "SELECT user_id, nickname, score, total, duration_sec, created_at FROM quiz_scores ORDER BY created_at DESC LIMIT 5000"
    ).all();
    const rows = (rowsRes && rowsRes.results) || [];

    const map = new Map();
    for (const r of rows) {
      const uid = r.user_id;
      if (!uid) continue;
      const cur = map.get(uid);
      const score = Number(r.score) || 0;
      const dur = Number(r.duration_sec) || 0;
      const rawNick = String(r.nickname || "").trim();
      const bad = NICK_BAD_WORDS.some((w) => rawNick.toLowerCase().indexOf(w.toLowerCase()) !== -1)
        || isContactLike(rawNick)
        || (await scanSensitive(rawNick, env.DB)).hit;
      const safeNick = bad ? "" : rawNick;
      if (!cur) {
        map.set(uid, { userId: uid, nickname: safeNick, best: score, dur, total: Number(r.total) || 0, at: r.created_at });
      } else {
        const better = score > cur.best || (score === cur.best && dur < cur.dur);
        if (better) {
          cur.best = score; cur.dur = dur;
          if (safeNick) cur.nickname = safeNick;
          cur.total = Number(r.total) || cur.total;
          cur.at = r.created_at;
        }
      }
    }

    const list = Array.from(map.values())
      .sort((a, b) => b.best - a.best || a.dur - b.dur)
      .slice(0, 50)
      .map((x, i) => ({
        rank: i + 1,
        nickname: x.nickname || "匿名用户",
        score: x.best,
        total: x.total,
        durationSec: x.dur,
        createdAt: new Date(x.at).toISOString(),
      }));

    return jsonResponse(env, 200, ok({ list, total: list.length }));
  } catch (e) {
    return jsonResponse(env, 500, fail(CODES.QUERY_ERROR, String((e && e.message) || e)));
  }
}

export async function onRequestOptions(context) { return preflight(context.env); }
