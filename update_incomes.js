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
  if (t.type === 'income') {
    const nl = t.description.toLowerCase();
    
    if (nl.includes('rendimento')) {
      t.category = 'Rendimentos';
      updated++;
    } else if (nl.includes('reembolso')) {
      t.category = 'Reembolsos';
      updated++;
    } else if (nl.includes('transferência') || nl.includes('pix recebido') || nl.includes('dinheiro retirado')) {
      t.category = 'Transferências';
      updated++;
    } else if (t.category === 'Receita') {
      t.category = 'Outras Entradas';
      updated++;
    }
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log('Receitas categorizadas: ' + updated);
