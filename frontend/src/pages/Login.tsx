import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Shield, ArrowRight, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { api } from '../services/api';
import HeroBackground from '../components/HeroBackground';
import { LogoAnimadaAgape } from '../components/LogoAnimadaAgape';

interface AmbitoAcesso {
  tipo: 'LOJA' | 'SISTEMA';
  tenant_id: number | null;
  numero_loja?: string | null;
  titulo: string;
  subtitulo: string;
}

export const Login: React.FC = () => {
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarMe, setLembrarMe] = useState(true);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [ambitosParaEscolha, setAmbitosParaEscolha] = useState<AmbitoAcesso[]>([]);
  const [usuarioAutenticado, setUsuarioAutenticado] = useState<any>(null);
  const navigate = useNavigate();

  const salvarSessaoBase = (accessToken: string, usuario: any) => {
    localStorage.setItem('bipfy_token', accessToken);
    localStorage.setItem('@Barix:token', accessToken);
    if (usuario) {
      const userJson = JSON.stringify(usuario);
      localStorage.setItem('bipfy_user', userJson);
      localStorage.setItem('@Barix:user', userJson);
    }
  };

  const selecionarAmbitoEEntrar = (ambito: AmbitoAcesso, usuarioRef?: any) => {
    const userObj = usuarioRef || usuarioAutenticado;
    localStorage.setItem('@Barix:ambito', ambito.tipo);
    localStorage.setItem('@Barix:ambito_titulo', ambito.titulo);

    if (ambito.tenant_id) {
      localStorage.setItem('@Barix:tenant_id', String(ambito.tenant_id));
      localStorage.setItem('bipfy_tenant_id', String(ambito.tenant_id));
    }

    if (userObj) {
      const atualizado = {
        ...userObj,
        ambito_ativo: ambito.tipo,
        ambito_titulo: ambito.titulo,
        tenant_id: ambito.tenant_id || userObj.tenant_id,
        estabelecimento_id: ambito.tenant_id || userObj.estabelecimento_id
      };
      const userJson = JSON.stringify(atualizado);
      localStorage.setItem('bipfy_user', userJson);
      localStorage.setItem('@Barix:user', userJson);
    }

    if (ambito.tipo === 'SISTEMA') {
      navigate('/app/instancias', { replace: true });
    } else {
      navigate('/app', { replace: true });
    }
  };

  const processarRespostaLogin = (accessToken: string, usuario: any) => {
    salvarSessaoBase(accessToken, usuario);
    setUsuarioAutenticado(usuario);

    const ambitos: AmbitoAcesso[] = usuario?.ambitos_disponiveis || [];
    if (ambitos.length > 1) {
      setAmbitosParaEscolha(ambitos);
      return;
    }

    if (ambitos.length === 1) {
      selecionarAmbitoEEntrar(ambitos[0], usuario);
      return;
    }

    if (usuario?.tenant_id) {
      localStorage.setItem('@Barix:tenant_id', String(usuario.tenant_id));
      localStorage.setItem('bipfy_tenant_id', String(usuario.tenant_id));
    }
    navigate('/app', { replace: true });
  };

  // Recebe token SSO vindo do Portal das Lojas ou do Portal e-Sigma (?token=... ou ?sso_token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('token') || params.get('sso_token');
    const lojaIdParam = params.get('loja_id') || params.get('tenant_id');
    if (ssoToken) {
      setCarregando(true);
      api
        .post('/auth/sso', { sso_token: ssoToken, token: ssoToken })
        .then((res) => {
          window.history.replaceState({}, document.title, '/login');
          const { access_token, usuario } = res.data;
          if (lojaIdParam) {
            salvarSessaoBase(access_token, usuario);
            localStorage.setItem('@Barix:tenant_id', lojaIdParam);
            localStorage.setItem('bipfy_tenant_id', lojaIdParam);
            localStorage.setItem('@Barix:ambito', 'LOJA');
            navigate('/app', { replace: true });
          } else {
            processarRespostaLogin(access_token, usuario);
          }
        })
        .catch(() => {
          setErro('Sessão SSO expirada ou inválida. Faça login manualmente.');
        })
        .finally(() => {
          setCarregando(false);
        });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!identificador || !senha) {
      setErro('Por favor, informe suas credenciais.');
      return;
    }

    setCarregando(true);
    try {
      // 1. Tenta autenticação direta no Ágape (SuperAdmin, Webmasters de Loja e Operadores do Salão de Ágapes)
      const response = await api.post('/auth/login', {
        email: identificador.trim(),
        senha
      });
      const { access_token, usuario } = response.data;
      processarRespostaLogin(access_token, usuario);
    } catch (localErr: any) {
      // 2. Fallback SSO centralizado na API do e-Sigma (suporta login por CIM ou E-mail de qualquer Irmão)
      try {
        const ssoAuth = await axios.post('https://e-sigma.app/api/v1/auth/login', {
          email_or_cim: identificador.trim(),
          password: senha
        });
        const eSigmaToken = ssoAuth.data?.access_token;
        if (eSigmaToken) {
          const ssoExchange = await api.post('/auth/sso', {
            sso_token: eSigmaToken,
            token: eSigmaToken
          });
          processarRespostaLogin(ssoExchange.data.access_token, ssoExchange.data.usuario);
          return;
        }
      } catch {
        // Ignora erro do fallback e exibe mensagem padrão abaixo
      }
      setErro(
        localErr.response?.data?.detail ||
          'Credenciais inválidas. Verifique seu E-mail/CIM e senha.'
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070F1E] p-4 relative overflow-hidden z-10">
      <HeroBackground />

      <div className="w-full max-w-[460px] card-deep-blue-glass p-8 md:p-10 relative z-20 transition-transform duration-300">
        {/* Glow Dourado Sutil de Topo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#DDB96B]/10 blur-[60px] pointer-events-none" />

        <div className="text-center mb-7 relative z-10">
          <div id="hero-logo" className="inline-flex items-center justify-center mb-4">
            <LogoAnimadaAgape width={84} height={84} showText={false} animated={true} />
          </div>
          <h1 className="text-2xl font-bold tracking-wider mb-1 font-cinzel bg-gradient-to-r from-[#FDE68A] via-[#DDB96B] to-[#B8862D] bg-clip-text text-transparent">
            {ambitosParaEscolha.length > 0 ? 'Âmbito de Acesso' : 'Acesso Restrito'}
          </h1>
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#DDB96B]/80 mb-1">
            Módulo Ágape • e-Sigma
          </p>
          <p className="text-sm text-slate-400">
            {ambitosParaEscolha.length > 0
              ? 'Selecione em qual âmbito deseja operar nesta sessão'
              : 'Insira suas credenciais para continuar'}
          </p>
        </div>

        {ambitosParaEscolha.length > 0 ? (
          <div className="space-y-3.5 relative z-10">
            <div className="p-3.5 rounded-xl bg-[#DDB96B]/10 border border-[#DDB96B]/30 text-xs text-slate-200 leading-relaxed">
              Olá, <strong className="text-[#FDE68A]">{usuarioAutenticado?.nome}</strong>. Identificamos múltiplos vínculos na sua conta. Como o <strong>Estoque (Armazém & Display/Gôndola)</strong> e as <strong>Comandas</strong> são exclusivos de cada Loja, escolha o âmbito desejado:
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {ambitosParaEscolha.map((amb, idx) => {
                const isSistema = amb.tipo === 'SISTEMA';
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selecionarAmbitoEEntrar(amb)}
                    className="w-full text-left p-4 rounded-xl bg-[#0A1428]/80 hover:bg-[#DDB96B]/15 border border-white/10 hover:border-[#DDB96B] transition-all flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl vidro-destaque flex items-center justify-center shrink-0 mt-0.5">
                        {isSistema ? (
                          <Shield className="w-5 h-5 icon-sigma-gold" />
                        ) : (
                          <Building2 className="w-5 h-5 icon-sigma-gold" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#DDB96B]/20 text-[#FDE68A]">
                            {isSistema ? 'Sistema Global' : `Loja Nº ${amb.numero_loja || amb.tenant_id}`}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white mt-1 group-hover:text-[#FDE68A] transition-colors">
                          {amb.titulo}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                          {amb.subtitulo}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#DDB96B] shrink-0 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setAmbitosParaEscolha([]);
                setUsuarioAutenticado(null);
              }}
              className="w-full pt-3 text-xs text-slate-400 hover:text-[#FDE68A] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Voltar para identificação
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {erro && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm text-center">
                {erro}
              </div>
            )}

            <div>
              <label
                htmlFor="identificador"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                E-mail ou CIM
              </label>
              <input
                id="identificador"
                type="text"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#DDB96B] focus:bg-white/[0.06] transition-all"
                placeholder="Digite seu e-mail ou CIM"
                disabled={carregando}
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#DDB96B] focus:bg-white/[0.06] transition-all pr-12"
                  placeholder="••••••••"
                  disabled={carregando}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={lembrarMe}
                  onChange={(e) => setLembrarMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#DDB96B] focus:ring-[#DDB96B] focus:ring-offset-slate-900 mr-2 accent-[#DDB96B]"
                />
                Lembrar-me
              </label>
              <a
                href="https://e-sigma.app/forgot-password"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#DDB96B] hover:text-[#FDE68A] font-medium transition-colors"
              >
                Esqueci a senha
              </a>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3.5 px-4 mt-2 btn-masonic-pill btn-pill-blue text-base tracking-wide"
            >
              {carregando ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Entrar'
              )}
            </button>

            <div className="text-center pt-4 border-t border-white/10 mt-6">
              <span className="text-slate-400 text-sm">Não tem uma conta? </span>
              <a
                href="https://e-sigma.app/register"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#DDB96B] hover:text-[#FDE68A] font-semibold text-sm transition-colors"
              >
                Solicitar cadastro
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
