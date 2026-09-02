/* ============================================================
   红色文化传播网 · Cloudflare Pages Functions 共享工具
   - envelope: 统一响应信封 { success, data, error }
   - 错误码常量与 CloudBase 时期保持兼容，前端 classifyError 无需改
   ============================================================ */
"use strict";

/** 构造成功响应 */
export function ok(data) {
  return { success: true, data: data || null, error: null };
}

/** 构造失败响应 */
export function fail(code, message, extra) {
  const err = { code, message };
  if (extra) Object.assign(err, extra);
  return { success: false, data: null, error: err };
}

/** 错误码常量（与 CloudBase 时期一一对应，前端错误分类无需改） */
export const CODES = {
  NO_AUTH: "NO_AUTH",
  NO_KEY: "NO_KEY",
  BAD_URL: "BAD_URL",
  INVALID_PARAM: "INVALID_PARAM",
  SENSITIVE: "SENSITIVE",
  NO_CONTEXT: "NO_CONTEXT",
  NO_GROUNDED: "NO_GROUNDED",
  TIMEOUT: "TIMEOUT",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  EMPTY: "EMPTY",
  PARSE_ERROR: "PARSE_ERROR",
  NICK_TAKEN: "NICK_TAKEN",
  NICK_BAD: "NICK_BAD",
  NICK_INVALID: "NICK_INVALID",
  PWD_TOO_SHORT: "PWD_TOO_SHORT",
  LOGIN_FAIL: "LOGIN_FAIL",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  UNKNOWN_ACTION: "UNKNOWN_ACTION",
  QUERY_ERROR: "QUERY_ERROR",
  SAVE_ERROR: "SAVE_ERROR",
};

/** 兜底回复（统一 JSON）；可附 extraHeaders（如 Set-Cookie） */
export function jsonResponse(env, status, body, extraHeaders) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    // 允许同源 POST/PUT 等携带 cookie
    "Access-Control-Allow-Origin": env && env.ALLOWED_ORIGIN ? env.ALLOWED_ORIGIN : "same-origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
  if (extraHeaders) Object.assign(headers, extraHeaders);
  return new Response(JSON.stringify(body), {
    status: status,
    headers: headers,
  });
}

/** 兜底 CORS 预检 */
export function preflight(env) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": env && env.ALLOWED_ORIGIN ? env.ALLOWED_ORIGIN : "same-origin",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/** 从 request 读取 JSON（限制 1 MB） */
export async function readJson(request, maxBytes = 1024 * 1024) {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (ct.indexOf("application/json") === -1) {
    return { ok: false, error: "Expected Content-Type: application/json" };
  }
  const buf = await request.arrayBuffer();
  if (buf.byteLength > maxBytes) return { ok: false, error: "Payload too large" };
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(buf)) };
  } catch (e) {
    return { ok: false, error: "Invalid JSON" };
  }
}
