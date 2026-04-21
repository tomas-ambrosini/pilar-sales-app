const fs = require('fs');
const file = '/Users/tomasambrosini/.gemini/antigravity/scratch/pilar-sales-app/src/components/ProposalViewerModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /(const TierCard = \(\{.*?\}\) => \{[\s\S]*?\n  \};\n\n)/;
const match = content.match(regex);
if (match) {
    const tierCardCode = match[1];
    
    // Remove it from current location
    content = content.replace(tierCardCode, '');
    
    // Append it before export default function ProposalViewerModal
    content = content.replace('export default function ProposalViewerModal(', tierCardCode + 'export default function ProposalViewerModal(');
    
    fs.writeFileSync(file, content);
    console.log('TierCard hoisted successfully!');
} else {
    console.log('TierCard not found');
}
