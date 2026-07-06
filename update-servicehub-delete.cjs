const fs = require('fs');
let content = fs.readFileSync('src/pages/ServiceHub.jsx', 'utf-8');

if (!content.includes('invokeAdminAction')) {
    content = content.replace(
        "import { PIPELINE_STATES } from '../utils/pipelineControls';",
        "import { PIPELINE_STATES } from '../utils/pipelineControls';\nimport { invokeAdminAction } from '../utils/adminActions';"
    );
}

content = content.replace(
    "const { error } = await supabase.from('service_calls').delete().eq('id', callId);",
    "const error = await invokeAdminAction('deleteServiceCall', { callId }).catch(err => err);"
);

fs.writeFileSync('src/pages/ServiceHub.jsx', content);
console.log('Updated ServiceHub.jsx');
