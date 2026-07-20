import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    // Auth
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'test@usac.com',
        password: 'WelcomeToPilar123!'
    });
    
    const user = authData?.user;
    if (!user) { console.error("No user"); return; }
    
    console.log("Invoking edge function...");
    const { data: insertData, error: insertError } = await supabase.functions.invoke('admin-action', {
        body: {
            action: 'insertTimeLog',
            payload: {
                targetUserId: user.id,
                activity_type: 'Clock In',
                description: JSON.stringify({ event: 'Clocked In', timestamp: new Date().toISOString() })
            }
        }
    });
    
    console.log("Insert result:", { insertData, insertError });
}
test();
