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
  var currentUid = null; // 当前已登录 uid（用于刷新昵称时判断会话是否仍有效）

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
  // 按手机号维度再存一份：手机号账号的 u.username 就是手机号本身，buildState 不能拿它当昵称；
  // 同时用手机号维度兜底，可覆盖「注册早于 per-uid 修复」的老账号（同一浏览器即可找回昵称）。
  function getStoredNickForPhone(phone) {
    if (!phone) return "";
    try { return localStorage.getItem(NICK_KEY + ":phone:" + phone) || ""; } catch (e) { return ""; }
  }
  function storeNickForPhone(phone, nick) {
    if (!phone || !nick) return;
    try { localStorage.setItem(NICK_KEY + ":phone:" + phone, String(nick)); } catch (e) {}
  }

  // ===== 云端昵称持久化（user_profile 集合，跨浏览器/设备跟账号走）=====
  // 手机号账号云端无昵称字段、updateUser 无法持久化，昵称只能靠本地存储，换设备会丢。
  // 故新增 user_profile 集合：_id = uid，存 { uid, nickName, updatedAt }。
  // 安全规则：PRIVATE（仅创建者可读写）→ 等价于 doc._openid == auth.uid（_openid 由 Web SDK
  // 在写入时自动置为当前用户 uid）。登录/注册后从云端拉取昵称覆盖本地（跨设备），或把本地真实
  // 昵称回写云端（首次/旧账号补齐）。
  var PROFILE_COLL = "user_profile";
  function profileColl() {
    try { return RCS.getApp().database().collection(PROFILE_COLL); } catch (e) { return null; }
  }
  // 把昵称写入云端（仅当 nick 为真实昵称、非手机号）
  function saveProfileNick(uid, nick) {
    if (!uid || !nick || isPhone(nick)) return Promise.resolve(false);
    var coll = profileColl();
    if (!coll) return Promise.resolve(false);
    try {
      return coll.doc(uid).set({ uid: uid, nickName: nick, updatedAt: Date.now() })
        .then(function () { return true; })
        .catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }
  // 从云端读取昵称；返回 "" 表示无记录或读取出错
  function loadProfileNick(uid) {
    if (!uid) return Promise.resolve("");
    var coll = profileColl();
    if (!coll) return Promise.resolve("");
    try {
      return coll.doc(uid).get()
        .then(function (res) {
          var d = res && res.data;
          if (!d) return "";
          if (Array.isArray(d)) d = d[0];
          var n = d && (d.nickName || d.nick);
          return n ? String(n) : "";
        })
        .catch(function () { return ""; });
    } catch (e) {
      return Promise.resolve("");
    }
  }
  // 登录/注册完成后调用：云端有昵称则拉取覆盖本地（跨设备），否则把本地真实昵称回写云端。
  function refreshNickFromProfile(uid, localNick) {
    if (!uid) return;
    loadProfileNick(uid).then(function (cloudNick) {
      if (cloudNick) {
        storeNickForUid(uid, cloudNick);
        if (currentUid === uid) emit({ uid: uid, nick: cloudNick });
      } else if (localNick && !isPhone(localNick)) {
        saveProfileNick(uid, localNick);
      }
    });
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
      // 优先云端昵称；云端为空时回退到「按 uid/手机号存的本地昵称」（手机号注册时填写的昵称，
      // 因 Web SDK 的 updateUser 不足以持久化到 getLoginState 可读字段），最后兜底用账号名。
      // ⚠ 刻意不在 primary 链里放 u.username：手机号账号的 username 就是手机号本身，
      // 放进去会直接顶掉本地昵称、导致导航栏显示手机号。账号名兜底放到最后一步。
      // 按 uid/手机号存储可避免换号串昵称。
      var nick =
        firstNonEmpty(u.nickName, u.name) ||
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
          var st = buildState(ls);
          currentUid = st.uid;
          if (st.uid) refreshNickFromProfile(st.uid, st.nick);
          return st;
        })
        .catch(function () {
          return { uid: null, nick: null };
        });
    } catch (e) {
      return Promise.resolve({ uid: null, nick: null });
    }
  }

  function emit(state) {
    if (state && state.uid) currentUid = state.uid;
    else if (state && state.uid === null) currentUid = null;
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
          // 同时按手机号存一份，覆盖注册早于本修复的老账号（同一浏览器即可找回昵称）。
          storeNickForUid(st.uid, nk);
          if (ctx.phone) storeNickForPhone(ctx.phone, nk);
          // 落库到云端 user_profile（跨设备跟随账号），并从云端拉取（若其他设备改过昵称则覆盖本地）
          saveProfileNick(st.uid, nk);
          refreshNickFromProfile(st.uid, nk);
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
          // 解析顺序：按 uid 存的本地昵称 → 按手机号存的本地昵称（覆盖老账号）→ buildState 结果
          // （云端昵称或账号名兜底）→ 登录响应里的昵称 → 账号名派生。刻意不回退 getStoredNick()
          // （全局键，存的是上一个用户的昵称，换账号会串号），改为按 uid/手机号维度回退。
          var phoneKeyNick = isPhone(email) ? getStoredNickForPhone(email) : "";
          var nick =
            getStoredNickForUid(st.uid) ||
            phoneKeyNick ||
            st.nick ||
            extractNick(res) ||
            nickFromAccount(email);
          if (nick && !isPhone(nick)) storeNickForUid(st.uid, nick);
          saveProfileNick(st.uid, nick);
          refreshNickFromProfile(st.uid, nick);
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
          var nick =
            getStoredNickForUid(st.uid) ||
            getStoredNickForPhone(phone) ||
            st.nick ||
            nickFromAccount(phone);
          if (nick && !isPhone(nick)) storeNickForUid(st.uid, nick);
          saveProfileNick(st.uid, nick);
          refreshNickFromProfile(st.uid, nick);
          emit({ uid: st.uid, nick: nick });
          return { success: true, data: { uid: st.uid, nick: nick } };
        });
      })
      .catch(function (err) {
        return { success: false, error: { code: "AUTH_ERROR", message: errMsg(err) } };
      });
  }

  /* 修改昵称：同步写本地（per-uid/phone）+ 云端 user_profile；emit 触发 UI 刷新 */
  function setNickname(nick) {
    nick = String(nick || "").trim();
    if (!nick) return Promise.resolve({ success: false, error: { message: "昵称不能为空" } });
    if (isPhone(nick)) return Promise.resolve({ success: false, error: { message: "昵称不能是手机号" } });
    return readSession().then(function (st) {
      if (!st.uid) return { success: false, error: { code: "NO_AUTH", message: "请先登录后再修改昵称" } };
      storeNickForUid(st.uid, nick);
      saveProfileNick(st.uid, nick);
      emit({ uid: st.uid, nick: nick });
      return { success: true, data: { uid: st.uid, nick: nick } };
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
          var st = buildState(loginState);
          currentUid = st.uid;
          if (st.uid) refreshNickFromProfile(st.uid, st.nick);
          return st;
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
    setNickname: setNickname,
    logout: logout,
    getState: getState,
    onAuthChange: onAuthChange,
    getNick: getStoredNick,
    authMode: getMode(),
    init: function () {},
  };
})();
