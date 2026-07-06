const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf-8');

// Remove import
content = content.replace("import ServiceHub from './pages/ServiceHub';\n", "");

// Remove Route
content = content.replace(
    "<Route path=\"service/*\" element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'DISPATCHER']}><ServiceHub /></RoleRoute>} />\n          ",
    ""
);

fs.writeFileSync('src/App.jsx', content);
console.log('Fixed App.jsx');
