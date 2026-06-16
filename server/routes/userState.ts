import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/user-state - 拉取账号级进度（XP / 辞好感度 / 记忆 / 成就 / 居民卡 / 音乐卡）
// 这些数据原先只存在浏览器 localStorage，无法跨设备同步；现作为整体 JSON 存于服务器。
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT data, updated_at FROM user_state WHERE user_id = ?')
    .get(req.userId) as { data: string; updated_at: number } | undefined;

  if (!row) {
    res.json({ state: null, updatedAt: 0 });
    return;
  }

  let state: Record<string, unknown> = {};
  try { state = JSON.parse(row.data); } catch { state = {}; }
  res.json({ state, updatedAt: row.updated_at });
});

// PUT /api/user-state - 整体保存账号级进度（前端已做合并，这里只负责覆盖落库）
router.put('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { state } = req.body;
  if (state === undefined || state === null || typeof state !== 'object') {
    res.status(400).json({ error: '无效的状态数据' });
    return;
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO user_state (user_id, data, updated_at)
    VALUES (?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(req.userId, JSON.stringify(state));

  const row = db.prepare('SELECT updated_at FROM user_state WHERE user_id = ?')
    .get(req.userId) as { updated_at: number };
  res.json({ success: true, updatedAt: row.updated_at });
});

export default router;
