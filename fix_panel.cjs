const fs = require('fs');

let panelCode = fs.readFileSync('src/components/PlayerPanel.tsx', 'utf8');

// Mini widget
panelCode = panelCode.replace(/flex items-center gap-4  hover:bg-white\/20 backdrop-blur-2xl border  p-3 pr-6 rounded-3xl shadow-\[0_8px_32px_0_rgba\(0,0,0,0\.3\)\] cursor-pointer transition-all hover:scale-105 active:scale-95/g, 'flex items-center gap-4 hand-drawn-btn p-3 pr-6');

// Modal blur
panelCode = panelCode.replace(/backdrop-blur-\[32px\]/g, 'backdrop-blur-sm');

// Modal inner background
panelCode = panelCode.replace(/from-white\/5/g, 'from-transparent');

// Close Button
panelCode = panelCode.replace(/className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-900  rounded-full transition-all duration-300 ring-1 ring-transparent hover:"/g, 'className="absolute top-8 right-8 hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0"');

// Headings
panelCode = panelCode.replace(/text-3xl font-light tracking-\[0\.2em\] text-slate-800 mb-10 border-b border-slate-800 pb-6 uppercase/g, 'text-4xl hand-drawn-title mb-10 border-b-2 border-slate-800 pb-6 -rotate-1');

// System tab return to title button
panelCode = panelCode.replace(/className="hand-drawn-panel px-8 py-4 border-red-500\/20 bg-red-500\/5 text-red-400 hover:bg-red-500\/10 hover:text-red-300 transition-colors flex items-center justify-center gap-3 group mt-12"/g, 'className="w-full flex items-center justify-center gap-3 hand-drawn-btn px-8 py-4 mt-12 text-red-600 font-bold"');

// Save button 
panelCode = panelCode.replace(/className="hand-drawn-btn"/g, 'className="hand-drawn-btn px-8 py-4 text-xl font-bold w-full"');

// Sidebar buttons
panelCode = panelCode.replace(/font-light tracking-\[0\.2em\] uppercase transition-all duration-300/g, 'font-bold transition-all duration-300');

fs.writeFileSync('src/components/PlayerPanel.tsx', panelCode);

console.log("Fixed PlayerPanel");
