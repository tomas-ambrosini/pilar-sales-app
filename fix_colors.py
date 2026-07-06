import re

colors = {
    'Mexico': '#8A9A5B',
    'Argentina': '#75AADB',
    'Brazil': '#009B3A',
    'Colombia': '#FCD116',
    'France': '#002395',
    'Spain': '#AA151B',
    'Germany': '#654321',
    'Egypt': '#D4AF37',
    'Ghana': '#FF6600',
    'Morocco': '#006233',
    'Japan': '#C71585',
    'South Korea': '#FFB6C1',
    'New Zealand': '#D8BFD8',
    'Australia': '#800080'
}

with open('src/pages/CampPointsTracker.jsx', 'r') as f:
    lines = f.readlines()

out = []
for line in lines:
    matched = False
    for name, color in colors.items():
        if re.match(r"^\s*'" + name + r"':\s*\{", line):
            matched = True
            # Check if colorOverride already exists
            if 'colorOverride' in line:
                line = re.sub(r"colorOverride:\s*'[^']+'", f"colorOverride: '{color}'", line)
            else:
                # Append before the closing brace (which might be }, or })
                line = re.sub(r"\}\s*,\s*$", f", colorOverride: '{color}' }},", line)
                line = re.sub(r"\}\s*$", f", colorOverride: '{color}' }}", line)
            break
    out.append(line)

with open('src/pages/CampPointsTracker.jsx', 'w') as f:
    f.writelines(out)
