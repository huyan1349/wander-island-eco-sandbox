const fs = require('fs');
let code = fs.readFileSync('src/components/PlayerPanel.tsx', 'utf8');

code = code.replace(/hover: /g, ' ');
code = code.replace(/ring-1  /g, ' ');
code = code.replace(/border-r  /g, 'border-r border-slate-800 ');
code = code.replace(/ring-4  /g, 'ring-4 ring-slate-800 ');
code = code.replace(/border-2  /g, 'border-2 border-slate-800 ');
code = code.replace(/border-b  /g, 'border-b border-slate-800 ');

fs.writeFileSync('src/components/PlayerPanel.tsx', code);
