const fs = require('fs');

let storeCode = fs.readFileSync('src/store.ts', 'utf8');

// Replace all initializations and hardcodes of timeOfDay to 6
storeCode = storeCode.replace(/timeOfDay: 12,/g, 'timeOfDay: 6,');
storeCode = storeCode.replace(/timeOfDay: 15,/g, 'timeOfDay: 6,');

fs.writeFileSync('src/store.ts', storeCode);

console.log("Forced all timeOfDay in store.ts to 6");
