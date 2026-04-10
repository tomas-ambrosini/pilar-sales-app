import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          body,
          created_at,
          updated_at,
          sender_id,
          is_deleted,
          reply_to_id,
          attachment_url,
          attachment_type,
          sender:user_profiles ( full_name, role, avatar_url ),
          chat_reactions (
            id,
            user_id,
            emoji
          )
        `);
  console.log("Error:", error);
  console.log("Data size:", data?.length);
  if (data) console.log("Sample:", data[0]);
}

check();
