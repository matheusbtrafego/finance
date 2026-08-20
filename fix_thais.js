import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

db.transactions.forEach(t => {
  if (t.description.toLowerCase().includes('thais')) {
    if (t.amount > 0) {
      t.description = '[Babá] Thais Bueno';
      t.category = 'Serviços/Vendas'; // Or Outras Entradas
      if (t.category === 'Serviços/Vendas') {
         // wait, does this category exist in our incomes? 
         // we only have: Transferências, Rendimentos, Reembolsos, Outras Entradas.
         // Let's use Outras Entradas for now, or rename it.
         t.category = 'Outras Entradas'; 
      }
    }
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log('Thais updated');
