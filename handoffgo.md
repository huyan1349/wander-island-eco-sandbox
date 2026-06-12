# Handoff

## 已完成
- PlayerPanel.tsx: 添加本地头像上传功能（Camera图标悬浮覆盖层，2MB限制，仅图片）
- PlayerPanel.tsx: 修改handleSaveName为async，登录用户名修改同步到服务器
- PlayerPanel.tsx: 侧边栏头像条件渲染（authUser显示上传，guest显示点击切换）
- PlayerPanel.tsx: Mini Widget头像区域添加上传覆盖层
- api.ts: 添加updateProfile方法（PUT /api/auth/profile）
- PR #1 已合并到main

## 未完成
- 后端 /api/auth/profile PUT 路由尚未实现（前端已调用，需后端配合）
- 名字编辑UI（isEditing）在侧边栏中未添加入口，仅函数已就绪
