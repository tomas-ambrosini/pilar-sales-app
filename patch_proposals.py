with open("src/pages/Proposals.jsx", "r") as f:
    content = f.read()

import re

# 1. Remove activeDraft state
content = re.sub(r'const \[activeDraft, setActiveDraft\] = useState\(null\);\n\s+', '', content)

# 2. Remove useEffect reading pilar_wizard_draft
target_effect = r'useEffect\(\(\) => \{\n\s*if \(!showWizard && typeof window !== \'undefined\'\) \{\n\s*const draftStr = localStorage\.getItem\(\'pilar_wizard_draft\'\);\n\s*if \(draftStr\) \{\n\s*try \{ setActiveDraft\(JSON\.parse\(draftStr\)\); \} catch\(e\)\{\}\n\s*\} else \{\n\s*setActiveDraft\(null\);\n\s*\}\n\s*\}\n\s*\}, \[showWizard\]\);\n\s*'
content = re.sub(target_effect, '', content)

# 3. Remove the entire activeDraft Unsaved Session JSX block
# Note: it's bounded by `{activeDraft && filterMode === 'All' && (` ... `)}` before the `.filter()`
target_jsx = r'\{activeDraft && filterMode === \'All\' && \(\n.*?\}\n\s*\)\}\n\s*\{'
# We replace it with just '{'
content = re.sub(target_jsx, '{', content, flags=re.DOTALL)

# Also fix the empty state `&& (!activeDraft || filterMode !== 'All')` which throws an error if activeDraft is gone
content = content.replace("if (filteredProposals.length === 0 && (!activeDraft || filterMode !== 'All')) {", "if (filteredProposals.length === 0) {")

# 4. Fix the Main Action Button onClick to pipe Drafts to Wizard
target_onclick = """onClick={() => {
                                       if (proposal.status === 'Approved') {
                                          const matchedTierName = proposal.proposal_data?.accepted_tier_name || ['good', 'better', 'best'].find(t => proposal.proposal_data?.tiers?.[t]?.salesPrice === proposal.amount) || 'good';
                                          const matchedTierData = proposal.proposal_data?.accepted_tier_data || proposal.proposal_data?.tiers?.[matchedTierName];
                                          setViewingContract({ proposal, tierName: matchedTierName.toUpperCase(), tierData: matchedTierData, date: proposal.date });
                                       } else {
                                          setViewingProposal(proposal);
                                       }
                                   }}"""

replacement_onclick = """onClick={() => {
                                       if (proposal.status === 'Approved') {
                                          const matchedTierName = proposal.proposal_data?.accepted_tier_name || ['good', 'better', 'best'].find(t => proposal.proposal_data?.tiers?.[t]?.salesPrice === proposal.amount) || 'good';
                                          const matchedTierData = proposal.proposal_data?.accepted_tier_data || proposal.proposal_data?.tiers?.[matchedTierName];
                                          setViewingContract({ proposal, tierName: matchedTierName.toUpperCase(), tierData: matchedTierData, date: proposal.date });
                                       } else if (proposal.status === 'Draft') {
                                          setWizardConfig({ id: proposal.id, ...proposal });
                                          setShowWizard(true);
                                       } else {
                                          setViewingProposal(proposal);
                                       }
                                   }}"""
content = content.replace(target_onclick, replacement_onclick)

with open("src/pages/Proposals.jsx", "w") as f:
    f.write(content)
print("Proposals done")
