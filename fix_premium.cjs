const fs = require('fs');

// 1. Fix index.css
let cssCode = fs.readFileSync('src/index.css', 'utf8');

// Update imports
cssCode = cssCode.replace(/@import url\('https:\/\/fonts.googleapis.com\/css2\?family=ZCOOL\+KuaiLe&display=swap'\);/, "@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Outfit:wght@300;400;500;600;700;800&display=swap');");

// Add fonts to theme
if (!cssCode.includes('--font-caveat')) {
    cssCode = cssCode.replace(/@theme \{/, "@theme {\n  --font-caveat: 'Caveat', cursive;\n  --font-outfit: 'Outfit', sans-serif;");
}

// Rewrite hand-drawn-panel to premium whiteboard
const newPanel = `.hand-drawn-panel {
    background-color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 24px;
    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08), 0 0 20px rgba(255,255,255,0.5) inset;
    color: #1e293b;
    font-family: 'Outfit', sans-serif;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }`;
cssCode = cssCode.replace(/\.hand-drawn-panel \{[\s\S]*?\}/, newPanel);

// Rewrite hand-drawn-btn to premium button
const newBtn = `.hand-drawn-btn {
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 16px;
    color: #475569;
    font-family: 'Outfit', sans-serif;
    font-weight: 500;
    transition: all 0.3s ease;
  }
  
  .hand-drawn-btn:hover {
    background-color: rgba(0,0,0,0.03);
    color: #0f172a;
    transform: translateY(-1px);
  }
  
  .hand-drawn-btn-active {
    background-color: #f1f5f9;
    border: 1px solid rgba(0,0,0,0.05);
    border-radius: 16px;
    color: #0f172a;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  }`;
cssCode = cssCode.replace(/\.hand-drawn-btn \{[\s\S]*?\}/, newBtn);
cssCode = cssCode.replace(/\.hand-drawn-btn:hover \{[\s\S]*?\}/, "");
cssCode = cssCode.replace(/\.hand-drawn-btn-active \{[\s\S]*?\}/, "");
cssCode += "\n" + newBtn;

fs.writeFileSync('src/index.css', cssCode);

// 2. Fix App.tsx background blur
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/blur-sm brightness-110/g, 'blur-none brightness-100');
appCode = appCode.replace(/blur-md brightness-50/g, 'blur-none brightness-100');
fs.writeFileSync('src/App.tsx', appCode);

// 3. Update TitleScreen to use Caveat
let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');
// remove the KuaiLe inline font
titleCode = titleCode.replace(/style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}/g, 'className="font-caveat"');
titleCode = titleCode.replace(/font-caveat" className="/g, 'font-caveat ');
// Update main title
titleCode = titleCode.replace(/漫游小岛/g, 'Wander Island');
titleCode = titleCode.replace(/WANDER ISLAND/g, 'Eco Sandbox');
titleCode = titleCode.replace(/text-6xl font-black text-slate-900 tracking-wider text-center/g, 'text-7xl font-bold text-slate-800 tracking-normal text-center font-caveat');
fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

// 4. Update SaveSelectScreen
let saveCode = fs.readFileSync('src/components/SaveSelectScreen.tsx', 'utf8');
saveCode = saveCode.replace(/style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}/g, '');
saveCode = saveCode.replace(/岛屿档案/g, 'Island Archives');
saveCode = saveCode.replace(/发现新岛屿/g, 'Discover New Island');
saveCode = saveCode.replace(/border-dashed border-4/g, 'border-dashed border-2 border-slate-300');
// Remove hard borders on decorations
saveCode = saveCode.replace(/border-2 border-slate-800 shadow-sm/g, 'rounded-xl shadow-lg');
fs.writeFileSync('src/components/SaveSelectScreen.tsx', saveCode);

console.log("Fixed premium whiteboard design");
