/* ============================================================
   红色文化传播网 · CloudBase 云函数 user-register
   职责：服务端建号（Node SDK auth.createUser），避免邮箱验证链路
   前端注册流程：
     1) callFunction('user-register', { username, password })
     2) 成功后再 signInWithPassword({ username, password }) 自动登录
   入口约定：exports.main = async (event) => envelope
     - event = { username, password }
     - 返回 { success, data:{uid}, error:{code,message} }
   ============================================================ */
"use strict";

const cloudbase = require("@cloudbase/node-sdk");

const ENV = "cloud1-d0g0aq0bl2cfbcbdf";

function envelope(success, data, code, message) {
  return {
    success: success,
    data: data || null,
    error: success ? null : { code: code, message: message },
  };
}

exports.main = async (event) => {
  const username = String((event && event.username) || "").trim();
  const password = String((event && event.password) || "");

  if (!username || !password) {
    return envelope(false, null, "INVALID_PARAM", "用户名或密码不能为空");
  }
  if (password.length < 8) {
    return envelope(false, null, "INVALID_PARAM", "密码至少 8 位");
  }

  const app = cloudbase.init({ env: ENV });
  try {
    const res = await app.auth().createUser({ username: username, password: password });
    return envelope(true, { uid: res && res.uid }, null, null);
  } catch (e) {
    const msg = (e && e.message) || String(e);
    const code = /already|existed|duplicate|E11000/i.test(msg)
      ? "ALREADY_EXISTS"
      : "CREATE_FAILED";
    return envelope(false, null, code, "注册失败，请稍后重试");
  }
};
