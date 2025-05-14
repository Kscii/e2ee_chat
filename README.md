# web_chat_project
[English](#english) | [中文](#中文)

## English

### Project Introduction
This is a modern web chat application built with React and TypeScript. It features AI-powered conversations, text-to-speech capabilities, and supports multiple languages. The project includes a backend authentication system built with Flask and SQLite.

If you want to experience this project, you can visit:  
-> [**kang-mi.com**](https://kang-mi.com/)

### Key Features
- AI Chat Assistant (powered by OpenAI)
- End-to-End Encryption (E2EE) for secure communication
  - Password-protected private key storage
  - Message self-copying mechanism for viewing sent messages
  - Secure key management and recovery
- Group chat with encryption support
- User authentication (register/login)
- Multi-service Text-to-Speech support
  - Browser native TTS
  - Azure TTS
  - Google Cloud TTS
  - GPT-SoVITS
- User avatar and profile management
- Server and channel system (similar to Discord)
- Internationalization (i18n) support
  - English
  - Chinese
- Rich Text Editor with Markdown support
- Dark/Light theme
- Responsive design
- Mobile-friendly UI

### Technology Stack
#### Frontend
- Framework: React 18
- Build Tool: Vite 6
- Language: TypeScript
- UI Framework: Ant Design 5
- State Management: React Context
- Router: React Router 6
- Encryption: TweetNaCl.js
  - X25519 for key exchange
  - XSalsa20 for symmetric encryption
  - Poly1305 for message authentication
- Rich Text Editor: Tiptap
- Internationalization: i18next
- Code Quality: ESLint

#### Backend
- Framework: Flask
- Database: SQLite
- Authentication: JWT
- Encryption: Public/Private key infrastructure 
- Password security: bcrypt with salt and pepper

### Prerequisites
- Node.js (version 16 or above)
- npm (version 8 or above)
- Python (version 3.8 or above)
- pip (latest version)

### Installation and Setup
1. Clone the repository
```bash
git clone https://github.sydney.edu.au/cran0556/INFO2222-group.git
cd INFO2222-group
git checkout web_chat_project
```

#### Frontend Setup
1. Install frontend dependencies
```bash
cd frontend
npm install
```

2. Configure environment variables (optional)
- Add your API keys if you want to use AI and TTS features

3. Start the frontend development server
```bash
npm run dev
```

4. Open your browser and visit `http://localhost:xxxx`

#### Backend Setup
1. Create and activate a virtual environment
```bash
cd backend
python -m venv venv

# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

2. Install backend dependencies
```bash
pip install -r requirements.txt
```

3. Configure environment variables (optional)
```bash
# Copy the sample environment file
cp sample.env .env

# Edit .env file with your configuration
# The default values should work for development
```

4. Start the backend server
```bash
cd backend
python run.py
```
or
```bash
gunicorn -w 4 -b 0.0.0.0:8000 run:app
```

The backend server will run on `http://localhost:8000` by default.


---

## 中文

### 项目介绍
这是一个使用 React 和 TypeScript 构建的现代化网页聊天应用。它具有 AI 对话功能、语音合成功能，并支持多语言。项目包含基于 Flask 和 SQLite 构建的后端认证系统。

如果你想体验本项目的效果，可以访问：  
-> [**kang-mi.com**](https://kang-mi.com/)

### 主要功能
- AI 聊天助手（由 OpenAI 驱动）
- 端到端加密通信（E2EE），确保消息安全
  - 密码保护的私钥存储方案
  - 消息自我副本机制，便于查看已发送的消息
  - 安全的密钥管理和恢复功能
- 支持加密的群组聊天功能
- 用户认证（注册/登录）
- 多服务语音合成支持
  - 浏览器原生语音
  - Azure 语音服务
  - Google Cloud 语音服务
  - GPT-SoVITS 语音合成
- 用户头像和个人资料管理
- 服务器和频道系统（类似 Discord）
- 国际化支持
  - 中文
  - 英文
- 支持 Markdown 的富文本编辑器
- 深色/浅色主题
- 响应式设计
- 移动端适配

### 技术栈
#### 前端
- 框架：React 18
- 构建工具：Vite 6
- 开发语言：TypeScript
- UI 框架：Ant Design 5
- 状态管理：React Context
- 路由管理：React Router 6
- 加密实现：TweetNaCl.js
  - X25519 用于密钥交换
  - XSalsa20 用于对称加密
  - Poly1305 用于消息认证
- 富文本编辑器：Tiptap
- 国际化：i18next
- 代码质量：ESLint

#### 后端
- 框架：Flask
- 数据库：SQLite
- 认证机制：JWT
- 加密系统：公钥/私钥基础设施
- 密码安全：bcrypt 加盐加胡椒

### 环境要求
- Node.js（16.0.0 或以上版本）
- npm（8.0.0 或以上版本）
- Python（3.8 或以上版本）
- pip（最新版本）

### 安装和设置
1. 克隆仓库
```bash
git clone https://github.sydney.edu.au/cran0556/INFO2222-group.git
cd INFO2222-group
git checkout web_chat_project
```

#### 前端设置
1. 安装前端依赖
```bash
cd frontend
npm install
```

2. 配置环境变量（可选）
- 如果要使用 AI 和语音功能，添加 API 密钥

3. 启动前端开发服务器
```bash
npm run dev
```

4. 打开浏览器访问 `http://localhost:xxxx`

#### 后端设置
1. 创建并激活虚拟环境
```bash
cd backend
python -m venv venv

# macOS/Linux系统
source venv/bin/activate

# Windows系统
venv\Scripts\activate
```

2. 安装后端依赖
```bash
pip install -r requirements.txt
```

3. 配置环境变量（可选）
```bash
# 复制示例环境文件
cp sample.env .env

# 编辑.env文件进行配置
# 开发环境下默认值应该可以正常工作
```

4. 启动后端服务器
```bash
cd backend
python run.py
```
或者
```bash
gunicorn -w 4 -b 0.0.0.0:8000 run:app
```

后端服务器默认运行在 `http://localhost:8000`。
