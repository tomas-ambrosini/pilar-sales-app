import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const url = process.env.VITE_SUPABASE_URL + '/rest/v1/'; // use rpc or query? We can't send raw DDL via REST unless we have an RPC.
    console.log("Supabase URL:", process.env.VITE_SUPABASE_URL);
}
test();
