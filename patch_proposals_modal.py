import re

with open("src/pages/Proposals.jsx", "r") as f:
    text = f.read()

# 1. Import ProposalDetailsModal
if "import ProposalDetailsModal" not in text:
    text = text.replace("import ProposalViewerModal", "import ProposalDetailsModal from '../components/ProposalDetailsModal';\nimport ProposalViewerModal")

# 2. Replace expandedProposalId with inspectingProposal
text = text.replace("const [expandedProposalId, setExpandedProposalId] = useState(null);", "const [inspectingProposal, setInspectingProposal] = useState(null);")

# 3. Update handleRowClick
def replacement_row_click(m):
    return "  const handleRowClick = (proposal) => {\n      setInspectingProposal(proposal);\n  };\n"

text = re.sub(r'  const handleRowClick = \([^)]*\) => \{\n(?:[^\n]*\n){0,3}  \};\n', replacement_row_click, text)

# 4. Remove accordion UI
# The accordion starts with <AnimatePresence initial={false}> and ends with {expandedProposalId === proposal.id && (...)} </AnimatePresence>
accordion_regex = r'<AnimatePresence initial=\{false\}>\n\s*\{expandedProposalId === proposal\.id && \(\n.*?</AnimatePresence>'
text = re.sub(accordion_regex, '', text, flags=re.DOTALL)

# 5. Fix handleRowClick usage in the row map 
text = re.sub(r'onClick=\{\(\) => handleRowClick\(proposal\.id\)\}', 'onClick={() => handleRowClick(proposal)}', text)

# 6. Add stopPropagation to action buttons. The Action column td already has onClick={(e) => e.stopPropagation()}
# Wait, let's verify if the td has it.
# td className="p-4 px-6 text-right" onClick={(e) => e.stopPropagation()} - Yes, it's there.

# 7. Render ProposalDetailsModal at the end
if "<ProposalDetailsModal" not in text:
    text = text.replace("{/* Digital Quote Viewer Modal */}", "{/* Internal Proposal Details Modal */}\n      <ProposalDetailsModal\n        proposal={inspectingProposal}\n        onClose={() => setInspectingProposal(null)}\n      />\n\n      {/* Digital Quote Viewer Modal */}")

with open("src/pages/Proposals.jsx", "w") as f:
    f.write(text)
print("done")
