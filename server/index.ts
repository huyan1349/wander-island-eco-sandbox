import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';
import OpenAI from 'openai';

import getDb from './db.js';
import authRoutes from './routes/auth.js';
import islandRoutes from './routes/islands.js';
import friendRoutes from './routes/friends.js';
import chatRoutes from './routes/chat.js';
import { setupSocket } from './socket.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.IO setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Initialize database
getDb();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/islands', islandRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);

// AI Narration endpoint (preserved from original server.js)
const apiKey = process.env.DEEPSEEK_API_KEY;
const proxyUrl = process.env.http_proxy || process.env.HTTP_PROXY || process.env.all_proxy || process.env.ALL_PROXY || 'http://127.0.0.1:7897';
const agent = new HttpsProxyAgent(proxyUrl);

const ai = new OpenAI({
  apiKey: apiKey || 'dummy-key',
  baseURL: 'https://api.deepseek.com',
  // @ts-ignore - httpAgent works at runtime but types are mismatched
  httpAgent: agent
});

app.post('/api/generate-event', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'API key is missing. Please set DEEPSEEK_API_KEY.' });
    }

    const { timeOfDay, weather, grassHealth, deerCount, wolfCount, assetsCount, userMessage } = req.body;

    const systemPrompt = `你现在是 3D 生态沙盒游戏 "Wander Island" 的全知旁白和岛屿神明。
玩家正在建造和观察这个岛屿。
不要表现得像个 AI 助手，要像一个带有神秘感、风趣且全知的自然神灵。请用【中文】回答。
保持你的回答非常简短、沉浸感强（最多两到三句话）。`;

    let userPrompt = `当前岛屿状态：
- 时间: ${Math.floor(timeOfDay)}:00
- 天气: ${weather === 'sunny' ? '晴天' : weather === 'rainy' ? '雨天' : '雪天'}
- 草地健康度: ${Math.floor(grassHealth)}%
- 鹿的数量: ${deerCount}
- 狼的数量: ${wolfCount}
- 建筑/植物总数: ${assetsCount}

`;

    if (userMessage && userMessage.trim() !== '') {
      userPrompt += `岛屿的主人（玩家）对你说："${userMessage}"\n请直接回应玩家的话，并结合当前的岛屿状态给出你的神明启示。`;
    } else {
      userPrompt += `请对当前生态系统的平衡、天气、时间或玩家的建造选择发表一句简短、风趣的观察。`;
    }

    const response = await ai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    res.json({ narration: response.choices[0].message.content });
  } catch (error) {
    console.error('Error generating AI content:', error);
    res.status(500).json({ error: 'Failed to generate AI content' });
  }
});

// Online users count
app.get('/api/stats', (_req, res) => {
  const db = getDb();
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const islandCount = (db.prepare('SELECT COUNT(*) as count FROM islands').get() as any).count;
  res.json({ userCount, islandCount, onlineCount: io.sockets.sockets.size });
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
