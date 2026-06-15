import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import getDb from '../db.js';
import { generateToken, authMiddleware, AuthRequest } from '../auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'data', 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: AuthRequest, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${req.userId}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只支持图片文件'));
  }
});

const router = Router();

// —— 新卡邮件补发 ——
// 新增的记忆卡不在注册赠送之列，统一由「辞」发邮件补发给所有玩家（含老用户）。需与前端 MAIL_CARD_URLS 一致。
const CI_USER_ID = '00000000-0000-0000-0000-000000000001';
const NEW_CARD_MAILS = [
  { url: '/Before_the_First_Snow.mp3', title: 'Before the First Snow' },
];
function sendCardMail(db: any, userId: string, card: { url: string; title: string }) {
  const giftType = `music_card:${card.url}`;
  const exists = db.prepare('SELECT id FROM mailbox WHERE to_id = ? AND gift_type = ?').get(userId, giftType);
  if (exists) return;
  db.prepare('INSERT INTO mailbox (id, from_id, to_id, subject, content, gift_type) VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      crypto.randomUUID(), CI_USER_ID, userId,
      '一段新的记忆',
      `云海里又浮现了一座岛——「${card.title}」。这段记忆，「辞」替你存了下来。点击领取，把它收进你的收藏库吧。`,
      giftType
    );
}

// —— 服务器公告邮件 ——
const SERVER_ANNOUNCEMENTS = [
  {
    id: 'announcement_deepseek_multiplayer_v2',
    subject: '辞升级了 · 联机开放',
    content: `亲爱的漫游者：

「辞」有了新的变化——

现在，「辞」接入了 DeepSeek 的能力，对话变得更聪明、更自然了。你可以和「辞」聊更多话题，它会用更丰富的方式回应你。

同时，小岛服务器已正式开放联机功能！你可以访问其他漫游者的岛屿，也可以邀请他们来你的岛上做客。去漂流广场看看，说不定会遇见有趣的灵魂。

期待在海上与你相遇。

—— 辞`,
  },
  {
    id: 'tutorial_guide',
    subject: '漫游者指南 · 操作与秘籍',
    content: `这份指南包含了岛上的所有操作方式，点击展开查看。

快捷键：W/A/S/D 移动 · Tab 切换模式 · Esc 退出选中
更多内容请展开下方各章节 ↓`,
  },
];

function sendAnnouncementMail(db: any, userId: string, announcement: typeof SERVER_ANNOUNCEMENTS[number]) {
  const exists = db.prepare('SELECT id FROM mailbox WHERE to_id = ? AND gift_type = ?').get(userId, announcement.id);
  if (exists) return;
  db.prepare('INSERT INTO mailbox (id, from_id, to_id, subject, content, gift_type) VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      crypto.randomUUID(), CI_USER_ID, userId,
      announcement.subject,
      announcement.content,
      announcement.id
    );
}

function backfillCardMails(db: any, userId: string) {
  try {
    const ci = db.prepare('SELECT id FROM users WHERE id = ?').get(CI_USER_ID);
    if (!ci) return; // 「辞」尚未 seed
    for (const card of NEW_CARD_MAILS) sendCardMail(db, userId, card);
    for (const ann of SERVER_ANNOUNCEMENTS) sendAnnouncementMail(db, userId, ann);
  } catch { /* 补发失败不阻断登录 */ }
}

// 启动时批量发给所有现有用户（除「辞」自己），保证人人都收到新卡邮件和公告
export function sendNewCardMailsToAll(db: any) {
  try {
    const ci = db.prepare('SELECT id FROM users WHERE id = ?').get(CI_USER_ID);
    if (!ci) return;
    const users = db.prepare('SELECT id FROM users WHERE id != ?').all(CI_USER_ID) as { id: string }[];
    let sent = 0;
    for (const u of users) {
      for (const card of NEW_CARD_MAILS) {
        const giftType = `music_card:${card.url}`;
        const exists = db.prepare('SELECT id FROM mailbox WHERE to_id = ? AND gift_type = ?').get(u.id, giftType);
        if (!exists) { sendCardMail(db, u.id, card); sent++; }
      }
      for (const ann of SERVER_ANNOUNCEMENTS) {
        const exists = db.prepare('SELECT id FROM mailbox WHERE to_id = ? AND gift_type = ?').get(u.id, ann.id);
        if (!exists) { sendAnnouncementMail(db, u.id, ann); sent++; }
      }
    }
    if (sent) console.log(`📬 邮件已补发给 ${sent} 位用户（含新卡+公告）`);
  } catch (e) { console.error('批量补发邮件失败', e); }
}

// GET /api/auth/check-username?username=xxx  —— 注册时实时校验用户名是否可用
router.get('/check-username', (req: AuthRequest, res: Response) => {
  const username = String(req.query.username || '').trim();
  if (username.length < 2 || username.length > 20) {
    res.json({ available: false, reason: 'length' });
    return;
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  res.json({ available: !existing });
});

// POST /api/auth/register
router.post('/register', (req: AuthRequest, res: Response) => {
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

  // 自动添加"辞"为好友
  const CI_USER_ID = '00000000-0000-0000-0000-000000000001';
  try {
    const ciExists = db.prepare('SELECT id FROM users WHERE id = ?').get(CI_USER_ID);
    if (ciExists) {
      db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)')
        .run(id, CI_USER_ID, 'accepted');
    }
  } catch { /* 辞可能还没被seed */ }

  // 发送新卡邮件和服务器公告
  backfillCardMails(db, id);

  // 加入序号：当前用户总数（含本人）= 第 N 位漫游者
  let memberNo = 1;
  try {
    const row: any = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
    memberNo = row?.cnt || 1;
  } catch {}

  const token = generateToken(id);

  res.json({
    token,
    memberNo,
    user: { id, username, avatar, motto: null, memberNo }
  });
});

// POST /api/auth/login
router.post('/login', (req: AuthRequest, res: Response) => {
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

  db.prepare('UPDATE users SET last_online = unixepoch() WHERE id = ?').run(user.id);

  // 确保和"辞"是好友
  const CI_USER_ID = '00000000-0000-0000-0000-000000000001';
  try {
    const ciExists = db.prepare('SELECT id FROM users WHERE id = ?').get(CI_USER_ID);
    if (ciExists) {
      const existingFriend: any = db.prepare(`
        SELECT * FROM friends
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `).get(user.id, CI_USER_ID, CI_USER_ID, user.id);
      if (!existingFriend) {
        db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)')
          .run(user.id, CI_USER_ID, 'accepted');
      }
    }
  } catch {}

  backfillCardMails(db, user.id); // 登录时补发新卡邮件

  const token = generateToken(user.id);

  res.json({
    token,
    user: { id: user.id, username: user.username, avatar: user.avatar, motto: user.motto || null, memberNo: user.member_no || null, residentNo: user.resident_no ?? user.member_no }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user: any = db.prepare('SELECT id, username, avatar, motto, created_at, last_online FROM users WHERE id = ?').get(req.userId);

  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }

  backfillCardMails(db, req.userId!); // 凭 token 进入时也补发新卡邮件

  // Ensure friendship with "辞"
  const CI_USER_ID = '00000000-0000-0000-0000-000000000001';
  try {
    const ciExists = db.prepare('SELECT id FROM users WHERE id = ?').get(CI_USER_ID);
    if (ciExists) {
      const existingFriend: any = db.prepare(`
        SELECT * FROM friends
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
      `).get(req.userId, CI_USER_ID, CI_USER_ID, req.userId);
      if (!existingFriend) {
        db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)')
          .run(req.userId, CI_USER_ID, 'accepted');
      }
    }
  } catch {}

  // Get visitor count for user's islands
  let visitorCount = 0;
  try {
    const result = db.prepare(`
      SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_log v
      JOIN islands i ON v.island_id = i.id
      WHERE i.owner_id = ?
    `).get(req.userId) as any;
    visitorCount = result?.cnt || 0;
  } catch { /* visitor_log table may not exist yet */ }
  res.json({ user: { ...user, visitorCount } });
});

// PUT /api/auth/profile - Update profile with multer avatar upload
router.put('/profile', authMiddleware, avatarUpload.single('avatar'), (req: AuthRequest, res: Response) => {
  try {
    const { username, motto } = req.body;
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (username) {
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

    if (motto !== undefined) {
      updates.push('motto = ?');
      values.push(motto);
    }

    if (req.file) {
      const filename = req.file.filename;
      const avatarUrl = `/avatars/${filename}`;
      updates.push('avatar = ?');
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的内容' });
    }

    values.push(req.userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT id, username, avatar, motto FROM users WHERE id = ?').get(req.userId) as any;
    res.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

export default router;
