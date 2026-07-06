const fs = require('fs');
let content = fs.readFileSync('src/pages/ServiceHub.jsx', 'utf-8');

// Remove bad import
content = content.replace("import { invokeAdminAction } from '../utils/adminActions';\n", "");

// Replace the delete call with direct function invoke
content = content.replace(
    "const error = await invokeAdminAction('deleteServiceCall', { callId }).catch(err => err);",
    `const { data, error: invokeErr } = await supabase.functions.invoke('admin-action', { body: { action: 'deleteServiceCall', payload: { callId } } });
            const error = invokeErr || (data?.error ? new Error(data.error) : null);`
);

fs.writeFileSync('src/pages/ServiceHub.jsx', content);
console.log('Fixed ServiceHub.jsx');
