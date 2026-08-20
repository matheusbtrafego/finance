import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

db.transactions.forEach(t => {
  if (t.description.toLowerCase().includes('aluguel')) {
    console.log(`[db.json] ${t.date} | ${t.amount} | ${t.description} | ${t.type}`);
  }
});

const appJsx = fs.readFileSync(path.join(__dirname, 'src', 'App.jsx'), 'utf-8');
const lines = appJsx.split('\n');
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('aluguel')) {
    console.log(`[App.jsx:${i+1}] ${l}`);
  }
});
