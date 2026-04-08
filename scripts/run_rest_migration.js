const url = "https://rwzyejhpjayxpebxrybe.supabase.co/rest/v1/opportunities";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44";

const headers = {
  "apikey": key,
  "Authorization": `Bearer ${key}`,
  "Content-Type": "application/json",
  "Prefer": "return=minimal"
};

const mappings = [
    { new: 'NEW_LEAD', legacy: 'New Lead' },
    { new: 'CONTACTED', legacy: 'Contact Attempted' },
    { new: 'CONTACTED', legacy: 'Contacted' },
    { new: 'SURVEY_SCHEDULED', legacy: 'Site Survey Scheduled' },
    { new: 'PROPOSAL_BUILDING', legacy: 'Proposal Building' },
    { new: 'PROPOSAL_BUILDING', legacy: 'Building Quote' },
    { new: 'PROPOSAL_SENT', legacy: 'Proposal Sent' },
    { new: 'APPROVED', legacy: 'Deal Won / Setup' },
    { new: 'APPROVED', legacy: 'Deal Won' },
    { new: 'APPROVED', legacy: 'Approved' },
    { new: 'LOST', legacy: 'Lost Deal' },
    { new: 'LOST', legacy: 'Lost' }
];

async function run() {
   for (let m of mappings) {
      try {
         const res = await fetch(`${url}?status=eq.${encodeURIComponent(m.legacy)}`, {
             method: 'PATCH',
             headers,
             body: JSON.stringify({ status: m.new })
         });
         console.log(`Migrated ${m.legacy} -> ${m.new} (${res.status})`);
      } catch (e) {
         console.error(e);
      }
   }
}

run();
