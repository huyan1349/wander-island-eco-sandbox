const fs = require('fs');

// 1. Fix App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Eye Button replacement
appCode = appCode.replace(
    /className="group relative w-14 h-14 flex items-center justify-center bg-white\/5 hover:bg-white\/10 border border-white\/10 backdrop-blur-md rounded-3xl shrink-0 transition-all shadow-\[0_8px_32px_0_rgba\(0,0,0,0\.3\)\] text-white\/80 hover:text-white"/g, 
    'className="group relative w-14 h-14 flex items-center justify-center hand-drawn-btn hand-drawn-ghost shrink-0 text-white group-hover:text-slate-800 transition-colors"'
);

// Eye tooltip replacement
appCode = appCode.replace(
    /className="absolute -bottom-10 left-1\/2 -translate-x-1\/2 bg-black\/50 backdrop-blur-md text-white/g,
    'className="absolute -bottom-10 left-1/2 -translate-x-1/2 hand-drawn-panel text-slate-800'
);

// Ecology button replacement
appCode = appCode.replace(
    /className={`hand-drawn-btn hand-drawn-ghost px-4 py-2 pointer-events-auto flex items-center gap-2 \$\{envMenuOpen \? 'hand-drawn-ghost-active' : ''\}`}/g,
    'className={`group hand-drawn-btn hand-drawn-ghost px-4 py-2 pointer-events-auto flex items-center gap-2 transition-colors ${envMenuOpen ? \'hand-drawn-ghost-active\' : \'\'}`}'
);

// Globe icon color
appCode = appCode.replace(
    /<Globe size={20} className="text-slate-800" \/>/g,
    '<Globe size={20} className={`transition-colors ${envMenuOpen ? \'text-slate-800\' : \'text-white group-hover:text-slate-800\'}`} />'
);

// Ecology text color
appCode = appCode.replace(
    /<span className="font-bold tracking-widest text-slate-800">生态面板<\/span>/g,
    '<span className={`font-bold tracking-widest transition-colors ${envMenuOpen ? \'text-slate-800\' : \'text-white group-hover:text-slate-800\'}`}>生态面板</span>'
);

// Chevron icon color
appCode = appCode.replace(
    /<ChevronRight size={16} className={`transition-transform duration-300 text-slate-800 \$\{envMenuOpen \? 'rotate-90' : ''\}`} \/>/g,
    '<ChevronRight size={16} className={`transition-all duration-300 ${envMenuOpen ? \'text-slate-800 rotate-90\' : \'text-white group-hover:text-slate-800\'}`} />'
);

fs.writeFileSync('src/App.tsx', appCode);

// 2. Fix PlayerPanel.tsx
let playerCode = fs.readFileSync('src/components/PlayerPanel.tsx', 'utf8');

// Add 'group' to Avatar wrapper
playerCode = playerCode.replace(
    /className="flex items-center gap-4 hand-drawn-btn hand-drawn-ghost p-3 pr-6"/g,
    'className="group flex items-center gap-4 hand-drawn-btn hand-drawn-ghost p-3 pr-6"'
);

// Change text to white by default
playerCode = playerCode.replace(
    /<span className="text-sm font-bold text-slate-900 tracking-wide">{playerName}<\/span>/g,
    '<span className="text-sm font-bold text-white group-hover:text-slate-900 transition-colors tracking-wide">{playerName}</span>'
);

fs.writeFileSync('src/components/PlayerPanel.tsx', playerCode);

console.log("Fixed ghost text colors and removed old glass border");
