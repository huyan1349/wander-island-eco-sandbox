const fs = require('fs');

// Fix App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/bg-white\/5 hover:bg-white\/10 border border-white\/10 backdrop-blur-md rounded-3xl shrink-0 transition-all shadow-\[0_8px_32px_0_rgba\(0,0,0,0\.3\)\]/g, 'hand-drawn-btn');
appCode = appCode.replace(/text-white\/80 hover:text-white/g, 'text-slate-800 hover:text-slate-900');
appCode = appCode.replace(/bg-black\/50 backdrop-blur-md text-white text-xs/g, 'hand-drawn-panel text-slate-800 text-[12px]');
appCode = appCode.replace(/text-white\/80/g, 'text-slate-700');
appCode = appCode.replace(/text-white/g, 'text-slate-900');
fs.writeFileSync('src/App.tsx', appCode);

// Fix PlayerPanel.tsx
let playerCode = fs.readFileSync('src/components/PlayerPanel.tsx', 'utf8');
playerCode = playerCode.replace(/hover:bg-white\/20 backdrop-blur-2xl border  p-3 pr-6 rounded-3xl shadow-\[0_8px_32px_0_rgba\(0,0,0,0\.3\)\]/g, 'hand-drawn-btn p-3 pr-6');
fs.writeFileSync('src/components/PlayerPanel.tsx', playerCode);

// Fix TitleScreen.tsx
let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');
titleCode = titleCode.replace(/flat-glass-panel/g, 'hand-drawn-panel');
titleCode = titleCode.replace(/glass-btn-primary/g, 'hand-drawn-btn');
titleCode = titleCode.replace(/glass-btn/g, 'hand-drawn-btn');
titleCode = titleCode.replace(/text-white\/90/g, 'text-slate-800');
titleCode = titleCode.replace(/text-white\/70/g, 'text-slate-600');
titleCode = titleCode.replace(/text-white\/50/g, 'text-slate-500');
titleCode = titleCode.replace(/text-white\/40/g, 'text-slate-500');
titleCode = titleCode.replace(/text-white/g, 'text-slate-900');
titleCode = titleCode.replace(/bg-white\/5/g, '');
titleCode = titleCode.replace(/bg-white\/10/g, '');
titleCode = titleCode.replace(/border-white\/10/g, '');
fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

// Fix SaveSelectScreen.tsx
let saveCode = fs.readFileSync('src/components/SaveSelectScreen.tsx', 'utf8');
saveCode = saveCode.replace(/flat-glass-panel/g, 'hand-drawn-panel');
saveCode = saveCode.replace(/flat-glass-pill/g, 'hand-drawn-panel');
saveCode = saveCode.replace(/glass-btn-primary/g, 'hand-drawn-btn');
saveCode = saveCode.replace(/glass-btn/g, 'hand-drawn-btn');
saveCode = saveCode.replace(/text-white\/90/g, 'text-slate-800');
saveCode = saveCode.replace(/text-white\/70/g, 'text-slate-600');
saveCode = saveCode.replace(/text-white\/40/g, 'text-slate-500');
saveCode = saveCode.replace(/text-white/g, 'text-slate-900');
saveCode = saveCode.replace(/border-white\/10/g, '');
saveCode = saveCode.replace(/bg-black\/20/g, '');
saveCode = saveCode.replace(/group-hover:bg-white\/5/g, 'group-hover:bg-[#fcf8ec]');
fs.writeFileSync('src/components/SaveSelectScreen.tsx', saveCode);

console.log("Done global UI fixes.");
