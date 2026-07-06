import fs from 'fs';

function updateSales() {
    let salesContent = fs.readFileSync('src/pages/Sales.jsx', 'utf-8');

    // Update function signature
    salesContent = salesContent.replace(
        /export default function Sales\(\) \{/,
        'export default function Sales({ isEmbedded = false, isViewOnly = false }) {'
    );

    // Update header to hide if embedded
    salesContent = salesContent.replace(
        /\{\/\* Header Block \*\/\}/,
        '{/* Header Block */}\n        {!isEmbedded && ('
    );
    // Find the end of the header block. It ends right before `{activeTab === 'proposals' ?`
    salesContent = salesContent.replace(
        /        \{\s*activeTab === 'proposals' \? \(/,
        '        )}\n\n        {activeTab === \'proposals\' ? ('
    );

    // Disable dragging
    salesContent = salesContent.replace(
        /<Draggable key=\{job\.id\} draggableId=\{job\.id\} index=\{index\}>/g,
        '<Draggable key={job.id} draggableId={job.id} index={index} isDragDisabled={isViewOnly}>'
    );

    // Hide assign menu button
    salesContent = salesContent.replace(
        /<button\s+onClick=\{\(e\) => \{\s+e\.stopPropagation\(\);\s+setActiveAssignMenu\(\s*activeAssignMenu === job\.id \? null : job\.id\s*\);\s+\}\}\s+className="p-1 hover:bg-slate-200 rounded-md transition-colors shrink-0 text-slate-400 hover:text-slate-700"\s+title="Assign Salesperson"\s*>/,
        '{!isViewOnly && (<button onClick={(e) => { e.stopPropagation(); setActiveAssignMenu(activeAssignMenu === job.id ? null : job.id); }} className="p-1 hover:bg-slate-200 rounded-md transition-colors shrink-0 text-slate-400 hover:text-slate-700" title="Assign Salesperson">'
    );
    // Close the button condition block
    // Wait, let's just do a string replacement for the button block manually in the actual script
    
    // Actually, I'll do this safely via multi_replace_file_content instead of script string replacements.
}

