import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    realtime: { transport: ws }
});

async function testInsert() {
    const invoiceData = {
        proposal_id: 'cf41ce30-99c5-4303-a178-5a210fc1bb97', // just a fake id
        invoice_type: 'Recurring Maintenance',
        total_contract_amount: 100,
        deposit_collected: 0,
        balance_due: 100,
        status: 'Pending',
        due_date: new Date().toISOString()
    };
    const { error } = await supabase.from('invoices').insert([invoiceData]);
    console.log("Error:", error);
}
testInsert();
