import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const dbContent = fs.readFileSync(DB_FILE, 'utf-8');
const db = JSON.parse(dbContent);

const targets = [2849, 1480, 5218, 250];

db.transactions.forEach(t => {
  const amt = Math.abs(t.amount);
  if (targets.some(v => Math.abs(amt - v) < 1)) {
    console.log(t);
  }
});
