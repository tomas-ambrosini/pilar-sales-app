const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function run() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/crews?crew_name=eq.Testing%20Crew%201`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey': process.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
    }
  });
  console.log('Status:', res.status);
}

run();
