import { Server as SocketServer, Socket } from 'socket.io';
import { verifyToken } from './auth.js';
import getDb from './db.js';
import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { buildCiSystemPrompt, pickFallback } from './ciLines.js';

const CI_USER_ID = '00000000-0000-0000-0000-000000000001';

// DeepSeek AI client for "辞" —— 懒加载：必须在 dotenv.config() 之后才读 env，
// 否则在 import 阶段读到的 DEEPSEEK_API_KEY 是 undefined（辞就永远不回复）。
let _aiClient: OpenAI | null = null;
let _aiInited = false;
function getAiClient(): OpenAI | null {
  if (_aiInited) return _aiClient;
  _aiInited = true;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  // 只有在确实配置了代理时才用代理（服务器上一般没有，硬编码 7897 会导致请求全失败）
  const proxyUrl = process.env.http_proxy || process.env.HTTP_PROXY || process.env.all_proxy || process.env.ALL_PROXY;
  _aiClient = new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
    // @ts-ignore
    ...(proxyUrl ? { httpAgent: new HttpsProxyAgent(proxyUrl) } : {}),
  });
  return _aiClient;
}


interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

// 在线用户映射: userId -> socketId
const onlineUsers = new Map<string, string>();

// ====== 归隐之岛（多人公共服务器） ======
import fs from 'fs';
import path from 'path';
const HERMIT_ROOM = 'hermit-island';
const HERMIT_CAP = 20;          // 同时在场人数上限
const HERMIT_MAX_ASSETS = 3000; // 共享岛物件总数上限
const HERMIT_FILE = path.join(process.cwd(), 'data', 'hermit-island.json');
let hermitAssets: any[] = [];
try { if (fs.existsSync(HERMIT_FILE)) hermitAssets = JSON.parse(fs.readFileSync(HERMIT_FILE, 'utf-8')) || []; } catch { hermitAssets = []; }
let hermitSaveTimer: NodeJS.Timeout | null = null;
function saveHermit() {
  if (hermitSaveTimer) return;
  hermitSaveTimer = setTimeout(() => {
    hermitSaveTimer = null;
    try { fs.writeFileSync(HERMIT_FILE, JSON.stringify(hermitAssets)); } catch (e) { console.error('hermit save fail', e); }
  }, 1500);
}
// socketId -> {userId, username}（仅归隐之岛在场者）
const hermitMembers = new Map<string, { userId: string; username: string }>();
function hermitPresence() {
  return { count: hermitMembers.size, cap: HERMIT_CAP, members: Array.from(hermitMembers.values()) };
}

export function setupSocket(io: SocketServer) {
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      next(new Error('认证失败'));
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      next(new Error('登录已过期'));
      return;
    }

    const db = getDb();
    const user: any = db.prepare('SELECT id, username FROM users WHERE id = ?').get(payload.userId);
    if (!user) {
      next(new Error('用户不存在'));
      return;
    }

    socket.userId = user.id;
    socket.username = user.username;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const username = socket.username!;

    // 记录在线状态
    onlineUsers.set(userId, socket.id);
    io.emit('user:online', { userId, username });

    // 加入个人房间（用于私聊）
    socket.join(`user:${userId}`);

    // 更新数据库
    const db = getDb();
    db.prepare('UPDATE users SET last_online = unixepoch() WHERE id = ?').run(userId);

    console.log(`[Socket] ${username} (${userId}) connected`);

    // ====== 聊天消息 ======
    socket.on('chat:send', async (data: { toId: string; content: string; ctx?: any }) => {
      if (!data.toId || !data.content?.trim()) return;

      const id = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);

      const message = {
        id,
        from_id: userId,
        to_id: data.toId,
        content: data.content.trim(),
        created_at: now,
        read: 0
      };

      // 保存到数据库
      db.prepare('INSERT INTO chat_messages (id, from_id, to_id, content) VALUES (?, ?, ?, ?)')
        .run(id, userId, data.toId, data.content.trim());

      // 发送给对方
      io.to(`user:${data.toId}`).emit('chat:message', message);
      // 发回给自己（确认）
      socket.emit('chat:message', message);

      // ====== 如果对方是"辞"，自动回复（无论 AI 是否可用，都保证有回复）======
      if (data.toId === CI_USER_ID) {
        let replyContent = '';
        const client = getAiClient();
        if (client) {
          try {
            // 获取最近几条聊天记录作为上下文（保留更长上下文，让辞记得整段对话）
            const recentMessages: any[] = db.prepare(`
              SELECT from_id, content FROM chat_messages
              WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
              ORDER BY created_at DESC LIMIT 24
            `).all(userId, CI_USER_ID, CI_USER_ID, userId);

            const chatHistory: { role: 'user' | 'assistant'; content: string }[] = recentMessages.reverse().map((m: any) => ({
              role: (m.from_id === CI_USER_ID ? 'assistant' : 'user') as 'user' | 'assistant',
              content: String(m.content)
            }));

            const userMessages = chatHistory.filter(m => m.role === 'user').slice(-5);
            const memorySummary = userMessages.map(m => m.content).join('；');

            const ctx = data.ctx || {};
            const weatherCn = ctx.weather === 'sunny' ? '晴天' : ctx.weather === 'rainy' ? '雨天' : ctx.weather === 'snowy' ? '雪天' : ctx.weather === 'cloudy' ? '多云' : ctx.weather === 'foggy' ? '浓雾' : ctx.weather === 'stormy' ? '雷暴' : ctx.weather;
            const totalChats = recentMessages.length;
            const affinityLevel = ctx.affinityLevel || (totalChats > 30 ? 'close' : totalChats > 10 ? 'familiar' : 'stranger');
            const recentEvent = (ctx.assetsCount != null)
              ? `岛上有${ctx.assetsCount}个物件、${ctx.deerCount ?? 0}只鹿、${ctx.wolfCount ?? 0}只狼，草地健康度${Math.floor(ctx.grassHealth ?? 0)}%`
              : '岛友正在和你聊天';

            const systemPrompt = buildCiSystemPrompt({
              islandName: ctx.islandName || undefined,
              weather: weatherCn,
              timeOfDay: ctx.timeOfDay,
              season: ctx.season || undefined,
              affinityLevel,
              memorySummary: memorySummary || undefined,
              recentEvent,
            });

            const response = await client.chat.completions.create({
              model: 'deepseek-chat',
              messages: [{ role: 'system', content: systemPrompt }, ...chatHistory],
              max_tokens: 150
            });
            replyContent = response.choices[0].message.content?.trim() || pickFallback();
          } catch (err) {
            console.error('[辞] AI回复失败，使用本地文案兜底:', err);
            replyContent = pickFallback();
          }
        } else {
          // 没有配置 AI（或 key 缺失）：用本地文案库兜底，保证辞一定有回应
          replyContent = pickFallback();
        }

        const aiMsgId = crypto.randomUUID();
        const aiMessage = {
          id: aiMsgId,
          from_id: CI_USER_ID,
          to_id: userId,
          content: replyContent,
          created_at: Math.floor(Date.now() / 1000),
          read: 0
        };
        db.prepare('INSERT INTO chat_messages (id, from_id, to_id, content) VALUES (?, ?, ?, ?)')
          .run(aiMsgId, CI_USER_ID, userId, replyContent);
        io.to(`user:${userId}`).emit('chat:message', aiMessage);
      }
    });

    // ====== 串门访问 ======
    socket.on('island:visit', (data: { islandId: string }) => {
      const island: any = db.prepare('SELECT i.*, u.username as owner_name FROM islands i JOIN users u ON i.owner_id = u.id WHERE i.id = ?').get(data.islandId);
      if (!island) {
        socket.emit('island:visit_error', { error: '岛屿不存在' });
        return;
      }

      if (!island.is_public && island.owner_id !== userId) {
        socket.emit('island:visit_error', { error: '私有岛屿无法访问' });
        return;
      }

      // 通知岛主有人来访
      io.to(`user:${island.owner_id}`).emit('island:visitor', {
        visitorId: userId,
        visitorName: username,
        islandId: data.islandId,
        islandName: island.name
      });

      // 返回岛屿数据给访问者
      socket.emit('island:visit_data', {
        islandId: island.id,
        islandName: island.name,
        ownerName: island.owner_name,
        data: JSON.parse(island.data || '{}')
      });
    });

    // ====== 好友请求通知 ======
    socket.on('friend:request', (data: { toId: string }) => {
      io.to(`user:${data.toId}`).emit('friend:request_received', {
        fromId: userId,
        fromName: username
      });
    });

    // ====== 好友接受通知 ======
    socket.on('friend:accepted', (data: { toId: string }) => {
      io.to(`user:${data.toId}`).emit('friend:request_accepted', {
        fromId: userId,
        fromName: username
      });
    });

    // ====== 在线状态查询 ======
    socket.on('presence:check', (data: { userIds: string[] }) => {
      const statuses: Record<string, boolean> = {};
      for (const uid of data.userIds) {
        statuses[uid] = onlineUsers.has(uid);
      }
      socket.emit('presence:status', statuses);
    });

    // ====== 归隐之岛：进入 ======
    socket.on('hermit:join', () => {
      if (!hermitMembers.has(socket.id) && hermitMembers.size >= HERMIT_CAP) {
        socket.emit('hermit:full', { cap: HERMIT_CAP });
        return;
      }
      socket.join(HERMIT_ROOM);
      hermitMembers.set(socket.id, { userId, username });
      socket.emit('hermit:state', { assets: hermitAssets });          // 当前岛全貌
      io.to(HERMIT_ROOM).emit('hermit:presence', hermitPresence());   // 广播在场
      io.to(HERMIT_ROOM).emit('hermit:chat', { id: crypto.randomUUID(), system: true, text: `${username} 登上了归隐之岛` });
    });

    // ====== 归隐之岛：离开 ======
    socket.on('hermit:leave', () => {
      if (hermitMembers.delete(socket.id)) {
        socket.leave(HERMIT_ROOM);
        io.to(HERMIT_ROOM).emit('hermit:presence', hermitPresence());
      }
    });

    // ====== 归隐之岛：放置 ======
    socket.on('hermit:place', (asset: any) => {
      if (!hermitMembers.has(socket.id) || !asset?.type) return;
      if (hermitAssets.length >= HERMIT_MAX_ASSETS) return;
      const a = { ...asset, id: crypto.randomUUID(), by: username };
      hermitAssets.push(a);
      saveHermit();
      socket.to(HERMIT_ROOM).emit('hermit:placed', a); // 广播给其他人（放置者本地已有）
    });

    // ====== 归隐之岛：擦除（按范围） ======
    socket.on('hermit:remove', (data: { x: number; z: number; radius: number }) => {
      if (!hermitMembers.has(socket.id) || !data) return;
      const before = hermitAssets.length;
      hermitAssets = hermitAssets.filter(a => {
        const dx = a.position.x - data.x, dz = a.position.z - data.z;
        return Math.sqrt(dx * dx + dz * dz) > data.radius;
      });
      if (hermitAssets.length !== before) {
        saveHermit();
        socket.to(HERMIT_ROOM).emit('hermit:remove', data);
      }
    });

    // ====== 归隐之岛：聊天 ======
    socket.on('hermit:chat', (data: { text: string }) => {
      if (!hermitMembers.has(socket.id) || !data?.text?.trim()) return;
      io.to(HERMIT_ROOM).emit('hermit:chat', {
        id: crypto.randomUUID(), from: username, fromId: userId, text: data.text.trim().slice(0, 200),
      });
    });

    // ====== 断开连接 ======
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      if (hermitMembers.delete(socket.id)) {
        io.to(HERMIT_ROOM).emit('hermit:presence', hermitPresence());
        io.to(HERMIT_ROOM).emit('hermit:chat', { id: crypto.randomUUID(), system: true, text: `${username} 离开了归隐之岛` });
      }
      io.emit('user:offline', { userId, username });
      console.log(`[Socket] ${username} (${userId}) disconnected`);
    });
  });
}
