# Pilar Home Platform - AI Handover Document

**Welcome to the Pilar Services Inc. (PSI) Enterprise Platform codebase.**
If you are reading this, it means you (the new AI Agent on the upgraded account) have been handed the reigns to continue building this application!

## 🏢 Project Overview
We are transforming a React/Vite/Supabase starter into an **Enterprise Role-Based Revenue Engine** specifically designed for an HVAC/Home Services company, adhering strictly to the *"OSC Flow"* Standard Operating Procedures.

**Live Vercel Production Link:** https://pilar-sales-app.vercel.app/
**Local Path:** `/Users/tomasambrosini/.gemini/antigravity/scratch/pilar-sales-app`

---

## 🏗️ What Was Completed (Up to Phase 10)
We successfully built out the **Sales Rep Commission Engine** and the foundation of the CRM/Proposal pipeline:

1. **The 3-Tier Quote System (Good, Better, Best)**
   - The `Proposals.jsx` wizard logic mathematically computes retail targets and profit margins based on raw equipment costs.
2. **Iron-Clad Margin Protection**
   - The pricing engine enforces an 85% "**PAR**" (Target Retail) and completely blocks any quotes that fall below the 75% "**Floor**".
3. **Commission Structure**
   - The Salesperson’s payout is actively calculated in `pricing.js` using the company’s specific OSC rules: 5% Base + 50% Overage for sales above PAR, and tiered penalties for sales below PAR.
4. **Supabase Pipeline Sync**
   - When a proposal is fired off, the exact JSON payload (including the chosen markup and commission data) is synced tightly to standard `opportunities` and `proposals` tables in Supabase for management review.
5. **UI / Aesthetics**
   - Modern Glassmorphism Tailwind UI. The CRM dashboard and proposal interface are active and fully operational.

---

## 🚀 Next Steps (Where You Need To Pick Up): Phase 11
Tomas's next major goal is to build out the **Dispatcher Hub** in `src/pages/DispatchHub.jsx`

**The Dispatcher Hub Requirements:**
- **Smart Intake Form:** Must follow the 9-step OSC call intake script. It should look up matching phone numbers in the `CustomerContext` and verify service addresses instantly.
- **Service Board:** A drag-and-drop dashboard to route jobs to the correct Field Technician/Subcontractor based on skillset and schedule availability.
- **Data Model:** Push these dispatches strictly to the `dispatches` table (schema provided in `dispatch_schema.sql`).

After Dispatch, we will move to:
- **Phase 12:** The Service Manager Experience (`Operations.jsx` approval queue and margin x-ray view).
- **Phase 13:** The Technician Portal / Invoice Generator.

---

## 🛠️ Stack Detals
- **Frontend Engine:** Vite / React
- **Styling:** TailwindCSS
- **Backend/DB:** Supabase (PostgreSQL)
- **Node Version:** Requires **`v22.12`** or higher.
- **Run Command:** `npm run dev`

### ⚠️ Note to the Next Agent:
Read the implementation plan `/Users/tomasambrosini/.gemini/antigravity/brain/.../implementation_plan.md` (or the previous conversation logs) for the deep architectural strategy. Tomas wants this designed as a highly scalable ERP, not just a simple MVP. **Aesthetics are critical.**

Good luck!
