import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

let matheusUpdates = 0;
let julianaImports = 0;

// 1. Corrigir transações do Matheus no db
db.transactions.forEach(t => {
  const amt = t.amount;
  // Salario (3188.51 e 2030.00)
  if (Math.abs(amt - 3188.51) < 1 || Math.abs(amt - 2030) < 1) {
    if (t.description.includes('MATHEUS BUENO DA SILVA')) {
      t.description = `[Salário] Matheus - Parcela`;
      t.category = 'Outras Entradas';
      matheusUpdates++;
    }
  }
  // Restituição (2849)
  if (Math.abs(amt - 2849) < 1) {
    t.description = `[Restituição IR] Matheus`;
    t.category = 'Outras Entradas';
    matheusUpdates++;
  }
  // Retiradas reserva (1200 e 280)
  if ((Math.abs(amt - 1200) < 1 || Math.abs(amt - 280) < 1) && t.description.includes('Contas gerais')) {
    t.type = 'transfer';
    t.description = `[Transferência Interna] Resgate Reserva`;
    matheusUpdates++;
  }
  // Pix Juliana 250
  if (Math.abs(amt - 250) < 1 && t.description.includes('Fatura do Cartão') && t.type === 'income') {
    t.type = 'transfer';
    t.description = `[Transferência Interna] Recebido de Juliana`;
    matheusUpdates++;
  }
});

// 2. Transações manuais extraídas do PDF da Juliana
const julianaTxs = [
  // date, description, amount, category, type
  ['2026-07-01', '[Juliana] Aluguel', -1900.00, 'Moradia', 'expense'], // transfer to Mercado Pago - actually it's an expense because they use Mercado Pago to pay it? No, if it goes to MP it's a transfer! Wait, if she pays the rent via MP, the expense is in MP. So this is a transfer.
  ['2026-07-07', '[Juliana] MP *JOHNNEGUT', -90.00, 'Outros', 'expense'],
  ['2026-07-08', '[Juliana] Transferência Interna (Matheus)', 200.00, 'Transferências', 'transfer'],
  ['2026-07-08', '[Juliana] Luana Campos (Agência)', 1200.00, 'Outras Entradas', 'income'],
  ['2026-07-08', '[Juliana] Luisarakaki', -14.96, 'Outros', 'expense'],
  ['2026-07-08', '[Juliana] ENEL (Luz)', -160.01, 'Moradia', 'expense'],
  ['2026-07-09', '[Juliana] Transferência Interna (Matheus)', 300.00, 'Transferências', 'transfer'],
  ['2026-07-09', '[Juliana] Transferência Interna (Thais)', -135.00, 'Outros', 'transfer'], // Internal family? Keep as expense? Let's use expense.
  ['2026-07-09', '[Juliana] LELLO (Condomínio)', -721.83, 'Moradia', 'expense'],
  ['2026-07-09', '[Juliana] CLARO', -129.72, 'Moradia', 'expense'],
  ['2026-07-10', '[Juliana] Victor Larcher', -95.00, 'Outros', 'expense'],
  ['2026-07-13', '[Juliana] Jonathan Rodrigues (Agência)', 1000.00, 'Outras Entradas', 'income'],
  ['2026-07-13', '[Juliana] Luiz Carlos (Agência)', 180.00, 'Outras Entradas', 'income'],
  ['2026-07-13', '[Juliana] Thais Bueno', -135.00, 'Outros', 'expense'],
  ['2026-07-13', '[Juliana] MesquitaGuimaraes', -240.00, 'Outros', 'expense'],
  ['2026-07-15', '[Juliana] Tatiane Bazilio', -75.00, 'Outros', 'expense'],
  ['2026-07-19', '[Juliana] Transferência Interna (Matheus)', -250.00, 'Transferências', 'transfer'],
  ['2026-07-21', '[Juliana] WMS Supermercados', -161.31, 'Alimentação', 'expense'],
  ['2026-07-21', '[Juliana] SWIFT', -68.70, 'Alimentação', 'expense'],
  ['2026-07-23', '[Juliana] Transferência Interna (Matheus)', 1580.00, 'Transferências', 'transfer'],
  ['2026-07-23', '[Juliana] Pagamento Fatura Nu', -1576.44, 'Outros', 'expense'], // This is the fatura payment! Should be transfer because we already imported the Nu fatura separately? WAIT! We imported the Nu fatura separately? No, the Nu fatura we imported before was R$ 1.498,10 total! This is the Nu fatura.
  ['2026-07-25', '[Juliana] Luana Priscila', -100.00, 'Outros', 'expense'],
  ['2026-07-25', '[Juliana] Pizzaria Brothers', -54.00, 'Alimentação', 'expense'],
  ['2026-07-29', '[Juliana] Thais Bueno (Agência)', 550.00, 'Outras Entradas', 'income'],
  ['2026-07-30', '[Juliana] Thais Bueno', -120.00, 'Outros', 'expense']
];

julianaTxs.forEach(t => {
  db.transactions.push({
    id: Date.now() + Math.random().toString(),
    date: t[0],
    description: t[1],
    amount: t[2],
    category: t[3],
    type: t[4]
  });
  julianaImports++;
});

// Post processing for the Nu Fatura:
// The 1576.44 is the "Pagamento Fatura Nu". 
// Wait, the credit card statement we imported earlier had R$ 1.498,10 in expenses and was neutralized. 
// Let's also neutralize this one so it doesn't double count if they have both.
db.transactions.forEach(t => {
  if (t.description === '[Juliana] Pagamento Fatura Nu') {
    t.type = 'transfer';
  }
  if (t.description === '[Juliana] Aluguel') {
    t.type = 'transfer'; // because she transferred 1900 to Mercado Pago, and the Mercado Pago actually paid Carlos Alexandre Billar (Aluguel+IPTU) on 04-07-2026!
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log(`Matheus Updated: ${matheusUpdates}, Juliana Imported: ${julianaImports}`);
