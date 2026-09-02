#!/usr/bin/env python3
"""Strip visual-editor / resident-pollution noise attributes from all *.html.

Mirrors the 8 patterns enforced by scripts/deploy-static.js precheckNoNoise():
  data-page-node-id, data-node-id, data-block-id, data-el-id,
  data-component-id, data-element-id, data-meta-id, data-edit-id

Each appears as ` attr="value"` (double or single quotes, or unquoted). We remove
the leading whitespace + attribute + value to keep source clean.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NOISE = [
    "data-page-node-id",
    "data-node-id",
    "data-block-id",
    "data-el-id",
    "data-component-id",
    "data-element-id",
    "data-meta-id",
    "data-edit-id",
]

# value: ="..." | ='...' | =unquoted (no spaces/>); leading whitespace consumed too
PATTERNS = [
    re.compile(r"\s+" + re.escape(a) + r'(?:="[^"]*"|=\'[^\']*\'|=[^\s>]+)?')
    for a in NOISE
]


def count(html):
    return sum(html.count(a) for a in NOISE)


total_removed = 0
files_touched = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    if any(seg in dirpath for seg in ("/.workbuddy", "/node_modules", "/.git")):
        continue
    for fn in filenames:
        if not fn.endswith(".html"):
            continue
        fp = os.path.join(dirpath, fn)
        with open(fp, "r", encoding="utf-8") as f:
            s = f.read()
        before = count(s)
        if before == 0:
            continue
        for pat in PATTERNS:
            s = pat.sub("", s)
        after = count(s)
        if after != 0:
            print(f"  ⚠ residual {after} in {fp}")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(s)
        removed = before - after
        total_removed += removed
        files_touched.append((fp, removed))

if not files_touched:
    print("✔ no noise attributes found site-wide")
else:
    print(f"✔ stripped {total_removed} noise attributes from {len(files_touched)} file(s):")
    for fp, n in files_touched:
        print(f"   - {os.path.relpath(fp, ROOT)} : {n}")
