import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/mailbox - 获取收件箱
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const mails = db.prepare(`
    SELECT m.*, u.username as from_name, u.avatar as from_avatar
    FROM mailbox m
    JOIN users u ON m.from_id = u.id
    WHERE m.to_id = ?
    ORDER BY m.created_at DESC
    LIMIT 50
  `).all(req.userId);
  res.json({ mails });
});

// GET /api/mailbox/unread - 未读数量
router.get('/unread', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as count FROM mailbox WHERE to_id = ? AND read = 0').get(req.userId) as any;
  res.json({ count: result.count });
});

// POST /api/mailbox - 发送信件
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { toId, subject, content, giftType } = req.body;
  if (!toId || !content) {
    res.status(400).json({ error: '收件人和内容不能为空' });
    return;
  }
  if (content.length > 500) {
    res.status(400).json({ error: '内容不能超过500字' });
    return;
  }

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO mailbox (id, from_id, to_id, subject, content, gift_type) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, toId, subject || '', content, giftType || null);

  const mail = db.prepare(`
    SELECT m.*, u.username as from_name, u.avatar as from_avatar
    FROM mailbox m JOIN users u ON m.from_id = u.id WHERE m.id = ?
  `).get(id);
  res.json({ mail });
});

// PUT /api/mailbox/:id/read - 标记已读
router.put('/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('UPDATE mailbox SET read = 1 WHERE id = ? AND to_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// DELETE /api/mailbox/:id
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM mailbox WHERE id = ? AND to_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

export default router;
