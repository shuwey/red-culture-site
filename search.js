/* ============================================================
   站点搜索 · 客户端检索覆盖层
   监听所有 .nav-search 按钮，懒加载 data/search-index.json，
   提供实时过滤 + 键盘导航 + 点击跳转。自包含，独立注入即可用。
   ============================================================ */
(function () {
  "use strict";

  var INDEX_URL = "data/search-index.json?v=20260829v";
  var VER = "20260829v";

  var indexCache = null;
  var overlay = null;
  var inputEl = null;
  var listEl = null;
  var hintEl = null;
  var activeIdx = -1;
  var results = [];

  function norm(s) {
    return (s || "").toLowerCase().replace(/\s+/g, "");
  }

  function ensureStyles() {
    if (document.getElementById("rcs-search-style")) return;
    var css = [
      ".rcs-search-overlay{position:fixed;inset:0;z-index:9999;display:flex;",
      "justify-content:center;align-items:flex-start;padding:8vh 16px 16px;",
      "background:rgba(20,16,18,.5);backdrop-filter:blur(3px);",
      "opacity:0;transition:opacity .18s ease;}",
      ".rcs-search-overlay[hidden]{display:none;}",
      ".rcs-search-overlay.rcs-open{opacity:1;}",
      ".rcs-search-panel{width:min(640px,100%);max-height:78vh;display:flex;flex-direction:column;",
      "background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;",
      "transform:translateY(-12px);transition:transform .18s ease;}",
      ".rcs-search-overlay.rcs-open .rcs-search-panel{transform:translateY(0);}",
      ".rcs-search-bar{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #eee;}",
      ".rcs-search-bar svg{flex:0 0 auto;color:#C8102E;}",
      ".rcs-search-input{flex:1;border:0;outline:0;font-size:17px;color:#1a1a1a;background:transparent;}",
      ".rcs-search-input::placeholder{color:#9a9a9a;}",
      ".rcs-search-close{flex:0 0 auto;border:0;background:#f2f2f2;color:#666;border-radius:8px;",
      "width:32px;height:32px;font-size:18px;line-height:1;cursor:pointer;}",
      ".rcs-search-close:hover{background:#e6e6e6;}",
      ".rcs-search-list{list-style:none;margin:0;padding:6px;overflow-y:auto;}",
      ".rcs-search-item{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:10px;cursor:pointer;}",
      ".rcs-search-item .rcs-st{font-size:15px;color:#1a1a1a;}",
      ".rcs-search-item .rcs-sc{flex:0 0 auto;font-size:12px;color:#C8102E;background:#fdeaed;",
      "padding:2px 8px;border-radius:999px;}",
      ".rcs-search-item .rcs-mark{margin-left:auto;color:#bbb;font-size:13px;}",
      ".rcs-search-item:hover,.rcs-search-item.rcs-active{background:#fdeaed;}",
      ".rcs-search-item.rcs-active .rcs-mark{color:#C8102E;}",
      ".rcs-search-item em{font-style:normal;color:#C8102E;font-weight:600;}",
      ".rcs-search-empty{padding:28px 16px;text-align:center;color:#999;font-size:14px;}",
      ".rcs-search-hint{padding:8px 16px 10px;font-size:12px;color:#aaa;}",
      "@media (max-width:560px){.rcs-search-overlay{padding-top:6vh;}}"
    ].join("");
    var st = document.createElement("style");
    st.id = "rcs-search-style";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildOverlay() {
    ensureStyles();
    overlay = document.createElement("div");
    overlay.className = "rcs-search-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "站内搜索");
    overlay.innerHTML =
      '<div class="rcs-search-panel">' +
        '<div class="rcs-search-bar">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M16.2 16.2L20.5 20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
          '<input class="rcs-search-input" type="text" placeholder="搜索英雄、地点、事件、书籍…" aria-label="搜索关键词" autocomplete="off">' +
          '<button class="rcs-search-close" aria-label="关闭">×</button>' +
        '</div>' +
        '<ul class="rcs-search-list" role="listbox"></ul>' +
        '<div class="rcs-search-hint">↑ ↓ 选择 · Enter 打开 · Esc 关闭</div>' +
      '</div>';
    document.body.appendChild(overlay);
    inputEl = overlay.querySelector(".rcs-search-input");
    listEl = overlay.querySelector(".rcs-search-list");
    hintEl = overlay.querySelector(".rcs-search-hint");

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeSearch();
    });
    overlay.querySelector(".rcs-search-close").addEventListener("click", closeSearch);
    inputEl.addEventListener("input", function () { render(norm(inputEl.value)); });
    inputEl.addEventListener("keydown", onKey);
  }

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    return fetch(INDEX_URL, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("index " + r.status); return r.json(); })
      .then(function (data) { indexCache = data || []; return indexCache; });
  }

  function score(e, q) {
    var t = norm(e.t), c = norm(e.c), k = norm(e.k);
    if (t === q) return 100;
    if (t.indexOf(q) === 0) return 80;
    if (t.indexOf(q) > -1) return 60;
    if (c.indexOf(q) === 0) return 50;
    if (c.indexOf(q) > -1) return 40;
    if (k.indexOf(q) > -1) return 20;
    return 0;
  }

  function highlight(text, q) {
    if (!q) return text;
    var i = norm(text).indexOf(q);
    if (i < 0) return text;
    // 还原到原文位置（中文无大小写差异，直接按字符长度切）
    var raw = text;
    var pre = raw.substring(0, i);
    var mid = raw.substring(i, i + q.length);
    var post = raw.substring(i + q.length);
    if (pre + mid + post !== raw) return text;
    return pre + "<em>" + mid + "</em>" + post;
  }

  function render(q) {
    if (!indexCache) return;
    if (!q) {
      results = indexCache.slice(0, 8);
      listEl.innerHTML = results.map(function (e, i) {
        return itemHTML(e, "", i);
      }).join("");
      activeIdx = results.length ? 0 : -1;
      updateHint();
      return;
    }
    var scored = [];
    indexCache.forEach(function (e) {
      var s = score(e, q);
      if (s > 0) scored.push({ e: e, s: s });
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    results = scored.slice(0, 12).map(function (x) { return x.e; });
    if (!results.length) {
      listEl.innerHTML = '<li class="rcs-search-empty">未找到与「' +
        escapeHTML(q) + '」相关的内容</li>';
      activeIdx = -1;
    } else {
      listEl.innerHTML = results.map(function (e, i) {
        return itemHTML(e, q, i);
      }).join("");
    }
    activeIdx = results.length ? 0 : -1;
    updateHint();
  }

  function itemHTML(e, q, i) {
    return '<li class="rcs-search-item' + (i === activeIdx ? " rcs-active" : "") +
      '" role="option" data-i="' + i + '">' +
      '<span class="rcs-st">' + highlight(e.t, q) + '</span>' +
      '<span class="rcs-sc">' + escapeHTML(e.c) + '</span>' +
      '<span class="rcs-mark">打开 ›</span></li>';
  }

  function updateHint() {
    if (!q_present()) {
      hintEl.textContent = "输入关键词检索全站内容 · ↑ ↓ 选择 · Enter 打开 · Esc 关闭";
    } else if (!results.length) {
      hintEl.textContent = "未匹配到结果，换个词试试";
    } else {
      hintEl.textContent = "共 " + results.length + " 条 · ↑ ↓ 选择 · Enter 打开 · Esc 关闭";
    }
  }

  function q_present() { return inputEl && inputEl.value.trim().length > 0; }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(activeIdx);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
    }
  }

  function move(d) {
    if (!results.length) return;
    activeIdx = (activeIdx + d + results.length) % results.length;
    syncActive();
  }

  function syncActive() {
    var items = listEl.querySelectorAll(".rcs-search-item");
    items.forEach(function (it, i) { it.classList.toggle("rcs-active", i === activeIdx); });
    var act = items[activeIdx];
    if (act) act.scrollIntoView({ block: "nearest" });
  }

  function go(i) {
    if (i < 0 || i >= results.length) return;
    var url = results[i].u;
    closeSearch();
    window.location.href = url;
  }

  function openSearch() {
    buildOverlay();
    loadIndex().catch(function (err) {
      listEl.innerHTML = '<li class="rcs-search-empty">搜索索引加载失败，请稍后重试</li>';
      if (window.console) console.warn("[search] index load failed", err);
    });
    overlay.hidden = false;
    // 触发过渡
    requestAnimationFrame(function () { overlay.classList.add("rcs-open"); });
    inputEl.value = "";
    render("");
    setTimeout(function () { inputEl.focus(); }, 30);
    document.addEventListener("keydown", onDocKey, true);
  }

  function onDocKey(e) {
    if (e.key === "Escape" && overlay && !overlay.hidden) closeSearch();
  }

  function closeSearch() {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("rcs-open");
    document.removeEventListener("keydown", onDocKey, true);
    setTimeout(function () { overlay.hidden = true; }, 180);
  }

  function init() {
    // 事件委托：覆盖静态与动态注入的 .nav-search 按钮
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".nav-search") : null;
      if (btn) {
        e.preventDefault();
        openSearch();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
