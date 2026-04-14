export const DEFAULT_TEMPLATE_CONFIG = {
    companyInfo: {
        name: "Pilar Home Services Inc.",
        address: "123 Corporate Blvd, Ste 100",
        phone: "Miami, FL 33132",
        email: "Lic #CAC18192348"
    },
    terms: [
        "STANDARD WARRANTY: Pilar Services Inc. provides a 1-year comprehensive labor warranty on all new installations. Liability for circumstantial property damage due to pre-existing conditions is expressly waived.",
        "EPA COMPLIANCE: All refrigerant handling strictly follows Section 608 of the Clean Air Act. Equipment sizing is based on Manual J calculations standard to Florida Building Code.",
        "AUTHORIZATION: By digital acceptance, the authorizing party represents authority to contract improvements on the specified property. A mechanic's lien may be executed for failure to remit final payment."
    ],
    materials: ['Removal / Disposal', 'Refrigerant', 'Permitting'],
    companySignatureName: "Pilar Home Services"
};

/**
 * Normalizes a raw Supabase template record into a clean UI template config object.
 * Enforces safe fallback to defaults for any missing data.
 * @param {Object} dbTemplate - The raw template record fetched from Supabase.
 * @returns {Object} A safe, fully-hydrated template configuration object.
 */
export function normalizeContractTemplate(dbTemplate) {
    if (!dbTemplate) return DEFAULT_TEMPLATE_CONFIG;

    return {
        companyInfo: {
            name: dbTemplate.company_name || DEFAULT_TEMPLATE_CONFIG.companyInfo.name,
            address: dbTemplate.company_address || DEFAULT_TEMPLATE_CONFIG.companyInfo.address,
            phone: dbTemplate.company_phone || DEFAULT_TEMPLATE_CONFIG.companyInfo.phone,
            email: dbTemplate.company_email || DEFAULT_TEMPLATE_CONFIG.companyInfo.email
        },
        terms: (dbTemplate.terms && dbTemplate.terms.length > 0) 
            ? dbTemplate.terms 
            : DEFAULT_TEMPLATE_CONFIG.terms,
        materials: (dbTemplate.materials && dbTemplate.materials.length > 0)
            ? dbTemplate.materials
            : DEFAULT_TEMPLATE_CONFIG.materials,
        companySignatureName: dbTemplate.company_signature_name || DEFAULT_TEMPLATE_CONFIG.companySignatureName
    };
}
