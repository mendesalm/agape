import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { HubInicialLoja } from './pages/HubInicialLoja';
import { PainelGerencia } from './pages/PainelGerencia';
import { GerenteAdministrativo } from './pages/GerenteAdministrativo';
import { GerenteLogistica } from './pages/GerenteLogistica';
import { Comandas } from './pages/Comandas';
import { PortalCliente } from './pages/PortalCliente';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { Auditoria } from './pages/Auditoria';
import { Instancias } from './pages/Instancias';
import { CatalogoGlobalAdmin } from './pages/CatalogoGlobalAdmin';

// Rota protegida básica
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem('bipfy_token') || localStorage.getItem('barix_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rota Protegida com Layout */}
        <Route 
          path="/app" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          } 
        >
          {/* Rotas Filhas injetadas no <Outlet /> do Layout */}
          <Route index element={<HubInicialLoja />} />
          <Route path="hub" element={<HubInicialLoja />} />
          <Route path="gerencia" element={<PainelGerencia />} />
          <Route path="gerencia/administrativo" element={<GerenteAdministrativo />} />
          <Route path="gerencia/logistica" element={<GerenteLogistica />} />
          <Route path="financeiro" element={<GerenteAdministrativo />} />
          <Route path="logistica" element={<GerenteLogistica />} />
          <Route path="produtos" element={<GerenteLogistica />} />
          <Route path="comandas" element={<Comandas />} />
          <Route path="cliente" element={<PortalCliente />} />
          <Route path="portal-cliente" element={<PortalCliente />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="instancias" element={<Instancias />} />
          <Route path="catalogo-global" element={<CatalogoGlobalAdmin />} />
          <Route path="catalogo-mestre" element={<CatalogoGlobalAdmin />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
