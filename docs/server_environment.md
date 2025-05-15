# 服务器环境文档

## 基本信息

- **操作系统**: Ubuntu 24.04.2 LTS (Noble)
- **内核版本**: Linux 6.8.0-1024-aws #26-Ubuntu SMP 
- **架构**: x86_64 (64位)

## 硬件信息

- **CPU**: Intel(R) Xeon(R) Platinum 8259CL CPU @ 2.50GHz
- **内存**: 总计 7.6GB，可用 5.3GB
- **存储**: 
  - 主分区(/): 29GB 总空间，已使用 4.3GB (16%)
  - 启动分区(/boot): 881MB 总空间，已使用 137MB (17%)
  - EFI分区(/boot/efi): 105MB 总空间，已使用 6.1MB (6%)

## 网络配置

- **主要网络接口**: ens5 (IP: 172.31.14.84/20)
- **监听端口**:
  - 22 (SSH)
  - 80 (HTTP)
  - 443 (HTTPS)
  - 8000 (Gunicorn/后端应用)
  - 53 (DNS)

## 软件环境

- **Python版本**: 3.12.3
- **Node.js版本**: v18.19.1
- **Nginx版本**: 1.24.0
- **Web服务器**: Nginx (作为反向代理)
- **应用服务器**: Gunicorn (4个worker进程)

## 应用部署

### 后端

- **框架**: Flask 2.2.3
- **数据库**: SQLite (users.db)
- **部署位置**: `/home/ubuntu/INFO2222-group/backend/`
- **运行命令**: Gunicorn，配置为4个工作进程，绑定到0.0.0.0:8000
- **Python依赖**:
  ```
  bcrypt==4.0.1
  click==8.2.0
  Flask==2.2.3
  Flask-Cors==3.0.10
  gunicorn==21.2.0
  itsdangerous==2.2.0
  Jinja2==3.1.6
  MarkupSafe==3.0.2
  packaging==25.0
  PyJWT==2.6.0
  python-dotenv==1.0.0
  six==1.17.0
  Werkzeug==2.2.3
  ```

### 前端

- **框架**: React 18.2.0
- **构建工具**: Vite 6.2.0
- **部署位置**: 
  - 源代码: `/home/ubuntu/INFO2222-group/frontend/`
  - 静态文件: `/var/www/chat-frontend/`
- **Vite配置**:
  - 基础路径: 根据环境变量`VITE_BASE_PATH`设置，默认为根路径'/'
  - 开发服务器配置: 主机0.0.0.0，端口5173
  - 构建优化: 
    - 分块策略: React相关、UI组件、编辑器、国际化、工具库等分别打包
    - 启用源码映射
    - 使用terser进行代码压缩
- **主要npm依赖**:
  - **UI框架**: 
    - react: ^18.2.0
    - react-dom: ^18.2.0
    - react-router-dom: ^6.30.0
    - antd: ^5.24.3
  - **编辑器组件**:
    - @tiptap系列扩展: ^2.11.5
  - **网络通信**:
    - axios: ^1.9.0
    - socket.io-client: ^4.8.1
  - **国际化**:
    - i18next: ^24.2.2
    - react-i18next: ^15.4.1
  - **加密**:
    - tweetnacl: ^1.0.3
  - **开发工具**:
    - typescript: ~5.7.2
    - eslint: ^9.21.0
    - vite: ^6.2.0

## Web服务器配置

- **域名**: kang-mi.com
- **SSL证书**: Let's Encrypt证书已配置
- **HTTPS重定向**: 已启用（HTTP请求会重定向到HTTPS）
- **Nginx配置**:
  - 前端请求转发到静态文件目录
  - API请求(/api)代理到本地8000端口的后端服务
  - 配置了特殊路径 `/live2d/` 禁用缓存

## 运行状态

- **Nginx**: 活跃运行中，系统启动时自动启动
- **后端应用**: 通过Gunicorn运行，有5个进程（1个主进程，4个工作进程）

## 备注

- 服务器使用AWS EC2实例
- 使用Let's Encrypt管理SSL证书
- 前后端分离架构，使用Nginx作为反向代理 