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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { past, future } = await req.json()
    
    // Fetch Service Calls (Bypassing RLS)
    const { data: svcData, error: svcError } = await supabaseAdmin.from('service_calls').select(`
        id, status, urgency, call_type, issue_description, scheduled_start, metadata, assigned_techs,
        households ( household_name, contacts ( primary_phone ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
    `).gte('scheduled_start', `${past}T00:00:00`).lte('scheduled_start', `${future}T23:59:59`);

    // Fetch Opportunities (Bypassing RLS)
    const { data: oppData, error: oppError } = await supabaseAdmin.from('opportunities').select(`
        id, status, urgency_level, issue_description, scheduled_date, scheduled_time_block, proposal_data, metadata, assigned_crew_id,
        households ( household_name, contacts ( primary_phone ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
    `).gte('scheduled_date', past).lte('scheduled_date', future);

    return new Response(JSON.stringify({ svcData, oppData, svcError, oppError }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
