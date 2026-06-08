import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, BriefcaseBusiness, CreditCard, FileText, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, Package, Settings, ShieldCheck, Sun, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth, Role } from '../store/auth';

const nav: { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN_MASTER', 'ADMIN', 'FINANCEIRO', 'VENDEDOR', 'SUPORTE'] },
  { to: '/clientes', label: 'Clientes', icon: Users, roles: ['ADMIN_MASTER', 'ADMIN', 'FINANCEIRO', 'VENDEDOR', 'SUPORTE'] },
  { to: '/contratos', label: 'Contratos', icon: FileText, roles: ['ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'] },
  { to: '/financeiro', label: 'Financeiro', icon: BarChart3, roles: ['ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'] },
  { to: '/cobrancas', label: 'Cobranças', icon: CreditCard, roles: ['ADMIN_MASTER', 'ADMIN', 'FINANCEIRO'] },
  { to: '/produtos', label: 'Produtos', icon: Package, roles: ['ADMIN_MASTER', 'ADMIN', 'VENDEDOR'] },
  { to: '/pacotes', label: 'Pacotes', icon: Package, roles: ['ADMIN_MASTER', 'ADMIN', 'VENDEDOR'] },
  { to: '/projetos', label: 'Projetos', icon: BriefcaseBusiness, roles: ['ADMIN_MASTER', 'ADMIN', 'SUPORTE'] },
  { to: '/mensagens', label: 'Mensagens', icon: MessageCircle, roles: ['ADMIN_MASTER', 'ADMIN', 'FINANCEIRO', 'VENDEDOR', 'SUPORTE'] },
  { to: '/usuarios', label: 'Usuários', icon: ShieldCheck, roles: ['ADMIN_MASTER'] },
  { to: '/auditoria', label: 'Auditoria', icon: ShieldCheck, roles: ['ADMIN_MASTER'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['ADMIN_MASTER'] }
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('nexus.theme') || 'light');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = nav.filter((item) => item.roles.includes(user!.role));
  const mobileQuick = items.filter((item) => ['/dashboard', '/clientes', '/financeiro', '/contratos'].includes(item.to)).slice(0, 4);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nexus.theme', theme);
  }, [theme]);

  useEffect(() => {
    const setViewportHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };
    setViewportHeight();
    window.visualViewport?.addEventListener('resize', setViewportHeight);
    window.addEventListener('resize', setViewportHeight);
    return () => {
      window.visualViewport?.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('resize', setViewportHeight);
    };
  }, []);

  function exit() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <div><b>Nexus Gestão</b><span>{user?.role}</span></div>
        <button className="mobile-menu" onClick={() => setOpen(true)} title="Abrir menu"><Menu /></button>
      </header>
      {open ? <button className="sidebar-backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" /> : null}
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand"><div className="brand-mark">NX</div><div><b>Nexus Gestão</b><span>Nexus Tecnologia LTDA</span></div><button className="close" onClick={() => setOpen(false)}><X /></button></div>
        <nav>{items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)}><Icon size={18} />{label}</NavLink>)}</nav>
        <div className="profile">
          <span>{user?.nome}</span><b>{user?.role}</b>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</button>
          <button onClick={exit}><LogOut size={16} /> Sair</button>
        </div>
      </aside>
      <main className="main">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Outlet />
        </motion.div>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Atalhos principais">
        {mobileQuick.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button className={location.pathname === '/configuracoes' ? 'active' : ''} onClick={() => setOpen(true)}>
          <Menu size={22} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
