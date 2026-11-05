import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Package,
  ShieldAlert,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronRight,
  Users,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';

interface LojaInfo {
  id: string;
  nome: string;
  subdominio?: string;
}

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lojas, setLojas] = useState<LojaInfo[]>([]);
  const [lojaAtiva, setLojaAtiva] = useState<string>('');

  const userStr = localStorage.getItem('bipfy_user') || localStorage.getItem('@Barix:user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user?.is_superadmin) {
      api
        .get('/tenants/')
        .then((res) => {
          setLojas(res.data || []);
          const savedTenant =
            localStorage.getItem('@Barix:tenant_id') ||
            localStorage.getItem('bipfy_tenant_id');
          if (savedTenant) {
            setLojaAtiva(savedTenant);
          } else if (user?.estabelecimento_id) {
            setLojaAtiva(user.estabelecimento_id);
          }
        })
        .catch(() => {});
    }
  }, [user?.is_superadmin, user?.estabelecimento_id]);

  const handleTrocarLoja = (novoId: string) => {
    setLojaAtiva(novoId);
    if (novoId) {
      localStorage.setItem('@Barix:tenant_id', novoId);
      localStorage.setItem('bipfy_tenant_id', novoId);
    } else {
      localStorage.removeItem('@Barix:tenant_id');
      localStorage.removeItem('bipfy_tenant_id');
    }
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('bipfy_token');
    localStorage.removeItem('barix_token');
    localStorage.removeItem('@Barix:token');
    localStorage.removeItem('bipfy_user');
    localStorage.removeItem('@Barix:user');
    localStorage.removeItem('bipfy_tenant_id');
    localStorage.removeItem('@Barix:tenant_id');
    navigate('/login');
  };

  const isOperadorPuro = user?.cargo === 'OPERADOR_AGAPE' && !user?.is_superadmin;

  const navItems = isOperadorPuro
    ? [
        { path: '/app/comandas', label: 'Salão & Comandas', icon: UtensilsCrossed },
        { path: '/app/produtos', label: 'Cardápio & Estoque', icon: Package }
      ]
    : [
        { path: '/app', label: 'Visão Geral', icon: LayoutDashboard },
        { path: '/app/comandas', label: 'Salão & Comandas', icon: UtensilsCrossed },
        { path: '/app/produtos', label: 'Cardápio & Estoque', icon: Package },
        { path: '/app/equipe', label: 'Equipe do Bar', icon: Users },
        { path: '/app/auditoria', label: 'Auditoria Financeira', icon: ShieldAlert }
      ];

  if (user?.is_superadmin) {
    navItems.push({ path: '/app/instancias', label: 'Lojas Maçônicas', icon: Building2 });
  }

  return (
    <div className="agape-sovereign-shell flex h-screen bg-[#070F1E] text-slate-200 font-sans overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-72 vidro-escuro border-r border-[#DDB96B]/20 flex-col shrink-0 z-20">
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

        {/* Seletor Multi-Loja para SuperAdmin */}
        {user?.is_superadmin && lojas.length > 0 && (
          <div className="px-4 py-3 border-b border-[#DDB96B]/15 bg-[#0A1428]/70">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#DDB96B] mb-1.5">
              Loja Maçônica Ativa ({lojas.length})
            </label>
            <select
              value={lojaAtiva}
              onChange={(e) => handleTrocarLoja(e.target.value)}
              className="w-full text-xs bg-[#070F1E] text-slate-200 border border-[#DDB96B]/30 rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#DDB96B]"
            >
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="px-6 pt-5 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#DDB96B]/70">
            Menu Principal
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
                {user?.is_superadmin ? 'SuperAdmin e-Sigma' : user?.cargo || 'Gestor do Ágape'}
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
        {/* Mobile Header */}
        <header className="lg:hidden vidro-escuro border-b border-[#DDB96B]/20 px-4 py-3 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-[#DDB96B] hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2.5">
              <img src="/agape.svg" alt="Ágape" className="w-8 h-8" />
              <span className="font-bold font-cinzel text-sigma-gold text-base tracking-wider">
                ÁGAPE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.is_superadmin && lojas.length > 0 && (
              <select
                value={lojaAtiva}
                onChange={(e) => handleTrocarLoja(e.target.value)}
                className="max-w-[150px] text-xs bg-[#0A1428] text-slate-200 border border-[#DDB96B]/30 rounded-lg px-2 py-1.5"
              >
                {lojas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            )}
            <div className="w-8 h-8 rounded-lg bg-sigma-gold flex items-center justify-center font-bold text-xs">
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
