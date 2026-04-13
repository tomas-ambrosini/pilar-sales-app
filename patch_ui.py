with open("src/components/ProposalWizard.jsx", "r") as f:
    text = f.read()

import re

target = r'<div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">\s*<div className="flex flex-col">\s*<h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">\s*<Calculator className="text-primary-600"/>\s*\{isEditing \? `Editing Proposal: \$\{editingId\}` : \'Estimate & Proposal Generator\'\}\s*</h2>\s*\{step > 0 && \(\s*<button\s*className=\{`text-\[11px\] font-bold mt-3 px-3 py-1\.5 rounded-full border shadow-sm transition-all flex items-center gap-1\.5 w-max \$\{\s*manualSaveStatus === \'error\' \s*\? \'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100\' \s*: manualSaveStatus === \'saving\'\s*\? \'bg-primary-50 text-primary-600 border-primary-200 opacity-70 cursor-wait\'\s*: \'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100 hover:text-primary-800 hover:border-primary-300\'\s*\}\`\}\s*onClick=\{handleManualSave\}\s*disabled=\{manualSaveStatus === \'saving\'\}\s*title="Your progress is automatically saved to the cloud"\s*>\s*<Save size=\{13\}/>\s*\{manualSaveStatus === \'saving\' \? \'Saving to Cloud...\' : manualSaveStatus === \'error\' \? \'Save Failed! Click to Retry\' : \'Save Draft & Exit\'\}\s*</button>\s*\)\}\s*</div>\s*<div className="flex gap-1\.5">'

replacement_jsx = """<div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
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
            <div className="flex gap-1.5">"""

text = re.sub(target, replacement_jsx, text)

with open("src/components/ProposalWizard.jsx", "w") as f:
    f.write(text)
print("patch applied")
