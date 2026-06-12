import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// POST /api/bottles - 投递漂流瓶
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { content, mood } = req.body;
  if (!content) {
    res.status(400).json({ error: '内容不能为空' });
    return;
  }
  if (content.length > 200) {
    res.status(400).json({ error: '内容不能超过200字' });
    return;
  }

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO messages_in_bottle (id, sender_id, content, mood) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, content, mood || 'happy');

  res.json({ success: true, id });
});

// GET /api/bottles/fish - 随机捡一个漂流瓶
router.get('/fish', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const bottle = db.prepare(`
    SELECT b.*, u.username as sender_name, u.avatar as sender_avatar, u.motto as sender_motto
    FROM messages_in_bottle b
    JOIN users u ON b.sender_id = u.id
    WHERE b.found_by IS NULL AND b.sender_id != ?
    ORDER BY RANDOM() LIMIT 1
  `).get(req.userId);

  if (!bottle) {
    res.json({ bottle: null });
    return;
  }

  // 标记为被捡到
  db.prepare('UPDATE messages_in_bottle SET found_by = ?, found_at = unixepoch() WHERE id = ?')
    .run(req.userId, (bottle as any).id);

  res.json({ bottle });
});

// POST /api/bottles/:id/reply - 回复漂流瓶
router.post('/:id/reply', authMiddleware, (req: AuthRequest, res: Response) => {
  const { reply } = req.body;
  if (!reply) {
    res.status(400).json({ error: '回复内容不能为空' });
    return;
  }

  const db = getDb();
  db.prepare('UPDATE messages_in_bottle SET reply = ?, reply_at = unixepoch() WHERE id = ? AND found_by = ?')
    .run(reply, req.params.id, req.userId);

  res.json({ success: true });
});

// GET /api/bottles/sent - 我发出的瓶子
router.get('/sent', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const bottles = db.prepare(`
    SELECT b.*, u.username as finder_name, u.avatar as finder_avatar
    FROM messages_in_bottle b
    LEFT JOIN users u ON b.found_by = u.id
    WHERE b.sender_id = ?
    ORDER BY b.created_at DESC LIMIT 20
  `).all(req.userId);
  res.json({ bottles });
});

export default router;
