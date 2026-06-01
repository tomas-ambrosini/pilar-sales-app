const fs = require('fs');

const svgContent = fs.readFileSync('sa_protea.svg', 'utf8');
const lines = svgContent.split('\n');

const flowerLines = lines.slice(74, 103).join(' ');
// Minify by removing excess whitespace
let minified = flowerLines.replace(/\s+/g, ' ').replace(/"/g, "'");

console.log(minified);
