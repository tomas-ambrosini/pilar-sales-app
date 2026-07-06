const fs = require('fs');

let content = fs.readFileSync('/tmp/perfect_original_CampPointsTracker.jsx', 'utf8');

// 1. Update CONTINENT_ORDER
content = content.replace(
    "const CONTINENT_ORDER = ['North America', 'South America', 'Europe', 'Africa', 'Asia & Oceania'];",
    "const CONTINENT_ORDER = ['America', 'Europe', 'Africa', 'Asia & Oceania'];"
);

// 2. Fix colors and continents in TEAM_META
const updates = {
    'USA': { colorOverride: '#B31942', continent: 'America' }, // B31942 is close enough to USAColors, wait, user said USAColors. The original was fine for USA. Let's just set continent: 'America'.
    'Mexico': { colorOverride: '#8FBC8F', continent: 'America' }, // Sage Green
    'Argentina': { colorOverride: '#ADD8E6', continent: 'America' }, // Light Blue
    'Brazil': { colorOverride: '#008000', continent: 'America' }, // Green
    'Colombia': { colorOverride: '#FFFF00', continent: 'America' }, // Yellow
    'England': { colorOverride: '#FFFFFF', continent: 'Europe' }, // White
    'France': { colorOverride: '#00008B', continent: 'Europe' }, // Dark Blue
    'Spain': { colorOverride: '#FF0000', continent: 'Europe' }, // Red
    'Germany': { colorOverride: '#A52A2A', continent: 'Europe' }, // Brown
    'Egypt': { colorOverride: '#FFD700', continent: 'Africa' }, // Gold
    'South Africa': { colorOverride: '#000000', continent: 'Africa' }, // Black
    'Ghana': { colorOverride: '#FFA500', continent: 'Africa' }, // Orange
    'Morocco': { colorOverride: '#006400', continent: 'Africa' }, // Dark kidi Green
    'Japan': { colorOverride: '#8B008B', continent: 'Asia & Oceania' }, // Dark Pink
    'South Korea': { colorOverride: '#FFB6C1', continent: 'Asia & Oceania' }, // Light Pink
    'New Zealand': { colorOverride: '#E0B0FF', continent: 'Asia & Oceania' }, // Light Purple
    'Australia': { colorOverride: '#800080', continent: 'Asia & Oceania' } // Purple
};

// Replace 'North America' and 'South America' with 'America'
content = content.replace(/continent: 'North America'/g, "continent: 'America'");
content = content.replace(/continent: 'South America'/g, "continent: 'America'");

// Apply color overrides
for (const [team, meta] of Object.entries(updates)) {
    // Regex to match the team line
    const regex = new RegExp(`('${team}':\\s*\\{.*?)(color_hex:\\s*'[^']+'|colorOverride:\\s*'[^']+')?(,\\s*dividerClass.*?)?(\\},?)$`, 'gm');
    // Wait, regex with .*? can still fail on SVG if not careful.
    // Let's just do simple string replacements for colors!
}

fs.writeFileSync('/tmp/fix_all.js_out', content);
