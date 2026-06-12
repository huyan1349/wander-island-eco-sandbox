const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/blur-md brightness-50/g, 'blur-sm brightness-110'); // Slightly bright and blurred instead of dark
fs.writeFileSync('src/App.tsx', appCode);

let cssCode = fs.readFileSync('src/index.css', 'utf8');
cssCode = cssCode.replace(/font-family: 'Raleway', sans-serif;/g, '');
cssCode = cssCode.replace(/font-weight: 100;/g, '');
cssCode = cssCode.replace(/text-shadow: 0 4px 16px rgba\(0,0,0,0\.4\);/g, '');
fs.writeFileSync('src/index.css', cssCode);

console.log("Fixed brightness and cinematic text");
