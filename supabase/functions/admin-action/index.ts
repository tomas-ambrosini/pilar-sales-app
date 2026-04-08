// supabase/functions/admin-action/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client connection using Service Role to bypass RLS and talk to Auth Admin API
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify invoking user is an ADMIN
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);

    if (verifyError || !user) {
      throw new Error('Invalid token');
    }

    // Check custom role in user_profiles
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'ADMIN' || profile?.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin privileges required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, payload } = await req.json();

    if (action === 'createUser') {
      const { email, password, full_name, username, role } = payload;
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true // bypass email verification for internal accounts
      });

      if (createError) throw createError;

      // Ensure profile writes correctly
      await supabaseAdmin.from('user_profiles').upsert({
        id: newUser.user.id,
        email,
        full_name,
        username,
        role: role || 'SALES',
        status: 'active',
        must_change_password: true
      });

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'updateUser') {
       const { targetUserId, role, status } = payload;

       // Safeguard: Cannot deactivate self
       if (targetUserId === user.id && status === 'inactive') {
          throw new Error('Self-lockout safeguard: You cannot deactivate your own account.');
       }

       const { error: updateError } = await supabaseAdmin.from('user_profiles')
          .update({ role, status })
          .eq('id', targetUserId);
          
       if (updateError) throw updateError;
       
       return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'resetPassword') {
       const { targetUserId, newPassword } = payload;
       const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: newPassword });
       if (error) throw error;
       
       // Force prompt on next login
       await supabaseAdmin.from('user_profiles').update({ must_change_password: true }).eq('id', targetUserId);

       return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
