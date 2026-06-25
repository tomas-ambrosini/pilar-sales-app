import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log("--- Testing Environment Variables ---");
if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
    console.log("✅ SUCCESS: .env variables are successfully loaded and detected!");
    console.log(`URL format valid: ${process.env.VITE_SUPABASE_URL.startsWith('https://')}`);
} else {
    console.error("❌ FAIL: Environment variables missing.");
}
