import React from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Wallet, ShieldCheck, ArrowRight, Sparkles, Lock, Layers } from 'lucide-react';
import HeroBackground from '../components/HeroBackground';
import { LogoAnimadaAgape } from '../components/LogoAnimadaAgape';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070F1E] text-slate-200 relative overflow-hidden z-10 selection:bg-[#DDB96B]/30 selection:text-[#FDE68A]">
      <HeroBackground />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 vidro-escuro border-b border-[#DDB96B]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/agape.svg" alt="Ágape" className="w-11 h-11 drop-shadow-[0_2px_10px_rgba(221,185,107,0.4)]" />
            <div>
              <span className="text-xl font-bold font-cinzel tracking-widest text-sigma-gold block leading-none">
                ÁGAPE
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 block mt-1">
                Ecossistema e-Sigma
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://e-sigma.app"
              className="hidden sm:inline-flex px-5 py-2.5 text-xs uppercase tracking-wider btn-masonic-pill btn-pill-dark"
            >
              Portal e-Sigma
            </a>
            <Link
              to="/login"
              className="px-6 py-2.5 text-sm btn-masonic-pill btn-pill-blue"
            >
              Acessar Sistema <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-14 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div id="hero-logo" className="flex justify-center mb-6">
          <LogoAnimadaAgape width={180} height={180} showText={true} animated={true} />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full vidro-destaque text-[#FDE68A] text-xs font-bold uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#DDB96B]" /> Salão de Ágapes, Comandas QR & Estoque FEFO
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold font-cinzel tracking-wide text-white max-w-4xl mx-auto leading-tight mb-6">
          Gestão Soberana do{' '}
          <span className="text-sigma-gold">Salão de Ágapes</span> para Lojas Maçônicas
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Módulo oficial do ecossistema <strong className="text-[#FDE68A]">e-Sigma</strong> para controle de comandas rápidas,
          carteira pré-paga fraternal dos Irmãos, ficha técnica de pratos e rastreabilidade de lotes FEFO.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 text-base btn-masonic-pill btn-pill-blue"
          >
            Entrar no Ágape <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="https://lojas.e-sigma.app"
            className="w-full sm:w-auto px-8 py-4 text-base btn-masonic-pill btn-pill-dark"
          >
            Portal das Lojas
          </a>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-deep-blue-glass p-7 transition-transform duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl vidro-destaque flex items-center justify-center mb-5">
              <QrCode className="w-6 h-6 icon-sigma-gold" />
            </div>
            <h3 className="text-lg font-bold font-cinzel text-[#FDE68A] mb-2">
              Comandas & QR Code Fraternal
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Abertura imediata de mesas ou consumo individual por Irmão com lançamento ágil pelo celular ou tablet no Salão de Ágapes.
            </p>
          </div>

          <div className="card-deep-blue-glass p-7 transition-transform duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl vidro-destaque flex items-center justify-center mb-5">
              <Wallet className="w-6 h-6 icon-sigma-gold" />
            </div>
            <h3 className="text-lg font-bold font-cinzel text-[#FDE68A] mb-2">
              Carteira Pré-Paga & PIX
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Créditos antecipados para membros do Quadro com abatimento automático no fechamento da comanda, sem filas ao final da sessão.
            </p>
          </div>

          <div className="card-deep-blue-glass p-7 transition-transform duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl vidro-destaque flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6 icon-sigma-gold" />
            </div>
            <h3 className="text-lg font-bold font-cinzel text-[#FDE68A] mb-2">
              Estoque FEFO & Auditoria
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Baixa automática por lote de vencimento mais próximo (First-Expire, First-Out) e transparência financeira para a Tesouraria da Loja.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#DDB96B]/20 vidro-escuro py-8 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/agape.svg" alt="Ágape" className="w-6 h-6" />
            <span className="font-cinzel text-[#DDB96B] font-bold tracking-wider">
              e-Sigma Ágape
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#DDB96B]" /> SSO Integrado
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#DDB96B]" /> Multi-Loja (Tenants Isolados)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
