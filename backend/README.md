# 后端服务

这个目录包含项目的后端服务代码，使用Flask框架和SQLite数据库构建。

## 环境配置

1. 创建虚拟环境：

```bash
python -m venv venv
```

2. 激活虚拟环境：

```bash
# Windows
venv\Scripts\activate

# Unix/macOS
source venv/bin/activate
```

3. 安装依赖：

```bash
pip install -r requirements.txt
```

4. 配置环境变量（使用sample.env作为模板）:

```bash
cp sample.env .env
```

## 运行服务

使用以下命令启动后端服务：

```bash
python run.py
```

服务默认运行在 http://localhost:8000

## 数据管理

### 清空聊天数据

如果需要清空所有聊天数据（保留用户账户）：

```bash
python clear_chat_data.py
```

此脚本会：
- 自动备份数据库
- 删除所有消息和会话记录
- 重置自增ID
- 保留用户账户数据

### 数据库结构

主要数据表：
- `users`: 用户信息
- `messages`: 消息记录
- `conversations`: 会话记录 