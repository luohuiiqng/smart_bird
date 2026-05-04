# 自动部署配置指南

## 1. GitHub Secrets 配置

在你的GitHub仓库中，进入 **Settings → Secrets and variables → Actions**，添加以下Secrets：

### 必需Secrets：
```
SSH_PRIVATE_KEY:   # 服务器的SSH私钥
  # 在服务器上运行：ssh-keygen -t ed25519 -f ~/.ssh/github_actions_deploy
  # 然后复制 ~/.ssh/github_actions_deploy 的内容（不带公钥）

SSH_KNOWN_HOSTS:   # 服务器的SSH指纹
  # 在终端运行：ssh-keyscan github.com > known_hosts
  # 粘贴known_hosts文件内容

SERVER_USER:       # 服务器登录用户名 (例如: root 或 hqluo)
SERVER_HOST:       # 服务器IP地址 (例如: 47.115.210.144)

DOCKER_USERNAME:   # Docker Hub用户名
DOCKER_PASSWORD:   # Docker Hub密码或访问令牌
```

### 可选Secrets：
```
SLACK_WEBHOOK:     # Slack通知Webhook地址
```

## 2. 服务器端配置

### 2.1 创建项目目录
```bash
# 在服务器上执行
mkdir -p /home/hqluo/xiaozhi
cd /home/hqluo/xiaozhi

# 克隆项目（如果还没有）
git clone https://github.com/luohuiiqng/smart_bird.git .
```

### 2.2 配置环境变量
```bash
# 复制环境变量文件
cp .env.example .env

# 编辑.env文件，配置生产凭证
nano .env
```

确保配置了以下关键变量：
```
DATABASE_URL=postgresql://app:***@localhost:5432/exam_sys?schema=public
JWT_ACCESS_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password
```

### 2.3 配置宿主机Nginx（如果80端口被占用）
```nginx
# /etc/nginx/conf.d/smart-bird.conf
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;  # 指向Docker容器的8080端口
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/v1 {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}
```

## 3. 部署流程

### 3.1 自动部署触发条件
- 推送代码到 `main` 分支
- 手动触发workflow_dispatch

### 3.2 手动部署步骤
如果你需要手动触发部署：
1. GitHub仓库 → 点击 **Actions** 标签
2. 选择 **"CI/CD Pipeline"**
3. 点击 **Run workflow**
4. 选择环境（production或staging）
5. 点击 **Run workflow**

### 3.3 查看部署状态
- **GitHub Actions**：查看workflow运行日志
- **服务器**：执行 `docker-compose -f docker-compose.prod.yml ps`
- **服务状态**：`docker-compose -f docker-compose.prod.yml logs -f api`

## 4. 故障排除

### 4.1 SSH连接失败
```bash
# 在服务器上检查
ssh-keygen -y -f ~/.ssh/github_actions_deploy

# 确保GitHub仓库中添加了正确的部署密钥
```

### 4.2 部署脚本错误
```bash
# 在服务器上手动测试部署步骤
cd /home/hqluo/xiaozhi
git pull origin main
npm run build --workspaces=false
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4.3 Docker构建失败
```bash
# 清理Docker缓存
docker system prune -a

# 重新构建
docker-compose -f docker-compose.prod.yml build --no-cache
```

## 5. 安全建议

1. **定期轮换密钥**：定期更换JWT密钥和数据库密码
2. **限制访问**：使用防火墙限制SSH访问
3. **监控日志**：定期检查部署日志和服务日志
4. **备份数据库**：配置自动数据库备份

## 6. 自定义部署脚本

如果你需要自定义部署流程，可以修改 `.github/workflows/ci-cd.yml` 中的部署部分：

```yaml
# 修改这个部分来自定义部署
- name: Deploy to Production
  run: |
    ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << 'EOF'
      set -e
      cd /path/to/your/project
      git pull origin main
      # 添加你的自定义部署命令
EOF
```

这个配置将为你实现完整的自动部署功能，每次代码变更后自动测试、构建并部署到生产服务器。