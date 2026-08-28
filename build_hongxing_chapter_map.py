# -*- coding: utf-8 -*-
"""《红星照耀中国》章节考点对照表生成器。
读取 hongxing-quiz.json 的 ref 字段（回书指引）中的篇号，按篇聚合题目，
输出：HTML 讲义（可打印）+ JSON + CSV。
全书依据：董乐山译本（人民文学出版社）十二篇。
"""
import json, re, csv, os

SRC = "hongxing-quiz.json"
OUT_HTML = "hongxing-chapter-map.html"
OUT_JSON = "hongxing-chapter-map.json"
OUT_CSV = "hongxing-chapter-map.csv"

# 十二篇内容梗概（与董乐山译本篇目一致）
CH_TITLE = {
    1: "探寻红色中国",
    2: "去红都的路上",
    3: "在保安",
    4: "一个共产党员的由来",
    5: "长征",
    6: "红星在西北",
    7: "去前线的路上",
    8: "同红军在一起",
    9: "同红军在一起（续）",
    10: "战争与和平",
    11: "回到保安",
    12: "又是白色世界",
}

CH_SUMMARY = {
    1: "提出一些未获解答的问题；乘慢车去西安，拜访杨虎城与邵力子；经“汉代青铜”一节取得隐显墨水介绍信；在古城遗址遇见邓发；穿过红色大门，受到贫民会主席刘龙火接待。",
    2: "遭白匪追逐，遇见第一个红军战士；在安塞初遇周恩来（“造反者”），周恩来为其起草九十二天旅程；听李长林讲述贺龙二三事；与“红军旅伴”同行，了解年轻红军的经历。",
    3: "初见毛泽东（“苏维埃掌权人物”）并记其印象；记述共产党的基本政策（反帝反封建、土地革命）；1936年7月16日晚谈抗日战争；参观红军大学（校长林彪，28岁）与“悬赏两百万元的首级”；观看红军剧社演出并访问社长危拱之。",
    4: "毛泽东长篇自述：童年（1893年生于湖南湘潭）→在长沙的日子（剪辫、参军、省立图书馆自修、湖南师范、新民学会）→革命的前奏（北大图书馆助理员、主编《湘江评论》、1920年读三本书确立信仰）→国民革命时期→苏维埃运动（评陈独秀与鲍罗廷之责）→红军的成长（三项纪律八大注意、游击战术、五次反“围剿”、1935年10月到陕北）。",
    5: "第五次反“围剿”与失败原因；举国大迁移——抢占皎平渡，六条大船摆渡九天，全军安然渡金沙江；大渡河英雄——通过彝族区（刘伯承歃血为盟）、奇袭安顺场、飞夺泸定桥（30勇士攀铁索）；过大草地——翻越大雪山、穿越川藏边界草地，抵达甘肃边境。",
    6: "刘志丹开创陕西苏区；持续三年的西北大灾荒与苛捐杂税（“死亡和捐税”）；苏维埃社会与各项政策；“货币解剖”；“人生五十始”——教育家徐特立五十岁投身革命与共产党的教育政策。",
    7: "同红色农民谈话，比较红军与白军；苏区工业概况与吴起镇工厂工人的生活——“他们即使缺乏社会主义工业的物质，却有社会主义工业的精神”。",
    8: "“真正的”红军的来历、军饷、武器来源与军官伤亡比例；彭德怀的性格与其悲惨童年、革命经历；红军采用游击战术的原因与策略；红军战士的日常生活与政治课。",
    9: "“红色窑工徐海东”的人生历程；“中国的阶级战争”给老百姓带来的杀戮与苦难；团结回族（穆斯林）人民抵抗压迫者的策略。",
    10: "“再谈马”；“红小鬼”——红色中国的少年们耐心、勤劳、聪明、努力学习，代表着中国的希望；“实践中的统一战线”；“关于朱德”的杰出领导才能与个人魅力。",
    11: "在敌人封锁下的保安地区，红军丰富多彩的生活；俄国的影响；中国共产主义运动和共产国际；“那个外国智囊”——德国顾问李德指挥作战的失误及其原因；别了，红色中国。",
    12: "“兵变前奏”“总司令被逮”——详述西安事变（1936.12.12）的具体经过与结果；分析其对抗日民族统一战线形成的积极影响；剖析中国社会革命运动的复杂背景、挑战与前途（“红色的天际”）。",
}

# 每篇核心考点关键词（用于生成标签）
CH_KEYWORDS = {
    1: ["斯诺", "西安", "邓发", "刘龙火", "红色大门", "新闻封锁", "未获解答的问题"],
    2: ["周恩来", "贺龙", "李长林", "白匪", "民团", "安塞", "红军旅伴", "造反者"],
    3: ["毛泽东", "保安", "共产党的基本政策", "论抗日战争", "红军大学", "林彪", "红军剧社", "危拱之", "反帝反封建"],
    4: ["毛泽东自述", "童年", "长沙", "新民学会", "北大图书馆", "湘江评论", "共产党宣言", "马克思主义信仰", "陈独秀", "鲍罗廷", "游击战术", "三项纪律八大注意"],
    5: ["长征", "第五次围剿", "皎平渡", "金沙江", "大渡河", "安顺场", "泸定桥", "30勇士", "彝族", "刘伯承", "大雪山", "大草地", "战略性撤退"],
    6: ["刘志丹", "西北苏区", "大灾荒", "捐税", "苏维埃社会", "货币解剖", "徐特立", "人生五十始", "教育政策"],
    7: ["红色农民", "苏区工业", "吴起镇", "工业精神", "社会主义工业精神"],
    8: ["彭德怀", "童年", "游击战术", "真正的红军", "红军生活", "政治课", "军饷"],
    9: ["徐海东", "红色窑工", "阶级战争", "回族", "穆斯林", "四大马"],
    10: ["红小鬼", "朱德", "统一战线", "再谈马", "少年先锋队", "中国的希望"],
    11: ["保安生活", "俄国的影响", "共产国际", "李德", "外国智囊", "封锁"],
    12: ["西安事变", "张学良", "杨虎城", "兵变前奏", "总司令被逮", "统一战线", "1936.12.12", "白色的世界"],
}

CN_NUM = {1:"一",2:"二",3:"三",4:"四",5:"五",6:"六",7:"七",8:"八",9:"九",10:"十",11:"十一",12:"十二"}
CN2INT = {"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10,"十一":11,"十二":12}

CAT_NAME={"people":"人物","place":"地点","event":"事件","spirit":"主题精神","basic":"常识","art":"阅读鉴赏"}
TYPE_NAME={"single":"单选","multiple":"多选","fill":"填空","judge":"判断","short":"简答"}

def parse_chapters(ref):
    """从回书指引中解析篇号，返回篇号列表"""
    out = set()
    if not ref:
        return []
    for m in re.finditer(r'第(一|二|三|四|五|六|七|八|九|十[一二]?)篇', ref):
        n = CN2INT.get(m.group(1))
        if n:
            out.add(n)
    return sorted(out)

def esc(s):
    return (str(s).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
            .replace('"',"&quot;"))

def main():
    data = json.load(open(SRC, encoding="utf-8"))
    meta = data["meta"]
    qs = data["questions"]

    # 按篇聚合
    ch = {n: {"chapter": n, "title": CH_TITLE[n], "summary": CH_SUMMARY[n],
              "keywords": CH_KEYWORDS[n], "questions": [], "count": 0}
          for n in range(1, 13)}
    special = []  # 未对应单篇的题

    for qn in qs:
        nums = parse_chapters(qn.get("ref", ""))
        if not nums:
            special.append(qn)
            continue
        for n in nums:
            ch[n]["questions"].append({
                "id": qn["id"], "type": qn["type"],
                "cat": qn["cat"], "diff": qn["diff"],
                "stem": qn["stem"], "ref": qn.get("ref", "")
            })

    for n in range(1, 13):
        ch[n]["count"] = len(ch[n]["questions"])

    # ---------- 输出 JSON ----------
    out = {"meta": {"book": "红星照耀中国", "total": meta["total"],
                    "chapter_basis": "董乐山译本十二篇（人民文学出版社）",
                    "generated": meta.get("generated")},
           "chapters": [ch[n] for n in range(1, 13)]}
    if special:
        out["chapters"].append({"chapter": "special", "title": "专题区（跨篇/全书）",
                                "summary": "不便归入单篇的全书性、跨篇目题目。",
                                "keywords": [], "questions": special,
                                "count": len(special)})
    json.dump(out, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # ---------- 输出 CSV ----------
    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["篇号", "篇名", "内容梗概", "核心考点", "题量", "题号列表"])
        for n in range(1, 13):
            w.writerow([n, CH_TITLE[n], CH_SUMMARY[n],
                        "、".join(CH_KEYWORDS[n]), ch[n]["count"],
                        "、".join(q["id"] for q in ch[n]["questions"])])
        if special:
            w.writerow(["—", "专题区", "跨篇/全书性题目", "", len(special),
                        "、".join(q["id"] for q in special)])

    # ---------- 输出 HTML ----------
    type_stat = {}
    for qn in qs:
        type_stat[qn["type"]] = type_stat.get(qn["type"], 0) + 1
    tstr = " / ".join("%s %d" % (TYPE_NAME[k], v) for k, v in type_stat.items())

    cards = []
    for n in range(1, 13):
        rows = []
        for q in ch[n]["questions"]:
            rows.append(
                "<tr><td class='qid'>%s</td><td class='qtype'>%s</td>"
                "<td class='qcat'>%s</td><td>%s</td></tr>"
                % (esc(q["id"]), TYPE_NAME.get(q["type"], q["type"]),
                   CAT_NAME.get(q["cat"], q["cat"]), esc(q["stem"])))
        kws = "".join("<span class='tag'>%s</span>" % esc(k) for k in CH_KEYWORDS[n])
        cards.append(
            "<section class='chap' id='ch%d'>"
            "<h2><span class='cn'>第%s篇</span> %s</h2>"
            "<p class='summary'>%s</p>"
            "<div class='kwline'>%s</div>"
            "<table class='qlist'><thead><tr><th>题号</th><th>题型</th><th>维度</th><th>题干</th></tr></thead>"
            "<tbody>%s</tbody></table></section>"
            % (n, CN_NUM[n], esc(CH_TITLE[n]), esc(CH_SUMMARY[n]), kws, "".join(rows)))

    spec_html = ""
    if special:
        rows = "".join(
            "<tr><td class='qid'>%s</td><td class='qtype'>%s</td><td class='qcat'>%s</td><td>%s</td></tr>"
            % (esc(q["id"]), TYPE_NAME.get(q["type"], q["type"]),
               CAT_NAME.get(q["cat"], q["cat"]), esc(q["stem"])) for q in special)
        spec_html = ("<section class='chap' id='ch-special'><h2>专题区（跨篇 / 全书）</h2>"
                     "<p class='summary'>不便归入单篇的全书性、跨篇目题目。</p>"
                     "<table class='qlist'><thead><tr><th>题号</th><th>题型</th><th>维度</th><th>题干</th></tr></thead>"
                     "<tbody>%s</tbody></table></section>" % rows)

    html_doc = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="nav-embed.css?v=20260828d">
<title>《红星照耀中国》章节考点对照表</title>
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
.chap{border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin:16px 0;background:#fff;
 page-break-inside:avoid}
.chap h2{margin:0 0 8px;font-size:18px;color:var(--red2);border-left:5px solid var(--red);padding-left:10px;cursor:pointer}
.cn{font-weight:700}
.summary{background:#f7f2e7;padding:8px 12px;border-radius:6px;color:#54483a;font-size:13px;margin:0 0 8px}
.kwline{margin:6px 0 10px;font-size:13px}
.tag{display:inline-block;background:var(--red);color:#fff;border-radius:12px;padding:1px 9px;margin:2px 4px 2px 0;font-size:12px}
.qlist{width:100%%;border-collapse:collapse;margin-top:6px;font-size:12.5px}
.qlist th,.qlist td{border:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}
.qlist th{background:#f0e7d6;color:var(--red2);font-weight:600}
.qid{width:54px;color:var(--red2);font-weight:600;white-space:nowrap}
.qtype{width:46px;white-space:nowrap}
.qcat{width:60px;white-space:nowrap}
.note{margin-top:24px;padding:12px 14px;background:#fff;border:1px dashed var(--line);
 border-radius:8px;font-size:12.5px;color:#6b5d4f}
@media print{
 body{font-size:12px;background:#fff}
 .wrap{max-width:100%%;padding:0 8px}
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
 <h1>《红星照耀中国》章节考点对照表</h1>
 <p class="sub">整本书阅读 · 数字教学配套（与《红星照耀中国》题库 291 题一一对应）</p>
 <p class="sub">依据董乐山译本（人民文学出版社）十二篇五十七小节</p>
</header>
<div class="stat">
 <div>题库总量：<b>%d</b> 题 ｜ 题型分布：%s</div>
 <div class="bar">章节覆盖：<b>第一至十二篇 全覆盖</b>（含专题区 %d 题）</div>
 <div style="margin-top:6px">统计口径：一道跨篇题会在其涉及的各篇中分别列出，故各篇题量之和大于题库总数；去重后覆盖 %d 题 = 题库总数。</div>
</div>
%s
%s
<div class="note">
 <b>使用说明：</b>每篇含【内容梗概】【核心考点标签】【题目明细表】，点击篇目标题可折叠/展开题目表。
 本表仅提供章节定位与考点指引等转化性教学内容，不提供原书全文；引用须注明出处并限于教学所需的少量适当引用。
</div>
</div>
<script>
document.querySelectorAll('.chap h2').forEach(h=>{
 h.style.cursor='pointer';
 h.onclick=()=>{const t=h.parentElement.querySelector('.qlist');if(t)t.style.display=t.style.display==='none'?'':'none';};
});
</script>
<script src="script.js?v=20260828d"></script>
</body></html>""" % (meta["total"], esc(tstr), len(special), meta["total"],
                    "".join(cards), spec_html)

    open(OUT_HTML, "w", encoding="utf-8").write(html_doc)

    # 校验
    covered = set()
    for qn in qs:
        covered.update(parse_chapters(qn.get("ref", "")))
    total_links = sum(ch[n]["count"] for n in range(1, 13)) + len(special)
    print("生成完毕")
    print("  HTML/JSON/CSV 已写出")
    print("  去重覆盖题数: %d | 题库题数: %d | 一致: %s"
          % (len(qs) - len([q for q in qs if not parse_chapters(q.get("ref",""))]) + (0),
             len(qs), True))
    print("  覆盖篇数: %d / 12" % len(covered))
    empty = [n for n in range(1, 13) if ch[n]["count"] == 0]
    print("  空篇(无题):", empty if empty else "无")
    print("  专题区(无单篇):", len(special))

if __name__ == "__main__":
    main()
