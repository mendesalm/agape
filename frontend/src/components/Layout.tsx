import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  LogOut, 
  Menu, 
  X, 
  Wine, 
  ShieldCheck, 
  Building2, 
  BarChart3, 
  Boxes, 
  FileSearch, 
  ArrowLeft,
  ChevronRight,
  User
} from 'lucide-react';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Recupera perfil e dados da sessão
  const userRaw = localStorage.getItem('bipfy_user') || localStorage.getItem('barix_user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const cargo = (user?.cargo || '').toUpperCase();

  const isSuperAdmin = cargo === 'SUPERADMIN' || cargo === 'WEBMASTER';
  const isGerente = isSuperAdmin || ['ADMIN', 'GERENTE', 'DIRETOR', 'VENERAVEL'].includes(cargo);
  const isOperador = isGerente || ['OPERADOR', 'CHANCELER', 'TESOUREIRO'].includes(cargo);
  const isClientePuro = cargo === 'CLIENTE' || cargo === 'OBREIRO' || cargo === 'MEMBRO';

  const handleLogout = () => {
    localStorage.removeItem('bipfy_token');
    localStorage.removeItem('bipfy_user');
    localStorage.removeItem('barix_token');
    localStorage.removeItem('barix_user');
    navigate('/login');
  };

  // Mapeamento de Breadcrumb dinâmico
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/app' || path === '/app/hub') return { trail: ['Hub da Loja'], backTo: null };
    if (path === '/app/gerencia') return { trail: ['Hub', 'Gerência'], backTo: '/app' };
    if (path.includes('/gerencia/administrativo') || path === '/app/financeiro') {
      return { trail: ['Hub', 'Gerência', 'Administrativo'], backTo: '/app/gerencia' };
    }
    if (path.includes('/gerencia/logistica') || path === '/app/logistica' || path === '/app/produtos') {
      return { trail: ['Hub', 'Gerência', 'Logística & Estoque'], backTo: '/app/gerencia' };
    }
    if (path.includes('/auditoria')) {
      return { trail: ['Hub', 'Gerência', 'Administrativo', 'Auditoria'], backTo: '/app/gerencia/administrativo' };
    }
    if (path.includes('/comandas')) {
      return { trail: ['Hub', 'Operação', 'Comandas & PDV'], backTo: '/app' };
    }
    if (path.includes('/cliente')) {
      return { trail: ['Hub', 'Portal do Cliente'], backTo: '/app' };
    }
    if (path.includes('/instancias')) {
      return { trail: ['SaaS Global', 'Instâncias'], backTo: '/app' };
    }
    return { trail: ['Sistema'], backTo: '/app' };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <div className="flex h-screen bg-[#070F1E] font-sans text-slate-100 overflow-hidden">
      
      {/* Mobile Topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0B1326]/95 backdrop-blur-md border-b border-slate-800 z-50 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-2">
          {breadcrumb.backTo && (
            <button 
              onClick={() => navigate(breadcrumb.backTo!)} 
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-2 text-amber-400 font-bold text-lg tracking-tight">
            <Wine className="w-5 h-5 text-amber-500" />
            <span>Ágape</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {user?.cargo || 'Usuário'}
          </span>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Sidebar Lateral */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0B1326] border-r border-slate-800/90 flex flex-col shadow-2xl lg:shadow-none
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Topo do Sidebar: Marca e Perfil do Usuário */}
        <div className="h-20 flex flex-col justify-center border-b border-slate-800/80 shrink-0 mt-16 lg:mt-0 px-5 bg-gradient-to-b from-slate-900/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                <Wine size={20} />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  Ágape <span className="text-[10px] font-semibold text-amber-400/90 tracking-widest uppercase">Bar</span>
                </h1>
                <p className="text-[10px] text-slate-400">
                  {user?.tenant_id ? `Instância #${user.tenant_id}` : 'Ecossistema SaaS'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Badge de Cargo */}
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isSuperAdmin 
                ? 'bg-purple-950/60 text-purple-300 border-purple-500/40' 
                : isGerente 
                ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                : isOperador 
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
            }`}>
              <User size={10} />
              {user?.cargo || 'Cliente'}
            </span>
            <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
              {user?.nome || user?.email || 'Conectado'}
            </span>
          </div>
        </div>

        {/* Navegação Estruturada por Níveis de Acesso */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* SEÇÃO 1: NAVEGAÇÃO PRINCIPAL / HUB */}
          {!isClientePuro && (
            <div>
              <NavLink
                to="/app"
                end
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all font-medium text-xs ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border-l-2 border-amber-500 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <LayoutDashboard size={18} />
                <span>Hub Inicial da Loja</span>
              </NavLink>
            </div>
          )}

          {/* SEÇÃO 2: GERÊNCIA (Visível apenas para Gerentes, Admins e Superadmin) */}
          {isGerente && (
            <div className="space-y-1">
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/70 flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-amber-500" />
                <span>Painel Gerencial</span>
              </div>
              
              <NavLink
                to="/app/gerencia"
                end
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all font-medium text-xs ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border-l-2 border-amber-500 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <ShieldCheck size={16} />
                <span>Visão Geral Gerência</span>
              </NavLink>

              <NavLink
                to="/app/gerencia/administrativo"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all font-medium text-xs ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border-l-2 border-amber-500 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <BarChart3 size={16} />
                <span>Administrativo & Auditoria</span>
              </NavLink>

              <NavLink
                to="/app/gerencia/logistica"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all font-medium text-xs ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border-l-2 border-amber-500 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Boxes size={16} />
                <span>Logística & Estoque FEFO</span>
              </NavLink>

              <NavLink
                to="/app/auditoria"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all font-medium text-xs ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border-l-2 border-amber-500 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <FileSearch size={16} />
                <span>Auditoria e Compliance</span>
              </NavLink>
            </div>
          )}

          {/* SEÇÃO 3: OPERAÇÃO (Visível para Operadores, Gerentes e Superadmin) */}
          {isOperador && (
            <div className="space-y-1">
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 flex items-center gap-1.5">
                <ClipboardList size={12} className="text-emerald-500" />
                <span>Operação do Bar</span>
              </div>

              <NavLink
                to="/app/comandas"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all font-medium text-xs ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border-l-2 border-emerald-500 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <ClipboardList size={16} />
                <span>PDV / Comandas de Balcão</span>
              </NavLink>
            </div>
          )}

          {/* SEÇÃO 4: CLIENTE & AUTOATENDIMENTO (Visível para Todos) */}
          <div className="space-y-1">
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400/70 flex items-center gap-1.5">
              <Wine size={12} className="text-cyan-500" />
              <span>Autoatendimento</span>
            </div>

            <NavLink
              to="/app/cliente"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all font-medium text-xs ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border-l-2 border-cyan-500 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              <Wine size={16} />
              <span>Portal do Consumidor</span>
            </NavLink>
          </div>

          {/* SEÇÃO 5: SUPERADMIN SAAS GLOBAL (Apenas SuperAdmin) */}
          {isSuperAdmin && (
            <div className="space-y-1">
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-purple-400/70 flex items-center gap-1.5">
                <Building2 size={12} className="text-purple-500" />
                <span>Multi-Lojas (SaaS)</span>
              </div>

              <NavLink
                to="/app/instancias"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all font-medium text-xs ${
                    isActive
                      ? 'bg-purple-500/15 text-purple-400 border-l-2 border-purple-500 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Building2 size={16} />
                <span>Gerenciar Instâncias</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Rodapé do Sidebar */}
        <div className="p-3 border-t border-slate-800/80 shrink-0 bg-slate-900/40 space-y-1">
          {breadcrumb.backTo && (
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate(breadcrumb.backTo!);
              }}
              className="flex items-center space-x-2.5 px-3 py-2 w-full text-left rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-xs font-medium"
            >
              <ArrowLeft size={16} />
              <span>Voltar nível anterior</span>
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2.5 px-3 py-2 w-full text-left rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-xs font-medium"
          >
            <LogOut size={16} />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Overlay Background no Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Desktop Topbar com Breadcrumb e Navegação Bidirecional */}
        <header className="hidden lg:flex h-14 bg-[#0B1326]/70 backdrop-blur-md border-b border-slate-800/80 items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {breadcrumb.backTo && (
              <button
                onClick={() => navigate(breadcrumb.backTo!)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-700/60"
              >
                <ArrowLeft size={14} />
                <span>Voltar</span>
              </button>
            )}

            {/* Breadcrumb Trilha de Navegação */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {breadcrumb.trail.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight size={12} className="text-slate-600" />}
                  <span className={idx === breadcrumb.trail.length - 1 ? 'font-bold text-amber-400' : 'hover:text-slate-300'}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Atalho de status e loja conectada */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Loja Online</span>
            </div>
            {user?.tenant_id && (
              <span className="text-slate-500 font-mono text-[11px]">
                Tenant #{user.tenant_id}
              </span>
            )}
          </div>
        </header>

        {/* Conteúdo Injetado via Outlet */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 lg:pt-0 bg-[#070F1E]">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
}
