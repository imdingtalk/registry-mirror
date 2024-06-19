#!/bin/sh

# 在启动前执行一些必要的操作
echo "Starting the docker-compose services..."

# 执行 docker-compose 命令
docker-compose up --abort-on-container-exit