const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/bg-slate-950/g, 'bg-[#fcf8ec]');
appCode = appCode.replace(/cinematic-vignette opacity-60/g, 'hidden'); // Remove the dark cinematic vignette
appCode = appCode.replace(/from-slate-950\/80 via-transparent to-slate-950\/30/g, 'hidden'); // Remove the dark gradient overlay
fs.writeFileSync('src/App.tsx', appCode);

let playerCode = fs.readFileSync('src/components/PlayerPanel.tsx', 'utf8');
playerCode = playerCode.replace(/bg-slate-950\/40/g, 'bg-slate-900\/20');
playerCode = playerCode.replace(/bg-slate-900 border  text-emerald-400/g, 'hand-drawn-panel border-2 border-slate-800 text-slate-800');
playerCode = playerCode.replace(/h-1.5 w-full bg-black\/40 rounded-full/g, 'h-1.5 w-full bg-slate-300 rounded-full border border-slate-800');
playerCode = playerCode.replace(/bg-gradient-to-tr from-emerald-500 to-cyan-500/g, 'bg-[#ffeaa7]');
fs.writeFileSync('src/components/PlayerPanel.tsx', playerCode);

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');
titleCode = titleCode.replace(/bg-black\/40/g, 'bg-slate-900\/20');
titleCode = titleCode.replace(/cinematic-vignette/g, 'hidden');
fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

let saveCode = fs.readFileSync('src/components/SaveSelectScreen.tsx', 'utf8');
saveCode = saveCode.replace(/cinematic-vignette/g, 'hidden');
fs.writeFileSync('src/components/SaveSelectScreen.tsx', saveCode);

console.log("Fixed backgrounds and vignettes");
