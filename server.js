import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

/* ─────────────────────────────────────────────────────────
   MODELO DE DADO
   - people: quem pode ser dono de uma transação
   - categoryRules: substituem os regex duplicados que existiam
     em App.jsx (parseOFX), import.js e no prompt do Gemini.
     Uma única fonte de verdade, editável pelo painel.
   - purchases: uma compra parcelada é uma entidade própria —
     as N transações-parcela nascem linkadas a ela por
     transaction.installment.purchaseId, então "quanto falta"
     e "quando acaba" são cálculo determinístico, não
     reconstrução manual de texto de fatura.
───────────────────────────────────────────────────────── */
const DEFAULT_PEOPLE = [
  { key: 'matheus',  label: 'Matheus' },
  { key: 'juliana',  label: 'Juliana' },
  { key: 'conjunta', label: 'Conjunta / Casa' },
];

// Seed equivalente às regras de regex que estavam espalhadas em
// App.jsx, import.js e no prompt do Gemini — agora centralizadas
// e editáveis em Configurações, em vez de hardcoded em 3 lugares.
const DEFAULT_CATEGORY_RULES = [
  { id: 'r1',  keyword: 'aluguel',       category: 'Moradia' },
  { id: 'r2',  keyword: 'condomini',     category: 'Moradia' },
  { id: 'r3',  keyword: 'luz',           category: 'Moradia' },
  { id: 'r4',  keyword: 'energia',       category: 'Moradia' },
  { id: 'r5',  keyword: 'enel',          category: 'Moradia' },
  { id: 'r6',  keyword: 'claro',         category: 'Moradia' },
  { id: 'r7',  keyword: 'agua',          category: 'Moradia' },
  { id: 'r8',  keyword: 'supermercado',  category: 'Alimentação' },
  { id: 'r9',  keyword: 'mercado',       category: 'Alimentação' },
  { id: 'r10', keyword: 'padaria',       category: 'Alimentação' },
  { id: 'r11', keyword: 'ifood',         category: 'Alimentação' },
  { id: 'r12', keyword: 'rappi',         category: 'Alimentação' },
  { id: 'r13', keyword: 'hortifruti',    category: 'Alimentação' },
  { id: 'r14', keyword: 'uber',          category: 'Transporte' },
  { id: 'r15', keyword: '99',            category: 'Transporte' },
  { id: 'r16', keyword: 'posto',         category: 'Transporte' },
  { id: 'r17', keyword: 'combustivel',   category: 'Transporte' },
  { id: 'r18', keyword: 'gasolina',      category: 'Transporte' },
  { id: 'r19', keyword: 'bilhete unico', category: 'Transporte' },
  { id: 'r20', keyword: 'pedagio',       category: 'Transporte' },
  { id: 'r21', keyword: 'farmacia',      category: 'Saúde' },
  { id: 'r22', keyword: 'drogaria',      category: 'Saúde' },
  { id: 'r23', keyword: 'consulta',      category: 'Saúde' },
  { id: 'r24', keyword: 'dentista',      category: 'Saúde' },
  { id: 'r25', keyword: 'netflix',       category: 'Lazer' },
  { id: 'r26', keyword: 'spotify',       category: 'Lazer' },
  { id: 'r27', keyword: 'cinema',        category: 'Lazer' },
  { id: 'r28', keyword: 'restaurante',   category: 'Lazer' },
  { id: 'r29', keyword: 'tesouro',       category: 'Reserva Financeira' },
  { id: 'r30', keyword: 'cdb',           category: 'Reserva Financeira' },
  { id: 'r31', keyword: 'corretora',     category: 'Reserva Financeira' },
  { id: 'r32', keyword: 'dizimo',        category: 'Dízimo' },
  { id: 'r33', keyword: 'rendimento',    category: 'Rendimentos' },
  { id: 'r34', keyword: 'reembolso',     category: 'Reembolsos' },
];

// Plano de Ação: separa o que já se SABE que vai pagar (entrada,
// custo fixo, cartão) da reserva (que é saldo acumulado, não fluxo
// mensal). É a "planilha bonita" — editável no painel, sem precisar
// reconstruir isso em texto a cada conversa. Seed = último cenário
// fechado na análise.
const DEFAULT_PLAN_ITEMS = [
  // ── Entradas ──
  { id: 'pe1', section: 'entrada', name: 'Cliente',             amount: 1200 },
  { id: 'pe2', section: 'entrada', name: 'Agência',             amount: 1200 },
  { id: 'pe3', section: 'entrada', name: 'Agência',             amount: 700 },
  { id: 'pe4', section: 'entrada', name: 'Agência',             amount: 1000 },
  { id: 'pe5', section: 'entrada', name: 'Agência',             amount: 1500 },
  { id: 'pe6', section: 'entrada', name: 'Agência / Parceria',  amount: 3600 },
  { id: 'pe7', section: 'entrada', name: 'Babá',                amount: 1200 },
  // ── Custos fixos ──
  { id: 'pf1',  section: 'fixo', name: 'Moradia — Aluguel + IPTU',       amount: 1936.81 },
  { id: 'pf2',  section: 'fixo', name: 'Moradia — Condomínio',           amount: 721.83 },
  { id: 'pf3',  section: 'fixo', name: 'Moradia — Luz',                  amount: 160.01 },
  { id: 'pf4',  section: 'fixo', name: 'Moradia — Internet (residencial)', amount: 129.72 },
  { id: 'pf5',  section: 'fixo', name: 'Moradia — Internet (linha extra)', amount: 59 },
  { id: 'pf6',  section: 'fixo', name: 'Moradia — Internet (linha extra)', amount: 67 },
  { id: 'pf7',  section: 'fixo', name: 'Carro — Parcela',                amount: 2250 },
  { id: 'pf8',  section: 'fixo', name: 'Carro — Seguro',                 amount: 700 },
  { id: 'pf9',  section: 'fixo', name: 'Carro — Manutenção (média)',     amount: 1500 },
  { id: 'pf10', section: 'fixo', name: 'Alimentação',                   amount: 1000 },
  { id: 'pf11', section: 'fixo', name: 'Assinatura — Claude',            amount: 110 },
  { id: 'pf12', section: 'fixo', name: 'Assinatura — Gemini',            amount: 25 },
  { id: 'pf13', section: 'fixo', name: 'Assinatura — Netflix',           amount: 20 },
  { id: 'pf14', section: 'fixo', name: 'Assinatura — Gigo',              amount: 19 },
  { id: 'pf15', section: 'fixo', name: 'Assinatura — Servidor',          amount: 30 },
  // ── Cartão de crédito ──
  { id: 'pc1', section: 'cartao', name: 'Cartão de crédito (projeção)',  amount: 250 },
  // ── Reserva ──
  { id: 'pr1', section: 'reserva', name: 'Reserva de emergência',       amount: 10000 },
];

const initialDb = {
  transactions: [],
  goals: [],
  purchases: [],
  people: DEFAULT_PEOPLE,
  categoryRules: DEFAULT_CATEGORY_RULES,
  planItems: DEFAULT_PLAN_ITEMS,
  settings: {
    familyName: "Usuário",
    monthlyBudget: 10000,
    categoryBudgets: {
      moradia: 2500,
      alimentacao: 2000,
      transporte: 1000,
      saude: 1000,
      lazer: 1500,
      reserva: 1500,
      outros: 500
    }
  }
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(content);
    // Migração leve: bancos antigos podem não ter os campos novos.
    if (!db.purchases) db.purchases = [];
    if (!db.people) db.people = DEFAULT_PEOPLE;
    if (!db.categoryRules) db.categoryRules = DEFAULT_CATEGORY_RULES;
    if (!db.planItems) db.planItems = DEFAULT_PLAN_ITEMS;
    return db;
  } catch (err) {
    console.error("Erro ao ler db.json, usando dados iniciais:", err);
    return initialDb;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Erro ao escrever no db.json:", err);
    return false;
  }
}

/* ─────────────────────────────────────────────────────────
   Categorização por regra — substitui o regex duplicado.
───────────────────────────────────────────────────────── */
function applyCategoryRules(description, rules, fallback) {
  const nl = (description || '').toLowerCase();
  const hit = rules.find(r => nl.includes(r.keyword.toLowerCase()));
  return hit ? hit.category : fallback;
}

/* ─────────────────────────────────────────────────────────
   Métricas determinísticas — nada disso passa por IA.
   Usado tanto por /api/summary (painel) quanto por
   /api/coach-advice (que agora só narra em cima destes
   números já prontos, em vez de "calcular" dentro do prompt).
───────────────────────────────────────────────────────── */
function computeMetrics(db) {
  const today = new Date().toISOString().split('T')[0];
  const tx = db.transactions;

  const sum = (list) => list.reduce((s, t) => s + Math.abs(t.amount), 0);

  const totalIncome  = sum(tx.filter(t => t.type === 'income'));
  const totalExpense = sum(tx.filter(t => t.type === 'expense'));
  const netBalance   = totalIncome - totalExpense;

  const byCategory = {};
  tx.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount);
  });

  const byPerson = {};
  tx.filter(t => t.type === 'expense').forEach(t => {
    const p = t.person || 'conjunta';
    byPerson[p] = (byPerson[p] || 0) + Math.abs(t.amount);
  });

  const byMonth = {};
  tx.forEach(t => {
    const m = (t.date || '').slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 };
    if (t.type === 'income') byMonth[m].income += t.amount;
    if (t.type === 'expense') byMonth[m].expense += Math.abs(t.amount);
  });

  const cb = db.settings?.categoryBudgets || {};
  const budgetKeyMap = {
    'Moradia': 'moradia', 'Alimentação': 'alimentacao', 'Transporte': 'transporte',
    'Saúde': 'saude', 'Lazer': 'lazer', 'Reserva Financeira': 'reserva',
    'Dízimo': 'dizimo', 'Outros': 'outros'
  };
  const budgetVsActual = Object.entries(budgetKeyMap).map(([cat, key]) => ({
    category: cat,
    budget: cb[key] || 0,
    actual: byCategory[cat] || 0,
    over: (byCategory[cat] || 0) > (cb[key] || 0) && (cb[key] || 0) > 0
  }));

  // Parcelas em aberto: derivado 100% das transações-filha de cada
  // compra, comparando a data de cada parcela com hoje. Nada aqui
  // é reconstruído manualmente lendo texto de fatura.
  const openInstallments = db.purchases.map(p => {
    const children = tx
      .filter(t => t.installment?.purchaseId === p.id)
      .sort((a, b) => a.installment.number - b.installment.number);
    const paid = children.filter(t => t.date <= today);
    const remaining = children.filter(t => t.date > today);
    const monthlyAmount = children[0] ? Math.abs(children[0].amount) : 0;
    return {
      purchaseId: p.id,
      description: p.description,
      category: p.category,
      person: p.person,
      installmentCount: p.installmentCount,
      paidCount: paid.length,
      remainingCount: remaining.length,
      monthlyAmount,
      remainingTotal: remaining.reduce((s, t) => s + Math.abs(t.amount), 0),
      finishesOn: children.length ? children[children.length - 1].date : null,
      done: remaining.length === 0
    };
  }).filter(p => !p.done);
  openInstallments.sort((a, b) => a.remainingCount - b.remainingCount);

  const committedInstallmentsPerMonth = openInstallments.reduce((s, p) => s + p.monthlyAmount, 0);

  // Fila de classificação: tudo que caiu em categoria genérica
  // ("Outros"/"Outras Despesas") ou sem pessoa definida — fica
  // visível no painel em vez de acumular silenciosamente.
  const unclassified = tx.filter(t =>
    t.type === 'expense' && (t.category === 'Outros' || t.category === 'Outras Despesas' || !t.person)
  );

  // Plano de Ação: a "planilha" que o usuário edita no painel —
  // separa o que já se sabe que tem que pagar (entrada, fixo,
  // cartão) da reserva, que é saldo acumulado, não fluxo mensal.
  // Tudo somado aqui, zero IA.
  const planItems = db.planItems || [];
  const planBySection = { entrada: [], fixo: [], cartao: [], reserva: [] };
  planItems.forEach(p => {
    if (!planBySection[p.section]) planBySection[p.section] = [];
    planBySection[p.section].push(p);
  });
  const planTotal = (section) => (planBySection[section] || []).reduce((s, p) => s + (p.amount || 0), 0);
  const planEntradas = planTotal('entrada');
  const planFixo     = planTotal('fixo');
  const planCartao   = planTotal('cartao');
  const planReserva  = planTotal('reserva');
  const planComprometido = planFixo + planCartao;
  const planSummary = {
    bySection: planBySection,
    entradas: planEntradas,
    fixo: planFixo,
    cartao: planCartao,
    reserva: planReserva,
    comprometido: planComprometido,
    saldo: planEntradas - planComprometido,
    mesesDeReserva: planComprometido > 0 ? planReserva / planComprometido : 0
  };

  return {
    totalIncome, totalExpense, netBalance,
    savingsRate: totalIncome > 0 ? Math.max(0, netBalance / totalIncome * 100) : 0,
    byCategory, byPerson, byMonth,
    budgetVsActual,
    openInstallments,
    committedInstallmentsPerMonth,
    unclassified: {
      count: unclassified.length,
      total: sum(unclassified),
      items: unclassified
    },
    planSummary
  };
}

/* ═════════════════ REST API — Core ═════════════════ */
app.get('/api/data', (req, res) => {
  res.json(readDb());
});

app.get('/api/summary', (req, res) => {
  res.json(computeMetrics(readDb()));
});

app.post('/api/transactions', (req, res) => {
  const db = readDb();
  const newTx = {
    id: Date.now().toString(),
    date: req.body.date || new Date().toISOString().split('T')[0],
    description: req.body.description,
    amount: parseFloat(req.body.amount),
    category: req.body.category || 'Outros',
    type: req.body.type || (parseFloat(req.body.amount) >= 0 ? 'income' : 'expense'),
    person: req.body.person || 'conjunta',
    installment: req.body.installment || null
  };
  db.transactions.unshift(newTx);
  writeDb(db);
  res.status(201).json(newTx);
});

app.put('/api/transactions/:id', (req, res) => {
  const db = readDb();
  const index = db.transactions.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    db.transactions[index] = { ...db.transactions[index], ...req.body, id: req.params.id };
    writeDb(db);
    res.json(db.transactions[index]);
  } else {
    res.status(404).json({ error: "Transação não encontrada" });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  const db = readDb();
  const initialLength = db.transactions.length;
  db.transactions = db.transactions.filter(t => t.id !== req.params.id);
  if (db.transactions.length < initialLength) {
    writeDb(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Transação não encontrada" });
  }
});

/* ═════════════════ Goals ═════════════════ */
app.post('/api/goals', (req, res) => {
  const db = readDb();
  const newGoal = {
    id: Date.now().toString(),
    name: req.body.name,
    targetAmount: parseFloat(req.body.targetAmount),
    currentAmount: parseFloat(req.body.currentAmount || 0),
    deadline: req.body.deadline
  };
  db.goals.push(newGoal);
  writeDb(db);
  res.status(201).json(newGoal);
});

app.put('/api/goals/:id', (req, res) => {
  const db = readDb();
  const index = db.goals.findIndex(g => g.id === req.params.id);
  if (index !== -1) {
    db.goals[index] = { ...db.goals[index], ...req.body, id: req.params.id };
    writeDb(db);
    res.json(db.goals[index]);
  } else {
    res.status(404).json({ error: "Meta não encontrada" });
  }
});

app.delete('/api/goals/:id', (req, res) => {
  const db = readDb();
  const initialLength = db.goals.length;
  db.goals = db.goals.filter(g => g.id !== req.params.id);
  if (db.goals.length < initialLength) {
    writeDb(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Meta não encontrada" });
  }
});

/* ═════════════════ Category Rules ═════════════════ */
app.post('/api/category-rules', (req, res) => {
  const db = readDb();
  const rule = { id: Date.now().toString(), keyword: (req.body.keyword || '').trim(), category: req.body.category };
  if (!rule.keyword || !rule.category) return res.status(400).json({ error: 'keyword e category são obrigatórios' });
  db.categoryRules.push(rule);
  writeDb(db);
  res.status(201).json(rule);
});

app.delete('/api/category-rules/:id', (req, res) => {
  const db = readDb();
  db.categoryRules = db.categoryRules.filter(r => r.id !== req.params.id);
  writeDb(db);
  res.json({ success: true });
});

/* ═════════════════ Plano de Ação ═════════════════
   A "planilha" editável do painel: entrada / fixo / cartão / reserva.
   CRUD simples — os totais e o saldo são sempre recalculados em
   computeMetrics() a partir desses itens, nunca digitados à mão. */
app.post('/api/plan-items', (req, res) => {
  const db = readDb();
  const item = {
    id: Date.now().toString(),
    section: req.body.section || 'fixo', // entrada | fixo | cartao | reserva
    name: (req.body.name || '').trim(),
    amount: parseFloat(req.body.amount || 0)
  };
  if (!item.name) return res.status(400).json({ error: 'name é obrigatório' });
  db.planItems.push(item);
  writeDb(db);
  res.status(201).json(item);
});

app.put('/api/plan-items/:id', (req, res) => {
  const db = readDb();
  const index = db.planItems.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Item não encontrado' });
  const updated = { ...db.planItems[index], ...req.body, id: req.params.id };
  if (req.body.amount !== undefined) updated.amount = parseFloat(req.body.amount) || 0;
  db.planItems[index] = updated;
  writeDb(db);
  res.json(updated);
});

app.delete('/api/plan-items/:id', (req, res) => {
  const db = readDb();
  const initialLength = db.planItems.length;
  db.planItems = db.planItems.filter(p => p.id !== req.params.id);
  if (db.planItems.length < initialLength) {
    writeDb(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Item não encontrado' });
  }
});

/* ═════════════════ Purchases (parcelamento) ═════════════════
   Cria a compra + todas as N transações-parcela já linkadas.
   Permite registrar uma compra que já estava em andamento
   (ex: "8/12, faltam 4") via startInstallmentNumber.
─────────────────────────────────────────────────────────── */
app.post('/api/purchases', (req, res) => {
  const db = readDb();
  const {
    description, totalAmount, installmentCount,
    startDate, category, person,
    startInstallmentNumber
  } = req.body;

  if (!description || !totalAmount || !installmentCount || !startDate) {
    return res.status(400).json({ error: 'description, totalAmount, installmentCount e startDate são obrigatórios' });
  }

  const purchase = {
    id: Date.now().toString(),
    description,
    totalAmount: parseFloat(totalAmount),
    installmentCount: parseInt(installmentCount, 10),
    startDate,
    category: category || 'Outros',
    person: person || 'conjunta'
  };

  const firstNumber = startInstallmentNumber ? parseInt(startInstallmentNumber, 10) : 1;
  const monthlyAmount = Math.round((purchase.totalAmount / purchase.installmentCount) * 100) / 100;

  const newTx = [];
  for (let n = firstNumber; n <= purchase.installmentCount; n++) {
    const d = new Date(startDate + 'T00:00:00');
    d.setMonth(d.getMonth() + (n - firstNumber));
    newTx.push({
      id: Date.now().toString() + '-' + n,
      date: d.toISOString().split('T')[0],
      description: `${description} (Parcela ${n}/${purchase.installmentCount})`,
      amount: -monthlyAmount,
      category: purchase.category,
      type: 'expense',
      person: purchase.person,
      installment: { purchaseId: purchase.id, number: n, total: purchase.installmentCount }
    });
  }

  db.purchases.push(purchase);
  db.transactions.unshift(...newTx);
  writeDb(db);
  res.status(201).json({ purchase, transactions: newTx });
});

app.delete('/api/purchases/:id', (req, res) => {
  const db = readDb();
  db.purchases = db.purchases.filter(p => p.id !== req.params.id);
  // Remove só as parcelas futuras (o histórico já pago permanece no extrato).
  const today = new Date().toISOString().split('T')[0];
  db.transactions = db.transactions.filter(t =>
    !(t.installment?.purchaseId === req.params.id && t.date > today)
  );
  writeDb(db);
  res.json({ success: true });
});

/* ═════════════════ Settings ═════════════════ */
app.put('/api/settings', (req, res) => {
  const db = readDb();
  db.settings = { ...db.settings, ...req.body };
  writeDb(db);
  res.json(db.settings);
});

/* ═════════════════ Gemini AI — Statement Parser ═════════════════
   A IA só faz o que só ela pode fazer: interpretar texto não
   estruturado. Categoria final é sempre reconciliada com as
   categoryRules (determinístico) antes de responder, e parcelas
   da mesma compra são agrupadas automaticamente numa Purchase.
─────────────────────────────────────────────────────────────── */
app.post('/api/analyze-statement', async (req, res) => {
  const { text, defaultPerson } = req.body;
  if (!text) {
    return res.status(400).json({ error: "O texto do extrato é obrigatório." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chave da API do Gemini não configurada no servidor." });
  }

  try {
    const db = readDb();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Você é um assistente financeiro especializado em processamento de extratos bancários.
Analise o texto abaixo, que é o extrato bancário de uma pessoa ou família. Extraia todas as transações financeiras (receitas e despesas).

Para cada transação encontrada, você deve identificar:
1. A data da transação (no formato YYYY-MM-DD). Se o ano não estiver especificado, assuma o ano atual 2026.
2. A descrição clara do estabelecimento ou serviço (limpe códigos desnecessários).
3. O valor numérico (positivo para receitas, negativo para despesas).
4. A categoria sugerida, escolhendo estritamente entre uma destas:
   - "Moradia" (aluguel, condomínio, contas de água/luz)
   - "Alimentação" (supermercado, padaria, feira, delivery)
   - "Transporte" (combustível, aplicativo, transporte público)
   - "Saúde" (farmácia, plano de saúde, consultas)
   - "Lazer" (restaurantes, assinaturas, passeios)
   - "Reserva Financeira" (aportes, investimentos, poupança)
   - "Outros" (gastos eventuais)
   - "Receita" (salários, rendimentos, pix recebido)
5. Se a descrição indicar parcelamento (ex: "Parcela 3/12"), extraia installmentNumber e installmentTotal como números. Caso contrário, use null nos dois.

Retorne APENAS um array JSON válido (sem markdown, sem explicações adicionais, sem bloco de código triplo. Apenas o array de objetos puramente).
Cada objeto deve ter a estrutura:
{
  "date": "YYYY-MM-DD",
  "description": "Nome limpo do estabelecimento",
  "amount": -150.00,
  "category": "Alimentação",
  "type": "expense" (ou "income"),
  "installmentNumber": null,
  "installmentTotal": null
}

Texto do extrato:
"""
${text}
"""`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let cleanJson = responseText;
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    const rawTransactions = JSON.parse(cleanJson);

    // Reconciliação determinística: se existe uma regra de categoria
    // pro merchant, ela vence o palpite da IA — reduz a categorização
    // divergente que gerava os scripts fix_*.js manuais.
    const person = defaultPerson || 'conjunta';
    const transactions = rawTransactions.map(t => {
      const ruleCategory = applyCategoryRules(t.description, db.categoryRules, null);
      return {
        ...t,
        category: ruleCategory || t.category,
        person,
        installment: (t.installmentNumber && t.installmentTotal)
          ? { number: t.installmentNumber, total: t.installmentTotal }
          : null
      };
    });

    res.json({ transactions });
  } catch (error) {
    console.error("Erro ao analisar extrato com Gemini:", error);
    res.status(500).json({ error: "Falha ao processar o extrato com Inteligência Artificial: " + error.message });
  }
});

/* ═════════════════ Gemini AI — Coach (agora só narra) ═════════════════
   O cálculo sai daqui. computeMetrics() já fez toda a aritmética antes
   de qualquer chamada à IA — o Gemini recebe números prontos e só
   comenta em cima deles. Isso é mais barato, mais rápido, e elimina
   o risco de a IA "errar conta" no meio do relatório.
──────────────────────────────────────────────────────────────────── */
app.post('/api/coach-advice', async (req, res) => {
  const db = readDb();
  const metrics = computeMetrics(db);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Mesmo sem IA disponível, os números determinísticos continuam
    // úteis — devolve metrics para o painel exibir de qualquer forma.
    return res.status(200).json({ advice: null, metrics, aiUnavailable: true });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const goalsSummary = db.goals.map(g => `${g.name}: R$ ${g.currentAmount.toFixed(2)} de R$ ${g.targetAmount.toFixed(2)} (Prazo: ${g.deadline})`).join('\n');

    const prompt = `Você é um Consultor Financeiro Pessoal analítico e objetivo.
Os números abaixo JÁ FORAM CALCULADOS pelo sistema — não recalcule nada, não invente números diferentes. Use exatamente estes valores para comentar, diagnosticar gargalos e recomendar ações.

MÉTRICAS DO PERÍODO (JSON):
${JSON.stringify(metrics, null, 2)}

METAS ATUAIS:
${goalsSummary || 'Nenhuma meta cadastrada.'}

Estruture sua resposta em Markdown, abordando:
1. **Diagnóstico**: leitura dos números acima — orçado vs. realizado, maiores gargalos, parcelamentos em aberto que pesam no fluxo.
2. **Recomendações práticas**: ações específicas, priorizadas pelo maior impacto.
3. **Plano de metas**: como usar o saldo/reserva disponível pra avançar nas metas cadastradas.

Não repita os números em tabela — eles já aparecem no painel. Foque em interpretação e recomendação.`;

    const result = await model.generateContent(prompt);
    res.json({ advice: result.response.text(), metrics });
  } catch (error) {
    console.error("Erro ao gerar conselho financeiro com Gemini:", error);
    // Falha na IA não deve derrubar os números determinísticos.
    res.status(200).json({ advice: null, metrics, aiError: error.message });
  }
});

/* ═════════════════ Frontend Integration ═════════════════ */
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  console.log("Iniciando em ambiente de Desenvolvimento...");
  const { createServer: createViteServer } = await import('vite');

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    root: __dirname
  });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    try {
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
} else {
  console.log("Iniciando em ambiente de Produção...");
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  app.get('/*splat', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando com sucesso em: http://localhost:${PORT}`);
});
