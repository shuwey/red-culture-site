/* ============================================================
   红色文化传播网 · AI 问答助手（2026-09-02 Cloudflare 全迁版）
   - 不再依赖 window.cloudbase SDK
   - 直接调 RCS.getApp().callFunction({name: 'ai-chat', data})
   - 登录态用 RCS.getApp().auth().getLoginState()（无匿名登录）
   - 纠错改用 callFunction({name: 'admin.correction', data})
   ============================================================ */
(function () {
  "use strict";

  var CORPUS_INDEX_URL = "data/corpus-index.json?v=20260901b";
  var CORPUS_TEXT_URL = "data/corpus-text.json?v=20260901b";
  var corpusCache = null;
  var corpusLoading = null;
  var history = [];
  var firstOpen = true;

  var CHIPS = [
    "讲讲赵一曼的故事",
    "遵义会议有什么意义？",
    "杨靖宇是在哪里牺牲的？",
  ];

  function el(id) { return document.getElementById(id); }

  function getApp() {
    return (window.RCS && RCS.getApp) ? RCS.getApp() : null;
  }

  async function getState() {
    var app = getApp();
    if (!app || !app.auth) return null;
    return await app.auth.getLoginState();
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
      if (v) { t.value = ""; t.style.height = "auto"; ask(v); }
    };
    var ta = el("rcs-ai-text");
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        var v = ta.value.trim();
        if (v) { ta.value = ""; ta.style.height = "auto"; ask(v); }
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
      b.onclick = function () { ask(c); };
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
      addAssistantBubble("你好！我是红色历史问答助手，可以依据本站史料回答英雄、地点、事件相关问题。试试下面的提问 👇", []);
    }
    setTimeout(function () { var t = el("rcs-ai-text"); if (t) t.focus(); }, 60);
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

  /* ---------- 用户纠错入口 ---------- */
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
    if (el("rcs-fix-mask")) return;
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
    mask.onclick = function (e) { if (e.target === mask) closeCorrectionModal(); };
    el("rcs-fix-cancel").onclick = closeCorrectionModal;
    el("rcs-fix-submit").onclick = submitCorrection;
  }

  function closeCorrectionModal() {
    var m = el("rcs-fix-mask");
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }

  async function submitCorrection() {
    var desc = (el("rcs-fix-desc").value || "").trim();
    var tip = el("rcs-fix-tip");
    if (!desc) { tip.className = "rcs-fix-tip err"; tip.textContent = "请填写问题描述"; return; }
    var state = await getState();
    var uid = state ? state.uid : "";
    var app = getApp();
    if (!app || !app.callFunction) {
      tip.className = "rcs-fix-tip err"; tip.textContent = "客户端未就绪，请刷新重试";
      return;
    }
    try {
      var r = await app.callFunction({
        name: "admin.correction",
        data: {
          contentType: el("rcs-fix-type").value,
          quote: (el("rcs-fix-quote").value || "").trim(),
          description: desc,
          contact: (el("rcs-fix-contact").value || "").trim(),
          uid: uid || "",
        },
      });
      var result = r && r.result;
      if (result && result.success) {
        tip.className = "rcs-fix-tip ok";
        tip.textContent = "已提交，感谢您的反馈！我们会尽快核实。";
        setTimeout(closeCorrectionModal, 1400);
      } else {
        tip.className = "rcs-fix-tip err";
        tip.textContent = "提交失败：" + ((result && result.error && result.error.message) || "未知错误");
      }
    } catch (e) {
      tip.className = "rcs-fix-tip err"; tip.textContent = "提交失败，请稍后再试。";
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
    corpusLoading = Promise.all([
      fetch(CORPUS_INDEX_URL).then(function (r) { return r.json(); }),
      fetch(CORPUS_TEXT_URL).then(function (r) { return r.json(); }),
    ])
      .then(function (res) {
        var index = res[0] && res[0].items ? res[0].items : [];
        var textMap = res[1] || {};
        var items = index.map(function (it) {
          return {
            id: it.id, type: it.type, book: it.book, name: it.name,
            aliases: it.aliases || [], keywords: it.keywords || [],
            url: it.url, text: textMap[it.id] != null ? textMap[it.id] : "",
          };
        });
        corpusCache = { items: items };
        return corpusCache;
      })
      .catch(function () { corpusCache = { items: [] }; return corpusCache; });
    return corpusLoading;
  }

  function norm(s) { return String(s || "").toLowerCase(); }
  function bigrams(s) {
    s = norm(s).replace(/[^一-龥a-z0-9]/g, "");
    var out = [];
    for (var i = 0; i < s.length - 1; i++) out.push(s.substr(i, 2));
    return out;
  }

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
        aliases.forEach(function (a) { if (a && q.indexOf(a) !== -1) score += 4; });
        keywords.forEach(function (k) { if (k && q.indexOf(k) !== -1) score += 3; });
        var tbg = bigrams(it.text || "").concat(bigrams(it.name || ""));
        var hit = 0;
        qbg.forEach(function (b) { if (b && tbg.indexOf(b) !== -1) hit++; });
        score += hit;
        return { it: it, score: score };
      })
      .filter(function (x) { return x.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 6).map(function (x) {
      return {
        id: x.it.id, title: x.it.name, url: x.it.url,
        text: x.it.text || x.it.summary || "",
        book: x.it.book || "", type: x.it.type || "",
      };
    });
  }

  function ensureBookMentioned(answer, contexts) {
    if (!contexts || !contexts.length) return answer;
    var books = contexts.map(function (c) { return c.book; }).filter(function (b) { return b && typeof b === "string" && b.trim(); });
    if (!books.length) return answer;
    var book = books[0].trim();
    if (answer.indexOf(book) !== -1) return answer;
    return "（出自" + book + "）" + answer;
  }

  function buildSources(answer, sources, contexts) {
    if (sources && sources.length) return sources;
    if (!contexts || !contexts.length) return [];
    var top = contexts[0];
    if (!top.url) return [];
    var title = (top.book ? top.book + " · " : "") + (top.title || "原文");
    return [{ title: title, url: top.url }];
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

  var ERR_MSG = {
    NO_AUTH: "AI 助手需要登录后才能使用，登录后即可继续提问。",
    SDK_NOT_READY: "客户端尚未加载完成，请稍候几秒后重试。",
    TIMEOUT: "模型响应超时，请稍后再试。",
    UPSTREAM: "AI 服务暂时不可用，请稍后再试。",
    UNKNOWN: "助手开小差了，请稍后再试。",
  };

  function classifyError(code) {
    if (code === "NO_AUTH" || code === "TURNSTILE_FAIL") return "NO_AUTH";
    if (code === "TIMEOUT") return "TIMEOUT";
    if (code === "UPSTREAM_ERROR" || code === "NO_KEY") return "UPSTREAM";
    return "UNKNOWN";
  }

  async function callAIOnce(question, contexts) {
    var app = getApp();
    var res = await app.callFunction({
      name: "ai-chat",
      data: { question: question, history: history.slice(-8), contexts: contexts },
    });
    return res.result;
  }

  async function callAI(question, contexts, typing) {
    try {
      // 未登录直接引导登录（云函数安全规则禁止匿名）
      var state = await getState();
      if (!state || !state.uid) {
        if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
        addLoginPrompt(ERR_MSG.NO_AUTH);
        return;
      }

      var result = null;
      try {
        result = await callAIOnce(question, contexts);
      } catch (e1) {
        // 瞬时错误重试一次
        await new Promise(function (r) { setTimeout(r, 600); });
        result = await callAIOnce(question, contexts);
      }

      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);

      if (result && result.success) {
        var ans = ensureBookMentioned(result.data.answer, contexts);
        var srcs = buildSources(ans, result.data.sources || [], contexts);
        addAssistantBubble(ans, srcs);
        history.push({ role: "user", content: question });
        history.push({ role: "assistant", content: ans });
        if (history.length > 8) history = history.slice(-8);
        return;
      }

      var code = result && result.error && result.error.code;
      if (code === "SENSITIVE" || code === "NO_CONTEXT" || code === "NO_GROUNDED" || code === "INVALID_PARAM") {
        addAssistantBubble(result.error.message, []);
      } else {
        var kind = classifyError(code);
        addAssistantBubble(ERR_MSG[kind] || ERR_MSG.UNKNOWN, []);
      }
    } catch (e) {
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      addAssistantBubble(ERR_MSG.UNKNOWN, []);
      if (window.console && console.error) console.error("[RCS-AI] 调用失败:", e);
    }
  }

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
