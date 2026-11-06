import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  UtensilsCrossed, 
  User, 
  ArrowRight, 
  Crown
} from 'lucide-react';

export const HubInicialLoja: React.FC = () => {
  const navigate = useNavigate();

  const userStr = localStorage.getItem('bipfy_user') || localStorage.getItem('@Barix:user');
  const user = userStr ? JSON.parse(userStr) : null;
  const lojaNome = localStorage.getItem('@Barix:ambito_titulo') || user?.loja_atual?.nome_fantasia || 'Loja Ágape';
  const lojaNumero = user?.loja_atual?.numero_loja || '';

  const cargoRaw = (user?.cargo || user?.role || '').toUpperCase();
  const isSuperAdmin = Boolean(user?.is_superadmin || cargoRaw === 'SUPERADMIN');
  const isGerente = isSuperAdmin || cargoRaw.includes('GERENTE') || cargoRaw.includes('ADMIN') || cargoRaw.includes('WEBMASTER');
  const isClientePuro = cargoRaw === 'CLIENTE' || cargoRaw === 'OBREIRO' || cargoRaw === 'VISITANTE';

  // 1. Regra de Negócio: Cliente puro entra DIRETO na tela do cliente sem passar por este hub
  useEffect(() => {
    if (isClientePuro && !isGerente && !cargoRaw.includes('OPERADOR')) {
      navigate('/app/cliente', { replace: true });
    }
  }, [isClientePuro, isGerente, cargoRaw, navigate]);

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn select-none">
      
      {/* ============================================================== */}
      {/* CABEÇALHO DO HUB INICIAL (Soberano e Acolhedor)                 */}
      {/* ============================================================== */}
      <div className="vidro-escuro border border-[#DDB96B]/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#DDB96B]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-[#DDB96B]/20 text-[#FDE68A] border border-[#DDB96B]/40 flex items-center gap-1.5">
                <Crown size={12} className="text-[#DDB96B]" />
                {isSuperAdmin ? 'Superadministrador' : isGerente ? 'Perfil Gerencial' : 'Perfil Operador'}
              </span>
              {lojaNumero && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-300 bg-slate-800/80 border border-slate-700">
                  Loja #{lojaNumero}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-cinzel text-white tracking-wide">
              Bem-vindo ao Ágape, <span className="text-sigma-gold">{user?.nome?.split(' ')[0] || 'Irmão'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Ambiente ativo: <strong className="text-white">{lojaNome}</strong>. Selecione abaixo a área de trabalho para a sessão de hoje:
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 self-end sm:self-center">
            <div className="w-14 h-14 rounded-2xl vidro-destaque p-2 flex items-center justify-center shadow-inner shrink-0">
              <img src="/agape.svg" alt="Ágape" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BENTO CARDS: GERENTE, OPERADOR E CLIENTE                       */}
      {/* ============================================================== */}
      <div className={`grid gap-4 sm:gap-6 ${isGerente ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'}`}>

        {/* ------------------------------------------------------------ */}
        {/* CARD 1: GERENTE (Apenas visível para Gerente/Admin)          */}
        {/* ------------------------------------------------------------ */}
        {isGerente && (
          <div 
            onClick={() => navigate('/app/gerencia')}
            className="group relative bg-[#0B1326] hover:bg-[#101A33] border border-[#DDB96B]/40 hover:border-[#DDB96B] rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:shadow-[#DDB96B]/10 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#DDB96B]/10 rounded-full blur-2xl group-hover:bg-[#DDB96B]/20 transition-all" />

            <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#DDB96B]/20 to-[#0B1326] border border-[#DDB96B]/50 flex items-center justify-center text-[#FDE68A] shadow-md group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#DDB96B] block">
                  Gestão Estratégica
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white font-cinzel mt-1">
                  Gerente
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Acesse o painel secundário da gerência com divisão clara entre <strong>Administrativo</strong> (DRE, Auditoria) e <strong>Logística</strong> (Estoque com fotos e Lotes).
              </p>
            </div>

            <div className="pt-6 relative z-10 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs font-bold font-mono text-[#FDE68A] group-hover:text-white transition-colors">
              <span>Abrir Gerência</span>
              <div className="w-8 h-8 rounded-xl bg-[#DDB96B]/20 group-hover:bg-[#DDB96B] group-hover:text-[#0B1326] flex items-center justify-center transition-all">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* CARD 2: OPERADOR (Visível para Operadores e Gerentes)        */}
        {/* ------------------------------------------------------------ */}
        <div 
          onClick={() => navigate('/app/comandas')}
          className="group relative bg-[#0B1326] hover:bg-[#101A33] border border-[#10B981]/40 hover:border-[#10B981] rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:shadow-[#10B981]/10 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/10 rounded-full blur-2xl group-hover:bg-[#10B981]/20 transition-all" />

          <div className="space-y-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10B981]/20 to-[#0B1326] border border-[#10B981]/50 flex items-center justify-center text-[#4EDEA3] shadow-md group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4EDEA3] block">
                Salão & Ponto de Venda
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-cinzel mt-1">
                Operador
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Atendimento de balcão e salão: abertura de comandas por QR Code soberano, lançamento de itens, controle de comandas ativas e fechamento.
            </p>
          </div>

          <div className="pt-6 relative z-10 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs font-bold font-mono text-[#4EDEA3] group-hover:text-white transition-colors">
            <span>Iniciar Atendimento</span>
            <div className="w-8 h-8 rounded-xl bg-[#10B981]/20 group-hover:bg-[#10B981] group-hover:text-[#0B1326] flex items-center justify-center transition-all">
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD 3: CLIENTE (Visível para todos)                        */}
        {/* ------------------------------------------------------------ */}
        <div 
          onClick={() => navigate('/app/cliente')}
          className="group relative bg-[#0B1326] hover:bg-[#101A33] border border-[#38BDF8]/40 hover:border-[#38BDF8] rounded-3xl p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:shadow-[#38BDF8]/10 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#38BDF8]/10 rounded-full blur-2xl group-hover:bg-[#38BDF8]/20 transition-all" />

          <div className="space-y-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#38BDF8]/20 to-[#0B1326] border border-[#38BDF8]/50 flex items-center justify-center text-[#7BD0FF] shadow-md group-hover:scale-105 transition-transform">
              <User className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7BD0FF] block">
                Portal do Irmão
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-cinzel mt-1">
                Cliente
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Autoatendimento soberano: visualize seu QR Code de identificação no balcão, saldo pré-pago, fatura em aberto e quitação via Pix ou Cartão.
            </p>
          </div>

          <div className="pt-6 relative z-10 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs font-bold font-mono text-[#7BD0FF] group-hover:text-white transition-colors">
            <span>Acessar Meu Perfil</span>
            <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/20 group-hover:bg-[#38BDF8] group-hover:text-[#0B1326] flex items-center justify-center transition-all">
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
