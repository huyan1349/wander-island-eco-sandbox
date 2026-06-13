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

### 步骤 2: 临时设仓库为公开

```bash
gh repo edit huyan1349/wander-island-eco-sandbox --visibility public --accept-visibility-change-consequences
```

### 步骤 3: 通过阿里云云助手执行部署命令

使用 `aliyun ecs RunCommand` 执行以下脚本（Base64 编码）：

```bash
#!/bin/bash
cd /root/wander-island

# 拉取最新代码
if [ -d /tmp/wi-clone ]; then
  cd /tmp/wi-clone && git pull 2>&1
else
  git clone --depth 1 https://github.com/huyan1349/wander-island-eco-sandbox.git /tmp/wi-clone 2>&1
fi

# 复制文件到项目目录
cp -r /tmp/wi-clone/* /root/wander-island/
cp -r /tmp/wi-clone/.* /root/wander-island/ 2>/dev/null || true

# 构建
cd /root/wander-island
npm run build 2>&1 | tail -3

# 重启 PM2
pm2 restart wander-island

# 验证
wc -c public/admin.html
echo "DEPLOY_DONE"
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
sleep 120
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

- GitHub 在国内下载慢，git clone/pull 可能需要 1-2 分钟
- SSH 可能被 fail2ban 封禁，优先使用阿里云云助手
- 每次部署后必须将仓库设回 private
- 如果 git pull 失败，删除 /tmp/wi-clone 重新 clone
- npm run build 通常需要 5-10 秒
- 部署总耗时约 2-3 分钟
