import React, { useState, useEffect } from 'react';
import { computeCommission, getRetailFromBest, getFloorPrice } from '../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useCustomers } from '../context/CustomerContext';
import { useAuth } from '../context/AuthContext';
import { useProposals } from '../context/ProposalContext';
import { Check, Image as ImageIcon, Layers, Tag, DollarSign, Calculator, AlertTriangle, ArrowRight, ArrowLeft, Save, Clock, RefreshCcw, Edit2, X, Search, Box } from 'lucide-react';

export default function ProposalWizard({ onComplete, addProposal, updateProposal, editModeData }) {
  const hasPreloadedData = typeof editModeData === 'object' && editModeData !== null;
  const isDraftLaunch = hasPreloadedData && (editModeData.isDraft === true || editModeData.status === 'Draft');
  const isEditing = hasPreloadedData && editModeData.id != null && !isDraftLaunch;
  const editingId = isEditing ? editModeData.id : null;
  
  const [step, setStep] = useState(() => {
     if (isEditing) return 6;
     if (isDraftLaunch) {
         const savedStep = editModeData.proposal_data?.wizard_state?.step;
         return typeof savedStep === 'number' && savedStep > 0 ? savedStep : 1;
     }
     return 1;
  });
  const { customers } = useCustomers();
  const { user } = useAuth();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  
  const generateEmptySystem = (id) => ({
    id,
    name: `System ${id}`,
    survey: {
      systemType: '', currentTonnage: '', gasRefrigerant: 'R410A', existingBrand: '', yearManufactured: '',
      mainBreakerAmps: '', condenserBreaker: '', disconnectCondition: 'Pass', whipCondition: 'Pass',
      condenserLocation: '', ahuLocation: '', ductCondition: '', condensateType: '', thermostat: '',
      m1: '', m2: '', m3: '', m4: '', m5: '', m6: '', m7: '', m8: '', m9: '', m10: '',
      m11: '', m12: '', m13: '', m14: '', m15: '', m16: '', m17: '',
      m18: '', m19: '', m20: '', m21: '', m22: '', m23: '', m24: '', m25: '', m26: '', m27: ''
    },
    photos: { condenser_wide: null, condenser_data_plate: null, indoor_unit_wide: null, indoor_data_plate: null, electrical_panel_open: null },
    tonnageFilter: '',
    primaryBrandFilter: '',
    selectedTiers: { best: null, better: null, good: null },
    alternateTracks: [],
    addons: {}
  });

  const [systems, setSystems] = useState([generateEmptySystem(1)]);
  const [activeSystemId, setActiveSystemId] = useState(1);
  const [activeStep5Track, setActiveStep5Track] = useState({});
  const [editingSystemNameId, setEditingSystemNameId] = useState(null);

  const handleSystemNameChange = (id, newName) => {
     setSystems(prev => prev.map(sys => sys.id === id ? { ...sys, name: newName } : sys));
  };
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);

  const activeSystem = systems.find(s => s.id === activeSystemId) || systems[0];
  const { survey, photos, tonnageFilter, primaryBrandFilter, selectedTiers, alternateTracks = [], addons } = activeSystem;

  const updateActiveSystem = (field, value) => {
     setSystems(prev => prev.map(sys => sys.id === activeSystemId ? { ...sys, [field]: value } : sys));
  };
  const setSurvey = (val) => updateActiveSystem('survey', typeof val === 'function' ? val(survey) : val);
  const setPhotos = (val) => updateActiveSystem('photos', typeof val === 'function' ? val(photos) : val);
  const setTonnageFilter = (val) => updateActiveSystem('tonnageFilter', typeof val === 'function' ? val(tonnageFilter) : val);
  const setPrimaryBrandFilter = (val) => updateActiveSystem('primaryBrandFilter', typeof val === 'function' ? val(primaryBrandFilter) : val);
  const setSelectedTiers = (val) => updateActiveSystem('selectedTiers', typeof val === 'function' ? val(selectedTiers) : val);
  const setAlternateTracks = (val) => updateActiveSystem('alternateTracks', typeof val === 'function' ? val(alternateTracks) : val);
  const setAddons = (val) => updateActiveSystem('addons', typeof val === 'function' ? val(addons) : val);

  // Live Database Arrays
  const [catalog, setCatalog] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [margins, setMargins] = useState({ 
     sales_tax: 0.07, service_reserve: 0.05, good_margin: 0.35, better_margin: 0.40, best_margin: 0.45 
  });
  const [dbReady, setDbReady] = useState(false);
  const [addonSearchTerm, setAddonSearchTerm] = useState('');
  
  const { createDraft } = useProposals();
  const [draftServerId, setDraftServerId] = useState((isEditing || isDraftLaunch) ? editModeData.id : null);
  const syncTimer = React.useRef(null);
  const isInitializingDraft = React.useRef(false);
  const [manualSaveStatus, setManualSaveStatus] = useState(null);

  const handleManualSave = async () => {
    if (!selectedCustomerId) {
      onComplete();
      return;
    }
    
    setManualSaveStatus('saving');
    
    const draftPayload = {
        wizard_state: { step, selectedCustomerId, selectedLocationId, systems, appliedPromo },
        associated_opportunity_id: editModeData?.associated_opportunity_id || null
    };
    
    const customerName = selectedCustomerId 
        ? customers.find(c => c.id === selectedCustomerId)?.name || 'Unknown' 
        : 'Unknown Customer';

    try {
        if (!draftServerId) {
            const newDraft = await createDraft({
                customer: customerName,
                amount: 0,
                associated_opportunity_id: draftPayload.associated_opportunity_id,
                proposal_data: draftPayload
            });
            if (newDraft && newDraft.id) {
                setDraftServerId(newDraft.id);
            }
        } else {
            await updateProposal(draftServerId, {
                customer: customerName,
                proposal_data: draftPayload,
                associated_opportunity_id: draftPayload.associated_opportunity_id,
                updated_at: new Date().toISOString()
            });
        }
        
        onComplete();
    } catch (err) {
        setManualSaveStatus('error');
    }
  };

  useEffect(() => {
    if (selectedCustomerId !== '' && dbReady) {
      if (syncTimer.current) clearTimeout(syncTimer.current);

      syncTimer.current = setTimeout(async () => {
         const draftPayload = {
            wizard_state: { step, selectedCustomerId, selectedLocationId, systems, appliedPromo },
            associated_opportunity_id: editModeData?.associated_opportunity_id || null
         };
         
         const customerName = selectedCustomerId 
             ? customers.find(c => c.id === selectedCustomerId)?.name || 'Unknown' 
             : 'Unknown Customer';

         if (!draftServerId) {
             if (isInitializingDraft.current) return;
             isInitializingDraft.current = true;
             
             try {
                const newDraft = await createDraft({
                    customer: customerName,
                    amount: 0,
                    associated_opportunity_id: draftPayload.associated_opportunity_id,
                    proposal_data: draftPayload
                });
                if (newDraft && newDraft.id) {
                    setDraftServerId(newDraft.id);
                }
             } finally {
                if (!draftServerId) {
                   isInitializingDraft.current = false;
                }
             }
         } else {
             await updateProposal(draftServerId, {
                 customer: customerName,
                 proposal_data: draftPayload,
                 associated_opportunity_id: draftPayload.associated_opportunity_id,
                 updated_at: new Date().toISOString()
             });
         }
      }, 1500);
    }
    
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [step, selectedCustomerId, selectedLocationId, systems, appliedPromo, dbReady, isEditing, draftServerId]);

  // Handle Edit/Clone Mode Rehydration
  useEffect(() => {
    if (hasPreloadedData) {
        const draft = editModeData?.proposal_data?.wizard_state;
        if (draft && Object.keys(draft).length > 0) {
            try {
               if (draft.selectedCustomerId) setSelectedCustomerId(draft.selectedCustomerId);
               if (draft.selectedLocationId) setSelectedLocationId(draft.selectedLocationId);
               if (draft.systems) {
                   setSystems(draft.systems);
                   setActiveSystemId(draft.systems[0].id);
               } else if (draft.survey) {
                   setSystems([{
                       id: 1, name: "System 1", survey: draft.survey, photos: draft.photos || {}, tonnageFilter: draft.tonnageFilter || '',
                       selectedTiers: draft.selectedTiers || { best: null, better: null, good: null }, addons: draft.addons || {}
                   }]);
               }
               if (draft.appliedPromo !== undefined) setAppliedPromo(draft.appliedPromo);
            } catch(e) {}
        } else {
            // Failsafe
            setStep(1);
        }
    }
  }, [hasPreloadedData, editModeData]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setValidatingPromo(true);
    setPromoError('');
    
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoInput.trim().toUpperCase())
        .single();
        
      if (error || !data) {
        setPromoError('Invalid promo code');
        setValidatingPromo(false);
        return;
      }
      
      if (!data.is_active) {
        setPromoError('This promo code is no longer active');
        setValidatingPromo(false);
        return;
      }
      
      const now = new Date();
      if (data.starts_at && new Date(data.starts_at) > now) {
         setPromoError('This promo code is not active yet');
         setValidatingPromo(false);
         return;
      }
      if (data.expires_at && new Date(data.expires_at) < now) {
         setPromoError('This promo code has expired');
         setValidatingPromo(false);
         return;
      }
      if (data.usage_limit && data.times_used >= data.usage_limit) {
         setPromoError('This promo code has reached its usage limit');
         setValidatingPromo(false);
         return;
      }
      
      setAppliedPromo(data);
      setPromoInput('');
      setPromoError('');
    } catch (err) {
      setPromoError('Error validating code');
    } finally {
      setValidatingPromo(false);
    }
  };

  useEffect(() => {
    async function loadBackendData() {
      const [equip, labor, marg] = await Promise.all([
        supabase.from('equipment_catalog').select('*').order('brand'),
        supabase.from('labor_rates').select('*').order('category'),
        supabase.from('margin_settings').select('*').eq('id', 1).single()
      ]);

      if (equip.data) setCatalog(equip.data);
      if (labor.data) {
          setLaborRates(labor.data);
          const lockedIds = labor.data.filter(l => ['5001'].includes(l.sku)).map(l => l.id.toString());
          if (lockedIds.length > 0) {
             setSystems(prev => prev.map(sys => {
                const newAddons = { ...sys.addons };
                lockedIds.forEach(id => newAddons[id] = true);
                return { ...sys, addons: newAddons };
             }));
          }
      }
      if (marg.data) setMargins(marg.data);
      setDbReady(true);
    }
    loadBackendData();
  }, []);

  const handlePhotoUpload = async (field, file) => {
    if (!file) return;
    setUploadingPhoto(field);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${field}_${Date.now()}.${fileExt}`;
      const folderPath = selectedCustomerId ? `${selectedCustomerId}` : 'orphan_surveys';
      const filePath = `${folderPath}/${fileName}`;
      const { error } = await supabase.storage.from('surveys').upload(filePath, file);
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('surveys').getPublicUrl(filePath);
      setPhotos(prev => ({ ...prev, [field]: publicUrlData.publicUrl }));
    } catch (err) {
      alert("Failed to upload photo: " + err.message);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const toggleAddon = (laborId) => {
     const laborItem = laborRates.find(l => l.id.toString() === laborId.toString());
     if (laborItem && ['5001'].includes(laborItem.sku)) return;
     setAddons(prev => ({ ...prev, [laborId]: !prev[laborId] }));
  };

  const updateSurveyAndTriggerSafetyNet = (field, value) => {
    setSurvey(prev => {
      const updated = { ...prev, [field]: value };
      const newAddons = { ...addons };
      
      const craneId = laborRates.find(l => l.item_name.toLowerCase().includes('crane'))?.id;
      if (craneId) newAddons[craneId] = (updated.condenserLocation === 'Roof');
      
      const flushId = laborRates.find(l => l.item_name.toLowerCase().includes('flush'))?.id;
      if (flushId) newAddons[flushId] = (updated.gasRefrigerant === 'R-22');

      const discId = laborRates.find(l => l.item_name.toLowerCase().includes('disconnect'))?.id;
      if (discId) newAddons[discId] = (updated.disconnectCondition === 'Replace Required');

      const atticId = laborRates.find(l => l.item_name.toLowerCase().includes('attic'))?.id;
      if (atticId) newAddons[atticId] = (updated.ahuLocation === 'Attic');

      if (updated.condenserLocation !== 'Roof' && craneId && prev.condenserLocation === 'Roof') newAddons[craneId] = false;
      if (updated.gasRefrigerant !== 'R-22' && flushId && prev.gasRefrigerant === 'R-22') newAddons[flushId] = false;
      if (updated.disconnectCondition !== 'Replace Required' && discId && prev.disconnectCondition === 'Replace Required') newAddons[discId] = false;
      if (updated.ahuLocation !== 'Attic' && atticId && prev.ahuLocation === 'Attic') newAddons[atticId] = false;

      setAddons(newAddons);
      return updated;
    });
  };

  const handleAutofillStep2 = () => {
     setSystems(prev => prev.map(sys => ({
        ...sys,
        survey: {
           ...sys.survey,
           systemType: "Split AC & Furnace",
           currentTonnage: "3.0",
           gasRefrigerant: "R410A",
           existingBrand: "Trane",
           condenserLocation: "Ground",
           ahuLocation: "Closet",
           disconnectCondition: "Pass"
        }
     })));
     setAddons({});
  };

  const calculateSystemBaselineRetail = (sys, rawEquipCost, tierType = 'Good') => {
    const rawVal = typeof rawEquipCost === 'object' ? (rawEquipCost?.system_cost || 0) : rawEquipCost;
    const parsedEquipCost = parseFloat(rawVal) || 0;
    
    // Protect against uninitialized addons array, although it should be {}
    const safeAddons = sys.addons || {};
    const activeAddons = laborRates.filter(l => safeAddons[l.id]);
    
    const taxableMaterials = activeAddons
       .filter(l => !['Labor', 'Install', 'Subcontract', 'Permit'].some(c => l.category?.toLowerCase()?.includes(c.toLowerCase())))
       .reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
       
    const nontaxableLabor = activeAddons
       .filter(l => ['Labor', 'Install', 'Subcontract', 'Permit'].some(c => l.category?.toLowerCase()?.includes(c.toLowerCase())))
       .reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
    
    const taxRate = parseFloat(margins?.sales_tax) || 0.07;
    let targetMargin = parseFloat(margins?.good_margin) || 0.35;
    if (tierType.toLowerCase() === 'better') targetMargin = parseFloat(margins?.better_margin) || 0.40;
    if (tierType.toLowerCase() === 'best') targetMargin = parseFloat(margins?.best_margin) || 0.45;

    // Standard dynamic pure margin calculation
    const equipWithTax = (parsedEquipCost + taxableMaterials) * (1 + taxRate); 
    const totalHardCost = equipWithTax + nontaxableLabor;
    const costWithReserve = totalHardCost * (1 + (parseFloat(margins?.service_reserve) || 0.05)); 
    
    return Math.max(Math.round(costWithReserve * (1 + targetMargin)), 0);
  };

  const getSystemHardCostOnly = (sys, rawEquipCost) => {
    const rawVal = typeof rawEquipCost === 'object' ? (rawEquipCost?.system_cost || 0) : rawEquipCost;
    const parsedEquipCost = parseFloat(rawVal) || 0;
    
    const safeAddons = sys.addons || {};
    const activeAddons = laborRates.filter(l => safeAddons[l.id]);
    
    const taxableMaterials = activeAddons
       .filter(l => !['Labor', 'Install', 'Subcontract', 'Permit'].some(c => l.category?.toLowerCase()?.includes(c.toLowerCase())))
       .reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
       
    const nontaxableLabor = activeAddons
       .filter(l => ['Labor', 'Install', 'Subcontract', 'Permit'].some(c => l.category?.toLowerCase()?.includes(c.toLowerCase())))
       .reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
       
    const taxRate = parseFloat(margins?.sales_tax) || 0.07;
    return ((parsedEquipCost + taxableMaterials) * (1 + taxRate)) + nontaxableLabor;
  };

  const generateProposal = async () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    
    let systemBestSum = 0;
    systems.forEach(sys => systemBestSum += calculateSystemBaselineRetail(sys, sys.selectedTiers.best?.system_cost, 'Best'));
    const approximateRetailForComm = getRetailFromBest(systemBestSum || 0);

    const finalTiers = { best: null, better: null, good: null };

    ['best', 'better', 'good'].forEach(tierKey => {
       const isActive = systems.some(sys => sys.selectedTiers[tierKey]);
       if (!isActive) return;

       let totalBaseline = 0;
       let sysBrands = [];
       let totalTons = 0;
       let aggregatedAddons = new Set();
       
       systems.forEach(sys => {
          if (sys.selectedTiers[tierKey]) {
             totalBaseline += calculateSystemBaselineRetail(sys, sys.selectedTiers[tierKey].system_cost, tierKey.charAt(0).toUpperCase() + tierKey.slice(1));
             sysBrands.push(`${sys.name}: ${sys.selectedTiers[tierKey].brand} ${sys.selectedTiers[tierKey].series}`);
             totalTons += (sys.selectedTiers[tierKey].tons || 0);

             Object.entries(sys.addons || {}).filter(([_, v]) => v).forEach(([k]) => {
                const name = laborRates.find(l => l.id.toString() === k.toString())?.item_name;
                if (name) aggregatedAddons.add(`Includes: ${name}`);
             });
          }
       });

       const percent = appliedPromo ? appliedPromo.discount_percent : 0;
       const discountAmount = totalBaseline * (percent / 100);
       const finalPrice = totalBaseline - discountAmount;
       const commission = computeCommission(totalBaseline, approximateRetailForComm);

       let features = [];

       features = [...features, ...Array.from(aggregatedAddons)];

       finalTiers[tierKey] = {
           id: tierKey,
           brand: sysBrands.length > 1 ? "Multiple" : sysBrands[0]?.split(': ')[1]?.split(' ')[0],
           series: sysBrands.length > 1 ? "Systems" : sysBrands[0]?.split(': ')[1]?.split(' ')[1],
           tons: totalTons,
           seer: systems.find(s => s.selectedTiers[tierKey])?.selectedTiers[tierKey]?.seer,
           baselinePrice: totalBaseline, 
           saleDiscount: discountAmount, 
           salesPrice: finalPrice,
           commission: commission,
           features: features,
           equipmentList: sysBrands
       };
    });

    const finalAmount = Math.max((finalTiers.better?.salesPrice || 0), (finalTiers.good?.salesPrice || 0), 0);
    const cust = customers.find(c => c.id.toString() === selectedCustomerId.toString());
    if (!cust) return;

    const customerName = cust.name;
    const targetHouseholdId = cust.id;
    const selectedProp = cust.locations?.find(l => l.id.toString() === selectedLocationId.toString()) || cust.locations?.[0];
    const propAddressString = selectedProp ? `${selectedProp.street_address}${selectedProp.city ? ', ' + selectedProp.city : ''}` : 'Unknown Address';

    const systemTiers = systems.map(sys => {
       const sysTiers = { good: null, better: null, best: null };
       ['best', 'better', 'good'].forEach(tierKey => {
           if (!sys.selectedTiers[tierKey]) return;
           
           const baselinePrice = calculateSystemBaselineRetail(sys, sys.selectedTiers[tierKey], tierKey.charAt(0).toUpperCase() + tierKey.slice(1));
           const percent = appliedPromo ? appliedPromo.discount_percent : 0;
           const discountAmount = baselinePrice * (percent / 100);
           const finalPrice = baselinePrice - discountAmount;
           
           let features = [];
           
           const activeAddonsList = Object.entries(sys.addons || {}).filter(([_, v]) => v).map(([k]) => {
              const name = laborRates.find(l => l.id.toString() === k.toString())?.item_name;
              return name ? `Includes: ${name}` : null;
           }).filter(Boolean);

           features = [...features, ...activeAddonsList];

           sysTiers[tierKey] = {
               id: tierKey,
               brand: sys.selectedTiers[tierKey].brand,
               series: sys.selectedTiers[tierKey].series,
               tons: sys.selectedTiers[tierKey].tons,
               seer: sys.selectedTiers[tierKey].seer,
               baselinePrice: baselinePrice,
               saleDiscount: discountAmount,
               salesPrice: finalPrice,
               features: features
           };
       });

       const altTracksArray = (sys.alternateTracks || []).map(track => {
           if (!track.tiers?.best && !track.tiers?.better && !track.tiers?.good) return null;
           const trackMapping = { good: null, better: null, best: null };
           
           ['best', 'better', 'good'].forEach(tierKey => {
               if (!track.tiers?.[tierKey]) return;
               
               const baselinePrice = calculateSystemBaselineRetail(sys, track.tiers[tierKey], tierKey.charAt(0).toUpperCase() + tierKey.slice(1));
               const percent = appliedPromo ? appliedPromo.discount_percent : 0;
               const discountAmount = baselinePrice * (percent / 100);
               const finalPrice = baselinePrice - discountAmount;
               
               let features = [];
               
               const activeAddonsList = Object.entries(sys.addons || {}).filter(([_, v]) => v).map(([k]) => {
                  const name = laborRates.find(l => l.id.toString() === k.toString())?.item_name;
                  return name ? `Includes: ${name}` : null;
               }).filter(Boolean);

               features = [...features, ...activeAddonsList];

               trackMapping[tierKey] = {
                   id: tierKey,
                   brand: track.tiers[tierKey].brand,
                   series: track.tiers[tierKey].series,
                   tons: track.tiers[tierKey].tons,
                   seer: track.tiers[tierKey].seer,
                   baselinePrice: baselinePrice,
                   saleDiscount: discountAmount,
                   salesPrice: finalPrice,
                   features: features
               };
           });
           return { id: track.id, tiers: trackMapping };
       }).filter(Boolean);
       
       return {
           systemId: sys.id,
           systemName: sys.name,
           tiers: Object.keys(sysTiers).length > 0 ? sysTiers : null,
           altTiers: altTracksArray.length > 0 ? altTracksArray[0].tiers : null,
           altTracks: altTracksArray
       };
    });

    const finalProposalData = {
      generatedAt: new Date().toISOString(),
      creator: user ? user.name || user.email : 'Unknown Sales Rep',
      systems: systems,
      tiers: finalTiers,
      systemTiers: systemTiers
    };

    const wizardState = { step: 6, selectedCustomerId, selectedLocationId, systems, appliedPromo };

    if (isEditing) {
       const oppId = editModeData.proposal_data?.associated_opportunity_id;
       const linkedProposalData = { ...finalProposalData, associated_opportunity_id: oppId, wizard_state: wizardState };
       
       updateProposal(editingId, { amount: finalAmount, proposal_data: linkedProposalData });
       
       // Force update the Pipeline row to match new pricing/tiers
       if (oppId) {
          supabase.from('opportunities').update({ proposal_data: linkedProposalData }).eq('id', oppId).then();
       }
    } else if (targetHouseholdId) {
       const { data: oppData, error: oppError } = await supabase.from('opportunities').insert({
           household_id: targetHouseholdId,
           status: 'Proposal Sent', urgency_level: 'Medium',
           issue_description: `Auto-generated Digital Proposal with 3 Tiers for ${propAddressString}.`,
           site_survey_data: { ...survey, photos: photos, property_id: selectedProp?.id, property_address: propAddressString },
           proposal_data: { ...finalProposalData, wizard_state: wizardState }
       }).select().single();
       
       if (oppError) console.error("Failed to insert Opportunity into Pipeline:", oppError);
       
       const finalOppId = oppData ? oppData.id : null;
       const linkedProposalData = { ...finalProposalData, associated_opportunity_id: finalOppId, wizard_state: wizardState };
       
       if (draftServerId) {
          updateProposal(draftServerId, { customer: customerName, amount: finalAmount, status: 'Sent', associated_opportunity_id: finalOppId, proposal_data: linkedProposalData, updated_at: new Date().toISOString() });
       } else {
          addProposal({ customer: customerName, amount: finalAmount, associated_opportunity_id: finalOppId, proposal_data: linkedProposalData });
       }
    } else {
       if (draftServerId) {
          updateProposal(draftServerId, { customer: customerName, amount: finalAmount, status: 'Sent', proposal_data: { ...finalProposalData, wizard_state: wizardState }, updated_at: new Date().toISOString() });
       } else {
          addProposal({ customer: customerName, amount: finalAmount, proposal_data: { ...finalProposalData, wizard_state: wizardState } });
       }
    }
    onComplete();
  };

  if (!dbReady) return <div className="page-container flex-center"><h3>Loading Live Pricing Engines...</h3></div>;
  const currentCustomer = selectedCustomerId ? customers.find(c => c.id.toString() === selectedCustomerId.toString()) : null;
  const filteredCatalog = catalog.filter(c => c.tons === parseFloat(tonnageFilter));
  const uniqueTonnages = [...new Set(catalog.map(c => c.tons).filter(Boolean))].sort();
  const filterByBrand = (c, bFilter) => bFilter ? c.brand === bFilter : true;
  const primaryFilteredCatalog = filteredCatalog.filter(c => filterByBrand(c, primaryBrandFilter)).sort((a, b) => (a.system_cost || 0) - (b.system_cost || 0));
  const uniquePrimaryBrands = [...new Set(filteredCatalog.map(c => c.brand).filter(Boolean))].sort();
  const uniqueAltBrands = uniquePrimaryBrands;

  return (
    <div className="page-container fade-in">
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
             <Calculator className="text-primary-600"/> 
             {isEditing ? `Editing Proposal: ${editingId}` : 'Estimate & Proposal Generator'}
          </h2>
          <div className="flex items-center gap-6">
            {step > 0 && (
              <button 
                className={`text-[11px] font-bold px-4 py-2.5 rounded-lg border shadow-sm transition-all flex items-center gap-2 ${
                    manualSaveStatus === 'error' 
                      ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                      : manualSaveStatus === 'saving'
                      ? 'bg-slate-100 text-slate-500 border-slate-200 opacity-70 cursor-wait'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                }`} 
                onClick={handleManualSave} 
                disabled={manualSaveStatus === 'saving'} 
                title="Your progress is automatically saved to the cloud"
              >
                {manualSaveStatus === 'saving' ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14}/>}
                {manualSaveStatus === 'saving' ? 'Saving...' : manualSaveStatus === 'error' ? 'Save Failed! Try Again' : 'Save Draft & Exit'}
              </button>
            )}
            <div className="flex gap-1.5">
             {[1,2,3,4,5,6].map(num => (
                <button 
                  key={num} 
                  onClick={() => { if (isEditing) setStep(num); else if (num < step) setStep(num); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step === num ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-200 cursor-pointer' : (isEditing || num < step) ? 'bg-success text-white hover:bg-emerald-600 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                  title={isEditing ? `Jump to Step ${num}` : ''}
                >
                   {(isEditing && step !== num) || num < step ? <Check size={14}/> : num}
                </button>
             ))}
          </div>
        </div>
      </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: 'easeOut' }}>

          {step >= 2 && step <= 4 && (
             <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2 overflow-x-auto">
                {systems.map(sys => {
                   const isSysValidStep2 = !!(sys.survey.systemType && sys.survey.currentTonnage);
                   const isSysValidStep3 = !!(sys.selectedTiers.good || sys.selectedTiers.better || sys.selectedTiers.best);
                   const isSysValidStep4 = Object.keys(sys.addons).some(k => sys.addons[k]);
                   const showWarning = (step === 2 && !isSysValidStep2) || (step === 3 && !isSysValidStep3) || (step === 4 && !isSysValidStep4);

                   return (
                    <div key={sys.id} className="relative group">
                      {editingSystemNameId === sys.id ? (
                          <input 
                              autoFocus
                              className="px-4 py-2 font-bold text-sm rounded-t-lg transition-colors bg-white border-x border-t border-primary-300 outline-none w-32 focus:ring-0"
                              value={sys.name}
                              onChange={(e) => handleSystemNameChange(sys.id, e.target.value)}
                              onBlur={() => setEditingSystemNameId(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingSystemNameId(null)}
                          />
                      ) : (
                          <button 
                            onClick={() => setActiveSystemId(sys.id)}
                            onDoubleClick={() => setEditingSystemNameId(sys.id)}
                            className={`px-4 py-2 font-bold text-sm rounded-t-lg transition-colors whitespace-nowrap flex items-center justify-center gap-2 pr-8 ${activeSystemId === sys.id ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                             {sys.name}
                             {showWarning && <AlertTriangle size={14} className="text-amber-500" />}
                             <Edit2 size={12} className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity absolute top-3 right-2" onClick={(e) => { e.stopPropagation(); setEditingSystemNameId(sys.id); }} />
                          </button>
                      )}
                    </div>
                 )})}
                {step === 2 && (
                  <>
                    <button 
                      onClick={() => {
                         const nextId = Math.max(...systems.map(s => s.id)) + 1;
                         setSystems([...systems, generateEmptySystem(nextId)]);
                         setActiveSystemId(nextId);
                      }}
                      className="px-3 py-1.5 ml-2 text-xs font-bold text-primary-600 border border-primary-200 rounded hover:bg-primary-50 transition-colors whitespace-nowrap"
                    >
                       + Add Unit
                    </button>
                    {systems.length > 1 && (
                      <button 
                        onClick={() => {
                           const newSystems = systems.filter(s => s.id !== activeSystemId);
                           setSystems(newSystems);
                           setActiveSystemId(newSystems[0].id);
                        }}
                        className="px-3 py-1.5 ml-auto text-xs font-bold text-danger-600 border border-danger-200 rounded hover:bg-danger-50 transition-colors whitespace-nowrap"
                      >
                         - Remove Unit
                      </button>
                    )}
                  </>
                )}
             </div>
          )}

        
        {step === 1 && (
          <div>
            <h3 className="font-bold mb-4 text-slate-700">1. Select or Create Customer Profile</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <div className="flex justify-between items-end mb-2">
                   <label className="text-xs font-bold text-slate-500 uppercase">Search Existing Clients</label>
                   <a href="/customers" className="text-xs font-bold text-primary-600 hover:text-primary-700 underline">+ Form New Customer</a>
                </div>
                <select className="w-full border border-slate-300 rounded p-3 bg-white font-semibold text-slate-700 mb-6" value={selectedCustomerId} onChange={e => { setSelectedCustomerId(e.target.value); setSelectedLocationId(''); }}>
                  <option value="">-- Choose a Customer Profile --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.address}</option>)}
                </select>
                
                {currentCustomer && (
                  <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                    {currentCustomer.locations && currentCustomer.locations.length > 1 ? (
                       <div className="mb-4 pb-4 border-b border-slate-100">
                         <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span> Multiple Properties Found. Select Target Location:
                         </label>
                         <select className="w-full border-2 border-primary-500 rounded p-3 bg-primary-50 font-semibold text-primary-800" value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)}>
                            <option value="">-- Required: Choose specific location --</option>
                            {currentCustomer.locations.map(loc => <option key={loc.id} value={loc.id}>{loc.is_primary_residence ? 'Primary Residence: ' : 'Managed Property: '} {loc.street_address} {loc.city && `, ${loc.city}`}</option>)}
                         </select>
                       </div>
                    ) : currentCustomer.locations && currentCustomer.locations.length === 1 && (
                       <div className="mb-4 pb-4 border-b border-slate-100 flex items-center gap-2">
                           <Check size={16} className="text-success" />
                           <span className="text-sm font-semibold text-slate-600">Auto-locked to sole property: {currentCustomer.locations[0].street_address}</span>
                       </div>
                    )}
                    <h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Validate Information</h4>
                    <p className="text-sm"><strong>Name:</strong> {currentCustomer.name}</p>
                    <p className="text-sm"><strong>Primary Address:</strong> {currentCustomer.address || 'N/A'}</p>
                    <p className="text-sm"><strong>Phone:</strong> {currentCustomer.phone || 'N/A'}</p>
                    <p className="text-sm"><strong>Email:</strong> {currentCustomer.email || 'N/A'}</p>
                    <p className="text-[10px] text-slate-400 mt-2">*If this is incorrect, please update the Customer Profile under the Customers tab.</p>
                  </div>
                )}
            </div>
            <div className="flex justify-end mt-8 border-t border-slate-200 pt-6">
               <button className="btn-primary flex items-center justify-center gap-2 w-max" onClick={() => { if (currentCustomer && currentCustomer.locations?.length === 1 && !selectedLocationId) setSelectedLocationId(currentCustomer.locations[0].id); setStep(2); }} disabled={!selectedCustomerId || (currentCustomer?.locations?.length > 1 && !selectedLocationId)}>Next: Digital Site Survey <ArrowRight size={16}/></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center gap-4 mb-4">
               <h3 className="font-bold text-slate-700 m-0">2. Pre-installation Site Constraints</h3>
               <button onClick={handleAutofillStep2} className="px-3 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 text-xs font-bold rounded-full transition-colors border border-amber-300">Autofill Temp Data</button>
            </div>
            <div className="bg-slate-50 p-6 rounded border border-slate-200 mb-6 font-medium text-sm">
               <h4 className="text-sm font-bold border-b pb-2 mb-4 text-primary-600 uppercase">A. Current Equipment</h4>
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                 <div><label className="text-[10px] uppercase font-bold text-slate-500">System Type</label><select className="input-field w-full mt-1" value={survey.systemType} onChange={e => updateSurveyAndTriggerSafetyNet('systemType', e.target.value)}><option value="">Select...</option><option>Split AC & Furnace</option><option>Heat Pump</option><option>Package Unit</option></select></div>
                 <div><label className="text-[10px] uppercase font-bold text-slate-500">Current Tonnage</label><select className="input-field w-full mt-1" value={survey.currentTonnage} onChange={e => updateSurveyAndTriggerSafetyNet('currentTonnage', e.target.value)}><option value="">Select...</option><option>1.5</option><option>2.0</option><option>2.5</option><option>3.0</option><option>3.5</option><option>4.0</option><option>5.0</option></select></div>
                 <div><label className="text-[10px] uppercase font-bold text-slate-500">Refrigerant (Triggers Flush)</label><select className="input-field w-full mt-1" value={survey.gasRefrigerant} onChange={e => updateSurveyAndTriggerSafetyNet('gasRefrigerant', e.target.value)}><option value="R410A">R-410A</option><option value="R-22">R-22</option></select></div>
                 <div><label className="text-[10px] uppercase font-bold text-slate-500">Existing Brand</label><input className="input-field w-full mt-1" placeholder="e.g. Trane" value={survey.existingBrand} onChange={e => updateSurveyAndTriggerSafetyNet('existingBrand', e.target.value)} /></div>
               </div>

               <h4 className="text-sm font-bold border-b pb-2 mb-4 text-primary-600 uppercase mt-4">B. Physical Safety Constraints</h4>
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <div><label className="text-[10px] uppercase font-bold text-slate-500">Condenser Location</label><select className="input-field w-full mt-1" value={survey.condenserLocation} onChange={e => updateSurveyAndTriggerSafetyNet('condenserLocation', e.target.value)}><option value="">Select...</option><option value="Ground">Ground Level</option><option value="Roof">Roof (Triggers Crane)</option><option value="Side">Side Yard Narrow</option></select></div>
                 <div><label className="text-[10px] uppercase font-bold text-slate-500">Air Handler Location</label><select className="input-field w-full mt-1" value={survey.ahuLocation} onChange={e => updateSurveyAndTriggerSafetyNet('ahuLocation', e.target.value)}><option value="">Select...</option><option value="Closet">Closet</option><option value="Garage">Garage</option><option value="Attic">Attic (+Labor)</option></select></div>
                 <div><label className="text-[10px] uppercase font-bold text-slate-500">Disconnect Box</label><select className="input-field w-full mt-1" value={survey.disconnectCondition} onChange={e => updateSurveyAndTriggerSafetyNet('disconnectCondition', e.target.value)}><option value="Pass">Pass</option><option value="Replace Required">Replace Required</option></select></div>
               </div>
            </div>
            <div className="bg-white p-6 rounded border border-slate-200">
               <h4 className="text-sm font-bold border-b pb-2 mb-4 text-primary-600 uppercase">System Measurements (1 - 27)</h4>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Box 1: Front View */}
                 <div className="bg-slate-50 p-4 border border-slate-200 rounded shadow-sm">
                   <h5 className="font-black text-center text-slate-700 tracking-wider mb-4 border-b border-slate-200 pb-2">FRONT VIEW</h5>
                   <div className="grid grid-cols-2 gap-3 text-xs">
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">1</div><input className="input-field w-full py-1 text-center" placeholder="Plenum W" value={survey.m1} onChange={e=>setSurvey({...survey, m1: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">2</div><input className="input-field w-full py-1 text-center" placeholder="AHU W" value={survey.m2} onChange={e=>setSurvey({...survey, m2: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">3</div><input className="input-field w-full py-1 text-center" placeholder="Ret Box W" value={survey.m3} onChange={e=>setSurvey({...survey, m3: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">4</div><input className="input-field w-full py-1 text-center" placeholder="L Clear" value={survey.m4} onChange={e=>setSurvey({...survey, m4: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">5</div><input className="input-field w-full py-1 text-center" placeholder="B Clear" value={survey.m5} onChange={e=>setSurvey({...survey, m5: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">6</div><input className="input-field w-full py-1 text-center" placeholder="AHU H" value={survey.m6} onChange={e=>setSurvey({...survey, m6: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">7</div><input className="input-field w-full py-1 text-center" placeholder="Top Clear" value={survey.m7} onChange={e=>setSurvey({...survey, m7: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">8</div><input className="input-field w-full py-1 text-center" placeholder="Door H" value={survey.m8} onChange={e=>setSurvey({...survey, m8: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">9</div><input className="input-field w-full py-1 text-center" placeholder="R Clear" value={survey.m9} onChange={e=>setSurvey({...survey, m9: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">10</div><input className="input-field w-full py-1 text-center" placeholder="Door W" value={survey.m10} onChange={e=>setSurvey({...survey, m10: e.target.value})}/></div>
                   </div>
                 </div>

                 {/* Box 2: Side View */}
                 <div className="bg-slate-50 p-4 border border-slate-200 rounded shadow-sm">
                   <h5 className="font-black text-center text-slate-700 tracking-wider mb-4 border-b border-slate-200 pb-2">SIDE VIEW</h5>
                   <div className="grid grid-cols-2 gap-3 text-xs">
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">11</div><input className="input-field w-full py-1 text-center" placeholder="Ceil H" value={survey.m11} onChange={e=>setSurvey({...survey, m11: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">12</div><input className="input-field w-full py-1 text-center" placeholder="Clearance" value={survey.m12} onChange={e=>setSurvey({...survey, m12: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">13</div><input className="input-field w-full py-1 text-center" placeholder="Plenum D" value={survey.m13} onChange={e=>setSurvey({...survey, m13: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">14</div><input className="input-field w-full py-1 text-center" placeholder="AHU D" value={survey.m14} onChange={e=>setSurvey({...survey, m14: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">15</div><input className="input-field w-full py-1 text-center" placeholder="Clearance" value={survey.m15} onChange={e=>setSurvey({...survey, m15: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">16</div><input className="input-field w-full py-1 text-center" placeholder="Ret Box D" value={survey.m16} onChange={e=>setSurvey({...survey, m16: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">17</div><input className="input-field w-full py-1 text-center" placeholder="Clearance" value={survey.m17} onChange={e=>setSurvey({...survey, m17: e.target.value})}/></div>
                   </div>
                 </div>

                 {/* Box 3: Horizontal */}
                 <div className="bg-slate-50 p-4 border border-slate-200 rounded shadow-sm">
                   <h5 className="font-black text-center text-slate-700 tracking-wider mb-4 border-b border-slate-200 pb-2">HORIZONTAL</h5>
                   <div className="grid grid-cols-2 gap-3 text-xs">
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">18</div><input className="input-field w-full py-1 text-center" placeholder="Access W" value={survey.m18} onChange={e=>setSurvey({...survey, m18: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">19</div><input className="input-field w-full py-1 text-center" placeholder="Access D" value={survey.m19} onChange={e=>setSurvey({...survey, m19: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">20</div><input className="input-field w-full py-1 text-center" placeholder="AHU L" value={survey.m20} onChange={e=>setSurvey({...survey, m20: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">21</div><input className="input-field w-full py-1 text-center" placeholder="AHU H" value={survey.m21} onChange={e=>setSurvey({...survey, m21: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">22</div><input className="input-field w-full py-1 text-center" placeholder="Plenum Top" value={survey.m22} onChange={e=>setSurvey({...survey, m22: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">23</div><input className="input-field w-full py-1 text-center" placeholder="Plenum End" value={survey.m23} onChange={e=>setSurvey({...survey, m23: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">24</div><input className="input-field w-full py-1 text-center" placeholder="Plenum B" value={survey.m24} onChange={e=>setSurvey({...survey, m24: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">25</div><input className="input-field w-full py-1 text-center" placeholder="Plenum C" value={survey.m25} onChange={e=>setSurvey({...survey, m25: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">26</div><input className="input-field w-full py-1 text-center" placeholder="Plenum D" value={survey.m26} onChange={e=>setSurvey({...survey, m26: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">27</div><input className="input-field w-full py-1 text-center" placeholder="Attic Pitch" value={survey.m27} onChange={e=>setSurvey({...survey, m27: e.target.value})}/></div>
                   </div>
                 </div>
               </div>
            </div>

            <div className="bg-slate-50 p-6 rounded border border-slate-200 mt-6">
               <div className="flex justify-between items-center border-b pb-2 mb-4">
                 <h4 className="text-sm font-bold text-primary-600 uppercase">Site Photos</h4>
                 <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold">Optional for Testing</span>
               </div>
               <p className="text-xs text-slate-500 mb-4">Please upload visual proof of all constraints for the installation crew. These will uniquely appear in the pipeline Deal Command Center.</p>
               <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                 {[
                   { id: 'condenser_wide', label: 'Condenser (Wide)', desc: 'Show pad & yard' },
                   { id: 'condenser_data_plate', label: 'Condenser Plate', desc: 'Focus on model/serial' },
                   { id: 'indoor_unit_wide', label: 'Indoor Unit (Wide)', desc: 'Show clearances' },
                   { id: 'indoor_data_plate', label: 'Indoor Plate', desc: 'Focus on model/serial' },
                   { id: 'electrical_panel_open', label: 'Electrical Panel', desc: 'Show breaker load' }
                 ].map(photoObj => (
                   <div key={photoObj.id} className="border border-slate-200 rounded p-3 bg-white text-center shadow-sm relative overflow-hidden flex flex-col justify-between">
                     <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{photoObj.label}</label>
                        <p className="text-[9px] text-slate-400 mb-3 leading-tight">{photoObj.desc}</p>
                     </div>
                     
                     <div className="mt-auto">
                        {uploadingPhoto === photoObj.id ? (
                          <div className="w-full h-24 border-2 border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50">
                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                          </div>
                        ) : photos[photoObj.id] ? (
                          <div className="relative group cursor-pointer inline-block w-full h-24">
                             <img src={photos[photoObj.id]} alt="Uploaded" className="w-full h-full object-cover rounded border border-slate-200 transition-opacity group-hover:opacity-75" />
                             <div 
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded"
                                onClick={() => setPhotos({...photos, [photoObj.id]: null})}
                             >
                                <span className="text-xs text-white font-bold p-1 bg-danger rounded">Remove</span>
                             </div>
                          </div>
                        ) : (
                          <div className="w-full h-24 border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                            <ImageIcon className="text-slate-400 mb-1 group-hover:text-primary-500 transition-colors" size={20} />
                            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Upload Image</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                 if (e.target.files && e.target.files[0]) {
                                    handlePhotoUpload(photoObj.id, e.target.files[0]);
                                 }
                              }}
                            />
                          </div>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
            </div>
             <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
               <button className="btn-secondary flex items-center justify-center gap-2 w-max" onClick={() => setStep(1)}><ArrowLeft size={16}/> Back</button>
               <div className="flex items-center gap-3">
                 {!systems.every(s => s.survey.systemType && s.survey.currentTonnage) && <span className="text-xs font-bold text-amber-600">Please complete required fields (System Type & Tonnage) for all units.</span>}
                 <button className="btn-primary flex items-center justify-center gap-2 w-max" onClick={() => setStep(3)} disabled={!systems.every(s => s.survey.systemType && s.survey.currentTonnage)}>Next: Select Equipment <ArrowRight size={16}/></button>
               </div>
             </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="font-bold mb-4 text-slate-700">3. Filter & Map Equipment Tiers</h3>
            <div className="bg-slate-50 p-6 rounded border border-slate-200 mb-6">
                <label className="text-sm font-bold text-slate-600 mb-2 block">Specify Replacement Tonnage</label>
                <select className="input-field w-full lg:w-1/3 text-lg font-black font-mono text-primary-700 mb-6 border-primary-300 shadow-sm" value={tonnageFilter} onChange={e => {setTonnageFilter(e.target.value); setSelectedTiers({best: null, better: null, good: null});}}>
                   <option value="">-- Choose Tonnage --</option>
                   {uniqueTonnages.map(t => <option key={t} value={t}>{t} Ton Systems</option>)}
                </select>
            </div>

            {tonnageFilter && filteredCatalog.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                   <h4 className="font-bold text-slate-700">Assign Consumer Options</h4>
                </div>
                <p className="text-xs text-slate-500 mb-6">Map previously filtered {tonnageFilter}-Ton systems into the Good/Better/Best presentation model for the homeowner.</p>
                
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                   <h5 className="font-bold text-xs uppercase tracking-widest text-slate-400 ml-1">Primary Brand Choices</h5>
                   <select className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none cursor-pointer hover:bg-slate-100 transition-colors" value={primaryBrandFilter || ''} onChange={e => {setPrimaryBrandFilter(e.target.value); setSelectedTiers({best: null, better: null, good: null});}}>
                       <option value="">-- All Brands --</option>
                       {uniquePrimaryBrands.map(b => <option key={b} value={b}>{b}</option>)}
                   </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[ {k: 'good', l: 'Baseline (Good)'}, {k: 'better', l: 'Core (Better)'}, {k: 'best', l: 'Premium (Best)'} ].map(tier => {
                     const marginKey = `${tier.k}_margin`;
                     const targetMargin = margins ? margins[marginKey] : (tier.k === 'best' ? 0.45 : tier.k === 'better' ? 0.40 : 0.35);
                     return (
                     <div key={tier.k} className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${tier.k === 'best' ? 'bg-primary-500' : tier.k === 'better' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                        <label className="block font-black uppercase text-slate-700 text-sm tracking-wider mb-4 mt-1">{tier.l}</label>
                        <select className="input-field w-full text-sm font-semibold text-slate-600 bg-slate-50 focus:bg-white transition-colors" value={selectedTiers?.[tier.k]?.id || ''} onChange={e => setSelectedTiers({...selectedTiers, [tier.k]: primaryFilteredCatalog.find(c => c.id.toString() === e.target.value)})}>
                           <option value="">-- Remove/Empty --</option>
                           {primaryFilteredCatalog.map(sys => {
                              const rawCost = parseFloat(sys.system_cost || 0);
                              const taxRate = margins?.sales_tax || 0.07;
                              const reserve = margins?.service_reserve || 0.05;
                              const displayPrice = rawCost * (1 + taxRate) * (1 + reserve) * (1 + targetMargin);
                              return <option key={sys.id} value={sys.id}>{sys.brand} {sys.series} {sys.seer} SEER - [Retail: ${displayPrice.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0})}]</option>;
                           })}
                        </select>
                     </div>
                  )})}
                </div>

                 <div className="flex justify-end mb-6">
                    <button 
                       className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-primary-100 transition-colors"
                       onClick={() => setAlternateTracks([...alternateTracks, { id: Date.now().toString(36) + Math.random().toString(36).substr(2), brandFilter: '', tiers: { good: null, better: null, best: null } }])}
                    >
                       <Layers size={14}/> Add Another Brand Comparison
                    </button>
                 </div>

                 {alternateTracks.map((track, trackIndex) => {
                    const trackUniqueBrands = [...new Set(filteredCatalog.map(x => x.brand))].sort();
                    const trackFilteredCatalog = (track.brandFilter ? filteredCatalog.filter(c => c.brand === track.brandFilter) : filteredCatalog).sort((a, b) => (a.system_cost || 0) - (b.system_cost || 0));

                    return (
                       <div key={track.id} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-inner mb-6 relative">
                          <button 
                             onClick={() => setAlternateTracks(alternateTracks.filter(t => t.id !== track.id))}
                             className="absolute top-4 right-4 text-xs font-bold text-indigo-400 hover:text-indigo-600 bg-white px-2 py-1 rounded shadow-sm border border-indigo-200"
                          >
                             Remove
                          </button>
                          <div className="flex items-center justify-between mb-4 border-b border-indigo-200/50 pb-2 pr-16">
                              <h5 className="font-bold text-xs uppercase tracking-widest text-indigo-500 ml-1 flex items-center gap-2">
                                 <Layers size={14}/> Comparison Track {trackIndex + 1}
                              </h5>
                              <select className="text-xs font-bold text-indigo-700 bg-indigo-100/50 border border-indigo-200 rounded px-2 py-1 outline-none cursor-pointer hover:bg-indigo-200/50 transition-colors" value={track.brandFilter || ''} onChange={e => setAlternateTracks(alternateTracks.map(t => t.id === track.id ? { ...t, brandFilter: e.target.value, tiers: {best: null, better: null, good: null} } : t))}>
                                  <option value="">-- All Brands --</option>
                                  {trackUniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[ {k: 'good', l: `Baseline (Good) - C${trackIndex + 1}`}, {k: 'better', l: `Core (Better) - C${trackIndex + 1}`}, {k: 'best', l: `Premium (Best) - C${trackIndex + 1}`} ].map(tier => {
                               const marginKey = `${tier.k}_margin`;
                               const targetMargin = margins ? margins[marginKey] : (tier.k === 'best' ? 0.45 : tier.k === 'better' ? 0.40 : 0.35);
                               return (
                               <div key={tier.k} className="bg-white p-5 border border-indigo-200 rounded-xl shadow-sm relative overflow-hidden">
                                  <label className="block font-black uppercase text-slate-700 text-sm tracking-wider mb-4 mt-1">{tier.l}</label>
                                  <select className="input-field w-full text-sm font-semibold text-slate-600 bg-slate-50 transition-colors" value={track.tiers?.[tier.k]?.id || ''} onChange={e => {
                                      const newTiers = { ...track.tiers, [tier.k]: trackFilteredCatalog.find(c => c.id.toString() === e.target.value) };
                                      setAlternateTracks(alternateTracks.map(t => t.id === track.id ? { ...t, tiers: newTiers } : t));
                                  }}>
                                     <option value="">-- Remove/Empty --</option>
                                     {trackFilteredCatalog.map(sys => {
                                        const rawCost = parseFloat(sys.system_cost || 0);
                                        const taxRate = margins?.sales_tax || 0.07;
                                        const reserve = margins?.service_reserve || 0.05;
                                        const displayPrice = rawCost * (1 + taxRate) * (1 + reserve) * (1 + targetMargin);
                                        return <option key={sys.id} value={sys.id}>{sys.brand} {sys.series} {sys.seer} SEER - [Retail: ${displayPrice.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0})}]</option>;
                                     })}
                                  </select>
                               </div>
                            )})}
                          </div>
                       </div>
                    );
                 })}
              </div>
            )}

            {tonnageFilter && (
               <div className="bg-slate-50 p-6 rounded border border-slate-200">
                  <div className="flex items-center gap-2 border-b border-primary-100 pb-2 mb-4">
                     <Layers className="text-primary-500" size={18}/>
                     <h4 className="font-bold text-primary-800 uppercase tracking-widest text-sm">Matching Equipment Pool Found</h4>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                     {filteredCatalog.map(item => (
                        <div key={item.id} className="bg-white border border-slate-100 rounded-md p-3 shadow-sm hover:shadow-md transition-shadow">
                           <div className="font-black text-slate-800 text-sm tracking-tight">{item.brand}</div>
                           <div className="text-[10px] text-slate-500 font-mono mb-2">{item.series}</div>
                           <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-600 w-max">{item.seer} SEER2</div>
                        </div>
                     ))}
                  </div>
                  {filteredCatalog.length === 0 && <p className="text-sm text-slate-500 italic mt-2">No matching systems found in the catalog for {tonnageFilter}T. Please adjust.</p>}
               </div>
            )}

            <div className="flex justify-between items-center mt-10 pt-4 border-t border-slate-100">
               <button className="btn-secondary flex items-center justify-center gap-2 w-max" onClick={() => setStep(2)}><ArrowLeft size={16}/> Back</button>
               <div className="flex items-center gap-3">
                 {!systems.every(s => s.selectedTiers.good || s.selectedTiers.better || s.selectedTiers.best) && <span className="text-xs font-bold text-amber-600">Please map equipment tiers for all units.</span>}
                 <button className="btn-primary flex items-center justify-center gap-2 w-max" onClick={() => setStep(4)} disabled={!systems.every(s => s.selectedTiers.good || s.selectedTiers.better || s.selectedTiers.best)}>Next: Map Subcontracting <ArrowRight size={16}/></button>
               </div>
            </div>
          </div>
        )}

         {step === 4 && (
          <div>
             <h3 className="font-bold mb-2 text-slate-700">4. Global Variable Labor & Add-ons</h3>
             <p className="text-xs text-slate-500 mb-6">Items toggled below are universally injected into every active tier in the Proposal. Select necessary logistics.</p>

             <div className="mb-6 relative max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                   type="text" 
                   className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-medium placeholder:text-slate-400 transition-all font-mono"
                   placeholder="Search 60+ components or SKU..."
                   value={addonSearchTerm}
                   onChange={e => setAddonSearchTerm(e.target.value)}
                />
             </div>

             <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200 max-h-[450px] overflow-y-auto custom-scrollbar shadow-inner relative">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {laborRates
                    .filter(labor => 
                       addonSearchTerm === '' || 
                       labor.item_name.toLowerCase().includes(addonSearchTerm.toLowerCase()) || 
                       labor.sku?.toLowerCase().includes(addonSearchTerm.toLowerCase()) ||
                       labor.category.toLowerCase().includes(addonSearchTerm.toLowerCase())
                    )
                    .sort((a, b) => (parseInt(a.sku) || Number.MAX_SAFE_INTEGER) - (parseInt(b.sku) || Number.MAX_SAFE_INTEGER))
                    .map(labor => {
                       const isLocked = ['5001'].includes(labor.sku);
                       return (
                      <label key={labor.id} className={`flex items-start gap-4 p-3.5 border rounded-xl transition-all shadow-sm group select-none relative overflow-hidden ${addons[labor.id] ? 'bg-primary-50/80 border-primary-300 ring-1 ring-primary-200' : 'bg-white border-slate-200'} ${isLocked ? 'cursor-not-allowed opacity-90' : 'hover:border-slate-300 hover:shadow-md cursor-pointer'}`}>
                        {addons[labor.id] && <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${isLocked ? 'from-slate-300/40' : 'from-primary-200/40'} to-transparent flex justify-end items-start p-1.5`}><Check size={14} className={`${isLocked ? 'text-slate-600' : 'text-primary-600'} shadow-sm`}/></div>}
                        
                        <input type="checkbox" className={`w-[18px] h-[18px] mt-0.5 shrink-0 text-primary-600 border-gray-300 rounded focus:ring-primary-500 shadow-sm transition-colors ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} checked={!!addons[labor.id]} onChange={() => { if (!isLocked) toggleAddon(labor.id); }} disabled={isLocked} />
                        
                        <div className="flex-1 min-w-0 pr-6">
                           <span className={`block font-black text-[13px] leading-tight mb-1.5 truncate ${addons[labor.id] ? 'text-primary-900' : 'text-slate-800'}`}>{labor.item_name} {isLocked && <span className="text-[9px] uppercase font-bold text-slate-500 ml-2 bg-slate-200/80 border border-slate-300 px-1.5 py-0.5 rounded shadow-sm">Required Base</span>}</span>
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">{labor.category}</span>
                              <span className="font-mono text-[10px] font-bold text-slate-400">SKU {labor.sku || 'N/A'}</span>
                           </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 hidden sm:flex">
                           {labor.sku === '5001' && <span className="font-mono font-black text-slate-700 text-[13px]">${labor.cost}</span>}
                        </div>
                      </label>
                  )})}
                </div>
                
                {laborRates.filter(l => addonSearchTerm === '' || l.item_name.toLowerCase().includes(addonSearchTerm.toLowerCase())).length === 0 && (
                   <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center">
                     <span className="bg-white p-4 rounded-full shadow-sm mb-4 border border-slate-100 text-slate-300">
                        <Box size={32} />
                     </span>
                     <p className="font-bold text-sm text-slate-500">No components found matching "{addonSearchTerm}"</p>
                     <p className="text-xs font-semibold text-slate-400 mt-1">Try adjusting your internal search phrase.</p>
                   </div>
                )}
             </div>

             <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
               <button className="btn-secondary flex items-center justify-center gap-2 w-max" onClick={() => setStep(3)}><ArrowLeft size={16}/> Back</button>
               <div className="flex items-center gap-3">
                 {!systems.every(s => Object.keys(s.addons).some(k => s.addons[k])) && <span className="text-xs font-bold text-amber-600">Please select at least one labor/add-on item for all units.</span>}
                 <button className="btn-primary flex items-center gap-2" disabled={!systems.every(s => Object.keys(s.addons).some(k => s.addons[k]))} onClick={() => setStep(5)}><DollarSign size={16}/> View Global Margins <ArrowRight size={16}/></button>
               </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="font-bold mb-6 text-slate-800 flex items-center gap-2"><DollarSign className="text-emerald-600"/> 5. Proposal Presentation</h3>



            {(!systems.some(s => s.selectedTiers.best || s.selectedTiers.better || s.selectedTiers.good)) ? (
                <div className="border-2 border-dashed border-red-200 bg-red-50 p-10 text-center rounded-xl my-8">
                   <AlertTriangle size={32} className="mx-auto text-red-400 mb-4" />
                   <h3 className="font-bold text-red-800 text-lg mb-2">No Equipment Tiers Selected</h3>
                   <p className="text-red-600 text-sm max-w-md mx-auto">This proposal lacks associated equipment tiers. You must navigate back to <strong>Step 3: Filter & Map Equipment Tiers</strong> and map equipment before applying pricing controls.</p>
                   <button className="bg-red-600 text-white font-bold py-2 px-6 rounded mt-6 mx-auto block hover:bg-red-700 transition" onClick={() => setStep(3)}>Return to Step 3</button>
                </div>
            ) : (
                <div className="space-y-12">
                  {systems.map(sys => {
                     const isActiveSys = sys.selectedTiers.best || sys.selectedTiers.better || sys.selectedTiers.good;
                     if (!isActiveSys) return null;

                     return (
                        <div key={sys.id} className="border-t border-slate-200 pt-8 first:border-0 first:pt-0">
                           <h4 className="font-black text-xl text-slate-800 mb-6">{sys.name} Pricing</h4>
                           
                           {(() => {
                              const allTracks = [
                                 { id: 'primary', title: 'Option 1', tiers: sys.selectedTiers, active: sys.selectedTiers.best || sys.selectedTiers.better || sys.selectedTiers.good },
                                 ...(sys.alternateTracks || []).map((t, idx) => ({ id: t.id, title: `Option ${idx + 2}`, tiers: t.tiers, active: t.tiers?.best || t.tiers?.better || t.tiers?.good }))
                              ].filter(t => t.active);
                              
                              if (allTracks.length === 0) return null;
                              
                              const activeIdx = activeStep5Track[sys.id] || 0;
                              const track = allTracks[activeIdx] || allTracks[0];
                              const showBrandToggle = allTracks.length > 1;

                              return (
                                 <div className="mb-8 last:mb-0">
                                     {showBrandToggle && (
                                         <div className="flex bg-slate-100 rounded-lg p-1 w-full flex-wrap gap-1 mb-6">
                                            {allTracks.map((trk, idx) => (
                                               <button key={trk.id} onClick={() => setActiveStep5Track(prev => ({...prev, [sys.id]: idx}))} className={`px-4 py-2 text-[11px] whitespace-nowrap font-black uppercase tracking-wider rounded-md transition-all duration-200 ${activeIdx === idx ? 'bg-white shadow-sm text-primary-700 border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                                                  {trk.title}
                                               </button>
                                            ))}
                                         </div>
                                     )}
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[ {k: 'good', l: 'Baseline (Good)', m: margins.good_margin}, {k: 'better', l: 'Core (Better)', m: margins.better_margin}, {k: 'best', l: 'Premium (Best)', m: margins.best_margin} ].map(tier => {
                                           if (!track.tiers || !track.tiers[tier.k]) return null;
                                           
                                           const raw = track.tiers[tier.k].system_cost || 0;
                                           const floorCost = getSystemHardCostOnly(sys, raw);
                                           const baselineRetail = calculateSystemBaselineRetail(sys, raw, tier.k.charAt(0).toUpperCase() + tier.k.slice(1));
                               
                                           const absoluteTotalFloor = floorCost * (1 + (margins.service_reserve || 0.05));
                               
                                           const baselineCommBase = calculateSystemBaselineRetail(sys, track.tiers.best?.system_cost || raw, 'Best');
                                           const baseComm = computeCommission(baselineRetail, getRetailFromBest(baselineCommBase));
                                           
                                           const percent = appliedPromo ? appliedPromo.discount_percent : 0;
                                           const discountAmount = baselineRetail * (percent / 100);
                                           const finalPrice = baselineRetail - discountAmount;
                                           const isBelowFloor = finalPrice < absoluteTotalFloor;
                                           
                                           const equip = track.tiers[tier.k];
          
                                           return (
                                           <div key={tier.k} className={`relative bg-white border rounded-2xl shadow-lg flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 border-slate-200 text-slate-800 ${tier.k === 'best' ? 'border-primary-500' : ''}`}>
                                              <div className={`bg-slate-50 border-slate-200 rounded-t-[14px] py-4 px-4 border-b text-center pt-6`}>
                                                 <h4 className={`font-black text-lg tracking-widest uppercase text-slate-800`}>{tier.l.split('(')[0].trim()}</h4>
                                                 <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 block text-slate-400`}>Selected Tier</span>
                                              </div>
                                              <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                                                 
                                                 <div className="text-center pt-2 min-h-[60px] flex flex-col justify-center">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">Included Add-ons & Labor</label>
                                                    <div className="flex flex-wrap justify-center gap-1.5">
                                                       {Object.entries(sys.addons || {}).filter(([_, v]) => v).length > 0 ? (
                                                          Object.entries(sys.addons).filter(([_, v]) => v).map(([k]) => {
                                                             const laborName = laborRates.find(l => l.id.toString() === k.toString())?.item_name || 'Component';
                                                             
                                                             return (
                                                                <span key={k} className="text-[9px] font-bold bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 uppercase flex items-center gap-1">
                                                                   <Check size={10} className="text-emerald-500"/> {laborName}
                                                                </span>
                                                             );
                                                          })
                                                       ) : (
                                                          <span className="text-xs text-slate-400 font-medium italic">Standard Installation</span>
                                                       )}
                                                    </div>
                                                 </div>
                         
                                                 <div className="space-y-1 py-4 border-y border-slate-100">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2 text-center">Equipment Package</label>
                                                    <div className="flex flex-col items-center text-center gap-1">
                                                        <span className={`font-black text-xl text-slate-800`}>{equip.brand}</span>
                                                        <span className="text-sm font-medium text-slate-500 mb-2">{equip.series}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="font-mono text-xs bg-slate-800 text-white font-black px-4 py-1.5 rounded-full shadow-md shadow-slate-800/20 tracking-wide">{equip.tons} TON SYSTEM</span>
                                                            {equip.seer && <span className="font-mono text-xs bg-slate-800 text-white font-black px-4 py-1.5 rounded-full shadow-md shadow-slate-800/20 tracking-wide">{equip.seer} SEER</span>}
                                                        </div>
                                                    </div>
                                                 </div>
                         
                                                 <div className="text-center pt-2">
                                                    {discountAmount > 0 && (
                                                        <div className="mb-4">
                                                           <div className="text-lg font-black text-slate-300 line-through mb-1">${baselineRetail.toLocaleString()}</div>
                                                           <div className="inline-block bg-emerald-50 text-emerald-600 font-black px-4 py-1.5 rounded-xl border border-emerald-100">
                                                              - ${discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} Savings
                                                           </div>
                                                        </div>
                                                    )}
                         
                                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Total System Investment</label>
                                                    <div className={`text-[42px] leading-none tracking-tight font-black ${isBelowFloor ? 'text-red-500' : 'text-primary-800'}`}>${finalPrice.toLocaleString()}</div>
                                                    {isBelowFloor && <p className="text-[10px] font-bold text-red-500 mt-3 bg-red-50 p-2 rounded">Error: Pricing below acceptable floor rules.</p>}
                                                 </div>
                         
                                              </div>
                                           </div>
                                           );
                                        })}
                                     </div>
                                 </div>
                              );
                           })()}
                        </div>
                     );
                  })}
                </div>
            )}

            {showPromoInput || appliedPromo ? (
              <div className="mt-8 mb-4 bg-white border border-slate-200 rounded-xl p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] hover:shadow-md transition-all relative overflow-hidden group">
                 <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
                    <Tag size={180} />
                 </div>
  
                 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-md">
                       <h4 className="font-black text-slate-800 text-lg flex items-center gap-2 mb-1">Global Customer Discount</h4>
                       <p className="text-sm text-slate-500 font-medium">Apply a pre-authorized organization promo code to seamlessly distribute a global margin discount evenly across all pricing tiers.</p>
                       {!appliedPromo && (
                           <button onClick={() => setShowPromoInput(false)} className="text-[10px] uppercase font-bold text-slate-400 hover:text-slate-600 mt-2 block w-max underline">Cancel / Hide</button>
                       )}
                    </div>
  
                    <div className="flex-1 w-full max-w-[420px]">
                       {!appliedPromo ? (
                          <div className="flex flex-col gap-1 w-full relative">
                             <div className="flex shadow-sm rounded-xl overflow-hidden focus-within:ring-[3px] focus-within:ring-primary-500/20 transition-all border border-slate-300 focus-within:border-primary-500 bg-white group/input">
                               <div className="pl-4 flex items-center justify-center bg-white text-slate-400 group-focus-within/input:text-primary-500 transition-colors">
                                 <Tag size={18} />
                               </div>
                               <input 
                                 type="text" 
                                 className="w-full bg-white px-3 py-3 font-mono uppercase text-slate-800 font-bold placeholder:text-slate-300 placeholder:font-medium focus:outline-none" 
                                 value={promoInput} 
                                 onChange={e => setPromoInput(e.target.value.toUpperCase())} 
                                 placeholder="ENTER PROMO CODE..." 
                                 onKeyDown={e => e.key === 'Enter' && handleApplyPromo()} 
                                 style={{ minHeight: '52px' }}
                               />
                               <button 
                                 onClick={handleApplyPromo} 
                                 disabled={validatingPromo} 
                                 className="bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold px-7 flex items-center justify-center transition-colors whitespace-nowrap"
                                 style={{ minHeight: '52px' }}
                               >
                                 {validatingPromo ? 'WAIT...' : 'APPLY CODE'}
                               </button>
                             </div>
                             {promoError && <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 mt-1 pb-1 absolute -bottom-5"><AlertTriangle size={10}/> {promoError}</p>}
                          </div>
                       ) : (
                          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-0.5 shadow-sm transform transition-all hover:scale-[1.01]">
                             <div className="bg-emerald-50 rounded-[10px] p-4 flex justify-between items-center w-full relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                                  <Check size={80}/>
                                </div>
                                <div className="relative z-10">
                                   <div className="flex items-center gap-1.5 mb-0.5">
                                      <Check className="text-emerald-500" size={16}/>
                                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Active Application</p>
                                   </div>
                                   <p className="font-mono font-black text-emerald-600 text-xl flex items-center gap-2">
                                       {appliedPromo.code} 
                                       <span className="bg-emerald-200 text-emerald-900 font-bold tracking-tight text-xs px-2 py-0.5 rounded-full ml-1">-{appliedPromo.discount_percent}% global</span>
                                   </p>
                                </div>
                                <button onClick={() => setAppliedPromo(null)} className="text-emerald-700 hover:text-white bg-emerald-100 hover:bg-emerald-500 p-2.5 rounded-lg transition-colors shadow-sm ml-4 border border-transparent relative z-10" title="Remove Promo Code">
                                   <RefreshCcw size={18} />
                                </button>
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
            ) : null}

            <div className="flex justify-between mt-10 pt-4 border-t border-slate-100 relative">
               <button className="btn-secondary flex items-center justify-center gap-2 w-max" onClick={() => setStep(4)}><ArrowLeft size={16}/> Back</button>
               
               {/* Hidden toggle button that doesn't say "promo" */}
               {!showPromoInput && !appliedPromo && (
                  <button onClick={() => setShowPromoInput(true)} className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center p-2 mt-1 text-primary-800 hover:text-primary-900 opacity-50 hover:opacity-100 transition-opacity" title="Settings">
                     <Tag size={12} />
                  </button>
               )}

               <button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 shadow-lg" onClick={() => setStep(6)}>Finalize Transaction <ArrowRight size={16}/></button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="text-center py-10">
             <div className="w-20 h-20 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-success-600" />
             </div>
             <h3 className="text-2xl font-black text-slate-800 mb-2">Proposal Mathematical Ready</h3>
             <p className="text-sm text-slate-500 mb-10 max-w-lg mx-auto">The digital payloads have been mathematically validated. Click below to immutably snap these 3 tiers to the database, generate the link, and fire the opportunity to the Pipeline Board.</p>
             
             <div className="flex justify-center gap-4">
                <button className="btn-secondary flex items-center justify-center gap-2 w-max" onClick={() => setStep(5)}><ArrowLeft size={16}/> Modify Margins</button>
                <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-black tracking-wide flex items-center gap-2 shadow-xl hover:scale-105 transition-transform" onClick={generateProposal}>
                   {isEditing ? 'OVERWRITE & UPDATE PROPOSAL' : 'GENERATE DIGITAL PROPOSAL'}
                </button>
             </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
