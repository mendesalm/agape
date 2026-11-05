import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  Package,
  ShieldAlert,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronRight,
  Users,
  ExternalLink,
  Shield,
  DollarSign,
  User
} from 'lucide-react';
import api from '../services/api';

interface LojaInfo {
  id: number;
  nome_fantasia: string;
  numero_loja?: string;
}

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lojas, setLojas] = useState<LojaInfo[]>([]);
  const [lojaAtiva, setLojaAtiva] = useState<string>('');
  const [lojaAtivaNome, setLojaAtivaNome] = useState<string>('');
  const [ambitoAtivo, setAmbitoAtivo] = useState<'LOJA' | 'SISTEMA'>(() => {
    return (localStorage.getItem('@Barix:ambito') as 'LOJA' | 'SISTEMA') || 'LOJA';
  });

  const userStr = localStorage.getItem('bipfy_user') || localStorage.getItem('@Barix:user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin = Boolean(user?.is_superadmin || user?.cargo === 'SUPERADMIN');

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const savedTenant =
      localStorage.getItem('@Barix:tenant_id') ||
      localStorage.getItem('bipfy_tenant_id') ||
      (user?.tenant_id ? String(user.tenant_id) : '');

    if (savedTenant) {
      setLojaAtiva(String(savedTenant));
    }

    if (isSuperAdmin) {
      api
        .get('/tenants/?limit=500')
        .then((res) => {
          const lista: LojaInfo[] = res.data || [];
          setLojas(lista);

          let idEfetivo = savedTenant;
          if (!idEfetivo && lista.length > 0) {
            const loja2181 = lista.find((l) => String(l.numero_loja) === '2181') || lista[0];
            idEfetivo = String(loja2181.id);
            localStorage.setItem('@Barix:tenant_id', idEfetivo);
            localStorage.setItem('bipfy_tenant_id', idEfetivo);
            setLojaAtiva(idEfetivo);
          }

          const encontrada = lista.find((l) => String(l.id) === String(idEfetivo));
          if (encontrada) {
            setLojaAtivaNome(encontrada.nome_fantasia);
            localStorage.setItem('@Barix:ambito_titulo', encontrada.nome_fantasia);
          }
        })
        .catch(() => {});
    } else {
      api
        .get('/tenants/me')
        .then((res) => {
          if (res.data?.nome_fantasia) {
            setLojaAtivaNome(res.data.nome_fantasia);
            setLojaAtiva(String(res.data.id));
            localStorage.setItem('@Barix:ambito_titulo', res.data.nome_fantasia);
          }
        })
        .catch(() => {
          if (user?.loja_atual?.nome_fantasia) {
            setLojaAtivaNome(user.loja_atual.nome_fantasia);
          }
        });
    }
  }, [isSuperAdmin, user?.tenant_id]);

  const handleTrocarLoja = (novoId: string) => {
    setLojaAtiva(novoId);
    if (novoId) {
      localStorage.setItem('@Barix:tenant_id', novoId);
      localStorage.setItem('bipfy_tenant_id', novoId);
      localStorage.setItem('@Barix:ambito', 'LOJA');
      setAmbitoAtivo('LOJA');
      const encontrada = lojas.find((l) => String(l.id) === String(novoId));
      if (encontrada) {
        localStorage.setItem('@Barix:ambito_titulo', encontrada.nome_fantasia);
      }
    }
    window.location.reload();
  };

  const handleAlternarAmbito = (novoAmbito: 'LOJA' | 'SISTEMA') => {
    setAmbitoAtivo(novoAmbito);
    localStorage.setItem('@Barix:ambito', novoAmbito);
    if (novoAmbito === 'SISTEMA') {
      navigate('/app/instancias');
    } else {
      navigate('/app');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bipfy_token');
    localStorage.removeItem('barix_token');
    localStorage.removeItem('@Barix:token');
    localStorage.removeItem('bipfy_user');
    localStorage.removeItem('@Barix:user');
    localStorage.removeItem('bipfy_tenant_id');
    localStorage.removeItem('@Barix:tenant_id');
    localStorage.removeItem('@Barix:ambito');
    localStorage.removeItem('@Barix:ambito_titulo');
    navigate('/login');
  };

  const isOperadorPuro =
    (user?.cargo === 'OPERADOR_AGAPE' ||
      user?.cargo === 'OPERADOR_BALCAO' ||
      user?.cargo === 'GARCOM') &&
    !isSuperAdmin;

  const navItems = isOperadorPuro
    ? [
        { path: '/app/comandas', label: 'Salão (Vendedor)', icon: UtensilsCrossed },
        { path: '/app/logistica', label: 'Estoque (Balcão)', icon: Package },
        { path: '/app/cliente', label: 'Cliente: Meu Ágape', icon: User }
      ]
    : [
        { path: '/app/financeiro', label: 'Gerente: Financeiro', icon: DollarSign },
        { path: '/app/logistica', label: 'Gerente: Logística', icon: Package },
        { path: '/app/comandas', label: 'Vendedor: Salão & PDV', icon: UtensilsCrossed },
        { path: '/app/cliente', label: 'Cliente: Meu Ágape', icon: User },
        { path: '/app/equipe', label: 'Equipe do Bar', icon: Users },
        { path: '/app/auditoria', label: 'Auditoria & Logs', icon: ShieldAlert }
      ];

  if (isSuperAdmin) {
    navItems.push({ path: '/app/instancias', label: 'Lojas Maçônicas (SaaS)', icon: Building2 });
  }

  return (
    <div className="agape-sovereign-shell flex h-screen bg-[#070F1E] text-slate-200 font-sans overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-76 vidro-escuro border-r border-[#DDB96B]/20 flex-col shrink-0 z-20">
        <div className="p-6 flex items-center gap-3.5 border-b border-[#DDB96B]/20">
          <div className="w-12 h-12 rounded-2xl vidro-destaque flex items-center justify-center p-1.5 shrink-0">
            <img src="/agape.svg" alt="Ágape" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-widest font-cinzel text-sigma-gold block leading-none">
              ÁGAPE
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DDB96B]/80 block mt-1">
              Módulo e-Sigma
            </span>
          </div>
        </div>

        {/* Painel de Âmbito de Operação (Sistema Global vs Loja Específica) */}
        <div className="px-4 py-3.5 border-b border-[#DDB96B]/20 bg-[#0A1428]/90 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#DDB96B] flex items-center gap-1">
              {ambitoAtivo === 'SISTEMA' ? (
                <>
                  <Shield className="w-3.5 h-3.5" /> Âmbito: Sistema Global
                </>
              ) : (
                <>
                  <Building2 className="w-3.5 h-3.5" /> Âmbito: Loja Maçônica
                </>
              )}
            </span>
            {isSuperAdmin && (
              <div className="flex items-center rounded-lg bg-[#070F1E] p-0.5 border border-[#DDB96B]/30">
                <button
                  type="button"
                  onClick={() => handleAlternarAmbito('LOJA')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                    ambitoAtivo === 'LOJA'
                      ? 'bg-[#DDB96B] text-[#070F1E]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Loja
                </button>
                <button
                  type="button"
                  onClick={() => handleAlternarAmbito('SISTEMA')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                    ambitoAtivo === 'SISTEMA'
                      ? 'bg-[#DDB96B] text-[#070F1E]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sistema
                </button>
              </div>
            )}
          </div>

          {isSuperAdmin && lojas.length > 0 ? (
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                Loja ativa para Estoque (Armazém/Display) & PDV:
              </label>
              <select
                value={lojaAtiva}
                onChange={(e) => handleTrocarLoja(e.target.value)}
                className="w-full text-xs bg-[#070F1E] text-[#FDE68A] font-semibold border border-[#DDB96B]/35 rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#DDB96B]"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome_fantasia}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#070F1E]/80 border border-[#DDB96B]/25">
              <div className="text-xs font-bold text-[#FDE68A] truncate">
                {lojaAtivaNome || user?.loja_atual?.nome_fantasia || 'Salão de Ágapes da Loja'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Estoque Armazém & Display isolados para esta Loja
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pt-4 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#DDB96B]/70">
            Menu Operacional
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/app' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'vidro-destaque text-[#FDE68A] font-semibold shadow-sm'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'icon-sigma-gold' : 'text-slate-400 group-hover:text-[#DDB96B]'
                    }`}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-[#DDB96B]" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 m-4 rounded-2xl card-deep-blue-glass">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sigma-gold flex items-center justify-center font-bold text-sm shrink-0">
              {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">
                {user?.nome || 'Operador'}
              </p>
              <p className="text-xs text-[#DDB96B] truncate font-medium">
                {isSuperAdmin ? 'SuperAdmin • e-Sigma' : user?.cargo || 'Gestor do Ágape'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <a
              href="https://e-sigma.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-xs font-semibold text-[#FDE68A] bg-white/[0.04] hover:bg-white/[0.08] border border-[#DDB96B]/25 rounded-xl transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#DDB96B]" />
              <span>Portal e-Sigma</span>
            </a>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Encerrar Sessão</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 vidro-escuro border-r border-[#DDB96B]/25 z-50 flex flex-col transform transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-[#DDB96B]/20">
          <div className="flex items-center space-x-3">
            <img src="/agape.svg" alt="Ágape" className="w-9 h-9" />
            <div>
              <span className="text-lg font-bold font-cinzel text-sigma-gold block leading-none">
                ÁGAPE
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#DDB96B]/80 block mt-0.5">
                Módulo e-Sigma
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/app' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'vidro-destaque text-[#FDE68A] font-semibold'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'icon-sigma-gold' : 'text-slate-400'}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-[#DDB96B]" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#DDB96B]/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#070F1E]">
        {/* Top Context Banner (Desktop & Mobile) - 100% responsivo sem extrapolação */}
        <header className="vidro-escuro border-b border-[#DDB96B]/20 px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 z-30 w-full max-w-full overflow-hidden">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl text-[#DDB96B] hover:bg-white/5 shrink-0"
              aria-label="Abrir menu lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <Building2 className="w-4 h-4 text-[#DDB96B] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-[#FDE68A] truncate">
                {lojaAtivaNome || 'Carregando Loja...'}
              </span>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DDB96B]/15 text-[#DDB96B] border border-[#DDB96B]/30 shrink-0">
                Armazém & Display Isolados
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSuperAdmin && lojas.length > 0 && (
              <select
                value={lojaAtiva}
                onChange={(e) => handleTrocarLoja(e.target.value)}
                className="hidden md:block max-w-[200px] text-xs bg-[#0A1428] text-[#FDE68A] border border-[#DDB96B]/30 rounded-lg px-2 py-1.5 truncate"
                title="Trocar Loja Maçônica Ativa"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome_fantasia}
                  </option>
                ))}
              </select>
            )}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sigma-gold flex items-center justify-center font-bold text-xs shrink-0">
              {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Bottom Navigation Bar for Mobile / Tablet POS */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 vidro-escuro border-t border-[#DDB96B]/25 px-2 py-1.5 flex items-center justify-around z-30">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/app' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive ? 'text-[#FDE68A]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'icon-sigma-gold' : ''}`} />
                <span className="text-[10px] font-semibold mt-0.5 truncate max-w-[68px]">
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
