# Handoff

## 已完成 (Bug修复批次)
1. **Vite proxy 缺少 /avatars 路径** — 上传的头像在开发模式下404，已添加代理
2. **updateProfile Content-Type 不匹配** — 后端用 multer 期望 multipart/form-data，但前端不传文件时发 JSON，已统一改为 FormData
3. **AI回复只发到当前socket** — 改为 io.to() 确保多标签页都能收到
4. **bottles API 返回类型不匹配** — 后端返回 `{bottle}`，前端期望 `{success, id}`，已修复
5. **好友在线状态不更新** — PlayerPanel 和 SocialPanel 缺少 presence:status/user:online/user:offline 监听，已添加
6. **SocialPanel 不显示辞的AI标签** — 已添加 is_ai/is_online 判断
7. **embedded 模式缺少 padding** — MailboxModal/VisitorBookModal/SocialPlaza 已修复
8. **MailboxModal embedded 模式无写信按钮** — header 隐藏后无法写信，已添加内联按钮

## 未完成
- git push 因网络问题失败，需重试 `git push origin feat/social-enhancement`
- 合并 PR 到 main
