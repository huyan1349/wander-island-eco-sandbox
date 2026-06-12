const fs = require('fs');

let titleCode = fs.readFileSync('src/components/TitleScreen.tsx', 'utf8');

titleCode = titleCode.replace(
    /<h1 className="text-\[8rem\] leading-\[0\.8\] font-bold hand-drawn-title text-white\/90 tracking-\[0\.1em\]">/g,
    '<h1 className="text-[8rem] leading-[0.8] font-bold hand-drawn-title text-slate-900 tracking-[0.1em]">'
);

titleCode = titleCode.replace(
    /<h1 className="text-\[6rem\] leading-none font-bold hand-drawn-title text-white\/70 tracking-\[0\.2em\]">/g,
    '<h1 className="text-[6rem] leading-none font-bold hand-drawn-title text-slate-900/60 tracking-[0.2em]">'
);

fs.writeFileSync('src/components/TitleScreen.tsx', titleCode);

console.log("Fixed English title colors back to slate-900");
