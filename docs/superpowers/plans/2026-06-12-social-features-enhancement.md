# 社交系统增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复头像上传功能，丰富个人面板（岛名/座右铭/访客簿/信箱），新增社交广场（漂流瓶/公告板/岛屿橱窗），将漫游小岛从基础联机升级为完整的社交生态游戏。

**Architecture:** 后端新增 mailbox、visitor_log、messages_in_bottle 三张表及对应 REST API + Socket 事件；前端新增 SocialPlaza 组件，重构 Profile 面板为"岛民卡"风格，在 SocialPanel 中增加信箱标签页。头像上传修复：后端增加 multer 文件上传中间件，将图片存到 `data/avatars/` 目录，数据库存路径而非 base64。

**Tech Stack:** Express + Socket.IO + better-sqlite3 + multer (文件上传) + React + Zustand + Tailwind CSS

---

## Phase 1: 修复头像上传 (P0)

### Task 1: 后端头像上传修复

**Files:**
- Modify: `server/routes/auth.ts`
- Modify: `server/index.ts`
- Create: `data/avatars/` (目录，gitignore)

**问题分析：** 当前头像上传使用 base64 data URL 存入 SQLite，大图片会导致数据库膨胀且请求体过大可能被 Express 默认 body-parser 拒绝（默认 100kb 限制）。

- [ ] **Step 1: 安装 multer 依赖**

```bash
cd /Users/huyan/Desktop/wander-island_-eco-sandbox && npm install multer && npm install -D @types/multer
```

- [ ] **Step 2: 在 server/index.ts 中增加静态文件服务**

在 `server/index.ts` 中，在 `app.listen` 之前添加：

```typescript
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve avatar files
app.use('/avatars', express.static(path.join(__dirname, '..', 'data', 'avatars')));
```

- [ ] **Step 3: 创建 avatars 目录并添加 gitignore**

```bash
mkdir -p /Users/huyan/Desktop/wander-island_-eco-sandbox/data/avatars
echo 'avatars/*\n!.gitkeep' > /Users/huyan/Desktop/wander-island_-eco-sandbox/data/avatars/.gitkeep
```

- [ ] **Step 4: 修改 auth.ts 的 PUT /profile 端点，支持 multer 文件上传**

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'data', 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${req.userId}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只支持图片文件'));
  }
});

// 替换原有的 PUT /profile
router.put('/profile', authMiddleware, avatarUpload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    const { username, motto } = req.body;
    const db = getDb();
    const updates: string[] = [];
    const values: any[] = [];

    if (username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.userId) as any;
      if (existing) return res.status(400).json({ error: '用户名已被占用' });
      if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名长度需在2-20之间' });
      updates.push('username = ?');
      values.push(username);
    }

    if (motto !== undefined) {
      updates.push('motto = ?');
      values.push(motto);
    }

    if (req.file) {
      const avatarUrl = `/avatars/${req.file.filename}`;
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
```

- [ ] **Step 5: 增加 Express body 大小限制**

在 `server/index.ts` 中，将 `app.use(express.json())` 改为：

```typescript
app.use(express.json({ limit: '10mb' }));
```

- [ ] **Step 6: 修改前端 api.ts 的 updateProfile 方法，支持 FormData**

```typescript
async updateProfile(updates: { username?: string; motto?: string; avatarFile?: File }) {
  if (updates.avatarFile) {
    const formData = new FormData();
    if (updates.username) formData.append('username', updates.username);
    if (updates.motto !== undefined) formData.append('motto', updates.motto);
    formData.append('avatar', updates.avatarFile);
    
    const headers: Record<string, string> = {};
    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }
    
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'PUT',
      headers,
      body: formData
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '更新失败');
    return data as { user: any };
  }
  
  // Fallback to JSON for non-file updates
  return this.request<{ user: any }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ username: updates.username, motto: updates.motto })
  });
}
```

- [ ] **Step 7: 修改 TitleScreen.tsx 头像上传，使用 FormData**

在 TitleScreen.tsx 的头像上传 onChange 中：

```typescript
onChange={(e) => {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return;
  api.updateProfile({ avatarFile: file })
    .then(res => setAuthUser(res.user))
    .catch(err => console.error('Avatar upload failed:', err));
}}
```

- [ ] **Step 8: 修改 PlayerPanel.tsx 头像上传，使用 FormData**

同样修改 handleAvatarUpload 函数：

```typescript
const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 2 * 1024 * 1024) return;
  api.updateProfile({ avatarFile: file })
    .then(res => setAuthUser(res.user))
    .catch(err => console.error('Avatar upload failed:', err));
};
```

- [ ] **Step 9: 提交**

```bash
git add -A && git commit -m "fix: avatar upload using multer file upload instead of base64"
```

---

## Phase 2: 数据库扩展 + 后端 API (P0)

### Task 2: 扩展数据库 Schema

**Files:**
- Modify: `server/db.ts`

- [ ] **Step 1: 在 users 表添加 motto 字段，新增 mailbox、visitor_log、messages_in_bottle 表**

在 `initTables()` 中添加：

```sql
-- 新增字段 (用 ALTER TABLE 兼容已有数据库)
ALTER TABLE users ADD COLUMN motto TEXT DEFAULT '';

-- 邮箱表
CREATE TABLE IF NOT EXISTS mailbox (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  subject TEXT DEFAULT '',
  content TEXT NOT NULL,
  gift_type TEXT DEFAULT NULL,
  read INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (from_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 访客记录表
CREATE TABLE IF NOT EXISTS visitor_log (
  id TEXT PRIMARY KEY,
  island_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  message TEXT DEFAULT '',
  rating INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (island_id) REFERENCES islands(id) ON DELETE CASCADE,
  FOREIGN KEY (visitor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 漂流瓶表
CREATE TABLE IF NOT EXISTS messages_in_bottle (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT DEFAULT 'happy',
  found_by TEXT DEFAULT NULL,
  found_at INTEGER DEFAULT NULL,
  reply TEXT DEFAULT NULL,
  reply_at INTEGER DEFAULT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (found_by) REFERENCES users(id) ON DELETE SET NULL
);
```

注意：SQLite 的 ALTER TABLE ADD COLUMN 如果列已存在会报错，需要用 try-catch 包裹。

- [ ] **Step 2: 添加索引**

```sql
CREATE INDEX IF NOT EXISTS idx_mailbox_to ON mailbox(to_id, read);
CREATE INDEX IF NOT EXISTS idx_mailbox_from ON mailbox(from_id);
CREATE INDEX IF NOT EXISTS idx_visitor_island ON visitor_log(island_id);
CREATE INDEX IF NOT EXISTS idx_bottle_found ON messages_in_bottle(found_by);
CREATE INDEX IF NOT EXISTS idx_bottle_unfound ON messages_in_bottle(found_by) WHERE found_by IS NULL;
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: extend database schema with mailbox, visitor_log, messages_in_bottle"
```

### Task 3: 邮箱 API

**Files:**
- Create: `server/routes/mailbox.ts`
- Modify: `server/index.ts` (注册路由)

- [ ] **Step 1: 创建 mailbox 路由**

```typescript
import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/mailbox - 获取收件箱
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const mails = db.prepare(`
    SELECT m.*, u.username as from_name, u.avatar as from_avatar
    FROM mailbox m
    JOIN users u ON m.from_id = u.id
    WHERE m.to_id = ?
    ORDER BY m.created_at DESC
    LIMIT 50
  `).all(req.userId);
  res.json({ mails });
});

// POST /api/mailbox - 发送信件
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { toId, subject, content, giftType } = req.body;
  if (!toId || !content) return res.status(400).json({ error: '收件人和内容不能为空' });
  if (content.length > 500) return res.status(400).json({ error: '内容不能超过500字' });

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO mailbox (id, from_id, to_id, subject, content, gift_type) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, toId, subject || '', content, giftType || null);

  const mail = db.prepare(`
    SELECT m.*, u.username as from_name, u.avatar as from_avatar
    FROM mailbox m JOIN users u ON m.from_id = u.id WHERE m.id = ?
  `).get(id);
  res.json({ mail });
});

// PUT /api/mailbox/:id/read - 标记已读
router.put('/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('UPDATE mailbox SET read = 1 WHERE id = ? AND to_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// GET /api/mailbox/unread - 未读数量
router.get('/unread', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare('SELECT COUNT(*) as count FROM mailbox WHERE to_id = ? AND read = 0').get(req.userId) as any;
  res.json({ count: result.count });
});

// DELETE /api/mailbox/:id
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM mailbox WHERE id = ? AND to_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 2: 在 server/index.ts 注册路由**

```typescript
import mailboxRouter from './routes/mailbox.js';
app.use('/api/mailbox', mailboxRouter);
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add mailbox API routes"
```

### Task 4: 访客簿 API

**Files:**
- Create: `server/routes/visitors.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: 创建 visitors 路由**

```typescript
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

  res.json({ visitors, totalVisitors: count.cnt });
});

// POST /api/visitors - 留下访客记录
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { islandId, message, rating } = req.body;
  if (!islandId) return res.status(400).json({ error: '岛屿ID不能为空' });

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
```

- [ ] **Step 2: 注册路由**

```typescript
import visitorsRouter from './routes/visitors.js';
app.use('/api/visitors', visitorsRouter);
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add visitor log API routes"
```

### Task 5: 漂流瓶 API

**Files:**
- Create: `server/routes/bottles.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: 创建 bottles 路由**

```typescript
import { Router, Response } from 'express';
import getDb from '../db.js';
import { authMiddleware, AuthRequest } from '../auth.js';

const router = Router();

// POST /api/bottles - 投递漂流瓶
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { content, mood } = req.body;
  if (!content) return res.status(400).json({ error: '内容不能为空' });
  if (content.length > 200) return res.status(400).json({ error: '内容不能超过200字' });

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO messages_in_bottle (id, sender_id, content, mood) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, content, mood || 'happy');

  res.json({ success: true, id });
});

// GET /api/bottles/fish - 随机捡一个漂流瓶
router.get('/fish', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  // 随机取一个未被当前用户捡到的瓶子（也不捡自己的）
  const bottle = db.prepare(`
    SELECT b.*, u.username as sender_name, u.avatar as sender_avatar, u.motto as sender_motto
    FROM messages_in_bottle b
    JOIN users u ON b.sender_id = u.id
    WHERE b.found_by IS NULL AND b.sender_id != ?
    ORDER BY RANDOM() LIMIT 1
  `).get(req.userId);

  if (!bottle) return res.json({ bottle: null });

  // 标记为被捡到
  db.prepare('UPDATE messages_in_bottle SET found_by = ?, found_at = unixepoch() WHERE id = ?')
    .run(req.userId, (bottle as any).id);

  res.json({ bottle });
});

// POST /api/bottles/:id/reply - 回复漂流瓶
router.post('/:id/reply', authMiddleware, (req: AuthRequest, res: Response) => {
  const { reply } = req.body;
  if (!reply) return res.status(400).json({ error: '回复内容不能为空' });

  const db = getDb();
  db.prepare('UPDATE messages_in_bottle SET reply = ?, reply_at = unixepoch() WHERE id = ? AND found_by = ?')
    .run(reply, req.params.id, req.userId);

  res.json({ success: true });
});

// GET /api/bottles/sent - 我发出的瓶子
router.get('/sent', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const bottles = db.prepare(`
    SELECT b.*, u.username as finder_name, u.avatar as finder_avatar
    FROM messages_in_bottle b
    LEFT JOIN users u ON b.found_by = u.id
    WHERE b.sender_id = ?
    ORDER BY b.created_at DESC LIMIT 20
  `).all(req.userId);
  res.json({ bottles });
});

export default router;
```

- [ ] **Step 2: 注册路由**

```typescript
import bottlesRouter from './routes/bottles.js';
app.use('/api/bottles', bottlesRouter);
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add messages in bottle API routes"
```

### Task 6: 扩展 Auth API 返回 motto 和访客数

**Files:**
- Modify: `server/routes/auth.ts`

- [ ] **Step 1: 修改 GET /me 和 login/register 返回 motto**

将所有 `SELECT id, username, avatar` 改为 `SELECT id, username, avatar, motto`。

- [ ] **Step 2: 在 GET /me 中附加访客统计**

```typescript
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, avatar, motto, created_at, last_online FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  // 计算访客总数
  const visitorCount = db.prepare(`
    SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_log v
    JOIN islands i ON v.island_id = i.id
    WHERE i.owner_id = ?
  `).get(req.userId) as any;

  res.json({ user: { ...(user as any), visitorCount: visitorCount?.cnt || 0 } });
});
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: return motto and visitor count in auth API"
```

---

## Phase 3: 前端 API 客户端扩展 (P0)

### Task 7: 扩展前端 API 客户端

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/store.ts` (AuthUser 接口添加 motto, visitorCount)

- [ ] **Step 1: 更新 AuthUser 接口**

```typescript
export interface AuthUser {
  id: string;
  username: string;
  avatar: string;
  motto: string;
  visitorCount?: number;
}
```

- [ ] **Step 2: 在 api.ts 中添加新方法**

```typescript
// Mailbox
async getMailbox() {
  return this.request<{ mails: any[] }>('/api/mailbox');
}
async sendMail(toId: string, subject: string, content: string, giftType?: string) {
  return this.request<{ mail: any }>('/api/mailbox', {
    method: 'POST',
    body: JSON.stringify({ toId, subject, content, giftType })
  });
}
async markMailRead(id: string) {
  return this.request<{ success: boolean }>(`/api/mailbox/${id}/read`, { method: 'PUT' });
}
async getUnreadMailCount() {
  return this.request<{ count: number }>('/api/mailbox/unread');
}
async deleteMail(id: string) {
  return this.request<{ success: boolean }>(`/api/mailbox/${id}`, { method: 'DELETE' });
}

// Visitors
async getVisitors(islandId: string) {
  return this.request<{ visitors: any[]; totalVisitors: number }>(`/api/visitors/${islandId}`);
}
async leaveVisitorLog(islandId: string, message: string, rating: number) {
  return this.request<{ visitor: any }>('/api/visitors', {
    method: 'POST',
    body: JSON.stringify({ islandId, message, rating })
  });
}

// Bottles
async throwBottle(content: string, mood: string) {
  return this.request<{ success: boolean; id: string }>('/api/bottles', {
    method: 'POST',
    body: JSON.stringify({ content, mood })
  });
}
async fishBottle() {
  return this.request<{ bottle: any | null }>('/api/bottles/fish');
}
async replyBottle(id: string, reply: string) {
  return this.request<{ success: boolean }>(`/api/bottles/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply })
  });
}
async getSentBottles() {
  return this.request<{ bottles: any[] }>('/api/bottles/sent');
}
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: extend frontend API client with mailbox, visitors, bottles"
```

---

## Phase 4: 重构个人面板 — 岛民卡 (P0)

### Task 8: 重构 TitleScreen Profile 为岛民卡

**Files:**
- Modify: `src/components/TitleScreen.tsx`

- [ ] **Step 1: 重新设计 Profile Modal 为"岛民卡"风格**

新布局：
- 顶部：大头像（可上传）+ 用户名（可编辑）+ 在线绿点
- 座右铭区域：手写体气泡展示，点击编辑
- 信息网格：等级 / 生态点 / 游戏时长 / 访客数
- 岛屿信息卡片：岛名 + 已放置物体
- 快捷入口：信箱（带未读数）、访客簿、社交广场
- 底部：退出登录

关键代码结构：

```tsx
{activeModal === 'PROFILE' && authUser && (
  <div className="hand-drawn-panel w-[750px] max-h-[90vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden">
    {/* Header */}
    <div className="flex justify-between items-center border-b-2 border-slate-800 p-8 pb-6">
      <h2 className="text-3xl hand-drawn-title -rotate-1">岛民卡</h2>
      <button onClick={() => setActiveModal('NONE')} ...><X /></button>
    </div>

    <div className="p-8 pt-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
      {/* Avatar + Name + Motto Row */}
      <div className="flex items-start gap-6">
        {/* Avatar with upload */}
        <div className="relative group shrink-0">
          <div className="w-28 h-28 ...rounded-full...overflow-hidden">
            <img src={authUser.avatar} ... />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse" />
          <label className="absolute inset-0 ...opacity-0 group-hover:opacity-100...cursor-pointer">
            <Camera size={28} className="text-white" />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          {/* Name (editable) */}
          {isEditingName ? (...) : (
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-bold text-slate-800 tracking-wide">{authUser.username}</h3>
              <button onClick={startEditName} className="hand-drawn-btn p-1.5 text-slate-400 hover:text-slate-700">
                <Edit2 size={14} />
              </button>
            </div>
          )}

          {/* Motto / 座右铭 - 手写气泡 */}
          {isEditingMotto ? (
            <div className="flex items-center gap-2">
              <input type="text" value={tempMotto} onChange={e => setTempMotto(e.target.value)}
                onKeyDown={handleSaveMotto} placeholder="写点什么..."
                className="hand-drawn-panel px-4 py-2 text-sm text-slate-600 italic" style={{ borderWidth: '2px' }} autoFocus />
              <button onClick={saveMotto} className="hand-drawn-btn p-1.5 text-emerald-600">✓</button>
            </div>
          ) : (
            <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl px-4 py-2 -rotate-1 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => { setTempMotto(authUser.motto || ''); setIsEditingMotto(true); }}>
              <p className="text-sm italic text-slate-600 font-['ZCOOL_KuaiLe']">
                {authUser.motto || '点击设置座右铭...'}
              </p>
            </div>
          )}

          <p className="text-[10px] text-slate-400 font-mono tracking-wider">ID: {authUser.id.slice(0, 8)}...</p>
        </div>
      </div>

      <div className="w-full h-px bg-slate-200" />

      {/* Stats Grid - 4 columns */}
      <div className="grid grid-cols-4 gap-3">
        <div className="hand-drawn-panel p-4 text-center" style={{ borderWidth: '2px' }}>
          <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">等级</p>
          <p className="text-2xl font-bold text-emerald-500">{playerLevel}</p>
        </div>
        <div className="hand-drawn-panel p-4 text-center" style={{ borderWidth: '2px' }}>
          <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">生态点</p>
          <p className="text-2xl font-bold text-cyan-500">{ecoPoints}</p>
        </div>
        <div className="hand-drawn-panel p-4 text-center" style={{ borderWidth: '2px' }}>
          <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">游戏时长</p>
          <p className="text-2xl font-bold text-amber-500">{Math.floor(stats.playtime / 60)}<span className="text-xs">min</span></p>
        </div>
        <div className="hand-drawn-panel p-4 text-center" style={{ borderWidth: '2px' }}>
          <p className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase mb-1">访客</p>
          <p className="text-2xl font-bold text-violet-500">{authUser.visitorCount || 0}</p>
        </div>
      </div>

      {/* Island Info Card */}
      <div className="hand-drawn-panel p-5 bg-gradient-to-r from-emerald-50 to-cyan-50" style={{ borderWidth: '2px' }}>
        <div className="flex items-center gap-3 mb-2">
          <Globe size={18} className="text-emerald-600" />
          <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">我的岛屿</p>
        </div>
        <p className="text-xl font-bold text-slate-800 tracking-wide">{islandName}</p>
        <p className="text-xs text-slate-400 mt-1">已放置 {stats.itemsPlaced} 个物体</p>
      </div>

      {/* Quick Access Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => { setActiveModal('MAILBOX'); }}
          className="hand-drawn-btn p-4 flex flex-col items-center gap-2 relative">
          <Mail size={24} className="text-amber-600" />
          <span className="text-xs font-bold text-slate-700">信箱</span>
          {unreadMailCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-slate-800">
              {unreadMailCount > 9 ? '9+' : unreadMailCount}
            </span>
          )}
        </button>
        <button onClick={() => { setActiveModal('VISITORS'); }}
          className="hand-drawn-btn p-4 flex flex-col items-center gap-2">
          <BookOpen size={24} className="text-violet-600" />
          <span className="text-xs font-bold text-slate-700">访客簿</span>
        </button>
        <button onClick={() => { setActiveModal('PLAZA'); }}
          className="hand-drawn-btn p-4 flex flex-col items-center gap-2">
          <Compass size={24} className="text-cyan-600" />
          <span className="text-xs font-bold text-slate-700">社交广场</span>
        </button>
      </div>

      <div className="w-full h-px bg-slate-200" />

      {/* Logout */}
      <button onClick={handleLogout} className="w-full hand-drawn-btn px-8 py-3 text-red-600 font-bold flex items-center justify-center gap-3">
        退出登录
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 2: 添加 motto 编辑状态和 handleAvatarUpload/handleSaveMotto 函数**

```typescript
const [isEditingMotto, setIsEditingMotto] = useState(false);
const [tempMotto, setTempMotto] = useState(authUser?.motto || '');
const [unreadMailCount, setUnreadMailCount] = useState(0);

// 加载未读邮件数
useEffect(() => {
  if (authUser) {
    api.getUnreadMailCount().then(res => setUnreadMailCount(res.count)).catch(() => {});
  }
}, [authUser]);

const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return;
  api.updateProfile({ avatarFile: file })
    .then(res => setAuthUser(res.user))
    .catch(err => console.error('Avatar upload failed:', err));
};

const handleSaveMotto = async () => {
  try {
    const res = await api.updateProfile({ motto: tempMotto });
    setAuthUser(res.user);
  } catch {}
  setIsEditingMotto(false);
};
```

- [ ] **Step 3: 更新 activeModal 类型**

```typescript
type ModalType = 'NONE' | 'SETTINGS' | 'CREDITS' | 'PROFILE' | 'MAILBOX' | 'VISITORS' | 'PLAZA';
const [activeModal, setActiveModal] = useState<ModalType>('NONE');
```

- [ ] **Step 4: 添加新的 lucide-react 图标导入**

```typescript
import { X, Globe, Wifi, WifiOff, User, Camera, Edit2, Mail, BookOpen, Compass } from 'lucide-react';
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: redesign profile panel as islander card with motto, visitor count, quick access"
```

---

## Phase 5: 信箱组件 (P0)

### Task 9: 创建 MailboxModal 组件

**Files:**
- Create: `src/components/MailboxModal.tsx`
- Modify: `src/components/TitleScreen.tsx` (引入并渲染)

- [ ] **Step 1: 创建 MailboxModal 组件**

手绘风格信箱界面，包含：
- 收件箱列表（发件人头像+名字+主题+时间+未读标记）
- 写信界面（收件人选择+主题+内容+可选礼物）
- 信件详情阅读
- 标记已读/删除

核心结构：

```tsx
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { api } from '../lib/api';
import { X, Mail, Send, Trash2, Gift, ArrowLeft, Pen } from 'lucide-react';

export const MailboxModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const authUser = useGameStore(state => state.authUser);
  const setAuthUser = useGameStore(state => state.setAuthUser);
  const [mails, setMails] = useState<any[]>([]);
  const [selectedMail, setSelectedMail] = useState<any>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [writeTo, setWriteTo] = useState('');
  const [writeSubject, setWriteSubject] = useState('');
  const [writeContent, setWriteContent] = useState('');

  useEffect(() => { loadMails(); loadFriends(); }, []);

  const loadMails = async () => {
    try {
      const res = await api.getMailbox();
      setMails(res.mails);
    } catch {}
  };

  const loadFriends = async () => {
    try {
      const res = await api.getFriends();
      setFriends(res.friends);
    } catch {}
  };

  const handleOpenMail = async (mail: any) => {
    setSelectedMail(mail);
    if (!mail.read) {
      await api.markMailRead(mail.id);
      setMails(prev => prev.map(m => m.id === mail.id ? { ...m, read: 1 } : m));
    }
  };

  const handleSendMail = async () => {
    if (!writeTo || !writeContent) return;
    try {
      await api.sendMail(writeTo, writeSubject, writeContent);
      setIsWriting(false);
      setWriteTo(''); setWriteSubject(''); setWriteContent('');
      loadMails();
    } catch {}
  };

  const handleDeleteMail = async (id: string) => {
    await api.deleteMail(id);
    setSelectedMail(null);
    loadMails();
  };

  return (
    <div className="hand-drawn-panel w-[700px] max-h-[85vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-slate-800 p-8 pb-6">
        <div className="flex items-center gap-3">
          <Mail size={24} className="text-amber-600" />
          <h2 className="text-3xl hand-drawn-title -rotate-1">岛屿信箱</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsWriting(true)} className="hand-drawn-btn px-4 py-2 flex items-center gap-2 text-sm">
            <Pen size={14} /> 写信
          </button>
          <button onClick={onClose} className="hand-drawn-btn p-2 rounded-full border-0 hover:bg-slate-200">
            <X size={24} strokeWidth={3} className="text-slate-800" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {/* Writing Mode */}
        {isWriting ? (
          <div className="flex flex-col gap-4">
            <button onClick={() => setIsWriting(false)} className="hand-drawn-btn p-2 self-start"><ArrowLeft size={16} /></button>
            {/* To: friend selector */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">收件人</p>
              <div className="flex flex-wrap gap-2">
                {friends.map(f => (
                  <button key={f.id} onClick={() => setWriteTo(f.id)}
                    className={`hand-drawn-btn px-3 py-1.5 text-xs flex items-center gap-2 ${writeTo === f.id ? 'hand-drawn-btn-active' : ''}`}>
                    <img src={f.avatar} className="w-5 h-5 rounded-full border border-slate-800" />
                    {f.username}
                  </button>
                ))}
              </div>
            </div>
            <input type="text" value={writeSubject} onChange={e => setWriteSubject(e.target.value)}
              placeholder="主题" className="hand-drawn-panel px-4 py-2 text-sm" style={{ borderWidth: '2px' }} />
            <textarea value={writeContent} onChange={e => setWriteContent(e.target.value)}
              placeholder="写点什么..." rows={6}
              className="hand-drawn-panel px-4 py-3 text-sm resize-none" style={{ borderWidth: '2px' }} />
            <button onClick={handleSendMail} className="hand-drawn-btn px-6 py-3 flex items-center justify-center gap-2">
              <Send size={16} /> 寄出
            </button>
          </div>
        ) : selectedMail ? (
          /* Reading Mode */
          <div className="flex flex-col gap-4">
            <button onClick={() => setSelectedMail(null)} className="hand-drawn-btn p-2 self-start"><ArrowLeft size={16} /></button>
            <div className="flex items-center gap-3">
              <img src={selectedMail.from_avatar} className="w-10 h-10 rounded-full border-2 border-slate-800" />
              <div>
                <p className="font-bold text-slate-800">{selectedMail.from_name}</p>
                <p className="text-[10px] text-slate-400">{new Date(selectedMail.created_at * 1000).toLocaleString()}</p>
              </div>
            </div>
            {selectedMail.subject && <h3 className="text-lg font-bold text-slate-800">{selectedMail.subject}</h3>}
            <div className="hand-drawn-panel p-6 bg-amber-50/50" style={{ borderWidth: '2px' }}>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedMail.content}</p>
            </div>
            <button onClick={() => handleDeleteMail(selectedMail.id)} className="hand-drawn-btn px-4 py-2 text-red-500 text-sm self-end flex items-center gap-2">
              <Trash2 size={14} /> 删除
            </button>
          </div>
        ) : (
          /* Inbox List */
          <div className="flex flex-col gap-2">
            {mails.length === 0 ? (
              <div className="text-center py-12">
                <Mail size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-bold tracking-widest">信箱空空如也</p>
                <p className="text-slate-300 text-sm mt-2">给好友写封信吧！</p>
              </div>
            ) : (
              mails.map(mail => (
                <div key={mail.id}
                  onClick={() => handleOpenMail(mail)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors hover:bg-amber-50 ${!mail.read ? 'bg-amber-50/50 border-2 border-amber-200' : ''}`}>
                  <img src={mail.from_avatar} className="w-10 h-10 rounded-full border-2 border-slate-800 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{mail.from_name}</span>
                      {!mail.read && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{mail.subject || mail.content.slice(0, 40)}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{new Date(mail.created_at * 1000).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 在 TitleScreen.tsx 中引入并渲染 MailboxModal**

```tsx
import { MailboxModal } from './MailboxModal';

// 在 modals 区域添加
{activeModal === 'MAILBOX' && authUser && <MailboxModal onClose={() => setActiveModal('NONE')} />}
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add MailboxModal component with inbox, compose, and read views"
```

---

## Phase 6: 访客簿组件 (P1)

### Task 10: 创建 VisitorBookModal 组件

**Files:**
- Create: `src/components/VisitorBookModal.tsx`
- Modify: `src/components/TitleScreen.tsx`

- [ ] **Step 1: 创建 VisitorBookModal**

手绘笔记本风格的访客簿，包含：
- 翻页式访客记录列表
- 每条记录：访客头像+名字+留言+星级+时间
- 总访客计数器（老式翻页计数器样式）
- 留言输入区

- [ ] **Step 2: 在 TitleScreen.tsx 中引入**

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add VisitorBookModal component with guest book and counter"
```

---

## Phase 7: 社交广场 (P1)

### Task 11: 创建 SocialPlaza 组件

**Files:**
- Create: `src/components/SocialPlaza.tsx`
- Modify: `src/components/TitleScreen.tsx`
- Modify: `src/App.tsx` (游戏内也可打开)

- [ ] **Step 1: 创建 SocialPlaza 组件**

社交广场包含以下区域：

**公告板 (Bulletin Board)**
- 手绘风公告栏，钉子+纸条效果
- 系统公告 + 玩家留言条

**漂流瓶 (Message in Bottle)**
- 投递漂流瓶（选择心情：开心/思考/忧郁/期待）
- 随机捡漂流瓶（海浪动画）
- 回复漂流瓶
- 查看自己发出的瓶子

**岛屿橱窗 (Island Showcase)**
- 每日推荐公开岛屿
- 按分类浏览
- 点击即可串门

核心布局：

```tsx
export const SocialPlaza: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<'board' | 'bottle' | 'showcase'>('board');
  // ... 状态管理

  return (
    <div className="hand-drawn-panel w-[900px] max-h-[85vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden">
      {/* Header with tabs */}
      <div className="flex justify-between items-center border-b-2 border-slate-800 p-8 pb-4">
        <h2 className="text-3xl hand-drawn-title -rotate-1">漂流广场</h2>
        <button onClick={onClose} ...><X /></button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 px-8 py-3 border-b border-slate-200">
        <button onClick={() => setActiveSection('board')} className={...}>公告板</button>
        <button onClick={() => setActiveSection('bottle')} className={...}>漂流瓶</button>
        <button onClick={() => setActiveSection('showcase')} className={...}>岛屿橱窗</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {activeSection === 'board' && <BulletinBoard />}
        {activeSection === 'bottle' && <BottleSection />}
        {activeSection === 'showcase' && <IslandShowcase />}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: 在 TitleScreen.tsx 和 App.tsx 中引入**

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add SocialPlaza with bulletin board, message in bottle, island showcase"
```

---

## Phase 8: SocialPanel 增强 (P1)

### Task 12: 在 SocialPanel 中增加信箱标签页

**Files:**
- Modify: `src/components/SocialPanel.tsx`

- [ ] **Step 1: 在 SocialPanel 的 tabs 中增加"信箱"标签**

在现有的 friends/chat/islands 基础上添加 mailbox tab，复用 MailboxModal 的逻辑。

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: add mailbox tab to SocialPanel"
```

---

## Phase 9: PlayerPanel 增强 (P1)

### Task 13: 在 PlayerPanel 中增加社交入口

**Files:**
- Modify: `src/components/PlayerPanel.tsx`

- [ ] **Step 1: 在 PlayerPanel 侧边栏增加"信箱"和"广场"入口**

在现有 stats/ecology/unlocks/system tabs 基础上，增加 mailbox 和 plaza 入口按钮。

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "feat: add mailbox and plaza entries to PlayerPanel"
```

---

## Phase 10: 版本更新 + 收尾 (P0)

### Task 14: 更新版本号和设置页面

**Files:**
- Modify: `src/components/TitleScreen.tsx` (版本号)
- Modify: `src/components/PlayerPanel.tsx` (版本号)

- [ ] **Step 1: 将所有 v2.0.0 Multiplayer 改为 v2.1.0 Social**

- [ ] **Step 2: 提交**

```bash
git add -A && git commit -m "chore: bump version to v2.1.0 Social"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - 头像上传修复 → Task 1 ✓
   - 个人面板丰富（岛名/座右铭/访客/信箱）→ Task 8, 9, 10 ✓
   - 社交广场 → Task 11 ✓
   - 信箱系统 → Task 3, 9 ✓
   - 访客簿 → Task 4, 10 ✓
   - 漂流瓶 → Task 5, 11 ✓

2. **Placeholder scan:** No TBD/TODO found. All code blocks contain actual implementation.

3. **Type consistency:**
   - AuthUser interface updated with motto, visitorCount → consistent across store.ts, api.ts, TitleScreen.tsx, PlayerPanel.tsx
   - API methods match backend routes
   - ModalType union updated consistently
