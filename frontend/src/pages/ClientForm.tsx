import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Header } from './Dashboard';
import { SummaryGrid, Wizard } from '../components/Wizard';

const schema = z.object({
  nomeEmpresa: z.string().min(2, 'Informe o nome da empresa.'),
  cpfCnpj: z.string().optional(),
  segmento: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  nomeResponsavel: z.string().min(2, 'Informe o responsável.'),
  email: z.string().email('Informe um e-mail válido.').or(z.literal('')),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'inativo', 'prospecto', 'inadimplente']),
  contratoAssinadoEm: z.string().optional(),
  contratoAssinadoPorAmbasPartes: z.boolean(),
  observacaoContrato: z.string().optional()
});
type Form = z.infer<typeof schema>;

const defaultValues: Form = { nomeEmpresa: '', cpfCnpj: '', segmento: '', cidade: '', estado: '', nomeResponsavel: '', email: '', telefone: '', whatsapp: '', endereco: '', observacoes: '', status: 'prospecto', contratoAssinadoEm: '', contratoAssinadoPorAmbasPartes: false, observacaoContrato: '' };

export function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { register, getValues, reset, watch, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues, mode: 'onChange' });
  const values = watch();

  useEffect(() => {
    if (!id) return;
    api.get<unknown, { data: Form & { contratoAssinadoEm?: string } }>(`/clients/${id}`).then((res) => reset({ ...defaultValues, ...res.data, contratoAssinadoEm: res.data.contratoAssinadoEm ? String(res.data.contratoAssinadoEm).slice(0, 10) : '' }));
  }, [id, reset]);

  const checks = useMemo(() => ({
    company: schema.pick({ nomeEmpresa: true }).safeParse(values).success,
    owner: schema.pick({ nomeResponsavel: true, email: true }).safeParse(values).success,
    address: true,
    document: !file || file.type === 'application/pdf',
    review: schema.safeParse(values).success
  }), [file, values]);

  async function uploadDocument(clientId: string) {
    if (!file) return;
    const body = new FormData();
    body.append('tipo', 'contrato_assinado');
    body.append('file', file);
    await api.post(`/clients/${clientId}/documents`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
  }

  async function finish() {
    setSaving(true);
    try {
      const data = getValues();
      const response = id ? await api.put<unknown, { data: { id: string } }>(`/clients/${id}`, data) : await api.post<unknown, { data: { id: string } }>('/clients', data);
      await uploadDocument(response.data.id);
      toast.success(id ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso');
      navigate('/clientes');
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      title: 'Dados da empresa',
      description: 'Identificação principal do cliente.',
      isValid: checks.company,
      content: <div className="form-grid"><Field label="Nome da empresa" error={errors.nomeEmpresa?.message}><input {...register('nomeEmpresa')} /></Field><Field label="CNPJ/CPF"><input {...register('cpfCnpj')} /></Field><Field label="Segmento"><input {...register('segmento')} /></Field><Field label="Cidade"><input {...register('cidade')} /></Field><Field label="Estado"><input {...register('estado')} /></Field><label>Status<select {...register('status')}><option value="prospecto">Prospecto</option><option value="ativo">Ativo</option><option value="inadimplente">Inadimplente</option><option value="inativo">Inativo</option></select></label></div>
    },
    {
      title: 'Responsável',
      description: 'Pessoa de contato para financeiro e operação.',
      isValid: checks.owner,
      content: <div className="form-grid"><Field label="Nome do responsável" error={errors.nomeResponsavel?.message}><input {...register('nomeResponsavel')} /></Field><Field label="E-mail" error={errors.email?.message}><input {...register('email')} /></Field><Field label="Telefone"><input {...register('telefone')} /></Field><Field label="WhatsApp"><input {...register('whatsapp')} /></Field></div>
    },
    {
      title: 'Endereço e observações',
      description: 'Dados internos para consulta da equipe.',
      isValid: checks.address,
      content: <div className="form-grid"><label>Endereço completo<input {...register('endereco')} /></label><label>Observações internas<input {...register('observacoes')} /></label></div>
    },
    {
      title: 'Contrato assinado',
      description: 'Anexe o PDF quando o contrato já estiver assinado fora do sistema.',
      isValid: checks.document,
      content: <div className="form-grid"><label>Anexar contrato assinado em PDF<input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><label>Data de assinatura<input type="date" {...register('contratoAssinadoEm')} /></label><label className="check"><input type="checkbox" {...register('contratoAssinadoPorAmbasPartes')} /> Assinado por ambas as partes</label><label>Observação do contrato<input {...register('observacaoContrato')} /></label>{file && file.type !== 'application/pdf' ? <small>Envie contrato assinado apenas em PDF.</small> : null}</div>
    },
    {
      title: 'Revisão',
      description: 'Confira antes de finalizar o cadastro.',
      isValid: checks.review,
      content: <SummaryGrid items={[{ label: 'Empresa', value: values.nomeEmpresa }, { label: 'CNPJ/CPF', value: values.cpfCnpj }, { label: 'Responsável', value: values.nomeResponsavel }, { label: 'E-mail', value: values.email }, { label: 'Cidade/UF', value: `${values.cidade || '-'} / ${values.estado || '-'}` }, { label: 'Contrato PDF', value: file?.name || 'Sem anexo agora' }, { label: 'Assinado por ambas', value: values.contratoAssinadoPorAmbasPartes ? 'Sim' : 'Não' }]} />
    }
  ];

  return <section><Header title={id ? 'Editar cliente' : 'Novo cliente'} action="Fluxo guiado de cadastro" /><Wizard title="Cadastro de cliente" steps={steps} saving={saving} onCancel={() => navigate('/clientes')} onFinish={finish} /></section>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label>{label}{children}{error ? <small>{error}</small> : null}</label>;
}
