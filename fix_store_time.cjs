const fs = require('fs');

let storeCode = fs.readFileSync('src/store.ts', 'utf8');

// Replace timeOfDay assignment in loadGame
storeCode = storeCode.replace(/timeOfDay: data\.timeOfDay,/g, 'timeOfDay: 6, // Forced to 6 AM');

fs.writeFileSync('src/store.ts', storeCode);

console.log("Forced timeOfDay to 6 in loadGame");
