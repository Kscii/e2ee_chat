#!/usr/bin/env python
"""
用户认证后端启动脚本
"""
from app import app
import config

if __name__ == '__main__':
    print(f"启动服务器在 {config.HOST}:{config.PORT}...")
    app.run(
        debug=config.DEBUG,
        host=config.HOST,
        port=config.PORT
    ) 