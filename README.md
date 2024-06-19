# registry-mirror
多平台容器镜像缓存加速代理服务,支持 Docker Hub, GitHub, Google, k8s, Quay, 等镜像仓库.

[![Version](https://img.shields.io/github/v/release/imdingtalk/registry-mirror)](https://github.com/imdingtalk/registry-mirror/releases)
[![License](https://img.shields.io/github/license/imdingtalk/registry-mirror)](https://www.apache.org/licenses/LICENSE-2.0.html)



## Features

- 支持一键部署一个可用的镜像仓库，支持所有常见外部镜像仓库
- 支持多种客户端加速，如`docker-cli`     `crictl`   `podman`
- ...

## 使用方法
### 1. 部署自己的私有加速镜像仓库
1.1 登入 [Render](https://dashboard.render.com/)  
1.2 创建服务
