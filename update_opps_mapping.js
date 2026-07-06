import fs from 'fs';

function updateOppsMapping() {
    // 1. DispatchMap.jsx
    let dmContent = fs.readFileSync('src/components/DispatchMap.jsx', 'utf-8');
    dmContent = dmContent.replace(
        /addresses!households_service_address_id_fkey \(\s*id,\s*street_address,\s*city\s*\)/g,
        'addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence )'
    );
    dmContent = dmContent.replace(
        /const normalizedOpps = \(opps \|\| \[\]\)\.map\(o => \(\{([\s\S]*?)address: o\.households\?\.addresses \|\| \{\},([\s\S]*?)\}\)\);/,
        `const normalizedOpps = (opps || []).map(o => {
            let targetAddress = null;
            if (Array.isArray(o.households?.addresses) && o.households.addresses.length > 0) {
                if (o.service_address_id) targetAddress = o.households.addresses.find(a => a.id === o.service_address_id);
                if (!targetAddress) targetAddress = o.households.addresses.find(a => a.is_primary_residence) || o.households.addresses[0];
            }
            return {
                ...o,
                __type: 'SALES',
                address: targetAddress || {},
                customerName: o.households?.household_name || 'Unknown'
            };
        });`
    );
    fs.writeFileSync('src/components/DispatchMap.jsx', dmContent);

    // 2. DispatchCalendar.jsx
    let dcContent = fs.readFileSync('src/pages/DispatchCalendar.jsx', 'utf-8');
    dcContent = dcContent.replace(
        /addresses!households_service_address_id_fkey \(\s*id,\s*street_address,\s*city\s*\)/g,
        'addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence )'
    );
    dcContent = dcContent.replace(
        /const normalizedOpps = \(opps \|\| \[\]\)\.map\(o => \(\{ \.\.\.o, __type: 'SALES' \}\)\);/,
        `const normalizedOpps = (opps || []).map(o => {
             let targetAddress = null;
             if (o.households?.addresses && o.households.addresses.length > 0) {
                 if (o.service_address_id) targetAddress = o.households.addresses.find(a => a.id === o.service_address_id);
                 if (!targetAddress) targetAddress = o.households.addresses.find(a => a.is_primary_residence) || o.households.addresses[0];
                 o.households.addresses = [targetAddress]; // simplify for downstream components
             }
             return { ...o, __type: 'SALES' };
         });`
    );
    fs.writeFileSync('src/pages/DispatchCalendar.jsx', dcContent);

    console.log("Updated opps mapping logic");
}

updateOppsMapping();
