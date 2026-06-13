import { Router, Request, Response } from 'express';
import getDb from '../db.js';

const router = Router();

// POST /api/gifts - 生成礼物（无需登录，任何人可生成分享链接）
router.post('/', (req: Request, res: Response) => {
  const { name, fromName, data } = req.body;
  if (!data) {
    res.status(400).json({ error: '缺少岛屿数据' });
    return;
  }
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO gifts (id, name, from_name, data) VALUES (?, ?, ?, ?)')
    .run(id, name || '', fromName || '', JSON.stringify(data));
  res.json({ id });
});

// GET /api/gifts/:id - 领取礼物（公开，无需登录，整个游戏可读取）
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const gift: any = db.prepare('SELECT * FROM gifts WHERE id = ?').get(req.params.id);
  if (!gift) {
    res.status(404).json({ error: '礼物不存在或已失效' });
    return;
  }
  db.prepare('UPDATE gifts SET claimed_count = claimed_count + 1 WHERE id = ?').run(req.params.id);
  res.json({
    id: gift.id,
    name: gift.name,
    fromName: gift.from_name,
    data: JSON.parse(gift.data),
  });
});

export default router;
