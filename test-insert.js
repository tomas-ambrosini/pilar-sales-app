import dotenv from 'dotenv';
dotenv.config();

async function test() {
    // 1. Authenticate to get valid sub token
    const authRes = await fetch(process.env.VITE_SUPABASE_URL + '/auth/v1/token?grant_type=password', {
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
    
    // 2. Try to insert
    const insertRes = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/activity_logs', {
        method: 'POST',
        headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + authData.access_token,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            activity_type: 'Clock In',
            description: JSON.stringify({ event: 'Clock In' }),
            created_by: authData.user.id
        })
    });
    
    const insertData = await insertRes.json();
    console.log("Insert result:", insertData);
}

test();
