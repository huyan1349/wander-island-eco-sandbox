import { Server as SocketServer, Socket } from 'socket.io';
import { verifyToken } from './auth.js';
import getDb from './db.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

// 在线用户映射: userId -> socketId
const onlineUsers = new Map<string, string>();

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
    socket.on('chat:send', (data: { toId: string; content: string }) => {
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

    // ====== 断开连接 ======
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user:offline', { userId, username });
      console.log(`[Socket] ${username} (${userId}) disconnected`);
    });
  });
}
