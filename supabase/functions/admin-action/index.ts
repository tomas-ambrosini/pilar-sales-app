import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, payload } = await req.json()
    
    if (action === 'debugSchema') {
        const { data, error } = await supabaseAdmin.from('service_calls').select('*').limit(1);
        return new Response(JSON.stringify({ columns: data ? Object.keys(data[0] || {}) : [], error }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // fallback for existing actions
    if (action === 'deleteServiceCall') {
        const { error } = await supabaseAdmin.from('service_calls').delete().eq('id', payload.callId);
        return new Response(JSON.stringify({ error }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error ? 400 : 200 });
    }

    return new Response(JSON.stringify({ error: 'Action not found' }), { status: 400 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
