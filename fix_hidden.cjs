const fs = require('fs');

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');
titleCode = titleCode.replace(/pointer-events-none hidden p-16/g, 'pointer-events-none p-16');
fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

let saveCode = fs.readFileSync('src/components/SaveSelectScreen.tsx', 'utf8');
saveCode = saveCode.replace(/pointer-events-auto hidden animate-in/g, 'pointer-events-auto animate-in');
fs.writeFileSync('src/components/SaveSelectScreen.tsx', saveCode);

console.log("Fixed hidden UI");
