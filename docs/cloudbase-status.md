# CloudBase 部署状态与待办（2026-08-25）

> 环境：`cloud1-d0g0aq0bl2cfbcbdf`（2026-09-19 到期）

## 已完成 ✅
- **客户端 SDK 重构（修复登录失效根因）**
  - 旧 `tcbjs/1.6.2/tcb.js`（旧版 tcb-js-sdk，无邮箱/密码登录 API）→ 改为 ESM 加载器 `cloudbase-loader.js`（`@cloudbase/js-sdk@3.8.2`）。
  - 全站 45 个 HTML 完成脚本替换；`auth-service.js` 重写为新 SDK API。
  - `quiz-service.js` / `ai-assistant.js` 无需改动（仍用 `database()` / `callFunction()`）。
- **认证策略已开启**：`usernamePassword: true`、`anonymous: true`。
- **注册链路重构（关键）**：v3 `@cloudbase/node-sdk` 的 `app.auth()` **已不支持 `createUser`**（实测 `createUser is not a function`）。因此：
  - 删除原 `user-register` 云函数（云端 + 本地 `cloudfunctions/user-register/`）。
  - `auth-service.js` 的邮箱/密码模式改为前端直连 `auth().signUp({ username, password })` 建号，随后 `signInWithPassword` 自动登录（与官方管理文档一致）。
- **`ai-chat` 云函数**：已部署，`Status: Active`，调用返回信封结构（`success/data/error`）。**已接入 DeepSeek 并实测通过**：环境变量 `OPENAI_BASE_URL=https://api.deepseek.com`、`OPENAI_MODEL=deepseek-v4-flash`、`OPENAI_API_KEY=***`（云端环境变量，非本地文件）。代码零改动即兼容任意 OpenAI 兼容供应商。
- **AI 合规护栏（P0 三件套，已上线实测）**：
  - **输出侧拦截**：模型回答同样过 `scanSensitive`，命中则不返回（确定性验证：临时把"赵一曼"加入敏感词即被拦下，复原后正常）。
  - **敏感词库扩充 + 可配置化**：`lib/sensitive-words.js` 基线词库扩至 53 条（含历史虚无主义、繁体变体），并支持环境变量 `SENSITIVE_EXTRA`（JSON 数组/逗号分隔）热更新，运营免改代码扩充。
  - **系统提示词合规化**：`lib/prompt.js` 明确"坚持正确政治方向、弘扬爱国主义与革命精神、符合社会主义核心价值观；仅据史料作答、不得补充推断；不评论时政、不讨论未确认争议"。
  - 数据真实性命门 = 前端 `data/corpus.json`（受控史料），模型只读检索片段，无外部网络数据。
- **`quiz_scores` 安全规则**：已设为「仅创建者可读写」（`doc._openid == auth.uid`，CUSTOM）。
- **AI 合规护栏 P1（接地校验 + 审计日志，已上线实测）**：
  - **接地校验 grounding**：模型以 `{"answer","grounded"}` JSON 返回并自报 `grounded`；词面兜底——回答含史料中不存在的公元年份即判未接地；任一未接地则走 `NO_GROUNDED` 合规引导语、**不下发**模型回答。`parseModel` 已加固（兼容纯文本 / ```` ```json ```` 围栏 / 带前后缀的 JSON），修复了"模型返回 JSON 却把原始 JSON 当答案泄露给用户"的 bug。
  - **审计日志 `ai_logs`**：新建集合（仅云端函数管理员写入，客户端安全规则 `read/create/update/delete` 全 false）。每次问答留痕：`question / contexts(史料标题) / answer / status / sensitive / grounded / code / createdAt`。实测 status 准确标注 `ok`/`refusal`/`error` 等。
  - 验证：赵一曼正常问答返回正确史料+来源提示；问史料之外的"配偶/结婚年份"时模型**未编造**而是返回「暂未收录」引导语（记为 `refusal`）；上游瞬时抖动正确记为 `error`。
- **邮箱/密码模式已启用（默认）**：`authMode="email"`，用户用邮箱+密码注册/登录（前端 `signUp({username:email,password})` 建号 + `signInWithPassword` 登录，usernamePassword 策略已确认开启 `true`）。注册时额外填展示昵称（存本地）。成绩可保存（依赖 `quiz_scores` 创建者规则）。
- **AI 合规护栏 P2（敏感词后台 + 用户纠错 + 双人审核，已上线实测）**：
  - 新增 `admin` 云函数（`ADMIN_TOKEN` 恒定时间校验）：敏感词 `word.list/add(默认pending)/approve(生效)/reject/delete`、纠错 `correction.list/handle(resolved|rejected)`、用户提交 `correction.submit`（免 token）。
  - `sensitive_words` 集合（active|pending|rejected）+ `corrections` 集合（pending|resolved|rejected）已建；安全规则：`sensitive_words` 全 false，`corrections` 仅 `create=true`（登录用户可提交）。
  - `lib/sensitive-words.js` 运行时读集合 `active` 词（模块顶层预热 + 每 2 分钟刷新 + 同步缓存），与 BASE 基线 + `SENSITIVE_EXTRA` 合并；新增词需审核通过才进生效词库。
  - 前端：`ai-assistant.js` 每条回答加「纠错」按钮（提交至 `corrections`）；`admin.html` 运营后台（token 登录，敏感词管理 + 纠错审核）。
  - 实测全链路：token 鉴权、敏感词 add→approve→约 2 分钟 ai-chat 生效拦截、纠错提交→审核闭环；测试数据已清理。
  - **ADMIN_TOKEN**：存于 `admin` 函数环境变量 `ADMIN_TOKEN`，运营由技术负责人分发；更换只改该变量。

- **静态托管已填充（修复 404）**：整站 80 个静态文件（46 HTML + 7 JS + 2 CSS + 2 JSON/mjs + 21 图片 + 2 视频）已上传至 CloudBase 静态托管根目录（`manageHosting action=upload`，逐文件上传，避开整目录上传不递归的坑）。已 `setWebsiteDocument(indexDocument=index.html)`。默认域名 **https://cloud1-d0g0aq0bl2cfbcbdf-1471653339.tcloudbaseapp.com/** 现已可访问（此前 404 `NoSuchKey index.html` 是因为托管桶为空、仅传了 `cloudbase-config.js`）。
  - ⚠️ 注意：`queryHosting(action=findFiles, prefix="xxx")` 会把前缀当作目录（返回 `Prefix: "xxx/"`，查不到根文件），属该查询的怪癖；验证文件是否在线请用 `downloadFile` 或直接在浏览器访问。**后续每次改前端文件都要重新上传到托管才生效**（git 推送不等于线上更新）。

## 当前可用能力
- **登录可用（邮箱/密码模式）**：默认 `authMode="email"`，用户用邮箱+密码注册/登录，成绩可保存。
- **AI 问答已可用（真实回答）**：`ai-chat` 已接 DeepSeek，有史料上下文时返回模型真实回答（实测：刘胡兰问答 1.86s 返回正确史料）。
- **邮箱/密码模式已启用**：`cloudbase-config.js` 的 `authMode="email"`（2026-08-26 老大确认切换）；前端 `signUp` + `signInWithPassword`，usernamePassword 策略已确认开启。

## 仍待用户确认/提供（阻塞项已全部转为「等输入」，非工具阻塞）
| 动作 | 方式 | 状态 |
|------|------|------|
| 配 AI 真实回答 | 提供 `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` → 写入 `ai-chat` 函数环境变量 | ✅ 已接 DeepSeek 并实测通过 |
| 加 Web 安全域名 | 提供站点正式域名 → `envDomainManagement(action=create, domains=[host:port])` 加入白名单（localhost 默认可用） | 等用户提供 |
| 切邮箱/密码模式 | `cloudbase-config.js` 改 `RCS.config.authMode = "email"` | ✅ 已切到 email（2026-08-26） |

## 验证说明
- `ai-chat`、`quiz_scores` 规则、注册链路均已用 MCP 实测或 SDK 内省确认。
- **运行时验证缺口**：`signUp` / `signInWithPassword` / 匿名登录 / 成绩写入的最终表现需在真实浏览器中跑通（本环境无法启动浏览器）。建议上线前在浏览器实测一次注册→答题→保存→刷新查看成绩。
