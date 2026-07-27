import urllib.parse
import re

with open('mexico.svg', 'r') as f:
    svg = f.read()

paths_start = svg.find('<path')
inner_svg = svg[paths_start:-6] 

new_svg = f"""<svg width="100" height="100" viewBox="-60 -60 461 461" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
<rect x="-1000" y="-1000" width="3000" height="3000" fill="#90EE90" />
<defs>
    <clipPath id="crestClip">
        <circle cx="170.5" cy="170.5" r="170.5"/>
    </clipPath>
</defs>
<g opacity="0.4">
    <g clip-path="url(#crestClip)">
        {inner_svg}
    </g>
</g>
</svg>"""

encoded = urllib.parse.quote(new_svg)

filepath = 'src/pages/CampPointsTracker.jsx'
with open(filepath, 'r') as f:
    content = f.read()

old_line_match = re.search(r"'Mexico': \{[^\}]+\},", content)
if not old_line_match:
    print("Could not find Mexico in the file.")
    exit(1)

old_line = old_line_match.group(0)

new_line = f"'Mexico': {{ colorOverride: '#90EE90', continent: 'America', flag: '🇲🇽', rank: 2, code: 'MEX', bgStyle: `url(\"data:image/svg+xml,{encoded}\")` }},"

content = content.replace(old_line, new_line)

with open(filepath, 'w') as f:
    f.write(content)
print('Replaced Mexico successfully with 0.4 opacity!')
