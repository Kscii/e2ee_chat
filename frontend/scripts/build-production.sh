#!/bin/bash

# 生产环境构建脚本，包含证书验证配置

# 从参数或默认值获取证书指纹和公钥哈希
CERT_FINGERPRINT=${1:-"8fc2abc2e4aec03dfc9924ae1fada3e83efa483d3299fc88616dd08eedad1d12"}
PUBLIC_KEY_HASH=${2:-"fbfd19dab4c0165c9b964bc0e543d83f18477d79377335798c2d02f6617fabe9"}

# 创建临时环境变量文件
echo "VITE_API_URL=https://kang-mi.com/api" > .env.production.local
echo "VITE_SECURE_MODE=true" >> .env.production.local
echo "VITE_CERT_FINGERPRINT=$CERT_FINGERPRINT" >> .env.production.local
echo "VITE_PUBLIC_KEY_HASH=$PUBLIC_KEY_HASH" >> .env.production.local

# 输出配置信息
echo "构建生产环境版本，配置如下:"
echo "API URL: https://kang-mi.com/api"
echo "证书指纹: $CERT_FINGERPRINT"
echo "公钥哈希: $PUBLIC_KEY_HASH"

# 执行构建
npm run build

# 清理
rm .env.production.local

echo "构建完成，生产文件位于 dist 目录" 