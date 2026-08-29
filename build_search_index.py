#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成站点搜索索引 data/search-index.json。

遍历根目录所有 *.html，从 <title> 解析出「名称 · 分类 · 红色文化传播网」，
产出 [{t: 名称, c: 分类, u: 链接, k: 关键词}] 供 search.js 客户端检索。
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "data", "search-index.json")

# 不在搜索范围内的内部/管理页
SKIP = {"admin.html", "audit-report.html"}

# 分类别名归一
CATEGORY_ALIAS = {
    "英雄人物": "英雄人物",
    "红色地点": "红色地点",
    "历史事件": "历史事件",
    "知识库与教学设计": "红色文学",
    "整本书阅读": "红色文学",
    "首页": "站点",
    "关于本站": "站点",
    "常见问题": "站点",
    "联系我们": "站点",
}

title_re = re.compile(r"<title>(.*?)</title>", re.S)
h1_re = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S)


def strip(t):
    t = re.sub(r"<[^>]+>", "", t)
    return t.replace("\n", "").replace(" ", "").strip()


def parse_title(raw):
    raw = strip(raw)
    parts = [p.strip() for p in raw.split("·")]
    parts = [p for p in parts if p]
    site = "红色文化传播网"
    if site in parts:
        parts.remove(site)
    if not parts:
        return raw, ""
    name = parts[0]
    category = parts[1] if len(parts) > 1 else ""
    category = CATEGORY_ALIAS.get(category, category)
    return name, category


def main():
    entries = []
    seen = set()
    files = sorted(f for f in os.listdir(ROOT) if f.endswith(".html"))
    for f in files:
        if f in SKIP:
            continue
        path = os.path.join(ROOT, f)
        try:
            html = open(path, encoding="utf-8").read()
        except Exception as e:
            print("skip", f, e, file=sys.stderr)
            continue
        m = title_re.search(html)
        if not m:
            continue
        name, category = parse_title(m.group(1))
        if not name:
            continue
        h1 = h1_re.search(html)
        h1text = strip(h1.group(1)) if h1 else ""
        # 关键词：名称 + 分类 + 文件名(去扩展名) + 首 h1
        base = f[:-5]
        keywords = " ".join([name, category, base, h1text]).strip()
        key = (name, f)
        if key in seen:
            continue
        seen.add(key)
        entries.append({
            "t": name,
            "c": category or "站点",
            "u": f,
            "k": keywords,
        })
    # 排序：分类 -> 名称
    entries.sort(key=lambda e: (e["c"], e["t"]))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fp:
        json.dump(entries, fp, ensure_ascii=False, indent=1)
    print("wrote", OUT, "entries=", len(entries))


if __name__ == "__main__":
    main()
