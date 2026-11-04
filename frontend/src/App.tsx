import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Produtos } from './pages/Produtos';
import { Comandas } from './pages/Comandas';
import { Dashboard } from './pages/Dashboard';
import { Landing } from './pages/Landing';
import { Auditoria } from './pages/Auditoria';
import { Instancias } from './pages/Instancias';
import { EquipeAgape } from './pages/EquipeAgape';
import { api } from './services/api';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem('bipfy_token') || localStorage.getItem('barix_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  const [processandoSso, setProcessandoSso] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('sso_token'));
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token');
    if (ssoToken) {
      api.post('/auth/sso', { sso_token: ssoToken })
        .then((res) => {
          localStorage.setItem('bipfy_token', res.data.access_token);
          if (res.data.usuario) {
            localStorage.setItem('bipfy_user', JSON.stringify(res.data.usuario));
          }
          params.delete('sso_token');
          window.location.href = '/app';
        })
        .catch(() => {
          params.delete('sso_token');
          setProcessandoSso(false);
        });
    }
  }, []);

  if (processandoSso) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white font-sans">
        Conectando ao e-Sigma Ágape via Single Sign-On...
      </div>
    );
  }

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
          <Route index element={<Dashboard />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="comandas" element={<Comandas />} />
          <Route path="equipe-agape" element={<EquipeAgape />} />
          <Route path="auditoria" element={<Auditoria />} />
          <Route path="instancias" element={<Instancias />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
