import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import getDb from '../db.js';
import { generateToken, authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  if (username.length < 2 || username.length > 20) {
    res.status(400).json({ error: '用户名长度需在2-20之间' });
    return;
  }

  if (password.length < 4) {
    res.status(400).json({ error: '密码至少4位' });
    return;
  }

  const db = getDb();

  // Check if username exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: '用户名已被占用' });
    return;
  }

  const id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatar = `https://api.dicebear.com/7.x/notionists/svg?seed=${username}&backgroundColor=b6e3f4`;

  db.prepare('INSERT INTO users (id, username, password_hash, avatar) VALUES (?, ?, ?, ?)')
    .run(id, username, passwordHash, avatar);

  const token = generateToken(id);

  res.json({
    token,
    user: { id, username, avatar }
  });
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const db = getDb();
  const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  // Update last online
  db.prepare('UPDATE users SET last_online = unixepoch() WHERE id = ?').run(user.id);

  const token = generateToken(user.id);

  res.json({
    token,
    user: { id: user.id, username: user.username, avatar: user.avatar }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user: any = db.prepare('SELECT id, username, avatar, created_at, last_online FROM users WHERE id = ?').get(req.userId);

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  res.json({ user });
});

// PUT /api/auth/profile - Update profile (avatar and/or username)
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { username, avatar } = req.body;
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (username) {
      // Check if username is taken by another user
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.userId) as any;
      if (existing) {
        return res.status(400).json({ error: '用户名已被占用' });
      }
      if (username.length < 2 || username.length > 20) {
        return res.status(400).json({ error: '用户名长度需在2-20之间' });
      }
      updates.push('username = ?');
      values.push(username);
    }

    if (avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(avatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的内容' });
    }

    values.push(req.userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(req.userId) as any;
    res.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

export default router;
