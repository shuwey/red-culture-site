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
- **匿名/昵称模式可用**：默认 `authMode="local"`，填昵称即匿名建号，成绩可保存（依赖上面的创建者规则）。

## 当前可用能力
- **登录可用（昵称匿名模式）**：默认 `authMode="local"`，用户填昵称即匿名建号，成绩可保存。
- **AI 问答已可用（真实回答）**：`ai-chat` 已接 DeepSeek，有史料上下文时返回模型真实回答（实测：刘胡兰问答 1.86s 返回正确史料）。
- **邮箱/密码模式代码就绪**：将 `cloudbase-config.js` 的 `authMode` 改回 `"email"` 即可启用（前端 `signUp` + `signInWithPassword`）。

## 仍待用户确认/提供（阻塞项已全部转为「等输入」，非工具阻塞）
| 动作 | 方式 | 状态 |
|------|------|------|
| 配 AI 真实回答 | 提供 `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` → 写入 `ai-chat` 函数环境变量 | ✅ 已接 DeepSeek 并实测通过 |
| 加 Web 安全域名 | 提供站点正式域名 → `envDomainManagement(action=create, domains=[host:port])` 加入白名单（localhost 默认可用） | 等用户提供 |
| 切邮箱/密码模式 | `cloudbase-config.js` 改 `RCS.config.authMode = "email"` | 等你拍板 |

## 验证说明
- `ai-chat`、`quiz_scores` 规则、注册链路均已用 MCP 实测或 SDK 内省确认。
- **运行时验证缺口**：`signUp` / `signInWithPassword` / 匿名登录 / 成绩写入的最终表现需在真实浏览器中跑通（本环境无法启动浏览器）。建议上线前在浏览器实测一次注册→答题→保存→刷新查看成绩。
