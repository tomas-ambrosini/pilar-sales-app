const fs = require('fs');
let file = fs.readFileSync('src/pages/Proposals.jsx', 'utf8');

const epicMobile = fs.readFileSync('/tmp/Proposals-mobile.jsx', 'utf8').split('\n').slice(1155, 1303).join('\n');

// Find the start of the SECOND table which is after `) : (`
const startMarker = ') : (\n                 <table className="w-full text-left border-collapse min-w-[600px]">';
const replacementStart = ') : (\n                 <>\n                 <div className="hidden lg:block w-full">\n                 <table className="w-full text-left border-collapse min-w-[600px]">';

file = file.replace(startMarker, replacementStart);

// Now find the end of the table
const endMarker = '                   </tbody>\n                 </table>\n                 )}';
const replacementEnd = '                   </tbody>\n                 </table>\n                 </div>\n\n' + epicMobile.replace(/md:hidden/g, 'lg:hidden') + '\n                 </>\n                 )}';

file = file.replace(endMarker, replacementEnd);

fs.writeFileSync('src/pages/Proposals.jsx', file);
