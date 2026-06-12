const fs = require('fs');

let storeCode = fs.readFileSync('src/store.ts', 'utf8');

storeCode = storeCode.replace(
    /notionists\/svg\?seed=Felix&backgroundColor=b6e3f4/g,
    'micah/svg?seed=Felix&backgroundColor=fcf8ec'
);

fs.writeFileSync('src/store.ts', storeCode);
console.log("Updated avatars to micah style");
