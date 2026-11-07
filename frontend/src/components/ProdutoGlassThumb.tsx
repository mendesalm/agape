import React, { useState } from 'react';
import { Wine } from 'lucide-react';
import { api } from '../services/api';

interface ProdutoGlassThumbProps {
  fotoUrl?: string | null;
  nome: string;
  categoria?: string;
  subcategoria?: string;
  tipo?: string;
  className?: string;
  containerClassName?: string;
  tamanho?: 'sm' | 'md' | 'lg' | 'full';
  aspectRatio?: 'square' | 'portrait' | 'auto';
  children?: React.ReactNode;
}

export const resolverUrlFoto = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (api.defaults.baseURL || 'http://localhost:8000').replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${path}${sep}v=std680`;
};

export const ProdutoGlassThumb: React.FC<ProdutoGlassThumbProps> = ({
  fotoUrl,
  nome,
  categoria = 'bebidas',
  subcategoria = '',
  tipo = '',
  className = '',
  containerClassName = '',
  tamanho = 'full',
  aspectRatio = 'square',
  children
}) => {
  const [erroCarregamento, setErroCarregamento] = useState(false);

  // Determina paleta de glow e gradiente baseado no tipo do produto
  const obterCoresTema = () => {
    const cat = (categoria || '').toLowerCase();
    const sub = (subcategoria || '').toLowerCase();
    const tip = (tipo || '').toLowerCase();

    // 1. Energéticos e Doses/Destilados -> Roxo & Magenta
    if (tip.includes('energet') || sub.includes('energet') || sub.includes('doses') || sub.includes('destilad')) {
      return {
        glow: 'bg-purple-500/25',
        gradienteFundo: 'from-purple-950/30 via-slate-900/60 to-purple-900/20',
        borda: 'group-hover:border-purple-500/40',
        fallbackCor: 'text-purple-400'
      };
    }

    // 2. Refrigerantes, Águas, Sucos, Chás (Não alcoólicas) -> Ciano & Azul
    if (sub.includes('nao_alcoolic') || tip.includes('refri') || tip.includes('agua') || tip.includes('suco') || tip.includes('cha')) {
      return {
        glow: 'bg-cyan-500/25',
        gradienteFundo: 'from-cyan-950/30 via-slate-900/60 to-blue-900/20',
        borda: 'group-hover:border-cyan-500/40',
        fallbackCor: 'text-cyan-400'
      };
    }

    // 3. Snacks, Comidas, Petiscos -> Esmeralda & Âmbar
    if (cat.includes('alimento') || sub.includes('snack') || tip.includes('amendoim') || tip.includes('batata')) {
      return {
        glow: 'bg-emerald-500/25',
        gradienteFundo: 'from-emerald-950/30 via-slate-900/60 to-teal-900/20',
        borda: 'group-hover:border-emerald-500/40',
        fallbackCor: 'text-emerald-400'
      };
    }

    // 4. Cervejas / Alcoólicas Tradicionais -> Âmbar Dourado Quente (Padrão Ágape)
    return {
      glow: 'bg-amber-500/25',
      gradienteFundo: 'from-amber-950/30 via-slate-900/60 to-yellow-950/20',
      borda: 'group-hover:border-amber-500/40',
      fallbackCor: 'text-amber-400'
    };
  };

  const tema = obterCoresTema();
  const urlFinal = resolverUrlFoto(fotoUrl);

  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'portrait' ? 'aspect-[3/4]' : '';
  const tamanhoClass = tamanho === 'sm' ? 'w-12 h-12 p-1.5' : tamanho === 'md' ? 'w-20 h-20 p-2' : tamanho === 'lg' ? 'w-32 h-32 p-3' : 'w-full p-3.5';

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden bg-gradient-to-b ${tema.gradienteFundo} backdrop-blur-xl border border-white/10 ${tema.borda} shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] flex items-center justify-center transition-all duration-300 select-none ${aspectClass} ${tamanhoClass} ${containerClassName}`}
    >
      {/* 1. Ambient Glow (Orbe difusa no centro atrás da garrafa/lata) */}
      <div 
        className={`pointer-events-none absolute w-28 h-28 rounded-full ${tema.glow} blur-2xl opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500`} 
      />

      {/* 2. Reflexo Chanfrado de Vidro (Vidro Cristal / Gloss) */}
      <div 
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12]" 
      />

      {/* 3. Imagem do Produto com Projeção de Sombra 3D */}
      {urlFinal && !erroCarregamento ? (
        <img
          src={urlFinal}
          alt={nome}
          className={`relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform duration-300 ${className}`}
          onError={() => setErroCarregamento(true)}
          loading="lazy"
        />
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-2">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <Wine size={22} className={`${tema.fallbackCor}`} />
          </div>
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-white uppercase tracking-wider line-clamp-1 max-w-[80px]">
            {tipo || categoria}
          </span>
        </div>
      )}

      {/* 4. Elementos Adicionais Flutuantes (Badges de EAN, Botões de Ação, etc.) */}
      {children}
    </div>
  );
};
