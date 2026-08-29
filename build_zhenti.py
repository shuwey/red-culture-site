# -*- coding: utf-8 -*-
"""解析 docs/research/ 下四份中考真题素材 → 生成结构化 JSON + 真题专区页面。

素材来源（均为人工核实、带可访问来源 URL 的真题整理）：
  docs/research/中考真题-红岩-raw.md        13 道
  docs/research/中考真题-红岩-第二批.md      12 道
  docs/research/中考真题-红星-raw.md        18 道
  docs/research/中考真题-红星-第二批.md      55 道

产物：
  zhenti-hongyan.json / zhenti-hongxing.json
  hongyan-zhenti.html / hongxing-zhenti.html
"""
import json
import os
import re
import html
from build_zhenti_html import render_html

ROOT = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.join(ROOT, "docs", "research")

PROVINCES = ["内蒙古", "黑龙江", "河北", "山西", "辽宁", "吉林", "江苏", "浙江",
             "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东",
             "四川", "贵州", "云南", "陕西", "甘肃", "青海", "广西", "西藏",
             "宁夏", "新疆", "海南", "北京", "天津", "上海", "重庆"]

# 题型归一化：按优先级匹配关键词
TYPE_RULES = [
    ("跨学科", ["跨学科", "历史教材", "路线图", "地理"]),
    ("联读比较", ["联读", "比较", "归类", "备选人物", "任选一组", "两部", "两本"]),
    ("专题探究", ["探究", "专题", "读书卡片", "心得", "崇高美", "意象", "主题",
                  "命名", "纪实作品", "观点", "看法"]),
    ("情境任务", ["情境", "推荐语", "讲解词", "展板", "颁奖词", "誓词", "讲稿",
                  "宣传", "招募", "分享", "发言", "课本剧", "脚本", "设计", "倡议"]),
    ("语段阅读", ["语段", "选段", "选文", "片段", "材料", "阅读感受", "赏析",
                  "批注", "人物形"]),
]


def norm_type(raw):
    t = raw or ""
    for name, kws in TYPE_RULES:
        for k in kws:
            if k in t:
                return name
    if any(k in t for k in ["填空", "选择", "判断", "记忆"]):
        return "基础识记"
    return "其他"


def split_prov_city(region):
    """'四川·乐山·' / '浙江湖州·' / '吉林·' → (省, 市)"""
    region = region.strip("·。 ")
    for p in PROVINCES:
        if p in region:
            city = region.replace(p, "").strip("·。· 省")
            if city.endswith("市"):
                city = city[:-1]
            return p, city
    return region.strip("·。 "), ""


def collect_quotes(lines):
    """收集连续的 markdown 引用块行 / 答案区的列表项，返回渲染后的 HTML。"""
    out = []
    for ln in lines:
        s = ln.rstrip()
        if "http" in s and not s.startswith(">"):
            continue  # 来源 URL 列表不算正文
        if re.match(r"^\s*[-*]\s+", s):
            out.append(re.sub(r"^\s*[-*]\s+", "", s))
            continue
        if s.startswith(">"):
            out.append(s.lstrip(">").lstrip())
        elif s.strip() == ">":
            out.append("")
        elif s.strip() == "":
            if out:
                out.append("")
        else:
            break
    while out and out[-1].strip() == "":
        out.pop()
    return md_to_html("\n".join(out))


def md_table_to_html(lines):
    rows = []
    for ln in lines:
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        rows.append(cells)
    if len(rows) < 2:
        return None
    head, body = rows[0], rows[2:]
    th = "".join("<th>%s</th>" % inline(c) for c in head)
    trs = "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % inline(c) for c in r)
                  for r in body if r and any(x.strip() for x in r))
    return '<div class="mdtable"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (th, trs)


def inline(s):
    """极简行内 markdown：加粗 + 转义。"""
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    return s


def md_to_html(text):
    """把题干/答案的 markdown 片段渲染成 HTML（段落 / 引用 / 表格 / 加粗）。"""
    lines = text.split("\n")
    out = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()
        if not s:
            i += 1
            continue
        # 表格
        if s.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            block = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                block.append(lines[i])
                i += 1
            tbl = md_table_to_html(block)
            if tbl:
                out.append(tbl)
            continue
        # 引用块
        if s.startswith("&gt;") or s.startswith(">"):
            block = []
            while i < len(lines) and lines[i].strip().startswith((">", "&gt;")):
                block.append(re.sub(r"^(&gt;|>) ?", "", lines[i].strip()))
                i += 1
            out.append('<blockquote class="zq">%s</blockquote>'
                       % md_to_html("\n".join(block)))
            continue
        # 列表
        if re.match(r"^([-*]|\d+[．.、]) ", s):
            items = []
            while i < len(lines) and re.match(r"^([-*]|\d+[．.、]) ", lines[i].strip()):
                items.append(re.sub(r"^([-*]|\d+[．.、]) ", "", lines[i].strip()))
                i += 1
            tag = "ol" if re.match(r"^\d+[．.、] ", s) else "ul"
            out.append("<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % inline(x) for x in items), tag))
            continue
        out.append("<p>%s</p>" % inline(s))
        i += 1
    return "\n".join(out)


TITLE_Q = re.compile(r"^##\s+(?:([0-9]+|B[0-9]+)\s*·\s*|([0-9]+\.[0-9]+)\s*【)?\s*(20\d{2})")


def parse_file(path, book):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    lines = text.split("\n")
    blocks = []
    cur = None
    for ln in lines:
        if ln.startswith("## "):
            if cur is not None:
                blocks.append(cur)
            cur = [ln]
        elif cur is not None:
            cur.append(ln)
        if ln.startswith("# ") and cur is not None and len(cur) == 1:
            cur = None
    if cur:
        blocks.append(cur)

    items = []
    for blk in blocks:
        title = blk[0][3:].strip()
        # 补充答案区：### 补充：XXX（第一批 NN）参考答案全文
        if "参考答案全文" in "\n".join(blk):
            for seg in re.split(r"(?=###\s*补充：)", "\n".join(blk)):
                m2 = re.search(r"###\s*补充：.*?第[一二]批\s*(\d+)", seg)
                if not m2:
                    continue
                lines2 = seg.split("\n")[1:]
                items.append(("__supplement__", m2.group(1), collect_quotes(lines2), book))
            continue
        m = TITLE_Q.match("## " + title)
        if not m:
            continue
        if re.search(r"统计|渠道|结论|发现|说明|体例|存疑|补充|小结|判断|实证|排名",
                     title):
            # 可能是「补充：xxx（第一批 NN）参考答案全文」这类，单独处理
            continue

        year = m.group(3)
        # 地区串：标题中年份之后到「中考真题」之前
        tail = title.split(year, 1)[1]
        region = re.split(r"中考真题|中考|】", tail)[0]
        prov, city = split_prov_city(region)

        meta = {}
        stem_lines, ans_lines, src_lines = [], [], []
        mode = None
        for ln in blk[1:]:
            s = ln.rstrip()
            ms = re.match(r"^-\s*\*\*(.+?)\*\*[^：:]*[：:]\s*(.*)$", s)
            if ms:
                key, val = ms.group(1), ms.group(2).strip()
                meta[key] = val
                if "题干" in key:
                    mode = "stem"
                    for u in re.findall(r"https?://[^\s）)】\]]+", val):
                        src_lines.append(u)
                    continue
                if "答案" in key:
                    mode = "ans"
                    for u in re.findall(r"https?://[^\s）)】\]]+", val):
                        src_lines.append(u)
                    continue
                if "来源" in key:
                    mode = "src"
                    # 行内形式：- **来源**：〔I〕https://...
                    for u in re.findall(r"https?://[^\s）)】\]]+", val):
                        src_lines.append(u)
                    continue
                mode = None
                continue
            if s.startswith("### "):
                h = s[4:].strip()
                if "题干" in h:
                    mode = "stem"
                    continue
                if "答案" in h:
                    mode = "ans"
                    continue
                if "来源" in h:
                    mode = "src"
                    continue
                if "备注" in h:
                    mode = None
                    continue
                mode = "stem" if not stem_lines else None
                continue
            if s.startswith("---"):
                mode = None
                continue
            if mode == "stem":
                stem_lines.append(s)
            elif mode == "ans":
                ans_lines.append(s)
            elif mode == "src":
                for u in re.findall(r"https?://[^\s）)】\]]+", s):
                    src_lines.append(u)
            else:
                for u in re.findall(r"https?://[^\s）)】\]]+", s):
                    if "来源" in str(meta.keys()) or mode is None:
                        pass

        # 来源 URL 兜底：从整块中抓（避免漏掉行内形式）
        if not src_lines:
            for ln in blk:
                if re.search(r"来源|URL", ln) or re.match(r"^\s*-\s+https?://", ln):
                    for u in re.findall(r"https?://[^\s）)】\]]+", ln):
                        src_lines.append(u)

        stem = collect_quotes([l for l in stem_lines])
        ans = collect_quotes([l for l in ans_lines])
        raw_type = meta.get("题型", "")
        item = {
            "book": book,
            "year": int(year),
            "prov": prov,
            "city": city,
            "region": ("·".join([x for x in [prov, city] if x])),
            "title": re.split(r"[（(]", title)[0].strip("· "),
            "type": norm_type(raw_type),
            "type_raw": raw_type,
            "score": meta.get("分值", ""),
            "verified": "已交叉验证" in meta.get("是否交叉验证", "") or "✅" in meta.get("是否交叉验证", ""),
            "doubt": (meta.get("⚠️解析存疑", "") or meta.get("解析存疑", "") or "").strip(),
            "stem": stem,
            "answer": ans,
            "sources": list(dict.fromkeys(src_lines)),
        }
        items.append(("__item__", title, item, book))
    return items


def main():
    files = [
        ("中考真题-红岩-raw.md", "红岩"),
        ("中考真题-红岩-第二批.md", "红岩"),
        ("中考真题-红星-raw.md", "红星照耀中国"),
        ("中考真题-红星-第二批.md", "红星照耀中国"),
    ]
    all_items = []
    supplements = []
    for fn, book in files:
        p = os.path.join(RESEARCH, fn)
        if not os.path.exists(p):
            print("!! 缺失", fn)
            continue
        for kind, key, payload, bk in parse_file(p, book):
            if kind == "__item__":
                payload["srcfile"] = fn
                all_items.append(payload)
            else:
                supplements.append((bk, key, payload))

    # 回填「补充：第一批 NN 参考答案全文」到答案为空的对应题
    filled = 0
    for bk, idx, ans_html in supplements:
        for x in all_items:
            if x["book"] != bk or x["answer"].strip():
                continue
            m = re.match(r"^(\d+)", x["title"])
            if m and int(m.group(1)) == int(idx):
                x["answer"] = ans_html
                filled += 1
                break
    print("回填补充答案：%d 道（共解析到补充段 %d 个）" % (filled, len(supplements)))

    # 统计
    for book in ["红星照耀中国", "红岩"]:
        sub = [x for x in all_items if x["book"] == book]
        print("\n== %s : %d 题 ==" % (book, len(sub)))
        empty_stem = [x for x in sub if not x["stem"].strip()]
        print("  题干为空:", len(empty_stem))
        for x in empty_stem[:5]:
            print("    -", x["title"])
        empty_ans = [x for x in sub if not x["answer"].strip()]
        print("  答案为空:", len(empty_ans))
        for x in empty_ans[:8]:
            print("    -", x["title"])
        print("  无来源:", len([x for x in sub if not x["sources"]]))
        print("  年份:", sorted(set(x["year"] for x in sub)))
        print("  省份:", len(set(x["prov"] for x in sub)))
        print("  题型:", {t: len([x for x in sub if x["type"] == t])
                          for t in sorted(set(x["type"] for x in sub))})

    for book, slug, fname in [("红星照耀中国", "hongxing", "zhenti-hongxing.json"),
                              ("红岩", "hongyan", "zhenti-hongyan.json")]:
        sub = sorted([x for x in all_items if x["book"] == book],
                     key=lambda x: (-x["year"], x["prov"], x["city"]))
        for i, x in enumerate(sub, 1):
            x["no"] = i
        data = {
            "meta": {
                "book": book,
                "title": "《%s》中考真题专区" % book,
                "total": len(sub),
                "years": sorted(set(x["year"] for x in sub)),
                "provs": sorted(set(x["prov"] for x in sub)),
                "types": sorted(set(x["type"] for x in sub)),
                "generated": "2026-08-29",
                "note": "所有题目均标注「年份·省市」出处并附可访问来源链接；"
                        "查不到原始出处的一律不收录。",
            },
            "questions": sub,
        }
        with open(os.path.join(ROOT, fname), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        html = render_html(data, slug)
        hp = os.path.join(ROOT, "%s-zhenti.html" % slug)
        with open(hp, "w", encoding="utf-8") as f:
            f.write(html)
        print("生成 %s（%d 题）→ %s-zhenti.html  %.0f KB"
              % (fname, len(sub), slug, os.path.getsize(hp) / 1024))


if __name__ == "__main__":
    main()
