/* ============================================================
   红色文化传播网 · Cloudflare Pages Functions 共享认证 / 工具
   - 方案4：昵称 + Turnstile（零 PII，无密码）
   - 会话：无状态签名 cookie（HMAC-SHA256, 30 天）
   - nanoid：12 字符 URL 安全随机 ID
   - Turnstile：verifyTurnstile 调 siteverify
   - 恒定时间字符串比较（防时序攻击）
   ============================================================ */
"use strict";

import { fail, CODES } from "./envelope.js";

/* ---------------- ID 生成 ---------------- */

export function nanoid(n) {
  n = n || 12;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/* ---------------- base64url ---------------- */

export function bytesToBase64Url(bytes) {
  let s = "";
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------------- Turnstile 验证 ---------------- */

/** 验证 Turnstile token；失败返回 false（不抛） */
export async function verifyTurnstile(token, secret, remoteIp) {
  if (!secret || !token) return false;
  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);
    if (remoteIp) body.append("remoteip", remoteIp);
    const resp = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }
    );
    const data = await resp.json();
    return !!(data && data.success);
  } catch (e) {
    return false;
  }
}

/* ---------------- 会话签名 cookie ---------------- */

const COOKIE_NAME = "rcs_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function hmac(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(data));
}

async function hmacVerify(secret, data, sig) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify("HMAC", key, sig, enc.encode(data));
}

/** 构造 Set-Cookie 头（Cloudflare Pages 永远 HTTPS，Secure 总开） */
export async function buildSetCookie(userId, secret, ttlMs) {
  const expiresAt = Date.now() + (ttlMs || SESSION_TTL_MS);
  const payload = `${userId}.${expiresAt}`;
  const sig = bytesToBase64Url(new Uint8Array(await hmac(secret, payload)));
  const value = `${payload}.${sig}`;
  return {
    name: COOKIE_NAME,
    value: value,
    expiresAt: expiresAt,
    header: `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${Math.floor((ttlMs || SESSION_TTL_MS) / 1000)}`,
  };
}

/** 清除 cookie */
export function clearSetCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

/** 从 request 解析 cookie，返回 { userId, expiresAt } 或 null */
export async function readSession(request, secret) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const raw = decodeURIComponent(match[1]);
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sigB64] = parts;
  if (!userId || !expStr || !sigB64) return null;
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const payload = `${userId}.${expiresAt}`;
  const ok = await hmacVerify(secret, payload, base64UrlToBytes(sigB64));
  if (!ok) return null;
  return { userId, expiresAt };
}

/* ---------------- 昵称校验（无密码） ---------------- */

export function validateNickname(nick) {
  const n = String(nick || "").trim();
  if (n.length < 1 || n.length > 20) return "昵称长度需在 1-20 字符之间";
  if (/[\s\u0000-\u001f\u007f]/.test(n)) return "昵称不能包含空白或控制字符";
  if (/^1[3-9]\d{9}$/.test(n)) return "昵称不能是手机号";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n)) return "昵称不能是邮箱";
  return null;
}

/* ---------------- 当前用户解析 ---------------- */

export async function getCurrentUser(request, env) {
  const secret = env.SESSION_SECRET;
  if (!secret) return null;
  const session = await readSession(request, secret);
  if (!session) return null;
  const row = await env.DB.prepare(
    "SELECT id, nickname, created_at, last_login_at FROM users WHERE id = ?"
  ).bind(session.userId).first();
  return row || null;
}

export async function requireAuth(request, env) {
  const user = await getCurrentUser(request, env);
  if (!user) return { ok: false, response: fail(CODES.NO_AUTH, "请先登录") };
  return { ok: true, user };
}
