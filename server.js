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

// Initialize db.json if not present
const initialDb = {
  transactions: [],
  goals: [],
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
    return JSON.parse(content);
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

// REST API Endpoints
app.get('/api/data', (req, res) => {
  res.json(readDb());
});

app.post('/api/transactions', (req, res) => {
  const db = readDb();
  const newTx = {
    id: Date.now().toString(),
    date: req.body.date || new Date().toISOString().split('T')[0],
    description: req.body.description,
    amount: parseFloat(req.body.amount),
    category: req.body.category || 'Outros',
    type: req.body.type || (parseFloat(req.body.amount) >= 0 ? 'income' : 'expense')
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

// Goals Endpoints
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

// Settings Endpoints
app.put('/api/settings', (req, res) => {
  const db = readDb();
  db.settings = { ...db.settings, ...req.body };
  writeDb(db);
  res.json(db.settings);
});

// Gemini AI Statement Parser Endpoint
app.post('/api/analyze-statement', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "O texto do extrato é obrigatório." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chave da API do Gemini não configurada no servidor." });
  }

  try {
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

Retorne APENAS um array JSON válido (sem markdown, sem explicações adicionais, sem bloco de código triplo. Apenas o array de objetos puramente).
Cada objeto deve ter a estrutura:
{
  "date": "YYYY-MM-DD",
  "description": "Nome limpo do estabelecimento",
  "amount": -150.00,
  "category": "Alimentação",
  "type": "expense" (ou "income")
}

Texto do extrato:
"""
${text}
"""`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Clean up potential markdown formatting that Gemini might output
    let cleanJson = responseText;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const transactions = JSON.parse(cleanJson);
    res.json({ transactions });
  } catch (error) {
    console.error("Erro ao analisar extrato com Gemini:", error);
    res.status(500).json({ error: "Falha ao processar o extrato com Inteligência Artificial: " + error.message });
  }
});

// Gemini AI Financial Coach Advice Endpoint
app.post('/api/coach-advice', async (req, res) => {
  const db = readDb();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chave da API do Gemini não configurada no servidor." });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Prepare data summary for Gemini
    const transactionsSummary = db.transactions.map(t => `${t.date}: ${t.description} | ${t.category} | R$ ${t.amount.toFixed(2)}`).join('\n');
    const goalsSummary = db.goals.map(g => `${g.name}: R$ ${g.currentAmount.toFixed(2)} de R$ ${g.targetAmount.toFixed(2)} (Prazo: ${g.deadline})`).join('\n');
    const budgets = db.settings.categoryBudgets;
    const settingsSummary = `Orçamento Mensal Total: R$ ${db.settings.monthlyBudget}
Limites Planejados:
- Moradia: R$ ${budgets.moradia}
- Alimentação: R$ ${budgets.alimentacao}
- Transporte: R$ ${budgets.transporte}
- Saúde: R$ ${budgets.saude}
- Lazer: R$ ${budgets.lazer}
- Reserva Financeira: R$ ${budgets.reserva}
- Outros: R$ ${budgets.outros}`;

    const prompt = `Você é um Consultor Financeiro Pessoal analítico, objetivo e focado em otimização de orçamento e investimentos reais.
Com base nos dados financeiros da pessoa abaixo, elabore um relatório de planejamento financeiro, identificando gargalos, oportunidades de melhoria e recomendações.

DADOS DA PESSOA:
---
${settingsSummary}

METAS ATUAIS:
${goalsSummary}

TRANSAÇÕES REGISTRADAS:
${transactionsSummary}
---

Por favor, estruture seu conselho com clareza e objetividade, abordando:
1. **Diagnóstico do Fluxo Financeiro**: Como está o equilíbrio entre o planejado vs gasto em cada categoria. Identifique onde estão os maiores gargalos.
2. **Recomendações Práticas**: Dicas específicas e acionáveis sobre como economizar ou otimizar o orçamento.
3. **Plano de Investimentos**: Sugira estratégias de investimentos e realocação de recursos para atingir as metas no prazo estipulado (ex: renda fixa, reserva de emergência, etc.).

Retorne o resultado formatado em Markdown claro e profissional, com uma linguagem encorajadora mas técnica.`;

    const result = await model.generateContent(prompt);
    res.json({ advice: result.response.text() });
  } catch (error) {
    console.error("Erro ao gerar conselho financeiro com Gemini:", error);
    res.status(500).json({ error: "Falha ao gerar orientações da IA: " + error.message });
  }
});

// Setup Frontend Integration
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  // Integrate Vite Dev Server in development mode
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
  // Serve static build files in production mode
  console.log("Iniciando em ambiente de Produção...");
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando com sucesso em: http://localhost:${PORT}`);
});
