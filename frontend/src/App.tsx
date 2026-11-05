import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Produtos } from './pages/Produtos';
import { GerenteLogistica } from './pages/GerenteLogistica';
import { Comandas } from './pages/Comandas';
import { Dashboard } from './pages/Dashboard';
import { GerenteFinanceiro } from './pages/GerenteFinanceiro';
import { Landing } from './pages/Landing';
import { Auditoria } from './pages/Auditoria';
import { Instancias } from './pages/Instancias';
import { EquipeAgape } from './pages/EquipeAgape';
import { api } from './services/api';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const token =
    localStorage.getItem('bipfy_token') ||
    localStorage.getItem('barix_token') ||
    localStorage.getItem('@Barix:token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  const [processandoSso, setProcessandoSso] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('sso_token') || params.get('token'));
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token') || params.get('token');
    if (ssoToken) {
      api
        .post('/auth/sso', { sso_token: ssoToken, token: ssoToken })
        .then((res) => {
          localStorage.setItem('bipfy_token', res.data.access_token);
          localStorage.setItem('@Barix:token', res.data.access_token);
          if (res.data.usuario) {
            const userStr = JSON.stringify(res.data.usuario);
            localStorage.setItem('bipfy_user', userStr);
            localStorage.setItem('@Barix:user', userStr);
          }
          params.delete('sso_token');
          params.delete('token');
          window.location.href = '/app';
        })
        .catch(() => {
          params.delete('sso_token');
          params.delete('token');
          setProcessandoSso(false);
        });
    }
  }, []);

  if (processandoSso) {
    return (
      <div className="min-h-screen bg-[#070F1E] flex flex-col items-center justify-center text-[#FDE68A] font-cinzel gap-4">
        <img src="/agape.svg" alt="Ágape" className="w-20 h-20 animate-pulse" />
        <span>Conectando ao e-Sigma Ágape via Single Sign-On...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Rota Protegida com Layout Soberano e-Sigma */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GerenteFinanceiro />} />
          <Route path="financeiro" element={<GerenteFinanceiro />} />
          <Route path="logistica" element={<GerenteLogistica />} />
          <Route path="produtos" element={<GerenteLogistica />} />
          <Route path="produtos-legado" element={<Produtos />} />
          <Route path="comandas" element={<Comandas />} />
          <Route path="dashboard-legado" element={<Dashboard />} />
          <Route path="equipe" element={<EquipeAgape />} />
          <Route path="equipe-agape" element={<EquipeAgape />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="instancias" element={<Instancias />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
