#!/bin/bash
# 简化版启动脚本，不使用虚拟环境，直接启动后端

echo "===== 简易启动脚本 ====="
echo "该脚本直接启动应用，不创建或管理虚拟环境"

# 检查依赖
echo "检查依赖包..."
pip3 install -r requirements.txt || {
    echo "依赖包安装失败，尝试使用pip..."
    pip install -r requirements.txt || {
        echo "无法安装依赖，请确保pip已正确安装"
        exit 1
    }
}

# 如果虚拟环境存在但不能删除，尝试忽略
if [ -d "venv" ]; then
    echo "检测到虚拟环境目录，但将忽略它"
fi

# 关闭可能存在的Python进程
pkill -f "python.*run.py" || echo "没有找到运行中的Python进程"

# 启动应用
echo "启动应用服务器..."
python3 run.py || {
    echo "使用python3启动失败，尝试使用python..."
    python run.py || {
        echo "应用启动失败"
        exit 1
    }
} 