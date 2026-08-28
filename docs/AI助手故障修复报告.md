# AI 助手故障修复报告

日期：2026-08-29 · 提交 `1d1bee6`

---

## 一、现象

使用 AI 助手时，恒定弹出「助手开小差了，请稍后再试。」——**每次提问都失败，无一例外**。

---

## 二、根因（实测确认，非推测）

### 排查过程

| 步骤 | 手段 | 发现 |
|---|---|---|
| 1 | 查云函数环境变量 | 配置正确：DeepSeek + `deepseek-chat`（真实模型名） |
| 2 | 查 `ai_logs` 审计集合 | **8-28 之后零记录** → 请求根本没进云函数 |
| 3 | jsdom + 本地 SDK 真实调用 | `unauthenticated / credentials not found` |
| 4 | 补上匿名登录后重测 | 错误变为 `EXCEED_AUTHORITY` |
| 5 | 查云函数安全规则 | `{"*":{"invoke":"auth != null && auth.loginType != 'ANONYMOUS'"}}` |

### 结论

**云函数安全规则禁止匿名用户调用，而站点零普通注册用户。**

- 未登录 → `unauthenticated`（被鉴权拒绝）
- 匿名登录 → `EXCEED_AUTHORITY`（被安全规则拒绝）
- 站点只有 2 个内部账号，**没有任何普通注册用户** → 用户恒为游客身份 → 每次都失败

> 8-27 曾成功过一次（`ai_logs` 中 `status: ok`），那是管理员登录态下产生的。

### 次要问题（同链路查出）

1. **`cloudbase-loader.js` 时序 BUG**（实测确认）：动态插入 `<script>` 后立即派发 `cloudbase-ready` 事件，但动态 script 是**异步**加载的 —— 实测事件触发时 `window.cloudbase` 仍为 `undefined`。导致页面刚打开就点 AI 必定失败。
2. 依赖外部 CDN `static.cloudbase.net`，违反项目「零外部依赖铁律」。
3. `RCS.getApp()` 无防御，SDK 未就绪时抛含糊的 TypeError。
4. 前端 `catch` 万金油兜底，**掩盖全部错误类型**。
5. 无重试机制（日志显示 8-26 那次上游抖动，8 秒后重试即成功）。

---

## 三、修复内容

### 前端

| 文件 | 改动 |
|---|---|
| `ai-assistant.js` | 调用前检查登录态；未登录直接引导登录（「去登录」按钮唤起登录面板），**不发注定失败的请求**；错误按类型分类给出可操作提示；超时/瞬时错误自动重试 1 次；真实错误 `console.error` 留痕；`waitCloudReady()` 轮询替代不可靠事件 |
| `cloudbase-loader.js` | `onload` 确认 SDK 挂载后才派发事件；CDN 失败自动回退本地 `cloudbase.bundle.js` |
| `cloudbase-config.js` | `getApp()` 就绪防御（抛可识别错误）；新增 `RCS.waitReady()` |
| `ai-assistant.css` | 新增 `.rcs-login-cta` 登录引导按钮样式 |

### 错误提示对照

| 情况 | 修复前 | 修复后 |
|---|---|---|
| 未登录 | 助手开小差了，请稍后再试。 | AI 助手需要登录后才能使用，登录后即可继续提问。（附「去登录」按钮） |
| 模型超时 | 助手开小差了，请稍后再试。 | 模型响应超时，请稍后再试。（自动重试 1 次） |
| 上游异常 | 助手开小差了，请稍后再试。 | AI 服务暂时不可用，请稍后再试。 |
| SDK 未就绪 | 助手开小差了，请稍后再试。 | 云能力尚未加载完成，请稍候几秒后重试。 |

### 页面覆盖

7 个红色文学页面接入 AI，采用 **cloud-lazy.js 延迟加载 + 本地 SDK**：

`red-literature.html`、`hongxing-quiz.html`、`hongxing-knowledge-base.html`、`hongxing-chapter-map.html`、`hongyan-quiz.html`、`hongyan-knowledge-base.html`、`chapter-map.html`

首屏不加载 786KB SDK，避免阻塞渲染。`admin.html` 为后台页，不接入。

---

## 四、差点让修复白做的坑

**全站 46 页引用 `ai-assistant.js/css`、`cloudbase-config/loader.js` 时，全部没有 `?v=` 版本号。**

若不补版本号，改完的 JS 会被 CDN 缓存挡住，用户拿到的仍是旧文件——修复等于没做。

已全站统一补 `?v=20260829a`（**181 处 / 46 页**），并同步升级 `cloud-lazy.js` 的内部 `VER`。

---

## 五、验证结果

| 项 | 结果 |
|---|---|
| 时序修复 | 事件触发时 `window.cloudbase`：`undefined` → `object` ✓ |
| 未登录场景 | 显示登录引导 + 「去登录」按钮，**不再是「开小差」** ✓ |
| 7 页 AI 接入 | 导航注入 ✓ / AI 挂载 ✓ / 无 JS 错误，**7/7 通过** ✓ |
| 样式冲突 | 变量全部带兜底值；与 `nav-embed.css` **无同名类** ✓ |
| 线上文件 | 5 个 JS/CSS 修复内容均已生效 ✓ |
| 线上冒烟 | 抽样 10 页全 200；题库 229 / 291 题未受影响 ✓ |

---

## 六、后续须知

### ⚠️ AI 需要登录才能使用

这是本次采用的方案（未改安全规则，最安全）。目前站点**零普通注册用户**，需先注册账号。

- 注册：`auth.signUp({ email, password })` —— 注意必须用 `email` 字段（控制台 `email:false`，但注册接口要求传 email）
- 登录：`auth.signInWithPassword({ username, password })`
- 登录态会持久保持，无需每次登录

### 同样受影响的功能

安全规则是 `"*"`（所有云函数），因此**排行榜、纠错等云功能对游客同样不可用**。这是同一根因，非新引入的问题。

### 若日后想让游客免登录用 AI

需修改 `ai-chat` 的安全规则，放开 `auth.loginType != 'ANONYMOUS'` 限制。建议仅在加入限流措施后实施（AI 按量计费）。
