import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

db.transactions.forEach(t => {
  if (t.category === 'Moradia') {
    console.log(`[${t.type}] ${t.date} | ${t.amount} | ${t.description}`);
  }
});

console.log('--- ALL TRANSFERS ---');
db.transactions.forEach(t => {
  if (t.type === 'transfer') {
    console.log(`[${t.type}] ${t.date} | ${t.amount} | ${t.description}`);
  }
});
