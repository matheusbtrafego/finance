import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

let updates = 0;

db.transactions.forEach(t => {
  // 1. Matheus 200 and 300 to Juliana
  if (t.description === 'Fatura do Cartão de Crédito (Juliana)' && (t.amount === -200 || t.amount === -300)) {
    t.type = 'transfer';
    t.description = `[Transferência Interna] Enviado para Juliana`;
    updates++;
  }
  
  // 2. Juliana 1900 to Matheus
  if (t.description === '[Juliana] Aluguel' && t.amount === -1900) {
    t.type = 'transfer';
    t.description = `[Juliana] Transferência Interna (Matheus Aluguel)`;
    updates++; // Wait, this was already 'transfer' according to my diagnose, but changing the description ensures it's clear.
  }

  // 3. Babá Thais Bueno label
  if (t.description === '[Babá] Thais Bueno' && t.amount === 550) {
    t.description = `[Juliana] Babá Thais Bueno`;
    updates++;
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log(`Updated ${updates} transactions.`);
