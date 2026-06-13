// 生生不息 (Flourish) 模式的 HUD：模式入口 + 手牌 + 推进季节
// 自包含、内联样式，挂到 App 即可。creative 模式只显示一个入口按钮。
import { useGameStore } from '../store';
import { FLOURISH_CARDS } from '../game/flourish';

const SEASON_NAMES = ['春', '夏', '秋', '冬'];

export function FlourishHUD() {
  const screen = useGameStore((s) => s.screen);
  const mode = useGameStore((s) => s.mode);
  const hand = useGameStore((s) => s.hand);
  const ecoPoints = useGameStore((s) => s.ecoPoints);
  const seasonTurn = useGameStore((s) => s.seasonTurn);
  const pendingCard = useGameStore((s) => s.pendingCard);
  const startFlourish = useGameStore((s) => s.startFlourish);
  const selectCard = useGameStore((s) => s.selectCard);
  const cancelCard = useGameStore((s) => s.cancelCard);
  const advanceSeason = useGameStore((s) => s.advanceSeason);
  const setMode = useGameStore((s) => s.setMode);

  if (screen !== 'PLAYING') return null;

  // —— 创造模式：仅显示进入按钮 ——
  if (mode !== 'flourish') {
    return (
      <button
        onClick={startFlourish}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 50,
          padding: '8px 14px', borderRadius: 12, border: 'none',
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)',
          color: '#15803d', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        🌱 生生不息
      </button>
    );
  }

  const seasonLabel = SEASON_NAMES[(seasonTurn - 1) % 4];
  const year = Math.floor((seasonTurn - 1) / 4) + 1;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
      {/* 顶部状态条 */}
      <div
        style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'auto',
          padding: '8px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)', boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          fontWeight: 700, color: '#334155', fontSize: 14,
        }}
      >
        <span>第 {year} 年 · {seasonLabel}季</span>
        <span style={{ color: '#15803d' }}>🌿 {ecoPoints}</span>
        <button
          onClick={advanceSeason}
          style={{
            padding: '6px 12px', borderRadius: 10, border: 'none',
            background: '#15803d', color: '#fff', fontWeight: 700, cursor: 'pointer',
          }}
        >
          推进季节 ▶
        </button>
        <button
          onClick={() => { cancelCard(); setMode('creative'); }}
          style={{
            padding: '6px 10px', borderRadius: 10, border: '1px solid #cbd5e1',
            background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 13,
          }}
        >
          退出
        </button>
      </div>

      {/* 放置提示 */}
      {pendingCard && (
        <div
          style={{
            position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
            pointerEvents: 'none', padding: '6px 14px', borderRadius: 10,
            background: 'rgba(21,128,61,0.9)', color: '#fff', fontWeight: 700, fontSize: 13,
          }}
        >
          点击岛屿放下「{FLOURISH_CARDS[pendingCard].name}」
        </div>
      )}

      {/* 底部手牌 */}
      <div
        style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 10, pointerEvents: 'auto',
        }}
      >
        {hand.map((id, i) => {
          const c = FLOURISH_CARDS[id];
          const selected = pendingCard === id;
          const affordable = ecoPoints >= c.cost;
          return (
            <button
              key={`${id}-${i}`}
              onClick={() => (selected ? cancelCard() : selectCard(id))}
              disabled={!affordable}
              style={{
                width: 110, padding: '10px 8px', borderRadius: 14, cursor: affordable ? 'pointer' : 'not-allowed',
                border: selected ? '2px solid #15803d' : '1px solid #e2e8f0',
                background: affordable ? 'rgba(255,255,255,0.95)' : 'rgba(241,245,249,0.85)',
                opacity: affordable ? 1 : 0.55, backdropFilter: 'blur(6px)',
                boxShadow: selected ? '0 6px 16px rgba(21,128,61,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                transform: selected ? 'translateY(-8px)' : 'none', transition: 'all 0.15s',
                textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#334155', fontSize: 15 }}>{c.name}</span>
                <span style={{ color: '#15803d', fontWeight: 700, fontSize: 13 }}>🌿{c.cost}</span>
              </div>
              <span style={{ color: '#64748b', fontSize: 10, lineHeight: 1.3 }}>{c.symbiosisHint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
