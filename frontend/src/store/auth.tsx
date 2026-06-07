import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';

export type Role = 'ADMIN_MASTER' | 'ADMIN' | 'FINANCEIRO' | 'VENDEDOR' | 'SUPORTE';
export type User = { id: string; nome: string; email: string; role: Role; ativo: boolean };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexus.token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get<unknown, { data: User }>('/auth/me').then((res) => setUser(res.data)).finally(() => setLoading(false));
  }, []);

  async function login(email: string, senha: string) {
    const res = await api.post<unknown, { data: { token: string; user: User } }>('/auth/login', { email, senha });
    localStorage.setItem('nexus.token', res.data.token);
    setUser(res.data.user);
    toast.success('Login realizado com sucesso');
  }

  function logout() {
    localStorage.removeItem('nexus.token');
    setUser(null);
    toast.success('Logout realizado');
  }

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro do AuthProvider');
  return ctx;
}
