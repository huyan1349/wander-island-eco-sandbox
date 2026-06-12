const fs = require('fs');

// Fix TitleScreen
let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');
titleCode = titleCode.replace(/className="group relative flex items-center gap-4 hover:translate-x-4 transition-all duration-500"/g, 'className="group relative flex items-center gap-4 hand-drawn-btn px-6 py-4"');
titleCode = titleCode.replace(/text-slate-900\/0/g, 'hidden');
titleCode = titleCode.replace(/text-slate-900\/60 group-hover:text-slate-900/g, 'text-slate-800');
titleCode = titleCode.replace(/text-slate-500 group-hover:text-slate-800/g, 'text-slate-800');
titleCode = titleCode.replace(/border-white\/30/g, 'border-slate-800');
fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

// Fix SaveSelectScreen
let saveCode = fs.readFileSync('src/components/SaveSelectScreen.tsx', 'utf8');
saveCode = saveCode.replace(/border border-white\/20 rounded-full text-slate-900\/50 group-hover:border-white\/50/g, 'border-2 border-slate-800 rounded-full text-slate-800');
saveCode = saveCode.replace(/text-slate-600 group-hover:text-slate-900/g, 'text-slate-800');
saveCode = saveCode.replace(/border-white\/10/g, 'border-slate-800');
saveCode = saveCode.replace(/border-white\/5/g, 'border-slate-800');
fs.writeFileSync('src/components/SaveSelectScreen.tsx', saveCode);

console.log("Fixed title buttons");
