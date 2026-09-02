#!/usr/bin/env bash
# ============================================================
# 红色文化传播网 · 全迁 Cloudflare 一键部署（方案4：昵称 + Turnstile）
# 把 MIGRATION.md 第 2–6 步封装为幂等的一键流程。
#
# 前置（在你本机执行）：
#   1) 已登录 Cloudflare：
#        npx wrangler@latest login
#      （或 export CLOUDFLARE_API_TOKEN="<Pages:Edit + D1:Edit>"）
#   2) 4 个 secret 可通过环境变量传入（不传入则脚本提示你手动 put）：
#        export SESSION_SECRET="$(openssl rand -hex 32)"
#        export TURNSTILE_SECRET="<Cloudflare 控制台 Turnstile 的 Secret Key>"
#        export DEEPSEEK_API_KEY="<platform.deepseek.com 的 Key>"
#        export ADMIN_TOKEN="$(openssl rand -hex 32)"
#   3) 上线前手动把 api-client.js 的 RCS.config.turnstileSiteKey 换成真实 Site Key
#
# 用法：
#   bash scripts/deploy-cloudflare.sh
# ============================================================
set -euo pipefail

PROJECT="red-culture-site"
DB="red-culture"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 优先从本地密钥文件读取（已被 .gitignore 忽略，绝不会提交）
if [ -f "$ROOT/.secrets.local" ]; then
  set -a; . "$ROOT/.secrets.local"; set +a
  echo "    （已从 .secrets.local 读取密钥）"
fi

W=$(command -v npx || echo npx)

echo "==> 0. 检查 Cloudflare 登录"
if ! $W wrangler@latest whoami >/dev/null 2>&1; then
  echo "✖ 未登录 Cloudflare。请先执行："
  echo "    npx wrangler@latest login"
  echo "  或 export CLOUDFLARE_API_TOKEN=\"<Pages:Edit + D1:Edit>\""
  exit 1
fi
echo "    ✓ 已登录"

echo "==> 1. 准备 D1 数据库 '$DB'"
# 优先从 d1 list 取已存在的 id（幂等）
DB_ID=$($W wrangler@latest d1 list --json 2>/dev/null \
  | python3 -c "import sys,json
try:
    d=json.load(sys.stdin)
except Exception:
    d=[]
m=[x for x in d if (x.get('name')=='$DB')]
print((m[0].get('uuid') or m[0].get('database_id') or '') if m else '')" 2>/dev/null || true)

if [ -z "$DB_ID" ]; then
  echo "    未找到，创建中..."
  OUT=$($W wrangler@latest d1 create "$DB" 2>&1)
  echo "$OUT"
  DB_ID=$(echo "$OUT" | grep -oE 'with id: [0-9a-f-]{36}' | head -1 | awk '{print $3}')
fi
if [ -z "$DB_ID" ]; then
  echo "✖ 未能获取 D1 database_id，请手动：npx wrangler@latest d1 create $DB 并把 id 填进 wrangler.toml"
  exit 1
fi
echo "    database_id = $DB_ID"

if grep -q 'REPLACE_AFTER_WRANGLER_D1_CREATE' wrangler.toml; then
  perl -i -pe "s/REPLACE_AFTER_WRANGLER_D1_CREATE/$DB_ID/" wrangler.toml
  echo "    ✓ 已写入 wrangler.toml"
else
  echo "    wrangler.toml 已含 database_id（跳过）"
fi

echo "==> 2. 应用 schema（users / quiz_scores / ai_logs / sensitive_words / corrections + 35 词）"
$W wrangler@latest d1 execute "$DB" --file=schema/001_initial.sql --remote

echo "==> 3. 设置 Secret（有环境变量则自动 put，否则提示手动）"
put_secret() {
  local name="$1" val="${2:-}"
  if [ -n "$val" ]; then
    if printf '%s' "$val" | $W wrangler@latest pages secret put "$name" --project-name "$PROJECT" >/dev/null 2>&1; then
      echo "    ✓ $name 已设置"
    else
      echo "    ✖ $name 设置失败，请手动：npx wrangler@latest pages secret put $name --project-name $PROJECT"
    fi
  else
    echo "    ⚠ 未提供 $name，请手动：npx wrangler@latest pages secret put $name --project-name $PROJECT"
  fi
}
put_secret SESSION_SECRET "${SESSION_SECRET:-}"
put_secret TURNSTILE_SECRET "${TURNSTILE_SECRET:-}"
put_secret DEEPSEEK_API_KEY "${DEEPSEEK_API_KEY:-}"
put_secret ADMIN_TOKEN "${ADMIN_TOKEN:-}"

echo "==> 4. 收拢构建产物到【仓库外】临时目录（排除非运行时文件，保留 data/ 语料依赖）"
# 注意：故意构建到仓库外（/tmp/rcs-dist-*），绝不在仓库内 rm -rf dist，
# 否则会触发沙箱安全删除确认、阻塞部署。每次用全新目录，无需删除旧产物。
BUILD_DIR="/tmp/rcs-dist-$(date +%s)"
mkdir -p "$BUILD_DIR"
rsync -a \
  --exclude='.git' --exclude='.workbuddy' --exclude='node_modules' \
  --exclude='docs' --exclude='scripts' --exclude='*.md' \
  --exclude='generated-images' --exclude='appeal-attachments' \
  --exclude='cloudbase.bundle.js' --exclude='cloudbase-config.js' \
  --exclude='cloudbase-loader.js' --exclude='auth-service.js' \
  --exclude='fix-report-*.md' --exclude='expert-failure-analysis-*.md' \
  --exclude='rebuttal-to-engineer-*.md' --exclude='refund-appeal-*.md' \
  --exclude='骑楼海报*.png' \
  --exclude='cloudfunctions' --exclude='cloudbaserc.json' \
  --exclude='*.py' --exclude='build_*' \
  --exclude='audit-report.html' --exclude='chapter-map.csv' --exclude='chapter-map.json' \
  --exclude='.secrets.local' --exclude='.wrangler' --exclude='dist' \
  ./ "$BUILD_DIR/"

if [ -n "${TURNSTILE_SITE_KEY:-}" ] && [ "$TURNSTILE_SITE_KEY" != "1x00000000000000000000AA" ]; then
  if grep -q '1x00000000000000000000AA' dist/api-client.js; then
    perl -i -pe "s/1x00000000000000000000AA/\Q$TURNSTILE_SITE_KEY\E/" dist/api-client.js
    echo "    ✓ 已在 dist 副本将测试 Site Key 替换为真实 Site Key（源文件保持测试 key，不泄露）"
  fi
elif grep -q '1x00000000000000000000AA' api-client.js; then
  echo "    ⚠ 警告：未提供 TURNSTILE_SITE_KEY，dist 仍为测试 Site Key，仅限联调"
fi

echo "==> 5. 部署到 Cloudflare Pages（从仓库外临时目录）"
$W wrangler@latest pages deploy "$BUILD_DIR" --project-name "$PROJECT" --branch main --commit-dirty=true

echo ""
echo "==> ✅ 部署完成。请确认："
echo "   1) 已把真实 Turnstile Site Key 写入 api-client.js 的 RCS.config.turnstileSiteKey"
echo "   2) 真机打开页面 → 登录 → 输入昵称 → 完成 Turnstile → 导航栏显示昵称"
echo "      并确认 DevTools Network 出现 /api/auth/register 或 /api/auth/login（即修复'没有 signin'）"
echo "   3) CloudBase 侧保持不动，观察 30 天无异常后再关停（见 MIGRATION.md 第 7–8 步）"
