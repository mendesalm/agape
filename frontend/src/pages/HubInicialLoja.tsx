import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Wine, 
  ArrowRight, 
  Store,
  LogOut,
  Sparkles,
  ShoppingBag,
  UserCheck
} from 'lucide-react';

export const HubInicialLoja: React.FC = () => {
  const navigate = useNavigate();

  const userStr = localStorage.getItem('bipfy_user') || localStorage.getItem('barix_user') || localStorage.getItem('@Barix:user');
  const user = userStr ? JSON.parse(userStr) : null;
  const lojaNome = localStorage.getItem('@Barix:ambito_titulo') || user?.loja_atual?.nome_fantasia || 'Loja Ágape';
  const lojaNumero = user?.tenant_id || user?.loja_atual?.numero_loja || '2181';

  const cargoRaw = (user?.cargo || user?.role || '').toUpperCase();
  const isSuperAdmin = Boolean(user?.is_superadmin || cargoRaw === 'SUPERADMIN' || cargoRaw === 'WEBMASTER');
  const isGerente = isSuperAdmin || cargoRaw.includes('GERENTE') || cargoRaw.includes('ADMIN');
  const isOperador = isGerente || cargoRaw.includes('OPERADOR');
  const isClientePuro = cargoRaw === 'CLIENTE' || cargoRaw === 'OBREIRO' || cargoRaw === 'VISITANTE';

  // Regra de Negócio: Cliente puro entra DIRETO na tela do cliente sem passar por este hub
  useEffect(() => {
    if (isClientePuro && !isGerente && !cargoRaw.includes('OPERADOR')) {
      navigate('/app/cliente', { replace: true });
    }
  }, [isClientePuro, isGerente, cargoRaw, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('bipfy_token');
    localStorage.removeItem('bipfy_user');
    localStorage.removeItem('barix_token');
    localStorage.removeItem('barix_user');
    navigate('/login');
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-lg lg:max-w-4xl mx-auto overflow-hidden animate-fadeIn select-none">
      
      {/* Esferas de Iluminação Ambiente (Glass Ambient Glow) */}
      <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/4 w-64 h-64 rounded-full bg-blue-600/15 blur-3xl" />

      {/* ============================================================== */}
      {/* 1. TOP HEADER & IDENTIFICAÇÃO DO AMBIENTE                      */}
      {/* ============================================================== */}
      <header className="relative z-10 flex items-center justify-between pt-1 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-1 ring-white/20 text-slate-950 font-black">
            <Wine size={22} />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent block">
              Ágape
            </span>
            <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase -mt-0.5">
              Gestão Integrada
            </span>
          </div>
        </div>

        {/* Badge da Sessão / Loja */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-slate-300">#{lojaNumero}</span>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. CARD DE BOAS-VINDAS (Glassmorphism Minimalista)             */}
      {/* ============================================================== */}
      <section className="relative z-10 my-2">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.09] to-white/[0.03] backdrop-blur-xl border border-white/15 p-4 sm:p-5 shadow-2xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent" />
          
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                <Sparkles size={12} className="text-amber-400" />
                {isSuperAdmin ? 'SuperAdmin Global' : isGerente ? 'Perfil Gerencial' : 'Operador do Bar'}
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                Olá, <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">{user?.nome?.split(' ')[0] || 'Usuário'}</span>
              </h1>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed truncate">
                {lojaNome} • Escolha o módulo de acesso para iniciar
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner text-amber-400">
              <ShieldCheck size={26} />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. MÓDULOS DE ACESSO (CARDS INTERATIVOS GLASSMORPHISM)         */}
      {/* ============================================================== */}
      <main className="relative z-10 flex-1 flex flex-col justify-center gap-3.5 my-3">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center justify-between">
          <span>Módulos de Acesso</span>
          <span className="text-[10px] text-amber-400/80 font-normal">Toque para entrar</span>
        </div>

        {/* OPÇÃO 1: GERENTE (Apenas Gerente/Admin/SuperAdmin) */}
        {isGerente && (
          <div 
            onClick={() => navigate('/app/gerencia')}
            className="group relative rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-4 shadow-xl hover:border-amber-400/50 hover:from-white/[0.12] transition-all duration-300 cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner group-hover:scale-105 transition-transform">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors">
                      Gerente
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                      Gestão
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-normal mt-0.5">
                    DRE, métricas financeiras, auditoria e estoque com lotes FEFO
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-amber-300 group-hover:bg-amber-400/20 group-hover:border-amber-400/40 transition-all shrink-0">
                <ArrowRight size={18} />
              </div>
            </div>
          </div>
        )}

        {/* OPÇÃO 2: OPERADOR (Visível para Operadores e Gerentes) */}
        {isOperador && (
          <div 
            onClick={() => navigate('/app/comandas')}
            className="group relative rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-4 shadow-xl hover:border-emerald-400/50 hover:from-white/[0.12] transition-all duration-300 cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-700/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner group-hover:scale-105 transition-transform">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                      Operador
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                      PDV & Balcão
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-normal mt-0.5">
                    Comandas digitais QR Code, lançamentos rápidos e fechamento
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-300 group-hover:bg-emerald-400/20 group-hover:border-emerald-400/40 transition-all shrink-0">
                <ArrowRight size={18} />
              </div>
            </div>
          </div>
        )}

        {/* OPÇÃO 3: CLIENTE (Autoatendimento) */}
        <div 
          onClick={() => navigate('/app/cliente')}
          className="group relative rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-4 shadow-xl hover:border-cyan-400/50 hover:from-white/[0.12] transition-all duration-300 cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-700/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-inner group-hover:scale-105 transition-transform">
                <UserCheck size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                    Cliente
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90 bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20">
                    Autoatendimento
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-normal mt-0.5">
                  Consulta de consumo, saldo pré-pago, extrato e pagamento Pix
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-cyan-300 group-hover:bg-cyan-400/20 group-hover:border-cyan-400/40 transition-all shrink-0">
              <ArrowRight size={18} />
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================== */}
      {/* 4. COMPACT GLASS BOTTOM BAR                                    */}
      {/* ============================================================== */}
      <footer className="relative z-10 pt-2 pb-1">
        <div className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-2.5 flex items-center justify-between shadow-xl">
          {isSuperAdmin ? (
            <button 
              onClick={() => navigate('/app/instancias')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-semibold"
            >
              <Store size={16} />
              Trocar Loja (SaaS)
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 text-slate-400 text-xs">
              <Store size={16} />
              <span>{lojaNome}</span>
            </div>
          )}

          <div className="h-4 w-px bg-white/10" />

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 transition text-xs font-semibold"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </footer>

    </div>
  );
};
