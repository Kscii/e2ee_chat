# 证书验证说明

本项目实现了针对生产环境的服务器证书验证机制，确保用户数据只发送给可信的服务器。

## 证书验证机制

- 在生产环境中，前端会验证服务器的域名和协议，确保只与预期的服务器通信
- 使用环境变量和硬编码默认值相结合的方式存储服务器证书指纹和公钥哈希
- 在发送用户凭证前会自动验证服务器身份

## 环境区分

项目在多个地方正确地区分了开发环境和生产环境：

- 使用 `import.meta.env.MODE === 'production'` 判断当前环境
- 在开发环境中关闭严格的安全检查，提高开发体验
- 在生产环境中启用严格的域名和HTTPS协议检查
- 可以通过环境变量配置不同环境的行为

## 生产环境构建

要生成验证服务器证书的生产版本：

```bash
# 使用默认证书指纹和公钥哈希构建
npm run build:prod

# 或指定证书指纹和公钥哈希
./scripts/build-production.sh "证书指纹" "公钥哈希"

# 或通过环境变量指定更多配置
TRUSTED_DOMAIN="example.com" API_URL="https://api.example.com" ./scripts/build-production.sh
```

构建后的文件位于 `dist` 目录，可部署到静态服务器。

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|-------|------|--------|
| VITE_API_URL | API服务器地址 | http://localhost:8000/api (开发) 或 https://kang-mi.com/api (生产) |
| VITE_SECURE_MODE | 是否启用安全模式 | true (生产) |
| VITE_CERT_FINGERPRINT | 证书指纹 | 8fc2abc2e4aec03dfc9924ae1fada3e83efa483d3299fc88616dd08eedad1d12 |
| VITE_PUBLIC_KEY_HASH | 公钥哈希 | fbfd19dab4c0165c9b964bc0e543d83f18477d79377335798c2d02f6617fabe9 |
| VITE_TRUSTED_DOMAIN | 信任的域名 | kang-mi.com |

## 证书更新

当服务器证书更新时，需要更新证书指纹和公钥哈希：

1. 获取新证书的指纹和公钥哈希
2. 通过以下任一方式更新：
   - 更新 `utils/certificateValidator.ts` 中的硬编码默认值
   - 使用环境变量在构建时传入新值
   - 使用构建脚本参数指定新值
3. 重新构建应用并部署

# 自动化部署说明

## 部署脚本

项目提供了一个自动化部署脚本 `deploy.sh`，用于简化前端应用的构建和部署过程。此脚本执行以下操作：

1. 检查必要的权限
2. 使用生产环境配置构建应用
3. 备份当前部署的版本
4. 清空部署目录
5. 部署新构建的文件
6. 设置正确的文件权限

## 使用方法

```bash
# 确保脚本有执行权限
chmod +x deploy.sh

# 执行完整的构建和部署
./deploy.sh

# 仅构建不部署
./deploy.sh --build-only

# 仅部署不构建
./deploy.sh --deploy-only

# 显示帮助信息
./deploy.sh --help
```

## 配置方法

脚本支持通过 `deploy-config.sh` 文件自定义配置参数。您可以根据需要编辑此文件：

```bash
# 复制示例配置文件
cp deploy-config.sh deploy-config.local.sh

# 编辑本地配置
vim deploy-config.local.sh

# 使用本地配置运行部署脚本
CONFIG_FILE=./deploy-config.local.sh ./deploy.sh
```

## 配置参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| DEPLOY_DIR | 部署目录 | /var/www/chat-frontend |
| BUILD_CMD | 构建命令 | npm run build:prod |
| BACKUP_PREFIX | 备份目录前缀 | /var/www/backups/chat-frontend |
| SERVER_USER | 服务器用户 | www-data |
| SERVER_GROUP | 服务器用户组 | www-data |
| SERVER_PERMISSIONS | 文件权限 | 755 |
| ENABLE_BACKUP | 是否启用备份 | true |
| AUTO_DEPLOY | 是否自动部署 | true |
| SET_PERMISSIONS | 是否设置权限 | true |
| MAX_BACKUPS | 最大备份数量 | 5 |
| API_URL | API服务器地址 | (可选) |
| TRUSTED_DOMAIN | 信任的域名 | (可选) |

## 注意事项

- 脚本需要 sudo 权限执行部署操作
- 确保系统上已安装 npm 并已设置好依赖
- 如果部署失败，可以从备份目录恢复先前的版本
- 默认保留最近5个备份，可通过配置修改 