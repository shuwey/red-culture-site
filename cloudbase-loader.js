/* 红色文化传播网 · CloudBase JS SDK 加载器
 * 改用腾讯官方静态资源 CDN 的 UMD 全量包（static.cloudbase.net），国内稳定可达。
 * 旧版从 npmmirror 的 ESM 文件加载，该地址被服务端 FORBIDDEN（白名单仅到 1.335.0），
 * 导致 window.cloudbase 永远无法挂载，进而 RCS.getApp() 抛错、所有云功能（AI/注册/排行榜）前端失效、APP 回「助手开小差了」。
 * UMD 加载完成后自动挂载全局 window.cloudbase，供 cloudbase-config.js 等经典脚本使用。
 */
(function () {
  "use strict";

  var CDN = "https://static.cloudbase.net/cloudbase-js-sdk/3.8.2/cloudbase.full.js";
  // 本地 esbuild 打包版本（自包含、零外部依赖），作为 CDN 不可用时的兜底
  var LOCAL = "cloudbase.bundle.js?v=20260829d";

  function announce() {
    window.dispatchEvent(new Event("cloudbase-ready"));
  }

  function load(src, onOk, onFail) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = onOk;
    s.onerror = onFail;
    document.head.appendChild(s);
  }

  // CDN 失败时回退本地包，避免外部依赖成为单点故障
  function fallback() {
    load(LOCAL, function () {
      if (typeof window.cloudbase !== "undefined") announce();
      else console.error("[RCS] 本地 CloudBase SDK 加载失败，云功能不可用");
    }, function () {
      console.error("[RCS] 本地 CloudBase SDK 加载失败，云功能不可用");
    });
  }

  if (typeof window.cloudbase !== "undefined") {
    announce();
    return;
  }

  /* 重要：动态创建的 <script> 是「异步」加载的。
     原实现在 appendChild 之后立即派发 cloudbase-ready，导致事件早于 SDK 真正挂载
     （实测：事件触发时 window.cloudbase 仍为 undefined），依赖该事件的代码会拿到未就绪状态。
     改为在 onload 回调中确认已挂载后再派发。 */
  load(CDN, function () {
    if (typeof window.cloudbase !== "undefined") announce();
    else fallback();
  }, function () {
    console.warn("[RCS] CloudBase SDK 官方 CDN 加载失败，回退本地打包版本");
    fallback();
  });
})();
