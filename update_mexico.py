import urllib.parse
import re

with open('mexico.svg', 'r') as f:
    svg = f.read()

# Crop and add clip path
svg = svg.replace('<path d=', '<clipPath id=\"crestClip\"><circle cx=\"170.5\" cy=\"170.5\" r=\"170.5\"/></clipPath><g clip-path=\"url(#crestClip)\"><path d=', 1)
svg = svg.replace('</svg>', '</g></svg>')
svg = svg.replace('viewBox=\"0 0 341 465.1\"', 'viewBox=\"0 0 341 341\" preserveAspectRatio=\"xMidYMid slice\"')

# Force width and height to 100 for correct background tiling scaling
svg = re.sub(r'width="[^"]+"', 'width="100"', svg, 1)
svg = re.sub(r'height="[^"]+"', 'height="100"', svg, 1)

encoded = urllib.parse.quote(svg)

filepath = 'src/pages/CampPointsTracker.jsx'
with open(filepath, 'r') as f:
    content = f.read()

# Find the Mexico line
old_line_match = re.search(r"'Mexico': \{[^\}]+\},", content)
if not old_line_match:
    print("Could not find Mexico in the file.")
    exit(1)

old_line = old_line_match.group(0)

# Build new line
new_line = f"'Mexico': {{ colorOverride: '#90EE90', continent: 'America', flag: '🇲🇽', rank: 2, code: 'MEX', bgStyle: `url(\"data:image/svg+xml,{encoded}\")` }},"

content = content.replace(old_line, new_line)

with open(filepath, 'w') as f:
    f.write(content)
print('Replaced Mexico successfully with proper scaling!')
