const xlsx = require('xlsx');

function dumpSheet(filePath) {
    console.log(`\n\n=== DUMPING: ${filePath} ===`);
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        let csv = xlsx.utils.sheet_to_csv(sheet);
        
        // Trim empty lines for readability
        csv = csv.split('\n').filter(line => line.replace(/,/g, '').trim().length > 0).slice(0, 40).join('\n');
        console.log(csv);
    } catch (e) {
        console.log("Error:", e.message);
    }
}

dumpSheet('/Volumes/TOMI DRIVE/Sales/1-MASTER ESTIMATE.xls');
dumpSheet('/Volumes/TOMI DRIVE/Sales/1-Sales Cost Sheet Master.xls');
