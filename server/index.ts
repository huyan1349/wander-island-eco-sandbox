import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import OpenAI from 'openai';

import getDb from './db.js';
import authRoutes, { sendNewCardMailsToAll } from './routes/auth.js';
import islandRoutes from './routes/islands.js';
import friendRoutes from './routes/friends.js';
import chatRoutes from './routes/chat.js';
import mailboxRouter from './routes/mailbox.js';
import visitorsRouter from './routes/visitors.js';
import bottlesRouter from './routes/bottles.js';
import adminRouter from './routes/admin.js';
import giftsRouter from './routes/gifts.js';
import boardRouter from './routes/board.js';
import { setupSocket } from './socket.js';
import { buildCiSystemPrompt, pickFallback, pickWeatherLine, pickSeasonLine } from './ciLines.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedOrigins = [
  'http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173',
  'http://127.0.0.1:3000', 'http://127.0.0.1:3002',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

// Socket.IO setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // Allow all origins in production
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/avatars', express.static(path.join(__dirname, '..', 'data', 'avatars')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize database
getDb();

// 启动时给所有现有用户批量补发新卡邮件
sendNewCardMailsToAll(getDb());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/islands', islandRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mailbox', mailboxRouter);
app.use('/api/visitors', visitorsRouter);
app.use('/api/bottles', bottlesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/gifts', giftsRouter);
app.use('/api/board', boardRouter);

// AI Narration endpoint (preserved from original server.js)
const apiKey = process.env.DEEPSEEK_API_KEY;
const proxyUrl = process.env.http_proxy || process.env.HTTP_PROXY || process.env.all_proxy || process.env.ALL_PROXY;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

const ai = new OpenAI({
  apiKey: apiKey || 'dummy-key',
  baseURL: 'https://api.deepseek.com',
  ...(agent ? { httpAgent: agent } : {})
});

app.post('/api/generate-event', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'API key is missing. Please set DEEPSEEK_API_KEY.' });
    }

    const { timeOfDay, weather, grassHealth, deerCount, wolfCount, assetsCount, userMessage, affinityLevel, memorySummary, islandName, season } = req.body;

    // 构建动态 system prompt（注入好感等级 + 记忆 + 上下文）
    const systemPrompt = buildCiSystemPrompt({
      islandName: islandName || 'Wander Island',
      weather: weather === 'sunny' ? '晴天' : weather === 'rainy' ? '雨天' : weather === 'snowy' ? '雪天' : weather === 'cloudy' ? '多云' : weather === 'foggy' ? '浓雾' : weather === 'stormy' ? '雷暴' : weather,
      timeOfDay,
      season: season || 'summer',
      affinityLevel: affinityLevel || 'stranger',
      memorySummary: memorySummary || undefined,
      recentEvent: assetsCount > 0 ? `岛上有${assetsCount}个物件、${deerCount}只鹿、${wolfCount}只狼，草地健康度${Math.floor(grassHealth)}%` : undefined,
    });

    let userPrompt = '';

    if (userMessage && userMessage.trim() !== '') {
      userPrompt += `岛友对你说："${userMessage}"\n请直接回应岛友的话，结合当前岛屿状态给出你的低语。`;
    } else {
      // 无用户消息时：优先用本地文案库（省 API 调用）
      const localLine = pickWeatherLine(weather) || pickSeasonLine(season || 'summer');
      if (localLine && !userMessage) {
        return res.json({ narration: localLine });
      }
      userPrompt += `请对当前生态系统的平衡、天气、时间或岛友的建造选择发表一句简短、诗意的观察。`;
    }

    const response = await ai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 80 // 主动旁白用短 max_tokens 控制成本
    });

    res.json({ narration: response.choices[0].message.content });
  } catch (error) {
    console.error('Error generating AI content:', error);
    // 兜底：API 失败时回退本地文案库
    res.json({ narration: pickFallback() });
  }
});

// Online users count
app.get('/api/stats', (_req, res) => {
  const db = getDb();
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const islandCount = (db.prepare('SELECT COUNT(*) as count FROM islands').get() as any).count;
  res.json({ userCount, islandCount, onlineCount: io.sockets.sockets.size });
});

// Serve built frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path.startsWith('/avatars')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Setup Socket.IO
setupSocket(io);

httpServer.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🏝️  Wander Island Server v2.0         ║
  ║                                          ║
  ║   HTTP:  http://localhost:${PORT}          ║
  ║   WS:    ws://localhost:${PORT}            ║
  ║                                          ║
  ║   API Endpoints:                         ║
  ║   POST /api/auth/register                ║
  ║   POST /api/auth/login                   ║
  ║   GET  /api/auth/me                      ║
  ║   GET  /api/islands                      ║
  ║   GET  /api/friends                      ║
  ║   GET  /api/chat/:userId                 ║
  ╚══════════════════════════════════════════╝
  `);
});

export { io };
