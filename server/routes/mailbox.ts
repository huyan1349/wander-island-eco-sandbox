import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/mailbox - Get inbox
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const mail = db.prepare(`
    SELECT m.*, u.username as from_name, u.avatar as from_avatar
    FROM mailbox m
    JOIN users u ON u.id = m.from_id
    WHERE m.to_id = ?
    ORDER BY m.created_at DESC
  `).all(req.userId);

  res.json({ mails: mail });
});

// GET /api/mailbox/unread - Get unread count
router.get('/unread', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const result: any = db.prepare(`
    SELECT COUNT(*) as count FROM mailbox WHERE to_id = ? AND read = 0
  `).get(req.userId);

  res.json({ count: result?.count || 0 });
});

// POST /api/mailbox - Send mail
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { toId, subject, content, giftType } = req.body;

  if (!toId || !content?.trim()) {
    res.status(400).json({ error: '参数不完整' });
    return;
  }

  const db = getDb();

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(toId);
  if (!target) {
    res.status(404).json({ error: '收件人不存在' });
    return;
  }

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO mailbox (id, from_id, to_id, subject, content, gift_type) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, toId, subject || '', content.trim(), giftType || null);

  const mail = db.prepare(`
    SELECT m.*, u.username as from_name, u.avatar as from_avatar
    FROM mailbox m
    JOIN users u ON u.id = m.from_id
    WHERE m.id = ?
  `).get(id);

  res.json({ mail });
});

// PUT /api/mailbox/:id/read - Mark as read
router.put('/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const mail: any = db.prepare('SELECT * FROM mailbox WHERE id = ? AND to_id = ?').get(req.params.id, req.userId);
  if (!mail) {
    res.status(404).json({ error: '邮件不存在' });
    return;
  }

  db.prepare('UPDATE mailbox SET read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// DELETE /api/mailbox/:id - Delete mail
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const result = db.prepare('DELETE FROM mailbox WHERE id = ? AND to_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) {
    res.status(404).json({ error: '邮件不存在' });
    return;
  }

  res.json({ success: true });
});

export default router;
