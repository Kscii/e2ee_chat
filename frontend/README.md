# Frontend for Web Chat Application

[English](#english) | [中文](#中文)

<a id="english"></a>
## English

### Introduction
This is the frontend application for the Web Chat Application. It provides a modern, responsive user interface for real-time messaging with end-to-end encryption capabilities. The application is built with React and TypeScript, offering a secure and user-friendly experience across devices.

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **UI Library**: Ant Design 5
- **State Management**: React Context API
- **Routing**: React Router 6
- **API Communication**: Axios
- **Real-time Communication**: Socket.IO Client
- **Internationalization**: i18next
- **Text Editor**: Tiptap
- **Encryption**: TweetNaCl.js
  - X25519 for key exchange
  - XSalsa20 for symmetric encryption
  - Poly1305 for message authentication
  - Double-hashing password system for enhanced security
- **Styling**: CSS Modules with transitions
- **Code Quality**: ESLint, TypeScript

### Installation and Setup

#### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher (or yarn/pnpm)

#### Development Setup
1. Clone the repository and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. The application will be available at: `http://localhost:5173`

#### Production Build
1. Build the application:
```bash
npm run build
```

2. Preview the production build:
```bash
npm run preview
```

3. For automated deployment:
```bash
# Configure deploy-config.sh first, then:
./deploy.sh
```

### Project Structure
- `src/`: Source code directory
  - `api/`: API service and endpoint definitions
  - `assets/`: Static assets like images
  - `components/`: Reusable UI components
  - `contexts/`: React contexts for state management
  - `hooks/`: Custom React hooks
  - `i18n/`: Internationalization configuration and translations
  - `layouts/`: Layout components
  - `pages/`: Application pages/screens
  - `services/`: Business logic services
  - `styles/`: Global styles and CSS modules
  - `types/`: TypeScript type definitions
  - `utils/`: Utility functions including encryption
- `public/`: Static files served as-is
- `scripts/`: Build and deployment scripts

### Key Features

#### 1. End-to-End Encryption
- Built-in public/private key cryptography
- Secure message encryption with TweetNaCl
- Client-side key generation and management
- Zero-knowledge password verification with double-hashing

#### 2. Enhanced Password Security
- Double-hashing password system
  - First hash remains client-side for private key encryption
  - Second hash sent to server for authentication
- Dynamic server-side salts for both hashing processes
- Original password never leaves client device
- Protects private keys even if server is compromised

#### 3. Real-Time Messaging
- Instant message delivery with Socket.IO
- One-to-one private chats
- Group chats with multiple participants

#### 4. User Interface
- Responsive design for desktop and mobile
- Dark/light theme support
- Customizable user settings

#### 5. Internationalization
- Support for 16 languages
- Automatic language detection
- User language preference persistence

#### 6. File Sharing
- Secure file uploads
- Avatar customization
- Image rendering and previews

### Deployment
The application includes a deployment script (`deploy.sh`) that can be configured for various environments:

1. Configure your deployment settings in `deploy-config.sh`
2. Run the deployment script:
```bash
./deploy.sh
```

3. For build-only mode:
```bash
./deploy.sh --build-only
```

4. For deploy-only mode (when build already exists):
```bash
./deploy.sh --deploy-only
```

### Security Features
- HTTPS enforcement in production
- Secure HTTP headers
- Protection against common web vulnerabilities
- Client-side encryption of sensitive data
- Certificate validation
- Double-hashing password system
- Zero server access to plaintext passwords

---

<a id="中文"></a>
## 中文

### 项目介绍
这是Web聊天应用的前端应用程序。它提供了一个现代、响应式的用户界面，支持端到端加密的实时消息传递。该应用程序使用React和TypeScript构建，为各种设备提供安全且用户友好的体验。

### 技术栈
- **框架**: React 18 配合 TypeScript
- **构建工具**: Vite 6
- **UI库**: Ant Design 5
- **状态管理**: React Context API
- **路由**: React Router 6
- **API通信**: Axios
- **实时通信**: Socket.IO Client
- **国际化**: i18next
- **富文本编辑器**: Tiptap
- **加密**: TweetNaCl.js
  - X25519 用于密钥交换
  - XSalsa20 用于对称加密
  - Poly1305 用于消息认证
  - 双重哈希密码系统提升安全性
- **样式**: CSS Modules 配合过渡动画
- **代码质量**: ESLint, TypeScript

### 安装和设置

#### 环境要求
- Node.js 18.x 或更高版本
- npm 9.x 或更高版本 (或 yarn/pnpm)

#### 开发环境设置
1. 克隆仓库并导航到前端目录:
```bash
cd frontend
```

2. 安装依赖:
```bash
npm install
```

3. 启动开发服务器:
```bash
npm run dev
```

4. 应用将在以下地址可用: `http://localhost:5173`

#### 生产构建
1. 构建应用:
```bash
npm run build
```

2. 预览生产构建:
```bash
npm run preview
```

3. 自动化部署:
```bash
# 首先配置 deploy-config.sh，然后:
./deploy.sh
```

### 项目结构
- `src/`: 源代码目录
  - `api/`: API服务和端点定义
  - `assets/`: 静态资源如图片
  - `components/`: 可复用UI组件
  - `contexts/`: React上下文用于状态管理
  - `hooks/`: 自定义React钩子
  - `i18n/`: 国际化配置和翻译
  - `layouts/`: 布局组件
  - `pages/`: 应用页面/屏幕
  - `services/`: 业务逻辑服务
  - `styles/`: 全局样式和CSS模块
  - `types/`: TypeScript类型定义
  - `utils/`: 实用函数包括加密
- `public/`: 按原样提供的静态文件
- `scripts/`: 构建和部署脚本

### 主要功能

#### 1. 端到端加密
- 内置的公钥/私钥加密体系
- 使用TweetNaCl的安全消息加密
- 客户端密钥生成和管理
- 零知识密码验证与双重哈希

#### 2. 增强的密码安全
- 双重哈希密码系统
  - 第一次哈希留在客户端用于私钥加密
  - 第二次哈希发送到服务器用于身份验证
- 两次哈希过程使用动态服务器端盐值
- 原始密码永不离开客户端设备
- 即使服务器被入侵也能保护私钥安全

#### 3. 实时消息
- 通过Socket.IO实现即时消息传递
- 一对一私人聊天
- 多参与者群组聊天

#### 4. 用户界面
- 适用于桌面和移动设备的响应式设计
- 暗/亮主题支持
- 可自定义用户设置

#### 5. 国际化
- 支持16种语言
- 自动语言检测
- 用户语言偏好持久化

#### 6. 文件共享
- 安全文件上传
- 头像自定义
- 图片渲染和预览

### 部署
应用程序包含一个部署脚本（`deploy.sh`），可以针对各种环境进行配置：

1. 在`deploy-config.sh`中配置您的部署设置
2. 运行部署脚本:
```bash
./deploy.sh
```

3. 仅构建模式:
```bash
./deploy.sh --build-only
```

4. 仅部署模式（当构建已存在时）:
```bash
./deploy.sh --deploy-only
```

### 安全特性
- 生产环境中强制使用HTTPS
- 安全的HTTP头
- 防御常见Web漏洞
- 敏感数据的客户端加密
- 证书验证
- 双重哈希密码系统
- 服务器无法获取明文密码 