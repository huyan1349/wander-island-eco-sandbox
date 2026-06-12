const fs = require('fs');

// 1. App.tsx (remove blur)
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/blur-md brightness-50/g, 'blur-none brightness-100');
fs.writeFileSync('src/App.tsx', appCode);

// 2. store.ts (default time 6)
let storeCode = fs.readFileSync('src/store.ts', 'utf8');
storeCode = storeCode.replace(/timeOfDay: 12,/g, 'timeOfDay: 6,');
fs.writeFileSync('src/store.ts', storeCode);

// 3. TitleScreen.tsx (ghost buttons)
let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');
titleCode = titleCode.replace(/className="w-64 flex justify-center items-center hand-drawn-btn/g, 'className="group w-64 flex justify-center items-center hand-drawn-btn hand-drawn-ghost');
fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

console.log("Fixed home screen blur, time, and ghost buttons");
