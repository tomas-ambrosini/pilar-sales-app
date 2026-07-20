import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const url = process.env.VITE_SUPABASE_URL + '/functions/v1/admin-action';
    const body = {
        action: 'updateUser',
        payload: { targetUserId: '00000000-0000-0000-0000-000000000000', metadata: { clock_status: { is_clocked_in: true } } }
    };
    
    // Test with admin key to just see what the function returns
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(body)
    });
    
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Result:", data);
}

test();
