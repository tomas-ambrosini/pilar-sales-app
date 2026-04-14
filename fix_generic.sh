sed -i '' -e '/} else if (data?.systemTiers && data.systemTiers.length > 0) {/i\
                                                } else if (matchedTierData.equipmentList \&\& matchedTierData.equipmentList.length > 0) {\
                                                    targetSystems = matchedTierData.equipmentList.map(eq => {\
                                                        const parts = eq.split(": ");\
                                                        const sysName = parts.length > 1 ? parts[0] : "Package System";\
                                                        const modelStr = parts.length > 1 ? parts[1] : parts[0];\
                                                        const brandStr = modelStr ? modelStr.split(" ")[0] : matchedTierData.brand;\
                                                        const seriesStr = modelStr ? modelStr.split(" ").slice(1).join(" ") : matchedTierData.series;\
                                                        return {\
                                                            name: sysName,\
                                                            brand: brandStr,\
                                                            series: seriesStr,\
                                                            tons: matchedTierData.tons,\
                                                            specificTierName: matchedTierNameUpperCase,\
                                                            salesPrice: (matchedTierData.salesPrice || 0) / matchedTierData.equipmentList.length\
                                                        };\
                                                    });\
' src/components/ProposalDetailsModal.jsx
