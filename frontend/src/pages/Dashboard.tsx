import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CreditCard, FileText, Users, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingState, ErrorState } from '../components/States';

type DashboardData = { receitaPrevistaMes: number; receitaRecebidaMes: number; totalPendente: number; totalVencido: number; clientesAtivos: number; contratosAtivos: number; cobrancasPorStatus: { status: string; total: number }[] };
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { api.get<unknown, { data: DashboardData }>('/dashboard/financial').then((res) => setData(res.data)).catch(() => setError(true)); }, []);
  if (error) return <ErrorState text="Não foi possível carregar o dashboard." />;
  if (!data) return <LoadingState />;
  return <section><Header title="Dashboard financeiro" action="Indicadores do mês" /><div className="cards"><Stat icon={Wallet} label="Receita prevista" value={brl(data.receitaPrevistaMes)} /><Stat icon={CreditCard} label="Receita recebida" value={brl(data.receitaRecebidaMes)} /><Stat icon={Users} label="Clientes ativos" value={String(data.clientesAtivos)} /><Stat icon={FileText} label="Contratos ativos" value={String(data.contratosAtivos)} /></div><div className="panel"><h2>Cobranças por status</h2><ResponsiveContainer height={320}><BarChart data={data.cobrancasPorStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis /><Tooltip formatter={(value) => brl(Number(value))} /><Bar dataKey="total" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>;
}

export function Header({ title, action }: { title: string; action?: string }) {
  return <div className="page-head"><div><h1>{title}</h1><p>{action || 'Operação Nexus Tecnologia LTDA'}</p></div></div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return <div className="stat-card"><Icon /><span>{label}</span><b>{value}</b></div>;
}
