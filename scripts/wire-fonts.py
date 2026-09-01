#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wire-fonts.py —— 2.1 自托管字体接线（去外部 CDN 依赖）

动作（幂等，可重复执行）：
  1) 删除所有 *.html 里 `fonts.loli.net` 外链（外部 CDN 依赖）。
  2) 在 </head> 前注入本地字体 preload + fonts.css 样式表链接（含版本号）。
  3) 同步生/更新 assets/fonts/fonts.css（@font-face 指向本地子集 woff2）。

字体子集 woff2 由 fonttools 子集化生成（见 .font_charset.txt 字符集），
统一版本号 FONTS_VER，改动字体时升版本即可浏览器缓存失效。
"""
import os
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_VER = "20260901a"
FONT_CSS = os.path.join(ROOT, "assets", "fonts", "fonts.css")

FACES = """
@font-face {{
  font-family: "Noto Sans SC";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("noto-sans-sc-400.woff2?v={v}") format("woff2");
}}
@font-face {{
  font-family: "Noto Sans SC";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("noto-sans-sc-500.woff2?v={v}") format("woff2");
}}
@font-face {{
  font-family: "Noto Sans SC";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("noto-sans-sc-600.woff2?v={v}") format("woff2");
}}
""".format(v=FONTS_VER)

INJECT_BLOCK = (
    '  <link rel="preload" as="font" type="font/woff2" '
    'href="assets/fonts/noto-sans-sc-400.woff2?v={v}" crossorigin>\n'
    '  <link rel="stylesheet" href="assets/fonts/fonts.css?v={v}">\n'
).format(v=FONTS_VER)


def write_font_css():
    os.makedirs(os.path.dirname(FONT_CSS), exist_ok=True)
    with open(FONT_CSS, "w", encoding="utf-8") as f:
        f.write("/* 自托管 Noto Sans SC（子集化，去外部 CDN 依赖）"
                " 由 scripts/wire-fonts.py 生成，勿手工改 ?v= */\n")
        f.write(FACES)
    print("✓ fonts.css 已写/更新:", FONT_CSS)


def process_html(path):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    original = html

    # 1) 移除 loli.net 外链行
    lines = [ln for ln in html.splitlines() if "fonts.loli.net" not in ln]
    html = "\n".join(lines)

    # 2) 注入本地字体链接（幂等：已有则跳过）
    if "assets/fonts/fonts.css" not in html:
        if "</head>" in html:
            html = html.replace("</head>", INJECT_BLOCK + "</head>", 1)
        else:
            # 极端兜底：无 </head> 就在文件头追加
            html = INJECT_BLOCK + html

    if html != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return True
    return False


def main():
    write_font_css()
    changed = 0
    for p in glob.glob(os.path.join(ROOT, "*.html")):
        if process_html(p):
            changed += 1
            print("  ↻ 已接线:", os.path.basename(p))
    print("✓ 处理 html 数:", len(glob.glob(os.path.join(ROOT, "*.html"))),
          " 变更:", changed)


if __name__ == "__main__":
    main()
