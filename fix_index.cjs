const fs = require('fs');

let cssCode = fs.readFileSync('src/index.css', 'utf8');
cssCode = cssCode.replace(/@apply text-white uppercase;/g, '@apply text-slate-900 uppercase;');
fs.writeFileSync('src/index.css', cssCode);

console.log("Fixed index.css");
