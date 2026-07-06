const fs = require('fs');

function update(file) {
    let content = fs.readFileSync(file, 'utf-8');
    
    if (file.includes('Customers.jsx')) {
        content = content.replace(
            "import { formatQuoteId } from '../utils/formatters';",
            "import { formatQuoteId, formatPhoneNumber } from '../utils/formatters';"
        );
        content = content.replace(
            "value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}",
            "value={formData.phone} onChange={e => setFormData({...formData, phone: formatPhoneNumber(e.target.value)})}"
        );
        content = content.replace(
            "value={formData.tenant_phone} onChange={e => setFormData({...formData, tenant_phone: e.target.value})}",
            "value={formData.tenant_phone} onChange={e => setFormData({...formData, tenant_phone: formatPhoneNumber(e.target.value)})}"
        );
        content = content.replace(
            "const handleEditChange = (e) => {\n    const { id, value } = e.target;\n    setEditFormData(prev => ({ ...prev, [id]: value }));\n  };",
            "const handleEditChange = (e) => {\n    const { id, value } = e.target;\n    const finalValue = id === 'phone' ? formatPhoneNumber(value) : value;\n    setEditFormData(prev => ({ ...prev, [id]: finalValue }));\n  };"
        );
        content = content.replace(
            "value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})}",
            "value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: formatPhoneNumber(e.target.value)})}"
        );
    }
    
    fs.writeFileSync(file, content);
    console.log("Updated", file);
}

update('src/pages/Customers.jsx');
