/* ============================================================
   红色文化传播网 · 认证门面（CloudBase Auth 双模）
   全局命名：window.RCSAuth
   对外仅暴露 register/login/logout/getState/onAuthChange，UI 零感知实现差异。
   email 模式    ：signUpWithEmailAndPassword / signInWithEmailAndPassword
   anonymous 模式：anonymousAuthProvider().signIn()
   昵称演示版存 localStorage(rcs_nick)，主身份以 CloudBase 为准。
   ============================================================ */
(function () {
  "use strict";

  var NICK_KEY = "rcs_nick"; // 匿名/展示昵称兜底
  var subscribers = [];
  var cloudListenerAttached = false;

  /** 读取本地展示昵称 */
  function getStoredNick() {
    try {
      return localStorage.getItem(NICK_KEY) || "";
    } catch (e) {
      return "";
    }
  }
  function storeNick(nick) {
    try {
      if (nick) localStorage.setItem(NICK_KEY, String(nick));
    } catch (e) {}
  }

  function getMode() {
    return (window.RCS && RCS.config && RCS.config.authMode) || "email";
  }

  function auth() {
    return RCS.getApp().auth();
  }

  function buildState(loginState) {
    if (loginState && loginState.user) {
      return { uid: loginState.user.uid, nick: getStoredNick() };
    }
    return { uid: null, nick: null };
  }

  function emit(state) {
    subscribers.forEach(function (cb) {
      try {
        cb(state);
      } catch (e) {
        console.error(e);
      }
    });
  }

  /** 订阅 CloudBase 登录态变化（仅挂载一次） */
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
    return null;
  }

  function errMsg(err) {
    if (!err) return "操作失败，请重试";
    var m = err.message || String(err);
    if (/email has been registered|already|E11000/i.test(m))
      return "该邮箱已注册，请直接登录";
    if (/password|invalid|INVALID/i.test(m)) return "邮箱或密码不正确";
    if (/not exist|no such|找不到|不存在/i.test(m)) return "账号不存在，请先注册";
    if (/email|邮箱/i.test(m)) return "邮箱格式或验证有误";
    return m || "操作失败，请重试";
  }

  /** 注册（email 模式；anonymous 降级直接匿名登录） */
  function register(email, password, nickname) {
    if (getMode() === "anonymous") {
      return login();
    }
    return auth()
      .signUpWithEmailAndPassword(email, password)
      .then(function (res) {
        storeNick(nickname);
        var state = { uid: extractUid(res), nick: nickname || getStoredNick() };
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

  /** 登录（email 模式用邮箱密码；anonymous 模式静默建号） */
  function login(email, password) {
    var op =
      getMode() === "anonymous"
        ? auth().anonymousAuthProvider().signIn()
        : auth().signInWithEmailAndPassword(email, password);
    return op
      .then(function (res) {
        var state = { uid: extractUid(res), nick: getStoredNick() };
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

  function logout() {
    try {
      auth().signOut();
    } catch (e) {}
    try {
      localStorage.removeItem(NICK_KEY);
    } catch (e) {}
    emit({ uid: null, nick: null });
    return Promise.resolve({ success: true });
  }

  /** 当前登录态：返回 {uid, nick}（无登录返回 {uid:null,nick:null}） */
  function getState() {
    try {
      return auth()
        .getLoginState()
        .then(function (loginState) {
          if (loginState && loginState.user) {
            return { uid: loginState.user.uid, nick: getStoredNick() };
          }
          return { uid: null, nick: null };
        })
        .catch(function () {
          return { uid: null, nick: null };
        });
    } catch (e) {
      return Promise.resolve({ uid: null, nick: null });
    }
  }

  /** 订阅登录态变化（驱动导航栏用户区渲染） */
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
