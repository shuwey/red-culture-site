/*
 * cloud-lazy.js — 后端脚本延迟加载器（Cloudflare 全迁版）
 * 作用：首屏不阻塞，浏览器空闲后按依赖顺序注入后端脚本（api-client + account-ui + ai-assistant）。
 * 依赖：每个页面在引入本文件前可设置 window.RCS_CLOUD_SCRIPTS（要加载的脚本清单）。
 *       若未设置，回退为默认 3 件套（api-client.js 取代 cloudbase-loader + cloudbase-config）。
 */
(function () {
  var VER = "20260903b";
  var DEFAULT = [
    "api-client.js",
    "account-ui.js",
    "ai-assistant.js"
  ];
  var list = (window.RCS_CLOUD_SCRIPTS && window.RCS_CLOUD_SCRIPTS.slice) ? window.RCS_CLOUD_SCRIPTS : DEFAULT;

  function inject(i) {
    if (i >= list.length) return;
    // 尊重清单里每个脚本自带的 ?v=xxx（如 auth-service.js?v=20260829aa），
    // 不再强行套本文件的 VER——改单个云脚本只需在其本页 ?v= 处升版本，
    // 不必再同步本文件的 VER（消除"三处同步"痛点）。清单未带 ?v= 时才回退到 VER。
    var entry = String(list[i]);
    var q = entry.indexOf("?");
    var name = q === -1 ? entry : entry.slice(0, q);
    var ver = q === -1 ? VER : entry.slice(q + 1);
    var s = document.createElement("script");
    s.src = name + "?" + ver;
    // 顺序注入：前一个 onload 后再注入下一个，保证依赖（bundle→config→auth→ui→...）成立
    s.onload = function () { inject(i + 1); };
    // 单个脚本加载失败不阻断整条链
    s.onerror = function () { inject(i + 1); };
    document.body.appendChild(s);
  }

  function start() { inject(0); }

  // 浏览器空闲时再注入：绝不阻塞首屏绘制；timeout 保证最迟 1.2s 启动
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(start, { timeout: 1200 });
  } else {
    setTimeout(start, 300);
  }
})();
