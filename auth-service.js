/* ============================================================
   红色文化传播网 · 认证门面（CloudBase Auth 新 SDK）
   全局命名：window.RCSAuth
   登录：auth().signInWithPassword({ username: 账号, password })  // usernamePassword 策略（已开启，账号可为用户名/邮箱/手机号）
   注册：手机号 + 密码。auth().signUp({ phone, password }) 返回 verifyOtp，云端经
        「默认短信通道」下发验证码，提交验证码激活后账号即生效、可直接登录。
        —— 说明：本环境 email provider 强制 signUp→verifyOtp，但 SMTP 未配置、验证码无法送达，
           邮箱注册会死锁；Node SDK 也无服务端建号能力。故注册统一走手机号（自包含，无需 SMTP/SMS 配置）。
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
  // 按 uid 维度存昵称：手机号注册时填写的昵称，云端 updateUser 无法稳定写回
  // getLoginState 可读字段，故用本地存储兜底；按 uid 存可避免换号串昵称。
  function getStoredNickForUid(uid) {
    if (!uid) return "";
    try { return localStorage.getItem(NICK_KEY + ":" + uid) || ""; } catch (e) { return ""; }
  }
  function storeNickForUid(uid, nick) {
    if (!uid || !nick) return;
    try { localStorage.setItem(NICK_KEY + ":" + uid, String(nick)); } catch (e) {}
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

  // 判断账号是否为手机号（注册 / 登录统一用此识别走手机号通道）
  function isPhone(s) {
    return /^1[3-9]\d{9}$/.test(String(s || "").trim());
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
      // 优先云端昵称；云端为空时回退到「按 uid 存的本地昵称」（手机号注册时填写的昵称，
      // 因 Web SDK 的 updateUser 不足以持久化到 getLoginState 可读字段），最后兜底用账号名。
      // 按 uid 存储可避免换号串昵称。
      var nick =
        firstNonEmpty(u.nickName, u.name, u.username) ||
        getStoredNickForUid(u.uid) ||
        nickFromAccount(u.username);
      return { uid: u.uid, nick: nick };
    }
    return { uid: null, nick: null };
  }

  /* 以云端真实会话为准读取当前登录态。
     关键：signInWithPassword 对「不存在 / 未验证邮箱」的账号可能返回带 user 但无 uid 的
     「成功」对象，直接据此报成功会导致导航不刷新、AI 误判未登录。所有登录/注册动作完成后
     都必须用本函数复核真实 uid，避免假成功。 */
  function readSession() {
    try {
      return auth()
        .getLoginState()
        .then(function (ls) {
          return buildState(ls);
        })
        .catch(function () {
          return { uid: null, nick: null };
        });
    } catch (e) {
      return Promise.resolve({ uid: null, nick: null });
    }
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

  // 注册第二步待验证上下文（signUp 后、verifyOtp 前暂存，不持久化）
  var pendingVerify = null;

  function register(phone, password, nickname) {
    // 匿名/昵称模式：直接匿名建号，昵称存本地（无需服务端建号云函数）
    var anon = getMode() === "anonymous" || getMode() === "local";
    if (anon) {
      var nick = nickname || phone || "";
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
    // 手机号 + 密码模式：Web SDK signUp 返回 verifyOtp，云端经「默认短信通道」下发验证码，
    // 提交验证码激活后账号即生效、可直接登录。邮箱注册因 email provider 强制验证且 SMTP 未配置
    // 无法送达，Node SDK 也无服务端建号能力，故注册统一走手机号（自包含，无需 SMTP/SMS 配置）。
    return auth()
      .signUp({ phone: phone, password: password })
      .then(function (res) {
        if (res && res.data && typeof res.data.verifyOtp === "function") {
          pendingVerify = {
            phone: phone,
            nickname: nickname,
            verifyOtp: res.data.verifyOtp,
            resend: typeof res.data.resend === "function" ? res.data.resend : null,
          };
          return { success: true, needVerify: true, data: { phone: phone } };
        }
        // 极少数无需验证的场景：直接建立会话
        return auth()
          .signInWithPassword({ username: phone, password: password })
          .then(function () {
            return readSession().then(function (st) {
              if (!st.uid) {
                return { success: false, error: { code: "AUTH_ERROR", message: "注册成功但自动登录失败，请用新账号登录" } };
              }
              var nk = st.nick || nickname || nickFromAccount(phone);
              storeNick(nk);
              emit(st);
              return { success: true, data: st };
            });
          })
          .catch(function () {
            return { success: false, error: { code: "AUTH_ERROR", message: "注册成功但自动登录失败，请用新账号登录" } };
          });
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  /* 注册第二步：提交短信验证码完成激活并登录 */
  function verifyCode(code) {
    if (!pendingVerify) {
      return Promise.resolve({ success: false, error: { code: "NO_PENDING", message: "验证已失效，请重新注册" } });
    }
    var ctx = pendingVerify;
    return Promise.resolve()
      .then(function () {
        return ctx.verifyOtp({ token: String(code || "").trim() });
      })
      .then(function (res) {
        // SDK 把错误放在返回值的 .error 里而不抛异常，必须显式检查；
        // 否则错误验证码也会被当成成功，用户以为注册成功实则未登录。
        if (res && res.error) {
          return { success: false, error: { code: "AUTH_ERROR", message: "验证码不正确或已失效，请重新输入" } };
        }
        // 以真实会话复核：verifyOtp 返回对象未必含 uid，必须读 getLoginState 确认激活成功
        return readSession().then(function (st) {
          if (!st.uid) {
            return { success: false, error: { code: "AUTH_ERROR", message: "验证码不正确或已失效，请重新输入" } };
          }
          // 优先用注册时填写的昵称：手机号账号在云端没有昵称，buildState 会回退成手机号，
          // 不处理就会在导航栏显示手机号而非昵称。
          var nk = ctx.nickname || st.nick || nickFromAccount(ctx.phone);
          // 按 uid 维度存本地昵称（Web SDK updateUser 无法稳定写回 getLoginState 可读字段，
          // 故用本地兜底；buildState 会在云端为空时回退到这里），保证刷新/下次登录也显示昵称。
          storeNickForUid(st.uid, nk);
          pendingVerify = null;
          emit({ uid: st.uid, nick: nk });
          return { success: true, data: { uid: st.uid, nick: nk } };
        });
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  /* 重新发送短信验证码（仅当 signUp 返回 resend 时可用；手机号注册通常无 resend，前端会提示重注册） */
  function resendCode() {
    if (!pendingVerify || !pendingVerify.resend) {
      return Promise.resolve({
        success: false,
        error: { code: "NO_RESEND", message: "暂不支持重发验证码，请返回重新注册一次。" },
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
    if (anon) {
      return auth()
        .signInAnonymously()
        .then(function (res) {
          var st = { uid: extractUid(res), nick: nickFromAccount(email) };
          emit(st);
          return { success: true, data: st };
        })
        .catch(function (err) {
          return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
        });
    }
    // 手机号账号必须用 signInWithPhoneCodeOrPassword：signInWithPassword 对手机号无效
    // （会返回无 uid 的「成功」对象，触发"账号或密码不正确"假失败）。
    var op = isPhone(email)
      ? auth().signInWithPhoneCodeOrPassword({ phoneNumber: email, password: password })
      : auth().signInWithPassword({ username: email, password: password });
    return op
      .then(function (res) {
        if (res && res.error) {
          return { success: false, error: { code: "AUTH_ERROR", message: (res.error && res.error.message) || "账号或密码不正确" } };
        }
        // 以云端真实会话为准：对「不存在 / 未验证邮箱」的账号可能返回带 user 但无 uid 的
        // 「成功」对象，直接据此报成功会导致导航不刷新、AI 误判未登录。
        return readSession().then(function (st) {
          if (!st.uid) {
            return {
              success: false,
              error: { code: "AUTH_ERROR", message: "账号或密码不正确，或邮箱尚未完成验证" },
            };
          }
          // 云端昵称 → 按 uid 存的本地昵称 → 登录账号名。刻意不回退 getStoredNick()（全局键，
          // 存的是上一个用户的昵称，换账号会串号）；改为按 uid 维度回退，安全且不串号。
          var nick =
            st.nick ||
            getStoredNickForUid(st.uid) ||
            extractNick(res) ||
            nickFromAccount(email);
          storeNickForUid(st.uid, nick);
          emit({ uid: st.uid, nick: nick });
          return { success: true, data: { uid: st.uid, nick: nick } };
        });
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  /* 发送登录用短信验证码（手机号账号登录备用方式，账号已短信验证过，必可用） */
  function sendPhoneLoginCode(phone) {
    return Promise.resolve()
      .then(function () {
        return auth().sendPhoneCode(phone);
      })
      .then(function () {
        return { success: true };
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  /* 手机号 + 短信验证码登录 */
  function loginWithPhoneCode(phone, code) {
    return Promise.resolve()
      .then(function () {
        return auth().signInWithPhoneCodeOrPassword({
          phoneNumber: phone,
          phoneCode: String(code || "").trim(),
        });
      })
      .then(function (res) {
        if (res && res.error) {
          return { success: false, error: { code: "AUTH_ERROR", message: (res.error && res.error.message) || "验证码不正确或已失效" } };
        }
        return readSession().then(function (st) {
          if (!st.uid) {
            return { success: false, error: { code: "AUTH_ERROR", message: "验证码不正确或已失效，请重试" } };
          }
          var nick = st.nick || getStoredNickForUid(st.uid) || nickFromAccount(phone);
          storeNickForUid(st.uid, nick);
          emit({ uid: st.uid, nick: nick });
          return { success: true, data: { uid: st.uid, nick: nick } };
        });
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  function logout() {
    // 必须先 await signOut 真正清除云端会话，再读真实状态；
    // 否则 signOut 未完成时就 readSession，会把旧用户又 emit 回去，导航残留已登录态。
    return Promise.resolve()
      .then(function () {
        try {
          return auth().signOut();
        } catch (e) {
          return null;
        }
      })
      .then(function () {
        try {
          localStorage.removeItem(NICK_KEY);
        } catch (e) {}
        return readSession();
      })
      .then(function (st) {
        emit(st); // 此时应已无 uid
        return { success: true };
      })
      .catch(function () {
        emit({ uid: null, nick: null });
        return { success: true };
      });
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
    verifyCode: verifyCode,
    resendCode: resendCode,
    login: login,
    sendPhoneLoginCode: sendPhoneLoginCode,
    loginWithPhoneCode: loginWithPhoneCode,
    logout: logout,
    getState: getState,
    onAuthChange: onAuthChange,
    getNick: getStoredNick,
    authMode: getMode(),
    init: function () {},
  };
})();
