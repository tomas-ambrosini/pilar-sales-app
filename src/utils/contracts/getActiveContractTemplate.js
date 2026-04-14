import { supabase } from '../../supabaseClient';

/**
 * Fetches the currently active template from the contract_templates table.
 * If multiple are active, returns the most recently updated one.
 * @returns {Promise<Object|null>} The raw database template object, or null if fetch fails or none exists.
 */
export async function getActiveContractTemplate() {
    try {
        const { data, error } = await supabase
            .from('contract_templates')
            .select('*')
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching active contract template from Supabase:', error.message);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Exception fetching active contract template:', err.message);
        return null;
    }
}
