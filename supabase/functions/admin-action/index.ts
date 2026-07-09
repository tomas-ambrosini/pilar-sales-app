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

    if (action === 'createUser') {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: payload.email,
            password: payload.password || 'WelcomeToPilar123!',
            email_confirm: true,
            user_metadata: {
                full_name: payload.full_name,
                role: payload.role,
                department: payload.department
            }
        });
        if (authError) return new Response(JSON.stringify({ error: authError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });

        const { error: profileError } = await supabaseAdmin.from('user_profiles').insert({
            id: authData.user.id,
            full_name: payload.full_name,
            email: payload.email,
            phone: payload.phone || null,
            role: payload.role,
            department: payload.department,
            status: 'active'
        });
        if (profileError) {
            // Rollback auth user creation if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return new Response(JSON.stringify({ error: profileError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }
        
        return new Response(JSON.stringify({ success: true, user: authData.user }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
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
