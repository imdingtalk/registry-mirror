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
  1.1. 登入 [Render](https://dashboard.render.com/)  
  1.2.  创建服务  
  ![image](https://github.com/imdingtalk/registry-mirror/assets/16778873/7fb04f0c-b352-469e-93ae-d6c395f1469b)  
  1.3. 选择镜像部署方式部署，使用镜像  `imdingtalk/registry-mirror:v1.1`  , 随便取一个名字，随后会根据名称分配一个`xxxx.onrender.com`域名,后续作为`Registry Mirrors` 配置到不同的`docker`客户端,  
  ![image](https://github.com/imdingtalk/registry-mirror/assets/16778873/5a792e8e-d72e-4312-b3ac-efb127a5f402)
  ![image](https://github.com/imdingtalk/registry-mirror/assets/16778873/dd52be65-0541-40a2-8456-773da6c58f99)
  1.4. 其他不用配置，直接创建  
  ![image](https://github.com/imdingtalk/registry-mirror/assets/16778873/031ccae0-b0a3-449a-ae6f-e031b188aa72)  
  1.5. 使用该域名作为我们的镜像加速服务  
  ![image](https://github.com/imdingtalk/registry-mirror/assets/16778873/2b0a156c-476c-46e1-b280-03fd9888aa95)

### 客户端使用
#### docker
1.  配置 `/etc/docker/daemon.json`  
```json
  "registry-mirrors": ["https://xxxx.onrender.com"],
```
`systemctl  restart docker`  
2. 使用  
```bash
#对于一个dockerhub上的镜像，如 nginx:1.27 , 可以直接pull
docker pull nginx:1.27
#对于非dockerhub的镜像，由于docker客户端默认只支持中心仓库(即docker.io)的mirror配置，故需要加你的域名前缀

如： registry.k8s.io/kube-proxy:v1.28.4
可以通过以下命令pull
docker pull xxx.onrender.com/registry.k8s.io/kube-proxy:v1.28.4
```

![image](https://github.com/imdingtalk/registry-mirror/assets/16778873/85c37854-8eaa-4d16-bad3-0403279052b9)

#### crictl/containerd
1. 配置  
Containerd 较简单，它支持任意 `registry` 的 `mirror`，只需要修改配置文件 `/etc/containerd/config.toml`，添加如下的配置：  
```yaml
    [plugins."io.containerd.grpc.v1.cri".registry]
      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
          endpoint = ["https://xxxx.onrender.com"]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."k8s.gcr.io"]
          endpoint = ["https://xxxx.onrender.com"]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."gcr.io"]
          endpoint = ["https://xxxx.onrender.com"]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."ghcr.io"]
          endpoint = ["https://xxxx.onrender.como"]
        [plugins."io.containerd.grpc.v1.cri".registry.mirrors."quay.io"]
          endpoint = ["https://xxxx.onrender.com"]
```
2. 使用

 可以直接`pull` 配置了`mirror`的仓库  
 `crictl pull registry.k8s.io/kube-proxy:v1.28.4`
#### podman

## 原理

见：
https://docs.docker.com/docker-hub/mirror/


## 实例限制  
免费实例有使用限制，但是看起来个人使用是足够的  

详细见：  
https://docs.render.com/free  
https://render.com/pricing  


### 空闲时关闭服务

当一个免费服务在没有收到入站流量的情况下闲置超过15分钟，Render会将其关闭。当服务接收到处理请求时，Render会重新启动该服务。

重新启动服务可能需要长达一分钟的时间，这会导致在服务完全启动运行前，入站请求出现明显的延迟。例如，浏览器页面加载可能会暂时挂起。

### 每月使用限制

#### 免费实例小时数

Render每月向每个用户和团队授予750个免费实例小时：

- 只要免费服务在运行中，这些小时数就会被消耗（关闭的服务不会消耗免费实例小时）。
- 如果在某个月内消耗了所有的免费实例小时，Render将暂停所有的免费服务，直到下个月开始。
- 每月初，免费实例小时会重置为750（剩余小时数不会结转至下一月）。

#### 免费带宽
- 免费带宽每月100GB  
