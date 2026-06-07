import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

type AnyRecord = Record<string, unknown> & { id?: string; status?: string; nome?: string; nomeEmpresa?: string; titulo?: string; email?: string };
const endpoints: Record<string, string> = {
  clients: '/clients', contracts: '/contracts', charges: '/charges', payments: '/payments', products: '/products', packages: '/packages', projects: '/projects', users: '/users', audit: '/audit-logs', messages: '/message-templates', financial: '/dashboard/financial'
};

export function ResourcePage({ kind, title }: { kind: string; title: string }) {
  const [data, setData] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const endpoint = endpoints[kind];

  useEffect(() => {
    if (!endpoint || kind === 'settings') { setLoading(false); return; }
    api.get<unknown, { data: AnyRecord[] | AnyRecord }>(endpoint).then((res) => {
      setData(Array.isArray(res.data) ? res.data : Object.entries(res.data).map(([nome, valor]) => ({ id: nome, nome, valor })));
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [endpoint, kind]);

  const columns = useMemo(() => {
    if (kind === 'clients') return [{ key: 'nomeEmpresa', label: 'Cliente' }, { key: 'nomeResponsavel', label: 'Responsável' }, { key: 'email', label: 'E-mail' }, { key: 'cidade', label: 'Cidade' }, { key: 'status', label: 'Status', render: (i: AnyRecord) => <Badge>{String(i.status || 'ativo')}</Badge> }];
    if (kind === 'contracts') return [{ key: 'titulo', label: 'Contrato' }, { key: 'valorMensal', label: 'Mensalidade' }, { key: 'dataFim', label: 'Fim' }, { key: 'status', label: 'Status', render: (i: AnyRecord) => <Badge>{String(i.status || 'ativo')}</Badge> }];
    if (kind === 'charges') return [{ key: 'descricao', label: 'Cobrança' }, { key: 'valor', label: 'Valor' }, { key: 'dataVencimento', label: 'Vencimento' }, { key: 'status', label: 'Status', render: (i: AnyRecord) => <Badge>{String(i.status || 'pendente')}</Badge> }];
    return [{ key: 'nome', label: 'Nome' }, { key: 'titulo', label: 'Título' }, { key: 'email', label: 'E-mail' }, { key: 'status', label: 'Status' }];
  }, [kind]);

  async function pay(item: AnyRecord) {
    if (!confirm('Confirmar pagamento desta cobrança?')) return;
    await api.patch(`/charges/${item.id}/pay`, {});
    toast.success('Pagamento confirmado');
    setData((old) => old.map((row) => row.id === item.id ? { ...row, status: 'pago' } : row));
  }

  if (kind === 'settings') return <section><Header title={title} /><div className="panel"><EmptyState title="Configurações globais" text="Área reservada para parâmetros críticos do ADMIN_MASTER." /></div></section>;
  if (kind === 'users') return <UserAdminPanel />;
  if (kind === 'products') return <CatalogPage mode="products" />;
  if (kind === 'packages') return <CatalogPage mode="packages" />;
  if (kind === 'projects') return <ProjectBoard />;
  if (kind === 'client-detail') return <section><Header title={title} /><div className="panel"><EmptyState title="Detalhe conectado" text="Use a listagem de clientes para editar ou consultar dados vinculados." /></div></section>;
  if (loading) return <LoadingState />;

  return <section><Header title={title} /><div className="toolbar">{kind === 'clients' && <Link className="btn" to="/clientes/novo">Novo cliente</Link>}{kind === 'contracts' && <Link className="btn" to="/contratos/novo">Novo contrato</Link>}</div><ResponsiveTable data={data} columns={columns} error={error} renderActions={(item) => <div className="actions">{kind === 'charges' && item.status !== 'pago' ? <Button onClick={() => pay(item)}>Pagar</Button> : null}{kind === 'clients' ? <Link className="link" to={`/clientes/${item.id}/editar`}>Editar</Link> : null}</div>} /></section>;
}
