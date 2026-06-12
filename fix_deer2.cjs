const fs = require('fs');
let code = fs.readFileSync('src/components/Assets.tsx', 'utf8');

code = code.replace(/useRef<'wander' \| 'flee'>\('wander'\);/g, "useRef<any>('wander');");

fs.writeFileSync('src/components/Assets.tsx', code);
