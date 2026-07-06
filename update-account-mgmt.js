const fs = require('fs');
let content = fs.readFileSync('src/pages/AccountManagement.jsx', 'utf-8');

// Add import
if (!content.includes('formatPhoneNumber')) {
    content = content.replace(
        "import { MANUAL_BADGE_KEYS, BADGE_REGISTRY } from '../utils/badges';",
        "import { MANUAL_BADGE_KEYS, BADGE_REGISTRY } from '../utils/badges';\nimport { formatPhoneNumber } from '../utils/formatters';"
    );
}

// Add to table headers
content = content.replace(
    '<th className="px-6 py-5">Employee Details</th>',
    '<th className="px-6 py-5">Employee Details</th>\n                     <th className="px-6 py-5 text-center">Contact</th>'
);

// Add to table body (loading state)
content = content.replace(
    '<td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>',
    '<td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>\n                         <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>'
);

// Add to table body (actual row)
content = content.replace(
    '<td className="px-6 py-5 text-center border-b border-slate-100">\n                               <div className="flex flex-col items-center gap-1.5">',
    '<td className="px-6 py-5 text-center border-b border-slate-100 font-mono text-xs text-slate-500">\n                                {u.phone || \'No phone\'}\n                             </td>\n                             <td className="px-6 py-5 text-center border-b border-slate-100">\n                               <div className="flex flex-col items-center gap-1.5">'
);

// Add to Create Modal
content = content.replace(
    '<div>\n                     <label className="text-xs font-bold text-slate-500 uppercase">Username (Optional)</label>\n                     <input type="text" name="username" className="w-full border rounded p-2 text-sm font-semibold" />\n                  </div>',
    '<div>\n                     <label className="text-xs font-bold text-slate-500 uppercase">Username (Optional)</label>\n                     <input type="text" name="username" className="w-full border rounded p-2 text-sm font-semibold" />\n                  </div>\n                  <div>\n                     <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>\n                     <input type="tel" name="phone" onChange={(e) => e.target.value = formatPhoneNumber(e.target.value)} className="w-full border rounded p-2 text-sm font-semibold" placeholder="(555) 555-5555" />\n                  </div>'
);

// Add to Edit Modal
content = content.replace(
    '<div>\n                     <label className="text-xs font-bold text-slate-500 uppercase">Username (Optional)</label>\n                     <input type="text" name="username" defaultValue={showEditModal.username || \'\'} className="w-full border rounded p-2 text-sm font-semibold" />\n                  </div>',
    '<div>\n                     <label className="text-xs font-bold text-slate-500 uppercase">Username (Optional)</label>\n                     <input type="text" name="username" defaultValue={showEditModal.username || \'\'} className="w-full border rounded p-2 text-sm font-semibold" />\n                  </div>\n                  <div>\n                     <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>\n                     <input type="tel" name="phone" defaultValue={showEditModal.phone || \'\'} onChange={(e) => e.target.value = formatPhoneNumber(e.target.value)} className="w-full border rounded p-2 text-sm font-semibold" placeholder="(555) 555-5555" />\n                  </div>'
);

fs.writeFileSync('src/pages/AccountManagement.jsx', content);
console.log('Updated AccountManagement.jsx');
