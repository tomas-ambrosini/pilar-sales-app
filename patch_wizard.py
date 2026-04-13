with open("src/components/ProposalWizard.jsx", "r") as f:
    content = f.read()

import re

# 1. Add `manualSaveStatus` and `handleManualSave`
target_insert = """const syncTimer = React.useRef(null);
  const isInitializingDraft = React.useRef(false);"""
replacement_insert = """const syncTimer = React.useRef(null);
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
  };"""

content = content.replace(target_insert, replacement_insert)

# 2. Modify the useEffect sync logic to remove `&& !isEditing`
content = content.replace("if (selectedCustomerId !== '' && dbReady && !isEditing) {", "if (selectedCustomerId !== '' && dbReady) {")

# 3. Modify the 'Save Draft & Exit' button in the JSX
target_button = re.compile(r"\{step > 0 && <button className=.*? onClick=\{onComplete\} title=.*?>.*?\{isEditing \? 'Discard Edits & Exit' : 'Save Draft & Exit'\}</button>\}")

replacement_button = """{step > 0 && (
              <button 
                className={`text-[10px] font-bold transition flex items-center gap-1 mt-1 w-max ${manualSaveStatus === 'error' ? 'text-red-500' : 'text-slate-400 hover:text-primary-600'}`} 
                onClick={handleManualSave} 
                disabled={manualSaveStatus === 'saving'} 
                title="Your progress is automatically saved to the cloud"
              >
                <Save size={12}/> 
                {manualSaveStatus === 'saving' ? 'Saving...' : manualSaveStatus === 'error' ? 'Save Failed! Try again' : 'Save Draft & Exit'}
              </button>
            )}"""

content = re.sub(target_button, replacement_button, content)

with open("src/components/ProposalWizard.jsx", "w") as f:
    f.write(content)
print("ProposalWizard done")
