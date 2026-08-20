import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Upload,
  FileText, PiggyBank, Compass, Settings as SettingsIcon,
  Plus, Trash2, RefreshCw, Check, AlertCircle, BookOpen,
  ArrowUpRight, ArrowDownRight, Layers, ChevronRight, ChevronDown, ChevronUp,
  Sparkles, X
} from 'lucide-react';

/* ─── Constantes ─────────────────────────────────────── */
const CATEGORIES = ['Receita', 'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Reserva Financeira', 'Dízimo', 'Outros'];

const ENVELOPES = [
  { key: 'moradia',     label: 'Moradia',     cat: 'Moradia',            color: '#4A78B5', bg: '#EBF3FF', textColor: '#2E508A' },
  { key: 'alimentacao', label: 'Alimentação', cat: 'Alimentação',        color: '#C8973E', bg: '#FFF9EC', textColor: '#8C6525' },
  { key: 'transporte',  label: 'Transporte',  cat: 'Transporte',         color: '#7C57C2', bg: '#F2EEFF', textColor: '#5B3E9B' },
  { key: 'saude',       label: 'Saúde',       cat: 'Saúde',              color: '#3D8C5E', bg: '#EAFAF0', textColor: '#256140' },
  { key: 'lazer',       label: 'Lazer',       cat: 'Lazer',              color: '#D45C5C', bg: '#FCE7E7', textColor: '#9F3A3A' },
  { key: 'reserva',     label: 'Reserva',     cat: 'Reserva Financeira', color: '#4CAF50', bg: '#E8F5E9', textColor: '#388E3C' },
  { key: 'dizimo',      label: 'Dízimo',      cat: 'Dízimo',             color: '#9C27B0', bg: '#F3E5F5', textColor: '#4A148C' },
  { key: 'outros',      label: 'Outros',      cat: 'Outros',             color: '#8A92A6', bg: '#F3F4F7', textColor: '#5C657A' },
];

const INCOME_CATEGORIES = [
  { key: 'transferencias', label: 'Transferências', cat: 'Transferências', color: '#10B981', bg: '#D1FAE5' },
  { key: 'rendimentos',    label: 'Rendimentos',    cat: 'Rendimentos',    color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'reembolsos',     label: 'Reembolsos',     cat: 'Reembolsos',     color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'outras_entradas',label: 'Outras Entradas',cat: 'Outras Entradas',color: '#6B7280', bg: '#F3F4F6' },
];

// Quem pode ser dono de uma transação. Diferente das categorias
// (que mudam com frequência via categoryRules vindas do backend),
// as pessoas da casa são estáveis — fica simples aqui mesmo.
const PEOPLE = [
  { key: 'matheus',  label: 'Matheus' },
  { key: 'juliana',  label: 'Juliana' },
  { key: 'conjunta', label: 'Conjunta / Casa' },
];
const personLabel = (key) => PEOPLE.find(p => p.key === key)?.label ?? 'Conjunta / Casa';

const BRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const fmt = (date) => date?.split('-').reverse().join('/') ?? '-';

/* ─── Categorização por regra ────────────────────────────
   Fonte única: as regras vêm do backend (data.categoryRules,
   editáveis em Configurações). Antes esse mapeamento existia
   duplicado aqui, no import.js e no prompt do Gemini — agora
   é uma função só, chamada de todo lugar que precisa sugerir
   categoria a partir de um texto de extrato.
──────────────────────────────────────────────────────── */
function categorize(description, amount, rules) {
  if (amount > 0) return 'Receita';
  const nl = (description || '').toLowerCase();
  const hit = (rules || []).find(r => nl.includes(r.keyword.toLowerCase()));
  return hit ? hit.category : 'Outros';
}

/* ─── OFX Parser ─────────────────────────────────────── */
function parseOFX(text, rules) {
  const blocks = text.split(/<STMTTRN>/i);
  return blocks.slice(1).map(b => {
    const tag = t => { const m = b.match(new RegExp(`<${t}>([^<\r\n]+)`, 'i')); return m ? m[1].trim() : ''; };
    const name   = tag('NAME') || tag('MEMO') || 'Transação';
    const amtStr = tag('TRNAMT');
    const dateStr = tag('DTPOSTED');
    if (!amtStr) return null;
    const amount = parseFloat(amtStr);
    let date = new Date().toISOString().split('T')[0];
    if (dateStr.length >= 8) date = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
    const category = categorize(name, amount, rules);
    return { id: Date.now() + Math.random(), date, description: name, amount, category, type: amount >= 0 ? 'income' : 'expense', person: 'conjunta' };
  }).filter(Boolean);
}

/* ════════════════════════════════════════════════════════
   APP
════════════════════════════════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState({ transactions: [], goals: [], purchases: [], categoryRules: [], settings: {} });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);


  // TX form
  const [txDate,   setTxDate]   = useState(new Date().toISOString().split('T')[0]);
  const [txDesc,   setTxDesc]   = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType,   setTxType]   = useState('expense');
  const [txCat,    setTxCat]    = useState('Outros');
  const [txPerson, setTxPerson] = useState('conjunta');

  // Parcelamento form
  const [pDesc,    setPDesc]    = useState('');
  const [pTotal,   setPTotal]   = useState('');
  const [pCount,   setPCount]   = useState('');
  const [pStartNum,setPStartNum]= useState('1');
  const [pDate,    setPDate]    = useState(new Date().toISOString().split('T')[0]);
  const [pCat,     setPCat]     = useState('Outros');
  const [pPerson,  setPPerson]  = useState('conjunta');

  // Regra de categorização
  const [ruleKeyword,  setRuleKeyword]  = useState('');
  const [ruleCategory, setRuleCategory] = useState('Outros');

  // Goal form
  const [gName,     setGName]     = useState('');
  const [gTarget,   setGTarget]   = useState('');
  const [gCurrent,  setGCurrent]  = useState('');
  const [gDeadline, setGDeadline] = useState('');

  // Settings
  const [famName,      setFamName]      = useState('Família');
  const [budget,       setBudget]       = useState(0);
  const [limMoradia, setLimMoradia] = useState(0);
  const [limAlimentacao, setLimAlimentacao] = useState(0);
  const [limTransporte, setLimTransporte] = useState(0);
  const [limSaude, setLimSaude] = useState(0);
  const [limLazer, setLimLazer] = useState(0);
  const [limReserva, setLimReserva] = useState(0);
  const [limDizimo, setLimDizimo] = useState(0);
  const [limOutros, setLimOutros] = useState(0);

  // Import
  const [pastedText, setPastedText] = useState('');
  const [aiParsing,  setAiParsing]  = useState(false);
  const [imported,   setImported]   = useState([]);
  const [ofxName,    setOfxName]    = useState('');
  const [importPerson, setImportPerson] = useState('conjunta');

  // Filters
  const [fMonth,  setFMonth]  = useState('all');
  const [fCat,    setFCat]    = useState('all');
  const [fPerson, setFPerson] = useState('all');

  // Coach
  const [advice,        setAdvice]        = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  /* ── Fetch ── */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/data');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      setError(null);
      const s  = json.settings ?? {};
      const cb = s.categoryBudgets ?? {};
      setFamName(s.familyName ?? 'Família');
      setBudget(s.monthlyBudget ?? 0);
      setLimMoradia(cb.moradia ?? 0);
      setLimAlimentacao(cb.alimentacao ?? 0);
      setLimTransporte(cb.transporte ?? 0);
      setLimSaude(cb.saude ?? 0);
      setLimLazer(cb.lazer ?? 0);
      setLimReserva(cb.reserva ?? 0);
      setLimDizimo(cb.dizimo ?? 0);
      setLimOutros(cb.outros ?? 0);
      // Números determinísticos do painel — não passam por IA.
      const sumRes = await fetch('/api/summary');
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch {
      setError('Não foi possível conectar ao servidor local (localhost:3010).');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();

  }, []);

  /* ── Calculated totals ── */
  const totalIncome  = data.transactions.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const totalExpense = data.transactions.filter(t => t.type === 'expense').reduce((s,t) => s + Math.abs(t.amount), 0);
  const netBalance   = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? Math.max(0, netBalance / totalIncome * 100) : 0;

  const actual = (cat) => data.transactions.filter(t => t.category === cat && t.type === 'expense').reduce((s,t) => s + Math.abs(t.amount), 0);
  const limMap  = { moradia: +limMoradia||1, alimentacao: +limAlimentacao||1, transporte: +limTransporte||1, saude: +limSaude||1, lazer: +limLazer||1, reserva: +limReserva||1, dizimo: +limDizimo||1, outros: +limOutros||1 };

  const months   = [...new Set(data.transactions.map(t => t.date?.slice(0,7)).filter(Boolean))].sort().reverse();
  const filtered = data.transactions.filter(t =>
    (fMonth  === 'all' || t.date?.startsWith(fMonth)) &&
    (fCat    === 'all' || t.category === fCat) &&
    (fPerson === 'all' || (t.person || 'conjunta') === fPerson)
  );

  /* ── API helpers ── */
  const postJSON = (url, body) => fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const putJSON  = (url, body) => fetch(url, { method: 'PUT',  headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const del      = (url)       => fetch(url, { method: 'DELETE' });

  const addTx = async (e) => {
    e.preventDefault();
    const amount = parseFloat(txAmount) * (txType === 'expense' ? -1 : 1);
    await postJSON('/api/transactions', { date: txDate, description: txDesc, amount, category: txType === 'income' ? 'Receita' : txCat, type: txType, person: txPerson });
    setTxDesc(''); setTxAmount(''); fetchData();
  };

  /* ── Parcelamento: cria a compra + as N transações-parcela linkadas ── */
  const addPurchase = async (e) => {
    e.preventDefault();
    await postJSON('/api/purchases', {
      description: pDesc, totalAmount: +pTotal, installmentCount: +pCount,
      startInstallmentNumber: +pStartNum || 1, startDate: pDate, category: pCat, person: pPerson
    });
    setPDesc(''); setPTotal(''); setPCount(''); setPStartNum('1'); fetchData();
  };

  const deletePurchase = async (id) => {
    if (!confirm('Remover este parcelamento? As parcelas futuras (ainda não vencidas) serão apagadas do extrato — as já pagas permanecem.')) return;
    await del(`/api/purchases/${id}`); fetchData();
  };

  /* ── Regras de categorização (substituem os regex hardcoded) ── */
  const addRule = async (e) => {
    e.preventDefault();
    if (!ruleKeyword.trim()) return;
    await postJSON('/api/category-rules', { keyword: ruleKeyword, category: ruleCategory });
    setRuleKeyword(''); fetchData();
  };

  const deleteRule = async (id) => { await del(`/api/category-rules/${id}`); fetchData(); };

  /* ── Reclassificação rápida (usada na fila de classificação) ── */
  const reclassify = async (id, category) => { await putJSON(`/api/transactions/${id}`, { category }); fetchData(); };
  const reassignPerson = async (id, person) => { await putJSON(`/api/transactions/${id}`, { person }); fetchData(); };

  const deleteTx = async (id) => { if (!confirm('Remover transação?')) return; await del(`/api/transactions/${id}`); fetchData(); };

  const addGoal = async (e) => {
    e.preventDefault();
    await postJSON('/api/goals', { name: gName, targetAmount: +gTarget, currentAmount: +(gCurrent||0), deadline: gDeadline });
    setGName(''); setGTarget(''); setGCurrent(''); setGDeadline(''); fetchData();
  };

  const contributeGoal = async (id, cur, tar) => {
    const val = prompt('Quanto deseja aportar? (R$)');
    if (!val || isNaN(val)) return;
    const n = +cur + +val;
    if (n > tar && !confirm('Supera a meta. Confirmar?')) return;
    await putJSON(`/api/goals/${id}`, { currentAmount: n }); fetchData();
  };

  const deleteGoal = async (id) => { if (!confirm('Remover meta?')) return; await del(`/api/goals/${id}`); fetchData(); };

  const saveSettings = async (e) => {
    e.preventDefault();
    await putJSON('/api/settings', {
      familyName: famName, monthlyBudget: +budget,
      categoryBudgets: { moradia: +limMoradia, alimentacao: +limAlimentacao, transporte: +limTransporte, saude: +limSaude, lazer: +limLazer, reserva: +limReserva, dizimo: +limDizimo, outros: +limOutros }
    });
    alert('Configurações salvas!'); fetchData();
  };

  const processText = async () => {
    if (!pastedText.trim()) return;
    setAiParsing(true);
    try {
      const res  = await postJSON('/api/analyze-statement', { text: pastedText, defaultPerson: importPerson });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setImported(json.transactions.map(t => ({ ...t, id: Date.now() + Math.random() })));
    } catch (err) { alert('Erro IA: ' + err.message); }
    finally { setAiParsing(false); }
  };

  const editImported = (id, field, value) => setImported(prev => prev.map(t => {
    if (t.id !== id) return t;
    if (field === 'amount') { const n = parseFloat(value); return { ...t, amount: n, type: n >= 0 ? 'income' : 'expense' }; }
    if (field === 'category') return { ...t, category: value, type: value === 'Receita' ? 'income' : 'expense' };
    return { ...t, [field]: value };
  }));

  // Junta parcelas do mesmo lote de importação (mesma descrição-base,
  // mesmo installmentTotal) numa Purchase, em vez de salvar N transações
  // soltas sem vínculo entre si — é isso que dá o "quanto falta" de graça.
  const saveImportedWithInstallments = async () => {
    const grouped = {};
    const standalone = [];
    imported.forEach(t => {
      if (t.installment?.total) {
        const baseDesc = t.description.replace(/\s*\(?Parcela\s*\d+\/\d+\)?/i, '').trim();
        const key = `${baseDesc}__${t.installment.total}`;
        if (!grouped[key]) grouped[key] = { baseDesc, ...t, items: [] };
        grouped[key].items.push(t);
      } else {
        standalone.push(t);
      }
    });
    for (const tx of standalone) await postJSON('/api/transactions', tx);
    for (const g of Object.values(grouped)) {
      const monthly = Math.abs(g.items[0].amount);
      const firstNumber = Math.min(...g.items.map(i => i.installment.number));
      await postJSON('/api/purchases', {
        description: g.baseDesc, totalAmount: monthly * g.items[0].installment.total,
        installmentCount: g.items[0].installment.total, startInstallmentNumber: firstNumber,
        startDate: g.items.sort((a,b)=>a.installment.number-b.installment.number)[0].date,
        category: g.category, person: g.person
      });
    }
    alert(`${imported.length} transações importadas!`);
    setImported([]); setPastedText(''); setOfxName('');
    fetchData(); setTab('dashboard');
  };

  const consultCoach = async () => {
    setLoadingAdvice(true); setAdvice('');
    try {
      const res  = await fetch('/api/coach-advice', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.metrics) setSummary(json.metrics); // números já vinham prontos do backend
      setAdvice(json.advice || (json.aiUnavailable ? '⚠️ IA não configurada no servidor — mas os números acima do painel já são calculados sem ela.' : ''));
    } catch (err) { setAdvice('⚠️ ' + err.message); }
    finally { setLoadingAdvice(false); }
  };

  /* ── Donut segments (SVG) ── */
  const donutSegments = () => {
    if (totalExpense === 0) return [];
    let acc = 0;
    return ENVELOPES.map(env => {
      const val = actual(env.cat);
      if (val === 0) return null;
      const pct    = (val / totalExpense) * 100;
      const offset = 100 - acc + 25;
      acc += pct;
      return { ...env, pct, offset };
    }).filter(Boolean);
  };

  /* ── Badge class helper ── */
  const badgeClass = (cat) =>
    'badge badge-' + (cat ?? '').toLowerCase()
      .replace(/á/g,'a').replace(/ç/g,'c').replace(/õ/g,'o')
      .replace(/é/g,'e').replace(/ /g,'');

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  const TABS = [
    { id: 'dashboard', icon: <Compass size={13}/>,      label: 'Painel'         },
    { id: 'income-strategy', icon: <TrendingUp size={13}/>, label: 'Inteligência de Renda' },
    { id: 'history',   icon: <Layers size={13}/>,       label: 'Extrato'        },
    { id: 'installments', icon: <FileText size={13}/>,  label: 'Parcelamentos'  },
    { id: 'import',    icon: <Upload size={13}/>,        label: 'Importar'       },
    { id: 'goals',     icon: <PiggyBank size={13}/>,     label: 'Metas'          },
    { id: 'coach',     icon: <Sparkles size={13}/>,      label: 'Assistente IA' },
    { id: 'settings',  icon: <SettingsIcon size={13}/>,  label: 'Configurações'  },
  ];

  return (
    <div className="app-wrapper">

      {/* ══ HEADER ══ */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">💼</span>
          <div>
            <div className="brand-title">FinanceAI</div>
            <div className="brand-sub">Gestão Financeira Pessoal</div>
          </div>
        </div>

        <nav className="tab-nav">
          {TABS.map(({ id, icon, label }) => (
            <button key={id} id={`tab-${id}`} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
              {icon} <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="header-status">
          <span>Olá, {famName}</span>
          <div className="status-dot" />
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <main className="page fade-in">

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          </div>
        ) : (
          <>
            {/* ════════════ DASHBOARD ════════════ */}
            {tab === 'dashboard' && (
              <div className="fade-in">



                {/* ── 3 stat cards ── */}
                <div className="grid-stats">

                  {/* Receitas */}
                  <div className="card">
                    <div className="stat-card">
                      <div>
                        <p className="stat-label">Entradas / Receitas</p>
                        <p className="stat-value" style={{ color: 'var(--green-700)' }}>{BRL(totalIncome)}</p>
                        <p className="stat-sub" style={{ color: 'var(--green-500)' }}>
                          <ArrowUpRight size={12} /> Dinheiro provido neste período
                        </p>
                      </div>
                      <div className="stat-icon" style={{ background: 'var(--green-50)' }}>
                        <TrendingUp size={19} color="var(--green-500)" />
                      </div>
                    </div>
                  </div>

                  {/* Gastos */}
                  <div className="card">
                    <div className="stat-card">
                      <div>
                        <p className="stat-label">Saídas / Gastos</p>
                        <p className="stat-value" style={{ color: 'var(--red-500)' }}>{BRL(totalExpense)}</p>
                        <p className="stat-sub" style={{ color: 'var(--red-500)' }}>
                          <ArrowDownRight size={12} /> Recursos distribuídos
                        </p>
                      </div>
                      <div className="stat-icon" style={{ background: 'var(--red-50)' }}>
                        <TrendingDown size={19} color="var(--red-500)" />
                      </div>
                    </div>
                  </div>

                  {/* Saldo */}
                  <div className="card" style={{ borderColor: netBalance >= 0 ? 'var(--blue-200)' : '#FDDCDC' }}>
                    <div className="stat-card">
                      <div>
                        <p className="stat-label">Saldo Líquido</p>
                        <p className="stat-value" style={{ color: netBalance >= 0 ? 'var(--blue-700)' : 'var(--red-500)' }}>{BRL(netBalance)}</p>
                        <p className="stat-sub">
                          <PiggyBank size={12} style={{ color: 'var(--text-3)' }} />
                          <span>Taxa de poupança: <strong style={{ color: netBalance >= 0 ? 'var(--green-700)' : 'var(--red-500)' }}>{savingsRate.toFixed(1)}%</strong></span>
                        </p>
                      </div>
                      <div className="stat-icon" style={{ background: 'var(--blue-50)' }}>
                        <DollarSign size={19} color="var(--blue-500)" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Auditoria rápida: parcelas em aberto + fila de classificação ──
                     Números 100% determinísticos (vêm de /api/summary), sem IA. */}
                <div className="grid-2">
                  <div className="card">
                    <h3 className="sec-title"><Layers size={15} color="var(--purple-700)" /> Parcelas em Aberto</h3>
                    {!summary || summary.openInstallments.length === 0 ? (
                      <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                        <p>Nenhum parcelamento em aberto. Registre um na aba Parcelamentos.</p>
                      </div>
                    ) : (
                      <>
                        <div className="summary-row" style={{ marginBottom: '1rem', background: 'var(--bg-subtle)', padding: '.75rem 1rem', borderRadius: 8 }}>
                          <div className="summary-item">
                            <p className="summary-label">Comprometido / mês (enquanto durar)</p>
                            <p className="summary-value" style={{ color: 'var(--red-500)' }}>{BRL(summary.committedInstallmentsPerMonth)}</p>
                          </div>
                        </div>
                        {summary.openInstallments.slice(0, 5).map(p => (
                          <div key={p.purchaseId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.5rem 0', borderBottom: '1px solid var(--bg-subtle)', fontSize: '.83rem' }}>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.description}</div>
                              <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>faltam {p.remainingCount}x de {BRL(p.monthlyAmount)} · quita em {fmt(p.finishesOn)}</div>
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--red-500)', whiteSpace: 'nowrap', marginLeft: '.75rem' }}>{BRL(p.remainingTotal)}</div>
                          </div>
                        ))}
                        {summary.openInstallments.length > 5 && (
                          <button className="btn btn-secondary btn-full" style={{ marginTop: '1rem' }} onClick={() => setTab('installments')}>
                            Ver todos ({summary.openInstallments.length}) <ChevronRight size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="card">
                    <h3 className="sec-title"><AlertCircle size={15} color="var(--gold-700)" /> Fila de Classificação</h3>
                    {!summary || summary.unclassified.count === 0 ? (
                      <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                        <Check size={28} />
                        <p>Tudo classificado — nada esperando revisão.</p>
                      </div>
                    ) : (
                      <>
                        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                          <AlertCircle size={15} style={{ flexShrink: 0 }} />
                          <span>{summary.unclassified.count} transações somando {BRL(summary.unclassified.total)} em "Outros" ou sem pessoa definida.</span>
                        </div>
                        {summary.unclassified.items.slice(0, 5).map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem 0', borderBottom: '1px solid var(--bg-subtle)', fontSize: '.8rem' }}>
                            <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }} title={t.description}>{t.description}</span>
                            <span style={{ fontWeight: 600, color: 'var(--red-500)', whiteSpace: 'nowrap' }}>{BRL(t.amount)}</span>
                            <select className="form-input" style={{ padding: '.25rem', fontSize: '.72rem', width: 110 }} value={t.category} onChange={e => reclassify(t.id, e.target.value)}>
                              {ENVELOPES.map(e => <option key={e.key} value={e.cat}>{e.label}</option>)}
                            </select>
                            <select className="form-input" style={{ padding: '.25rem', fontSize: '.72rem', width: 90 }} value={t.person || 'conjunta'} onChange={e => reassignPerson(t.id, e.target.value)}>
                              {PEOPLE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                            </select>
                          </div>
                        ))}
                        {summary.unclassified.count > 5 && (
                          <p style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: '.75rem' }}>+{summary.unclassified.count - 5} outras no Extrato (filtre por categoria "Outros").</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* ── Envelopes + Donut ── */}
                <div className="grid-2">

                  {/* Categorias — LISTA VERTICAL */}
                  <div className="card">
                    <h3 className="sec-title">
                      <Layers size={15} color="var(--blue-500)" /> Orçamento do Mês
                    </h3>

                    <div className="envelope-list">
                      {[
                        { key: 'receitas', label: 'Entradas / Receitas', cat: 'Receita', color: '#2E7D32', bg: '#E8F5E9' },
                        ...ENVELOPES
                      ].map(env => {
                        let spent, limit, pct, over;
                        
                        if (env.key === 'receitas') {
                          spent = totalIncome;
                          limit = budget;
                          pct = Math.min(100, (spent / (limit || 1)) * 100);
                          over = false;
                        } else {
                          spent = actual(env.cat);
                          limit = limMap[env.key];
                          pct = Math.min(100, (spent / limit) * 100);
                          over = spent > limit;
                        }

                        const isExpanded = expandedCat === env.key;
                        const items = env.key === 'receitas' ? filtered.filter(t => t.type === 'income') : filtered.filter(t => t.category === env.cat && t.type === 'expense');

                        return (
                          <div key={env.key} className="envelope-item" style={{ cursor: 'pointer', transition: 'background .2s' }} onClick={() => setExpandedCat(isExpanded ? null : env.key)}>
                            <div className="envelope-header">
                              <span className="envelope-name">
                                <span className="envelope-dot" style={{ background: env.color }} />
                                {env.label}
                              </span>
                              <div className="envelope-values" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div className="envelope-actual" style={{ color: over ? 'var(--red-500)' : env.color }}>
                                    {BRL(spent)}
                                  </div>
                                  {env.key !== 'receitas' && <div className="envelope-limit">de {BRL(limit)}</div>}
                                </div>
                                {isExpanded ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
                              </div>
                            </div>
                            
                            {env.key !== 'receitas' && (
                              <>
                                <div className="progress-track">
                                  <div className="progress-fill" style={{ width: `${pct}%`, background: over ? 'var(--red-500)' : env.color }} />
                                </div>
                                <div className="envelope-pct">{pct.toFixed(0)}% do limite utilizado</div>
                              </>
                            )}

                            {isExpanded && (
                              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                                {items.length === 0 ? (
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', textAlign: 'center', padding: '1rem 0' }}>Nenhuma transação no período.</div>
                                ) : (
                                  items.map(t => (
                                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.85rem', borderBottom: '1px solid var(--bg-subtle)' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', paddingRight: '1rem' }}>
                                        <span style={{ color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.description}>{t.description}</span>
                                        <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>{fmt(t.date)}</span>
                                      </div>
                                      <span style={{ fontWeight: '500', color: t.type === 'income' ? 'var(--green-600)' : 'var(--text-2)', alignSelf: 'center' }}>
                                        {BRL(t.amount)}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="divider" />
                    <div className="summary-row">
                      <div className="summary-item">
                        <p className="summary-label">Orçamento Mensal</p>
                        <p className="summary-value">{BRL(budget)}</p>
                      </div>
                      <div style={{ width: 1, background: 'var(--border)' }} />
                      <div className="summary-item">
                        <p className="summary-label">Disponível Livre</p>
                        <p className="summary-value" style={{ color: netBalance >= 0 ? 'var(--green-700)' : 'var(--red-500)' }}>{BRL(netBalance)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Donut */}
                  <div className="card">
                    <h3 className="sec-title">
                      <DollarSign size={15} color="var(--blue-500)" /> Distribuição de Gastos
                    </h3>

                    {totalExpense === 0 ? (
                      <div className="empty-state">
                        <PiggyBank size={32} />
                        <p>Nenhum gasto registrado ainda.</p>
                      </div>
                    ) : (
                      <div className="donut-container">
                        {/* SVG Donut */}
                        <svg className="donut-svg" width={130} height={130} viewBox="0 0 42 42">
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--bg-subtle)" strokeWidth="4" />
                          {donutSegments().map(seg => (
                            <circle key={seg.key} cx="21" cy="21" r="15.9"
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="4.5"
                              strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                              strokeDashoffset={seg.offset}
                              strokeLinecap="round"
                            />
                          ))}
                          <text x="21" y="18.5" textAnchor="middle" fontSize="2.8" fill="var(--text-3)" fontFamily="sans-serif">Gastos</text>
                          <text x="21" y="23.5" textAnchor="middle" fontSize="3" fill="var(--blue-900)" fontFamily="sans-serif" fontWeight="bold">
                            {(totalExpense / 1000).toFixed(1)}k
                          </text>
                        </svg>

                        {/* Legend */}
                        <div className="donut-legend">
                          {ENVELOPES.map(env => {
                            const spent = actual(env.cat);
                            const pct   = totalExpense > 0 ? (spent / totalExpense * 100).toFixed(0) : 0;
                            return (
                              <div key={env.key} className="legend-row">
                                <div className="legend-left">
                                  <span className="legend-dot" style={{ background: env.color }} />
                                  <span className="legend-label">{env.label}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span className="legend-pct">{pct}%</span>
                                  <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{BRL(spent)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Formulário + Metas ── */}
                <div className="grid-2">

                  {/* Lançar transação */}
                  <div className="card">
                    <h3 className="sec-title"><Plus size={15} color="var(--blue-500)" /> Lançar Movimentação</h3>
                    <form onSubmit={addTx}>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Data</label>
                          <input type="date" className="form-input" value={txDate} onChange={e => setTxDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tipo</label>
                          <select className="form-input" value={txType} onChange={e => setTxType(e.target.value)}>
                            <option value="expense">Saída (Gasto)</option>
                            <option value="income">Entrada (Receita)</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Descrição</label>
                        <input type="text" className="form-input" placeholder="Ex: Supermercado, Salário, Dízimo..." value={txDesc} onChange={e => setTxDesc(e.target.value)} required />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Valor (R$)</label>
                          <input type="number" step="0.01" min="0" className="form-input" placeholder="0,00" value={txAmount} onChange={e => setTxAmount(e.target.value)} required />
                        </div>
                        {txType === 'expense' && (
                          <div className="form-group">
                            <label className="form-label">Categoria</label>
                            <select className="form-input" value={txCat} onChange={e => setTxCat(e.target.value)}>
                              {ENVELOPES.map(e => <option key={e.key} value={e.cat}>{e.label}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Pessoa</label>
                        <select className="form-input" value={txPerson} onChange={e => setTxPerson(e.target.value)}>
                          {PEOPLE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary btn-full">
                        <Plus size={15} /> Salvar Lançamento
                      </button>
                    </form>
                  </div>

                  {/* Metas preview */}
                  <div className="card">
                    <h3 className="sec-title"><PiggyBank size={15} color="var(--green-500)" /> Metas &amp; Sonhos</h3>
                    {data.goals.length === 0 ? (
                      <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                        <PiggyBank size={28} />
                        <p>Nenhuma meta ainda. Crie na aba Metas.</p>
                      </div>
                    ) : (
                      <>
                        {data.goals.slice(0, 3).map(g => {
                          const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
                          return (
                            <div key={g.id} className="goal-card">
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.35rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{g.name}</span>
                                <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--green-700)' }}>{pct.toFixed(0)}%</span>
                              </div>
                              <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--green-500)' }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text-3)', marginTop: '.35rem' }}>
                                <span>{BRL(g.currentAmount)} acumulado</span>
                                <span>Meta: {BRL(g.targetAmount)}</span>
                              </div>
                            </div>
                          );
                        })}
                        {data.goals.length > 3 && (
                          <button className="btn btn-secondary btn-full" style={{ marginTop: '1rem' }} onClick={() => setTab('goals')}>
                            Ver todas as metas <ChevronRight size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════ ESTRATÉGIA DE RENDA ════════════ */}
            {tab === 'income-strategy' && (() => {
              const incomes = data.transactions.filter(t => t.type === 'income');
              const totalInc = incomes.reduce((s,t) => s + t.amount, 0);

              const incDonutSegments = () => {
                if (totalInc === 0) return [];
                let acc = 0;
                return INCOME_CATEGORIES.map(env => {
                  const val = incomes.filter(t => t.category === env.cat).reduce((s,t) => s + t.amount, 0);
                  if (val === 0) return null;
                  const pct = (val / totalInc) * 100;
                  const offset = 100 - acc + 25;
                  acc += pct;
                  return { ...env, pct, offset };
                }).filter(Boolean);
              };

              // Agrupar descrições (ignorar Pix recebido genérico, consolidar por nome se possível)
              const sourceMap = {};
              incomes.forEach(t => {
                sourceMap[t.description] = (sourceMap[t.description] || 0) + t.amount;
              });
              const topSources = Object.entries(sourceMap).sort((a,b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className="fade-in grid-2">
                  <div className="card">
                    <h3 className="sec-title">
                      <TrendingUp size={15} color="var(--green-600)" /> Visão Geral de Entradas
                    </h3>
                    <div className="summary-row" style={{ marginBottom: '1.5rem', background: 'var(--green-50)', padding: '1rem', borderRadius: '8px' }}>
                      <div className="summary-item">
                        <p className="summary-label" style={{ color: 'var(--green-800)' }}>Captação Total</p>
                        <p className="summary-value" style={{ color: 'var(--green-700)', fontSize: '1.75rem' }}>{BRL(totalInc)}</p>
                      </div>
                    </div>

                    <div className="donut-container">
                      {totalInc === 0 ? (
                        <div className="empty-state"><PiggyBank size={32} /><p>Nenhuma entrada registrada.</p></div>
                      ) : (
                        <>
                          <svg className="donut-svg" width={130} height={130} viewBox="0 0 42 42">
                            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--bg-subtle)" strokeWidth="4" />
                            {incDonutSegments().map(seg => (
                              <circle key={seg.key} cx="21" cy="21" r="15.9" fill="none" stroke={seg.color} strokeWidth="4.5" strokeDasharray={`${seg.pct} ${100 - seg.pct}`} strokeDashoffset={seg.offset} strokeLinecap="round" />
                            ))}
                            <text x="21" y="21" textAnchor="middle" fontSize="3" fill="var(--green-700)" fontFamily="sans-serif" fontWeight="bold" alignmentBaseline="middle">
                              {(totalInc / 1000).toFixed(1)}k
                            </text>
                          </svg>
                          <div className="donut-legend">
                            {INCOME_CATEGORIES.map(env => {
                              const spent = incomes.filter(t => t.category === env.cat).reduce((s,t) => s + t.amount, 0);
                              if (spent === 0) return null;
                              const pct = (spent / totalInc * 100).toFixed(0);
                              return (
                                <div key={env.key} className="legend-row">
                                  <div className="legend-left">
                                    <span className="legend-dot" style={{ background: env.color }} />
                                    <span className="legend-label">{env.label}</span>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <span className="legend-pct">{pct}%</span>
                                    <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{BRL(spent)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="sec-title"><Layers size={15} color="var(--blue-500)" /> Ranking de Fontes Pagadoras</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '1rem' }}>De onde o seu dinheiro mais vem na prática.</p>
                    
                    {topSources.length === 0 ? (
                      <div className="empty-state"><p>Sem fontes de renda.</p></div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {topSources.map(([desc, amt], idx) => {
                          const pct = ((amt / totalInc) * 100).toFixed(0);
                          return (
                            <div key={desc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--blue-50)', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>{idx+1}</div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={desc}>{desc}</span>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--green-700)' }}>{BRL(amt)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{pct}% da captação</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Detailed Accordion for incomes */}
                  <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <h3 className="sec-title"><BookOpen size={15} color="var(--text-2)" /> Detalhamento de Entradas (Por Categoria)</h3>
                    <div className="envelope-list">
                      {INCOME_CATEGORIES.map(env => {
                        const items = incomes.filter(t => t.category === env.cat);
                        const spent = items.reduce((s,t) => s + t.amount, 0);
                        if (spent === 0) return null;
                        
                        const isExpanded = expandedCat === `inc_${env.key}`;
                        return (
                          <div key={env.key} className="envelope-item" style={{ cursor: 'pointer', transition: 'background .2s' }} onClick={() => setExpandedCat(isExpanded ? null : `inc_${env.key}`)}>
                            <div className="envelope-header">
                              <span className="envelope-name">
                                <span className="envelope-dot" style={{ background: env.color }} />
                                {env.label}
                              </span>
                              <div className="envelope-values" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="envelope-actual" style={{ color: env.color }}>{BRL(spent)}</div>
                                {isExpanded ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                                {items.map(t => (
                                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.85rem', borderBottom: '1px solid var(--bg-subtle)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', paddingRight: '1rem' }}>
                                      <span style={{ color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.description}>{t.description}</span>
                                      <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>{fmt(t.date)}</span>
                                    </div>
                                    <span style={{ fontWeight: '500', color: 'var(--green-600)', alignSelf: 'center' }}>
                                      {BRL(t.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ════════════ EXTRATO ════════════ */}
            {tab === 'history' && (
              <div className="fade-in card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem' }}>Extrato Financeiro</h2>
                    <p style={{ fontSize: '.82rem', marginTop: '.2rem' }}>Histórico completo de receitas e despesas da família.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap' }}>
                    <select className="form-input" style={{ width: 'auto' }} value={fMonth} onChange={e => setFMonth(e.target.value)}>
                      <option value="all">Todos os meses</option>
                      {months.map(m => <option key={m} value={m}>{m.slice(5,7)}/{m.slice(0,4)}</option>)}
                    </select>
                    <select className="form-input" style={{ width: 'auto' }} value={fCat} onChange={e => setFCat(e.target.value)}>
                      <option value="all">Todas as categorias</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="form-input" style={{ width: 'auto' }} value={fPerson} onChange={e => setFPerson(e.target.value)}>
                      <option value="all">Todas as pessoas</option>
                      {PEOPLE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="empty-state"><Layers size={34} /><p>Nenhuma transação encontrada.</p></div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pessoa</th><th>Parcela</th><th>Valor</th><th style={{ width: 52, textAlign: 'center' }}></th></tr>
                      </thead>
                      <tbody>
                        {filtered.map(t => (
                          <tr key={t.id}>
                            <td style={{ color: 'var(--text-3)', whiteSpace: 'nowrap', fontSize: '.8rem' }}>{fmt(t.date)}</td>
                            <td style={{ fontWeight: 500 }}>{t.description}</td>
                            <td><span className={badgeClass(t.category)}>{t.category}</span></td>
                            <td style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{personLabel(t.person)}</td>
                            <td style={{ fontSize: '.78rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{t.installment ? `${t.installment.number}/${t.installment.total}` : '—'}</td>
                            <td style={{ fontWeight: 700, color: t.type === 'income' ? 'var(--green-700)' : 'var(--red-500)', whiteSpace: 'nowrap' }}>
                              {t.type === 'income' ? '+' : ''}{BRL(t.amount)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="btn btn-danger" onClick={() => deleteTx(t.id)} title="Remover"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ════════════ PARCELAMENTOS ════════════
                 Cada compra parcelada vira uma entidade com N
                 transações-filha linkadas — "quanto falta" e
                 "quando acaba" são leitura direta, não reconstrução
                 manual de texto de fatura. */}
            {tab === 'installments' && (
              <div className="fade-in grid-2">
                <div className="card">
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '.3rem' }}>Parcelamentos em Aberto</h2>
                  <p style={{ fontSize: '.82rem', marginBottom: '1.25rem' }}>Tudo que ainda está comprometido em compras parceladas, ordenado do que quita primeiro pro que demora mais.</p>
                  {!summary || summary.openInstallments.length === 0 ? (
                    <div className="empty-state"><Layers size={34} /><p>Nenhum parcelamento em aberto.</p></div>
                  ) : (
                    <div>
                      {summary.openInstallments.map(p => (
                        <div key={p.purchaseId} className="goal-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.4rem' }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '.88rem' }}>{p.description}</p>
                              <p style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: '.1rem' }}>
                                {personLabel(p.person)} · {p.category} · paga {p.paidCount}/{p.installmentCount} · quita em {fmt(p.finishesOn)}
                              </p>
                            </div>
                            <button className="btn btn-danger" onClick={() => deletePurchase(p.purchaseId)}><Trash2 size={13} /></button>
                          </div>
                          <div className="progress-track"><div className="progress-fill" style={{ width: `${(p.paidCount/p.installmentCount)*100}%`, background: 'var(--purple-700)' }} /></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.6rem' }}>
                            <span style={{ fontSize: '.77rem', color: 'var(--text-2)' }}>{BRL(p.monthlyAmount)}/mês · faltam {p.remainingCount}x</span>
                            <span style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--red-500)' }}>{BRL(p.remainingTotal)} restantes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3 className="sec-title"><Plus size={15} color="var(--blue-500)" /> Registrar Parcelamento</h3>
                  <p style={{ fontSize: '.78rem', marginBottom: '1rem', color: 'var(--text-3)' }}>Serve tanto pra compra nova quanto pra uma que já está em andamento — só ajustar "parcela inicial".</p>
                  <form onSubmit={addPurchase}>
                    <div className="form-group"><label className="form-label">Descrição</label><input type="text" className="form-input" placeholder="Ex: Capacete, Curso, Dívida moto..." value={pDesc} onChange={e => setPDesc(e.target.value)} required /></div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Valor total da compra (R$)</label><input type="number" step="0.01" className="form-input" value={pTotal} onChange={e => setPTotal(e.target.value)} required /></div>
                      <div className="form-group"><label className="form-label">Nº total de parcelas</label><input type="number" min="1" className="form-input" value={pCount} onChange={e => setPCount(e.target.value)} required /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Parcela inicial (se já em andamento)</label><input type="number" min="1" className="form-input" value={pStartNum} onChange={e => setPStartNum(e.target.value)} /></div>
                      <div className="form-group"><label className="form-label">Data desta parcela</label><input type="date" className="form-input" value={pDate} onChange={e => setPDate(e.target.value)} required /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Categoria</label>
                        <select className="form-input" value={pCat} onChange={e => setPCat(e.target.value)}>
                          {ENVELOPES.map(e => <option key={e.key} value={e.cat}>{e.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Pessoa</label>
                        <select className="form-input" value={pPerson} onChange={e => setPPerson(e.target.value)}>
                          {PEOPLE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-full"><Plus size={15} /> Registrar Parcelamento</button>
                  </form>
                </div>
              </div>
            )}

            {/* ════════════ IMPORTAR ════════════ */}
            {tab === 'import' && (
              <div className="fade-in grid-2">
                <div className="card">
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '.3rem' }}>Importador Inteligente</h2>
                  <p style={{ fontSize: '.82rem', marginBottom: '1rem' }}>Suba extratos bancários sem complicações.</p>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">De quem é este extrato?</label>
                    <select className="form-input" value={importPerson} onChange={e => setImportPerson(e.target.value)}>
                      {PEOPLE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>

                  <p className="form-label">Opção A — Arquivo .OFX</p>
                  <div className="dropzone" style={{ marginBottom: '1.4rem' }}>
                    <Upload size={26} color="var(--blue-500)" />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '.85rem' }}>Arraste ou clique para selecionar</p>
                      <p style={{ fontSize: '.73rem', color: 'var(--text-3)', marginTop: '.15rem' }}>Disponível em quase todos os bancos</p>
                    </div>
                    <input type="file" accept=".ofx" onChange={e => {
                      const f = e.target.files[0]; if (!f) return;
                      setOfxName(f.name);
                      const r = new FileReader();
                      r.onload = ev => setImported(parseOFX(ev.target.result, data.categoryRules).map(t => ({ ...t, person: importPerson })));
                      r.readAsText(f);
                    }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                    {ofxName && (
                      <span style={{ background: 'var(--green-50)', color: 'var(--green-700)', padding: '.35rem .9rem', borderRadius: 'var(--r-full)', fontSize: '.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                        <Check size={13} /> {ofxName}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: '.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>ou</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>

                  <p className="form-label">Opção B — Colar texto do extrato (com IA)</p>
                  <div className="form-group">
                    <textarea className="form-input" rows={5} placeholder="Cole aqui o extrato copiado do app do banco (Nubank, Itaú, BB...)..." value={pastedText} onChange={e => setPastedText(e.target.value)} style={{ resize: 'vertical', fontSize: '.83rem' }} />
                  </div>
                  <button className="btn btn-gold btn-full" onClick={processText} disabled={aiParsing || !pastedText.trim()}>
                    {aiParsing ? <><div className="spinner" /> Processando...</> : <><Sparkles size={15} /> Analisar com IA</>}
                  </button>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem' }}>Pré-visualização</h3>
                    {imported.length > 0 && <span style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>{imported.length} transações</span>}
                  </div>
                  {imported.length === 0 ? (
                    <div className="empty-state" style={{ flex: 1 }}><FileText size={36} /><p>Envie um arquivo ou processe o texto para ver a pré-visualização aqui.</p></div>
                  ) : (
                    <>
                      <div style={{ flex: 1, overflow: 'auto', maxHeight: 360 }}>
                        <div className="table-wrap">
                          <table className="data-table" style={{ fontSize: '.78rem' }}>
                            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pessoa</th><th>Parcela</th><th>Valor</th><th /></tr></thead>
                            <tbody>
                              {imported.map(t => (
                                <tr key={t.id}>
                                  <td><input type="date" className="form-input" style={{ padding: '.3rem', fontSize: '.75rem' }} value={t.date} onChange={e => editImported(t.id,'date',e.target.value)} /></td>
                                  <td><input type="text" className="form-input" style={{ padding: '.3rem', fontSize: '.75rem' }} value={t.description} onChange={e => editImported(t.id,'description',e.target.value)} /></td>
                                  <td>
                                    <select className="form-input" style={{ padding: '.3rem', fontSize: '.75rem' }} value={t.category} onChange={e => editImported(t.id,'category',e.target.value)}>
                                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </td>
                                  <td>
                                    <select className="form-input" style={{ padding: '.3rem', fontSize: '.75rem' }} value={t.person || 'conjunta'} onChange={e => editImported(t.id,'person',e.target.value)}>
                                      {PEOPLE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                                    </select>
                                  </td>
                                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-3)' }}>{t.installment ? `${t.installment.number}/${t.installment.total}` : '—'}</td>
                                  <td><input type="number" className="form-input" style={{ padding: '.3rem', fontSize: '.75rem', width: 80 }} value={Math.abs(t.amount)} onChange={e => editImported(t.id,'amount',t.type==='expense'?-e.target.value:e.target.value)} /></td>
                                  <td><button className="btn btn-danger" onClick={() => setImported(p => p.filter(x => x.id !== t.id))}><X size={12} /></button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '.7rem', marginTop: '1rem' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setImported([])}>Descartar</button>
                        <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveImportedWithInstallments}>Confirmar e Importar</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ════════════ METAS ════════════ */}
            {tab === 'goals' && (
              <div className="fade-in grid-2">
                <div className="card">
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '.3rem' }}>Metas &amp; Sonhos</h2>
                  <p style={{ fontSize: '.82rem', marginBottom: '1.25rem' }}>Acompanhe os projetos que edificam sua casa.</p>
                  {data.goals.length === 0 ? (
                    <div className="empty-state"><PiggyBank size={34} /><p>Nenhuma meta criada. Adicione sua primeira ao lado.</p></div>
                  ) : (
                    <div>{data.goals.map(g => {
                      const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
                      return (
                        <div key={g.id} className="goal-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.4rem' }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--blue-900)' }}>{g.name}</p>
                              <p style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: '.1rem' }}>Prazo: {fmt(g.deadline) || 'Não definido'}</p>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--green-700)', flexShrink: 0 }}>{pct.toFixed(0)}%</span>
                          </div>
                          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--green-500)' }} /></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.6rem' }}>
                            <span style={{ fontSize: '.77rem', color: 'var(--text-2)' }}>{BRL(g.currentAmount)} <span style={{ color: 'var(--text-3)' }}>de {BRL(g.targetAmount)}</span></span>
                            <div style={{ display: 'flex', gap: '.35rem' }}>
                              <button className="btn btn-secondary" style={{ padding: '.3rem .75rem', fontSize: '.75rem' }} onClick={() => contributeGoal(g.id, g.currentAmount, g.targetAmount)}>Aportar</button>
                              <button className="btn btn-danger" onClick={() => deleteGoal(g.id)}><Trash2 size={13} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}</div>
                  )}
                </div>
                <div className="card">
                  <h3 className="sec-title"><Plus size={15} color="var(--blue-500)" /> Nova Meta</h3>
                  <form onSubmit={addGoal}>
                    <div className="form-group"><label className="form-label">Nome do objetivo</label><input type="text" className="form-input" placeholder="Ex: Reserva de Emergência..." value={gName} onChange={e => setGName(e.target.value)} required /></div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Valor alvo (R$)</label><input type="number" step="0.01" className="form-input" placeholder="10.000,00" value={gTarget} onChange={e => setGTarget(e.target.value)} required /></div>
                      <div className="form-group"><label className="form-label">Já guardado (R$)</label><input type="number" step="0.01" className="form-input" placeholder="0,00" value={gCurrent} onChange={e => setGCurrent(e.target.value)} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Prazo desejado</label><input type="date" className="form-input" value={gDeadline} onChange={e => setGDeadline(e.target.value)} required /></div>
                    <button type="submit" className="btn btn-primary btn-full"><Plus size={15} /> Criar Meta</button>
                  </form>
                </div>
              </div>
            )}

            {/* ════════════ CONSELHEIRO ════════════ */}
            {tab === 'coach' && (
              <div className="fade-in">
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <Sparkles size={18} color="var(--blue-500)" /> Assistente Financeiro IA
                      </h2>
                      <p style={{ fontSize: '.82rem', marginTop: '.2rem' }}>Orientações com base nos seus dados financeiros, focado em otimização.</p>
                    </div>
                    <button className="btn btn-primary" onClick={consultCoach} disabled={loadingAdvice || data.transactions.length === 0}>
                      {loadingAdvice ? <><div className="spinner" /> Analisando...</> : <><Sparkles size={15} /> Consultar IA</>}
                    </button>
                  </div>
                </div>
                {data.transactions.length === 0 ? (
                  <div className="card empty-state"><BookOpen size={36} /><p>Adicione transações no extrato para o Conselheiro poder analisar.</p></div>
                ) : loadingAdvice ? (
                  <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto 1.25rem' }} />
                    <p style={{ fontStyle: 'italic', color: 'var(--text-3)', fontSize: '.85rem' }}>Aguarde enquanto a IA analisa seus dados...</p>
                  </div>
                ) : advice ? (
                  <div className="coach-output fade-in">{advice}</div>
                ) : (
                  <div className="card">
                    <h4 style={{ fontWeight: 700, marginBottom: '.5rem', fontSize: '.95rem' }}>Como funciona?</h4>
                    <ul style={{ fontSize: '.85rem', color: 'var(--text-2)', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                      <li>🔍 Detectará gargalos de consumo nas suas categorias</li>
                      <li>📊 Analisará o equilíbrio entre o planejado e o gasto real</li>
                      <li>💡 Sugerirá investimentos alinhados aos prazos das suas metas</li>
                      <li>🧠 Entregará recomendações técnicas baseadas nos seus dados</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ════════════ CONFIGURAÇÕES ════════════ */}
            {tab === 'settings' && (
              <div className="fade-in">
                <div className="card" style={{ maxWidth: 640 }}>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '.3rem' }}>Configurações do Sistema</h2>
                  <p style={{ fontSize: '.82rem', marginBottom: '1.4rem' }}>Defina os limites mensais e personalize o seu Orçamento.</p>
                  <form onSubmit={saveSettings}>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Seu Nome / Família</label>
                        <input type="text" className="form-input" value={famName} onChange={e => setFamName(e.target.value)} placeholder="Ex: Silva" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Renda Mensal Planejada (R$)</label>
                        <input type="number" className="form-input" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0,00" required />
                      </div>
                    </div>

                    <div className="divider" />
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', marginBottom: '1rem', color: 'var(--blue-900)', fontWeight: 600 }}>Divisão do Orçamento</p>

                    <div className="form-row">
                      {[
                        { label: 'Moradia', key: 'limMoradia', set: setLimMoradia, val: limMoradia, color: 'var(--blue-700)', hint: '25–35% da renda' },
                        { label: 'Alimentação', key: 'limAlimentacao', set: setLimAlimentacao, val: limAlimentacao, color: 'var(--gold-700)', hint: '15–20% da renda' },
                        { label: 'Transporte', key: 'limTransporte', set: setLimTransporte, val: limTransporte, color: 'var(--purple-700)', hint: '10–15% da renda' },
                        { label: 'Saúde', key: 'limSaude', set: setLimSaude, val: limSaude, color: 'var(--green-700)', hint: '5–10% da renda' },
                        { label: 'Lazer', key: 'limLazer', set: setLimLazer, val: limLazer, color: 'var(--red-700)', hint: '5–10% da renda' },
                        { label: 'Reserva', key: 'limReserva', set: setLimReserva, val: limReserva, color: 'var(--green-600)', hint: '10–20% da renda' },
                        { label: 'Dízimo', key: 'limDizimo', set: setLimDizimo, val: limDizimo, color: '#9C27B0', hint: 'Geralmente 10%' },
                        { label: 'Outros', key: 'limOutros', set: setLimOutros, val: limOutros, color: 'var(--text-3)', hint: '5% da renda' },
                      ].map(({ label, set, val, color, hint }) => (
                        <div key={label} className="form-group">
                          <label className="form-label" style={{ color }}>{label} (R$)</label>
                          <input type="number" className="form-input" value={val} onChange={e => set(e.target.value)} required />
                          <p className="form-hint">Sugerido: {hint}</p>
                        </div>
                      ))}
                    </div>

                    {(() => {
                      const soma = [limMoradia, limAlimentacao, limTransporte, limSaude, limLazer, limReserva, limDizimo, limOutros].reduce((s,v) => s + +(v||0), 0);
                      if (Math.abs(soma - +(budget||0)) > 1) return (
                        <div className="alert alert-warning" style={{ marginBottom: '1.1rem' }}>
                          <AlertCircle size={15} style={{ flexShrink: 0 }} />
                          <span>A soma das categorias ({BRL(soma)}) difere do orçamento total ({BRL(budget)}).</span>
                        </div>
                      );
                    })()}

                    <button type="submit" className="btn btn-primary">Salvar Configurações</button>
                  </form>
                </div>

                {/* Regras de categorização — fonte única, editável aqui.
                     Antes esse mapeamento existia duplicado (parseOFX em
                     App.jsx, import.js, e o prompt do Gemini), o que gerava
                     categorização divergente entre eles. */}
                <div className="card" style={{ maxWidth: 640, marginTop: '1.5rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '.3rem' }}>Regras de Categorização</h2>
                  <p style={{ fontSize: '.82rem', marginBottom: '1.25rem' }}>Quando uma descrição contém a palavra-chave, a categoria é aplicada automaticamente — no OFX, no colar de texto e na conferência da IA.</p>

                  <form onSubmit={addRule} className="form-row" style={{ alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">Palavra-chave contém</label>
                      <input type="text" className="form-input" placeholder="Ex: wms supermercados" value={ruleKeyword} onChange={e => setRuleKeyword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vira categoria</label>
                      <select className="form-input" value={ruleCategory} onChange={e => setRuleCategory(e.target.value)}>
                        {ENVELOPES.map(e => <option key={e.key} value={e.cat}>{e.label}</option>)}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: 38 }}><Plus size={15} /></button>
                  </form>

                  {(data.categoryRules || []).length === 0 ? (
                    <div className="empty-state" style={{ padding: '1.5rem 1rem' }}><p>Nenhuma regra cadastrada.</p></div>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table" style={{ fontSize: '.82rem' }}>
                        <thead><tr><th>Contém</th><th>Categoria</th><th /></tr></thead>
                        <tbody>
                          {data.categoryRules.map(r => (
                            <tr key={r.id}>
                              <td>{r.keyword}</td>
                              <td><span className={badgeClass(r.category)}>{r.category}</span></td>
                              <td style={{ textAlign: 'center' }}><button className="btn btn-danger" onClick={() => deleteRule(r.id)}><Trash2 size={13} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 FinanceAI — Gestão Financeira Pessoal Simplificada</p>
        <p style={{ marginTop: '.2rem', fontSize: '.7rem' }}>Dados salvos localmente no seu computador • localhost:3010</p>
      </footer>
    </div>
  );
}
