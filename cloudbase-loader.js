// 红色文化传播网 · CloudBase JS SDK 加载器（ESM）
// 新版 @cloudbase/js-sdk 为 ESM 包、无 UMD 全局；此处导入并挂到 window.cloudbase，
// 供站点既有经典脚本（cloudbase-config.js 等）以全局方式使用。
import * as CB from "https://cdn.jsdelivr.net/npm/@cloudbase/js-sdk@3.8.2/dist/index.esm.js";
window.cloudbase = CB.default || CB;
window.dispatchEvent(new Event("cloudbase-ready"));
