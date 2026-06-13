---
name: "deploy-server"
description: "One-click deploy project to Alibaba Cloud ECS server. Invoke when user says 'deploy', 'push to server', 'update server', or wants to sync local code to the remote server."
---

# Deploy to Server

一键将本地项目代码推送到阿里云 ECS 服务器并重启服务。

## 服务器信息

- **域名**: wander.qiyuankaiwu.com（Cloudflare CDN + HTTPS）
- **IP**: 121.41.239.12
- **Region**: cn-hangzhou
- **InstanceId**: i-bp1foxoouc62tsvy69rn
- **项目目录**: /root/wander-island
- **PM2 进程名**: wander-island
- **端口**: 8080（Nginx 80 → 8080）
- **SSH**: root@121.41.239.12（可能被 fail2ban 封禁，优先用云助手）

## 部署流程

### 步骤 1: Git 提交并推送

```bash
cd /Users/huyan/Desktop/wander-island_-eco-sandbox
git add -A
git commit -m "<commit message>"
git push origin main
```

### 步骤 2: 创建 GitHub Release 并临时设仓库为公开

```bash
# 打包代码（排除 node_modules, .git, dist）
tar czf /tmp/wander-island-deploy.tar.gz --exclude=node_modules --exclude=.git --exclude=dist .

# 创建带时间戳的 release
VERSION="v$(date +%Y%m%d%H%M)"
gh release create "$VERSION" /tmp/wander-island-deploy.tar.gz --title "Deploy $VERSION" --notes "Auto deploy"

# 临时设仓库为公开
gh repo edit huyan1349/wander-island-eco-sandbox --visibility public --accept-visibility-change-consequences
```

### 步骤 3: 通过阿里云云助手执行部署命令

**重要**: 服务器在国内，直接访问 GitHub 超时。必须使用 ghproxy 镜像加速下载 Release 文件。

使用 `aliyun ecs RunCommand` 执行以下脚本：

```bash
#!/bin/bash
set -e
cd /tmp
rm -rf wander-deploy 2>/dev/null
mkdir -p wander-deploy && cd wander-deploy

# 使用 ghproxy 镜像加速下载（国内服务器无法直连 GitHub）
URL1="https://ghfast.top/https://github.com/huyan1349/wander-island-eco-sandbox/releases/download/<VERSION>/wander-island-deploy.tar.gz"
URL2="https://gh-proxy.com/https://github.com/huyan1349/wander-island-eco-sandbox/releases/download/<VERSION>/wander-island-deploy.tar.gz"
URL3="https://github.com/huyan1349/wander-island-eco-sandbox/releases/download/<VERSION>/wander-island-deploy.tar.gz"

DOWNLOADED=false
for URL in $URL1 $URL2 $URL3; do
    if curl -fsSL --connect-timeout 15 --max-time 120 -o wander-island-deploy.tar.gz "$URL"; then
        SIZE=$(stat -c%s wander-island-deploy.tar.gz 2>/dev/null || echo 0)
        if [ "$SIZE" -gt 10000 ]; then
            echo "Downloaded: $SIZE bytes"
            DOWNLOADED=true
            break
        fi
    fi
done

if [ "$DOWNLOADED" = false ]; then
    echo "ERROR: All download mirrors failed"
    exit 1
fi

# 解压到新目录
rm -rf /root/wander-island-new
mkdir -p /root/wander-island-new
tar xzf wander-island-deploy.tar.gz -C /root/wander-island-new

# 安装依赖并构建
cd /root/wander-island-new
npm install 2>&1 | tail -3
npm run build 2>&1 | tail -5

# 保留数据文件
cp /root/wander-island/.env /root/wander-island-new/.env 2>/dev/null || true
cp /root/wander-island/wander-island.db /root/wander-island-new/wander-island.db 2>/dev/null || true
cp -r /root/wander-island/data /root/wander-island-new/data 2>/dev/null || true

# 交换目录
rm -rf /root/wander-island-old 2>/dev/null
mv /root/wander-island /root/wander-island-old 2>/dev/null || true
mv /root/wander-island-new /root/wander-island

# 重启 PM2（必须设置 PORT=8080）
pm2 delete wander-island 2>/dev/null || true
sleep 1
cd /root/wander-island && PORT=8080 pm2 start npm --name wander-island -- start
sleep 8
pm2 save

# 验证
curl -s -o /dev/null -w '8080: %{http_code}\n' http://127.0.0.1:8080/

# 清理
rm -rf /tmp/wander-deploy /root/wander-island-old
echo "DEPLOY COMPLETE"
```

云助手命令模板：

```bash
aliyun ecs RunCommand \
  --RegionId cn-hangzhou \
  --InstanceId.1 i-bp1foxoouc62tsvy69rn \
  --Type RunShellScript \
  --CommandContent "<上述脚本>" \
  --Timeout 600
```

### 步骤 4: 检查部署结果

```bash
sleep 180
aliyun ecs DescribeInvocationResults \
  --RegionId cn-hangzhou \
  --InvokeId <返回的InvokeId> | \
  python3 -c "
import sys,json,base64
d=json.load(sys.stdin)
for r in d.get('Invocation',{}).get('InvocationResults',{}).get('InvocationResult',[]):
    output = base64.b64decode(r.get('Output','')).decode('utf-8','replace') if r.get('Output') else ''
    print(f'Status: {r.get(\"InvocationStatus\",\"?\")}')
    print(output[-2000:])
"
```

### 步骤 5: 设回私有仓库

```bash
gh repo edit huyan1349/wander-island-eco-sandbox --visibility private --accept-visibility-change-consequences
```

### 步骤 6: 验证

```bash
curl -sL -o /dev/null -w "%{http_code}" -A "Mozilla/5.0" https://wander.qiyuankaiwu.com/
curl -sL -o /dev/null -w "%{http_code}" -A "Mozilla/5.0" https://wander.qiyuankaiwu.com/admin.html
```

## 注意事项

- **域名**: wander.qiyuankaiwu.com（通过 Cloudflare CDN，自动 HTTP→HTTPS）
- **GitHub 在国内无法直连**，必须使用 ghproxy 镜像（ghfast.top / gh-proxy.com）下载 Release
- 使用 GitHub Release 方式部署（而非 git clone），因为 Release 文件可通过镜像加速
- SSH 可能被 fail2ban 封禁，优先使用阿里云云助手
- 每次部署后必须将仓库设回 private
- **PORT 必须设为 8080**（Nginx 代理到 8080），否则服务不可用
- npm start 使用 tsx server/index.ts（完整服务器，含静态文件、Socket.IO、API）
- 部署总耗时约 3-5 分钟（含 npm install + build）
