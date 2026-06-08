import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './store/auth';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ResourcePage } from './pages/ResourcePage';
import { ClientForm } from './pages/ClientForm';
import { ContractForm } from './pages/ContractForm';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors position="bottom-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clientes" element={<ResourcePage kind="clients" title="Clientes" />} />
              <Route path="/clientes/novo" element={<ClientForm />} />
              <Route path="/clientes/:id/editar" element={<ClientForm />} />
              <Route path="/clientes/:id" element={<ResourcePage kind="client-detail" title="Detalhes do cliente" />} />
              <Route path="/contratos" element={<ResourcePage kind="contracts" title="Contratos" />} />
              <Route path="/contratos/novo" element={<ContractForm />} />
              <Route path="/financeiro" element={<ResourcePage kind="financial" title="Financeiro" />} />
              <Route path="/cobrancas" element={<ResourcePage kind="charges" title="Cobranças" />} />
              <Route path="/pagamentos" element={<ResourcePage kind="payments" title="Pagamentos" />} />
              <Route path="/produtos" element={<ResourcePage kind="products" title="Produtos" />} />
              <Route path="/pacotes" element={<ResourcePage kind="packages" title="Pacotes" />} />
              <Route path="/projetos" element={<ResourcePage kind="projects" title="Projetos" />} />
              <Route path="/mensagens" element={<ResourcePage kind="messages" title="Mensagens" />} />
              <Route path="/usuarios" element={<ProtectedRoute roles={['ADMIN_MASTER']}><ResourcePage kind="users" title="Usuários do sistema" /></ProtectedRoute>} />
              <Route path="/auditoria" element={<ProtectedRoute roles={['ADMIN_MASTER']}><ResourcePage kind="audit" title="Auditoria" /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute roles={['ADMIN_MASTER']}><ResourcePage kind="settings" title="Configurações" /></ProtectedRoute>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
