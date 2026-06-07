import { Navigate, Outlet } from 'react-router-dom';
import { ReactNode } from 'react';
import { EmptyState } from '../components/States';
import { Role, useAuth } from '../store/auth';

export function ProtectedRoute({ roles, children }: { roles?: Role[]; children?: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-center">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <EmptyState title="Você não tem permissão para acessar esta área" text="Solicite acesso ao ADMIN_MASTER da Nexus." />;
  }
  return children ? <>{children}</> : <Outlet />;
}
