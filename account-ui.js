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
    '        <label for="rcs-email">账号</label>' +
    // 本环境未开启邮箱登录（email provider 未启用，且开启需先配置 SMTP 发件人），
    // 账号由管理端创建后以「用户名」登录，故此处放开为文本输入。
    '        <input type="text" id="rcs-email" placeholder="用户名或邮箱" autocomplete="username">' +
    "      </div>" +
    '      <div class="rcs-field" id="rcs-password-field">' +
    '        <label for="rcs-password">密码</label>' +
    '        <input type="password" id="rcs-password" placeholder="至少 8 位" autocomplete="current-password">' +
    "      </div>" +
    // 邮箱注册第二步：填邮箱验证码（邮箱登录开启后 signUp 需经验证码激活）
    '      <div class="rcs-field" id="rcs-code-field" hidden>' +
    '        <label for="rcs-code">邮箱验证码</label>' +
    '        <input type="text" id="rcs-code" placeholder="查收邮件中的 6 位验证码" autocomplete="one-time-code" maxlength="12" inputmode="numeric">' +
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
  var resending = false;
  // 下拉菜单点击外部收起：只绑定一次 document 监听，避免 renderUserArea 每次渲染都累积新监听（泄漏）
  var currentUserEl = null;
  var currentDropdownEl = null;
  var docClickBound = false;

  function onDocClickForDropdown(ev) {
    if (currentUserEl && currentDropdownEl && !currentUserEl.contains(ev.target)) {
      currentDropdownEl.hidden = true;
    }
  }

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
    var codeField = el("rcs-code-field");
    if (codeField) codeField.hidden = t !== "verify";

    if (local) {
      if (tabs) tabs.style.display = "none";
      if (emailField) emailField.hidden = true;
      if (pwdField) pwdField.hidden = true;
      if (nickField) nickField.hidden = false;
      submit.textContent = "进入";
      switchLink.innerHTML = "";
    } else if (t === "verify") {
      // 邮箱注册第二步：只留验证码输入
      if (tabs) tabs.style.display = "none";
      if (emailField) emailField.hidden = true;
      if (pwdField) pwdField.hidden = true;
      if (nickField) nickField.hidden = true;
      submit.textContent = "验证并登录";
      switchLink.innerHTML =
        '没收到邮件？<a href="javascript:void(0)" id="rcs-resend-code">重新发送</a>' +
        ' · <a href="javascript:void(0)" id="rcs-to-login">返回登录</a>';
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
    // 顶部「登录 / 注册」标签页按钮也要可点击切换（此前只有底部文字链接能切换，
    // 导致用户点标签页后仍在登录表单，提交被当成登录、出现「不输验证码也能注册」的假象）
    var tabLogin = el("rcs-tab-login");
    if (tabLogin) tabLogin.onclick = function () { setTab("login"); };
    var tabReg = el("rcs-tab-register");
    if (tabReg) tabReg.onclick = function () { setTab("register"); };

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
    var resend = el("rcs-resend-code");
    if (resend) resend.onclick = function (e) {
      e.preventDefault();
      if (resending) return;
      resending = true;
      var old = resend.textContent;
      resend.textContent = "发送中…";
      RCSAuth.resendEmailCode().then(function (r) {
        resending = false;
        resend.textContent = old;
        if (r && r.success) showError("验证码已重新发送，请查收邮箱。");
        else showError((r && r.error && r.error.message) || "重发失败，请稍后再试。");
      });
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
    // 支持「用户名」或「邮箱」两种形式：
    var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var isName = /^[A-Za-z0-9_.@-]{3,32}$/.test(email);
    if (!isEmail && !isName) return "请输入用户名（3-32 位字母、数字或 _ . - @）或邮箱";
    if (!pwd || pwd.length < 8) return "密码至少 8 位";
    if (tab === "register" && (!nick || nick.trim().length === 0)) return "请填写昵称";
    return null;
  }

  async function submitForm(e) {
    e.preventDefault();
    clearError();
    var submitBtn = el("rcs-auth-submit");

    // ① 邮箱注册第二步：提交验证码
    if (tab === "verify") {
      var code = (el("rcs-code").value || "").trim();
      if (!code) { showError("请输入邮箱中的验证码"); return; }
      submitBtn.disabled = true;
      var vr = await RCSAuth.verifyEmailCode(code);
      submitBtn.disabled = false;
      if (vr.success) {
        closeLogin();
        toast("注册成功，欢迎你，" + (vr.data.nick || "朋友"));
      } else {
        showError((vr.error && vr.error.message) || "验证失败，请重试");
      }
      return;
    }

    var email = el("rcs-email").value.trim();
    var pwd = el("rcs-password").value;
    var nick = el("rcs-nick").value.trim();
    var err = validate(email, pwd, nick);
    if (err) {
      showError(err);
      return;
    }
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

    // ② 注册成功但需要邮箱验证码激活 → 切到验证步骤
    if (res.success && res.needVerify) {
      setTab("verify");
      setTimeout(function () {
        var c = el("rcs-code");
        if (c) c.focus();
      }, 50);
      return;
    }

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
      // 退出登录后回到未登录态，残留的下拉菜单引用要清空，避免点击误隐藏已不存在的节点
      currentUserEl = null;
      currentDropdownEl = null;
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
    // 仅绑定一次 document 点击监听；后续渲染只更新目标节点引用，不再累积新监听
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
