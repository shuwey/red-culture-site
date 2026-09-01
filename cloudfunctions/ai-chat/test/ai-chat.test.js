/* ============================================================
   红色文化传播网 · ai-chat 云函数合规/解析逻辑单测
   运行：node --test cloudfunctions/ai-chat/test/
   依赖：index.js 顶层导出的 _test 钩子（纯函数，无网络/无 SDK）
   ============================================================ */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const mod = require("../index");
const { parseModel, lexicalUngrounded, extractSources, envelope } = mod._test;
const { scanSensitive } = require("../lib/sensitive-words");

/* ---------------- parseModel：输出侧 JSON 解析与降级 ---------------- */

test("parseModel: 纯 JSON {answer,grounded} 正确解析", () => {
  const r = parseModel('{"answer":"陈独秀在上海创立小组","grounded":true}');
  assert.equal(r.answer, "陈独秀在上海创立小组");
  assert.equal(r.grounded, true);
});

test("parseModel: 代码围栏包裹的 JSON 可剥离", () => {
  const r = parseModel('```json\n{"answer":"长征历时两年","grounded":false}\n```');
  assert.equal(r.answer, "长征历时两年");
  assert.equal(r.grounded, false);
});

test("parseModel: JSON 前后附带说明文字仍可抽取", () => {
  const r = parseModel('根据史料：\n{"answer":"杨靖宇牺牲于吉林","grounded":true}\n以上仅供参考');
  assert.equal(r.answer, "杨靖宇牺牲于吉林");
  assert.equal(r.grounded, true);
});

test("parseModel: 无 JSON 的纯文本整体作为 answer，grounded 默认 true", () => {
  const r = parseModel("这是一段直接返回的叙述文本，没有结构化字段。");
  assert.equal(r.answer, "这是一段直接返回的叙述文本，没有结构化字段。");
  assert.equal(r.grounded, true);
});

test("parseModel: 缺失 answer 字段则回退整段文本为 answer", () => {
  const r = parseModel('{"grounded":true,"note":"无答案字段"}');
  assert.equal(r.answer, '{"grounded":true,"note":"无答案字段"}');
  assert.equal(r.grounded, true);
});

/* ---------------- lexicalUngrounded：年份矛盾接地校验 ---------------- */

test("lexicalUngrounded: 史料本身无年份 → 不拦截", () => {
  const ctx = [{ text: "这是一段没有年份的史料描述。" }];
  assert.equal(lexicalUngrounded("1921 年发生了重要事件", ctx), false);
});

test("lexicalUngrounded: 仅命中史料内年份 → 不拦截（允许）", () => {
  const ctx = [{ text: "1921 年中国共产党在上海成立。" }];
  assert.equal(lexicalUngrounded("1921 年是建党之年", ctx), false);
});

test("lexicalUngrounded: 仅史料外常识年份 → 放行（不误伤）", () => {
  const ctx = [{ text: "1921 年中国共产党在上海成立。" }];
  assert.equal(lexicalUngrounded("1949 年中华人民共和国成立", ctx), false);
});

test("lexicalUngrounded: 史料内+史料外年份并存（矛盾）→ 拦截", () => {
  const ctx = [{ text: "1921 年中国共产党在上海成立。" }];
  assert.equal(lexicalUngrounded("1921 年建党，而 1949 年建国", ctx), true);
});

/* ---------------- extractSources：来源提取 ---------------- */

const CTX = [{ url: "https://example.com/hongyan", book: "《红岩》", title: "甫志高" }];

test("extractSources: 模型把 url 写进回答 → 命中提取", () => {
  const out = extractSources("详见 https://example.com/hongyan", CTX);
  assert.equal(out.length, 1);
  assert.equal(out[0].url, "https://example.com/hongyan");
  assert.equal(out[0].title, "《红岩》 · 甫志高");
});

test("extractSources: 回答未含 url → 兜底最相关一条", () => {
  const out = extractSources("甫志高是叛徒", CTX);
  assert.equal(out.length, 1);
  assert.equal(out[0].url, "https://example.com/hongyan");
});

test("extractSources: 无上下文 → 返回空数组", () => {
  assert.deepEqual(extractSources("任何回答", []), []);
});

/* ---------------- envelope：统一信封 ---------------- */

test("envelope: 成功信封结构", () => {
  const e = envelope(true, { answer: "x" });
  assert.equal(e.success, true);
  assert.deepEqual(e.data, { answer: "x" });
  assert.equal(e.error, null);
});

test("envelope: 失败信封含 code/message", () => {
  const e = envelope(false, null, "SENSITIVE", "命中敏感词");
  assert.equal(e.success, false);
  assert.equal(e.data, null);
  assert.deepEqual(e.error, { code: "SENSITIVE", message: "命中敏感词" });
});

/* ---------------- scanSensitive：敏感词拦截（合规铁门） ---------------- */

test("scanSensitive: 命中敏感词返回 true", () => {
  assert.equal(scanSensitive("发表台独言论"), true);
});

test("scanSensitive: 命中历史虚无类词返回 true", () => {
  assert.equal(scanSensitive("为汉奸翻案"), true);
});

test("scanSensitive: 正常红色文化内容返回 false", () => {
  assert.equal(scanSensitive("李大钊是中国最早的马克思主义传播者"), false);
});

test("scanSensitive: 空串返回 false", () => {
  assert.equal(scanSensitive(""), false);
});
