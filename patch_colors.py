import re

path = 'src/pages/CampPointsTracker.jsx'
with open(path, 'r') as f:
    content = f.read()

def replace_color(match):
    full_block = match.group(0)
    team_name = match.group(1)
    
    color = None
    bg_rect_match = re.search(r"%3Crect[^>]*?fill='%23([0-9A-Fa-f]+)'", full_block)
    if bg_rect_match:
        color = bg_rect_match.group(1)
    else:
        first_fill_match = re.search(r"fill='%23([0-9A-Fa-f]+)'", full_block)
        if first_fill_match:
            color = first_fill_match.group(1)
                
    if color:
        color = '#' + color.upper()
        # Ensure we keep colors like #fff as #FFFFFF
        if len(color) == 4:
            color = '#' + color[1]*2 + color[2]*2 + color[3]*2
        print(f"Updating {team_name} to {color}")
        new_block = re.sub(r"colorOverride:\s*'[^']+'", f"colorOverride: '{color}'", full_block, count=1)
        return new_block
    return full_block

new_content = re.sub(r"'([A-Za-z ]+)':\s*\{\s*colorOverride:[^\n]+", replace_color, content)

with open(path, 'w') as f:
    f.write(new_content)
