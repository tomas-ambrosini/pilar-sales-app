import fs from 'fs';

let code = fs.readFileSync('src/components/MessagesDrawer.jsx', 'utf8');

code = code.replace(
  "channel_type: newChannelIsPrivate ? 'direct' : 'group'",
  "channel_type: newChannelIsPrivate ? 'direct' : 'group',\n      created_by: user.id"
);

code = code.replace(
  "channel_type: 'direct'\n      }]).select();",
  "channel_type: 'direct',\n        created_by: user.id\n      }]).select();"
);

fs.writeFileSync('src/components/MessagesDrawer.jsx', code);
console.log("Updated created_by in inserts");
