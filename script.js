/* ============================================================
   红色文化传播网 · 交互逻辑
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 导航：滚动加投影 ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  if (nav) {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 移动端菜单 ---------- */
  var burger = document.getElementById("burger");
  var drawer = document.getElementById("drawer");
  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var open = drawer.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    drawer.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        drawer.classList.remove("open");
        burger.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- 入场动效 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- 知识考核 ----------
     题库来源优先级：
       ① window.RCS_QUIZ_BANK（quiz-bank.js，699 题，每次随机抽 PER_ATTEMPT 题）
       ② FALLBACK_QUESTIONS（下方内联 5 题，仅当 ① 未加载时兜底，保证永远可考）
  */
  var PER_ATTEMPT = 10;

  // 兜底题库：quiz-bank.js 缺失/加载失败时使用（失败安全，不要删）
  var FALLBACK_QUESTIONS = [
    {
      q: "中共一大召开于哪一年？",
      options: ["1919 年", "1921 年", "1927 年", "1935 年"],
      answer: 1
    },
    {
      q: "中共一大闭幕、中国共产党宣告诞生的地方是？",
      options: ["上海石库门", "广州农讲所", "嘉兴南湖红船", "武汉八七会址"],
      answer: 2
    },
    {
      q: "秋收起义后，毛泽东领导创建的第一个农村革命根据地是？",
      options: ["井冈山革命根据地", "延安革命根据地", "西柏坡革命根据地", "瑞金革命根据地"],
      answer: 0
    },
    {
      q: "红军长征途中，生死攸关的转折点是哪次会议？",
      options: ["中共六大", "遵义会议", "瓦窑堡会议", "洛川会议"],
      answer: 1
    },
    {
      q: "中华人民共和国开国大典举行于哪一年？",
      options: ["1945 年", "1946 年", "1949 年", "1950 年"],
      answer: 2
    }
  ];

  // 抽题逻辑：优先用 quiz-bank.js 的 699 题大题库随机抽 PER_ATTEMPT 题；
  // 若该脚本未加载（缺失/网络失败），回退到内联 FALLBACK_QUESTIONS，保证永远可考。
  function getQuizPool() {
    var bank = window.RCS_QUIZ_BANK;
    if (Array.isArray(bank) && bank.length) {
      var pool = bank.slice();
      // Fisher–Yates 洗牌
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
      return pool.slice(0, Math.min(PER_ATTEMPT, pool.length));
    }
    return FALLBACK_QUESTIONS.slice();
  }
  var QUESTIONS = getQuizPool();

  /* ---------- 知识考核（弹窗元素仅存在于首页） ---------- */
  var modal = document.getElementById("quiz-modal");
  var body = document.getElementById("quiz-body");
  var openBtn = document.getElementById("quiz-open");
  var closeBtn = document.getElementById("quiz-close");
  var quizEnabled = Boolean(modal && body && openBtn && closeBtn);
  var index = 0;
  var score = 0;
  var lastFocus = null;

  function renderQuestion() {
    var item = QUESTIONS[index];
    var html = '<p class="quiz-progress">第 ' + (index + 1) + " 题 / 共 " + QUESTIONS.length + " 题</p>";
    html += '<p class="quiz-question">' + item.q + "</p>";
    html += '<div class="quiz-options">';
    item.options.forEach(function (opt, i) {
      html += '<button class="quiz-option" data-i="' + i + '">' + opt + "</button>";
    });
    html += "</div>";
    body.innerHTML = html;

    var optionBtns = body.querySelectorAll(".quiz-option");
    optionBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var picked = Number(btn.getAttribute("data-i"));
        var correct = picked === item.answer;
        if (correct) { score += 1; }
        optionBtns.forEach(function (b) {
          b.disabled = true;
          var i = Number(b.getAttribute("data-i"));
          if (i === item.answer) { b.classList.add("correct"); }
          else if (i === picked) { b.classList.add("wrong"); }
        });
        var next = document.createElement("button");
        next.className = "quiz-next";
        next.textContent = index === QUESTIONS.length - 1 ? "查看成绩" : "下一题";
        next.addEventListener("click", function () {
          index += 1;
          if (index < QUESTIONS.length) { renderQuestion(); } else { renderScore(); }
        });
        body.appendChild(next);
      });
    });
  }

  function renderScore() {
    var best = score === QUESTIONS.length;
    var text;
    if (best) { text = "满分！红色历史，了然于胸。"; }
    else if (score >= 3) { text = "不错，来时路你记得很牢。"; }
    else { text = "再走一遍来时路，答案都在路上。"; }
    body.innerHTML =
      '<p class="quiz-score-num">' + score + " / " + QUESTIONS.length + "</p>" +
      '<p class="quiz-score-text">' + text + "</p>" +
      '<button class="quiz-restart" id="quiz-restart">再考一次</button>';
    document.getElementById("quiz-restart").addEventListener("click", function () {
      index = 0;
      score = 0;
      renderQuestion();
    });
    // 派发成绩完成事件，供 quiz-service.js 保存（解耦设计，仅一行）
    document.dispatchEvent(new CustomEvent("rcs:quiz-finished", {
      detail: { score: score, total: QUESTIONS.length, durationSec: 0 }
    }));
  }

  function openModal() {
    lastFocus = document.activeElement;
    index = 0;
    score = 0;
    renderQuestion();
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) { lastFocus.focus(); }
  }

  if (quizEnabled) {
    openBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) { closeModal(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) { closeModal(); }
    });
  }
})();

/* ---------- 长征数字详情弹窗 ---------- */
(function () {
  var modal = document.getElementById("stat-modal");
  if (!modal) { return; }
  var body = document.getElementById("stat-body");
  var closeBtn = document.getElementById("stat-close");
  var triggers = document.querySelectorAll("button.stat[data-stat]");
  if (!body || !closeBtn || triggers.length === 0) { return; }

  var STAT = {
    mileage: {
      num: "25000+",
      label: "二万五千里 · 征途",
      note: "数据为红一方面军（中央红军）行程。各路红军合计行程约六万五千里。",
      items: [
        ["1934.10", "中央红军 8.6 万余人从江西于都出发，突破四道封锁线。"],
        ["1935.01", "遵义会议召开，确立毛泽东在党中央和红军的领导地位。"],
        ["1935.05", "强渡大渡河、飞夺泸定桥，粉碎围歼企图。"],
        ["1935.06—08", "翻越夹金山等雪山，穿越松潘草地。"],
        ["1935.10", "到达陕北吴起镇，红一方面军长征胜利结束。"]
      ]
    },
    battles: {
      num: "380+",
      label: "重要战役战斗",
      note: "据军史资料统计，中央红军长征期间进行重要战役战斗 380 余次。",
      items: [
        ["湘江战役", "关系中央红军生死存亡的一战，付出巨大牺牲突破封锁。"],
        ["四渡赤水", "三个月内四次渡过赤水河，机动歼敌，跳出重围。"],
        ["巧渡金沙江", "七只小船七天七夜，数万人马安然过江。"],
        ["强渡大渡河 / 飞夺泸定桥", "十七勇士强渡，22 名勇士夺桥，打开北上通道。"],
        ["激战腊子口", "突破天险隘口，为进入陕甘铺平道路。"]
      ]
    },
    provinces: {
      num: "11",
      label: "纵横省份（红一方面军）",
      note: "若含红二、四方面军及红二十五军，长征共跨越约 14 个省份。",
      items: [
        ["江西 · 广东 · 湖南", "突围西进，突破前三道封锁线。"],
        ["广西", "血战湘江，翻越老山界。"],
        ["贵州", "遵义会议，四渡赤水。"],
        ["云南 · 四川", "巧渡金沙江，过大凉山、飞夺泸定桥、翻雪山过草地。"],
        ["甘肃 · 陕西", "突破腊子口，抵达陕北根据地。"]
      ]
    }
  };

  var lastFocus = null;

  function render(key) {
    var d = STAT[key];
    if (!d) { return; }
    var html = '<div class="stat-detail-head">';
    html += '<span class="stat-detail-num">' + d.num + "</span>";
    html += '<span class="stat-detail-label">' + d.label + "</span>";
    html += "</div>";
    html += '<ul class="stat-detail-list">';
    d.items.forEach(function (it) {
      html += "<li><b>" + it[0] + "</b> — " + it[1] + "</li>";
    });
    html += "</ul>";
    html += '<p class="stat-detail-note">※ ' + d.note + "</p>";
    body.innerHTML = html;
  }

  function open(key) {
    lastFocus = document.activeElement;
    render(key);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  }
  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) { lastFocus.focus(); }
  }

  triggers.forEach(function (btn) {
    btn.addEventListener("click", function () {
      open(btn.getAttribute("data-stat"));
    });
  });
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) { close(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) { close(); }
  });
})();

/* ---------- 减少动态偏好：暂停自动播放视频 ---------- */
(function () {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
  document.querySelectorAll("video[autoplay]").forEach(function (v) {
    v.removeAttribute("autoplay");
    v.pause();
  });
})();

/* ============================================================
   主导航模块：红色文学
   —— 点击直接跳转子页面（不使用 hover 弹窗）
   —— 幂等注入：已存在 #nav-redlit 则跳过
   —— 以后加书目：只改下方 MODULE.books 数组，导航与子页面同步更新
   ============================================================ */
(function () {
  "use strict";

  // 模块数据：红色文学落地页 + 各书目及其页面链接
  var MODULE = {
    label: "红色文学",
    href: "red-literature.html",
    books: [
      {
        label: "红岩",
        author: "罗广斌、杨益言 著 · 整本书阅读",
        desc: "重庆解放前夕地下斗争与狱中斗争的革命历史小说，初中必读书目。",
        items: [
          { t: "知识库 · 人物 / 地点 / 事件", h: "hongyan-knowledge-base.html" },
          { t: "阅读题库（229 题）", h: "hongyan-quiz.html" },
          { t: "中考真题（25 题 · 已核实）", h: "hongyan-zhenti.html" },
          { t: "章节考点对照表", h: "chapter-map.html" }
        ]
      },
      {
        label: "红星照耀中国",
        author: "埃德加·斯诺 著 · 纪实作品",
        desc: "1936年深入陕甘宁边区实地考察的纪实经典，八上名著导读“纪实作品的阅读”。",
        items: [
          { t: "知识库 · 人物 / 地点 / 事件", h: "hongxing-knowledge-base.html" },
          { t: "阅读题库（291 题）", h: "hongxing-quiz.html" },
          { t: "中考真题（73 题 · 已核实）", h: "hongxing-zhenti.html" },
          { t: "章节考点对照表", h: "hongxing-chapter-map.html" }
        ]
      }
      // 后续书目在此追加：
      // { label:"书名", author:"作者", desc:"简介", items:[ { t:"…", h:"…" } ] }
    ]
  };

  // 暴露给子页面复用（保持"加书目只改一处"）
  window.RCS_LIT = MODULE;

  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  // 桌面与抽屉统一：普通链接，点击即跳转（无下拉、无 hover 弹窗）
  function buildLink(id) {
    return '<a id="' + id + '" href="' + esc(MODULE.href) + '">' + esc(MODULE.label) + "</a>";
  }

  // 子页面书目渲染：页面存在 #lit-books 时，按 MODULE.books 生成卡片
  function renderLitIndex() {
    var box = document.getElementById("lit-books");
    if (!box) { return; }
    var html = MODULE.books.map(function (b) {
      var links = b.items.map(function (it) {
        return '<a href="' + esc(it.h) + '">' + esc(it.t) + "</a>";
      }).join("");
      return '<article class="lit-card">' +
        "<h2>" + esc(b.label) + "</h2>" +
        '<p class="lit-meta">' + esc(b.author || "") + "</p>" +
        '<p class="lit-desc">' + esc(b.desc || "") + "</p>" +
        '<div class="lit-links">' + links + "</div>" +
        "</article>";
    }).join("");
    box.innerHTML = html;
  }

  // 定位「关于本站」链接：兼容 href="index.html#footer"（子页）与 href="#footer"（首页）
  function findAbout(root) {
    return root.querySelector('a[href="index.html#footer"]') ||
           root.querySelector('a[href="#footer"]') ||
           [].slice.call(root.querySelectorAll("a")).filter(function (a) {
             return a.textContent.replace(/\s/g, "") === "关于本站";
           })[0] || null;
  }

  function injectNav() {
    var links = document.querySelector(".nav-links");
    var drawer = document.getElementById("drawer");
    if (!links || !drawer) { return; }
    if (document.getElementById("nav-redlit")) { return; } // 幂等

    // 注意：beforebegin 必须对「锚点元素」调用，
    // 若对容器 links 调用会插到容器之前（落在 <header> 里），导致位置错误。
    var about = findAbout(links);
    if (about) { about.insertAdjacentHTML("beforebegin", buildLink("nav-redlit")); }
    else { links.insertAdjacentHTML("beforeend", buildLink("nav-redlit")); }

    var aboutM = findAbout(drawer);
    if (aboutM) { aboutM.insertAdjacentHTML("beforebegin", buildLink("drawer-redlit")); }
    else { drawer.insertAdjacentHTML("beforeend", buildLink("drawer-redlit")); }
  }

  /* ---------- 图片合规角标（红文学图片合规 P1/P2） ----------
     给 AI 生成的配图加「AI 生成 · 艺术再现」角标。
     白名单含：中风险党史地标图（P1）+ 低风险英雄场景/氛围图（P2）。
     真实照片（detail-kaiquo.jpg / detail-tiananmen.jpg）绝不加角标。
     角标纯展示，失败安全。 */
  var AI_IMAGE_FILES = [
    // P1 中风险：AI 生成的党史地标图
    "hero-jinggangshan.jpg", "card-places.jpg", "detail-yanan.png",
    // P2 低风险：AI 生成的英雄场景 / 氛围图
    "detail-dongcunrui.png", "detail-fangzhimin.png", "detail-jiangzhujun.png",
    "detail-lidazhao.png", "detail-liuhulan.png", "detail-qiushaoyun.png",
    "detail-yangjingyu.png", "detail-zhaoyiman.png",
    "card-heroes.jpg", "card-events.jpg", "long-march.jpg"
  ];
  function baseName(src) {
    var m = String(src).split("?")[0].split("/").pop();
    return m;
  }
  function markAiImages() {
    var imgs = document.images || [];
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (AI_IMAGE_FILES.indexOf(baseName(img.getAttribute("src") || "")) === -1) continue;
      var host = img.parentElement;
      if (!host) continue;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      if (host.querySelector(".ai-badge")) continue;
      var badge = document.createElement("span");
      badge.className = "ai-badge";
      badge.textContent = "AI 生成 · 艺术再现";
      host.appendChild(badge);
    }
  }

  /* ---------- 页脚图片声明（红文学图片合规 P1） ----------
     给每页页脚追加一行全站声明，覆盖站点级图片来源说明。
     防重复：已注入则跳过。 */
  function injectFooterNote() {
    var note = "本站部分配图为 AI 生成的「艺术再现」图像，非真实历史照片，请以权威史料为准。";
    var footers = document.querySelectorAll(".footer-bottom");
    for (var i = 0; i < footers.length; i++) {
      if (footers[i].querySelector(".ai-foot-note")) continue;
      var p = document.createElement("p");
      p.className = "ai-foot-note";
      p.textContent = note;
      footers[i].appendChild(p);
    }
  }

  function boot() {
    injectNav();
    renderLitIndex();
    markAiImages();
    injectFooterNote();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
