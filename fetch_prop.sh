source .env
curl -s -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  "$VITE_SUPABASE_URL/rest/v1/proposals?id=eq.39&select=proposal_data" > prop39.json
cat prop39.json | grep -o 'wizard_state' | head -n 1
