#!/bin/bash

# 重新创建并启动Python虚拟环境的脚本
# 用法: ./restart.sh [dev|prod]
# 不带参数默认为开发环境
# dev - 使用python3 run.py启动（开发环境）
# prod - 使用gunicorn启动（生产环境）

# 取消立即退出设置，增加错误处理
set +e

# 确定运行环境
ENV="dev"  # 默认开发环境

if [ "$1" == "prod" ]; then
    ENV="prod"
    echo "===== 开始重新部署服务（生产环境）====="
elif [ "$1" == "dev" ]; then
    ENV="dev"
    echo "===== 开始重新部署服务（开发环境）====="
else
    echo "未指定环境，默认使用开发环境"
    echo "使用方法: ./restart.sh [dev|prod]"
    echo "===== 开始重新部署服务（开发环境）====="
fi

# 1. 停止任何可能正在运行的进程
echo "正在停止服务器进程..."
if [ "$ENV" == "prod" ]; then
    pkill -f gunicorn || echo "没有找到运行中的gunicorn进程，继续..."
else
    pkill -f "python3 run.py" || echo "没有找到运行中的Python进程，继续..."
fi

# 2. 停用当前虚拟环境
echo "停用当前虚拟环境..."
if [[ "$VIRTUAL_ENV" != "" ]]; then
    deactivate || echo "停用虚拟环境失败，继续..."
    echo "已停用虚拟环境"
else
    echo "没有激活的虚拟环境"
fi

# 3. 删除旧的虚拟环境
echo "删除旧的虚拟环境..."
if [ -d "venv" ]; then
    # 首先尝试正常删除
    rm -rf venv
    # 检查是否删除成功
    if [ -d "venv" ]; then
        echo "常规删除失败，尝试强制删除..."
        # 尝试使用find命令强制删除
        find venv -type f -exec chmod 644 {} \; || echo "更改文件权限失败"
        find venv -type d -exec chmod 755 {} \; || echo "更改目录权限失败"
        rm -rf venv || echo "强制删除仍然失败"
        
        # 如果仍然存在，建议用户手动删除
        if [ -d "venv" ]; then
            echo "警告: 无法自动删除虚拟环境，请尝试手动删除，然后重新运行此脚本"
            echo "执行命令: rm -rf backend/venv"
            read -p "是否尝试继续(y/n)? " answer
            if [[ "$answer" != "y" ]]; then
                echo "脚本已取消"
                exit 1
            fi
        else
            echo "已成功删除旧的虚拟环境"
        fi
    else
        echo "已删除旧的虚拟环境"
    fi
else
    echo "未发现旧的虚拟环境目录"
fi

# 4. 创建新的虚拟环境
echo "创建新的虚拟环境..."
python3 -m venv venv || { echo "创建虚拟环境失败"; exit 1; }
echo "已创建新的虚拟环境"

# 5. 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate || { echo "激活虚拟环境失败"; exit 1; }

# 6. 安装所需的依赖包
echo "安装所需的依赖包..."
pip install -r requirements.txt || { echo "安装依赖包失败"; exit 1; }
echo "依赖包安装完成"

# 6.5 初始化数据库
echo "初始化数据库..."
# 删除现有数据库文件
if [ -f "users.db" ]; then
    rm users.db || echo "删除旧数据库文件失败，尝试继续..."
    echo "已删除旧数据库文件"
fi
# 使用Python初始化数据库
python -c "from models import DatabaseManager; DatabaseManager().init_db()" || { 
    echo "数据库初始化失败"; 
    exit 1; 
}
echo "数据库初始化完成"

# 7. 根据环境启动服务器
if [ "$ENV" == "prod" ]; then
    echo "启动Gunicorn服务器（生产环境）..."
    echo "服务器将在0.0.0.0:8000上运行，使用4个工作进程"

    nohup gunicorn -w 4 -b 0.0.0.0:8000 run:app > gunicorn.log 2>&1 &
    echo "Gunicorn已在后台启动，日志输出到gunicorn.log"
else
    echo "启动开发服务器（开发环境）..."
    python3 run.py
fi
