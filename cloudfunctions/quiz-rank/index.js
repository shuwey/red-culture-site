/* ============================================================
   红色文化传播网 · CloudBase 云函数 quiz-rank
   职责：聚合「知识考核」排行榜（每位用户取最佳成绩，按分数降序、
         同分按用时升序），返回公开展示字段（不含 userId/邮箱等隐私）。
   安全：云端函数以管理员身份读库，不受集合安全规则限制；只回传
         nickname / score / total / durationSec / createdAt 等展示字段。
   部署：cloudfunctions/quiz-rank（package.json 已声明依赖）
   入口：exports.main = async (event, context) => envelope
   ============================================================ */
"use strict";

const cloudbase = require("@cloudbase/node-sdk");
const { scanSensitive } = require("./lib/sensitive-words");

let _app = null;
function getApp() {
  if (!_app) {
    _app = cloudbase.init({ env: process.env.TCB_ENV || "cloud1-d0g0aq0bl2cfbcbdf" });
  }
  return _app;
}

function envelope(success, data, code, message) {
  return {
    success: success,
    data: data || null,
    error: success ? null : { code: code, message: message },
  };
}

exports.main = async (event, context) => {
  try {
    const db = getApp().database();
    // 小站数据量有限，一次取足量后在内存聚合；如需更大规模可改为聚合管道
    const res = await db.collection("quiz_scores").limit(1000).get();
    const rows = (res && res.data) || [];

    const map = {};
    for (const r of rows) {
      const uid = r.userId;
      if (!uid) continue;
      const cur = map[uid];
      const score = Number(r.score) || 0;
      const dur = Number(r.durationSec) || 0;
      // 昵称公开展示前做敏感词过滤：命中则置空，前端/榜单回退为"匿名用户"
      const rawNick = r.nickname || "";
      const safeNick = scanSensitive(rawNick) ? "" : rawNick;
      if (!cur) {
        map[uid] = {
          userId: uid,
          nickname: safeNick,
          best: score,
          dur: dur,
          total: Number(r.total) || 0,
          at: r.createdAt || "",
        };
      } else {
        const better =
          score > cur.best || (score === cur.best && dur < cur.dur);
        if (better) {
          cur.best = score;
          cur.dur = dur;
          if (safeNick) cur.nickname = safeNick; // 仅在安全时才覆盖昵称
          cur.total = Number(r.total) || cur.total;
          cur.at = r.createdAt || cur.at;
        }
      }
    }

    const list = Object.values(map)
      .sort((a, b) => b.best - a.best || a.dur - b.dur)
      .slice(0, 50)
      .map(function (x, i) {
        return {
          rank: i + 1,
          nickname: x.nickname || "匿名用户",
          score: x.best,
          total: x.total,
          durationSec: x.dur,
          createdAt: x.at,
        };
      });

    return envelope(true, { list: list, total: list.length });
  } catch (e) {
    return envelope(false, null, "QUERY_ERROR", String((e && e.message) || e));
  }
};
