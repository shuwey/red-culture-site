/* ============================================================
   红色文化传播网 · 认证门面（CloudBase Auth 新 SDK）
   全局命名：window.RCSAuth
   登录：auth().signInWithPassword({ username: email, password })  // usernamePassword 策略（已开启）
   注册：auth().signUp({ username, password }) 后自动登录（v3 前端直连，Node SDK 已不支持服务端 createUser）
   匿名：auth().signInAnonymously()
   对外接口保持不变：register / login / logout / getState / onAuthChange
   ============================================================ */
(function () {
  "use strict";

  var NICK_KEY = "rcs_nick"; // 匿名/展示昵称兜底
  var subscribers = [];
  var cloudListenerAttached = false;
  // 邮箱注册待验证上下文（signUp 后、verifyOtp 前暂存，不持久化）
  var pendingVerify = null;

  function getStoredNick() {
    try { return localStorage.getItem(NICK_KEY) || ""; } catch (e) { return ""; }
  }
  function storeNick(nick) {
    try { if (nick) localStorage.setItem(NICK_KEY, String(nick)); } catch (e) {}
  }

  function getMode() {
    return (window.RCS && RCS.config && RCS.config.authMode) || "email";
  }

  function auth() {
    return RCS.getApp().auth();
  }

  /* 取参数中第一个非空值。
     ⚠ 刻意不回退本地存储：localStorage 里存的是「上一个」用户的昵称，
     在同一浏览器换账号登录时会串号（原本 A 登录后仍显示 B 的名字）。
     调用方需自己决定兜底顺序。 */
  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v && String(v).trim()) return String(v).trim();
    }
    return "";
  }

  /* 登录账号名 → 展示用昵称（邮箱取 @ 前部分，避免把完整邮箱顶在导航栏） */
  function nickFromAccount(account) {
    var a = String(account || "").trim();
    if (!a) return "";
    var at = a.indexOf("@");
    return at > 0 ? a.slice(0, at) : a;
  }

  /* 从登录/注册响应中提取昵称（只用云端数据） */
  function extractNick(res) {
    var u = res && res.data && res.data.user;
    var meta = (u && u.user_metadata) || {};
    return firstNonEmpty(
      meta.nickName, meta.name, meta.username,
      u && u.name, u && u.username
    );
  }

  function buildState(loginState) {
    var u = loginState && (loginState.user || loginState);
    if (u && u.uid) {
      // 同样只用云端数据，兜底用账号名，避免刷新后串到上一个用户的昵称
      var nick = firstNonEmpty(u.nickName, u.name, u.username) || nickFromAccount(u.username);
      return { uid: u.uid, nick: nick };
    }
    return { uid: null, nick: null };
  }

  function emit(state) {
    subscribers.forEach(function (cb) {
      try { cb(state); } catch (e) { console.error(e); }
    });
  }

  function ensureCloudListener() {
    if (cloudListenerAttached) return;
    cloudListenerAttached = true;
    try {
      auth().onLoginStateChanged(function (loginState) {
        emit(buildState(loginState));
      });
    } catch (e) {
      console.error("RCSAuth: 订阅登录态失败", e);
    }
  }

  function extractUid(res) {
    if (!res) return null;
    if (res.user && res.user.uid) return res.user.uid;
    if (res.uid) return res.uid;
    if (res.result && res.result.user && res.result.user.uid) return res.result.user.uid;
    // 新版 SDK 登录响应形如 { data:{ user:{ id, user_metadata:{ uid } } } }：
    // 顶层用户对象用的是 id 而非 uid，uid 在 user_metadata 里。
    // 缺了这两条会导致登录成功后 uid 取不到、导航用户区不刷新（长期遗留问题）。
    if (res.data && res.data.user) {
      var u = res.data.user;
      if (u.uid) return u.uid;
      if (u.id) return u.id;
      if (u.user_metadata && u.user_metadata.uid) return u.user_metadata.uid;
    }
    return null;
  }

  function errMsg(err) {
    if (!err) return "操作失败，请重试";
    var m = err.message || String(err);
    if (/already|已注册|existed|E11000|duplicate/i.test(m)) return "该账号已注册，请直接登录";
    if (/password|invalid|INVALID|不正确/i.test(m)) return "账号或密码不正确";
    if (/not exist|no such|不存在|找不到/i.test(m)) return "账号不存在，请先注册";
    return m || "操作失败，请重试";
  }

  function register(email, password, nickname) {
    // 匿名/昵称模式：直接匿名建号，昵称存本地（无需服务端建号云函数）
    var anon = getMode() === "anonymous" || getMode() === "local";
    if (anon) {
      var nick = nickname || email || "";
      return auth()
        .signInAnonymously()
        .then(function (res) {
          storeNick(nick);
          var state = { uid: extractUid(res), nick: nick };
          emit(state);
          return { success: true, data: state };
        })
        .catch(function (err) {
          return {
            success: false,
            error: { code: "AUTH_ERROR", message: errMsg(err) },
          };
        });
    }
    // 邮箱/密码模式：前端直接用 Web SDK signUp 建号（v3 Node SDK 已不支持服务端 createUser）
    // 注意：signUp 参数为 {email, password}，不是 {username, password}（sdkHints: signUp 接受 phone|email）
    //
    // 重要：邮箱登录开启后，signUp 返回 { data:{ verifyOtp, resend }, error:null }，
    // 此时账号尚未激活，必须经邮箱验证码确认；若仍照旧直接 signInWithPassword 会因
    // 邮箱未验证而失败，用户会看到「注册失败」——实际账号已创建，只是卡在验证环节。
    return auth()
      .signUp({ email: email, password: password })
      .then(function (res) {
        if (res && res.data && typeof res.data.verifyOtp === "function") {
          pendingVerify = {
            email: email,
            nickname: nickname,
            verifyOtp: res.data.verifyOtp,
            resend: res.data.resend,
          };
          return { success: true, needVerify: true, data: { email: email } };
        }
        // 无需验证（环境配置为免验证建号）：照旧自动登录
        return auth()
          .signInWithPassword({ username: email, password: password })
          .then(function (loginRes) {
            var nick = extractNick(loginRes) || nickname || nickFromAccount(email);
            storeNick(nick);
            var state = { uid: extractUid(loginRes), nick: nick };
            emit(state);
            return { success: true, data: state };
          });
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  /* 邮箱注册第二步：提交验证码完成激活并登录 */
  function verifyEmailCode(code) {
    if (!pendingVerify) {
      return Promise.resolve({
        success: false,
        error: { code: "NO_PENDING", message: "验证已失效，请重新注册" },
      });
    }
    var ctx = pendingVerify;
    return Promise.resolve()
      .then(function () {
        return ctx.verifyOtp({ token: String(code || "").trim() });
      })
      .then(function (res) {
        // SDK 把错误放在返回值的 .error 里而不抛异常，必须显式检查；
        // 否则错误验证码也会被当成成功，用户以为注册成功实则未登录。
        // 注：不走 errMsg 通用映射——SDK 报错含 invalid 等字样会被误译作
        // 「账号或密码不正确」，在验证码场景下会误导用户。
        if (res && res.error) {
          return {
            success: false,
            error: { code: "AUTH_ERROR", message: "验证码不正确或已失效，请重新输入" },
          };
        }
        var uid = extractUid(res);
        if (!uid) {
          return {
            success: false,
            error: { code: "AUTH_ERROR", message: "验证码不正确或已失效，请重新输入" },
          };
        }
        // 云端昵称为准，其次用注册时填写的昵称
        var nick = extractNick(res) || ctx.nickname || nickFromAccount(ctx.email);
        storeNick(nick);
        var state = { uid: uid, nick: nick };
        pendingVerify = null;
        emit(state);
        return { success: true, data: state };
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  /* 重新发送邮箱验证码 */
  function resendEmailCode() {
    if (!pendingVerify || typeof pendingVerify.resend !== "function") {
      return Promise.resolve({
        success: false,
        // signUp 返回的 data 仅含 verifyOtp（无 resend），故重发不可用，
        // 提示改为可操作：让用户返回重新注册以触发新验证码。
        error: {
          code: "NO_RESEND",
          message: "当前无法重发验证码，请点击「返回登录」后重新注册一次。",
        },
      });
    }
    return Promise.resolve()
      .then(function () {
        return pendingVerify.resend();
      })
      .then(function () {
        return { success: true };
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  function login(email, password) {
    var anon = getMode() === "anonymous" || getMode() === "local";
    var op = anon
      ? auth().signInAnonymously()
      : auth().signInWithPassword({ username: email, password: password });
    return op
      .then(function (res) {
        // 云端昵称 → 登录账号名。刻意不回退 getStoredNick()：
        // 本地存的是上一个用户的昵称，换账号登录会导致显示错人。
        var nick = extractNick(res) || nickFromAccount(email);
        storeNick(nick);
        var state = { uid: extractUid(res), nick: nick };
        emit(state);
        return { success: true, data: state };
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  function logout() {
    try { auth().signOut(); } catch (e) {}
    try { localStorage.removeItem(NICK_KEY); } catch (e) {}
    emit({ uid: null, nick: null });
    return Promise.resolve({ success: true });
  }

  function getState() {
    try {
      return auth()
        .getLoginState()
        .then(function (loginState) {
          return buildState(loginState);
        })
        .catch(function () {
          return { uid: null, nick: null };
        });
    } catch (e) {
      return Promise.resolve({ uid: null, nick: null });
    }
  }

  function onAuthChange(cb) {
    if (typeof cb === "function") {
      subscribers.push(cb);
      ensureCloudListener();
    }
  }

  window.RCSAuth = {
    register: register,
    verifyEmailCode: verifyEmailCode,
    resendEmailCode: resendEmailCode,
    login: login,
    logout: logout,
    getState: getState,
    onAuthChange: onAuthChange,
    getNick: getStoredNick,
    authMode: getMode(),
    init: function () {},
  };
})();
