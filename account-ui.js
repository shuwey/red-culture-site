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
    '        <label for="rcs-email" id="rcs-email-label">账号</label>' +
    // 登录支持用户名/手机号/邮箱；注册走手机号（自包含短信验证，无需 SMTP）。
    '        <input type="text" id="rcs-email" placeholder="用户名 / 手机号 / 邮箱" autocomplete="username">' +
    "      </div>" +
    '      <div class="rcs-field" id="rcs-password-field">' +
    '        <label for="rcs-password">密码</label>' +
    '        <input type="password" id="rcs-password" placeholder="至少 8 位" autocomplete="current-password">' +
    "      </div>" +
    '      <div class="rcs-field" id="rcs-code-field" hidden>' +
    '        <label for="rcs-code">短信验证码</label>' +
    '        <div class="rcs-code-row">' +
    '          <input type="text" id="rcs-code" placeholder="查收手机短信中的 6 位验证码" autocomplete="one-time-code" maxlength="12" inputmode="numeric">' +
    '          <button type="button" class="pill-btn rcs-send-code" id="rcs-send-code" hidden>获取验证码</button>' +
    "        </div>" +
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

  // 成绩排行榜弹窗（复用 .quiz-modal / .quiz-card）。DOM 由 account-ui.js 统一注入，
  // 排行榜脚本 quiz-rank.js 首次打开时再懒加载，规避在 55 个页面逐条改 <script> 标签，
  // 也绕开红文页 cloud-lazy 的 VER 旁路（版本号只此一处，改 quiz-rank.js 时同步这里即可）。
  var RANK_JS_VER = "20260901a";
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
  var smsMode = false; // 登录页是否处于「手机号 + 短信验证码」模式
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
    return (window.RCS && RCS.config && RCS.config.authMode) || "phone";
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
    if (t !== "login") smsMode = false; // 离开登录页时退出短信模式
    var local = getAuthMode() === "local";
    var emailField = el("rcs-email-field");
    var pwdField = el("rcs-password-field");
    var nickField = el("rcs-nick-field");
    var submit = el("rcs-auth-submit");
    var switchLink = el("rcs-switch");
    var tabs = el("rcs-tabs");
    // 短信验证码输入框只在「验证」步骤显示
    var codeField = el("rcs-code-field");
    if (codeField) codeField.hidden = t !== "verify";

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
      var emailLabel = el("rcs-email-label");
      var emailInput = el("rcs-email");
      if (t === "verify") {
        // 注册第二步：只留短信验证码输入
        if (tabs) tabs.style.display = "none";
        if (emailField) emailField.hidden = true;
        if (pwdField) pwdField.hidden = true;
        if (nickField) nickField.hidden = true;
        submit.textContent = "验证并登录";
        switchLink.innerHTML =
          '没收到短信？<a href="javascript:void(0)" id="rcs-resend-code">重新发送</a>' +
          ' · <a href="javascript:void(0)" id="rcs-to-login">返回登录</a>';
      } else if (t === "login") {
        el("rcs-tab-login").classList.add("active");
        el("rcs-tab-register").classList.remove("active");
        if (nickField) nickField.hidden = true;
        submit.textContent = "登录";
        if (emailLabel) emailLabel.textContent = smsMode ? "手机号" : "账号";
        if (emailInput) emailInput.placeholder = smsMode ? "11 位手机号" : "用户名 / 手机号 / 邮箱";
        if (pwdField) pwdField.hidden = smsMode; // 短信模式隐藏密码框
        if (codeField) codeField.hidden = !smsMode; // 短信模式显示验证码框
        var sendBtn = el("rcs-send-code");
        if (sendBtn) sendBtn.hidden = !smsMode;
        switchLink.innerHTML = smsMode
          ? '<a href="javascript:void(0)" id="rcs-to-pwd-login">用密码登录</a> · 还没有账号？<a href="javascript:void(0)" id="rcs-to-register">去注册</a>'
          : '还没有账号？<a href="javascript:void(0)" id="rcs-to-register">去注册</a> · <a href="javascript:void(0)" id="rcs-to-sms-login">用短信验证码登录 ›</a>';
      } else {
        el("rcs-tab-register").classList.add("active");
        el("rcs-tab-login").classList.remove("active");
        if (nickField) nickField.hidden = false;
        submit.textContent = "注册";
        if (emailLabel) emailLabel.textContent = "手机号";
        if (emailInput) emailInput.placeholder = "11 位手机号";
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
      RCSAuth.resendCode().then(function (r) {
        resending = false;
        resend.textContent = old;
        if (r && r.success) showError("验证码已重新发送，请查收短信。");
        else showError((r && r.error && r.error.message) || "重发失败，请稍后再试。");
      });
    };

    // 登录页：「用短信验证码登录」切换（手机号账号注册后最稳的登录方式）
    // 注意：rcs-sms-line 与 switchLink 里各有一个同名 id="rcs-to-sms-login"（重复 id），
    // 故用 querySelectorAll 给所有匹配元素都绑上处理器，避免 getElementById 只命中隐藏的那个。
    var toSmsAll = document.querySelectorAll("#rcs-to-sms-login");
    if (toSmsAll) {
      toSmsAll.forEach(function (toSms) {
        toSms.onclick = function (e) {
          e.preventDefault();
          smsMode = true;
          setTab("login");
        };
      });
    }
    var toPwd = el("rcs-to-pwd-login");
    if (toPwd) toPwd.onclick = function (e) {
      e.preventDefault();
      smsMode = false;
      setTab("login");
    };
    var sendCode = el("rcs-send-code");
    if (sendCode) sendCode.onclick = function (e) {
      e.preventDefault();
      if (sendCode.disabled) return;
      var phone = (el("rcs-email").value || "").trim();
      if (!/^1[3-9]\d{9}$/.test(phone)) { showError("请输入有效的 11 位手机号"); return; }
      var oldTxt = sendCode.textContent;
      sendCode.textContent = "发送中…";
      RCSAuth.sendPhoneLoginCode(phone).then(function (r) {
        if (r && r.success) {
          showError("验证码已发送，请查收短信。");
          startSendCooldown(sendCode);
        } else {
          sendCode.textContent = oldTxt;
          showError((r && r.error && r.error.message) || "发送失败，请稍后再试。");
        }
      });
    };
  }

  // 获取验证码按钮 60 秒冷却，避免频繁请求
  function startSendCooldown(btn) {
    var left = 60;
    btn.disabled = true;
    btn.textContent = left + " 秒后重发";
    var timer = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = "获取验证码";
      } else {
        btn.textContent = left + " 秒后重发";
      }
    }, 1000);
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
    if (tab === "register") {
      // 注册走手机号（自包含短信验证，无需 SMTP）
      if (!/^1[3-9]\d{9}$/.test(email)) return "请输入有效的 11 位手机号";
    } else if (tab === "login" && smsMode) {
      if (!/^1[3-9]\d{9}$/.test(email)) return "请输入有效的 11 位手机号";
    } else if (!email || !email.trim()) {
      return "请输入账号";
    }
    // 短信验证码登录不需要密码；其余（密码登录 / 注册）密码至少 8 位
    if (!smsMode && (!pwd || pwd.length < 8)) return "密码至少 8 位";
    if (tab === "register" && (!nick || nick.trim().length === 0)) return "请填写昵称";
    return null;
  }

  async function submitForm(e) {
    e.preventDefault();
    clearError();
    var submitBtn = el("rcs-auth-submit");

    // ① 注册第二步：提交短信验证码
    if (tab === "verify") {
      var code = (el("rcs-code").value || "").trim();
      if (!code) { showError("请输入手机短信中的验证码"); return; }
      submitBtn.disabled = true;
      var vr = await RCSAuth.verifyCode(code);
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
      if (tab === "register") {
        res = await RCSAuth.register(email, pwd, nick);
      } else if (smsMode) {
        // 手机号 + 短信验证码登录（注册账号已短信验证，必可用，是密码登录的兜底）
        res = await RCSAuth.loginWithPhoneCode(email, el("rcs-code").value.trim());
      } else {
        res = await RCSAuth.login(email, pwd);
      }
    }
    submitBtn.disabled = false;

    // 注册成功但需短信验证码激活 → 切到验证码步骤（不能直接算登录成功，
    // 否则账号实为未激活、AI 不可用，正是此前被投诉的「假成功」）。
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
      '<button class="nav-dropdown-item" id="rcs-rank-open">🏆 排行榜</button>' +
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
    el("rcs-rank-open").onclick = function () {
      dropdown.hidden = true;
      openRankModal();
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

  // 排行榜脚本懒加载：首次打开才拉 quiz-rank.js，避免 55 页逐条加 script 标签。
  // 版本号集中在 RANK_JS_VER，改 quiz-rank.js 时同步此处即可（不进红文页 VER 旁路）。
  function ensureRankScript(cb) {
    if (window.RCSRank) {
      cb();
      return;
    }
    if (ensureRankScript._loading) return; // 防重复注入
    ensureRankScript._loading = true;
    var s = document.createElement("script");
    s.src = "quiz-rank.js?v=" + RANK_JS_VER;
    s.onload = function () {
      ensureRankScript._loading = false;
      cb();
    };
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
    ensureRankScript(function () {
      if (window.RCSRank) RCSRank.open(); // 内部 loadRank 填 #rank-body
    });
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
      // 区分「真没登录」与「查库被安全规则拒绝」：后者若一律显示「请先登录」会误导排查
      var isNoAuth = res.error && res.error.code === "NO_AUTH";
      var msg = isNoAuth
        ? "请先登录后查看成绩。"
        : "成绩加载失败：" + ((res.error && res.error.message) || "请稍后重试");
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
    if (best) {
      html += '<div class="rcs-best">最佳成绩 <b>' + best.score + " / " + best.total + "</b></div>";
    }
    html += '<ul class="rcs-scores-list">';
    list.forEach(function (r) {
      var d = (r.createdAt || "").replace("T", " ").slice(0, 16);
      var book = r.book ? escapeHtml(r.book) : "首页知识考核";
      html +=
        '<li><span class="sc-score">' +
        r.score +
        "/" +
        r.total +
        '</span><span class="sc-book">' +
        book +
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
    buildRankModal();
    if (window.RCSAuth) {
      RCSAuth.onAuthChange(function (state) {
        renderUserArea(state);
      });
      // CloudBase 会话是**异步恢复**的：静态页上 cloudbase-loader.js（type=module）
      // 异步注入 bundle，而 account-ui.js 是普通脚本先执行，首读 getLoginState()
      // 常拿到空；onLoginStateChanged 又可能在监听真正挂载前就已触发完毕，
      // 于是导航栏一直停在"登录"按钮、永不恢复（红色文学等走 cloud-lazy 顺序注入
      // 的页面因 bundle 先于 ui 加载故不暴露）。这里主动轮询补读，不依赖事件时序。
      var tries = 0;
      (function pollState() {
        RCSAuth.getState().then(function (state) {
          renderUserArea(state);
          tries += 1;
          // 已拿到登录态即停止；未登录最多再试 7 次（约 3s），避免长时间空转
          if ((!state || !state.uid) && tries < 8) setTimeout(pollState, 400);
        });
      })();
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
