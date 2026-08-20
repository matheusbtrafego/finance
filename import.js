import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

const text = `01-07-2026 Rendimentos 1746096911566 R$ 0,03 R$ 76,63
02-07-2026 Rendimentos 1746152704661 R$ 0,03 R$ 76,66
03-07-2026 Rendimentos 1746225110417 R$ 0,04 R$ 76,70
03-07-2026 Pix recebido Matheus Bueno Da Silva 167012740856 R$ 2.849,00 R$ 2.925,70
03-07-2026 Pagamento Uber 167077157504 R$ -9,95 R$ 2.915,75
03-07-2026 Pagamento Uber 167076537988 R$ -7,99 R$ 2.907,76
03-07-2026 Pagamento com QR Pix Jefferson Rafael Clemente 166241638019 R$ -50,00 R$ 2.857,76
03-07-2026 Pagamento Uber 166243238031 R$ -9,95 R$ 2.847,81
04-07-2026 Reembolso de pagamento Uber 167077157504 R$ 9,95 R$ 2.857,76
04-07-2026 Pagamento Padaria da vila 167150296786 R$ -5,00 R$ 2.852,76
04-07-2026 Pagamento Uber 166309731821 R$ -16,99 R$ 2.835,77
04-07-2026 Pagamento Uber 166330887019 R$ -19,98 R$ 2.815,79
04-07-2026 Pix enviado Mirella Alencar da Silva 167175401282 R$ -300,00 R$ 2.515,79
04-07-2026 Pagamento com QR Pix IFOOD.COM AGENCIA DE RESTAURANTES ONLINE S.A. 166347820303 R$ -32,35 R$ 2.483,44
05-07-2026 Pagamento Uber 167292695492 R$ -36,97 R$ 2.446,47
05-07-2026 Pagamento Uber 167324573210 R$ -23,98 R$ 2.422,49
06-07-2026 Rendimentos 1746301907939 R$ 1,24 R$ 2.423,73
06-07-2026 Pagamento Bilhete Único (São Paulo) 166573606323 R$ -10,60 R$ 2.413,13
06-07-2026 Transferência recebida MATHEUS BUENO DA SILVA 167479173264 R$ 3.188,51 R$ 5.601,64
07-07-2026 Rendimentos 1746382063272 R$ 2,39 R$ 5.604,03
07-07-2026 Pagamento OXXO 167661910070 R$ -10,98 R$ 5.593,05
08-07-2026 Rendimentos 1746465636704 R$ 2,38 R$ 5.595,43
08-07-2026 Pagamento Bilhete Único (São Paulo) 166922089261 R$ -10,60 R$ 5.584,83
08-07-2026 Pagamento Bilhete Único (São Paulo) 166922119313 R$ -5,30 R$ 5.579,53
08-07-2026 Pix enviado Juliana Santos Donciv 166924037495 R$ -200,00 R$ 5.379,53
08-07-2026 Dinheiro reservado Contas gerais 167778076174 R$ -2.500,00 R$ 2.879,53
08-07-2026 Pix enviado Jose Agnaldo Batista dos Reis 166925758211 R$ -50,00 R$ 2.829,53
08-07-2026 Pagamento Auto posto franci 166926332553 R$ -70,00 R$ 2.759,53
08-07-2026 Pagamento Cacau show chacar 166983688541 R$ -64,97 R$ 2.694,56
09-07-2026 Rendimentos 1746520792442 R$ 1,15 R$ 2.695,71
09-07-2026 Dinheiro retirado Contas gerais 168009981712 R$ 1.200,00 R$ 3.895,71
09-07-2026 Pagamento com QR Pix SAFARI MONTAGEM LTDA 167153903125 R$ -1.200,00 R$ 2.695,71
09-07-2026 Pix enviado Juliana Santos Donciv 168076286280 R$ -300,00 R$ 2.395,71
10-07-2026 Rendimentos 1746551184268 R$ 1,11 R$ 2.396,82
10-07-2026 Pix enviado Carlos Alexandre Bilher 167308146409 R$ -1.936,81 R$ 460,01
10-07-2026 Pagamento com QR Pix WMS SUPERMERCADOS DO BRASIL LTDA. 167377704899 R$ -181,32 R$ 278,69
10-07-2026 Pix enviado Matheus Bueno da Silva 167390258445 R$ -20,00 R$ 258,69
11-07-2026 Pagamento com QR Pix Jefferson Rafael Clemente 168313242286 R$ -50,00 R$ 208,69
12-07-2026 Pagamento Administradora 167621631957 R$ -26,50 R$ 182,19
13-07-2026 Rendimentos 1746610879391 R$ 0,09 R$ 182,28
14-07-2026 Rendimentos 1746706364669 R$ 0,08 R$ 182,36
15-07-2026 Rendimentos 1746771045618 R$ 0,08 R$ 182,44
15-07-2026 Pagamento Padaria da vila 168030816811 R$ -15,50 R$ 166,94
16-07-2026 Rendimentos 1746840135782 R$ 0,07 R$ 167,01
17-07-2026 Rendimentos 1746899081263 R$ 0,07 R$ 167,08
18-07-2026 Pagamento Padaria da vila 168538877747 R$ -23,50 R$ 143,58
18-07-2026 Pagamento Dl*google google 169438116198 R$ -96,99 R$ 46,59
19-07-2026 Pix recebido Juliana Santos Donciv 168668482989 R$ 250,00 R$ 296,59
19-07-2026 Pagamento Tatuape 169542836438 R$ -51,00 R$ 245,59
19-07-2026 Pagamento Tatuape 168676989567 R$ -14,60 R$ 230,99
19-07-2026 Pix enviado 63.491.973 XURDIR VINCITURO FELIX PINTO 169558069182 R$ -100,00 R$ 130,99
20-07-2026 Rendimentos 1746984410066 R$ 0,06 R$ 131,05
20-07-2026 Transferência recebida MATHEUS BUENO DA SILVA 168805426623 R$ 2.030,00 R$ 2.161,05
20-07-2026 Pix enviado Matheus Bueno da Silva 169746456408 R$ -100,00 R$ 2.061,05
21-07-2026 Rendimentos 1747072344021 R$ 0,91 R$ 2.061,96
21-07-2026 Pagamento com QR Pix DIA BRASIL SOCIEDADE LIMITADA EM RECUPERACAO JUDICIAL 169867254052 R$ -6,77 R$ 2.055,19
22-07-2026 Rendimentos 1747128366306 R$ 0,88 R$ 2.056,07
22-07-2026 Pagamento Autopostoparque 169975632796 R$ -20,00 R$ 2.036,07
22-07-2026 Pagamento com QR Pix Jefferson Rafael Clemente 170071614678 R$ -50,00 R$ 1.986,07
22-07-2026 Pagamento Start auto posto 169193376261 R$ -83,59 R$ 1.902,48
23-07-2026 Rendimentos 1747191798246 R$ 0,85 R$ 1.903,33
23-07-2026 Pix enviado Juliana Santos Donciv 169288109101 R$ -1.580,00 R$ 323,33
23-07-2026 Pagamento com QR Pix DROGARIA YUMI LTDA 169364447137 R$ -29,94 R$ 293,39
24-07-2026 Rendimentos 1747265740306 R$ 0,13 R$ 293,52
24-07-2026 Dinheiro retirado Contas gerais 170337124006 R$ 280,00 R$ 573,52
24-07-2026 Pix enviado Luiz Carlos Bueno da Silva 169457531637 R$ -280,00 R$ 293,52
24-07-2026 Pagamento com QR Pix COOKIE LOVERS CSA LTDA 170357974752 R$ -22,00 R$ 271,52
25-07-2026 Pagamento Padaria da vila 170488448540 R$ -5,00 R$ 266,52
25-07-2026 Pagamento Uber 169641824639 R$ -10,99 R$ 255,53
26-07-2026 Pagamento Start auto posto 170610079644 R$ -20,00 R$ 235,53
26-07-2026 Pagamento Start auto posto 170610811352 R$ -50,00 R$ 185,53
26-07-2026 Pagamento Osasco 169726741219 R$ -4,20 R$ 181,33
26-07-2026 Pagamento Itapevi 170614005246 R$ -9,80 R$ 171,53
26-07-2026 Pagamento Barueri 170648106804 R$ -4,20 R$ 167,33
27-07-2026 Rendimentos 1747333848228 R$ 0,08 R$ 167,41
27-07-2026 Pagamento com código QR Guilherme Batista Das Chagas 170791850816 R$ -28,00 R$ 139,41
28-07-2026 Rendimentos 1747419639291 R$ 0,06 R$ 139,47
29-07-2026 Rendimentos 1747489446719 R$ 0,06 R$ 139,53
29-07-2026 Pagamento Netflix 170135974597 R$ -20,90 R$ 118,63
29-07-2026 Pix enviado Beatriz Goncalves dos Santos 171040562538 R$ -38,00 R$ 80,63
30-07-2026 Rendimentos 1747559179051 R$ 0,04 R$ 80,67
30-07-2026 Pix enviado Carlos Henrique Reis Abrao 170382070337 R$ -5,00 R$ 75,67
31-07-2026 Rendimentos 1747626691252 R$ 0,03 R$ 75,70`;

const lines = text.split('\n');
const transactions = [];

lines.forEach(line => {
  const cleanLine = line.trim();
  if (!cleanLine) return;
  const match = cleanLine.match(/^(\d{2}-\d{2}-\d{4})\s+(.*?)\s+R\$\s+([-0-9,.]+)\s+R\$\s+([-0-9,.]+)$/);
  if (match) {
    const rawDate = match[1];
    let desc = match[2];
    // remove possible ID at the end of desc
    desc = desc.replace(/\s+\d+$/, '');
    const amountStr = match[3].replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(amountStr);
    
    // date to YYYY-MM-DD
    const date = `${rawDate.slice(6,10)}-${rawDate.slice(3,5)}-${rawDate.slice(0,2)}`;
    
    const nl = desc.toLowerCase();
    let category = amount > 0 ? 'Receita' : 'Outros';
    if (amount < 0) {
      if (/aluguel|condominio|luz|agua|energia|gas/.test(nl)) category = 'Moradia';
      else if (/supermercado|mercado|padaria|hortifruti|ifood|rappi|dia brasil|wms supermercados/.test(nl)) category = 'Alimentação';
      else if (/uber|99|combustivel|posto|gasolina|passagem|bilhete único/.test(nl)) category = 'Transporte';
      else if (/farmacia|unimed|consulta|exame|saude|drogaria/.test(nl)) category = 'Saúde';
      else if (/netflix|spotify|cinema|restaurante|lazer|cacau show/.test(nl)) category = 'Lazer';
      else if (/invest|tesouro|cdb|poupan|corretora|b3/.test(nl)) category = 'Reserva Financeira';
    }
    
    transactions.push({
      id: Date.now().toString() + Math.random().toString(),
      date,
      description: desc,
      amount,
      category,
      type: amount >= 0 ? 'income' : 'expense'
    });
  }
});

const dbContent = fs.readFileSync(DB_FILE, 'utf-8');
const db = JSON.parse(dbContent);

// Add to beginning
db.transactions = [...transactions, ...db.transactions];

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
console.log('Inseridos ' + transactions.length + ' registros.');
