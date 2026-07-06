with open('src/pages/CampPointsTracker.jsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if line.strip().startswith("'Spain':"):
        new_lines.append("    'Portugal': { continent: 'Europe', flag: '🇵🇹', rank: 4, code: 'POR', colorOverride: '#800000' },\n")
    elif line.strip().startswith("'Morocco':"):
        new_lines.append("    'Senegal': { continent: 'Africa', flag: '🇸🇳', rank: 5, code: 'SEN', colorOverride: '#C0C0C0' },\n")
    elif line.strip().startswith("'New Zealand':"):
        new_lines.append("    'Uzbekistan': { continent: 'Asia & Oceania', flag: '🇺🇿', rank: 5, code: 'UZB', colorOverride: '#008080' },\n")

with open('src/pages/CampPointsTracker.jsx', 'w') as f:
    f.writelines(new_lines)
