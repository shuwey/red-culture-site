/* ============================================================
   红色文化传播网 · 登录/注册弹窗 + 导航用户区 + 我的成绩面板
   全局命名：window.RCSAccount
   依赖：RCSAuth（认证）、RCSQuiz（成绩查询）
   ============================================================ */
(function () {
  "use strict";

  var MODAL_HTML =
    '<div class="quiz-modal" id="rcs-auth-modal" role="dialog" aria-modal="true" aria-label="登录或注册" hidden>' +
    '  <div class="quiz-card rcs-auth-card">' +
    '    <button class="quiz-close" id="rcs-auth-close" aria-label="关闭">×</button>' +
    '    <p class="kicker sm">红色文化传播网</p>' +
    '    <h2 class="rcs-auth-title">欢迎登录</h2>' +
    '    <div class="rcs-tabs" id="rcs-tabs">' +
    '      <button type="button" class="rcs-tab active" id="rcs-tab-login" data-tab="login">登录</button>' +
    '      <button type="button" class="rcs-tab" id="rcs-tab-register" data-tab="register">注册</button>' +
    "    </div>" +
    '    <form id="rcs-auth-form" class="rcs-auth-form" novalidate>' +
    '      <div class="rcs-field" id="rcs-nick-field" hidden>' +
    '        <label for="rcs-nick">昵称</label>' +
    '        <input type="text" id="rcs-nick" placeholder="如：星星之火" autocomplete="nickname" maxlength="20">' +
    "      </div>" +
    '      <div class="rcs-field" id="rcs-email-field">' +
    '        <label for="rcs-email">邮箱</label>' +
    '        <input type="email" id="rcs-email" placeholder="you@example.com" autocomplete="email">' +
    "      </div>" +
    '      <div class="rcs-field" id="rcs-password-field">' +
    '        <label for="rcs-password">密码</label>' +
    '        <input type="password" id="rcs-password" placeholder="至少 8 位" autocomplete="current-password">' +
    "      </div>" +
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

  var tab = "login";

  function el(id) {
    return document.getElementById(id);
  }

  function getAuthMode() {
    return (window.RCS && RCS.config && RCS.config.authMode) || "email";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

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
    var local = getAuthMode() === "local";
    var emailField = el("rcs-email-field");
    var pwdField = el("rcs-password-field");
    var nickField = el("rcs-nick-field");
    var submit = el("rcs-auth-submit");
    var switchLink = el("rcs-switch");
    var tabs = el("rcs-tabs");

    if (local) {
      if (tabs) tabs.style.display = "none";
      if (emailField) emailField.hidden = true;
      if (pwdField) pwdField.hidden = true;
      if (nickField) nickField.hidden = false;
      submit.textContent = "进入";
      switchLink.innerHTML = "";
    } else {
      if (tabs) tabs.style.display = "";
      if (emailField) emailField.hidden = false;
      if (pwdField) pwdField.hidden = false;
      if (t === "login") {
        el("rcs-tab-login").classList.add("active");
        el("rcs-tab-register").classList.remove("active");
        if (nickField) nickField.hidden = true;
        submit.textContent = "登录";
        switchLink.innerHTML = '还没有账号？<a href="javascript:void(0)" id="rcs-to-register">去注册</a>';
      } else {
        el("rcs-tab-register").classList.add("active");
        el("rcs-tab-login").classList.remove("active");
        if (nickField) nickField.hidden = false;
        submit.textContent = "注册";
        switchLink.innerHTML = '已有账号？<a href="javascript:void(0)" id="rcs-to-login">去登录</a>';
      }
    }
    bindSwitch();
    clearError();
  }

  function bindSwitch() {
    var toReg = el("rcs-to-register");
    if (toReg) toReg.onclick = function (e) {
      e.preventDefault();
      setTab("register");
    };
    var toLogin = el("rcs-to-login");
    if (toLogin) toLogin.onclick = function (e) {
      e.preventDefault();
      setTab("login");
    };
  }

  function clearError() {
    var e = el("rcs-auth-error");
    if (e) {
      e.hidden = true;
      e.textContent = "";
    }
  }
  function showError(msg) {
    var e = el("rcs-auth-error");
    if (e) {
      e.hidden = false;
      e.textContent = msg;
    }
  }

  function validate(email, pwd, nick) {
    if (getAuthMode() === "local") {
      if (!nick || nick.trim().length === 0) return "请填写昵称";
      return null;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "邮箱格式不正确";
    if (!pwd || pwd.length < 8) return "密码至少 8 位";
    if (tab === "register" && (!nick || nick.trim().length === 0)) return "请填写昵称";
    return null;
  }

  async function submitForm(e) {
    e.preventDefault();
    clearError();
    var email = el("rcs-email").value.trim();
    var pwd = el("rcs-password").value;
    var nick = el("rcs-nick").value.trim();
    var err = validate(email, pwd, nick);
    if (err) {
      showError(err);
      return;
    }
    var submitBtn = el("rcs-auth-submit");
    submitBtn.disabled = true;
    var res;
    if (getAuthMode() === "local") {
      res = tab === "register" ? await RCSAuth.register(nick) : await RCSAuth.login(nick);
    } else {
      res =
        tab === "register"
          ? await RCSAuth.register(email, pwd, nick)
          : await RCSAuth.login(email, pwd);
    }
    submitBtn.disabled = false;
    if (res.success) {
      closeLogin();
      toast("登录成功，欢迎你，" + (res.data.nick || "朋友"));
    } else {
      showError((res.error && res.error.message) || "操作失败，请重试");
    }
  }

  function openLogin() {
    buildModal();
    var m = el("rcs-auth-modal");
    if (!m) return;
    setTab(tab);
    m.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () {
      if (getAuthMode() !== "local") {
        var f = el("rcs-email");
        if (f) f.focus();
      } else {
        var n = el("rcs-nick");
        if (n) n.focus();
      }
    }, 50);
  }
  function closeLogin() {
    var m = el("rcs-auth-modal");
    if (m) m.hidden = true;
    document.body.style.overflow = "";
  }

  function renderUserArea(state) {
    var mount = el("user-area");
    if (!mount) return;
    if (!state || !state.uid) {
      mount.innerHTML = '<button class="nav-login-btn" id="rcs-login-btn">登录</button>';
      el("rcs-login-btn").onclick = openLogin;
      return;
    }
    var initial = (state.nick || "友").trim().charAt(0).toUpperCase();
    mount.innerHTML =
      '<div class="nav-user" id="rcs-user">' +
      '<button class="nav-avatar" id="rcs-avatar" aria-label="用户菜单">' +
      escapeHtml(initial) +
      "</button>" +
      '<span class="nav-nick" id="rcs-nick-label">' +
      escapeHtml(state.nick || "朋友") +
      "</span>" +
      '<span class="nav-caret" id="rcs-caret">▾</span>' +
      '<div class="nav-dropdown" id="rcs-dropdown" hidden>' +
      '<button class="nav-dropdown-item" id="rcs-my-scores">我的成绩</button>' +
      '<button class="nav-dropdown-item" id="rcs-logout">退出登录</button>' +
      "</div>" +
      "</div>";
    var user = el("rcs-user");
    var dropdown = el("rcs-dropdown");
    el("rcs-avatar").onclick = function (e) {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
    };
    el("rcs-nick-label").onclick = function (e) {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
    };
    el("rcs-caret").onclick = function (e) {
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
    };
    el("rcs-my-scores").onclick = function () {
      dropdown.hidden = true;
      openScores();
    };
    el("rcs-logout").onclick = async function () {
      dropdown.hidden = true;
      await RCSAuth.logout();
      toast("已退出登录");
    };
    document.addEventListener("click", function (ev) {
      if (user && !user.contains(ev.target)) dropdown.hidden = true;
    });
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
      body.innerHTML = '<p class="rcs-scores-empty">请先登录后查看成绩。</p>';
      return;
    }
    var list = res.data.list || [];
    var best = res.data.best;
    if (!list.length) {
      body.innerHTML = '<p class="rcs-scores-empty">还没有成绩记录，去首页考一考吧！</p>';
      return;
    }
    var html = "";
    if (best) {
      html += '<div class="rcs-best">最佳成绩 <b>' + best.score + " / " + best.total + "</b></div>";
    }
    html += '<ul class="rcs-scores-list">';
    list.forEach(function (r) {
      var d = (r.createdAt || "").replace("T", " ").slice(0, 16);
      html +=
        '<li><span class="sc-score">' +
        r.score +
        "/" +
        r.total +
        '</span><span class="sc-date">' +
        d +
        "</span></li>";
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
    t._timer = setTimeout(function () {
      t.classList.remove("show");
    }, 2600);
  }

  function init() {
    buildModal();
    buildScoresModal();
    if (window.RCSAuth) {
      RCSAuth.onAuthChange(function (state) {
        renderUserArea(state);
      });
      RCSAuth.getState().then(function (state) {
        renderUserArea(state);
      });
    }
    // 外部（如成绩未登录时）请求打开登录弹窗
    document.addEventListener("rcs:request-login", function () {
      openLogin();
    });
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
