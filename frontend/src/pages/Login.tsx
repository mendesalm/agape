import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { api } from '../services/api';
import HeroBackground from '../components/HeroBackground';
import { LogoAnimadaAgape } from '../components/LogoAnimadaAgape';

export const Login: React.FC = () => {
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarMe, setLembrarMe] = useState(true);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const salvarSessao = (accessToken: string, usuario: any) => {
    localStorage.setItem('bipfy_token', accessToken);
    localStorage.setItem('@Barix:token', accessToken);
    if (usuario) {
      const userJson = JSON.stringify(usuario);
      localStorage.setItem('bipfy_user', userJson);
      localStorage.setItem('@Barix:user', userJson);
    }
  };

  // Recebe token SSO vindo do Portal das Lojas ou do Portal e-Sigma (?token=... ou ?sso_token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('token') || params.get('sso_token');
    if (ssoToken) {
      setCarregando(true);
      api
        .post('/auth/sso', { sso_token: ssoToken, token: ssoToken })
        .then((res) => {
          salvarSessao(res.data.access_token, res.data.usuario);
          window.history.replaceState({}, document.title, '/app');
          navigate('/app');
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
      salvarSessao(access_token, usuario);
      navigate('/app');
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
          salvarSessao(ssoExchange.data.access_token, ssoExchange.data.usuario);
          navigate('/app');
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

      <div className="w-full max-w-[420px] card-deep-blue-glass p-8 md:p-10 relative z-20 transition-transform duration-300 hover:-translate-y-1">
        {/* Glow Dourado Sutil de Topo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#DDB96B]/10 blur-[60px] pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <div id="hero-logo" className="inline-flex items-center justify-center mb-4">
            <LogoAnimadaAgape width={84} height={84} showText={false} animated={true} />
          </div>
          <h1 className="text-2xl font-bold tracking-wider mb-1 font-cinzel bg-gradient-to-r from-[#FDE68A] via-[#DDB96B] to-[#B8862D] bg-clip-text text-transparent">
            Acesso Restrito
          </h1>
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#DDB96B]/80 mb-1">
            Módulo Ágape • e-Sigma
          </p>
          <p className="text-sm text-slate-400">
            Insira suas credenciais para continuar
          </p>
        </div>

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
      </div>
    </div>
  );
};
