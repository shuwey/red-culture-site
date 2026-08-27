/* ============================================================
   红色文化传播网 · 知识考核排行榜（前端）
   全局命名：window.RCSRank
   调用云函数 quiz-rank（聚合每位用户最佳成绩），渲染榜单。
   公开数据，无需登录即可查看。
   ============================================================ */
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDur(s) {
    s = Number(s) || 0;
    if (!s) return "—";
    var m = Math.floor(s / 60);
    var ss = s % 60;
    return (m > 0 ? m + " 分 " : "") + ss + " 秒";
  }

  function medal(rank) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  }

  async function loadRank() {
    var body = el("rank-body");
    if (!body) return;
    body.innerHTML = '<p class="rcs-scores-loading">加载中…</p>';
    try {
      var res = await RCS.getApp().callFunction({ name: "quiz-rank", data: {} });
      var r = res && res.result;
      if (!r || !r.success || !r.data || !r.data.list || !r.data.list.length) {
        body.innerHTML = '<p class="rcs-scores-empty">还没有人上榜，快来考一考争第一！</p>';
        return;
      }
      var html = '<ol class="rank-list">';
      r.data.list.forEach(function (it) {
        html +=
          '<li class="rank-item' + (it.rank <= 3 ? " top" : "") + '">' +
          '<span class="rank-no">' + medal(it.rank) + "</span>" +
          '<span class="rank-name">' + escapeHtml(it.nickname || "匿名用户") + "</span>" +
          '<span class="rank-score">' + it.score + '<small>/' + it.total + "</small></span>" +
          '<span class="rank-dur">' + fmtDur(it.durationSec) + "</span>" +
          "</li>";
      });
      html += "</ol>";
      body.innerHTML = html;
    } catch (e) {
      body.innerHTML = '<p class="rcs-scores-empty">排行榜暂不可用，请稍后再试。</p>';
    }
  }

  function openRank() {
    var m = el("rank-modal");
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = "hidden";
    loadRank();
  }
  function closeRank() {
    var m = el("rank-modal");
    if (m) m.hidden = true;
    document.body.style.overflow = "";
  }

  function init() {
    var btn = el("rank-open");
    if (btn) btn.onclick = openRank;
    var close = el("rank-close");
    if (close) close.onclick = closeRank;
    var m = el("rank-modal");
    if (m)
      m.addEventListener("click", function (e) {
        if (e.target === m) closeRank();
      });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && m && !m.hidden) closeRank();
    });
  }

  window.RCSRank = { open: openRank, init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
