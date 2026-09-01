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

// 0) 先同步敏感词库（确保部署包含最新词库副本）
execSync(`"${process.execPath}" "${path.join(ROOT, "scripts", "sync-shared.js")}"`, { stdio: "inherit" });

// 1) rsync 到临时目录
const exFlags = EXCLUDES.map((e) => `--exclude '${e}'`).join(" ");
fs.rmSync(TMP, { recursive: true, force: true });
sh(`rsync -a ${exFlags} ./ "${TMP}/"`);

// 2) 上传静态托管（注意：本命令沿用既定行为，会把 cloudfunctions/scripts/docs 等源文件也推上静态托管）
sh(`cd "${TMP}" && "${TCB}" hosting deploy . / -e ${ENV}`);

console.log("✔ 静态部署完成（环境 " + ENV + "）");
