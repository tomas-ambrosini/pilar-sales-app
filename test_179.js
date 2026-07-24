import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const url = process.env.VITE_SUPABASE_URL + '/rest/v1/proposals?customer=eq.ztest%20ztest&select=id,status,associated_opportunity_id,proposal_number,proposal_data';
    const res = await fetch(url, { headers: { 'apikey': process.env.VITE_SUPABASE_ANON_KEY }});
    const data = await res.json();
    console.log("Proposal:", data);
}
check();
