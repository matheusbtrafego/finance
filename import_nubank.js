import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const dbContent = fs.readFileSync(DB_FILE, 'utf-8');
const db = JSON.parse(dbContent);

const faturaText = `
06 JUN Curso Matheus - Parcela 6/12 R$ 58,65
06 JUN Shoppingdefilhote - Enzo - Parcela 4/6 R$ 101,66
06 JUN Zp*Luciana D35134 - Parcela 3/3 R$ 83,33
06 JUN DÍVIDA MOTO (multas) - Parcela 8/12 R$ 346,43
06 JUN Renovias Fpay R$ 17,60
06 JUN Mercadolivre CAPACETE - Parcela 8/12 R$ 74,85
06 JUN Petshopaqualandia - Parcela 3/3 R$ 126,63
14 JUN Ifd*Toka do Sushi R$ 53,79
14 JUN Dm*Spotify R$ 23,90
16 JUN Mercadolivre*Gigatudo R$ 234,74
18 JUN Lj 23 Clovis Calcados R$ 129,99
24 JUN Dl*Uberrides R$ 7,98
24 JUN Shopee *Pitayavibes R$ 59,70
27 JUN Tiktok Shop *Macklifea R$ 18,07
03 JUL Shopee *Essenciasdacec R$ 23,09
05 JUL Mercado*Mercadolivre - Parcela 1/2 R$ 137,69
`;

const lines = faturaText.trim().split('\n');
let inserted = 0;

const monthMap = { 'JUN': '06', 'JUL': '07' };

lines.forEach(line => {
  const match = line.match(/^(\d{2})\s+([A-Z]{3})\s+(.*?)\s+R\$\s+([-0-9,.]+)$/);
  if (match) {
    const day = match[1];
    const month = monthMap[match[2]];
    const desc = match[3].trim();
    const amountStr = match[4].replace(/\./g, '').replace(',', '.');
    const amount = -parseFloat(amountStr); // It's an expense
    const date = `2026-${month}-${day}`;

    let category = 'Outros';
    const nl = desc.toLowerCase();
    
    if (nl.includes('toka do sushi')) category = 'Alimentação';
    else if (nl.includes('moto') || nl.includes('renovias') || nl.includes('capacete') || nl.includes('uber')) category = 'Transporte';
    else if (nl.includes('spotify')) category = 'Lazer';
    
    db.transactions.push({
      id: Date.now() + Math.random().toString(),
      date,
      description: `Cartão: ${desc}`,
      amount,
      category,
      type: 'expense'
    });
    inserted++;
  }
});

// Remove or neutralize the lump sum Fatura payment so it doesn't double count
let neutralized = 0;
db.transactions.forEach(t => {
  if (t.amount === -1580 && t.description.includes('Juliana')) {
    t.type = 'transfer'; // Removes it from totalExpense math!
    t.description = 'Pagamento Fatura Cartão (Desconsiderado)';
    neutralized++;
  }
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log(`Transações inseridas: ${inserted}, Faturas neutralizadas: ${neutralized}`);
