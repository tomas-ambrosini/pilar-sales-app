#!/bin/bash
sed -i '' 's/const systems = baseSystems.map((baseSys, idx) => {/const getPopulatedObj = (objA, objB) => (objA \&\& Object.keys(objA).length > 0) ? objA : (objB || {});\
\
    const systems = baseSystems.map((baseSys, idx) => {/g' src/components/ProposalDetailsModal.jsx

sed -i '' 's/survey: baseSys.survey || rawSys.survey || {},/survey: getPopulatedObj(baseSys.survey, rawSys.survey),/g' src/components/ProposalDetailsModal.jsx
sed -i '' 's/photos: baseSys.photos || rawSys.photos || {},/photos: getPopulatedObj(baseSys.photos, rawSys.photos),/g' src/components/ProposalDetailsModal.jsx

# Fix the duplicate Generic Package for Clark Kent
sed -i '' 's/} else {/} else if (idx === 0) {/g' src/components/ProposalDetailsModal.jsx
