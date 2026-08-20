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
  
  if (nl.includes('jefferson rafael clemente')) {
    t.description = 'Barbearia (Jefferson)';
    t.category = 'Saúde';
    updated++;
  } else if (nl.includes('mirella alencar')) {
    t.description = 'Dentista (Mirella)';
    t.category = 'Saúde';
    updated++;
  } else if (nl.includes('juliana santos donciv')) {
    // We previously named them all "Fatura do Cartão..."
    // Fix the 200 one
    if (t.amount === -200) {
      t.description = 'Transferência (Juliana)';
    } else {
      t.description = 'Fatura do Cartão de Crédito (Juliana)';
    }
    t.category = 'Outros'; // Keep in Outros
    updated++;
  } else if (nl.includes('xurdir')) {
    t.category = 'Dízimo';
    updated++;
  } else if (nl.includes('carlos henrique reis abrao')) {
    t.description = 'Bombom (Carlos Reis)';
    t.category = 'Alimentação';
    updated++;
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log('Transações Outros/Dízimo atualizadas: ' + updated);
