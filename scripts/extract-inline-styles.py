#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extract-inline-styles.py — 为 CSP(style-src 'self') 做准备：
1) 把各 HTML 的内联 <style> 块抽到 assets/css/<页面>.css（按页独立，避免跨页选择器冲突），
   并在主样式 link 之后插入 <link> 引用（保持层叠顺序不变）。
2) 把元素上的 style="X" 属性转成 .s-<hash8> 类，写入共享 assets/css/inline-attrs.css，
   与元素原有 class 合并追加；相同样式内容去重为同一个类。

幂等：已引用的 link 不再重复插入；已无 <style>/style= 的文件跳过。
安全：先中和 <script> 内容，避免误改 JS 字符串里的 style=。
"""
import os, re, sys, hashlib, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VER = "20260901c"

style_block_re = re.compile(r"<style\b[^>]*>(.*?)</style>", re.S | re.I)
script_re = re.compile(r"(<script\b[^>]*>)(.*?)(</script>)", re.S | re.I)
# 匹配含 style= 的开始标签（仅元素标签，script/style 内容已被中和）
tag_style_re = re.compile(
    r'<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*?)?)\sstyle\s*=\s*"([^"]*)"((?:\s+[^>]*?)?)(/?>)',
    re.S | re.I,
)

attr_classes = {}  # cls -> style content (去重)


def hash_style(val):
    h = hashlib.md5(val.strip().encode("utf-8")).hexdigest()[:8]
    return "s-" + h


def add_class_to_attrs(attrs, cls):
    """在标签属性串 attrs 中注入 class=cls（合并已有 class）。"""
    m = re.search(r'(\bclass\s*=\s")([^"]*)(")', attrs, re.I)
    if m:
        existing = m.group(2)
        new = (existing + " " + cls).strip()
        return attrs[: m.start()] + m.group(1) + new + m.group(3) + attrs[m.end():]
    return attrs + ' class="' + cls + '"'


def insert_link_after_main(s, href):
    if href in s:
        return s  # 已引用，幂等
    link = '<link rel="stylesheet" href="%s">' % href
    m = re.search(r'(<link[^>]*href="(?:style\.css|nav-embed\.css)[^>]*>)', s, re.I)
    if m:
        return s[: m.end()] + link + s[m.end():]
    if "</head>" in s:
        return s.replace("</head>", link + "</head>", 1)
    # 无 head：插到 <body> 前
    if "<body" in s:
        return s.replace("<body", link + "<body", 1)
    return s + link


def process_file(fpath):
    global attr_classes
    rel = os.path.basename(fpath)
    base = os.path.splitext(rel)[0]
    s = open(fpath, encoding="utf-8", errors="ignore").read()
    changed = False

    # --- 1) <style> 块 -> 按页 css ---
    blocks = style_block_re.findall(s)
    if blocks:
        css = "\n".join(b.strip() for b in blocks)
        csspath = os.path.join(ROOT, "assets", "css", base + ".css")
        os.makedirs(os.path.dirname(csspath), exist_ok=True)
        with open(csspath, "w", encoding="utf-8") as fh:
            fh.write("/* 自动抽取自 %s — 勿手改，由 scripts/extract-inline-styles.py 生成 */\n" % rel)
            fh.write(css + "\n")
        s = style_block_re.sub("", s)
        s = insert_link_after_main(s, "assets/css/%s.css?v=%s" % (base, VER))
        changed = True

    # --- 中和 <script> 内容，避免误伤 JS 串里的 style= ---
    scripts = []

    def stash(m):
        scripts.append(m.group(2))
        return m.group(1) + ("__SCRIPT_%d__" % (len(scripts) - 1)) + m.group(3)

    s_neu = script_re.sub(stash, s)

    # --- 2) style= 属性 -> .s-<hash> 类 ---
    has_attr = [False]

    def repl_tag(m):
        has_attr[0] = True
        tag, pre, styleval, post, selfclose = m.groups()
        cls = hash_style(styleval)
        attr_classes[cls] = styleval
        newattrs = add_class_to_attrs(pre + post, cls)
        return "<%s%s%s>" % (tag, newattrs, selfclose)

    s_neu2 = tag_style_re.sub(repl_tag, s_neu)

    if has_attr[0]:
        # 还原 script 内容
        def restore(m):
            return scripts[int(m.group(1))]

        s = re.sub(r"__SCRIPT_(\d+)__", restore, s_neu2)
        s = insert_link_after_main(s, "assets/css/inline-attrs.css?v=%s" % VER)
        changed = True
    else:
        # 无 style= 属性，直接还原（即使被中和也无变化）
        s = re.sub(r"__SCRIPT_(\d+)__", lambda m: scripts[int(m.group(1))], s_neu2)

    if changed:
        with open(fpath, "w", encoding="utf-8") as fh:
            fh.write(s)
        print("✎ 处理 %s (style块=%d, 新增style类=%d)" % (rel, len(blocks), 1 if has_attr[0] else 0))
    return changed


def main():
    html_files = sorted(glob.glob(os.path.join(ROOT, "*.html")))
    n = 0
    for fp in html_files:
        if process_file(fp):
            n += 1
    # 写出共享 attr css
    if attr_classes:
        out = os.path.join(ROOT, "assets", "css", "inline-attrs.css")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as fh:
            fh.write("/* 自动生成 — 由 scripts/extract-inline-styles.py 从 style= 属性抽取 */\n")
            for cls, val in sorted(attr_classes.items()):
                fh.write(".%s{%s}\n" % (cls, val.strip().rstrip(";")))
        print("✎ 写出 inline-attrs.css (%d 个类)" % len(attr_classes))
    print("完成：共处理 %d 个 HTML 文件" % n)


if __name__ == "__main__":
    main()
