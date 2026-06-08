import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { Header } from './Dashboard';

const schema = z.object({ clientId: z.string().uuid(), packageId: z.string().uuid().optional().or(z.literal('')), titulo: z.string().min(3), descricao: z.string().optional(), dataInicio: z.string(), validadeMeses: z.coerce.number().min(1), diaPagamentoMensal: z.coerce.number().min(1).max(28), valorMensal: z.coerce.number().min(0), valorTotalContrato: z.coerce.number().min(0), valorImplantacao: z.coerce.number().min(0), entrada: z.coerce.number().min(0), tipoRecebimento: z.enum(['dinheiro', 'permuta', 'misto']), valorPermuta: z.coerce.number().min(0), descricaoPermuta: z.string().optional(), parceiroPermuta: z.string().optional(), observacoesPermuta: z.string().optional(), prazoPermuta: z.string().optional(), statusPermuta: z.enum(['pendente', 'compensada', 'parcial', 'cancelado']).optional(), implantacaoParcelada: z.boolean(), quantidadeParcelasImplantacao: z.coerce.number().optional(), observacoes: z.string().optional() });
type Form = z.input<typeof schema>;
type Option = { id: string; nomeEmpresa?: string; nome?: string };

export function ContractForm() {
  const [clients, setClients] = useState<Option[]>([]);
  const [packages, setPackages] = useState<Option[]>([]);
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { dataInicio: new Date().toISOString().slice(0, 10), validadeMeses: 12, diaPagamentoMensal: 15, valorMensal: 500, valorTotalContrato: 6000, valorImplantacao: 1200, entrada: 300, tipoRecebimento: 'dinheiro', valorPermuta: 0, statusPermuta: 'pendente', implantacaoParcelada: true, quantidadeParcelasImplantacao: 3 } });
  const tipoRecebimento = watch('tipoRecebimento');
  useEffect(() => { api.get<unknown, { data: Option[] }>('/clients').then((r) => setClients(r.data)); api.get<unknown, { data: Option[] }>('/packages').then((r) => setPackages(r.data)); }, []);
  const onSubmit: SubmitHandler<Form> = async (data) => {
    await api.post('/contracts', { ...data, packageId: data.packageId || undefined });
    toast.success('Contrato cadastrado com sucesso. Cobranças geradas automaticamente.');
    navigate('/contratos');
  };
  return <section><Header title="Novo contrato" /><form className="panel form-grid" onSubmit={handleSubmit(onSubmit)}><label>Cliente<select {...register('clientId')}>{clients.map((c) => <option key={c.id} value={c.id}>{c.nomeEmpresa}</option>)}</select></label><label>Pacote<select {...register('packageId')}><option value="">Sem pacote</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label><label>Tipo de recebimento<select {...register('tipoRecebimento')}><option value="dinheiro">Dinheiro</option><option value="permuta">Permuta</option><option value="misto">Misto</option></select></label>{['titulo', 'descricao', 'dataInicio', 'validadeMeses', 'diaPagamentoMensal', 'valorMensal', 'valorTotalContrato', 'valorImplantacao', 'entrada', 'quantidadeParcelasImplantacao', 'observacoes'].map((field) => <label key={field}>{field}<input type={field.includes('valor') || field.includes('Meses') || field.includes('dia') || field.includes('entrada') || field.includes('quantidade') ? 'number' : field === 'dataInicio' ? 'date' : 'text'} {...register(field as keyof Form)} /></label>)}{tipoRecebimento !== 'dinheiro' ? <div className="panel barter-box"><h2>Dados da permuta</h2><label>Valor estimado da permuta<input type="number" {...register('valorPermuta')} /></label><label>Descrição da permuta<input placeholder="O que a Nexus receberá em troca" {...register('descricaoPermuta')} /></label><label>Parceiro da permuta<input {...register('parceiroPermuta')} /></label><label>Prazo da permuta<input type="date" {...register('prazoPermuta')} /></label><label>Status da compensação<select {...register('statusPermuta')}><option value="pendente">Pendente</option><option value="parcial">Parcial</option><option value="compensada">Compensada</option><option value="cancelado">Cancelada</option></select></label><label>Observações da permuta<input {...register('observacoesPermuta')} /></label></div> : null}<label className="check"><input type="checkbox" {...register('implantacaoParcelada')} /> Implantação parcelada</label><Button loading={isSubmitting}>Salvar contrato</Button></form></section>;
}
