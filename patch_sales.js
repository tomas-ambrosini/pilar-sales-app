const fs = require('fs');
let code = fs.readFileSync('src/pages/Sales.jsx', 'utf8');

// Rename component
code = code.replace(/export default function SalesPipeline\(\) \{/, 'export default function Sales() {');

// Add activeTab state
code = code.replace(/const \[inspectingJob, setInspectingJob\] = useState\(null\);/, "const [inspectingJob, setInspectingJob] = useState(null);\n  const [activeTab, setActiveTab] = useState('pipeline');");

// Import Proposals
if (!code.includes("import Proposals from './Proposals';")) {
   code = code.replace("import OpportunityOverviewModal from '../components/OpportunityOverviewModal';", "import OpportunityOverviewModal from '../components/OpportunityOverviewModal';\nimport Proposals from './Proposals';");
}

// Modify Header Title
code = code.replace(/Sales Pipeline<\/h1>\n\s*<p className="text-slate-500 font-medium ml-1">High-density revenue tracking\. Logical progression only\.<\/p>/, 
`Sales Hub</h1>
                <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit ml-1 mt-2 border border-slate-200/80">
                    <button 
                        onClick={() => setActiveTab('pipeline')} 
                        className={\`px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all \${activeTab === 'pipeline' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}>
                        Pipeline
                    </button>
                    <button 
                        onClick={() => setActiveTab('proposals')} 
                        className={\`px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all \${activeTab === 'proposals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}>
                        Proposals
                    </button>
                </div>`);

// Conditionally render Kanban board or Proposals
code = code.replace(/\{\/\* Kanban Board Container \*\/\}/, 
`{activeTab === 'proposals' ? (
            <div className="flex-1 overflow-hidden rounded-3xl relative z-10 bg-white shadow-sm border border-slate-200">
                <div className="h-full overflow-y-auto">
                    <Proposals embedded={true} />
                </div>
            </div>
        ) : (
        <React.Fragment>
        {/* Kanban Board Container */}`);

// We need to close the React.Fragment after the Kanban Board Container. 
// The Kanban Board Container ends right before "{/* Modals */}"
code = code.replace(/\{\/\* Modals \*\/\}/, `</React.Fragment>\n        )} \n\n        {/* Modals */}`);

fs.writeFileSync('src/pages/Sales.jsx', code);
console.log('Patched Sales.jsx');
