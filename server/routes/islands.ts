import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/islands - 浏览所有公开岛屿
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const islands = db.prepare(`
    SELECT i.id, i.name, i.is_public, i.updated_at, i.created_at,
           u.username as owner_name, u.avatar as owner_avatar, u.id as owner_id
    FROM islands i
    JOIN users u ON i.owner_id = u.id
    WHERE i.is_public = 1
    ORDER BY i.updated_at DESC
  `).all();

  res.json({ islands });
});

// GET /api/islands/my - 获取我的岛屿
router.get('/my', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const islands = db.prepare(`
    SELECT * FROM islands WHERE owner_id = ? ORDER BY updated_at DESC
  `).all(req.userId);

  res.json({ islands });
});

// GET /api/islands/:id - 获取岛屿详情
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const island: any = db.prepare(`
    SELECT i.*, u.username as owner_name, u.avatar as owner_avatar
    FROM islands i
    JOIN users u ON i.owner_id = u.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!island) {
    res.status(404).json({ error: '岛屿不存在' });
    return;
  }

  // 私有岛屿只有主人能看
  if (!island.is_public && island.owner_id !== req.userId) {
    res.status(403).json({ error: '这是私有岛屿' });
    return;
  }

  res.json({ island });
});

// POST /api/islands - 创建/部署岛屿
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { name, isPublic, data } = req.body;

  if (!name) {
    res.status(400).json({ error: '岛屿名称不能为空' });
    return;
  }

  const db = getDb();
  const id = crypto.randomUUID();

  db.prepare('INSERT INTO islands (id, owner_id, name, is_public, data) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.userId, name, isPublic !== false ? 1 : 0, JSON.stringify(data || {}));

  const island = db.prepare('SELECT * FROM islands WHERE id = ?').get(id);
  res.json({ island });
});

// PUT /api/islands/:id - 更新岛屿（保存）
router.put('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const island: any = db.prepare('SELECT * FROM islands WHERE id = ?').get(req.params.id);
  if (!island) {
    res.status(404).json({ error: '岛屿不存在' });
    return;
  }

  if (island.owner_id !== req.userId) {
    res.status(403).json({ error: '只能修改自己的岛屿' });
    return;
  }

  const { name, isPublic, data } = req.body;
  const updates: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (isPublic !== undefined) { updates.push('is_public = ?'); values.push(isPublic ? 1 : 0); }
  if (data !== undefined) { updates.push('data = ?'); values.push(JSON.stringify(data)); }

  if (updates.length === 0) {
    res.json({ island });
    return;
  }

  updates.push('updated_at = unixepoch()');
  values.push(req.params.id);

  db.prepare(`UPDATE islands SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM islands WHERE id = ?').get(req.params.id);
  res.json({ island: updated });
});

// DELETE /api/islands/:id - 删除岛屿
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const island: any = db.prepare('SELECT * FROM islands WHERE id = ?').get(req.params.id);
  if (!island) {
    res.status(404).json({ error: '岛屿不存在' });
    return;
  }

  if (island.owner_id !== req.userId) {
    res.status(403).json({ error: '只能删除自己的岛屿' });
    return;
  }

  db.prepare('DELETE FROM islands WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
