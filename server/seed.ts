import { getDb } from './db.js';
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';

// 固定ID，确保"辞"的ID不变
export const CI_USER_ID = '00000000-0000-0000-0000-000000000001';

async function seedDatabase() {
  const db = getDb();

  // ====== 创建 AI 角色 "辞" ======
  const existingCi = db.prepare('SELECT id FROM users WHERE id = ?').get(CI_USER_ID) as { id: string } | undefined;

  if (!existingCi) {
    const ciPasswordHash = await bcryptjs.hash('ci-is-ai-no-login', 10);

    db.prepare(
      'INSERT INTO users (id, username, password_hash, avatar, motto) VALUES (?, ?, ?, ?, ?)'
    ).run(
      CI_USER_ID,
      '辞',
      ciPasswordHash,
      'https://api.dicebear.com/7.x/notionists/svg?seed=ci-deepseek&backgroundColor=d1d4f9',
      '岛屿的守望者，风的低语者'
    );

    // 创建辞的岛屿
    const ciIslandId = randomUUID();
    const ciIslandData = JSON.stringify({
      timeOfDay: 18,
      weather: 'sunny',
      grassHealth: 95,
      deerCount: 8,
      wolfCount: 3,
      ecoPoints: 5000,
      assets: [
        { id: 'ci1', type: 'treeA', position: { x: 0, y: 0, z: -5 } },
        { id: 'ci2', type: 'treeB', position: { x: 3, y: 0, z: -3 } },
        { id: 'ci3', type: 'treeA', position: { x: -3, y: 0, z: -4 } },
        { id: 'ci4', type: 'house', position: { x: -4, y: 0, z: 2 } },
        { id: 'ci5', type: 'windmill', position: { x: 5, y: 0, z: 4 } },
        { id: 'ci6', type: 'spring', position: { x: -2, y: 0, z: -6 } },
        { id: 'ci7', type: 'lighthouse', position: { x: 8, y: 0, z: -2 } },
        { id: 'ci8', type: 'deer', position: { x: 1, y: 0, z: 3 } },
        { id: 'ci9', type: 'deer', position: { x: -1, y: 0, z: 5 } },
        { id: 'ci10', type: 'streetlamp', position: { x: -1, y: 0, z: 1 } },
        { id: 'ci11', type: 'treeB', position: { x: 6, y: 0, z: -4 } },
        { id: 'ci12', type: 'wolf', position: { x: -5, y: 0, z: -2 } },
      ],
    });

    db.prepare(
      'INSERT INTO islands (id, owner_id, name, is_public, data) VALUES (?, ?, ?, ?, ?)'
    ).run(ciIslandId, CI_USER_ID, '辞的隐者之岛', 1, ciIslandData);

    console.log('✅ AI角色"辞"已创建');
    console.log(`   岛屿: 辞的隐者之岛 (${ciIslandId})`);
  }

  // ====== 创建管理员用户 ======
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('wander_admin') as { id: string } | undefined;

  if (existingAdmin) {
    console.log('✅ 管理员已存在，跳过。');
    // 确保管理员和辞是好友
    ensureFriendship(db, existingAdmin.id, CI_USER_ID);
    return;
  }

  const userId = randomUUID();
  const passwordHash = await bcryptjs.hash('admin123', 10);

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

  // 管理员和辞自动成为好友
  ensureFriendship(db, userId, CI_USER_ID);

  console.log('✅ 种子数据初始化完成！');
  console.log(`   用户: wander_admin / admin123`);
  console.log(`   岛屿: 系统示范岛 (${islandId})`);
}

function ensureFriendship(db: any, userId1: string, userId2: string) {
  const existing: any = db.prepare(`
    SELECT * FROM friends
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(userId1, userId2, userId2, userId1);

  if (!existing) {
    db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)')
      .run(userId1, userId2, 'accepted');
    console.log('✅ 好友关系已建立');
  }
}

seedDatabase();
