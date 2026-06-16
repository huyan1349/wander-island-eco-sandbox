import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';
import crypto from 'crypto';

const router = Router();

// GET /api/board - 全岛留言板：最近 60 条
router.get('/', authMiddleware, (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const posts = db.prepare(`
    SELECT b.id, b.content, b.mood, b.created_at, u.username, u.avatar
    FROM board_posts b JOIN users u ON u.id = b.user_id
    ORDER BY b.created_at DESC LIMIT 60
  `).all();
  res.json({ posts });
});

// POST /api/board - 发一条留言
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const content = String(req.body?.content || '').trim();
  const mood = String(req.body?.mood || '').slice(0, 8);
  if (!content) { res.status(400).json({ error: '留言不能为空' }); return; }
  if (content.length > 200) { res.status(400).json({ error: '留言太长了（≤200字）' }); return; }

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO board_posts (id, user_id, content, mood) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, content, mood);

  const post = db.prepare(`
    SELECT b.id, b.content, b.mood, b.created_at, u.username, u.avatar
    FROM board_posts b JOIN users u ON u.id = b.user_id WHERE b.id = ?
  `).get(id);
  res.json({ post });
});

export default router;
