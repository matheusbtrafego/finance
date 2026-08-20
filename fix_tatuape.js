import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const dbContent = fs.readFileSync(DB_FILE, 'utf-8');
const db = JSON.parse(dbContent);

let updated = 0;

db.transactions.forEach(t => {
  const nl = t.description.toLowerCase();
  
  // Tatuape (51,00 and 14,60) should be Alimentacao
  if (nl.includes('tatuape')) {
    if (t.category !== 'Alimentação') {
      t.category = 'Alimentação';
      updated++;
    }
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log('Transações Tatuapé corrigidas: ' + updated);
