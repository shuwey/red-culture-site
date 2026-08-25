# 部署说明（红色文化传播网 · 腾讯云 CloudBase）

> 适用版本：增量架构设计 v1（T01–T11 落地，回到 CloudBase 方案）
> 站点性质：纯静态多页应用（MPA），零构建依赖；AI 问答 / 账号 / 成绩均由 CloudBase 承载。
> 环境 ID：`cloud1-d0g0aq0bl2cfbcbdf`

---

## 1. 架构概览（CloudBase 版）

| 能力 | 承载方 |
| --- | --- |
| 静态资源托管 | CloudBase 静态网站托管（或自有域名 + CDN） |
| AI 问答 | 云函数 `cloudfunctions/ai-chat`（封装大模型调用） |
| 用户认证 | CloudBase Auth（邮箱密码优先 / 匿名降级，双模） |
| 成绩存储 | CloudBase NoSQL 集合 `quiz_scores` |
| 密钥管理 | 仅存云函数环境变量 `OPENAI_*`，前端零泄露 |

> 前端经 CDN 引入 CloudBase JS-SDK：`https://imgcache.qq.com/qcloud/tcbjs/1.6.2/tcb.js`
> （已验证可达；全局对象 `cloudbase`，`cloudbase.init({ env })` 初始化）。

---

## 2. 仓库结构（与部署相关部分）

```
red-culture-site/
├── index.html / *.html            # 静态页面（含 cloudbase-js-sdk CDN）
├── style.css / ai-assistant.css   # 样式
├── script.js / auth-service.js    # 站点脚本 / 认证门面（RCSAuth）
├── account-ui.js / quiz-service.js / ai-assistant.js
├── cloudbase-config.js            # window.RCS 单例：ENV / config.authMode / getApp()
├── data/corpus.json               # AI 检索语料（38 条：14 英雄 + 13 地点 + 11 事件）
├── assets/                        # 图片 / 视频
├── cloudfunctions/ai-chat/        # AI 问答云函数
│   ├── index.js                   # 入口 exports.main(event,context)
│   ├── package.json               # 依赖 @cloudbase/node-sdk ^3.7.0
│   └── lib/{prompt.js,sensitive-words.js}
└── docs/deploy-notes.md
```

---

## 3. 部署云函数 `ai-chat`

### 方式一：CloudBase CLI（推荐）
```bash
npm install -g @cloudbase/cli
tcb login
# 在仓库根目录
tcb fn deploy ai-chat --envId cloud1-d0g0aq0bl2cfbcbdf
```

### 方式二：控制台上传
1. 进入控制台 → 云函数 → 新建/上传 `ai-chat`。
2. 运行环境 Node.js，入口 `index.js`。
3. 上传 `cloudfunctions/ai-chat/` 整个目录（含 `lib/` 与 `package.json`）。

### 配置云函数环境变量（必须）
控制台 → 云函数 `ai-chat` → 配置 → 环境变量，新增：

| 变量名 | 说明 | 示例 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 大模型 API Key（必填） | `sk-xxxxxxxx` |
| `OPENAI_BASE_URL` | OpenAI 兼容接口地址（必填） | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 使用的模型名（必填） | `gpt-4o-mini` |

> 任何兼容 `/v1/chat/completions` 的网关均可，仅替换 `OPENAI_BASE_URL` 即可。
> 未配置时云函数仍执行敏感词拦截（`SENSITIVE`）与无史料兜底（`NO_CONTEXT`），但调用模型会报 `UPSTREAM_ERROR`。

---

## 4. 数据库集合 `quiz_scores`

控制台 → 数据库 → 新建集合 `quiz_scores`，安全规则设为「**仅创建者可读写**」：

```json
{
  "read": "doc._openid == auth.openid || doc.userId == auth.uid",
  "write": "doc.userId == auth.uid"
}
```

> 若控制台仅提供简易权限，选「仅创建者可读写」即可。
> 建议为 `(userId, createdAt desc)` 建组合索引以加速成绩查询（代码已按此结构读写）。

文档结构（由 `quiz-service.js` 写入）：
```json
{
  "userId": "CloudBase Auth uid",
  "nickname": "昵称快照",
  "score": 8,
  "total": 10,
  "durationSec": 42,
  "createdAt": "2026-08-25T14:30:00.000Z"
}
```

---

## 5. 认证（CloudBase Auth）与 Web 安全域名

1. 控制台 → 登录授权：开启 **邮箱密码登录**（如需匿名降级，同时开启匿名登录）。
2. 控制台 → 静态网站托管 / 环境设置 → **Web 安全域名**：将站点正式域名加入白名单
   （匿名/邮箱登录的前置条件，否则 `getLoginState` 会失败）。
3. `cloudbase-config.js` 中 `RCS.ENV` 必须为本环境 ID（已在文件中写死 `cloud1-d0g0aq0bl2cfbcbdf`）。

---

## 6. 静态站点发布

控制台 → 静态网站托管 → 上传文件，将仓库根目录全部内容（含 `*.html`、`assets/`、`*.js`、`*.css`、`data/`）上传即可；或绑定自有域名 + CDN。

---

## 7. 本地重新生成详情页（维护用）

仓库自带三个生成器，在仓库根目录以 Node 运行：

```bash
node scripts/generate-event-pages.mjs    # 生成 11 个事件详情页
node scripts/generate-hero-pages.mjs      # 生成 14 个英雄详情页
node scripts/generate-place-pages.mjs     # 生成 13 个地点详情页
```

- 数据内联在生成器脚本的数组中，修改数据源后重跑即刷新全部对应详情页。
- `slug` 即文件名（如 `hero-lidazhao`）；新增条目时保持 `data/corpus.json` 的 `id` 与页面 `slug` 一致（`{type}-{slug}`），AI 助手才能检索到。
- **新增内容极简流程**：加一条数据 + 重跑脚本 + （如需 AI 可答）corpus.json 加一条 → 无需手写 HTML。

---

## 8. 验证清单（上线前）

- [ ] 云函数 `ai-chat` 已部署，`OPENAI_*` 三个环境变量已配置。
- [ ] 数据库集合 `quiz_scores` 已建，「仅创建者可读写」安全规则已设。
- [ ] 登录授权已开启（邮箱密码 + 匿名可选），Web 安全域名已加白名单。
- [ ] 浏览器访问首页：AI 助手浮窗可打开；登录/注册可用，导航区渲染昵称与「我的成绩/退出」下拉正常。
- [ ] 知识考核完成后，登录用户成绩写入 `quiz_scores`，可在「我的成绩」查看最近 20 条与最佳。
- [ ] 全站无 `netlify`、`aiEndpoint`、`localStorage.rcs_user` 等残留；时间轴 11 项全部可点进事件详情页。
- [ ] 详情页间互链、时间轴跳转均正常，无死链。

---

## 9. 已知限制 / 说明

- 匿名模式下昵称仅存浏览器 `localStorage.rcs_nick` 兜底展示，主身份以 CloudBase 为准（演示版已知限制）。
- AI 问答严格「仅依据站内语料」：未收录或命中敏感词时明确拒答，不编造史实。
- 本文件为部署说明书；架构设计与 PRD 分别见 `architecture-incremental.md`、`prd-incremental.md`。
