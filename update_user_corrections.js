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
  
  if (nl.includes('pagamento administradora')) {
    t.category = 'Alimentação'; // Market inside condo
    updated++;
  }
  else if (nl.includes('carlos alexandre bilher')) {
    t.category = 'Moradia'; // Rent + IPTU
    updated++;
  }
  else if (nl.includes('matheus bueno da silva')) {
    if (t.amount < 0 && t.category === 'Reserva Financeira') {
      t.category = 'Outros'; // Prepaid card top-up, not actual savings
      updated++;
    }
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log('Transações atualizadas de acordo com feedback: ' + updated);
