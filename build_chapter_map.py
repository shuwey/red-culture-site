# -*- coding: utf-8 -*-
"""
《红岩》章节考点对照表生成器
输入: hongyan-quiz.json (229题, ref 字段含 "原书第X章" 定位)
输出:
  chapter-map.html  —— 可打印对照表(讲义用, 红岩主题, 含每章梗概/核心考点/题目明细)
  chapter-map.json  —— 结构化(便于二次开发/导入)
  chapter-map.csv   —— 按章导出(便于 Excel/打印排版)
"""
import json, re, csv, html, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "hongyan-quiz.json")

TYPE_CN = {"single":"单选","multiple":"多选","fill":"填空","judge":"判断","short":"简答"}
CAT_CN  = {"people":"人物","place":"地点","event":"事件","spirit":"主题精神","basic":"常识","art":"阅读鉴赏"}

# ============================================================
# 30 章内容梗概(依中国青年出版社30章本; 与题库 REF_RULES 章号一致)
# ============================================================
CHAPTERS = {
 1:"重庆地下斗争序幕——甫志高擅自开设沙坪书店、陈松林任店员；余新江目睹特务纵火；红岩村与集中营背景。",
 2:"沙坪书店接触进步青年；华为送《挺进报》；郑克昌伪装进步青年出现；成瑶初识《挺进报》。",
 3:"成岗接手印刷《挺进报》；江姐接替刻写；许云峰领导部署；陈松林警觉。",
 4:"江姐赴川北，得知丈夫彭松涛（华蓥山政委）牺牲后强忍悲痛；双枪老太婆会见；华蓥山游击队背景。",
 5:"甫志高让郑克昌住进沙坪书店（引狼入室），潜伏危机加深。",
 6:"特务“慈居”登场；徐鹏飞、沈养斋策划渗透；敌我斗争拉开。",
 7:"许云峰识破郑克昌；任达哉（首个叛徒）被捕；甫志高不听劝告；地下组织开始被破坏。",
 8:"甫志高叛变，出卖许云峰、成岗等；成岗、许云峰被捕；李敬原安排成瑶当记者。",
 9:"成岗受审写下《我的“自白”书》；许云峰受审；毛人凤利诱失败；沈养斋攻心劝降。",
 10:"敌特庆功宴许云峰智对；徐鹏飞技穷；《挺进报》山城再现。",
 11:"渣滓洞斗争展开；刘思扬、孙明霞入狱；龙光华抄《囚歌》；“老大哥”主心骨；看守诨号“猩猩”。",
 12:"龙光华取水被打；许云峰抬入牢房高唱《国际歌》；“监狱之花”诞生，许云峰取名赠毯。",
 13:"龙光华被迫害致死，难友绝食抗议迫使特务开追悼会。",
 14:"江姐被捕（甫志高出卖）；双枪老太婆营救未及；华为报信。",
 15:"江姐受“竹签钉指”酷刑坚贞不屈，留下“意志是钢铁”名言；孙明霞护理。",
 16:"许云峰被转移（地牢），狱中斗争持续。",
 17:"成瑶（陈静）以记者身份戳穿国民党假和谈；徐鹏飞应对学潮。",
 18:"刘思扬被假意释放软禁后识破；齐晓轩由老大哥介绍登场。",
 19:"刘思扬、成岗转押白公馆；黄显声教“小萝卜头”识字、传消息。",
 20:"华子良装疯亮相；“小萝卜头”白公馆生活放飞小飞虫；白公馆版《挺进报》。",
 21:"江姐、余新江识破敌特伪装；郑克昌混入渣滓洞套情报被识破。",
 22:"胡浩因《挺进报》受拷打，齐晓轩主动担责保护；“白宫版”《挺进报》泄露。",
 23:"华子良换牢房被了解，装疯更稳；白公馆斗争。",
 24:"华子良向齐晓轩吐露真身传递越狱情报；许云峰地窖挖暗道；双枪老太婆接受营救任务；磁器口联络。",
 25:"江姐绣红旗（闻新中国成立）；江姐就义（电台岚垭，“11·14”密裁）；“11·27”提前密裁背景。",
 26:"黄显声在梅园被杨进兴暗杀；老大哥建议讨论江姐遗书；渣滓洞突击检查。",
 27:"李敬原筹划营救狱友；地下党营救部署。",
 28:"许云峰地窖从容就义；华子良逃脱接应解放军；杨钦典打开牢门；“11·27”大屠杀开始。",
 29:"渣滓洞集体越狱，丁长发、余新江断后牺牲；解放前夜解放军炮声。",
 30:"白公馆经许云峰暗道越狱，齐晓轩断后挺立岩石牺牲；徐鹏飞覆灭；1949.11.30 重庆解放。",
}

# 核心考点关键词(用于每章"考点标签"抽取, 与题库 REF_RULES 一致)
KEYWORDS = [
 "江姐","许云峰","成岗","刘思扬","华子良","双枪老太婆","甫志高","小萝卜头","黄显声",
 "龙光华","齐晓轩","余新江","丁长发","李敬原","成瑶","陈松林","郑克昌","徐鹏飞",
 "毛人凤","杨进兴","沈养斋","杨钦典","彭松涛","华为","孙明霞","胡浩","老大哥",
 "监狱之花","任达哉","许建业","许晓轩","韩子栋","杨虎城","陈然","彭咏梧",
 "渣滓洞","白公馆","歌乐山","华蓥山","磁器口","沙坪书店","朝天门","红岩村","梅园",
 "大坪","电台岚垭","戴公祠",
 "挺进报","第一个叛徒","11·27","大屠杀","重庆解放","新中国成立","五星红旗","绣红旗",
 "绝食","囚歌","叶挺","竹签","地窖","通道","越狱","川东三次武装起义","狱中八条",
 "红岩精神","中美合作所","红梅赞","烈火中永生",
]

# ============================================================
# 解析与聚合
# ============================================================
def parse_chaps(ref):
    out = set()
    for m in re.finditer(r'第(\d+)(?:[—\-](\d+))?章', ref or ""):
        a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else a
        out.update(range(a, b+1))
    return sorted(out)

def load():
    d = json.load(open(SRC, encoding="utf-8"))
    return d["meta"], d["questions"]

def build():
    meta, qs = load()
    # 每章: {count, types, cats, keywords, items:[{id,type,cat,stem}]}
    ch = {n: {"count":0,"types":{},"cats":{},"kw":set(),"items":[]} for n in range(1,31)}
    special = []  # 无章号题 -> 专题区
    for q in qs:
        ref = q.get("ref","")
        cs = parse_chaps(ref)
        stem = (q.get("stem") or "").replace("\n"," ")
        rec = {"id":q["id"],"type":q["type"],"cat":q["cat"],"stem":stem}
        hit_kw = [k for k in KEYWORDS if k in (q.get("stem","")+q.get("analysis",""))]
        if not cs:
            special.append({"rec":rec,"ref":ref})
            continue
        for c in cs:
            ch[c]["count"] += 1
            ch[c]["types"][q["type"]] = ch[c]["types"].get(q["type"],0)+1
            ch[c]["cats"][q["cat"]] = ch[c]["cats"].get(q["cat"],0)+1
            ch[c]["items"].append(rec)
            ch[c]["kw"].update(hit_kw)
    return meta, qs, ch, special

# ============================================================
# 输出 HTML
# ============================================================
def esc(s): return html.escape(str(s))

def html_table(items):
    rows = []
    for it in items:
        rows.append(
          "<tr><td class='qid'>%s</td><td class='qtype'>%s</td>"
          "<td class='qcat'>%s</td><td class='qstem'>%s</td></tr>" % (
            esc(it["id"]), esc(TYPE_CN.get(it["type"],it["type"])),
            esc(CAT_CN.get(it["cat"],it["cat"])), esc(it["stem"][:60])))
    return ("<table class='qlist'><thead><tr><th>题号</th><th>题型</th>"
            "<th>维度</th><th>题干</th></tr></thead><tbody>%s</tbody></table>" % "".join(rows))

def gen_html(meta, ch, special):
    types = meta.get("types",{})
    tstr = "、".join("%s %d"%(TYPE_CN.get(k,k),v) for k,v in types.items())
    cards = []
    # 30 章
    for n in range(1,31):
        c = ch[n]
        kwtags = "".join("<span class='tag'>%s</span>"%esc(k) for k in sorted(c["kw"]))
        item_html = html_table(c["items"]) if c["items"] else "<p class='nores'>（本章暂无对应题目，可作拓展阅读）</p>"
        cards.append(
          "<section class='chap'>\n"
          "<h2><span class='cn'>第 %d 章</span></h2>\n"
          "<p class='summary'>%s</p>\n"
          "<div class='meta'>本章题量：<b>%d</b> 题 &nbsp;|&nbsp; 题型：%s</div>\n"
          "<div class='kwline'>核心考点：%s</div>\n"
          "%s\n"
          "</section>" % (n, esc(CHAPTERS[n]), c["count"],
                          esc("、".join("%s%d"%(TYPE_CN.get(k,k),v) for k,v in c["types"].items())),
                          (kwtags or "<span class='tag gray'>通用/跨章</span>"), item_html))
    # 专题区
    spec_html = ""
    if special:
        rows = []
        for s in special:
            r = s["rec"]
            rows.append("<tr><td class='qid'>%s</td><td class='qtype'>%s</td><td class='qcat'>%s</td>"
                        "<td class='qstem'>%s</td><td class='qref'>%s</td></tr>"%(
                esc(r["id"]),esc(TYPE_CN.get(r["type"],r["type"])),
                esc(CAT_CN.get(r["cat"],r["cat"])),esc(r["stem"][:50]),esc(s["ref"])))
        spec_html = ("<section class='chap special'>\n<h2><span class='cn'>专题 · 全书综合 / 跨媒介 / 史实</span></h2>"
            "<p class='summary'>以下题目指向全书、跨媒介改编或史实背景，不对应单一章节：</p>"
            "<table class='qlist'><thead><tr><th>题号</th><th>题型</th><th>维度</th><th>题干</th><th>定位说明</th></tr></thead>"
            "<tbody>%s</tbody></table></section>"% "".join(rows))

    total = sum(ch[n]["count"] for n in range(1,31)) + len(special)
    html_doc = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="nav-embed.css?v=20260828b">
<title>《红岩》章节考点对照表</title>
<style>
:root{--red:#b21f1f;--red2:#8a1414;--gold:#d4a017;--paper:#fcfaf5;--line:#e6dcc8;}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
 background:var(--paper);color:#2b2622;line-height:1.6;font-size:14px}
.wrap{max-width:960px;margin:0 auto;padding:28px 22px 60px}
.page-head{border-bottom:3px solid var(--red);padding-bottom:14px;margin-bottom:8px}
.page-head h1{margin:0 0 6px;font-size:24px;color:var(--red2);letter-spacing:1px}
.sub{color:#6b5d4f;font-size:13px;margin:2px 0}
.stat{background:#f3ece0;border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin:14px 0;font-size:13px}
.stat b{color:var(--red2)}
.bar{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 4px}
.chap{border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin:16px 0;background:#fff;
 page-break-inside:avoid}
.chap h2{margin:0 0 8px;font-size:18px;color:var(--red2);border-left:5px solid var(--red);padding-left:10px}
.cn{font-weight:700}
.summary{background:#f7f2e7;padding:8px 12px;border-radius:6px;color:#54483a;font-size:13px;margin:0 0 8px}
.meta{font-size:13px;color:#6b5d4f;margin:4px 0}
.kwline{margin:6px 0 10px;font-size:13px}
.tag{display:inline-block;background:var(--red);color:#fff;border-radius:12px;padding:1px 9px;margin:2px 4px 2px 0;font-size:12px}
.tag.gray{background:#9a8e7c}
.qlist{width:100%%;border-collapse:collapse;margin-top:6px;font-size:12.5px}
.qlist th,.qlist td{border:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}
.qlist th{background:#f0e7d6;color:var(--red2);font-weight:600}
.qid{width:54px;color:var(--red2);font-weight:600;white-space:nowrap}
.qtype{width:46px;white-space:nowrap}
.qcat{width:62px;white-space:nowrap}
.qstem{width:auto}
.qref{width:34%%}
.nores{color:#9a8e7c;font-style:italic}
.special{border-color:var(--gold)}
.special h2{border-left-color:var(--gold);color:#8a6d1f}
.note{margin-top:26px;border-top:1px dashed var(--line);padding-top:12px;color:#7a6c5b;font-size:12px}
.btns{position:sticky;top:0;background:var(--paper);padding:8px 0;z-index:5}
.btns button{font:inherit;border:1px solid var(--red);background:#fff;color:var(--red2);
 border-radius:6px;padding:5px 12px;cursor:pointer;margin-right:8px}
@media print{
 body{font-size:12px;background:#fff}
 .wrap{max-width:100%%;padding:0 8px}
 .btns{display:none}
 .chap{box-shadow:none;page-break-inside:avoid}
 .page-head h1{font-size:20px}
}
</style></head>
<body><header class="nav" id="nav">
  <a class="nav-logo" href="index.html" aria-label="红色文化传播网">
    <svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.26 6.87.6-5.2 4.51 1.53 6.72L12 16.9l-6.1 3.19 1.53-6.72-5.2-4.51 6.87-.6L12 2z" fill="#C8102E"/></svg>
    <span>红色文化传播网</span>
  </a>
  <nav class="nav-links" aria-label="主导航">
    <a href="heroes.html">英雄人物</a>
    <a href="places.html">红色地点</a>
    <a href="events.html">历史事件</a>
    <a href="index.html#quiz">知识考核</a>
    <a href="index.html#footer">关于本站</a>
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
  <a href="index.html#footer">关于本站</a>
</div>
<div class="wrap">
<header class="page-head">
 <h1>《红岩》章节考点对照表</h1>
 <p class="sub">整本书阅读 · 数字教学配套（与《红岩》题库 229 题一一对应）</p>
 <p class="sub">章节依据：中国青年出版社 30 章本；部分后段微事件不同教学本或 ±1 章。</p>
</header>
<div class="stat">
 <div>题库总量：<b>%d</b> 题 ｜ 题型分布：%s</div>
 <div class="bar">章节覆盖：<b>第 1—30 章 全覆盖</b>（含专题区 %d 题指向全书/跨媒介/史实）</div>
 <div class="bar" style="font-size:12px;color:#7a6c5b">说明：章内“题量”按<b>章节相关性</b>统计，一道跨章题（如江姐相关）会在多个章节重复出现，故各章相加会大于 229；题库总题数仍为 229。</div>
</div>
<div class="btns"><button onclick="document.querySelectorAll('.qlist').forEach(t=>t.style.display=t.style.display==='none'?'':'none')">折叠/展开全部题目</button></div>
%s
%s
<div class="note">
 说明：①本表“回书指引”仅作章节定位与极少量短引文，属教学“适当引用”，不涉及全文转载；
 ②《红岩》作者罗广斌（1967年逝世）、杨益言（2017年逝世），合作作品著作权保护期至 2067.12.31，
 数字教学请勿将全书原文搬入小程序/平台，引用须简短并署名；③数据依据红岩革命历史博物馆、人民网党史频道等权威来源核实。
</div>
</div>
<script>
document.querySelectorAll('.chap h2').forEach(h=>{
 h.style.cursor='pointer';
 h.onclick=()=>{const t=h.parentElement.querySelector('.qlist');if(t)t.style.display=t.style.display==='none'?'':'none';};
});
</script>
<script src="script.js?v=20260828b"></script>
</body></html>""" % (total, esc(tstr), len(special), "".join(cards), spec_html)
    return html_doc

# ============================================================
# 输出 JSON / CSV
# ============================================================
def gen_json(meta, ch, special):
    out = {"meta":{"total":meta.get("total"),"source":"hongyan-quiz.json",
                   "chapter_basis":"中国青年出版社30章本"},
           "chapters":[]}
    for n in range(1,31):
        c = ch[n]
        out["chapters"].append({
            "chapter":n,"summary":CHAPTERS[n],
            "count":c["count"],
            "types":{TYPE_CN.get(k,k):v for k,v in c["types"].items()},
            "keywords":sorted(c["kw"]),
            "questions":[{"id":i["id"],"type":TYPE_CN.get(i["type"],i["type"]),
                          "cat":CAT_CN.get(i["cat"],i["cat"]),"stem":i["stem"]} for i in c["items"]]})
    if special:
        out["chapters"].append({"chapter":"special","summary":"全书综合/跨媒介/史实背景，不对应单一章节",
            "count":len(special),
            "questions":[{"id":s["rec"]["id"],"type":TYPE_CN.get(s["rec"]["type"],s["rec"]["type"]),
                          "cat":CAT_CN.get(s["rec"]["cat"],s["rec"]["cat"]),"stem":s["rec"]["stem"],
                          "ref":s["ref"]} for s in special]})
    return out

def gen_csv(ch, special):
    rows = []
    for n in range(1,31):
        c = ch[n]
        ids = ",".join(i["id"] for i in c["items"])
        kws = ",".join(sorted(c["kw"]))
        rows.append([n, CHAPTERS[n].replace(",","，"), c["count"], ids, kws])
    for s in special:
        r = s["rec"]
        rows.append(["专题", "全书综合/跨媒介/史实", 1, r["id"], s["ref"]])
    return rows

# ============================================================
def main():
    meta, qs, ch, special = build()
    # HTML
    open(os.path.join(HERE,"chapter-map.html"),"w",encoding="utf-8").write(gen_html(meta,ch,special))
    # JSON
    json.dump(gen_json(meta,ch,special), open(os.path.join(HERE,"chapter-map.json"),"w",encoding="utf-8"),
              ensure_ascii=False, indent=1)
    # CSV
    with open(os.path.join(HERE,"chapter-map.csv"),"w",encoding="utf-8-sig",newline="") as f:
        w = csv.writer(f)
        w.writerow(["章节","本章梗概","题量","题号列表","核心考点"])
        for r in gen_csv(ch,special): w.writerow(r)
    # 校验: 去重后的"出现在某章或专题"的题应 = 题库总题数
    seen = set()
    for n in range(1,31):
        for it in ch[n]["items"]:
            seen.add(it["id"])
    for s in special:
        seen.add(s["rec"]["id"])
    total_cells = sum(ch[n]["count"] for n in range(1,31)) + len(special)
    print("生成完毕")
    print("  HTML/JSON/CSV 已写出")
    print("  章内题量累计(含跨章重复):",total_cells)
    print("  去重覆盖题数:",len(seen),"| 题库题数:",len(qs),"| 一致:",len(seen)==len(qs))
    print("  专题区(无单章):",len(special))
    covered = [n for n in range(1,31) if ch[n]["count"]>0]
    print("  有题章节:",len(covered),"/ 30")
    empty = [n for n in range(1,31) if ch[n]["count"]==0]
    print("  空章节(无题):",empty if empty else "无")

if __name__=="__main__":
    main()
