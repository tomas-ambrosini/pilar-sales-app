import re

with open("src/pages/Proposals.jsx", "r") as f:
    text = f.read()

# 1. Remove the edit icon button
text = re.sub(r'<button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors" onClick=\{[^}]*handleEditOpen[^}]*\} title="Edit Details"><Edit2 size=\{16\} /></button>', '', text)

# 2. Remove state variables for editing
text = re.sub(r'  const \[editingProposal, setEditingProposal\] = useState\(null\);\n', '', text)
text = re.sub(r'  const \[editForm, setEditForm\] = useState\([^)]*\);\n', '', text)

# 3. Remove handleEditOpen, handleEditSubmit, handleReopenInWizard
text = re.sub(r'  const handleEditOpen = \([^)]*\) => \{\n(?:[^\n]*\n){1,5}  \};\n', '', text)
text = re.sub(r'  const handleEditSubmit = \([^)]*\) => \{\n(?:[^\n]*\n){1,8}  \};\n', '', text)

reopen_regex = r'  const handleReopenInWizard = \(\) => \{.*?\};\n'
text = re.sub(reopen_regex, '', text, flags=re.DOTALL)

# 4. Remove the Edit Proposal Modal JSX
modal_regex = r'      \{\/\* Edit Proposal Modal \*\/\}.*?</Modal>\n'
text = re.sub(modal_regex, '', text, flags=re.DOTALL)


with open("src/pages/Proposals.jsx", "w") as f:
    f.write(text)
print("done")
