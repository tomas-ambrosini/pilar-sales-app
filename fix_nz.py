with open('src/pages/CampPointsTracker.jsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip().startswith("'New Zealand':"):
        if not line.strip().endswith(","):
            lines[i] = line.rstrip('\n') + ",\n"
            break

with open('src/pages/CampPointsTracker.jsx', 'w') as f:
    f.writelines(lines)
