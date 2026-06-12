import { getDb } from './db.js';
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';

async function seedDatabase() {
  const db = getDb();

  // 检查是否已存在 wander_admin 用户
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('wander_admin') as { id: string } | undefined;

  if (existing) {
    console.log('✅ 种子数据已存在，跳过初始化。');
    return;
  }

  const userId = randomUUID();
  const passwordHash = await bcryptjs.hash('admin123', 10);

  // 创建管理员用户
  db.prepare(
    'INSERT INTO users (id, username, password_hash, avatar) VALUES (?, ?, ?, ?)'
  ).run(userId, 'wander_admin', passwordHash, 'https://api.dicebear.com/7.x/notionists/svg?seed=wander_admin&backgroundColor=c0aede');

  // 创建测试岛屿
  const islandId = randomUUID();
  const islandData = JSON.stringify({
    timeOfDay: 12,
    weather: 'sunny',
    grassHealth: 75,
    deerCount: 5,
    wolfCount: 2,
    ecoPoints: 2500,
    assets: [
      { id: 'a1', type: 'treeA', position: { x: 0, y: 0, z: -5 } },
      { id: 'a2', type: 'treeB', position: { x: 3, y: 0, z: -3 } },
      { id: 'a3', type: 'house', position: { x: -4, y: 0, z: 2 } },
      { id: 'a4', type: 'windmill', position: { x: 5, y: 0, z: 4 } },
      { id: 'a5', type: 'spring', position: { x: -2, y: 0, z: -6 } },
      { id: 'a6', type: 'lighthouse', position: { x: 8, y: 0, z: -2 } },
      { id: 'a7', type: 'deer', position: { x: 1, y: 0, z: 3 } },
      { id: 'a8', type: 'streetlamp', position: { x: -1, y: 0, z: 1 } },
    ],
  });

  db.prepare(
    'INSERT INTO islands (id, owner_id, name, is_public, data) VALUES (?, ?, ?, ?, ?)'
  ).run(islandId, userId, '系统示范岛', 1, islandData);

  console.log('✅ 种子数据初始化完成！');
  console.log(`   用户: wander_admin / admin123`);
  console.log(`   岛屿: 系统示范岛 (${islandId})`);
}

seedDatabase();
