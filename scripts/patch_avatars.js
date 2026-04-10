import fs from 'fs';

let code = fs.readFileSync('src/components/MessagesDrawer.jsx', 'utf8');

// Replacement 1: allUsers map (line ~806)
code = code.replace(
  '<div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ background: getAvatarGradient(u.full_name) }}>\n                                    {u.full_name.charAt(0).toUpperCase()}\n                                  </div>',
  `{u.avatar_url ? (
                                    <img src={u.avatar_url} alt={u.full_name} className="w-8 h-8 rounded-full object-cover shadow-sm" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ background: getAvatarGradient(u.full_name) }}>
                                      {u.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                  )}`
);

// Replacement 2: drawer-msg-avatar (line ~852)
code = code.replace(
  '<div \n                                      className="drawer-msg-avatar"\n                                      style={{ background: getAvatarGradient(msg.sender?.name) }}\n                                    >\n                                      {msg.sender?.name ? msg.sender.name.charAt(0).toUpperCase() : \'U\'}\n                                    </div>',
  `{msg.sender?.avatar_url ? (
                                      <img src={msg.sender.avatar_url} alt={msg.sender.full_name} className="drawer-msg-avatar object-cover flex-shrink-0" />
                                    ) : (
                                      <div 
                                        className="drawer-msg-avatar"
                                        style={{ background: getAvatarGradient(msg.sender?.full_name || msg.sender?.name) }}
                                      >
                                        {(msg.sender?.full_name || msg.sender?.name) ? (msg.sender?.full_name || msg.sender?.name).charAt(0).toUpperCase() : 'U'}
                                      </div>
                                    )}`
);

// Replacement 3: Mentions popup (line ~1038)
code = code.replace(
  '<div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px]" style={{background: getAvatarGradient(u.full_name)}}>\n                                    {u.full_name.charAt(0).toUpperCase()}\n                                  </div>',
  `{u.avatar_url ? (
                                    <img src={u.avatar_url} alt={u.full_name} className="w-5 h-5 rounded-md object-cover" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px]" style={{background: getAvatarGradient(u.full_name)}}>
                                      {u.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                  )}`
);

// Replacement 4: DMs list (line ~735)
code = code.replace(
  '<div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 shadow-sm shadow-black/10 flex-shrink-0" style={{ background: getAvatarGradient(getChannelDisplayName(channel)) }}>\n                                  {getChannelDisplayName(channel).charAt(0).toUpperCase()}\n                              </div>',
  `{(() => {
                                const otherId = channel.name.replace('dm_', '').split('_').find(id => id !== user.id);
                                const otherUser = allUsers.find(u => u.id === otherId);
                                if (otherUser?.avatar_url) {
                                  return <img src={otherUser.avatar_url} className="w-6 h-6 rounded-full object-cover mr-2 shadow-sm shadow-black/10 flex-shrink-0" alt="Avatar" />;
                                }
                                return (
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 shadow-sm shadow-black/10 flex-shrink-0" style={{ background: getAvatarGradient(getChannelDisplayName(channel)) }}>
                                      {getChannelDisplayName(channel).charAt(0).toUpperCase()}
                                  </div>
                                );
                              })()}`
);

fs.writeFileSync('src/components/MessagesDrawer.jsx', code);
console.log("Avatars patched!");
