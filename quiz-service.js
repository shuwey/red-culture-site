/* ============================================================
   红色文化传播网 · 成绩云端保存（2026-09-02 Cloudflare 全迁版）
   监听 rcs:quiz-finished：未登录唤起登录；已登录 POST /api/quiz/save
   读我的成绩：GET /api/quiz/scores
   ============================================================ */
(function () {
  "use strict";

  var pending = null;

  async function getAuthState() {
    var app = (window.RCS && RCS.getApp) ? RCS.getApp() : null;
    if (!app || !app.auth) return null;
    return await app.auth.getLoginState();
  }

  /** 保存成绩（公开 API） */
  async function save(opts) {
    opts = opts || {};
    var score = Number(opts.score) || 0;
    var total = Number(opts.total) || 0;
    var durationSec = Number(opts.durationSec) || 0;
    var book = String(opts.book || "").trim();

    var state = await getAuthState();
    if (!state || !state.uid) {
      pending = { score, total, durationSec, book };
      return { success: false, error: { code: "NO_AUTH" } };
    }

    var app = (window.RCS && RCS.getApp) ? RCS.getApp() : null;
    if (!app || !app.callFunction) {
      return { success: false, error: { code: "SDK_NOT_READY", message: "客户端未就绪" } };
    }
    try {
      var r = await app.callFunction({
        name: "quiz.save",
        data: { score, total, durationSec, book },
      });
      if (r && r.result && r.result.success) return { success: true };
      return { success: false, error: (r && r.result && r.result.error) || { code: "SAVE_ERROR", message: "保存失败" } };
    } catch (e) {
      return { success: false, error: { code: "SAVE_ERROR", message: String((e && e.message) || e) } };
    }
  }

  /** 读我的成绩 + 最佳 */
  async function getScores() {
    var state = await getAuthState();
    if (!state || !state.uid) {
      return { success: false, error: { code: "NO_AUTH" } };
    }
    var app = (window.RCS && RCS.getApp) ? RCS.getApp() : null;
    if (!app || !app.callFunction) {
      return { success: false, error: { code: "SDK_NOT_READY", message: "客户端未就绪" } };
    }
    try {
      var r = await app.callFunction({ name: "quiz.scores" });
      if (r && r.result && r.result.success) return { success: true, data: r.result.data };
      return { success: false, error: (r && r.result && r.result.error) || { code: "QUERY_ERROR", message: "查询失败" } };
    } catch (e) {
      return { success: false, error: { code: "QUERY_ERROR", message: String((e && e.message) || e) } };
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
      var book = String(detail.book || "").trim();
      var state = await getAuthState();
      if (!state || !state.uid) {
        pending = { score, total, durationSec, book };
        toast("登录后即可保存你的成绩");
        if (window.RCSAccount && RCSAccount.openLogin) RCSAccount.openLogin();
        return;
      }
      var r = await save({ score, total, durationSec, book });
      if (r.success) toast("成绩已保存");
    });

    // 登录成功回调：补存未登录时堆积的成绩
    if (window.RCS && RCS.getApp) {
      RCS.getApp().auth.onAuthChange(async function (state) {
        if (state && state.uid && pending) {
          var p = pending;
          pending = null;
          var r = await save(p);
          if (r.success) toast("成绩已保存");
        }
      });
    }
  }

  window.RCSQuiz = { save: save, getScores: getScores, init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
