#!/bin/bash

# 生产环境构建脚本，包含证书验证配置

# 从参数或环境变量获取配置
CERT_FINGERPRINT=${1:-"8fc2abc2e4aec03dfc9924ae1fada3e83efa483d3299fc88616dd08eedad1d12"}
PUBLIC_KEY_HASH=${2:-"fbfd19dab4c0165c9b964bc0e543d83f18477d79377335798c2d02f6617fabe9"}
TRUSTED_DOMAIN=${TRUSTED_DOMAIN:-"kang-mi.com"}
API_URL=${API_URL:-"https://$TRUSTED_DOMAIN/api"}

# 创建临时环境变量文件
echo "VITE_API_URL=$API_URL" > .env.production.local
echo "VITE_SECURE_MODE=true" >> .env.production.local
echo "VITE_CERT_FINGERPRINT=$CERT_FINGERPRINT" >> .env.production.local
echo "VITE_PUBLIC_KEY_HASH=$PUBLIC_KEY_HASH" >> .env.production.local
echo "VITE_TRUSTED_DOMAIN=$TRUSTED_DOMAIN" >> .env.production.local

# 输出配置信息
echo "构建生产环境版本，配置如下:"
echo "API URL: $API_URL"
echo "信任域名: $TRUSTED_DOMAIN"
echo "证书指纹: $CERT_FINGERPRINT"
echo "公钥哈希: $PUBLIC_KEY_HASH"
echo "环境模式: production"

# 执行构建
npm run build

# 清理
rm .env.production.local

echo "构建完成，生产文件位于 dist 目录" 