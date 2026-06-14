// 音乐曲目数据 + 每首针对曲风的卡片纹理。WeatherForecast 与 MusicLibrary 共用。

export const TRACKS = [
  {
    title: 'Tides of Mahogany',
    url: '/Tides_of_Mahogany.mp3',
    bg: 'radial-gradient(ellipse at 30% 120%, rgba(180,83,9,0.45), transparent 60%), linear-gradient(160deg, rgba(217,119,6,0.18), rgba(120,53,15,0.05))',
  },
  {
    title: 'Glockenspiel Sunprint',
    url: '/Glockenspiel_Sunprint.mp3',
    bg: 'radial-gradient(circle at 50% 22%, rgba(251,191,36,0.5), transparent 65%), linear-gradient(180deg, rgba(254,243,199,0.22), transparent)',
  },
  {
    title: 'The Architecture of Leaves',
    url: '/The_Architecture_of_Leaves.mp3',
    bg: 'radial-gradient(ellipse at 72% 8%, rgba(132,204,22,0.42), transparent 60%), linear-gradient(160deg, rgba(22,101,52,0.16), rgba(20,83,45,0.05))',
  },
  {
    title: 'Sakura Drifting Down',
    url: '/Sakura_Drifting_Down.mp3',
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(251,207,232,0.55), transparent 65%), linear-gradient(160deg, rgba(244,114,182,0.18), rgba(219,39,119,0.05))',
  },
  {
    title: 'Lighthouse Beam',
    url: '/Lighthouse_Beam.mp3',
    bg: 'radial-gradient(circle at 50% 18%, rgba(254,240,138,0.5), transparent 60%), linear-gradient(180deg, rgba(248,250,252,0.15), rgba(30,58,138,0.12))',
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
