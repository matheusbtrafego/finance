import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

console.log('--- ALL TRANSACTIONS ---');
db.transactions.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(t => {
  const source = t.description.includes('[Juliana]') ? 'JULIANA' : 'MATHEUS';
  console.log(`[${source}] ${t.date} | ${t.type.padEnd(8)} | ${String(t.amount).padStart(8)} | ${t.category.padEnd(15)} | ${t.description}`);
});
