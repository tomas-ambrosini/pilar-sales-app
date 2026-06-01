const fs = require('fs');

let svg = fs.readFileSync('../egypt_eagle.svg', 'utf8');

// Replace colors to gold
svg = svg.replace(/fill="#(000|c09300|ce1126|fff)"/g, 'fill="#D4AF37"');
svg = svg.replace(/stroke="#[0-9a-fA-F]+"/gi, 'stroke="#D4AF37"');

// Replace root SVG tag
svg = svg.replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 600 815.143" preserveAspectRatio="xMidYMid slice"><rect width="100%" height="100%" fill="#000000"/><g opacity="0.4">`);

// Close the <g> we opened
svg = svg.replace(/<\/svg>/, '</g></svg>');

// Remove whitespace
svg = svg.replace(/\s+/g, ' ');
svg = svg.replace(/>\s+</g, '><');

// URL encode
let encoded = svg.replace(/"/g, "'").replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s+/g, ' ');

// Inject into React component
let c = fs.readFileSync('src/pages/CampPointsTracker.jsx', 'utf8');
let lines = c.split('\n');
lines[20] = `    'Egypt': { continent: 'Africa', flag: '🇪🇬', rank: 3, code: 'EGY', bgStyle: \`url("data:image/svg+xml,${encoded}")\` },`;
fs.writeFileSync('src/pages/CampPointsTracker.jsx', lines.join('\n'));

console.log('Fixed Egypt SVG viewBox and injected');
