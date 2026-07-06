import re

with open('/tmp/perfect_original_CampPointsTracker.jsx', 'r') as f:
    content = f.read()

# 1. Update CONTINENT_ORDER
content = content.replace(
    "const CONTINENT_ORDER = ['North America', 'South America', 'Europe', 'Africa', 'Asia & Oceania'];",
    "const CONTINENT_ORDER = ['America', 'Europe', 'Africa', 'Asia & Oceania'];"
)

# 2. Continents: 'North America' and 'South America' -> 'America'
content = content.replace("continent: 'North America'", "continent: 'America'")
content = content.replace("continent: 'South America'", "continent: 'America'")

# 3. Colors
colors = {
    'Mexico': '#8FBC8F',
    'Argentina': '#ADD8E6',
    'Brazil': '#008000',
    'Colombia': '#FFFF00',
    'England': '#FFFFFF',
    'France': '#00008B',
    'Spain': '#FF0000',
    'Germany': '#A52A2A',
    'Egypt': '#FFD700',
    'South Africa': '#000000',
    'Ghana': '#FFA500',
    'Morocco': '#006400',
    'Japan': '#8B008B',
    'South Korea': '#FFB6C1',
    'New Zealand': '#E0B0FF',
    'Australia': '#800080'
}

for team, color in colors.items():
    # If the team has a colorOverride, replace it
    if f"'{team}':" in content:
        # Find the line that starts with 'team':
        # Since some teams have multiline strings, we can't just replace line by line easily without parsing.
        # But we can look for `'Team': {` and inject colorOverride right after `{ `
        content = re.sub(
            f"('{team}': \\{{)", 
            f"\\1 colorOverride: '{color}',", 
            content
        )

# Remove color_hex, dividerClass, topBlockClass if they conflict
# Actually we can just leave them if we want, colorOverride takes precedence in our updated enrichedTeams.

# 4. Remove Canada, Panama, Uruguay
# We can do this by regexing the exact lines because they are single lines!
content = re.sub(r"^\s*'Canada': \{.*?\},?\n?", "", content, flags=re.MULTILINE)
content = re.sub(r"^\s*'Panama': \{.*?\},?\n?", "", content, flags=re.MULTILINE)
content = re.sub(r"^\s*'Uruguay': \{.*?\},?\n?", "", content, flags=re.MULTILINE)

# 5. Append missing teams
# We will append them right before the closing brace of TEAM_META.
# Look for "};" right after "Asia & Oceania" block.
missing_teams = """
    'Portugal': { continent: 'Europe', flag: '🇵🇹', rank: 4, code: 'POR', colorOverride: '#800000' },
    'Senegal': { continent: 'Africa', flag: '🇸🇳', rank: 5, code: 'SEN', colorOverride: '#C0C0C0' },
    'Uzbekistan': { continent: 'Asia & Oceania', flag: '🇺🇿', rank: 5, code: 'UZB', colorOverride: '#008080' }
"""
content = content.replace("};\n\nconst CONTINENT_ORDER", missing_teams + "};\n\nconst CONTINENT_ORDER")

# 6. Inject the sync logic and update enrichedTeams
sync_code = """
    // DB Sync
    useEffect(() => {
        const syncDB = async () => {
            const { data: existing, error: fetchErr } = await supabase.from('camp_teams').select('*');
            if (fetchErr) return;
            const newNames = Object.keys(TEAM_META);
            const existingNames = existing.map(t => t.name);
            
            // Delete old
            for (let t of existing) {
                if (!newNames.includes(t.name)) {
                    await supabase.from('camp_teams').delete().eq('id', t.id);
                }
            }
            // Insert new
            for (let name of newNames) {
                if (!existingNames.includes(name)) {
                    await supabase.from('camp_teams').insert({ name, points: 0, color_hex: TEAM_META[name]?.colorOverride || '#000000' });
                }
            }
        };
        syncDB();
    }, []);
"""
content = content.replace(
    "const [activeView, setActiveView] = useState('main'); // 'main', 'podium', 'continents'",
    "const [activeView, setActiveView] = useState('main'); // 'main', 'podium', 'continents'\n" + sync_code
)

enriched_teams_code = """
    const enrichedTeams = teams.filter(team => TEAM_META[team.name]).map(team => ({
        ...team,
        color_hex: TEAM_META[team.name]?.colorOverride || team.color_hex,
        continent: TEAM_META[team.name]?.continent || 'Other',
        flag: TEAM_META[team.name]?.flag || '🏳️',
        rank: TEAM_META[team.name]?.rank || 99,
        bgStyle: TEAM_META[team.name]?.bgStyle || null,
        bgPosition: TEAM_META[team.name]?.bgPosition || '0px 0px',
        code: TEAM_META[team.name]?.code || team.name.substring(0, 3).toUpperCase(),
        cups: TEAM_META[team.name]?.cups || 0,
        topBlockStyle: TEAM_META[team.name]?.topBlockStyle || null,
        dividerClass: TEAM_META[team.name]?.dividerClass || '',
        topBlockClass: TEAM_META[team.name]?.topBlockClass || ''
    }));
"""
content = re.sub(
    r"    const enrichedTeams = teams\.map.*?\}\)\);",
    enriched_teams_code.strip(),
    content,
    flags=re.DOTALL
)

with open('src/pages/CampPointsTracker.jsx', 'w') as f:
    f.write(content)
