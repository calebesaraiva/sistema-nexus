import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Button } from '../components/Button';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { Badge } from '../components/Badge';
import { Header } from './Dashboard';
import { SummaryGrid, Wizard } from '../components/Wizard';

type Product = { id: string; nome: string; descricao?: string; categoria?: string; precoBase: number; ativo: boolean };
type Package = { id: string; nome: string; descricao?: string; valorMensal: number; valorImplantacao: number; ativo: boolean; products?: { product: Product }[] };

export function CatalogPage({ mode }: { mode: 'products' | 'packages' }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '', categoria: '', precoBase: 0, valorMensal: 0, valorImplantacao: 0, ativo: true, productIds: [] as string[] });

  async function load() {
    const [prod, pack] = await Promise.all([
      api.get<unknown, { data: Product[] }>('/products'),
      api.get<unknown, { data: Package[] }>('/packages')
    ]);
    setProducts(prod.data);
    setPackages(pack.data);
  }

  useEffect(() => { load(); }, []);

  function edit(item: Product | Package) {
    setEditingId(item.id);
    setWizardOpen(true);
    setForm({
      nome: item.nome,
      descricao: item.descricao || '',
      categoria: 'categoria' in item ? item.categoria || '' : '',
      precoBase: 'precoBase' in item ? Number(item.precoBase) : 0,
      valorMensal: 'valorMensal' in item ? Number(item.valorMensal) : 0,
      valorImplantacao: 'valorImplantacao' in item ? Number(item.valorImplantacao) : 0,
      ativo: item.ativo,
      productIds: 'products' in item ? item.products?.map((p) => p.product.id) || [] : []
    });
  }

  function startCreate() {
    setEditingId(null);
    setForm({ nome: '', descricao: '', categoria: '', precoBase: 0, valorMensal: 0, valorImplantacao: 0, ativo: true, productIds: [] });
    setWizardOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const endpoint = mode === 'products' ? '/products' : '/packages';
      const body = mode === 'products'
        ? { nome: form.nome, descricao: form.descricao, categoria: form.categoria, precoBase: Number(form.precoBase), ativo: form.ativo }
        : { nome: form.nome, descricao: form.descricao, valorMensal: Number(form.valorMensal), valorImplantacao: Number(form.valorImplantacao), ativo: form.ativo, productIds: form.productIds };
      if (editingId) await api.put(`${endpoint}/${editingId}`, body);
      else await api.post(endpoint, body);
      toast.success(editingId ? 'Atualizado com sucesso' : 'Criado com sucesso');
      setEditingId(null);
      setWizardOpen(false);
      setForm({ nome: '', descricao: '', categoria: '', precoBase: 0, valorMensal: 0, valorImplantacao: 0, ativo: true, productIds: [] });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Desativar este item?')) return;
    await api.delete(`${mode === 'products' ? '/products' : '/packages'}/${id}`);
    toast.success('Item desativado com sucesso');
    await load();
  }

  const data: Array<Product | Package> = mode === 'products' ? products : packages;
  return <section><Header title={mode === 'products' ? 'Produtos' : 'Pacotes'} action="Catálogo editável da Nexus" /><div className="toolbar"><Button type="button" onClick={startCreate}>{mode === 'products' ? 'Novo produto' : 'Novo pacote'}</Button></div>{wizardOpen ? <div className="modal-backdrop"><div className="modal-panel"><Wizard title={mode === 'products' ? 'Produto' : 'Pacote'} saving={saving} onCancel={() => setWizardOpen(false)} onFinish={save} steps={[
    { title: 'Identificação', description: 'Nome e descrição do item.', isValid: form.nome.trim().length >= 2, content: <div className="form-grid"><label>Nome<input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label><label>Descrição<input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></label><label className="check"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo</label></div> },
    { title: 'Valores', description: mode === 'products' ? 'Categoria e preço base.' : 'Mensalidade, implantação e serviços inclusos.', isValid: true, content: <div className="form-grid">{mode === 'products' ? <><label>Categoria<input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></label><label>Preço base<input type="number" value={form.precoBase} onChange={(e) => setForm({ ...form, precoBase: Number(e.target.value) })} /></label></> : <><label>Valor mensal<input type="number" value={form.valorMensal} onChange={(e) => setForm({ ...form, valorMensal: Number(e.target.value) })} /></label><label>Implantação<input type="number" value={form.valorImplantacao} onChange={(e) => setForm({ ...form, valorImplantacao: Number(e.target.value) })} /></label><label>Produtos do pacote<select multiple value={form.productIds} onChange={(e) => setForm({ ...form, productIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>{products.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label></>}</div> },
    { title: 'Revisão', description: 'Confira antes de salvar.', isValid: form.nome.trim().length >= 2, content: <SummaryGrid items={[{ label: 'Nome', value: form.nome }, { label: 'Descrição', value: form.descricao || '-' }, { label: mode === 'products' ? 'Preço' : 'Mensalidade', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mode === 'products' ? form.precoBase : form.valorMensal) }, { label: 'Status', value: form.ativo ? 'Ativo' : 'Inativo' }]} /> }
  ]} /></div></div> : null}<ResponsiveTable<Product | Package> data={data} columns={[{ key: 'nome', label: 'Nome' }, { key: 'descricao', label: 'Descrição' }, { key: mode === 'products' ? 'precoBase' : 'valorMensal', label: mode === 'products' ? 'Preço' : 'Mensalidade' }, { key: 'ativo', label: 'Status', render: (i) => <Badge>{i.ativo ? 'ativo' : 'inativo'}</Badge> }]} renderActions={(item) => <div className="actions"><Button type="button" onClick={() => edit(item)}>Editar</Button><Button type="button" onClick={() => remove(item.id)}>Desativar</Button></div>} /></section>;
}
