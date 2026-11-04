import { Link } from 'react-router-dom';
import { Wine, Smartphone, LayoutDashboard, LineChart, ShieldCheck, ChevronRight } from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      {/* Background Decorativo Glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wine className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">e-Sigma Ágape</span>
        </div>
        <div className="flex gap-4">
          <Link 
            to="/login" 
            className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all font-medium text-sm text-gray-300 hover:text-white"
          >
            Fazer Login
          </Link>
          <Link 
            to="/login" 
            className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all font-medium text-sm text-white"
          >
            Testar Agora
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-gray-300">O PDV do Futuro chegou</span>
        </div>
        
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Salão de Ágapes <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Fraternal & Inteligente.
          </span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Integrado nativamente ao banco de dados do e-Sigma. Reconhecimento automático de Irmãos do Quadro, Visitantes e Familiares por CIM ou CPF, com isolamento total de segurança para operadores de balcão.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            to="/login"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)]"
          >
            Acessar Plataforma <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Features Cards - Glassmorphism */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard 
            icon={<LayoutDashboard className="text-blue-400" />}
            title="Dashboard SaaS"
            desc="Painel web completo para donos gerenciarem métricas, produtos e equipes."
          />
          <FeatureCard 
            icon={<Smartphone className="text-purple-400" />}
            title="App do Garçom"
            desc="Integração nativa com celular para pedir direto da mesa com QR Code."
          />
          <FeatureCard 
            icon={<LineChart className="text-emerald-400" />}
            title="Controle de Estoque"
            desc="Baixa automática, gestão de quebras e histórico detalhado (Event Sourcing)."
          />
          <FeatureCard 
            icon={<ShieldCheck className="text-amber-400" />}
            title="Multitenant"
            desc="Arquitetura robusta para rodar centenas de bares isolados na mesma nuvem."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-8 rounded-3xl hover:bg-white/[0.06] transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20 group">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-100 mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}
