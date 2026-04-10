import fs from 'fs';

let code = fs.readFileSync('src/components/MessagesDrawer.jsx', 'utf8');

code = code.replace("!c.channel_type === 'direct'", "c.channel_type !== 'direct'");

fs.writeFileSync('src/components/MessagesDrawer.jsx', code);
console.log("Fixed !c.channel_type bug in MessagesDrawer.jsx");
