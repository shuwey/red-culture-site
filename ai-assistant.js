/* ============================================================
   红色文化传播网 · AI 问答助手（悬浮球 + 聊天面板）
   全局命名：window.RCAI
   依赖：RCS.getApp().callFunction('ai-chat', ...)（CloudBase 云函数）、data/corpus.json（本地检索）
   ============================================================ */
(function () {
  "use strict";

  var CORPUS_URL = "data/corpus.json";
  var corpusCache = null;
  var corpusLoading = null;
  var history = []; // 最近 4 轮（8 条消息）
  var firstOpen = true;

  var CHIPS = [
    "讲讲赵一曼的故事",
    "遵义会议有什么意义？",
    "杨靖宇是在哪里牺牲的？",
  ];

  function el(id) {
    return document.getElementById(id);
  }

  function injectRoot() {
    if (el("rcs-ai-root")) return;
    var root = document.createElement("div");
    root.id = "rcs-ai-root";
    root.innerHTML =
      '<button class="rcs-ai-fab" id="rcs-ai-fab" aria-label="打开红色历史问答助手" title="红色历史问答助手">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>' +
      "</button>" +
      '<section class="rcs-ai-panel" id="rcs-ai-panel" aria-label="红色历史问答助手" hidden>' +
      '<header class="rcs-ai-header">' +
      '<span class="rcs-ai-title">红色历史问答助手</span>' +
      '<button class="rcs-ai-close" id="rcs-ai-close" aria-label="关闭">×</button>' +
      "</header>" +
      '<div class="rcs-ai-body" id="rcs-ai-body"></div>' +
      '<div class="rcs-ai-chips" id="rcs-ai-chips"></div>' +
      '<div class="rcs-ai-input">' +
      '<textarea id="rcs-ai-text" rows="1" placeholder="向助手提问，如：杨靖宇是在哪里牺牲的？"></textarea>' +
      '<button class="rcs-ai-send" id="rcs-ai-send" aria-label="发送">发送</button>' +
      "</div>" +
      "</section>";
    document.body.appendChild(root);

    el("rcs-ai-fab").onclick = openPanel;
    el("rcs-ai-close").onclick = closePanel;
    el("rcs-ai-send").onclick = function () {
      var t = el("rcs-ai-text");
      var v = t.value.trim();
      if (v) {
        t.value = "";
        t.style.height = "auto";
        ask(v);
      }
    };
    var ta = el("rcs-ai-text");
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        var v = ta.value.trim();
        if (v) {
          ta.value = "";
          ta.style.height = "auto";
          ask(v);
        }
      }
    });
    ta.addEventListener("input", function () {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    });

    var chipsWrap = el("rcs-ai-chips");
    CHIPS.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "rcs-chip";
      b.textContent = c;
      b.onclick = function () {
        ask(c);
      };
      chipsWrap.appendChild(b);
    });
  }

  function openPanel() {
    injectRoot();
    var panel = el("rcs-ai-panel");
    panel.hidden = false;
    el("rcs-ai-fab").classList.add("active");
    if (firstOpen) {
      firstOpen = false;
      addAssistantBubble(
        "你好！我是红色历史问答助手，可以依据本站史料回答英雄、地点、事件相关问题。试试下面的提问 👇",
        []
      );
    }
    setTimeout(function () {
      var t = el("rcs-ai-text");
      if (t) t.focus();
    }, 60);
  }

  function closePanel() {
    var panel = el("rcs-ai-panel");
    if (panel) panel.hidden = true;
    var fab = el("rcs-ai-fab");
    if (fab) fab.classList.remove("active");
  }

  function addUserBubble(text) {
    var body = el("rcs-ai-body");
    var msg = document.createElement("div");
    msg.className = "rcs-msg rcs-msg-user";
    var bubble = document.createElement("div");
    bubble.className = "rcs-bubble";
    bubble.textContent = text;
    msg.appendChild(bubble);
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  function addAssistantBubble(text, sources) {
    var body = el("rcs-ai-body");
    var msg = document.createElement("div");
    msg.className = "rcs-msg rcs-msg-assistant";
    var bubble = document.createElement("div");
    bubble.className = "rcs-bubble";
    // 去掉模型可能附带的兜底式「查看：… ›」行，统一由下方来源链接呈现
    var clean = String(text || "").replace(/\n?查看：[^\n]*›\s*$/, "").trim();
    bubble.textContent = clean;
    msg.appendChild(bubble);
    if (sources && sources.length) {
      var srcWrap = document.createElement("div");
      srcWrap.className = "rcs-sources";
      sources.forEach(function (s) {
        var a = document.createElement("a");
        a.className = "text-link sm";
        a.href = s.url || "#";
        a.textContent = "查看：" + (s.title || "原文") + " ›";
        srcWrap.appendChild(a);
      });
      msg.appendChild(srcWrap);
    }
    // 纠错入口：每条回答可反馈史料错误（提交至 corrections 集合，待运营审核）
    var fixBtn = document.createElement("button");
    fixBtn.type = "button";
    fixBtn.className = "rcs-fix-btn";
    fixBtn.textContent = "纠错";
    fixBtn.onclick = function () {
      openCorrectionModal(sources && sources.length ? sources[0].title : "");
    };
    msg.appendChild(fixBtn);
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  /* ---------- 用户纠错入口（P2） ---------- */
  var _fixStyleInjected = false;
  function injectFixStyle() {
    if (_fixStyleInjected) return;
    _fixStyleInjected = true;
    var css =
      ".rcs-fix-btn{display:inline-block;margin-top:6px;font-size:12px;color:#b3261e;" +
      "background:transparent;border:1px solid #e7b7b3;border-radius:10px;padding:1px 10px;cursor:pointer;}" +
      ".rcs-fix-btn:hover{background:#fdf0ef;}" +
      ".rcs-fix-mask{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;" +
      "align-items:center;justify-content:center;z-index:99999;}" +
      ".rcs-fix-box{background:#fff;width:min(420px,92vw);border-radius:14px;padding:20px 22px;" +
      "box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:inherit;}" +
      ".rcs-fix-box h3{margin:0 0 14px;font-size:16px;color:#9c1c14;}" +
      ".rcs-fix-box label{display:block;font-size:13px;color:#555;margin:10px 0 4px;}" +
      ".rcs-fix-box select,.rcs-fix-box input,.rcs-fix-box textarea{width:100%;box-sizing:border-box;" +
      "border:1px solid #d9d9d9;border-radius:8px;padding:8px 10px;font-size:14px;font-family:inherit;}" +
      ".rcs-fix-box textarea{resize:vertical;min-height:72px;}" +
      ".rcs-fix-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:16px;}" +
      ".rcs-fix-actions button{border:none;border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer;}" +
      ".rcs-fix-cancel{background:#eee;color:#555;}" +
      ".rcs-fix-submit{background:#9c1c14;color:#fff;}" +
      ".rcs-fix-tip{margin-top:12px;font-size:13px;min-height:18px;}" +
      ".rcs-fix-tip.ok{color:#2e7d32;}.rcs-fix-tip.err{color:#c62828;}";
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
  }

  function openCorrectionModal(quote) {
    injectFixStyle();
    if (el("rcs-fix-mask")) return; // 防重复
    var mask = document.createElement("div");
    mask.id = "rcs-fix-mask";
    mask.className = "rcs-fix-mask";
    mask.innerHTML =
      '<div class="rcs-fix-box" role="dialog" aria-label="纠错反馈">' +
      "<h3>反馈史料纠错</h3>" +
      '<label>纠错类型</label>' +
      '<select id="rcs-fix-type"><option value="英雄">英雄人物</option>' +
      '<option value="地点">红色地点</option><option value="事件">历史事件</option>' +
      '<option value="通用">通用</option></select>' +
      '<label>相关史料 / 标题</label>' +
      '<input id="rcs-fix-quote" value="' +
      (quote || "").replace(/"/g, "&quot;") +
      '" placeholder="如：刘胡兰" />' +
      '<label>问题描述（必填）</label>' +
      '<textarea id="rcs-fix-desc" placeholder="请描述发现的错误或需要补充的内容"></textarea>' +
      '<label>联系方式（选填）</label>' +
      '<input id="rcs-fix-contact" placeholder="邮箱或电话，方便我们回复" />' +
      '<div class="rcs-fix-actions">' +
      '<button class="rcs-fix-cancel" id="rcs-fix-cancel">取消</button>' +
      '<button class="rcs-fix-submit" id="rcs-fix-submit">提交</button>' +
      "</div>" +
      '<div class="rcs-fix-tip" id="rcs-fix-tip"></div>' +
      "</div>";
    document.body.appendChild(mask);
    mask.onclick = function (e) {
      if (e.target === mask) closeCorrectionModal();
    };
    el("rcs-fix-cancel").onclick = closeCorrectionModal;
    el("rcs-fix-submit").onclick = submitCorrection;
  }

  function closeCorrectionModal() {
    var m = el("rcs-fix-mask");
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }

  /* 确保有登录态（匿名亦可），返回 uid 用于留痕；失败则返回空串（不阻断提交） */
  async function ensureUid() {
    return await ensureAnyUid();
  }

  /* 未登录引导气泡：附「去登录」按钮，点击直接唤起登录面板 */
  function addLoginPrompt(text) {
    var body = el("rcs-ai-body");
    var msg = document.createElement("div");
    msg.className = "rcs-msg rcs-msg-assistant";
    var bubble = document.createElement("div");
    bubble.className = "rcs-bubble";
    bubble.textContent = text;
    msg.appendChild(bubble);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rcs-login-cta";
    btn.textContent = "去登录";
    btn.onclick = function () {
      if (window.RCSAccount && typeof RCSAccount.openLogin === "function") {
        RCSAccount.openLogin();
      }
    };
    msg.appendChild(btn);
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  async function submitCorrection() {
    var desc = (el("rcs-fix-desc").value || "").trim();
    var tip = el("rcs-fix-tip");
    if (!desc) {
      tip.className = "rcs-fix-tip err";
      tip.textContent = "请填写问题描述";
      return;
    }
    var uid = await ensureUid();
    try {
      var app = RCS.getApp();
      var res = await app.callFunction({
        name: "admin",
        data: {
          action: "correction.submit",
          contentType: el("rcs-fix-type").value,
          quote: (el("rcs-fix-quote").value || "").trim(),
          description: desc,
          contact: (el("rcs-fix-contact").value || "").trim(),
          uid: uid || "",
        },
      });
      var result = res.result;
      if (result && result.success) {
        tip.className = "rcs-fix-tip ok";
        tip.textContent = "已提交，感谢您的反馈！我们会尽快核实。";
        setTimeout(closeCorrectionModal, 1400);
      } else {
        tip.className = "rcs-fix-tip err";
        tip.textContent = "提交失败：" + ((result && result.error && result.error.message) || "未知错误");
      }
    } catch (e) {
      tip.className = "rcs-fix-tip err";
      tip.textContent = "提交失败，请稍后再试。";
    }
  }

  function addTyping() {
    var body = el("rcs-ai-body");
    var msg = document.createElement("div");
    msg.className = "rcs-msg rcs-msg-assistant rcs-typing";
    msg.innerHTML =
      '<div class="rcs-bubble"><span class="rcs-dot"></span><span class="rcs-dot"></span><span class="rcs-dot"></span></div>';
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    return msg;
  }

  async function ensureCorpus() {
    if (corpusCache) return corpusCache;
    if (corpusLoading) return corpusLoading;
    corpusLoading = fetch(CORPUS_URL)
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        corpusCache = d && d.items ? d : { items: [] };
        return corpusCache;
      })
      .catch(function () {
        corpusCache = { items: [] };
        return corpusCache;
      });
    return corpusLoading;
  }

  function norm(s) {
    return String(s || "").toLowerCase();
  }
  function bigrams(s) {
    s = norm(s).replace(/[^一-龥a-z0-9]/g, "");
    var out = [];
    for (var i = 0; i < s.length - 1; i++) out.push(s.substr(i, 2));
    return out;
  }

  /** 检索打分：name×5 + aliases×4 + keywords×3 + text bigram 共现×1，取 top3 */
  function retrieve(question, items) {
    var q = norm(question);
    var qbg = bigrams(question);
    var scored = items
      .map(function (it) {
        var name = norm(it.name);
        var aliases = (it.aliases || []).map(norm);
        var keywords = (it.keywords || []).map(norm);
        var score = 0;
        if (name && q.indexOf(name) !== -1) score += 5;
        aliases.forEach(function (a) {
          if (a && q.indexOf(a) !== -1) score += 4;
        });
        keywords.forEach(function (k) {
          if (k && q.indexOf(k) !== -1) score += 3;
        });
        var tbg = bigrams(it.text || "").concat(bigrams(it.name || ""));
        var hit = 0;
        qbg.forEach(function (b) {
          if (b && tbg.indexOf(b) !== -1) hit++;
        });
        score += hit;
        return { it: it, score: score };
      })
      .filter(function (x) {
        return x.score > 0;
      });
    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    return scored.slice(0, 3).map(function (x) {
      return {
        id: x.it.id,
        title: x.it.name,
        url: x.it.url,
        text: x.it.text || x.it.summary || "",
      };
    });
  }

  function ask(text) {
    injectRoot();
    if (el("rcs-ai-panel").hidden) openPanel();
    addUserBubble(text);
    var typing = addTyping();
    ensureCorpus().then(function (corpus) {
      var contexts = retrieve(text, corpus.items || []);
      callAI(text, contexts, typing);
    });
  }

  /* ------------------------------------------------------------
     错误提示：按类型区分，避免「一刀切」掩盖真实原因
     背景：此前所有失败（未登录/超时/网络/SDK未就绪/上游错误）都显示
          同一句「助手开小差了」，导致真实故障（未登录被鉴权拒绝）长期无法定位。
     ------------------------------------------------------------ */
  var ERR_MSG = {
    UNAUTHENTICATED: "AI 助手需要登录后才能使用，登录后即可继续提问。",
    SDK_NOT_READY: "云能力尚未加载完成，请稍候几秒后重试。",
    TIMEOUT: "模型响应超时，请稍后再试。",
    UPSTREAM: "AI 服务暂时不可用，请稍后再试。",
    UNKNOWN: "助手开小差了，请稍后再试。",
  };

  /* 等待云 SDK 就绪
     原因：cloudbase-loader 动态插入的 <script> 是异步加载的，
           其派发的 cloudbase-ready 事件可能早于 SDK 真正挂载（实测确认）。
           这里改为轮询 window.cloudbase，不再依赖该事件。 */
  function waitCloudReady(maxMs) {
    return new Promise(function (resolve, reject) {
      if (typeof window.cloudbase !== "undefined") return resolve();
      var waited = 0,
        step = 200;
      var t = setInterval(function () {
        waited += step;
        if (typeof window.cloudbase !== "undefined") {
          clearInterval(t);
          resolve();
        } else if (waited >= maxMs) {
          clearInterval(t);
          reject(new Error("SDK_NOT_READY"));
        }
      }, step);
    });
  }

  function uidOf(st) {
    if (!st) return "";
    return st.uid || (st.user && st.user.uid) || "";
  }

  /* 建立登录态（含匿名兜底），返回 uid；失败返回空串，不阻断调用方。
     用途：纠错留痕等非阻断场景。 */
  async function ensureAnyUid() {
    try {
      await waitCloudReady(8000);
      var auth = RCS.getApp().auth();
      var uid = uidOf(await auth.getLoginState());
      if (uid) return uid;
      await auth.signInAnonymously();
      return uidOf(await auth.getLoginState());
    } catch (e) {
      return "";
    }
  }

  /* 是否已登录。
     注意：云函数安全规则为 auth != null && auth.loginType != 'ANONYMOUS'，
     匿名身份调用会被 EXCEED_AUTHORITY 拒绝，因此这里不再尝试匿名登录——
     未登录直接引导用户登录，避免一次注定失败的请求。 */
  async function isLoggedIn() {
    try {
      await waitCloudReady(8000);
      return !!uidOf(await RCS.getApp().auth().getLoginState());
    } catch (e) {
      return false;
    }
  }

  /* 错误归一化：把 SDK 抛出的各种形态统一成可识别类型 */
  function classifyError(e) {
    var msg = (e && e.message) || "";
    if (e && e.rcsCode) return e.rcsCode;
    var raw = msg;
    try {
      raw = JSON.stringify(e) || msg;
    } catch (_) {
      /* 循环引用等，回退用 message */
    }
    // EXCEED_AUTHORITY：安全规则拒绝了匿名身份，等同「未登录」
    if (
      raw.indexOf("unauthenticated") !== -1 ||
      raw.indexOf("credentials not found") !== -1 ||
      raw.indexOf("EXCEED_AUTHORITY") !== -1
    )
      return "UNAUTHENTICATED";
    if (msg.indexOf("SDK_NOT_READY") !== -1) return "SDK_NOT_READY";
    if (msg.indexOf("TIMEOUT") !== -1) return "TIMEOUT";
    return "UNKNOWN";
  }

  /* 单次云函数调用 */
  async function callAIOnce(question, contexts) {
    var app = RCS.getApp();
    var res = await app.callFunction({
      name: "ai-chat",
      data: {
        question: question,
        history: history.slice(-8),
        contexts: contexts,
      },
    });
    return res.result; // {success, data:{answer,sources}, error:{code,message}}
  }

  async function callAI(question, contexts, typing) {
    try {
      // ① 关键修复：云函数安全规则禁止匿名调用，未登录直接引导登录，不发注定失败的请求
      if (!(await isLoggedIn())) {
        if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
        addLoginPrompt(ERR_MSG.UNAUTHENTICATED);
        return;
      }

      var result = null;
      try {
        result = await callAIOnce(question, contexts);
      } catch (e1) {
        var k1 = classifyError(e1);
        // ② 瞬时错误重试一次（审计日志显示：上游抖动重试即成功）
        if (k1 === "TIMEOUT" || k1 === "UNKNOWN") {
          await new Promise(function (r) {
            setTimeout(r, 600);
          });
          result = await callAIOnce(question, contexts);
        } else {
          throw e1;
        }
      }

      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);

      if (result && result.success) {
        addAssistantBubble(result.data.answer, result.data.sources || []);
        history.push({ role: "user", content: question });
        history.push({ role: "assistant", content: result.data.answer });
        if (history.length > 8) history = history.slice(-8);
        return;
      }

      // ③ 业务层错误码分类提示
      var code = result && result.error && result.error.code;
      if (code === "SENSITIVE" || code === "NO_CONTEXT" || code === "NO_GROUNDED" || code === "INVALID_PARAM") {
        addAssistantBubble(result.error.message, []);
      } else if (code === "TIMEOUT") {
        addAssistantBubble(ERR_MSG.TIMEOUT, []);
      } else if (code === "UPSTREAM_ERROR") {
        addAssistantBubble(ERR_MSG.UPSTREAM, []);
      } else {
        addAssistantBubble(ERR_MSG.UNKNOWN, []);
      }
    } catch (e) {
      var kind = classifyError(e);
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      addAssistantBubble(ERR_MSG[kind] || ERR_MSG.UNKNOWN, []);
      // 保留真实错误，便于后续排查（此前被静默吞掉）
      if (window.console && console.error) console.error("[RCS-AI] 调用失败:", kind, e);
    }
  }

  window.RCAI = {
    open: openPanel,
    close: closePanel,
    ask: ask,
    init: injectRoot,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectRoot);
  } else {
    injectRoot();
  }
})();
