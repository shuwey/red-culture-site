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

  function buildState(loginState) {
    var u = loginState && (loginState.user || loginState);
    if (u && u.uid) return { uid: u.uid, nick: getStoredNick() };
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
    // 邮箱/密码模式：前端直接用 Web SDK signUp 建号（v3 Node SDK 已不支持服务端 createUser），成功后自动登录
    // 注意：signUp 参数为 {email, password}，不是 {username, password}（sdkHints: signUp 接受 phone|email）
    return auth()
      .signUp({ email: email, password: password })
      .then(function () {
        return auth()
          .signInWithPassword({ username: email, password: password })
          .then(function (loginRes) {
            storeNick(nickname);
            var state = { uid: extractUid(loginRes), nick: nickname || getStoredNick() };
            emit(state);
            return { success: true, data: state };
          });
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
        var state = { uid: extractUid(res), nick: getStoredNick() };
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
    login: login,
    logout: logout,
    getState: getState,
    onAuthChange: onAuthChange,
    getNick: getStoredNick,
    authMode: getMode(),
    init: function () {},
  };
})();
