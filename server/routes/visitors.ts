import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/visitors/:islandId - 获取岛屿访客记录
router.get('/:islandId', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const visitors = db.prepare(`
    SELECT v.*, u.username as visitor_name, u.avatar as visitor_avatar
    FROM visitor_log v
    JOIN users u ON v.visitor_id = u.id
    WHERE v.island_id = ?
    ORDER BY v.created_at DESC
    LIMIT 50
  `).all(req.params.islandId);

  const count = db.prepare('SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_log WHERE island_id = ?').get(req.params.islandId) as any;

  res.json({ visitors, totalVisitors: count?.cnt || 0 });
});

// POST /api/visitors - 留下访客记录
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { islandId, message, rating } = req.body;
  if (!islandId) {
    res.status(400).json({ error: '岛屿ID不能为空' });
    return;
  }

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO visitor_log (id, island_id, visitor_id, message, rating) VALUES (?, ?, ?, ?, ?)')
    .run(id, islandId, req.userId, message || '', rating || 0);

  const visitor = db.prepare(`
    SELECT v.*, u.username as visitor_name, u.avatar as visitor_avatar
    FROM visitor_log v JOIN users u ON v.visitor_id = u.id WHERE v.id = ?
  `).get(id);
  res.json({ visitor });
});

export default router;
