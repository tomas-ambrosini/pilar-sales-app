import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('./.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("Starting Migration to Canonical Pipeline Enums...");

  const mappings = [
      { new: 'NEW_LEAD', legacy: ['New Lead'] },
      { new: 'CONTACTED', legacy: ['Contact Attempted', 'Contacted'] },
      { new: 'SURVEY_SCHEDULED', legacy: ['Site Survey Scheduled'] },
      { new: 'PROPOSAL_BUILDING', legacy: ['Proposal Building', 'Building Quote'] },
      { new: 'PROPOSAL_SENT', legacy: ['Proposal Sent'] },
      { new: 'APPROVED', legacy: ['Deal Won / Setup', 'Deal Won', 'Approved'] },
      { new: 'LOST', legacy: ['Lost Deal', 'Lost'] }
  ];

  for (const map of mappings) {
     for (const oldStatus of map.legacy) {
         const { data, error } = await supabase
            .from('opportunities')
            .update({ status: map.new })
            .eq('status', oldStatus)
            .select('id');
            
         if (error) {
             console.error(`Error migrating ${oldStatus}:`, error.message);
         } else if (data && data.length > 0) {
             console.log(`Migrated ${data.length} records from '${oldStatus}' -> '${map.new}'`);
         }
     }
  }

  console.log("Migration Complete.");
}

migrate();
