#!/usr/bin/env node
/* ============================================================
   deploy-static.js — 静态站点一键部署（复刻既定部署流程）
   1) sync-shared 保证敏感词库同步
   2) rsync 项目（排除红线/临时文件）到 /tmp/rcs-deploy
   3) tcb hosting deploy 推到 CloudBase 静态托管
   环境/TCB 路径集中在本文件顶部，便于维护。
   ============================================================ */
"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ENV = "cloud1-d0g0aq0bl2cfbcbdf";
const TCB = "/Users/shuwei/.workbuddy/binaries/node/cli-connector-packages/bin/tcb";
const ROOT = path.resolve(__dirname, "..");
const TMP = "/tmp/rcs-deploy";

// 与既定部署一致的排除项（红线文件 + 临时/缓存），并额外排除服务端源码/内部文档，
// 避免把云函数源码、构建脚本、整改计划等推到公网静态托管（信息泄露）。
const EXCLUDES = [
  ".git",
  ".workbuddy",
  "node_modules",
  "generated-images",
  "appeal-attachments",
  "refund-appeal-*.md",
  "expert-failure-analysis-*.md",
  "rebuttal-to-engineer-*.md",
  "骑楼海报*.png",
  // —— 以下为服务端/内部文件，绝不进公网静态托管 ——
  "cloudfunctions",
  "scripts",
  "docs",
  "*.md",
  "package.json",
  "package-lock.json",
  "cloudbaserc.json",
];

function sh(cmd) {
  console.log("▶", cmd);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

// —— 前置检查：拦截可视化编辑器/常驻污染源注入的噪音属性 ——
// 某画布式 HTML 编辑器会给每个 DOM 节点注入 data-page-node-id（随机 ID 用于画布选中），
// 历史上曾多次被带入已提交/已部署的页面（event-changzheng.html 243 个、places.html 277 个）。
// 这些属性不触发 CSP、不白屏，但属无意义源码噪音且会随常驻进程反复复发。
// 部署前扫描实际上线目录，发现即中止，避免脏数据再次上线。
const NOISE_ATTRS = [
  "data-page-node-id",
  "data-node-id",
  "data-block-id",
  "data-el-id",
  "data-component-id",
  "data-element-id",
  "data-meta-id",
  "data-edit-id",
];
function precheckNoNoise() {
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) { walk(fp); continue; }
      if (!e.name.endsWith(".html")) continue;
      const s = fs.readFileSync(fp, "utf-8");
      for (const pat of NOISE_ATTRS) {
        const n = s.split(pat).length - 1;
        if (n > 0) hits.push(`${path.relative(TMP, fp)} : ${n} × ${pat}`);
      }
    }
  };
  walk(TMP);
  if (hits.length) {
    console.error("\n✖ 部署中止：上线目录发现编辑器噪音属性（可视化编辑器/常驻污染源残留）");
    hits.forEach((h) => console.error("  - " + h));
    console.error(
      "\n请先清理：grep -rln \"data-page-node-id\" --include=\"*.html\" . | grep -v '.workbuddy/'  " +
      "→ 用 python 移除 \\sdata-page-node-id=\"[^\"]*\" 后重新部署。"
    );
    process.exit(1);
  }
  console.log("✔ precheck: 上线目录未发现编辑器噪音属性");
}

// 0) 先同步敏感词库（确保部署包含最新词库副本）
execSync(`"${process.execPath}" "${path.join(ROOT, "scripts", "sync-shared.js")}"`, { stdio: "inherit" });

// 1) rsync 到临时目录
const exFlags = EXCLUDES.map((e) => `--exclude '${e}'`).join(" ");
fs.rmSync(TMP, { recursive: true, force: true });
sh(`rsync -a ${exFlags} ./ "${TMP}/"`);

// 1.5) 前置检查：拦截编辑器噪音属性（防常驻污染源/可视化编辑器残留再次上线）
precheckNoNoise();

// 2) 上传静态托管（注意：本命令沿用既定行为，会把 cloudfunctions/scripts/docs 等源文件也推上静态托管）
sh(`cd "${TMP}" && "${TCB}" hosting deploy . / -e ${ENV}`);

console.log("✔ 静态部署完成（环境 " + ENV + "）");
