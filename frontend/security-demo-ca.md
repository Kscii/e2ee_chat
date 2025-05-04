# 安全功能演示

## 前端证书验证测试

本文档演示如何测试前端应用是否正确实现了服务器证书验证机制，确保客户端只与可信的服务器通信。

### 背景

在Web应用中，特别是涉及用户认证的应用，确保客户端只向可信的服务器发送敏感信息（如密码）至关重要。虽然HTTPS能提供加密传输，但对于高安全性需求的应用，还应该验证服务器的身份，防止恶意服务器使用有效但非预期的证书（如钓鱼网站获取的合法证书）。

### 测试方法一：替换服务器证书

这个测试通过替换服务器的SSL证书来验证前端是否拒绝与使用"不信任证书"的服务器通信，即使该证书在技术上是有效的（如自签名证书）。

#### 步骤1：创建假证书

```bash
# 创建存放假证书的目录
mkdir ~/fake-cert
cd ~/fake-cert

# 生成自签名证书，使用与真实站点相同的域名
openssl req -x509 -newkey rsa:2048 -keyout fake.key -out fake.crt -days 365 -nodes \
  -subj "/CN=kang-mi.com"

# 准备Nginx可用的证书格式
cat fake.crt > fake_fullchain.pem
cp fake.key fake_privkey.pem
```

#### 步骤2：修改Web服务器配置

```bash
# 备份当前Nginx配置
cd /etc/nginx/sites-available/
sudo cp chat chat.backup

# 编辑站点配置，指向假证书
sudo nano chat

# 将以下行修改为指向假证书
# ssl_certificate /home/ubuntu/fake-cert/fake_fullchain.pem;
# ssl_certificate_key /home/ubuntu/fake-cert/fake_privkey.pem;

# 验证配置并重新加载
sudo nginx -t && sudo systemctl reload nginx
```

#### 步骤3：测试前端行为

1. 打开浏览器，访问应用（https://kang-mi.com）
2. 尝试登录
3. 观察前端行为：
   - 如果前端**未实现**证书验证：请求会正常发送，没有警告
   - 如果前端**正确实现**证书验证：请求会被拦截，显示证书验证失败警告

### 测试结果分析

通过检查浏览器开发者工具中的网络请求，可以确认前端应用的行为：

1. **请求被拦截**：表示前端成功验证了证书，发现服务器使用了不在信任列表中的证书
   - 应该看到错误消息如"服务器验证失败"
   - 登录请求不会被发送到服务器

2. **请求正常发送**：表示前端没有正确验证证书
   - 在网络面板可以看到完整的请求信息
   - 敏感信息可能被发送到不受信任的服务器

在我们的测试中，观察到以下请求信息：

```
请求 URL: https://kang-mi.com/api/login
引用站点策略: strict-origin-when-cross-origin
authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
content-type: application/json
```

### 测试方法二：获取真实证书信息用于验证

为了正确实现证书验证，需要获取真实证书的指纹和公钥哈希值。以下是获取这些信息的方法：

#### 获取证书指纹

```bash
# 从远程服务器获取证书并计算SHA-256指纹
openssl s_client -connect kang-mi.com:443 </dev/null 2>/dev/null | \
  openssl x509 -outform DER | \
  openssl dgst -sha256 | \
  awk '{print $2}'
```

示例输出：`8fc2abc2e4aec03dfc9924ae1fada3e83efa483d3299fc88616dd08eedad1d12`

#### 获取公钥哈希

```bash
# 从远程服务器获取证书、提取公钥并计算SHA-256哈希
openssl s_client -connect kang-mi.com:443 </dev/null 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 | \
  awk '{print $2}'
```

示例输出：`fbfd19dab4c0165c9b964bc0e543d83f18477d79377335798c2d02f6617fabe9`

### 在构建时集成证书验证

前端项目包含一个专门的构建脚本(`scripts/build-production.sh`)，可以在构建时指定证书信息：

```bash
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

# 执行构建
npm run build
```

使用方法：

```bash
# 使用默认证书信息
./scripts/build-production.sh

# 指定新的证书指纹和公钥哈希
./scripts/build-production.sh "新证书指纹" "新公钥哈希"

# 指定不同域名和API地址
TRUSTED_DOMAIN="example.com" API_URL="https://api.example.com" ./scripts/build-production.sh
```

### 恢复正常配置

测试完成后，恢复原始配置：

```bash
sudo cp /etc/nginx/sites-available/chat.backup /etc/nginx/sites-available/chat
sudo nginx -t && sudo systemctl reload nginx
```

### 安全建议

1. 前端应实现证书指纹或公钥验证
2. 验证应在发送任何敏感数据前完成
3. 用明确的错误消息提示用户证书验证失败
4. 在安全通道建立前禁止用户提交敏感信息
5. 定期更新证书指纹和公钥哈希，尤其是在证书更新后

## 其他安全测试

除了证书验证测试，还可以进行以下测试：

1. **中间人攻击测试**：使用代理工具如Charles或mitmproxy拦截修改请求
2. **请求篡改测试**：修改请求内容测试前端和后端验证机制
3. **权限绕过测试**：尝试访问未授权的资源
4. **会话管理测试**：验证token过期和撤销机制

## 结论

通过替换服务器证书的方法，我们可以有效地验证前端是否正确实现了证书验证机制。这是防御钓鱼和中间人攻击的重要一层，尤其是在处理敏感信息时。结合正确的证书指纹和公钥哈希，可以确保前端应用只与可信的服务器通信。

## 硬编码CA公钥的安全影响

在我们的实现中，通过硬编码证书指纹和公钥哈希来验证服务器身份。这种方法有以下安全影响：

### 优势

1. **防止中间人攻击**：即使攻击者获得有效的CA签名证书，如果指纹不匹配，前端仍会拒绝连接
2. **简单可靠**：不依赖于操作系统或浏览器的证书存储，避免了CA系统的潜在漏洞
3. **完全控制**：应用开发者可以精确控制哪些证书被信任，无需依赖第三方CA
4. **避免CA妥协风险**：如果CA被攻击者控制，传统HTTPS系统会受到威胁，而我们的方案提供额外保护层

### 劣势与风险

1. **证书更新挑战**：每次证书更新（通常每3个月）需要更新前端应用中的指纹值
2. **部署复杂性**：需要将指纹/哈希值注入到前端构建过程中
3. **分发安全**：初始下载应用时如何保证安全是个挑战，可能需要配合其他安全机制
4. **失效响应**：如果证书因安全原因需要紧急替换，客户端更新周期可能较长
5. **开发与测试环境**：需要为不同环境维护不同的证书验证信息

### 安全最佳实践

为降低硬编码方式的风险，我们采取以下措施：

1. **多重验证**：同时验证证书指纹和公钥哈希，提高安全性
2. **证书轮换计划**：制定证书更新的流程，确保前端及时更新验证值
3. **紧急更新机制**：建立证书紧急更新的备用通道
4. **证书透明度监控**：监控Certificate Transparency日志，确保没有未授权的证书签发
5. **构建自动化**：自动从安全位置获取最新证书信息进行构建

## 服务器证书生成过程

我们的应用使用Let's Encrypt作为CA（证书颁发机构）来签发服务器证书。以下是完整的证书生成和管理流程。

### 1. Let's Encrypt证书签发流程

Let's Encrypt是一个免费、自动化、开放的证书颁发机构，使用ACME（Automated Certificate Management Environment）协议验证域名所有权并签发证书。

#### 证书申请步骤

1. **安装Certbot客户端**
   ```bash
   sudo apt update
   sudo apt install certbot python3-certbot-nginx
   ```

2. **申请证书**
   ```bash
   sudo certbot --nginx -d kang-mi.com
   ```

3. **验证过程**
   - Certbot生成一个随机值并放置在网站的`.well-known/acme-challenge/`目录下
   - Let's Encrypt服务器访问该URL验证域名控制权
   - 验证成功后，Let's Encrypt签发证书

4. **证书存储位置**
   证书文件存储在`/etc/letsencrypt/live/kang-mi.com/`目录下：
   - `cert.pem` - 服务器证书
   - `privkey.pem` - 私钥
   - `chain.pem` - 中间证书
   - `fullchain.pem` - 服务器证书+中间证书

### 2. Let's Encrypt CA证书结构

Let's Encrypt使用分层的PKI（公钥基础设施）结构：

1. **根证书（ISRG Root X1）**
   - 离线存储，用于签署中间证书
   - 有效期30年
   - 被大多数浏览器和操作系统信任

2. **中间证书（Let's Encrypt Authority X3）**
   - 由根证书签名
   - 用于日常签发终端实体证书
   - 有效期5年

3. **终端实体证书（kang-mi.com）**
   - 由中间证书签名
   - 有效期90天
   - 需要定期更新

### 3. 证书自动续期

Let's Encrypt证书有效期只有90天，需要定期更新：
```bash
# 检查自动续期状态
sudo systemctl status certbot.timer

# 手动测试续期（不实际操作）
sudo certbot renew --dry-run
```

自动续期通过系统定时任务完成，无需手动干预：
```bash
# 查看定时任务
cat /etc/cron.d/certbot
```

### 4. 在前端验证Let's Encrypt证书的考虑

由于Let's Encrypt使用的CA结构可能会变化（例如从ISRG Root X1迁移到ISRG Root X2），我们的前端验证主要基于服务器证书的指纹和公钥，而非CA证书本身。这样可以避免CA证书变更带来的影响。

为确保与Let's Encrypt证书系统的兼容性，我们的证书验证流程：

1. 仅验证终端实体证书（服务器证书）
2. 不验证证书链
3. 使用公钥哈希作为主要验证手段，该方式不受证书更新影响（只要使用相同密钥对生成新证书）
4. 可选地验证证书指纹，但这需要在每次证书更新后更新前端验证值

### 5. 查看当前证书信息

可以使用以下命令查看当前部署的证书详细信息：

```bash
# 查看证书内容
sudo openssl x509 -in /etc/letsencrypt/live/kang-mi.com/cert.pem -text -noout

# 查看证书链
sudo openssl verify -CAfile /etc/letsencrypt/live/kang-mi.com/chain.pem \
  /etc/letsencrypt/live/kang-mi.com/cert.pem
```

通过上述命令可以确认证书的有效性、签发者、有效期等重要信息。 