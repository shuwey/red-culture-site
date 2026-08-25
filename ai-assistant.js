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
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
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

  async function callAI(question, contexts, typing) {
    try {
      var app = RCS.getApp();
      var res = await app.callFunction({
        name: "ai-chat",
        data: {
          question: question,
          history: history.slice(-8),
          contexts: contexts,
        },
      });
      var result = res.result; // {success, data:{answer,sources}, error:{code,message}}
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      if (result && result.success) {
        addAssistantBubble(result.data.answer, result.data.sources || []);
        history.push({ role: "user", content: question });
        history.push({ role: "assistant", content: result.data.answer });
        if (history.length > 8) history = history.slice(-8);
      } else if (
        result &&
        result.error &&
        (result.error.code === "SENSITIVE" || result.error.code === "NO_CONTEXT")
      ) {
        addAssistantBubble(result.error.message, []);
      } else {
        addAssistantBubble("助手开小差了，请稍后再试。", []);
      }
    } catch (e) {
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      addAssistantBubble("助手开小差了，请稍后再试。", []);
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
