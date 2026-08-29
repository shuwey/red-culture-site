/* ============================================================
   红色文化传播网 · 成绩云端保存（CloudBase NoSQL 集合 quiz_scores）
   全局命名：window.RCSQuiz
   监听 rcs:quiz-finished：未登录唤起登录；已登录写库、查最近 20 + 最佳。
   ============================================================ */
(function () {
  "use strict";

  var COLLECTION = "quiz_scores";
  var pending = null;

  async function save(opts) {
    opts = opts || {};
    var score = Number(opts.score) || 0;
    var total = Number(opts.total) || 0;
    var durationSec = Number(opts.durationSec) || 0;
    var state = await RCSAuth.getState();
    if (!state || !state.uid) {
      pending = { score: score, total: total, durationSec: durationSec };
      return { success: false, error: { code: "NO_AUTH" } };
    }
    var doc = {
      userId: state.uid,
      nickname: state.nick || "",
      score: score,
      total: total,
      durationSec: durationSec,
      createdAt: new Date().toISOString(),
    };
    try {
      await RCS.getApp().database().collection(COLLECTION).add(doc);
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: { code: "SAVE_ERROR", message: String((e && e.message) || e) },
      };
    }
  }

  // 集合 quiz_scores 的安全规则为 read: doc._openid == auth.uid，
  // 因此查询必须按 _openid 过滤（与规则条件构成子集），否则报 Permission denied。
  // 不能用 userId 过滤——字段存在，但规则不认，子集校验失败。
  // _openid 由 Web SDK 在 .add() 时自动写入创建者 uid，正好等于 state.uid。
  async function getScores() {
    var state = await RCSAuth.getState();
    if (!state || !state.uid)
      return { success: false, error: { code: "NO_AUTH" } };
    try {
      var db = RCS.getApp().database().collection(COLLECTION);
      var recentRes = await db
        .where({ _openid: state.uid })
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
      var bestRes = await db
        .where({ _openid: state.uid })
        .orderBy("score", "desc")
        .limit(1)
        .get();
      var list = (recentRes && recentRes.data) || [];
      var best =
        bestRes && bestRes.data && bestRes.data[0] ? bestRes.data[0] : null;
      return { success: true, data: { list: list, best: best } };
    } catch (e) {
      return {
        success: false,
        error: { code: "QUERY_ERROR", message: String((e && e.message) || e) },
      };
    }
  }

  function toast(msg) {
    if (window.RCSAccount && RCSAccount.toast) RCSAccount.toast(msg);
  }

  function init() {
    document.addEventListener("rcs:quiz-finished", async function (e) {
      var detail = e.detail || {};
      var score = Number(detail.score) || 0;
      var total = Number(detail.total) || 0;
      var durationSec = Number(detail.durationSec) || 0;
      var state = await RCSAuth.getState();
      if (!state || !state.uid) {
        pending = { score: score, total: total, durationSec: durationSec };
        toast("登录后即可保存你的成绩");
        if (window.RCSAccount && RCSAccount.openLogin) RCSAccount.openLogin();
        return;
      }
      var r = await save({ score: score, total: total, durationSec: durationSec });
      if (r.success) toast("成绩已保存");
    });

    RCSAuth.onAuthChange(async function (state) {
      if (state && state.uid && pending) {
        var p = pending;
        pending = null;
        var r = await save(p);
        if (r.success) toast("成绩已保存");
      }
    });
  }

  window.RCSQuiz = { save: save, getScores: getScores, init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
