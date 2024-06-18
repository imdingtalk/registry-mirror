FROM docker:26.1.2
# 安装依赖包
RUN apk add --no-cache \
    py-pip \
    python3-dev \
    libffi-dev \
    openssl-dev \
    gcc \
    libc-dev \
    make

# 安装 Docker Compose
RUN pip install docker-compose
WORKDIR /app
COPY  . /app
CMD  ["docker-compose","up"]