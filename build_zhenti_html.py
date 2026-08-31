# -*- coding: utf-8 -*-
"""中考真题专区页面渲染器（被 build_zhenti.py 调用）。

设计原则：
- Python 侧把全部题目直接渲染成 HTML，**JS 只负责筛选显示/隐藏**。
  这样即使内联 JS 出错，题目内容依然完整可读（失败安全）。
- 不引用全站 style.css（自带 header{} / .stat / .tag 会冲突），只引 nav-embed.css。
- 页面自有类名统一 zt- 前缀，避免与导航样式打架。
"""
import html as _html
import re

SRC_NAME = [
    ("zujuan.xkw.com", "学科网组卷网"),
    ("zy.21cnjy.com", "21世纪教育网"),
    ("mip.21cnjy.com", "21世纪教育网"),
    ("intowz.com", "我爱语文网"),
    ("yeyulingfeng.com", "夜雨聆风"),
    ("renrendoc.com", "人人文库"),
    ("people.com.cn", "人民网"),
    ("baidu.com", "百度文库"),
]

NAV_CSS = "nav-embed.css?v=20260831h"
SCRIPT_JS = "script.js?v=20260829h"
CLOUD_LAZY = "cloud-lazy.js?v=20260829ad"


def src_label(u):
    for k, v in SRC_NAME:
        if k in u:
            return v
    m = re.match(r"https?://([^/]+)", u)
    return m.group(1) if m else u


def esc(s):
    return _html.escape(str(s if s is not None else ""), quote=True)


CSS = """
:root{--red:#C8102E;--red-d:#A80D27;--bg:#FFFFFF;--card:#fff;
 --ink:#1D1D1F;--mut:#6E6E73;--line:#D2D2D7;--grn:#1f8a4c;--amb:#b9751a;--blu:#2b5fb0}
*{box-sizing:border-box}
body{margin:0;font-family:"Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
 background:var(--bg);color:var(--ink);line-height:1.75;-webkit-text-size-adjust:100%}
.page-head{background:var(--white);color:var(--ink);padding:120px 24px 44px;text-align:center}
.page-head h1{margin:0 0 8px;font-size:25px;letter-spacing:.5px;line-height:1.4}
.page-head .sub{font-size:14px;opacity:.93;max-width:900px}
.wrap{max-width:980px;margin:0 auto;padding:28px 24px 84px}
.notice{background:#F5F5F7;border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:14px 0;font-size:13.5px;color:#6E6E73}
.notice b{color:var(--red)}
.notice ul{margin:8px 0 0;padding-left:20px}
.notice li{margin:3px 0}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}
.zt-stat{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;flex:1;min-width:108px}
.zt-stat b{display:block;font-size:21px;color:var(--red)}
.zt-stat span{font-size:12px;color:var(--mut)}
.toolbar{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:14px;
 display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.toolbar label{font-size:13px;color:var(--mut)}
select,.zt-btn,.zt-key{font:inherit;font-size:13px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)}
.zt-btn{cursor:pointer}
.zt-btn.primary{background:var(--red);color:#fff;border-color:var(--red)}
.zt-count{font-size:13px;color:var(--mut);margin-left:auto}
.zt-count b{color:var(--red);font-size:16px}
.zt-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px 22px;margin-bottom:18px;
 box-shadow:0 1px 2px rgba(150,20,40,.04)}
.zt-head{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px}
.zt-badge{font-size:11.5px;padding:2px 9px;border-radius:20px;background:#FBE9EA;color:var(--red);border:1px solid #F0C9CF;white-space:nowrap}
.zt-badge.t{background:#eef4ff;color:var(--blu);border-color:#cfe0ff}
.zt-badge.s{background:#f4f1fb;color:#5b4b9e;border-color:#ded4f5}
.zt-badge.ok{background:#eafaf0;color:var(--grn);border-color:#c7ecd3}
.zt-badge.warn{background:#fff4e3;color:var(--amb);border-color:#f4dcb4}
.zt-no{font-size:12px;color:var(--mut);margin-left:auto}
.zt-stem{font-size:15.5px;margin:4px 0 12px}
.zt-stem p{margin:7px 0}
.zt-stem strong{color:var(--red)}
.zq{margin:8px 0;padding:8px 12px;border-left:3px solid var(--red);background:#FBE9EA;color:#3a3033}
.mdtable{overflow-x:auto;margin:10px 0;-webkit-overflow-scrolling:touch}
.mdtable table{border-collapse:collapse;width:100%;font-size:13.5px;min-width:460px}
.mdtable th,.mdtable td{border:1px solid var(--line);padding:7px 9px;text-align:left;vertical-align:top}
.mdtable th{background:#F5F5F7;color:var(--ink)}
.zt-ans{margin-top:8px;border-top:1px dashed var(--line);padding-top:8px}
.zt-ans summary{cursor:pointer;font-size:14px;color:var(--red);font-weight:600;padding:4px 0;list-style:none}
.zt-ans summary::-webkit-details-marker{display:none}
.zt-ans summary::before{content:"▸ ";display:inline-block;transition:transform .15s}
.zt-ans[open] summary::before{content:"▾ "}
.zt-ansbody{font-size:14px;color:#3a3033;padding:6px 0 2px}
.zt-ansbody p{margin:6px 0}
.zt-ansbody ul,.zt-ansbody ol{margin:6px 0;padding-left:22px}
.zt-none{font-size:13.5px;color:var(--amb);background:#F5F5F7;border:1px dashed var(--line);border-radius:8px;padding:8px 10px;margin-top:6px}
.zt-sources{margin-top:10px;font-size:12px;color:var(--mut);border-top:1px solid #f6ece8;padding-top:8px;line-height:1.9}
.zt-sources a{color:var(--blu);text-decoration:none;margin-right:10px;white-space:nowrap}
.zt-sources a:hover{text-decoration:underline}
.zt-empty{display:none;text-align:center;padding:40px 10px;color:var(--mut);font-size:14px}
.zt-foot{margin-top:26px;font-size:13px;color:var(--mut);border-top:1px solid var(--line);padding-top:14px;line-height:1.9}
.zt-foot a{color:var(--red);text-decoration:none}
.zt-foot a:hover{text-decoration:underline}
@media(max-width:600px){
 .page-head{padding:18px 14px 16px}
 .page-head h1{font-size:19px}
 .zt-stem{font-size:14.5px}
 .toolbar{gap:8px}
 .zt-count{margin-left:0;width:100%}
}
"""

JS = """
(function(){
  var cards = [].slice.call(document.querySelectorAll('.zt-card'));
  var fy = document.getElementById('f-year'),
      ft = document.getElementById('f-type'),
      fp = document.getElementById('f-prov'),
      fk = document.getElementById('f-key'),
      cnt = document.getElementById('zt-count'),
      empty = document.getElementById('zt-empty');
  if(!fy || !cards.length) return;
  function apply(){
    var y = fy.value, t = ft.value, p = fp.value,
        k = (fk.value || '').trim().toLowerCase(), n = 0;
    cards.forEach(function(c){
      var ok = (!y || c.getAttribute('data-year') === y)
            && (!t || c.getAttribute('data-type') === t)
            && (!p || c.getAttribute('data-prov') === p)
            && (!k || c.textContent.toLowerCase().indexOf(k) >= 0);
      c.style.display = ok ? '' : 'none';
      if(ok) n++;
    });
    if(cnt) cnt.innerHTML = '共 <b>' + n + '</b> / ' + cards.length + ' 题';
    if(empty) empty.style.display = n ? 'none' : '';
  }
  [fy, ft, fp].forEach(function(el){ el.addEventListener('change', apply); });
  if(fk) fk.addEventListener('input', apply);
  var rs = document.getElementById('f-reset');
  if(rs) rs.addEventListener('click', function(){
    fy.value = ''; ft.value = ''; fp.value = ''; fk.value = ''; apply();
  });
  apply();
})();
"""

NAV = '''<header class="nav" id="nav">
  <a class="nav-logo" href="index.html" aria-label="红色文化传播网">
    <svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.26 6.87.6-5.2 4.51 1.53 6.72L12 16.9l-6.1 3.19 1.53-6.72-5.2-4.51 6.87-.6L12 2z" fill="#C8102E"/></svg>
    <span>红色文化传播网</span>
  </a>
  <nav class="nav-links" aria-label="主导航">
    <a href="heroes.html">英雄人物</a>
    <a href="places.html">红色地点</a>
    <a href="events.html">历史事件</a>
    <a href="index.html#quiz">知识考核</a>
    <a id="nav-redlit" href="red-literature.html">红色文学</a>
    <a href="about.html">关于本站</a>
  </nav>
  <div class="nav-right">
    <div id="user-area" class="nav-user-area"></div>
    <button class="nav-search" aria-label="搜索">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M16.2 16.2L20.5 20.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>
    <button class="nav-burger" id="burger" aria-label="菜单" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>
<div class="nav-drawer" id="drawer">
  <a href="heroes.html">英雄人物</a>
  <a href="places.html">红色地点</a>
  <a href="events.html">历史事件</a>
  <a href="index.html#quiz">知识考核</a>
  <a id="drawer-redlit" href="red-literature.html">红色文学</a>
  <a href="about.html">关于本站</a>
</div>'''


def render_html(data, slug):
    m = data["meta"]
    qs = data["questions"]
    years = m["years"]
    provs = m["provs"]
    types = m["types"]
    no_ans = [x for x in qs if not x["answer"].strip()]

    def opts(vals, label_fmt=lambda v: v):
        return "".join('<option value="%s">%s</option>' % (esc(v), esc(label_fmt(v)))
                       for v in vals)

    cards = []
    for x in qs:
        badges = ['<span class="zt-badge">%d·%s·中考真题</span>' % (x["year"], esc(x["region"]))]
        badges.append('<span class="zt-badge t">%s</span>' % esc(x["type"]))
        if x["score"] and "未标注" not in x["score"]:
            sc = x["score"] if len(x["score"]) <= 18 else x["score"][:17] + "…"
            badges.append('<span class="zt-badge s" title="%s">%s</span>'
                          % (esc(x["score"]), esc(sc)))
        if x["verified"]:
            badges.append('<span class="zt-badge ok">已交叉验证</span>')
        if x["doubt"] and x["doubt"] not in ("无", "无。"):
            badges.append('<span class="zt-badge warn">%s</span>' % esc(x["doubt"][:24]))

        if x["answer"].strip():
            ans = ('<details class="zt-ans"><summary>参考答案与评分要点</summary>'
                   '<div class="zt-ansbody">%s</div></details>' % x["answer"])
        else:
            ans = ('<div class="zt-none">本题为 %d 年新题，各地尚未公开参考答案，'
                   '本页不做推测性编写，以免误导备考。</div>' % x["year"])

        srcs = "".join('<a href="%s" target="_blank" rel="noopener">%s</a>'
                       % (esc(u), esc(src_label(u))) for u in x["sources"])
        src_html = ('<div class="zt-sources">出处溯源（点击查看原始页面）：%s</div>' % srcs
                    if srcs else '')

        cards.append(
            '<article class="zt-card" data-year="%d" data-type="%s" data-prov="%s">'
            '<div class="zt-head">%s<span class="zt-no">#%d</span></div>'
            '<div class="zt-stem">%s</div>%s%s</article>'
            % (x["year"], esc(x["type"]), esc(x["prov"]), "".join(badges),
               x["no"], x["stem"], ans, src_html))

    book = m["book"]
    if slug == "hongxing":
        tips = ("《红星照耀中国》是统编语文八年级上册「名著导读」正式篇目，"
                "全国各地中考考查密度最高，本页收录 %d 道真题。"
                "其中 2021 年（建党百年）考查最密集，一年即 %d 道。"
                % (m["total"], len([x for x in qs if x["year"] == 2021])))
        peer = ('<a href="hongxing-quiz.html">阅读题库（291 题）</a> · '
                '<a href="hongxing-knowledge-base.html">知识库与教学设计</a> · '
                '<a href="hongxing-chapter-map.html">章节考点对照表</a>')
    else:
        tips = ("《红岩》在统编教材中属自主阅读推荐篇目，<b>非名著导读主篇目</b>，"
                "因此全国各地中考的考查密度明显低于《红星照耀中国》——"
                "本页 %d 道已是 2019—2026 八年全国可核实的全部真题。"
                "近四年题型以情境任务（推荐语/讲解词/誓词）和专题探究为主。"
                % m["total"])
        peer = ('<a href="hongyan-quiz.html">阅读题库（229 题）</a> · '
                '<a href="hongyan-knowledge-base.html">知识库与教学设计</a> · '
                '<a href="chapter-map.html">章节考点对照表</a>')

    notice = ('<div class="notice"><b>关于这批题的可信度，请先读这一条</b>'
              '<ul>'
              '<li>本页每道题都标注了<b>「年份·省市」出处</b>，并附<b>可点击的原始来源链接</b>，可自行核对。</li>'
              '<li>当前网络上大量流传「2026 各地中考真题汇编」，实为 AI 批量伪造（无出处、题型雷同）。'
              '本页<b>不收录任何查不到原始出处的题目</b>，宁可少收，不做假题。</li>'
              '<li>开放表达题（推荐语、讲解词、探究结论）的答案为<b>评分示例</b>，'
              '中考按层级给分，言之成理即可，不必逐字背诵。</li>'
              '</ul></div>')

    stats = "".join(
        '<div class="zt-stat"><b>%s</b><span>%s</span></div>' % (v, k)
        for v, k in [
            (m["total"], "已核实真题"),
            (len(provs), "覆盖省份"),
            ("%d—%d" % (years[0], years[-1]), "年份跨度"),
            (len(types), "题型类别"),
        ])

    return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="%(navcss)s">
<title>《%(book)s》中考真题专区（%(total)d 题）</title>
<meta name="description" content="《%(book)s》全国各地中考语文真题汇编，%(total)d 道已核实真题，全部标注年份·省市出处并附来源链接，含参考答案与评分要点。">
<style>%(css)s</style>
</head>
<body>
%(nav)s
<div class="page-head">
  <h1>《%(book)s》中考真题专区</h1>
  <div class="sub">%(tips)s</div>
</div>
<div class="wrap">
  %(notice)s
  <div class="stats">%(stats)s</div>
  <div class="toolbar">
    <label for="f-year">年份</label>
    <select id="f-year"><option value="">全部</option>%(oyear)s</select>
    <label for="f-type">题型</label>
    <select id="f-type"><option value="">全部</option>%(otype)s</select>
    <label for="f-prov">省份</label>
    <select id="f-prov"><option value="">全部</option>%(oprov)s</select>
    <input class="zt-key" id="f-key" type="search" placeholder="搜索题干关键词" aria-label="搜索题干">
    <button class="zt-btn" id="f-reset">重置</button>
    <span class="zt-count" id="zt-count"></span>
  </div>
  %(cards)s
  <div class="zt-empty" id="zt-empty">没有符合条件的题目，试试放宽筛选条件。</div>
  <div class="zt-foot">
    <p><b>配套资源：</b>%(peer)s</p>
    <p><b>使用建议：</b>先遮住答案独立作答，再对照评分要点自评。
    同年份、同省份的题目往往体现当地命题风格，可用筛选器按「省份」纵向练。</p>
    <p><b>来源说明：</b>题目与答案均逐字转录自公开可访问的教辅与组卷页面，
    著作权归各地教育考试院及原出版方所有，本站仅作教学研究与备考参考，
    不做任何商业使用；若涉及侵权请联系删除。</p>
    <p>红色文化传播网 · 《%(book)s》中考真题专区 · 生成于 %(gen)s</p>
  </div>
</div>
<script>%(js)s</script>
<script src="%(scriptjs)s"></script>
<script>
  window.RCS_CLOUD_SCRIPTS = [
    "cloudbase.bundle.js",
    "cloudbase-config.js",
    "auth-service.js?v=20260829aa",
    "account-ui.js?v=20260829ac",
    "quiz-service.js?v=20260829r",
    "ai-assistant.js?v=20260829x",
    "search.js?v=20260829w"
  ];
</script>
<script src="%(cloudlazy)s"></script>
</body>
</html>
""" % {
        "navcss": NAV_CSS, "book": book, "total": m["total"], "css": CSS,
        "nav": NAV, "tips": tips, "notice": notice, "stats": stats,
        "oyear": opts(sorted(years, reverse=True), lambda v: "%d 年" % v),
        "otype": opts(types), "oprov": opts(provs),
        "cards": "\n".join(cards), "peer": peer, "gen": m["generated"],
        "js": JS, "scriptjs": SCRIPT_JS, "cloudlazy": CLOUD_LAZY,
    }
