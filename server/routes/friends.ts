import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/friends - 获取好友列表
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const friends = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.last_online, f.status, f.created_at
    FROM friends f
    JOIN users u ON (
      CASE WHEN f.user_id = ? THEN u.id = f.friend_id ELSE u.id = f.user_id END
    )
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
    ORDER BY u.last_online DESC
  `).all(req.userId, req.userId, req.userId);

  res.json({ friends });
});

// GET /api/friends/requests - 获取待处理的好友请求
router.get('/requests', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  // 收到的请求
  const incoming = db.prepare(`
    SELECT u.id, u.username, u.avatar, f.created_at
    FROM friends f
    JOIN users u ON u.id = f.user_id
    WHERE f.friend_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.userId);

  // 发出的请求
  const outgoing = db.prepare(`
    SELECT u.id, u.username, u.avatar, f.created_at
    FROM friends f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.userId);

  res.json({ incoming, outgoing });
});

// POST /api/friends/request - 发送好友请求
router.post('/request', authMiddleware, (req: AuthRequest, res: Response) => {
  const { userId: targetId } = req.body;

  if (!targetId) {
    res.status(400).json({ error: '请指定用户' });
    return;
  }

  if (targetId === req.userId) {
    res.status(400).json({ error: '不能加自己为好友' });
    return;
  }

  const db = getDb();

  // 检查目标用户是否存在
  const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!targetUser) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  // 检查是否已有好友关系
  const existing: any = db.prepare(`
    SELECT * FROM friends
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(req.userId, targetId, targetId, req.userId);

  if (existing) {
    if (existing.status === 'accepted') {
      res.status(409).json({ error: '已经是好友了' });
      return;
    }
    if (existing.status === 'pending') {
      res.status(409).json({ error: '已发送过请求' });
      return;
    }
    if (existing.status === 'blocked') {
      res.status(403).json({ error: '无法添加该用户' });
      return;
    }
  }

  db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)')
    .run(req.userId, targetId, 'pending');

  res.json({ success: true });
});

// POST /api/friends/accept - 接受好友请求
router.post('/accept', authMiddleware, (req: AuthRequest, res: Response) => {
  const { userId: fromId } = req.body;

  if (!fromId) {
    res.status(400).json({ error: '请指定用户' });
    return;
  }

  const db = getDb();
  const request: any = db.prepare(`
    SELECT * FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'pending'
  `).get(fromId, req.userId);

  if (!request) {
    res.status(404).json({ error: '没有该好友请求' });
    return;
  }

  db.prepare('UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ?')
    .run('accepted', fromId, req.userId);

  res.json({ success: true });
});

// POST /api/friends/reject - 拒绝好友请求
router.post('/reject', authMiddleware, (req: AuthRequest, res: Response) => {
  const { userId: fromId } = req.body;

  if (!fromId) {
    res.status(400).json({ error: '请指定用户' });
    return;
  }

  const db = getDb();
  db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ? AND status = ?')
    .run(fromId, req.userId, 'pending');

  res.json({ success: true });
});

// DELETE /api/friends/:userId - 删除好友
router.delete('/:userId', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare(`
    DELETE FROM friends WHERE
    ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
    AND status = 'accepted'
  `).run(req.userId, req.params.userId, req.params.userId, req.userId);

  res.json({ success: true });
});

// GET /api/friends/search - 搜索用户
router.get('/search/:query', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const query = `%${req.params.query}%`;

  const users = db.prepare(`
    SELECT id, username, avatar, last_online FROM users
    WHERE username LIKE ? AND id != ?
    LIMIT 20
  `).all(query, req.userId);

  res.json({ users });
});

export default router;
