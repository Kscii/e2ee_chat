#!/bin/bash

# 重新创建并启动Python虚拟环境的脚本
# 用法: ./restart.sh

set -e  # 遇到错误立即退出

echo "===== 开始重新部署服务 ====="

# 1. 停止任何可能正在运行的gunicorn进程
echo "正在停止服务器进程..."
pkill -f gunicorn || echo "没有找到运行中的gunicorn进程，继续..."

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

# 7. 启动Gunicorn服务器
echo "启动Gunicorn服务器..."
echo "服务器将在0.0.0.0:8000上运行，使用4个工作进程"
gunicorn -w 4 -b 0.0.0.0:8000 run:app

# 注意：这个脚本执行到最后一步会保持运行状态
# 如果需要后台运行，可以将最后一行改为：
# nohup gunicorn -w 4 -b 0.0.0.0:8000 run:app > gunicorn.log 2>&1 &
# echo "Gunicorn已在后台启动，日志输出到gunicorn.log" 