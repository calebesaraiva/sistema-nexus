import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { Header } from './Dashboard';

const schema = z.object({ clientId: z.string().uuid(), packageId: z.string().uuid().optional().or(z.literal('')), titulo: z.string().min(3), descricao: z.string().optional(), dataInicio: z.string(), validadeMeses: z.coerce.number().min(1), diaPagamentoMensal: z.coerce.number().min(1).max(28), valorMensal: z.coerce.number().min(0), valorTotalContrato: z.coerce.number().min(0), valorImplantacao: z.coerce.number().min(0), entrada: z.coerce.number().min(0), implantacaoParcelada: z.boolean(), quantidadeParcelasImplantacao: z.coerce.number().optional(), observacoes: z.string().optional() });
type Form = z.input<typeof schema>;
type Option = { id: string; nomeEmpresa?: string; nome?: string };

export function ContractForm() {
  const [clients, setClients] = useState<Option[]>([]);
  const [packages, setPackages] = useState<Option[]>([]);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { dataInicio: new Date().toISOString().slice(0, 10), validadeMeses: 12, diaPagamentoMensal: 15, valorMensal: 500, valorTotalContrato: 6000, valorImplantacao: 1200, entrada: 300, implantacaoParcelada: true, quantidadeParcelasImplantacao: 3 } });
  useEffect(() => { api.get<unknown, { data: Option[] }>('/clients').then((r) => setClients(r.data)); api.get<unknown, { data: Option[] }>('/packages').then((r) => setPackages(r.data)); }, []);
  const onSubmit: SubmitHandler<Form> = async (data) => {
    await api.post('/contracts', { ...data, packageId: data.packageId || undefined });
    toast.success('Contrato cadastrado com sucesso. Cobranças geradas automaticamente.');
    navigate('/contratos');
  };
  return <section><Header title="Novo contrato" /><form className="panel form-grid" onSubmit={handleSubmit(onSubmit)}><label>Cliente<select {...register('clientId')}>{clients.map((c) => <option key={c.id} value={c.id}>{c.nomeEmpresa}</option>)}</select></label><label>Pacote<select {...register('packageId')}><option value="">Sem pacote</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>{['titulo', 'descricao', 'dataInicio', 'validadeMeses', 'diaPagamentoMensal', 'valorMensal', 'valorTotalContrato', 'valorImplantacao', 'entrada', 'quantidadeParcelasImplantacao', 'observacoes'].map((field) => <label key={field}>{field}<input type={field.includes('valor') || field.includes('Meses') || field.includes('dia') || field.includes('entrada') || field.includes('quantidade') ? 'number' : field === 'dataInicio' ? 'date' : 'text'} {...register(field as keyof Form)} /></label>)}<label className="check"><input type="checkbox" {...register('implantacaoParcelada')} /> Implantação parcelada</label><Button loading={isSubmitting}>Salvar contrato</Button></form></section>;
}
