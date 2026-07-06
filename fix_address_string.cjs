const fs = require('fs');

// 1. Fix CustomerContext.jsx
let ctxContent = fs.readFileSync('src/context/CustomerContext.jsx', 'utf8');

// Replace addressString formatting
ctxContent = ctxContent.replace(
    /const addressString = primaryAddress\.street_address \? \`\$\{primaryAddress\.street_address\} \$\{primaryAddress\.city \? ', ' \+ primaryAddress\.city : ''\}\`\.trim\(\) : 'No address provided';/g,
    "const addressString = primaryAddress.street_address ? `${primaryAddress.street_address}${primaryAddress.city ? ', ' + primaryAddress.city : ''}${primaryAddress.state ? ', ' + primaryAddress.state : ''}${primaryAddress.zip ? ' ' + primaryAddress.zip : ''}`.trim() : 'No address provided';"
);

// Replace billingAddressString formatting (if needed, but it falls back to addressString)
ctxContent = ctxContent.replace(
    /const billingAddressString = billingAddressObj\.street_address \? \`\$\{billingAddressObj\.street_address\} \$\{billingAddressObj\.city \? ', ' \+ billingAddressObj\.city : ''\}\`\.trim\(\) : addressString;/g,
    "const billingAddressString = billingAddressObj.street_address ? `${billingAddressObj.street_address}${billingAddressObj.city ? ', ' + billingAddressObj.city : ''}${billingAddressObj.state ? ', ' + billingAddressObj.state : ''}${billingAddressObj.zip ? ' ' + billingAddressObj.zip : ''}`.trim() : addressString;"
);

fs.writeFileSync('src/context/CustomerContext.jsx', ctxContent);

// 2. Fix DispatchHub.jsx
let dispatchContent = fs.readFileSync('src/pages/DispatchHub.jsx', 'utf8');

// Add zip to setMatchedCustomer
dispatchContent = dispatchContent.replace(
    /address: customerForm\.address,\s*city: customerForm\.city/,
    "address: customerForm.address,\n               city: customerForm.city,\n               zip: customerForm.zip"
);

// Add zip to display
dispatchContent = dispatchContent.replace(
    /\{matchedCustomer\.address\}, \{matchedCustomer\.city\}/g,
    "{matchedCustomer.address}, {matchedCustomer.city} {matchedCustomer.zip}"
);

// Search autocomplete display
dispatchContent = dispatchContent.replace(
    /\{c\.address\}\{c\.address && c\.city \? ', ' : ''\}\{c\.city\}/g,
    "{c.address}"
);

fs.writeFileSync('src/pages/DispatchHub.jsx', dispatchContent);
