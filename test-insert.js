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
    
    const { data, error } = await supabase.from('activity_logs').insert({
        activity_type: 'Clock In',
        description: JSON.stringify({ event: 'Clock In' })
    }).select();
    
    console.log("Insert result:", { data, error });
}
test();
