const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

appCode = appCode.replace(
    /<Globe size=\{20\} className="text-slate-800" \/>/g,
    '<Globe size={20} className={`transition-colors ${envMenuOpen ? \'text-slate-800\' : \'text-white group-hover:text-slate-800\'}`} />'
);

appCode = appCode.replace(
    /<ChevronRight size=\{16\} className=\{\`transition-transform duration-300 text-slate-800 \$\{envMenuOpen \? 'rotate-90' : ''\}\`\} \/>/g,
    '<ChevronRight size={16} className={`transition-transform duration-300 ${envMenuOpen ? \'text-slate-800 rotate-90\' : \'text-white group-hover:text-slate-800\'}`} />'
);

fs.writeFileSync('src/App.tsx', appCode);

let cssCode = fs.readFileSync('src/index.css', 'utf8');
cssCode = cssCode.replace(/text-shadow: 6px 6px 0px #ffeaa7, 8px 8px 0px #2d3436;/g, '/* No text shadow */');
fs.writeFileSync('src/index.css', cssCode);

console.log("Fixed icons and removed stacked font shadow");
