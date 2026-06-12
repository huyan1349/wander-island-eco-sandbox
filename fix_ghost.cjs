const fs = require('fs');

let cssCode = fs.readFileSync('src/index.css', 'utf8');
if (!cssCode.includes('.hand-drawn-ghost')) {
    cssCode += `
  .hand-drawn-ghost {
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }
  .hand-drawn-ghost:hover {
    background-color: #ffeaa7 !important;
    border-color: #2d3436 !important;
    box-shadow: 3px 3px 0px #2d3436 !important;
  }
  .hand-drawn-ghost-active {
    background-color: #ffeaa7 !important;
    border-color: #2d3436 !important;
    box-shadow: 3px 3px 0px #2d3436 !important;
  }
`;
    fs.writeFileSync('src/index.css', cssCode);
}

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Eye button
appCode = appCode.replace(/className="group relative w-14 h-14 flex items-center justify-center hand-drawn-btn/g, 'className="group relative w-14 h-14 flex items-center justify-center hand-drawn-btn hand-drawn-ghost');

// Eco panel button
appCode = appCode.replace(/className={\`hand-drawn-btn px-4 py-2 pointer-events-auto flex items-center gap-2 \$\{envMenuOpen \? 'hand-drawn-btn-active' : ''\}\`}/g, 'className={`hand-drawn-btn hand-drawn-ghost px-4 py-2 pointer-events-auto flex items-center gap-2 ${envMenuOpen ? \'hand-drawn-ghost-active\' : \'\'}`}');

fs.writeFileSync('src/App.tsx', appCode);

let playerCode = fs.readFileSync('src/components/PlayerPanel.tsx', 'utf8');
playerCode = playerCode.replace(/className="flex items-center gap-4 hand-drawn-btn p-3 pr-6"/g, 'className="flex items-center gap-4 hand-drawn-btn hand-drawn-ghost p-3 pr-6"');
fs.writeFileSync('src/components/PlayerPanel.tsx', playerCode);

console.log("Fixed ghost buttons");
