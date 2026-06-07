import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, KeyRound, LockKeyhole, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/Button';
import { useAuth } from '../store/auth';
import { api } from '../lib/api';
import { toast } from 'sonner';

const schema = z.object({ email: z.string().email('Informe um e-mail válido'), senha: z.string().min(6, 'Mínimo de 6 caracteres') });
type Form = z.infer<typeof schema>;

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'verify' | 'forgot' | 'reset'>('login');
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: 'calebesaraiva60@gmail.com', senha: 'Acesso@202425' } });
  if (user) return <Navigate to="/dashboard" replace />;
  async function onSubmit(data: Form) {
    setLoading(true);
    try {
      await login(data.email, data.senha);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }
  async function sendVerify() {
    const code = prompt('Digite o código de confirmação recebido por e-mail');
    if (!code) return;
    await api.post('/auth/verify-email', { email: getValues('email'), code });
    toast.success('E-mail confirmado com sucesso');
    setMode('login');
  }
  async function forgot() {
    await api.post('/auth/forgot-password', { email: getValues('email') });
    toast.success('Se o e-mail existir, o código foi enviado.');
    setMode('reset');
  }
  async function reset() {
    const code = prompt('Digite o código de recuperação recebido por e-mail');
    const senha = prompt('Digite a nova senha');
    if (!code || !senha) return;
    await api.post('/auth/reset-password', { email: getValues('email'), code, senha });
    toast.success('Senha redefinida com sucesso');
    setMode('login');
  }
  return <div className="login-page"><section className="login-hero"><div className="login-brand"><Building2 /><span>Nexus Tecnologia LTDA</span></div><h1>Nexus Gestão</h1><p>Operação corporativa para contratos, clientes, cobranças, projetos, auditoria e permissões com rastreabilidade de ponta a ponta.</p><div className="login-checks"><span><CheckCircle2 /> Auditoria completa</span><span><MailCheck /> Verificação por e-mail</span><span><KeyRound /> Recuperação segura</span></div></section><form className="login-card" onSubmit={handleSubmit(onSubmit)}><div className="login-icon"><LockKeyhole /></div><h2>Acesso seguro</h2><p>Entre com seu usuário autorizado pela administração.</p><label>E-mail<input {...register('email')} /></label>{errors.email && <small>{errors.email.message}</small>}<label>Senha<input type="password" {...register('senha')} /></label>{errors.senha && <small>{errors.senha.message}</small>}<Button loading={loading}>Entrar no sistema</Button><div className="login-links"><button type="button" onClick={sendVerify}>Confirmar e-mail</button><button type="button" onClick={forgot}>Esqueci minha senha</button><button type="button" onClick={reset}>Usar código de recuperação</button></div></form></div>;
}
