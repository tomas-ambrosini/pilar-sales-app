const fs = require('fs');

function update(file) {
    let content = fs.readFileSync(file, 'utf-8');
    
    if (file.includes('GlobalBranding.jsx')) {
        content = content.replace(
            "import { Camera, Upload, Check, Loader2, Save, X } from 'lucide-react';",
            "import { Camera, Upload, Check, Loader2, Save, X } from 'lucide-react';\nimport { formatPhoneNumber } from '../../utils/formatters';"
        );
        content = content.replace(
            "value={phone} onChange={e => setPhone(e.target.value)}",
            "value={phone} onChange={e => setPhone(formatPhoneNumber(e.target.value))}"
        );
    }
    
    fs.writeFileSync(file, content);
    console.log("Updated", file);
}

update('src/pages/templates/GlobalBranding.jsx');
