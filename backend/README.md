# Backend Service for Web Chat Application

[English](#english) | [中文](#中文)

<a id="english"></a>
## English

### Introduction
This is the backend service for the Web Chat Application. It provides authentication, message handling, encryption key management, and file storage services. The application is built with RESTful API principles and supports end-to-end encryption for secure communication.

### Technology Stack
- **Framework**: Flask 2.2.3
- **Database**: SQLite 3 (file-based)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: Server-side salts with secure storage (double-hashing architecture)
- **API**: RESTful architecture
- **Encryption**: Public/Private key infrastructure
- **File Storage**: Local file system for avatars and uploads
- **Cross-Origin**: CORS support
- **Deployment**: gunicorn WSGI HTTP Server

### Installation and Setup

#### Prerequisites
- Python 3.8 or higher
- pip (latest version)

#### Setup Steps
1. Create a virtual environment (recommended):
```bash
python -m venv venv

# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
# Copy the sample environment file
cp sample.env .env

# Edit .env file with your settings
```

4. Initialize the database:
```bash
python run.py
```

5. Start the development server:
```bash
python run.py
```

6. For production deployment:
```bash
gunicorn -w 4 -b 0.0.0.0:8000 run:app
```

### Project Structure
- `app.py`: Main application file containing API routes and endpoints
- `models.py`: Database models and business logic
- `config.py`: Application configuration
- `run.py`: Entry point for running the application
- `requirements.txt`: Python dependencies
- `.env`: Environment variables (not tracked in Git)
- `sample.env`: Sample environment file
- `users.db`: SQLite database file
- `avatars/`: Directory for storing user avatars

### Key Features

#### 1. Authentication System
- Secure registration and login
- JWT token-based authentication
- Double-hashing password verification (zero-knowledge proof)

#### 2. End-to-End Encryption
- Public/private key management
- Secure key exchange
- Encrypted message storage

#### 3. Group Chat
- Group creation and management
- Encrypted group messaging

#### 4. File Handling
- Avatar upload and management
- File storage and retrieval

### API Overview
The backend provides the following main API endpoints:

#### Authentication
- `/api/register`: User registration
- `/api/login`: User login and token generation

#### User Management
- `/api/user`: Get and update user information
- `/api/users`: Get all users
- `/api/avatar/<username>`: Get user avatar

#### Encryption
- `/api/keys`: Save and retrieve encryption keys
- `/api/system/salts`: Get system salt values for secure hashing

#### Messaging
- `/api/messages`: Send and receive messages
- `/api/group/messages`: Group messaging
- `/api/group/encrypted-messages`: Encrypted group messaging

#### Groups
- `/api/groups`: Create and list groups
- `/api/groups/<id>/members`: Manage group members

#### Servers
- `/api/servers`: Create and manage servers

### Security Features
- Double-hashing password system with client-side initial hash
- Server never receives plaintext passwords
- JWT tokens with expiration
- End-to-end encryption for messages
- HTTPS support (recommended for production)
- Input validation and sanitization
- Protection against common vulnerabilities
- Zero-knowledge password verification

### Deployment Guide
1. Set up a production environment
2. Configure environment variables for production
3. Set up a reverse proxy (like Nginx)
4. Configure HTTPS
5. Run with gunicorn:
```bash
gunicorn -w 4 -b 127.0.0.1:8000 run:app
```

---

<a id="中文"></a>
## 中文

### 项目介绍
这是Web聊天应用的后端服务。它提供了认证、消息处理、加密密钥管理和文件存储服务。应用程序基于RESTful API原则构建，并支持端到端加密以确保通信安全。

### 技术栈
- **框架**: Flask 2.2.3
- **数据库**: SQLite 3 (文件型)
- **认证**: JWT (JSON Web Tokens)
- **密码安全**: 服务器端盐值与安全存储（双重哈希架构）
- **API**: RESTful 架构
- **加密**: 公钥/私钥基础设施
- **文件存储**: 用于头像和上传文件的本地文件系统
- **跨域**: CORS 支持
- **部署**: gunicorn WSGI HTTP 服务器

### 安装和设置

#### 环境要求
- Python 3.8 或更高版本
- pip (最新版本)

#### 设置步骤
1. 创建虚拟环境 (推荐):
```bash
python -m venv venv

# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

2. 安装依赖:
```bash
pip install -r requirements.txt
```

3. 配置环境变量:
```bash
# 复制示例环境文件
cp sample.env .env

# 编辑.env文件设置你的配置
```

4. 初始化数据库:
```bash
python run.py
```

5. 启动开发服务器:
```bash
python run.py
```

6. 用于生产环境部署:
```bash
gunicorn -w 4 -b 0.0.0.0:8000 run:app
```

### 项目结构
- `app.py`: 主应用文件，包含API路由和端点
- `models.py`: 数据库模型和业务逻辑
- `config.py`: 应用程序配置
- `run.py`: 运行应用程序的入口点
- `requirements.txt`: Python 依赖
- `.env`: 环境变量 (不跟踪到Git)
- `sample.env`: 示例环境文件
- `users.db`: SQLite 数据库文件
- `avatars/`: 用户头像存储目录

### 主要功能

#### 1. 认证系统
- 安全的注册和登录
- 基于JWT令牌的认证
- 双重哈希密码验证（零知识证明）

#### 2. 端到端加密
- 公钥/私钥管理
- 安全密钥交换
- 加密消息存储

#### 3. 群组聊天
- 群组创建和管理
- 加密群组消息

#### 4. 文件处理
- 头像上传和管理
- 文件存储和检索

### API概述
后端提供以下主要API端点:

#### 认证
- `/api/register`: 用户注册
- `/api/login`: 用户登录和令牌生成

#### 用户管理
- `/api/user`: 获取和更新用户信息
- `/api/users`: 获取所有用户
- `/api/avatar/<username>`: 获取用户头像

#### 加密
- `/api/keys`: 保存和检索加密密钥
- `/api/system/salts`: 获取系统盐值用于安全哈希

#### 消息
- `/api/messages`: 发送和接收消息
- `/api/group/messages`: 群组消息
- `/api/group/encrypted-messages`: 加密群组消息

#### 群组
- `/api/groups`: 创建和列出群组
- `/api/groups/<id>/members`: 管理群组成员

#### 服务器
- `/api/servers`: 创建和管理服务器

### 安全特性
- 客户端初始哈希的双重哈希密码系统
- 服务器永不接收明文密码
- 带有过期时间的JWT令牌
- 消息的端到端加密
- HTTPS支持 (生产环境推荐)
- 输入验证和净化
- 防御常见漏洞
- 零知识密码验证

### 部署指南
1. 设置生产环境
2. 配置生产环境的环境变量
3. 设置反向代理 (如Nginx)
4. 配置HTTPS
5. 使用gunicorn运行:
```bash
gunicorn -w 4 -b 127.0.0.1:8000 run:app
``` 