import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const url = process.env.VITE_SUPABASE_URL + '/rest/v1/opportunities?id=eq.726a03ff-786f-439d-8494-3768db3c2b6d';
    const res = await fetch(url, { headers: { 'apikey': process.env.VITE_SUPABASE_ANON_KEY }});
    const data = await res.json();
    console.log("Opportunity details:", data);
}
check();
