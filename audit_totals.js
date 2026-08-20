import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

let inc = 0;
let exp = 0;
let tra = 0;

db.transactions.forEach(t => {
  if (t.type === 'income') inc += t.amount;
  if (t.type === 'expense') exp += Math.abs(t.amount);
  if (t.type === 'transfer') tra += Math.abs(t.amount);
});

console.log(`Income: ${inc}`);
console.log(`Expense: ${exp}`);
console.log(`Transfers: ${tra}`);
