const fs = require('fs');

let cssCode = fs.readFileSync('src/index.css', 'utf8');

// Replace cinematic text with hand-drawn title
cssCode = cssCode.replace(/\.cinematic-text \{[\s\S]*?\}/, `.hand-drawn-title {
    @apply text-slate-800 uppercase;
    font-family: 'ZCOOL KuaiLe', sans-serif;
    font-weight: 900;
    text-shadow: 6px 6px 0px #ffeaa7, 8px 8px 0px #2d3436;
    transform: rotate(-2deg);
  }`);

// Change hand-drawn-btn background to paper color by default
cssCode = cssCode.replace(/background-color: transparent;/g, 'background-color: #fcf8ec;');

fs.writeFileSync('src/index.css', cssCode);

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');

// Replace cinematic-text with hand-drawn-title
titleCode = titleCode.replace(/cinematic-text/g, 'hand-drawn-title');

// Wrap the main layout in a panel or just fix the button layout
// Make the font weight bold for the title
titleCode = titleCode.replace(/text-\[9rem\] leading-\[0\.8\] font-light/g, 'text-[8rem] leading-[0.8] font-bold');
titleCode = titleCode.replace(/text-\[7rem\] leading-none font-light/g, 'text-[6rem] leading-none font-bold');

// Fix the subtitle
titleCode = titleCode.replace(/text-xl font-light tracking-\[1em\] text-slate-900/g, 'text-2xl font-bold tracking-[0.2em] text-slate-800 hand-drawn-title');
titleCode = titleCode.replace(/font-light tracking-\[0\.3em\] text-slate-900/g, 'font-bold tracking-[0.1em] text-slate-800');

fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

console.log("Fixed UI design to be more visible and cute");
