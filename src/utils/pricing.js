// src/utils/pricing.js

/**
 * Calculate the retail price based on the best tier price (treated as PAR).
 * PAR is defined as 85% of retail.
 * @param {number} bestPrice - Sales price of the Best tier.
 * @returns {number} retail price
 */
export const getRetailFromBest = (bestPrice) => {
  if (!bestPrice) return 0;
  return bestPrice / 0.85;
};

/**
 * Calculate the floor price (75% of retail).
 * @param {number} retail - Retail price.
 * @returns {number} floor price
 */
export const getFloorPrice = (retail) => {
  return retail * 0.75;
};

/**
 * Compute commission based on the final sales price and the retail price.
 * Rules (from OSC SOP):
 *   - If price >= PAR (85% of retail): base 5% + 50% of overage.
 *   - Below PAR tiered rates: 82.5% => 4%, 80% => 3%, 77.5% => 2%.
 *   - Floor (75%) => 1%.
 * @param {number} price - Final sales price for the tier.
 * @param {number} retail - Retail price (100%).
 * @returns {number} commission amount in dollars
 */
export const computeCommission = (price, retail) => {
  if (!price || !retail) return 0;
  const discount = price / retail; // e.g., 0.85 = PAR
  if (discount >= 0.85) {
    const overage = price - retail * 0.85;
    return price * 0.05 + overage * 0.5;
  }
  if (discount >= 0.825) return price * 0.04; // 82.5% tier
  if (discount >= 0.80) return price * 0.03; // 80% tier
  if (discount >= 0.775) return price * 0.02; // 77.5% tier
  // Floor at 75% – 1% commission
  return price * 0.01;
};

/**
 * Helper to calculate the sales price for a tier.
 * This mirrors the existing calculateSalesPrice logic but is kept here for
 * centralisation. It can be imported wherever pricing is needed.
 */
export const calculateTierPrice = (rawEquipCost, tierType, margins) => {
  // Replicate the original calculation steps (tax, reserve, margin).
  const taxableMaterials = 0; // placeholder – actual addons handled elsewhere
  const nontaxableLabor = 0; // placeholder – actual addons handled elsewhere
  const taxRate = margins?.sales_tax || 0.07;
  const equipWithTax = (rawEquipCost + taxableMaterials) * (1 + taxRate);
  const totalHardCost = equipWithTax + nontaxableLabor;
  const costWithReserve = totalHardCost * (1 + (margins?.service_reserve || 0.05));
  let targetMargin = margins?.good_margin || 0.35;
  if (tierType === 'Better') targetMargin = margins?.better_margin || 0.40;
  if (tierType === 'Best') targetMargin = margins?.best_margin || 0.45;
  const salesPrice = costWithReserve / (1 - targetMargin);
  return Math.round(salesPrice);
};
