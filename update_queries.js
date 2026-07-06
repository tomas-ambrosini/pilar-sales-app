import fs from 'fs';

function updateQueries() {
    const files = [
        'src/pages/DispatchCalendar.jsx',
        'src/pages/TechnicianMyDay.jsx',
        'src/pages/ServiceHub.jsx'
    ];

    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf-8');
        
        // Update query for service calls to use addresses!addresses_household_id_fkey
        // and fetch id, is_primary_residence along with street_address, city
        content = content.replace(
            /addresses!households_service_address_id_fkey \(\s*street_address,\s*city\s*\)/g,
            'addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence )'
        );
        content = content.replace(
            /addresses!addresses_household_id_fkey \(\s*street_address,\s*city\s*\)/g,
            'addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence )'
        );

        fs.writeFileSync(file, content);
        console.log(`Updated query in ${file}`);
    });
}

updateQueries();
