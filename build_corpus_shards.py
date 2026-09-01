# -*- coding: utf-8 -*-
"""
build_corpus_shards.py —— 2.2 corpus 分片（派生自 data/corpus.json，不改动源）

设计（匹配数据 / 上下文数据分离，首开带宽最优）：
  语料 537KB 里，检索必需的「题干+关键词」(name/aliases/keywords) 约 349KB，
  必须首拉才能检索；而「答案正文」(text) 仅 134KB，可在命中结果后再取。
  按书目分片反而让首查 = index + 整本书 text（更大），故采用：
    data/corpus-index.json   轻量索引：id/type/book/name/aliases/keywords/url（无 text/summary）
    data/corpus-text.json    id -> 有效正文(text || summary)，懒加载一次并缓存

前端 ai-assistant.js：
  ensureCorpus() 只拉 index（349KB）；首个 AI 提问时 ensureText() 懒拉 textMap（134KB）一次；
  retrieve 用 index 粗排 top20 -> 取命中项 text -> 重建完整条目(与原文逐字段一致) -> 精排 top6。
首开 AI 带宽：349 + 134 = 483KB（原 537KB），且 text 跨会话缓存；检索结果与原实现逐条等价。

可重复执行；源 corpus.json 不变。
"""
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(ROOT, "data", "corpus.json")
INDEX = os.path.join(ROOT, "data", "corpus-index.json")
TEXTMAP = os.path.join(ROOT, "data", "corpus-text.json")


def main():
    with open(CORPUS, encoding="utf-8") as f:
        corpus = json.load(f)
    items = corpus.get("items", [])

    index_items = []
    text_map = {}
    for it in items:
        index_items.append({
            "id": it.get("id"),
            "type": it.get("type"),
            "book": it.get("book", ""),
            "name": it.get("name", ""),
            "aliases": it.get("aliases", []) or [],
            "keywords": it.get("keywords", []) or [],
            "url": it.get("url", ""),
        })
        # 有效正文：与前端 retrieve 的 `it.text || it.summary` 保持一致
        text_map[it.get("id")] = it.get("text") or it.get("summary") or ""

    index_doc = {
        "version": "1.0",
        "generatedBy": "build_corpus_shards.py",
        "items": index_items,
    }
    with open(INDEX, "w", encoding="utf-8") as f:
        json.dump(index_doc, f, ensure_ascii=False, indent=2)

    with open(TEXTMAP, "w", encoding="utf-8") as f:
        json.dump(text_map, f, ensure_ascii=False, indent=2)

    idx_size = os.path.getsize(INDEX)
    txt_size = os.path.getsize(TEXTMAP)
    full_size = os.path.getsize(CORPUS)
    print("index : %d B (%.1f KB)" % (idx_size, idx_size / 1024))
    print("text  : %d B (%.1f KB)" % (txt_size, txt_size / 1024))
    print("全量  : %d B (%.1f KB)" % (full_size, full_size / 1024))
    print("首开 AI 拉取: index + text = %d B (%.1f KB)  [原 %d B]，text 跨会话缓存"
          % (idx_size + txt_size, (idx_size + txt_size) / 1024, full_size))


if __name__ == "__main__":
    main()
