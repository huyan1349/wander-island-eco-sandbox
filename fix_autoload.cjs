const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const hookInsertStr = `  const assetCount = assets.length;

  useEffect(() => {
    if (useGameStore.getState().screen === 'TITLE') {
      const slots = useGameStore.getState().getSavedSlots();
      if (slots.length > 0) {
        useGameStore.getState().loadGame(slots[0].id, true);
        useGameStore.getState().setTimeOfDay(6);
      }
    }
  }, []);
`;

appCode = appCode.replace(/  const assetCount = assets\.length;/g, hookInsertStr);

fs.writeFileSync('src/App.tsx', appCode);

console.log("Added autoload");
