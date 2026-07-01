import * as XLSX from 'xlsx';

const EXCEL_FILE = 'C:\\Users\\lhp\\Desktop\\2023-2025年海南高考本科投档分数线.xlsx';

const workbook = XLSX.readFile(EXCEL_FILE);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('表头（第一行）:');
console.log(Object.keys(data[0] || {}));

console.log('\n前5行数据:');
for(let i = 0; i < Math.min(5, data.length); i++) {
  console.log(`行${i+1}:`, data[i]);
}
