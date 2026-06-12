# Handoff

## 已完成
- 修复 `server/routes/bottles.ts` POST / 接口返回格式：`{ bottle }` → `{ success: true, id: bottle.id, bottle }`，与前端 `api.ts` `throwBottle` 方法期望的 `{ success: boolean; id: string }` 对齐
- 解决 feat/social-enhancement 与 main 的合并冲突（auth.ts、MailboxModal.tsx、PlayerPanel.tsx、SocialPlaza.tsx、VisitorBookModal.tsx），保留 embedded 属性支持和辞好友检查逻辑
- PR #4 已合并到 main

## 未完成
- 无
