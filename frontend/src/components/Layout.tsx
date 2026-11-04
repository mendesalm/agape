import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ClipboardList, DollarSign, LogOut, Settings, Menu, X, Wine, ShieldCheck, Building2, Users } from 'lucide-react';

export function Layout() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userRaw = localStorage.getItem('bipfy_user') || localStorage.getItem('barix_user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isSuperAdmin = user?.cargo === 'SUPERADMIN';
  const isGestorLoja = user?.cargo === 'SUPERADMIN' || user?.cargo === 'WEBMASTER';

  const handleLogout = () => {
    localStorage.removeItem('bipfy_token');
    localStorage.removeItem('bipfy_user');
    localStorage.removeItem('barix_token');
    localStorage.removeItem('barix_user');
    navigate('/login');
  };

  // Isolamento de Menu: Operadores de Balcão/Garçons (Não Maçons / Familiares) veem apenas Comandas e Estoque
  const baseMenuItems = [
    ...(isGestorLoja ? [{ to: '/app', icon: <LayoutDashboard size={20} />, label: 'Dashboard do Ágape' }] : []),
    { to: '/app/comandas', icon: <ClipboardList size={20} />, label: 'Balcão & Comandas' },
    { to: '/app/produtos', icon: <Package size={20} />, label: 'Produtos & Estoque' },
    ...(isGestorLoja ? [{ to: '/app/equipe-agape', icon: <Users size={20} />, label: 'Operadores & CIM/CPF' }] : []),
    ...(isSuperAdmin ? [{ to: '/app/instancias', icon: <Building2 size={20} />, label: 'Lojas (e-Sigma)' }] : []),
    ...(isGestorLoja ? [
      { to: '/app/financeiro', icon: <DollarSign size={20} />, label: 'Financeiro do Ágape' },
      { to: '/app/auditoria', icon: <ShieldCheck size={20} />, label: 'Auditoria' },
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      
      {/* Mobile Topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-xl">
          <Wine /> e-Sigma Ágape
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Lateral */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg lg:shadow-sm
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-20 flex flex-col items-center justify-center border-b border-gray-100 shrink-0 mt-16 lg:mt-0 px-4">
          <h1 className="text-xl font-bold text-indigo-700 tracking-tight hidden lg:flex items-center gap-2">
            <Wine /> e-Sigma Ágape
          </h1>
          {user && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${isSuperAdmin ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'}`}>
              {isSuperAdmin ? 'Gestor Global e-Sigma' : `${user.cargo || 'Operador'} • Loja #${user.tenant_id}`}
            </span>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {baseMenuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button className="flex items-center space-x-3 px-4 py-3 w-full text-left rounded-lg text-gray-600 hover:bg-gray-100 transition-colors font-medium mb-1">
            <Settings size={20} />
            <span>Configurações</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full text-left rounded-lg text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Overlay Background no Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Conteúdo Principal dinâmico injetado pelo Router (Outlet) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 lg:pt-0">
        <div className="p-4 md:p-8 w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
