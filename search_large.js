import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const dbContent = fs.readFileSync(DB_FILE, 'utf-8');
const db = JSON.parse(dbContent);

db.transactions.forEach(t => {
  if (t.type === 'income') {
    console.log(`${t.date} | ${t.description} | ${t.amount}`);
  }
});
