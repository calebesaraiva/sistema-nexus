import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Button } from '../components/Button';
import { ResponsiveTable } from '../components/ResponsiveTable';
import { Badge } from '../components/Badge';
import { Header } from './Dashboard';
import { SummaryGrid, Wizard } from '../components/Wizard';

type UserRow = { id: string; nome: string; email: string; role: string; ativo: boolean; emailVerificado: boolean };

export function UserAdminPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'SUPORTE' });

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<unknown, { data: UserRow[] }>('/users');
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createUser() {
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success('Usuário criado. Código de confirmação enviado por e-mail.');
      setForm({ nome: '', email: '', senha: '', role: 'SUPORTE' });
      setWizardOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(user: UserRow) {
    if (!confirm(`${user.ativo ? 'Bloquear' : 'Desbloquear'} este usuário?`)) return;
    await api.patch(`/users/${user.id}/${user.ativo ? 'block' : 'unblock'}`);
    toast.success(user.ativo ? 'Usuário bloqueado com sucesso' : 'Usuário desbloqueado com sucesso');
    await load();
  }

  return <section><Header title="Usuários do sistema" action="Cadastro com aprovação, e-mail de confirmação e auditoria" /><div className="toolbar"><Button type="button" onClick={() => setWizardOpen(true)}>Novo usuário</Button></div>{wizardOpen ? <div className="modal-backdrop"><div className="modal-panel"><Wizard title="Novo usuário" saving={saving} onCancel={() => setWizardOpen(false)} onFinish={createUser} steps={[
    { title: 'Dados do usuário', description: 'Nome, e-mail e senha temporária.', isValid: form.nome.length >= 2 && form.email.includes('@') && form.senha.length >= 6, content: <div className="form-grid"><label>Nome<input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label><label>E-mail<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Senha temporária<input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></label></div> },
    { title: 'Permissão', description: 'Defina o papel com cuidado. ADMIN_MASTER é restrito.', isValid: Boolean(form.role), content: <div className="form-grid"><label>Perfil<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="ADMIN_MASTER">ADMIN_MASTER</option><option value="ADMIN">ADMIN</option><option value="FINANCEIRO">FINANCEIRO</option><option value="VENDEDOR">VENDEDOR</option><option value="SUPORTE">SUPORTE</option></select></label><div className="inline-summary"><b>Aviso de segurança</b><span>Usuários com ADMIN ou ADMIN_MASTER podem alterar dados sensíveis e ficam registrados na auditoria.</span></div></div> },
    { title: 'Revisão', description: 'O usuário receberá e-mail de confirmação.', isValid: form.nome.length >= 2 && form.email.includes('@'), content: <SummaryGrid items={[{ label: 'Nome', value: form.nome }, { label: 'E-mail', value: form.email }, { label: 'Perfil', value: form.role }]} /> }
  ]} /></div></div> : null}<ResponsiveTable data={users} loading={loading} columns={[{ key: 'nome', label: 'Nome' }, { key: 'email', label: 'E-mail' }, { key: 'role', label: 'Perfil' }, { key: 'emailVerificado', label: 'E-mail', render: (u) => <Badge>{u.emailVerificado ? 'verificado' : 'pendente'}</Badge> }, { key: 'ativo', label: 'Status', render: (u) => <Badge>{u.ativo ? 'ativo' : 'bloqueado'}</Badge> }]} renderActions={(user) => <Button type="button" onClick={() => toggle(user)}>{user.ativo ? 'Bloquear' : 'Desbloquear'}</Button>} /></section>;
}
