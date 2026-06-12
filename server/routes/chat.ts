import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/chat/:userId - 获取与某人的聊天记录
router.get('/:userId', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const before = req.query.before as string | undefined;

  let query = `
    SELECT * FROM chat_messages
    WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
  `;
  const params: any[] = [req.userId, req.params.userId, req.params.userId, req.userId];

  if (before) {
    query += ' AND created_at < (SELECT created_at FROM chat_messages WHERE id = ?)';
    params.push(before);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const messages = db.prepare(query).all(...params);

  // 标记消息为已读
  db.prepare(`
    UPDATE chat_messages SET read = 1
    WHERE from_id = ? AND to_id = ? AND read = 0
  `).run(req.params.userId, req.userId);

  res.json({ messages: messages.reverse() });
});

// POST /api/chat - 发送消息
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { toId, content } = req.body;

  if (!toId || !content?.trim()) {
    res.status(400).json({ error: '参数不完整' });
    return;
  }

  const db = getDb();

  // 检查是否是好友
  const isFriend: any = db.prepare(`
    SELECT * FROM friends
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
    AND status = 'accepted'
  `).get(req.userId, toId, toId, req.userId);

  if (!isFriend) {
    res.status(403).json({ error: '只能给好友发消息' });
    return;
  }

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO chat_messages (id, from_id, to_id, content) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, toId, content.trim());

  const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id);
  res.json({ message });
});

// GET /api/chat/unread/count - 获取未读消息数
router.get('/unread/count', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const count: any = db.prepare(`
    SELECT from_id, COUNT(*) as count
    FROM chat_messages
    WHERE to_id = ? AND read = 0
    GROUP BY from_id
  `).all(req.userId);

  res.json({ unread: count });
});

export default router;
