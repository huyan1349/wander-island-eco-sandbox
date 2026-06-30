interface TelescopeIconProps {
  className?: string;
}

export function TelescopeIcon({ className = 'w-8 h-8 overflow-visible text-slate-800' }: TelescopeIconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <style>{`
        @keyframes basePop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        @keyframes scopeUp { 0% { transform: rotate(20deg) scale(0.5); opacity: 0; } 100% { transform: rotate(-30deg) scale(1); opacity: 1; } }
        @keyframes starsTwinkle { 0%, 100% { opacity: 0; transform: scale(0) translate(0, 0); } 50% { opacity: 1; transform: scale(1) translate(4px, -4px); } }
        .base { animation: basePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; transform-origin: center bottom; }
        .scope { animation: scopeUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both; transform-origin: 30% 70%; }
        .star1 { animation: starsTwinkle 1.5s ease-in-out infinite 0.4s; transform-origin: center; }
        .star2 { animation: starsTwinkle 2s ease-in-out infinite 0.6s; transform-origin: center; }
      `}</style>
      <g className="base" fill="currentColor">
        <path d="M40 85 L60 85 L55 60 L45 60 Z" />
        <circle cx="50" cy="60" r="8" />
      </g>
      <g className="scope" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="30" y1="70" x2="70" y2="30" />
        <line x1="60" y1="20" x2="80" y2="40" strokeWidth="12" />
      </g>
      <g fill="#facc15">
        <circle cx="85" cy="15" r="4" className="star1" />
        <circle cx="75" cy="5" r="3" className="star2" />
      </g>
    </svg>
  );
}
