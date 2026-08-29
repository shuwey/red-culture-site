/*
 * cloud-lazy.js — 云能力脚本延迟加载器
 * 作用：首屏不加载 CloudBase SDK（~786KB）等云脚本，避免其同步执行阻塞主线程
 *       导致"页面一直转圈、内容/图片加载不出来"。改在浏览器空闲后按依赖顺序注入。
 * 依赖：每个页面在引入本文件前需设置 window.RCS_CLOUD_SCRIPTS（要加载的脚本清单）。
 *       若未设置，回退为通用 5 件套。
 */
(function () {
  var VER = "20260829l";
  var DEFAULT = [
    "cloudbase.bundle.js",
    "cloudbase-config.js",
    "auth-service.js",
    "account-ui.js",
    "ai-assistant.js"
  ];
  var list = (window.RCS_CLOUD_SCRIPTS && window.RCS_CLOUD_SCRIPTS.slice) ? window.RCS_CLOUD_SCRIPTS : DEFAULT;

  function inject(i) {
    if (i >= list.length) return;
    // 去掉清单里可能自带的 ?v=xxx，统一用本文件的 VER，
    // 避免生成 auth-service.js?v=20260829d?v=20260829a 这类畸形双 ?v URL。
    var name = String(list[i]).split("?")[0];
    var s = document.createElement("script");
    s.src = name + "?v=" + VER;
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
