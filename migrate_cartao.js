import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

let count = 0;
db.transactions.forEach(t => {
  if (t.description.startsWith('Cartão:')) {
    t.category = 'Cartão de Crédito';
    count++;
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log(`Migrated ${count} transactions to Cartão de Crédito`);
