#!/bin/bash

# 重新创建并启动Python虚拟环境的脚本
# 用法: ./restart.sh [dev|prod]
# 不带参数默认为开发环境
# dev - 使用python3 run.py启动（开发环境）
# prod - 使用gunicorn启动（生产环境）

set -e  # 遇到错误立即退出

# 确定运行环境
ENV="dev"  # 默认开发环境

# 检查命令行参数和环境变量
if [ "$1" == "prod" ] || [ "$APP_ENV" == "prod" ]; then
    ENV="prod"
    echo "===== 开始重新部署服务（生产环境）====="
    if [ "$1" == "prod" ]; then
        echo "（基于命令行参数）"
    else
        echo "（基于APP_ENV环境变量）"
    fi
elif [ "$1" == "dev" ]; then
    ENV="dev"
    echo "===== 开始重新部署服务（开发环境）====="
else
    echo "未指定环境，默认使用开发环境"
    echo "使用方法: ./restart.sh [dev|prod] 或设置环境变量 APP_ENV=prod"
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
    deactivate
    echo "已停用虚拟环境"
else
    echo "没有激活的虚拟环境"
fi

# 3. 删除旧的虚拟环境
echo "删除旧的虚拟环境..."
if [ -d "venv" ]; then
    rm -rf venv
    echo "已删除旧的虚拟环境"
else
    echo "未发现旧的虚拟环境目录"
fi

# 4. 创建新的虚拟环境
echo "创建新的虚拟环境..."
python3 -m venv venv
echo "已创建新的虚拟环境"

# 5. 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 6. 安装所需的依赖包
echo "安装所需的依赖包..."
pip install -r requirements.txt
echo "依赖包安装完成"

# 7. 根据环境启动服务器
if [ "$ENV" == "prod" ]; then
    echo "启动Gunicorn服务器（生产环境）..."
    echo "服务器将在0.0.0.0:8000上运行，使用4个工作进程"
    gunicorn -w 4 -b 0.0.0.0:8000 run:app
    
    # 注意：这个脚本执行到最后一步会保持运行状态
    # 如果需要后台运行，可以将上面一行改为：
    # nohup gunicorn -w 4 -b 0.0.0.0:8000 run:app > gunicorn.log 2>&1 &
    # echo "Gunicorn已在后台启动，日志输出到gunicorn.log"
else
    echo "启动开发服务器（开发环境）..."
    python3 run.py
    
    # 如果需要后台运行，可以将上面一行改为：
    # nohup python3 run.py > dev_server.log 2>&1 &
    # echo "开发服务器已在后台启动，日志输出到dev_server.log"
fi