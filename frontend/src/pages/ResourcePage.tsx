import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { Header } from './Dashboard';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { EmptyState, LoadingState } from '../components/States';
import { UserAdminPanel } from './UserAdminPanel';
import { CatalogPage } from './CatalogPage';
import { ProjectBoard } from './ProjectBoard';
import { FinancialPage } from './FinancialPage';

type AnyRecord = Record<string, unknown> & { id?: string; status?: string; nome?: string; nomeEmpresa?: string; titulo?: string; email?: string };
type ContractRecord = AnyRecord & {
  tipoRecebimento?: string;
  valorMensal?: number;
  valorPermuta?: number;
  descricaoPermuta?: string;
  statusPermuta?: string;
};
type ClientDocument = { id: string; tipo: string; nomeArquivo: string; criadoEm: string; tamanho: number; contractId?: string };
type ClientDetail = AnyRecord & { contracts?: ContractRecord[]; charges?: AnyRecord[]; documents?: ClientDocument[] };
const endpoints: Record<string, string> = {
  clients: '/clients', contracts: '/contracts', charges: '/charges', payments: '/payments', products: '/products', packages: '/packages', projects: '/projects', users: '/users', audit: '/audit-logs', messages: '/message-templates', financial: '/dashboard/financial'
};

export function ResourcePage({ kind, title }: { kind: string; title: string }) {
  const [data, setData] = useState<AnyRecord[]>([]);
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const endpoint = endpoints[kind];
  const { id } = useParams();

  useEffect(() => {
    if (kind === 'client-detail' && id) {
      setLoading(true);
      api.get<unknown, { data: ClientDetail }>(`/clients/${id}`).then((res) => setClientDetail(res.data)).catch(() => setError(true)).finally(() => setLoading(false));
      return;
    }
    if (!endpoint || kind === 'settings') { setLoading(false); return; }
    api.get<unknown, { data: AnyRecord[] | AnyRecord }>(endpoint).then((res) => {
      setData(Array.isArray(res.data) ? res.data : Object.entries(res.data).map(([nome, valor]) => ({ id: nome, nome, valor })));
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [endpoint, id, kind]);

  const columns = useMemo(() => {
    if (kind === 'clients') return [{ key: 'nomeEmpresa', label: 'Cliente' }, { key: 'nomeResponsavel', label: 'Responsável' }, { key: 'email', label: 'E-mail' }, { key: 'cidade', label: 'Cidade' }, { key: 'status', label: 'Status', render: (i: AnyRecord) => <Badge>{String(i.status || 'ativo')}</Badge> }];
    if (kind === 'contracts') return [{ key: 'titulo', label: 'Contrato' }, { key: 'tipoRecebimento', label: 'Recebimento', render: (i: AnyRecord) => <Badge>{String(i.tipoRecebimento || 'dinheiro')}</Badge> }, { key: 'valorMensal', label: 'Mensalidade', render: (i: AnyRecord) => brl(i.valorMensal) }, { key: 'valorPermuta', label: 'Permuta', render: (i: AnyRecord) => brl(i.valorPermuta) }, { key: 'status', label: 'Status', render: (i: AnyRecord) => <Badge>{String(i.status || 'ativo')}</Badge> }];
    if (kind === 'charges') return [{ key: 'descricao', label: 'Cobrança' }, { key: 'tipo', label: 'Tipo', render: (i: AnyRecord) => <Badge>{String(i.tipo || 'mensalidade')}</Badge> }, { key: 'valor', label: 'Valor', render: (i: AnyRecord) => brl(i.valor) }, { key: 'dataVencimento', label: 'Vencimento', render: (i: AnyRecord) => shortDate(i.dataVencimento) }, { key: 'status', label: 'Status', render: (i: AnyRecord) => <Badge>{String(i.status || 'pendente')}</Badge> }];
    return [{ key: 'nome', label: 'Nome' }, { key: 'titulo', label: 'Título' }, { key: 'email', label: 'E-mail' }, { key: 'status', label: 'Status' }];
  }, [kind]);

  async function pay(item: AnyRecord) {
    if (!confirm('Confirmar pagamento desta cobrança?')) return;
    await api.patch(`/charges/${item.id}/pay`, {});
    toast.success('Pagamento confirmado');
    setData((old) => old.map((row) => row.id === item.id ? { ...row, status: 'pago' } : row));
  }

  async function compensate(item: AnyRecord) {
    if (!confirm('Marcar esta permuta como compensada?')) return;
    await api.patch(`/charges/${item.id}/compensate-barter`, { status: 'compensada' });
    toast.success('Permuta compensada');
    setData((old) => old.map((row) => row.id === item.id ? { ...row, status: 'compensada' } : row));
  }

  if (kind === 'settings') return <section><Header title={title} /><div className="panel"><EmptyState title="Configurações globais" text="Área reservada para parâmetros críticos do ADMIN_MASTER." /></div></section>;
  if (kind === 'users') return <UserAdminPanel />;
  if (kind === 'financial') return <FinancialPage />;
  if (kind === 'products') return <CatalogPage mode="products" />;
  if (kind === 'packages') return <CatalogPage mode="packages" />;
  if (kind === 'projects') return <ProjectBoard />;
  if (kind === 'client-detail') return <ClientDetailView title={title} client={clientDetail} loading={loading} error={error} />;
  if (loading) return <LoadingState />;

  return <section><Header title={title} /><div className="toolbar">{kind === 'clients' && <Link className="btn" to="/clientes/novo">Novo cliente</Link>}{kind === 'contracts' && <Link className="btn" to="/contratos/novo">Novo contrato</Link>}</div><ResponsiveTable data={data} columns={columns} error={error} renderActions={(item) => <div className="actions">{kind === 'charges' && item.tipo === 'permuta' && item.status !== 'compensada' ? <Button onClick={() => compensate(item)}>Compensar permuta</Button> : null}{kind === 'charges' && item.tipo !== 'permuta' && item.status !== 'pago' ? <Button onClick={() => pay(item)}>Pagar</Button> : null}{kind === 'clients' ? <><Link className="link" to={`/clientes/${item.id}`}>Detalhes</Link><Link className="link" to={`/clientes/${item.id}/editar`}>Editar</Link></> : null}</div>} /></section>;
}

function ClientDetailView({ title, client, loading, error }: { title: string; client: ClientDetail | null; loading: boolean; error: boolean }) {
  if (loading) return <LoadingState />;
  if (error || !client) return <section><Header title={title} /><div className="panel"><EmptyState title="Cliente não encontrado" text="Não foi possível carregar os dados vinculados." /></div></section>;
  const contracts = client.contracts || [];
  const barterContracts = contracts.filter((contract) => contract.tipoRecebimento === 'permuta' || contract.tipoRecebimento === 'misto');
  async function downloadDocument(item: ClientDocument) {
    const response = await api.get<Blob, Blob>(`/documents/${item.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(response);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = item.nomeArquivo;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section>
      <Header title={String(client.nomeEmpresa || 'Detalhes do cliente')} action={String(client.email || client.nomeResponsavel || '')} />
      <div className="client-detail-grid">
        <div className="panel client-summary">
          <h2>Contrato e permuta</h2>
          <span>Tipo de contrato</span><b>{contracts[0]?.tipoRecebimento || 'dinheiro'}</b>
          <span>Valor financeiro mensal</span><b>{brl(contracts[0]?.valorMensal)}</b>
          <span>Valor estimado da permuta</span><b>{brl(contracts[0]?.valorPermuta)}</b>
          <span>Status da permuta</span><Badge>{String(contracts[0]?.statusPermuta || 'sem permuta')}</Badge>
        </div>
        <div className="panel client-summary">
          <h2>Descrição da permuta</h2>
          <p>{String(contracts[0]?.descricaoPermuta || 'Nenhuma permuta registrada para o contrato principal.')}</p>
        </div>
      </div>
      <div className="panel finance-list">
        <h2>Histórico de compensações</h2>
        {barterContracts.length ? barterContracts.map((contract) => <article key={contract.id}><b>{contract.titulo || 'Contrato'}</b><span>{brl(contract.valorPermuta)} · {contract.descricaoPermuta || 'Permuta sem descrição'}</span><Badge>{String(contract.statusPermuta || 'pendente')}</Badge></article>) : <span className="muted-line">Nenhum histórico de permuta para este cliente.</span>}
      </div>
      <div className="panel finance-list">
        <h2>Documentos do cliente</h2>
        {(client.documents || []).length ? client.documents!.map((item) => <article key={item.id}><b>{item.nomeArquivo}</b><span>{item.tipo} · {shortDate(item.criadoEm)} · {Math.round(Number(item.tamanho || 0) / 1024)} KB</span><Button type="button" onClick={() => downloadDocument(item)}>Baixar</Button></article>) : <span className="muted-line">Nenhum documento anexado.</span>}
      </div>
    </section>
  );
}

const brl = (value: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const shortDate = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('pt-BR') : '-';
