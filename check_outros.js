import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

console.log('--- OUTROS EXPENSES ---');
db.transactions.forEach(t => {
  if ((t.category === 'Outros' || t.category === 'Outras Despesas') && t.type === 'expense') {
    console.log(`${t.date} | ${t.amount} | ${t.description}`);
  }
});
