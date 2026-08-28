/* 红色文化传播网 · CloudBase JS SDK 加载器
 * 改用腾讯官方静态资源 CDN 的 UMD 全量包（static.cloudbase.net），国内稳定可达。
 * 旧版从 npmmirror 的 ESM 文件加载，该地址被服务端 FORBIDDEN（白名单仅到 1.335.0），
 * 导致 window.cloudbase 永远无法挂载，进而 RCS.getApp() 抛错、所有云功能（AI/注册/排行榜）前端失效、APP 回「助手开小差了」。
 * UMD 加载完成后自动挂载全局 window.cloudbase，供 cloudbase-config.js 等经典脚本使用。
 */
(function () {
  "use strict";
  if (typeof window.cloudbase !== "undefined") {
    window.dispatchEvent(new Event("cloudbase-ready"));
    return;
  }
  var s = document.createElement("script");
  s.src = "https://static.cloudbase.net/cloudbase-js-sdk/3.8.2/cloudbase.full.js";
  s.onerror = function () {
    console.error("[RCS] CloudBase SDK 官方 CDN 加载失败，AI/注册/排行榜等云功能将不可用");
  };
  // 经典脚本（非 async/defer）：appendChild 后浏览器会同步加载并执行，
  // UMD 执行完即挂载 window.cloudbase，本加载器随后派发 cloudbase-ready。
  document.head.appendChild(s);
  window.dispatchEvent(new Event("cloudbase-ready"));
})();
