const XLSX = require('xlsx');
const fs = require('fs');

const filePath = '/Users/tomasambrosini/Downloads/catalog price list template test.xlsx';

try {
    const workbook = XLSX.readFile(filePath, { cellFormula: true });
    
    let result = '';
    
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        result += `=== Sheet: ${sheetName} ===\n`;
        
        // Convert to array of arrays to iterate easily
        const range = XLSX.utils.decode_range(sheet['!ref']);
        for(let R = range.s.r; R <= range.e.r; ++R) {
            let rowContext = [];
            for(let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = {c:C, r:R};
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                const cell = sheet[cell_ref];
                if (!cell) {
                    rowContext.push('');
                    continue;
                }
                
                let val = cell.v !== undefined ? cell.v : '';
                if(cell.f) {
                    val = `[FORMULA: ${cell.f} | VAL: ${val}]`;
                }
                rowContext.push(val);
            }
            if(rowContext.some(v => v !== '')) {
                result += rowContext.join(' | ') + '\n';
            }
        }
        result += '\n';
    });
    
    fs.writeFileSync('./excel_dump.txt', result);
    console.log("Successfully extracted to excel_dump.txt");

} catch (err) {
    console.error("Error reading file:", err);
}
