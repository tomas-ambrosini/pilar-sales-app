import fs from 'fs';

async function test() {
    const res = await fetch("https://rwzyejhpjayxpebxrybe.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44");
    const data = await res.json();
    
    // Find the definition for activity_logs
    const definitions = data.definitions || data.components?.schemas || {};
    console.log("Activity logs definition:");
    console.log(JSON.stringify(definitions['activity_logs'] || definitions['activity_log'], null, 2));
}
test();
