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
  
  if (nl.includes('carlos alexandre bilher')) {
    t.description = 'Aluguel + IPTU (Carlos Alexandre)'; updated++;
  } else if (nl.includes('pagamento administradora')) {
    t.description = 'Mercado do Condomínio (Administradora)'; updated++;
  } else if (nl.includes('dinheiro reservado contas gerais')) {
    t.description = 'Reserva: Restituição do IR'; updated++;
  } else if (nl.includes('safari montagem')) {
    t.description = 'Entrada do Sofá (Casa Saldão/Safari)'; updated++;
  } else if (nl.includes('tatuape')) {
    t.description = 'Mercado para a Igreja (Tatuapé)'; updated++;
  } else if (nl.includes('pix recebido matheus bueno da silva') && t.type === 'expense') {
    // wait, it's 'pix enviado matheus bueno da silva' for expense!
  } else if (nl.includes('pix enviado matheus bueno da silva')) {
    t.description = 'Transferência: Saldo Cartão Pré-Pago (Matheus)'; updated++;
  } else if (nl.includes('dl*google')) {
    t.description = 'Assinatura: Gemini (Google)'; updated++;
  } else if (nl.includes('juliana santos donciv') && t.amount < 0) {
    t.description = 'Fatura do Cartão de Crédito (Juliana)'; updated++;
  } else if (nl.includes('xurdir vincituro')) {
    t.description = 'Dízimo (Xurdir)'; updated++;
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log('Descrições atualizadas: ' + updated);
