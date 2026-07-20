import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const fnUrl = process.env.VITE_SUPABASE_URL + '/functions/v1/admin-action';
    const body = { action: 'debugSchema' }; // this gets service_calls
    
    // Instead of debugSchema, let's just use POST to insert an activity_log
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@usac.com',
        password: 'WelcomeToPilar123!'
    });
    
    if (authError) {
        console.error("Auth:", authError);
        return;
    }
    
    const { error } = await supabase.from('activity_logs').insert({
        activity_type: 'Clock In',
        description: JSON.stringify({ event: 'Clock In' })
    });
    console.log("Insert error:", error);
}
test();
