with open("src/pages/Proposals.jsx", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "{proposal.status !== 'Approved' && (" in line and lines[i+2].strip() == ")}":
        pass # Skip this line
    elif i > 0 and "{proposal.status !== 'Approved' && (" in lines[i-1] and lines[i+1].strip() == ")}":
        pass # Skip empty line inside
    elif i > 1 and "{proposal.status !== 'Approved' && (" in lines[i-2] and line.strip() == ")}":
        pass # Skip the closing brace
    else:
        new_lines.append(line)

with open("src/pages/Proposals.jsx", "w") as f:
    f.writelines(new_lines)
print("syntax fixed")
