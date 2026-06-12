const fs = require('fs');

// 1. Update store.ts
let storeCode = fs.readFileSync('src/store.ts', 'utf8');

// Add to GameState interface
storeCode = storeCode.replace(
    /  biome: string;\n  setBiome: \(b: string\) => void;/g,
    "  biome: string;\n  setBiome: (b: string) => void;\n  titleTheme: 'white' | 'blue';\n  setTitleTheme: (t: 'white' | 'blue') => void;"
);

// Add to default state
storeCode = storeCode.replace(
    /  biome: 'default',\n  setBiome: \(b\) => set\(\{ biome: b \}\),/g,
    "  biome: 'default',\n  setBiome: (b) => set({ biome: b }),\n  titleTheme: 'white',\n  setTitleTheme: (t) => set({ titleTheme: t }),"
);

fs.writeFileSync('src/store.ts', storeCode);

// 2. Update TitleScreen.tsx
let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');

// Add titleTheme to state grab
titleCode = titleCode.replace(
    /const setScreen = useGameStore\(state => state\.setScreen\);/g,
    "const setScreen = useGameStore(state => state.setScreen);\n    const titleTheme = useGameStore(state => state.titleTheme);\n    const setTitleTheme = useGameStore(state => state.setTitleTheme);"
);

// Replace Top Right
titleCode = titleCode.replace(
    /<span className="text-sm font-bold text-slate-700 hand-drawn-title">Wander Island<\/span>\n                <span className="text-xs font-bold text-slate-600">流浪岛 \. 测试版 v1\.0<\/span>/g,
    `<span className={"text-sm font-bold hand-drawn-title " + (titleTheme === 'white' ? "text-slate-700" : "text-slate-700")}>Wander Island</span>
                <span className={"text-xs font-bold " + (titleTheme === 'white' ? "text-slate-600" : "text-slate-600")}>流浪岛 . 测试版 v1.0</span>`
);

// Replace WANDER
titleCode = titleCode.replace(
    /<h1 className="text-\[8rem\] leading-\[0\.8\] font-bold hand-drawn-title text-slate-900 tracking-\[0\.1em\]">/g,
    '<h1 className={"text-[8rem] leading-[0.8] font-bold hand-drawn-title tracking-[0.1em] " + (titleTheme === \'white\' ? "text-white/90" : "text-slate-900")}>'
);

// Replace ISLAND
titleCode = titleCode.replace(
    /<h1 className="text-\[6rem\] leading-none font-bold hand-drawn-title text-slate-900\/60 tracking-\[0\.2em\]">/g,
    '<h1 className={"text-[6rem] leading-none font-bold hand-drawn-title tracking-[0.2em] " + (titleTheme === \'white\' ? "text-white/70" : "text-slate-900/60")}>'
);

// Replace Subtitle 流浪岛
titleCode = titleCode.replace(
    /<span className="text-2xl font-bold tracking-\[0\.2em\] text-slate-400 hand-drawn-title">流浪岛<\/span>/g,
    '<span className={"text-2xl font-bold tracking-[0.2em] hand-drawn-title " + (titleTheme === \'white\' ? "text-white/80" : "text-slate-400")}>流浪岛</span>'
);

// Replace Buttons
titleCode = titleCode.replace(
    /<span className="text-2xl font-bold text-slate-400 group-hover:text-slate-900 transition-colors">/g,
    '<span className={"text-2xl font-bold group-hover:text-slate-900 transition-colors " + (titleTheme === \'white\' ? "text-white/90" : "text-slate-400")}>'
);

// Add toggle to Settings Modal
const settingsToggleHtml = `                            {/* BGM Vol */}
                            <div className="flex flex-col gap-2 w-full">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-sm font-bold text-slate-600">背景音乐 (BGM)</span>
                                    <span className="text-sm font-bold text-slate-600">{Math.round(bgmVol * 100)}%</span>
                                </div>
                                <div className="relative w-full h-8 bg-white border-2 border-slate-800 rounded-full overflow-hidden shadow-inner">
                                    <div className="absolute top-0 left-0 h-full bg-[#74b9ff] border-r-2 border-slate-800" style={{ width: \`\${bgmVol * 100}%\` }} />
                                    <input type="range" min="0" max="1" step="0.01" value={bgmVol} onChange={handleBgmVol} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                </div>
                            </div>
                            
                            {/* Theme Toggle */}
                            <div className="flex flex-col gap-2 w-full mt-4">
                                <span className="text-sm font-bold text-slate-600 px-2">主页配色</span>
                                <div className="flex gap-4">
                                    <button onClick={() => setTitleTheme('white')} className={"flex-1 py-3 hand-drawn-btn text-sm font-bold transition-all " + (titleTheme === 'white' ? "hand-drawn-btn-active bg-[#ffeaa7]" : "")}>纸白 (White)</button>
                                    <button onClick={() => setTitleTheme('blue')} className={"flex-1 py-3 hand-drawn-btn text-sm font-bold transition-all " + (titleTheme === 'blue' ? "hand-drawn-btn-active bg-[#ffeaa7]" : "")}>深蓝 (Blue)</button>
                                </div>
                            </div>`;

titleCode = titleCode.replace(
    /                            \{\/\* BGM Vol \*\/\}.*?<\/div>\n                            <\/div>/s,
    settingsToggleHtml
);

fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

console.log("Added theme toggle to TitleScreen and store");
