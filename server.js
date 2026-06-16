import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Using 3001 so it doesn't conflict with Vite on 3000

app.use(cors());
app.use(express.json());

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
    console.warn("WARNING: DEEPSEEK_API_KEY is not set in environment variables!");
}

const proxyUrl = process.env.http_proxy || process.env.HTTP_PROXY || process.env.all_proxy || process.env.ALL_PROXY || 'http://127.0.0.1:7897';
const agent = new HttpsProxyAgent(proxyUrl);

const ai = new OpenAI({ 
    apiKey: apiKey || 'dummy-key',
    baseURL: 'https://api.deepseek.com',
    httpAgent: agent
});

app.post('/api/generate-event', async (req, res) => {
    try {
        if (!apiKey) {
            return res.status(500).json({ error: "API key is missing. Please set DEEPSEEK_API_KEY." });
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
            userPrompt += `岛屿的主人（玩家）对你说：“${userMessage}”\n请直接回应玩家的话，并结合当前的岛屿状态给出你的神明启示。`;
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
        console.error("Error generating AI content:", error);
        res.status(500).json({ error: "Failed to generate AI content" });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`AI Endpoint available at http://localhost:${port}/api/generate-event`);
});
