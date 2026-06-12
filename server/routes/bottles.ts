import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// POST /api/bottles - Throw a bottle
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { content, mood } = req.body;

  if (!content?.trim()) {
    res.status(400).json({ error: '内容不能为空' });
    return;
  }

  const db = getDb();
  const id = crypto.randomUUID();

  db.prepare('INSERT INTO messages_in_bottle (id, sender_id, content, mood) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, content.trim(), mood || 'happy');

  const bottle = db.prepare('SELECT * FROM messages_in_bottle WHERE id = ?').get(id);
  res.json({ bottle });
});

// GET /api/bottles/fish - Randomly fish a bottle
router.get('/fish', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const bottle: any = db.prepare(`
    SELECT * FROM messages_in_bottle
    WHERE sender_id != ? AND found_by IS NULL
    ORDER BY RANDOM() LIMIT 1
  `).get(req.userId);

  if (!bottle) {
    res.json({ bottle: null });
    return;
  }

  db.prepare('UPDATE messages_in_bottle SET found_by = ?, found_at = unixepoch() WHERE id = ?')
    .run(req.userId, bottle.id);

  const sender: any = db.prepare('SELECT username, avatar FROM users WHERE id = ?').get(bottle.sender_id);

  res.json({
    bottle: {
      ...bottle,
      found_by: req.userId,
      found_at: Math.floor(Date.now() / 1000),
      sender_name: sender?.username,
      sender_avatar: sender?.avatar
    }
  });
});

// POST /api/bottles/:id/reply - Reply to a bottle
router.post('/:id/reply', authMiddleware, (req: AuthRequest, res: Response) => {
  const { reply } = req.body;

  if (!reply?.trim()) {
    res.status(400).json({ error: '回复内容不能为空' });
    return;
  }

  const db = getDb();

  const bottle: any = db.prepare('SELECT * FROM messages_in_bottle WHERE id = ? AND found_by = ?').get(req.params.id, req.userId);
  if (!bottle) {
    res.status(404).json({ error: '漂流瓶不存在或非你捡到的' });
    return;
  }

  db.prepare('UPDATE messages_in_bottle SET reply = ?, reply_at = unixepoch() WHERE id = ?')
    .run(reply.trim(), req.params.id);

  const updated = db.prepare('SELECT * FROM messages_in_bottle WHERE id = ?').get(req.params.id);
  res.json({ bottle: updated });
});

// GET /api/bottles/sent - Get my sent bottles
router.get('/sent', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const bottles = db.prepare(`
    SELECT b.*,
      finder.username as finder_name,
      finder.avatar as finder_avatar
    FROM messages_in_bottle b
    LEFT JOIN users finder ON finder.id = b.found_by
    WHERE b.sender_id = ?
    ORDER BY b.created_at DESC
  `).all(req.userId);

  res.json({ bottles });
});

export default router;
