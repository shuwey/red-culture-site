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

  /** 幂等获取 CloudBase app 实例 */
  RCS.getApp = function () {
    if (!this._app) {
      this._app = window.cloudbase.init({ env: this.ENV });
    }
    return this._app;
  };

  /** 云能力是否就绪（SDK 已加载即就绪） */
  RCS.isCloudReady = function () {
    return typeof window.cloudbase !== "undefined";
  };
})();
