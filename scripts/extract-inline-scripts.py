#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把全站内联 <script>（无 src 属性）外置为 assets/js/<页>.inlineN.js，
原位替换为 <script src="...">。已带 src 的外部脚本保持不变。

目的：为启用 CSP script-src 'self' 清除内联脚本污染源。
与 scripts/extract-inline-styles.py 同一思路，但处理 JS。

注意：
- 仅移动内容，不改变执行顺序与位置（经典脚本语义一致）。
- 内联 on* 事件属性不在此脚本处理范围，由后续手工改为 addEventListener。
"""
import os
import re
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS_DIR = os.path.join(ROOT, "assets", "js")
VER = "20260901d"

SCRIPT_RE = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.S)
SRC_RE = re.compile(r"\bsrc\s*=")


def main():
    os.makedirs(JS_DIR, exist_ok=True)
    html_files = sorted(glob.glob(os.path.join(ROOT, "*.html")))
    total_blocks = 0
    total_files = 0
    for path in html_files:
        with open(path, "r", encoding="utf-8") as f:
            html = f.read()
        stem = os.path.splitext(os.path.basename(path))[0]
        parts = []
        last = 0
        idx = 0
        changed = False
        for m in SCRIPT_RE.finditer(html):
            parts.append(html[last : m.start()])
            attrs = m.group(1)
            if SRC_RE.search(attrs):
                # 外部脚本，原样保留
                parts.append(m.group(0))
            else:
                idx += 1
                content = m.group(2)
                fname = "%s.inline%d.js" % (stem, idx)
                fpath = os.path.join(JS_DIR, fname)
                with open(fpath, "w", encoding="utf-8") as jf:
                    jf.write(content)
                total_files += 1
                total_blocks += 1
                repl = '<script src="assets/js/%s?v=%s"></script>' % (fname, VER)
                parts.append(repl)
                changed = True
                print("  %s -> assets/js/%s" % (os.path.basename(path), fname))
            last = m.end()
        parts.append(html[last:])
        if changed:
            with open(path, "w", encoding="utf-8") as f:
                f.write("".join(parts))
    print("完成：外置 %d 个内联脚本块 -> %d 个文件，版本 %s" % (total_blocks, total_files, VER))


if __name__ == "__main__":
    main()
