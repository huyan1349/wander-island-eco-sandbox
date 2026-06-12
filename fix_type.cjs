const fs = require('fs');
let code = fs.readFileSync('src/components/Assets.tsx', 'utf8');

// Just forcefully set it to any for Deer and Wolf
code = code.replace(/useRef<'wander' \| 'flee' \| 'eat'>/g, "useRef<any>");
code = code.replace(/useRef<'wander' \| 'flee'>/g, "useRef<any>");
code = code.replace(/useRef<'wander' \| 'chase'>/g, "useRef<any>");

fs.writeFileSync('src/components/Assets.tsx', code);
