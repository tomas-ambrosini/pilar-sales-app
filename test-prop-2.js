const getEstValueDisplay = (proposal) => {
    let finalMin, finalMax, hasRange = false;
    
    if (proposal.proposal_data?.systemTiers && proposal.proposal_data.systemTiers.length > 0) {
        let totalMin = 0;
        let totalMax = 0;
        let validSystemsCount = 0;
        
        proposal.proposal_data.systemTiers.forEach(sys => {
            const sysTiersObj = sys.tiers || (sys.altTracks && sys.altTracks[0]?.tiers) || sys.altTiers;
            if (sysTiersObj) {
                const sysPrices = [sysTiersObj.good?.salesPrice, sysTiersObj.better?.salesPrice, sysTiersObj.best?.salesPrice].filter(Boolean);
                if (sysPrices.length > 0) {
                    totalMin += Math.min(...sysPrices);
                    totalMax += Math.max(...sysPrices);
                    validSystemsCount++;
                }
            }
        });
        
        if (validSystemsCount > 0) {
            finalMin = totalMin;
            finalMax = totalMax;
            hasRange = true;
        }
    }
    
    if (!hasRange) {
        const tiers = proposal.proposal_data?.tiers || {};
        const legacyPrices = [tiers.good?.salesPrice, tiers.better?.salesPrice, tiers.best?.salesPrice].filter(Boolean);
        if (legacyPrices.length > 0) {
            finalMin = Math.min(...legacyPrices);
            finalMax = Math.max(...legacyPrices);
            hasRange = true;
        }
    }
    
    return { min: finalMin, max: finalMax, hasRange };
};

const fakeProp = {
    proposal_data: {
        systemTiers: [
            {
               tiers: { good: { salesPrice: 5000 }, better: { salesPrice: 6000 }, best: { salesPrice: 8000 } }
            },
            {
               tiers: { good: { salesPrice: 4000 }, better: { salesPrice: 5000 }, best: { salesPrice: 6000 } }
            }
        ],
        tiers: { good: { salesPrice: 9000 }, better: { salesPrice: 11000 }, best: { salesPrice: 14000 } }
    }
};

console.log(getEstValueDisplay(fakeProp));

