const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

appCode = appCode.replace(/  useEffect\(\(\) => \{\n    if \(useGameStore\.getState\(\)\.screen === 'TITLE'\) \{\n      const slots = useGameStore\.getState\(\)\.getSavedSlots\(\);\n      if \(slots\.length > 0\) \{\n        useGameStore\.getState\(\)\.loadGame\(slots\[0\]\.id, true\);\n        useGameStore\.getState\(\)\.setTimeOfDay\(6\);\n      \}\n    \}\n  \}, \[\]\);/g, `  useEffect(() => {
    if (screen === 'TITLE') {
      const slots = useGameStore.getState().getSavedSlots();
      if (slots.length > 0) {
        useGameStore.getState().loadGame(slots[0].id, true);
      }
      setTimeOfDay(6);
    }
  }, [screen, setTimeOfDay]);`);

fs.writeFileSync('src/App.tsx', appCode);

console.log("Fixed time locking");
