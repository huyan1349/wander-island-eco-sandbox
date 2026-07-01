# Handoff · 流浪岛

## 当前状态
- HEAD: `35fe573` Revert "feat(opening): add 28s cinematic opening sequence (#33)"
- 版本: v2.1.0
- 远程: origin/main 已同步

## 本次完成
- 回滚 PR #33(开场仪式)的全部改动
- 方式: `git revert c92e03c`(非 force push,保留历史可追溯)
- 撤销文件:
  - 删除 `src/components/OpeningSequence.tsx`
  - 删除 `handoffgo.md`(本文件为重新创建)
  - `src/App.tsx`、`src/components/TitleScreen.tsx`、`src/components/SettingsModal.tsx`、`package.json` 恢复到 v2.1.0 状态
- 验证: `npm run verify` 全通过(lint / 23 tests / build 3.97s)

## 未完成 / 下一棒可选方向
按 ROI 排序,均**待用户确认**才执行:
1. **色彩宪法 + HUD 默认隐藏** —— 每个地貌锁定 1 主色 + 1 强调色 + 1 禁忌色;默认隐藏所有 HUD,鼠标移到边缘才浮现
2. **声音留白** —— 每隔 N 分钟 BGM 淡出 20–40 秒,只留环境音(风/水/虫鸣)
3. **辞的环境化** —— 弹窗 → 沙滩留字 / 灯笼显诗;加入"连续 3 天不放置 → 辞说重话后沉默一整天"
4. **告别序列** —— 集齐 6 张音乐卡 + 生态极佳 7 天 → 触发 2 分钟无操作告别序列

## 注意事项
- `public/profile-assets/` 为 untracked,未纳入本次提交
- 开场仪式的 localStorage 标记 `wander-opening-seen` 在用户浏览器中可能残留,但不影响功能(代码已无读取处)
- 若日后想恢复开场仪式,可 `git revert 35fe573` 反向恢复,或从 PR #33 重新 cherry-pick
