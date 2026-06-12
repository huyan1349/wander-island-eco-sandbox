const fs = require('fs');

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');

titleCode = titleCode.replace(
    /<span className="text-2xl font-bold tracking-\[0\.2em\] text-slate-700 hand-drawn-title">流浪岛<\/span>/g,
    '<span className="text-2xl font-bold tracking-[0.2em] text-slate-200 hand-drawn-title">流浪岛</span>'
);

titleCode = titleCode.replace(
    /<span className="text-2xl font-bold text-slate-700 group-hover:text-slate-900 transition-colors">/g,
    '<span className="text-2xl font-bold text-slate-200 group-hover:text-slate-900 transition-colors">'
);

fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

console.log("Fixed Chinese buttons to slate-200");
