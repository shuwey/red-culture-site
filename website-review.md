# 红色文化传播网 · 专业评审报告

> 评审对象：对标 Apple 官网的静态站点 + CloudBase BaaS（193 文件 / 56 HTML / 18 JS / 3 CSS / 6 云函数 / 12 JSON / 8 构建脚本）
> 评审视角：前端工程 · 后端/云函数 · 工程结构 · 视觉美化（Apple 对标）· 安全合规 · 性能/无障碍
> 评审日期：2026-09-01

---

## 一、总评评分卡

| 维度 | 评分(10) | 一句话 |
|---|---|---|
| 前端代码质量 | 9.0 | 模块化单例、失败安全、注释即文档，远超同类静态站 |
| 后端/云函数 | 9.0 | 合规三层校验 + 审计留痕 + 恒定时间令牌，工程成熟 |
| 视觉/Apple 对标 | 8.5 | 毛玻璃导航、全屏 Hero、clamp 流体字号、Ken Burns，神似 |
| 安全与合规 | 8.5 | 敏感词/接地/来源/隐私脱敏齐备，仅缺 CSP 头 |
| 无障碍 | 9.0 | 56/56 图片带 alt，弹窗全 aria，键盘可达，reduced-motion 全覆盖 |
| 性能 | 7.5 | 外部字体阻塞、corpus 537KB 首开拉取，可优化 |
| 工程结构/可维护 | 6.5 | 双加载路径 + 生成器脱节 + 无构建编排，是最大短板 |

**结论：这是一个完成度很高、工程素养突出的站点，前端与后端质量都可圈可点。主要风险不在"写错了什么"，而在"结构性的可维护性与未上线的半成品功能"。**

---

## 二、亮点（值得肯定的工程实践）

1. **失败安全（fail-safe）设计贯穿全栈**
   - 云 SDK 加载：官方 CDN → 本地 `cloudbase.bundle.js` 兜底（`cloudbase-loader.js`）；`cloud-lazy.js` 单脚本失败不阻断整条注入链。
   - 会话就绪：一律**轮询 `window.cloudbase`** 而非依赖不可靠的 `cloudbase-ready` 事件（`auth-service.js` `whenReady`、`ai-assistant.js` `waitCloudReady` 均注明实测教训）。
   - AI 未登录 → 不发黑请求，直接引导登录（`ai-assistant.js` `isLoggedIn`）。

2. **后端合规链路扎实（ai-chat）**
   参数校验(1–500字) → 输入敏感词拦截 → 无史料上下文兜底 → 模型调用 → 输出侧敏感词 → 词面接地校验 → 来源提取 → 审计留痕(best-effort)。`lexicalUngrounded` 已放宽到"仅拦与史料矛盾年份"，避免误伤常识年份；`ensureBookMentioned` 确定性补出处。每条分支都有 `log.status` 便于追溯。

3. **admin 云函数安全意识到位**：恒定时间 token 比较（`checkToken`，防时序攻击）、token 未配置即拒绝一切管理操作、所有写字段做长度裁剪、客户端集合全封闭。

4. **排行榜云函数（quiz-rank）隐私处理正确**：仅回传 nickname/score/total/durationSec，过滤 `userId`；昵称公开展示前 `scanSensitive` 命中即置空。

5. **注释即文档**：大量 root-cause 注释（如"手机号账号 user.name 就是手机号本身，故 buildState 必须回退本地昵称"），把踩坑结论固化，极大降低后续维护成本。

6. **无障碍近乎满分**：全站图片 `alt` 覆盖率 **56/56**；登录/成绩/纠错/搜索弹窗均带 `role="dialog"` `aria-modal`；`Esc` 关闭、`focus` 管理、`prefers-reduced-motion` 在动效/视频/Ken Burns 三处全部降级。

7. **视觉 Apple 化到位**：48px 毛玻璃吸顶导航、`min-height:calc(100vh-72px)` 全屏 Hero + 红色渐变 scrim、标题 `letter-spacing:-0.02em`、卡片 28px 圆角、Hero 双文字链 CTA、入场 `reveal` 过渡、逐图独立 `object-position` 调校的 Ken Burns、时间轴移动端自动转纵向——这些正是 Apple 式的"留白 + 大字号 + 克制动效"。

---

## 三、分维度详评

### 前端（9.0）
- 架构：多页应用(MPA) + 全局命名空间单例（`RCS`/`RCSAuth`/`RCSAccount`/`RCSQuiz`/`RCAI`），无打包器，零构建依赖，适合静态托管。
- 检索：客户端 `search.js` 与 `ai-assistant.js` 各实现一套本地检索（bigram 共现打分），轻量可用。
- 细节：`escapeHtml` 在账户/搜索/排行榜/纠错四处各自实现（功能正确，但见"结构"段重复问题）。

### 后端 / 云函数（9.0）
- 三个函数（`ai-chat`/`admin`/`quiz-rank`）职责清晰、信封格式统一（`envelope()`）、单例 `getApp()`、env 来自 `process.env.TCB_ENV` 并有硬编码兜底。
- `ai-chat` 用 Node 原生 `https` 调 LLM，零额外依赖；15s 超时 + 上游错误重试（前端再重试一次）。
- 缺口：导出 `_test` 钩子但**无测试文件/runner**，合规逻辑值得补单测。

### 结构 / 工程（6.5）—— 最大短板
- **双脚本加载路径**：45 个静态页用 `<script src="x.js?v=...">` 直接加载；7 个红文页用 `window.RCS_CLOUD_SCRIPTS` 清单 + `cloud-lazy.js` 顺序注入（注入时剥掉清单内 `?v=` 再套自身 `VER`）。改云脚本须同步 **三处**（45 页 `?v=` + `cloud-lazy.js` 的 `VER` + 7 页的 `cloud-lazy.js?v=`），易漏改致云脚本陈旧。
- **生成器与部署页严重脱节**：`scripts/generate-*.mjs` 仍写死被墙的 `fonts.googleapis.com`/`fonts.gstatic.com`，与已部署页（已换 `fonts.loli.net`）不一致；且 `memory` 明确"永远不要运行 generate-*.mjs"。这是**定时炸弹**——任何人重跑即批量生成白屏页。
- **无根 package.json / 无构建编排**：部署靠手工 rsync + tcb；云函数依赖仅各函数 `package.json`，无统一锁文件与本地调试脚本。
- **敏感词库重复**：`cloudfunctions/ai-chat/lib/sensitive-words.js` 与 `cloudfunctions/quiz-rank/lib/sensitive-words.js` 两份，新增词易只改一处。

### 视觉 / Apple 对标（8.5）
- 高度还原 Apple 的"全屏模块 + 克制留白 + 流体字号 + 毛玻璃 + 缓动"语言；`style.css` 设计令牌（red/ink/gray 三级 / 圆角）与 Apple 调性一致。
- 红文页（`nav-embed.css` + 内联 `<style>`）走"书卷风"第二条设计系统，与主页在标题/栏目/下划线上已对齐（方案 C），属有意区分。
- 可挑剔点：页脚比 Apple 的多列 mega-footer 简单；纯黑"长征"模块大气但非 Apple 常态（主观偏好，非缺陷）。

### 安全与合规（8.5）
- 合规：敏感词（输入/输出双侧）、接地校验、来源可查、AI 声明角标 + 页脚声明、用户纠错审核流，闭环完整。
- 隐私：成绩/排行榜均不回传邮箱等 PII；昵称公开前过滤。
- 待补：静态托管**无 CSP / 安全响应头**（自定义域名 + 边缘函数可加）；外部字体 CSS 无 SRI。

### 性能（7.5）
- Hero 背景图、`long-march-night.mp4`/`luding-bridge.mp4` 自动播放（有 poster、`preload="metadata"`、reduced-motion 暂停），可接受。
- 外部字体 `fonts.loli.net` 仍属 render-blocking 依赖；`corpus.json` 537KB/602 条在 AI 首开拉取；搜索用独立 `search-index.json`。

---

## 四、风险与问题清单（按优先级）

### P1（上线前必须处理）
1. **排行榜功能完整却未上线（孤儿代码）**
   - 证据：`quiz-rank.js` + `cloudfunctions/quiz-rank/index.js` 实现完整，但全站**无任何页面**加载 `quiz-rank.js`（无 `rank-modal`/`rank-open` 挂载点），云函数未挂页面。
   - 影响：审计遗留⑤长期未闭环；已部署的"成绩"无公开展示出口。
   - 建议：在"我的成绩"面板或独立 `/rank` 页挂载 `quiz-rank.js`；昵称过滤已在云函数侧完成，前端 `quiz-service.js` 的客户端昵称预检保留即可。

2. **生成器 `scripts/generate-*.mjs` 是隐性定时炸弹**
   - 证据：三处 `generate-*.mjs` 仍 `fonts.googleapis.com`/`fonts.gstatic.com`（国内被墙→白屏），且类名/版本与已部署页脱节。
   - 建议（三选一，强烈建议执行）：① 把生成器同步到 `loli.net` + 当前 CSS 类名与 `?v=`；② 直接从仓库移除生成器、改由手工编辑单页（与现有工作流一致）；③ 至少在文件头加 `/* ⚠ 禁止运行：与部署页脱节，运行即生成白屏页 */` 醒目注释。

3. **双加载路径版本号需三处同步**
   - 建议：抽一个 `deploy-version.js` 或构建脚本集中管理版本号，或让 7 个红文页也回退到直接 `?v=` 引入（与 45 页统一），消除 cloud-lazy 的 `VER` 旁路。

### P2（应优化）
4. **无根 package.json / 构建编排**：加根 `package.json`（`scripts`: deploy / 版本升级 / 本地起 tcb 模拟），云函数依赖统一锁文件，降低漏步风险。
5. **敏感词库两份**：提取到 `cloudfunctions/_shared/sensitive-words.js` 或符号链接，单一来源。
6. **备案占位公开显示**：`ICP备案号：待填写`/`公网安备：待填写` 当前为预期（备案进行中），但环境 **2026-09-19 到期**——须先续费（开固定 IP）再备案；拿到号后一条全局替换即可（memory 已规划）。注意默认域名对自动化 IP 返回 418，验证用真实浏览器。
7. **外部字体阻塞**：自托管 `Noto Sans SC` woff2 到 CloudBase 静态托管 + `<link rel="preload">`，彻底去外部依赖、提速且消除单点。

### P3（锦上添花）
8. **补自动化测试**：`ai-chat` 已留 `_test` 钩子，加 `*.test.js`（接地/敏感词/JSON 解析）跑在 CI。
9. **加 CSP 头**：自定义域名 + 边缘函数返回 `Content-Security-Policy`（禁用 unsafe-inline 需先改造内联 `<style>`）。
10. **authMode 命名误导**：`RCS.config.authMode="email"` 与实际手机号主导流程语义不符（非 bug，建议改名 `phone` 或加注释）。
11. **corpus 体积**：AI 首开拉 537KB，可按书目分片懒加载。

---

## 五、落地路线建议（按 ROI 排序）

1. **本周**：① 处理排行榜孤儿（挂页面或暂时移除云函数以免"部署了却看不到"）；② 给 `generate-*.mjs` 加禁用注释或移除；③ 备案续费启动。
2. **本月**：④ 统一脚本加载路径（去 cloud-lazy 旁路）；⑤ 加根 `package.json` + deploy 脚本；⑥ 敏感词库合并。
3. **长期**：⑦ 自托管字体；⑧ 补单测 + CSP；⑨ corpus 分片。

---

## 六、一句话总结
> 代码写得很"贵"（工程素养高、降级与合规想得透），但**结构上欠一次"收口"**：把生成器、双加载路径、无构建编排这三处理顺，并把排行榜孤儿功能真正上线，这个站点就能从"个人精品"升级为"可长期维护的生产级站点"。
