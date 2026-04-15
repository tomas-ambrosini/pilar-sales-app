import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const resendApiKey = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { proposalId } = await req.json()
    console.log(`[send-proposal] Invoked for proposal: ${proposalId}`)

    if (!proposalId) {
      throw new Error("Missing proposalId parameter")
    }

    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable")
    }

    // Initialize Supabase Admin Client to bypass RLS and fetch all necessary relations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the proposal to get customer name and associated opportunity (for emailing)
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('*, opportunities(household_id)')
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      throw new Error(`Failed to fetch proposal: ${proposalError?.message}`)
    }

    // Attempt to extract the customer's email from the CRM logic
    // The email usually lives on the household or primary contact.
    // If not, we check if it was stuffed in the frontend's customer/wizard object payload.
    let customerEmail = '';

    // First: Check if the frontend natively sent the email inside the proposal payload
    const dataBlob = proposal.proposal_data || {};
    if (dataBlob.wizard_state?.selectedCustomer?.email) {
        customerEmail = dataBlob.wizard_state.selectedCustomer.email;
    }

    // Second: Check households linked to opportunity
    if (!customerEmail && proposal.opportunities?.household_id) {
        const { data: household } = await supabaseAdmin
            .from('households')
            .select('email')
            .eq('id', proposal.opportunities.household_id)
            .single()
            
        if (household && household.email) {
            customerEmail = household.email;
        }
    }

    if (!customerEmail) {
      // For development/MVP testing safety, we will mock it or fail if absolutely necessary
      // We will throw an error since Resend requires a valid 'to' address
      throw new Error(`Could not locate a valid email address for customer: ${proposal.customer}`)
    }

    // Construct the payload
    const firstName = proposal.customer?.split(' ')[0] || 'there';
    // We assume the frontend application is running on lotarri.com
    const proposalLink = `https://lotarri.com/quote/${proposalId}`;

    const emailSubject = `Your Pilar Home Proposal`;
    const emailBodyTxt = `Hi ${firstName},\n\nYour Pilar Home proposal is ready. You can securely review your options here: \n\n${proposalLink}\n\nLet me know what you think when you're ready.\n\nBest,\nPilar Home`;

    // HTML Version
    const emailBodyHtml = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #0f172a; margin-bottom: 24px;">Hi ${firstName},</h2>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          Your Pilar Home proposal is ready. You can securely review your system options and finalize your choice using the link below:
        </p>
        <div style="margin: 32px 0;">
          <a href="${proposalLink}" style="background-color: #0f172a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
            View Your Options
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #64748b;">
          If the button above does not work, copy and paste this link into your browser:<br>
          <a href="${proposalLink}" style="color: #3b82f6;">${proposalLink}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="font-size: 12px; color: #94a3b8;">
          Best regards,<br>
          <strong>Pilar Home Sales Team</strong>
        </p>
      </div>
    `;

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'tomas@pilarservices.com',
        to: [customerEmail],
        subject: emailSubject,
        text: emailBodyTxt,
        html: emailBodyHtml,
      })
    })

    const resData = await res.json()
    console.log(`[send-proposal] Resend API Response:`, resData)

    if (!res.ok) {
      throw new Error(`Resend API Error: ${JSON.stringify(resData)}`)
    }

    return new Response(JSON.stringify({ success: true, message: "Email dispatched", resend_id: resData.id, to: customerEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`[send-proposal] Function failed:`, error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
