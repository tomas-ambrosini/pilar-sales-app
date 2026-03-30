# 🧠 INITIALIZATION PROTOCOL: Pilar Home Platform

**ATTENTION NEW AI**: You are picking up development of the **Pilar Services Inc. (PSI) Enterprise Platform**. This document is a strict neural-transfer of the previous AI's context. You must read this entire document and internalize the user's goals, aesthetic standards, and business logic before taking any action.

---

## 🏢 1. Project Overview & Aesthetic Standard
This is NOT a simple internal tool or MVP. You are building a **Best-in-Class, Monday.com-inspired Enterprise ERP/CRM** for a residential HVAC & Home Services company.

* **Target Aesthetic:** You MUST use rich aesthetics. Modern web design, vibrant colors, dark modes, glassmorphism, dynamic micro-animations, and smooth hover effects. If the UI you build looks like a generic Bootstrap dashboard, you have failed. Use smooth gradients and rich typography. Provide a responsive, dynamic layout that feels alive. 
* **Tech Stack:** React, Vite, TailwindCSS (for all styling, heavily utilizing custom utilities/glass effects), and Supabase (PostgreSQL). Node v22.12+.

---

## ⚙️ 2. Core Business Logic (The OSC System)
The entire application revolves around strict HVAC Operational Standard Procedures (OSC).

### A. The Pricing & Margin Engine (Iron-Clad Rules)
* **The 3-Tier System:** All quotes must present a "Best, Better, Good" matrix. 
* **Margin Protection:** We explicitly hide dealer cost, labor costs, and gross margins from the customer-facing views. 
* **Target Retail (PAR):** The system dynamically computes the required retail price based on an 85% "PAR" target over raw equipment cost. 
* **Floor Limit:** The system absolutely blocks reps from quoting below a 75% Floor limit.
* **Commission Formula:** The Salesperson’s payout is actively calculated inside `pricing.js` using specific OSC rules: 5% Base + 50% Overage for sales above PAR, and tiered penalties for sales below PAR.

### B. The Operations Pipeline
The lifecycle of a job flows strictly left-to-right:
1. **Dispatcher Hub (Phase 11 - Currently Active):** Handles the 9-Step OSC inbound call script (Reverse phone lookup via `CustomerContext`, age of system, routing). Drops the job into the drag-and-drop Service Board.
2. **Sales Pipeline:** A Kanban board tracking: `New Lead` -> `Contact Attempted` -> `Site Survey Scheduled` -> `Proposal Building` -> `Proposal Sent` -> `Deal Won` -> `Job Completed` (or `Lost`).
3. **Data Sync:** Every proposal and dispatch action natively writes JSON payloads to Supabase (`opportunities`, `households`, `proposals` tables).

---

## 🚀 3. What Has Been Completed So Far (Phases 1-11)
You are inheriting a massive, highly functional codebase. Do not reinvent the wheel. Rely on the existing contexts.
* **Global Contexts:** `AuthContext`, `CustomerContext` (relational DB syncing), `CatalogContext` (HVAC equipment pricing), `ProposalContext`.
* **The Proposal Wizard:** Located in `Proposals.jsx`, it fetches equipment, calculates complex retail pricing/commissions, generates the JSON envelope, and renders the `ProposalViewerModal.jsx`. 
* **Sales Pipeline:** A massive drag-and-drop Kanban board (`SalesPipeline.jsx`).
* **Dispatcher Hub:** A brand new dual-pane interface (`DispatchHub.jsx`) featuring a smart intake form that syncs perfectly with a horizontal scheduling queue and matrix calendar.

---

## 🗺️ 4. Your First Objective (Phase 12)
The user is transferring to your instance to utilize your larger context window/credit limits to continue the roadmap.

Tomas's next major goal is to build out **The Service Manager Experience (Phase 12)** inside `src/pages/Operations.jsx`.

**Phase 12 Requirements:**
- **Manager Approval Queue:** A dashboard where the Service Manager can review all "Deals Won" that have signed proposals.
- **Margin X-Ray View:** A hidden, internal-only view that breaks down exactly what the Sales Rep sold the job for, the equipment hard costs, labor payouts, and the true net margin of the job.
- **Red Flags:** The system should automatically flag deals where the margin is dangerously low or the salesperson took a penalty.

---

### 👉 Instructions for the New AI:
Acknowledge that you have read this Initialization Protocol. Treat the user as a VIP. Do not ask redundant questions about the pricing logic—it is already documented here. Look at `Operations.jsx` and generate an implementation plan for Phase 12!
