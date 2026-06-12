const fs = require('fs');

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');

const originalTopRight = `{/* Top Right Version / Info */}
            <div className="absolute top-16 right-16 flex flex-col items-end gap-2">
                <span className="text-sm font-light tracking-[0.2em] text-white/50 uppercase">Wander Island</span>
                <span className="font-mono text-[10px] text-white/30 tracking-widest">流浪岛 . 测试版 v1.0</span>
            </div>`;

const originalLayout = `{/* Titles */}
                <div className="mt-20 animate-slide-up" style={{ opacity: 0 }}>
                    <h1 className="text-5xl md:text-7xl font-light tracking-[0.3em] text-white uppercase drop-shadow-2xl">
                        Wander Island
                    </h1>
                    <div className="flex items-center gap-6 mt-6 opacity-80 pl-2">
                        <div className="h-px w-24 bg-white/50" />
                        <span className="font-mono text-sm tracking-[0.4em] text-white/70 uppercase">流浪岛</span>
                    </div>
                </div>

                {/* Cinematic Chinese Menu */}
                <div className="pointer-events-auto animate-slide-up mb-20 flex flex-col items-start gap-8 pl-4 mt-20">
                    <button 
                        onClick={() => setScreen('SAVE_SELECT')}
                        className="group relative flex items-center gap-4 hover:translate-x-4 transition-transform duration-500"
                    >
                        <div className="w-12 h-px bg-white/0 group-hover:bg-white/100 transition-colors duration-500" />
                        <span className="text-2xl font-light tracking-[0.5em] text-white/70 group-hover:text-white uppercase drop-shadow-md transition-colors duration-500">
                            开始旅程
                        </span>
                    </button>
                    
                    <button 
                        onClick={() => setActiveModal('SETTINGS')}
                        className="group relative flex items-center gap-4 hover:translate-x-4 transition-transform duration-500"
                    >
                        <div className="w-12 h-px bg-white/0 group-hover:bg-white/100 transition-colors duration-500" />
                        <span className="text-2xl font-light tracking-[0.5em] text-white/70 group-hover:text-white uppercase drop-shadow-md transition-colors duration-500">
                            游戏设置
                        </span>
                    </button>

                    <button 
                        onClick={() => setActiveModal('CREDITS')}
                        className="group relative flex items-center gap-4 hover:translate-x-4 transition-transform duration-500"
                    >
                        <div className="w-12 h-px bg-white/0 group-hover:bg-white/100 transition-colors duration-500" />
                        <span className="text-2xl font-light tracking-[0.5em] text-white/70 group-hover:text-white uppercase drop-shadow-md transition-colors duration-500">
                            制作组
                        </span>
                    </button>
                </div>`;

titleCode = titleCode.replace(/\{\/\* Top Right Version \/ Info \*\/\}.*?<\/div>/s, originalTopRight);

titleCode = titleCode.replace(/\{\/\* Titles \*\/\}.*?<\/div>.*?(?=\{\/\* Settings Modal \*\/\})/s, originalLayout + '\n            </div>\n\n            ');

fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

console.log("Restored original cinematic fonts and layout");
