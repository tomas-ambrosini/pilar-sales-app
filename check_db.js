import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
  const { data } = await supabase.from('proposals').select('*').eq('id', 'PR-1051').single()
  console.log(JSON.stringify(data, null, 2))
}
test()
