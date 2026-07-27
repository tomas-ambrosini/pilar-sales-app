import urllib.parse
import re

with open('mexico.svg', 'r') as f:
    svg = f.read()

# 1. We'll extract the <path> elements directly since we know they start at <path
# In mexico.svg, all content is inside the main <svg> tag.
paths_start = svg.find('<path')
inner_svg = svg[paths_start:-6] # cut off </svg>

# Build the new SVG manually for perfect control.
# - Add 100x100 intrinsic size
# - Expand viewBox from 341 to say 460 (padding 60 on all sides: -60 -60 461 461) to make the crest smaller
# - Add a huge background rect for the base color #90EE90
# - Add an opacity wrapper for the crest
# - Apply the circular clip path
new_svg = f"""<svg width="100" height="100" viewBox="-60 -60 461 461" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
<rect x="-1000" y="-1000" width="3000" height="3000" fill="#90EE90" />
<defs>
    <clipPath id="crestClip">
        <circle cx="170.5" cy="170.5" r="170.5"/>
    </clipPath>
</defs>
<g opacity="0.15">
    <g clip-path="url(#crestClip)">
        {inner_svg}
    </g>
</g>
</svg>"""

encoded = urllib.parse.quote(new_svg)

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
print('Replaced Mexico successfully with proper scaling and fade!')
