---
name: "deploy-server"
description: "One-click deploy project to Alibaba Cloud ECS server. Invoke when user says 'deploy', 'push to server', 'update server', or wants to sync local code to the remote server."
---

# Deploy to Server

一键将本地项目代码推送到阿里云 ECS 服务器并重启服务。

## 服务器信息

- **IP**: 121.41.239.12
- **Region**: cn-hangzhou
- **InstanceId**: i-bp1foxoouc62tsvy69rn
- **项目目录**: /root/wander-island
- **PM2 进程名**: wander-island
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
# 打包代码
tar czf /tmp/wander-island-deploy-latest.tar.gz --exclude=node_modules --exclude=.git --exclude=dist package.json package-lock.json tsconfig.json vite.config.ts index.html server/ src/ public/

# 删除旧 release
gh release delete deploy-latest --yes 2>/dev/null

# 创建新 release
gh release create deploy-latest /tmp/wander-island-deploy-latest.tar.gz --title "Deploy Latest" --notes "Latest code"

# 临时设仓库为公开
gh repo edit huyan1349/wander-island-eco-sandbox --visibility public --accept-visibility-change-consequences
```

### 步骤 3: 通过阿里云云助手执行部署命令

**重要**: 服务器在国内，直接访问 GitHub 超时。必须使用 ghproxy 镜像加速下载 Release 文件。

使用 `aliyun ecs RunCommand` 执行以下脚本（Base64 编码）：

```bash
#!/bin/bash
cd /root/wander-island
rm -f deploy-latest.tar.gz

# 使用 ghproxy 镜像加速下载（国内服务器无法直连 GitHub）
curl -L --connect-timeout 30 -o deploy-latest.tar.gz "https://ghfast.top/https://github.com/huyan1349/wander-island-eco-sandbox/releases/download/deploy-latest/wander-island-deploy-latest.tar.gz" 2>&1 | tail -2
SIZE=$(stat -c%s deploy-latest.tar.gz 2>/dev/null || echo 0)

if [ "$SIZE" -lt 1000 ]; then
  rm -f deploy-latest.tar.gz
  curl -L --connect-timeout 30 -o deploy-latest.tar.gz "https://gh-proxy.com/https://github.com/huyan1349/wander-island-eco-sandbox/releases/download/deploy-latest/wander-island-deploy-latest.tar.gz" 2>&1 | tail -2
  SIZE=$(stat -c%s deploy-latest.tar.gz 2>/dev/null || echo 0)
fi

if [ "$SIZE" -gt 1000 ]; then
  tar xzf deploy-latest.tar.gz
  rm deploy-latest.tar.gz
  npm run build 2>&1 | tail -3
  pm2 restart wander-island
  wc -c public/admin.html
  echo "DEPLOY_DONE"
else
  echo "DOWNLOAD_FAILED"
fi
```

云助手命令模板：

```bash
CMD=$(echo '<上述脚本>' | base64)
aliyun ecs RunCommand \
  --RegionId cn-hangzhou \
  --InstanceId.1 i-bp1foxoouc62tsvy69rn \
  --Type RunShellScript \
  --CommandContent "$CMD" \
  --ContentEncoding Base64 \
  --Timeout 300
```

### 步骤 4: 检查部署结果

```bash
sleep 90
aliyun ecs DescribeInvocationResults \
  --RegionId cn-hangzhou \
  --InvokeId <返回的InvokeId> | \
  python3 -c "
import sys,json,base64
d=json.load(sys.stdin)
for r in d.get('Invocation',{}).get('InvocationResults',{}).get('InvocationResult',[]):
    output = base64.b64decode(r.get('Output','')).decode('utf-8','replace') if r.get('Output') else ''
    print(f'Status: {r.get(\"InvocationStatus\",\"?\")}')
    print(output[-1500:])
"
```

### 步骤 5: 设回私有仓库

```bash
gh repo edit huyan1349/wander-island-eco-sandbox --visibility private --accept-visibility-change-consequences
```

### 步骤 6: 验证

```bash
curl -s -o /dev/null -w "%{http_code}" http://121.41.239.12/
curl -s -o /dev/null -w "%{http_code}" http://121.41.239.12/admin.html
```

## 注意事项

- **GitHub 在国内无法直连**，必须使用 ghproxy 镜像（ghfast.top / gh-proxy.com）下载 Release
- 使用 GitHub Release 方式部署（而非 git clone），因为 Release 文件可通过镜像加速
- SSH 可能被 fail2ban 封禁，优先使用阿里云云助手
- 每次部署后必须将仓库设回 private
- npm run build 通常需要 5-10 秒
- 部署总耗时约 1-2 分钟（使用镜像加速后）
