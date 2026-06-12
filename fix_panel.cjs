const fs = require('fs');
let code = fs.readFileSync('src/components/PlayerPanel.tsx', 'utf8');

// Replace glass classes
code = code.replace(/glass-panel/g, 'hand-drawn-panel');
code = code.replace(/glass-btn/g, 'hand-drawn-btn');

// Replace white text
code = code.replace(/text-white\/90/g, 'text-slate-800');
code = code.replace(/text-white\/80/g, 'text-slate-700');
code = code.replace(/text-white\/70/g, 'text-slate-600');
code = code.replace(/text-white\/40/g, 'text-slate-500');
code = code.replace(/text-white\/30/g, 'text-slate-400');
code = code.replace(/text-white/g, 'text-slate-900');

// Replace borders and backgrounds that clash with hand-drawn
code = code.replace(/border-white\/(5|10|20)/g, '');
code = code.replace(/ring-white\/(5|10|20)/g, '');
code = code.replace(/bg-white\/(5|10)/g, '');
code = code.replace(/shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.2\)\]/g, '');

// Fix the mini widget wrapper
code = code.replace('flex items-center gap-4 bg-white/10 hover:bg-white/20 backdrop-blur-2xl border border-white/20', 'hand-drawn-btn flex items-center gap-4');

// Fix tabs
code = code.replace(/bg-white\/10 text-slate-900 shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.2\)\] ring-1 ring-white\/10/g, 'hand-drawn-btn-active');
code = code.replace(/text-slate-500 hover:bg-white\/5 hover:text-slate-600/g, 'text-slate-600 hover:text-slate-900');

fs.writeFileSync('src/components/PlayerPanel.tsx', code);
console.log("Done");
