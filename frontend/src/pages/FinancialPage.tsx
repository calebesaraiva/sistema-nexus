import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarClock, CreditCard, FileDown, MessageCircle, RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ErrorState, LoadingState } from '../components/States';
import { Header } from './Dashboard';

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

const brl = (value: number | string | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const shortDate = (value?: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-';

export function FinancialPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState({ status: 'todos', tipo: 'todos', cliente: '', mes: String(new Date().getMonth() + 1), ano: String(new Date().getFullYear()) });

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [dash, chargeRes, paymentRes] = await Promise.all([
        api.get<unknown, { data: DashboardData }>('/dashboard/financial'),
        api.get<unknown, { data: Charge[] }>('/charges'),
        api.get<unknown, { data: Payment[] }>('/payments')
      ]);
      setDashboard(dash.data);
      setCharges(chargeRes.data);
      setPayments(paymentRes.data);
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
        <Button type="button" onClick={() => toast.info('Use a aba Cobranças para cadastrar cobrança avulsa.')}><CreditCard size={18} />Nova cobrança</Button>
        <Button type="button" onClick={() => toast.info('Escolha uma cobrança pendente para gerar a mensagem.')}><MessageCircle size={18} />Gerar cobrança</Button>
        <Button type="button" onClick={load}><RefreshCw size={18} />Atualizar</Button>
        <Button type="button" onClick={exportReport}><FileDown size={18} />Exportar</Button>
      </div>
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
        <FinanceCard icon={Wallet} label="Ticket médio" value={brl(totals.ticket)} />
        <FinanceCard icon={CreditCard} label="MRR mensal" value={brl(totals.mrr)} />
        <FinanceCard icon={CalendarClock} label="Contratos ativos" value={String(dashboard.contratosAtivos)} />
        <FinanceCard icon={AlertTriangle} label="Inadimplentes" value={String(dashboard.clientesInadimplentes?.length || 0)} />
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
      </div>
      <div className="finance-lists">
        <FinanceList title="Próximos vencimentos" items={dashboard.proximosVencimentos || []} onPay={pay} onCompensate={compensate} />
        <FinanceList title="Cobranças vencidas" items={charges.filter((charge) => charge.status === 'vencido').slice(0, 8)} onPay={pay} onCompensate={compensate} />
        <FinanceList title="Permutas pendentes" items={charges.filter((charge) => charge.tipo === 'permuta' && ['pendente', 'parcial'].includes(charge.status)).slice(0, 8)} onPay={pay} onCompensate={compensate} />
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
