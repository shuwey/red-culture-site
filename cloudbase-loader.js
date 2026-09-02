/* 红色文化传播网 · CloudBase JS SDK 加载器
 * 免备案部署版（Cloudflare Pages 等海外/香港托管）：
 * 直接加载随站点同源部署的本地打包版本 cloudbase.bundle.js，
 * 不再把官方 CDN（static.cloudbase.net）作为首选——
 * 跨境访问官方 CDN 可能慢或不稳，本地同源包加载最快最稳，且零外部依赖（杜绝单点故障）。
 * UMD 全量包自带 window.cloudbase，加载完成后自动挂载，供 cloudbase-config.js 等经典脚本使用。
 */
(function () {
  "use strict";

  // 本地 esbuild 打包版本（自包含、零外部依赖），随站点同源部署
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

  if (typeof window.cloudbase !== "undefined") {
    announce();
    return;
  }

  /* 重要：动态创建的 <script> 是「异步」加载的。
     原实现在 appendChild 之后立即派发 cloudbase-ready，导致事件早于 SDK 真正挂载
     （实测：事件触发时 window.cloudbase 仍为 undefined），依赖该事件的代码会拿到未就绪状态。
     改为在 onload 回调中确认已挂载后再派发。 */
  load(LOCAL, function () {
    if (typeof window.cloudbase !== "undefined") announce();
    else console.error("[RCS] 本地 CloudBase SDK 加载失败，云功能不可用");
  }, function () {
    console.error("[RCS] 本地 CloudBase SDK 加载失败，云功能不可用");
  });
})();
