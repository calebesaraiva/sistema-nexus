import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarClock, CreditCard, FileDown, MessageCircle, RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ErrorState, LoadingState } from '../components/States';
import { Header } from './Dashboard';
import { SummaryGrid, Wizard } from '../components/Wizard';

type DashboardData = {
  receitaPrevistaMes: number;
  receitaRecebidaMes: number;
  totalPendente: number;
  totalVencido: number;
  clientesAtivos: number;
  contratosAtivos: number;
  proximosVencimentos: Charge[];
  clientesInadimplentes: Client[];
  cobrancasPorStatus: { status: string; total: number }[];
  receitaPorMes: { mes: string; recebido: number }[];
  evolucaoMrr: { mes: string; mrr: number }[];
  implantacaoResumo: { nome: string; valor: number }[];
  mensalidadeResumo: { nome: string; valor: number }[];
  totalImplantacaoReceber: number;
  totalImplantacaoRecebido: number;
  saldoImplantacao: number;
  implantacaoVencida: number;
  mensalidadePrevistaMes: number;
  mensalidadeRecebidaMes: number;
  mensalidadePendenteMes: number;
  mrrAtual: number;
  ticketMedioMensal: number;
  percentualInadimplencia: number;
  taxaRecebimentoMes: number;
  implantacaoAReceber: Charge[];
  parcelasImplantacaoAtrasadas: Charge[];
  contratosProximosVencimento: { id: string; titulo: string; dataFim: string; client?: Client }[];
  valorPermutasAtivas: number;
  valorPermutasMes: number;
  valorPermutasPendentes: number;
  valorPermutasCompensadas: number;
  contratosPermuta: number;
  contratosMistos: number;
  totalEconomicoGeral: number;
  clientesPermuta: Client[];
};
type Client = { id: string; nomeEmpresa: string; status?: string; cidade?: string };
type Charge = { id: string; descricao: string; valor: number; dataVencimento: string; status: string; tipo: string; client?: Client };
type Payment = { id: string; valorPago: number; dataPagamento: string; metodoPagamento: string; client?: Client };
type ChargeDraft = { clientId: string; tipo: string; descricao: string; valor: number; dataVencimento: string; observacoes: string };
type MessageTemplate = { id: string; nome: string; conteudo: string };

const brl = (value: number | string | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const shortDate = (value?: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-';

export function FinancialPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [chargeWizard, setChargeWizard] = useState(false);
  const [messageWizard, setMessageWizard] = useState(false);
  const [chargeDraft, setChargeDraft] = useState<ChargeDraft>({ clientId: '', tipo: 'avulsa', descricao: '', valor: 0, dataVencimento: new Date().toISOString().slice(0, 10), observacoes: '' });
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [messageDraft, setMessageDraft] = useState({ clientId: '', chargeId: '', templateId: '' });
  const [savingCharge, setSavingCharge] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState({ status: 'todos', tipo: 'todos', cliente: '', mes: String(new Date().getMonth() + 1), ano: String(new Date().getFullYear()) });

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [dash, chargeRes, paymentRes, clientRes, templateRes] = await Promise.all([
        api.get<unknown, { data: DashboardData }>('/dashboard/financial'),
        api.get<unknown, { data: Charge[] }>('/charges'),
        api.get<unknown, { data: Payment[] }>('/payments'),
        api.get<unknown, { data: Client[] }>('/clients'),
        api.get<unknown, { data: MessageTemplate[] }>('/message-templates')
      ]);
      setDashboard(dash.data);
      setCharges(chargeRes.data);
      setPayments(paymentRes.data);
      setClients(clientRes.data);
      setTemplates(templateRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredCharges = useMemo(() => charges.filter((charge) => {
    const due = charge.dataVencimento ? new Date(charge.dataVencimento) : null;
    const byStatus = filters.status === 'todos' || charge.status === filters.status;
    const byType = filters.tipo === 'todos' || charge.tipo === filters.tipo;
    const byClient = !filters.cliente || charge.client?.nomeEmpresa?.toLowerCase().includes(filters.cliente.toLowerCase());
    const byMonth = !due || String(due.getMonth() + 1) === filters.mes;
    const byYear = !due || String(due.getFullYear()) === filters.ano;
    return byStatus && byType && byClient && byMonth && byYear;
  }), [charges, filters]);

  const totals = useMemo(() => {
    const sum = (items: Charge[], status?: string) => items.filter((item) => !status || item.status === status).reduce((acc, item) => acc + Number(item.valor), 0);
    const cashFilteredCharges = filteredCharges.filter((item) => item.tipo !== 'permuta');
    const paid = payments.reduce((acc, item) => acc + Number(item.valorPago), 0);
    const avgTicket = payments.length ? paid / payments.length : 0;
    const mrr = charges.filter((item) => item.tipo === 'mensalidade' && item.status !== 'cancelado').reduce((acc, item) => acc + Number(item.valor), 0);
    return {
      prevista: sum(cashFilteredCharges),
      recebida: paid,
      pendente: sum(cashFilteredCharges, 'pendente'),
      vencida: sum(cashFilteredCharges, 'vencido'),
      ticket: avgTicket,
      mrr
    };
  }, [filteredCharges, payments, charges]);

  const typeData = useMemo(() => ['mensalidade', 'implantacao', 'avulsa'].map((tipo) => ({
    tipo,
    valor: filteredCharges.filter((charge) => charge.tipo === tipo).reduce((acc, charge) => acc + Number(charge.valor), 0)
  })), [filteredCharges]);

  const receivedPending = [
    { nome: 'Recebido', valor: totals.recebida },
    { nome: 'Pendente', valor: totals.pendente },
    { nome: 'Vencido', valor: totals.vencida }
  ];

  async function pay(charge: Charge) {
    if (!confirm('Confirmar pagamento desta cobrança?')) return;
    await api.patch(`/charges/${charge.id}/pay`, {});
    toast.success('Pagamento confirmado');
    await load();
  }

  async function compensate(charge: Charge) {
    if (!confirm('Marcar esta permuta como compensada?')) return;
    await api.patch(`/charges/${charge.id}/compensate-barter`, { status: 'compensada' });
    toast.success('Permuta compensada com sucesso');
    await load();
  }

  async function createCharge() {
    setSavingCharge(true);
    try {
      await api.post('/charges', chargeDraft);
      toast.success('Cobrança criada com sucesso');
      setChargeWizard(false);
      setChargeDraft({ clientId: '', tipo: 'avulsa', descricao: '', valor: 0, dataVencimento: new Date().toISOString().slice(0, 10), observacoes: '' });
      await load();
    } finally {
      setSavingCharge(false);
    }
  }

  const previewMessage = useMemo(() => {
    const client = clients.find((item) => item.id === messageDraft.clientId);
    const charge = charges.find((item) => item.id === messageDraft.chargeId);
    const template = templates.find((item) => item.id === messageDraft.templateId);
    return (template?.conteudo || '')
      .replace(/\{\{cliente\}\}/g, client?.nomeEmpresa || '')
      .replace(/\{\{valor\}\}/g, brl(charge?.valor))
      .replace(/\{\{vencimento\}\}/g, shortDate(charge?.dataVencimento))
      .replace(/\{\{contrato\}\}/g, '');
  }, [charges, clients, messageDraft, templates]);

  async function generateMessage() {
    setSavingMessage(true);
    try {
      const response = await api.post<unknown, { data: { mensagem: string } }>('/messages/generate', messageDraft);
      await navigator.clipboard?.writeText(response.data.mensagem || previewMessage).catch(() => undefined);
      toast.success('Mensagem gerada e copiada');
      setMessageWizard(false);
      setMessageDraft({ clientId: '', chargeId: '', templateId: '' });
    } finally {
      setSavingMessage(false);
    }
  }

  function exportReport() {
    const lines = filteredCharges.map((charge) => `${charge.client?.nomeEmpresa || '-'};${charge.descricao};${charge.tipo};${charge.status};${charge.valor};${shortDate(charge.dataVencimento)}`);
    const csv = ['Cliente;Descrição;Tipo;Status;Valor;Vencimento', ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'relatorio-financeiro-nexmanage.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado');
  }

  if (loading) return <LoadingState text="Carregando painel financeiro..." />;
  if (error || !dashboard) return <ErrorState text="Não foi possível carregar o financeiro." />;

  return (
    <section>
      <Header title="Financeiro" action="Controle de receitas, cobranças, pagamentos e inadimplência" />
      <div className="finance-actions">
        <Button type="button" onClick={() => setChargeWizard(true)}><CreditCard size={18} />Nova cobrança</Button>
        <Button type="button" onClick={() => setMessageWizard(true)}><MessageCircle size={18} />Gerar cobrança</Button>
        <Button type="button" onClick={load}><RefreshCw size={18} />Atualizar</Button>
        <Button type="button" onClick={exportReport}><FileDown size={18} />Exportar</Button>
      </div>
      {chargeWizard ? <div className="modal-backdrop"><div className="modal-panel"><Wizard title="Nova cobrança" saving={savingCharge} onCancel={() => setChargeWizard(false)} onFinish={createCharge} steps={[
        { title: 'Cliente e tipo', description: 'Defina quem será cobrado e a natureza do lançamento.', isValid: Boolean(chargeDraft.clientId && chargeDraft.tipo), content: <div className="form-grid"><label>Cliente<select value={chargeDraft.clientId} onChange={(e) => setChargeDraft({ ...chargeDraft, clientId: e.target.value })}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nomeEmpresa}</option>)}</select></label><label>Tipo<select value={chargeDraft.tipo} onChange={(e) => setChargeDraft({ ...chargeDraft, tipo: e.target.value })}><option value="mensalidade">Mensalidade</option><option value="implantacao">Implantação</option><option value="avulsa">Avulsa</option><option value="permuta">Permuta</option></select></label></div> },
        { title: 'Valores', description: 'Descrição, valor e vencimento.', isValid: Boolean(chargeDraft.descricao.length >= 2 && Number(chargeDraft.valor) >= 0 && chargeDraft.dataVencimento), content: <div className="form-grid"><label>Descrição<input value={chargeDraft.descricao} onChange={(e) => setChargeDraft({ ...chargeDraft, descricao: e.target.value })} /></label><label>Valor<input type="number" value={chargeDraft.valor} onChange={(e) => setChargeDraft({ ...chargeDraft, valor: Number(e.target.value) })} /></label><label>Vencimento<input type="date" value={chargeDraft.dataVencimento} onChange={(e) => setChargeDraft({ ...chargeDraft, dataVencimento: e.target.value })} /></label><label>Observações<input value={chargeDraft.observacoes} onChange={(e) => setChargeDraft({ ...chargeDraft, observacoes: e.target.value })} /></label></div> },
        { title: 'Revisão', description: 'Confira antes de criar.', isValid: Boolean(chargeDraft.clientId && chargeDraft.descricao), content: <SummaryGrid items={[{ label: 'Cliente', value: clients.find((client) => client.id === chargeDraft.clientId)?.nomeEmpresa }, { label: 'Tipo', value: chargeDraft.tipo }, { label: 'Descrição', value: chargeDraft.descricao }, { label: 'Valor', value: brl(chargeDraft.valor) }, { label: 'Vencimento', value: shortDate(chargeDraft.dataVencimento) }]} /> }
      ]} /></div></div> : null}
      {messageWizard ? <div className="modal-backdrop"><div className="modal-panel"><Wizard title="Mensagem de cobrança" saving={savingMessage} onCancel={() => setMessageWizard(false)} onFinish={generateMessage} steps={[
        { title: 'Cliente', description: 'Selecione quem receberá a mensagem.', isValid: Boolean(messageDraft.clientId), content: <div className="form-grid"><label>Cliente<select value={messageDraft.clientId} onChange={(e) => setMessageDraft({ ...messageDraft, clientId: e.target.value, chargeId: '' })}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nomeEmpresa}</option>)}</select></label></div> },
        { title: 'Cobrança', description: 'Escolha a cobrança que entrará no texto.', isValid: Boolean(messageDraft.chargeId), content: <div className="form-grid"><label>Cobrança<select value={messageDraft.chargeId} onChange={(e) => setMessageDraft({ ...messageDraft, chargeId: e.target.value })}><option value="">Selecione</option>{charges.filter((charge) => !messageDraft.clientId || charge.client?.id === messageDraft.clientId).map((charge) => <option key={charge.id} value={charge.id}>{charge.descricao} - {brl(charge.valor)}</option>)}</select></label></div> },
        { title: 'Template', description: 'Selecione o modelo de comunicação.', isValid: Boolean(messageDraft.templateId), content: <div className="form-grid"><label>Template<select value={messageDraft.templateId} onChange={(e) => setMessageDraft({ ...messageDraft, templateId: e.target.value })}><option value="">Selecione</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.nome}</option>)}</select></label></div> },
        { title: 'Preview', description: 'Confira a mensagem antes de copiar.', isValid: Boolean(previewMessage), content: <div className="message-preview">{previewMessage || 'Selecione um template para visualizar.'}</div> }
      ]} /></div></div> : null}
      <div className="finance-filters panel">
        <label>Mês<select value={filters.mes} onChange={(e) => setFilters({ ...filters, mes: e.target.value })}>{Array.from({ length: 12 }).map((_, index) => <option key={index + 1} value={String(index + 1)}>{index + 1}</option>)}</select></label>
        <label>Ano<input value={filters.ano} onChange={(e) => setFilters({ ...filters, ano: e.target.value })} /></label>
        <label>Status<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="todos">Todos</option><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="vencido">Vencido</option><option value="compensada">Compensada</option><option value="parcial">Parcial</option><option value="cancelado">Cancelado</option></select></label>
        <label>Tipo<select value={filters.tipo} onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}><option value="todos">Todos</option><option value="mensalidade">Mensalidade</option><option value="implantacao">Implantação</option><option value="avulsa">Avulsa</option><option value="permuta">Permuta</option></select></label>
        <label>Cliente<input placeholder="Buscar cliente" value={filters.cliente} onChange={(e) => setFilters({ ...filters, cliente: e.target.value })} /></label>
      </div>
      <div className="finance-grid">
        <FinanceCard icon={Wallet} label="Receita prevista" value={brl(totals.prevista || dashboard.receitaPrevistaMes)} />
        <FinanceCard icon={CreditCard} label="Receita recebida" value={brl(totals.recebida || dashboard.receitaRecebidaMes)} />
        <FinanceCard icon={CalendarClock} label="Receita pendente" value={brl(totals.pendente || dashboard.totalPendente)} />
        <FinanceCard icon={AlertTriangle} label="Receita vencida" value={brl(totals.vencida || dashboard.totalVencido)} />
        <FinanceCard icon={Wallet} label="Ticket médio mensal" value={brl(dashboard.ticketMedioMensal || totals.ticket)} />
        <FinanceCard icon={CreditCard} label="MRR atual" value={brl(dashboard.mrrAtual || totals.mrr)} />
        <FinanceCard icon={CalendarClock} label="Contratos ativos" value={String(dashboard.contratosAtivos)} />
        <FinanceCard icon={AlertTriangle} label="Inadimplentes" value={String(dashboard.clientesInadimplentes?.length || 0)} />
      </div>
      <div className="finance-section-grid">
        <div className="panel finance-section"><h2>Implantação</h2><FinanceCard icon={Wallet} label="Total a receber" value={brl(dashboard.totalImplantacaoReceber)} /><FinanceCard icon={CreditCard} label="Já recebido" value={brl(dashboard.totalImplantacaoRecebido)} /><FinanceCard icon={CalendarClock} label="Saldo restante" value={brl(dashboard.saldoImplantacao)} /><FinanceCard icon={AlertTriangle} label="Parcelas vencidas" value={brl(dashboard.implantacaoVencida)} /></div>
        <div className="panel finance-section"><h2>Mensalidades</h2><FinanceCard icon={Wallet} label="Prevista no mês" value={brl(dashboard.mensalidadePrevistaMes)} /><FinanceCard icon={CreditCard} label="Recebida no mês" value={brl(dashboard.mensalidadeRecebidaMes)} /><FinanceCard icon={CalendarClock} label="Pendente" value={brl(dashboard.mensalidadePendenteMes)} /><FinanceCard icon={AlertTriangle} label="Taxa recebimento" value={`${Number(dashboard.taxaRecebimentoMes || 0).toFixed(1)}%`} /></div>
        <div className="panel finance-section"><h2>Alertas</h2><FinanceCard icon={AlertTriangle} label="Inadimplência" value={`${Number(dashboard.percentualInadimplencia || 0).toFixed(1)}%`} /><FinanceCard icon={CalendarClock} label="Contratos vencendo" value={String(dashboard.contratosProximosVencimento?.length || 0)} /><FinanceCard icon={AlertTriangle} label="Implantação atrasada" value={String(dashboard.parcelasImplantacaoAtrasadas?.length || 0)} /><FinanceCard icon={Wallet} label="Clientes ativos" value={String(dashboard.clientesAtivos)} /></div>
      </div>
      <div className="panel barter-panel">
        <div><h2>Permutas</h2><p>Valores econômicos recebidos em troca. Não representam caixa.</p></div>
        <div className="barter-metrics">
          <FinanceCard icon={Wallet} label="Permutas ativas" value={brl(dashboard.valorPermutasAtivas)} />
          <FinanceCard icon={CreditCard} label="Compensadas" value={brl(dashboard.valorPermutasCompensadas)} />
          <FinanceCard icon={CalendarClock} label="Pendentes" value={brl(dashboard.valorPermutasPendentes)} />
          <FinanceCard icon={AlertTriangle} label="Contratos permuta/misto" value={`${dashboard.contratosPermuta}/${dashboard.contratosMistos}`} />
          <FinanceCard icon={Wallet} label="Total econômico geral" value={brl(dashboard.totalEconomicoGeral)} />
        </div>
      </div>
      <div className="finance-charts">
        <div className="panel"><h2>Recebido x pendente</h2><ResponsiveContainer height={280}><BarChart data={receivedPending}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis /><Tooltip formatter={(value) => brl(Number(value))} /><Bar dataKey="valor" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="panel"><h2>Receita em dinheiro por tipo</h2><ResponsiveContainer height={280}><PieChart><Pie data={typeData} dataKey="valor" nameKey="tipo" outerRadius={95} label>{typeData.map((_, index) => <Cell key={index} />)}</Pie><Tooltip formatter={(value) => brl(Number(value))} /></PieChart></ResponsiveContainer></div>
        <div className="panel"><h2>Receita dos últimos 12 meses</h2><ResponsiveContainer height={280}><BarChart data={dashboard.receitaPorMes || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(value) => brl(Number(value))} /><Bar dataKey="recebido" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="panel"><h2>Evolução do MRR</h2><ResponsiveContainer height={280}><BarChart data={dashboard.evolucaoMrr || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(value) => brl(Number(value))} /><Bar dataKey="mrr" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </div>
      <div className="finance-lists">
        <FinanceList title="Próximos vencimentos" items={dashboard.proximosVencimentos || []} onPay={pay} onCompensate={compensate} />
        <FinanceList title="Cobranças vencidas" items={charges.filter((charge) => charge.status === 'vencido').slice(0, 8)} onPay={pay} onCompensate={compensate} />
        <FinanceList title="Permutas pendentes" items={charges.filter((charge) => charge.tipo === 'permuta' && ['pendente', 'parcial'].includes(charge.status)).slice(0, 8)} onPay={pay} onCompensate={compensate} />
        <FinanceList title="Implantação a receber" items={dashboard.implantacaoAReceber || []} onPay={pay} onCompensate={compensate} />
        <div className="panel finance-list"><h2>Contratos vencendo em breve</h2>{(dashboard.contratosProximosVencimento || []).length ? dashboard.contratosProximosVencimento.map((contract) => <article key={contract.id}><b>{contract.titulo}</b><span>{contract.client?.nomeEmpresa || 'Cliente'} · {shortDate(contract.dataFim)}</span></article>) : <span className="muted-line">Nenhum contrato vencendo nos próximos 30 dias.</span>}</div>
        <div className="panel finance-list"><h2>Últimos pagamentos</h2>{payments.slice(0, 8).map((payment) => <article key={payment.id}><b>{payment.client?.nomeEmpresa || 'Cliente'}</b><span>{brl(payment.valorPago)} · {shortDate(payment.dataPagamento)} · {payment.metodoPagamento}</span></article>)}</div>
        <div className="panel finance-list"><h2>Clientes inadimplentes</h2>{(dashboard.clientesInadimplentes || []).length ? dashboard.clientesInadimplentes.map((client) => <article key={client.id}><b>{client.nomeEmpresa}</b><span>{client.cidade || 'Cidade não informada'}</span><Badge>inadimplente</Badge></article>) : <span className="muted-line">Nenhum inadimplente no momento.</span>}</div>
      </div>
    </section>
  );
}

function FinanceCard({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return <div className="stat-card finance-card"><Icon /><span>{label}</span><b>{value}</b></div>;
}

function FinanceList({ title, items, onPay, onCompensate }: { title: string; items: Charge[]; onPay: (charge: Charge) => void; onCompensate: (charge: Charge) => void }) {
  return <div className="panel finance-list"><h2>{title}</h2>{items.length ? items.slice(0, 8).map((charge) => <article key={charge.id}><b>{charge.client?.nomeEmpresa || 'Cliente'}</b><span>{charge.descricao} · {brl(charge.valor)} · {shortDate(charge.dataVencimento)}</span><Badge>{charge.tipo === 'permuta' ? `permuta-${charge.status}` : charge.status}</Badge>{charge.tipo === 'permuta' && charge.status !== 'compensada' ? <Button type="button" onClick={() => onCompensate(charge)}>Marcar permuta como compensada</Button> : null}{charge.tipo !== 'permuta' && charge.status !== 'pago' ? <Button type="button" onClick={() => onPay(charge)}>Confirmar pagamento</Button> : null}</article>) : <span className="muted-line">Nenhum item encontrado.</span>}</div>;
}
