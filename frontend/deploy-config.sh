#!/bin/bash

# 部署配置文件
# 可以根据不同环境修改此文件，而不需要修改主部署脚本

# 部署目录
DEPLOY_DIR="/var/www/chat-frontend"

# 构建命令
BUILD_CMD="npm run build:prod"

# 备份目录前缀（会自动添加时间戳）
BACKUP_PREFIX="/var/www/backups/chat-frontend"

# 服务器配置
SERVER_USER="www-data"
SERVER_GROUP="www-data"
SERVER_PERMISSIONS="755"

# API配置（可选，用于修改构建环境变量）
API_URL="https://kang-mi.com/api"
TRUSTED_DOMAIN="kang-mi.com"

# 是否启用备份
ENABLE_BACKUP=true

# 是否在构建后自动部署
AUTO_DEPLOY=true

# 是否设置文件权限
SET_PERMISSIONS=true

# 最大保留备份数量（设为0表示不限制）
MAX_BACKUPS=5 