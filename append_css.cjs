const fs = require('fs');
let cssCode = fs.readFileSync('src/index.css', 'utf8');

// Strip the last closing brace if it's there to append inside the @layer components
if (cssCode.trim().endsWith('}')) {
    cssCode = cssCode.substring(0, cssCode.lastIndexOf('}'));
}

cssCode += `
  /* Immersive Paper Features */
  .bg-grid-paper {
    background-color: transparent;
    background-image: 
      linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: center center;
  }

  .stamp {
    border: 3px dashed #ff7675;
    color: #ff7675;
    transform: rotate(-5deg);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'Courier New', Courier, monospace;
    font-weight: bold;
    text-transform: uppercase;
    opacity: 0.8;
  }
}
`;

fs.writeFileSync('src/index.css', cssCode);
console.log("Appended CSS classes");
