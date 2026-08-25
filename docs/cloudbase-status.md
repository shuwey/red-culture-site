# CloudBase 部署状态与待办（2026-08-25）

> 环境：`cloud1-d0g0aq0bl2cfbcbdf`（2026-09-19 到期）

## 已完成 ✅
- **客户端 SDK 重构（修复登录失效根因）**
  - 旧 `tcbjs/1.6.2/tcb.js`（旧版 tcb-js-sdk，无邮箱/密码登录 API）→ 改为 ESM 加载器 `cloudbase-loader.js`（`@cloudbase/js-sdk@3.8.2`）。
  - 全站 45 个 HTML 完成脚本替换；`auth-service.js` 重写为新 SDK API。
  - `quiz-service.js` / `ai-assistant.js` 无需改动（仍用 `database()` / `callFunction()`）。
- **认证策略已开启**：`usernamePassword: true`、`anonymous: true`（email 未开启，因注册改用服务端建号，无需邮箱验证链路）。
- **`ai-chat` 云函数**：已部署，`Status: Active`，调用返回信封结构（`success/data/error`），未配密钥时返回 `NO_CONTEXT` 兜底。
- **`quiz_scores` 集合**：已创建，索引 `userId_createdAt` 已建。
- **`user-register` 云函数代码**：已写好（`cloudfunctions/user-register/`，Node SDK `createUser`），待部署。

## 阻塞 ⛔（本会话 CloudBase MCP 桥接拒绝所有对象参数调用）
无法执行以下写操作（只读查询正常）：
1. 部署 `user-register` 云函数。
2. 设置 `quiz_scores` 安全规则为「仅创建者可读写」。
3. 添加 Web 安全域名白名单（生产域名访问 CloudBase 必需）。
4. 写入 `ai-chat` 的 `OPENAI_*` 环境变量。
5. 直接 `invokeFunction` 实测。

## 当前可用能力
- 站点加载正确 SDK，认证走新 API。
- **登录可用（昵称匿名模式）**：默认 `authMode="local"`，用户填昵称即匿名建号，成绩可保存（依赖 quiz_scores 默认规则允许创建者写入；如被拒需补第 2 条）。
- **AI 问答可用（兜底）**：有史料上下文时返回 `NO_CONTEXT` 提示；配密钥后返回真实回答。
- 邮箱/密码模式代码就绪：注册成功依赖 `user-register` 部署，届时将 `authMode` 切回 `email` 即可。

## 下一步（MCP 恢复或用户提供后）
| 动作 | 方式 |
|------|------|
| 部署 user-register | `tcb fn deploy user-register -e cloud1-d0g0aq0bl2cfbcbdf`（需 tcb CLI + 登录）或 MCP 恢复后重试 |
| 设 quiz_scores 规则 | 控制台「数据库→quiz_scores→权限」设为仅创建者可读写 |
| 加安全域名 | 控制台「环境→安全域名/Web 安全域名」加入站点正式域名（localhost 默认可用） |
| 配 AI 密钥 | 函数环境变量 OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL |
| 切回邮箱密码 | `cloudbase-config.js` 改 `authMode="email"` |
