import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const url = process.env.VITE_SUPABASE_URL + '/rest/v1/activity_logs';
    const body = {
        activity_type: 'Clock In',
        description: JSON.stringify({ event: 'Clock In' }),
        // created_by is usually set by RLS or required, let's omit household_id
    };
    
    // We can't insert without auth unless RLS is off.
    // Let's use VITE_SUPABASE_ANON_KEY but how to authenticate?
    // Let's fetch the token using edge function, wait, no. Let's just use REST API for auth!
    
    const authUrl = process.env.VITE_SUPABASE_URL + '/auth/v1/token?grant_type=password';
    const authRes = await fetch(authUrl, {
        method: 'POST',
        headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: 'test@usac.com', password: 'WelcomeToPilar123!' })
    });
    
    const authData = await authRes.json();
    if (authData.error) {
        console.error("Auth error", authData);
        return;
    }
    
    const token = authData.access_token;
    body.created_by = authData.user.id;
    
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", data);
}
test();
