/* ============================================================
   红色文化传播网 · 登录/注册弹窗 + 导航用户区 + 我的成绩 + 排行榜
   2026-09-02 全迁 Cloudflare · 方案4（昵称 + Turnstile，零 PII，无密码）
   - 仅昵称输入 + 静默人机验证
   - 调用 RCS.getApp().auth().signIn / signUp（api-client.js 适配）
   - 首占昵称 = 拥有，后续重名返回"已被占用"（防冒名）
   ============================================================ */
(function () {
  "use strict";

  var MODAL_HTML =
    '<div class="quiz-modal" id="rcs-auth-modal" role="dialog" aria-modal="true" aria-label="登录或注册" hidden>' +
    '  <div class="quiz-card rcs-auth-card">' +
    '    <button class="quiz-close" id="rcs-auth-close" aria-label="关闭">×</button>' +
    '    <p class="kicker sm">红色文化传播网</p>' +
    '    <h2 class="rcs-auth-title">欢迎</h2>' +
    '    <p class="rcs-auth-hint">请输入昵称（首占即拥有，无邮箱无手机号）</p>' +
    '    <div class="rcs-tabs" id="rcs-tabs">' +
    '      <button type="button" class="rcs-tab active" id="rcs-tab-login" data-tab="login">登录</button>' +
    '      <button type="button" class="rcs-tab" id="rcs-tab-register" data-tab="register">注册</button>' +
    "    </div>" +
    '    <form id="rcs-auth-form" class="rcs-auth-form" novalidate>' +
    '      <div class="rcs-field">' +
    '        <label for="rcs-nick">昵称</label>' +
    '        <input type="text" id="rcs-nick" placeholder="如：星星之火" autocomplete="off" maxlength="20">' +
    "      </div>" +
    // Turnstile 容器：api-client.js 加载的脚本会在此渲染 widget
    '      <div class="rcs-turnstile" id="rcs-turnstile"></div>' +
    '      <p class="rcs-error" id="rcs-auth-error" hidden></p>' +
    '      <button type="submit" class="pill-btn rcs-submit" id="rcs-auth-submit">登录</button>' +
    "    </form>" +
    '    <p class="rcs-switch" id="rcs-switch">还没有账号？<a href="javascript:void(0)" id="rcs-to-register">去注册</a></p>' +
    "  </div>" +
    "</div>";

  var SCORES_HTML =
    '<div class="quiz-modal" id="rcs-scores-modal" role="dialog" aria-modal="true" aria-label="我的成绩" hidden>' +
    '  <div class="quiz-card rcs-scores-card">' +
    '    <button class="quiz-close" id="rcs-scores-close" aria-label="关闭">×</button>' +
    '    <p class="kicker sm">个人中心</p>' +
    '    <h2 class="rcs-auth-title">我的成绩</h2>' +
    '    <div id="rcs-scores-body" class="rcs-scores-body"></div>' +
    "  </div>" +
    "</div>";

  var RANK_JS_VER = "20260902c";
  var RANK_HTML =
    '<div class="quiz-modal" id="rank-modal" role="dialog" aria-modal="true" aria-label="成绩排行榜" hidden>' +
    '  <div class="quiz-card rcs-rank-card">' +
    '    <button class="quiz-close" id="rank-close" aria-label="关闭">×</button>' +
    '    <p class="kicker sm">知识考核</p>' +
    '    <h2 class="rcs-auth-title">成绩排行榜</h2>' +
    '    <div id="rank-body" class="rcs-scores-body"></div>' +
    "  </div>" +
    "</div>";

  var tab = "login";
  var turnstileToken = null;
  var turnstileWidgetId = null;
  var currentUserEl = null;
  var currentDropdownEl = null;
  var docClickBound = false;

  function onDocClickForDropdown(ev) {
    if (currentUserEl && currentDropdownEl && !currentUserEl.contains(ev.target)) {
      currentDropdownEl.hidden = true;
    }
  }

  function el(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------------- Turnstile 加载与渲染 ---------------- */

  function ensureTurnstileScript() {
    return new Promise(function (resolve) {
      if (window.turnstile) return resolve();
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); }; // 失败也 resolve，让用户看到错误提示
      document.head.appendChild(s);
    });
  }

  function renderTurnstileWidget() {
    var box = el("rcs-turnstile");
    if (!box) return;
    if (!window.turnstile) return;
    // 重复打开时先 reset
    if (turnstileWidgetId !== null) {
      try { window.turnstile.remove(turnstileWidgetId); } catch (e) {}
      turnstileWidgetId = null;
      turnstileToken = null;
      box.innerHTML = "";
    }
    var sitekey = (window.RCS && RCS.config && RCS.config.turnstileSiteKey) || "";
    if (!sitekey) return;
    try {
      turnstileWidgetId = window.turnstile.render(box, {
        sitekey: sitekey,
        theme: "light",
        callback: function (token) { turnstileToken = token; },
        "expired-callback": function () { turnstileToken = null; },
        "error-callback": function () { turnstileToken = null; },
      });
    } catch (e) {
      // widget 渲染失败（sitekey 错等）——仍允许提交，让后端 TURNSTILE_FAIL 兜底
    }
  }

  async function ensureTurnstileReady() {
    await ensureTurnstileScript();
    renderTurnstileWidget();
  }

  /* ---------------- 弹窗与表单 ---------------- */

  function buildModal() {
    if (el("rcs-auth-modal")) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = MODAL_HTML;
    document.body.appendChild(wrap.firstElementChild);
    if (el("rcs-auth-close")) el("rcs-auth-close").onclick = closeLogin;
    if (el("rcs-auth-modal"))
      el("rcs-auth-modal").addEventListener("click", function (e) {
        if (e.target === el("rcs-auth-modal")) closeLogin();
      });
    if (el("rcs-auth-form")) el("rcs-auth-form").addEventListener("submit", submitForm);
  }

  function buildScoresModal() {
    if (el("rcs-scores-modal")) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = SCORES_HTML;
    document.body.appendChild(wrap.firstElementChild);
    if (el("rcs-scores-close")) el("rcs-scores-close").onclick = closeScores;
    if (el("rcs-scores-modal"))
      el("rcs-scores-modal").addEventListener("click", function (e) {
        if (e.target === el("rcs-scores-modal")) closeScores();
      });
  }

  function setTab(t) {
    tab = t;
    var tabLogin = el("rcs-tab-login");
    var tabReg = el("rcs-tab-register");
    var submit = el("rcs-auth-submit");
    var switchLink = el("rcs-switch");
    if (tabLogin) tabLogin.classList.toggle("active", t === "login");
    if (tabReg) tabReg.classList.toggle("active", t === "register");
    if (submit) submit.textContent = t === "register" ? "注册" : "登录";
    if (switchLink) {
      switchLink.innerHTML = t === "register"
        ? '已有账号？<a href="javascript:void(0)" id="rcs-to-login">去登录</a>'
        : '还没有账号？<a href="javascript:void(0)" id="rcs-to-register">去注册</a>';
    }
    bindSwitch();
    clearError();
  }

  function bindSwitch() {
    var tabLogin = el("rcs-tab-login");
    if (tabLogin) tabLogin.onclick = function () { setTab("login"); };
    var tabReg = el("rcs-tab-register");
    if (tabReg) tabReg.onclick = function () { setTab("register"); };
    var toReg = el("rcs-to-register");
    if (toReg) toReg.onclick = function (e) { e.preventDefault(); setTab("register"); };
    var toLogin = el("rcs-to-login");
    if (toLogin) toLogin.onclick = function (e) { e.preventDefault(); setTab("login"); };
  }

  function clearError() {
    var e = el("rcs-auth-error");
    if (e) { e.hidden = true; e.textContent = ""; }
  }
  function showError(msg) {
    var e = el("rcs-auth-error");
    if (e) { e.hidden = false; e.textContent = msg; }
  }

  function validate(nick) {
    nick = (nick || "").trim();
    if (!nick) return "请填写昵称";
    if (nick.length > 20) return "昵称不超过 20 字符";
    if (/[\s\u0000-\u001f]/.test(nick)) return "昵称不能含空白或控制字符";
    if (/^1[3-9]\d{9}$/.test(nick)) return "昵称不能是手机号";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nick)) return "昵称不能是邮箱";
    return null;
  }

  async function submitForm(e) {
    e.preventDefault();
    clearError();
    var submitBtn = el("rcs-auth-submit");
    var nick = el("rcs-nick").value.trim();
    var err = validate(nick);
    if (err) { showError(err); return; }

    // 静默 Turnstile：未拿到 token 也允许提交，让后端 TURNSTILE_FAIL 兜底
    // （这样如果 widget 还没加载完，用户不会卡死）
    submitBtn.disabled = true;
    var app = (window.RCS && RCS.getApp) ? RCS.getApp() : null;
    if (!app || !app.auth) {
      submitBtn.disabled = false;
      showError("客户端未就绪，请刷新页面重试");
      return;
    }
    var res = tab === "register"
      ? await app.auth.signUp(nick, turnstileToken)
      : await app.auth.signIn(nick, turnstileToken);
    submitBtn.disabled = false;

    if (res && res.success) {
      closeLogin();
      toast((tab === "register" ? "注册成功，欢迎你，" : "登录成功，欢迎你，") + (res.data && res.data.nick || nick));
    } else {
      var code = (res && res.error && res.error.code) || "";
      var msg = (res && res.error && res.error.message) || "操作失败，请重试";
      if (code === "NICK_TAKEN") msg = "该昵称已被占用，换一个试试";
      else if (code === "NICK_NOT_FOUND") msg = "昵称不存在，请先注册";
      else if (code === "TURNSTILE_FAIL") msg = "人机验证未通过，请稍后再试";
      showError(msg);
      // Turnstile 失败后重置 widget，避免卡在失败态
      if (code === "TURNSTILE_FAIL" && window.turnstile && turnstileWidgetId !== null) {
        try { window.turnstile.reset(turnstileWidgetId); } catch (e2) {}
        turnstileToken = null;
      }
    }
  }

  function openLogin() {
    buildModal();
    var m = el("rcs-auth-modal");
    if (!m) return;
    setTab(tab);
    m.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () { var n = el("rcs-nick"); if (n) n.focus(); }, 50);
    // 异步加载并渲染 Turnstile
    ensureTurnstileReady();
  }
  function closeLogin() {
    var m = el("rcs-auth-modal");
    if (m) m.hidden = true;
    document.body.style.overflow = "";
    // 关闭弹窗时重置 token（防止下次提交沿用旧值）
    turnstileToken = null;
  }

  function renderUserArea(state) {
    var mount = el("user-area");
    if (!mount) return;
    if (!state || !state.uid) {
      mount.innerHTML = '<button class="nav-login-btn" id="rcs-login-btn">登录</button>';
      el("rcs-login-btn").onclick = openLogin;
      currentUserEl = null;
      currentDropdownEl = null;
      return;
    }
    var initial = (state.nick || "友").trim().charAt(0).toUpperCase();
    mount.innerHTML =
      '<div class="nav-user" id="rcs-user">' +
      '<button class="nav-avatar" id="rcs-avatar" aria-label="用户菜单">' + escapeHtml(initial) + "</button>" +
      '<span class="nav-nick" id="rcs-nick-label">' + escapeHtml(state.nick || "朋友") + "</span>" +
      '<span class="nav-caret" id="rcs-caret">▾</span>' +
      '<div class="nav-dropdown" id="rcs-dropdown" hidden>' +
      '<button class="nav-dropdown-item" id="rcs-my-scores">我的成绩</button>' +
      '<button class="nav-dropdown-item" id="rcs-rank-open">🏆 排行榜</button>' +
      '<button class="nav-dropdown-item" id="rcs-logout">退出登录</button>' +
      "</div>" +
      "</div>";
    var user = el("rcs-user");
    var dropdown = el("rcs-dropdown");
    el("rcs-avatar").onclick = function (e) { e.stopPropagation(); dropdown.hidden = !dropdown.hidden; };
    el("rcs-nick-label").onclick = function (e) { e.stopPropagation(); dropdown.hidden = !dropdown.hidden; };
    el("rcs-caret").onclick = function (e) { e.stopPropagation(); dropdown.hidden = !dropdown.hidden; };
    el("rcs-my-scores").onclick = function () { dropdown.hidden = true; openScores(); };
    el("rcs-rank-open").onclick = function () { dropdown.hidden = true; openRankModal(); };
    el("rcs-logout").onclick = async function () {
      dropdown.hidden = true;
      var app = (window.RCS && RCS.getApp) ? RCS.getApp() : null;
      if (app && app.auth) await app.auth.signOut();
      toast("已退出登录");
    };
    currentUserEl = user;
    currentDropdownEl = dropdown;
    if (!docClickBound) {
      document.addEventListener("click", onDocClickForDropdown);
      docClickBound = true;
    }
  }

  function openScores() {
    buildScoresModal();
    var m = el("rcs-scores-modal");
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = "hidden";
    renderScores();
  }
  function closeScores() {
    var m = el("rcs-scores-modal");
    if (m) m.hidden = true;
    document.body.style.overflow = "";
  }

  function ensureRankScript(cb) {
    if (window.RCSRank) { cb(); return; }
    if (ensureRankScript._loading) return;
    ensureRankScript._loading = true;
    var s = document.createElement("script");
    s.src = "quiz-rank.js?v=" + RANK_JS_VER;
    s.onload = function () { ensureRankScript._loading = false; cb(); };
    s.onerror = function () {
      ensureRankScript._loading = false;
      var b = el("rank-body");
      if (b) b.innerHTML = '<p class="rcs-scores-empty">排行榜脚本加载失败，请稍后再试。</p>';
    };
    document.head.appendChild(s);
  }

  function buildRankModal() {
    if (el("rank-modal")) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = RANK_HTML;
    document.body.appendChild(wrap.firstElementChild);
  }

  function openRankModal() {
    buildRankModal();
    var m = el("rank-modal");
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = "hidden";
    ensureRankScript(function () { if (window.RCSRank) RCSRank.open(); });
  }

  async function renderScores() {
    var body = el("rcs-scores-body");
    if (!body) return;
    body.innerHTML = '<p class="rcs-scores-loading">加载中…</p>';
    if (!window.RCSQuiz || !RCSQuiz.getScores) {
      body.innerHTML = '<p class="rcs-scores-empty">成绩功能未就绪。</p>';
      return;
    }
    var res = await RCSQuiz.getScores();
    if (!res.success) {
      var isNoAuth = res.error && res.error.code === "NO_AUTH";
      var msg = isNoAuth ? "请先登录后查看成绩。" : "成绩加载失败：" + ((res.error && res.error.message) || "请稍后重试");
      body.innerHTML = '<p class="rcs-scores-empty">' + escapeHtml(msg) + "</p>";
      return;
    }
    var list = res.data.list || [];
    var best = res.data.best;
    if (!list.length) {
      body.innerHTML = '<p class="rcs-scores-empty">还没有成绩记录，去首页考一考吧！</p>';
      return;
    }
    var html = "";
    if (best) html += '<div class="rcs-best">最佳成绩 <b>' + best.score + " / " + best.total + "</b></div>";
    html += '<ul class="rcs-scores-list">';
    list.forEach(function (r) {
      var d = (r.createdAt || "").replace("T", " ").slice(0, 16);
      var book = r.book ? escapeHtml(r.book) : "首页知识考核";
      html +=
        '<li><span class="sc-score">' + r.score + "/" + r.total + '</span><span class="sc-book">' + book + '</span><span class="sc-date">' + d + "</span></li>";
    });
    html += "</ul>";
    body.innerHTML = html;
  }

  function toast(msg) {
    var t = el("rcs-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "rcs-toast";
      t.className = "rcs-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  function init() {
    buildModal();
    buildScoresModal();
    buildRankModal();
    if (window.RCS && RCS.getApp) {
      var app = RCS.getApp();
      if (app && app.auth) {
        app.auth.onAuthChange(function (state) { renderUserArea(state); });
        app.auth.getLoginState().then(function (s) { renderUserArea(s); });
      }
    }
    document.addEventListener("rcs:request-login", function () { openLogin(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (el("rcs-auth-modal") && !el("rcs-auth-modal").hidden) closeLogin();
        if (el("rcs-scores-modal") && !el("rcs-scores-modal").hidden) closeScores();
      }
    });
  }

  window.RCSAccount = {
    openLogin: openLogin,
    closeLogin: closeLogin,
    toast: toast,
    init: init,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
