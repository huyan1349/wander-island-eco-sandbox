const fs = require('fs');

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');

const handDrawnTopRight = `{/* Top Right Version / Info */}
            <div className="absolute top-16 right-16 flex flex-col items-end gap-1">
                <span className="text-sm font-bold text-slate-700 hand-drawn-title">Wander Island</span>
                <span className="text-xs font-bold text-slate-600">流浪岛 . 测试版 v1.0</span>
            </div>`;

const handDrawnLayout = `{/* Titles */}
                <div className="mt-20 animate-slide-up" style={{ opacity: 0 }}>
                    <h1 className="text-[8rem] leading-[0.8] font-bold hand-drawn-title text-slate-700 tracking-[0.1em]">
                        WANDER
                    </h1>
                    <h1 className="text-[6rem] leading-none font-bold hand-drawn-title text-slate-700/80 tracking-[0.2em]">
                        ISLAND
                    </h1>
                    <div className="flex items-center gap-6 mt-12 opacity-80 pl-2">
                        <div className="h-px w-12 0" />
                        <span className="text-2xl font-bold tracking-[0.2em] text-slate-700 hand-drawn-title">流浪岛</span>
                    </div>
                </div>

                {/* Cinematic Chinese Menu */}
                <div className="pointer-events-auto animate-slide-up mb-20 flex flex-col items-start gap-6 pl-4 mt-12">
                    <button 
                        onClick={() => setScreen('SAVE_SELECT')}
                        className="group w-64 flex justify-center items-center hand-drawn-btn hand-drawn-ghost px-6 py-4 -rotate-2"
                    >
                        <span className="text-2xl font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                            开始旅程
                        </span>
                    </button>
                    
                    <button 
                        onClick={() => setActiveModal('SETTINGS')}
                        className="group w-64 flex justify-center items-center hand-drawn-btn hand-drawn-ghost px-6 py-4 rotate-1"
                    >
                        <span className="text-2xl font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                            游戏设置
                        </span>
                    </button>

                    <button 
                        onClick={() => setActiveModal('CREDITS')}
                        className="group w-64 flex justify-center items-center hand-drawn-btn hand-drawn-ghost px-6 py-4 -rotate-1"
                    >
                        <span className="text-2xl font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                            制作组
                        </span>
                    </button>
                </div>`;

titleCode = titleCode.replace(/\{\/\* Top Right Version \/ Info \*\/\}.*?<\/div>/s, handDrawnTopRight);
titleCode = titleCode.replace(/\{\/\* Titles \*\/\}.*?<\/div>.*?(?=\{\/\* Settings Modal \*\/\})/s, handDrawnLayout + '\n            </div>\n\n            ');

fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

console.log("Restored hand-drawn layout with slate-700 colors");
