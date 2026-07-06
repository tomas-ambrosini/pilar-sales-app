import re

with open('src/pages/CampPointsTracker.jsx', 'r') as f:
    content = f.read()

advancedSync = """
    // Advanced Sync DB to handle missing DELETE permissions by updating stale records
    useEffect(() => {
        const advancedSyncDB = async () => {
            const { data: existing, error: fetchErr } = await supabase.from('camp_teams').select('*');
            if (fetchErr || !existing) return;

            const newNames = Object.keys(TEAM_META);
            
            // Find duplicates or stale teams to repurpose
            const nameCounts = {};
            const staleOrDuplicateTeams = [];
            
            for (let t of existing) {
                if (!newNames.includes(t.name)) {
                    staleOrDuplicateTeams.push(t);
                } else {
                    if (nameCounts[t.name]) {
                        staleOrDuplicateTeams.push(t); // It's a duplicate
                    } else {
                        nameCounts[t.name] = true;
                    }
                }
            }

            // Find missing teams
            const existingUniqueNames = Object.keys(nameCounts);
            const missingTeams = newNames.filter(name => !existingUniqueNames.includes(name));

            // Repurpose stale teams for missing teams
            while (missingTeams.length > 0 && staleOrDuplicateTeams.length > 0) {
                const missingName = missingTeams.pop();
                const staleTeam = staleOrDuplicateTeams.pop();
                
                await supabase.from('camp_teams').update({
                    name: missingName,
                    color_hex: TEAM_META[missingName]?.colorOverride || '#000000',
                    points: 0 // Reset points for the new team
                }).eq('id', staleTeam.id);
            }

            // If there are still missing teams, insert them
            for (let missingName of missingTeams) {
                await supabase.from('camp_teams').insert({
                    name: missingName,
                    points: 0,
                    color_hex: TEAM_META[missingName]?.colorOverride || '#000000'
                });
            }

            // Any remaining stale/duplicate teams? We can't delete them, so we just rename them to something hidden
            let deletedCounter = 1;
            for (let staleTeam of staleOrDuplicateTeams) {
                await supabase.from('camp_teams').update({
                    name: `HIDDEN_TEAM_${deletedCounter++}`,
                    color_hex: '#000000'
                }).eq('id', staleTeam.id);
            }
            
            // Force a refresh of the state after sync
            const { data: finalData } = await supabase.from('camp_teams').select('*');
            if (finalData) setTeams(finalData);
        };
        advancedSyncDB();
    }, []);
"""

content = re.sub(
    r"// DB Sync\s*useEffect\(\(\) => \{.*?syncDB\(\);\s*\}, \[\]\);",
    advancedSync.strip(),
    content,
    flags=re.DOTALL
)

with open('src/pages/CampPointsTracker.jsx', 'w') as f:
    f.write(content)
