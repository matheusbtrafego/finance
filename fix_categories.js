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
  
  // Start auto posto, Auto posto franci, Autopostoparque etc are already Transporte
  // If we missed OXXO or COOKIE
  if (nl.includes('oxxo') || nl.includes('cookie lovers')) {
    if (t.category !== 'Alimentação') { t.category = 'Alimentação'; updated++; }
  }
  else if (nl.includes('safari montagem') || nl.includes('administradora')) {
    if (t.category !== 'Moradia') { t.category = 'Moradia'; updated++; }
  }
  else if (nl.includes('dinheiro reservado contas gerais') || nl.includes('pix enviado matheus bueno da silva')) {
    if (t.category !== 'Reserva Financeira') { t.category = 'Reserva Financeira'; updated++; }
  }
  else if (nl.includes('dl*google')) {
    if (t.category !== 'Lazer') { t.category = 'Lazer'; updated++; }
  }
  else if (nl.includes('osasco') || nl.includes('itapevi') || nl.includes('barueri') || nl.includes('tatuape')) {
    if (t.category !== 'Transporte') { t.category = 'Transporte'; updated++; }
  }
});

if (updated > 0) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}
console.log('Transações atualizadas: ' + updated);
