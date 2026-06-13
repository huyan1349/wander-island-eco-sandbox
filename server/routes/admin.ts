import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import getDb from '../db.js';
import { JWT_SECRET } from '../auth.js';

const router = Router();

// Admin auth middleware - check if user is wander_admin
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET) as any;
    
    const db = getDb();
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(decoded.userId) as any;
    if (!user || user.username !== 'wander_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Dashboard overview - enhanced with activity data
router.get('/overview', adminAuth, (_req: Request, res: Response) => {
  const db = getDb();

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const islandCount = (db.prepare('SELECT COUNT(*) as c FROM islands').get() as any).c;
  const messageCount = (db.prepare('SELECT COUNT(*) as c FROM chat_messages').get() as any).c;
  const mailboxCount = (db.prepare('SELECT COUNT(*) as c FROM mailbox').get() as any).c;
  const bottleCount = (db.prepare('SELECT COUNT(*) as c FROM messages_in_bottle').get() as any).c;
  const visitorCount = (db.prepare('SELECT COUNT(*) as c FROM visitor_log').get() as any).c;
  const friendCount = (db.prepare("SELECT COUNT(*) as c FROM friends WHERE status = 'accepted'").get() as any).c;

  const now = Math.floor(Date.now() / 1000);
  const today = now - 86400;
  const newUsersToday = (db.prepare('SELECT COUNT(*) as c FROM users WHERE created_at > ?').get(today) as any).c;
  const newMessagesToday = (db.prepare('SELECT COUNT(*) as c FROM chat_messages WHERE created_at > ?').get(today) as any).c;

  // Active users in last 7 days
  const weekAgo = now - 7 * 86400;
  const activeWeek = (db.prepare('SELECT COUNT(*) as c FROM users WHERE last_online > ?').get(weekAgo) as any).c;

  // Online users (last 5 min)
  const fiveMinAgo = now - 300;
  const onlineCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE last_online > ?').get(fiveMinAgo) as any).c;

  // Activity timeline - last 7 days daily counts
  const activity: { date: string; users: number; messages: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = now - (i + 1) * 86400;
    const dayEnd = now - i * 86400;
    const d = new Date(dayStart * 1000);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const dayUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE created_at > ? AND created_at <= ?').get(dayStart, dayEnd) as any).c;
    const dayMessages = (db.prepare('SELECT COUNT(*) as c FROM chat_messages WHERE created_at > ? AND created_at <= ?').get(dayStart, dayEnd) as any).c;
    activity.push({ date: dateStr, users: dayUsers, messages: dayMessages });
  }

  // Recent activity log
  const recentActivity: { type: string; username: string; detail: string; time: number }[] = [];

  // Recent registrations
  const recentUsers = db.prepare('SELECT username, created_at FROM users ORDER BY created_at DESC LIMIT 3').all() as any[];
  for (const u of recentUsers) {
    recentActivity.push({ type: 'register', username: u.username, detail: '注册了账号', time: u.created_at });
  }

  // Recent messages
  const recentMsgs = db.prepare(`
    SELECT u.username, m.content, m.created_at
    FROM chat_messages m JOIN users u ON m.from_id = u.id
    ORDER BY m.created_at DESC LIMIT 3
  `).all() as any[];
  for (const m of recentMsgs) {
    recentActivity.push({ type: 'message', username: m.username, detail: m.content?.slice(0, 30) || '', time: m.created_at });
  }

  // Recent bottles
  const recentBottles = db.prepare(`
    SELECT u.username, b.content, b.created_at
    FROM messages_in_bottle b JOIN users u ON b.sender_id = u.id
    ORDER BY b.created_at DESC LIMIT 2
  `).all() as any[];
  for (const b of recentBottles) {
    recentActivity.push({ type: 'bottle', username: b.username, detail: b.content?.slice(0, 30) || '', time: b.created_at });
  }

  // Sort by time
  recentActivity.sort((a, b) => b.time - a.time);

  res.json({
    userCount, islandCount, messageCount, mailboxCount,
    bottleCount, visitorCount, friendCount,
    newUsersToday, newMessagesToday, activeWeek,
    onlineCount, activity, recentActivity: recentActivity.slice(0, 10)
  });
});

// List all users
router.get('/users', adminAuth, (req: Request, res: Response) => {
  const db = getDb();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search as string;
  
  let query = `
    SELECT u.id, u.username, u.avatar, u.motto, u.created_at, u.last_online,
      (SELECT COUNT(*) FROM islands WHERE owner_id = u.id) as island_count,
      (SELECT COUNT(*) FROM friends WHERE (user_id = u.id OR friend_id = u.id) AND status = 'accepted') as friend_count
    FROM users u
  `;
  let countQuery = 'SELECT COUNT(*) as total FROM users';
  const params: any[] = [];
  
  if (search) {
    query += ' WHERE u.username LIKE ?';
    countQuery += ' WHERE username LIKE ?';
    params.push(`%${search}%`);
  }
  
  query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  
  const users = db.prepare(query).all(...params, limit, offset);
  const total = (db.prepare(countQuery).get(...params) as any).total;
  
  res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
});

// Get user detail
router.get('/users/:id', adminAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  
  const user = db.prepare(`
    SELECT id, username, avatar, motto, created_at, last_online
    FROM users WHERE id = ?
  `).get(id);
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const islands = db.prepare('SELECT id, name, is_public, created_at, updated_at FROM islands WHERE owner_id = ?').all(id);
  const friends = db.prepare(`
    SELECT u.id, u.username, f.status, f.created_at
    FROM friends f
    JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id = u.id ELSE f.user_id = u.id END)
    WHERE f.user_id = ? OR f.friend_id = ?
    ORDER BY f.created_at DESC
  `).all(id, id, id);
  const messageCount = (db.prepare('SELECT COUNT(*) as c FROM chat_messages WHERE from_id = ? OR to_id = ?').get(id, id) as any).c;
  
  res.json({ user, islands, friends, messageCount });
});

// Delete user
router.delete('/users/:id', adminAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  
  // Don't allow deleting admin or AI
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.username === 'wander_admin') return res.status(403).json({ error: 'Cannot delete admin' });
  if (user.username === '辞') return res.status(403).json({ error: 'Cannot delete AI character' });
  
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});

// List all islands
router.get('/islands', adminAuth, (req: Request, res: Response) => {
  const db = getDb();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  
  const islands = db.prepare(`
    SELECT i.id, i.name, i.is_public, i.created_at, i.updated_at,
      u.username as owner_name
    FROM islands i
    JOIN users u ON i.owner_id = u.id
    ORDER BY i.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  
  const total = (db.prepare('SELECT COUNT(*) as c FROM islands').get() as any).c;
  
  res.json({ islands, total, page, totalPages: Math.ceil(total / limit) });
});

// Recent messages
router.get('/messages', adminAuth, (req: Request, res: Response) => {
  const db = getDb();
  const limit = parseInt(req.query.limit as string) || 50;
  
  const messages = db.prepare(`
    SELECT m.id, m.content, m.created_at, m.read,
      u1.username as from_name, u2.username as to_name
    FROM chat_messages m
    JOIN users u1 ON m.from_id = u1.id
    JOIN users u2 ON m.to_id = u2.id
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(limit);
  
  res.json({ messages });
});

// Recent mailbox
router.get('/mailbox', adminAuth, (req: Request, res: Response) => {
  const db = getDb();
  const limit = parseInt(req.query.limit as string) || 50;
  
  const mails = db.prepare(`
    SELECT m.id, m.subject, m.content, m.gift_type, m.read, m.created_at,
      u1.username as from_name, u2.username as to_name
    FROM mailbox m
    JOIN users u1 ON m.from_id = u1.id
    JOIN users u2 ON m.to_id = u2.id
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(limit);
  
  res.json({ mails });
});

// Bottles
router.get('/bottles', adminAuth, (_req: Request, res: Response) => {
  const db = getDb();
  
  const bottles = db.prepare(`
    SELECT b.id, b.content, b.mood, b.created_at, b.found_at, b.reply,
      u1.username as sender_name,
      u2.username as finder_name
    FROM messages_in_bottle b
    JOIN users u1 ON b.sender_id = u1.id
    LEFT JOIN users u2 ON b.found_by = u2.id
    ORDER BY b.created_at DESC
  `).all();
  
  res.json({ bottles });
});

// Server status
router.get('/server', adminAuth, (_req: Request, res: Response) => {
  const db = getDb();
  
  // Database size
  const dbStats = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as any;
  
  // Table row counts
  const tables = ['users', 'islands', 'friends', 'chat_messages', 'mailbox', 'visitor_log', 'messages_in_bottle'];
  const tableCounts: Record<string, number> = {};
  for (const t of tables) {
    tableCounts[t] = (db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get() as any).c;
  }
  
  // Uptime
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  res.json({
    uptime: Math.floor(uptime),
    memory: {
      rss: Math.round(memory.rss / 1024 / 1024),
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024)
    },
    dbSize: Math.round((dbStats?.size || 0) / 1024),
    tableCounts
  });
});

// Online users (last 5 min)
router.get('/online', adminAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
  const users = db.prepare(`
    SELECT id, username, avatar, motto, last_online
    FROM users WHERE last_online > ?
    ORDER BY last_online DESC
  `).all(fiveMinAgo);
  res.json({ users, count: users.length });
});

// User messages
router.get('/users/:id/messages', adminAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const messages = db.prepare(`
    SELECT m.id, m.content, m.created_at, m.read,
      u1.username as from_name, u2.username as to_name
    FROM chat_messages m
    JOIN users u1 ON m.from_id = u1.id
    JOIN users u2 ON m.to_id = u2.id
    WHERE m.from_id = ? OR m.to_id = ?
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(id, id, limit);

  res.json({ messages });
});

// Broadcast announcement
router.post('/announce', adminAuth, (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content required' });
  }

  const db = getDb();
  // Get all users except admin
  const users = db.prepare("SELECT id FROM users WHERE username != 'wander_admin'").all() as any[];
  const admin = db.prepare("SELECT id FROM users WHERE username = 'wander_admin'").get() as any;
  if (!admin) return res.status(500).json({ error: 'Admin user not found' });

  const insert = db.prepare('INSERT INTO mailbox (from_id, to_id, subject, content, created_at) VALUES (?, ?, ?, ?, ?)');
  const now = Math.floor(Date.now() / 1000);
  const insertMany = db.transaction(() => {
    for (const u of users) {
      insert.run(admin.id, u.id, '系统公告', content, now);
    }
  });
  insertMany();

  res.json({ success: true, sent: users.length });
});

export default router;
