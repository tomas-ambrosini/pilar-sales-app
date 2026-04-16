import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseKey);

function parseContent(filePath, brandName) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    const systems = [];
    let currentCondenser = null;
    let currentTons = null;

    for (const line of lines) {
        // MATCH: 1.5 Ton | DRHP14B18AJ1AN | $1,385.00 | ...
        const tonsMatch = line.match(/^(\d+(?:\.\d+)?)\s+Ton\s+\|\s+([A-Z0-9*-]+)\s+\|\s+\$([\d,]+(?:\.\d+)?)/);
        if (tonsMatch) {
            currentTons = parseFloat(tonsMatch[1]);
            currentCondenser = tonsMatch[2];
            continue;
        }

        // MATCH Air Handler line:
        // DRAH2TB2417ASTNNJ 42-1/2x17-1/2x21-11/16 208/230 $625.00 RXBH-1724A05J-B $104.20 14.3 9.0 7.5 17,100 214575732 $2,114.20
        // Sometime heat kit isn't there, so we make heat kit optional if needed, but let's just do a robust regex or split 
        
        if (currentCondenser && line.trim().length > 20 && !line.includes('Air Handler') && !line.includes('Warranty') && !line.startsWith('Page') && !line.startsWith('Ferguson') && !line.includes('Table of Contents')) {
            const parts = line.trim().split(/\s+/);
            // It usually starts with AHU model:
            const ahuModel = parts[0];
            
            // To find Total Price: it's usually the very last string in the line starting with $
            const lastPart = parts[parts.length - 1];
            if (lastPart.startsWith('$')) {
                const totalText = lastPart.replace('$', '').replace(',', '');
                const systemCost = parseFloat(totalText);

                // SEER(2) rating is usually the first digit-only with a decimal after the 2nd $ sign.
                // Let's just find the first number between 13.0 and 22.0 that matches a float pattern.
                let seer = 14.0;
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].match(/^\d{2}\.\d$/)) {
                        const val = parseFloat(parts[i]);
                        if (val >= 13.0 && val <= 25.0) {
                            seer = val;
                            break;
                        }
                    }
                }

                systems.push({
                    brand: brandName,
                    series: '2026 ' + brandName,
                    tons: currentTons,
                    seer: seer,
                    condenser_model: currentCondenser,
                    ahu_model: ahuModel,
                    system_cost: systemCost,
                    retail_price: systemCost * 2.15 // Default placeholder markup
                });
            }
        }
    }
    return systems;
}

async function run() {
    console.log("Parsing Durastar...");
    const durastarSys = parseContent('/Users/tomasambrosini/.gemini/antigravity/scratch/durastar_extracted.txt', 'Durastar');
    console.log(`Found ${durastarSys.length} Durastar systems`);

    console.log("Parsing RUUD...");
    const ruudSys = parseContent('/Users/tomasambrosini/.gemini/antigravity/scratch/ruud_extracted.txt', 'RUUD');
    console.log(`Found ${ruudSys.length} RUUD systems`);

    const allSystems = [...durastarSys, ...ruudSys];
    console.log(`Total Systems: ${allSystems.length}`);

    // clear placeholders
    await supabase.from('equipment_catalog').delete().eq('brand', 'Pilar Default');

    // Insert new
    // supabase insert takes max 1000 rows. We'll do chunks.
    const chunkSize = 500;
    for (let i=0; i<allSystems.length; i+=chunkSize) {
        const chunk = allSystems.slice(i, i+chunkSize);
        const { error } = await supabase.from('equipment_catalog').insert(chunk);
        if (error) {
            console.error("Error inserting chunk", error);
        } else {
            console.log(`Inserted chunk of ${chunk.length} items.`);
        }
    }
}

run();
