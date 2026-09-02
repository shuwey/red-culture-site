/* ============================================================
   红色文化传播网 · Cloudflare Pages Functions 前端客户端
   替代 cloudbase-loader.js + cloudbase.bundle.js + cloudbase-config.js
   暴露 window.RCS.getApp() 接口（与旧版同形），但底层调自己的 Workers
   路径：/api/auth/{register,login,logout,me} + /api/{ai-chat,quiz/*,admin/*}
   凭证：HttpOnly cookie 由浏览器自动带，credentials:'include'
   ============================================================ */
(function () {
  "use strict";

  var RCS = window.RCS = window.RCS || {};
  RCS.ENV = "cloudflare-pages"; // 标识后端类型，account-ui 不依赖，但留作日志/排错
  RCS.config = RCS.config || {};
  RCS.config.authMode = "nickname"; // 取代旧的 "phone"
  RCS.config.apiBase = ""; // 同源 Pages Functions；如需改域可在此覆盖
  // Turnstile Site Key（公开）。当前为测试 key，永远通过，便于本地联调；
  // 上线前必须替换为 Cloudflare 控制台 Turnstile widget 的真实 Site Key，
  // 且需与 TURNSTILE_SECRET（后端 secret）配对，否则人机验证不生效。
  RCS.config.turnstileSiteKey = "1x00000000000000000000AA";

  var listeners = [];
  var lastState = null;
  var polling = false;

  function notify(state) {
    lastState = state;
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (e) { /* 单个监听器错误不阻断其他 */ }
    }
  }

  /** 统一 fetch 封装：自动带 cookie + 解析信封 */
  function apiFetch(path, options) {
    options = options || {};
    var url = (RCS.config.apiBase || "") + path;
    var init = {
      method: options.method || "GET",
      credentials: "include",
      headers: Object.assign({ "Content-Type": "application/json" }, options.headers || {}),
    };
    if (options.body !== undefined && typeof options.body !== "string") {
      init.body = JSON.stringify(options.body);
    } else if (typeof options.body === "string") {
      init.body = options.body;
    }
    return fetch(url, init).then(function (res) {
      return res.text().then(function (txt) {
        var body = null;
        try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = null; }
        return { status: res.status, body: body, raw: txt };
      });
    });
  }

  /* ---------------- 登录态轮询 ---------------- */

  function startPolling() {
    if (polling) return;
    polling = true;
    var tries = 0;
    (function tick() {
      apiFetch("/api/auth/me").then(function (r) {
        var u = r.body && r.body.data && r.body.data.user;
        if (u) {
          notify({ uid: u.id, nick: u.nickname });
        } else {
          notify({ uid: null, nick: null });
        }
        // 登录态稳定后 5 分钟再探一次
        setTimeout(tick, 300000);
      }).catch(function () {
        tries++;
        if (tries < 4) setTimeout(tick, 1500); // 前 4 次快速恢复（应对 cloud-lazy 顺序注入）
        else setTimeout(tick, 60000);
      });
    })();
  }

  /* ---------------- auth 适配器 ---------------- */

  function shapeUserFromResult(body) {
    if (!body || !body.data || !body.data.user) return null;
    return { uid: body.data.user.id, nick: body.data.user.nickname };
  }

  var auth = {
    /** 注册：{ nickname, turnstile_token } —— 方案4 无密码 */
    signUp: function (nickname, turnstileToken) {
      return apiFetch("/api/auth/register", {
        method: "POST",
        body: { nickname: nickname, turnstile_token: turnstileToken || "" },
      }).then(function (r) {
        if (r.body && r.body.success) {
          var st = shapeUserFromResult(r.body);
          if (st) notify(st);
          return { success: true, data: { user: r.body.data.user, nick: r.body.data.user.nickname } };
        }
        return { success: false, error: (r.body && r.body.error) || { code: "UNKNOWN", message: "注册失败" } };
      });
    },
    /** 登录：{ nickname, turnstile_token } —— 方案4 无密码 */
    signIn: function (nickname, turnstileToken) {
      return apiFetch("/api/auth/login", {
        method: "POST",
        body: { nickname: nickname, turnstile_token: turnstileToken || "" },
      }).then(function (r) {
        if (r.body && r.body.success) {
          var st = shapeUserFromResult(r.body);
          if (st) notify(st);
          return { success: true, data: { user: r.body.data.user, nick: r.body.data.user.nickname } };
        }
        return { success: false, error: (r.body && r.body.error) || { code: "UNKNOWN", message: "登录失败" } };
      });
    },
    /** 登出 */
    signOut: function () {
      return apiFetch("/api/auth/logout", { method: "POST" }).then(function () {
        notify({ uid: null, nick: null });
        return { success: true };
      });
    },
    /** 读当前登录态：{ uid, nick } 或 null */
    getLoginState: function () {
      return apiFetch("/api/auth/me").then(function (r) {
        if (r.body && r.body.success && r.body.data && r.body.data.user) {
          var u = r.body.data.user;
          return { uid: u.id, nick: u.nickname };
        }
        return null;
      });
    },
    /** 注册登录态变化回调（cloudbase 兼容别名） */
    onAuthChange: function (cb) {
      if (typeof cb === "function") listeners.push(cb);
      // 立刻给一次当前状态（若有）
      if (lastState) {
        try { cb(lastState); } catch (e) {}
      }
    },
  };

  /* ---------------- 兼容旧 callFunction({name, data}) ---------------- */

  var CALL_ROUTES = {
    "ai-chat": { method: "POST", path: "/api/ai-chat" },
    "quiz.save": { method: "POST", path: "/api/quiz/save" },
    "quiz.scores": { method: "GET", path: "/api/quiz/scores" },
    "quiz.rank": { method: "GET", path: "/api/quiz/rank" },
    "admin.correction": { method: "POST", path: "/api/admin/correction" },
    "admin.words.list": { method: "GET", path: "/api/admin/words" },
    "admin.words.add": { method: "POST", path: "/api/admin/words" },
    "admin.words.approve": { method: "POST", path: "/api/admin/words/approve" },
    "admin.words.reject": { method: "POST", path: "/api/admin/words/reject" },
    "admin.words.delete": { method: "POST", path: "/api/admin/words/delete" },
    "admin.corrections.list": { method: "GET", path: "/api/admin/corrections" },
    "admin.corrections.handle": { method: "POST", path: "/api/admin/corrections/handle" },
  };

  function callFunction(opts) {
    opts = opts || {};
    var name = opts.name;
    var data = opts.data || {};
    var route = CALL_ROUTES[name];
    if (!route) {
      return Promise.resolve({
        result: { success: false, error: { code: "UNKNOWN_FUNCTION", message: "未知函数：" + name } },
      });
    }
    // admin.* 调用走 x-admin-token 请求头（后端 checkToken 只读 header，不读 body）
    var headers = {};
    if (name.indexOf("admin.") === 0 && window.RCS_ADMIN_TOKEN) {
      headers["x-admin-token"] = window.RCS_ADMIN_TOKEN;
    }
    return apiFetch(route.path, { method: route.method, body: data, headers: headers }).then(function (r) {
      // 返回结构与 CloudBase SDK 一致：{ result: {success, data, error} }
      if (r.body) return { result: r.body };
      return { result: { success: false, error: { code: "EMPTY", message: "空响应" } } };
    });
  }

  /* ---------------- RCS.getApp() 暴露 ---------------- */

  RCS._app = null;
  RCS.getApp = function () {
    if (!this._app) {
      this._app = {
        auth: auth,
        callFunction: callFunction,
        // 兼容旧 quiz-service.js 的 database.collection('quiz_scores').add(doc)
        // 通过 callFunction 路由，page 不再直接拼 D1
        database: function () { return null; }, // 显式置空，防误用
      };
    }
    return this._app;
  };
  RCS.waitReady = function () { return Promise.resolve(true); };
  RCS.isCloudReady = function () { return true; };

  // 启动登录态轮询
  startPolling();
})();
