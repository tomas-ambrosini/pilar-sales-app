import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const authRes = await fetch(process.env.VITE_SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: 'tomas@pilar.com', password: 'WelcomeToPilar123!' }) // logging in as admin
    });
    
    const authData = await authRes.json();
    if (authData.error) {
        console.error("Auth error", authData);
        return;
    }
    
    const token = authData.access_token;
    
    // Fetch Clock Ins
    const actRes = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/activity_logs?activity_type=in.(Clock In,Clock Out)', {
        headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token
        }
    });
    const actData = await actRes.json();
    console.log("Admin fetched clock logs:", actData);
}

test();
