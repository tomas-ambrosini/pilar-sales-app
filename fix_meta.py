import re

with open('/tmp/old_CampPointsTracker.jsx', 'r') as f:
    content = f.read()

# Replace Continent Order
content = content.replace(
    "const CONTINENT_ORDER = ['North America', 'South America', 'Europe', 'Africa', 'Asia & Oceania'];",
    "const CONTINENT_ORDER = ['America', 'Europe', 'Africa', 'Asia & Oceania'];"
)

# Update continents
content = content.replace("continent: 'North America'", "continent: 'America'")
content = content.replace("continent: 'South America'", "continent: 'America'")

# Delete old teams
content = re.sub(r"^\s*'Uruguay': \{.*?\},?$\n?", "", content, flags=re.MULTILINE|re.DOTALL)
content = re.sub(r"^\s*'Canada': \{.*?\},?$\n?", "", content, flags=re.MULTILINE|re.DOTALL)
content = re.sub(r"^\s*'Panama': \{.*?\},?$\n?", "", content, flags=re.MULTILINE|re.DOTALL)

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

def replace_color(match):
    block = match.group(0)
    name = match.group(1)
    if name in colors:
        if 'colorOverride' in block:
            block = re.sub(r"colorOverride:\s*'[^']+'", f"colorOverride: '{colors[name]}'", block)
        else:
            block = re.sub(r"\}$", f", colorOverride: '{colors[name]}' }}", block)
    return block

# The regex matches from the start of the line: 'Team': { ... }
content = re.sub(r"^\s*'([^']+)': \{.*?\}$", replace_color, content, flags=re.MULTILINE)

# Now add Portugal, Senegal, Uzbekistan
content = content.replace(
    "'Spain': { bgPosition: '0px -25px', continent: 'Europe', flag: '🇪🇸', rank: 3, code: 'ESP', cups: 1, colorOverride: '#AA151B' }",
    "'Spain': { bgPosition: '0px -25px', continent: 'Europe', flag: '🇪🇸', rank: 3, code: 'ESP', cups: 1, colorOverride: '#AA151B' },\n    'Portugal': { continent: 'Europe', flag: '🇵🇹', rank: 4, code: 'POR', colorOverride: '#800000' }"
)

content = content.replace(
    "'Morocco': { continent: 'Africa', flag: '🇲🇦', rank: 1, code: 'MAR', colorOverride: '#006233' }",
    "'Morocco': { continent: 'Africa', flag: '🇲🇦', rank: 1, code: 'MAR', colorOverride: '#006233' },\n    'Senegal': { continent: 'Africa', flag: '🇸🇳', rank: 5, code: 'SEN', colorOverride: '#C0C0C0' }"
)

content = content.replace(
    "'New Zealand': { continent: 'Asia & Oceania', flag: '🇳🇿', rank: 4, code: 'NZL', colorOverride: '#D8BFD8' }",
    "'New Zealand': { continent: 'Asia & Oceania', flag: '🇳🇿', rank: 4, code: 'NZL', colorOverride: '#D8BFD8' },\n    'Uzbekistan': { continent: 'Asia & Oceania', flag: '🇺🇿', rank: 5, code: 'UZB', colorOverride: '#008080' }"
)

with open('src/pages/CampPointsTracker.jsx', 'w') as f:
    f.write(content)
