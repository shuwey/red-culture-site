#!/usr/bin/env bash
# ============================================================
# 红色文化站 · Cloudflare 迁移 · 本地密钥生成器（方案 A）
#
# 作用：只在本机【生成 + 打印】，绝不调用 wrangler、绝不联网、
#       绝不下发任何值到线上或前端。
#   - 两个本地可生成的随机密钥：SESSION_SECRET、ADMIN_TOKEN
#   - 两个需你到控制台手动拿的：TURNSTILE_SECRET、DEEPSEEK_API_KEY
#   - 打印「一次性复制粘贴」的 export 块 + 前端 Site Key 替换提示
#
# 用法：
#   bash scripts/gen-secrets.sh
# 然后把打印出的 export 块复制到终端，再跑 deploy-cloudflare.sh
# ============================================================
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "✖ 本机未安装 openssl，无法生成随机密钥。请先安装（mac: brew install openssl）。" >&2
  exit 1
fi

echo "=================================================="
echo " 红色文化站 · Cloudflare 迁移 · 本地密钥生成器"
echo " （仅本机生成/打印，不调用 wrangler、不联网）"
echo "=================================================="

# —— 1. 本机可生成的随机密钥（HMAC 签名 / 后台令牌，64 位十六进制）——
SESSION_SECRET="$(openssl rand -hex 32)"
ADMIN_TOKEN="$(openssl rand -hex 32)"

# —— 2. 需你到控制台手动获取的（这里只给占位 + 指引）——
echo ""
echo "【A】已本地生成（openssl rand -hex 32，可直接用）："
echo "    SESSION_SECRET = $SESSION_SECRET"
echo "    ADMIN_TOKEN    = $ADMIN_TOKEN"
echo ""
echo "【B】以下两个请到控制台拿到后填进终端（不要提交到 git）："
echo "    TURNSTILE_SECRET : Cloudflare 控制台 → Turnstile → 你的 widget → Secret Key"
echo "    DEEPSEEK_API_KEY: platform.deepseek.com → API Keys → 创建（sk- 开头）"
echo ""
echo "    👉 同一个 Turnstile widget 还会给一个【Site Key】（公开，前端用），"
echo "       它要填进 api-client.js（见下方【D】），与 TURNSTILE_SECRET 是一对。"

# —— 3. 一次性复制粘贴块 ——
echo "--------------------------------------------------"
echo "【C】复制下面两行（已生成本地随机值，直接可用）"
echo "    再补两行手动值，然后跑部署脚本："
echo "--------------------------------------------------"
cat <<EOF
export SESSION_SECRET="$SESSION_SECRET"
export ADMIN_TOKEN="$ADMIN_TOKEN"
# 下面两行：把 <> 换成真实值后取消注释
# export TURNSTILE_SECRET="<粘贴 Turnstile 的 Secret Key>"
# export DEEPSEEK_API_KEY="<粘贴 DeepSeek 的 API Key>"

# 全部 export 后，在项目根目录执行：
#   bash scripts/deploy-cloudflare.sh
EOF

# —— 4. 前端公开 Site Key 替换提示 ——
echo "--------------------------------------------------"
echo "【D】上线前：把真实 Site Key 填进 api-client.js"
echo "--------------------------------------------------"
echo "  找到这一行（当前是测试 key，永远通过，仅限联调）："
echo "      RCS.config.turnstileSiteKey = \"1x00000000000000000000AA\";"
echo "  改为（0x 开头，来自同一个 Turnstile widget）："
echo "      RCS.config.turnstileSiteKey = \"0x<你的真实SiteKey>\";"
echo "  ⚠️ 不换真实 Site Key，人机验证形同虚设。"
echo ""
echo "（提示：api-client.js 改完后需重新 git commit 并随部署上线；"
echo " 本沙箱无法连 Cloudflare，请在你的本机执行部署。）"
