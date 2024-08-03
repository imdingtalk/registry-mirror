# =========================
# 第一阶段：构建各个服务
# =========================

# 基于官方的 registry 镜像
FROM registry:2.8.3 as registry-base

# 复制配置文件
COPY registry-config /etc/docker/registry/config.d

# =========================
# 第二阶段：设置 Nginx 和整合服务
# =========================
FROM nginx:alpine

# 复制 Nginx 配置文件
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# 复制前一阶段构建的 registry 配置文件
COPY --from=registry-base /bin/registry /usr/bin/registry
COPY --from=registry-base /etc/docker/registry/config.d /etc/docker/registry/config.d

# 安装必要的包
RUN apk add --no-cache bash

# 暴露端口
EXPOSE 80

# 启动脚本
CMD ["/bin/sh", "-c", "\
  # 启动 Docker registry 实例 \
  registry serve /etc/docker/registry/config.d/registry-dockerhub.yml & \
  registry serve /etc/docker/registry/config.d/registry-ghcr.yml & \
  registry serve /etc/docker/registry/config.d/registry-k8s.yml & \
  registry serve /etc/docker/registry/config.d/registry-k8s-gcr.yml & \
  registry serve /etc/docker/registry/config.d/registry-gcr.yml & \
  registry serve /etc/docker/registry/config.d/registry-quay.yml & \
  # 启动 Nginx \
  nginx -g 'daemon off;' \
"]
