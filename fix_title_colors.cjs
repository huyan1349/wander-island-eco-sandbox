const fs = require('fs');

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');

// Top Right
titleCode = titleCode.replace(/<span className="text-sm font-bold text-slate-800 hand-drawn-title">Wander Island<\/span>/g, '<span className="text-sm font-bold text-white/80 hand-drawn-title">Wander Island</span>');
titleCode = titleCode.replace(/<span className="text-xs font-bold text-slate-700">流浪岛 . 测试版 v1.0<\/span>/g, '<span className="text-xs font-bold text-white/60">流浪岛 . 测试版 v1.0</span>');

// Main Title
titleCode = titleCode.replace(/<h1 className="text-\[8rem\] leading-\[0\.8\] font-bold hand-drawn-title text-slate-900 tracking-\[0\.1em\]">/g, '<h1 className="text-[8rem] leading-[0.8] font-bold hand-drawn-title text-white/90 tracking-[0.1em]">');
titleCode = titleCode.replace(/<h1 className="text-\[6rem\] leading-none font-bold hand-drawn-title text-slate-900\/60 tracking-\[0\.2em\]">/g, '<h1 className="text-[6rem] leading-none font-bold hand-drawn-title text-white/70 tracking-[0.2em]">');
titleCode = titleCode.replace(/<span className="text-2xl font-bold tracking-\[0\.2em\] text-slate-800 hand-drawn-title">流浪岛<\/span>/g, '<span className="text-2xl font-bold tracking-[0.2em] text-white/80 hand-drawn-title">流浪岛</span>');

// Buttons
titleCode = titleCode.replace(/<span className="text-2xl font-bold text-slate-800">/g, '<span className="text-2xl font-bold text-white/90 group-hover:text-slate-800 transition-colors">');

fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

console.log("Fixed title screen text colors");
