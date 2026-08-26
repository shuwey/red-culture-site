/* ============================================================
   红色文化传播网 · 运营后台管理云函数 admin
   职责：
     1) 用户纠错提交（无需 token）：action=correction.submit
        —— 写入 corrections 集合（status=pending），供后台审核
     2) 运营审核管理（需 ADMIN_TOKEN）：
        —— 敏感词：list / add(默认pending) / approve(生效) / reject / delete
        —— 纠错审核：list / handle(resolved|rejected + 处理意见)
   安全：
     - 所有写操作以云端管理员身份落库，集合安全规则对客户端全封闭
     - ADMIN_TOKEN 未配置时，所有管理操作一律拒绝（安全默认）
     - token 使用恒定时间比较，防时序攻击
   ============================================================ */
"use strict";

const cloudbase = require("@cloudbase/node-sdk");

let _app = null;
function getApp() {
  if (!_app) {
    _app = cloudbase.init({ env: process.env.TCB_ENV || "cloud1-d0g0aq0bl2cfbcbdf" });
  }
  return _app;
}

function envelope(success, data, code, message) {
  return {
    success: success,
    data: data || null,
    error: success ? null : { code: code, message: message },
  };
}

/* 恒定时间令牌比较，防时序攻击 */
function checkToken(event) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false; // 未配置 token → 拒绝一切管理操作
  const got = event && event.adminToken;
  if (typeof got !== "string") return false;
  if (expected.length !== got.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return diff === 0;
}

/* ---------- 敏感词 ---------- */
async function wordList() {
  const db = getApp().database();
  const res = await db
    .collection("sensitive_words")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return res.data || [];
}

async function wordAdd(word, category) {
  const db = getApp().database();
  const w = String(word || "").trim();
  if (!w) throw new Error("WORD_EMPTY");
  const exist = await db.collection("sensitive_words").where({ word: w }).get();
  if (exist.data && exist.data.length) throw new Error("WORD_EXISTS");
  const now = new Date();
  const doc = {
    word: w,
    category: category || "运营新增",
    status: "pending", // 新增默认待审核，审核通过后才进入生效词库
    createdBy: "admin",
    approvedBy: null,
    approvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const r = await db.collection("sensitive_words").add(doc);
  return Object.assign({ _id: r.id }, doc);
}

async function wordApprove(id) {
  const db = getApp().database();
  return db.collection("sensitive_words").doc(id).update({
    status: "active",
    approvedBy: "admin",
    approvedAt: new Date(),
    updatedAt: new Date(),
  });
}

async function wordReject(id) {
  const db = getApp().database();
  return db.collection("sensitive_words").doc(id).update({
    status: "rejected",
    updatedAt: new Date(),
  });
}

async function wordDelete(id) {
  const db = getApp().database();
  return db.collection("sensitive_words").doc(id).remove();
}

/* ---------- 纠错 ---------- */
async function correctionSubmit(payload) {
  const db = getApp().database();
  const now = new Date();
  const doc = {
    contentType: String(payload && payload.contentType || "通用").slice(0, 20),
    quote: String(payload && payload.quote || "").slice(0, 500),
    description: String(payload && payload.description || "").slice(0, 1000),
    contact: String(payload && payload.contact || "").slice(0, 100),
    uid: String(payload && payload.uid || "").slice(0, 64),
    status: "pending", // 待运营审核处理
    handledBy: null,
    handleNote: "",
    createdAt: now,
    updatedAt: now,
  };
  if (!doc.description) throw new Error("DESC_EMPTY");
  const r = await db.collection("corrections").add(doc);
  return Object.assign({ _id: r.id }, doc);
}

async function correctionList(status) {
  const db = getApp().database();
  let q = db.collection("corrections");
  if (status) q = q.where({ status: status });
  const res = await q.orderBy("createdAt", "desc").limit(200).get();
  return res.data || [];
}

async function correctionHandle(id, status, handleNote) {
  const db = getApp().database();
  if (!["resolved", "rejected"].includes(status)) throw new Error("BAD_STATUS");
  return db.collection("corrections").doc(id).update({
    status: status,
    handleNote: String(handleNote || "").slice(0, 1000),
    handledBy: "admin",
    handledAt: new Date(),
    updatedAt: new Date(),
  });
}

/* ---------- 入口 ---------- */
exports.main = async (event) => {
  const action = event && event.action;

  // 1) 用户纠错提交无需 token
  if (action === "correction.submit") {
    try {
      const item = await correctionSubmit(event);
      return envelope(true, { item: item }, null, null);
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      return envelope(false, null, "ERR_" + msg, "提交失败：" + msg);
    }
  }

  // 2) 其余管理操作必须持有有效 token
  if (!checkToken(event)) {
    return envelope(false, null, "FORBIDDEN", "管理员令牌无效或未配置");
  }

  try {
    switch (action) {
      case "ping":
        return envelope(true, { ok: true }, null, null);
      case "word.list":
        return envelope(true, { items: await wordList() }, null, null);
      case "word.add":
        return envelope(true, { item: await wordAdd(event.word, event.category) }, null, null);
      case "word.approve":
        return envelope(true, { result: await wordApprove(event.id) }, null, null);
      case "word.reject":
        return envelope(true, { result: await wordReject(event.id) }, null, null);
      case "word.delete":
        return envelope(true, { result: await wordDelete(event.id) }, null, null);
      case "correction.list":
        return envelope(true, { items: await correctionList(event.status) }, null, null);
      case "correction.handle":
        return envelope(
          true,
          { result: await correctionHandle(event.id, event.status, event.handleNote) },
          null,
          null
        );
      default:
        return envelope(false, null, "UNKNOWN_ACTION", "未知操作");
    }
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return envelope(false, null, "ERR_" + msg, msg);
  }
};
