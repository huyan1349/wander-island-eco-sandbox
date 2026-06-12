const fs = require('fs');

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');

titleCode = titleCode.replace(/生态沙盒模拟系统/g, '流浪岛');
titleCode = titleCode.replace(/生态沙盒模拟/g, '流浪岛');

fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

console.log("Replaced text");
