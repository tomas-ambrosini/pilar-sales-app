import fs from 'fs';

let code = fs.readFileSync('src/components/MessagesDrawer.jsx', 'utf8');

// 1. users -> user_profiles table queries
code = code.replaceAll(".from('users')", ".from('user_profiles')");

// 2. Select query restructuring
code = code.replace(
  /users \(\s*name,\s*role\s*\)/g,
  "sender:user_profiles ( full_name, role, avatar_url )"
);
code = code.replaceAll("content,", "body,");
code = code.replace(/user_id,\s*reply_to_id/g, "sender_id,\n          is_deleted,\n          reply_to_id");

// 3. User property maps (name -> full_name)
// Important: Replace u.name carefully where u is a user iterator
code = code.replaceAll("u.name", "u.full_name");
code = code.replaceAll("user.name", "user.full_name");
code = code.replaceAll("userData.name", "userData.full_name");
code = code.replaceAll("select('name, role')", "select('full_name, role, avatar_url')");

// 4. Message object property maps (users -> sender)
code = code.replaceAll("newMessage.users =", "newMessage.sender =");
code = code.replaceAll("msg.users?", "msg.sender?");
code = code.replaceAll("msg.users.", "msg.sender.");
code = code.replaceAll("? msg.users.", "? msg.sender.");
code = code.replaceAll("?.users?", "?.sender?");
code = code.replaceAll("m.users?", "m.sender?");
code = code.replaceAll("users: {", "sender: {");

// 5. Message body/sender fields
code = code.replaceAll("msg.content", "msg.body");
code = code.replaceAll("newMessage.user_id", "newMessage.sender_id");
code = code.replaceAll("msg.user_id", "msg.sender_id");
code = code.replaceAll("prevMsg.user_id", "prevMsg.sender_id");

// 6. Inserts and payload replacements
code = code.replaceAll("user_id: user.id,\n      content:", "sender_id: user.id,\n      body:");
code = code.replace(/user_id:\s*user\.id,\s*content:/g, "sender_id: user.id,\n      body:");
code = code.replaceAll("content: inputValue.trim()", "body: inputValue.trim()");
code = code.replaceAll("content: updatedContent", "body: updatedContent");

// 7. Channel types
code = code.replaceAll("is_private: newChannelIsPrivate", "channel_type: newChannelIsPrivate ? 'direct' : 'group'");
code = code.replaceAll("is_private: true", "channel_type: 'direct'");
code = code.replaceAll("channel.is_private", "channel.channel_type === 'direct'");
code = code.replaceAll("c.is_private", "c.channel_type === 'direct'");

// 8. Fix manual setInputValue for edit
code = code.replaceAll("setInputValue(msg.content);", "setInputValue(msg.body);");

// Write back to a temp file first for review
fs.writeFileSync('src/components/MessagesDrawer.jsx', code);
console.log("Rewrote file to MessagesDrawer.jsx directly.");
