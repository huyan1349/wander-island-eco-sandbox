// 音乐曲目数据 + 每首针对曲风的卡片纹理。WeatherForecast 与 MusicLibrary 共用。

// 通过邮件发放的卡片（不在注册赠送之列；老玩家也靠邮件补发）。需与后端清单保持一致。
export const MAIL_CARD_URLS = ['/Before_the_First_Snow.mp3'];

// —— 卡片归属（localStorage）——
export function isCardOwned(url: string): boolean {
  return !!localStorage.getItem(`card_got_${url}`);
}
// 授予卡片；返回 true 表示本次新获得
export function grantCard(url: string): boolean {
  const k = `card_got_${url}`;
  if (localStorage.getItem(k)) return false;
  localStorage.setItem(k, Date.now().toString());
  return true;
}
export function cardObtainedDate(url: string): string | null {
  const v = localStorage.getItem(`card_got_${url}`);
  if (!v) return null;
  const d = new Date(+v);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export const TRACKS = [
  {
    title: 'Tides of Mahogany',
    url: '/Tides_of_Mahogany.mp3',
    bg: 'radial-gradient(ellipse at 30% 120%, rgba(180,83,9,0.45), transparent 60%), linear-gradient(160deg, rgba(217,119,6,0.18), rgba(120,53,15,0.05))',
    story: '云海里最老的一座岛，是一艘沉船长成的。当年的水手再没上岸，只把他的潮汐留在红木甲板的纹路里——至今仍随他的思念，一涨，一落。',
  },
  {
    title: 'Glockenspiel Sunprint',
    url: '/Glockenspiel_Sunprint.mp3',
    bg: 'radial-gradient(circle at 50% 22%, rgba(251,191,36,0.5), transparent 65%), linear-gradient(180deg, rgba(254,243,199,0.22), transparent)',
    story: '这座岛的清晨从不结束。曾有个孩子在这里等一个再没来的人，便把钟琴挂上了树，让每一缕阳光替他数着时间——叮，咚，又一天。',
  },
  {
    title: 'The Architecture of Leaves',
    url: '/The_Architecture_of_Leaves.mp3',
    bg: 'radial-gradient(ellipse at 72% 8%, rgba(132,204,22,0.42), transparent 60%), linear-gradient(160deg, rgba(22,101,52,0.16), rgba(20,83,45,0.05))',
    story: '这里曾是云海中最大的图书馆，后来被森林温柔地吞没。没写完的句子顺着叶脉继续生长，风一吹，便是那些书在轻声朗读自己。',
  },
  {
    title: 'Sakura Drifting Down',
    url: '/Sakura_Drifting_Down.mp3',
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(251,207,232,0.55), transparent 65%), linear-gradient(160deg, rgba(244,114,182,0.18), rgba(219,39,119,0.05))',
    story: '这座岛只在有人离开时开花。樱花是它学会的唯一一种告别——落得越多，便记得越久。所以漫游者从不舍得回头。',
  },
  {
    title: 'Lighthouse Beam',
    url: '/Lighthouse_Beam.mp3',
    bg: 'radial-gradient(circle at 50% 18%, rgba(254,240,138,0.5), transparent 60%), linear-gradient(180deg, rgba(248,250,252,0.15), rgba(30,58,138,0.12))',
    story: '最后的守岛人把自己变成了灯塔，好在每个夜里继续转动——为那艘他早知道不会回来、却仍在等的船，留一束光。',
  },
  {
    title: 'Before the First Snow',
    url: '/Before_the_First_Snow.mp3',
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(224,242,254,0.85), transparent 70%), linear-gradient(165deg, #c3dcef 0%, #8fb4d6 52%, #5d7da0 100%)',
    story: '这座岛永远停在初雪落下的前一刻。曾有两个人约好一起看第一场雪，后来只剩一个人留了下来——于是整座岛屏住呼吸，替他把那场雪，一直等了下去。',
  },
];

// 针对每首歌曲风绘制的纹理（叠在渐变之上）
export function renderTrackTexture(idx: number) {
  if (idx === 0) {
    return (
      <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {[24, 42, 60, 78, 96].map((y, i) => (
          <path key={i} d={`M-5,${y} Q12,${y - 7} 30,${y} T65,${y} T100,${y} T135,${y}`} fill="none" stroke="#9a3412" strokeWidth="1.1" strokeLinecap="round" opacity={0.45 - i * 0.05} />
        ))}
      </svg>
    );
  }
  if (idx === 1) {
    return (
      <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {Array.from({ length: 9 }).map((_, i) => {
          const ang = (-64 + i * 16) * Math.PI / 180;
          return <line key={i} x1="50" y1="16" x2={50 + Math.sin(ang) * 95} y2={16 + Math.cos(ang) * 125} stroke="#d97706" strokeWidth="0.7" opacity="0.32" />;
        })}
        <circle cx="50" cy="16" r="3" fill="#f59e0b" opacity="0.5" />
      </svg>
    );
  }
  if (idx === 2) {
    return (
      <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path d="M50,8 L50,116" stroke="#3f6212" strokeWidth="1" fill="none" opacity="0.4" />
        {[20, 35, 50, 65, 80, 98].map((y, i) => (
          <g key={i} opacity={0.34}>
            <path d={`M50,${y} L${50 - 28},${y + 14}`} stroke="#4d7c0f" strokeWidth="0.8" fill="none" />
            <path d={`M50,${y} L${50 + 28},${y + 14}`} stroke="#4d7c0f" strokeWidth="0.8" fill="none" />
          </g>
        ))}
      </svg>
    );
  }
  if (idx === 3) {
    const flower = (cx: number, cy: number, s: number, key: number) => (
      <g key={key} opacity={0.5}>
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx={cx} cy={cy - s} rx={s * 0.45} ry={s * 0.75} fill="#f9a8d4" transform={`rotate(${i * 72} ${cx} ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r={s * 0.3} fill="#fbcfe8" />
      </g>
    );
    return (
      <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        {flower(26, 28, 6, 1)}
        {flower(72, 50, 5, 2)}
        {flower(44, 82, 6.5, 3)}
        {flower(82, 104, 4.5, 4)}
        {flower(16, 70, 4, 5)}
      </svg>
    );
  }
  // 灯塔之光：绕灯顶旋转扫射的光锥 + 明灭灯泡
  if (idx === 4) {
    return (
      <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="lhBeam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="50,46 16,-34 84,-34" fill="url(#lhBeam)">
          <animateTransform attributeName="transform" type="rotate" values="-40 50 46;40 50 46;-40 50 46" dur="6s" repeatCount="indefinite" />
        </polygon>
        <path d="M44,116 L46,54 L54,54 L56,116 Z" fill="#475569" opacity="0.55" />
        <rect x="45" y="42" width="10" height="13" rx="1" fill="#64748b" opacity="0.6" />
        <circle cx="50" cy="48" r="3" fill="#fde047">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }
  // 初雪之前：雪丘剪影 + 优雅的六角雪晶 + 少量飘雪
  const flake = (cx: number, cy: number, s: number, dur: number, key: number) => (
    <g key={key} opacity="0.92">
      <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const a = (k * 60) * Math.PI / 180;
          const ex = cx + Math.cos(a) * s, ey = cy + Math.sin(a) * s;
          const bx = cx + Math.cos(a) * s * 0.62, by = cy + Math.sin(a) * s * 0.62;
          return (
            <g key={k} stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round">
              <line x1={cx} y1={cy} x2={ex} y2={ey} />
              <line x1={bx} y1={by} x2={bx + Math.cos(a + 0.55) * s * 0.28} y2={by + Math.sin(a + 0.55) * s * 0.28} />
              <line x1={bx} y1={by} x2={bx + Math.cos(a - 0.55) * s * 0.28} y2={by + Math.sin(a - 0.55) * s * 0.28} />
            </g>
          );
        })}
        <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy};360 ${cx} ${cy}`} dur={`${dur}s`} repeatCount="indefinite" />
      </g>
    </g>
  );
  return (
    <svg viewBox="0 0 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      {/* 远处雪丘剪影 */}
      <path d="M-5,104 Q22,90 50,99 T105,100 L105,121 L-5,121 Z" fill="#ffffff" opacity="0.18" />
      <path d="M-5,112 Q30,100 58,108 T105,109 L105,121 L-5,121 Z" fill="#ffffff" opacity="0.3" />
      {/* 优雅雪晶 */}
      {flake(28, 30, 9, 26, 1)}
      {flake(72, 52, 6.5, 20, 2)}
      {flake(46, 78, 7.5, 32, 3)}
      {/* 少量飘雪点 */}
      {([[16, 18, 1.3], [60, 22, 1.1], [84, 40, 1.4], [38, 56, 1.0], [80, 74, 1.2], [22, 86, 1.1]] as const).map(([x, y, r], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.6}>
          <animateTransform attributeName="transform" type="translate" values={`0 -3; 0 ${8 + (i % 3) * 4}; 0 -3`} dur={`${5 + (i % 4)}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}
