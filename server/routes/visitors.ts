import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/visitors/:islandId - Get visitor log
router.get('/:islandId', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const visitors = db.prepare(`
    SELECT v.*, u.username as visitor_name, u.avatar as visitor_avatar
    FROM visitor_log v
    JOIN users u ON u.id = v.visitor_id
    WHERE v.island_id = ?
    ORDER BY v.created_at DESC
  `).all(req.params.islandId);

  const totalResult: any = db.prepare(`
    SELECT COUNT(DISTINCT visitor_id) as count FROM visitor_log WHERE island_id = ?
  `).get(req.params.islandId);

  res.json({ visitors, totalVisitors: totalResult?.count || 0 });
});

// POST /api/visitors - Leave visitor log
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { islandId, message, rating } = req.body;

  if (!islandId) {
    res.status(400).json({ error: '请指定岛屿' });
    return;
  }

  const db = getDb();

  const island = db.prepare('SELECT id FROM islands WHERE id = ?').get(islandId);
  if (!island) {
    res.status(404).json({ error: '岛屿不存在' });
    return;
  }

  const id = crypto.randomUUID();
  const clampedRating = Math.max(0, Math.min(5, parseInt(rating) || 0));

  db.prepare('INSERT INTO visitor_log (id, island_id, visitor_id, message, rating) VALUES (?, ?, ?, ?, ?)')
    .run(id, islandId, req.userId, message || '', clampedRating);

  const log = db.prepare(`
    SELECT v.*, u.username as visitor_name, u.avatar as visitor_avatar
    FROM visitor_log v
    JOIN users u ON u.id = v.visitor_id
    WHERE v.id = ?
  `).get(id);

  res.json({ log });
});

export default router;
