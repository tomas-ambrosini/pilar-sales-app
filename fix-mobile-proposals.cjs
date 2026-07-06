const fs = require('fs');
let file = fs.readFileSync('src/pages/Proposals.jsx', 'utf8');

const epicMobile = fs.readFileSync('/tmp/epic-mobile.jsx', 'utf8');

// Replace table start to wrap it
file = file.replace(
    '<table className="w-full text-left border-collapse min-w-[600px]">',
    '<div className="hidden lg:block w-full">\n<table className="w-full text-left border-collapse min-w-[600px]">'
);

// Replace table end to close wrap and insert mobile view
file = file.replace(
    '                   </tbody>\n                 </table>',
    '                   </tbody>\n                 </table>\n                 </div>\n\n                 {/* EPIC MOBILE CARD VIEW */}\n' + epicMobile
);

// Fix the lg:hidden class on epic mobile if it was md:hidden
file = file.replace(
    '<div className="flex flex-col md:hidden gap-3 p-3 bg-slate-50/30">',
    '<div className="flex flex-col lg:hidden gap-3 p-3 bg-slate-50/30">'
);

fs.writeFileSync('src/pages/Proposals.jsx', file);
