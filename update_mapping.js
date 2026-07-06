import fs from 'fs';

function updateSvcMapping() {
    // 1. DispatchCalendar.jsx
    let dcContent = fs.readFileSync('src/pages/DispatchCalendar.jsx', 'utf-8');
    dcContent = dcContent.replace(
        /const normalizedSvc = \(svc \|\| \[\]\)\.map\(s => \{/,
        `const normalizedSvc = (svc || []).map(s => {
             const propertyTag = s.tags?.find(t => typeof t === 'string' && t.startsWith('PROPERTY:'));
             const propertyId = propertyTag ? propertyTag.replace('PROPERTY:', '') : null;
             let targetAddress = null;
             if (s.households?.addresses && s.households.addresses.length > 0) {
                 if (propertyId) targetAddress = s.households.addresses.find(a => a.id === propertyId);
                 if (!targetAddress) targetAddress = s.households.addresses.find(a => a.is_primary_residence) || s.households.addresses[0];
                 s.households.addresses = [targetAddress]; // simplify for downstream components
             }`
    );
    fs.writeFileSync('src/pages/DispatchCalendar.jsx', dcContent);

    // 2. TechnicianMyDay.jsx
    let tmContent = fs.readFileSync('src/pages/TechnicianMyDay.jsx', 'utf-8');
    tmContent = tmContent.replace(
        /const normalizedSvc = \(svcData \|\| \[\]\)\.map\(s => \(\{([\s\S]*?)\}\)\);/m,
        `const normalizedSvc = (svcData || []).map(s => {
                const propertyTag = s.tags?.find(t => typeof t === 'string' && t.startsWith('PROPERTY:'));
                const propertyId = propertyTag ? propertyTag.replace('PROPERTY:', '') : null;
                let targetAddress = null;
                if (Array.isArray(s.households?.addresses) && s.households.addresses.length > 0) {
                    if (propertyId) targetAddress = s.households.addresses.find(a => a.id === propertyId);
                    if (!targetAddress) targetAddress = s.households.addresses.find(a => a.is_primary_residence) || s.households.addresses[0];
                }
                return {
                    ...s,
                    __type: 'SERVICE',
                    address: targetAddress || {},
                    customerName: s.households?.household_name || 'Unknown'
                };
            });`
    );
    fs.writeFileSync('src/pages/TechnicianMyDay.jsx', tmContent);

    // 3. ServiceHub.jsx
    let shContent = fs.readFileSync('src/pages/ServiceHub.jsx', 'utf-8');
    shContent = shContent.replace(
        /let finalCalls = \(data \|\| \[\]\)\.map\(c => \{([\s\S]*?)return \{/m,
        `let finalCalls = (data || []).map(c => {
                let techs = c.assigned_techs;
                if (typeof techs === 'string') {
                    try { techs = JSON.parse(techs); } 
                    catch (e) { techs = techs.match(/([a-f0-9-]{36})/gi) || []; }
                }
                let tags = c.tags;
                if (typeof tags === 'string') {
                    try { tags = JSON.parse(tags); } 
                    catch (e) { tags = []; }
                }
                
                const propertyTag = tags?.find(t => typeof t === 'string' && t.startsWith('PROPERTY:'));
                const propertyId = propertyTag ? propertyTag.replace('PROPERTY:', '') : null;
                let targetAddress = null;
                if (Array.isArray(c.households?.addresses) && c.households.addresses.length > 0) {
                    if (propertyId) targetAddress = c.households.addresses.find(a => a.id === propertyId);
                    if (!targetAddress) targetAddress = c.households.addresses.find(a => a.is_primary_residence) || c.households.addresses[0];
                    c.households.addresses = [targetAddress];
                }
                
                return {`
    );
    fs.writeFileSync('src/pages/ServiceHub.jsx', shContent);

    console.log("Updated svc mapping logic");
}

updateSvcMapping();
