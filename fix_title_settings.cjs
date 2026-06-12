const fs = require('fs');

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');

titleCode = titleCode.replace(/className="px-6 py-2 border  text-slate-500 hover:text-slate-900 hover:border-slate-800 transition-colors tracking-widest text-sm"/g, 'className="hand-drawn-btn px-6 py-2 tracking-widest text-sm text-slate-800"');
titleCode = titleCode.replace(/className="px-6 py-2 border border-emerald-400\/50 text-emerald-400 bg-emerald-400\/10 transition-colors tracking-widest text-sm"/g, 'className="hand-drawn-btn-active px-6 py-2 tracking-widest text-sm text-slate-800"');

fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);
