import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Header } from './Dashboard';
import { SummaryGrid, Wizard } from '../components/Wizard';

const schema = z.object({
  clientId: z.string().uuid('Selecione um cliente.'),
  packageId: z.string().uuid().optional().or(z.literal('')),
  titulo: z.string().min(3, 'Informe o título do contrato.'),
  descricao: z.string().optional(),
  dataInicio: z.string().min(1, 'Informe a data de início.'),
  validadeMeses: z.coerce.number().min(1),
  diaPagamentoMensal: z.coerce.number().min(1).max(28),
  valorMensal: z.coerce.number().min(0),
  valorTotalContrato: z.coerce.number().min(0),
  valorImplantacao: z.coerce.number().min(0),
  entrada: z.coerce.number().min(0),
  tipoRecebimento: z.enum(['dinheiro', 'permuta', 'misto']),
  valorPermuta: z.coerce.number().min(0),
  descricaoPermuta: z.string().optional(),
  parceiroPermuta: z.string().optional(),
  observacoesPermuta: z.string().optional(),
  prazoPermuta: z.string().optional(),
  statusPermuta: z.enum(['pendente', 'compensada', 'parcial', 'cancelado']).optional(),
  implantacaoParcelada: z.boolean(),
  quantidadeParcelasImplantacao: z.coerce.number().optional(),
  observacoes: z.string().optional()
});
type Form = z.input<typeof schema>;
type Client = { id: string; nomeEmpresa: string; email?: string; cidade?: string; documents?: { id: string; tipo: string; nomeArquivo: string }[] };
type Product = { id: string; nome: string; precoBase?: number };
type Package = { id: string; nome: string; valorMensal?: number; valorImplantacao?: number; products?: { product: Product }[] };

const brl = (value: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const dateText = (value?: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR') : '-';

export function ContractForm() {
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { register, getValues, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { clientId: '', packageId: '', titulo: '', descricao: '', dataInicio: new Date().toISOString().slice(0, 10), validadeMeses: 12, diaPagamentoMensal: 15, valorMensal: 500, valorTotalContrato: 6000, valorImplantacao: 1200, entrada: 300, tipoRecebimento: 'dinheiro', valorPermuta: 0, statusPermuta: 'pendente', implantacaoParcelada: true, quantidadeParcelasImplantacao: 3, observacoes: '' }
  });
  const values = watch();
  const selectedClient = clients.find((client) => client.id === values.clientId);
  const selectedPackage = packages.find((pkg) => pkg.id === values.packageId);
  const saldoImplantacao = Math.max(Number(values.valorImplantacao || 0) - Number(values.entrada || 0), 0);
  const dataFim = useMemo(() => {
    const start = values.dataInicio ? new Date(`${values.dataInicio}T00:00:00`) : new Date();
    start.setMonth(start.getMonth() + Number(values.validadeMeses || 0));
    return start.toLocaleDateString('pt-BR');
  }, [values.dataInicio, values.validadeMeses]);

  useEffect(() => {
    Promise.all([
      api.get<unknown, { data: Client[] }>('/clients'),
      api.get<unknown, { data: Package[] }>('/packages'),
      api.get<unknown, { data: Product[] }>('/products')
    ]).then(([clientRes, packageRes, productRes]) => {
      setClients(clientRes.data);
      setPackages(packageRes.data);
      setProducts(productRes.data);
    });
  }, []);

  useEffect(() => {
    if (!selectedPackage) return;
    setValue('valorMensal', Number(selectedPackage.valorMensal || values.valorMensal || 0));
    setValue('valorImplantacao', Number(selectedPackage.valorImplantacao || values.valorImplantacao || 0));
  }, [selectedPackage?.id]);

  const checks = {
    client: schema.pick({ clientId: true, titulo: true }).safeParse(values).success,
    services: true,
    setup: Number(values.valorImplantacao || 0) >= Number(values.entrada || 0),
    monthly: schema.pick({ dataInicio: true, validadeMeses: true, diaPagamentoMensal: true, valorMensal: true }).safeParse(values).success,
    attachment: !file || file.type === 'application/pdf',
    review: schema.safeParse(values).success
  };

  async function uploadDocument(clientId: string, contractId: string) {
    if (!file) return;
    const body = new FormData();
    body.append('tipo', 'contrato_assinado');
    body.append('contractId', contractId);
    body.append('file', file);
    await api.post(`/clients/${clientId}/documents`, body, { headers: { 'Content-Type': 'multipart/form-data' } });
  }

  async function finish() {
    setSaving(true);
    try {
      const data = getValues();
      const response = await api.post<unknown, { data: { id: string; clientId: string } }>('/contracts', { ...data, packageId: data.packageId || undefined });
      await uploadDocument(response.data.clientId, response.data.id);
      toast.success('Contrato cadastrado e cobranças geradas com sucesso.');
      navigate('/contratos');
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      title: 'Cliente',
      description: 'Selecione o cliente e identifique o contrato.',
      isValid: checks.client,
      content: <div className="form-grid"><label>Cliente<select {...register('clientId')}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nomeEmpresa}</option>)}</select>{errors.clientId ? <small>{errors.clientId.message}</small> : null}</label><label>Título do contrato<input {...register('titulo')} />{errors.titulo ? <small>{errors.titulo.message}</small> : null}</label><label>Descrição<input {...register('descricao')} /></label>{selectedClient ? <div className="inline-summary"><b>{selectedClient.nomeEmpresa}</b><span>{selectedClient.email || 'Sem e-mail'} · {selectedClient.cidade || 'Cidade não informada'}</span></div> : null}</div>
    },
    {
      title: 'Serviços contratados',
      description: 'Pacote, serviços inclusos e observações.',
      isValid: checks.services,
      content: <div className="form-grid"><label>Pacote<select {...register('packageId')}><option value="">Sem pacote</option>{packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.nome}</option>)}</select></label><label>Serviços avulsos disponíveis<select multiple>{products.map((product) => <option key={product.id} value={product.id}>{product.nome}</option>)}</select></label><label>Observações dos serviços<input {...register('observacoes')} /></label>{selectedPackage?.products?.length ? <div className="inline-summary"><b>Inclusos no pacote</b><span>{selectedPackage.products.map((item) => item.product.nome).join(', ')}</span></div> : null}</div>
    },
    {
      title: 'Implantação',
      description: 'Valores iniciais e parcelamento.',
      isValid: checks.setup,
      content: <div className="form-grid"><label>Valor de implantação<input type="number" {...register('valorImplantacao')} /></label><label>Entrada paga<input type="number" {...register('entrada')} /></label><label className="check"><input type="checkbox" {...register('implantacaoParcelada')} /> Implantação parcelada</label><label>Quantidade de parcelas<input type="number" {...register('quantidadeParcelasImplantacao')} /></label><div className="inline-summary"><b>Saldo de implantação</b><span>{brl(saldoImplantacao)}</span></div>{!checks.setup ? <small>Entrada não pode ser maior que o valor de implantação.</small> : null}</div>
    },
    {
      title: 'Mensalidade',
      description: 'Mensalidade fixa, vencimento e prazo.',
      isValid: checks.monthly,
      content: <div className="form-grid"><label>Valor mensal<input type="number" {...register('valorMensal')} /></label><label>Dia de vencimento<input type="number" {...register('diaPagamentoMensal')} /></label><label>Prazo em meses<input type="number" {...register('validadeMeses')} /></label><label>Data de início<input type="date" {...register('dataInicio')} /></label><label>Valor total do contrato<input type="number" {...register('valorTotalContrato')} /></label><div className="inline-summary"><b>Data final automática</b><span>{dataFim} · {String(values.validadeMeses || 0)} mensalidades</span></div></div>
    },
    {
      title: 'Recebimento e anexo',
      description: 'Dinheiro, permuta, misto e contrato PDF.',
      isValid: checks.attachment,
      content: <div className="form-grid"><label>Tipo de recebimento<select {...register('tipoRecebimento')}><option value="dinheiro">Dinheiro</option><option value="permuta">Permuta</option><option value="misto">Misto</option></select></label>{values.tipoRecebimento !== 'dinheiro' ? <><label>Valor estimado da permuta<input type="number" {...register('valorPermuta')} /></label><label>Descrição da permuta<input {...register('descricaoPermuta')} /></label><label>Parceiro da permuta<input {...register('parceiroPermuta')} /></label><label>Prazo da permuta<input type="date" {...register('prazoPermuta')} /></label><label>Status<select {...register('statusPermuta')}><option value="pendente">Pendente</option><option value="parcial">Parcial</option><option value="compensada">Compensada</option><option value="cancelado">Cancelada</option></select></label></> : null}<label>Anexar contrato assinado em PDF<input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>{file && file.type !== 'application/pdf' ? <small>Contrato assinado deve ser PDF.</small> : null}</div>
    },
    {
      title: 'Revisão final',
      description: 'Confira contrato, valores, cobranças e anexo.',
      isValid: checks.review,
      content: <SummaryGrid items={[{ label: 'Cliente', value: selectedClient?.nomeEmpresa }, { label: 'Pacote', value: selectedPackage?.nome || 'Sem pacote' }, { label: 'Implantação', value: brl(values.valorImplantacao) }, { label: 'Entrada', value: brl(values.entrada) }, { label: 'Saldo implantação', value: brl(saldoImplantacao) }, { label: 'Parcelas de implantação', value: String(values.implantacaoParcelada ? values.quantidadeParcelasImplantacao || 1 : 1) }, { label: 'Mensalidade', value: brl(values.valorMensal) }, { label: 'Vencimento', value: `Dia ${String(values.diaPagamentoMensal || '-')}` }, { label: 'Prazo', value: `${String(values.validadeMeses || 0)} meses` }, { label: 'Data início', value: dateText(String(values.dataInicio || '')) }, { label: 'Data final', value: dataFim }, { label: 'Cobranças mensais', value: String(values.validadeMeses || 0) }, { label: 'Recebimento', value: String(values.tipoRecebimento || 'dinheiro') }, { label: 'Contrato PDF', value: file?.name || 'Sem anexo agora' }]} />
    }
  ];

  return <section><Header title="Novo contrato" action="Contrato em etapas com geração automática de cobranças" /><Wizard title="Cadastro de contrato" steps={steps} saving={saving} onCancel={() => navigate('/contratos')} onFinish={finish} /></section>;
}
