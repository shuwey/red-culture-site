/* ============================================================
   红色文化传播网 · 站点配置（CloudBase 版）
   全局命名：window.RCS
   说明：通过 CDN 引入 @cloudbase/js-sdk（tcb.js），在此封装初始化单例。
   所有页面需在 cloudbase-config.js 之前引入 tcb.js。
   ============================================================ */
(function () {
  "use strict";

  window.RCS = window.RCS || {};

  // 站点全局配置
  RCS.ENV = "cloud1-d0g0aq0bl2cfbcbdf"; // 上线前可替换
  RCS.config = RCS.config || {};
  RCS.config.authMode = "email"; // local(昵称匿名) | email(邮箱+密码) | anonymous

  // CloudBase app 单例（懒初始化，避免多页面重复 init 与竞态）
  RCS._app = null;

  /** 幂等获取 CloudBase app 实例
   *  SDK 尚未挂载时抛出带 rcsCode 的可识别错误，便于调用方给出明确提示，
   *  避免出现 "Cannot read properties of undefined" 这类难以定位的报错。 */
  RCS.getApp = function () {
    if (typeof window.cloudbase === "undefined") {
      var err = new Error("SDK_NOT_READY");
      err.rcsCode = "SDK_NOT_READY";
      throw err;
    }
    if (!this._app) {
      this._app = window.cloudbase.init({ env: this.ENV });
    }
    return this._app;
  };

  /** 等待云 SDK 就绪（轮询，最长 maxMs）；超时仍会 resolve，由调用方判断
   *  用途：动态脚本异步加载，cloudbase-ready 事件不可靠，必要时用它兜底。 */
  RCS.waitReady = function (maxMs) {
    return new Promise(function (resolve) {
      if (typeof window.cloudbase !== "undefined") return resolve(true);
      var waited = 0, step = 200;
      var t = setInterval(function () {
        waited += step;
        if (typeof window.cloudbase !== "undefined") { clearInterval(t); resolve(true); }
        else if (waited >= (maxMs || 8000)) { clearInterval(t); resolve(false); }
      }, step);
    });
  };

  /** 云能力是否就绪（SDK 已加载即就绪） */
  RCS.isCloudReady = function () {
    return typeof window.cloudbase !== "undefined";
  };
})();
