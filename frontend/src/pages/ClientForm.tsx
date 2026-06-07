import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { Header } from './Dashboard';

const schema = z.object({ nomeEmpresa: z.string().min(2), nomeResponsavel: z.string().min(2), email: z.string().email().or(z.literal('')), telefone: z.string().optional(), cidade: z.string().optional(), estado: z.string().optional(), status: z.enum(['ativo', 'inativo', 'prospecto', 'inadimplente']) });
type Form = z.infer<typeof schema>;

export function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { status: 'prospecto', email: '' } });
  useEffect(() => {
    if (!id) return;
    api.get<unknown, { data: Form }>(`/clients/${id}`).then((res) => reset(res.data));
  }, [id, reset]);
  async function onSubmit(data: Form) {
    if (id) {
      await api.put(`/clients/${id}`, data);
      toast.success('Cliente editado com sucesso');
    } else {
      await api.post('/clients', data);
      toast.success('Cliente criado com sucesso');
    }
    navigate('/clientes');
  }
  return <section><Header title={id ? 'Editar cliente' : 'Cadastro de cliente'} /><form className="panel form-grid" onSubmit={handleSubmit(onSubmit)}>{['nomeEmpresa', 'nomeResponsavel', 'email', 'telefone', 'cidade', 'estado'].map((field) => <label key={field}>{field}<input {...register(field as keyof Form)} /></label>)}<label>Status<select {...register('status')}><option value="prospecto">Prospecto</option><option value="ativo">Ativo</option><option value="inadimplente">Inadimplente</option><option value="inativo">Inativo</option></select></label><Button loading={isSubmitting}>Salvar cliente</Button></form></section>;
}
