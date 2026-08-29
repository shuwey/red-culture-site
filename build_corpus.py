# -*- coding: utf-8 -*-
"""
build_corpus.py —— 扩充 AI 问答语料池（P0-1）

把两本书的受控题库 + 章节摘要，批量生成可检索的 corpus 条目，合并进
data/corpus.json。保留已有手搓的 38 条（hero/place/event），只增量追加，
可重复执行（按 id 去重，不会重复生成）。

数据来源（均为站内受控内容，不引入任何外部/不可控史料）：
  - hongxing-quiz.json (291 题) / hongyan-quiz.json (229 题)
        → 每题一条 type="qa"，事实正文取 analysis（含正确选项），
          关键词 = 书名 + 正确选项文本 + 所属章节 keywords。
  - hongxing-chapter-map.json (13 章) / chapter-map.json (31 章)
        → 每章一条 type="chapter"，正文取章节 summary。

生成后语料量从 38 条跃升到约 600 条，且仍是站内受控史料，不破任何安全模型。
"""
import json
import os
import collections

ROOT = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(ROOT, "data", "corpus.json")

# (题库文件, 书代码, 书名, 题库页 url, 章节图文件)
BOOKS = [
    ("hongxing-quiz.json", "hx", "《红星照耀中国》", "hongxing-quiz.html", "hongxing-chapter-map.json"),
    ("hongyan-quiz.json", "hy", "《红岩》", "hongyan-quiz.html", "chapter-map.json"),
]


def load(fn):
    with open(os.path.join(ROOT, fn), encoding="utf-8") as f:
        return json.load(f)


def clean_book(t):
    return t.replace("《", "").replace("》", "")


def dedupe(seq):
    seen = set()
    out = []
    for k in seq:
        k = (k or "").strip()
        if k and k not in seen:
            seen.add(k)
            out.append(k)
    return out


def main():
    corpus = load("data/corpus.json") if os.path.exists(CORPUS) else {"version": "1.0", "items": []}
    existing = corpus.get("items", []) or []
    existing_ids = set(i.get("id") for i in existing)
    new_items = []

    for quiz_file, bcode, btitle, page, chap_file in BOOKS:
        quiz = load(quiz_file)
        cmap = load(chap_file)

        # 建立 题目id -> 所属章节 keywords 的映射（用于给题目补充主题词）
        qid_kw = {}
        for ch in cmap.get("chapters", []):
            ckw = ch.get("keywords", []) or []
            for q in ch.get("questions", []):
                qid = q.get("id")
                if qid:
                    qid_kw[qid] = ckw

        # ---- 每题一条 qa ----
        for q in quiz.get("questions", []):
            qid = q.get("id")
            stem = (q.get("stem") or "").strip()
            if not stem:
                continue
            ans = q.get("answer")
            ans_keys = ans if isinstance(ans, list) else [ans]
            ans_texts = []
            for o in q.get("options", []) or []:
                if o.get("k") in ans_keys:
                    ans_texts.append(o.get("v", ""))
            ans_text = "、".join([a for a in ans_texts if a])
            ans_label = "、".join([str(k) for k in ans_keys if k])
            analysis = (q.get("analysis") or "").strip()

            name = clean_book(stem).rstrip("？?").strip() or stem
            text = ("正确答案：" + ans_label + ". " + ans_text + "。" + analysis).strip() if analysis \
                else ("正确答案：" + ans_label + ". " + ans_text)

            kws = [clean_book(btitle)]
            if ans_text:
                kws.append(ans_text)
            kws.extend(qid_kw.get(qid, []) or [])

            item = {
                "id": "qa-%s-%s" % (bcode, qid),
                "type": "qa",
                "book": btitle,
                "name": name,
                "aliases": [],
                "keywords": dedupe(kws),
                "url": page,
                "summary": stem,
                "text": text,
            }
            if item["id"] not in existing_ids:
                new_items.append(item)
                existing_ids.add(item["id"])

        # ---- 每章一条 chapter ----
        for ch in cmap.get("chapters", []):
            chno = ch.get("chapter")
            chtitle = ch.get("title", "")
            summary = (ch.get("summary") or "").strip()
            if not summary:
                continue
            name = clean_book("%s 第%s篇 %s" % (btitle, chno, chtitle))
            kws = [clean_book(btitle), chtitle] + (ch.get("keywords", []) or [])
            cid = "ch-%s-%s" % (bcode, chno)
            if cid in existing_ids:
                continue
            new_items.append({
                "id": cid,
                "type": "chapter",
                "book": btitle,
                "name": name,
                "aliases": [],
                "keywords": dedupe(kws),
                "url": page,
                "summary": summary[:80],
                "text": summary,
            })
            existing_ids.add(cid)

    # ---- 合并 + 去重 ----
    all_items = existing + new_items
    seen = set()
    final = []
    for it in all_items:
        iid = it.get("id")
        if iid in seen:
            continue
        seen.add(iid)
        final.append(it)

    out = {
        "version": "2.0",
        "updatedAt": "2026-08-29T00:00:00.000Z",
        "generatedBy": "build_corpus.py",
        "items": final,
    }
    with open(CORPUS, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print("existing:", len(existing))
    print("added  :", len(new_items))
    print("total  :", len(final))
    print("by type:", dict(collections.Counter(i.get("type") for i in final)))


if __name__ == "__main__":
    main()
