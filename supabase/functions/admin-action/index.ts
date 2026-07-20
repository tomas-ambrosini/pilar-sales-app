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

    if (action === 'resolveUsername') {
        const { username } = payload;
        const { data, error } = await supabaseAdmin.from('user_profiles').select('email').ilike('username', username).single();
        if (error || !data) return new Response(JSON.stringify({ error: 'User not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
        return new Response(JSON.stringify({ email: data.email }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
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
    if (action === 'updateUser') {
        const { targetUserId, ...updates } = payload;
        
        // Update auth metadata if applicable
        if (updates.password || updates.role || updates.department) {
            const authUpdates: any = {};
            if (updates.password) authUpdates.password = updates.password;
            
            const metaUpdates: any = {};
            if (updates.role) metaUpdates.role = updates.role;
            if (updates.department) metaUpdates.department = updates.department;
            
            if (Object.keys(metaUpdates).length > 0) {
                authUpdates.user_metadata = metaUpdates;
            }
            
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, authUpdates);
            if (authError) return new Response(JSON.stringify({ error: authError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }
        
        // Update user_profiles
        // Remove password before updating user_profiles since it doesn't belong there
        const profileUpdates = { ...updates };
        delete profileUpdates.password;
        
        if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabaseAdmin.from('user_profiles').update(profileUpdates).eq('id', targetUserId);
            if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'updateCrew') {
        const { targetCrewId, ...updates } = payload;
        const { data, error } = await supabaseAdmin.from('crews').update(updates).eq('id', targetCrewId).select();
        return new Response(JSON.stringify({ success: !error, data, error: error?.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error ? 400 : 200 });
    }

    if (action === 'deleteCrew') {
        const { targetCrewId } = payload;
        const { error } = await supabaseAdmin.from('crews').delete().eq('id', targetCrewId);
        return new Response(JSON.stringify({ success: !error, error: error?.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error ? 400 : 200 });
    }

    if (action === 'deleteServiceCall') {
        const { error } = await supabaseAdmin.from('service_calls').delete().eq('id', payload.callId);
        return new Response(JSON.stringify({ error }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error ? 400 : 200 });
    }

    if (action === 'fetchMyDayJobs') {
        const { past, future } = payload;
        
        // Fetch Service Calls (Bypassing RLS)
        const { data: svcData } = await supabaseAdmin.from('service_calls').select(`
            id, status, urgency, call_type, issue_description, scheduled_start, metadata, assigned_techs,
            households ( household_name, contacts ( primary_phone ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
        `).gte('scheduled_start', `${past}T00:00:00`).lte('scheduled_start', `${future}T23:59:59`);

        // Fetch Opportunities (Bypassing RLS)
        const { data: oppData } = await supabaseAdmin.from('opportunities').select(`
            id, status, urgency_level, issue_description, scheduled_date, scheduled_time_block, proposal_data, metadata, assigned_crew_id,
            households ( household_name, contacts ( primary_phone ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
        `).gte('scheduled_date', past).lte('scheduled_date', future);

        return new Response(JSON.stringify({ svcData, oppData }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'fetchTimeLogs') {
        const { targetUserId } = payload;
        const { data, error } = await supabaseAdmin.from('activity_logs')
            .select('*')
            .eq('created_by', targetUserId)
            .in('activity_type', ['Clock In', 'Clock Out'])
            .order('created_at', { ascending: false });
        
        return new Response(JSON.stringify({ data, error }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Action not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
