import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const authRes = await fetch(process.env.VITE_SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: 'tomas@pilar.com', password: 'WelcomeToPilar123!' }) // admin login
    });
    
    const authData = await authRes.json();
    const token = authData.access_token;
    
    const res = await fetch(process.env.VITE_SUPABASE_URL + '/rest/v1/user_profiles?limit=1', {
        headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + token
        }
    });
    const data = await res.json();
    console.log("User Profiles keys:", data.length > 0 ? Object.keys(data[0]) : "No data");
}
test();
