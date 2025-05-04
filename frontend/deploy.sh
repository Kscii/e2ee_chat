#!/bin/bash

# 自动化构建和部署前端应用脚本
# 此脚本会构建前端应用并将其部署到指定的目录

# 默认配置
DEPLOY_DIR="/var/www/chat-frontend"
BUILD_CMD="npm run build:prod"
BACKUP_PREFIX="/var/www/backups/chat-frontend"
SERVER_USER="www-data"
SERVER_GROUP="www-data"
SERVER_PERMISSIONS="755"
ENABLE_BACKUP=true
AUTO_DEPLOY=true
SET_PERMISSIONS=true
MAX_BACKUPS=5

# 加载配置文件（如果存在）
CONFIG_FILE="./deploy-config.sh"
if [ -f "$CONFIG_FILE" ]; then
  source "$CONFIG_FILE"
  echo "已加载配置文件: $CONFIG_FILE"
fi

# 生成备份目录名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_PREFIX}-${TIMESTAMP}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：输出信息
info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# 函数：输出成功信息
success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 函数：输出警告信息
warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 函数：输出错误信息
error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 函数：检查上一个命令是否成功
check_status() {
  if [ $? -ne 0 ]; then
    error "$1"
    exit 1
  fi
}

# 检查是否具有sudo权限
check_sudo() {
  if ! sudo -n true 2>/dev/null; then
    error "需要sudo权限来部署应用。请输入密码："
    sudo -v
    check_status "未获得sudo权限，部署失败"
  fi
}

# 确保dist目录存在
ensure_dist() {
  if [ ! -d "dist" ]; then
    error "dist目录不存在！请先构建应用。"
    exit 1
  fi
}

# 函数：备份当前部署
backup_current() {
  if [ "$ENABLE_BACKUP" != "true" ]; then
    info "备份功能已禁用，跳过备份步骤"
    return
  fi
  
  if [ -d "$DEPLOY_DIR" ] && [ "$(ls -A $DEPLOY_DIR 2>/dev/null)" ]; then
    info "正在备份当前部署..."
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$DEPLOY_DIR"/* "$BACKUP_DIR"/
    check_status "备份失败"
    success "当前部署已备份到 $BACKUP_DIR"
    
    # 清理旧备份
    cleanup_old_backups
  else
    warning "没有找到需要备份的文件"
  fi
}

# 清理旧备份
cleanup_old_backups() {
  if [ "$MAX_BACKUPS" -gt 0 ]; then
    BACKUP_COUNT=$(ls -d ${BACKUP_PREFIX}-* 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
      info "清理旧备份，保留最新的 $MAX_BACKUPS 个备份..."
      ls -dt ${BACKUP_PREFIX}-* | tail -n +$((MAX_BACKUPS+1)) | xargs sudo rm -rf
      success "旧备份清理完成"
    fi
  fi
}

# 设置环境变量
set_env_variables() {
  if [ -n "$API_URL" ] || [ -n "$TRUSTED_DOMAIN" ]; then
    info "设置构建环境变量..."
    export VITE_API_URL="$API_URL"
    export TRUSTED_DOMAIN="$TRUSTED_DOMAIN"
    success "环境变量已设置"
  fi
}

# 构建函数
build_app() {
  # 设置环境变量
  set_env_variables
  
  # 构建应用
  info "开始构建前端应用..."
  eval $BUILD_CMD
  check_status "构建失败"
  success "应用构建成功"
}

# 部署函数
deploy_app() {
  if [ "$AUTO_DEPLOY" != "true" ]; then
    info "自动部署功能已禁用，构建完成"
    return
  fi

  # 确保dist目录存在
  ensure_dist
  
  # 检查sudo权限
  check_sudo
  
  # 检查部署目录是否存在
  if [ ! -d "$DEPLOY_DIR" ]; then
    warning "部署目录不存在，将创建它"
    sudo mkdir -p "$DEPLOY_DIR"
    check_status "创建部署目录失败"
  fi
  
  # 备份当前部署
  backup_current
  
  # 清空部署目录
  info "清空部署目录..."
  sudo rm -rf "$DEPLOY_DIR"/*
  check_status "清空部署目录失败"
  
  # 复制新构建的文件到部署目录
  info "部署新构建的文件..."
  sudo cp -r dist/* "$DEPLOY_DIR"/
  check_status "部署失败"
  
  # 设置正确的权限
  if [ "$SET_PERMISSIONS" = "true" ]; then
    info "设置目录权限..."
    sudo chown -R $SERVER_USER:$SERVER_GROUP "$DEPLOY_DIR"
    sudo chmod -R $SERVER_PERMISSIONS "$DEPLOY_DIR"
    success "权限设置完成"
  fi
  
  success "部署完成！应用已成功部署到 $DEPLOY_DIR"
}

# 显示配置信息
show_config() {
  info "部署配置信息:"
  echo "  部署目录: $DEPLOY_DIR"
  echo "  构建命令: $BUILD_CMD"
  echo "  备份目录: $BACKUP_DIR"
  echo "  服务器用户/组: $SERVER_USER:$SERVER_GROUP"
  echo "  文件权限: $SERVER_PERMISSIONS"
  echo "  启用备份: $ENABLE_BACKUP"
  echo "  自动部署: $AUTO_DEPLOY"
  echo "  设置权限: $SET_PERMISSIONS"
  echo "  最大备份数: $MAX_BACKUPS"
  
  if [ -n "$API_URL" ]; then
    echo "  API URL: $API_URL"
  fi
  
  if [ -n "$TRUSTED_DOMAIN" ]; then
    echo "  信任域名: $TRUSTED_DOMAIN"
  fi
}

# 主要流程
main() {
  info "开始自动化部署流程..."
  
  # 显示配置信息
  show_config
  
  # 构建应用
  build_app
  
  # 部署应用
  deploy_app
}

# 处理命令行参数
if [ "$1" = "--build-only" ]; then
  AUTO_DEPLOY=false
  main
elif [ "$1" = "--deploy-only" ]; then
  build_app() {
    info "跳过构建步骤"
  }
  main
elif [ "$1" = "--help" ]; then
  echo "用法: $0 [选项]"
  echo "选项:"
  echo "  --build-only   只构建，不部署"
  echo "  --deploy-only  只部署，不构建"
  echo "  --help         显示帮助信息"
  exit 0
else
  main
fi 