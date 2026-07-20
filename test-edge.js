import dotenv from 'dotenv';
dotenv.config();

async function test() {
    // Call the edge function DIRECTLY
    const res = await fetch(process.env.VITE_SUPABASE_URL + '/functions/v1/admin-action', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'insertTimeLog',
            payload: {
                targetUserId: '88888888-8888-8888-8888-888888888888', // random uuid
                activity_type: 'Clock In',
                description: 'test'
            }
        })
    });
    
    const data = await res.json();
    console.log("Edge Function result:", data);
}
test();
